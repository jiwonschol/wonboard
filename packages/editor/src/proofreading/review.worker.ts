import { createChecker } from "./engine.mjs";
import lexicon from "../../../../third_party/spelling/generated/lexicon.json";
import morphology from "../../../../third_party/spelling/generated/morphology.json";
import type { TextSegment } from "./document";

const check = createChecker({ ...lexicon, morphology });
self.onmessage = ({ data }: MessageEvent<{ id: number; segments: TextSegment[]; personal: string[] }>) => {
  try {
    const results = data.segments.flatMap(segment => check(segment.text, data.personal).map(item => ({
      ...item, from: item.from + segment.from, to: item.to + segment.from,
    })));
    self.postMessage({ id: data.id, results });
  } catch { self.postMessage({ id: data.id, error: true }); }
};
