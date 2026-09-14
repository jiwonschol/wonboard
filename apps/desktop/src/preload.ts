import { contextBridge, ipcRenderer } from "electron";
import type { DesktopStorage } from "./bridge";

const storage: DesktopStorage = {
  list: () => ipcRenderer.invoke("drafts:list"),
  load: id => ipcRenderer.invoke("drafts:load", id),
  save: (draft, revision) => ipcRenderer.invoke("drafts:save", draft, revision),
};
contextBridge.exposeInMainWorld("wonboardDesktop", storage);
