import type { Editor } from "@tiptap/core";

export const bodyStyleAttributes = ["variant", "fontSize", "textColor"];

export function setBodyStyle(editor: Editor) {
  const { empty, from, $from } = editor.state.selection;
  const chain = editor.chain().focus().setParagraph().resetAttributes("paragraph", bodyStyleAttributes);
  if (empty && $from.parent.isTextblock) {
    chain.setTextSelection({ from: $from.start(), to: $from.end() });
  }
  for (const mark of ["bold", "italic", "underline", "strike", "code", "textStyle"]) chain.unsetMark(mark);
  if (empty) chain.setTextSelection(from);
  return chain.run();
}
