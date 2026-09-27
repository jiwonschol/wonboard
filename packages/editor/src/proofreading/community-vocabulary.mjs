// Original Wonboard additions (MIT). Independently authored headwords only;
// no external definitions, wordlists, or user dictionary contents are copied.
// Productive inflection/particle handling stays in the shared morphology code.
// Intentional misspellings and personal/community shorthand are not approved here.
export const communityNouns = ['비트코인', '물가지수', '내구도', '이어버드', '라우터', '프로토타입', '워크플로', '마이그레이션', '이곳', '그곳', '저곳', '측', '더불어민주당', '파일명', '항목명', '역할명', '사용자명', '곡명', '작품명', '저자명', '긴바지', '배송지', '특별전', '날것'];
// Established labels/terms recognize nominal use and particles, without
// granting a productive -하다 stem or adding candidate fragments.
export const communityNominalOnly = ['천장등', '과동아리', '해양대', '붉은사막', '님', '얼리버드', '좋아요', '싫어요', '대시보드', '플러그인', '웹사이트', '스펙', '유튜브', '팁', '정답지', '나히다', '초심배마', '호감캐', '부캐', '모루저', '샛기', '도화가', '클영상', '할모시', '클리어', '제미나이', '바이퍼'];
// Established computing terms. Preserve the author's casing in informal prose;
// other acronyms and personal entries retain their existing handling.
export const technicalAbbreviations = ['CPU', 'GPU', 'SNS', 'RSS', 'NVMe', 'OSS'];
// Reviewed English forms absent from the small bundled word list. Recognition
// only: these do not become edit-distance correction targets.
export const englishRecognizedTerms = ['umrah', 'pani', 'serializer', 'ctypes', 'india', 'clodex', 'synology', 'gmail', 'clippy', 'composable', 'matcha', 'blueboard', 'greenboard', 'hebel', 'atm', 'minecraft', 'railgun', 'randomisation', 'etc', 'ndas', 'cm', 'dxf', 'pareto', 'decompiled', 'subfunctions', 'voxile', 'non-technical', 'non-obvious', 're-stating', 'greps', 'mins', 'ok', 'softcores', 'dbase', 'vdos', 'unix', 'mhz', 'pcie', 'runtime', 'dialup', 'internet', 'llm', 'llms', 'slaughterbots', 'devops', 'captcha', 'stateful', 'openai', 'schelling', 'cli', 'imo', 'adversarially', 'codebase', 'frontend', 'micro-manage', 'readonly', 'env', 'gpt', 'refactor', 'off-guard', 'midwits', 're-reads', 'claude', 'tmp', 'dir', 'omp', "astra's", 'jev', 'backend', 'elmo', 're-training', 'trade-off', 'qwen', 'laya', 'real-time', 'multi', 'reranker', 'multiclass', 'vibed', 'idk', 'reddit', 'hominem', 'ollama', 'infringey', 'eval', 'grep', 'sandboxed', 'christmas', 'imho', 'hostname', 'xen', 'untrusted', 'non-stop', 'priori', 'async', 'lego', 'non-deterministic', 'non-trivial', 'ayn', 're-add', 'woulda', 'dem', 'non-programmers', 'spss', 'numpy', 'coursework', 'xlookup', 'multivalue', 'scrollbars', 'normalisation', 'rtmp', 'config', 'restreaming', 'duckdns', 'ints', 'initializers', 'png', 'sudo', 'pkg', 'yaml', 'gemini', 'todo', 'inline', 'influencer', 'linux', 'decispher', 'corp', 'params', 'hardcode', 'agentic', 'replit', 'regex'];
// Verified lexical stems missing from the selected inventory.
export const communityVerbStems = ['개기'];
export const communityAdjectiveStems = ['찰떡같', '불꽃같', '푹신푹신하', '개빡세'];
// Verified productive action nouns. Shared by inflection recognition and
// noun + 하다 boundary checks; personal words never enter this list.
export const communityActionNouns = ['시각화', '자동화', '암호화', '복호화', '출시', '테스트', '마이그레이션', '필터링', '덤핑', '패스', '구동', '정당화', '소포장', '세팅'];

// Development-corpus candidates. Their internal nouns may also have other
// readings; keep these out of the productive noun inventory and request review.
export const candidatePhraseBoundaries = [
  ['실패이유', '실패 이유'], ['기준자체', '기준 자체'],
  ['글쓰는게', '글 쓰는 게'], ['글쓰는거', '글 쓰는 거'],
  ['방문시점', '방문 시점'], ['피고발건', '피고발 건'],
  ['디너후기', '디너 후기'], ['중국손님', '중국 손님'],
  ['이마부분', '이마 부분'], ['추가패드', '추가 패드'],
  ['개조사진', '개조 사진'], ['마루계열', '마루 계열'],
  ['폼부분', '폼 부분'], ['조립순서', '조립 순서'],
  ['내부케이블', '내부 케이블'], ['부팅확인', '부팅 확인'],
  ['조절및', '조절 및'], ['양말신고', '양말 신고'],
  ['택시타고', '택시 타고'], ['셔틀타고', '셔틀 타고'],
  ['줄서서', '줄 서서'],
  ['각오좀', '각오 좀'], ['비교시', '비교 시'],
  ['속도때문', '속도 때문'], ['지맘대로', '지 맘대로'],
  ['주저없이', '주저 없이'], ['왔다갔다', '왔다 갔다'],
  ['안보이더군요', '안 보이더군요'], ['안보이는쪽이라', '안 보이는 쪽이라'],
  ['언제했는지', '언제 했는지'], ['위안삼고', '위안 삼고'],
  ['구입한지', '구입한 지'], ['수세기에', '수 세기에'],
  ['살돈이면', '살 돈이면'],
  ['다음날', '다음 날'], ['천년', '천 년'],
  ['십여년', '십여 년'], ['이틀차라', '이틀 차라'],
  ['제품간', '제품 간'], ['별다섯개', '별 다섯 개'],
  ['장기사용시', '장기 사용 시'],
  ['부자가되는법', '부자가 되는 법'],
  ['하자하고', '하자 하고'], ['군불때고', '군불 때고'],
  ['이악물고', '이 악물고'], ['속도때문이다로', '속도 때문이다로'],
  ['개혁의실패시', '개혁의 실패 시'],
  ['제시하고해야할텐데', '제시하고 해야 할 텐데'],
  ['몇일전', '며칠 전'], ['광점1개가', '광점 1개가'],
  ['3일인가만에', '3일인가 만에'],
  ['되버리는거', '돼 버리는 거', 'spelling'],
  ['피의복수', '피의 복수'],
  ['더이상', '더 이상'], ['말하고싶은거', '말하고 싶은 거'],
  ['그사람', '그 사람'], ['문닫기전', '문 닫기 전'],
  ['왜오르나요', '왜 오르나요'], ['추천이유좀', '추천 이유 좀'],
  ['먹이고시작할거임', '먹이고 시작할 거임'],
  ['사긴해야해', '사긴 해야 해'], ['못가니까', '못 가니까'],
  ['좀하고', '좀 하고'], ['숙제빼도', '숙제 빼도'],
  ['몸던지는거보면', '몸 던지는 거 보면'],
];

export const candidateJoinedPhrases = [
  ['상관 없이', '상관없이'], ['가나다 순', '가나다순'],
  ['안드로이드 용', '안드로이드용'],
  ['커버 되어', '커버되어'], ['마음 먹고', '마음먹고'],
  ['수 밖에', '수밖에'], ['되느냐 였는데', '되느냐였는데'],
  ['"본질" 보다', '"본질"보다'],
  ['가나다 순입니다', '가나다순입니다'],
  ['7월130만원', '7월 130만 원'],
  ['sns짜증이', 'sns 짜증이'],
  ['sns폭파시켜버리고', 'sns 폭파시켜 버리고'],
  ['광점1개가', '광점 1개가'],
  ['3일인가만에', '3일인가 만에'],
  ['4.5t 라면', '4.5t라면'], ['4.5t 지만', '4.5t지만'],
  ['성능 상으론', '성능상으론'],
  ['발 밑에', '발밑에'],
  ['남겨보려고합니 다', '남겨보려고 합니다'],
  ['MSI꺼', 'MSI 거'],
];
