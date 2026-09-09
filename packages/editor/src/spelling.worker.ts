import { loadModule } from "hunspell-asm";

// Each review owns a worker; closing the dialog also releases its WASM heap.
self.onmessage = async (event: MessageEvent<string[]>) => {
  try {
    const [factory, ...data] = await Promise.all([
      loadModule(),
      ...["ko.aff", "ko.dic"].map(async name => {
        const response = await fetch(`/spelling/ko/${name}`);
        if (!response.ok) throw new Error("Dictionary unavailable");
        return new Uint8Array(await response.arrayBuffer());
      }),
    ]);
    const aff = factory.mountBuffer(data[0]);
    const dic = factory.mountBuffer(data[1]);
    const checker = factory.create(aff, dic);
    try {
      for (const word of new Set(event.data)) {
        if (!checker.spell(word)) self.postMessage({ word, suggestions: checker.suggest(word).slice(0, 5) });
      }
      self.postMessage({ done: true });
    } finally { checker.dispose(); factory.unmount(aff); factory.unmount(dic); }
  } catch (error) { self.postMessage({ error: error instanceof Error ? error.message : "Engine failure" }); }
};
