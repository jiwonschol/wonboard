import { contextBridge, ipcRenderer, webFrame } from "electron";
import type { DesktopEditing } from "@wonboard/editor";
import type { DesktopStorage } from "./bridge";

const storage: DesktopStorage = {
  filesList: () => ipcRenderer.invoke("drafts:filesList"),
  filesLoad: id => ipcRenderer.invoke("drafts:filesLoad", id),
  filesUpload: (file, bytes) => ipcRenderer.invoke("drafts:filesUpload", file, bytes),
  filesChange: (id, revision, change) => ipcRenderer.invoke("drafts:filesChange", id, revision, change),
  filesRemove: (id, revision) => ipcRenderer.invoke("drafts:filesRemove", id, revision),
  remove: (id, revision) => ipcRenderer.invoke("drafts:remove", id, revision),
  list: () => ipcRenderer.invoke("drafts:list"),
  load: id => ipcRenderer.invoke("drafts:load", id),
  save: (draft, revision) => ipcRenderer.invoke("drafts:save", draft, revision),
};
contextBridge.exposeInMainWorld("wonboardDesktop", storage);
// 편집기의 우클릭 메뉴가 운영체제 맞춤법 추천과 붙여넣기를 쓸 수 있게 한다.
let historyHandler: ((action: "undo" | "redo") => boolean) | undefined;
// 편집기가 없는 읽기 전용 화면에서도 검색창의 기본 실행 취소는 동작해야 한다.
ipcRenderer.on("edit:history", (_event, action: unknown) => {
  if (action !== "undo" && action !== "redo") return;
  if (!historyHandler?.(action)) void ipcRenderer.invoke("edit:nativeHistory", action);
});
const editing: DesktopEditing = {
  isMisspelled: word => webFrame.isWordMisspelled(word),
  suggestions: word => webFrame.getWordSuggestions(word),
  paste: () => { void ipcRenderer.invoke("edit:paste"); },
  onHistory: handler => {
    historyHandler = handler;
    return () => { if (historyHandler === handler) historyHandler = undefined; };
  },
};
contextBridge.exposeInMainWorld("wonboardDesktopEditing", editing);
contextBridge.exposeInMainWorld("wonboardDesktopPdf", { create: () => ipcRenderer.invoke("document:pdf") });
// 종료 경고창이 화면 언어를 따르도록, 화면이 <html lang>을 바꿀 때마다 알린다.
window.addEventListener("DOMContentLoaded", () => {
  const report = () => { void ipcRenderer.invoke("ui:locale", document.documentElement.lang); };
  report();
  new MutationObserver(report).observe(document.documentElement, { attributes: true, attributeFilter: ["lang"] });
});
