export type Finding = {
  from: number; to: number; original: string; language: "ko" | "en";
  type: "spelling" | "spacing" | "grammar" | "unknown"; suggestions: string[];
  base?: string; applicable: boolean; reason: string; ambiguous?: boolean;
  reviewKind?: "community";
  analysisLimit?: number;
};
export function createChecker(data: {
  ko: Record<string, string[]>; en: string[];
  morphology: { forms: string[][]; adverbs: string[]; recognizedNouns?: string[]; recognizedPlaceNames?: string[] };
}): (text: string, personalWords?: string[], boundary?: { afterProtected?: boolean }) => Finding[];
