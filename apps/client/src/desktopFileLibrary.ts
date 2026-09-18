import { prepareFile, type FileLibrary } from "./fileLibrary";

export function openDesktopFileLibrary(): FileLibrary {
  const storage = window.wonboardDesktop;
  if (!storage) throw new Error("storageFailed");
  return {
    list: () => storage.filesList(),
    async load(id) {
      const { file, bytes } = await storage.filesLoad(id);
      return { file, blob: new Blob([bytes], { type: file.mime }) };
    },
    async upload(input) {
      const { file, bytes } = await prepareFile(input);
      return storage.filesUpload(file, bytes);
    },
    change: (id, revision, change) => storage.filesChange(id, revision, change),
    remove: (id, revision) => storage.filesRemove(id, revision),
    close() {},
  };
}
