/* ---------- input ---------- */
cvs.addEventListener('pointerdown', e => {
  if (state !== 'play') return;
  if (drag && e.pointerId !== drag.id){ tryBoost(); return; }
  drag = {id:e.pointerId, x:e.clientX, lastX:e.clientX, tx:targetX, t0:performance.now(), moved:0};
  try { cvs.setPointerCapture(e.pointerId); } catch(err){}
});
cvs.addEventListener('pointermove', e => {
  if (!drag || e.pointerId !== drag.id) return;
  drag.lastX = e.clientX; drag.moved = Math.max(drag.moved, Math.abs(e.clientX - drag.x)); if (drag.moved > 24) steered = true;
  targetX = drag.tx + (e.clientX - drag.x) * 1.3 / s;
});
const endDrag = e => {
  if (!drag || e.pointerId !== drag.id) return;
  if (e.type === 'pointerup' && performance.now() - drag.t0 < 230 && drag.moved < 12) tryBoost();
  drag = null;
};
cvs.addEventListener('pointerup', endDrag); cvs.addEventListener('pointercancel', endDrag);
const keyOf = e => e.key && e.key.length === 1 ? e.key.toLowerCase() : e.key;  // P / A / D work with Shift or Caps Lock too
window.addEventListener('keydown', e => {
  if (state === 'title'){ e.preventDefault(); leaveTitle(); return; }
  if (state === 'tut'){ if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowRight'){ e.preventDefault(); $('tutNext').click(); } return; }
  const k = keyOf(e);
  if (k === 'Escape' || k === 'p'){ if (state === 'play') pauseGame(); else if (state === 'pause') resumeGame(); return; }
  if (k === 'ArrowLeft' || k === 'a'){ keys.left = true; steered = true; }
  if (k === 'ArrowRight' || k === 'd'){ keys.right = true; steered = true; }
  if (k === ' ' || k === 'ArrowUp'){ if (state === 'play'){ e.preventDefault(); tryBoost(); } }
});
window.addEventListener('keyup', e => {
  const k = keyOf(e);
  if (k === 'ArrowLeft' || k === 'a') keys.left = false;
  if (k === 'ArrowRight' || k === 'd') keys.right = false;
});
window.addEventListener('blur', () => { keys.left = keys.right = false; });  // a key let go in another window never sends keyup here
$('pauseBtn').addEventListener('click', () => { snd('tap'); pauseGame(); });
$('resume').addEventListener('click', () => { snd('tap'); resumeGame(); });
$('retry').addEventListener('click', () => { if (state !== 'pause') return; snd('tap'); $('pauseOv').hidden = true; finishRun(false); startRun(townI); fxGo(); });
$('quit').addEventListener('click', () => {
  if (state !== 'pause') return;
  snd('tap'); closeOv('pauseOv'); const before = save.money; finishRun(false); openGarage();
  const got = save.money - before; if (got > 0) toast(`ここまでのコイン +${fmt(got)}`);
});
$('again').addEventListener('click', () => { if (state !== 'result') return; snd('tap'); startRun(townI); fxGo(); });
$('gPanel').addEventListener('scroll', e => fadeMore(e.currentTarget), {passive:true});
if (window.ResizeObserver) new ResizeObserver(() => fadeMore($('gPanel'))).observe($('gPanel'));
$('rGain').addEventListener('scroll', e => fadeMore(e.currentTarget), {passive:true});
$('toGarage').addEventListener('click', () => { if (state !== 'result') return; snd('tap'); openGarage(); });
$('garage').addEventListener('click', e => {
  if (garageFresh()) return;
  const tab = e.target.closest('[data-tab]');
  if (tab){
    const order = ['car', 'up', 'mis', 'title'], was = gTab, heroWas = $('hero').dataset.i;
    gTab = tab.dataset.tab; if (gTab === 'car') gSel = save.car; $('gPanel').scrollTop = 0; snd('tap'); renderGarage();
    if (gTab !== was){ const dir = order.indexOf(gTab) > order.indexOf(was) ? 1 : -1;
      fxRestart(tab, 'fxpick'); fxIn($('gPanel'), dir); tilesIn($('gPanel'), '.tile, .ttl');
      if ($('hero').dataset.i !== heroWas) fxHero(dir); }
    return;
  }
  const tile = e.target.closest('.tile');
  if (tile){
    const was = gSel; gSel = +tile.dataset.i; snd('tap'); renderHero(); for (const b of $('gPanel').querySelectorAll('.tile')) b.classList.toggle('sel', +b.dataset.i === gSel);
    fxRestart(tile, 'fxpick'); if (gSel !== was) fxHero(gSel > was ? 1 : -1, true);
    return;
  }
  const a = e.target.closest('[data-act]'); if (!a) return;
  const act = a.dataset.act, hi = +$('hero').dataset.i, m0 = save.money;
  if (act === 'ride'){ save.car = hi; writeSave(); snd('ride'); renderGarage(); fxGot(hi, false); }
  else if (act === 'buy'){ const c = CARS[hi]; if (save.owned[hi] || save.money < c.price) return; save.money -= c.price; save.owned[hi] = true; save.car = hi; writeSave(); snd('buy'); toast(`${c.name}を買った`); renderGarage(); fxGot(hi, true); fxCount($('gMoney'), save.money, m0); }
  else if (act === 'short'){ snd('denied'); toast(`あと ${fmt(CARS[hi].price - save.money)} コイン`); fxRestart(a, 'fxshake'); }
  else if (act === 'need'){ snd('denied'); toast(`称号「${titleName(CARS[hi].need)}」で解禁`); fxRestart(a, 'fxshake'); }
  else if (act === 'pt-buy'){   // one more point for this car
    const ci = save.car, n = save.pts[ci] || 0, price = ptPrice(n, ci);
    if (price === null) return;
    if (save.money < price){ snd('denied'); toast(`あと ${fmt(price - save.money)} コイン`); fxRestart(a, 'fxshake'); return; }
    save.money -= price; save.pts[ci] = n + 1; writeSave(); snd('ptBuy'); renderGarage();
    if (!RM()){ fxRestart($('gPanel').querySelectorAll('.pts i')[n], 'fxpop'); bayFx('lift'); fxCount($('gMoney'), save.money, m0); }
  }
  else if (act === 'st-add' || act === 'st-sub'){   // move one point into or out of a stat
    const ci = save.car, U = save.up[ci], k = a.dataset.k, lv = U[k] || 0, add = act === 'st-add';
    if (add ? (lv >= STAT_MAX || ptUsed(ci) >= (save.pts[ci] || 0)) : lv <= 0) return;
    U[k] = lv + (add ? 1 : -1); writeSave(); snd(!add ? 'unbolt' : U[k] >= STAT_MAX ? 'statMax' : 'ratchet'); renderGarage();
    const row = $('gPanel').querySelector(`.up[data-k="${k}"]`);
    if (!RM() && row){ fxRestart(row, add && U[k] >= STAT_MAX ? 'fxbuy' : 'fxpick'); if (add) fxRestart(row.querySelectorAll('.pips i.on')[lv], 'fxpop'); bayFx('rattle');
      fxRestart($('gPanel').querySelectorAll('.stats li')[{eng:0, body:1, boost:2, ram:3}[k]], 'fxpick'); }
  }
  else if (act === 'respec'){   // all points back to the pool (free)
    const ci = save.car; if (!ptUsed(ci)) return;
    for (const it of UPGRADES) save.up[ci][it.key] = 0; writeSave(); snd('respec'); renderGarage();
    if (!RM()){ bayFx('rattle'); tilesIn($('gPanel'), '.pts i'); }
  }
});
$('townPrev').addEventListener('click', () => { if (garageFresh()) return; save.town = (save.town + TOWNS.length - 1) % TOWNS.length; writeSave(); snd('tap'); renderTown(); if (gTab === 'mis'){ renderPanel(); fxIn($('gPanel'), -1); } fxIn($('town').children[1], -1, true); });
$('townNext').addEventListener('click', () => { if (garageFresh()) return; save.town = (save.town + 1) % TOWNS.length; writeSave(); snd('tap'); renderTown(); if (gTab === 'mis'){ renderPanel(); fxIn($('gPanel'), 1); } fxIn($('town').children[1], 1, true); });
$('go').addEventListener('click', () => {
  if (garageFresh()) return;
  if (!townOpen(save.town)){ snd('denied'); toast(`${TOWNS[save.town - 1].name}をにげきると開く`); fxRestart($('go'), 'fxshake'); return; }
  snd('tap'); startRun(); fxGo();
});
$('openSet').addEventListener('click', () => { if (garageFresh()) return; snd('tap'); syncSw(); $('wipe').hidden = false; $('wipeAsk').hidden = true; openOv('setOv'); });
/* Game Center (iOS app only・ios-kobo の GameBridge): the best one-run score goes to the ranking, the trophy in the garage opens it.
   The trophy shows only once the player is signed in (window.APP_GAMECENTER === true, announced by the 'app-gamecenter' event) */
function gcScore(){ try { if (window.APP_GAMECENTER === true && window.APP_SCORE && save.hiScore > 0) window.APP_SCORE(save.hiScore); } catch(e){} }
function gcSync(){ $('openRank').hidden = window.APP_GAMECENTER !== true; gcScore(); }
window.addEventListener('app-gamecenter', gcSync);
$('openRank').addEventListener('click', () => { if (garageFresh()) return; snd('tap'); try { if (window.APP_RANKING) window.APP_RANKING(); } catch(e){} });
$('closeSet').addEventListener('click', () => { snd('tap'); closeOv('setOv'); });
$('swSe').addEventListener('click', e => { setSound('se', !save.se); fxRestart(e.currentTarget, 'fxpick'); });
$('pSe').addEventListener('click', e => { setSound('se', !save.se); fxRestart(e.currentTarget, 'fxpick'); });
$('swBgm').addEventListener('click', e => { setSound('bgm', !save.bgm); fxRestart(e.currentTarget, 'fxpick'); });
$('pBgm').addEventListener('click', e => { setSound('bgm', !save.bgm); fxRestart(e.currentTarget, 'fxpick'); });
$('wipe').addEventListener('click', () => { snd('tap'); $('wipe').hidden = true; $('wipeAsk').hidden = false; fxRestart($('wipeAsk'), 'fxpop'); });
$('wipeNo').addEventListener('click', () => { snd('tap'); $('wipe').hidden = false; $('wipeAsk').hidden = true; fxRestart($('wipe'), 'fxpop'); });
$('wipeYes').addEventListener('click', () => {
  const se = save.se, bgm = save.bgm, tut = save.tutDone; save = freshSave(); save.se = se; save.bgm = bgm; save.tutDone = tut; writeSave();  // sound settings and the seen how-to cards stay
  $('wipe').hidden = false; $('wipeAsk').hidden = true; closeOv('setOv'); gTab = 'car'; gSel = 0; renderGarage(); toast('データを消した'); fxHero(1, true); tilesIn($('gPanel'), '.tile');
});
document.addEventListener('visibilitychange', () => { if (document.hidden){ pauseGame(); sndDo(R => R.suspend()); } else { sndDo(R => R.resume()); if (state === 'garage') renderGarage(); } });
window.addEventListener('pagehide', () => pauseGame());
const unlockAudio = () => sndDo(R => { R.unlock(); if (!audioOn){ audioOn = true; R.setSe(save.se); R.setBgm(save.bgm); if (curSong) R.music(curSong); } });
window.addEventListener('pointerdown', unlockAudio, true); window.addEventListener('touchend', unlockAudio, true); window.addEventListener('keydown', unlockAudio, true);

/* ---------- loop & boot ---------- */
let last = 0, rafPrev = 0, rafEma = 16.7;
function frame(ts){
  if (shotHold){ requestAnimationFrame(frame); return; }   // a screenshot scene stands still
  /* 120 Hz screens (iPad Pro, new iPhone Pro): play at ~60 fps, half the work. 60 / 90 Hz screens are untouched. */
  const gap = ts - rafPrev; rafPrev = ts; if (gap > 0 && gap < 40) rafEma += (gap - rafEma) * 0.05;
  if (last && rafEma < 10 && ts - last < 12.5 && (state === 'play' || state === 'ending')){ requestAnimationFrame(frame); return; }
  const dt = last ? Math.min(0.033, (ts - last) / 1000) : 0.016; last = ts;
  let gdt = dt;
  if (state !== 'play' && state !== 'ending'){ hitStopT = slowMoT = 0; }
  else if (hitStopT > 0){ hitStopT -= dt; gdt = 0; } else if (slowMoT > 0){ slowMoT -= dt; gdt = dt * 0.3; }
  if (slowCool > 0) slowCool -= dt;
  // the close-up rises during the hit-stop, holds, and is back to normal by the end of the slow motion, so nothing slides when full speed returns (11/17)
  zoomK += ((hitStopT > 0 ? 1 : slowMoT > 0 ? Math.min(1, slowMoT / 0.2) : 0) - zoomK) * Math.min(1, dt * 16);
  if (state === 'play' || state === 'ending'){ if (gdt > 0) update(gdt); draw(); if (state === 'play'){ hud(dt); tickHint(dt); sndDo(R => R.engine(Math.min(1.6, -P.vy / 150), boosting, flowK)); } }
  requestAnimationFrame(frame);
}
/* an autopilot that dodges traffic: balance runs (__butto.sim) and the App Store screenshot scenes */
function autoDrive(sec, opt){
  opt = opt || {}; const dt = 1/60, stopAt = t + sec; let lastRes = null;
  while ((state === 'play' || state === 'ending') && t < stopAt){
    if (state === 'play'){
      const half = halfAt(dist), lim = half - P.w/2 - 2; let best = P.x, bs = -1e9;
      for (let x = -lim; x <= lim; x += 8){
        let free = 420;
        for (const c of cars){ const ahead = P.y - c.y; if (ahead < -10 || ahead > 420) continue; if (c.role === 'chaser' && c.state === 'drive' && !c.boss) continue;
          if (Math.abs(c.x - x) < (c.w + P.w)/2 + 6) free = Math.min(free, ahead - (c.opp ? 120 : 0)); }
        for (const sp of spikes){ const ahead = P.y - sp.y; if (ahead > 0 && ahead < 300 && Math.abs(sp.x - x) < sp.w/2 + P.w/2 + 4) free = Math.min(free, ahead); }
        for (const w of works){ const ahead = P.y - w.y1; if (ahead < w.y0 - w.y1 - 10 || ahead > 420) continue; if (x + P.w/2 + 4 > w.x0 && x - P.w/2 - 4 < w.x1) free = Math.min(free, Math.max(0, ahead)); }
        for (const p of ice){ const ahead = P.y - p.y; if (ahead > -p.h/2 && ahead < 200 && Math.abs(p.x - x) < p.w/2 + 4) free -= 60; }
        const sc = free - Math.abs(x - P.x) * 0.25 + (opt.wild ? Math.random() * 40 : 0);
        if (sc > bs){ bs = sc; best = x; }
      }
      targetX = best;
      if (boost >= 100 && (boss || cars.some(c => c.role === 'chaser' && c.state === 'drive' && Math.abs(c.y - P.y) < 160))) tryBoost();
    }
    update(dt);
  }
  return {dmg:Object.fromEntries(Object.entries(dmgBy).map(([k, v]) => [k, Math.round(v)])), town:townI, end:endKind || state, dist:Math.round(dist), score:runScore(), take:takeN, boss:bossN, traf:trafN, near:nearN, time:Math.round(t), star:maxStar, ko:Object.assign({}, ko), ice:iceN, hp:Math.round(P.hp)};
}
/* local test hook (only when the file is opened from disk, never on the published page or in the iOS app) */
if (location.protocol === 'file:' && !window.APP_PLATFORM) window.__butto = {
  get: () => ({x:P ? Math.round(P.x) : 0, camping, state, dist:Math.round(dist), townI, star, boss:!!boss, money:save.money, coins:runCoins(), hp:P && Math.round(P.hp), endKind, t:Math.round(t),
    chase:P ? cars.filter(c => c.role === 'chaser' && c.state === 'drive' && Math.abs(c.y - P.y) < 260).length : 0, nitro:boosting, bossDy:boss && P ? Math.round(boss.y - P.y) : null}),
  save: () => save, load: o => { useSave(o); writeSave(); },
  start: i => { save.town = i; startRun(); }, garage: () => openGarage(), pause: () => pauseGame(),
  sim: autoDrive
};
/* App Store screenshots (ios-kobo の shots.py・file: で開いたときだけ。アプリで遊ぶ人には出ない): `#shot=<場面>:<街>:<秒>:<車>` puts the game into
   a fixed scene on a demo save that is never written, and holds it still. Math.random can be seeded before the hash is set (app.json の js),
   so the same picture comes out every time.
     run    … 街 <街> を <秒> だけ自動運転で走ったところ      nitro … 同じく走ってから、ニトロの衝撃波
     boss   … ボスが出てから <秒> たったところ             result … 街の終わりまで自動で走ったリザルト
     garage … ガレージ（<街> の数がタブ：0 車・1 強化・2 ミッション・3 称号） */
let shotHold = false;
function shotSave(car){
  const s = freshSave();
  Object.assign(s, {money:38450, best:5600, hiScore:21800, plays:40, clears:9, tutDone:true, car, town:0});
  s.owned = CARS.map((c, i) => i <= 6 || i === 10 || i === car);
  s.pts = CARS.map((c, i) => s.owned[i] ? 7 : 0);
  s.up = CARS.map((c, i) => s.owned[i] ? {eng:2, body:3, boost:1, ram:1} : {eng:0, body:0, boost:0, ram:0});
  s.carRank = CARS.map((c, i) => s.owned[i] ? (i < 2 ? 'S' : 'A') : '');
  s.gold = CARS.map((c, i) => i < 2);
  s.towns = TOWNS.map((T, i) => i < 3 ? {clear:true, rank:i < 2 ? 'A' : 'B', best:T.ranks[i < 2 ? 1 : 2], mis:[true, i < 2, i === 0]} : freshTown());
  TITLES.slice(0, 8).forEach(T => { s.titles[T.id] = true; });
  return s;
}
function runShot(){
  const m = /^#shot=([a-z]+)(?::(\d+))?(?::(\d+(?:\.\d+)?))?(?::(\d+))?$/.exec(location.hash);
  if (!m) return;
  const kind = m[1], ti = Math.min(TOWNS.length - 1, +(m[2] || 0)), sec = +(m[3] || 0), carI = Math.min(CARS.length - 1, +(m[4] || 0));
  shotOn = true; shotHold = false; clearTimeout(titleTimer);
  useSave(shotSave(carI)); setTown(ti);
  if (kind === 'garage'){ openGarage(); gTab = ['car', 'up', 'mis', 'title'][ti] || 'car'; renderGarage(); return; }
  save.town = ti; startRun(ti);
  if (kind === 'boss'){ for (let i = 0; i < 600 && !boss && state === 'play'; i++) autoDrive(0.5); autoDrive(sec || 3); }
  else if (kind === 'nitro'){ autoDrive(sec || 15); if (state === 'play'){ boost = 100; tryBoost(); autoDrive(0.2); } }
  else if (kind === 'result'){ autoDrive(900); return; }
  else autoDrive(sec || 20);
  if (state !== 'play') return;
  hudT = 0; hud(0); draw(); $('banner').classList.remove('show'); shotHold = true;
}
function boot(data){
  loadSave();
  if (data && data.save && typeof data.save === 'object') useSave(data.save);
  setTown(townOpen(save.town) ? save.town : 0); syncSw();
  sndDo(R => { R.setSe(save.se); R.setBgm(save.bgm); });
  resize(); resetWorld(); draw();
  if (document.fonts && document.fonts.load) document.fonts.load('400 16px "Dela Gothic One"').then(() => { if (state !== 'play' && state !== 'ending') draw(); }).catch(() => {});
  requestAnimationFrame(frame);
  showTitle(); gcSync();
  if (location.protocol === 'file:'){ window.addEventListener('hashchange', runShot); if (location.hash) runShot(); }
}
try { const hk = window.claude && window.claude.hot; if (hk && typeof hk.snapshot === 'function') hk.snapshot(() => ({save})); } catch(e){}
const hot = window.claude && window.claude.hot;
if (hot && typeof hot.ready === 'function') hot.ready(boot); else boot((hot && hot.data) || {});
})();
