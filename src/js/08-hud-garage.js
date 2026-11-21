/* ---------- HUD & menu ---------- */
const hProg = $('hProg'), danger = $('danger'), nitroFx = $('nitroFx');
const bbFill = $('bbFill'), bbHint = $('bbHint'), bbBar = $('boostBar'), bossHpEl = $('bossHp'), bossLeft = $('bossLeft');
function hud(dt){
  hudT -= dt; if (hudT > 0) return; hudT = 0.08;
  { let n = 0; for (const c of cars) if (c.role === 'chaser' && c.state === 'drive' && c.plan !== 'gone' && Math.abs(c.y - P.y) < 380) n++;
    const lv = undercover() ? 0 : Math.min(1, n / 4); sndDo(R => R.siren(lv)); }
  // body condition shows on the car (smoke, then fire) and as a red rim when it gets low
  const hp = P.hp / P.maxHp, low = hp < 0.3 ? (reduceMotion ? 0.7 : 0.55 + 0.35*Math.sin(t*7)) : hp < 0.5 ? 0.28 : 0;
  danger.style.opacity = boosting ? 0 : Math.max(low, hurtT > 0 ? 0.65 : 0);
  hProg.style.width = Math.min(100, dist / GOAL * 100) + '%';
  if (boss){ const B = boss.boss; bossHpEl.style.width = (B.hp / B.max * 100) + '%'; bossLeft.textContent = `あと ${Math.max(0, Math.ceil(BOSSES[B.i].to - dist))}m で去る`; }
  const cool = coolT > 0 && !boosting;
  bbFill.style.width = (cool ? coolT / OVERHEAT_T * 100 : boost) + '%'; // while it cools, a pale bar drains away
  bbBar.classList.toggle('ready', !boosting && boost >= 100);
  bbBar.classList.toggle('on', boosting);
  bbBar.classList.toggle('cool', cool);
  nitroFx.classList.toggle('on', boosting);
  bbHint.textContent = boosting ? 'ニトロ中！ 無敵で突っ走れ！' : boost >= 100 ? 'ニトロ満タン！ タップ！' : cool ? `オーバーヒート… あと${Math.ceil(coolT)}秒` : P.slowT > 0 ? 'パンク中… すぐ直るよ' : camping && !undercover() ? '目立ってる！ 車線を変えよう' : wrongWay ? '逆走でたまってる…' : P.key === 'ppolice' ? (noticeT > 0 ? `バレてる！ あと${Math.ceil(noticeT)}秒` : 'まぎれこみ中… ぶつけるとバレる') : 'すれすれ・逆走・ぶつけてたまる';
}

const ICONS = {
  eng:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M13.5 2 4.5 13.5h6L9.5 22l9-11.5h-6z"/></svg>',
  body:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2 4 5.2v6.1c0 5 3.4 9.3 8 10.7 4.6-1.4 8-5.7 8-10.7V5.2z"/></svg>',
  boost:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12.6 2c.6 3.6 5.4 6 5.4 11.3a6 6 0 0 1-12 .3c0-2.6 1.3-4.4 2.7-5.6-.1 2.3.9 3.6 2.2 3.9-.4-3.6-.1-7 1.7-9.9z"/></svg>',
  ram:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2l2.4 5.2 5.6-1.4-2.6 5.2 4.6 3.4-5.7.6.3 5.8L12 17.8l-4.6 3 .3-5.8-5.7-.6 4.6-3.4L4 5.8l5.6 1.4z"/></svg>',
};
const pipsHtml = (n, max) => Array.from({length:max}, (_, i) => `<i class="${i < n ? 'on' : ''}"></i>`).join('');
/* the shop's car pictures reuse the game's own toy-car drawing */
function carPic(cv, c, hide){
  const dpr = Math.min(3, window.devicePixelRatio || 1), w = cv.clientWidth || 100, h = cv.clientHeight || 96;
  cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr);
  // the car is drawn on its own layer first, so a car you don't have yet can turn into a black silhouette
  const oc = document.createElement('canvas'); oc.width = cv.width; oc.height = cv.height;
  const main = ctx; ctx = oc.getContext('2d');
  try {
    const ext = c.key === 'ptank' ? c.h * 1.5 : c.key === 'rocket' ? c.h + 14 : c.h;
    const base = Math.max(44, ext), k = Math.min((h - 16) / base, Math.max(4.2, h * 0.55 / base), (w - 24) / c.w), oy = c.key === 'ptank' ? c.h * 0.24 * k : 0;
    ctx.setTransform(dpr*k, 0, 0, dpr*k, dpr*w/2, dpr*(h/2 + oy));
    if (!hide) shadowBox(c.w, c.h, 3, 4);
    drawVehicle(c.key, c.w, c.h, c.color);
    if (hide){ ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalCompositeOperation = 'source-in'; ctx.fillStyle = '#17202b'; ctx.fillRect(0, 0, oc.width, oc.height); }
  } finally { ctx = main; }
  const g = cv.getContext('2d');
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  g.fillStyle = 'rgba(255,255,255,0.35)';
  for (let y = 4; y < h; y += 20){ g.fillRect(10, y, 2, 10); g.fillRect(w - 12, y, 2, 10); }
  g.setTransform(1, 0, 0, 1, 0, 0); g.drawImage(oc, 0, 0);
}
const titleName = id => (TITLES.find(T => T.id === id) || {}).name || '';
/* ---------- motion (11/17): shoot's fx moves plus a car feel (speed lines, a braking lean, a ガシャン) ----------
   one-shot moves only, named fx…; nothing loops or keeps swelling, no panel rises from below.
   What a tap does happens at once; the moves are only a picture on top. RM() (reduced motion, or window.__NOFX in tests) turns them off */
const RM = () => reduceMotion || !!window.__NOFX;
function fxRestart(e, c){ if (!e || RM()) return; e.classList.remove(c); void e.offsetWidth; e.classList.add(c); }
// a finished fx class comes off again, so :active presses and later moves work as before
// (fxclose stays on: it is the copy of a sheet driving away, and dropping it would flash the sheet back for a frame — 11/17 しょーくん「閉じた瞬間ちらつく」)
document.addEventListener('animationend', e => { if (!e.pseudoElement && /^fx/.test(e.animationName)) for (const c of [...e.target.classList]) if (/^fx/.test(c) && c !== 'fxclose') e.target.classList.remove(c); });
// speed lines: thin streaks that shoot once across a box. dir -1 = the thing moves left (it came in from the right)
const FX_LINES = [[.1, .5, 0], [.24, .8, .04], [.38, .42, .08], [.52, .9, .02], [.66, .55, .06], [.8, .72, .03], [.92, .38, .09]];
function fxLines(r, dir, dark){
  if (RM() || !r || r.height < 1) return;
  const box = document.createElement('div'); box.className = 'fxlines ' + (dir < 0 ? 'l' : 'r') + (dark ? ' dk' : ''); box.setAttribute('aria-hidden', 'true');
  box.style.cssText = `left:${r.left}px;top:${r.top}px;width:${r.width}px;height:${r.height}px`;
  box.innerHTML = FX_LINES.map(([y, w, d]) => `<i style="top:${(y * 100).toFixed(0)}%;width:${(w * 55).toFixed(0)}%;animation-delay:${d}s"></i>`).join('');
  document.body.appendChild(box); setTimeout(() => box.remove(), 480);
}
// slide a box in from the side it was asked for (dir 1 = from the right), with speed lines behind it
function fxIn(e, dir, lines, dark){
  if (RM() || !e) return;
  e.classList.remove('fxinr', 'fxinl'); const r = e.getBoundingClientRect();
  fxRestart(e, dir < 0 ? 'fxinl' : 'fxinr'); if (lines) fxLines(r, -dir, dark);
}
// tiles are laid from the top left, row + column a little later each (0.4 s at most; off-screen ones are left alone)
function tilesIn(box, sel){
  if (RM() || !box) return;
  const items = [...box.querySelectorAll(sel)]; if (!items.length) return;
  const rs = items.map(e => e.getBoundingClientRect()), tops = [...new Set(rs.map(r => Math.round(r.top)))].sort((a, b) => a - b), lefts = [...new Set(rs.map(r => Math.round(r.left)))].sort((a, b) => a - b);
  items.forEach((e, k) => { const r = rs[k]; if (r.height < 1 || r.top > innerHeight + 20) return;
    e.style.setProperty('--d', Math.min(0.4, (tops.indexOf(Math.round(r.top)) + lefts.indexOf(Math.round(r.left))) * 0.04) + 's'); fxRestart(e, 'fxtile'); });
}
// a number counts up (from 0) or rolls (from → to); the last frame is always the real text
function fxCount(e, to, from, delay, ms){
  if (RM() || !e) return;
  from = from || 0; if (from === to) return;
  const t0 = performance.now() + (delay || 0), dur = ms || 420, end = e.textContent;
  e.textContent = fmt(from);
  const step = () => { if (!e.isConnected) return; const p = Math.min(1, Math.max(0, (performance.now() - t0) / dur));
    if (p >= 1){ e.textContent = end; return; } e.textContent = fmt(Math.round(from + (to - from) * (1 - Math.pow(1 - p, 3)))); requestAnimationFrame(step); };
  requestAnimationFrame(step);
}
// sheets (settings / pause): drive in from the right and brake; on closing a copy drives off to the left
function openOv(id){
  const ov = $(id), was = !ov.hidden; ov.hidden = false;
  if (RM() || was) return;
  const sh = ov.querySelector('.sheet'); sh.classList.remove('fxdrive'); const r = sh.getBoundingClientRect();
  fxRestart(ov, 'fxbg'); fxRestart(sh, 'fxdrive'); setTimeout(() => fxLines(r, -1), 90);
}
function closeOv(id){
  const ov = $(id); if (ov.hidden) return;
  if (!RM()){
    const g = ov.cloneNode(true); g.removeAttribute('id'); g.querySelectorAll('[id]').forEach(e => e.removeAttribute('id'));
    g.classList.remove('fxbg'); g.classList.add('fxclose'); g.setAttribute('aria-hidden', 'true');
    g.querySelectorAll('[class*="fx"]').forEach(e => { for (const c of [...e.classList]) if (/^fx/.test(c)) e.classList.remove(c); });
    g.addEventListener('animationend', e => { if (e.target === g) g.remove(); });
    document.body.appendChild(g); setTimeout(() => g.remove(), 400);
  }
  ov.hidden = true;
}
// a run starts: streaks race down the screen once
function fxGo(){
  if (RM()) return;
  const box = document.createElement('div'); box.className = 'fxgo'; box.setAttribute('aria-hidden', 'true');
  box.innerHTML = [8, 19, 31, 44, 57, 69, 81, 92].map((x, k) => `<i style="left:${x}%;animation-delay:${(k * 37 % 90) / 1000}s;height:${18 + (k * 13 % 16)}vh"></i>`).join('');
  document.body.appendChild(box); setTimeout(() => box.remove(), 520);
}
/* ---------- garage ---------- */
const fmt = n => Math.round(n).toLocaleString();
let gTab = 'car', gSel = 0, pendingTown = null, garageAt = 0;
/* the garage ignores taps for a moment after it opens: the second tap of a quick double tap on 「ガレージ」 would land on 「しゅっぱつ！」 below it */
const garageFresh = () => performance.now() - garageAt < 450;
function carState(i){
  if (i === save.car) return 'riding';
  if (save.owned[i]) return 'owned';
  const c = CARS[i];
  if (c.need && !save.titles[c.need]) return 'need';
  return save.money >= c.price ? 'buyable' : 'short';
}
const isSil = st => st === 'short' || st === 'need';
const rankChip = r => r ? `<i class="rk rank-${r}">${r}</i>` : '';
const LOCK = '<svg viewBox="0 0 24 24" width="15" height="15" aria-hidden="true" style="vertical-align:-2px;margin-right:4px;fill:currentColor"><path d="M7 10V7a5 5 0 0 1 10 0v3h1a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1v-9a1 1 0 0 1 1-1zm2 0h6V7a3 3 0 0 0-6 0z"/></svg>';
function renderHero(){
  const i = gTab === 'car' ? gSel : save.car, c = CARS[i], st = carState(i), sil = isSil(st), el = $('hero');
  const best = save.carBest[i] || 0;
  const bestHtml = best > 0 ? `ベスト ${rankChip(save.carRank[i])}<b>${fmt(best)}</b>${save.gold[i] ? '<i class="gd">金</i>' : ''}` : (sil ? '' : '記録なし');
  let btn;
  if (st === 'riding') btn = '<button type="button" class="act now" data-act="none">のってる</button>';
  else if (st === 'owned') btn = '<button type="button" class="act ride" data-act="ride">のる</button>';
  else if (st === 'buyable') btn = `<button type="button" class="act buy" data-act="buy">買う ${fmt(c.price)}</button>`;
  else if (st === 'need') btn = `<button type="button" class="act need" data-act="need">称号「${titleName(c.need)}」で解禁</button>`;
  else btn = `<button type="button" class="act" data-act="short">あと ${fmt(c.price - save.money)} コイン</button>`;
  el.className = 'hero st-' + st; el.dataset.i = i;
  el.innerHTML = `<div class="pic"><canvas class="hpic" aria-hidden="true"></canvas></div><div class="info"><h3>${sil ? '？？？' : c.name}</h3>` +
    `<div class="meters"><div class="meter"><span>はやさ</span><span class="pips" role="img" aria-label="はやさ ${c.sp} / 5">${pipsHtml(c.sp, 5)}</span></div>` +
    `<div class="meter"><span>かたさ</span><span class="pips" role="img" aria-label="かたさ ${c.hd} / 5">${pipsHtml(c.hd, 5)}</span></div></div>` +
    `<p class="skill">${c.short}</p><p class="best">${bestHtml}</p>${btn}</div>`;
  carPic(el.querySelector('canvas'), c, sil);
}
function renderPanel(){
  const p = $('gPanel'), ti = save.town;
  if (gTab === 'car'){
    let gold = 0;
    p.innerHTML = '<ul class="grid">' + CARS.map((c, i) => {
      const st = carState(i); if (save.gold[i]) gold++;
      const lab = st === 'riding' ? 'のってる' : st === 'owned' ? 'もってる' : st === 'buyable' ? fmt(c.price) : '？？？';
      return `<li><button type="button" class="tile st-${st}${i === gSel ? ' sel' : ''}" data-i="${i}" aria-label="${isSil(st) ? 'まだの車' : c.name}"><canvas aria-hidden="true"></canvas><span>${lab}</span>${save.gold[i] ? '<i class="gd">金</i>' : ''}</button></li>`;
    }).join('') + `</ul><p class="gnote">金のしるし ${gold} / ${CARS.length}・Sランクでつく</p>`;
    p.querySelectorAll('.tile').forEach(b => { const i = +b.dataset.i; carPic(b.querySelector('canvas'), CARS[i], isSil(carState(i))); });
  } else if (gTab === 'up'){
    // the tuning bay: buy points (dots), spread them with ± (one stat full + 2 more at most), move them again for free
    const ci = save.car, U = save.up[ci], pts = save.pts[ci] || 0, used = ptUsed(ci), free = pts - used, price = ptPrice(pts, ci);
    const dots = Array.from({length:PT_MAX}, (_, i) => `<i class="${i < used ? 'used' : i < pts ? 'free' : ''}"></i>`).join('');
    const buy = price === null ? '<button type="button" class="act now" data-act="none" disabled>さいだい</button>' : `<button type="button" class="act ${save.money >= price ? 'buy' : ''}" data-act="pt-buy">ポイント<b>${fmt(price)}</b></button>`;
    p.innerHTML = `<div class="bay"><canvas id="bayCv" role="img" aria-label="${car().name}"></canvas></div>` +
      `<div class="ptbar"><span class="pts" role="img" aria-label="ポイント ${used} / ${pts}">${dots}</span>${buy}<button type="button" class="act respec" data-act="respec" aria-label="ふりなおし"${used ? '' : ' disabled'}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12a8 8 0 1 0 2.4-5.7"/><path d="M4 4v4.5h4.5"/></svg></button></div>` +
      '<ul class="ups">' + UPGRADES.map(it => { const lv = U[it.key] || 0;
        return `<li class="up${lv >= STAT_MAX ? ' full' : ''}" data-k="${it.key}"><span class="ic ${it.key}">${ICONS[it.key]}</span><div class="up-t"><b>${it.name}</b><span class="pips" role="img" aria-label="レベル ${lv} / ${STAT_MAX}">${pipsHtml(lv, STAT_MAX)}</span><small>${it.desc(lv)}</small></div>` +
          `<span class="pm"><button type="button" class="sub" data-act="st-sub" data-k="${it.key}" aria-label="${it.name}を下げる"${lv ? '' : ' disabled'}>−</button><button type="button" data-act="st-add" data-k="${it.key}" aria-label="${it.name}を上げる"${free > 0 && lv < STAT_MAX ? '' : ' disabled'}>＋</button></span></li>`; }).join('') + '</ul>' + nowStats();
    drawBay($('bayCv'), car());
  } else if (gTab === 'mis'){
    const T = save.towns[ti], open = townOpen(ti), D = dailyState();
    const row = (done, text, c, lock) => `<li class="${done ? 'done' : lock ? 'lock' : ''}"><i>${done ? '✓' : ''}</i><span>${text}</span><em>${done ? '' : '+' + fmt(c)}</em></li>`;
    let stars = 0; for (let i = 0; i < TOWNS.length; i++) stars += townStars(i);
    const left = 24 - new Date().getHours();
    p.innerHTML = `<section class="mis-sec"><h3>街のミッション <small>${TOWNS[ti].name}・1度だけ</small></h3><ul class="mlist">${TOWN_MIS[ti].map((m, k) => row(T.mis[k], m.t, m.c, !open)).join('')}</ul></section>` +
      `<section class="mis-sec"><h3>今日のミッション <small>あと${left}時間で入れかわり</small></h3><ul class="mlist">${todayMis().map(m => row(D.done[m.id], m.t, m.c)).join('')}</ul></section>` +
      `<section class="mis-sec"><h3>星あつめ <small>★ ${stars} / ${TOWNS.length * 3}</small></h3><ul class="slist">${TOWNS.map((Tn, i) => { const n = townStars(i), R = save.towns[i];
        return `<li><b>${Tn.name}</b><span>${'★'.repeat(n)}${'☆'.repeat(3 - n)}</span><small>${townOpen(i) ? (R.best ? `ベスト ${R.rank} ${fmt(R.best)}` : '記録なし') : 'ロック中'}</small></li>`; }).join('')}</ul></section>`;
  } else {
    p.innerHTML = '<ul class="titles">' + TITLES.map(T => save.titles[T.id] ? `<li class="ttl got"><b>${T.name}</b><span>${phrases(T.hint)}</span></li>` : `<li class="ttl"><b>？？？</b><span>${phrases(T.hint)}</span></li>`).join('') + '</ul>';
  }
  fadeMore(p);
}
/* the tuning bay picture: a toy garage (pegboard with tools, a tiled floor, hazard stripes, a lift) with the car on it, nose to the right */
function drawBay(cv, C){
  if (!cv) return;
  const dpr = Math.min(3, window.devicePixelRatio || 1), w = cv.clientWidth || 300, h = cv.clientHeight || 118;
  cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr);
  const main = ctx; ctx = cv.getContext('2d');
  try {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = '#3a4352'; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = 'rgba(255,255,255,0.05)'; for (let x = 14; x < w; x += 28) ctx.fillRect(x, 22, 1, h);
    ctx.fillStyle = '#d9a86c'; ctx.fillRect(0, 0, w, 22); ctx.fillStyle = 'rgba(0,0,0,0.18)'; ctx.fillRect(0, 21, w, 2);
    ctx.fillStyle = 'rgba(90,55,25,0.35)'; for (let x = 6; x < w; x += 12) circle(x, 6, 1.1);
    const tool = (x, k) => { ctx.fillStyle = k ? '#c9ced6' : '#9aa3ad';
      if (k === 0){ rr(x - 2, 6, 4, 13, 2); ctx.fill(); circle(x, 6, 4); ctx.fillStyle = '#d9a86c'; circle(x, 4.5, 1.8); }       // wrench
      else if (k === 1){ ctx.fillStyle = '#a0522d'; rr(x - 1.5, 8, 3, 12, 1); ctx.fill(); ctx.fillStyle = '#9aa3ad'; rr(x - 6, 5, 12, 4, 1.5); ctx.fill(); }   // hammer
      else { ctx.fillStyle = '#e8735a'; rr(x - 2.5, 5, 5, 7, 2); ctx.fill(); ctx.fillStyle = '#c9ced6'; ctx.fillRect(x - 0.8, 12, 1.6, 8); } };   // screwdriver
    [0.1, 0.2, 0.8, 0.9].forEach((f, i) => tool(w * f, i % 3));
    for (let x = -10, i = 0; x < w + 10; x += 12, i++){ ctx.fillStyle = i % 2 ? '#20242c' : '#ffd24a'; ctx.beginPath(); ctx.moveTo(x, h); ctx.lineTo(x + 6, h - 8); ctx.lineTo(x + 18, h - 8); ctx.lineTo(x + 12, h); ctx.fill(); }
    const cy = 22 + (h - 30) / 2, k = Math.min((h - 46) / C.w, (w * 0.6) / C.h, 3.4);
    ctx.fillStyle = '#5c6470'; rr(w/2 - C.h*k*0.42, cy - C.w*k*0.62, C.h*k*0.16, C.w*k*1.24, 3); ctx.fill(); rr(w/2 + C.h*k*0.26, cy - C.w*k*0.62, C.h*k*0.16, C.w*k*1.24, 3); ctx.fill();
    ctx.setTransform(dpr*k, 0, 0, dpr*k, dpr*w/2, dpr*cy); ctx.rotate(Math.PI / 2);
    shadowBox(C.w, C.h, 3, 4); drawVehicle(C.key, C.w, C.h, C.color); if (!NO_GLOSS[C.key]) toyGloss(C.w, C.h);
  } finally { ctx = main; }
}
// the car rattles (or bounces on the lift) and a few sparks fly while it is being tuned
function bayFx(kind){
  let cv = $('bayCv'); if (RM()) return;
  if (!cv || !cv.offsetParent) cv = $('hero') && $('hero').querySelector('.pic');   // iPad landscape: the car card stands in for the bay
  if (!cv) return;
  fxRestart(cv, kind === 'lift' ? 'fxlift' : 'fxrattle');
  if (kind === 'lift' || cv.id !== 'bayCv') return;
  const bay = cv.parentElement, r = bay.getBoundingClientRect();
  for (let i = 0; i < 6; i++){ const e = document.createElement('i'); e.className = 'spk';
    const a = Math.random() * Math.PI * 2, d = 26 + Math.random() * 34;
    e.style.cssText = `left:${r.width/2 + (Math.random() - 0.5) * r.width * 0.4}px;top:${r.height*0.55 + (Math.random() - 0.5) * 30}px;--dx:${Math.cos(a)*d}px;--dy:${Math.sin(a)*d - 10}px;background:${i % 3 ? '#ffd24a' : '#ffffff'}`;
    bay.appendChild(e); setTimeout(() => e.remove(), 560); }
}
/* the riding car as it is now, upgrades included (same numbers the run uses) */
function nowStats(){
  const C = car(), spd = C.speed + 16 * upLv('eng');  // the four tuned stats, as the run uses them
  const st = (k, v, u) => `<li><span>${k}</span><b>${v}${u ? `<small>${u}</small>` : ''}</b></li>`;
  return `<section class="mis-sec now"><h3>いまの性能 <small>強化こみ</small></h3><ul class="stats">` +
    st('はやさ', kmh(spd), 'km/h') + st('ボディ', Math.round(C.hp * (1 + 0.25 * upLv('body')))) + st('ニトロ', '+' + 18 * upLv('boost'), '%') + st('体当たり', '+' + 10 * upLv('ram'), '%') + '</ul></section>';
}
/* title hints wrap only between phrases (after a particle, before a number), so 「20台」 or 「追っ手」 never split */
function phrases(t){
  const ch = [...t], word = /[\u4e00-\u9fff\u30a0-\u30ff0-9]/, dig = /[0-9]/, hira = /[\u3041-\u309f]/;
  let out = '', cur = '';
  const flush = sep => { if (cur) out += `<span class="ph">${cur}</span>`; out += sep; cur = ''; };
  for (let i = 0; i < ch.length; i++){
    const c = ch[i], n = ch[i + 1] || '';
    if (c === ' '){ flush(' '); continue; }
    cur += c;
    if (n && n !== ' ' && ((/[をでにのがへ]/.test(c) && word.test(n)) || (dig.test(n) && !dig.test(c) && c !== '×') || (/[台回]/.test(c) && dig.test(ch[i - 1] || '') && hira.test(n)))) flush('');
  }
  flush('');
  return out;
}
/* a soft fade at the bottom edge of a list that has more below it */
function fadeMore(el){ el.classList.toggle('more', el.scrollHeight - el.scrollTop - el.clientHeight > (parseFloat(getComputedStyle(el).paddingBottom) || 0) + 2); }
/* after a resize (an iPad turned sideways) the shop's car pictures are drawn again at their new size */
function redrawShop(){
  if ($('garage').hidden) return;
  const hero = $('hero'), hc = hero.querySelector('canvas');
  if (hc){ const i = +hero.dataset.i; carPic(hc, CARS[i], isSil(carState(i))); }
  $('gPanel').querySelectorAll('.tile').forEach(b => { const i = +b.dataset.i; carPic(b.querySelector('canvas'), CARS[i], isSil(carState(i))); });
  fadeMore($('gPanel'));
}
function renderTown(){
  const ti = save.town, T = TOWNS[ti], open = townOpen(ti), n = townStars(ti), R = save.towns[ti];
  $('townNo').textContent = `街 ${ti + 1} / ${TOWNS.length}`;
  $('townName').innerHTML = (open ? '' : LOCK) + T.name;
  $('townStars').innerHTML = open ? `<b>${'★'.repeat(n)}${'☆'.repeat(3 - n)}</b>${R.best ? `　ベスト ${R.rank}` : ''}` : `${TOWNS[ti - 1].name}をにげきると開く`;
  $('town').classList.toggle('locked', !open);
  const g = $('go'); g.classList.toggle('locked', !open); g.textContent = open ? 'しゅっぱつ' : 'ロック中';
}
function renderGarage(){
  $('gMoney').textContent = fmt(save.money);
  for (const b of $('gTabs').children) b.setAttribute('aria-selected', String(b.dataset.tab === gTab));
  document.body.classList.remove('gt-car', 'gt-up', 'gt-mis', 'gt-title'); document.body.classList.add('gt-' + gTab);
  renderHero(); renderPanel(); renderTown(); fadeMore($('gPanel'));
}
function openGarage(){
  state = 'garage'; clearTimeout(resBtnT); garageAt = performance.now();
  if (pendingTown !== null){ save.town = pendingTown; pendingTown = null; writeSave(); }
  $('result').hidden = true; $('title').hidden = true; $('pauseOv').hidden = true; if (!tutThen) $('tut').hidden = true; hideRunUi(); $('garage').hidden = false;
  gTab = 'car'; gSel = save.car; $('gPanel').scrollTop = 0;
  renderGarage(); sndDo(R => R.pauseMuffle(false)); playSong('garage');
  fxHero(1, true); tilesIn($('gPanel'), '.tile');
}
/* got in a car (bought = also a ring around the card): the car lands with a ガシャン and its tile rings */
function fxGot(i, bought){
  if (RM()) return; const h = $('hero');
  fxRestart(h.querySelector('.pic'), 'fxgachan'); if (bought) fxRestart(h, 'fxbuy');
  fxRestart($('gPanel').querySelector(`.tile[data-i="${i}"]`), 'fxbuy');
}
/* the hero card's car drives in from the side it was picked on (dir 1 = from the right); lines = speed lines across the card */
function fxHero(dir, lines){
  if (RM()) return; const h = $('hero'); if (!h || getComputedStyle(h).display === 'none') return;
  const r = h.getBoundingClientRect();
  fxRestart(h.querySelector('.pic'), dir < 0 ? 'fxcarl' : 'fxcarr'); fxIn(h.querySelector('.info'), dir);
  if (lines) fxLines(r, -dir);
}
const titleStats = () => ({clear:endKind === 'clear', boss:bossN, traf:trafN, near:nearN, nearOpp:nearOppN, maxCombo, ko, dmgR:dmgTaken / P.maxHp});
function pickTitle(){
  const st = titleStats();
  let best = null, bv = 1;
  for (const T of TITLES){ if (T.base) continue; const v = T.v(st); if (v >= bv){ bv = v; best = T; } }
  return best || TITLES.find(T => T.id === (st.clear ? 'run' : 'rookie'));
}
function hideRunUi(){
  $('hud').hidden = true; $('boostBar').hidden = true; $('combo').hidden = true; $('bossBar').hidden = true; document.body.classList.remove('bossing'); hideHint();
}
