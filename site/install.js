// 설치 버튼: 설치 문장을 클립보드에 복사하고 ChatGPT를 연다.
// 문장을 미리 채워 여는 링크는 공식 문서에 없어서 쓰지 않는다.
const prompt = document.getElementById("install-prompt");
const status = document.getElementById("copy-status");
const details = prompt.closest("details");

/** 클릭 처리 안에서 바로 끝나는 복사. 새 탭이 열리기 전에 결과를 알 수 있다. */
function copyNow() {
  const wasOpen = details.open;
  details.open = true;
  prompt.select();
  let copied = false;
  try { copied = document.execCommand("copy"); } catch {}
  window.getSelection()?.removeAllRanges();
  prompt.blur();
  details.open = wasOpen;
  return copied;
}
async function copyLater() {
  try { await navigator.clipboard.writeText(prompt.value); return true; } catch { return false; }
}
function failed() {
  details.open = true;
  prompt.focus();
  prompt.select();
  status.textContent = "복사하지 못했습니다. 아래 설치 문장 전체를 직접 복사한 뒤 ChatGPT에 붙여넣어 주세요.";
}

document.getElementById("install-button").addEventListener("click", event => {
  if (copyNow()) {
    status.textContent = "설치 문장을 복사했습니다. 새 탭으로 열린 ChatGPT의 입력창에 붙여넣어 주세요.";
    return; // 링크가 ChatGPT를 새 탭으로 연다.
  }
  event.preventDefault();
  void copyLater().then(copied => {
    if (!copied) return failed();
    const link = Object.assign(document.createElement("a"),
      { href: "https://chatgpt.com/", target: "_blank", rel: "noopener", textContent: "ChatGPT 열기" });
    status.replaceChildren("설치 문장을 복사했습니다. ", link, "를 눌러 입력창에 붙여넣어 주세요.");
  });
});
document.getElementById("copy-button").addEventListener("click", async () => {
  if (copyNow() || await copyLater()) status.textContent = "설치 문장을 복사했습니다.";
  else failed();
});
