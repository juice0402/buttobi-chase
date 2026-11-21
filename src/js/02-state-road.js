/* ---------- helpers ---------- */
const clamp = (v,a,b) => v < a ? a : v > b ? b : v;
const rnd = n => { const x = Math.sin(n * 12.9898 + 78.233) * 43758.5453; return x - Math.floor(x); };
function pickW(obj){ let sum = 0; for (const k in obj) sum += obj[k]; let r = Math.random() * sum; for (const k in obj){ r -= obj[k]; if (r <= 0) return k; } return Object.keys(obj)[0]; }
function areaIndexAt(d){ let i = 0; for (let k = 0; k < AREAS.length; k++) if (d >= AREAS[k].from) i = k; return i; }
function halfAt(d){ d = Math.max(0, d); const i = areaIndexAt(d), a = AREAS[i]; if (i === 0) return a.half; const p = AREAS[i-1]; const q = Math.min(1, (d - a.from) / 60); const e = q*q*(3-2*q); return p.half + (a.half - p.half) * e; }
function laneInfo(d){ const a = AREAS[areaIndexAt(Math.max(0,d))], half = halfAt(d); const n = Math.max(2, Math.round(2*half/LANE)); return {a, half, n, lw:2*half/n, nOn:a.opp ? Math.floor(n/2) : 0}; }
const shadeCache = new Map();
function shade(hex, amt){
  const k = hex + amt; let v = shadeCache.get(k); if (v) return v;
  const n = parseInt(hex.slice(1), 16); let r = n >> 16 & 255, g = n >> 8 & 255, b = n & 255;
  const f = amt < 0 ? 0 : 255, p = Math.abs(amt);
  r = Math.round(r + (f - r) * p); g = Math.round(g + (f - g) * p); b = Math.round(b + (f - b) * p);
  v = `rgb(${r},${g},${b})`; shadeCache.set(k, v); return v;
}
function rr(x,y,w,h,r){ r = Math.max(0, Math.min(r, w/2, h/2)); ctx.beginPath(); ctx.moveTo(x+r,y); ctx.arcTo(x+w,y,x+w,y+h,r); ctx.arcTo(x+w,y+h,x,y+h,r); ctx.arcTo(x,y+h,x,y,r); ctx.arcTo(x,y,x+w,y,r); ctx.closePath(); }
function circle(x,y,r){ ctx.beginPath(); ctx.arc(x,y,r,0,Math.PI*2); ctx.fill(); }
function ellipse(x,y,rx,ry){ ctx.beginPath(); ctx.ellipse(x,y,rx,ry,0,0,Math.PI*2); ctx.fill(); }

/* ---------- state ---------- */
let W = 0, H = 0, DPR = 1, safeBottom = 0, s = 1.2;
let state = 'menu';
let P = null, cars = [], heli = null, heliCool = 0, fx = [], pops = [];
let isecs = [], rails = [], stations = [], drums = [], booms = [], cranes = [], ice = [];
let iceN = 0, finalDown = false, maxStar = 1, runMis = new Set(), misQueue = [], misT = 0, misCheckT = 0, onIceNow = false;
let dist = 0, t = 0, heatPts = 0, star = 1, nextChaser = 3, comboN = 0, comboT = 0, maxCombo = 0;
let takeN = 0, takeMoney = 0, trafN = 0, trafMoney = 0, nearN = 0, nearMoney = 0;
let ko = {}, nearOppN = 0, dmgTaken = 0, ownBlast = false, gomiMoney = 0, noticeT = 0, healT = 0;
let spikes = [], boss = null, nextBoss = 0, bossN = 0, bossMoney = 0, bossSeen = 0, spikeNext = 0, pinchNext = 0;
let hurtT = 0, trail = [], trailT = 0, boost = 0, boosting = false, shake = 0, areaIdx = 0, spawnAcc = 0, endT = 0, endKind = null;
let camX = 0, camY = 0, targetX = 0, seen = {}, hudT = 0, wrongWay = false;
let coolT = 0, campX = 0, campT = 0, camping = false, works = [];
let drag = null; const keys = {left:false, right:false};

const SND = () => (window.RaceSound && save.se !== undefined) ? window.RaceSound : null;
function snd(name, a){ try { const R = SND(); if (R) R.se(name, a); } catch(e){} }
function sndDo(fn){ try { const R = SND(); if (R) fn(R); } catch(e){} }
const car = () => CARS[save.car];
const runCoins = () => takeMoney + trafMoney + nearMoney + bossMoney + gomiMoney;
const worldTop = () => camY - H * ANCHOR / s;
const worldBottom = () => camY + H * (1 - ANCHOR) / s;
const boostPow = () => 1.5 + 0.03 * upLv('boost');
const massOf = b => b === P ? (boosting ? b.m * 8 : (b.key === 'muscle' ? b.m * 1.4 : b.m) * ramK()) : b.m;
/* full-speed flow (21回目 しょーくん「しばらく減速せずに進んでたら、スピードエフェクトが出始めて爽快感がほしい」): keep at least 93% of your
   top speed and the speed lines step up at FLOW_T1 and FLOW_T2 seconds (wind, a slight pull-back of the camera). A hit, a slowdown or falling
   under 85% ends it. Pictures and sound only: the speed, the rules and the coins are the same */
const FLOW_T1 = 3, FLOW_T2 = 7, FLOW_ZOOM = 0.05;
let flowT = 0, flowLv = 0, flowK = 0, flowPulse = 0, edgeSmashT = 0, flowGlow = null, streakImg = null;
// one tapered streak picture for the flow speed lines: the head (bottom) bright and round, the tail thin and see-through
function makeStreak(){
  const w = 24, h = 192, c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d');
  const shape = (hw, c0, c1) => { const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, c0); gr.addColorStop(0.7, c1); gr.addColorStop(1, c1); g.fillStyle = gr;
    g.beginPath(); g.moveTo(w/2, 0); g.lineTo(w/2 + hw, h - hw); g.quadraticCurveTo(w/2, h + hw*0.5, w/2 - hw, h - hw); g.closePath(); g.fill(); };
  shape(11, 'rgba(23,50,77,0)', 'rgba(23,50,77,0.16)'); shape(6, 'rgba(255,255,255,0)', 'rgba(255,255,255,0.7)'); shape(2.5, 'rgba(255,255,255,0)', 'rgba(255,255,255,1)');
  return c;
}
const flowBase = () => car().speed + 16 * upLv('eng');
const pSpeed = () => (car().speed + 16 * upLv('eng')) * (boosting ? boostPow() : 1) * (P && P.slowT > 0 ? 0.58 : 1);

const MAX_PX = 3.4e6;
function resize(){
  W = window.innerWidth; H = window.innerHeight;
  DPR = Math.min(2, window.devicePixelRatio || 1, Math.sqrt(MAX_PX / Math.max(1, W * H))); // big iPads: cap the canvas at ~3.4M pixels (dpr 2 would be 5.6M)
  cvs.width = Math.round(W * DPR); cvs.height = Math.round(H * DPR);
  safeBottom = $('safeProbe').offsetHeight || 0;
  // tablets (both sides ≥ 700px): sit the car lower and fit a bit more road so the look-ahead is close to a phone's (~400 of ~440 world units)
  const tablet = Math.min(W, H) >= 700;
  ANCHOR = tablet ? 0.68 : 0.64;
  s = Math.min(W / 320, H / (W > H || tablet ? 600 : 540));
  if (state !== 'play' && state !== 'ending') draw();
  if (state === 'garage') redrawShop();
  if (state === 'result') fadeMore($('rGain'));
}
window.addEventListener('resize', resize);

function mkBody(o){ return Object.assign({vx:0, vy:0, a:0, av:0, state:'drive', air:0, airMax:0, lastHit:null, lastHitT:-9, nm:false, prevRel:null, fire:0, smokeT:0, slowT:0, plan:null}, o); }

function resetWorld(){
  const C = car();
  P = mkBody({role:'player', key:C.key, w:C.w, h:C.h, m:C.m, color:C.color, x:-23, y:0, vy:-C.speed});
  P.maxHp = P.hp = Math.round(C.hp * (1 + 0.25 * upLv('body')));
  cars = []; heli = null; heliCool = 0; fx = []; pops = []; broken.clear(); gcReset();
  dist = 0; t = 0; star = TOWN.start; heatPts = (star - 1) * 100; nextChaser = 7; comboN = 0; comboT = 0; maxCombo = 0;
  iceN = 0; finalDown = false; maxStar = star; runMis = new Set(); misQueue = []; misT = 0; misCheckT = 0; onIceNow = false;
  dmgBy = {}; takeN = 0; takeMoney = 0; trafN = 0; trafMoney = 0; nearN = 0; nearMoney = 0;
  ko = {}; for (const k in KO) ko[k] = 0; nearOppN = 0; dmgTaken = 0; ownBlast = false; P.drumT = 1; gomiMoney = 0; noticeT = 0; healT = 0;
  trail = []; spikes = []; boss = null; nextBoss = 0; bossN = 0; bossMoney = 0; bossSeen = 0; spikeNext = 0; pinchNext = 0;
  boost = 0; boosting = false; shake = 0; areaIdx = 0; spawnAcc = 0; endT = 0; endKind = null;
  camX = 0; camY = 0; targetX = -23; seen = {}; drag = null; wrongWay = false; flowT = 0; flowLv = 0; flowK = 0; flowPulse = 0; edgeSmashT = 0;
  coolT = 0; campX = P.x; campT = 0; camping = false;
  booms = []; buildWorld();
  const a = AREAS[0];
  for (let y = -CALM_D*M; y > worldTop() - 40; y -= a.gap) spawnTraffic(y, Math.random() < a.oppRate * 0.6);
}
/* a calm start: nothing on the road for the first CALM_D metres, then traffic thickens over the next CALM_D metres */
const CALM_D = 150;
function calmSkip(y){ const d = -y / M; if (d < CALM_D) return true; if (d < CALM_D*2) return Math.random() > 0.35 + 0.65 * (d - CALM_D) / CALM_D; return false; }

function spawnTraffic(y, opp){
  const L = laneInfo(-y / M), a = L.a;
  if (opp && !a.opp) opp = false;
  const key = pickW(opp ? a.opp : a.same), T = TRAFFIC[key];
  const nS = L.n - L.nOn, lane = opp ? nS + ((Math.random() * L.nOn) | 0) : (Math.random() * nS) | 0;
  let x = -L.half + (lane + 0.5) * L.lw;
  if (works.length){
    if (!opp && closedAt(x, y, T.w, nS > 1 ? 400 : 700)){ // lane closed here or just ahead: another lane your way, or none
      const alt = []; for (let i = 0; i < nS; i++){ const lx = -L.half + (i + 0.5) * L.lw; if (!closedAt(lx, y, T.w, 400)) alt.push(lx); }
      if (!alt.length) return; x = alt[(Math.random() * alt.length) | 0];
    }
    if (opp && works.some(w => w.alt && y > w.y0 - 140 && y < w.y1 + 100)) return;
  }
  for (const c of cars) if (Math.abs(c.y - y) < (c.h + T.h)/2 + 30 && Math.abs(c.x - x) < (c.w + T.w)/2 + 4) return;
  const sp = opp ? a.ov[0] + Math.random()*(a.ov[1]-a.ov[0]) : a.tv[0] + Math.random()*(a.tv[1]-a.tv[0]);
  cars.push(mkBody({role:'traffic', key, w:T.w, h:T.h, m:T.m, tough:T.tough, color:T.colors[(Math.random()*T.colors.length)|0], x, y, laneX:x, opp, tv:sp, a:opp ? Math.PI : 0, vy:opp ? sp : -sp, look:30 + Math.random()*50}));
}

function spawnChaser(){
  const Hh = HEAT[star-1];
  let n = 0; for (const c of cars) if (c.role === 'chaser' && c.state === 'drive' && !c.boss && c.plan !== 'gone') n++;
  if (n >= Hh.max) return;
  const key = Hh.pool[(Math.random()*Hh.pool.length)|0], C = CHASERS[key];
  const half = halfAt(dist);
  const y = worldBottom() + 60 + Math.random()*100, x = openX(clamp(P.x + (Math.random()*2 - 1) * 40, -half + C.w, half - C.w), y, C.w, 40);
  cars.push(mkBody({role:'chaser', key, w:C.w, h:C.h, m:C.m, x, y, vy:P.vy, aimX:(Math.random()*2-1)*10, think:0, tx:x}));
  if (!seen[key]){ seen[key] = true; toast(`${C.label}が来た！`); }
}

/* ---------- chaser tactics: spikes, pincers, armored boss ---------- */
function newPolice(x, y, extra){ const C = CHASERS.police; x = openX(x, y, C.w, 40); return mkBody(Object.assign({role:'chaser', key:'police', w:C.w, h:C.h, m:C.m, x, y, vy:P.vy, aimX:0, think:0, tx:x}, extra)); }
function startSpiker(){
  let best = null;
  for (const c of cars){
    if (c.role !== 'chaser' || c.state !== 'drive' || c.key !== 'police' || c.plan || c.boss) continue;
    const dy = c.y - P.y; if (dy < 20 || dy > 420) continue;
    if (!best || dy < best.y - P.y) best = c;
  }
  if (!best){ const half = halfAt(dist); best = newPolice(clamp(P.x, -half + 12, half - 12), worldBottom() + 60); cars.push(best); }
  best.plan = 'spike'; best.phase = 'pass'; best.pt = 0; best.sg = P.x < 0 ? 1 : -1;
}
function stripFor(px, d){
  const half = halfAt(d), w = clamp(half*0.84, 44, 84), need = P.w + 16;
  let x = clamp(px, -half + w/2, half - w/2);
  const lg = x - w/2 + half, rg = half - x - w/2;
  if (Math.max(lg, rg) < need) x = lg >= rg ? need - half + w/2 : half - need - w/2;
  return {x, w};
}
function spawnPincers(){
  const C = CHASERS.police, half = halfAt(dist), off = P.w/2 + C.w/2 + 22, lim = half - C.w/2 - 2;
  const pair = [-1, 1].map(sg => newPolice(clamp(P.x + sg*off, -lim, lim), worldBottom() + 70 + Math.random()*30, {plan:'pin', phase:'come', sg, pt:0}));
  pair[0].mate = pair[1]; pair[1].mate = pair[0];
  cars.push(pair[0], pair[1]);
  tip('pinch', 'はさみうち！ ニトロで前にぬけよう', 'はさみうちが来る！'); snd('warn');
}
function spawnBoss(i){
  const B = BOSSES[i], C = CHASERS.armor, half = halfAt(dist), bw = B.w || C.w, bh = B.h || C.h;
  boss = mkBody({role:'chaser', key:'armor', w:bw, h:bh, m:C.m * (B.final ? 1.7 : 1), x:openX(clamp(P.x, -half + bw/2 + 2, half - bw/2 - 2), worldBottom() + 120, bw, 50), y:worldBottom() + 120, vy:P.vy, color:B.color || TOWN.boss.color,
    boss:{i, hp:B.hp, max:B.hp, mode:'hold', mt:1.6, blockAt:t + B.every*0.8, flash:0, sg:1}});
  cars.push(boss); bossSeen++;
  const nm = B.name || TOWN.boss.name;
  banner(B.final ? 'ラスボス！' : 'ボス！'); tip('boss', '装甲車のボス！ 体当たりや爆発でけずろう', `${nm}が来た！`);
  $('bossName').textContent = `${nm} ${i + 1}/${BOSSES.length}`; $('bossBar').hidden = false; document.body.classList.add('bossing');
  snd('bossIn'); sndDo(R => R.boss(true));
}
function hurtBoss(b, dmg){
  if (!b.boss || b.state !== 'drive' || dmg <= 0 || state !== 'play' || b.boss.mode === 'leave') return;
  const B = b.boss; B.hp -= dmg; B.flash = 0.12; if (dmg >= 8) snd('bossHit');
  if (dmg >= 12) pop(b.x, b.y - b.h/2, `-${Math.round(dmg)}`, '#ffc83d');
  burst(b.x + (Math.random() - 0.5)*b.w, b.y + (Math.random() - 0.5)*b.h*0.6, 'spark', Math.min(10, 2 + ((dmg/6)|0)));
  if (B.hp <= 0){ B.hp = 0; defeatBoss(b); }
}
function defeatBoss(b){
  const B = BOSSES[b.boss.i];
  b.state = 'wreck'; b.av = (Math.random() < 0.5 ? -1 : 1) * 2.5; b.air = 0.8; b.airMax = 0.8; b.fire = 6;
  burst(b.x, b.y, 'debris', 8, '#56677d'); burst(b.x, b.y, 'boom', 20); parts(b, 14); rollOver(b); bigCrash(b.x, b.y, true);
  const mult = comboUp();
  const gain = Math.round(B.money * Math.min(2, mult) * CASH_K());
  bossN++; bossMoney += gain; heatPts += 25; addBoost(40); if (B.final) finalDown = true; snd('bossDown');
  pop(b.x, b.y - 34, `ボスげきは！ +${gain}`, '#ffc83d'); banner('げきは！');
  endBoss();
  booms.push({x:b.x, y:b.y, R:130, F:520, credit:true, dmg:6, at:t + 0.05, big:true});
}
function endBoss(){ boss = null; nextBoss++; $('bossBar').hidden = true; document.body.classList.remove('bossing'); sndDo(R => R.boss(false)); }

/* ---------- road features ---------- */
const CARL = 104, TRAIN_LEN = 5*CARL + 4*6, TRAIN_V = 480;
function nearFeature(d, gap){ return ISEC_D.some(v => Math.abs(v - d) < gap) || RAIL_D.some(v => Math.abs(v - d) < gap) || STATION_D.some(v => Math.abs(v[0] - d) < gap) || CRANE_D.some(v => Math.abs(v - d) < gap); }
const CONT_COL = ['#d9483b', '#2f7fc1', '#f0b23e', '#3aa676', '#8a5bd6', '#e7742f'];
function onIce(b){ for (const p of ice) if (Math.abs(b.y - p.y) < p.h/2 && Math.abs(b.x - p.x) < p.w/2) return true; return false; }
function landContainer(c){
  const x0 = c.x, y0 = c.y, hw = c.w/2, hh = 34;
  shake = Math.max(shake, 9); burst(x0, y0, 'debris', 12, '#c9783d'); burst(x0, y0, 'spark', 10); snd('container');
  for (const b of [P, ...cars]){
    if (Math.abs(b.x - x0) > hw + b.w/2 - 2 || Math.abs(b.y - y0) > hh + b.h/2 - 4) continue;
    if (b === P){ if (state !== 'play') continue; if (boosting){ popMe(P.x, P.y - 30, 'へっちゃら！', '#ffc83d'); continue; } damage(35); P.vy *= 0.4; popMe(P.x, P.y - 30, 'ドスン！', '#ffffff'); continue; }
    b.lastHit = 'player'; b.lastHitT = t;
    if (b.boss){ if (b.state === 'drive'){ hurtBoss(b, 160); pop(b.x, b.y - 30, 'コンテナドーン！', '#ffc83d'); } }
    else if (b.state === 'drive') crash(b, 'cont');
    b.vx += (Math.sign(b.x - x0) || 1) * 170;
  }
  cars.push(mkBody({role:'traffic', key:'container', w:c.w, h:hh*2, m:40, tough:1e9, color:c.color, x:x0, y:y0, state:'wreck', fixed:true}));
}
function buildWorld(){
  isecs = ISEC_D.map(d => ({y:-d*M, tl:0.3, tr:0.8}));
  rails = RAIL_D.map(d => ({y:-d*M, state:'idle', fx:-1e9}));
  stations = STATION_D.map(([d, sg]) => ({y:-d*M, sg, alive:true, big:!!TOWN.depot}));
  cranes = CRANE_D.map(d => ({y:-d*M, state:'idle', x:0, w:52, at:0, color:CONT_COL[(Math.random()*CONT_COL.length)|0]}));
  buildWorks();
  ice = [];
  if (TOWN.ice) for (let d = 240; d < GOAL - 80; d += 110 + Math.random()*130){
    if (nearFeature(d, 50)) continue;
    const half = halfAt(d), w = Math.min(half*2 - 10, 46 + Math.random()*70), h = 70 + Math.random()*90;
    ice.push({x:(Math.random()*2 - 1) * Math.max(0, half - w/2 - 4), y:-d*M, w, h});
  }
  drums = [];
  const dStep = TOWN.drums || 160;
  for (let d = 150; d < GOAL - 60; d += dStep + Math.random()*dStep){
    if (nearFeature(d, 45) || works.some(w => d > w.d0 - 15 && d < w.d1 + 15)) continue;
    const sg = Math.random() < 0.5 ? -1 : 1, x = sg * (halfAt(d) - 6), n = 3 + ((Math.random()*2)|0);
    for (let i = 0; i < n; i++) drums.push({x, y:-d*M - i*12, alive:true});
  }
}
/* road works (工事中): every 350–650 m from 300 m on, 1 lane (2 on roads of 5+ lanes) closed for 40–90 m, away from junctions,
   level crossings, cranes and stations, with a warning sign 100 m before. Only lanes going your way are closed and never all of
   them — except on a 2-lane road, where your lane goes and the way through is the oncoming lane (oncoming cars wait at a
   temporary light past the far end until you are through). The barriers are solid for everyone; police see them late. */
function featureIn(a, b){ return ISEC_D.some(v => v > a && v < b) || RAIL_D.some(v => v > a && v < b) || STATION_D.some(v => v[0] > a - 15 && v[0] < b + 15) || CRANE_D.some(v => v > a && v < b); }
function buildWorks(){
  works = [];
  for (let d = 300 + Math.random()*120; d < GOAL - 200; ){
    let w = null;
    for (let d0 = d; d0 < d + 300 && !w; d0 += 20){
      const len = 40 + Math.random()*50, d1 = d0 + len, ai = areaIndexAt(d0);
      if (d1 > GOAL - 150 || areaIndexAt(d1 + 20) !== ai || d0 < AREAS[ai].from + 70) continue;
      if (featureIn(d0 - 45, d1 + 45) || featureIn(d0 - 112, d0 - 88)) continue;
      const L = laneInfo(d0), nS = L.n - L.nOn, k = L.n >= 5 ? 2 : 1;
      // half the time the lanes nearest the middle (that is where a lazy line runs), otherwise any of yours
      const lo = nS <= k ? 0 : Math.random() < 0.5 ? clamp(Math.round(L.n/2 - k/2), 0, nS - k) : (Math.random() * (nS - k + 1)) | 0;
      // open = the way round (the arrow): toward the bigger stretch of lanes going your way; on a 2-lane road, the oncoming lane
      const x0 = -L.half + lo*L.lw, x1 = x0 + k*L.lw, sameL = lo, sameR = nS - lo - k;
      const open = nS === 1 ? 1 : sameR !== sameL ? (sameR > sameL ? 1 : -1) : Math.random() < 0.5 ? -1 : 1;
      w = {d0, d1, y0:-d1*M, y1:-d0*M, x0:lo === 0 ? -L.half - 30 : x0, x1:lo + k === L.n ? L.half + 30 : x1, open, signSide:L.nOn ? -1 : -open, signY:-(d0 - 100)*M, alt:nS === 1, seen:false};
    }
    if (w){ works.push(w); d = w.d0 + 350 + Math.random()*300; } else d += 300;
  }
}
/* the closure in the way of a car of width cw at x, from `ahead` units before its near end to its far end (you drive toward -y) */
function closedAt(x, y, cw, ahead){ for (const w of works) if (y <= w.y1 + ahead && y >= w.y0 - 10 && x + cw/2 > w.x0 && x - cw/2 < w.x1) return w; return null; }
/* x moved out of any closure beside y, to the side `ref` is on if that side has room */
function openX(x, y, cw, ext, ref){
  for (const w of works){
    if (y < w.y0 - ext || y > w.y1 + ext || x + cw/2 + 2 <= w.x0 || x - cw/2 - 2 >= w.x1) continue;
    const lim = halfAt(-y / M) - cw/2 - 2, l = w.x0 - cw/2 - 3, r = w.x1 + cw/2 + 3, okL = l >= -lim, okR = r <= lim;
    const left = (ref === undefined ? x : ref) < (w.x0 + w.x1) / 2;
    x = okL && (left || !okR) ? l : okR ? r : x;
  }
  return x;
}
/* solid barriers: push anything out; hitting the end face is a frontal hit, scraping the side is like a wall */
function workHit(b){
  for (const w of works){
    if (b.y + b.h/2 + 4 < w.y0 || b.y - b.h/2 - 4 > w.y1 || b.x + b.h/2 < w.x0 || b.x - b.h/2 > w.x1) continue;
    const c = circlesOf(b), r = c[6];
    let depth = 0, nx = 0, ny = 0;
    for (let i = 0; i < 6; i += 2){
      const cx = c[i], cy = c[i+1], qx = clamp(cx, w.x0, w.x1), qy = clamp(cy, w.y0, w.y1);
      let dx = cx - qx, dy = cy - qy, dp;
      const d = Math.hypot(dx, dy);
      if (d > 0){ if (d >= r) continue; dp = r - d; dx /= d; dy /= d; }
      else { const l = cx - w.x0, rt = w.x1 - cx, tp = cy - w.y0, bt = w.y1 - cy, m = Math.min(l, rt, tp, bt); dp = m + r; dx = m === l ? -1 : m === rt ? 1 : 0; dy = dx ? 0 : m === tp ? -1 : 1; }
      if (dp > depth){ depth = dp; nx = dx; ny = dy; }
    }
    if (depth <= 0) continue;
    b.x += nx*depth; b.y += ny*depth;
    const vn = b.vx*nx + b.vy*ny;
    if (vn >= 0) continue;
    b.vx -= 1.35*vn*nx; b.vy -= 1.35*vn*ny;
    workBump(b, w, -vn, Math.abs(ny) > 0.7);
  }
}
function workBump(b, w, imp, front){
  if (front && b.state === 'drive') b.vx += w.open * Math.min(70, imp * 0.25); // glance off toward the open side
  if (imp > 70) burst(b.x, b.y + (front ? b.h/2 * Math.sign(b.y - w.y1 || 1) : 0), 'spark', 4);
  if (b === P){
    if (state !== 'play') return;
    if (imp > (front ? 60 : 110)){ dmgSrc = 'works'; damage((imp - (front ? 60 : 110)) * 0.08); snd('wall'); }
    if (front && P.state === 'drive'){ // nose into the end of a closure: the barrier shoves you into the nearest open lane, so nobody can park against it
      const lim = halfAt(-P.y / M) - P.w/2 - 1, l = w.x0 - P.w/2 - 4, r = w.x1 + P.w/2 + 4;
      const okL = l >= -lim, okR = r <= lim, dl = Math.abs(l - P.x), dr = Math.abs(r - P.x);
      const to = okL && okR ? (dl < dr ? l : dr < dl ? r : w.open < 0 ? l : r) : okL ? l : okR ? r : null;
      if (to !== null){ targetX = to; P.vx += Math.sign(to - P.x) * 120; }
    }
    return;
  }
  if (b.state === 'wreck'){ b.av += (Math.random() - 0.5) * imp * 0.04; return; }
  if (b.boss){ if (imp > 80) hurtBoss(b, (imp - 80) * 0.15); return; }
  if (b.role === 'chaser'){
    const C = CHASERS[b.key], byP = b.lastHit === 'player' && t - b.lastHitT < 1.5;
    if (front ? imp > C.wall * 0.6 : imp > C.wall && byP) crash(b, 'wall'); // nose first into the barrier: they saw it too late (かべドーン)
  } else if (imp > 150) crash(b, 'wall');
}
function spawnCross(q, dir, x){
  const pool = ['kei','car','car','van','bus'], key = pool[(Math.random()*pool.length)|0], T = TRAFFIC[key];
  const y = q.y + (dir > 0 ? -17 : 17);
  for (const c of cars) if (c.cross && Math.abs(c.y - y) < 12 && Math.abs(c.x - x) < T.h + 70) return;
  const sp = 110 + Math.random()*60;
  cars.push(mkBody({role:'traffic', key, w:T.w, h:T.h, m:T.m, tough:T.tough, color:T.colors[(Math.random()*T.colors.length)|0], x, y, laneY:y, cross:true, free:true, dir, tv:sp, a:dir*Math.PI/2, vx:dir*sp, look:40 + Math.random()*30}));
}
function explodeAt(x, y, R, F, credit, dmgP, big){
  burst(x, y, 'boom', big ? 34 : 18); shake = Math.max(shake, big ? 10 : 6); snd('explode', big ? 1 : 0.6);
  ring(x, y, big ? 70 : 46, '#ffd24a'); { const half = halfAt(Math.max(0, -y / M)), sg = Math.sign(x) || 1; if (Math.abs(x) > half - 40 && breakAt(sg * (half + 10), y, sg, big)) blocksFly(sg * (half + 10), y, sg, big ? 12 : 7); }
  for (const o of [P, ...cars]){
    const dx = o.x - x, dy = o.y - y, d = Math.hypot(dx, dy);
    if (d >= R) continue;
    const k = 1 - d/R, f = k * F / o.m;
    if (o === P && boosting) continue;
    o.vx += dx/(d||1)*f; o.vy += dy/(d||1)*f;
    if (o === P){ dmgSrc = 'boom'; if (P.key === 'fire'){ if (k > 0.3 && t - (P.fireSaidT || -9) > 1.2){ P.fireSaidT = t; popMe(P.x, P.y - 30, 'へっちゃら！', '#ffc83d'); } } else damage(dmgP * k); continue; }
    if (credit){ o.lastHit = 'player'; o.lastHitT = t; }
    if (o.boss){ if (o.state === 'drive') hurtBoss(o, F * k * 0.22); else o.av += 3*k; continue; }
    if (o.state === 'drive'){ if (d < R*0.8) crash(o, 'boom'); } else o.av += 8*k;
  }
  for (const dr of drums) if (dr.alive && Math.hypot(dr.x - x, dr.y - y) < R){ dr.alive = false; booms.push({x:dr.x, y:dr.y, R:60, F:320, credit, dmg:12, at:t + 0.08 + Math.random()*0.12}); }
  for (const st of stations){ const sx = st.sg*(halfAt(-st.y/M) + 30); if (st.alive && Math.hypot(sx - x, st.y - y) < R + 40){ st.alive = false; booms.push({x:sx, y:st.y, R:st.big ? 210 : 150, F:st.big ? 640 : 560, credit, dmg:28, at:t + 0.15, big:true}); } }
}
function blowStation(st){ st.alive = false; explodeAt(st.sg*(halfAt(-st.y/M) + 30), st.y, st.big ? 210 : 150, st.big ? 640 : 560, true, 28, true); popMe(P.x, P.y - 40, st.big ? '燃料タンクが…！' : 'ガソリンスタンドが…！', '#ff5a36'); }

