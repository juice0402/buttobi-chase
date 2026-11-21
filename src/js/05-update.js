/* ---------- update ---------- */
function integrate(b, dt){
  if (b.state === 'wreck'){
    const f = Math.exp(-2.4*dt); b.vx *= f; b.vy *= f; b.av *= Math.exp(-1.6*dt); b.a += b.av*dt;
    if (b.air > 0) b.air -= dt;
    if (b.fire > 0){ b.fire -= dt; b.smokeT -= dt; if (b.smokeT <= 0){ b.smokeT = 0.09; smoke(b.x, b.y); } }
  }
  b.x += b.vx*dt; b.y += b.vy*dt;
  const lim = b.free ? 1e9 : halfAt(-b.y / M) - b.w/2;
  if (b.x > lim){ b.x = lim; if (b.vx > 0){ hitWall(b, b.vx); b.vx *= -0.35; } }
  else if (b.x < -lim){ b.x = -lim; if (b.vx < 0){ hitWall(b, -b.vx); b.vx *= -0.35; } }
}

function update(dt){
  t += dt;
  for (let i = fx.length-1; i >= 0; i--){ const p = fx[i]; p.life -= dt; if (p.life <= 0){ fx.splice(i,1); continue; } p.x += p.vx*dt; p.y += p.vy*dt; const f = p.type === 'smoke' ? 0.99 : 0.96; p.vx *= f; p.vy *= f; p.rot += p.vr*dt;
    if (p.type === 'part'){ p.vz -= 520*dt; p.z += p.vz*dt; if (p.z < 0){ p.z = 0; if (p.vz < -45){ p.vz = -p.vz*0.42; p.vx *= 0.7; p.vy *= 0.7; p.vr *= 0.6; } else { p.vz = 0; p.vx *= 0.82; p.vy *= 0.82; p.vr *= 0.75; } } } }
  for (let i = pops.length-1; i >= 0; i--){ pops[i].life -= dt*1.1; if (pops[i].life <= 0) pops.splice(i,1); }
  shake = Math.max(0, shake - dt*18);
  if (P.slowT > 0) P.slowT -= dt;
  if (hurtT > 0) hurtT -= dt;
  for (const c of cars) if (c.slowT > 0) c.slowT -= dt;
  const playing = state === 'play';

  if (playing){
    // heat, combo, boost
    heatPts += dt * 1.8 * TOWN.heat * (undercover() ? 0.5 : 1);
    if (noticeT > 0){ noticeT -= dt; if (noticeT <= 0 && P.key === 'ppolice') popMe(P.x, P.y - 30, 'まぎれこんだ…', '#7fd3ff'); }
    // ambulance: the body mends itself bit by bit
    if (P.key === 'amb' && P.state === 'drive' && P.hp < P.maxHp){ P.hp = Math.min(P.maxHp, P.hp + P.maxHp * 0.011 * dt); healT -= dt; if (healT <= 0){ healT = 1.6; popMe(P.x + 14, P.y - 18, '＋', '#38c79a'); snd('heal'); } }
    const ns = Math.min(TOWN.cap, 1 + Math.floor(heatPts / 100));
    if (ns > star){ star = ns; maxStar = Math.max(maxStar, star); toast(`手配度 ★${star}`); snd('star'); sndDo(R => R.heat(star)); }
    if (comboT > 0){ comboT -= dt; if (comboT <= 0){ comboN = 0; $('combo').hidden = true; } }
    if (boosting){
      boost -= NITRO_DRAIN()*dt; if (boost <= 0){ boost = 0; boosting = false; coolT = OVERHEAT_T; sndDo(R => R.nitro(false)); }
      trailT -= dt; if (trailT <= 0){ trailT = 0.035; trail.unshift({x:P.x, y:P.y, a:P.a}); if (trail.length > 6) trail.pop(); }
      if (Math.random() < 0.6) burst(P.x + (Math.random() - 0.5)*P.w, P.y + P.h/2, 'spark', 1);
      if (Math.random() < 0.5 && fx.length < 280) fx.push({type:'boom', x:P.x + (Math.random() - 0.5)*P.w*0.6, y:P.y + P.h/2 + 6, vx:(Math.random() - 0.5)*30, vy:40 + Math.random()*40, life:0.35, max:0.35, size:3 + Math.random()*3, color:['#e3261b','#ff8a3d','#ffc83d'][(Math.random()*3)|0], rot:0, vr:0});
    } else if (trail.length) trail.pop();
    if (coolT > 0) coolT -= dt;
    // player control
    const L = laneInfo(dist), lim = L.half - P.w/2 - 1;
    if (keys.left) targetX -= 300*dt;
    if (keys.right) targetX += 300*dt;
    targetX = clamp(targetX, -lim, lim);
    if (drag) drag.tx = targetX - (drag.lastX - drag.x) * 1.3 / s;
    const slick = ice.length > 0 && onIce(P) && !boosting;
    if (slick && !onIceNow){ popMe(P.x, P.y - 24, 'つるつる！', '#7fd3ff'); snd('ice'); tip('ice', '凍った道！ すべるよ。追っ手をすべらせて かべにぶつけよう'); }
    onIceNow = slick;
    P.vy += clamp(-pSpeed() - P.vy, -380*dt*(slick ? 0.4 : 1), 380*dt*(slick ? 0.4 : 1));
    P.vx += clamp(clamp((targetX - P.x) * 9, -280, 280) - P.vx, -1500*dt*(slick ? 0.22 : 1), 1500*dt*(slick ? 0.22 : 1));
    P.a = clamp(P.vx / 700, -0.3, 0.3);
    wrongWay = L.nOn > 0 && P.x > -L.half + (L.n - L.nOn) * L.lw + 4;
    if (wrongWay) addBoost(10 * dt);
    { const v = -P.vy, top = flowBase();
      if (P.slowT > 0 || v < top * 0.85) flowT = 0; else if (v >= top * 0.93) flowT += dt;
      const lv = flowT >= FLOW_T2 ? 2 : flowT >= FLOW_T1 ? 1 : 0;
      if (lv > flowLv){ snd('whoosh', lv); flowPulse = 0.4; if (!boosting) ring(P.x, P.y, lv > 1 ? 56 : 40, 'rgba(255,255,255,0.9)'); }
      flowLv = lv; flowK += ((lv > 1 ? 1 : lv ? 0.5 : 0) - flowK) * Math.min(1, dt * (lv ? 2.5 : 6)); if (flowPulse > 0) flowPulse -= dt; }
    // nitro smashes the roadside: hugging the edge knocks the buildings there into blocks (pictures only)
    if (boosting){ shake = Math.max(shake, 2.5); if ((edgeSmashT -= dt) <= 0 && Math.abs(P.x) > L.half - P.w/2 - 8){ const sg = Math.sign(P.x) || 1;
      if (breakAt(sg * (L.half + 10), P.y, sg, false)){ blocksFly(sg * (L.half + 10), P.y, sg, 5); burst(sg * L.half, P.y, 'spark', 5); snd('shock', 0.45); } edgeSmashT = 0.18; } }
    // sitting in one lane gets you noticed: after CAMP_T s within half a lane, the police push harder until you move half a lane or more
    if (Math.abs(P.x - campX) > LANE * 0.5){ campX = P.x; campT = 0; camping = false; }  // any move of half a lane clears it (anchored where it started)
    else if ((campT += dt) >= CAMP_T && !camping){
      camping = true; campX = P.x; if (star >= 3 && pinchNext) pinchNext = Math.min(pinchNext, t + 2.5); // (before ★3 there is no pincer schedule to pull in)
      if (!undercover()){ popMe(P.x, P.y - 34, '目立ってる！', '#ff5a36'); snd('warn'); tip('camp', 'じっとしてると目立つ！ 車線を変えよう'); }
    }
    // pickup: tosses a drum off the bed when a chaser sits right behind
    if (P.key === 'pickup' && P.state === 'drive'){
      P.drumT -= dt;
      if (P.drumT <= 0 && cars.some(c => c.role === 'chaser' && c.state === 'drive' && c.plan !== 'gone' && c.y - P.y > P.h/2 + 10 && c.y - P.y < 210 && Math.abs(c.x - P.x) < 26 + c.w/2)){
        P.drumT = DRUM_EVERY;
        drums.push({x:P.x + (Math.random() - 0.5)*6, y:P.y + P.h/2 + 14, alive:true, own:true, t0:t});
        popMe(P.x, P.y + P.h/2 + 22, 'ポイッ！', '#38c79a'); burst(P.x, P.y + P.h/2 + 8, 'spark', 4); snd('drum');
      }
    }
    const hpR = P.hp / P.maxHp;
    if (hpR < 0.6){ P.smokeT -= dt; if (P.smokeT <= 0){ P.smokeT = hpR < 0.3 ? 0.04 : hpR < 0.45 ? 0.08 : 0.16; smoke(P.x + (Math.random() - 0.5)*P.w*0.4, P.y - P.h*0.2, hpR < 0.3 ? '#2f3238' : '#6b717b'); } }
    // spawns
    const a = AREAS[areaIdx];
    spawnAcc += Math.max(0, -P.vy) * dt;
    while (spawnAcc > a.gap){ spawnAcc -= a.gap; for (let i = 0; i < a.per; i++){ const y = worldTop() - 40 - Math.random()*40; if (!calmSkip(y)) spawnTraffic(y, Math.random() < a.oppRate); } }
    nextChaser -= dt;
    if (nextChaser <= 0){ spawnChaser(); nextChaser = HEAT[star-1].every * (heli ? 0.6 : 1) * (boss ? 1.8 : 1) * (camping ? 0.7 : 1) * (0.75 + Math.random()*0.5); }
    // intersections and level crossings
    const eR = camX + W/(2*s) + 40, eL = camX - W/(2*s) - 40;
    for (const q of isecs){
      if (q.y > worldBottom() + 40 || q.y < worldTop() - 260) continue;
      q.tl -= dt; q.tr -= dt;
      if (q.tl <= 0){ q.tl = 1.0 + Math.random()*1.0; spawnCross(q, -1, eR); }
      if (q.tr <= 0){ q.tr = 1.0 + Math.random()*1.0; spawnCross(q, 1, eL); }
    }
    for (const r of rails){
      if (r.state !== 'idle' || P.y < r.y || P.y - r.y > 300) continue;
      const eta = (P.y - r.y + 14 + P.h/2) / Math.max(60, -P.vy);
      r.fx = Math.min(P.x - TRAIN_V*(eta + 0.35), -(halfAt(-r.y/M) + 60));
      r.state = 'run'; toast('ふみきり！ 電車が来る！'); snd('railbell');
      r.hornAt = t + Math.max(0.2, eta - 0.3);
    }
    for (const r of rails) if (r.hornAt && t >= r.hornAt){ r.hornAt = 0; snd('train'); }
    for (const w of works) if (!w.seen && w.signY > worldTop() - 20){ w.seen = true; tip('works', 'この先 工事中！ 車線がへるよ。さくにパトカーをさそいこもう'); }
    // harbor cranes: a container comes down right after you pass under — lure the police below it
    for (const c of cranes){
      if (c.state === 'idle' && P.y > c.y && P.y - c.y < 330){
        const eta = (P.y - c.y + P.h/2 + 10) / Math.max(60, -P.vy), half = halfAt(-c.y / M);
        c.x = clamp(P.x, -half + c.w/2, half - c.w/2); c.state = 'warn'; c.at = t + eta + 0.45;
        tip('crane', 'コンテナが落ちてくる！ 追っ手を下にさそいこもう', 'コンテナに注意！'); snd('warn');
      }
      if (c.state === 'warn' && t >= c.at - 0.35) c.state = 'drop';
      if (c.state === 'drop' && t >= c.at){ c.state = 'done'; landContainer(c); }
    }
    if (HEAT[star-1].heli && !heli && t > heliCool){ heli = {x:P.x, y:worldBottom() + 80, life:14}; toast('ヘリが来た！'); snd('warn'); }
    // missions done in the middle of a run get a call-out (they are paid at the end)
    misCheckT -= dt; if (misCheckT <= 0){ misCheckT = 0.5; checkMis(false); }
    if (misQueue.length && t >= misT){ const m = misQueue.shift(); toast(`ミッション達成！ ${m}`, 1900); snd('mission'); misT = t + 2.1; }
    // chaser tactics
    if (!boss && nextBoss < BOSSES.length && dist >= BOSSES[nextBoss].from){ if (dist < BOSSES[nextBoss].to - 60) spawnBoss(nextBoss); else nextBoss++; }
    if (boss && dist >= BOSSES[boss.boss.i].to){ boss.boss.mode = 'leave'; toast(`${BOSSES[boss.boss.i].name || TOWN.boss.name}をふりきった！`); endBoss(); }
    if (star >= 2 && !boss){
      if (!spikeNext) spikeNext = Math.max(t + 4, 11);
      if (t >= spikeNext){ if (!undercover() && !cars.some(c => c.plan === 'spike' && c.state === 'drive')) startSpiker(); spikeNext = t + SPIKE_EVERY[star] + Math.random()*3; }
    }
    if (star >= 3 && !boss && halfAt(dist) >= 80){
      if (!pinchNext) pinchNext = Math.max(t + 5, 13);
      if (t >= pinchNext){ if (!undercover() && !cars.some(c => c.plan === 'pin' && c.state === 'drive')) spawnPincers(); pinchNext = t + (PINCH_EVERY[star] + Math.random()*4) * (camping ? 0.5 : 1); }
    }
  }
  if (heli){
    heli.life -= dt;
    const ty = heli.life > 0 ? P.y + 34 + Math.sin(t*1.3)*10 : P.y - 900;
    heli.y += (ty - heli.y) * Math.min(1, dt * (heli.life > 0 ? 1.2 : 0.7));
    heli.x += (P.x - heli.x) * Math.min(1, dt * 1.5);
    if (heli.life < 0 && heli.y < worldTop() - 100){ heli = null; heliCool = t + 12; }
  }

  // AI + physics
  for (const c of cars) if (c.state === 'drive'){ if (c.role === 'traffic'){ if (c.cross) driveCross(c, dt); else driveTraffic(c, dt); } else driveChaser(c, dt); }
  integrate(P, dt);
  for (const c of cars) integrate(c, dt);
  const all = [P, ...cars];
  all.sort((p, q) => p.y - q.y);
  for (let i = 0; i < all.length; i++) for (let j = i + 1; j < all.length && all[j].y - all[i].y < 90; j++) collide(all[i], all[j]);
  if (works.length) for (const b of all) if (!b.free && !b.fixed) workHit(b);

  // trains, drums, chained explosions
  for (const r of rails){
    if (r.state !== 'run') continue;
    r.fx += TRAIN_V * dt;
    if (r.fx - TRAIN_LEN > 1000){ r.state = 'done'; continue; }
    for (const b of [P, ...cars]){
      if (t - (b.trainT || -9) < 0.5) continue;
      const hx = b.cross ? b.h/2 : b.w/2, hy = b.cross ? b.w/2 : b.h/2;
      if (Math.abs(b.y - r.y) > 14 + hy || b.x + hx < r.fx - TRAIN_LEN || b.x - hx > r.fx) continue;
      if (b === P && boosting){ b.trainT = t; burst(b.x, b.y, 'spark', 8); continue; }
      b.trainT = t; b.vx += 520 + Math.random()*120; b.vy += (b.y < r.y ? -1 : 1) * 80;
      burst(b.x, b.y, 'spark', 10); shake = Math.max(shake, 6);
      if (b === P){ if (state === 'play'){ dmgSrc = 'train'; damage(45); popMe(P.x, P.y - 30, 'でんしゃ！', '#ffffff'); } }
      else { b.lastHit = 'player'; b.lastHitT = t; if (b.boss && b.state === 'drive'){ hurtBoss(b, 150); pop(b.x, b.y - 30, 'でんしゃドーン！', '#ffc83d'); } else if (b.state === 'drive') crash(b, 'train'); else b.av += 10; }
    }
  }
  const dTop = worldTop() - 60, dBot = worldBottom() + 60;
  for (const dr of drums){
    if (!dr.alive || dr.y < dTop || dr.y > dBot) continue;
    for (const b of [P, ...cars]){
      // drums tossed off the pickup bed go off under anyone (but not under you right after the toss)
      if (dr.own ? (b === P && t - dr.t0 < 1.5) || b.cross : !(b === P || b.role === 'chaser' || b.state === 'wreck' || (b.lastHit === 'player' && t - b.lastHitT < 2))) continue;
      if (Math.abs(b.x - dr.x) > b.h/2 + 8 || Math.abs(b.y - dr.y) > b.h/2 + 8) continue;
      const c = circlesOf(b); let hit = false;
      for (let i = 0; i < 6; i += 2) if (Math.hypot(c[i] - dr.x, c[i+1] - dr.y) < c[6] + 6) hit = true;
      if (hit){ dr.alive = false; pop(dr.x, dr.y, 'ドッカーン！', '#ffc83d'); ownBlast = !!dr.own; explodeAt(dr.x, dr.y, 60, 320, true, dr.own ? 4 : 12); ownBlast = false; break; }
    }
  }
  for (let i = booms.length - 1; i >= 0; i--) if (booms[i].at <= t){ const bm = booms.splice(i, 1)[0]; explodeAt(bm.x, bm.y, bm.R, bm.F, bm.credit, bm.dmg, bm.big); }
  // spike strips puncture anyone who drives over them, police included
  for (let i = spikes.length - 1; i >= 0; i--){
    const sp = spikes[i];
    if (sp.gone || sp.y > worldBottom() + 200){ spikes.splice(i, 1); continue; }
    for (const b of [P, ...cars]){
      if (b.state !== 'drive' || b.cross || sp.hit.has(b)) continue;
      if (Math.abs(b.y - sp.y) > b.h/2 + 4 || Math.abs(b.x - sp.x) > sp.w/2 + b.w/2 - 3) continue;
      if (b === P && boosting){ sp.gone = true; burst(sp.x, sp.y, 'spark', 14); pop(sp.x, sp.y, 'トゲをふみつぶした！', '#ffc83d'); break; }
      sp.hit.add(b); burst(b.x, sp.y, 'spark', 6);
      if (b === P){ if (state === 'play'){ P.slowT = Math.max(P.slowT, 2.2); damage(5); popMe(P.x, P.y - 26, 'パンク！', '#ffffff'); snd('spike'); } }
      else if (b.boss){ hurtBoss(b, 35); b.slowT = 1.6; }
      else if (b.plan !== 'gone'){ if (b.role === 'chaser'){ b.lastHit = 'player'; b.lastHitT = t; } crash(b, 'spike'); }
    }
    if (sp.gone) spikes.splice(i, 1);
  }

  // near misses, cleanup
  const wb = worldBottom(), wt = worldTop();
  for (let i = cars.length-1; i >= 0; i--){
    const c = cars[i], rel = c.y - P.y;
    if (playing && !c.cross && c.state === 'drive' && !c.nm && c.prevRel !== null && c.prevRel < 0 && rel >= 0){
      const gap = Math.abs(c.x - P.x) - (c.w + P.w)/2;
      const sports = P.key === 'sports';
      if (gap > 0 && gap < (sports ? 15 : 12)){ c.nm = true; nearN++; if (c.opp) nearOppN++; nearMoney += 5; snd('near'); addBoost((c.opp ? 16 : 9) * (sports ? 1.5 : 1)); popMe(P.x, P.y - 24, (c.opp ? 'すれすれ逆走！' : 'ニアミス！') + (sports ? ' ×1.5' : ''), '#7fd3ff'); if (sports) burst(P.x, P.y, 'spark', 3); }
    }
    c.prevRel = rel;
    const keep = c.role === 'chaser' && c.state === 'drive' && c.plan !== 'gone' && !(c.boss && c.boss.mode === 'leave');
    const offScreen = Math.abs(c.x - camX) > W/(2*s) + 20;
    if (!keep && (c.collected || c.y > wb + 300 || c.y < wt - 700 || (c.cross && Math.abs(c.x) > 560) || (c.cross && c.stall > 3 && offScreen))) cars.splice(i, 1);
  }

  camY = P.y;
  dist = Math.max(dist, -P.y / M);
  const half = halfAt(dist), camLim = Math.max(0, half + 30 - W/(2*s));
  camX += (clamp(P.x * 0.6, -camLim, camLim) - camX) * Math.min(1, dt*4);

  if (playing){
    const ai = areaIndexAt(dist); if (ai !== areaIdx){ areaIdx = ai; banner(AREAS[ai].name); }
    if (dist >= GOAL){ state = 'ending'; endKind = 'clear'; endT = 1.6; banner('にげきった！'); burst(P.x, P.y, 'spark', 30); boosting = false; nitroOff(); drag = null; snd('goal'); sndDo(R => { R.nitro(false); R.boss(false); R.siren(0); R.jingle('clear'); }); }
  } else if (state === 'ending'){
    if (endKind === 'clear'){ P.vy += clamp(-120 - P.vy, -200*dt, 200*dt); P.vx *= 0.9; }
    endT -= dt; if (endT <= 0) finishRun();
  }
}

