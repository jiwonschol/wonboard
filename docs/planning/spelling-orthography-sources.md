# 표기 규칙 출처 / 2026-09-10

* 보조 용언 붙임 허용: [국립국어원 제47항 상담](https://www.korean.go.kr/front/onlineQna/onlineQnaView.do?mn_id=216&qna_seq=308411). 활용형이 두 음절인 경우 붙임이 허용됨을 확인했다. `알려주려고`처럼 축약 모음이 있는 활용도 불필요하게 띄우지 않는다. `-잖아요`는 [국립국어원 분석 지침](https://korean.go.kr/common/download.do?c_file_name=35c6ff74-7598-438d-ab4c-a7d91a5908d9.pdf&file_path=reportData)의 종결 어미 분석을 확인하고 정상 표현을 보존한다. 해당 말뭉치나 설명을 데이터로 수록하지 않는다.

* 대물림: [한국어기초사전 표제어](https://krdict.korean.go.kr/m/eng/searchResultView?ParaWordNo=58141&currentPage=27&exaType=&font_size=12&mainSearchWord=%EB%8C%80&nation=eng&nationCode=6&proverbType=&searchType=W&sort=W&viewType=A&wordMatchFlag=N). 이어 물려준다는 뜻의 명사 표기만 확인했다. `되물림` 뒤의 조사/되- 활용형에 의미 확인이 필요한 후보를 제공한다. 사전의 정의·예문은 수록하지 않는다.

* 굳이: [국립국어원 어문 규범](https://korean.go.kr/kornorms/m/m_regltn.do)의 표기/구개음화 예. 단독 `구지`에 `굳이`를 제안하며 사용자 사전은 우선한다. 발음에 따른 표기와 표준 표기를 구별한다.
* 안/않-: [국립국어원 2021년 8월 소식지](https://www.korean.go.kr/nkview/news_pdf/2021_8.pdf). 부정 부사와 보조 용언 어간의 차이를 확인하고, 기존 되어/돼 규칙과 결합해 `않되요`에 `안 돼요`를 제안한다. 일반 `않-` 문자열은 바꾸지 않는다.
* 형태 연결 제한: 데이터의 선어말어미 목록에는 구어 조각도 있으므로 임의 연결하지 않는다. 자체 분석은 시/으시/았/었/였/겠/더 결합에 한정한다. 한 음절 명사 전체에 하다를 결합하면 나하다 같은 잘못된 활용이 생겨, 누락된 `말하다` 어간만 보충했다. 독립된 정상 표현 시험으로 확인한다.

* 환골탈태: [국립국어원 신문언어 안내](https://www.korean.go.kr/common/download.do?c_file_name=ddd92678-70b3-4dbb-ac7c-ddfeaf23f3d7_0.pdf&file_path=reportData). 표기 사실만 확인했다. 어려운 말을 피하라는 문체 권고는 구현하지 않는다. 명사·조사·제한된 하다 활용을 처리한다.
* 어이없다: [한국어기초사전 표제어](https://krdict.korean.go.kr/eng/dicSearch/SearchView?ParaWordNo=67108&nation=eng). 어의 전체를 바꾸지 않고 `어의없-`과 인식 가능한 어미 결합에 후보를 제공한다. 의미 선택이 남는 후보이므로 모호함을 표시한다. 사전 해설·예문을 복제하지 않았다.

* 걸로/뭘로: [국립국어원 제33항 설명](https://www.korean.go.kr/front/onlineQna/onlineQnaView.do?mn_id=216&qna_seq=328332), [무엇으로 축약](https://www.korean.go.kr/front/onlineQna/onlineQnaView.do?mn_id=216&pageIndex=1&qna_seq=326210&searchCondition=&searchKeyword=), [새걸로](https://www.korean.go.kr/front/onlineQna/onlineQnaView.do?mn_id=&pageIndex=1&qna_seq=320261). 허용된 준말을 정상 분석에 추가했다. `그걸로`를 비슷한 철자의 `그길로`로 바꾸지 않는다. fresh-v4에서 처음 드러난 실패로, 수정 후 재사용 결과는 독립 평가가 아니다.

* 뒤치다꺼리: [국립국어원 상담백서](https://korean.go.kr/common/download.do?c_file_name=516a4d02-abfc-4a25-8ece-68d5f853fe81_0.pdf&file_path=reportData). 명사 표기 사실을 확인하고 조사 결합 범위에 적용한다.
* 희한하다: [국립국어원 정제 사업 보고서](https://www.korean.go.kr/common/download.do?c_file_name=465cdd91-2eb7-4921-9e47-60f1578b4548.pdf&file_path=reportData), [한국어 교육 어휘 자료](https://www.korean.go.kr/common/download.do?c_file_name=f8313ff7-b33b-43b6-a01e-a8af43eb6a1d.pdf&file_path=reportData). 희안/희한 표기와 형용사 희한하다를 교차 확인했다. 표나 예문은 수록하지 않고 제한된 하다 활용형만 자체 작성했다.

* 역할: [국립국어원 상담 9248](https://www.korean.go.kr/front/mcfaq/mcfaqView.do?mcfaq_seq=9248&mn_id=217). 역활은 역할의 오기라는 표기 사실을 확인했다. 명사 전체 또는 조사 결합에만 적용한다.
* 어떻해: [국립국어원 설명](https://www.korean.go.kr/front/onlineQna/onlineQnaView.do?mn_id=73&pageIndex=1&qna_seq=327188). 어떻게/어떡해 두 후보를 제공하고 문맥 선택이 필요함을 표시한다. 설명 전체 중 의문문만 가능하다는 단정은 채택하지 않았다. 자체 규칙은 틀린 표기 하나와 두 후보의 문법적 역할 차이만 사용한다.

* 왠지·웬만하다: [국립국어원 상담 6103](https://www.korean.go.kr/front/mcfaq/mcfaqView.do?mcfaq_seq=6103), [웬/왠 설명](https://www.korean.go.kr/nkview/nknews/200203/44_12.html). 부사의 표기와 웬만하다의 어근을 확인했다. 자체 구현은 완전 일치 또는 제한된 하다 활용형에 적용하고 이름 내부 문자열을 바꾸지 않는다.
* 뵈요/봬요: [국립국어원 상담 8554](https://korean.go.kr/front/mcfaq/mcfaqView.do?mcfaq_seq=8554&mn_id=46&pageIndex=12). 뵈어요의 축약이며 뵈-에 요를 바로 결합하지 않는다. 기존 되-/돼- 규칙과 함께 단독 뵈요·되요를 처리한다. 뵈면·되고 같은 정상 어미는 보존한다.
* 꼼꼼히: [국립국어원 공공언어 안내 개정판](https://korean.go.kr/common/download.do?c_file_name=f595077c-82b4-42a5-8ab6-0c31fef547ff.pdf&file_path=etcData). 확인한 표기 사실만 자체 규칙에 사용한다. 설명·예문·검사기 응답을 데이터로 복제하지 않는다.

* 수량과 단위: [국립국어원 제43항 해설](https://www.korean.go.kr/kornorms/m/m_regltn.do). 수량 단위는 띄어 쓰지만 시각·순서 등은 붙임이 허용된다. `두시` 같은 시각은 변경 추천 대상에서 제외했다. 현재 후보는 제한된 수량 표현에만 적용하고 문맥 확인 표시를 붙인다.

형태 분석용 사전은 비표준/구어형도 인식한다. 그 결과를 표준 표기 여부와 분리한다. 아래는 자체 작성한 제한된 규칙이며 전체 어휘 사전을 손으로 대체하는 것이 아니다. 시험지에서 본 유형이 포함되어 있으므로 점수를 독립 평가라고 주장하지 않는다.

* 며칠/설거지: [국립국어원 새국어소식](https://www.korean.go.kr/nkview/nknews/200512/89_3.html). 제27항 관련 설명에서 잘못된 표기와 올바른 표기를 확인했다. 해설은 복제하지 않았다. 자체 예: `몇일동안`은 조사 여부가 불명확하면 자동 범위 확장하지 않고, `몇일을`에는 `며칠을` 후보를 만든다.
* 오랜만: [국립국어원 상담 자료](https://www.korean.go.kr/nkview/nklife/2002_1/2002_0114.pdf). 오래간만의 준말. 자체 예: `오랫만이네`는 현재 조합 범위 밖이며 `오랫만에`는 후보를 만든다. 아무 문자열 안의 부분 일치를 치환하지 않는다.
* -이/-히: [국립국어원 제51항 안내](https://www.korean.go.kr/front/onlineQna/onlineQnaView.do?mn_id=216&pageIndex=1&qna_seq=305784)와 [공식 교육 자료](https://www.korean.go.kr/common/download.do?c_file_name=f3732b4f-8303-4b80-94e4-542c5636e353_0.pdf&file_path=etcData&o_file_name=바른%20국어%20생활.pdf). 짧은 규정 구절: “부사의 끝음절이 분명히 ‘이’로만 나는 것은 ‘-이’로 적고”. 전체 히를 이로 바꾸지 않고 확인된 소수 부사만 처리한다. 자체 예: `산뜻히` → `산뜻이`.
* 되-/됐-: 제35항 붙임2의 되어/돼 축약, [국립국어원 FAQ](https://www.korean.go.kr/front/mcfaq/mcfaqView.do?mcfaq_seq=5827&mn_id=217&pageIndex=1). 자체 예: `됬지만` → `됐지만`. 뒤에 인식되는 어미가 붙은 경우에만 적용한다.

`금새`는 실제로 물건값을 뜻하는 정상 명사이기도 하므로 무조건 `금세`로 바꾸는 규칙을 추가하지 않았다. [국립국어원 확인](https://www.korean.go.kr/front/onlineQna/onlineQnaView.do?mn_id=216&pageIndex=1&qna_seq=305617). `낳으세요` 같은 문맥 의존 표기도 이번 규칙에서 강제하지 않는다. 관련 평가 사례는 분모에 남아 있다.
