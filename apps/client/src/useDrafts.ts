import { useCallback, useEffect, useRef, useState } from "react";
import {
  newDraft,
  withoutUnusedMedia,
  type Draft,
  type Locale,
  type ContentNode,
} from "@wonboard/document";
import { cacheRecovery, listRecovery, discardRecovery, recoveryMode, type RecoveryCopy } from "./recoveryCache";
import { trashExpired, latestActiveDraft, recoveredDraft } from "./trash";
import { StorageConflict, newestDraftFirst } from "./storage";
import { openDraftRepository, type DraftRepository, type StorageMode } from "./draftRepository";

export const hasUnsavedWork = (
  change: number,
  savedChange: number,
  conflictCount: number,
) => change !== savedChange || conflictCount > 0;

export const selectionAccess = (
  disconnected: boolean,
  validationError: string,
) =>
  disconnected
    ? { readOnly: true, error: "storageVersionChanged" }
    : validationError
      ? { readOnly: true, error: validationError }
      : { readOnly: false, error: "" };

export function useDrafts(locale: Locale, storageMode: StorageMode = "local") {
  const [draft, setDraft] = useState<Draft | null>(null);
  const [selectionVersion, setSelectionVersion] = useState(0);
  const [list, setList] = useState<Draft[]>([]);
  const listRef = useRef<Draft[]>([]);
  const listVersion = useRef(0);
  function publishList(value: Draft[] | ((items: Draft[]) => Draft[])) {
    listVersion.current++;
    listRef.current = typeof value === "function" ? value(listRef.current) : value;
    setList(listRef.current);
  }
  const operating = useRef(false);
  const [mutating, setMutating] = useState(false);
  const [recovery, setRecovery] = useState<RecoveryCopy[]>([]);
  const [status, setStatus] = useState<
    "loading" | "saved" | "saving" | "unsaved" | "error"
  >("loading");
  const [error, setError] = useState("");
  const [clockError, setClockError] = useState("");
  const [readOnly, setReadOnly] = useState(false);
  const db = useRef<DraftRepository | null>(null);
  const clockNow = useCallback(() => db.current?.now?.() ?? Date.now(), []);
  const current = useRef<Draft | null>(null);
  const change = useRef(0);
  const savedChange = useRef(-1);
  const composing = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const running = useRef<Promise<boolean> | null>(null);
  const frozen = useRef(false);
  const disconnected = useRef(false);
  const conflicts = useRef(new Map<string, Draft>());

  function select(value: Draft, clean = false) {
    setSelectionVersion(version => version + 1);
    if (timer.current) clearTimeout(timer.current);
    value = conflicts.current.get(value.document.documentId) ?? value;
    composing.current = false;
    change.current = 0;
    savedChange.current = clean || value.document.revision > 0 ? 0 : -1;
    let validationError = "";
    try {
      value = withoutUnusedMedia(value);
      if (conflicts.current.has(value.document.documentId))
        throw new StorageConflict();
    } catch (e) {
      validationError = e instanceof Error ? e.message : "invalidDocument";
    }
    // A versionchange can close the database while the initial getAll is still
    // finishing. That stale continuation may select a draft, but it must never
    // make the editor writable again without a live connection.
    const access = selectionAccess(disconnected.current, validationError);
    frozen.current = access.readOnly;
    setReadOnly(access.readOnly);
    setError(access.error);
    current.current = value;
    setDraft(value);
    setStatus(
      access.readOnly
        ? "error"
        : value.document.revision > 0 ? "saved" : "unsaved",
    );
  }
  useEffect(() => {
    let active = true;
    let connection: DraftRepository | null = null;
    let initialized = false, refreshing = false, refreshNeeded = false;
    let resumeTimer: ReturnType<typeof setTimeout> | undefined;
    const scheduleRefresh = () => { clearTimeout(resumeTimer); resumeTimer = setTimeout(() => void refreshAfterResume(), 100); };
    async function refreshAfterResume() {
      if (!active || !initialized || !connection || refreshing) return;
      if (operating.current || running.current || composing.current) { scheduleRefresh(); return; }
      refreshing = true; refreshNeeded = false;
      const version = listVersion.current;
      try {
        const all = await connection.list();
        for (const expired of all.filter(value => trashExpired(value.document, clockNow()))) {
          try { await connection.remove(expired.document.documentId, expired.document.revision, { deletionIntent: "expired" }); }
          catch { /* Retry at the next resume/open; never use a device deadline. */ }
        }
        if (!active) return;
        if (version !== listVersion.current || operating.current || running.current) { refreshNeeded = true; return; }
        let refreshed = all.filter(value => !trashExpired(value.document, clockNow()));
        const editing = current.current;
        if (editing && (change.current !== savedChange.current || conflicts.current.has(editing.document.documentId)))
          refreshed = [editing, ...refreshed.filter(value => value.document.documentId !== editing.document.documentId)];
        else if (editing?.document.revision && !refreshed.some(value =>
          value.document.documentId === editing.document.documentId &&
          value.document.revision === editing.document.revision && value.document.trashedAt === undefined)) {
          const remote = refreshed.find(value => value.document.documentId === editing.document.documentId);
          const candidate = remote?.document.trashedAt === undefined && remote
            ? remote : latestActiveDraft(refreshed, locale);
          const sequence = change.current;
          const loaded = candidate.document.revision > 0 ? await connection.load(candidate) : candidate;
          if (!active) return;
          // A selection, edit, save or IME composition can begin during the read.
          // Never let that stale continuation overwrite local work.
          if (version !== listVersion.current || current.current !== editing || sequence !== change.current ||
              change.current !== savedChange.current || operating.current || running.current || composing.current) {
            refreshNeeded = true; return;
          }
          select(loaded, true);
        }
        publishList(refreshed.sort(newestDraftFirst));
        setClockError("");
      } catch {
        connection.invalidateClock?.();
        if (active) setClockError("storageFailed");
      } finally {
        refreshing = false;
        if (active && refreshNeeded) scheduleRefresh();
      }
    }
    const onResume = () => {
      if (storageMode !== "sites") return;
      connection?.invalidateClock?.();
      if (document.visibilityState === "hidden") return;
      refreshNeeded = true; scheduleRefresh();
    };
    if (storageMode === "sites") {
      window.addEventListener("focus", onResume); window.addEventListener("pageshow", onResume);
      document.addEventListener("visibilitychange", onResume);
    }
    openDraftRepository(
      storageMode,
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
        const all = await value.list();
        for (const expired of all.filter(d => trashExpired(d.document, clockNow()))) {
          try { await value.remove(expired.document.documentId, expired.document.revision, { deletionIntent: "expired" }); }
          catch { /* Preserve failed removals on disk and retry on the next open. */ }
        }
        const drafts = all.filter(d => !trashExpired(d.document, clockNow()));
        drafts.sort(newestDraftFirst);
        if (!active) return;
        // A broken newest draft must not hide the healthy library entries.
        publishList(drafts);
        const candidate = latestActiveDraft(drafts, locale);
        const first = candidate.document.revision > 0 ? await value.load(candidate) : candidate;
        const copies = storageMode === "sites" ? await listRecovery().catch(() => []) : [];
        if (!active) return;
        setRecovery(copies);
        select(first, first.document.revision === 0);
        initialized = true;
        if (refreshNeeded) scheduleRefresh();
      })
      .catch((e) => {
        console.warn(
          "Wonboard save failed",
          e instanceof Error
            ? `${e.name}: ${e.message}`
            : "Unknown storage error",
        );
        if (active) {
          setError(e instanceof Error ? e.message : "storageFailed");
          setStatus("error");
          select(newDraft(locale), true);
          setError("storageFailed");
        }
      });
    return () => {
      active = false;
      clearTimeout(resumeTimer);
      window.removeEventListener("focus", onResume); window.removeEventListener("pageshow", onResume);
      document.removeEventListener("visibilitychange", onResume);
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
    let cacheToken: string | undefined;
    let cacheFailed = false;
    const task = (async () => {
      if (storageMode === "sites") {
        try { cacheToken = await cacheRecovery(snapshot); }
        catch { cacheFailed = true; }
      }
      return db.current!.save(snapshot, snapshot.document.revision);
    })()
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
        publishList((items) => [
          result,
          ...items.filter(
            (d) => d.document.documentId !== result.document.documentId,
          ),
        ]);
        if (cacheToken && change.current === sequence)
          void discardRecovery(snapshot.document.documentId, cacheToken).catch(() => {});
        setStatus(change.current === sequence ? "saved" : "unsaved");
        setError("");
        return true;
      })
      .catch((e) => {
        if (e instanceof StorageConflict) {
          const unsaved = current.current!;
          conflicts.current.set(unsaved.document.documentId, unsaved);
          publishList((items) => [
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
            "Wonboard save failed",
            e instanceof Error ? `${e.name}: ${e.message}` : String(e),
          );
          setError(
            e instanceof Error && e.message === "missingMedia"
              ? "missingMedia"
              : cacheFailed ? "recoverySaveFailed" : "storageFailed",
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
    if (!current.current || frozen.current || operating.current || recovery.length > 0) return;
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
      if (hasUnsavedWork(
        change.current,
        savedChange.current,
        conflicts.current.size,
      )) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    const persist = () => {
      if (storageMode === "sites" && current.current && savedChange.current !== change.current)
        void cacheRecovery(current.current).catch(() => {});
    };
    const hidden = () => { if (document.visibilityState === "hidden") persist(); };
    window.addEventListener("beforeunload", before);
    window.addEventListener("pagehide", persist);
    document.addEventListener("visibilitychange", hidden);
    return () => {
      window.removeEventListener("beforeunload", before);
      window.removeEventListener("pagehide", persist);
      document.removeEventListener("visibilitychange", hidden);
    };
  }, []);
  async function activate(value: Draft) {
    if (disconnected.current || operating.current || value.document.trashedAt !== undefined) return false;
    if (!frozen.current && !(await saveUntilCurrent(save, () => savedChange.current === change.current))) return false;
    try {
      // A frozen local copy is retained for backup, never replaced by a remote load.
      const conflict = conflicts.current.get(value.document.documentId);
      const loaded = conflict ?? (db.current ? await db.current.load(value) : value);
      if (loaded.document.trashedAt !== undefined) throw new StorageConflict();
      select(loaded);
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : "storageFailed");
      return false;
    }
  }
  async function create() {
    if (await activate(newDraft(locale))) await save();
  }
  async function restore(value: Draft) {
    value = recoveredDraft(value);
    if (!(await activate(value))) return false;
    // A newer but structurally recoverable backup is intentionally selected in
    // memory as read-only. Saving it would discard the unsupported information.
    if (frozen.current) return true;
    return save();
  }
  async function recoverCopy(copy: RecoveryCopy) {
    if (operating.current || disconnected.current || !db.current) return false;
    try {
      const server = (await db.current.list()).find(d => d.document.documentId === copy.documentId);
      if (recoveryMode(copy, server) === "new") {
        if (!(await restore(copy.draft))) return false;
      } else {
        if (!(await activate(copy.draft))) return false;
        // Activate normally loads the server. Only an explicit recovery choice installs the cached body.
        select(copy.draft);
        change.current = 1; savedChange.current = 0;
        setStatus("unsaved");
        if (!(await save())) return false;
      }
      await discardCopy(copy);
      return true;
    } catch (e) { setError(e instanceof Error ? e.message : "storageFailed"); return false; }
  }
  async function discardCopy(copy: RecoveryCopy) {
    try {
      await discardRecovery(copy.documentId, copy.token);
      setRecovery(items => items.filter(item => item.token !== copy.token));
      return true;
    } catch { setError("storageFailed"); return false; }
  }
  function mutationError(e: unknown) {
    setError(e instanceof Error ? e.message : "storageFailed");
    if (e instanceof StorageConflict && current.current) {
      conflicts.current.set(current.current.document.documentId, current.current);
      frozen.current = true; setReadOnly(true); setStatus("error");
    }
  }
  async function withMutation<T>(action: () => Promise<T>): Promise<T | null> {
    if (operating.current || disconnected.current || !db.current || composing.current) return null;
    operating.current = true; setMutating(true);
    if (timer.current) clearTimeout(timer.current);
    try {
      if (!frozen.current && !(await saveUntilCurrent(save, () => savedChange.current === change.current))) return null;
      const result = await action(); setError(""); return result;
    } catch (e) { mutationError(e); return null; }
    finally { operating.current = false; setMutating(false); }
  }
  async function loadForMutation(value: Draft) {
    const selected = current.current?.document.documentId === value.document.documentId;
    const expected = selected ? current.current! : value;
    const loaded = await db.current!.load(expected);
    if (loaded.document.revision !== expected.document.revision) throw new StorageConflict();
    return loaded;
  }
  async function moveToTrash(value: Draft) {
    if (frozen.current) return null;
    return withMutation(async () => {
      const loaded = await loadForMutation(value);
      if (loaded.document.trashedAt !== undefined) throw new StorageConflict();
      const replacingCurrent = current.current?.document.documentId === loaded.document.documentId;
      const candidate = latestActiveDraft(listRef.current.filter(d => d.document.documentId !== loaded.document.documentId), locale);
      const successor = replacingCurrent && candidate.document.revision > 0 ? await db.current!.load(candidate) : candidate;
      const now = new Date().toISOString();
      const saved = await db.current!.save({ ...loaded,
        document: { ...loaded.document, trashedAt: now, updatedAt: now } }, loaded.document.revision);
      publishList(items => [saved, ...items.filter(d => d.document.documentId !== saved.document.documentId)]);
      if (replacingCurrent) {
        const next = successor.document.trashedAt === undefined ? successor : newDraft(locale);
        select(next, next.document.revision === 0);
      }
      return saved;
    });
  }
  async function restoreFromTrash(value: Draft) {
    return withMutation(async () => {
      const loaded = await loadForMutation(value);
      if (!Number.isFinite(clockNow())) throw new Error("storageFailed");
      if (loaded.document.trashedAt === undefined || trashExpired(loaded.document, clockNow())) throw new Error("trashExpired");
      const { trashedAt: _trashedAt, ...document } = loaded.document;
      const saved = await db.current!.save({ ...loaded, document: { ...document,
        updatedAt: new Date().toISOString() } }, document.revision);
      publishList(items => [saved, ...items.filter(d => d.document.documentId !== document.documentId)]);
      return saved;
    });
  }
  async function permanentlyRemove(value: Draft, withdrawPublications = false) {
    return withMutation(async () => {
      if (value.document.trashedAt === undefined) throw new Error("invalidDocument");
      await db.current!.remove(value.document.documentId, value.document.revision, { withdrawPublications, deletionIntent: "manual" });
      publishList(items => items.filter(d => d.document.documentId !== value.document.documentId));
      return true;
    });
  }
  async function emptyTrash() {
    return withMutation(async () => {
      let failures = 0;
      for (const value of listRef.current.filter(d => d.document.trashedAt !== undefined)) {
        try {
          await db.current!.remove(value.document.documentId, value.document.revision, { deletionIntent: "manual" });
          publishList(items => items.filter(d => d.document.documentId !== value.document.documentId));
        } catch { failures++; }
      }
      return failures;
    });
  }
  return {
    clockNow,
    draft,
    list,
    mutating,
    recovery, recoverCopy, discardCopy, selectionVersion,
    moveToTrash,
    restoreFromTrash,
    permanentlyRemove,
    emptyTrash,
    status,
    error: error || clockError,
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
