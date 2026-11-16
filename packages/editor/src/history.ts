import { Extension } from "@tiptap/core";
import { history, undoNoScroll, redoNoScroll } from "@tiptap/pm/history";
import type { Command } from "@tiptap/pm/state";

// 내용만 되돌리고 현재 선택을 변경된 문서에 옮긴다. 커서와 별개로 아래를
// 읽고 있을 수도 있으므로 선택 위치로 스크롤하지 않는다.
const keepSelection = (command: Command): Command => (state, dispatch) => {
  const selection = state.selection;
  return command(state, dispatch && (transaction => {
    transaction.setSelection(selection.map(transaction.doc, transaction.mapping));
    dispatch(transaction);
  }));
};

export const WritingHistory = Extension.create({
  name: "undoRedo",
  addCommands() {
    return {
      undo: () => ({ state, dispatch }) => keepSelection(undoNoScroll)(state, dispatch),
      redo: () => ({ state, dispatch }) => keepSelection(redoNoScroll)(state, dispatch),
    };
  },
  addProseMirrorPlugins() { return [history()]; },
  addKeyboardShortcuts() {
    return {
      "Mod-z": () => this.editor.commands.undo(),
      "Shift-Mod-z": () => this.editor.commands.redo(),
      "Mod-y": () => this.editor.commands.redo(),
      "Mod-я": () => this.editor.commands.undo(),
      "Shift-Mod-я": () => this.editor.commands.redo(),
    };
  },
});
