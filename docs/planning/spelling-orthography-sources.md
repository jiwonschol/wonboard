# 표기 규칙 출처 / 2026-09-10

## 후속172 — 시간·위치 명사 뒤 쯤

[국립국어원 쯤 결합 상담](https://www.korean.go.kr/front/onlineQna/onlineQnaView.do?mn_id=216&pageIndex=1&qna_seq=324970&searchCondition=&searchKeyword=)을 다시 읽고, [지금쯤의 파생 설명](https://m.korean.go.kr/front/onlineQna/onlineQnaView.do?mn_id=216&pageIndex=1&qna_seq=312870)도 확인했다. 기존 수량 범위와 제한된 시간·위치 명사에만 접미사 결합 인식을 적용했다. 전체 명사에 무조건 파생을 허용하지 않는다. 정의·예문을 배포 데이터에 복제하지 않았다. 개발 필수343/448·정상 오제안0/744는 독립 완료 증거가 아니다.

## 후속170 — Apache 지명 인식 자료

기존 MeCab 고정 revision의 [Place.csv](https://github.com/lindera/mecab-ko-dic/blob/12439fb32808b9244ded56d7dfed96e4b8d76869/Place.csv)를 조사하고 같은 revision의 COPYING과 보존 Apache-2.0 고지의 바이트 일치를 확인했다. 지명 30,240개를 일반 명사·개인 사전과 별도 필드로 추출했다. 출처·변경 고지·해시는 생성 manifest와 third_party/spelling/README.md에 기록했다. 지명 목록이 인터넷 약어의 표준성이나 임의 동사 파생을 보장하지 않는다. 개발 정상 미등록46건 감소는 독립 정확도 평가가 아니다.

## 후속168 — 날짜 뒤 독립 명사

국립국어원 [2일 날](https://korean.go.kr/front/mcfaq/mcfaqView.do?mcfaq_seq=8076&mn_id=&pageIndex=1)과 기존 가나다전화 자료집186쪽의 3월 달 설명을 확인했다. 말뜻의 중복을 덜어 내는 문체 변경은 적용하지 않고 경계만 고친다. [제46항 해설](https://korean.go.kr/kornorms/m/m_regltn.do)은 셋 이상 단음절 연속을 설명하므로 좀더 하드한의 정답 판정을 뒤집는 근거로 바로 사용하지 않았다. 원자료를 배포 사전으로 복사하지 않았다. Node310·Chrome5개·개발 필수341/448·정상 오제안0/744는 독립 완료 증거가 아니다.

## 후속167 — 비교 조사와 부사 보다 구분

국립국어원 [보다의 조사·부사 구분](https://www.korean.go.kr/front/onlineQna/onlineQnaView.do?mn_id=216&pageIndex=1&qna_seq=326244&searchCondition=&searchKeyword=)을 참고했다. 명사 뒤 조사와 독립 부사의 띄어쓰기는 다르므로, 앞 명사·뒤 형용사가 확인되는 비교 해석만 검토 후보로 제안한다. 이 문맥 규칙이 문장 의미를 완전히 판정한다는 뜻은 아니다. 원자료를 배포 사전으로 복사하지 않았다. Node309·Chrome5개·개발 필수339/448·정상 오제안0/744는 독립 완료 증거가 아니다.

## 후속166 — 준말의 활용과 반복 형용사

국립국어원 [갖다 활용](https://www.korean.go.kr/front/onlineQna/onlineQnaView.do?mn_id=&pageIndex=1&qna_seq=334217)은 모음 어미 앞에서 갖아·갖았다를 허용하지 않고 가져·가졌다 등으로 쓰도록 설명한다. 한국어기초사전 [푹신푹신하다](https://krdict.korean.go.kr/kor/dicSearch/SearchView?ParaWordNo=55215)의 정상 활용도 확인했다. [그제서야 상담](https://korean.go.kr/front/mcfaq/mcfaqView.do?mcfaq_seq=9159&mn_id=&pageIndex=3)은 그제+서야가 성립하는 경우를 구분하므로 일괄 교정하지 않았다. 참고 본문을 배포 자산으로 복사하지 않았다. Node308·Chrome5개·개발 철자23/37·정상 오제안0/744는 독립 완료 증거가 아니다.

## 후속165 — 배송·호환의 파생 인식

한국어기초사전 [완행의 배송되다 용례](https://krdict.korean.go.kr/eng/dicSearch/SearchView?ParaWordNo=69291&nation=eng)와 국립국어원 통일영어점자 규정 제3판의 묵자와 호환되는 점자라는 용례를 참고했다. 후자는 공식 PDF 검색 발췌에서 확인했으며 PDF 직접 열기는 cache miss로 실패했다. 한국어기초사전 호환되다 직접 검색도 도구가 열지 못했으므로 해당 표제어 원문을 열람했다고 주장하지 않는다. 호환되다의 형태 인식은 공식 용례와 기존 호환 명사·되다 분석을 연결한 자체 보완이다. 용례·사전 본문을 배포 사전으로 복사하지 않았다. Node307·Chrome5개·개발 필수335/448·정상 오제안0/744는 독립 완료 증거가 아니다.

## 후속164 — 깨닫다의 ㄷ 불규칙 활용

국립국어원 [깨닫다 활용](https://www.korean.go.kr/front/onlineQna/onlineQnaView.do?mn_id=216&pageIndex=1&qna_seq=325685)은 모음 어미 앞에서 ㄷ이 ㄹ로 바뀌는 깨달은·깨달아를 설명한다. 기존 Apache 배포 자료에 ㄹ 이형태가 확인되고 기본 어간에도 존재하는 복합 어간만 같은 활용 규칙에 연결한다. 외부 답변이나 용례를 배포 사전으로 복사하지 않았다. Node306·Chrome4개·개발 필수334/448·정상 오제안0/744이며 독립 완료 증거가 아니다.

## 후속163 — 에·마다의 명사 경계

한국어기초사전 [마다](https://krdict.korean.go.kr/eng/dicSearch/SearchView?ParaWordNo=70331&nation=eng)의 명사 결합 조건을 확인했다. 기존 제41항 명사+조사 분석에 에·마다를 연결하되 관형형 보호를 유지한다. 명사 날은 동사와 겹쳐 마다 앞에서 확인된 명사 해석도 사용한다. 사전 설명을 배포 자산으로 복사하지 않았다. Node305·Chrome4개, 개발 필수333/448·정상 오제안0/744는 독립 완료 증거가 아니다.

## 후속162 — 서술격 조사 연결형

국립국어원 [인데 분석](https://www.korean.go.kr/front/onlineQna/onlineQnaView.do?mn_id=216&pageIndex=1&qna_seq=274260&searchCondition=&searchKeyword=)은 서술격 조사 이다와 -ㄴ데의 결합을 설명한다. [새국어생활 상담 자료](https://www.korean.go.kr/nkview/nklife/2000_4/2000_0414.pdf)의 서술격 조사와 어미 결합 설명도 참고했다. 기존 제41항 처리에 명사·수치 뒤 이고/인데를 연결하며, 목적어 뒤 동사 이고는 보존한다. 자료를 배포 사전으로 복사하지 않았다. Node304·Chrome4개, 개발 필수331/448·정상 오제안0/744이며 독립 완료 증거가 아니다.

## 후속160 — 지시 관형사와 명사 경계

국립국어원 [한 음절 단어의 띄어쓰기 설명](https://www.korean.go.kr/nkview/nknews/200106/35_8.html)과 한국어기초사전 [녀석 용례](https://krdict.korean.go.kr/kor/dicSearch/SearchView?ParaWordNo=58272)를 참고했다. 이 말·그 앞의 짧은 연속은 제46항의 붙임 허용을 고려해 강제하지 않고 긴 명사 꼬리를 확인한다. 특정 그앞 문장에 대한 직접 상담 답변을 확보한 것은 아니며, 관형사 경계와 기존 명사 분석을 적용한 제한 규칙이다. 자료를 배포 자산으로 복사하지 않았다. Node302·Chrome3개 통과, 개발 필수328/448·정상 오제안0/744이며 독립 완료 증거가 아니다.

## 후속159 — 전 세계 등의 관형사 경계

국립국어원 [전 단계·전 주기](https://www.korean.go.kr/front/onlineQna/onlineQnaView.do?mn_id=216&qna_seq=316530), [전 매장](https://www.korean.go.kr/front/onlineQna/onlineQnaView.do?mn_id=&pageIndex=1&qna_seq=311292)의 관형사 설명과 전 세계 용례를 확인했다. [교재](https://www.korean.go.kr/common/download.do%3Bfront%3D5DDF6B2BB2B3F16EA822A2B0012DB2FA?c_file_name=5c1ecd30-6519-4f83-bd36-dd215e699601_0.pdf&file_path=reportData&o_file_name=%EB%B0%94%EB%A5%B8+%EA%B5%AD%EC%96%B4+%EC%83%9D%ED%99%9C.pdf)의 전 국민 용례도 확인했다. 정해진 명사 머리와 전체 조사 꼬리만 검증하며 모든 전- 단어를 분리하지 않는다. 자료를 배포 사전으로 복사하지 않았다. Node301·Chrome3개 통과, 개발 정상0/744·필수324/448이며 독립 완료 증거가 아니다.


## 후속158 — 맞추다 철자와 복합 경계

국립국어원 [맞추다 활용](https://www.korean.go.kr/front/onlineQna/onlineQnaView.do?mn_id=216&pageIndex=1&qna_seq=312100&searchCondition=&searchKeyword=)에서 맞추어/맞춰와 어간 표기를 확인했다. 맟추어를 기존 배포 사전이 검증하는 맞추어로 복원하고, 이미 구현한 -어지다의 전체 활용 확인과 합친다. 맞추다와 맞히다의 문맥 교체를 추가하지 않는다. 참고 답변을 배포 자산으로 복사하지 않았다. Node300·Chrome3개 통과 및 개발 복합6/10·정상0/744이며 독립 완료 증거가 아니다.


## 후속157 — 추천드리다 경계

국립국어원 [추천드립니다와 추천해 드립니다](https://www.korean.go.kr/front/onlineQna/onlineQnaView.do?mn_id=216&pageIndex=1&qna_seq=323345&searchCondition=&searchKeyword=)는 두 표현의 띄어쓰기를 제시하며 문체상 무난함과 문법 오류를 구분한다. 이번 구현은 기존 활용 목록의 내부 공백을 복구하며 작성자의 표현을 추천해 드립니다로 바꾸지 않는다. 독립 명사구 수식 보호는 기존 규칙을 유지한다. 배포 자산 추가 없이 Node299·Chrome3개 통과, 개발 정상0/744·필수321/448을 확인했다. 독립 완료 증거가 아니다.


## 후속153–154 철회 근거 — 이름 뒤 님

국립국어원 [외국 이름 뒤 님 수정 답변](https://www.korean.go.kr/front/onlineQna/onlineQnaView.do?mn_id=216&pageIndex=1&qna_seq=304452)은 이전 붙임 안내를 오류로 정정하고 이름 뒤 님을 띄도록 설명한다. [닉네임 질문](https://korean.go.kr/front/onlineQna/onlineQnaView.do?mn_id=216&pageIndex=1&qna_seq=322510)도 이름 뒤의 의존 명사와 직위·신분 뒤 접미사를 구분한다. 개인 닉네임만 등록해 붙은 호칭까지 정상 인정하는153–154 실험은 철회했다. 현재 제품 코드 정본은152이며, 닉네임 검토와 호칭 공백 교정을 분리하는 처리는 남는다.


## 후속151–152 — -별 인식과 -적 경계

국립국어원 [사람별로](https://korean.go.kr/front/mcfaq/mcfaqView.do?mcfaq_seq=9187&mn_id=&pageIndex=11)는 -별 접미사와 로 조사를 설명한다. [마음적](https://korean.go.kr/front/onlineQna/onlineQnaView.do?mn_id=216&pageIndex=1&qna_seq=308746)은 명사에 붙는 -적의 용법을 설명하며 자연스러움 판단과 문법을 구분한다. 기존 명사 파생 인식을 확장하고 조사·서술격 뒤 형태를 검증했다. 적다 활용과의151 혼동은152에서 제한했다. 자료를 배포 자산으로 복사하지 않았다. 최종 Node297·Chrome2개 통과 및 개발 정상0/744·필수320/448이며 독립 완료 증거가 아니다.


## 후속148–150 — 형용사 하다 경계

국립국어원 [하다 접미사 설명](https://www.korean.go.kr/front/onlineQna/onlineQnaView.do?mn_id=216&pageIndex=1&qna_seq=306339)은 명사·일부 어근 등에 붙는 용법과 형용사 파생을 설명한다. 배포 중인 코어 형용사 어근을 사용하며 모든 명사+하다로 확대하지 않는다. 활용형 좋아를 다시 어근으로 취급한149 회귀는150에서 보호했다. 최종 Node296·Chrome2개 통과, 개발 정상0/744·필수319/448이며 독립 완료 증거는 아니다. 참고 답변을 배포 사전 자산으로 복사하지 않았다.


## 후속147 — 조차도·마저도 경계

국립국어원 [에서조차도 띄어쓰기](https://www.korean.go.kr/front/mcfaq/mcfaqView.do?mcfaq_seq=5666&mn_id=217)는 조사들의 결합에도 제41항을 적용한다. [보조사 설명](https://m.korean.go.kr/front/onlineQna/onlineQnaView.do?mn_id=216&pageIndex=1&qna_seq=318149&searchCondition=&searchKeyword=)에서 마저·조차의 조사 용법을 확인했다. 이번 변경은 기존 명사 호스트 분석 뒤 조차도·마저도를 연결하며 부사 마저 단독형은 유지한다. 참고 답변을 배포 사전 자산으로 복사하지 않았다. Node295·Chrome 집중2개 통과 및 개발 정상0/744·필수317/448을 확인했다. 독립 완료 증거가 아니다.


* 수량 및 높임 어미(145–146): [국립국어원335208](https://korean.go.kr/front/onlineQna/onlineQnaView.do?mn_id=216&pageIndex=1&qna_seq=335208)의 단위 명사 제43항 해설에 따라 사람 수 경계를 처리한다. 배수는 같은 단위 규칙을 사용하되 한배·세배의 사전 명사 해석을 보존한다. 높임 어미는 기존 어간·어미 붙임 규칙과 형태 자료를 사용하고 독립 명사 구절은 보호한다. 외부 정의·예문·어휘 목록을 배포하지 않는다.


* 명사 합성어 공백(143): 한국어기초사전의 안경다리 명사 표제와 [국립국어원 어휘 연구 자료](https://www.korean.go.kr/common/download.do?c_file_name=727b01c9-8bfd-4c7c-ba3d-a4d69c7dbc5c.pdf&file_path=reportData&o_file_name=2023%EB%85%84+%EA%B5%AD%EC%96%B4+%EA%B8%B0%EC%B4%88%EC%96%B4%ED%9C%98+%EC%84%A0%EC%A0%95+%EB%B0%8F+%EC%96%B4%ED%9C%98+%EB%93%B1%EA%B8%89%ED%99%94+%EC%97%B0%EA%B5%AC_%EC%B5%9C%EC%A2%85%EB%B3%B4%EA%B3%A0%EC%84%9C_20240712.pdf), [아무것에 관한 답변320525](https://www.korean.go.kr/front/onlineQna/onlineQnaView.do?mn_id=261&pageIndex=1&qna_seq=320525)을 확인했다. 기존 배포 자료의 단어에 대해 내부 공백과 조사/서술격을 처리하는 자체 규칙이다. 외부 정의·예문·어휘 목록은 복제하지 않았다.


* 짜증 나다 경계(142): [국립국어원334152 답변](https://www.korean.go.kr/front/onlineQna/onlineQnaView.do?mn_id=216&pageIndex=1&qna_seq=334152&searchCondition=&searchKeyword=)은 짜증과 나다를 별개의 단어로 설명한다. 기존 형태 자료에서 완전한 나다 활용을 검증하는 자체 제한 규칙이며, 모든 -나다 합성어를 분리하지 않는다. 외부 정의·예문·어휘 목록을 배포하지 않는다.


* 째려보다 모음 오류(141): [국립국어원 한국어교육 어휘 내용 개발3단계 부록](https://www.korean.go.kr/common/download.do?c_file_name=b46e2877-1f5c-402e-9a00-aa00bc452975_1.pdf&file_path=reportData&o_file_name=report.pdf)의 PDF341쪽(인쇄338쪽)에서 째려보다 동사 표기를 확인했다. 기존 배포 사전으로 전체 활용을 확인하는 자체 제한 규칙이며 원문의 정의·예문·어휘 목록을 배포하지 않는다. 개인의 전체 표현 및 쨰려보다 등록을 보존한다.


* 활동 명사형 경계(108): 제2항 단어 경계에 따라 완전한 명사와 -기 명사형을 분석한다. 기존 [정책브리핑의 물 마시기 사용](https://www.korea.kr/news/policyNewsView.do?newsId=148885173)을 확인한 바 있으며, 이 문장을 복제하거나 건강 권고를 검사 규칙으로 사용하지 않는다. 전체 어휘와 파생 접사 보호를 먼저 적용하는 자체 규칙이며 외부 자산은 추가하지 않았다.


* 짧은 표현 문맥 검토(107): 갤 뒤 모델 식별자 및 넘 뒤 검증된 형용사를 자체 검토 조건으로 사용한다. 개다의 갤 등 정상 동형 용례를 오류로 단정하지 않으며 사용자는 건너뛰기/개인 등록할 수 있다. 외부 정의·문장·배포 자산을 추가하지 않았다.


* ㅂ 불규칙과 높임 종결형(106): 기존 고정 Apache 원자료의 EC 활용형을 확인해 정확히 대응하는 와/워만 확장한다. [국립국어원 새국어생활2000](https://www.korean.go.kr/nkview/nklife/2000_2/2000_0213.pdf)의 덥/더우면/더워 예시와 [상담6288](https://www.korean.go.kr/front/mcfaq/mcfaqView.do?mcfaq_seq=6288)의 -셔요/-세요 허용을 확인했다. 외부 정의/예문을 배포하지 않으며 규칙 활용 어간 전체를 불규칙으로 바꾸지 않는다.


* 인터넷 강조·청유 표현 검토(105): 완전한 형용사 앞 개 및 완전한 청유형 뒤 요를 기존 인터넷 표현 검토에 연결하는 자체 보수적 규칙이다. 해당 표현을 표준어로 승인하거나 맞춤법 오류로 단정하지 않는다. 전체 활용/명사 동형을 보존하고 개인 등록은 공통 목록에 반영하지 않는다. 외부 정의/문장/배포 자산은 추가하지 않았다.


* 수사와 다의 경계(104): [국립국어원327466](https://www.korean.go.kr/front/onlineQna/onlineQnaView.do?mn_id=&pageIndex=1&qna_seq=327466&searchCondition=&searchKeyword=)에서 둘과 다가 독립된 단어임을 확인했다. 제2항 경계를 한정된 수사 뒤에 적용하며 개인 등록을 보존한다. 원자료의 붙은 형태를 표준성으로 승인하지 않고 외부 정의/예문/목록은 배포하지 않는다.


* 의존 명사 수·등·양(103): 기존 제42항에 따라 수 있다 경계를 재사용한다. [국립국어원6743](https://korean.go.kr/front/mcfaq/mcfaqView.do?mcfaq_seq=6743&mn_id=62&pageIndex=9)의 의존 명사 등과 [한국어기초사전 양67160](https://krdict.korean.go.kr/eng/dicSearch/SearchView?ParaWordNo=67160)의 관형형 뒤 결합을 확인했다. 완전한 앞말/활용과 전체 합성어를 검증하는 자체 규칙이며 사전 정의·예문·목록은 배포하지 않는다. 답변 없는 온라인가나다334718 질문은 판단 근거에서 제외했다.


* 뻔하다 결합(102): [국립국어원316328](https://www.korean.go.kr/front/onlineQna/onlineQnaView.do?mn_id=216&qna_seq=316328)의 뻔했다 내부 붙임, [309954](https://www.korean.go.kr/front/onlineQna/onlineQnaView.do?mn_id=261&pageIndex=1&qna_seq=309954)의 죽을뻔했다 허용과 [325457](https://korean.go.kr/front/onlineQna/onlineQnaView.do?mn_id=98&pageIndex=1&qna_seq=325457)의 짧은 앞말 조건을 확인했다. 기존 보조 용언 공통 분석에 연결하며 기관 정의/예문은 배포하지 않는다.


* 공간 명사 경계(101): [국립국어원9235](https://korean.go.kr/front/mcfaq/mcfaqView.do?mcfaq_seq=9235&mn_id=62&pageIndex=6)의 안갯속 합성어와 물리적 안개 속 구분, [국립국어원333621](https://m.korean.go.kr/front/onlineQna/onlineQnaView.do?mn_id=216&pageIndex=1&qna_seq=333621&searchCondition=&searchKeyword=)의 한쪽 합성어와 수량 한 쪽 구분을 확인했다. 속/쪽/아래를 모든 접미사에서 일괄 분리하지 않고 완전한 명사·조사 및 전체 합성어 인식을 검사하는 자체 경계 규칙이다. 원자료 정의/문장을 배포하지 않는다.


* 표준 어미 -고요(098–100): [국립국어원333069](https://www.korean.go.kr/front/onlineQna/onlineQnaView.do?mn_id=201&pageIndex=1&qna_seq=333069)에서 -구요의 표준 표기로 -고요를 확인했다. 완전한 활용/서술격만 검증하며 가구요 등 명사 동형은 보존한다. 필요할 거구요의 의존 명사 해석은 앞 관형형을 요구하는 자체 문맥 규칙이며 사용자는 건너뛰기/개인 등록으로 말투를 유지할 수 있다. 기관 정의/예문/외부 자산은 복제하지 않았다.


* 원인 연결형 뒤 서술격(096–097): 국립국어원 「바른 국어 생활(교사 직무 연수 교재)」의 위해서이다 및 「2011년도 민족생활어 조사4」의 해서이다 사용을 확인했다. 특정 인터넷 문장의 문체 판정과는 구분하며, 완전한 -서 활용과 이다 활용을 요구하는 자체 형태 결합만 보완했다. 자료의 정의/문장은 배포하지 않는다. [기관 자료](https://www.korean.go.kr/common/download.do%3Bfront%3DBC352DBED4683FEE6D473052E3825DBF?c_file_name=1c649090-e593-4606-9f49-955b2a914f39_0.pdf&file_path=reportData&o_file_name=2011%EB%85%84%EB%8F%84+%EB%AF%BC%EC%A1%B1%EC%83%9D%ED%99%9C%EC%96%B4+%EC%A1%B0%EC%82%AC+4.pdf)


* 행위 명사 보완(095): [국립국어원334401](https://www.korean.go.kr/front/onlineQna/onlineQnaView.do?mn_id=261&pageIndex=1&qna_seq=334401)의 정당화하다 논의와 [식품의약품안전처 자료](https://www.mfds.go.kr/usr/rgltnInvtView.do?seq=202300115)의 소포장하여 사용을 확인했다. 자체 선정한 두 표제어만 공통 행위 명사에 추가하며 외부 문장/정의/어휘 목록은 배포하지 않는다. 해당 자료가 모든 파생 명사의 -하다 결합을 승인한다고 해석하지 않는다.


* 명사 전용 공통 용어(093): [국립박물관문화재단 공연 안내](https://www.nmf.or.kr/user/performance/month_view.do?show_id=S20210424103511009100)의 얼리버드 예약, [YouTube 공식 도움말](https://support.google.com/youtube/answer/6083270?co=GENIE.Platform%3DDesktop&hl=ko)의 좋아요/싫어요 기능명 사용을 확인했다. 표준어 사전 등재를 뜻하지 않는 통용 용어 보완이다. 세 표제어를 자체 선정하며 외부 정의/문장/어휘 목록을 복제하지 않는다. 명사 및 조사 인식에만 쓰고 임의 -하다 파생을 허용하지 않는다.

* 어미 동형 조각(092): 기존 고정 Apache 원자료 EC.csv의 던 어미 항목을 확인했다. 단독 명사 동형과 앞의 활용 분석만으로 미등록 이름 내부에 공백을 제안하지 않는 자체 검토 규칙이다. 이름의 표준성/정상어 등록 규칙이 아니며 개인 등록은 공통 목록에 반영하지 않는다. 외부 자산은 추가하지 않았다.

* 재-와 행위 명사(091): [국립국어원 2017-01-50 연구 보고서](https://www.korean.go.kr/common/download.do%3Bfront%3D3B6F811F323B86E2D074D3DE2495120B?c_file_name=19cd27de-23d2-4fee-ba65-7ab58066fac0_0.pdf&file_path=reportData&o_file_name=%EA%B5%AD%EC%96%B4+%EA%B8%B0%EC%B4%88+%EC%96%B4%ED%9C%98+%EC%84%A0%EC%A0%95+%EB%B0%8F+%EC%96%B4%ED%9C%98+%EB%93%B1%EA%B8%89%ED%99%94%EB%A5%BC+%EC%9C%84%ED%95%9C+%EA%B8%B0%EC%B4%88+%EC%97%B0%EA%B5%AC.pdf)의 재개표 분석에서 재-를 다시의 뜻을 가진 접두사로 구분함을 확인했다. 기존 행위 명사 자료에만 한 단계 결합하는 자체 규칙이며 개인 단어/임의 명사의 동사 파생은 허용하지 않는다. 원자료 정의/예문을 배포하지 않았다.

* 공통 보완 명사(090): [관세 분류 공공 자료](https://www.law.go.kr/flDownload.do?flSeq=89058377&gubun=)의 긴바지, [우체국 쇼핑 안내](https://mall.epost.go.kr/fo/event/2025/ChuseokSale.do)의 배송지, [국립경주박물관 안내](https://gyeongju.museum.go.kr/kor/html/sub07/0701.html?menu_dvs_cd=0701&mode=V&no=5392&site_dvs_cd=kor)의 특별전 사용을 확인했다. 통용 명사 보완이며 사전 등재/기관 표준성 판정으로 주장하지 않는다. 직접 선택한 세 표제어만 자체 목록에 쓰며 외부 문장/정의/어휘 목록을 배포하지 않는다.

* 의존 명사 듯(088–089): [국립국어원314860](https://www.korean.go.kr/front/onlineQna/onlineQnaView.do?mn_id=216&qna_seq=314860)의 어간 뒤 어미/관형형 뒤 의존 명사 구분과 [상담8121](https://www.korean.go.kr/front/mcfaq/mcfaqView.do?mcfaq_seq=8121)의 반복 구문 공백을 확인했다. 기존 공통 의존 명사 분석에 연결하며 완전한 관형형을 요구한다. 불확실한 파생어 내부를 조각내 관형형을 발명하지 않는다. 기관 정의/예문을 배포 사전으로 복제하지 않았다.

* 인용 청유형·정도 부사(087): 기존 제2항 단어 경계 구현에서 완전한 -자 인용 뒤 하다, 정도 부사 덜 뒤 완전한 용언을 다룬다. 고정 Apache 원자료의 덜되/덜떨어지 전체 활용 인식을 보존하며 원자료 전체를 새로 표준어로 승인하지 않는다. 새로운 외부 어휘/정의/예문은 배포 자산에 추가하지 않았다.

* 연결형 뒤 가(086): [국립국어원323337](https://korean.go.kr/front/onlineQna/onlineQnaView.do?mn_id=98&pageIndex=1&qna_seq=323337)의 받침 없는 부사어 뒤 강조 보조사 가 설명을 참고해 기존 용언 연결형+조사 인식을 확장했다. -서 전체 활용이 검증될 때만 처리하며 개별 개발 표본의 표준성을 기관이 판정했다고 주장하지 않는다. 외부 정의/예문은 배포 자산에 넣지 않았다.

* 반복 감탄사(085): 자체 작성한 반복 패턴은 표준성 판정 규칙이 아니다. 감탄사 음절만으로 이루어지고 같은 음절을 네 번 이상 반복한 어절을 기존 인터넷 표현 검토 경로로 보내며 수정 후보를 발명하지 않는다. 등록은 개인 사전에만 반영한다. 외부 정의·예문·새 배포 자산은 추가하지 않았다.

* 요청 보조 용언·사동 연결형·높임 명사형(083–084): 기존 보조 용언 제47항 적용의 분석 연결을 수정했다. 달라가 다르다로 먼저 분석돼도 앞의 완전한 연결형 문맥에서 요청 읽기를 유지하며, 확인된 명사+-시키다의 시켜를 연결형으로 처리한다. 기존 높임 활용에서 -시-+ㅁ을 생성하고 명사형의 조사 결합을 검증한다. 새로운 외부 어휘 목록·정의·예문은 배포물에 넣지 않았다. 문맥/명사/활용 검증을 거치지 않은 무조건 결합이나 파생 정상어 승격은 하지 않는다.

* 인용 어미·서술격 관형형(081–082): 기존 Apache-2.0 고정 원자료의 [EC.csv](https://raw.githubusercontent.com/lindera/mecab-ko-dic/12439fb32808b9244ded56d7dfed96e4b8d76869/EC.csv)에서 다길래/다면서/자니 항목을 확인하고 원격·로컬 파일 해시를 대조했다. 어휘 목록 전체를 복제하지 않고 완전한 앞 활용형을 검증하는 자체 연결 규칙으로 처리한다. 시제 선어말 어미 뒤에도 관형형 표시를 유지해 서술격+만큼/뿐의 공백에 재사용한다. 원자료 좋의 VV/VA 중복은 표준성 보증이 아니므로 동음이의 품사 전체를 새로 허용하지 않는다. 앞서 확인한 심리 동사 세 어간의 예외만 적용하며 나머지 표준성 감사는 미완료다.

* 파생 결합과 합성 동사 활용(078–080): 새로운 외부 어휘 목록을 가져오지 않았다. 기존 Apache-2.0 MeCab 고정 원자료 `12439fb32808b9244ded56d7dfed96e4b8d76869`의 Inflect.csv·VV.csv·VA.csv 해시를 manifest와 대조했다. 원자료가 동일 어간의 ㅅ 탈락을 직접 명시하는 다음절 어간만 빠진 활용형을 복구하며, 단음절 이/잇 충돌은 기존 분석을 보존한다. 접미사 가능성을 이유로 어절 내부를 자르는 후보를 막는 것은 정상어 인증이 아니고, 미확인 표현은 검토 대상으로 남는다. -면 되다의 조건절은 명사 동음이의어보다 우선해 공백 후보를 유지한다.

* 높임 어미 보존(076): [국립국어원318208](https://korean.go.kr/front/onlineQna/onlineQnaView.do?mn_id=216&pageIndex=1&qna_seq=318208)에서 -죠가 -지요의 준말임을 확인했다. [333747](https://www.korean.go.kr/front/onlineQna/onlineQnaView.do?mn_id=44&pageIndex=1&qna_seq=333747)의 연결 어미 뒤 보조사 요 설명에 따라 -지만요도 전체 용언을 검증해 보존한다. 모든 요 접미 문자열을 정상화하지 않는다. 원문 정의·용례를 배포 데이터에 복제하지 않았다.

* 동음이의 분석 보존(077): 기존 명사+-하다 규칙의 조사 결합 제외를 실제 판정에 적용하고, 기본 자료에서 부사이기도 한 앞말은 붙임을 강제하지 않는다. 만큼/뿐 앞에서는 공통 서술격 관형형 판정을 재사용한다. 개인 사전 어휘도 같은 경로를 따르며 공통 사전으로 승격하지 않는다.

* 모음 끝 체언 뒤 서술격 조사 준말: [국립국어원 상담 사례](https://www.korean.go.kr/front/mcfaq/mcfaqView.do?mcfaq_seq=5559&mn_id=217&pageIndex=245)의 학굔데·의산데 설명을 확인했다. 자체 분석에서 종성 ㄴ을 제거한 체언이 사전 또는 사용자 사전에 있고 복원한 인데/인가/인지 계열이 기존 서술격 활용으로 인식될 때만 준말을 인정한다. 모든 ㄴ 받침을 복원하지 않으며 임의 어미와 미등록 체언은 통과시키지 않는다. ㄴ가/ㄴ지는 동일한 복원 원리를 적용한 구현이며 링크가 모든 활용을 직접 열거한다고 주장하지 않는다. 무슨의 관형어 기능은 명사 분류 자료와 구분해 뒤의 체언+서술격 구절과 띄어쓰기 후보를 만든다. 외부 사전 본문이나 자산을 배포물에 복제하지 않았다.

* 인용 이유 준말 -대서/-ㄴ대서/-는대서: 우리말샘 전문가 감수 항목 [123747](https://opendict.korean.go.kr/dictionary/view?sense_no=123747&viewType=confirm), [490334](https://opendict.korean.go.kr/dictionary/view?sense_no=490334&viewType=confirm), [527460](https://opendict.korean.go.kr/dictionary/view?sense_no=527460&viewType=confirm)의 결합 조건을 확인했다. 기존 다던데 분석과 같은 서술형 복원 검증을 사용해 나온대서 등을 보존한다. 상태 어간에 잘못 붙은 는대서는 원형을 검증한 뒤 대서를 제안한다. 자료의 정의·용례·코드를 수입하지 않은 자체 규칙이며 동형 어간과 전체 인용 문법을 해결했다고 주장하지 않는다.

* 로 계열 조사 인식: [국립국어원 결합 조건](https://korean.go.kr/front/onlineQna/onlineQnaView.do?mn_id=216&pageIndex=1&qna_seq=310100)을 확인했다. 기존 허용 자료에 있는 으로도·으로서도 등의 으로 계열을 기준으로, 알려진 체언이 모음이나 ㄹ로 끝날 때 대응하는 로 형태를 인식한다. 임의의 뒤 문자열이나 미등록 어휘를 새 조사로 인정하지 않는다. 사전의 설명·용례·목록을 복제하지 않은 자체 규칙이다.

* 고민되다: [한국어기초사전19227](https://krdict.korean.go.kr/eng/dicSearch/SearchView?ParaWordNo=19227&nation=eng)에서 어휘와 활용을 확인했다. 선택된 형태 자료에 누락된 어간 고민되를 자체 보완해 공통 활용기로 처리한다. 모든 명사에 되다를 결합시키는 규칙으로 확대하지 않는다. 정의나 용례를 배포 자산에 복제하지 않았다.

* 인용 준말 -다던데/-는다던데: 한국어기초사전 [82094](https://krdict.korean.go.kr/vie/dicSearch/SearchView?ParaWordNo=82094&nation=vie)와 [82092](https://krdict.korean.go.kr/eng/dicSearch/SearchView?ParaWordNo=82092&nation=eng)의 결합 조건을 참고했다. 기존 허용 사전에서 형용사이고 동사 동형 어간은 아닌 경우, 또는 있다/없다 어간에 한해 잘못 붙인 는다던데를 다던데로 제안한다. 수정 후 전체 용언의 인식을 다시 확인하며, 불확실성을 표시하고 사용자 사전·코드 구간은 보호한다. 정의·용례·외부 코드나 사전 자산을 가져오지 않은 자체 규칙이다. 모든 구어형·인용 어미를 해결하는 일반 문법 검사로 해석하지 않는다.

* 조사 오타 후보 에넌/에는: 자체 작성 휴리스틱이다. 기존 MIT/Apache 배포 사전에서 명사 또는 유일한 두 명사 경계를 확인할 때만 후보를 구성한다. 명사구를 둘로 나누는 경우 각 부분은 두 음절 이상이어야 한다. 정상 인식 단어·전체 사용자 사전을 보호하며, 등록된 복합 명사는 분리하지 않는다. 의미상 옳은 명사구라는 보장은 없으므로 확인이 필요한 후보로 표시한다. 단독 넌이나 떨어져 있는 대명사를 치환하지 않는다. 특정 공식 사전이 이 오타 대응을 제공한다고 주장하지 않는다.

* 독립 부사 다 + 같이/함께: 한국어기초사전의 [같이](https://krdict.korean.go.kr/eng/dicSearch/SearchView?ParaWordNo=26799)와 [함께](https://krdict.korean.go.kr/kor/dicSearch/SearchView?ParaWordNo=72465), [우리 항목의 다 함께 용례](https://krdict.korean.go.kr/kor/dicSearch/SearchView?ParaWordNo=17182)를 확인했다. 각 단어 경계를 지키도록 다같이/다함께 및 제한된 보조사 결합에 자체 규칙을 적용한다. 사전 정의·예문은 배포 자료로 복제하지 않았다. 상호 등 의도적인 고유 명칭은 사용자가 유지할 수 있도록 해석 확인 후보로 표시하고 사용자 사전을 우선한다.

* 잠그다/담그다 활용: [국립국어원 답변](https://www.korean.go.kr/front/onlineQna/onlineQnaView.do?mn_id=216&pageIndex=1&qna_seq=329165)과 [국립국어원 설명](https://www.korean.go.kr/nkview/nknews/200406/71_3.html)을 확인했다. 자체 규칙에서 잠궈/잠궜 및 담궈/담궜을 올바른 활용형 후보로 바꾸되 전체 어절이 서술어로 분석되는지 검사한다. 정상 피동형 잠겨서는 변경하지 않는다. 자료의 예문 목록과 본문은 복제하지 않았다.

* 명사와 -하다: [국립국어원 설명](https://www.korean.go.kr/front/onlineQna/onlineQnaView.do?mn_id=216&pageIndex=1&qna_seq=320467)은 접미사 결합을, [명사구 수식 관계 설명](https://www.korean.go.kr/front/onlineQna/onlineQnaView.do?mn_id=261&qna_seq=322397)은 별도 수식어가 있는 명사구의 띄어쓰기를 보여 준다. 기존 Apache 데이터의 행위 명사와 확인된 하다 활용형에만 붙임 후보를 제안한다. 바로 앞에 독립 명사나 관형형이 있으면 후보를 내지 않는 휴리스틱이며 완전한 구문 분석은 아니다. 모든 결과는 해석 확인이 필요한 후보로 표시한다. URL·코드·줄바꿈 및 명사에 조사가 붙은 형태는 합치지 않는다.

* 접미사 -용: [한국어기초사전 항목](https://krdict.korean.go.kr/eng/dicSearch/SearchView?ParaWordNo=88913&nation=eng)에서 목적·대상 명사 파생을 확인했다. 정의나 어휘 목록을 복제하지 않고, 기존 허용 사전의 명사에 -용 및 조사가 결합한 형태를 인식한다. 이 수정에 사용한 보류 표본은 이후 독립 평가로 취급하지 않는다.

* 세네/서너: [국립국어원 설명](https://www.korean.go.kr/front/onlineQna/onlineQnaView.do?mn_id=216&qna_seq=309796). 세네는 서너의 방언 표현이다. 자체 후보는 단독형 또는 한정된 수량 단위+조사에 적용한다. 사용자 사전에 세네를 넣으면 표현은 유지하고 단위 앞 공백만 제안한다. 세네갈처럼 이름 내부를 치환하지 않는다.

* 모음 뒤 이다 축약: [이라면의 이 생략](https://www.korean.go.kr/front/onlineQna/onlineQnaView.do?mn_id=27&pageIndex=1&qna_seq=330856), [이어/이었 축약](https://m.korean.go.kr/front/onlineQna/onlineQnaView.do?mn_id=216&pageIndex=1&qna_seq=328164). 알려진 모음 끝 체언 뒤에서 본형을 복원하고 기존 이다 활용 분석을 통과한 형태를 인식한다. 원문 설명을 복제하지 않는다.

* 거/게 준말: [국립국어원 이런 게 설명](https://www.korean.go.kr/front/mcfaq/mcfaqView.do?mcfaq_seq=5934&mn_id=217), [거의 조사 결합](https://m.korean.go.kr/front/onlineQna/onlineQnaView.do?mn_id=216&pageIndex=1&qna_seq=310271). 앞말의 관형형을 확인하여 준말 의존 명사를 분리한다. 정상 용언 어미 게와 대명사 이게를 먼저 보호한다. 설명과 사전 정의는 배포 데이터로 복제하지 않는다.

* -드리다: [감사드리다 설명](https://www.korean.go.kr/front/onlineQna/onlineQnaView.do?mn_id=216&pageIndex=1&qna_seq=305821), [부탁/말씀/문의/질문/연락 결합](https://www.korean.go.kr/front/onlineQna/onlineQnaView.do?mn_id=216&pageIndex=1&qna_seq=308500), [송부 결합](https://www.korean.go.kr/front/onlineQna/onlineQnaView.do?mn_id=216&pageIndex=1&qna_seq=275279&searchCondition=&searchKeyword=), [불편 드리다의 차이](https://www.korean.go.kr/front/onlineQna/onlineQnaView.do?mn_id=27&pageIndex=1&qna_seq=318853). 확인한 일곱 어간을 자체 활용 규칙으로 전개한다. 모든 행위 명사에 일괄 결합하지 않으며 사전 정의와 해설은 복제하지 않는다.

* 조사 서: [국립국어원 설명](https://www.korean.go.kr/front/onlineQna/onlineQnaView.do?mn_id=216&pageIndex=1&qna_seq=327545). 에서의 준말인 서에 대해서 기존 에서 복합 조사 목록을 재사용한다. 모음 끝의 인식된 체언만 대상으로 하며 예문/정의는 사전 데이터로 복제하지 않는다.

* -어지다: [국립국어원 설명](https://korean.go.kr/front/onlineQna/onlineQnaView.do?mn_id=216&pageIndex=1&qna_seq=308429), [항상 붙이는 보조 용언](https://korean.go.kr/front/mcfaq/mcfaqView.do?mcfaq_seq=5737&mn_id=217&pageIndex=217). 연결형 뒤 지다 활용은 붙임으로 인식한다. 자체 구현은 두 용언 분석을 확인하며 설명 문장이나 사전 정의를 배포하지 않는다.

* 의도 어미: [국립국어원 -려고 결합 설명](https://m.korean.go.kr/front/onlineQna/onlineQnaView.do?mn_id=216&pageIndex=1&qna_seq=330045)과 [불필요한 ㄹ 표기 설명](https://www.korean.go.kr/nkview/news/93/8_1.htm)을 참고한다. 하- 계열의 할려고만 하려고 후보로 고치며 정상 ㄹ 어간 팔/살/놀에는 적용하지 않는다. 갈려고는 갈다/가다의 문맥 구분이 필요하여 이 규칙에 포함하지 않는다. 기본 어간 구하/그러는 자체 보완해 정상 구하려고를 오타로 역제안하던 문제를 막았다.

* ㅟ 활용: [국립국어원 바뀌어 준말 설명](https://www.korean.go.kr/front/mcfaq/mcfaqView.do?mcfaq_seq=8596&mn_id=217&pageIndex=4)을 참고해 기존 ㅟ 어간의 어/었 활용을 인식한다. 바껴/바꼈/사겨/사겼은 교정 후 전체 용언 분석이 되는 경우에만 후보를 만든다. 임의 문자열 안의 치환은 하지 않으며 외부 설명이나 예문은 복제하지 않는다.

* 짧은 표기 후보: [국립국어원 혜택 표기·발음 설명](https://www.korean.go.kr/front/onlineQna/onlineQnaView.do?mn_id=216&pageIndex=1&qna_seq=276528&searchCondition=&searchKeyword=)과 [어문 규범의 개의하지/개의치 설명](https://korean.go.kr/kornorms/m/m_regltn.do)을 확인했다. 헤택→혜택은 조사 경계에만, 게의치→개의치는 정확 표면형에만 적용한다. 사용자 사전 예외를 존중하며 외부 사전 정의·예문을 복제하지 않는다.

* ㄹ 어간 명사형: [국립국어원 만들다의 명사형 설명](https://www.korean.go.kr/front/mcfaq/mcfaqView.do?mcfaq_seq=6062&mn_id=27&pageIndex=2)을 확인했다. 기존 어간으로부터 ㄻ 명사형을 생성해 인식하고, 두 음절 이상 미등록어의 ㅁ→ㄻ 후보를 검증한다. 한 음절 밈→밂 오탐이 발견되어 한 음절 후보는 제외한다. 표기 사실을 자체 구현하며 외부 정의·예문은 수록하지 않는다.

* 되서/돼서: [국립국어원 되어서 구성 설명](https://www.korean.go.kr/front/onlineQna/onlineQnaView.do?mn_id=216&pageIndex=1&qna_seq=312224)을 참고한다. 되서로 끝나고 되어서 형태가 용언으로 인식되는 경우만 돼서 후보를 만든다. 안되서에는 안 돼서/안돼서 두 해석을 제시하며 문맥 판단을 요구한다. 부담되다 같은 파생어 전체 인식은 아직 부족하므로 이 규칙의 일반성을 과장하지 않는다.

* 짧은 보조 용언 결합: [국립국어원 드리다와 본용언 결합 설명](https://korean.go.kr/front/onlineQna/onlineQnaView.do?mn_id=216&pageIndex=1&qna_seq=320732)을 참고해, 생성 규칙으로 확인한 아/어 연결형 뒤 주다/보다/드리다의 붙여 쓰기를 보호한다. 현재 1~2음절 본용언 표면형만 대상으로 한다. 보내드리고/보내드리기/보내줘야는 띄어 쓴 후보도 가능하지만 원문 자체가 오류인 것은 아니므로, 해당 후보가 사라졌다고 오류 재현율 손실로 계산하지 않는다. 외부 설명/예문은 배포 자산에 복제하지 않는다.

* 의문 어미: [국립국어원 -ㄹ는지 표기 설명](https://www.korean.go.kr/front/mcfaq/mcfaqView.do?mcfaq_seq=6413&mn_id=62&pageIndex=1)을 확인해, 용언으로 분석되는 ㄹ 받침 표면형 뒤의 런지/른지에 는지 후보를 자체 구현했다. 요와 사용자 사전 경계를 보존한다. 챌런지처럼 외래어와 용언 해석이 충돌할 수 있어 문맥 확인 후보로 표시하며, 원문/예문/사전 데이터를 복제하지 않는다.

* 현재/현제: [현재 표제어](https://krdict.korean.go.kr/jpn/dicSearch/SearchView?ParaWordNo=62446), [한국학중앙연구원 장서각의 현제(賢弟) 사용 자료](https://jsg.aks.ac.kr/dir/view?dataId=ANC_G002%2BAKS%2BKSM-XI.0000.0000-20101008.B002a_002_00667_XXX)에서 두 표현을 구별했다. 원문·정의는 수록하지 않는다. 직장/상태/사용 등 바로 다음 어휘에 근거한 현재 후보는 자체 휴리스틱이며 확정 교정이 아니다. 인용·아우/형제 문맥·개행·사용자 사전을 보호한다. 단독 현제를 항상 오류라고 처리하지 않는다.

* 표기와 형태 분석 분리: [재테크 표제어](https://krdict.korean.go.kr/eng/dicSearch/SearchView?ParaWordNo=74380), [부딪히다 표제어](https://krdict.korean.go.kr/kor/dicSearch/SearchView?ParaWordNo=26309), [국립국어원 메시지 표기 감수 자료](https://www.korean.go.kr/common/download.do?c_file_name=46a12cbb-5997-4e16-9d7b-d96f58b995c4_0.pdf&file_path=reportData)를 확인했다. 표기 사실만 자체 규칙에 사용하며 정의·예문·사전 파일은 복제하지 않는다. 명사에는 조사 경계를, 부딪히-에는 제한된 어미 경계를 적용한다. 부딪치다/부딪히다의 능동·피동 선택은 이 철자 규칙의 범위 밖이다. 사용자 사전에 등록한 비표준 명사도 조사 결합형에서 존중한다.

* 활용형 생성: [국립국어원 ㄹ 탈락 설명](https://www.korean.go.kr/front/mcfaq/mcfaqView.do?mcfaq_seq=8918) 및 [어문 규범](https://korean.go.kr/kornorms/m/m_regltn.do)을 참고해 받침 유무에 따른 관형사형 생성과 ㄹ 어간의 `-는` 결합을 자체 구현했다. 모든 어간에 `은/을/는`을 붙이던 생성 오류를 제한한다. 원본 형태소 사전의 기등록 표면형은 별개이며, 이 수정이 그 자료의 표준 표기를 보증하지 않는다. 규범 해설과 외부 예문은 배포 데이터에 복제하지 않았다.

## 제한된 혼동어 문맥 후보 — 추가 승인 범위

2026-09-10 공식 출처 재확인: [국립국어원 금새/금세 설명](https://www.korean.go.kr/nkview/news_pdf/2023_9%282%29.pdf), [무난하다 표제어](https://krdict.korean.go.kr/eng/dicSearch/SearchView?ParaWordNo=57814&nation=eng), [낫다/낳다 설명](https://www.korean.go.kr/nkview/news_pdf/2022_1.pdf). 표기와 의미 차이만 확인했으며 정의·예문·외부 검사 결과를 데이터로 복사하지 않았다.

자체 구현은 주변 술어, 뒤따르는 대상 명사, 회복/출산 단서로 후보를 제한한다. 이 단서 선택은 공식 규칙이 아닌 Wonboard의 휴리스틱이다. 모든 결과는 ambiguous=true인 검토 후보이며 사용자의 바꾸기 동작이 있어야 적용된다. 48자 주변과 같은 문단만 보고, 인용된 표제어·정상 물건값/문안 인사/출산 표현·사용자 사전 항목을 보호한다. 임의 문맥 전체를 판정한다고 보장하지 않는다. 직접 작성한 긍정·부정 예제는 시험지이자 회귀 자료로 쓰이며 독립 평가가 아니다.

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
* 어떻해: [국립국어원 설명](https://www.korean.go.kr/front/onlineQna/onlineQnaView.do?mn_id=73&pageIndex=1&qna_seq=327188). 기본적으로 어떻게/어떡해 두 후보를 제공한다. 바로 다음 어절이 확인된 해야 계열 용언이면 어떻게로 좁힌다. [서술어를 수식하는 부사어 설명](https://www.korean.go.kr/front/onlineQna/onlineQnaView.do?mn_id=216&pageIndex=1&qna_seq=317387)을 참고했다. 인용 경계·구두점·줄바꿈에서는 이 좁힘을 적용하지 않는다. 설명 전체 중 의문문만 가능하다는 단정은 채택하지 않았다. 자체 규칙은 문법적 역할 차이만 사용하며 뜻풀이나 예문 데이터베이스를 복제하지 않는다.

* 왠지·웬만하다: [국립국어원 상담 6103](https://www.korean.go.kr/front/mcfaq/mcfaqView.do?mcfaq_seq=6103), [웬/왠 설명](https://www.korean.go.kr/nkview/nknews/200203/44_12.html). 부사의 표기와 웬만하다의 어근을 확인했다. 자체 구현은 완전 일치 또는 제한된 하다 활용형에 적용하고 이름 내부 문자열을 바꾸지 않는다.
* 뵈요/봬요: [국립국어원 상담 8554](https://korean.go.kr/front/mcfaq/mcfaqView.do?mcfaq_seq=8554&mn_id=46&pageIndex=12). 뵈어요의 축약이며 뵈-에 요를 바로 결합하지 않는다. 기존 되-/돼- 규칙과 함께 단독 뵈요·되요를 처리한다. 뵈면·되고 같은 정상 어미는 보존한다.
* 꼼꼼히: [국립국어원 공공언어 안내 개정판](https://korean.go.kr/common/download.do?c_file_name=f595077c-82b4-42a5-8ab6-0c31fef547ff.pdf&file_path=etcData). 확인한 표기 사실만 자체 규칙에 사용한다. 설명·예문·검사기 응답을 데이터로 복제하지 않는다.

* 수량과 단위: [국립국어원 제43항 해설](https://www.korean.go.kr/kornorms/m/m_regltn.do). 수량 단위는 띄어 쓰지만 시각·순서 등은 붙임이 허용된다. `두시` 같은 시각은 변경 추천 대상에서 제외했다. 현재 후보는 제한된 수량 표현에만 적용하고 문맥 확인 표시를 붙인다.

* 파생 용언과 보조 용언: [국립국어원 제47항 설명](https://www.korean.go.kr/front/onlineQna/onlineQnaView.do?mn_id=&pageIndex=1&qna_seq=331450), [생각하다 활용 설명](https://www.korean.go.kr/front/onlineQna/onlineQnaView.do?mn_id=27&pageIndex=1&qna_seq=334645). 파생어의 활용형이 세 음절 이상이면 뒤 보조 용언과 분리한다. 자체 구현은 명사 기반 하다의 해/하여 활용과 주다/보다/드리다에 한정해 경계를 검증한다. 원문 설명이나 예문 집합은 배포 사전에 복제하지 않는다.

형태 분석용 사전은 비표준/구어형도 인식한다. 그 결과를 표준 표기 여부와 분리한다. 아래는 자체 작성한 제한된 규칙이며 전체 어휘 사전을 손으로 대체하는 것이 아니다. 시험지에서 본 유형이 포함되어 있으므로 점수를 독립 평가라고 주장하지 않는다.

* 며칠/설거지: [국립국어원 새국어소식](https://www.korean.go.kr/nkview/nknews/200512/89_3.html). 제27항 관련 설명에서 잘못된 표기와 올바른 표기를 확인했다. 해설은 복제하지 않았다. 자체 예: `몇일동안`은 조사 여부가 불명확하면 자동 범위 확장하지 않고, `몇일을`에는 `며칠을` 후보를 만든다.
* 오랜만: [국립국어원 상담 자료](https://www.korean.go.kr/nkview/nklife/2002_1/2002_0114.pdf). 오래간만의 준말. 자체 예: `오랫만이네`는 현재 조합 범위 밖이며 `오랫만에`는 후보를 만든다. 아무 문자열 안의 부분 일치를 치환하지 않는다.
* -이/-히: [국립국어원 제51항 안내](https://www.korean.go.kr/front/onlineQna/onlineQnaView.do?mn_id=216&pageIndex=1&qna_seq=305784)와 [공식 교육 자료](https://www.korean.go.kr/common/download.do?c_file_name=f3732b4f-8303-4b80-94e4-542c5636e353_0.pdf&file_path=etcData&o_file_name=바른%20국어%20생활.pdf). 짧은 규정 구절: “부사의 끝음절이 분명히 ‘이’로만 나는 것은 ‘-이’로 적고”. 전체 히를 이로 바꾸지 않고 확인된 소수 부사만 처리한다. 자체 예: `산뜻히` → `산뜻이`.
* 되-/됐-: 제35항 붙임2의 되어/돼 축약, [국립국어원 FAQ](https://www.korean.go.kr/front/mcfaq/mcfaqView.do?mcfaq_seq=5827&mn_id=217&pageIndex=1). 자체 예: `됬지만` → `됐지만`. 뒤에 인식되는 어미가 붙은 경우에만 적용한다.

`금새`는 실제로 물건값을 뜻하는 정상 명사이기도 하므로 무조건 `금세`로 바꾸는 규칙을 추가하지 않았다. [국립국어원 확인](https://www.korean.go.kr/front/onlineQna/onlineQnaView.do?mn_id=216&pageIndex=1&qna_seq=305617). `낳으세요` 같은 문맥 의존 표기도 이번 규칙에서 강제하지 않는다. 관련 평가 사례는 분모에 남아 있다.
# 비표준 부사 어짜피

국립국어원 상담 사례 https://www.korean.go.kr/front/mcfaq/mcfaqView.do?mcfaq_seq=9167 에서 표준 표기가 `어차피`임을 확인했다. 형태 분석 사전의 비표준 표면형 수록이 검사 결과를 숨기지 않도록, 정확히 일치하는 독립 어절에 자체 교정 규칙을 적용한다. 개인 사전에 등록하면 건너뛴다. 상담 답변이나 사전 정의를 배포 자산으로 복사하지 않았다.
# 구어 어미와 혼합 문자 조사 경계

국립국어원 한국어 교육 자료의 `-더라고요` 설명에서 입말의 `더라구요` 발음을 구분한다: https://www.korean.go.kr/common/download.do?book_seq=285&c_file_name=697fa959-bb89-4ed2-a7dc-55dc21c1c469_0.pdf&downGubun=bookDataView&file_path=bookData&o_file_name=한국어진흥-02-8.pdf . 전체 수정형이 서술어로 분석될 때만 자체 규칙으로 표기 대안을 제안하며 개인 사전은 우선한다. 자료 본문·예문을 배포 사전으로 복사하지 않았다.

영문 이름 뒤 조사 공백은 기존 제41항의 조사 붙여 쓰기 규칙으로 처리한다. 영문 이름의 미등록어 안내와 수정 범위를 겹치지 않게 하여 각각 건너뛰거나 수정할 수 있다. 현재 에/을/를/은/는 및 일부 복합 조사만 대상으로 하고, 줄바꿈·URL·코드·파일명은 연결하지 않는다.
# 과거 서술격 조사 경계

자체 형태 결합 규칙으로 받침 있는 확인된 명사 뒤의 `이였-`에 `이었-`을 제안한다. 수정된 어미 전체가 서술어로 분석되는 경우에만 적용하며, `어린이`처럼 마지막 `이`가 명사에 속하는 경우는 보존한다. 개인 사전의 전체 어절 예외도 우선한다. 후속 확인에서 [국립국어원 직접 답변](https://www.korean.go.kr/front/onlineQna/onlineQnaView.do?mn_id=216&pageIndex=1&qna_seq=330611)을 확보했다. 해당 답변은 체언과 결합한 이다 뒤에 -었-을 쓰는 원리를 설명한다. 정의·예문 목록을 배포 자산으로 복사하지 않았다.
# 2026-09-12 사용자 피드백과 어휘 갱신 확인

사용자가 제공한 금융 글에서 6월말에, 미국금리인상을, 거래가 안되고의 후보 누락과 시장일, 물가지수, 비트코인의 오탐을 재현했다. 원문 전체는 공개 시험에 복제하지 않고 짧은 구간과 반례만 사용한다. 월 말/초 경계, 명사+일 서술격 활용, 국가명+금리+인상/인하 경계를 보완한다. 거래가 안되다는 거래 불성립 해석일 때의 문맥 후보이며 안되다 전체를 일괄 분리하지 않는다. 오랫만입니다는 기존 어휘 교정 뒤 서술격 활용 연결 누락도 수정한다.

자체 MIT 보완 목록 community-vocabulary.mjs에 비트코인과 물가지수를 독립 작성했다. 외부 사전 설명이나 목록을 복제하지 않는다. 물가 지수는 전문 용어로 붙임 허용을 보존한다: https://kli.korean.go.kr/term/trgtWord/indexTrgtWord.do?trgtWordNo=2174994 . 인터넷 오기·약어를 이 목록에 일괄 정상어로 등록하지 않는다. 새 어휘의 조사 결합은 기존 공통 분석기를 사용하며 사용자 사전과 구분한다.

갱신 조사: 현재 MeCab 자료는 lindera/mecab-ko-dic의 12439fb32808b9244ded56d7dfed96e4b8d76869(2024-03-10 first commit)에 고정되어 있다. 해당 configure.ac는 2.0.0을 표기하며, 미러 생성 날짜가 원본 어휘 수정 날짜를 증명하지 않는다. https://github.com/lindera/mecab-ko-dic/commit/12439fb32808b9244ded56d7dfed96e4b8d76869 . 원본 전체의 최신 변경일은 이번 확인만으로 단정하지 않는다.

Open Korean Text의 선택 리비전은 2024-03-12 README 수정이지만, 사용 중인 resources/org/openkoreantext/processor/util 경로의 최신 변경은 GitHub API 확인상 2018-07-01의 49e9f99463101385a5d0675600e95b24542b2273이다: https://github.com/open-korean-text/open-korean-text/commit/49e9f99463101385a5d0675600e95b24542b2273 . Kiwi 계열은 kiwipiepy 0.23.2가 2026-06-11 배포됐으나 엔진과 사전 갱신은 구분해야 하며 LGPL 계열을 MIT/Apache 전용 자산으로 가정하지 않는다: https://github.com/bab2min/kiwipiepy/releases/tag/v0.23.2 , https://github.com/bab2min/Kiwi . 새 의존성으로 도입하지 않았다. 추천 방향은 기존 검증한 사전과 자체 통용어 보완을 함께 관리하고, 후보 갱신 시 실제 어휘 diff·출처·라이선스·오탐을 확인하는 것이다.

## 2026-09-12 피동 접미사와 인터넷 약어 검토

국립국어원의 [견제당하다 설명](https://www.korean.go.kr/front/onlineQna/onlineQnaView.do?mn_id=&pageIndex=1&qna_seq=310939)과 [납치당하다 설명](https://www.korean.go.kr/front/mcfaq/mcfaqView.do?mcfaq_seq=6454)에서 일부 행위 명사와 -당하다의 붙임을 확인했다. 자체 인식은 삭제·강등·거절·무시·이용·체포·혹사·납치·견제·차단의 제한된 어근에 기존 당하다 활용을 결합한다. 목록의 모든 결합을 국립국어원이 개별 판정했다고 주장하지 않는다. 임의의 전체 명사나 개인 등록어에 당하다를 붙여 승인하지 않는다. 원문 정의·예문 데이터는 배포하지 않는다. 접미사 활용을 보호하지만 뒤의 다른 어절 경계는 계속 검사한다.

질게는 질다의 정상 활용과 겹친다. 정확히 질게 뒤에 게시판·게시글·질문·답변이 이어지는 제한된 자체 문맥 단서에서는 수정 후보 없는 모호한 검토 대상으로 표시한다. 이 단서가 언어 규범이나 모든 커뮤니티 문맥을 판정한다는 뜻은 아니다. 단독 활용 및 죽을 질게 끓였다 같은 정상 문맥, 개인 사전 등록은 보존한다.

## 정상 표현 보존 보완 (2026-09-12)

- [국립국어원 한글 맞춤법 제47항과 해설](https://www.korean.go.kr/kornorms/m/m_regltn.do): 보조 용언의 허용 붙임과 합성·파생 용언 뒤의 경계를 구분한다. 단순히 본용언 표면이 세 음절이라는 이유로 필수 띄어쓰기를 주장하지 않는다. 형태 구성이 미확정이면 후보를 보류한다.
- [국립국어원 가나다전화에 물어보았어요](https://m.korean.go.kr/common/download.do?c_file_name=5c43a081-403a-47bf-ba5e-3430389c39a4_0.pdf&file_path=etcData&o_file_name=%EA%B5%AD%EB%A6%BD%EA%B5%AD%EC%96%B4%EC%9B%90_%EA%B0%80%EB%82%98%EB%8B%A4%EC%A0%84%ED%99%94%EC%97%90%EB%AC%BC%EC%96%B4%EB%B3%B4%EC%95%98%EC%96%B4%EC%9A%94.pdf): 전셋집의 사이시옷 근거. 기존 유사도 후보를 자체 제한 규칙으로 옮겼다.
- 규범 문서·웹페이지를 배포 사전 자산으로 복제하지 않는다. 명사 유사도만으로 이름을 치환하는 경로는 제거했다. 맞춤법/전셋집 같은 제한 표기와 검증된 활용 수정은 유지하며, 미확정 어휘는 기존 미등록 안내·개인 사전 흐름으로 처리한다.


### 2026-09-12 공통 보완 표제어와 활용 범위

`내구도`와 `이어버드`는 개인 사전과 별도로 작성한 공통 보완 표제어다. [국립국어원 전문용어 자료의 내구도](https://kli.korean.go.kr/term/trgtWord/indexTrgtWord.do?trgtWordNo=641337), [Beats 한국어 제품 설명의 이어버드](https://www.beatsbydre.com/kr/earbuds/solo-buds)에서 실제 용례를 확인했다. 외부 정의나 사전 파일을 복사하지 않았으며 이어버드를 표준어 인증으로 표현하지 않는다. 기존 MIT·Apache 배포 자산 이외의 자료를 추가하지 않았다.

형태 활용 복원은 기존 Apache 자료의 어간·복수 활용 분석을 대조한다. 보조 용언의 붙임 허용과 의무 띄어쓰기는 [한글 맞춤법 제47항](https://www.korean.go.kr/kornorms/m/m_regltn.do)의 적용 범위를 제한하여 구현한다. 모든 명사에 하다/되다를 붙여 정상어로 인정하거나, 긴 용언이라는 이유만으로 분리하지 않는다. 숫자 단위 경계는 숫자와 단위의 붙임 허용을 유지하면서 `5만 원` 등의 경계를 제안한다.


`-려니`의 어간 결합은 [한국어기초사전의 문법 설명](https://krdict.korean.go.kr/vie/dicSearch/SearchView?ParaWordNo=86695&nation=vie)을 대조했다. 자체 규칙은 후보 전체의 형태 분석을 요구하고, `살다/알다/만들다`처럼 실제 ㄹ 어간은 보존한다. `됬`의 수정도 전체 `됐` 활용이 검증될 때만 기존 제35항 규칙을 확장한다. 사전 설명 원문을 배포 파일에 복사하지 않았다.


`당첨되다`는 [한국어기초사전 표제어](https://krdict.korean.go.kr/eng/dicSearch/SearchView?ParaWordNo=49508&blockCount=10&currentPage=1&exaType=&mainSearchWord=%EB%8B%B9%EC%B2%A8%EB%90%98%EB%8B%A4&nation=eng&nationCode=6&proverbType=&searchType=W&sort=W&viewType=A&viewTypes=on&wordMatchFlag=N)를 확인했고, 용출의 되다 결합은 [공개 특허의 기술 용례](https://patents.google.com/patent/KR101860796B1/ko)와 과정 명사의 파생 관계를 검토해 인식에 보완했다. 후자는 사전 표준어 인증으로 주장하지 않는다. 자체 표제어 경계만 추가했으며 외부 정의·본문은 배포하지 않는다.

추측의 `-나/은가/는가 보다`는 [국립국어원 보조 형용사 설명](https://www.korean.go.kr/front/onlineQna/onlineQnaView.do?mn_id=216&pageIndex=1&qna_seq=312662&searchCondition=&searchKeyword=)을 적용한다. 앞말 전체의 활용 또는 알려진 명사+인가를 확인한 뒤 경계를 제안한다. `그렇다기엔`의 명사화와 `-답니다/-라네요`의 인식 보완은 전체 선행 활용을 검증하고 분리 제안만 억제하는 자체 분석 규칙이다.


### 명확한 표기 오류와 조사 보완

데스크톱·라이선스는 [국립국어원 교과서 표기 감수 지침의 대조표](https://www.korean.go.kr/common/download.do%3Bfront%3DDAE0FC7FD441DD1AE249E58AB99E0ADA?c_file_name=46a12cbb-5997-4e16-9d7b-d96f58b995c4_0.pdf&file_path=reportData&o_file_name=%EA%B5%90%EA%B3%BC%EC%84%9C+%ED%91%9C%EA%B8%B0+%EA%B0%90%EC%88%98+%EC%A7%80%EC%B9%A8+%EC%8B%9C%EC%95%88.pdf), 러닝은 [국립국어원 표기 설명](https://www.korean.go.kr/nkview/nknews/200406/71_5.html), 머릿속은 [국어문화학교 강사 연수 자료](https://www.korean.go.kr/common/download.do?c_file_name=bb989142-7c1f-4948-9aed-07086e9234b5_0.pdf&file_path=reportData&o_file_name=%EA%B5%AD%EC%96%B4%EB%AC%B8%ED%99%94%ED%95%99%EA%B5%90+%EA%B0%95%EC%82%AC+%EC%97%AD%EB%9F%89+%EA%B0%95%ED%99%94%EB%A5%BC+%EC%9C%84%ED%95%9C+%EC%A0%9C8%ED%9A%8C+%EA%B0%95%EC%82%AC+%EC%97%B0%EC%88%98%ED%9A%8C+%EC%9E%90%EB%A3%8C%EC%A7%91.pdf)를 확인했다. 이 네 개의 표기 관계만 자체 작성해 기존 범위 제한 규칙에 추가했으며 외부 표 전체·정의·본문은 배포 자료로 가져오지 않았다. 런닝맨처럼 뒤가 별도 어휘인 고유 표현은 일괄 치환하지 않는다. 개인의 명시적 등록은 유지한다.

`-십시오`는 [국립국어원 오용 대조 자료](https://www.korean.go.kr/nkview/nklife/1989_1/16_10.html)의 표기를 확인하고, 명령형 전체가 형태 분석될 때만 후보를 낸다. 조사 `로/으로`는 [국립국어원 문법 설명](https://www.korean.go.kr/front/onlineQna/onlineQnaView.do?mn_id=261&pageIndex=1&qna_seq=314593&searchCondition=&searchKeyword=)을 따른다. 을/를과 로/으로의 받침 조건을 적용하되 두 음절 이상 알려진 명사·개인 기본 단어에 한정하고, 가을/노을 같은 완전한 단어를 먼저 보호한다. 명확한 표기 규칙과 달리 `그제서야`는 그제라는 날짜 명사+조사로 성립하는 경우가 있어 [현행 상담의 문맥 구별](https://www.korean.go.kr/front/mcfaq/mcfaqView.do?mcfaq_seq=9159&mn_id=217&pageIndex=2)을 확인한 뒤 무조건 치환을 추가하지 않았다.

### 수량·기술 어휘 후속 검토

읽기 전용 대안 조사: [j5ng/et5-typos-corrector 모델 카드](https://huggingface.co/j5ng/et5-typos-corrector)는 Apache-2.0 표시와 ETRI-et5·모두의 말뭉치 기반을 명시한다. [파일 목록](https://huggingface.co/j5ng/et5-typos-corrector/tree/main)의 가중치는1.3GB이며 기존 Worker2MB 범위에 그대로 들어가지 않는다. 기반 모델의 연결 페이지는 이번 조회에서 오류여서 배포 권리 전체를 확인했다고 하지 않는다. 다운로드·실행·의존성 추가·원문 전송은 없었다. [PIXIE-Spell](https://huggingface.co/telepix/PIXIE-Spell-v1.5-0.6B)은 이름과 달리 검색 임베딩 모델이라 맞춤법 교정 대안으로 채택하지 않았다. 이 조사는 현 구현의 품질 통과나 모델 도입 결정이 아니다.

주격 조사 뒤 있다/없다는 조사와 서술어의 경계를 유지한다. 지시어+일반 명사는 제품·방법·문제·내용·상황·경우로 한정한다. 모든 `저+명사`에 적용하면 저장소·저전력을 훼손하므로 일반화하지 않는다. 부사처럼 보이는 닉네임+서술격은 임의 분리 대신 미등록 검토를 유지한다. [던가/든가의 공식 설명](https://www.korean.go.kr/front/onlineQna/onlineQnaView.do?mn_id=216&pageIndex=1&qna_seq=275630&searchCondition=&searchKeyword=)에 따라 어미 조각 `던가`를 독립 단어로 분리하지 않는다. 둘 중 맞는 표기를 모든 문맥에서 판정한다는 뜻은 아니다.

미등록 어휘의 복수 `들`과 조사 `만의/보단`은 기존 허용 조사 자료에 맞추어 등록할 기본 단어의 범위를 복원한다. 등록 전에 새 표현 전체를 정상어로 인정하지 않는다. 앞말을 개인 사전에 넣어도 인접 철자·띄어쓰기 오류는 별도로 검사한다.

수량 단위의 띄어쓰기는 제43항에 따라 조사·째·쯤·간 및 서술격까지 검증한다. `한번/한잔/한가지/한쪽/여러분`처럼 독립된 어휘 해석이 가능한 표현을 수량만으로 분리하지 않는다. `한`의 대략적인 수량 해석도 있으므로, [국립국어원 설명](https://www.korean.go.kr/nkview/nklife/2002_1/2002_0114.pdf)에 비추어 기존 정답 주석의 의미 제한 가능성을 별도 재검토로 남겼다. 원래 점수는 바꾸지 않았다.

공통 보완 사전의 `라우터/프로토타입/워크플로/마이그레이션`은 [AWS 라우팅 문서](https://docs.aws.amazon.com/ko_kr/vpc/latest/userguide/VPC_Route_Tables.html), [MDN 프로토타입 문서](https://developer.mozilla.org/ko/docs/Web/JavaScript/Guide/Inheritance_and_the_prototype_chain), [AWS 워크플로 문서](https://docs.aws.amazon.com/ko_kr/codecatalyst/latest/userguide/workflow.html), [Apple 배포 문서](https://support.apple.com/ko-kr/guide/deployment/depa5bf97586/web)에서 실제 기술 용례를 확인한 자체 작성 표제어다. 표준국어대사전 등재나 외래어 표준 판정을 뜻하지 않는다. `암호화/복호화`는 [MDN 설명](https://developer.mozilla.org/ko/docs/Glossary/Decryption)에 해당하는 상태 변화 용례만 생산적으로 활용한다. 외부 정의·예문·단어 목록과 Wikipedia.csv를 제품 자산으로 복사하지 않았다.

제한된 철자 후보는 [스크래치 표기 답변](https://www.korean.go.kr/front/onlineQna/onlineQnaView.do?mn_id=73&pageIndex=1&qna_seq=322020), [판넬/패널 대조](https://kli.korean.go.kr/term/trgtWord/indexTrgtWord.do?trgtWordNo=202502), [헤집다 표제어](https://krdict.korean.go.kr/eng/dicSearch/SearchView?ParaWordNo=87042&nation=eng), 위 국립국어원 자료의 `오랫동안` 설명을 근거로 작성했다. 후보 전체 활용형·조사 경계를 검증하며 개인 등록 예외를 우선한다. 용례만 확인한 다른 기술어를 비표준이라고 자동 판정하지 않는다.

### 관형형·의존 명사와 활용형 경계 보완

- 의존 명사 뒤 조사를 포함해 `연결되는 줄`, `먹은 것까지`, `읽을 정도로`를 제안한다. `만큼`은 체언 뒤의 조사와 관형형 뒤 의존 명사를 구별한다. [국립국어원 맞춤법 제42항 해설](https://www.korean.go.kr/kornorms/m/m_regltn.do), [얼마만큼/관형형 뒤 만큼 설명](https://www.korean.go.kr/front/mcfaq/mcfaqView.do?mcfaq_seq=6533&mn_id=217).
- `텐데`는 `터인데`의 준말이므로 앞의 관형형을 온전히 검증한 뒤 경계를 제안한다. [국립국어원 답변](https://www.korean.go.kr/front/onlineQna/onlineQnaView.do?mn_id=&pageIndex=1&qna_seq=329696&searchCondition=&searchKeyword=). 이름 속 같은 음절만으로 적용하지 않는다.
- `이/그/저/요/어느 정도`와 수량 뒤 `정도`는 명사 경계를 보존한다. 숫자에 붙은 단위 자체는 허용하며 `전/후`는 시간 단위 뒤로 한정한다. [국립국어원 가나다 전화 자료집](https://korean.go.kr/common/download.do?c_file_name=5c43a081-403a-47bf-ba5e-3430389c39a4_0.pdf&file_path=etcData&o_file_name=국립국어원_가나다전화에물어보았어요.pdf).
- 받침 뒤 `-사오니` 활용을 인식해 문체를 보존한다. [국립국어원 활용 설명](https://www.korean.go.kr/nkview/nklife/1991_3/1_13.html). 정의·예문 원문은 제품 자산에 넣지 않았다.
- Apache 사전의 표면형 분석이 원보드가 생성한 완전한 관형형·과거 어간을 덮지 않도록 했다. `주신`의 주다 활용과 `되었습니다`의 되다 활용을 유지한다. `-아/어지다`의 관형형, 명사+서술격 뒤 의존 명사, 보조 용언의 경계를 검사한다. 정상 형태가 겹치는 모든 경우를 해결했다는 뜻은 아니다.
- 같은 MeCab NNG.csv의 정적사태 2,708개는 완성 단어 인식 전용으로 추가했다. `지지부진하네요/과다하게`를 일반 분리 후보로 조각내지 않는다. 사전의 의미 분류를 표준어 판정과 동일시하지 않으며 자세한 출처·해시는 `third_party/spelling/README.md`를 따른다.

조사 결합 후속 보완은 제41/42항 구별을 따른다. 관형형 뒤의 `만큼/뿐`은 유지하며, 명사 뒤의 조사와 바로 앞 교정으로 드러난 의존 명사의 조사는 결합한다. `치고`는 치다의 활용과 겹치므로 일괄 결합하지 않는다. `것 치고는`의 제한된 비교 구성만 처리한다. `시장일` 같은 서술격 관형형도 따로 확인한다. 기존 평가 주석에서 파생어+보조 용언의 필수 경계를 누락했을 가능성은 [국립국어원 2026년 설명](https://www.korean.go.kr/front/onlineQna/onlineQnaView.do?mn_id=&pageIndex=1&qna_seq=331450)을 근거로 비공개 재검토 기록에 남겼다. 예측을 본 뒤의 재검토이므로 독립 판정으로 재분류하지 않는다.

### 개발017: 조사·접사 가설·인터넷 표현 검토

- [국립국어원 밖/밖에 설명](https://www.korean.go.kr/front/mcfaq/mcfaqView.do?mcfaq_seq=5714)을 참고해 제한을 나타내는 조사와 장소 명사를 구별했다. 구현은 앞 관형형과 뒤 없다를 확인하는 `수 밖에`, 있다/없다 앞 `수 가`에 한정한다. `집 밖에/그 밖에`를 일괄 붙이지 않는다. 추가 조사 로·와의·과의·로서의·으로서의는 기존 조사 붙임 규칙의 범위다.
- 기존 Apache-2.0 원본 MeCab XSN의 군/기/판 및 XPN 대 항목을 읽었고 자산을 추가하지 않았다. [어문 규범](https://www.korean.go.kr/kornorms/m/m_regltn.do), [출판 의미 -판 설명](https://m.korean.go.kr/front/onlineQna/onlineQnaView.do?mn_id=216&pageIndex=1&qna_seq=326625&searchCondition=&searchKeyword=)은 동형 명사·접미사의 구분 근거다. 모든 군/판/기 및 대+행위 명사를 표준어로 인증하는 근거가 아니다. 현재 보수적 가드는 가능한 접사 결합의 내부 분리만 멈추고 미등록 검토를 유지한다.
- [겹치다 활용](https://krdict.korean.go.kr/eng/dicSearch/SearchView?ParaWordNo=30458)의 겹쳐, [편하다/편안하다 의미 구분](https://www.korean.go.kr/front/onlineQna/onlineQnaView.do?mn_id=&pageIndex=1&qna_seq=326528), [싫어하다 관련 정정 답변](https://www.korean.go.kr/front/onlineQna/onlineQnaView.do?mn_id=&pageIndex=1&qna_seq=326813)을 확인했다. 겹처/싫어아/편한하의 완전한 활용 후보만 제시하고 편한하는 두 후보의 의미 선택을 남긴다. 싫어하다 자료는 아래 정정 답변을 기준으로 읽었으며 모든 -어 하다 구성을 붙이는 근거로 쓰지 않는다.
- [새국어생활 통신 표현 연구](https://www.korean.go.kr/nkview/nklife/2013_1/23_01.pdf)의 비추, [공공언어 자료의 통신 표현 연구](https://www.korean.go.kr/common/download.do?book_seq=102&c_file_name=a08fa535-6a1f-4a88-8011-4c94c40b71bf_0.pdf&downGubun=bookDataView&file_path=bookData&o_file_name=%EA%B3%B5%EA%B3%B5%EC%96%B8%EC%96%B4-03-8.pdf)의 컴을 읽었다. 기술적 용례 자료이며 규범 오류 판정이나 공통 정상어 승인 근거가 아니다. 모공은 실제 게시판 용례에 근거한 제한된 문맥 가설이다. 피부의 모공, 비추는 빛, 질다 활용은 보존한다. 확장형을 강요하는 후보 없이 별도 검토 이유·건너뛰기·개인 등록을 제공한다.
- 위 웹 문서의 정의·용례 표를 배포 사전에 복사하지 않았다. 자산은 개발008 이후 동일하고 이번 변경은 자체 작성한 제한 규칙이다. 본문 원문과 개발 예측은 Git 제외 로컬 자료에만 남긴다.

### 개발018: 축약 의존 명사와 -답다의 내부 경계

기존 제42항의 의존 명사 규칙에서 짧은 관형형 큰/긴/먼 뒤 거/게/건을 확인하고, 이미 검증한 부정 부사와 의존 명사 구성을 연결한다. 필수·이걸·과거·안개·못생긴 등 전체 어휘와 안되다/못하다의 어휘적 해석은 이전 보호 순서를 따른다. 모든 한 음절 용언을 허용하는 변경은 아니다.

[한국어기초사전 -답다](https://krdict.korean.go.kr/eng/dicSearch/SearchView?ParaWordNo=92145&nation=eng)와 [온라인가나다 접미사 설명](https://m.korean.go.kr/front/onlineQna/onlineQnaView.do?mn_id=216&pageIndex=1&qna_seq=308570)을 확인했다. 명사/명사구 뒤의 접미사 해석이 있을 때 다운이라는 별개 어휘가 분석된다는 사실만으로 공간을 삽입하지 않는다. 현재 구현은 명사와 답 계열로 나뉜 일반 분리 후보를 보류하고 미등록 검토를 유지한다. 특정 지명이나 모든 파생어를 공통 정상어에 추가하지 않았고 정의·예문을 배포 자료로 복사하지 않았다.

### 개발019: 보호 구간 바깥 조사와 조사 연쇄

[한글 맞춤법 제41항 해설](https://www.korean.go.kr/kornorms/m/m_regltn.do?regltn_code=0001)은 조사의 연속 결합과 어미 뒤 결합도 앞말에 붙이는 범위로 설명한다. [한국어 교육 문법 자료](https://korean.go.kr/common/download.do%3Bfront%3DA2A0EA71F5A939076C086664C3A8033E?c_file_name=5a2db2bc-a7ad-49f4-84a4-34b20ad33ffc_0.pdf&file_path=reportData&o_file_name=%ED%95%9C%EA%B5%AD%EC%96%B4%EA%B5%90%EC%9C%A1+%EB%AC%B8%EB%B2%95%ED%91%9C%ED%98%84+%EB%82%B4%EC%9A%A9%EA%B0%9C%EB%B0%9C+%EC%97%B0%EA%B5%AC_3%EB%8B%A8%EA%B3%84.pdf)의 직접 인용 조사 예시도 확인했다. [괄호 뒤 조사 상담](https://korean.go.kr/front/onlineQna/onlineQnaView.do?mn_id=216&qna_seq=327689)은 괄호 앞말을 기준으로 조사 형태를 선택하도록 설명하지만 이번 변경은 조사 교체를 하지 않고 공백만 다룬다.

같은 줄에서 닫힌 따옴표/괄호 및 기존 보호 URL·코드·파일명·단축키 뒤에 독립된 조사 토큰이 오면 보호 구간 바깥 공백만 삭제 후보로 제시한다. 닫히지 않은 따옴표·줄바꿈을 넘는 결합은 다루지 않는다. 인용의 의미는 확인 대상이며 내부 철자 검사 정책은 이 변경으로 바꾸지 않는다. 이미 보유한 조사 목록에서 명확한 시작형의 연쇄를 선택하고, 완전한 활용형 뒤부터/까지 및 직접 인용 조사를 처리한다. 모든 임의 한글 토큰을 조사로 가정하지 않는다. 수정 후 활용형을 다시 내부 분리하는 회귀도 시험하고 보수적으로 막았다.

웹 자료의 정의나 예문 목록을 배포 자산에 복사하지 않았다. 기존 자산 해시는 유지하며 자체 경계 규칙과 시험만 변경했다.

### 개발021: 짧은 관형형·축약 의존 명사와 중첩 구문

기존 제42항과 완전한 활용형 검증을 재사용해 짧은 관형형 뒤 거/게/건, 거+조사, 의존 명사 구문 뒤 같다를 연결했다. 선거·온건·본건 같은 전체 어휘와 -ㄹ게 어미를 보호하며, 반복하거나의 -거나를 거+나로 다시 분석하던 실험 회귀는 전체 용언 인식으로 막았다. 독립된 인걸로처럼 명사 앞말이 없는 한 음절 서술격 조각을 강제로 분리하지 않는다. 사전에 있는 모든 붙인 표현을 표준어라고 승인하거나 전체 사전의 한 음절 경계를 개방한 변경이 아니다.

`된거/한거`의 누락을 조사하며 기본 어휘와 형태 분석의 충돌도 확인했다. 한거는 기존 MeCab 명사 원문에 있고 된거는 기존 기본 어휘의 명사 목록에 있다. [기왕/이왕 상담](https://www.korean.go.kr/front/onlineQna/onlineQnaView.do?mn_id=216&pageIndex=1&qna_seq=314512&searchCondition=&searchKeyword=)의 질문에 된거가 등장하더라도 답변은 기왕/이왕에 관한 것이므로 된거의 표준 표기를 승인한 자료로 쓰지 않는다. 이번 변경에서 이들 원문 자산을 수정하거나 전역 제외하지 않았다.

[거예요의 형태 설명](https://www.korean.go.kr/front/onlineQna/onlineQnaView.do?mn_id=216&qna_seq=322497)과 [거에요/거예요의 문맥 구별](https://www.korean.go.kr/front/onlineQna/onlineQnaView.do?mn_id=216&pageIndex=1&qna_seq=278340)을 읽었다. 후자는 서술격인 경우와 부사어 것에+요의 경우를 구분하므로 모든 거에요를 오류로 단정하지 않는다. 현재 개발 자료의 특정 구문에서 공백만 제안되고 문맥상의 예요까지 복구하지 못하는 한계가 남는다. 이 자료의 질문·답변·정의를 배포 사전에 복사하지 않았다.

### 개발022: 숫자 뒤 과거 서술격과 문맥상 보류

기존에 확인한 이다+-었- 원리를 숫자가 붙은 받침 있는 계수 단위에 한정해 적용했다. 숫자와 쉼표·소수 표기는 보존하고 수정된 전체 어미를 검증한다. 새 사전 자료나 외부 정의를 배포 자산에 추가하지 않았다.

[그제야/그제서야 상담](https://www.korean.go.kr/front/mcfaq/mcfaqView.do?mcfaq_seq=9159&mn_id=21&pageIndex=1)은 그때 비로소라는 뜻의 표준형과 그저께를 뜻하는 그제+서야를 구별한다. 따라서 개발 자료에 특정 오용이 있어도 그제서야 전체를 무조건 교체하는 규칙을 만들지 않았다. 원래 URL 열기는 캐시 오류였고, 같은 상담 번호의 공식 검색 결과에서 답변을 확인했다.

### 개발024: 숫자 scale와 계수 단위 뒤 서술격

기존 단위 띄어쓰기 원리를 서술격 활용에도 연결했다. 숫자의 한글 자릿수 표현 뒤 단위에 이다 활용이 이어질 때 어미 전체를 확인하며, 아라비아 숫자만 단위에 붙인 허용형은 그대로 둔다. 새 외부 어휘·정의·예문 목록을 자산에 복사하지 않았다.

### 개발025: 동작 약어의 검토 기본형

인터넷에서 관찰된 업글에 검증된 하다 활용이 붙은 경우 기본 약어만 검토 대상으로 제시한다. 이는 표준어 확정이나 업그레이드로의 자동 대체가 아니다. 기본 단어를 개인이 등록한 뒤에만 같은 약어의 검증된 활용을 수용한다. 임의의 개인 명사를 동사로 만드는 일반 규칙이나 새 외부 어휘 자산을 도입하지 않았다. 자체 범위 규칙과 회귀 시험이며 실제 Chrome/macOS에서 기본 단어 등록 후 다른 활용형을 다시 검사했다.

### 개발026: 수량 표현 뒤 씩/쯤

[국립국어원 -씩 상담](https://www.korean.go.kr/front/onlineQna/onlineQnaView.do?mn_id=216&pageIndex=1&qna_seq=333859&searchCondition=&searchKeyword=)과 [파생어 선별 등재에 관한 후속 답변](https://www.korean.go.kr/front/onlineQna/onlineQnaView.do?mn_id=27&pageIndex=1&qna_seq=334021)은 사전에 모든 접사 결합형이 개별 표제어로 실리는 것은 아니라는 점을 설명한다. [쯤 결합 상담](https://www.korean.go.kr/front/onlineQna/onlineQnaView.do?mn_id=216&pageIndex=1&qna_seq=324970&searchCondition=&searchKeyword=)에서도 앞말에 붙여 쓰는 접미사임을 확인했다.

기존 구현의 수량 단위와 기본 수사 범위에서 씩/쯤 및 뒤의 검증된 조사·서술격을 인식한다. 이 결합을 인식해도 앞 수사와 단위 사이의 필수 공백을 숨기지 않는다. 정의·예문·어휘 목록을 배포 자산에 복제하지 않았다. 기존 MeCab의 NP/NR/NNB/NNBC 목록은 조사만 했으며 품사 분류를 표준어 승인으로 바꾸지 않았다.

### 개발027: 짧은 명사 조각에 의한 이름 분리 억제

기존 품사 목록이 어미와 조사를 함께 담는 점 때문에, 한 음절 명사와 어미 같은 조각을 조합한 분석이 이름 내부의 띄어쓰기 근거가 되는 문제가 있었다. 일반 분할에서는 짧은 명사 뒤 명확한 조사 경계를 요구한다. 눈이+오면처럼 검증 가능한 조사 경계는 유지하며, 불명확한 이름은 분리 후보 대신 미등록 검토로 남긴다. 이름을 기본 정상어 목록에 등록하거나 외부 고유명사 자산을 추가하지 않았다. 보유한 개발 자료의 보호 구간 및 기존 정상/오류 회귀를 함께 검증했다.

### 개발028: 확립된 기술 약어 CPU/GPU

[NVIDIA의 용어 자료](https://docs.nvidia.com/ai-enterprise/planning-resource/licensing-guide/latest/terminology.html)에서 CPU/GPU 용어를 확인했다. 자체 MIT 보완 목록에는 두 표제어만 독립 작성했고 정의·예문·외부 단어 목록을 복제하지 않았다. 이번 제품 동작은 기술 약어의 대소문자를 정제하지 않고 작성한 표기를 보존하는 것이다. 이는 출처가 소문자 표기를 규범적으로 승인했다는 주장이 아니며, 미등록 약어 전체를 정상어로 바꾸는 일반 정책도 아니다. 개인 사전의 정확한 대소문자 구분과 기존 AHK 후보 동작을 별도 시험했다.

### 개발029: 높임 선어말 어미의 축약

[국립국어원 높임 표현 상담](https://www.korean.go.kr/front/onlineQna/onlineQnaView.do?mn_id=&pageIndex=1&qna_seq=325482)은 주셔서와 주시어서의 관계를 직접 설명한다. [축약 표기 설명](https://www.korean.go.kr/nkview/nklife/1995_4/5_10.html)에서도 하시어/하셔의 준말 표기를 확인했다. 정의나 예문 목록을 배포 자산에 복제하지 않았다.

기존 높임 어간에서 -셔와 검증된 연결/종결 꼬리만 생성한다. 이를 임의 어미가 붙는 어간으로 추가하지 않아 주셔는/주셔습니다를 승인하지 않는다. 본용언+보조용언의 기존 붙임 허용 및 파생 본용언 뒤 필수 공백 원리는 유지한다. 읽어주셔서는 유지하고 추천해주셔서는 추천해 주셔서로 제안하는 동작을 함께 시험했다.
## 개발031: 부정 부사와 어휘화한 용언

국립국어원 [안 하다 안내](https://www.korean.go.kr/front/onlineQna/onlineQnaView.do?mn_id=216&pageIndex=1&qna_seq=310809)와 [공부 안 해 안내](https://www.korean.go.kr/front/mcfaq/mcfaqView.do?mcfaq_seq=6553&mn_id=&pageIndex=1)를 확인했다. 검증된 하다 활용 및 해/하여+보다 활용 앞 안의 공백을 원자료 전체형 승인보다 먼저 제안한다. 개인 전체형 등록은 유지한다. 안되다/못하다 전체에 같은 규칙을 적용하지 않는다.

정상어 못생기다는 [한국어기초사전 표제어와 활용](https://krdict.korean.go.kr/tha/dicSearch/SearchView?ParaWordNo=15309&nation=tha)을 확인했다. 확장 인식 사전의 못생기 어간 분석을 보호하여 못 생기다 오제안을 막는다. 모든 확장 분석을 보호한 초기 실험은 못받았는데 검출을 숨겨 단위 시험에서 실패했고 채택하지 않았다. 사전이 표준성의 정답이라는 가정을 두지 않는다. 정의·예문 복제나 새 배포 데이터 추가는 없다.

## 개발030: 자료에 입증된 르 활용

기존 Apache MeCab Inflect의 연결형(EC)이 예상되는 ㄹ라/ㄹ러 교체형과 일치할 때만 활용을 확장한다. 배부르→배불러와 기존 어간의 과거형을 인식하며, 모든 르 어간에 같은 변화를 강제하지 않는다. 국립국어원 [한국어기초사전 배부르다](https://krdict.korean.go.kr/eng/dicSearch/SearchView?ParaWordNo=58913&nation=eng)의 활용 표기도 배불러를 확인한다. 정의나 예문은 배포 자산에 복제하지 않았고 생성 사전 파일은 변경하지 않았다.

부정 시험 후보 풀렀습니다는 변경 전029 검사기도 정상 인식했다. 원본 Inflect.csv의 풀러라/풀렀 분석이 풀르 어간을 포함하는 것을 확인했다. 이번 교체 규칙의 회귀로 취급하지 않으며 원자료 표준성 감사의 잔여 항목으로 남긴다. 딸랐어요/칠렀어요의 잘못된 교체는 여전히 검토 대상으로 남는다.
## 개발032: 수량 접미사 공백

국립국어원 [짜리/어치 안내](https://www.korean.go.kr/front/onlineQna/onlineQnaView.do?mn_id=216&pageIndex=1&qna_seq=306853)에서 수량 명사구 뒤 접미사의 붙임을 확인했다. 이번 구현은 아라비아 숫자와 검증된 단위 뒤 짜리 및 조사/서술격 꼬리에 한정해 앞 공백만 제거한다. 숫자·단위 표기와 별도 오류는 유지하며 코드·URL·식별자 및 줄바꿈 내부는 제외한다. 안내의 정의나 예문을 자산에 복제하지 않았다.

다음 파생어 조사 근거: Chrome의 한국어기초사전 검색 UI에서 출시하다(표제어79811)와 테스트하다(80157)를 직접 확인했다. 출시하다 상세에서는 출시한/출시한다고/출시했다 형태도 확인했다. 검색 도구의 무결과와 일부 직접 URL 열기 실패를 사전 부재나 브라우저 불가로 해석하지 않았다. 이 두 표제어는032 구현에 추가하지 않았으며 다음 변경의 검토 근거다. 원본 사전 자료를 내려받지 않았다.
## 개발033: 공통 행위 명사와 문맥 경계

032에서 Chrome으로 직접 확인한 한국어기초사전 출시하다(79811), 테스트하다(80157)를 자체 공통 행위 명사 보완에 반영했다. 기존 시각화·자동화·암호화·복호화와 함께 `communityActionNouns` 한 곳에서 활용 인식과 공백 후보가 공유한다. 개인 등록을 이 목록에 넣지 않는다. 정의·예문·외부 목록·사전 자산을 수입하지 않았다.

앞 단어를 명사 수식어로 처리하는 보호는 유지하되, 기존 기본 부사와 목적격 구절 뒤 검증된 연결형, 인용문 뒤 조사를 구분한다. 예를 들어 사서 단독의 명사 해석은 보존하며 목적어+사서 구절은 연결형 문맥으로 본다. 이는 자체 제한 규칙이며 사전 출처가 임의의 문맥 판정까지 보장하는 것은 아니다. 또한 뒤쪽 숫자 후보가 앞쪽 행위 명사 후보를 막던 비중첩 판정 오류를 실제 구간 교집합 검사로 수정했다.
## 개발034: 모음 끝 명사 뒤 과거 서술격 공백

국립국어원 [초급 한국어 말하기 교재](https://www.korean.go.kr/common/download.do?c_file_name=ebc87ddf-6f65-4afc-8735-c89b814e6cb4_0.pdf&file_path=reportData&o_file_name=초급한국어말하기.pdf)의 학생이었습니다/친구였습니다 구분과, [서술격 이다의 이었-/였- 축약 안내](https://www.korean.go.kr/front/onlineQna/onlineQnaView.do?mn_id=216&pageIndex=1&qna_seq=328164)를 함께 확인했다. 모음 끝의 독립 명사 또는 미등록 체언 후보 뒤에서만 검증된 였- 활용의 공백을 제거한다. 명사+조사 뒤 동사였을 가능성(머리에 였어요), 자음 끝의 잘못된 축약, 줄바꿈, 코드, 분석되지 않은 어미는 이 규칙으로 붙이지 않는다. 정의·교재 원문·예문을 배포 자산에 복제하지 않았다.
## 개발035: 확인된 장소 대명사와 반복 어휘

국립국어원 [바른 국어 생활](https://www.korean.go.kr/common/download.do?c_file_name=fa64499d-d020-44e9-895c-6116a37a58e4_0.pdf&file_path=etcData&o_file_name=바른국어생활.pdf)의 이곳 붙임 설명과, 2025 병렬 말뭉치 구축 지침 별표2의 이것저것/그때그때 한 단어 사례를 확인했다. 원본 Apache MeCab NP.csv에도 이곳·그곳·저곳이 존재하지만 현재 배포 선별에는 빠져 있었다. 이 세 표제어만 자체 공통 보완으로 추가했다. NP 전체나 외부 지침의 어휘 목록·정의·예문을 자산에 복제하지 않았다.

확인된 어휘의 내부 공백만 제거하고 조사/서술격 꼬리와 단어 경계를 검증한다. 일반 명사 결합으로 확장하지 않으며 코드·URL·식별자·줄바꿈을 보호한다. 그 중은 승려를 뜻하는 동형 명사와 겹치므로 이번 규칙에 넣지 않았다. 국립국어원333549의 그중 안내 역시 '여럿 가운데'라는 뜻의 한 단어를 설명하는 근거로만 사용한다.
## 개발036: 서술격·인용 조사의 결합과 공백 복합 후보

국립국어원 [예요 축약 조건](https://www.korean.go.kr/front/onlineQna/onlineQnaView.do?mn_id=216&pageIndex=1&qna_seq=311915), [모음 뒤 본말 이에요도 가능](https://www.korean.go.kr/front/onlineQna/onlineQnaView.do?mn_id=27&pageIndex=1&qna_seq=332922), 한국어기초사전 [이라고](https://krdict.korean.go.kr/eng/dicSearch/SearchView?ParaWordNo=70075&nation=eng)의 받침 조건을 확인했다. 확인된 체언 뒤 예요/라고/라는의 잘못된 결합을 이에요/이라고/이라는으로 제안한다. 용언으로 전체 분석되는 인용형과 개인 전체형 등록은 보호한다. 초기 규칙이 달라는/살라고/놀라는를 바꾸는 회귀를 시험에서 발견해 해당 용언 보호를 추가한 뒤 검증했다.

어휘 내부 공백 및 일반 명사 뒤 조사 공백을 수정할 때 같은 표기 규칙을 재사용한다. 이 곳예요와 학생 예요를 공백만 없앤 오형으로 끝내지 않고 이곳이에요/학생이에요 후보로 제시한다. 기본 형태 분석 자료가 오형을 인정하더라도 표기 규칙은 그보다 먼저 적용한다. 외부 정의·예문이나 새 자산을 복제하지 않았다.

## 개발037–038: 미등록 이름 뒤 측과 수정 후 인식

국립국어원 [의존명사의 사전적 처리](https://www.korean.go.kr/nkview/nklife/1998_1/8-3.html)를 Chrome에서 직접 읽었다. 이 글은 사전 간 품사 차이를 논한 1998년 연구이며 최신 규정 자체로 취급하지 않는다. 2007 교과서 표기 감수 지침의 측 항목에서도 남한 측/주최 측의 띄어쓰기를 확인했다. 고정한 Apache MeCab 원본에는 NNB.csv의 측(125행)과 XSN.csv의 측(107행)이 함께 있다. 따라서 어미 측만으로 모든 단어를 분리하지 않고, 기존 사전에서 인식되지 않는 이름 후보와 검증된 조사/서술격 꼬리의 검토에 한정했다. 이름과 후행 공백 수정 구간은 겹치지 않으며 의도적인 전체 이름이면 등록하거나 건너뛸 수 있다.

037의 실제 Chrome 시험은 수정 후 측에서를 다시 미등록으로 보여 실패했다. 038에서는 자체 공통 보완 표제어 측을 추가해 기존 조사 분석을 재사용했다. 외부 정의·예문·목록을 복제하지 않았다. 개인 이름은 공통 목록에 추가하지 않는다. 양측/좌측처럼 이미 알려진 전체어, 알려진 앞말, 코드·URL·미검증 꼬리는 새 이름 분리 규칙에서 보호한다.

다음 조사: 국립국어원 [외래어와 하다/되다](https://www.korean.go.kr/front/onlineQna/onlineQnaView.do?mn_id=27&pageIndex=1&qna_seq=327362)의 실제 답변에서 행위성 명사와 접미사 결합을 확인했다. 038 구현에는 아직 반영하지 않았다. 대형화되고를 대형화 되고로 잘못 분리하는 재현과 백업 되도록의 누락을 확인했으며, 접미사/독립 동사 및 명사구 수식 경계를 구분해야 한다. 이 후속 문제는 완료하지 않았다.

## 개발039: 상태 변화 파생어의 정상형 보호

한국어기초사전의 [대형화](https://krdict.korean.go.kr/eng/dicSearch/SearchView?ParaWordNo=47247&nation=eng&nationCode=6), [대형화되다](https://krdict.korean.go.kr/m/eng/searchResultView?ParaWordNo=90432&nation=eng), [중독되다](https://krdict.korean.go.kr/eng/dicSearch/SearchView?ParaWordNo=77302)를 확인했다. 기존 되다 파생 허용 명사에 대형화/중독 두 표제어를 자체 보완하여 정상 활용형의 오분리를 막았다. 실제 원본 NNG의 구성 분석은 감국화/개옥잠화 등 꽃 이름도 화/NNG로 나누므로 그 분석만으로 전체 목록을 파생 허용하는 방법은 사용하지 않았다. 사전 정의나 예문을 자산으로 복제하지 않았다.

다음 경계 조사에서 Chrome으로 [또는/및 뒤의 하다·되다](https://www.korean.go.kr/front/onlineQna/onlineQnaView.do?mn_id=27&pageIndex=1&qna_seq=333936) 답변을 직접 읽었다. 명사구 뒤 공백을 보호해야 하며 이 후속 문맥 경계는039에서 아직 변경하지 않았다. web open의 URL 안전 오류와 Chrome의 실제 열람 성공을 구분한다.

## 개발040 검증 중 회귀: 독립 동사와 파생어의 구분

또는/및 명사구를 보호하고 되다 앞 공백 제거를 확장한 초기040에서, 붙인 전체형이 분석된다는 조건만으로 안 됩니다/안 되는/안 된을 잘못 붙였다. Node 단위 시험과 동결 개발 비교 모두 이 회귀를 검출했다. 정상 오제안은0→3/475가 되어 이 후보를 최종 채택하지 않는다. 파생 명사 허용 여부를 공통 형태 분석기의 기존 집합에서 조회하도록 보완해야 한다. 정상 전체형 안되다의 존재가 문맥상 안 되다를 붙일 근거가 되지 않는다.040 동결 예측은 실패 증거로 보존한다.

## 개발041: 공통 파생 허용 명사로 경계 제한

040 회귀를 막기 위해 형태 분석기가 이미 쓰는 되다 파생 명사 집합을 공백 검사에서도 직접 조회한다. 명사구 보호와 실제 활용 검증을 함께 유지한다. 정상 안 됩니다/안 되는/안 된은 붙이지 않는다. 원본 자산·외부 의존성·개인 저장 계약은 추가하거나 변경하지 않았다. Chrome의 통과만으로 언어 품질을 판정하지 않고 Node와 동결 문장 비교의 실패를 먼저 해결했다.

## 개발042: 고유명사와 서술격 동형 조각 보호

Chrome에서 [더불어민주당 충남도당의 공식 소개 페이지](https://chungnam.theminjoo.kr/party/sub/introduce/organization.php)를 직접 읽어 공공 고유명사 표기를 확인했다. 이 표제어만 자체 공통 보완 사전에 추가하며 사이트 원문·정책·정의·어휘 목록을 수입하지 않는다. 개인 닉네임을 공통 사전으로 승격하지 않는다.

이지엉클의 이지를 이+지 명사 조각이자 이다 활용형으로 중복 해석해 분절을 허용하던 경로를 제한했다. 한 음절 명사 조각 뒤 불명확한 꼬리를 보호할 때, 명사 없이 시작하는 서술격 동형은 독립 용언의 근거로 삼지 않는다. 확인된 지시 대명사 이게/그게/저게/요게와 명확한 조사 뒤의 띄어쓰기 후보는 유지한다. 이지엉클 자체를 표준어 목록에 넣지 않으며 미등록 검토 및 개인 등록 대상으로 남긴다.

후속 판정 주의: 흘러다니며의 붙임/띄어쓰기 근거는 아직 확정하지 못했다. 검색에서 사전별 등재 차이를 논한 2019년 연구를 찾았으나 최신 표준 규범을 확인한 것으로 처리하지 않는다. 해당 동결 정답이나 후보는 이번 변경에서 뒤집지 않았다.

## 개발043: 외래어 후보와 복수형·서술격의 복합 수정

국립국어원 [콘텐츠 표기 안내](https://www.korean.go.kr/front/onlineQna/onlineQnaView.do?mn_id=216&pageIndex=1&qna_seq=321712)와 [액세스 항목](https://www.korean.go.kr/front/imprv/refineView.do?imprv_refine_seq=7337&mn_id=158)의 엑세스 오표기를 확인했다. Chrome의 우리말샘 검색에서 전문가 감수된 [워크 플로](https://opendict.korean.go.kr/dictionary/view?sense_no=766743&viewType=confirm), [마이그레이션](https://opendict.korean.go.kr/dictionary/view?sense_no=617027&viewType=confirm) 표제어를 직접 확인했다. 워크^플로의 붙임 허용을 유지하며 순화어로 바꾸지 않는다. 기존 확인한 테스트 표제어에 맞춘 테트스, 마이그레션의 제한된 후보도 추가했다. 정상 꼬리(조사/복수/서술격)에서만 적용하고 개인 기본 단어 등록·코드·URL·긴 이름 내부는 보호한다.

같은 Chrome 검색에서 마이그레이션하다(950048), 필터링하다(936125), 패스하다(27455/58372/67508)의 감수된 활용형을 확인했다. 필터링의 정보 통신 행위 뜻은847153, 덤핑의 행위 명사 뜻은331607/334984를 확인했다. 기존 국립국어원327362의 생산적인 행위 명사+하다/되다 기준에 따라 이 네 표제어만 자체 공통 행위 명사에 추가한다. 전체 Foreign 목록이나 원문의 정의·용례를 수입하지 않는다. 공통 행위 명사는 기본 명사 인식에도 연결해 활용형만 정상이고 기본어는 미등록인 불일치를 막았다.

컨텐츠들 입니다처럼 철자 후보와 서술격 공백이 겹칠 때 이전의 단일 철자 후보를 이어 받아 콘텐츠들입니다 한 후보로 합친다. 복수형 뒤 서술격도 같은 검증을 사용한다. 여러 후보가 있는 불확실한 수정은 임의로 하나를 합치지 않는다. 개인 컨텐츠 등록은 표현을 유지하면서 후행 공백과 다른 단어의 오타를 계속 검토한다.

### 개발044–045: 측정 단위의 조사와 기호 인식

- 국립국어원 온라인가나다 [306149](https://www.korean.go.kr/front/onlineQna/onlineQnaView.do?mn_id=216&pageIndex=1&qna_seq=306149)의 로서/로써 설명에서 모음·ㄹ 받침 뒤의 결합 조건을 확인했다. 기존 을/를/으로 규칙에 으로서/으로써를 연결하며 의미상 로서와 로써를 서로 바꾸지 않는다.
- 국립국어원 [점역 교정사 교재](https://korean.go.kr/common/download.do%3Bfront%3D0CFD457DBAE74E96759BD3FD74B62108?c_file_name=89ddfccb-de14-4a76-8238-f241275ff96d.pdf&file_path=reportData&o_file_name=%EC%88%98%ED%95%99%C2%B7%EA%B3%BC%ED%95%99%C2%B7%EC%BB%B4%ED%93%A8%ED%84%B0+%EC%A0%90%EC%97%AD+%EA%B5%90%EC%A0%95%EC%82%AC+%EC%96%91%EC%84%B1+%EA%B5%90%EC%9E%AC.pdf)의 검색 가능한 cm/센티미터·mm/밀리미터 대응과 [기초사전 킬로](https://krdict.korean.go.kr/m/eng/searchResultView?ParaWordNo=72175)의 km/킬로미터 대응을 참고했다. 수치에 붙은 cm/mm/km/m만 같은 모음 말음 조건으로 처리한다. 기호 자체나 숫자-단위 공백은 변경하지 않는다. 사전 정의·자료를 배포 자산으로 복사하지 않았다.
- 같은 기초사전은 kg의 킬로 읽기도 보여 준다. 따라서 kg를을 반드시 kg을로 바꾸는 초안은 채택하지 않았다. 임의 영문 명칭·제품 식별자로 발음 규칙을 확대하지 않는다.
- 044 초기 단위 시험에서 20 cm을에 올바른 조사 후보와 영어 cm 미등록 안내가 함께 나오는 실패를 확인했다(220통과/1실패). 045는 인식한 측정 기호의 구간만 일반 영문 검사에서 제외하고 221개 단위 시험을 통과했다. 044 동결은 실패 이력으로 보존한다.

### 개발046: 활용형 사이 경계와 철자 후보의 결합

- [온라인가나다310367](https://www.korean.go.kr/front/onlineQna/onlineQnaView.do?mn_id=&pageIndex=1&qna_seq=310367)은 -게 되다의 공백과 -어지다의 붙임을 구분한다. [국립국어원 법률 띄어쓰기 연구](https://www.korean.go.kr/nkview/nklife/2002_1/2002_0104.pdf)도 -게 되다의 단어 경계를 예시한다. 기존 -야 하다 경계에 검증된 되다 활용을 연결하고 -게 되다를 같은 공통 분석기에서 처리했다. 잘되다/참되다 등의 어휘 전체를 대상으로 하는 안되다/잘되다 일괄 분리는 하지 않는다.
- 문법적으로 분리된 후보의 각 단어에 기존 철자 규칙을 다시 적용한다. 각 규칙이 한 후보를 낼 때만 공백·철자를 결합하며 여러 후보 중 하나를 임의 선택하지 않는다. 개인 등록한 기본어의 기존 보호와 전체형 등록을 유지한다. 녹여줘야되요→녹여줘야 돼요처럼 공백만 고쳐 오류를 남기는 출력을 줄인다. 사전 정의나 연구 원문을 배포 자산에 추가하지 않았다.
- 추가 확인: [온라인가나다326374](https://www.korean.go.kr/front/onlineQna/onlineQnaView.do?mn_id=27&pageIndex=1&qna_seq=326374)은 -어야 하다/되다의 붙여 쓰기가 허용되지 않음을 명시한다. [327144](https://m.korean.go.kr/front/onlineQna/onlineQnaView.do?mn_id=216&pageIndex=1&qna_seq=327144)은 해야 돼요의 철자와 공백을 함께 확인한다.

### 개발048–050: 관형형과 명사 경계의 보호 순서

- [한국어 어문 규범](https://www.korean.go.kr/kornorms/m/m_regltn.do)의 단어별 띄어쓰기 원칙과 기존 공통 활용형 자료를 사용한다. 관형형으로 분석된 앞말 뒤에 확인된 명사가 오면 검토 가능한 공백 후보를 제공한다. 사전의 두 명사가 이어졌다는 이유만으로 분리하는 규칙은 아니다.
- 048은 한국판→한 국판, 쓴다던지→쓴다 던지, 큰걸음→큰 걸음의 기존 보호 시험3개를 깨뜨렸다. 049에서 어휘 전체/명사 접미사 보호 뒤로 옮기고 실제 관형형 끝모양을 확인했으며 명사형 활용은 이 규칙의 근거에서 제외했다. 큰걸음은 이번 검색에서 규범 표제어를 확인하지 못했으므로 표준어로 승인해 보완 사전에 넣지 않는다. 그 표현의 제식 용어/제목 해석 가능성과 기존 보호 범위를 유지한다.
- 049 개발 평가에서 올해초→올 해초 및 메인이고→메인 이고가 추가로 드러났다. 050은 더 긴 알려진 명사 앞부분을 자르지 않으며, 명사 앞말 없이 독립한 서술격 조각도 오른쪽 명사 근거로 삼지 않는다. 기존 정답에 맞추기 위해 판정을 바꾸지 않았다. 048/049 예측은 실패 이력으로 보존한다.
- 개인 전체형 등록, URL/코드 구간, 한국판 같은 명사 접미사와 작은아버지 등의 전체 어휘 보호를 유지한다. 새 후보는 문맥 검토 대상으로 제공하며 닉네임을 자동 표준어에 넣지 않는다. 새 배포 사전/의존성은 추가하지 않았다.

### 개발051: 달력 명사와 경과 기간

- [국립국어원 공공언어 자료](https://www.korean.go.kr/common/download.do?book_seq=109&c_file_name=abacac67-fee1-4f73-8b41-8242eccfb601_0.pdf&downGubun=bookDataView&file_path=bookData&o_file_name=%EA%B3%B5%EA%B3%B5%EC%96%B8%EC%96%B4-03-15.pdf)의 올해초→올해 초 사례를 확인했다. 기존 숫자 월+초/말 경계에 네 자리 연도와 확인된 달력 명사 범위를 연결한다. 연말/월초 같은 전체 어휘는 새 규칙의 앞말 목록과 다르므로 유지한다.
- [국립국어원 가나다전화 자료](https://www.korean.go.kr/common/download.do?c_file_name=5c43a081-403a-47bf-ba5e-3430389c39a4_0.pdf&file_path=etcData&o_file_name=%EA%B5%AD%EB%A6%BD%EA%B5%AD%EC%96%B4%EC%9B%90_%EA%B0%80%EB%82%98%EB%8B%A4%EC%A0%84%ED%99%94%EC%97%90%EB%AC%BC%EC%96%B4%EB%B3%B4%EC%95%98%EC%96%B4%EC%9A%94.pdf)의 경과한 기간을 나타내는 만을 참고했다. 기간 단위 뒤 만에를 분리하며 한글 수량에는 기존 수량 공백도 함께 적용한다. 금액/사물 수량의 만을 경과 시간으로 간주하지 않는다.
- 050의 올해초 보호 시험은 올 해초라는 잘못된 내부 분리를 금지하는 명시적 시험으로 유지하고, 올해 초라는 올바른 후보는 별도 긍정 시험으로 확인한다. 정답 자료를 변경한 것이 아니다.
- [온라인가나다327605](https://m.korean.go.kr/front/onlineQna/onlineQnaView.do?mn_id=216&pageIndex=1&qna_seq=327605)은 1 일 차/1일 차의 차이를 다루므로 검색 결과의 붙임 허용 문구를 1일차까지 허용한다는 근거로 확대하지 않는다. 2일차의 누락은 이번 구현에서 해결했다고 주장하지 않는다. 2025 상담 분류 연구의 언어모델 출력 예시는 규범 판정 근거로 사용하지 않는다.

### 개발052: 빈도 수량과 경과 차수

- [온라인가나다327795](https://korean.go.kr/front/onlineQna/onlineQnaView.do?mn_id=&pageIndex=1&qna_seq=327795)는 기간 명사구 뒤 차의 띄어쓰기와 제1차의 붙임 허용을 명시적으로 구분한다. [309642](https://www.korean.go.kr/front/onlineQna/onlineQnaView.do?mn_id=216&qna_seq=309642) 및 [기초사전 차](https://krdict.korean.go.kr/eng/dicSearch/SearchView?ParaWordNo=71727&nation=eng)도 기간 뒤 용법을 확인한다. 숫자+기간 단위의 전체를 보존하고 차 앞에만 공백을 제안한다. 051의 미확인 항목을 이번 근거로 보완했다.
- 주/월/연/일의 빈도 명사와 횟수 단위 회/번의 결합은 기존 단어별 띄어쓰기 원칙을 적용한다. [국어 연감](https://www.korean.go.kr/nkview/kyear/2013/2013_25.html)에는 주 1회·월 1회·연 1회 표기가 확인되며, 이는 용례 근거이지 해당 질의에 대한 규범 답변은 아니다. 회/번 뒤 씩·조사를 검증하고 날짜/제품 식별자 내부로 확대하지 않는다.
- 5 개월차를 처리할 때 이미 만들어진 공백 후보 안에 개월차 미등록 안내가 중복되는 문제를 확인했다. 토큰 검사 전에 확정된 후보 구간을 공통으로 보호하여 중복 안내를 막는다. 후보 바깥의 됬어요는 계속 검사한다. 기존 어휘 공백 복구 구간도 같은 처리를 사용하며 사전·분석 불확실성 전체를 숨기지 않는다.

### 개발054: 명사 철자와 앞뒤 경계의 결합

- 기존 자체 명사 철자 목록과 조사·서술격 꼬리 검증을 `lexicalNounRepair`로 공유한다. 명사 결합 내부에서 모든 용언/조사 교정 규칙을 다시 실행하지 않는다. 무료/유료 앞말 뒤 명사 철자를 바로잡고 공백을 함께 제안하며, 개인 등록한 명사는 철자를 보존해 공백만 제안한다.
- [온라인가나다278341](https://www.korean.go.kr/front/onlineQna/onlineQnaView.do?mn_id=216&pageIndex=1&qna_seq=278341)은 무료입장이 한 단어이며 유료 입장은 단어별로 띄어 씀을 구분한다. 따라서 전체 어휘 인식을 앞세우며 무료입장/무료하다를 무조건 분리하지 않는다. 가격 앞말 규칙을 모든 명사끼리의 결합으로 확대하지 않는다.
- 명사 뒤 독립 형용사 같다의 검증된 활용 경계에는 기존 단어별 띄어쓰기 원칙을 적용한다. 기존 어휘 전체 보호를 우선해 감쪽같은/한결같이/불꽃같이 등을 유지한다. [온라인가나다316291](https://korean.go.kr/front/onlineQna/onlineQnaView.do?mn_id=216&pageIndex=1&qna_seq=316291)은 찰떡같다 자체가 형용사임을 확인하는 보존 근거다. 명사 철자 오류와 같은 경계가 겹친 엑세스같은에는 액세스 같은을 한 후보로 제공한다.
- 새 배포 사전/정의/외부 의존성은 추가하지 않았다. 무료라이센스로/엑세스같은의 후보, 긴 닉네임·코드/URL 보호, 개인 기본어와 전체형의 구분을 시험한다. 모든 명칭/전문 용어의 합성 여부를 해결했다고 주장하지 않는다.

### 개발055–056: 비교 표현 규칙의 합성 형용사 회귀 보완

- 054의 기존 전체 어휘 보호만으로 찰떡같은/불꽃같은을 보존하지 못했다. 추가 정상 검사에서 오분리를 확인해 055는 -같이 전체 부사 표제어가 있는 경우 비교 분리를 제한했다. 이 제한 자체는 형용사 표준성 승인이 아니다.
- [온라인가나다308661](https://m.korean.go.kr/front/onlineQna/onlineQnaView.do?mn_id=216&pageIndex=1&qna_seq=308661)과 [326800](https://www.korean.go.kr/front/onlineQna/onlineQnaView.do?mn_id=261&pageIndex=1&qna_seq=326800)은 불꽃같다/찰떡같다 등의 합성 형용사와 독립 비교 표현을 구분한다. 056은 확인한 두 어간만 자체 공통 보완 자료에 추가한다. 정의나 사전 원문은 배포 자산에 복사하지 않았다.
- 합성어와 다른 뜻으로 쓰인 불꽃 같은 등의 띄어진 비교 표현도 유지한다. 정상 활용형에 오류·미등록을 모두 만들지 않는 시험과, 이웃 됬어요만 수정하고 undo/redo·저장하는 Chrome 시험을 추가했다.

### 개발057: 수량 앞말과 숫자 범위

- [국립국어원 바르고 쉬운 공공언어](https://www.korean.go.kr/common/download.do?c_file_name=1e6de9c9-37a3-4505-9d7d-387be3eb86f7_0.pdf&file_path=reportData&o_file_name=%EB%B0%94%EB%A5%B4%EA%B3%A0%20%EC%89%AC%EC%9A%B4%20%EA%B3%B5%EA%B3%B5%EC%96%B8%EC%96%B4.pdf) PDF83쪽은 관형사 만과 수량의 공백을,84쪽은 아라비아 숫자와 단위의 붙임 허용을 설명한다. 만4개월 등의 수량 앞말만 분리하고 숫자-단위의 작성된 공백을 유지한다.
- 딱은 기존 단어별 띄어쓰기 원칙에 따라 검증된 수량 앞에서 분리한다. 월/주/연/일은 이번 규칙에서 금액 단위가 확인된 경우로 제한한다. [대한민국 정책브리핑](https://www.korea.kr/etc/newsLetterView.do?newsId=132036166&pageSe=view)의 월 100만 원은 용례 근거이며 별도 규범 답변이라고 주장하지 않는다. [온라인가나다322703](https://korean.go.kr/front/onlineQna/onlineQnaView.do?mn_id=216&pageIndex=1&qna_seq=322703)의 금액 단위 경계와 기존 숫자 규칙을 함께 적용한다.
- 월500~800만원의 범위 기호와 숫자는 그대로 보존하고 두 공백을 한 후보로 제공한다. 그 안의800만원을 별도 중복 후보로 만들지 않는다. 전체 수량과 조사/서술격을 확인하며 긴 식별자, URL/코드, 개인 전체형, 정상 주3일/1월2일을 보호한다. 문서 정답을 변경하지 않았다.

### 개발058–059: 중의 서술격 활용과 동형 명사

- [온라인가나다309052](https://www.korean.go.kr/front/onlineQna/onlineQnaView.do?mn_id=216&pageIndex=1&qna_seq=309052)은 훈련 중인의 경계를 명시한다. 기존 중 규칙은 중인이라는 명사 분석을 먼저 선택해 사용중인 등을 놓쳤다. 명사 분석을 제거하지 않고, 확인된 앞말 뒤에서는 중+이다 활용도 검사하도록 연결했다.
- 058의 추가 시험에서 사용중인거→사용 중인거까지만 제안하는 불완전 복구가 발견됐다. 서술격·조사 자료의 중+인거 분석이 중인 거 경로를 막는 것이 원인이었다. 059는 중인/중일의 명시적 관형형을 기존 의존 명사 규칙으로 보내고, 끝부분 전체는 기존 목록으로 검증한다. 아무 중 문자열을 분리하는 규칙이 아니다.
- 중인/그중/도중/여중의 전체 어휘, 개인 등록형과 코드/URL은 유지한다. 배포 자산과 의존성 추가 없이 공통 형태 분석 경로만 바꿨으며, 개발 표본의 같은 6건을 독립 평가로 세지 않는다.

### 개발060: 활동 명사 뒤 시의 제한된 경계

- [상담 사례6480](https://www.korean.go.kr/front/mcfaq/mcfaqView.do?mcfaq_seq=6480&mn_id=217)은 방문 시를, [9199](https://www.korean.go.kr/front/mcfaq/mcfaqView.do?mcfaq_seq=9199)는 비행 시와 비상시/필요시 등 합성어의 차이를 설명한다. 기존 어휘·활용 인식을 먼저 유지하고 명시적인 활동 앞말 뒤의 시+조사/서술격에 검토 가능한 공백을 제공한다.
- 처음 행위 명사 전체로 확장한 실험은 오산시→오산 시라는 정상 지명 훼손을 만들었다(`/tmp/wonboard-final-060-initial-node.log`). 그 규칙은 채택하지 않았다. 행위 명사와 지명이 겹칠 수 있으므로 사용/이용/구매/예약 등의 자체 제한된 앞말 범위로 줄이고, 오산시·진주시·고양시 및 설치시니 같은 정상 활용을 보호한다.
- 일부 명칭의 부재를 맞춤법 오류로 단정하거나 지명을 공통 사전에 자동 추가하지 않는다. 새 외부 자산/의존성은 없으며 정상 합성어 필요시를 유지한 채 사용시만 바꾸는 실제 편집기 시험을 포함한다. 설치시에는처럼 사전의 용언 동형 분석과 겹치는 범위는 무조건 바꾸지 않는다.

### 개발062: 이름을 뜻하는 접미사 -명 인식

- 실제 Chrome에서 [온라인가나다318651](https://www.korean.go.kr/front/onlineQna/onlineQnaView.do?mn_id=216&pageIndex=1&qna_seq=318651)의 역할명·사용자명·파일명·항목명 질의와 접미사 -명 답변을 읽었다. [우리말샘1808112](https://opendict.korean.go.kr/dictionary/view?sense_no=1808112&viewType=confirm)은 해당 답변이 연결한 접미사 항목이다. 정의를 배포 자산에 복사하지 않았다.
- 기존 적/용 파생 명사 인식에 명을 연결한다. 사전에 있는 명사 기반을 확인하고 조사/복수/서술격은 기존 공통 규칙을 이용한다. 이름을 뜻하는 접미사와 사람 수 단위 명을 혼동하지 않도록 한두명의 공백 후보를 유지한다.
- 아즈휼명처럼 기반을 모르는 표현은 검토 대상으로 남기고 개인 전체어 등록을 허용한다. 파일명은좋아요의 공백과 이웃 됬어요 오류를 숨기지 않는다. 새 외부 사전/의존성/서버를 추가하지 않았다.
- 동일한 pinned MeCab 원본에는 별도 Compound.csv가 없고 발바닥의 합성어 정보는 NNG.csv에 이미 포함되어 있었다. 인공지능/키움증권은 제외한 Wikipedia.csv에만, 북마크는 Group.csv에, 드론은 인명 자료에 있었다. 원문 출처와 정상 표기 용법을 무시하고 이 파일들을 통째로 추가하지 않는다.

### 개발063: -명 일반화 대신 확인된 공통 어휘

- 062의 일반 -명 인식은 파일명 안내6구간 외에도 이재명을 이재+명으로 읽어 이름 안내3구간을 제거했다. Node230·관련 Chrome3개 통과만으로 이 일반화를 채택하지 않았다. 062 동결 예측과 `/tmp/wonboard-name-suffix-diff.json`을 보존했다.
- 063은 적/용 파생 규칙을 원래 범위로 유지하고, 위 공식 답변의 명시적인 어휘7개(파일명·항목명·역할명·사용자명·곡명·작품명·저자명)를 자체 공통 보완 목록에 둔다. 모든 명사+명을 자동으로 승인하거나 사람 이름을 별도 표준어 목록에 추가하지 않는다. 기본 사전·공통 보완·개인 사전의 소유를 유지한다.
- 060 대비 최종 변화는 파일명6구간의 미등록 제거이며, 적격 정상 문장에는5건이 포함된다. 이것을 필수 오류 검출 증가나 독립 평가 정확도로 주장하지 않는다.


## 개발065: 심리 동사와 구 구성의 구분

2026-09-12 국립국어원 [온라인가나다326882](https://korean.go.kr/front/onlineQna/onlineQnaView.do?mn_id=98&pageIndex=1&qna_seq=326882)의 2026-01-28 정정 답변까지 읽었다. 앞선 답변을 정본으로 삼지 않았다. 구 구성인 기분 좋아/나빠 뒤 하다는 띄우고, 어휘화된 싫어하다·아파하다를 구분한다. 구현은 좋아의 명시적 목적어 문맥과 검증된 활용형으로 제한한다. 외부 답변·사전 정의를 배포 데이터에 복사하지 않았으며 자체 규칙과 출처 링크만 기록한다.


## 개발066: 아무 데나의 철자와 경계

2026-09-12 [국립국어원 온라인가나다306886](https://www.korean.go.kr/front/onlineQna/onlineQnaView.do?mn_id=216&pageIndex=1&qna_seq=306886)의 답변을 확인했다. 장소를 뜻하는 데의 표기와 앞 관형사와의 띄어쓰기를 자체 규칙으로 반영한다. 아무대나 완전형을 대상으로 하며 이름 내부 대/데를 일반 치환하지 않는다. 원문이나 사전 정의를 배포 자산으로 복사하지 않았다.


## 개발067–068: 보조 용언의 내부 표기와 앞말 경계

2026-09-12 [국립국어원 온라인가나다330968](https://www.korean.go.kr/front/onlineQna/onlineQnaView.do?mn_id=216&pageIndex=1&qna_seq=330968&searchCondition=&searchKeyword=)와 앞서 확인한 제47항 출처를 대조했다. 의존 명사에 하다가 결합한 보조 용언의 내부와 앞 본용언의 경계는 다르며, 허용되는 붙임을 오류로 만들지 않는다. 반복 구 올 듯 말 듯 하다는 별도로 보존한다. 이야기해와 같은 긴 파생 본용언 뒤 보다는 분리하는 기존 규칙에 연결한다. 외부 설명·정의를 배포 자산에 복사하지 않았다.


## 개발069–070: 행위 어휘와 기술적 붙임 분석의 한계

2026-09-12 국립국어원 [2023 국어 기초어휘 선정 및 어휘 등급화 연구](https://www.korean.go.kr/common/download.do?c_file_name=727b01c9-8bfd-4c7c-ba3d-a4d69c7dbc5c.pdf&file_path=reportData&o_file_name=2023%EB%85%84+%EA%B5%AD%EC%96%B4+%EA%B8%B0%EC%B4%88%EC%96%B4%ED%9C%98+%EC%84%A0%EC%A0%95+%EB%B0%8F+%EC%96%B4%ED%9C%98+%EB%93%B1%EA%B8%89%ED%99%94+%EC%97%B0%EA%B5%AC_%EC%B5%9C%EC%A2%85%EB%B3%B4%EA%B3%A0%EC%84%9C_20240712.pdf) 인쇄162쪽/PDF171쪽의 구동하다를 원문 이미지로 확인했다. 웹 열기는11,842,561바이트 용량으로 실패했으며 로컬에서 pypdf/pypdfium2로 읽었다. 단일 표제어를 확인해 자체 공통 어휘에 구동을 추가했으며 보고서 어휘 목록·정의는 배포하지 않는다.

[온라인가나다329126](https://www.korean.go.kr/front/onlineQna/onlineQnaView.do?mn_id=216&pageIndex=12&qna_seq=329126)의2026-04-09 답변은 필요 없다와 혼자 있다의 공백을 명시한다. 단어 전체가 기술적 원자료에 있다고 표준적인 붙임으로 인정하지 않는다. 개인 등록·다른 합성어·미확인 꼬리는 보존한다.


## 개발071–073: 수량 뒤 독립 단어와 접미사, 초성 약어의 조사

단어별 공백과 조사 붙임이라는 기존 규칙을 백분율 뒤의 검증된 단어에 적용한다. 백분율 기호 자체의 표기 규정을 새로 정하지 않는다. 071에서 발견한 접미사 오제안은072에서 제거했다. 국립국어원 [2022 개정 공공언어 바로 쓰기](https://www.korean.go.kr/common/download.do?c_file_name=f595077c-82b4-42a5-8ab6-0c31fef547ff.pdf&file_path=etcData&o_file_name=%28%EA%B0%9C%EC%A0%95%ED%8C%90%29+%ED%95%9C%EB%88%88%EC%97%90+%EC%95%8C%EC%95%84%EB%B3%B4%EB%8A%94+%EA%B3%B5%EA%B3%B5%EC%96%B8%EC%96%B4+%EB%B0%94%EB%A1%9C+%EC%93%B0%EA%B8%B0%28%EC%9B%B9%EC%9A%A9%29+.pdf) PDF28쪽에서 가량이 접미사이므로 붙는다는 설명과 수량 뒤 용례를 로컬 원문으로 확인했다. 웹 원문 열기는 타임아웃됐지만 동일 파일 식별자의 PDF를 정상 수신해 읽었다. 문서 원문은 배포하지 않는다.

초성 약어 뒤 조사는 약어 자체의 표준어 승인과 별개로 검토한다. 제41항의 조사 붙임을 적용한 후보이며 약어의 의미·확장형을 추정하지 않는다. 개인 등록 후에도 공백 후보와 이웃 오류는 독립적으로 남는다.


## 개발074–075: 서술격 관형형과 종결 어미 보존

[국립국어원 온라인가나다320239](https://www.korean.go.kr/front/onlineQna/onlineQnaView.do?mn_id=73&pageIndex=1&qna_seq=320239)의2025-09-04 답변을 실제 Chrome에서 읽었다. 문장 종결의 -인걸과 인 것을 줄인 인 걸은 문맥에 따라 다르므로 붙은 전체형을 무조건 분리하지 않는다. 웹 열기는 타임아웃됐지만 Chrome 원문은 정상 열렸다. 인 거/인 것 경계는 기존 제42항 의존 명사 규칙에 연결하며 개인 등록어에도 같은 규칙을 사용한다. 외부 정의나 답변 원문은 배포 자료에 복사하지 않았다.


## 개발109: 스펀지·뒤통수 표기

국립국어원 [새국어소식 2002년12월호](https://www.korean.go.kr/nkview/nknews/200212/53_15.html)의 스폰지→스펀지 설명과 [한국어기초사전 뒤통수 표제어](https://krdict.korean.go.kr/eng/dicSearch/SearchView?ParaWordNo=67061)를 확인했다. 두 표기를 자체 철자 규칙으로 연결하며 기존 조사·서술격 검증을 재사용한다. 외부 사전의 정의·용례·목록은 배포 자산에 복사하지 않았다.


## 개발110: 마찬가지

Chrome으로 [한국어기초사전 마찬가지 표제어28814](https://krdict.korean.go.kr/kor/dicSearch/SearchView?ParaWordNo=28814)를 직접 확인했다. 검색 엔진은 결과가 없었지만 사이트 자체 검색과 상세 화면은 정상 동작했다. 자체 철자 쌍만 기존 명사 보완 경로에 연결하며 사전 정의·용례는 배포하지 않는다.


## 개발111: 계절과 한철

Chrome으로 [한국어기초사전 한철 표제어89054](https://krdict.korean.go.kr/kor/dicSearch/SearchView?ParaWordNo=89054)를 확인했다. 한철이 전체 명사이고 계절 뒤 별도 단어로 쓰이는 근거를 확인해 네 계절 뒤 한철의 경계를 제안한다. 사전 용례 문장을 배포 자산에 복사하지 않았으며 합성어 여름철 등은 보존한다.


## 개발112–113: 서술격 뒤 강조 보조 용언

[국립국어원 온라인가나다304402](https://www.korean.go.kr/front/onlineQna/onlineQnaView.do?mn_id=216&qna_seq=304402)에 인용된 하다의 보조 동사·보조 형용사 용법을 확인했다. 용언 및 이다 뒤 -기는/-기도/-기나 하다 구성을 기존 보조 용언 경계로 연결한다. 정의·용례를 배포 자산에 복사하지 않았다. 단어 내부 긴과 혼동하지 않도록113에서 전체 활용 보호를 추가했다.


## 개발114: -(으)ㄹ수록

국립국어원 [한국어 교육 자료, 제14과](https://www.korean.go.kr/common/download.do?book_seq=284&c_file_name=422cb2da-bab2-4e51-b9c1-85ebf185e61b_0.pdf&downGubun=bookDataView&file_path=bookData&o_file_name=%ED%95%9C%EA%B5%AD%EC%96%B4%EC%A7%84%ED%9D%A5-02-7.pdf) 인쇄157쪽의 -(으)ㄹ수록 문법 항목을 확인했다. 기존 활용 분석으로 전체 형태와 어근을 검증해 내부 공백만 제거한다. 수 있다 구문을 같은 어미로 취급하지 않는다. 문서 정의·용례는 배포하지 않는다.


## 개발115–116: 개기다와 -지 말다

국립국어원 [새국어생활2015년 봄호](https://www.korean.go.kr/nkview/nklife/2015_1/25_0110.pdf)의 별도 표준어 인정 표에서 개기다를 확인했다. [온라인가나다331674](https://www.korean.go.kr/front/onlineQna/onlineQnaView.do?mn_id=&pageIndex=1&qna_seq=331674&searchCondition=&searchKeyword=)는 -지 마라의 분리만 허용됨을 설명한다. 자체 동사 어간 한 개와 기존 부정 보조 용언 경계를 연결하며 외부 어휘 목록·정의·예문은 배포하지 않는다. 못지않다·머지않다의 전체 활용을 부정 구문으로 재분리하지 않도록116에서 확장 형용사 자료의 인식을 보존했다.


## 개발117–118: 파생 명사와 모음 뒤 과거 서술격

실제 Chrome에서 [330611](https://www.korean.go.kr/front/onlineQna/onlineQnaView.do?mn_id=216&pageIndex=1&qna_seq=330611)과 [328164](https://www.korean.go.kr/front/onlineQna/onlineQnaView.do?mn_id=216&pageIndex=1&qna_seq=328164)의 답변을 확인했다. 전자는 이다 뒤 이었-, 후자는 체언 뒤 이-와 -었-의 축약을 설명한다. 이전325583은 물건을 머리에 이는 동사 이다에 대한 답변이므로 서술격의 직접 근거 링크를328164로 고쳤다. 명사 끝 이와 용언 동형 부분은 보호하며 자료 원문은 배포 자산에 복사하지 않는다.


## 개발119–120: 기존 문법 경계의 조합과 되어/돼 축약

119는 앞서 확인한 제42항 의존 명사 경계와 제47항 보조 용언 경계를 조합한다.120은 기존 제35항 붙임2의 되어/돼 축약을 완전한 되다 활용 뒤의 요까지 적용한다. 안되다/안 되다의 뜻 차이는 기존 정책대로 두 후보와 문맥 검토를 유지한다. 확장 형태 자료는 철자 후보의 완성된 활용만 검증하고 임의 조각 분리에 사용하지 않는다. 새 외부 자료·의존성을 도입하지 않았다.


## 개발121: 관형형 뒤 거/꺼

[국립국어원 FAQ8635](https://www.korean.go.kr/front/mcfaq/mcfaqView.do?mcfaq_seq=8635&mn_id=217&pageIndex=1)는 관형형 뒤 된소리 발음과 의존 명사 거의 표기를 구분한다. [새국어소식2002년8월호](https://www.korean.go.kr/nkview/nknews/200208/49_6.html)도 같은 표기와 공백을 설명한다. 조사/서술격 꼬리와 앞 활용을 검증해 자체 후보를 만들며 외부 정의·예문은 배포하지 않는다. 동사 끄다 활용이나 개인 등록을 일괄 치환하지 않는다.


## 개발122: 치르다·덮이다

[국립국어원 새국어소식2005년6월호](https://www.korean.go.kr/nkview/nknews/200506/83_3.html)는 치르다의 ㅡ 탈락과 치러/치렀- 활용을 설명한다. [2004년12월호](https://m.korean.go.kr/nkview/nknews/200412/77_3.html)는 덮다의 피동형 덮이다 및 덮인/덮여/덮였다 표기를 설명한다. 자체 어간 치환 후 완성된 활용을 검증하고 명사 치루는 치환하지 않는다. 외부 정의·예문·어휘 목록은 배포하지 않는다.


## 개발123: 잘 부사와 전체 어휘 보존

[국립국어원 온라인가나다327438](https://www.korean.go.kr/front/onlineQna/onlineQnaView.do?mn_id=73&pageIndex=1&qna_seq=327438)의 답변에서 잘 부탁드립니다 구성을 확인했다. 독립 부사와 뒤 활용의 경계를 기존 제2항 구현에 연결하되, 사전에 전체 어휘로 인식되는 잘하다·잘못하다 등을 먼저 보호한다. 일반 또는 확장 자료의 전체 인식이 남는 경우 무조건 분리하지 않는다. 원문·용례 목록은 배포하지 않는다.


## 개발125: -어지다 활용 공백

[국립국어원 온라인가나다313649](https://www.korean.go.kr/front/onlineQna/onlineQnaView.do?mn_id=216&qna_seq=313649)와 [334124](https://www.korean.go.kr/front/onlineQna/onlineQnaView.do?mn_id=27&pageIndex=1&qna_seq=334124)는 -아/-어지다 구성의 붙여쓰기를 설명한다. 자체 형태 분석에서 앞 활용과 결합 어근을 확인하고 동형 명사와 한 음절 앞말은 보수적으로 처리한다. 외부 정의·용례·어휘 목록을 배포하지 않는다.


## 개발127: -전과 명사 동형

[한국어기초사전 -전, 88970](https://krdict.korean.go.kr/eng/dicSearch/SearchView?ParaWordNo=88970&nation=eng)에서 전투·전쟁 의미의 접미사 존재를 확인했다. 명사와 서술격 활용이 겹친다는 이유만으로 그 뒤 전을 분리하지 않는다. 모든 명사+전을 정상어로 승인하지 않으며 모르는 전체 표현은 검토와 개인 사전 등록 대상으로 남긴다. 외부 정의·용례 목록을 배포하지 않는다.


## 개발128: 깨닫다와 세팅

[국립국어원326022](https://www.korean.go.kr/front/onlineQna/onlineQnaView.do?mn_id=216&pageIndex=1&qna_seq=326022&searchCondition=&searchKeyword=)는 깨달음과 모음 시작 어미 앞 깨닫다의 불규칙 활용을 설명한다. [312618](https://www.korean.go.kr/front/onlineQna/onlineQnaView.do?mn_id=216&pageIndex=1&qna_seq=312618&searchCondition=&searchKeyword=)는 setting의 세팅 표기를 확인한다. 플라스틱은 기존 배포 명사 자료에 있는 표기이며 [한국어기초사전 탁자49272](https://krdict.korean.go.kr/kor/dicSearch/SearchView?ParaWordNo=49272)의 용례에서도 표기를 확인했다. 자체 오타 쌍과 완성된 활용 검증을 사용하며 외부 정의·용례·목록을 배포하지 않는다.


## 개발129: -겠- 내부 공백

[국립국어원331407](https://www.korean.go.kr/front/onlineQna/onlineQnaView.do?mn_id=90&pageIndex=1&qna_seq=331407)은 -겠-을 어말 어미 앞의 선어말 어미로 설명한다. 자체 형태 분석으로 완성된 활용을 검증한 뒤 내부 공백을 제거한다. 외부 정의·용례는 배포하지 않는다.


## 개발130: 암튼은 미등록 정답으로 요구하지 않음

[한국어기초사전 아무튼14674](https://krdict.korean.go.kr/eng/dicSearch/SearchView?ParaWordNo=14674&nation=eng)는 Short Form 항목에 암튼을 명시한다. 따라서 단지 인터넷에서 자주 쓰이는 준말이라는 이유로 암튼을 미등록 검토 대상으로 만들지 않는다. 기존 개발 판정의 충돌은 비공개 감사 기록에 남겼고 해당 행을 제외한 개발 점수를 별도 산출했다. 저렴이는 자체 검토 분류로 처리하며 맞춤법 오류나 표준어 여부를 단정하는 외부 사전 판정으로 제시하지 않는다. 외부 정의·용례를 배포하지 않는다.


## 개발131: 때문에 오타와 명사 경계

기존 배포 자료의 때문에 구성과 조사/서술격 분석을 사용해 자체 오타 떄문을 교정한다. 기존 독립 명사 경계 규칙과 결합하며 앞말이 명사 또는 개인 등록인지 확인한다. 외부 어휘 목록이나 용례를 추가하지 않았다. 미등록 평가의 범위 차이는 검출 기준을 바꾸는 근거로 삼지 않고 비공개 감사 기록에 남겼다.


## 개발132: -스럽다 파생 형용사

[국립국어원327142](https://www.korean.go.kr/front/onlineQna/onlineQnaView.do?mn_id=&pageIndex=1&qna_seq=327142)는 -스럽다를 형용사 파생 접미사로 설명한다. 기존 기본/확장 형태 분석에서 합친 어근을 검증해 수평 공백만 제거한다. 외부 정의·용례·어휘 목록을 배포하지 않는다.


## 개발133: 온갖 관형사

국립국어원 한국어 교육 어휘 내용 개발4단계 부록(2015-01-46)은 온갖을 관형사로 분류한다. 기존 독립 관형사 경계 규칙에 자체 항목 하나를 연결하고 뒤 명사 분석을 재사용한다. 외부 어휘 목록·용례를 배포하지 않는다.


## 감사134: 되도 않는 구어적 준말

[국립국어원326719](https://www.korean.go.kr/front/onlineQna/onlineQnaView.do?mn_id=216&pageIndex=1&qna_seq=326719)는 되도 않는을 되지도 않는의 구어적 준말로 설명하며 돼도 않는으로 바꾸는 것을 부정한다. 원보드는 이를 문체 정제 대상으로 삼지 않는다. 기존 개발 정답의 되도→돼도 요구는 별도 감사 대상으로 기록했다. 외부 정의·용례는 배포하지 않는다.


## 개발136: 렌터카 / 그제서야의 문맥 구분

[국립국어원 온용어518529](https://kli.korean.go.kr/term/trgtWord/indexTrgtWord.do?trgtWordNo=518529)에서 rent-a-car의 렌터카 표기를 확인했다. 자체 오타 쌍만 기존 후보 경로에 추가하며 외부 정의·목록은 배포하지 않는다. [FAQ9159](https://korean.go.kr/front/mcfaq/mcfaqView.do?mcfaq_seq=9159&mn_id=&pageIndex=3)는 그제야 의미의 그제서야와 그제(그저께)+서야 구성을 구분하므로 그제서야를 일괄 치환하지 않는다.


## 개발138: 공통 컴퓨팅 용어의 명사 인식

[AWS 한국어 공식 문서](https://docs.aws.amazon.com/ko_kr/iot-sitewise/latest/userguide/update-dashboard.html)의 대시보드, [Apple 공식 문서](https://support.apple.com/ko-kr/guide/logicpro-ipad/lpip8a07e838/ipados)의 플러그인, [행정안전부 정책 설명](https://www.korea.kr/news/policyNewsView.do?newsId=148857114)의 웹사이트/플러그인 표기를 확인했다. 일반 용어 사용 근거이며 국립국어원의 규범 판정으로 둔갑시키지 않는다. 자체 표제어3개를 명사 인식 전용 목록에 넣고 외부 정의·용례·목록은 배포하지 않는다.


## 179: 내다 보조 용언과 높이다 활용

- 한글 맞춤법 제47항의 보조 용언 허용 붙임을 기존 형태 분석 경로의 `내다`에도 적용한다. 짧은 본용언 뒤 허용 붙임을 보호하면서 파생 본용언의 필수 경계 검사를 함께 유지한다. 근거: https://www.korean.go.kr/kornorms/m/m_regltn.do (제47항). `읽어내어` 등의 임의 단어 목록 추가가 아니라 기존 보조 용언 인식·경계 두 경로를 일치시킨다.
- 국립국어원 온라인가나다2025-06-17 답변은 `높이다/높여`가 규범 표기임을 확인한다: https://www.korean.go.kr/front/onlineQna/onlineQnaView.do?mn_id=216&qna_seq=316357 . `높히/높혀/높혔/높힌/높힐` 시작 형태를 수정한 뒤 전체 활용 또는 제한된 보조 용언 활용을 검증한다. 사용자 등록과 이름 안의 무관한 문자열은 보존한다.
- 위 자료는 규칙의 근거로 열람했다. 사전·웹 원문을 배포 자산으로 복사하지 않았으며 추가 의존성은 없다.

## 180–181: DC 실제 글 대조와 조건 의도 어미

기존 불필요한 ㄹ 복원 규칙을 -려면에도 적용하되, 실제 ㄹ 어간(살/알/만들/갈)을 먼저 보호하고 후보 전체의 형태 분석을 요구한다. 구할려면을 구할 려면으로 분리하던 후보를 구하려면으로 바로잡았다. 기존 [국립국어원 설명](https://www.korean.go.kr/nkview/news/93/8_1.htm)의 불필요한 ㄹ 구분 원리를 사용한다. 특정 게시판 원문이나 새 사전 자산은 배포 파일에 복사하지 않는다.

Luna 두 역할이 이뻐→예뻐를 필수 수정으로 제안한 것은 [국립국어원 새국어생활 2016년 봄호](https://www.korean.go.kr/nkview/nklife/2016_1/26_01.pdf)의 복수 표준어 표(인쇄196–197쪽)와 모순된다. 이쁘다는 이미 표준어이며 해당 활용을 보존한다. 같은 모델의 여러 역할 합의는 규범 근거나 정답 인증을 대체하지 못한다.

조건 어미의 받침 구별은 [한국어기초사전 -으려면](https://krdict.korean.go.kr/eng/dicSearch/SearchView?ParaWordNo=80312&nation=eng)의 ㄹ 받침 제외 조건과도 대조했다. 직접 페이지 열기는 도구에서 실패했으며 검색 결과의 사전 본문으로 확인했다. 해당 자료의 배포 허가를 의미하지 않으며 배포 자산으로 추가하지 않는다.

## 182: 의존 명사 경계와 조사 형태

기존 제41/42항에 따라 관형사+것/거 및 축약형 경계를 보완했다. 은/는의 받침 조건은 [한국어기초사전 은](https://krdict.korean.go.kr/eng/dicSearch/SearchView?ParaWordNo=86111)과 [는](https://krdict.korean.go.kr/kor/dicSearch/SearchView?ParaWordNo=85847&nation=kor)의 문법 설명으로 대조했다. 알려진 명사와 뒤 서술어가 확인되는 범위에서 주격 형태를 제안하되, 이름/완성 어휘/활용/인가 의문형을 보호한다. 새 외부 배포 자산은 추가하지 않았다. 초기 넓은 적용에서 발생한 화훼이/번인가 오교정은 제한 규칙과 회귀 사례로 방지한다.

## 183: 명사화·파생·표준 준말과 필수 경계

- 명사화한 서술격 활용 뒤 조사와 `뿐` 조사/의존 명사를 [한글 맞춤법 제41·42항](https://www.korean.go.kr/kornorms/m/m_regltn.do)에 맞춰 구별한다. 문자열 조각 두 개가 사전에 있다는 사실을 내부 띄어쓰기의 충분한 근거로 삼지 않는다.
- [온라인가나다306701](https://www.korean.go.kr/front/onlineQna/onlineQnaView.do?mn_id=216&qna_seq=306701)은 추상 명사 뒤 `-받다`의 접미사 결합을 설명한다. 확인한 추상 명사 범위에서 파생 어간을 분석하고, 앞 수식어나 목적격 조사가 있는 별도 명사구는 보호한다. 개인 사전 명사를 자동으로 이 파생 목록에 올리지 않는다.
- [국립국어원 FAQ6412](https://www.korean.go.kr/front/mcfaq/mcfaqView.do?mcfaq_seq=6412&mn_id=62&pageIndex=1)와 [온라인가나다308694](https://www.korean.go.kr/front/onlineQna/onlineQnaView.do?mn_id=216&pageIndex=1&qna_seq=308694)는 `-고프다`가 `-고 싶다`의 표준 준말임을 설명한다. 전체 활용을 확인해 `추천하고픈/읽어보고픈`을 보존한다. 독립된 `픈`으로 쪼개지 않는다.
- [온라인가나다331002](https://korean.go.kr/front/onlineQna/onlineQnaView.do?mn_id=98&pageIndex=1&qna_seq=331002)의 단일어/복합어 구분에 따라 긴 본용언의 글자 수만으로 띄어쓰기를 강제하지 않는다. 다만 [온라인가나다304365](https://www.korean.go.kr/front/onlineQna/onlineQnaView.do?mn_id=216&pageIndex=1&qna_seq=304365)는 파생 동사 `떠먹이다` 뒤 보조 용언의 필수 띄어쓰기를 직접 확인한다. 이번 변경 중 사라진 관련 후보 두 개를 이 근거로 복구했다.
- 새 DC 글에서 Luna 세 역할이 `-짜리`를 의존 명사라고 설명하며 띄우도록 제안했다. [한국어기초사전의 짜리 검색 본문](https://krdict.korean.go.kr/kor/dicMarinerSearch/search?mainSearchWord=%EC%A7%9C)은 이를 접사로 분류한다. 세 역할의 합의도 정답으로 간주하지 않는다. 허용 붙임 `껴줄`의 변경과 의도적인 구어체 변경은 비표준 철자 판정과 별도로 제품 보존 요구 위반으로 기록한다.

위 자료는 규범 근거로 열람했다. 외부 정의·용례·사전 목록을 새 배포 자산으로 복사하거나 의존성을 추가하지 않았다. 전체 품질 판정과 현재 두 사전 payload의 라이선스 정책 검사는 별개다.
