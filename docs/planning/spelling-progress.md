# 통합 맞춤법 검사 실행 기록

## 2026-09-10 — 착수 / 복구 지점

사용자 실행 승인으로 issue #6의 2026-09-09 개정 계획을 수행한다. PR 생성과 배포는 승인 범위가 아니다. 자체 시험지의 수치는 독립 평가가 아니다.

작업 경로: `/Users/jiwon/develop/projects/wonboard`.

`git rev-parse HEAD`:
```
1deaddf1d51125ec22d04ba0f43eb640cc1824af
```
`git branch --show-current`:
```
codex/desktop-local-storage
```
`git log --oneline -5`:
```
1deaddf Add shared Electron desktop client with local SQLite storage
0c3c3b4 Add local Korean spelling review and personal dictionary
fde2b8b Merge main safety fixes and align editor mark validation
431ad1b feat: refine writing toolbar fonts and Sites client integration
3d73a67 feat: 웹 작성기 초기 구현과 저장소 결정 보류 기록 (#2)
```
`git status --short`:
```
 M packages/editor/src/SpellcheckTool.tsx
 M packages/editor/src/spelling.css
 M packages/editor/src/style.css
 M packages/locales/src/index.ts
 M tests/e2e/spelling.spec.ts
?? docs/.DS_Store
?? docs/planning/korean-proofreading-plan.md
?? docs/spelling-engine-evaluation.md
?? packages/editor/src/WhitespaceTool.tsx
?? packages/editor/src/whitespace.ts
?? tests/e2e/whitespace.spec.ts
?? tests/unit/whitespace.test.ts
```

복구 커밋은 SpellcheckTool, spelling.css, spelling E2E 및 계획/조사 문서에 한정한다. style.css와 locales의 미커밋 diff는 문단 정리 트랙이므로 그대로 보존하고 포함하지 않는다. 기존 엔진과 사용자 데이터는 변경하지 않았다.
