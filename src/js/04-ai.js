/* ---------- AI ---------- */
function driveTraffic(c, dt){
  const dir = c.opp ? 1 : -1;
  let desired = c.tv * dir;
  for (const o of cars){
    if (o === c) continue;
    const ahead = (o.y - c.y) * dir;
    if (ahead <= 0 || ahead > c.look + (c.h + o.h)/2) continue;
    if (Math.abs(o.x - c.x) > (c.w + o.w)/2 + 2) continue;
    const ov = o.state === 'wreck' ? 0 : o.vy;
    if (ov * dir < desired * dir) desired = ov * dir > 0 ? ov : 0;
  }
  if (works.length) desired = trafficWorks(c, desired);
  c.vy += clamp(desired - c.vy, -240*dt, 240*dt);
  c.vx += clamp((c.laneX - c.x) * 3 - c.vx, -200*dt, 200*dt);
  c.a = (c.opp ? Math.PI : 0) + clamp(c.vx / 500, -0.3, 0.3) * (c.opp ? -1 : 1);
}
function trafficWorks(c, desired){
  if (!c.opp){
    const w = closedAt(c.laneX, c.y, c.w, 260);
    if (!w) return desired;
    const L = laneInfo(-c.y / M), nS = L.n - L.nOn; let to = null;
    for (let i = 0; i < nS; i++){ const lx = -L.half + (i + 0.5) * L.lw; if (closedAt(lx, c.y, c.w, 260)) continue; if (to === null || Math.abs(lx - c.x) < Math.abs(to - c.x)) to = lx; }
    if (to !== null && !cars.some(o => o !== c && o.state === 'drive' && !o.cross && Math.abs(o.x - to) < (o.w + c.w)/2 + 2 && Math.abs(o.y - c.y) < (o.h + c.h)/2 + 26)){ c.laneX = to; return desired; }
    return Math.max(desired, -Math.max(0, c.y - c.h/2 - w.y1 - 10) * 1.6); // no way round yet: ease to a stop before the barrier
  }
  for (const w of works){
    if (!w.alt || c.y > w.y0 || P.y < w.y0 - 30) continue;
    const gap = (w.y0 - 110) - (c.y + c.h/2);
    if (gap < -6 || gap > 240) continue;
    return Math.min(desired, Math.max(0, gap) * 1.6);
  }
  return desired;
}
function driveCross(c, dt){
  let desired = c.tv * c.dir, acc = 260;
  for (const o of cars){
    if (o === c) continue;
    const ahead = (o.x - c.x) * c.dir;
    if (ahead <= 0 || ahead > c.look + (c.h + o.h)/2) continue;
    if (Math.abs(o.y - c.y) > (c.w + o.w)/2 + 2) continue;
    if (o.state === 'wreck') desired = 40 * c.dir;          // creep and shove wrecks out of the way
    else if (o.cross && o.vx * c.dir < desired * c.dir) desired = o.vx;
  }
  // cross traffic slams on the brakes for you, but not for the police
  const aheadP = (P.x - c.x) * c.dir;
  if (state === 'play' && aheadP > 0 && aheadP < 95 + (c.h + P.w)/2 && Math.abs(P.y - c.y) < (c.w + P.h)/2 + 24){ desired = 0; acc = 560; if (Math.abs(c.vx) > 40) c.brk = 0.3; }
  if (c.brk > 0) c.brk -= dt;
  c.stall = Math.abs(c.vx) < 15 ? (c.stall || 0) + dt : 0;
  c.vx += clamp(desired - c.vx, -acc*dt, acc*dt);
  c.vy += clamp((c.laneY - c.y) * 3 - c.vy, -200*dt, 200*dt);
  c.a = c.dir * Math.PI / 2;
}
function steer(c, dt, tx, vyT, lat, ax, ay){
  if (ice.length && onIce(c)){ ax *= 0.22; ay *= 0.35; }
  c.vx += clamp(clamp((tx - c.x) * 5, -lat, lat) - c.vx, -ax*dt, ax*dt);
  c.vy += clamp(vyT - c.vy, -ay*dt, ay*dt);
}
function sideStep(c, tx, look){
  for (const o of cars){
    if (o === c || (o.role === 'chaser' && o.state === 'drive')) continue;
    const ahead = c.y - o.y;
    if (ahead <= 0 || ahead > look + (c.h + o.h)/2 || Math.abs(o.x - c.x) >= (c.w + o.w)/2 + 3) continue;
    const left = o.x - (o.w + c.w)/2 - 8, right = o.x + (o.w + c.w)/2 + 8;
    return Math.abs(left - tx) < Math.abs(right - tx) ? left : right;
  }
  return tx;
}
function driveSpiker(c, dt){
  const dy = c.y - P.y, ps = Math.max(60, -P.vy), lim = halfAt(-c.y / M) - c.w/2 - 2;
  c.pt += dt;
  let tx = c.x, vyT = -(ps + 180);
  if (c.plan === 'spike' && c.phase === 'pass'){
    tx = sideStep(c, clamp(P.x + c.sg*(P.w/2 + c.w/2 + 16), -lim, lim), 60); c.tx = tx;
    vyT = -(ps + 100);
    if (dy < -210){ c.phase = 'arm'; c.pt = 0; tip('spike', 'トゲがくる！ よけて追っ手にふませよう'); snd('warn'); }
    else if (c.pt > 9) c.plan = null;
  } else if (c.plan === 'spike'){
    tx = clamp(c.tx, -lim, lim);
    vyT = -ps - clamp((dy + 220) * 2, -60, 60);
    const sy = c.y + c.h/2 + 14;
    c.strip = stripFor(P.x, -sy / M);
    if (c.pt > 0.75){
      spikes.push({x:c.strip.x, y:sy, w:c.strip.w, hit:new Set()});
      pop(c.strip.x, sy, 'スパイク！', '#ffffff');
      c.plan = 'gone'; c.strip = null;
    }
  }
  if (works.length) tx = openX(tx, c.y, c.w, c.h/2, c.x);
  steer(c, dt, tx, vyT, 180, 900, 320);
  c.a = clamp(c.vx / 500, -0.35, 0.35);
}
function drivePincer(c, dt){
  const m = c.mate, dy = c.y - P.y, ps = Math.max(60, -P.vy), lim = halfAt(-c.y / M) - c.w/2 - 2;
  if (!m || m.state !== 'drive' || m.plan !== 'pin'){ c.plan = null; c.phase = null; return; }
  c.pt += dt;
  let tx = clamp(P.x + c.sg*(P.w/2 + c.w/2 + 22), -lim, lim), vyT = -ps - clamp(dy * 1.8, -90, 150), lat = 220, ax = 900;
  if (c.phase === 'come'){
    if (c.pt > 0.5 && Math.abs(dy) < 30 && Math.abs(m.y - P.y) < 30){ c.phase = m.phase = 'warn'; c.pt = m.pt = 0; c.slamV = m.slamV = -ps; toast('はさみうち！'); }
    else if (c.pt > 8 || halfAt(dist) < 70){ c.plan = m.plan = null; }
  } else if (c.phase === 'warn'){
    vyT = c.slamV;
    if (c.pt > 0.9){ c.phase = m.phase = 'slam'; c.pt = m.pt = 0; }
  } else if (c.phase === 'slam'){
    vyT = c.slamV; tx = c.x - c.sg * 400; lat = 200; ax = 2400;
    if (c.pt > 0.55){ c.plan = m.plan = null; }
  }
  if (works.length && c.phase !== 'slam') tx = openX(tx, c.y, c.w, c.h/2, c.x);
  steer(c, dt, tx, vyT, lat, ax, 340);
  c.a = clamp(c.vx / 500, -0.35, 0.35);
  if (dy > 900){ c.y = P.y + 480; c.vy = P.vy; c.x = openX(c.x, c.y, c.w, 40); }
}
function driveBoss(c, dt){
  const B = c.boss, S = BOSSES[B.i], dy = c.y - P.y, ps = Math.max(60, -P.vy) * (c.slowT > 0 ? 0.6 : 1), lim = halfAt(-c.y / M) - c.w/2 - 2;
  B.mt -= dt; if (B.flash > 0) B.flash -= dt;
  let tx = P.x, vyT = -ps, lat = 110;
  if (B.mode === 'hold' && t > B.blockAt && dy > 0 && dy < 220){ B.mode = 'pass'; B.mt = 4; B.sg = P.x < 0 ? 1 : -1; }
  B.brake = false;
  switch (B.mode){
    case 'hold':
      vyT = -ps - clamp((dy - 95) * 1.5, -80, 120);
      if (B.mt <= 0){ B.mode = 'rev'; B.mt = 0.5; }
      break;
    case 'rev': // engine roar: stops following you, then charges in a straight line
      vyT = -ps - clamp((dy - 105) * 1.5, -80, 120); tx = c.x; lat = 30;
      if (B.mt <= 0){ B.mode = 'charge'; B.mt = 1.1; }
      break;
    case 'charge':
      vyT = -(ps + S.rel); tx = c.x; lat = 45;
      if (B.mt <= 0 || dy < -c.h/2){ B.mode = 'hold'; B.mt = 1.2 + Math.random()*0.8; }
      break;
    case 'pass':
      tx = clamp(P.x + B.sg*(P.w/2 + c.w/2 + 14), -lim, lim); vyT = -(ps + S.rel + 40); lat = 160;
      if (dy < -(c.h/2 + P.h/2 + 40)){ B.mode = 'block'; B.mt = 3.4; toast('装甲車が前をふさいだ！'); }
      else if (B.mt <= 0){ B.mode = 'hold'; B.mt = 1; B.blockAt = t + S.every; }
      break;
    case 'block':
      lat = 85; B.brake = B.mt < 0.9;
      vyT = B.brake ? -ps * 0.55 : -ps - clamp((dy + c.h/2 + P.h/2 + 24) * 1.5, -60, 60);
      if (B.mt <= 0){ B.mode = 'drop'; B.mt = 2.5; B.sg = c.x > P.x ? 1 : -1; }
      break;
    case 'drop':
      tx = clamp(P.x + B.sg*(P.w/2 + c.w/2 + 16), -lim, lim); vyT = -ps * 0.6; lat = 120;
      if (dy > 60 || B.mt <= 0){ B.mode = 'hold'; B.mt = 1.2; B.blockAt = t + S.every; }
      break;
    default: // leave
      tx = c.x; vyT = -ps * 0.45;
  }
  if (works.length) tx = openX(tx, c.y, c.w, c.h/2, c.x);
  c.vx += clamp(clamp((clamp(tx, -lim, lim) - c.x) * 4, -lat, lat) - c.vx, -600*dt, 600*dt);
  c.vy += clamp(vyT - c.vy, -280*dt, 280*dt);
  c.a = clamp(c.vx / 700, -0.18, 0.18);
  if (dy > 900 && B.mode !== 'leave'){ c.y = P.y + 480; c.vy = P.vy; c.x = openX(c.x, c.y, c.w, 40); }
}
/* police: pull up beside you, hold, lean out (the tell), then tackle from the side — no more riding your bumper.
   One car per side; extra cars queue diagonally behind until a side frees up.
   Cars crossing at a junction don't stop for them and are noticed late too: the junction stays a trap.
   They watch the road: cars and wrecks are seen early (sooner the faster they close in) and dodged — swerve if there
   is room, otherwise ease off and slip in behind. Drums and spikes, and anything hidden behind your car, are only noticed
   late, so you can still feed them in (swerve away at the last second and the car behind you is in trouble). */
const TK = {gap:16, wind:0.45, hit:0.36, back:1.2, speed:240, dmg:0.6};
function sideTaken(c, sg){ return cars.some(o => o !== c && o.role === 'chaser' && o.key === 'police' && o.state === 'drive' && !o.plan && o.tk && o.tk !== 'wait' && o.sg === sg); }
function roadLim(c){ return Math.min(halfAt(-c.y / M), halfAt((-c.y + 90) / M)) - c.w/2 - 4; }
function policeThreat(c, x, reach){
  let best = null, bt = 1e9;
  const test = (ox, oy, ow, oh, ovy, ovx, early, driving) => {
    const ahead = (c.y - c.h/2) - (oy + oh/2);
    if (ahead < -6) return;
    const close = ovy - c.vy;                       // how fast the gap shrinks (forward is -y)
    const hidden = early && P.y < c.y && P.y > oy && Math.abs(P.x - x) < (c.w + P.w)/2; // you are between it and the police car
    if (ahead > Math.min(reach || 1e9, early && !hidden ? 40 + Math.max(0, close) * 0.8 : 46)) return;
    const ttc = Math.max(0, ahead) / Math.max(40, close);
    const px = ox + ovx * Math.min(ttc, 0.8);       // where it will be: catches cars crossing at junctions
    if (Math.abs(px - x) >= (c.w + ow)/2 + 5) return;
    if (ttc < bt){ bt = ttc; best = {x:px, w:ow, vy:ovy, ttc, onc:driving && ovy > 60}; }
  };
  for (const o of cars){
    if (o === c || (o.role === 'chaser' && o.key === 'police' && o.state === 'drive')) continue;
    test(o.x, o.y, o.w, o.h, o.vy, o.vx || 0, !o.cross, o.state === 'drive');
  }
  for (const dr of drums) if (dr.alive) test(dr.x, dr.y, 12, 12, 0, 0, false);
  for (const sp of spikes) test(sp.x, sp.y, sp.w, 8, 0, 0, false);
  for (const w of works) test((w.x0 + w.x1)/2, (w.y0 + w.y1)/2, w.x1 - w.x0, w.y1 - w.y0, 0, 0, false); // road works: seen late too
  return best;
}
function drivePolice(c, dt){
  const C = CHASERS.police, ps = Math.max(60, -P.vy), dy = c.y - P.y, lim = roadLim(c);
  const slot = sg => clamp(P.x + sg*(P.w/2 + c.w/2 + TK.gap), -lim, lim);
  const fits = sg => Math.abs(slot(sg) - P.x) >= (P.w + c.w)/2 + 6 && !(works.length && closedAt(slot(sg), P.y, c.w, 25)); // no lining up inside road works beside you (or right in front of you)
  if (!c.tk){ c.tk = 'come'; c.tt = 0; c.sg = c.x < P.x ? -1 : 1; }
  c.tt += dt;
  if (c.tk === 'come' || (c.tk === 'wait' && c.tt > 0.5)){
    const free = [c.sg, -c.sg].filter(sg => fits(sg) && !sideTaken(c, sg));
    if (free.length){ c.sg = free[0]; if (c.tk === 'wait'){ c.tk = 'come'; c.tt = 0; } }
    else if (c.tk === 'come'){ c.tk = 'wait'; c.tt = 0; }
    else c.tt = 0;
  } else if (c.tk !== 'wait' && c.tk !== 'tackle' && !fits(c.sg)){ // you hugged the wall on its side
    if (fits(-c.sg) && !sideTaken(c, -c.sg)){ c.sg = -c.sg; c.tk = 'come'; } else c.tk = 'wait';
    c.tt = 0;
  }
  // read the road first: anything in this car's line?
  // once it leans out it is committed: the tackle itself carries it out of its lane, so only close things stop it
  let thr = c.tk === 'tackle' ? null : policeThreat(c, c.x, c.tk === 'wind' ? 60 : undefined);
  if (thr && (c.tk === 'side' || c.tk === 'wind' || c.tk === 'back')){
    // beside you with traffic coming down its lane: if there is still time, go for the tackle now (it carries it out of the lane); otherwise get out of the way
    if (c.tk === 'side' && thr.ttc > 0.55 && !boosting && !undercover() && Math.abs(dy) < 30 && !policeThreat(c, P.x, 60)){ c.tk = 'wind'; c.tt = 0; c.windT = 0.35; thr = null; if (state === 'play') tip('tackle', 'タックルが来る！ 先に体当たりでやり返そう'); }
    else { c.tk = 'come'; c.tt = 0; }
  }
  let tx = slot(c.sg), tdy = 0, vyT = null, ay = 420;
  switch (c.tk){
    case 'wait': tdy = 120; break;
    case 'come':
      if (Math.abs(dy) < 16 && Math.abs(c.x - tx) < 10 && !thr){ c.tk = 'side'; c.tt = 0; c.hold = (0.3 + Math.random()*0.35) * (camping ? 0.35 : 1); }
      break;
    case 'side':
      if (Math.abs(dy) > 50){ c.tk = 'come'; c.tt = 0; }
      else if (c.tt > c.hold){
        // only commit when the way ahead is clear and you are not on nitro
        if (boosting || undercover() || policeThreat(c, P.x, 60)) c.hold = c.tt + 0.3;
        else { c.tk = 'wind'; c.tt = 0; c.windT = TK.wind; if (state === 'play') tip('tackle', 'タックルが来る！ 先に体当たりでやり返そう'); }
      }
      break;
    case 'wind':
      tx = clamp(tx + c.sg * 8, -lim, lim);
      if (boosting || undercover()){ c.tk = 'back'; c.tt = 0; }
      else if (c.tt > (c.windT || TK.wind)){ c.tk = 'tackle'; c.tt = 0; c.tkHit = false; }
      break;
    case 'tackle':
      // aimed at where you are: a miss stops at your line instead of flying across the road
      if (c.tt > TK.hit || c.tkHit || (P.x - c.x) * -c.sg <= 2){ c.tk = 'back'; c.tt = 0; }
      break;
    case 'back':
      if (c.tt > TK.back * (camping ? 0.5 : 1)){ c.tk = Math.abs(dy) < 30 ? 'side' : 'come'; c.tt = 0; c.hold = (0.25 + Math.random()*0.35) * (camping ? 0.35 : 1); }
      break;
  }
  if (!thr && c.tk !== 'tackle' && Math.abs(tx - c.x) > 8) thr = policeThreat(c, tx); // the lane it is heading for
  if (thr){
    const nearP = Math.abs(dy) < (c.h + P.h)/2 + 12;
    const ok = x => Math.abs(x) <= lim && !(nearP && Math.abs(x - P.x) < (c.w + P.w)/2 + 4) && !policeThreat(c, x, 80); // takes a gap it can use, keeps reading the road once there
    const L = thr.x - (thr.w + c.w)/2 - 6, R = thr.x + (thr.w + c.w)/2 + 6;
    const way = [L, R].filter(ok).sort((u, v) => Math.abs(u - c.x) - Math.abs(v - c.x))[0];
    if (way !== undefined) tx = way;
    else if (thr.onc && nearP){
      // oncoming and boxed in beside you: brake hard and tuck in behind you until it has gone by
      const behind = (c.h + P.h)/2 + 8;
      tx = dy > behind ? P.x : c.x; vyT = -(ps - 170); ay = 900;
    } else if (thr.onc){
      tx = c.x; vyT = 0; ay = 900; // nowhere to go: stand on the brakes so a hit is a bump, not a wreck
    } else {
      // something slower (or stopped) ahead and no room: drop in behind it until a gap opens, creeping so a wreck just gets shoved aside
      tx = c.x; vyT = Math.min(-55, thr.vy + 10); ay = 760;
    }
  }
  if (vyT === null){
    vyT = -(ps + C.rel * (camping ? 1.35 : 1) * clamp((dy - tdy) / 90, -0.8, 1.8)); // far behind: hurry back into the chase (harder when you sit in one lane)
    // never ride the bumper: lined up right behind you, it eases off while moving out to its side
    if (dy > 0 && dy < (c.h + P.h)/2 + 40 && Math.abs(c.x - P.x) < (c.w + P.w)/2 + 1) vyT = -(ps - 25);
  }
  if (c.tk === 'tackle'){
    c.vx += clamp(clamp((P.x - c.x) * 8, -TK.speed, TK.speed) - c.vx, -1600*dt, 1600*dt);
    c.vy += clamp(vyT - c.vy, -ay*dt, ay*dt);
  } else {
    c.tx = tx = works.length ? openX(clamp(tx, -lim, lim), c.y, c.w, c.h/2, c.x) : clamp(tx, -lim, lim); // beside road works: don't steer into the barrier
    steer(c, dt, tx, vyT, c.tk === 'wind' ? 120 : C.lat, 900, ay);
  }
  c.a = clamp(c.vx / 500, -0.35, 0.35);
  if (dy > 900){ c.y = P.y + 480; c.vy = P.vy; c.tk = 'come'; c.tt = 0; c.x = openX(c.x, c.y, c.w, 40); }
}

function driveChaser(c, dt){
  if (c.boss) return driveBoss(c, dt);
  if (c.plan) c.tk = null;
  if (c.plan === 'spike' || c.plan === 'gone') return driveSpiker(c, dt);
  if (c.plan === 'pin'){ drivePincer(c, dt); if (c.plan === 'pin') return; }
  if (c.key === 'police') return drivePolice(c, dt);
  const C = CHASERS[c.key], dy = c.y - P.y, ps = Math.max(60, -P.vy);
  let vyT = -(ps + C.rel * clamp(dy / 150, -0.6, 1));
  if (dy > 0 && dy < 60 && Math.abs(c.x - P.x) < 26) vyT -= 40;
  c.think -= dt;
  if (c.think <= 0){
    c.think = 0.18 + Math.random()*0.12;
    let tx = P.x + c.aimX;
    if (C.look > 0) for (const o of cars){
      if (o === c || (o.role === 'chaser' && o.state === 'drive' && o.key !== 'police')) continue;
      const ahead = c.y - o.y;
      if (ahead <= 0 || ahead > C.look + (c.h + o.h)/2) continue;
      if (Math.abs(o.x - c.x) < (c.w + o.w)/2 + 3){
        const left = o.x - (o.w + c.w)/2 - 8, right = o.x + (o.w + c.w)/2 + 8;
        tx = Math.abs(left - c.x) < Math.abs(right - c.x) ? left : right; break;
      }
    }
    if (C.look > 0) for (const w of works){
      const ahead = (c.y - c.h/2) - w.y1;
      if (ahead < -6 || ahead > C.look || tx + c.w/2 + 3 <= w.x0 || tx - c.w/2 - 3 >= w.x1) continue;
      tx = openX(tx, w.y1, c.w, 0, c.x);
    }
    c.tx = works.length ? openX(tx, c.y, c.w, c.h/2, c.x) : tx;
  }
  c.vx += clamp(clamp((c.tx - c.x) * 5, -C.lat, C.lat) - c.vx, -900*dt, 900*dt);
  c.vy += clamp(vyT - c.vy, -300*dt, 300*dt);
  c.a = clamp(c.vx / 500, -0.35, 0.35);
  if (dy > 900){ c.y = P.y + 480; c.vy = P.vy; c.x = openX(c.x, c.y, c.w, 40); }
}

