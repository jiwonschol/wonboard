// 설치 마법사: 단계를 하나씩 보여 주고, 지금 단계를 이 브라우저에 기억한다.
// 스크립트가 없으면 모든 단계와 해결 방법이 펼쳐진 채로 읽힌다.
const steps = Array.from(document.querySelectorAll(".wstep"));
const progress = document.getElementById("wizard-progress");
const storageKey = "wonboard-install-step";
const issues = "https://github.com/jiwonschol/wonboard/issues/new";
const last = steps.length - 1;

function saved() {
  try { const value = Number(localStorage.getItem(storageKey)); return Number.isInteger(value) && value >= 0 && value <= last ? value : 0; }
  catch { return 0; }
}
function show(index, focus) {
  steps.forEach((step, i) => { step.hidden = i !== index; });
  progress.textContent = index < last ? `지금 ${index}단계 (0~${last - 1}단계 중)` : "설치 끝";
  try { localStorage.setItem(storageKey, String(index)); } catch {}
  if (focus) steps[index].querySelector("h2").focus();
}

document.documentElement.classList.add("js");
for (const [index, step] of steps.entries()) {
  const help = step.querySelector(".whelp");
  const no = step.querySelector("[data-no]");
  if (help) help.hidden = true;
  step.querySelector("[data-yes]")?.addEventListener("click", () => show(index + 1, true));
  no?.addEventListener("click", () => {
    help.hidden = !help.hidden;
    no.setAttribute("aria-expanded", String(!help.hidden));
  });
  step.querySelector("[data-back]")?.addEventListener("click", () => show(index - 1, true));
  // 「막혔어요」는 단계와 확인 질문을 미리 채운 새 이슈를 연다.
  const stuck = step.querySelector(".stuck");
  if (stuck) {
    const title = step.querySelector("h2").textContent;
    const question = step.querySelector(".wq")?.textContent ?? "";
    const body = `설치 마법사 단계: ${title}\n확인 질문: ${question}\n\n어떤 화면이 나왔는지, ChatGPT가 알려 준 안내나 오류를 적어 주세요.\n\n(연결 ID·이메일·사이트 주소는 지우고 올려 주세요.)\n`;
    stuck.href = `${issues}?title=${encodeURIComponent(`설치 마법사에서 막혔어요: ${title}`)}&body=${encodeURIComponent(body)}`;
    stuck.target = "_blank";
    stuck.rel = "noopener";
  }
}
document.getElementById("restart").addEventListener("click", () => show(0, true));
show(saved(), false);

// 설치 문장 복사. 문장을 미리 채워 ChatGPT를 여는 링크는 공식 문서에 없어서 쓰지 않는다.
const prompt = document.getElementById("install-prompt");
const status = document.getElementById("copy-status");
const details = prompt.closest("details");

/** 클릭 처리 안에서 바로 끝나는 복사. */
function copyNow() {
  const wasOpen = details.open;
  details.open = true;
  prompt.select();
  let copied = false;
  try { copied = document.execCommand("copy"); } catch {}
  window.getSelection()?.removeAllRanges();
  details.open = wasOpen;
  return copied;
}
async function copyLater() {
  try { await navigator.clipboard.writeText(prompt.value); return true; } catch { return false; }
}
document.getElementById("copy-button").addEventListener("click", async event => {
  const button = event.currentTarget;
  if (copyNow() || await copyLater()) {
    status.textContent = "설치 문장을 복사했습니다. Work 화면의 입력창에 붙여넣고 보내 주세요.";
    button.focus();
    return;
  }
  details.open = true;
  prompt.focus();
  prompt.select();
  status.textContent = "복사하지 못했습니다. 펼쳐진 설치 문장 전체를 직접 복사해 주세요.";
});
