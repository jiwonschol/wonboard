import { app, BrowserWindow, dialog, ipcMain, Menu, net, protocol, session } from "electron";
import { join, resolve, relative, isAbsolute } from "node:path";
import { pathToFileURL } from "node:url";
import { openDesktopStore } from "./store";

app.setName("Wonboard");
protocol.registerSchemesAsPrivileged([{ scheme: "wonboard", privileges: {
  standard: true, secure: true, supportFetchAPI: true, corsEnabled: true,
} }]);
const ownsLock = app.requestSingleInstanceLock();
if (!ownsLock) app.quit();
let window: BrowserWindow | null = null;
app.on("second-instance", () => { window?.show(); window?.focus(); });

if (ownsLock) void app.whenReady().then(() => {
  const store = openDesktopStore(join(app.getPath("userData"), "library"));
  app.once("will-quit", () => store.close());
  const renderer = join(__dirname, "renderer");
  protocol.handle("wonboard", async request => {
    const url = new URL(request.url);
    if (url.host !== "app" || request.method !== "GET") return new Response(null, { status: 403 });
    let pathname: string;
    try { pathname = decodeURIComponent(url.pathname); } catch { return new Response(null, { status: 400 }); }
    const file = resolve(renderer, "." + (pathname === "/" ? "/index.html" : pathname));
    const child = relative(renderer, file);
    if (child.startsWith("..") || isAbsolute(child)) return new Response(null, { status: 403 });
    try {
      const response = await net.fetch(pathToFileURL(file).href);
      const headers = new Headers(response.headers);
      headers.set("Content-Security-Policy", "default-src 'self'; script-src 'self' 'wasm-unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' blob: data: https: http:; font-src 'self' data:; connect-src 'self' blob:; worker-src 'self' blob:; frame-src https://www.youtube.com https://www.youtube-nocookie.com https://player.vimeo.com; object-src 'none'; base-uri 'none'");
      return new Response(response.body, { status: response.status, headers });
    }
    catch { return new Response(null, { status: 404 }); }
  });
  session.defaultSession.setPermissionRequestHandler((_wc, _permission, callback) => callback(false));
  session.defaultSession.setPermissionCheckHandler(() => false);
  for (const operation of ["list", "load", "save"] as const) {
    ipcMain.handle(`drafts:${operation}`, (event, ...args) => {
      if (!window || event.sender !== window.webContents || event.senderFrame !== window.webContents.mainFrame ||
          !event.senderFrame.url.startsWith("wonboard://app/")) throw new Error("unauthorized");
      if (operation === "list") return store.list();
      if (operation === "load") return store.load(args[0]);
      return store.save(args[0], args[1]);
    });
  }
  const createWindow = () => {
    window = new BrowserWindow({ width: 1440, height: 960, minWidth: 800, minHeight: 600, title: "Wonboard",
      webPreferences: { preload: join(__dirname, "preload.cjs"), contextIsolation: true, nodeIntegration: false, sandbox: true } });
    window.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
    window.webContents.on("will-navigate", event => event.preventDefault());
    window.webContents.on("will-prevent-unload", async () => {
      // Keep the window open while unsaved edits are present; do not silently discard them.
      await dialog.showMessageBox(window!, { type: "warning", message: "아직 저장되지 않은 글이 있습니다. / Unsaved changes",
        detail: "저장이 완료된 뒤 다시 종료해주세요. / Finish saving before closing.", buttons: ["확인 / OK"] });
    });
    window.on("closed", () => { window = null; });
    void window.loadURL("wonboard://app/");
  };
  Menu.setApplicationMenu(Menu.buildFromTemplate([
    ...(process.platform === "darwin" ? [{ role: "appMenu" as const }] : []),
    { role: "fileMenu" }, { role: "editMenu" }, { role: "viewMenu" }, { role: "windowMenu" },
  ]));
  createWindow();
  app.on("activate", () => { if (!window) createWindow(); });
});
app.on("window-all-closed", () => { if (process.platform !== "darwin") app.quit(); });
