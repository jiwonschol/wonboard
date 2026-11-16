import { expect, it, vi } from "vitest";

const bridge = vi.hoisted(() => ({
  exposeInMainWorld: vi.fn(),
  on: vi.fn(),
  invoke: vi.fn(),
}));
vi.mock("electron", () => ({
  contextBridge: { exposeInMainWorld: bridge.exposeInMainWorld },
  ipcRenderer: { on: bridge.on, invoke: bridge.invoke },
  webFrame: {},
}));

it("keeps native history available before editor mount and after editor unmount", async () => {
  vi.stubGlobal("window", { addEventListener: vi.fn() });
  try {
    await import("../../apps/desktop/src/preload");
    const listener = bridge.on.mock.calls.find(([name]) => name === "edit:history")![1];
    const editing = bridge.exposeInMainWorld.mock.calls.find(([name]) => name === "wonboardDesktopEditing")![1];
    listener({}, "undo");
    expect(bridge.invoke).toHaveBeenLastCalledWith("edit:nativeHistory", "undo");
    bridge.invoke.mockClear();
    const handler = vi.fn(() => true);
    const unsubscribe = editing.onHistory(handler);
    listener({}, "undo");
    expect(handler).toHaveBeenCalledWith("undo");
    expect(bridge.invoke).not.toHaveBeenCalled();
    handler.mockReturnValue(false);
    listener({}, "redo");
    expect(bridge.invoke).toHaveBeenLastCalledWith("edit:nativeHistory", "redo");
    unsubscribe();
    bridge.invoke.mockClear();
    listener({}, "undo");
    listener({}, "redo");
    expect(bridge.invoke.mock.calls).toEqual([["edit:nativeHistory", "undo"], ["edit:nativeHistory", "redo"]]);
    listener({}, "paste");
    expect(bridge.invoke).toHaveBeenCalledTimes(2);
  } finally { vi.unstubAllGlobals(); }
});
