// Own bounded confusion-word rules. Lexical meanings: spelling-orthography-sources.md.
// These are review suggestions, never a claim of full sentence understanding.
export function contextSuggestion(text,from,to,personal,predicate){
  const word=text.slice(from,to);
  if(personal.has(word)||!['금새','문안한','낳으세요','낳으면','낳아서','낳았다','낳았어요'].includes(word))return null;
  const left=text.slice(Math.max(0,from-48),from).split('\n').at(-1);
  const right=text.slice(to,to+48).split('\n')[0];
  // Do not interpret quoted spellings or dictionary discussions as assertions.
  if(/["'“‘「『]$/.test(left)||/^["'”’」』]/.test(right))return null;
  const next=right.match(/^[ \u00a0]+([가-힣]+)/)?.[1];
  const suggest=(replacement,reason)=>({suggestions:[replacement],ambiguous:true,reason});
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
