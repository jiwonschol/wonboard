// Original Wonboard enumeration (MIT), not extracted from another dictionary.
// These forms supplement a word-game list, not a complete grammar or name list.
export function englishBasicForms() {
  const words=new Set(['I','a','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday','January','February','March','April','May','June','July','August','September','October','November','December','API','USB','HTML','CSS','SQL','PDF','URL','Unicode']);
  // AutoHotkey's script identifier, also used in the official Ahk2Exe name:
  // https://github.com/AutoHotkey/Ahk2Exe (name only; no upstream code/data).
  words.add('AHK');
  for(const [subjects,endings] of [
    [['I'],['m','ve','ll','d']],
    [['you','we','they'],['re','ve','ll','d']],
    [['he','she','it'],['s','ll','d']],
    [['that','there','what','who'],['s']],
  ])for(const subject of subjects)for(const ending of endings)words.add(`${subject}'${ending}`);
  for(const word of ["don't","doesn't","didn't","isn't","aren't","wasn't","weren't","haven't","hasn't","hadn't","can't","couldn't","won't","wouldn't","shouldn't","mustn't","needn't","let's"])words.add(word);
  return [...words];
}
