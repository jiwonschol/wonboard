import type { Editor } from "@tiptap/core";
import type { Transaction } from "@tiptap/pm/state";
import { closeHistory } from "@tiptap/pm/history";
import type { ContentNode } from "@wonboard/document";

export function insertAttachmentContent(editor: Editor, content: ContentNode[]) {
  const before = editor.state.doc;
  editor.chain().focus().command(({ tr }) => { closeHistory(tr); return true; }).insertContent(content).run();
  const changed = !editor.state.doc.eq(before);
  editor.view.dispatch(closeHistory(editor.state.tr));
  return changed;
}

// Map the captured selection through document edits, not through later clicks.
// A newly selected document must explicitly fail the caller's identity check.
export function captureAttachmentSelection(editor: Editor) {
  let bookmark = editor.state.selection.getBookmark(), closed = false;
  const marks = editor.state.storedMarks;
  const map = ({ transaction }: { transaction: Transaction }) => {
    bookmark = bookmark.map(transaction.mapping);
  };
  editor.on("transaction", map);
  const close = () => { if (!closed) editor.off("transaction", map); closed = true; };
  return {
    restore() {
      if (closed || editor.isDestroyed) return false;
      try {
        const selection = bookmark.resolve(editor.state.doc);
        editor.view.dispatch(editor.state.tr.setSelection(selection).setStoredMarks(marks).setMeta("addToHistory", false));
        editor.view.focus();
        close();
        return true;
      } catch { close(); return false; }
    },
    close,
  };
}
