import { Extension } from "@tiptap/core";
import { history, undoNoScroll, redoNoScroll } from "@tiptap/pm/history";
import type { Command } from "@tiptap/pm/state";

// Undo changes the document, not the writer's current reading position. Map the
// current selection through the inverse steps instead of restoring an old one.
const keepSelection = (command: Command): Command => (state, dispatch) => {
  const selection = state.selection;
  return command(state, dispatch && (transaction => {
    transaction.setSelection(selection.map(transaction.doc, transaction.mapping));
    dispatch(transaction.scrollIntoView());
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
