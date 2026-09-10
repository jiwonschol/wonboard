export type Finding = {
  from: number; to: number; original: string; language: "ko" | "en";
  type: "spelling" | "spacing" | "unknown"; suggestions: string[];
  base?: string; applicable: boolean; reason: string; ambiguous?: boolean;
};
export function createChecker(data: {
  ko: Record<string, string[]>; en: string[];
  morphology: { forms: string[][]; adverbs: string[]; recognizedNouns?: string[] };
}): (text: string, personalWords?: string[]) => Finding[];
