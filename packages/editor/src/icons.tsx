import type { ReactNode } from "react";
const paths: Record<string, ReactNode> = {
  "align-left": <path d="M4 5h16M4 10h10M4 15h16M4 20h10" />,
  "align-center": <path d="M4 5h16M7 10h10M4 15h16M7 20h10" />,
  "align-right": <path d="M4 5h16M10 10h10M4 15h16M10 20h10" />,
  link: <path d="m10 14 4-4M9 16l-2 2a4 4 0 0 1-5-5l4-4a4 4 0 0 1 5 0m2-1 2-2a4 4 0 0 1 5 5l-4 4a4 4 0 0 1-5 0" />,
  "clear-format": <path d="m14 3 7 7-10 10H7l-5-5L14 3Zm-8 8 7 7M11 20h10" />,
  attachments: <path d="m8 13 7-7a3 3 0 0 1 4 4L9 20a5 5 0 0 1-7-7L13 2m-7 13 9-9" />,
  plus: <path d="M12 5v14M5 12h14" />,
  back: <path d="m14 7-5 5 5 5" />,
  close: <path d="m7 7 10 10M17 7 7 17" />,
  undo: (
    <>
      <path d="m9 6-5 5 5 5M4 11h10a5 5 0 0 1 5 5" />
    </>
  ),
  redo: <path d="m15 6 5 5-5 5M20 11H10a5 5 0 0 0-5 5" />,
  overview: <path d="M4 6h12M8 12h12M4 18h12" />,
  settings: (
    <>
      <rect x="4" y="4" width="16" height="16" />
      <path d="M14 4v16" />
    </>
  ),
  preview: (
    <>
      <path d="M4 7h16v11H4zM2 19h20" />
    </>
  ),
  more: (
    <>
      <circle cx="12" cy="5" r=".8" />
      <circle cx="12" cy="12" r=".8" />
      <circle cx="12" cy="19" r=".8" />
    </>
  ),
  paragraph: (
    <>
      <path
        fill="currentColor"
        stroke="none"
        d="M13 4H9a5 5 0 0 0 0 10h1v6h2V6h2v14h2V6h2V4z"
      />
    </>
  ),
  image: (
    <>
      <rect x="3" y="4" width="18" height="16" />
      <circle cx="8" cy="9" r="1.5" />
      <path d="m3 17 5-5 4 4 3-3 6 6" />
    </>
  ),
  heading: <path d="M5 4v16M19 4v16M5 12h14" />,
  bulletList: (
    <>
      <path d="M8 6h13M8 12h13M8 18h13" />
      <path strokeWidth="3" d="M3 6h.1M3 12h.1M3 18h.1" />
    </>
  ),
  orderedList: (
    <>
      <path d="M9 6h12M9 12h12M9 18h12M3 3h1v6M2 13c4-3 4 1 0 4v2h4" />
    </>
  ),
  blockquote: <path d="M4 6h6v6H6c-1 3 0 4 3 5M14 6h6v6h-4c-1 3 0 4 3 5" />,
  codeBlock: <path d="m7 6-5 6 5 6m10-12 5 6-5 6M14 3l-4 18" />,
  horizontalRule: <path d="M3 12h18" />,
  sliders: (
    <>
      <path d="M4 7h16M4 17h16" />
      <circle cx="9" cy="7" r="2" fill="currentColor" />
      <circle cx="15" cy="17" r="2" fill="currentColor" />
    </>
  ),
};
export function Icon({ name }: { name: string }) {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      aria-hidden="true"
    >
      {paths[name] ?? paths.paragraph}
    </svg>
  );
}
