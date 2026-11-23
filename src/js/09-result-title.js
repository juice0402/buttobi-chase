/* ---------- end of a run ---------- */
let resBtnT = 0, resSongT = 0;
const runScore = () => Math.floor(dist * 0.15) + runCoins() + (endKind === 'clear' ? TOWN.goalBonus : 0);
function runStats(){ return {clear:endKind === 'clear', boss:bossN, traf:trafN, near:nearN, nearOpp:nearOppN, maxCombo, ko, ice:iceN, final:finalDown, takes:takeN, score:runScore(), dist, star:maxStar, dmgR:dmgTaken / P.maxHp}; }
function checkMis(final){
  const st = runStats(), T = save.towns[townI], D = dailyState();
  TOWN_MIS[townI].forEach((m, k) => { const id = 't' + k; if (!T.mis[k] && !runMis.has(id) && m.v(st)){ runMis.add(id); if (!final) misQueue.push(m.t); } });
  for (const m of todayMis()){ const id = 'd:' + m.id; if (!D.done[m.id] && !runMis.has(id) && m.v(st)){ runMis.add(id); if (!final) misQueue.push(m.t); } }
}
function finishRun(show){
  if (show === undefined) show = true;
  if (!endKind) endKind = 'quit';
  if (boosting){ boosting = false; nitroOff(); }
  checkMis(true);
  const m0 = save.money, sum = runScore(), rank = rankOf(sum), title = pickTitle(), newTitle = !save.titles[title.id], hiNew = sum > save.hiScore;
  const rs = ranksOf(townI), nextRank = rs[rs.findIndex(r => r.r === rank.r) - 1];
  const T = save.towns[townI], starsBefore = townStars(townI), gain = [];
  save.money += sum; save.best = Math.max(save.best, Math.floor(dist)); if (endKind === 'clear') save.clears++;
  save.plays = (save.plays || 0) + 1;
  save.titles[title.id] = true; if (hiNew) save.hiScore = sum;
  gcScore();
  // every other title this run also earned goes into the collection (the run is still named by its best one)
  // (the plain ones too: にげきり屋 for any escape, まだまだ見習い for any crash)
  { const tst = titleStats(), baseId = endKind === 'clear' ? 'run' : endKind === 'wreck' ? 'rookie' : '';
    for (const T of TITLES) if (T !== title && !save.titles[T.id] && (T.base ? T.id === baseId : T.v(tst) >= 1)){ save.titles[T.id] = true; gain.push({k:'title', t:`称号「${T.name}」もゲット`}); } }
  const carNew = sum > (save.carBest[save.car] || 0); if (carNew) save.carBest[save.car] = sum;
  if (RANK_ORDER[rank.r] > RANK_ORDER[save.carRank[save.car] || '']) save.carRank[save.car] = rank.r;
  if (sum > T.best) T.best = sum;
  if (RANK_ORDER[rank.r] > RANK_ORDER[T.rank || '']) T.rank = rank.r;
  TOWN_MIS[townI].forEach((m, k) => { if (runMis.has('t' + k) && !T.mis[k]){ T.mis[k] = true; save.money += m.c; gain.push({k:'mis', t:m.t, c:m.c}); } });
  const D = dailyState();
  // every daily mission this run called out is paid, even when the run crossed midnight and the list changed
  for (const m of DAILY) if (runMis.has('d:' + m.id) && !D.done[m.id]){ D.done[m.id] = true; save.money += m.c; gain.push({k:'mis', t:'今日：' + m.t, c:m.c}); }
  let opened = null;
  if (endKind === 'clear' && !T.clear){ T.clear = true; if (townI + 1 < TOWNS.length){ opened = TOWNS[townI + 1]; save.town = townI + 1; } }
  const starsNow = townStars(townI);
  if (starsNow > starsBefore) gain.push({k:'star', t:`${TOWN.name} ${'★'.repeat(starsNow)}${'☆'.repeat(3 - starsNow)}`});
  if (rank.r === 'S' && !save.gold[save.car]){ save.gold[save.car] = true; gain.push({k:'gold', t:`金のしるし ${car().name}`}); }
  if (opened) gain.push({k:'open', t:`次の街「${opened.name}」が開いた`});
  writeSave();
  sndDo(R => { R.engineOff(); R.siren(0); R.nitro(false); R.boss(false); });
  hideRunUi(); clearTimeout(toastTimer); $('toast').classList.remove('show'); $('banner').classList.remove('show');
  if (!show) return;
  const el = $('result'), rk = $('rRank');
  el.className = endKind === 'clear' ? 'clear' : 'wreck';
  $('rTown').textContent = TOWN.name;
  $('rKind').textContent = endKind === 'clear' ? 'にげきった！' : 'クラッシュ！';
  rk.className = 'res-rank rank-' + rank.r; rk.textContent = rank.r; rk.setAttribute('aria-label', rank.r + 'ランク');
  $('rTitle').innerHTML = `<span>${title.name}</span>${newTitle ? '<em class="new">NEW</em>' : ''}`;
  $('rScore').textContent = fmt(sum);
  $('rHi').textContent = hiNew ? 'ハイスコア' : 'この車でベスト';
  $('rHi').hidden = !((hiNew || carNew) && sum > 0);
  $('rNext').textContent = nextRank ? `${nextRank.r}ランクまで あと ${fmt(nextRank.min - sum)}` : '最高ランク';
  const ic = {mis:'✓', star:'★', gold:'金', open:'›', title:'称'};
  $('rGain').innerHTML = gain.map(g => `<li class="${g.k}"><i>${ic[g.k]}</i><span>${g.t}</span>${g.c ? `<em>+${fmt(g.c)}</em>` : ''}</li>`).join('');
  $('rMoney').textContent = fmt(save.money);
  state = 'result';
  $('garage').hidden = true; el.hidden = false; el.scrollTop = 0; $('rGain').scrollTop = 0; fadeMore($('rGain'));
  rk.style.animation = 'none'; void rk.offsetWidth; rk.style.animation = '';
  if (!RM()){  // the headline slides in with speed lines, the title pops after the stamp, the numbers count up, the rows come in one by one
    fxIn($('rKind'), -1, true, true);
    $('rTitle').style.setProperty('--d', '.5s'); fxRestart($('rTitle'), 'fxpop');
    fxCount($('rScore'), sum, 0, 350, 650); fxCount($('rMoney'), save.money, m0, 900, 600);
    $('rGain').querySelectorAll('li').forEach((li, k) => { li.style.setProperty('--d', (0.6 + k * 0.07).toFixed(2) + 's'); fxRestart(li, 'fxinr'); });
  }
  const rb = $('rBtns'); rb.classList.add('wait'); clearTimeout(resBtnT); resBtnT = setTimeout(() => rb.classList.remove('wait'), 800);
  // the result's sounds stop at the next run (もう1回 can be tapped after 0.8 s, before the last of them)
  const later = (fn, ms) => setTimeout(() => { if (state === 'result' || state === 'garage') fn(); }, ms);
  later(() => snd('stamp'), 380);
  if (newTitle) later(() => snd('newTitle'), 950);
  if (gain.some(g => g.k === 'mis')) later(() => snd('mission'), 1350);
  if (opened) later(() => sndDo(R => R.jingle('unlock')), 1900);
  else if (gain.some(g => g.k === 'star' || g.k === 'gold')) later(() => sndDo(R => R.jingle('stars')), 1700);
  clearTimeout(resSongT); resSongT = setTimeout(() => { if (state === 'result' || state === 'garage') playSong('garage'); }, opened ? 3800 : 2400);
}
/* the steering hint: a swiping finger for the first seconds of the first few runs */
let hintLeft = 0, steered = false;
function hideHint(){ hintLeft = 0; $('steerHint').hidden = true; }
function tickHint(dt){
  if (hintLeft <= 0) return;
  if (steered && hintLeft > 0.35){ hintLeft = 0.35; $('steerHint').classList.add('gone'); }
  hintLeft -= dt; if (hintLeft <= 0) hideHint();
}
function startRun(ti){
  // ti: replay a given town (もう1回) without changing the garage's pick
  if (!townOpen(save.town)) save.town = 0;
  setTown(typeof ti === 'number' && townOpen(ti) ? ti : save.town);
  $('title').hidden = true; $('result').hidden = true; $('garage').hidden = true; $('pauseOv').hidden = true; $('setOv').hidden = true; $('tut').hidden = true;
  clearTimeout(resSongT); clearTimeout(resBtnT);
  $('hud').hidden = false; $('boostBar').hidden = false; $('bossBar').hidden = true; document.body.classList.remove('bossing');
  const pb = $('progBar'); pb.querySelectorAll('em').forEach(e => e.remove());
  for (const a of AREAS.slice(1)){ const em = document.createElement('em'); em.style.left = (a.from / GOAL * 100) + '%'; pb.appendChild(em); }
  dailyState();
  resetWorld(); state = 'play'; hudT = 0; last = 0; banner(TOWN.name);
  steered = false; hintLeft = (save.plays || 0) < 5 ? 3.6 : 0;
  const sh = $('steerHint'); sh.classList.remove('gone'); sh.hidden = hintLeft <= 0;
  playSong(TOWN.song); sndDo(R => { R.pauseMuffle(false); R.boss(false); R.nitro(false); R.heat(star); });
}
/* pause: the II button, Esc / P, or the app going to the background */
function pauseGame(){
  if (state !== 'play') return;
  state = 'pause'; drag = null; keys.left = keys.right = false; syncSw(); if (document.hidden) $('pauseOv').hidden = false; else openOv('pauseOv');
  // nothing sits over the pause sheet: a showing toast or banner goes away (queued mission toasts wait, since update() is stopped)
  clearTimeout(toastTimer); $('toast').classList.remove('show'); $('banner').classList.remove('show');
  sndDo(R => { R.engineOff(); R.siren(0); R.pauseMuffle(true); });  // siren first: the engine ignores siren() while muffled
}
function resumeGame(){
  if (state !== 'pause') return;
  closeOv('pauseOv'); state = 'play'; last = 0; sndDo(R => R.pauseMuffle(false));
}
/* sound switches (saved) and the song that should be playing */
let curSong = null, audioOn = false;
function playSong(id){ curSong = id; sndDo(R => R.music(id)); }
function syncSw(){
  for (const [id, on] of [['swSe', save.se], ['pSe', save.se], ['swBgm', save.bgm], ['pBgm', save.bgm]]){ const b = $(id); b.setAttribute('aria-pressed', String(on)); b.textContent = on ? 'オン' : 'オフ'; }
}
function setSound(kind, on){
  save[kind] = on; writeSave(); syncSw();
  sndDo(R => { if (kind === 'se'){ R.setSe(on); if (on) R.se('tap'); } else { R.setBgm(on); if (on && curSong){ R.music(null); R.music(curSong); } } });
}


/* ---------- how to play ---------- */
const TOY = (x, y, col, w, h) => `<g transform="translate(${x} ${y})"><rect x="${-w/2 + 3}" y="${-h/2 + 4}" width="${w}" height="${h}" rx="7" fill="rgba(0,0,0,.28)"/>` +
  `<g fill="#141c26"><rect x="${-w/2 - 2}" y="${-h/2 + 5}" width="4" height="9" rx="1.5"/><rect x="${w/2 - 2}" y="${-h/2 + 5}" width="4" height="9" rx="1.5"/><rect x="${-w/2 - 2}" y="${h/2 - 14}" width="4" height="9" rx="1.5"/><rect x="${w/2 - 2}" y="${h/2 - 14}" width="4" height="9" rx="1.5"/></g>` +
  `<rect x="${-w/2}" y="${-h/2}" width="${w}" height="${h}" rx="7" fill="${col}" stroke="#17324d" stroke-width="2"/>` +
  `<rect x="${-w/2 + 4}" y="${-h/2 + 7}" width="${w - 8}" height="${h*0.18}" rx="3" fill="#bfe6ff"/><rect x="${-w/2 + 5}" y="${h/2 - h*0.26}" width="${w - 10}" height="${h*0.12}" rx="3" fill="#9cc9e6"/></g>`;
const ROAD = '<rect width="240" height="150" fill="#4f5d6e"/><rect x="0" width="22" height="150" fill="#a8c49a"/><rect x="218" width="22" height="150" fill="#a8c49a"/>' +
  '<g fill="#f2f4f0" opacity=".8"><rect x="118" y="4" width="4" height="22"/><rect x="118" y="44" width="4" height="22"/><rect x="118" y="84" width="4" height="22"/><rect x="118" y="124" width="4" height="22"/></g>';
const TUT = [
  {head:'なぞって運転', text:'画面のどこをなぞっても動く',
   pic: ROAD + `<g class="tc">${TOY(120, 62, '#ff5a36', 26, 44)}</g>` +
     '<path d="M70 124h100" stroke="#ffffff" stroke-width="3" stroke-dasharray="6 6" opacity=".8"/><path d="M62 124l12-8v16zM178 124l-12-8v16z" fill="#ffffff"/>' +
     '<g class="tf"><rect x="108" y="112" width="24" height="34" rx="11" fill="#ffffff" stroke="#17324d" stroke-width="3"/><circle cx="120" cy="114" r="10" fill="none" stroke="#ffc83d" stroke-width="3"/></g>'},
  {head:'満タンでタップ', text:'すれすれ・逆走・体当たりでたまる',
   pic: ROAD + '<rect x="30" y="12" width="180" height="26" rx="13" fill="#17324d"/><defs><pattern id="tst" width="14" height="14" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="7" height="14" fill="#ff5a36"/><rect x="7" width="7" height="14" fill="#ffc83d"/></pattern></defs>' +
     '<rect x="36" y="18" width="168" height="14" rx="7" fill="url(#tst)"/><text x="120" y="56" text-anchor="middle" font-size="13" font-weight="900" fill="#ffc83d" font-family="sans-serif">ニトロ満タン！</text>' +
     '<g class="tfl"><path d="M110 118q10 22 10 28q0-6 10-28z" fill="#ff8a3d"/><path d="M114 118q6 14 6 20q0-6 6-20z" fill="#ffc83d"/></g>' + TOY(120, 98, '#ff5a36', 26, 42) +
     '<circle class="tr" cx="178" cy="112" r="16" fill="none" stroke="#ffffff" stroke-width="4"/><circle cx="178" cy="112" r="6" fill="#ffffff"/>'},
  {head:'追っ手をクラッシュ', text:'かべや車にぶつけさせるとコイン',
   pic: ROAD + TOY(104, 70, '#9fb3c6', 26, 44) +
     '<g transform="rotate(-24 150 78)">' + TOY(150, 78, '#f7f7f4', 24, 42).replace('fill="#bfe6ff"', 'fill="#17324d"') + '<rect x="140" y="74" width="10" height="5" fill="#ff3b3b"/><rect x="150" y="74" width="10" height="5" fill="#3b8bff"/></g>' +
     '<g class="tb"><path d="M128 40l6 14 15-4-10 12 10 12-15-3-6 14-6-14-15 3 10-12-10-12 15 4z" fill="#ffc83d" stroke="#17324d" stroke-width="2"/></g>' +
     '<text x="190" y="40" text-anchor="middle" font-size="22" font-weight="900" fill="#ffc83d" stroke="#17324d" stroke-width="4" paint-order="stroke" font-family="sans-serif">+60</text>' +
     '<circle cx="62" cy="124" r="11" fill="#ffc83d" stroke="#d9a21f" stroke-width="3"/><circle cx="84" cy="128" r="9" fill="#ffc83d" stroke="#d9a21f" stroke-width="3"/>'},
];
let tutI = 0, tutThen = null, tutAt = 0;
function showTut(then){
  tutI = 0; tutThen = then || null; state === 'title' && (state = 'tut');
  $('tut').hidden = false; tutAt = performance.now(); drawTut();
  if (!RM()){ const c = $('tut').querySelector('.tut-card'); c.classList.remove('fxdrive'); const r = c.getBoundingClientRect(); fxRestart(c, 'fxdrive'); setTimeout(() => fxLines(r, -1, true), 90); }
}
function drawTut(){
  const c = TUT[tutI];
  $('tutNo').textContent = `${tutI + 1} / ${TUT.length}`;
  $('tutPic').innerHTML = c.pic; $('tutPic').setAttribute('aria-label', c.head);
  $('tutHead').textContent = c.head; $('tutText').textContent = c.text;
  [...$('tut').querySelectorAll('.tut-dots i')].forEach((d, k) => d.classList.toggle('on', k === tutI));
  $('tutNext').textContent = tutI === TUT.length - 1 ? (tutThen ? 'とじる' : 'スタート') : 'つぎへ';
}
function endTut(){
  $('tut').hidden = true; if (!save.tutDone){ save.tutDone = true; writeSave(); }
  const then = tutThen; tutThen = null;
  if (then) then(); else startRun();
}
$('tutNext').addEventListener('click', () => { if (performance.now() - tutAt < 400) return; snd('tap');
  if (tutI < TUT.length - 1){ tutI++; drawTut(); for (const id of ['tutPic', 'tutHead', 'tutText']) fxIn($(id), 1); fxRestart($('tut').querySelector('.tut-dots i.on'), 'fxpop'); }
  else { const go = !tutThen; endTut(); if (go) fxGo(); } });
$('tutSkip').addEventListener('click', () => { if (performance.now() - tutAt < 400) return; snd('tap'); const go = !tutThen; endTut(); if (go) fxGo(); });
$('openTut').addEventListener('click', () => { snd('tap'); closeOv('setOv'); showTut(() => {}); });

/* title: the logo stamps on and waits for a tap (11/17 しょーくん「いきなりゲームが始まるとビビる」); the very first time, the picture cards come first */
let titleTimer = 0, titleGo = false;
function showTitle(){
  state = 'title'; titleGo = false;
  const el = $('title'); el.classList.remove('out'); el.hidden = false;
}
function leaveTitle(){
  if (state !== 'title' || titleGo) return;
  titleGo = true; snd('tap');
  if (RM()) return endTitle();
  $('title').classList.add('out'); titleTimer = setTimeout(endTitle, 300);
}
function endTitle(){ if (state !== 'title') return; clearTimeout(titleTimer); if (!save.tutDone){ $('title').hidden = true; showTut(null); return; } startRun(); }
/* iOS: a quick second tap must not open the text loupe or zoom, a pinch must not zoom, a long press must not open a menu (11/17 しょーくん「ダブルタップしたら虫眼鏡」) */
{ let lastEnd = 0;
  document.addEventListener('touchend', e => { const now = performance.now(); if (now - lastEnd < 400 && e.cancelable && !e.target.closest('button, .panel, .r-gain')) e.preventDefault(); lastEnd = now; }, {passive:false});
  for (const ev of ['dblclick', 'gesturestart', 'gesturechange', 'contextmenu', 'selectstart']) document.addEventListener(ev, e => { if (e.cancelable) e.preventDefault(); }, {passive:false});
}
$('title').addEventListener('pointerdown', e => { e.preventDefault(); leaveTitle(); });

