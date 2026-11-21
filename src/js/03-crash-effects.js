/* ---------- crash logic ---------- */
function addBoost(v){
  if (boosting || coolT > 0 || state !== 'play') return;
  const was = boost; boost = Math.min(100, boost + v * NITRO_GAIN * (1 + 0.18 * upLv('boost')));
  if (was < 100 && boost >= 100){ tip('nitroFull', 'ニトロ満タン！ タップで無敵！'); snd('nitroReady'); }
}
function tryBoost(){
  if (state !== 'play' || boosting) return;
  if (boost < 100){ const bb = $('boostBar'); bb.classList.remove('nope'); void bb.offsetWidth; bb.classList.add('nope'); return; }
  boosting = true; P.slowT = 0; shake = Math.max(shake, 12); burst(P.x, P.y, 'spark', 24); snd('nitroGo'); snd('shock'); sndDo(R => R.nitro(true));
  const f = $('flash'); f.classList.remove('go'); void f.offsetWidth; f.classList.add('go');
  nitroBlast();
}
/* the nitro start is a shockwave (21回目 しょーくん「ニトロはさらにその上の破壊的な爽快感！！」): cars right next to you go flying as if you hit them,
   the ones a little further are shoved away, and the buildings beside you crumble. The cars it wrecks pay like any nitro hit */
function nitroBlast(){
  ring(P.x, P.y, 120, '#ffd24a'); ring(P.x, P.y, 80); ring(P.x, P.y, 46, '#ff8a3d'); burst(P.x, P.y, 'boom', 14); stars(P.x, P.y, 8); hitStop(0.06);
  for (const c of cars){
    if (c.state !== 'drive' || c.boss || c.fixed) continue;
    const dx = c.x - P.x, dy = c.y - P.y, d = Math.hypot(dx, dy) || 1;
    if (d < 64){ c.lastHit = 'player'; c.lastHitT = t; nitroHit(c); }
    else if (d < 150){ const k = 1 - d / 150; c.vx += (dx / d) * 260 * k; c.vy += (dy / d) * 160 * k; }
  }
  const half = halfAt(dist);
  for (const sg of [-1, 1]) for (const oy of [-40, 20]) if (breakAt(sg * (half + 10), P.y + oy, sg, false)) blocksFly(sg * (half + 10), P.y + oy, sg, 5);
}
function nitroHit(X){ // invincible nitro: whatever you touch goes flying
  if (X.state !== 'drive') return;
  const sg = Math.sign(X.x - P.x) || (Math.random() < 0.5 ? -1 : 1);
  X.vx += sg * (170 + Math.random()*130); X.vy += -50 - Math.random()*90;
  crash(X, 'nitro');
  X.air = X.airMax = 1.1; X.av *= 2.2; X.nFling = t;
  burst(X.x, X.y, 'boom', 12); ring(X.x, X.y, 34, '#ffd24a'); stars(X.x, X.y, 4); parts(X, 4); shake = Math.max(shake, 9);   // no hit-stop while nitro runs (it keeps flowing)
}

let dmgSrc = '?', dmgBy = {};
function damage(d){
  if (d <= 0 || state !== 'play' || boosting) return;
  dmgBy[dmgSrc] = (dmgBy[dmgSrc] || 0) + d; dmgSrc = '?';
  P.hp -= d; dmgTaken += d; shake = Math.max(shake, Math.min(8, 2 + d*0.3)); if (d >= 3){ hurtT = 0.25; flowT = 0; }
  if (d >= 4){ popMe(P.x, P.y + 12, `-${Math.round(d)}`, '#ffffff'); snd('hit', Math.min(1, d / 30)); }
  if (P.hp <= 0){ P.hp = 0; playerWreck(); }
}
/* the HUD is not refreshed while a run ends, so a nitro that was on when it ended has its glow taken down here */
function nitroOff(){ nitroFx.classList.remove('on'); bbBar.classList.remove('on'); }
function playerWreck(){
  state = 'ending'; endKind = 'wreck'; endT = 1.8; P.state = 'wreck'; P.av = 9; P.air = 0.6; P.airMax = 0.6; P.fire = 3;
  burst(P.x, P.y, 'boom', 22); parts(P, 10); rollOver(P); bigCrash(P.x, P.y, true); banner('クラッシュ！'); drag = null; boosting = false; nitroOff(); snd('bigcrash'); sndDo(R => { R.nitro(false); R.engineOff(); R.siren(0); R.jingle('wreck'); });
}

function comboUp(){
  comboN = comboT > 0 ? comboN + 1 : 1; comboT = COMBO_T(); maxCombo = Math.max(maxCombo, comboN);
  const mult = Math.min(5, 1 + 0.5 * (comboN - 1));
  if (comboN >= 2){ const el = $('combo'); el.textContent = `コンボ ×${mult % 1 ? mult.toFixed(1) : mult}`; el.hidden = false; }
  return mult;
}
function notice(){ if (noticeT <= 0 && state === 'play'){ popMe(P.x, P.y - 30, 'バレた！', '#ff5a36'); snd('busted'); } noticeT = 6; }
function takedown(b, kind, earned){
  const C = CHASERS[b.key], K = KO[kind], own = earned !== false;
  if (P.key === 'ppolice') notice();
  const mult = comboUp();
  const gain = Math.round(C.money * K.k * mult * CASH_K() * (own ? 1 : SELF_K));
  takeN++; takeMoney += gain; heatPts += 12; addBoost(own ? 25 : 25 * SELF_K); ko[kind]++; if (ice.length && onIce(b)) iceN++; // a far-off crash you had no part in barely fills nitro
  snd('coin', comboN); if (kind === 'pinch') snd('bonk'); else if (kind === 'train' || kind === 'cont') snd('bigcrash');
  const label = kind === 'hit' && P.key === 'muscle' ? 'ドゴォン！' : kind === 'hit' && P.key === 'monster' ? 'ペシャンコ！' : K.l;
  if (own){ if (kind !== 'nitro') hitStop(0.045); stars(b.x, b.y, kind === 'nitro' ? 3 : 6); if (K.k >= 1.6 || comboN >= 3) bigCrash(b.x, b.y); }
  if (own) pop(b.x, b.y, `${label} +${gain}`, K.k >= 1.6 ? '#ffc83d' : '#ff5a36');
  else pop(b.x, b.y, `${label.replace('！', '')} +${gain}`, '#c9ced6', true); // crashed on its own, far from you: a small grey pop
}

function crash(b, how){
  if (b.state === 'wreck') return;
  b.state = 'wreck';
  b.av = (Math.random() < 0.5 ? -1 : 1) * (5 + Math.random()*6);
  b.air = 0.5; b.airMax = 0.5;
  b.fire = b.role === 'chaser' || b.key === 'tanker' ? 2.5 : 0.8;
  burst(b.x, b.y, 'debris', 4, b.color || '#cfd6dd'); burst(b.x, b.y, 'spark', 8);
  parts(b, b.role === 'chaser' ? 7 : 4); if (!b.fixed) rollOver(b); if (how === 'wall') wallBlocks(b, 7);
  shake = Math.max(shake, 3); snd(how === 'crush' ? 'crush' : 'crash');
  const byPlayer = b.lastHit === 'player' && t - b.lastHitT < 2;
  if (b.role === 'chaser'){
    burst(b.x, b.y, 'boom', 12);
    if (state === 'play'){
      const kind = how === 'boom' ? (ownBlast ? 'drum' : 'boom') : KO[how] && how !== 'hit' ? how : byPlayer ? 'hit' : 'maki';
      // traps you lure them into (train, container, blasts, spikes, pincer bonk) are yours; a crash into traffic, a wreck or road works is yours when you touched it or it happened right by you
      takedown(b, kind, (kind !== 'maki' && kind !== 'wall') || byPlayer || Math.hypot(b.x - P.x, b.y - P.y) < LURE_R);
    }
  }
  else if (byPlayer && state === 'play'){ const g = Math.round(10 * CASH_K() * (how === 'nitro' ? NITRO_PAY : 1)); trafN++; trafMoney += g; pop(b.x, b.y, (how === 'nitro' ? 'ドーン！ ' : how === 'crush' ? 'ペシャンコ！ ' : '') + '+' + g, '#ffc83d'); }
  if (b.key === 'tanker'){ pop(b.x, b.y - 20, 'ドッカーン！', '#ffc83d'); explodeAt(b.x, b.y, 90, 420, byPlayer, 25); }
}
const RAM_SELF = 0.2, RAM_GRACE = 1.5;   // your damage when you are the one ramming (side or from behind), and how long the wreck you made stays harmless
function rammer(X, O){ // whichever of the two was driving into the other harder
  const dx = O.x - X.x, dy = O.y - X.y, d = Math.hypot(dx, dy) || 1;
  return (X.vx*dx + X.vy*dy) / d > -(O.vx*dx + O.vy*dy) / d ? X : O;
}
function impactOn(X, O, vn){
  if (X.state === 'wreck'){ X.av += (Math.random() - 0.5) * vn * 0.05; return; }
  const mo = O.m * (O === P ? (boosting ? 2.5 : (P.key === 'muscle' ? 1.5 : 1) * ramK()) : 1);
  const eff = vn * 2 * mo / (X.m + mo);
  if (X === P){
    O.lastHit = 'player'; O.lastHitT = t;
    // secret police car: ramming a chaser gives you away
    if (P.key === 'ppolice' && O.role === 'chaser' && rammer(P, O) === P) notice();
    // garbage truck: wrecks get swallowed and turned into coins
    if (P.key === 'gomi' && O.state === 'wreck' && !O.boss && !O.collected && !O.fixed){
      O.collected = true; const g = Math.round(15 * CASH_K()); gomiMoney += g; addBoost(4); snd('gomi');
      burst(O.x, O.y, 'debris', 6, O.color || '#cfd6dd'); pop(O.x, O.y, `ごみ回収！ +${g}`, '#38c79a'); return;
    }
    // monster truck: small cars get rolled over and the truck doesn't feel it
    if (P.key === 'monster' && isSmall(O) && !O.boss) return;
    // route bus: a pincer just bounces off the long body and the police car wrecks
    if (P.key === 'pbus' && O.plan === 'pin' && O.phase === 'slam' && O.state === 'drive'){
      O.vx += (Math.sign(O.x - P.x) || 1) * 260; crash(O, 'pinch');
      popMe(P.x, P.y - 30, 'はじき返した！', '#ffc83d'); shake = Math.max(shake, 5); snd('bonk'); return;
    }
    if (O.plan === 'pin' && O.phase === 'slam' && O.pinHit) return;
    const tackled = O.tk === 'tackle' && !O.plan && O.state === 'drive';
    if (tackled && O.tkHit) return;
    // ramming the boss yourself costs little; getting rammed by it hurts
    const bossRam = O.boss && O.state === 'drive' ? (rammer(P, O) === P ? 0.25 : 0.7) : 1;
    // muscle car: ramming into something costs only half
    const tough = P.key === 'muscle' && rammer(P, O) === P ? 0.5 : 1;
    // tank: a police tackle does nothing at all
    const tankT = tackled && P.key === 'ptank' ? 0 : 1;
    // 21回目 (しょーくん「一般車に綺麗に横から体当たりした時」): driving into a car yourself — a side swipe or from behind — barely hurts you.
    // Head-ons with oncoming cars, crossing cars, wrecks, bosses, police tackles and pincers hurt as before
    // (the wreck you just rammed off the road doesn't hurt you either while it tumbles away, RAM_GRACE s)
    const ramIn = (rammer(P, O) === P && !O.boss && !O.opp && !O.cross && O.state !== 'wreck' && !tackled && !(O.plan === 'pin' && O.phase === 'slam')) ||
      (O.state === 'wreck' && O.ramT && t - O.ramT < RAM_GRACE) ? RAM_SELF : 1;
    dmgSrc = O.boss ? 'boss' : O.role === 'chaser' ? (tackled ? 'tackle' : O.plan === 'pin' ? 'pin' : 'chaser-' + O.key) : O.state === 'wreck' ? 'wreck' : O.cross ? 'cross' : O.opp ? 'oncoming' : 'traffic';
    damage(Math.max(0, eff - 60) * 0.08 * (O.state === 'wreck' ? 0.8 : 1) * bossRam * tough * tankT * ramIn * (tackled ? TK.dmg : 1));
    if (tackled){ O.tkHit = true; if (!boosting){ popMe(P.x, P.y - 30, tankT ? 'タックル！' : 'びくともしない！', tankT ? '#ffffff' : '#ffc83d'); shake = Math.max(shake, tankT ? 5 : 2); snd('tackle'); } }
    if (eff > 60) burst((X.x + O.x)/2, (X.y + O.y)/2, 'spark', 5);
    if (!boosting && O.plan === 'pin' && O.phase === 'slam'){
      if (O.pinHit) return;
      O.pinHit = t;
      const m = O.mate;
      if (m && !O.pinDone && t - (m.pinHit || -9) < 0.6){ O.pinDone = m.pinDone = true; P.slowT = Math.max(P.slowT, 1.3); shake = Math.max(shake, 8); popMe(P.x, P.y - 30, 'はさみうち！', '#ffffff'); }
    }
    return;
  }
  // monster truck rolls right over small cars (police included, even mid-tackle)
  if (O === P && P.key === 'monster' && isSmall(X) && !X.boss){
    X.lastHit = 'player'; X.lastHitT = t;
    if (boosting){ nitroHit(X); return; }
    crash(X, 'crush'); X.air = X.airMax = 0.6; burst(X.x, X.y, 'debris', 6, X.color || '#cfd6dd'); shake = Math.max(shake, 4); return;
  }
  // a police car's own tackle doesn't wreck it (or count as your hit), unless you were driving into it harder
  if (X.tk === 'tackle' && !X.plan && O === P && !boosting && rammer(X, O) === X) return;
  if (O === P){ X.lastHit = 'player'; X.lastHitT = t; }
  else if (O.lastHit === 'player' && t - O.lastHitT < 2 && !(X.lastHit === 'player' && t - X.lastHitT < 2)){ X.lastHit = 'player'; X.lastHitT = O.lastHitT; }
  if (O === P && boosting && !X.boss){ nitroHit(X); return; }
  if (X.boss){ hurtBoss(X, Math.max(0, vn - 30) * (O === P ? mo * 0.15 * (rammer(X, O) === X ? 0.3 : 1) : O.m * 0.03)); return; }
  if (X.plan === 'pin' && X.phase === 'slam'){
    if (O.plan === 'pin'){ X.lastHit = 'player'; X.lastHitT = t; if (vn > 60) crash(X, 'pinch'); }
    if (O === P || O.plan === 'pin') return;
  }
  // police on a job (overtaking to drop spikes, lining up a pincer) shrug off light bumps with traffic
  const th = X.role === 'chaser' ? (O === P ? CHASERS[X.key].tough : CHASERS[X.key].env * (X.plan === 'spike' || X.plan === 'pin' ? 2.2 : 1)) : X.tough;
  if (eff > th){
    crash(X, 'hit');
    // your own ram sends it tumbling away: a shove sideways, a fast spin and a hop (pictures and the shove only; the coins are the same)
    if (O === P && !X.fixed && !X.boss && rammer(P, X) === P){
      const sg = Math.sign(X.x - P.x) || (Math.random() < 0.5 ? -1 : 1);
      X.vx += sg * (110 + Math.min(eff, 400) * 0.45) * ramK(); X.vy += P.vy * 0.12;
      X.av = sg * (10 + Math.random() * 6); X.air = X.airMax = 0.8; X.ramT = t;
      ring(X.x, X.y, 30); burst(X.x, X.y, 'debris', 5, X.color || '#cfd6dd'); shake = Math.max(shake, 5);
    }
  }
}

function circlesOf(b){
  const len = Math.max(0, (b.h - b.w) / 2) * 0.92, ax = Math.sin(b.a), ay = -Math.cos(b.a), r = b.w / 2;
  return [b.x + ax*len, b.y + ay*len, b.x, b.y, b.x - ax*len, b.y - ay*len, r];
}
function collide(A, B){
  const reach = (A.h + B.h) / 2 + 4;
  if (Math.abs(A.x - B.x) > reach || Math.abs(A.y - B.y) > reach) return;
  const ca = circlesOf(A), cb = circlesOf(B), rs = ca[6] + cb[6];
  let depth = 0, nx = 0, ny = 0;
  for (let i = 0; i < 6; i += 2) for (let j = 0; j < 6; j += 2){
    const dx = ca[i] - cb[j], dy = ca[i+1] - cb[j+1], d2 = dx*dx + dy*dy;
    if (d2 < rs*rs){ const d = Math.sqrt(d2) || 0.01, dp = rs - d; if (dp > depth){ depth = dp; nx = dx/d; ny = dy/d; } }
  }
  if (depth <= 0) return;
  const im = 1 / massOf(A), jm = 1 / massOf(B), corr = depth / (im + jm);
  A.x += nx*corr*im; A.y += ny*corr*im; B.x -= nx*corr*jm; B.y -= ny*corr*jm;
  const rvx = A.vx - B.vx, rvy = A.vy - B.vy, vn = rvx*nx + rvy*ny;
  if (vn >= 0) return;
  const j = -(1 + 0.25) * vn / (im + jm);
  A.vx += j*im*nx; A.vy += j*im*ny; B.vx -= j*jm*nx; B.vy -= j*jm*ny;
  // your car's side is worked out first, while the other car is still driving (its crash must not turn your hit into "ran into a wreck")
  if (-vn > 20){ if (B === P){ impactOn(B, A, -vn); impactOn(A, B, -vn); } else { impactOn(A, B, -vn); impactOn(B, A, -vn); } }
}
function hitWall(b, imp){
  if (imp > 50) for (const st of stations) if (st.alive && Math.abs(b.y - st.y) < 60 && Math.sign(b.x) === st.sg){ blowStation(st); break; }
  if (b === P){ if (imp > 110){ dmgSrc = 'wall'; damage((imp - 110) * 0.08); burst(b.x, b.y, 'spark', 4); snd('wall'); } return; }
  if (b.state === 'wreck'){ b.av += (Math.random() - 0.5) * imp * 0.04;
    // a car sent flying by nitro smashes into the roadside: the building there crumbles (pictures only)
    if (b.nFling && t - b.nFling < 1.6 && imp > 50){ b.nFling = 0; wallBlocks(b, 8); burst(b.x, b.y, 'boom', 8); snd('shock', 0.55); }
    return; }
  if (b.boss){ if (imp > 80) hurtBoss(b, (imp - 80) * 0.15); return; }
  if (b.role === 'chaser'){ if (imp > CHASERS[b.key].wall * (ice.length && onIce(b) ? 0.5 : 1) && b.lastHit === 'player' && t - b.lastHitT < 1.5) crash(b, 'wall'); }
  else if (imp > 150) crash(b, 'wall');
}

/* ---------- effects ---------- */
function burst(x, y, type, n, color){
  for (let i = 0; i < n; i++){
    const a = Math.random()*Math.PI*2;
    if (type === 'boom'){ const sp = 20 + Math.random()*90; fx.push({type, x, y, vx:Math.cos(a)*sp, vy:Math.sin(a)*sp, life:0.7, max:0.7, size:6 + Math.random()*10, color:['#ff5a36','#ffc83d','#ff8a3d','#8a94a6'][i%4], rot:0, vr:0}); }
    else { const spark = type === 'spark', sp = spark ? 60 + Math.random()*110 : 90 + Math.random()*140; fx.push({type:'bit', x, y, vx:Math.cos(a)*sp, vy:Math.sin(a)*sp, life:spark ? 0.4 : 0.9, max:spark ? 0.4 : 0.9, size:spark ? 2.5 : 4, color:spark ? '#ffe27a' : (color || '#cfd6dd'), rot:a, vr:(Math.random()-0.5)*10}); }
  }
  capFx();
}
function smoke(x, y, color){ if (fx.length < FX_CAP - 20) fx.push({type:'smoke', x:x + (Math.random()-0.5)*6, y, vx:(Math.random()-0.5)*14, vy:-8 - Math.random()*10, life:1.2, max:1.2, size:4 + Math.random()*3, color:color || '#5b616b', rot:0, vr:0}); }
/* no words come out of the player's own car any more (the owner found it distracting): the gauge hint, sounds and effects carry those cues */
function popMe(){}
function pop(x, y, text, color, small){
  const p = {rx:x - P.x, ry:y - P.y, text, color, life:1, small:!!small};
  // a pop that would land on a recent one moves up a line, so two at once never print over each other
  const wid = q => [...q.text].reduce((a, ch) => a + (ch.charCodeAt(0) < 128 ? 10 : 17), 0) * (q.small ? 0.7 : 1);
  for (let k = 0; k <= pops.length; k++){
    const hit = pops.find(q => q.life > 0.25 && Math.abs((q.rx - p.rx) * s) < (wid(q) + wid(p)) / 2 + 4 && Math.abs((p.ry - q.ry) * s + (1 - q.life) * 34) < 21);
    if (!hit) break;
    p.ry = hit.ry - ((1 - hit.life) * 34 + 22) / s;
  }
  pops.push(p); if (pops.length > 10) pops.shift();
}
/* ---------- toy look & crash juice (11/17): die-cast toy cars on a toy-town diorama of wooden blocks.
   Crashes throw tyres, panels and bolts (with a height and a bounce), roadside blocks tumble, cars roll over and land wheels-up,
   a beat of hit-stop on every crash you cause, and a short slow-motion close-up on the big ones. Pictures only: nothing here changes the rules ---------- */
const BLOCK_COL = ['#e8735a', '#4f8fc0', '#f0b94a', '#6fb68b', '#e2c48f', '#d9a86c', '#a984c9'];
const FX_CAP = 320;
function capFx(){ if (fx.length > FX_CAP) fx.splice(0, fx.length - FX_CAP); }
// tyres, door panels and bolts come off a toy car
function parts(b, n){
  if (!b) return;
  const col = b.key === 'police' ? '#f7f7f4' : (b.color || '#cfd6dd');
  for (let i = 0; i < n; i++){
    const a = Math.random() * Math.PI * 2, sp = 70 + Math.random() * 150, k = i % 4 === 0 ? 'tyre' : i % 4 === 1 ? 'bolt' : 'panel';
    fx.push({type:'part', k, x:b.x, y:b.y, vx:Math.cos(a) * sp + (b.vx || 0) * 0.3, vy:Math.sin(a) * sp + (b.vy || 0) * 0.3, z:4, vz:110 + Math.random() * 170,
      life:1.5 + Math.random() * 0.7, max:2.2, rot:a, vr:(Math.random() - 0.5) * 16, size:k === 'tyre' ? 3.4 : k === 'bolt' ? 1.7 : 4 + Math.random() * 3, color:k === 'panel' ? col : null});
  }
  capFx();
}
// wooden blocks tumble off the roadside (sg = the side of the road they fall from)
function blocksFly(x, y, sg, n){
  for (let i = 0; i < n; i++){
    const a = (sg > 0 ? Math.PI : 0) + (Math.random() - 0.5) * 1.7, sp = 50 + Math.random() * 130;
    fx.push({type:'part', k:i % 3 === 0 ? 'cyl' : 'blk', x:x + (Math.random() - 0.5) * 12, y:y + (Math.random() - 0.5) * 30, vx:Math.cos(a) * sp, vy:Math.sin(a) * sp,
      z:12 + Math.random() * 16, vz:50 + Math.random() * 130, life:2.6 + Math.random() * 0.6, max:3.2, rot:Math.random() * 6, vr:(Math.random() - 0.5) * 9,
      size:6 + Math.random() * 4, color:BLOCK_COL[(Math.random() * BLOCK_COL.length) | 0]});
  }
  capFx();
}
function ring(x, y, r, color){ fx.push({type:'ring', x, y, vx:0, vy:0, life:0.4, max:0.4, size:r, color:color || '#ffffff', rot:0, vr:0}); capFx(); }
function stars(x, y, n){
  for (let i = 0; i < n; i++){ const a = Math.random() * Math.PI * 2, sp = 50 + Math.random() * 90;
    fx.push({type:'star', x, y, vx:Math.cos(a) * sp, vy:Math.sin(a) * sp - 30, life:0.55, max:0.55, size:2.6 + Math.random() * 2, color:i % 3 ? '#ffd24a' : '#ffffff', rot:a, vr:(Math.random() - 0.5) * 12}); }
  capFx();
}
// a crashed car rolls over while it is in the air and lands on its roof about half the time
function rollOver(b){ b.rollTo = (Math.random() < 0.55 ? Math.PI : Math.PI * 2) * (Math.random() < 0.5 ? -1 : 1); }
// broken buildings: the roadside building at a wall crash or a blast falls to a pile of blocks for the rest of the run (11/17 しょーくん「周りの建物の破損は？」)
const broken = new Map(), BLD_STYLES = {town:1, snowtown:1, avenue:1, port:1};
function hasBuildings(y){ return !!BLD_STYLES[AREAS[areaIndexAt(Math.max(0, -y / M))].style]; }
function breakAt(x, y, sg, big){
  if (!hasBuildings(y)) return false;
  const k = Math.floor(y / 56);
  for (let q = big ? -1 : 0; q <= (big ? 1 : 0); q++){ const key = (k + q) + ':' + sg; if (!broken.has(key)){ broken.set(key, big ? 2 : 1); gcDirty((k + q) * 56); } }
  for (let i = 0; i < (big ? 6 : 3); i++) smoke(x + sg*(10 + Math.random()*40), y + (Math.random() - 0.5)*50, 'rgba(214,200,176,0.9)');
  return true;
}
// the roadside wall a car is next to: its building breaks and blocks fall from there
function wallBlocks(b, n){ const half = halfAt(Math.max(0, -b.y / M)), sg = Math.sign(b.x) || 1; if (Math.abs(b.x) > half - b.w && breakAt(sg * (half + 10), b.y, sg, false)) blocksFly(sg * (half + 10), b.y, sg, n); }
// time: hit-stop freezes the world for a few frames, slow motion runs it at 0.3x, and the camera leans in on the crash (real time, see frame())
let hitStopT = 0, slowMoT = 0, slowCool = 0, zoomK = 0, vZm = 1, vZx = 0, vZy = 0;
function hitStop(sec){ if (!reduceMotion && !window.__NOFX) hitStopT = Math.max(hitStopT, sec); }
function bigCrash(x, y, force){
  ring(x, y, 44); ring(x, y, 26, '#ffd24a'); shake = Math.max(shake, 9);
  if (reduceMotion || window.__NOFX) return;
  if (slowCool > 0 && !force){ hitStop(0.06); return; }
  hitStop(0.07); slowMoT = 0.34; slowCool = 2.4;
}
let toastTimer = 0;
function banner(text){ const b = $('banner'); b.textContent = text; b.classList.remove('show'); void b.offsetWidth; b.classList.add('show'); }
/* 11/17: no sentences pop up during a run (しょーくん「読めないし、気が散る」) — warnings, tips, missions and ★ speak by sound, light and the big one-word banners. Toasts are for the garage only */
function toast(text, ms){
  if (state !== 'garage') return;
  const el = $('toast'), low = state === 'garage' && !$('garage').hidden; el.textContent = text;
  // in the garage the toast sits just above the town picker instead of over the tabs
  el.classList.toggle('low', low);
  if (low){ const r = $('town').getBoundingClientRect(); el.style.left = (r.left + r.width/2) + 'px'; el.style.bottom = (window.innerHeight - r.top + 10) + 'px'; el.style.maxWidth = Math.max(220, r.width) + 'px'; }
  else el.style.left = el.style.bottom = el.style.maxWidth = '';
  el.classList.add('show'); clearTimeout(toastTimer); toastTimer = setTimeout(() => el.classList.remove('show'), ms || 1800); }
/* the first-time how-to lines of the run are gone too (11/17); the calls stay as markers of where they were */
function tip(){}

