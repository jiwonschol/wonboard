import { useState } from "react";
import { createRoot } from "react-dom/client";
import { WonboardEditor } from "@wonboard/editor";
import { emptyContent, type ContentNode } from "@wonboard/document";
import "@wonboard/editor/style.css";

function Example() {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState<ContentNode>(emptyContent);
  return (
    <div style={{ height: "100dvh", display: "flex", flexDirection: "column" }}>
      <header style={{ padding: 16, fontFamily: "system-ui", fontSize: 13 }}>
        Wonboard · 홈페이지 연결 예제 — 저장과 사진 처리는 호스트가 연결합니다.
      </header>
      <WonboardEditor
        content={content}
        title={title}
        locale="ko"
        documentLocale="ko"
        mediaUrls={{}}
        media={{}}
        onTitleChange={setTitle}
        onChange={setContent}
        onImages={async () => {
          alert("이 예제에는 사진 저장소를 연결하지 않았습니다.");
        }}
      />
      <details style={{ padding: 16 }}>
        <summary>호스트가 받은 문서</summary>
        <pre style={{ maxHeight: 160, overflow: "auto" }}>
          {JSON.stringify({ title, content }, null, 2)}
        </pre>
      </details>
    </div>
  );
}
createRoot(document.getElementById("root")!).render(<Example />);
