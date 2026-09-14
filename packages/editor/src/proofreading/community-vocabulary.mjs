// Original Wonboard additions (MIT). Independently authored headwords only;
// no external definitions, wordlists, or user dictionary contents are copied.
// Productive inflection/particle handling stays in the shared morphology code.
// Intentional misspellings and personal/community shorthand are not approved here.
export const communityNouns = ['비트코인', '물가지수', '내구도', '이어버드', '라우터', '프로토타입', '워크플로', '마이그레이션', '이곳', '그곳', '저곳', '측', '더불어민주당', '파일명', '항목명', '역할명', '사용자명', '곡명', '작품명', '저자명', '긴바지', '배송지', '특별전', '날것'];
// Established labels/terms recognize nominal use and particles, without
// granting a productive -하다 stem or adding candidate fragments.
export const communityNominalOnly = ['님', '얼리버드', '좋아요', '싫어요', '대시보드', '플러그인', '웹사이트'];
// Established computing terms. Preserve the author's casing in informal prose;
// other acronyms and personal entries retain their existing handling.
export const technicalAbbreviations = ['CPU', 'GPU'];
// Verified lexical stems missing from the selected inventory.
export const communityVerbStems = ['개기'];
export const communityAdjectiveStems = ['찰떡같', '불꽃같', '푹신푹신하'];
// Verified productive action nouns. Shared by inflection recognition and
// noun + 하다 boundary checks; personal words never enter this list.
export const communityActionNouns = ['시각화', '자동화', '암호화', '복호화', '출시', '테스트', '마이그레이션', '필터링', '덤핑', '패스', '구동', '정당화', '소포장', '세팅'];
