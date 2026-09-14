// Own bounded confusion-word rules. Lexical meanings: spelling-orthography-sources.md.
// These are review suggestions, never a claim of full sentence understanding.
export function communityAction(word,predicate){
  // A reviewed action abbreviation may have a validated 하다 ending.
  // This does not make arbitrary personal nouns productive verb stems.
  const match=word.match(/^(업글)(.+)$/);
  return match&&predicate(match[2])?.root==='하'?match[1]:null;
}
export function communityExpression(text,from,to,personal,sets,predicate){
  const word=text.slice(from,to);
  const right=text.slice(to,to+64).split('\n')[0];
  // A model identifier disambiguates the device nickname from 개다's 갤.
  if(word==='갤'&&!personal.has(word)&&/^[ \u00a0]+(?:S|Z|A)\d+(?=$|[^A-Za-z0-9])/i.test(right))return word;
  // 넘 before a complete adjective may abbreviate 너무. Keep the bare
  // 넘다 stem and ordinary verb uses outside this review-only context.
  if(word==='넘'&&!personal.has(word)){
    const next=right.match(/^[ \u00a0]+([가-힣]+)/)?.[1],tail=next&&predicate(next);
    if(tail&&sets.adjective.has(tail.root))return word;
  }
  // Elongated interjections are intentional-expression candidates, not a
  // sequence of dictionary fragments. Review the complete expression;
  // registration still belongs to the individual user's dictionary.
  if(!personal.has(word)&&/^[으우아어오와악앗헉헐하허흐히후휴호에엥음응]+$/.test(word)&&/([가-힣])\1{3,}/.test(word))return word;
  // Review a possible internet intensifier without inventing a space or
  // approving it as standard. Complete lexical predicates stay intact.
  if(!personal.has(word)&&word.startsWith('개')&&!predicate(word)){
    const tail=predicate(word.slice(1));
    if(tail&&sets.adjective.has(tail.root))return word;
  }
  // Informal politeness after a hortative is reviewable author voice.
  // Keep noun+요 homographs and ordinary 자요 out of this path.
  if(!personal.has(word)&&word.endsWith('자요')){
    const plain=word.slice(0,-1),base=predicate(plain);
    if(base&&base.root!==plain&&!sets.noun.has(plain))return word;
  }
  // 갈축 is a reviewed keyboard abbreviation, not a global standard-word
  // entry. Its 갈다/가다 + 축 fragments must not become an invented fix.
  const match=word.match(/^(질게|모공|비추|컴|업글|저렴이|갈축)(.*)$/);
  if(!match||personal.has(word)||personal.has(match[1]))return null;
  const [,base,tail]=match;
  const copula=tail&&predicate(tail)?.root==='이';
  if(tail&&!sets.josa.has(tail)&&!copula)return null;
  if(base==='질게')return /^[ \u00a0]+(?:게시판|게시글|질문|답변)(?:[가-힣]*)(?=$|[\s.,!?])/u.test(right)?base:null;
  if(base==='모공')return /^[ \u00a0]+(?:게시판|게시글|올라온|올린|올렸|썼|쓴|쓰는)(?:[가-힣]*)(?=$|[\s.,!?])/u.test(right)?base:null;
  // 비추는 is also a complete inflection of 비추다. A nominal copula
  // signals a different use, but an ordinary verb inflection stays intact.
  if(base==='비추'&&!copula&&predicate(word))return null;
  return base;
}
export function contextSuggestion(text,from,to,personal,predicate){
  const word=text.slice(from,to);
  if(personal.has(word)||!['안되고','안되는','안된다','안됩니다','어떻해','현제','현제는','현제의','금새','문안한','낳으세요','낳으면','낳아서','낳았다','낳았어요'].includes(word))return null;
  const left=text.slice(Math.max(0,from-48),from).split('\n').at(-1);
  const right=text.slice(to,to+48).split('\n')[0];
  // Do not interpret quoted spellings or dictionary discussions as assertions.
  if(/["'“‘「『]$/.test(left)||/^["'”’」』]/.test(right))return null;
  const next=right.match(/^[ \u00a0]+([가-힣]+)/)?.[1];
  const suggest=(replacement,reason)=>({suggestions:[replacement],ambiguous:true,reason});
  if(word.startsWith('안되')&&/(?:^|[ \u00a0])거래가[ \u00a0]+$/.test(left)){
    return {...suggest('안 '+word.slice(1),'Context review: when a transaction does not take place, separate negative 안 from 되다; confirm the intended meaning'),type:'spacing'};
  }
  if(word==='어떻해'&&next&&next.startsWith('해야')&&predicate(next)){
    return suggest('어떻게','Context review: 어떻게 modifies the following 해야 predicate; 어떡해 already contains 해');
  }
  if(word.startsWith('현제')&&!personal.has('현제')&&next&&/^(?:직장|상황|상태|사용|이용|진행|근무|접속|위치|시간)(?:$|[가-힣])/.test(next)&&!/(?:賢弟|아우|동생|형제)/.test(left+right)){
    return suggest('현재'+word.slice(2),'Context review: if this means now or the present state, use 현재; confirm the intended meaning');
  }
  if(word==='금새'&&next&&predicate(next)&&!/(?:물건값|가격|시세|값|금새)[가-힣]*[ \u00a0]*$/.test(left)&&! /^(?:모르|알|따지|매기|정하)/.test(next)){
    return suggest('금세','Context review: if this means a short time, use 금세; 금새 can mean a price');
  }
  if(word==='문안한'&&next&&!/(?:께|에게|한테)[ \u00a0]*$/.test(left)&&/^(?:색|색상|옷|디자인|선택|방법|성격|성적|수준|진행|결과)(?:$|[가-힣])/.test(next)){
    return suggest('무난한','Context review: if this describes something without difficulty or unusual features, use 무난한');
  }
  if(word.startsWith('낳')){
    const context=(left+word+right).replace(/`[^`]*`|"[^"]*"|“[^”]*”|‘[^’]*’|https?:\/\/\S+/g,' ');
    const recovery=/(?:^|[^가-힣])(?:감기|몸살|상처|독감|질병|병)(?:가|이|를|을|는|은|도|에|때문|$|[^가-힣])/.test(context);
    if(recovery&&!/(?:아기|아이|새끼|출산|임신|알을|결과를|작품을|성과를|논란을|문제를)/.test(context)){
      const forms={낳으세요:'나으세요',낳으면:'나으면',낳아서:'나아서',낳았다:'나았다',낳았어요:'나았어요'};
      return suggest(forms[word],'Context review: recovery uses 낫다; childbirth or producing results uses 낳다');
    }
  }
  return null;
}
