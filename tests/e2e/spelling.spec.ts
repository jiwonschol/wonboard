import { test, expect } from "./fixtures";

for(const [expression,label,context] of [['으아아아아악','Community expression review'],['셀던','Unrecognized expression'],['스펙','Unrecognized expression','스펙대로'],['저렴이','Community expression review','저렴이로'],['이란전','Unrecognized expression','이란전에서'],['개빠르네요','Community expression review'],['떠들자요','Community expression review'],['개더워요','Community expression review'],['갤','Community expression review','갤 S25 울트라'],['넘','Community expression review','넘 강해서']])test(`personal expression registration persists without hiding a neighboring repair: ${expression}`,async({page})=>{
  await page.goto('/');
  const body=page.getByRole('textbox',{name:'Document body',exact:true});
  await body.fill(`${context??expression}. 됬어요.`);
  const tool=page.getByRole('toolbar',{name:'Writing tools',exact:true}).getByRole('button',{name:'Check spelling',exact:true});
  await tool.click();
  const dialog=page.getByRole('dialog',{name:'Check spelling'});
  await expect(dialog).toContainText(`${label}: ${expression}`);
  const manager=dialog.locator('details').filter({hasText:'Personal dictionary'});
  await manager.locator('summary').click();
  await manager.getByRole('textbox').fill(expression);
  await manager.getByRole('button',{name:'Add to dictionary',exact:true}).click();
  await expect(dialog.getByRole('button',{name:'됐어요',exact:true})).toBeVisible();
  await dialog.getByRole('button',{name:'Change',exact:true}).click();
  await expect(dialog).toContainText('Spelling review complete.');
  await dialog.getByRole('button',{name:'Close',exact:true}).click();
  await body.press('ControlOrMeta+z');await expect(body).toHaveText(`${context??expression}. 됬어요.`);
  await body.press('ControlOrMeta+Shift+z');await expect(body).toHaveText(`${context??expression}. 됐어요.`);
  await expect(page.getByRole('button',{name:'Save draft',exact:true})).toBeDisabled();
  await page.reload();await expect(body).toHaveText(`${context??expression}. 됐어요.`);
  await tool.click();await expect(dialog).toContainText('Spelling review complete.');
  await manager.locator('summary').click();
  await manager.getByRole('button',{name:`Remove ${expression}`,exact:true}).click();
  await expect(dialog).toContainText(`${label}: ${expression}`);
});

for(const sample of [
  {name:'honorific',source:'모험러님께서',target:'모험러 님께서',review:'님께서'},
  {name:'copula dependent',source:'모험러인게',target:'모험러인 게',review:'모험러인게'},
])test(`registering a nickname preserves the separate ${sample.name} repair through save and removal`,async({page})=>{
  await page.goto('/');
  const body=page.getByRole('textbox',{name:'Document body',exact:true});
  await body.fill(sample.source+'. 됬어요.');
  const tool=page.getByRole('toolbar',{name:'Writing tools',exact:true}).getByRole('button',{name:'Check spelling',exact:true});
  await tool.click();
  const dialog=page.getByRole('dialog',{name:'Check spelling'});
  await expect(dialog).toContainText('Unrecognized expression: 모험러');
  const manager=dialog.locator('details').filter({hasText:'Personal dictionary'});
  await manager.locator('summary').click();
  await manager.getByRole('textbox').fill('모험러');
  await manager.getByRole('button',{name:'Add to dictionary',exact:true}).click();
  await expect(dialog).toContainText('Spacing suggestion: '+sample.review);
  await dialog.getByRole('button',{name:'Change',exact:true}).click();
  await expect(dialog.getByRole('button',{name:'됐어요',exact:true})).toBeVisible();
  await dialog.getByRole('button',{name:'Change',exact:true}).click();
  await expect(dialog).toContainText('Spelling review complete.');
  await dialog.getByRole('button',{name:'Close',exact:true}).click();
  await expect(body).toHaveText(sample.target+'. 됐어요.');
  await body.press('ControlOrMeta+z');await body.press('ControlOrMeta+z');
  await expect(body).toHaveText(sample.source+'. 됬어요.');
  await body.press('ControlOrMeta+Shift+z');await body.press('ControlOrMeta+Shift+z');
  await expect(body).toHaveText(sample.target+'. 됐어요.');
  await expect(page.getByRole('button',{name:'Save draft',exact:true})).toBeDisabled();
  await page.reload();await expect(body).toHaveText(sample.target+'. 됐어요.');
  await tool.click();await expect(dialog).toContainText('Spelling review complete.');
  await manager.locator('summary').click();
  await manager.getByRole('button',{name:'Remove 모험러',exact:true}).click();
  await expect(dialog).toContainText('Unrecognized expression: 모험러');
});

test('skipping a community expression retains its copula gap through undo and save',async({page})=>{
  await page.goto('/');
  const body=page.getByRole('textbox',{name:'Document body',exact:true});
  await body.fill('비추 입니다. 됬어요.');
  const tool=page.getByRole('toolbar',{name:'Writing tools',exact:true}).getByRole('button',{name:'Check spelling',exact:true});
  await tool.click();
  const dialog=page.getByRole('dialog',{name:'Check spelling'});
  await expect(dialog).toContainText('Community expression review: 비추');
  await dialog.getByRole('button',{name:'Skip once',exact:true}).click();
  for(const candidate of ['입니다','됐어요']){
    await expect(dialog.getByRole('button',{name:candidate,exact:true})).toBeVisible();
    await dialog.getByRole('button',{name:'Change',exact:true}).click();
  }
  await dialog.getByRole('button',{name:'Close',exact:true}).click();
  await expect(body).toHaveText('비추입니다. 됐어요.');
  for(let i=0;i<2;i++)await body.press('ControlOrMeta+z');
  await expect(body).toHaveText('비추 입니다. 됬어요.');
  for(let i=0;i<2;i++)await body.press('ControlOrMeta+Shift+z');
  await expect(page.getByRole('button',{name:'Save draft',exact:true})).toBeDisabled();
  await page.reload();await expect(body).toHaveText('비추입니다. 됐어요.');
  await tool.click();await expect(dialog).toContainText('Community expression review: 비추');
});

test('direct adnominal repairs survive undo and saved reinspection',async({page,browserName})=>{
  await page.goto('/');
  const body=page.getByRole('textbox',{name:'Document body',exact:true});
  const original='남기는건지. 남기는건데. 남기는것. 쨰려보고. 쨰려봤어요. 쨰려보는. 짜증나게. 짜증났다. 안경 다리를. 아무 것도. 큰문제는. 한사람만을. 두배로. 느끼 실. 먹 으시면. 전세계에. 이말이네요. 그앞에서. 이곳. 그때. 전세금. 도쿄에서. 이탈리아는. 실리콘밸리입니다. 3칸정도면. 3일전입니다. 9월달. 4일날. 산 보다 더 높게. 이녀석 보다 소폭 넓거나. 보다 더 좋은. 영화를 보다. 갖았네요. 푹신축신한. 갖고. 호환될것. 깨달은게. 알아들은. 블로그 에. 제품들 마다. 날 마다. 느낌 이고. 1mm 인데. 짐을 이고. 맟추어 지네요. 추천 드립니다. 깊은 감사 드립니다. 기초 적인. 사이즈별로. 안전 하다는. 비교적 멀쩡 했는데. 냉탕 조차도. 그 마저도. 숙제를 마저 했다. 새 신. 나 시인. 세배를. 큰아버지는. 신나다. 빛나다. 대시보드에서. 플러그인을. 웹사이트입니다. 되도 않는 소리. 됬어요.';
  const corrected='남기는 건지. 남기는 건데. 남기는 것. 째려보고. 째려봤어요. 째려보는. 짜증 나게. 짜증 났다. 안경다리를. 아무것도. 큰 문제는. 한 사람만을. 두 배로. 느끼실. 먹으시면. 전 세계에. 이 말이네요. 그 앞에서. 이곳. 그때. 전세금. 도쿄에서. 이탈리아는. 실리콘밸리입니다. 3칸 정도면. 3일 전입니다. 9월 달. 4일 날. 산보다 더 높게. 이 녀석보다 소폭 넓거나. 보다 더 좋은. 영화를 보다. 가졌네요. 푹신푹신한. 갖고. 호환될 것. 깨달은 게. 알아들은. 블로그에. 제품들마다. 날마다. 느낌이고. 1mm인데. 짐을 이고. 맞추어지네요. 추천드립니다. 깊은 감사 드립니다. 기초적인. 사이즈별로. 안전하다는. 비교적 멀쩡했는데. 냉탕조차도. 그마저도. 숙제를 마저 했다. 새 신. 나 시인. 세배를. 큰아버지는. 신나다. 빛나다. 대시보드에서. 플러그인을. 웹사이트입니다. 되도 않는 소리. 됐어요.';
  await body.fill(original);
  const tool=page.getByRole('toolbar',{name:'Writing tools',exact:true}).getByRole('button',{name:'Check spelling',exact:true});
  await tool.click();
  const dialog=page.getByRole('dialog',{name:'Check spelling'});
  for(const candidate of ['남기는 건지','남기는 건데','남기는 것','째려보고','째려봤어요','째려보는','짜증 나게','짜증 났다','안경다리를','아무것도','큰 문제는','한 사람만을','두 배로','느끼실','먹으시면','전 세계에','이 말이네요','그 앞에서','3칸 정도면','3일 전입니다','9월 달','4일 날','산보다','이 녀석보다','가졌네요','푹신푹신한','호환될 것','깨달은 게','블로그에','제품들마다','날마다','느낌이고','인데','맞추어지네요','추천드립니다','기초적인','안전하다는','멀쩡했는데','냉탕조차도','그마저도','됐어요']){
    await expect(dialog.getByRole('button',{name:candidate,exact:true})).toBeVisible();
    if(candidate==='남기는 건지')await page.screenshot({path:`test-results/wonboard-direct-adnominal-${browserName}.png`});
    await dialog.getByRole('button',{name:'Change',exact:true}).click();
  }
  await expect(dialog).toContainText('Spelling review complete.');
  await dialog.getByRole('button',{name:'Close',exact:true}).click();
  await expect(body).toHaveText(corrected);
  for(let i=0;i<41;i++)await body.press('ControlOrMeta+z');
  await expect(body).toHaveText(original);
  for(let i=0;i<41;i++)await body.press('ControlOrMeta+Shift+z');
  await expect(body).toHaveText(corrected);
  await expect(page.getByRole('button',{name:'Save draft',exact:true})).toBeDisabled();
  await page.reload();await expect(body).toHaveText(corrected);
  await tool.click();await expect(dialog).toContainText('Spelling review complete.');
});

test('attested delivery derivation remains normal through neighboring correction and save',async({page,browserName})=>{
  await page.goto('/');
  const body=page.getByRole('textbox',{name:'Document body',exact:true});
  await body.fill('배송됩니다. 됬어요.');
  const tool=page.getByRole('toolbar',{name:'Writing tools',exact:true}).getByRole('button',{name:'Check spelling',exact:true});
  await tool.click();
  const dialog=page.getByRole('dialog',{name:'Check spelling'});
  await expect(dialog.getByRole('button',{name:'배송 됩니다',exact:true})).toHaveCount(0);
  await page.screenshot({path:`test-results/wonboard-derivational-review-${browserName}.png`});
  await expect(dialog.getByRole('button',{name:'됐어요',exact:true})).toBeVisible();
  await dialog.getByRole('button',{name:'Change',exact:true}).click();
  await expect(dialog).toContainText('Spelling review complete.');
  await dialog.getByRole('button',{name:'Close',exact:true}).click();
  await expect(body).toHaveText('배송됩니다. 됐어요.');
  await body.press('ControlOrMeta+z');await expect(body).toHaveText('배송됩니다. 됬어요.');
  await body.press('ControlOrMeta+Shift+z');await expect(body).toHaveText('배송됩니다. 됐어요.');
  await expect(page.getByRole('button',{name:'Save draft',exact:true})).toBeDisabled();
  await page.reload();await expect(body).toHaveText('배송됩니다. 됐어요.');
  await tool.click();await expect(dialog).toContainText('Spelling review complete.');
});

test('polite Korean endings and nominal boundaries survive correction undo and saved reinspection',async({page,browserName})=>{
  await page.goto('/');
  const body=page.getByRole('textbox',{name:'Document body',exact:true});
  await body.fill('않았지만요. 먹어야죠. 제가 하고. 계속 했네요. 기능인 만큼. 결론지었습니다. 쏟아부은. 더해지니. 좋아한다면서. 좋다길래. 그러자니. 아침이었던 만큼. 뛰어나서가. 좋아서가. 긴바지를. 배송지에서. 특별전이었던 만큼. 재정의합니다. 재분석을. 얼리버드로. 좋아요도. 싫어요를. 않아서인데. 먹어서입니다. 좋아서이다. 더워요. 추워요. 어려워요. 도와요. 고와요. 더우세요. 잡아요. 좁아요. 됬어요.');
  const tool=page.getByRole('toolbar',{name:'Writing tools',exact:true}).getByRole('button',{name:'Check spelling',exact:true});
  await tool.click();
  const dialog=page.getByRole('dialog',{name:'Check spelling'});
  await expect(dialog.getByRole('button',{name:'됐어요',exact:true})).toBeVisible();
  await expect(dialog).not.toContainText('않았지 만요');
  await expect(dialog.getByRole('button',{name:'먹어야지',exact:true})).toHaveCount(0);
  await page.screenshot({path:`test-results/wonboard-quoted-adnominal-preservation-${browserName}.png`});
  await dialog.getByRole('button',{name:'Change',exact:true}).click();
  await expect(dialog).toContainText('Spelling review complete.');
  await dialog.getByRole('button',{name:'Close',exact:true}).click();
  await expect(body).toHaveText('않았지만요. 먹어야죠. 제가 하고. 계속 했네요. 기능인 만큼. 결론지었습니다. 쏟아부은. 더해지니. 좋아한다면서. 좋다길래. 그러자니. 아침이었던 만큼. 뛰어나서가. 좋아서가. 긴바지를. 배송지에서. 특별전이었던 만큼. 재정의합니다. 재분석을. 얼리버드로. 좋아요도. 싫어요를. 않아서인데. 먹어서입니다. 좋아서이다. 더워요. 추워요. 어려워요. 도와요. 고와요. 더우세요. 잡아요. 좁아요. 됐어요.');
  await body.press('ControlOrMeta+z');
  await expect(body).toHaveText('않았지만요. 먹어야죠. 제가 하고. 계속 했네요. 기능인 만큼. 결론지었습니다. 쏟아부은. 더해지니. 좋아한다면서. 좋다길래. 그러자니. 아침이었던 만큼. 뛰어나서가. 좋아서가. 긴바지를. 배송지에서. 특별전이었던 만큼. 재정의합니다. 재분석을. 얼리버드로. 좋아요도. 싫어요를. 않아서인데. 먹어서입니다. 좋아서이다. 더워요. 추워요. 어려워요. 도와요. 고와요. 더우세요. 잡아요. 좁아요. 됬어요.');
  await body.press('ControlOrMeta+Shift+z');
  await expect(body).toHaveText('않았지만요. 먹어야죠. 제가 하고. 계속 했네요. 기능인 만큼. 결론지었습니다. 쏟아부은. 더해지니. 좋아한다면서. 좋다길래. 그러자니. 아침이었던 만큼. 뛰어나서가. 좋아서가. 긴바지를. 배송지에서. 특별전이었던 만큼. 재정의합니다. 재분석을. 얼리버드로. 좋아요도. 싫어요를. 않아서인데. 먹어서입니다. 좋아서이다. 더워요. 추워요. 어려워요. 도와요. 고와요. 더우세요. 잡아요. 좁아요. 됐어요.');
  await expect(page.getByRole('button',{name:'Save draft',exact:true})).toBeDisabled();
  await page.reload();await expect(body).toHaveText('않았지만요. 먹어야죠. 제가 하고. 계속 했네요. 기능인 만큼. 결론지었습니다. 쏟아부은. 더해지니. 좋아한다면서. 좋다길래. 그러자니. 아침이었던 만큼. 뛰어나서가. 좋아서가. 긴바지를. 배송지에서. 특별전이었던 만큼. 재정의합니다. 재분석을. 얼리버드로. 좋아요도. 싫어요를. 않아서인데. 먹어서입니다. 좋아서이다. 더워요. 추워요. 어려워요. 도와요. 고와요. 더우세요. 잡아요. 좁아요. 됐어요.');
  await tool.click();await expect(dialog).toContainText('Spelling review complete.');
});

test('registering a base name enables its copula boundary without hiding neighboring errors',async({page,browserName})=>{
  await page.goto('/');
  const body=page.getByRole('textbox',{name:'Document body',exact:true});
  await body.fill('아즈휼인거죠. 됬어요.');
  const tool=page.getByRole('toolbar',{name:'Writing tools',exact:true}).getByRole('button',{name:'Check spelling',exact:true});
  await tool.click();
  const dialog=page.getByRole('dialog',{name:'Check spelling'});
  await expect(dialog).toContainText('Unrecognized expression: 아즈휼인거죠');
  const manager=dialog.locator('details').filter({hasText:'Personal dictionary'});
  await manager.locator('summary').click();
  await manager.getByRole('textbox').fill('아즈휼');
  await manager.getByRole('button',{name:'Add to dictionary',exact:true}).click();
  for(const candidate of ['아즈휼인 거죠','됐어요']){
    await expect(dialog.getByRole('button',{name:candidate,exact:true})).toBeVisible();
    if(candidate==='아즈휼인 거죠')await page.screenshot({path:`test-results/wonboard-personal-copula-boundary-${browserName}.png`});
    await dialog.getByRole('button',{name:'Change',exact:true}).click();
  }
  await expect(dialog).toContainText('Spelling review complete.');
  await dialog.getByRole('button',{name:'Close',exact:true}).click();
  await expect(body).toHaveText('아즈휼인 거죠. 됐어요.');
  await body.press('ControlOrMeta+z');await body.press('ControlOrMeta+z');
  await expect(body).toHaveText('아즈휼인거죠. 됬어요.');
  await body.press('ControlOrMeta+Shift+z');await body.press('ControlOrMeta+Shift+z');
  await expect(body).toHaveText('아즈휼인 거죠. 됐어요.');
  await expect(page.getByRole('button',{name:'Save draft',exact:true})).toBeDisabled();
  await page.reload();await expect(body).toHaveText('아즈휼인 거죠. 됐어요.');
  await tool.click();await expect(dialog).toContainText('Spelling review complete.');
  await manager.locator('summary').click();
  await expect(manager.getByRole('button',{name:'Remove 아즈휼',exact:true})).toBeVisible();
});

test('registering a jamo name retains its particle repair and persists after reload',async({page,browserName})=>{
  await page.goto('/');
  const body=page.getByRole('textbox',{name:'Document body',exact:true});
  await body.fill('ㅁㅈㅌㄹㅇ 를 됬어요.');
  const tool=page.getByRole('toolbar',{name:'Writing tools',exact:true}).getByRole('button',{name:'Check spelling',exact:true});
  await tool.click();
  const dialog=page.getByRole('dialog',{name:'Check spelling'});
  await expect(dialog).toContainText('Unrecognized expression: ㅁㅈㅌㄹㅇ');
  await dialog.getByRole('button',{name:'Add to dictionary',exact:true}).first().click();
  for(const candidate of ['를','됐어요']){
    await expect(dialog.getByRole('button',{name:candidate,exact:true})).toBeVisible();
    if(candidate==='를')await page.screenshot({path:`test-results/wonboard-jamo-dictionary-particle-${browserName}.png`});
    await dialog.getByRole('button',{name:'Change',exact:true}).click();
  }
  await expect(dialog).toContainText('Spelling review complete.');
  await dialog.getByRole('button',{name:'Close',exact:true}).click();
  await expect(body).toHaveText('ㅁㅈㅌㄹㅇ를 됐어요.');
  await body.press('ControlOrMeta+z');await body.press('ControlOrMeta+z');
  await expect(body).toHaveText('ㅁㅈㅌㄹㅇ 를 됬어요.');
  await body.press('ControlOrMeta+Shift+z');await body.press('ControlOrMeta+Shift+z');
  await expect(body).toHaveText('ㅁㅈㅌㄹㅇ를 됐어요.');
  await expect(page.getByRole('button',{name:'Save draft',exact:true})).toBeDisabled();
  await page.reload();await expect(body).toHaveText('ㅁㅈㅌㄹㅇ를 됐어요.');
  await tool.click();await expect(dialog).toContainText('Spelling review complete.');
  const manager=dialog.locator('details').filter({hasText:'Personal dictionary'});
  await manager.locator('summary').click();
  await expect(manager.getByRole('button',{name:'Remove ㅁㅈㅌㄹㅇ',exact:true})).toBeVisible();
});

test('repaired Latin particle keeps the following derivational repair through save and undo',async({page,browserName})=>{
  await page.goto('/');
  const body=page.getByRole('textbox',{name:'Document body',exact:true});
  await body.fill('CPU 를 테스트 합니다.');
  await page.getByRole('toolbar',{name:'Writing tools',exact:true}).getByRole('button',{name:'Check spelling',exact:true}).click();
  const dialog=page.getByRole('dialog',{name:'Check spelling'});
  for(const candidate of ['를','테스트합니다']){
    await expect(dialog.getByRole('button',{name:candidate,exact:true})).toBeVisible();
    await dialog.getByRole('button',{name:candidate,exact:true}).click();
    await page.screenshot({path:`test-results/wonboard-particle-derivation-${candidate}-${browserName}.png`});
    await dialog.getByRole('button',{name:'Change',exact:true}).click();
  }
  await expect(dialog).toContainText('Spelling review complete.');
  await dialog.getByRole('button',{name:'Close',exact:true}).click();
  await expect(body).toHaveText('CPU를 테스트합니다.');
  await body.press('ControlOrMeta+z');
  await body.press('ControlOrMeta+z');
  await expect(body).toHaveText('CPU 를 테스트 합니다.');
  await body.press('ControlOrMeta+Shift+z');
  await body.press('ControlOrMeta+Shift+z');
  await expect(body).toHaveText('CPU를 테스트합니다.');
  await expect(page.getByRole('button',{name:'Save draft',exact:true})).toBeDisabled();
  await page.reload();
  await expect(body).toHaveText('CPU를 테스트합니다.');
});

test('registering an unknown name preserves the following 측 spacing repair through save and reload',async({page,browserName})=>{
  await page.goto('/');
  const body=page.getByRole('textbox',{name:'Document body',exact:true});
  await body.fill('아즈휼측에서 됬어요.');
  const tool=page.getByRole('toolbar',{name:'Writing tools',exact:true}).getByRole('button',{name:'Check spelling',exact:true});
  await tool.click();
  const dialog=page.getByRole('dialog',{name:'Check spelling'});
  await expect(dialog).toContainText('Unrecognized expression: 아즈휼');
  const manager=dialog.locator('details').filter({hasText:'Personal dictionary'});
  await manager.locator('summary').click();
  await manager.getByRole('textbox').fill('아즈휼');
  await manager.getByRole('button',{name:'Add to dictionary',exact:true}).click();
  await expect(dialog.getByRole('textbox',{name:'Replace with',exact:true})).toHaveValue(' 측에서');
  await page.screenshot({path:`test-results/wonboard-name-side-spacing-${browserName}.png`});
  await dialog.getByRole('button',{name:'Change',exact:true}).click();
  await expect(dialog.getByRole('button',{name:'됐어요',exact:true})).toBeVisible();
  await dialog.getByRole('button',{name:'Change',exact:true}).click();
  await expect(dialog).toContainText('Spelling review complete.');
  await dialog.getByRole('button',{name:'Close',exact:true}).click();
  await expect(body).toHaveText('아즈휼 측에서 됐어요.');
  await body.press('ControlOrMeta+z');
  await body.press('ControlOrMeta+z');
  await expect(body).toHaveText('아즈휼측에서 됬어요.');
  await body.press('ControlOrMeta+Shift+z');
  await body.press('ControlOrMeta+Shift+z');
  await expect(body).toHaveText('아즈휼 측에서 됐어요.');
  await expect(page.getByRole('button',{name:'Save draft',exact:true})).toBeDisabled();
  await page.reload();
  await expect(body).toHaveText('아즈휼 측에서 됐어요.');
  await tool.click();
  await expect(dialog).toContainText('Spelling review complete.');
  await manager.locator('summary').click();
  await manager.getByRole('button',{name:'Remove 아즈휼',exact:true}).click();
  await expect(dialog).toContainText('Unrecognized expression: 아즈휼');
});

for (const mark of ["code", "link"] as const) {
test(`particle correction preserves actual ${mark} content through undo and saved reload`, async ({ page, browserName }) => {
  await page.addInitScript(() => localStorage.setItem("wonboard-locale", "ko"));
  await page.goto("/");
  const body = page.locator('[contenteditable="true"]').first();
  await body.focus();
  await body.evaluate((node, kind) => {
    const transfer = new DataTransfer();
    const protectedHtml = kind === "code" ? "<code>아즈휼</code>" : '<a href="https://example.com/path?source=proofread">아즈휼</a>';
    transfer.setData("text/html", `<p>${protectedHtml} 에서 됬어요.</p>`);
    transfer.setData("text/plain", "아즈휼 에서 됬어요.");
    node.dispatchEvent(new ClipboardEvent("paste", { bubbles: true, cancelable: true, clipboardData: transfer }));
  }, mark);
  const protectedNode = body.locator(mark === "code" ? "code" : "a");
  await expect(protectedNode).toHaveText("아즈휼");
  await expect(body).toHaveText("아즈휼 에서 됬어요.");
  await page.getByRole("button", { name: "맞춤법 검사", exact: true }).first().click();
  const dialog = page.getByRole("dialog", { name: "맞춤법 검사" });
  await expect(dialog.getByRole("button", { name: "에서", exact: true })).toBeVisible();
  await page.screenshot({ path: `test-results/wonboard-marked-${mark}-particle-${browserName}.png` });
  await dialog.getByRole("button", { name: "바꾸기", exact: true }).click();
  await expect(dialog.getByRole("button", { name: "됐어요", exact: true })).toBeVisible();
  await dialog.getByRole("button", { name: "바꾸기", exact: true }).click();
  await expect(dialog).toContainText("철자 검사를 마쳤습니다.");
  await dialog.getByRole("button", { name: "닫기", exact: true }).click();
  await expect(body).toHaveText("아즈휼에서 됐어요.");
  await body.press("ControlOrMeta+z");
  await expect(body).toHaveText("아즈휼에서 됬어요.");
  await body.press("ControlOrMeta+z");
  await expect(body).toHaveText("아즈휼 에서 됬어요.");
  await body.press("ControlOrMeta+Shift+z");
  await body.press("ControlOrMeta+Shift+z");
  await expect(body).toHaveText("아즈휼에서 됐어요.");
  await expect(protectedNode).toHaveText("아즈휼");
  if (mark === "link") await expect(protectedNode).toHaveAttribute("href", "https://example.com/path?source=proofread");
  await expect(page.getByRole("button", { name: "임시저장", exact: true })).toBeDisabled();
  await page.reload();
  await expect(body).toHaveText("아즈휼에서 됐어요.");
  await expect(protectedNode).toHaveText("아즈휼");
  if (mark === "link") await expect(protectedNode).toHaveAttribute("href", "https://example.com/path?source=proofread");
});
}

test("community review registers a base word and preserves a skipped expression after reload", async ({ page, browserName }) => {
  await page.addInitScript(() => localStorage.setItem("wonboard-locale", "ko"));
  await page.goto("/");
  const body = page.locator('[contenteditable="true"]').first();
  await body.fill("컴으로 작업했어요. 비추입니다. 됬어요.");
  const tool = page.getByRole("button", { name: "맞춤법 검사", exact: true }).first();
  await tool.click();
  const dialog = page.getByRole("dialog", { name: "맞춤법 검사" });
  await expect(dialog).toContainText("인터넷 표현 검토: 컴");
  await expect(dialog).toContainText("맞춤법 오류로 확정하거나 임의로 풀어 쓰지 않습니다.");
  await page.setViewportSize({ width: 390, height: 900 });
  const bounds = await dialog.boundingBox();
  expect(bounds!.x).toBeGreaterThanOrEqual(0);
  expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(390);
  expect(await dialog.evaluate(node => node.scrollWidth <= node.clientWidth)).toBe(true);
  await page.screenshot({ path: `test-results/wonboard-community-review-ko-${browserName}.png` });
  await dialog.getByRole("button", { name: "사용자 사전에 추가", exact: true }).first().click();
  await expect(dialog).toContainText("인터넷 표현 검토: 비추");
  await dialog.getByRole("button", { name: "이번만 건너뛰기", exact: true }).click();
  await expect(dialog.getByRole("button", { name: "됐어요", exact: true })).toBeVisible();
  await dialog.getByRole("button", { name: "바꾸기", exact: true }).click();
  await expect(dialog).toContainText("철자 검사를 마쳤습니다.");
  await dialog.getByRole("button", { name: "닫기", exact: true }).click();
  await expect(body).toHaveText("컴으로 작업했어요. 비추입니다. 됐어요.");
  await expect(page.getByRole("button", { name: "임시저장", exact: true })).toBeDisabled();
  await page.reload();
  await expect(body).toHaveText("컴으로 작업했어요. 비추입니다. 됐어요.");
  // The existing narrow-screen inspector overlays the writing toolbar.
  await page.getByRole("button", { name: "설정", exact: true }).click();
  await tool.click();
  await expect(dialog).toContainText("인터넷 표현 검토: 비추");
  const manager = dialog.locator("details").filter({ hasText: "사용자 사전" }).first();
  await manager.locator("summary").click();
  await expect(manager).toContainText("사용자 사전 (1)");
  await manager.getByRole("button", { name: "컴 삭제", exact: true }).click();
  await expect(dialog).toContainText("인터넷 표현 검토: 컴");
});

test("registering an action abbreviation survives reload and recognizes another valid ending", async ({ page, browserName }) => {
  await page.addInitScript(() => localStorage.setItem("wonboard-locale", "ko"));
  await page.goto("/");
  const body = page.locator('[contenteditable="true"]').first();
  const source = "업글한 기기예요. 됬어요.";
  await body.fill(source);
  const tool = page.getByRole("button", { name: "맞춤법 검사", exact: true }).first();
  await tool.click();
  const dialog = page.getByRole("dialog", { name: "맞춤법 검사" });
  await expect(dialog).toContainText("인터넷 표현 검토: 업글");
  await expect(dialog.getByRole("textbox", { name: "등록할 기본 단어", exact: true }).first()).toHaveValue("업글");
  await page.screenshot({ path: `test-results/wonboard-community-action-ko-${browserName}.png` });
  await dialog.getByRole("button", { name: "사용자 사전에 추가", exact: true }).first().click();
  await expect(dialog.getByRole("button", { name: "됐어요", exact: true })).toBeVisible();
  await dialog.getByRole("button", { name: "바꾸기", exact: true }).click();
  await expect(dialog).toContainText("철자 검사를 마쳤습니다.");
  await dialog.getByRole("button", { name: "닫기", exact: true }).click();
  await body.press("ControlOrMeta+z");
  await expect(body).toHaveText(source);
  await body.press("ControlOrMeta+Shift+z");
  await expect(body).toHaveText("업글한 기기예요. 됐어요.");
  await expect(page.getByRole("button", { name: "임시저장", exact: true })).toBeDisabled();
  await page.reload();
  await expect(body).toHaveText("업글한 기기예요. 됐어요.");
  await body.fill("업글했어요.");
  await tool.click();
  await expect(dialog).toContainText("철자 검사를 마쳤습니다.");
  const manager = dialog.locator("details").filter({ hasText: "사용자 사전" }).first();
  await manager.locator("summary").click();
  await manager.getByRole("button", { name: "업글 삭제", exact: true }).click();
  await expect(dialog).toContainText("인터넷 표현 검토: 업글");
});

for (const config of [{ locale: "ko", width: 1280 }, { locale: "ko", width: 390 }, { locale: "en", width: 1280 }]) {
test(`review keyboard actions ${config.locale} ${config.width}`, async ({ page, browserName }) => {
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  page.on("console", message => { if (message.type() === "error") errors.push(message.text()); });
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.addInitScript(locale => localStorage.setItem("wonboard-locale", locale), config.locale);
  await page.goto("/");
  await expect(page).toHaveTitle(/Wonboard/i);
  const ko = config.locale === "ko";
  const body = page.locator('[contenteditable="true"]').first();
  const source = "오랫만입니다. 6월말에 비트코인은 시장일 뿐이에요. 물가지수가 높습니다.";
  await body.fill(source);
  await page.getByRole("button", { name: ko ? "맞춤법 검사" : "Check spelling", exact: true }).first().click();
  const dialog = page.getByRole("dialog", { name: ko ? "맞춤법 검사" : "Check spelling" });
  const skip = dialog.getByRole("button", { name: ko ? "이번만 건너뛰기" : "Skip once", exact: true });
  const change = dialog.getByRole("button", { name: ko ? "바꾸기" : "Change", exact: true });
  await expect(skip).toBeFocused();
  await page.setViewportSize({ width: config.width, height: 900 });
  await expect(dialog).toContainText("Shift + Enter");
  await expect(dialog.locator('.spelling-actions button')).toHaveCount(3);
  await expect(change.locator('kbd')).toHaveText('Shift + Enter');
  await expect(skip.locator('kbd')).toHaveText('Enter');
  await expect(dialog.getByRole('button', { name: ko ? '같은 표현 모두 건너뛰기' : 'Skip all occurrences', exact: true })).toBeVisible();
  await change.focus();
  await page.keyboard.press("Enter");
  await expect(dialog.getByRole("button", { name: "6월 말에", exact: true })).toBeVisible();
  await expect(body).toHaveText(source);
  await expect(dialog.locator('.spelling-reason')).toContainText(ko ? "월 뒤" : "Calendar month");
  await page.screenshot({ path: `test-results/wonboard-review-actions-${config.locale}-${config.width}-${browserName}.png` });
  const bounds = await dialog.boundingBox();
  expect(bounds!.x).toBeGreaterThanOrEqual(0);
  expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(config.width);
  await skip.press("Shift+Enter");
  await expect(dialog).toContainText(ko ? "철자 검사를 마쳤습니다." : "Spelling review complete.");
  await dialog.getByRole("button", { name: ko ? "닫기" : "Close", exact: true }).click();
  await expect(body).toHaveText(source.replace("6월말에", "6월 말에"));
  await body.press("ControlOrMeta+z");
  await expect(body).toHaveText(source);
  await expect(page.locator('vite-error-overlay')).toHaveCount(0);
  expect(errors).toEqual([]);
});
}

for (const sample of [
  { name: "complete nominal and particle preservation", source: "생생함을 부모님께서도 느끼게 됬어요.", target: "생생함을 부모님께서도 느끼게 됐어요.", suggestion: "됐어요", screenshot: "nominal-particle-preservation" },
  { name: "geographic copula dependent boundary", source: "후지산인게 보여요. 도쿄일 뿐이에요.", target: "후지산인 게 보여요. 도쿄일 뿐이에요.", suggestion: "후지산인 게", screenshot: "geographic-dependent" },
  { name: "approximation suffix boundary", source: "중간 쯤에 있어요. 이맘때쯤이에요.", target: "중간쯤에 있어요. 이맘때쯤이에요.", suggestion: "쯤에", screenshot: "approximation-suffix" },
  { name: "calendar month noun explanation", source: "9월달에 만나요.", target: "9월 달에 만나요.", suggestion: "9월 달에", reason: "날짜 뒤", screenshot: "calendar-month-noun" },
  { name: "calendar day noun explanation", source: "4일날에 만나요.", target: "4일 날에 만나요.", suggestion: "4일 날에", reason: "날짜 뒤", screenshot: "calendar-day-noun" },
  { name: "nested contracted dependent", source: "온거같은 느낌이에요. 갈게.", target: "온 거 같은 느낌이에요. 갈게.", suggestion: "온 거 같은", screenshot: "nested-contracted-dependent" },
  { name: "numeric counting unit copula", source: "30주년이였고 좋았어요.", target: "30주년이었고 좋았어요.", suggestion: "30주년이었고", screenshot: "numeric-counting-copula" },
  { name: "numeric scale copula spacing", source: "8천원이었던 물건이에요.", target: "8천 원이었던 물건이에요.", suggestion: "8천 원이었던", screenshot: "numeric-scale-copula" },
  { name: "quantity suffix spacing", source: "하나씩 두번씩 확인해요.", target: "하나씩 두 번씩 확인해요.", suggestion: "두 번씩", screenshot: "quantity-suffix" },
  { name: "honorific auxiliary spacing", source: "읽어주셔서 감사합니다. 추천해주셔서 감사합니다.", target: "읽어주셔서 감사합니다. 추천해 주셔서 감사합니다.", suggestion: "추천해 주셔서", screenshot: "honorific-auxiliary" },
  { name: "attested reu inflection", source: "배불렀습니다. 됬어요.", target: "배불렀습니다. 됐어요.", suggestion: "됐어요", screenshot: "reu-inflection" },
  { name: "negative ha and lexical mot", source: "못생겼어요. 안해봤습니다.", target: "못생겼어요. 안 해봤습니다.", suggestion: "안 해봤습니다", screenshot: "negative-ha" },
  { name: "quantity suffix attachment", source: "100GB 짜리입니다.", target: "100GB짜리입니다.", suggestion: "짜리입니다", screenshot: "quantity-attachment" },
  { name: "action noun clause boundary", source: "제품을 사서 테스트 하기로 했어요.", target: "제품을 사서 테스트하기로 했어요.", suggestion: "테스트하기로", screenshot: "action-clause" },
  { name: "action noun quoted particle", source: "“Tiny Cloud”를 출시 했습니다.", target: "“Tiny Cloud”를 출시했습니다.", suggestion: "출시했습니다", screenshot: "action-quotation" },
  { name: "contracted past copula boundary", source: "극소수 였습니다.", target: "극소수였습니다.", suggestion: "극소수였습니다", screenshot: "past-copula-gap" },
  { name: "lexical place compound", source: "이 곳에 있어요.", target: "이곳에 있어요.", suggestion: "이곳에", screenshot: "lexical-place" },
  { name: "lexical gap and copula allomorph", source: "거예요. 이 곳예요.", target: "거예요. 이곳이에요.", suggestion: "이곳이에요", screenshot: "lexical-copula" },
  { name: "nominal gap and copula allomorph", source: "학생 예요.", target: "학생이에요.", suggestion: "학생이에요", screenshot: "nominal-copula" },
  { name: "state-change derivation preservation", source: "대형화되고 중독된 됬어요.", target: "대형화되고 중독된 됐어요.", suggestion: "됐어요", screenshot: "state-change-preserved" },
  { name: "coordinated noun phrase preservation", source: "추가 또는 삭제 하다. 안 됩니다. 됬어요.", target: "추가 또는 삭제 하다. 안 됩니다. 됐어요.", suggestion: "됐어요", screenshot: "coordinated-noun-preserved" },
  { name: "state-change suffix boundary", source: "대형화 되고 있어요.", target: "대형화되고 있어요.", suggestion: "대형화되고", screenshot: "state-change-boundary" },
  { name: "verified public proper name preservation", source: "더불어민주당은 됬어요.", target: "더불어민주당은 됐어요.", suggestion: "됐어요", screenshot: "public-name-preserved" },
  { name: "comparison compound preservation", source: "찰떡같은 약속이 됬어요.", target: "찰떡같은 약속이 됐어요.", suggestion: "됐어요", screenshot: "comparison-compound-preserved" },
  { name: "nominal price spelling composition", source: "무료라이센스로 사용해요.", target: "무료 라이선스로 사용해요.", suggestion: "무료 라이선스로", screenshot: "nominal-price-composition" },
  { name: "nominal comparison spelling composition", source: "엑세스같은 기능입니다.", target: "액세스 같은 기능입니다.", suggestion: "액세스 같은", screenshot: "nominal-comparison-composition" },
  { name: "calendar year explanation", source: "2026년초에 만났어요.", target: "2026년 초에 만났어요.", suggestion: "2026년 초에", screenshot: "calendar-year-explanation", reason: "연도 뒤" },
  { name: "frequency count boundary", source: "주2회씩 만나요.", target: "주 2회씩 만나요.", suggestion: "주 2회씩", screenshot: "frequency-count-boundary" },
  { name: "quantity modifier range", source: "월500~800만원입니다.", target: "월 500~800만 원입니다.", suggestion: "월 500~800만 원입니다", screenshot: "quantity-modifier-range" },
  { name: "quantity modifier duration", source: "만4개월입니다.", target: "만 4개월입니다.", suggestion: "만 4개월입니다", screenshot: "quantity-modifier-duration" },
  { name: "dependent middle copula", source: "사용중인 제품입니다.", target: "사용 중인 제품입니다.", suggestion: "사용 중인", screenshot: "dependent-middle-copula" },
  { name: "dependent middle nested", source: "사용중인거 같아요.", target: "사용 중인 거 같아요.", suggestion: "사용 중인 거", screenshot: "dependent-middle-nested" },
  { name: "occasion dependent boundary", source: "필요시 사용시 확인해요.", target: "필요시 사용 시 확인해요.", suggestion: "사용 시", screenshot: "occasion-dependent-boundary" },
  { name: "name suffix recognition", source: "파일명은 됬어요.", target: "파일명은 됐어요.", suggestion: "됐어요", screenshot: "name-suffix-recognition" },
  { name: "duration stage boundary", source: "5 개월차입니다.", target: "5 개월 차입니다.", suggestion: "5 개월 차입니다", screenshot: "duration-stage-boundary" },
  { name: "calendar noun boundary", source: "올해초에 만났어요.", target: "올해 초에 만났어요.", suggestion: "올해 초에", screenshot: "calendar-noun-boundary" },
  { name: "elapsed duration boundary", source: "4개월만에 만났어요.", target: "4개월 만에 만났어요.", suggestion: "4개월 만에", screenshot: "elapsed-duration-boundary" },
  { name: "adnominal noun boundary", source: "큰시설에서 살아요.", target: "큰 시설에서 살아요.", suggestion: "큰 시설에서", screenshot: "adnominal-boundary" },
  { name: "auxiliary past typo route", source: "알게되엇는데요.", target: "알게 되었는데요.", suggestion: "알게 되었는데요", screenshot: "auxiliary-past-route" },
  { name: "auxiliary boundary and spelling composition", source: "녹여줘야되요.", target: "녹여줘야 돼요.", suggestion: "녹여줘야 돼요", screenshot: "auxiliary-composition" },
  { name: "measurement particle allomorph", source: "115cm으로서 기록했어요.", target: "115cm로서 기록했어요.", suggestion: "115cm로서", screenshot: "measurement-particle" },
  { name: "loanword plural and copula repair", source: "컨텐츠들 입니다.", target: "콘텐츠들입니다.", suggestion: "콘텐츠들입니다", screenshot: "loanword-plural-copula" },
  { name: "foreign action noun boundary", source: "필터링 하여 저장했어요.", target: "필터링하여 저장했어요.", suggestion: "필터링하여", screenshot: "foreign-action-boundary" },
  { name: "psychological verb boundary", source: "게임을 정말 좋아 했었고요. 기분 좋아 하다.", target: "게임을 정말 좋아했었고요. 기분 좋아 하다.", suggestion: "좋아했었고요", screenshot: "psychological-verb-boundary" },
  { name: "indefinite place spelling", source: "아무대나 놓아요.", target: "아무 데나 놓아요.", suggestion: "아무 데나", screenshot: "indefinite-place-spelling" },
  { name: "auxiliary deut boundary", source: "학생인 듯 해요. 올 듯 말 듯 하다.", target: "학생인 듯해요. 올 듯 말 듯 하다.", suggestion: "듯해요", screenshot: "auxiliary-deut-boundary" },
  { name: "nominal derivation with auxiliary", source: "이야기 해보고 싶어요.", target: "이야기해 보고 싶어요.", suggestion: "이야기해 보고", screenshot: "nominal-derivation-auxiliary" },
  { name: "verified computing action", source: "구동해보겠다는 이야기입니다. 구동되었어요.", target: "구동해 보겠다는 이야기입니다. 구동되었어요.", suggestion: "구동해 보겠다는", screenshot: "verified-computing-action" },
  { name: "verified existential boundary", source: "필요없습니다. 상관없습니다.", target: "필요 없습니다. 상관없습니다.", suggestion: "필요 없습니다", screenshot: "verified-existential-boundary" },
  { name: "percentage word boundary", source: "0.95%감량. 목표는 50%입니다. 50%가량. 90%짜리.", target: "0.95% 감량. 목표는 50%입니다. 50%가량. 90%짜리.", suggestion: "0.95% 감량", screenshot: "percentage-word-boundary" },
  { name: "nominal copula dependent boundary", source: "상태인거죠. 학생인걸.", target: "상태인 거죠. 학생인걸.", suggestion: "상태인 거죠", screenshot: "nominal-copula-dependent-boundary" },
  { name: "protected span particle", source: "`user_id` 로 찾았어요.", target: "`user_id`로 찾았어요.", suggestion: "로", screenshot: "protected-span-particle" },
  { name: "short adjective boundary", source: "큰거. 필수입니다.", target: "큰 거. 필수입니다.", suggestion: "큰 거", screenshot: "short-adjective-boundary" },
  { name: "copula contraction", source: "무슨소린데. 소린데. 학굔데. 가순데.", target: "무슨 소린데. 소린데. 학굔데. 가순데.", suggestion: "무슨 소린데", screenshot: "copula-contraction" },
  { name: "auxiliary space", source: "갈만 할까요. 시각화합니다. 있다던데.", target: "갈 만할까요. 시각화합니다. 있다던데.", suggestion: "갈 만할까요", screenshot: "manhada" },
  { name: "state quotation", source: "좋는다던데. 먹는다던데. 있다던데.", target: "좋다던데. 먹는다던데. 있다던데.", suggestion: "좋다던데", screenshot: "reported-state" },
  { name: "quoted reason", source: "좋는대서. 나온대서. 고민되네요. 이후로도.", target: "좋대서. 나온대서. 고민되네요. 이후로도.", suggestion: "좋대서", screenshot: "quoted-reason" },
  { name: "combined particle boundary", source: "나올때 까지 기다렸어요. 시장일 뿐이에요.", target: "나올 때까지 기다렸어요. 시장일 뿐이에요.", suggestion: "나올 때까지", screenshot: "combined-particle-boundary" },
  { name: "determiner contraction grammar", source: "모든게 정상입니다. 내가 할게.", target: "모든 게 정상입니다. 내가 할게.", suggestion: "모든 게", screenshot: "determiner-grammar" },
  { name: "prospective contraction grammar", source: "화가 날거 같아요. 나는 갈게.", target: "화가 날 거 같아요. 나는 갈게.", suggestion: "날 거", screenshot: "prospective-grammar" },
  { name: "subject particle grammar", source: "사람가 왔어요. 고양이는 자요.", target: "사람이 왔어요. 고양이는 자요.", suggestion: "사람이", screenshot: "particle-grammar" },
  { name: "nominalized copula grammar", source: "한것임에 동의해요. 사실임을 알아요.", target: "한 것임에 동의해요. 사실임을 알아요.", suggestion: "한 것임에", screenshot: "nominalized-copula-grammar" },
  { name: "abstract passive grammar with desire preservation", source: "교육 받았어요. 추천하고픈 책이에요.", target: "교육받았어요. 추천하고픈 책이에요.", suggestion: "교육받았어요", screenshot: "abstract-passive-grammar" },
  { name: "dependent ppun grammar with particle preservation", source: "할뿐만아니라 이뿐만이 아닙니다.", target: "할 뿐만 아니라 이뿐만이 아닙니다.", suggestion: "할 뿐만 아니라", screenshot: "ppun-grammar" },
  { name: "conditional intention with lexical rieul preservation", source: "구할려면 기다려요. 만들려면 배워요.", target: "구하려면 기다려요. 만들려면 배워요.", suggestion: "구하려면", screenshot: "conditional-intention" },
  { name: "nopi repair with permitted naeda attachment", source: "읽어내어 이해했습니다. 압력을 높혀주면 됩니다.", target: "읽어내어 이해했습니다. 압력을 높여주면 됩니다.", suggestion: "높여주면", screenshot: "nopi-naeda-quality" },
  { name: "existential subject boundary", source: "사과가있어서 좋아요. 여러분 감사합니다.", target: "사과가 있어서 좋아요. 여러분 감사합니다.", suggestion: "사과가 있어서", screenshot: "existential-subject-boundary" },
]) {
test(`Korean review applies ${sample.name} and preserves normal derivation`, async ({ page, browserName }) => {
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  page.on("console", message => { if (message.type() === "error") errors.push(message.text()); });
  await page.addInitScript(() => localStorage.setItem("wonboard-locale", "ko"));
  await page.goto("/");
  await expect(page).toHaveTitle(/Wonboard/i);
  const body = page.locator('[contenteditable="true"]').first();
  const { source, target } = sample;
  await body.fill(source);
  await page.getByRole("button", { name: "맞춤법 검사", exact: true }).first().click();
  const dialog = page.getByRole("dialog", { name: "맞춤법 검사" });
  await expect(dialog.getByRole("button", { name: "이번만 건너뛰기", exact: true })).toBeFocused();
  if (sample.reason) await expect(dialog.locator(".spelling-reason")).toContainText(sample.reason);
  await dialog.getByRole("button", { name: sample.suggestion, exact: true }).click();
  await expect(body).toHaveText(source);
  await page.screenshot({ path: `test-results/wonboard-${sample.screenshot}-ko-${browserName}.png` });
  await dialog.getByRole("button", { name: "바꾸기", exact: true }).click();
  await expect(dialog).toContainText("철자 검사를 마쳤습니다.");
  await dialog.getByRole("button", { name: "닫기", exact: true }).click();
  await expect(body).toHaveText(target);
  await body.press("ControlOrMeta+z");
  await expect(body).toHaveText(source);
  await body.press("ControlOrMeta+Shift+z");
  await expect(body).toHaveText(target);
  await expect(page.getByRole("button", { name: "임시저장", exact: true })).toBeDisabled();
  await page.reload();
  await expect(body).toHaveText(target);
  await expect(page.locator("vite-error-overlay")).toHaveCount(0);
  expect(errors).toEqual([]);
});
}

for (const word of ["제미나이", "유의미하다까진", "연태고량주라고", "위고비나", "위고비군", "바난자와", "이지엉클"]) {
test(`uncertain lexical candidate can be skipped without rewriting ${word}`, async ({ page, browserName }) => {
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  page.on("console", message => { if (message.type() === "error") errors.push(message.text()); });
  await page.goto("/");
  await expect(page).toHaveTitle(/Wonboard/i);
  const body = page.getByRole("textbox", { name: "Document body", exact: true });
  await body.fill(word);
  await page.getByRole("toolbar", { name: "Writing tools", exact: true }).getByRole("button", { name: "Check spelling", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Check spelling" });
  if (["제미나이", "위고비나", "위고비군", "바난자와", "이지엉클"].includes(word)) await expect(dialog).toContainText("No reliable replacement was found.");
  else await expect(dialog.getByRole("button", {
    name: word === "연태고량주라고" ? "연태 고량주라고" : "유의미하다 까진", exact: true,
  })).toHaveCount(0);
  const skip = dialog.getByRole("button", { name: "Skip once", exact: true });
  await expect(skip).toBeFocused();
  await expect(body).toHaveText(word);
  await page.screenshot({ path: `test-results/wonboard-lexical-uncertainty-${word}-${browserName}.png` });
  await skip.click();
  await expect(dialog).toContainText("Spelling review complete.");
  await dialog.getByRole("button", { name: "Close", exact: true }).click();
  await expect(body).toHaveText(word);
  await page.getByRole("toolbar", { name: "Writing tools", exact: true }).getByRole("button", { name: "Check spelling", exact: true }).click();
  await expect(dialog.getByRole("textbox", { name: "Base word to add" })).toHaveValue(word === "제미나이" ? "제미나" : word);
  // The final 이 may be part of the name; let the author choose the base.
  await dialog.getByRole("textbox", { name: "Base word to add" }).fill(word);
  await page.screenshot({ path: `test-results/wonboard-lexical-dictionary-${word}-${browserName}.png` });
  await page.setViewportSize({ width: 390, height: 844 });
  const bounds = await dialog.boundingBox();
  expect(bounds!.x).toBeGreaterThanOrEqual(0);
  expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(390);
  expect(await dialog.evaluate(node => node.scrollWidth <= node.clientWidth)).toBe(true);
  await dialog.getByRole("button", { name: "Add to dictionary", exact: true }).scrollIntoViewIfNeeded();
  await page.screenshot({ path: `test-results/wonboard-lexical-dictionary-mobile-${word}-${browserName}.png` });
  await dialog.getByRole("button", { name: "Add to dictionary", exact: true }).click();
  await expect(dialog).toContainText("Spelling review complete.");
  await dialog.getByRole("button", { name: "Close", exact: true }).click();
  await page.setViewportSize({ width: 1280, height: 720 });
  await expect(page.getByRole("button", { name: "Save draft", exact: true })).toBeDisabled();
  await page.reload();
  await expect(body).toHaveText(word);
  await page.getByRole("toolbar", { name: "Writing tools", exact: true }).getByRole("button", { name: "Check spelling", exact: true }).click();
  await expect(dialog).toContainText("Spelling review complete.");
  await dialog.getByText("Personal dictionary (1)", { exact: true }).click();
  await expect(dialog).toContainText(word);
  await expect(page.locator("vite-error-overlay")).toHaveCount(0);
  expect(errors).toEqual([]);
});
}

test("normal inflection and numeral survive a nearby spelling correction", async ({ page, browserName }) => {
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  page.on("console", message => { if (message.type() === "error") errors.push(message.text()); });
  await page.goto("/");
  await expect(page).toHaveTitle(/Wonboard/i);
  const body = page.getByRole("textbox", { name: "Document body", exact: true });
  const original = "흥미로워서 보고싶어요. 질문 하나 드립니다. 언제부터인가. 쳐내려고. 추천드립니다.";
  await body.fill(original);
  await page.getByRole("toolbar", { name: "Writing tools", exact: true }).getByRole("button", { name: "Check spelling", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Check spelling" });
  await dialog.getByRole("button", { name: "보고 싶어요", exact: true }).click();
  await expect(body).toHaveText(original);
  await dialog.getByRole("button", { name: "Change", exact: true }).click();
  await expect(dialog).toContainText("Spelling review complete.");
  await dialog.getByRole("button", { name: "Close", exact: true }).click();
  await expect(page.getByRole("button", { name: "Save draft", exact: true })).toBeDisabled();
  await page.reload();
  await expect(body).toHaveText("흥미로워서 보고 싶어요. 질문 하나 드립니다. 언제부터인가. 쳐내려고. 추천드립니다.");
  await expect(page.locator("vite-error-overlay")).toHaveCount(0);
  await page.screenshot({ path: `test-results/wonboard-irregular-${browserName}.png` });
  expect(errors).toEqual([]);
});

test("particle typo and noun boundary apply together and survive reload", async ({ page, browserName }) => {
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  page.on("console", message => { if (message.type() === "error") errors.push(message.text()); });
  await page.goto("/");
  await expect(page).toHaveTitle(/Wonboard/i);
  const body = page.getByRole("textbox", { name: "Document body", exact: true });
  await body.fill("상품설명에넌 색상이 달라요.");
  await page.getByRole("toolbar", { name: "Writing tools", exact: true }).getByRole("button", { name: "Check spelling", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Check spelling" });
  await expect(dialog.getByRole("button", { name: "Skip once", exact: true })).toBeFocused();
  await dialog.getByRole("button", { name: "상품 설명에는", exact: true }).click();
  await expect(body).toHaveText("상품설명에넌 색상이 달라요.");
  await page.screenshot({ path: `test-results/wonboard-particle-typo-${browserName}.png` });
  await dialog.getByRole("button", { name: "Change", exact: true }).click();
  await expect(body).toHaveText("상품 설명에는 색상이 달라요.");
  await dialog.getByRole("button", { name: "Close", exact: true }).click();
  await expect(page.getByRole("button", { name: "Save draft", exact: true })).toBeDisabled();
  await page.reload();
  await expect(body).toHaveText("상품 설명에는 색상이 달라요.");
  await expect(page.locator("vite-error-overlay")).toHaveCount(0);
  expect(errors).toEqual([]);
});

test("particle boundary correction applies explicitly and survives reload", async ({ page, browserName }) => {
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  page.on("console", message => { if (message.type() === "error") errors.push(message.text()); });
  await page.goto("/");
  await expect(page).toHaveTitle(/Wonboard/i);
  const body = page.getByRole("textbox", { name: "Document body", exact: true });
  await body.fill("화면에서보이는 색이에요.");
  await page.getByRole("toolbar", { name: "Writing tools", exact: true }).getByRole("button", { name: "Check spelling", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Check spelling" });
  await expect(dialog.getByRole("button", { name: "Skip once", exact: true })).toBeFocused();
  await dialog.getByRole("button", { name: "화면에서 보이는", exact: true }).click();
  await expect(body).toHaveText("화면에서보이는 색이에요.");
  await page.screenshot({ path: `test-results/wonboard-particle-${browserName}.png` });
  await dialog.getByRole("button", { name: "Change", exact: true }).click();
  await expect(dialog).toContainText("Spelling review complete.");
  await dialog.getByRole("button", { name: "Close", exact: true }).click();
  await expect(body).toHaveText("화면에서 보이는 색이에요.");
  await expect(page.getByRole("button", { name: "Save draft", exact: true })).toBeDisabled();
  await page.reload();
  await expect(body).toHaveText("화면에서 보이는 색이에요.");
  await expect(page.locator("vite-error-overlay")).toHaveCount(0);
  expect(errors).toEqual([]);
});

test("adverb and negative spacing apply together without changing compound words", async ({ page, browserName }) => {
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  page.on("console", message => { if (message.type() === "error") errors.push(message.text()); });
  await page.goto("/");
  await expect(page).toHaveTitle(/Wonboard/i);
  const body = page.getByRole("textbox", { name: "Document body", exact: true });
  const original = "잘알려지지않은. 잘생긴. 잘못한.";
  await body.fill(original);
  await page.getByRole("toolbar", { name: "Writing tools", exact: true }).getByRole("button", { name: "Check spelling", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Check spelling" });
  await expect(dialog.getByRole("button", { name: "Skip once", exact: true })).toBeFocused();
  await dialog.getByRole("button", { name: "잘 알려지지 않은", exact: true }).click();
  await expect(dialog).toContainText("The original may be correct in context.");
  await expect(body).toHaveText(original);
  await page.screenshot({ path: `test-results/wonboard-adverb-${browserName}-review.png` });
  await dialog.getByRole("button", { name: "Change", exact: true }).click();
  await expect(dialog).toContainText("Spelling review complete.");
  await dialog.getByRole("button", { name: "Close", exact: true }).click();
  const expected = "잘 알려지지 않은. 잘생긴. 잘못한.";
  await expect(body).toHaveText(expected);
  await expect(page.getByRole("button", { name: "Save draft", exact: true })).toBeDisabled();
  await page.reload();
  await expect(body).toHaveText(expected);
  await expect(page.locator("vite-error-overlay")).toHaveCount(0);
  expect(errors).toEqual([]);
});

test("successive inflection and noun-boundary changes preserve offsets and saved text", async ({ page }) => {
  await page.goto("/");
  const body = page.getByRole("textbox", { name: "Document body", exact: true });
  await body.fill("소설이였으면 찾아볼건데. 고민중입니다. 검색 했다가. 잠궈서 오염되서 해야함.");
  await page.getByRole("toolbar", { name: "Writing tools", exact: true }).getByRole("button", { name: "Check spelling", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Check spelling" });
  for (const suggestion of ["소설이었으면", "찾아볼 건데", "고민 중입니다", "검색했다가", "잠가서", "오염돼서", "해야 함"]) {
    await expect(dialog.getByRole("button", { name: "Skip once", exact: true })).toBeFocused();
    const before = await body.textContent();
    await dialog.getByRole("button", { name: suggestion, exact: true }).click();
    await expect(body).toHaveText(before!);
    await dialog.getByRole("button", { name: "Change", exact: true }).click();
  }
  await expect(dialog).toContainText("Spelling review complete.");
  await dialog.getByRole("button", { name: "Close", exact: true }).click();
  const expected = "소설이었으면 찾아볼 건데. 고민 중입니다. 검색했다가. 잠가서 오염돼서 해야 함.";
  await expect(body).toHaveText(expected);
  await expect(page.getByRole("button", { name: "Save draft", exact: true })).toBeDisabled();
  await page.reload();
  await expect(body).toHaveText(expected);
});

test("skipping a Latin name still allows particle spacing and ending review", async ({ page }) => {
  await page.goto("/");
  const body = page.getByRole("textbox", { name: "Document body", exact: true });
  await body.fill("Imgur 에 좋더라구요 10년넘게");
  await page.getByRole("toolbar", { name: "Writing tools", exact: true }).getByRole("button", { name: "Check spelling", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Check spelling" });
  await expect(dialog).toContainText("Unrecognized expression: Imgur");
  await dialog.getByRole("button", { name: "Skip once", exact: true }).click();
  for (const suggestion of ["에", "좋더라고요", "10년 넘게"]) {
    await expect(dialog.getByRole("button", { name: suggestion, exact: true })).toBeVisible();
    await dialog.getByRole("button", { name: suggestion, exact: true }).click();
    await dialog.getByRole("button", { name: "Change", exact: true }).click();
  }
  await expect(dialog).toContainText("Spelling review complete.");
  await dialog.getByRole("button", { name: "Close", exact: true }).click();
  await expect(body).toHaveText("Imgur에 좋더라고요 10년 넘게");
  await expect(page.getByRole("button", { name: "Save draft", exact: true })).toBeDisabled();
  await page.reload();
  await expect(body).toHaveText("Imgur에 좋더라고요 10년 넘게");
});

test("adverb acronym and ending corrections are explicit and survive reload", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  page.on("console", message => { if (message.type() === "error") errors.push(message.text()); });
  await page.goto("/");
  await expect(page).toHaveTitle(/Wonboard/i);
  const body = page.getByRole("textbox", { name: "Document body", exact: true });
  await body.fill("어짜피 api 감사합니나");
  await page.getByRole("toolbar", { name: "Writing tools", exact: true }).getByRole("button", { name: "Check spelling", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Check spelling" });
  for (const suggestion of ["어차피", "API", "감사합니다"]) {
    await expect(dialog.getByRole("button", { name: "Skip once", exact: true })).toBeFocused();
    const before = await body.textContent();
    await dialog.getByRole("button", { name: suggestion, exact: true }).click();
    await expect(body).toHaveText(before!);
    await dialog.getByRole("button", { name: "Change", exact: true }).click();
  }
  await expect(dialog).toContainText("Spelling review complete.");
  await dialog.getByRole("button", { name: "Close", exact: true }).click();
  await expect(body).toHaveText("어차피 API 감사합니다");
  await expect(page.getByRole("button", { name: "Save draft", exact: true })).toBeDisabled();
  await page.reload();
  await expect(body).toHaveText("어차피 API 감사합니다");
  await expect(page.locator("vite-error-overlay")).toHaveCount(0);
  await page.screenshot({ path: "test-results/wonboard-spelling-ending-applied.png" });
  expect(errors).toEqual([]);
});

test("combined spacing corrections preserve normal endings through save and reload", async ({ page }) => {
  await page.goto("/");
  const body = page.getByRole("textbox", { name: "Document body", exact: true });
  await body.fill("이런게 세네개 있는데 뭘 해야할런지 모르겠더라고요.");
  await page.getByRole("toolbar", { name: "Writing tools", exact: true }).getByRole("button", { name: "Check spelling", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Check spelling" });
  for (const suggestion of ["이런 게", "서너 개", "해야 할는지"]) {
    await expect(dialog.getByRole("button", { name: suggestion, exact: true })).toBeVisible();
    const before = await body.textContent();
    await dialog.getByRole("button", { name: suggestion, exact: true }).click();
    await expect(body).toHaveText(before!);
    await dialog.getByRole("button", { name: "Change", exact: true }).click();
  }
  await expect(dialog).toContainText("Spelling review complete.");
  await dialog.getByRole("button", { name: "Close", exact: true }).click();
  const expected = "이런 게 서너 개 있는데 뭘 해야 할는지 모르겠더라고요.";
  await expect(body).toHaveText(expected);
  await expect(page.getByRole("button", { name: "Save draft", exact: true })).toBeDisabled();
  await page.reload();
  await expect(body).toHaveText(expected);
});

test("new noun and stem corrections apply through the Worker and survive reload", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  page.on("console", message => { if (message.type() === "error") errors.push(message.text()); });
  await page.goto("/");
  await expect(page).toHaveTitle(/Wonboard/i);
  const body = page.getByRole("textbox", { name: "Document body", exact: true });
  await body.fill("키보드 메세지를 티이어를 제테크는 부딛히면");
  await page.getByRole("toolbar", { name: "Writing tools", exact: true }).getByRole("button", { name: "Check spelling", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Check spelling" });
  for (const suggestion of ["메시지를", "타이어를", "재테크는", "부딪히면"]) {
    if (suggestion === "타이어를") {
      await expect(dialog).toContainText("No reliable replacement was found.");
      await expect(dialog.getByRole("button", { name: suggestion, exact: true })).toHaveCount(0);
      await dialog.getByRole("button", { name: "Skip once", exact: true }).click();
      continue;
    }
    await expect(dialog.getByRole("button", { name: suggestion, exact: true })).toBeVisible();
    const before = await body.textContent();
    await dialog.getByRole("button", { name: suggestion, exact: true }).click();
    await expect(body).toHaveText(before!);
    await dialog.getByRole("button", { name: "Change", exact: true }).click();
  }
  await expect(dialog).toContainText("Spelling review complete.");
  await page.screenshot({ path: "test-results/wonboard-spelling-new-corrections.png" });
  await dialog.getByRole("button", { name: "Close", exact: true }).click();
  const expected = "키보드 메시지를 티이어를 재테크는 부딪히면";
  await expect(body).toHaveText(expected);
  await expect(page.getByRole("button", { name: "Save draft", exact: true })).toBeDisabled();
  await page.reload();
  await expect(body).toHaveText(expected);
  expect(errors).toEqual([]);
});

test("context suggestions require Change and survive save, reload and undo", async ({ page, browserName }) => {
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  page.on("console", message => { if (message.type() === "error") errors.push(message.text()); });
  await page.goto("/");
  await expect(page).toHaveTitle(/Wonboard/i);
  const body = page.getByRole("textbox", { name: "Document body", exact: true });
  const source = "어떻해 해야 하나요? 계획을 금새 바꿨어요. 이 옷은 문안한 색이에요. 빨리 낳으세요. 감기가 심하네요.";
  await body.fill(source);
  await page.getByRole("toolbar", { name: "Writing tools", exact: true }).getByRole("button", { name: "Check spelling", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Check spelling" });
  for (const suggestion of ["어떻게", "금세", "무난한", "나으세요"]) {
    const before = await body.textContent();
    await expect(dialog.getByRole("button", { name: suggestion, exact: true })).toBeVisible();
    if (suggestion === "어떻게") {
      await expect(dialog.getByRole("button", { name: "어떡해", exact: true })).toHaveCount(0);
      await page.screenshot({ path: `test-results/wonboard-how-${browserName}.png` });
    }
    await expect(dialog.getByRole("button", { name: "Skip once", exact: true })).toBeFocused();
    await dialog.getByRole("button", { name: suggestion, exact: true }).click();
    await expect(body).toHaveText(before!);
    await dialog.getByRole("button", { name: "Change", exact: true }).click();
  }
  await expect(dialog).toContainText("Spelling review complete.");
  await dialog.getByRole("button", { name: "Close", exact: true }).click();
  const expected = "어떻게 해야 하나요? 계획을 금세 바꿨어요. 이 옷은 무난한 색이에요. 빨리 나으세요. 감기가 심하네요.";
  await expect(body).toHaveText(expected);
  await body.press("ControlOrMeta+z");
  await expect(body).toHaveText(expected.replace("나으세요", "낳으세요"));
  await body.press("ControlOrMeta+Shift+z");
  await expect(body).toHaveText(expected);
  await expect(page.getByRole("button", { name: "Save draft", exact: true })).toBeDisabled();
  await page.reload();
  await expect(body).toHaveText(expected);
  await expect(page.locator("vite-error-overlay")).toHaveCount(0);
  expect(errors).toEqual([]);
});

test("Korean spelling applies only chosen words and persists personal exceptions", async ({ page }) => {
  page.on("console", message => { if (message.type() === "error") console.log(message.text()); });
  await page.goto("/");
  const body = page.getByRole("textbox", { name: "Document body", exact: true });
  await body.fill("됬어요 맞춥법 실바나스");
  const tool = page.getByRole("toolbar", { name: "Writing tools", exact: true }).getByRole("button", { name: "Check spelling", exact: true });
  await tool.click();
  const dialog = page.getByRole("dialog", { name: "Check spelling" });
  await expect(dialog.getByRole("button", { name: "됐어요", exact: true })).toBeVisible({ timeout: 20000 });
  await expect(dialog.getByRole("textbox", { name: "Replace with" })).toHaveValue("됐어요");
  await dialog.getByRole("button", { name: "됐어요", exact: true }).click();
  await expect(body).toHaveText("됬어요 맞춥법 실바나스");
  await expect(dialog).toContainText("English grammar and context are not checked.");
  await dialog.getByRole("button", { name: "Change", exact: true }).click();
  await expect(body).toHaveText("됐어요 맞춥법 실바나스");
  await dialog.getByRole("button", { name: "Skip once" }).click();
  await dialog.getByRole("button", { name: "Add to dictionary" }).click();
  await expect(dialog).toContainText("Spelling review complete.");
  await dialog.getByRole("button", { name: "Close", exact: true }).click();
  await body.press("ControlOrMeta+z");
  await expect(body).toHaveText("됬어요 맞춥법 실바나스");
  await page.reload();
  await tool.click();
  await expect(dialog.getByRole("button", { name: "됐어요", exact: true })).toBeVisible();
  await dialog.getByRole("button", { name: "Skip once" }).click();
  await dialog.getByRole("button", { name: "Skip once" }).click();
  await expect(dialog).toContainText("Spelling review complete.");
  await dialog.getByText("Personal dictionary (1)", { exact: true }).click();
  await dialog.getByRole("button", { name: "Remove 실바나스", exact: true }).click();
  await dialog.getByRole("button", { name: "Close", exact: true }).click();
  await tool.click();
  await expect(dialog.getByRole("button", { name: "됐어요", exact: true })).toBeVisible();
  await dialog.getByRole("button", { name: "Skip once" }).click();
  await dialog.getByRole("button", { name: "Skip once" }).click();
  await expect(dialog).toContainText("Unrecognized expression: 실바나스");
  await dialog.getByRole("textbox", { name: "Replace with" }).fill("실바나스님");
  await dialog.getByRole("button", { name: "Change", exact: true }).click();
  await expect(body).toHaveText("됬어요 맞춥법 실바나스님");
});

test("spacing applies, then registers a base term without suppressing spacing", async ({ page }) => {
  await page.goto("/");
  const body = page.getByRole("textbox", { name: "Document body", exact: true });
  await body.fill("질게에서답변하시는걸");
  await page.getByRole("toolbar", { name: "Writing tools", exact: true }).getByRole("button", { name: "Check spelling", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Check spelling" });
  await expect(dialog.getByRole("button", { name: "질게에서 답변하시는 걸", exact: true })).toBeVisible();
  await expect(dialog.getByRole("button", { name: "Skip once" })).toBeFocused();
  await dialog.getByRole("button", { name: "Change", exact: true }).click();
  await expect(body).toHaveText("질게에서 답변하시는 걸");
  await expect(dialog.getByRole("textbox", { name: "Base word to add" })).toHaveValue("질게");
  await dialog.getByRole("button", { name: "Add to dictionary" }).click();
  await expect(dialog).toContainText("Spelling review complete.");
  await dialog.getByRole("button", { name: "Close", exact: true }).click();
  await body.press("ControlOrMeta+z");
  await expect(body).toHaveText("질게에서답변하시는걸");
  await page.getByRole("toolbar", { name: "Writing tools", exact: true }).getByRole("button", { name: "Check spelling", exact: true }).click();
  await expect(dialog.getByRole("button", { name: "질게에서 답변하시는 걸", exact: true })).toBeVisible();
});

for (const sample of [
  { id: "vs", source: "vs teh VS", target: "vs the VS", suggestion: "the" },
  { id: "ahk", source: "ahk", target: "AHK", suggestion: "AHK" },
  { id: "computing", source: "gpu cpu GPU teh", target: "gpu cpu GPU the", suggestion: "the" },
]) {
test(`English suggestions share the review flow: ${sample.id}`, async ({ page, browserName }) => {
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  page.on("console", message => { if (message.type() === "error") errors.push(message.text()); });
  await page.goto("/");
  await expect(page).toHaveTitle(/Wonboard/i);
  const body = page.getByRole("textbox", { name: "Document body", exact: true });
  await body.fill(sample.source);
  await page.getByRole("toolbar", { name: "Writing tools", exact: true }).getByRole("button", { name: "Check spelling", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Check spelling" });
  await expect(dialog.getByRole("button", { name: sample.suggestion, exact: true })).toBeVisible();
  await dialog.getByRole("button", { name: sample.suggestion, exact: true }).click();
  await expect(body).toHaveText(sample.source);
  await dialog.getByRole("button", { name: "Change", exact: true }).click();
  await expect(body).toHaveText(sample.target);
  await expect(dialog).toContainText("Spelling review complete.");
  await page.screenshot({ path: `test-results/wonboard-${sample.id}-review-${browserName}.png` });
  await dialog.getByRole("button", { name: "Close", exact: true }).click();
  await expect(page.getByRole("button", { name: "Save draft", exact: true })).toBeDisabled();
  await page.reload();
  await expect(body).toHaveText(sample.target);
  await expect(page.locator("vite-error-overlay")).toHaveCount(0);
  expect(errors).toEqual([]);
});
}

test("the complete source sentence can be corrected while its community term is skipped", async ({ page }) => {
  await page.goto("/");
  const body = page.getByRole("textbox", { name: "Document body", exact: true });
  await body.fill("평소에 질게에서답변하시는걸 뵌걸로보면 제가 조언할 수준은 아닌것 같지만");
  await page.getByRole("toolbar", { name: "Writing tools", exact: true }).getByRole("button", { name: "Check spelling", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Check spelling" });
  await expect(dialog.getByRole("button", { name: "질게에서 답변하시는 걸", exact: true })).toBeVisible();
  await dialog.getByRole("button", { name: "Change", exact: true }).click();
  await expect(dialog).toContainText("Community expression review: 질게");
  await dialog.getByRole("button", { name: "Skip once", exact: true }).click();
  for (const suggestion of ["뵌 걸로 보면", "아닌 것"]) {
    await expect(dialog.getByRole("button", { name: suggestion, exact: true })).toBeVisible();
    await dialog.getByRole("button", { name: "Change", exact: true }).click();
  }
  await expect(dialog).toContainText("Spelling review complete.");
  await dialog.getByRole("button", { name: "Close", exact: true }).click();
  const expected = "평소에 질게에서 답변하시는 걸 뵌 걸로 보면 제가 조언할 수준은 아닌 것 같지만";
  await expect(body).toHaveText(expected);
  await expect(page.getByRole("button", { name: "Save draft", exact: true })).toBeDisabled();
  await page.reload();
  await expect(body).toHaveText(expected);
});

test("unreadable personal dictionary reports a failure without changing or resetting it", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("wonboard.spelling.personal.v1", "{broken"));
  await page.goto("/");
  await page.getByRole("textbox", { name: "Document body", exact: true }).fill("됬어요");
  await page.getByRole("button", { name: "Check spelling", exact: true }).first().click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByRole("alert")).toBeVisible();
  await expect(dialog.getByRole("button", { name: "Check again", exact: true })).toHaveCount(0);
  expect(await page.evaluate(() => localStorage.getItem("wonboard.spelling.personal.v1"))).toBe("{broken");
  await dialog.getByRole("button", { name: "Close", exact: true }).click();
});

test("composition Enter does not apply a replacement or skip a result", async ({ page }) => {
  await page.goto("/");
  const body = page.getByRole("textbox", { name: "Document body", exact: true });
  await body.fill("됬어요");
  await page.getByRole("button", { name: "Check spelling", exact: true }).first().click();
  const dialog = page.getByRole("dialog");
  const skip = dialog.getByRole("button", { name: "Skip once", exact: true });
  await expect(skip).toBeFocused();
  const prevented = await skip.evaluate(node => !node.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true, cancelable: true, isComposing: true })));
  expect(prevented).toBe(true);
  await expect(dialog.getByRole("button", { name: "됐어요", exact: true })).toBeVisible();
  await expect(body).toHaveText("됬어요");
});

test("changing the document invalidates suggestions and rechecks the new text", async ({ page }) => {
  await page.goto("/");
  const body = page.getByRole("textbox", { name: "Document body", exact: true });
  await body.fill("됬어요");
  await page.getByRole("button", { name: "Check spelling", exact: true }).first().click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByRole("button", { name: "됐어요", exact: true })).toBeVisible();
  await body.evaluate(node => (node as HTMLElement & { editor: { commands: { setContent(text: string): void } } }).editor.commands.setContent("<p>역활을 맡았어요.</p>"));
  await expect(dialog.getByRole("alert")).toContainText("Document changed");
  await expect(dialog.getByRole("button", { name: "Change", exact: true })).toBeDisabled();
  await dialog.getByRole("button", { name: "Check again", exact: true }).click();
  await expect(dialog.getByRole("button", { name: "역할을", exact: true })).toBeVisible();
  await dialog.getByRole("button", { name: "Change", exact: true }).click();
  await expect(body).toHaveText("역할을 맡았어요.");
});

test("closing review terminates its Worker without applying pending results", async ({ page }) => {
  await page.addInitScript(() => {
    const Original = window.Worker;
    (window as unknown as { spellingTerminations: number }).spellingTerminations = 0;
    window.Worker = class extends Original {
      terminate() {
        (window as unknown as { spellingTerminations: number }).spellingTerminations++;
        super.terminate();
      }
    };
  });
  await page.goto("/");
  const body = page.getByRole("textbox", { name: "Document body", exact: true });
  const source = "질게에서답변하시는걸 ".repeat(600);
  await body.fill(source);
  await page.getByRole("button", { name: "Check spelling", exact: true }).first().click();
  const before = await page.evaluate(() => (window as unknown as { spellingTerminations: number }).spellingTerminations);
  await page.getByRole("dialog").getByRole("button", { name: "Close", exact: true }).click();
  expect(await page.evaluate(() => (window as unknown as { spellingTerminations: number }).spellingTerminations)).toBe(before + 1);
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(body).toHaveText(source.trim());
});

for (const locale of ["ko", "en"]) test(`review remains usable at 390px (${locale})`, async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  page.on("console", message => { if (message.type() === "error") errors.push(message.text()); });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript(value => localStorage.setItem("wonboard-locale", value), locale);
  await page.goto("/");
  await expect(page).toHaveTitle(/Wonboard/i);
  const settings = page.getByRole("button", { name: locale === "ko" ? "설정" : "Settings", exact: true });
  await expect(settings).toBeVisible();
  if (await settings.getAttribute("aria-pressed") === "true") await settings.click();
  const body = page.locator('[contenteditable="true"]').first();
  await body.fill("질게에서답변하시는걸");
  await page.getByRole("button", { name: locale === "ko" ? "맞춤법 검사" : "Check spelling", exact: true }).first().click();
  const dialog = page.getByRole("dialog");
  const suggestion = dialog.getByRole("button", { name: "질게에서 답변하시는 걸", exact: true });
  await expect(suggestion).toBeVisible();
  const bounds = await dialog.boundingBox();
  expect(bounds!.x).toBeGreaterThanOrEqual(0);
  expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(390);
  expect(await dialog.evaluate(node => node.scrollWidth <= node.clientWidth)).toBe(true);
  await page.screenshot({ path: `test-results/wonboard-spelling-${locale}-390.png` });
  await dialog.getByRole("button", { name: locale === "ko" ? "바꾸기" : "Change", exact: true }).click();
  await expect(body).toHaveText("질게에서 답변하시는 걸");
  await dialog.getByRole("button", { name: locale === "ko" ? "닫기" : "Close", exact: true }).click();
  expect(errors).toEqual([]);
});

test("dictionary manager deduplicates, survives reload and preserves neighboring errors", async ({ page }) => {
  await page.goto("/");
  const body = page.getByRole("textbox", { name: "Document body", exact: true });
  await body.fill("질게에서답변하시는걸 됬어요");
  const tool = page.getByRole("toolbar", { name: "Writing tools", exact: true }).getByRole("button", { name: "Check spelling", exact: true });
  await tool.click();
  const dialog = page.getByRole("dialog", { name: "Check spelling" });
  await expect(dialog.getByRole("button", { name: "질게에서 답변하시는 걸", exact: true })).toBeVisible();
  const manager = dialog.locator("details").filter({ hasText: "Personal dictionary" });
  await manager.locator("summary").click();
  await manager.getByRole("textbox").fill("질게");
  await manager.getByRole("button", { name: "Add to dictionary", exact: true }).click();
  await expect(manager).toContainText("Already in your dictionary.");
  await expect(manager.getByRole("button", { name: "Add to dictionary", exact: true })).toBeDisabled();
  await expect(dialog.getByRole("button", { name: "질게에서 답변하시는 걸", exact: true })).toBeVisible();
  await dialog.getByRole("button", { name: "Change", exact: true }).click();
  await expect(dialog.getByRole("button", { name: "됐어요", exact: true })).toBeVisible();
  await dialog.getByRole("button", { name: "Change", exact: true }).click();
  await expect(dialog).toContainText("Spelling review complete.");
  await dialog.getByRole("button", { name: "Close", exact: true }).click();
  await expect(page.getByRole("button", { name: "Save draft", exact: true })).toBeDisabled();
  await page.reload();
  await expect(body).toHaveText("질게에서 답변하시는 걸 됐어요");
  await tool.click();
  await expect(dialog).toContainText("Spelling review complete.");
  await manager.locator("summary").click();
  await expect(manager).toContainText("Personal dictionary (1)");
  await manager.getByRole("button", { name: "Remove 질게", exact: true }).click();
  await expect(dialog).toContainText("Community expression review: 질게");
});

test("dictionary save failure preserves stored entries and document", async ({ page }) => {
  await page.goto("/");
  const body = page.getByRole("textbox", { name: "Document body", exact: true });
  await body.fill("아즈휼");
  await page.getByRole("toolbar", { name: "Writing tools", exact: true }).getByRole("button", { name: "Check spelling", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Check spelling" });
  await expect(dialog).toContainText("Unrecognized expression: 아즈휼");
  await page.evaluate(() => {
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = function(key, value) {
      if (key === "wonboard.spelling.personal.v1") throw new DOMException("full", "QuotaExceededError");
      return original.call(this, key, value);
    };
  });
  await dialog.getByRole("button", { name: "Add to dictionary", exact: true }).click();
  await expect(dialog.getByRole("alert")).toContainText("storage failed");
  expect(await page.evaluate(() => localStorage.getItem("wonboard.spelling.personal.v1"))).toBeNull();
  await expect(body).toHaveText("아즈휼");
});

test("dictionary updates from another tab refresh the open review", async ({ page, context }) => {
  await page.goto("/");
  const body = page.getByRole("textbox", { name: "Document body", exact: true });
  await body.fill("아즈휼에서");
  await page.getByRole("toolbar", { name: "Writing tools", exact: true }).getByRole("button", { name: "Check spelling", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Check spelling" });
  await expect(dialog).toContainText("Unrecognized expression: 아즈휼");
  const other = await context.newPage();
  await other.goto("/");
  await other.evaluate(() => localStorage.setItem("wonboard.spelling.personal.v1", '["아즈휼"]'));
  await expect(dialog).toContainText("Spelling review complete.");
  await other.evaluate(() => localStorage.setItem("wonboard.spelling.personal.v1", '[]'));
  await expect(dialog).toContainText("Unrecognized expression: 아즈휼");
  await expect(body).toHaveText("아즈휼에서");
  await other.close();
});

test("dictionary manager protects composition and invalidates an in-flight check", async ({ page }) => {
  await page.addInitScript(() => {
    const NativeWorker = window.Worker;
    const state = window as typeof window & { releaseFirstCheck?: () => void };
    window.Worker = class extends NativeWorker {
      constructor(url: string | URL, options?: WorkerOptions) {
        super(url, options);
        const active = this;
        Object.defineProperty(this, "onmessage", { set(handler: (event: MessageEvent) => void) {
          active.addEventListener("message", event => {
            if (event.data.id === 1) state.releaseFirstCheck = () => handler(event);
            else handler(event);
          });
        } });
      }
    };
  });
  await page.goto("/");
  const body = page.getByRole("textbox", { name: "Document body", exact: true });
  await body.fill("아즈휼에서 ".repeat(150));
  await page.getByRole("toolbar", { name: "Writing tools", exact: true }).getByRole("button", { name: "Check spelling", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Check spelling" });
  const manager = dialog.locator("details").filter({ hasText: "Personal dictionary" });
  await manager.locator("summary").click();
  const input = manager.getByRole("textbox");
  await input.fill("아즈휼");
  await expect.poll(() => page.evaluate(() => typeof (window as typeof window & { releaseFirstCheck?: () => void }).releaseFirstCheck)).toBe("function");
  await input.dispatchEvent("compositionstart");
  await manager.getByRole("button", { name: "Add to dictionary", exact: true }).click();
  expect(await page.evaluate(() => localStorage.getItem("wonboard.spelling.personal.v1"))).toBeNull();
  await input.dispatchEvent("compositionend");
  await manager.getByRole("button", { name: "Add to dictionary", exact: true }).click();
  await expect(dialog).toContainText("Spelling review complete.");
  await expect(manager).toContainText("Personal dictionary (1)");
  await page.evaluate(() => (window as typeof window & { releaseFirstCheck?: () => void }).releaseFirstCheck!());
  await expect(dialog).toContainText("Spelling review complete.");
  await expect(dialog).not.toContainText("Unrecognized expression:");
  await expect(body).toHaveText("아즈휼에서 ".repeat(150).trim());
});

test("skip once, skip all and permanent registration have distinct lifetimes", async ({ page }) => {
  await page.goto("/");
  const body = page.getByRole("textbox", { name: "Document body", exact: true });
  await body.fill("아즈휼 아즈휼 아즈휼");
  const tool = page.getByRole("toolbar", { name: "Writing tools", exact: true }).getByRole("button", { name: "Check spelling", exact: true });
  await tool.click();
  const dialog = page.getByRole("dialog", { name: "Check spelling" });
  await dialog.getByRole("button", { name: "Skip once", exact: true }).click();
  await expect(dialog).toContainText("Unrecognized expression: 아즈휼");
  await dialog.getByRole("button", { name: "Skip all occurrences", exact: true }).click();
  await expect(dialog).toContainText("Spelling review complete.");
  expect(await page.evaluate(() => localStorage.getItem("wonboard.spelling.personal.v1"))).toBeNull();
  await dialog.getByRole("button", { name: "Close", exact: true }).click();
  await tool.click();
  await expect(dialog).toContainText("Unrecognized expression: 아즈휼");
  await dialog.getByRole("button", { name: "Add to dictionary", exact: true }).click();
  await expect(dialog).toContainText("Spelling review complete.");
  await expect(body).toHaveText("아즈휼 아즈휼 아즈휼");
});

test('normal words survive correction undo and persisted reload',async({page})=>{
  await page.addInitScript(()=>localStorage.setItem('wonboard-locale','ko'));
  await page.goto('/');
  const body=page.locator('[contenteditable="true"]').first();
  const source='아닌데 만들어보고자 입문자용으로 봐야겠네요. 미국인들에게 사용하셨던 이건데 어디서든 제한적. 됬어요.';
  const target=source.replace('됬어요','됐어요');
  await body.fill(source);
  await page.getByRole('button',{name:'맞춤법 검사',exact:true}).first().click();
  const dialog=page.getByRole('dialog',{name:'맞춤법 검사'});
  await expect(dialog.getByRole('button',{name:'됐어요',exact:true})).toBeVisible();
  await expect(body).toHaveText(source);
  await dialog.getByRole('button',{name:'이번만 건너뛰기',exact:true}).press('Shift+Enter');
  await expect(dialog).toContainText('철자 검사를 마쳤습니다.');
  await dialog.getByRole('button',{name:'닫기',exact:true}).click();
  await expect(body).toHaveText(target);
  await body.press('ControlOrMeta+z');
  await expect(body).toHaveText(source);
  await body.press('ControlOrMeta+Shift+z');
  await expect(body).toHaveText(target);
  await expect(page.getByRole('button',{name:'임시저장',exact:true})).toBeDisabled();
  await page.reload();
  await expect(body).toHaveText(target);
});

test('registered laughter and emoticons preserve adjacent correction after reload',async({page})=>{
  await page.goto('/');
  const body=page.getByRole('textbox',{name:'Document body',exact:true});
  await body.fill('됬어요ㅋㅋㅋ ㅠ_ㅠ');
  const tool=page.getByRole('toolbar',{name:'Writing tools',exact:true}).getByRole('button',{name:'Check spelling',exact:true});
  await tool.click();
  const dialog=page.getByRole('dialog',{name:'Check spelling'});
  await expect(dialog.getByRole('button',{name:'됐어요',exact:true})).toBeVisible();
  const manager=dialog.locator('details').filter({hasText:'Personal dictionary'});
  await manager.locator('summary').click();
  for(const word of ['ㅋㅋㅋ','ㅠ_ㅠ']){
    await manager.getByRole('textbox').fill(word);
    await manager.getByRole('button',{name:'Add to dictionary',exact:true}).click();
    await expect(manager).toContainText('Already in your dictionary.');
  }
  await expect(dialog.getByRole('button',{name:'됐어요',exact:true})).toBeVisible();
  await dialog.getByRole('button',{name:'Change',exact:true}).click();
  await expect(dialog).toContainText('Spelling review complete.');
  await dialog.getByRole('button',{name:'Close',exact:true}).click();
  await expect(page.getByRole('button',{name:'Save draft',exact:true})).toBeDisabled();
  await page.reload();
  await expect(body).toHaveText('됐어요ㅋㅋㅋ ㅠ_ㅠ');
  await tool.click();
  await expect(dialog).toContainText('Spelling review complete.');
  await manager.locator('summary').click();
  await manager.getByRole('button',{name:'Remove ㅠ_ㅠ',exact:true}).click();
  await expect(dialog).toContainText('Unrecognized expression: ㅠ_ㅠ');
});

test('skipping an unknown name preserves its separate copula spacing repair',async({page})=>{
  await page.goto('/');
  const body=page.getByRole('textbox',{name:'Document body',exact:true});
  await body.fill('아즈휼 입니다만 됬어요');
  const tool=page.getByRole('toolbar',{name:'Writing tools',exact:true}).getByRole('button',{name:'Check spelling',exact:true});
  await tool.click();
  const dialog=page.getByRole('dialog',{name:'Check spelling'});
  await expect(dialog).toContainText('Unrecognized expression: 아즈휼');
  await dialog.getByRole('button',{name:'Skip once',exact:true}).click();
  for(const suggestion of ['입니다만','됐어요']){
    await expect(dialog.getByRole('button',{name:suggestion,exact:true})).toBeVisible();
    await dialog.getByRole('button',{name:'Change',exact:true}).click();
  }
  await expect(dialog).toContainText('Spelling review complete.');
  await dialog.getByRole('button',{name:'Close',exact:true}).click();
  await expect(body).toHaveText('아즈휼입니다만 됐어요');
  await body.press('ControlOrMeta+z');
  await expect(body).toHaveText('아즈휼입니다만 됬어요');
  await body.press('ControlOrMeta+Shift+z');
  await expect(page.getByRole('button',{name:'Save draft',exact:true})).toBeDisabled();
  await page.reload();
  await expect(body).toHaveText('아즈휼입니다만 됐어요');
});

test('plural review offers the base for registration and keeps neighboring corrections',async({page})=>{
  await page.goto('/');
  const body=page.getByRole('textbox',{name:'Document body',exact:true});
  await body.fill('아즈휼들만의 아즈휼보단 됬어요');
  const tool=page.getByRole('toolbar',{name:'Writing tools',exact:true}).getByRole('button',{name:'Check spelling',exact:true});
  await tool.click();
  const dialog=page.getByRole('dialog',{name:'Check spelling'});
  await expect(dialog.getByRole('textbox',{name:'Base word to add',exact:true})).toHaveValue('아즈휼');
  await dialog.getByRole('button',{name:'Add to dictionary',exact:true}).click();
  await expect(dialog.getByRole('button',{name:'됐어요',exact:true})).toBeVisible();
  await dialog.getByRole('button',{name:'Change',exact:true}).click();
  await expect(dialog).toContainText('Spelling review complete.');
  await dialog.getByRole('button',{name:'Close',exact:true}).click();
  await expect(page.getByRole('button',{name:'Save draft',exact:true})).toBeDisabled();
  await page.reload();
  await expect(body).toHaveText('아즈휼들만의 아즈휼보단 됐어요');
  await tool.click();
  await expect(dialog).toContainText('Spelling review complete.');
  const manager=dialog.locator('details').filter({hasText:'Personal dictionary'});
  await manager.locator('summary').click();
  await manager.getByRole('button',{name:'Remove 아즈휼',exact:true}).click();
  await expect(dialog).toContainText('Unrecognized expression: 아즈휼');
});

test('registered base with a particle survives recheck while neighboring quantity errors remain',async({page})=>{
  await page.goto('/');
  const body=page.getByRole('textbox',{name:'Document body',exact:true});
  await body.fill('몇가지를 두번이나 확인했어요. 됬어요.');
  const tool=page.getByRole('toolbar',{name:'Writing tools',exact:true}).getByRole('button',{name:'Check spelling',exact:true});
  await tool.click();
  const dialog=page.getByRole('dialog',{name:'Check spelling'});
  await expect(dialog.getByRole('button',{name:'몇 가지를',exact:true})).toBeVisible();
  const manager=dialog.locator('details').filter({hasText:'Personal dictionary'});
  await manager.locator('summary').click();
  await manager.getByRole('textbox').fill('몇가지');
  await manager.getByRole('button',{name:'Add to dictionary',exact:true}).click();
  for(const suggestion of ['두 번이나','됐어요']){
    await expect(dialog.getByRole('button',{name:suggestion,exact:true})).toBeVisible();
    await dialog.getByRole('button',{name:'Change',exact:true}).click();
  }
  await expect(dialog).toContainText('Spelling review complete.');
  await dialog.getByRole('button',{name:'Close',exact:true}).click();
  await expect(page.getByRole('button',{name:'Save draft',exact:true})).toBeDisabled();
  await page.reload();
  await expect(body).toHaveText('몇가지를 두 번이나 확인했어요. 됐어요.');
  await tool.click();
  await expect(dialog).toContainText('Spelling review complete.');
  await manager.locator('summary').click();
  await manager.getByRole('button',{name:'Remove 몇가지',exact:true}).click();
  await expect(dialog.getByRole('button',{name:'몇 가지를',exact:true})).toBeVisible();
});

test("dictionary changes in two tabs serialize and closing cancels a queued save", async ({ page, context }) => {
  test.setTimeout(60000);
  const other = await context.newPage();
  const pages = [page, other];
  for (const tab of pages) {
    await tab.goto("/");
    await tab.getByRole("textbox", { name: "Document body", exact: true }).fill("아즈휼 됬어요.");
    await tab.getByRole("toolbar", { name: "Writing tools", exact: true }).getByRole("button", { name: "Check spelling", exact: true }).click();
    await tab.getByRole("dialog").locator("details").filter({ hasText: "Personal dictionary" }).locator("summary").click();
  }
  const managers = pages.map(tab => tab.getByRole("dialog").locator("details").filter({ hasText: "Personal dictionary" }));
  const hold = () => page.evaluate(() => new Promise<void>(held => {
    void navigator.locks.request("wonboard.spelling.personal.v1", () => new Promise<void>(release => {
      (window as unknown as { releaseDictionaryLock: () => void }).releaseDictionaryLock = release;
      held();
    }));
  }));
  const release = () => page.evaluate(() => (window as unknown as { releaseDictionaryLock: () => void }).releaseDictionaryLock());
  const pending = () => page.evaluate(async () => (await navigator.locks.query()).pending?.filter(lock => lock.name === "wonboard.spelling.personal.v1").length);
  const saved = () => page.evaluate(() => JSON.parse(localStorage.getItem("wonboard.spelling.personal.v1") ?? "[]").sort());
  await hold();
  for (const [i, word] of ["아즈휼", "뷁큘"].entries()) {
    await managers[i].getByRole("textbox").fill(word);
    await managers[i].getByRole("button", { name: "Add to dictionary", exact: true }).click();
    await expect(managers[i].getByRole("textbox")).toBeDisabled();
  }
  await expect.poll(pending).toBe(2);
  expect(await saved()).toEqual([]);
  await release();
  await expect.poll(saved).toEqual(["뷁큘", "아즈휼"]);
  for (const manager of managers) {
    await expect(manager.getByRole("button", { name: "Remove 아즈휼", exact: true })).toBeEnabled();
    await expect(manager.getByRole("button", { name: "Remove 뷁큘", exact: true })).toBeEnabled();
  }
  await hold();
  await managers[0].getByRole("button", { name: "Remove 아즈휼", exact: true }).click();
  await managers[1].getByRole("textbox").fill("ㅠ_ㅠ");
  await managers[1].getByRole("button", { name: "Add to dictionary", exact: true }).click();
  await expect.poll(pending).toBe(2);
  await release();
  await expect.poll(saved).toEqual(["ㅠ_ㅠ", "뷁큘"]);
  await expect(managers[1].getByRole("textbox")).toBeEnabled();
  await hold();
  await managers[1].getByRole("textbox").fill("취소할말");
  await managers[1].getByRole("button", { name: "Add to dictionary", exact: true }).click();
  await expect.poll(pending).toBe(1);
  await other.getByRole("dialog").getByRole("button", { name: "Close", exact: true }).click();
  await expect.poll(pending).toBe(0);
  await release();
  await other.reload();
  expect(await saved()).toEqual(["ㅠ_ㅠ", "뷁큘"]);
  await other.getByRole("toolbar", { name: "Writing tools", exact: true }).getByRole("button", { name: "Check spelling", exact: true }).click();
  await expect(other.getByRole("dialog")).toContainText("Unrecognized expression: 아즈휼");
  await other.close();
});

for(const word of ['갈축','타건'])test(`community term ${word} registration protects particle and keeps adjacent spacing`,async({page})=>{
  await page.goto('/');
  const body=page.getByRole('textbox',{name:'Document body',exact:true});
  await body.fill(`${word}이나 쓸때`);
  const tool=page.getByRole('toolbar',{name:'Writing tools',exact:true}).getByRole('button',{name:'Check spelling',exact:true});
  await tool.click();
  const dialog=page.getByRole('dialog',{name:'Check spelling'});
  const manager=dialog.locator('details').filter({hasText:'Personal dictionary'});
  await manager.locator('summary').click();
  await manager.getByRole('textbox').fill(word);
  await manager.getByRole('button',{name:'Add to dictionary',exact:true}).click();
  await expect(manager).toContainText('Already in your dictionary.');
  await expect(dialog.getByRole('button',{name:'쓸 때',exact:true})).toBeVisible();
  await dialog.getByRole('button',{name:'Change',exact:true}).click();
  await expect(dialog).toContainText('Spelling review complete.');
  await dialog.getByRole('button',{name:'Close',exact:true}).click();
  await expect(page.getByRole('button',{name:'Save draft',exact:true})).toBeDisabled();
  await page.reload();
  await expect(body).toHaveText(`${word}이나 쓸 때`);
  await tool.click();
  await expect(dialog).toContainText('Spelling review complete.');
  await manager.locator('summary').click();
  await expect(manager).toContainText('Personal dictionary (1)');
  await page.screenshot({path:`test-results/wonboard-dc-dictionary-${word}.png`});
  await manager.getByRole('button',{name:`Remove ${word}`,exact:true}).click();
  await expect(dialog).not.toContainText('Spelling review complete.');
});
