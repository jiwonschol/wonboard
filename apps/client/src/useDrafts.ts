import { useCallback, useEffect, useRef, useState } from "react";
import {
  newDraft,
  withoutUnusedMedia,
  type Draft,
  type Locale,
  type ContentNode,
} from "@wonboard/document";
import {
  loadDrafts,
  newestDraftFirst,
  openStorage,
  saveDraft,
  StorageConflict,
} from "./storage";

export function useDrafts(locale: Locale) {
  const [draft, setDraft] = useState<Draft | null>(null);
  const [list, setList] = useState<Draft[]>([]);
  const [status, setStatus] = useState<
    "loading" | "saved" | "saving" | "unsaved" | "error"
  >("loading");
  const [error, setError] = useState("");
  const [readOnly, setReadOnly] = useState(false);
  const db = useRef<IDBDatabase | null>(null);
  const current = useRef<Draft | null>(null);
  const change = useRef(0);
  const savedChange = useRef(-1);
  const composing = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const running = useRef<Promise<boolean> | null>(null);
  const frozen = useRef(false);
  const disconnected = useRef(false);
  const conflicts = useRef(new Map<string, Draft>());

  function select(value: Draft) {
    if (timer.current) clearTimeout(timer.current);
    value = conflicts.current.get(value.document.documentId) ?? value;
    composing.current = false;
    change.current = 0;
    savedChange.current = value.document.revision > 0 ? 0 : -1;
    try {
      value = withoutUnusedMedia(value);
      if (conflicts.current.has(value.document.documentId))
        throw new StorageConflict();
      frozen.current = false;
      setReadOnly(false);
      setError("");
    } catch (e) {
      frozen.current = true;
      setReadOnly(true);
      setError(e instanceof Error ? e.message : "invalidDocument");
    }
    current.current = value;
    setDraft(value);
    setStatus(
      conflicts.current.has(value.document.documentId)
        ? "error"
        : value.document.revision > 0 ? "saved" : "unsaved",
    );
  }
  useEffect(() => {
    let active = true;
    let connection: IDBDatabase | null = null;
    openStorage(
      undefined,
      () => {
        if (active) setError("storageBlocked");
      },
      () => {
        if (!active) return;
        db.current = null;
        disconnected.current = true;
        frozen.current = true;
        setReadOnly(true);
        setStatus("error");
        setError("storageVersionChanged");
      },
    )
      .then(async (value) => {
        connection = value;
        if (!active) {
          value.close();
          return;
        }
        db.current = value;
        const drafts = await loadDrafts(value);
        if (!active) return;
        drafts.sort(newestDraftFirst);
        setList(drafts);
        select(drafts[0] ?? newDraft(locale));
      })
      .catch((e) => {
        console.warn(
          "Wonboard local save failed",
          e instanceof Error
            ? `${e.name}: ${e.message}`
            : "Unknown storage error",
        );
        if (active) {
          setError(e instanceof Error ? e.message : "storageFailed");
          setStatus("error");
          select(newDraft(locale));
          setError("storageFailed");
        }
      });
    return () => {
      active = false;
      connection?.close();
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  const save = useCallback(async (): Promise<boolean> => {
    if (running.current) {
      const ok = await running.current;
      if (!ok) return false;
      return save();
    }
    if (frozen.current || composing.current || !current.current || !db.current)
      return false;
    if (savedChange.current === change.current) return true;
    const snapshot = current.current;
    const sequence = change.current;
    setStatus("saving");
    const task = saveDraft(db.current, snapshot, snapshot.document.revision)
      .then((result) => {
        savedChange.current = sequence;
        current.current = {
          ...current.current!,
          document: {
            ...current.current!.document,
            revision: result.document.revision,
          },
        };
        setDraft(current.current);
        setList((items) => [
          result,
          ...items.filter(
            (d) => d.document.documentId !== result.document.documentId,
          ),
        ]);
        setStatus(change.current === sequence ? "saved" : "unsaved");
        setError("");
        return true;
      })
      .catch((e) => {
        if (e instanceof StorageConflict) {
          const unsaved = current.current!;
          conflicts.current.set(unsaved.document.documentId, unsaved);
          setList((items) => [
            unsaved,
            ...items.filter(
              (d) => d.document.documentId !== unsaved.document.documentId,
            ),
          ]);
          frozen.current = true;
          setReadOnly(true);
          setError("storageConflict");
        } else {
          console.warn(
            "Wonboard local save failed",
            e instanceof Error ? `${e.name}: ${e.message}` : String(e),
          );
          setError(
            e instanceof Error && e.message === "missingMedia"
              ? "missingMedia"
              : "storageFailed",
          );
        }
        setStatus("error");
        return false;
      })
      .finally(() => {
        running.current = null;
      });
    running.current = task;
    return task;
  }, []);
  const schedule = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      void save();
    }, 350);
  };
  function update(patch: Partial<Draft["document"]>, blobs?: Draft["blobs"]) {
    if (!current.current || frozen.current) return;
    current.current = {
      document: {
        ...current.current.document,
        ...patch,
        updatedAt: new Date().toISOString(),
      },
      blobs: blobs ?? current.current.blobs,
    };
    change.current++;
    setDraft(current.current);
    setStatus("unsaved");
    if (!composing.current) schedule();
  }
  useEffect(() => {
    const before = (e: BeforeUnloadEvent) => {
      if (change.current !== savedChange.current || conflicts.current.size > 0) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", before);
    return () => window.removeEventListener("beforeunload", before);
  }, []);
  async function activate(value: Draft) {
    if (disconnected.current) return false;
    if (
      !frozen.current &&
      !(await saveUntilCurrent(
        save,
        () => savedChange.current === change.current,
      ))
    )
      return false;
    select(value);
    return true;
  }
  async function create() {
    if (await activate(newDraft(locale))) await save();
  }
  async function restore(value: Draft) {
    value = {
      ...value,
      document: {
        ...value.document,
        documentId: crypto.randomUUID(),
        revision: 0,
        updatedAt: new Date().toISOString(),
      },
    };
    if (!(await activate(value))) return false;
    return save();
  }
  return {
    draft,
    list,
    status,
    error,
    readOnly,
    save,
    update,
    create,
    activate,
    restore,
    content: (content: ContentNode) => update({ content }),
    composition: (active: boolean) => {
      composing.current = active;
      if (!active) schedule();
    },
    snapshot: () => current.current,
  };
}

export async function saveUntilCurrent(
  save: () => Promise<boolean>,
  isCurrent: () => boolean,
): Promise<boolean> {
  do {
    if (!(await save())) return false;
  } while (!isCurrent());
  return true;
}
