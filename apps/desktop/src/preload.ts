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
const editing: DesktopEditing = {
  isMisspelled: word => webFrame.isWordMisspelled(word),
  suggestions: word => webFrame.getWordSuggestions(word),
  paste: () => { void ipcRenderer.invoke("edit:paste"); },
};
contextBridge.exposeInMainWorld("wonboardDesktopEditing", editing);
