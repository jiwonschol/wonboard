import { contextBridge, ipcRenderer } from "electron";
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
