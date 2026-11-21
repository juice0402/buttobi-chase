/* ground cache (11/17 しょーくん「フレームレート落ちた？ 家1軒1軒描写してない？」): the road, the roadside, the buildings and the ice never move,
   so they are painted once into tall strips (GC_H world units, at up to 2x pixels) and each frame only stamps the strips on screen.
   A strip is painted again when its building breaks (gcDirty), when the screen size or scale changes, and for a new run */
const GC_H = 224, GC_PAD = 2, GC = {strips: new Map(), x0: 0, x1: 0, ps: 0};
function gcReset(){ GC.strips.clear(); GC.ps = 0; }
function gcDirty(y){ for (const yy of [y - 8, y + 64]){ const c = GC.strips.get(Math.floor(yy / GC_H)); if (c) c.dirty = true; } }
function gcPaint(i, c){
  const g = c.getContext('2d'), saved = ctx;
  ctx = g; ctx.setTransform(GC.ps, 0, 0, GC.ps, -GC.x0 * GC.ps, -(i * GC_H - GC_PAD) * GC.ps);
  try { drawGround(i * GC_H - GC_PAD, (i + 1) * GC_H + GC_PAD, GC.x0, GC.x1); } finally { ctx = saved; }
  c.dirty = false;
}
function groundStamp(top, bot, left, right){
  const ps = s * DPR;
  if (ps !== GC.ps || left < GC.x0 || right > GC.x1){   // a new scale or a wider view: start the strips again, a little wider than needed
    const m = Math.max(Math.abs(left), Math.abs(right)) + 60; GC.strips.clear(); GC.ps = ps; GC.x0 = -m; GC.x1 = m;
  }
  const i0 = Math.floor(top / GC_H), i1 = Math.floor(bot / GC_H);
  let painted = 0;
  for (let i = i0; i <= i1; i++){
    let c = GC.strips.get(i);
    if (!c){ c = document.createElement('canvas'); c.width = Math.ceil((GC.x1 - GC.x0) * ps); c.height = Math.ceil((GC_H + GC_PAD * 2) * ps); GC.strips.set(i, c); gcPaint(i, c); painted++; }
    else if (c.dirty){ gcPaint(i, c); painted++; }
    ctx.drawImage(c, GC.x0, i * GC_H - GC_PAD, GC.x1 - GC.x0, GC_H + GC_PAD * 2);
  }
  // paint the next strip ahead on a quiet frame, so a new strip rarely costs a frame of its own
  if (!painted && !GC.strips.has(i0 - 1)){ const c = document.createElement('canvas'); c.width = Math.ceil((GC.x1 - GC.x0) * ps); c.height = Math.ceil((GC_H + GC_PAD * 2) * ps); GC.strips.set(i0 - 1, c); gcPaint(i0 - 1, c); }
  // strips left behind (below the screen) are dropped; at most a screen and a half is kept
  for (const k of GC.strips.keys()) if (k > i1 + 1 || k < i0 - 2) GC.strips.delete(k);
}
function drawGround(top, bot, left, right){
  const STEP = 24;
  for (let y = Math.floor(top/STEP)*STEP; y < bot; y += STEP){
    const L = laneInfo(-y / M), a = L.a, half = L.half, st = a.style;
    ctx.fillStyle = a.side; ctx.fillRect(left, y, right - left, STEP + 1);
    if (st === 'dock'){ ctx.fillStyle = WATER; ctx.fillRect(half + 26, y, Math.max(0, right - half - 26), STEP + 1); ctx.fillStyle = '#8e99a4'; ctx.fillRect(half + 22, y, 4, STEP + 1); }
    if (st === 'bridge'){ ctx.fillStyle = '#8e99a4'; ctx.fillRect(-half - 10, y, 10, STEP + 1); ctx.fillRect(half, y, 10, STEP + 1); }
    if (st === 'canyon'){ ctx.fillStyle = '#a9542f'; ctx.fillRect(-half - 70, y, 56, STEP + 1); ctx.fillRect(half + 14, y, 56, STEP + 1); }
    ctx.fillStyle = a.road; ctx.fillRect(-half, y, half*2, STEP + 1);
    const dashOn = (Math.floor(y/STEP) & 1) === 0;
    if (!NO_LANES[st]){
      for (let i = 1; i < L.n; i++){
        const x = -half + i*L.lw;
        if (L.nOn > 0 && i === L.n - L.nOn){ ctx.fillStyle = '#ffd24a'; ctx.fillRect(x - 3, y, 2, STEP + 1); ctx.fillRect(x + 1, y, 2, STEP + 1); }
        else if (dashOn){ ctx.fillStyle = '#f2f4f0'; ctx.fillRect(x - 1.5, y, 3, STEP); }
      }
    }
    if (HW_STYLES[st]){ ctx.fillStyle = '#ffd24a'; ctx.fillRect(-half + 3, y, 3, STEP + 1); ctx.fillRect(half - 6, y, 3, STEP + 1); }
    if (st === 'pass' || st === 'snowtown' || st === 'snowhw'){ ctx.fillStyle = 'rgba(255,255,255,0.55)'; ctx.fillRect(-half, y, 5, STEP + 1); ctx.fillRect(half - 5, y, 5, STEP + 1); }
    if (st === 'dirt' || st === 'border'){ ctx.fillStyle = shade(a.road, -0.12); ctx.fillRect(-half*0.5 - 4, y, 8, STEP + 1); ctx.fillRect(half*0.5 - 4, y, 8, STEP + 1); ctx.fillStyle = 'rgba(80,60,40,0.25)'; ctx.fillRect(-1, y, 2, STEP + 1); }
    if (st === 'canyon'){ ctx.fillStyle = shade(a.road, -0.14); ctx.fillRect(-half*0.45 - 4, y, 8, STEP + 1); ctx.fillRect(half*0.45 - 4, y, 8, STEP + 1); }
    if (!NO_LANES[st] && !HW_STYLES[st]){ ctx.fillStyle = 'rgba(255,255,255,0.6)'; ctx.fillRect(-half + 1, y, 2.5, STEP + 1); ctx.fillRect(half - 3.5, y, 2.5, STEP + 1); }
  }
  if (!woodP){ woodP = texPat('wood'); feltP = texPat('felt'); }
  ctx.fillStyle = feltP; ctx.fillRect(left, top, right - left, bot - top);
  const CELL = 56;
  for (let k = Math.floor(top/CELL) - 1; k <= Math.ceil(bot/CELL) + 1; k++){
    const y = k*CELL, d = Math.max(0, -y/M), st = AREAS[areaIndexAt(d)].style, half = halfAt(d);
    for (const sg of [-1, 1]){
      const r1 = rnd(k*7 + (sg > 0 ? 3 : 0)), r2 = rnd(k*13 + (sg > 0 ? 5 : 1)), r3 = rnd(k*29 + (sg > 0 ? 11 : 2));
      if (st === 'town' || st === 'snowtown'){
        const snow = st === 'snowtown', edge = sg > 0 ? right : -left;
        for (let j = 0, xx = half + 140 + r1*20; xx < edge && j < 8; j++){ const ww = 30 + rnd(k*41 + j*7 + sg)*24, col = HOUSE[(rnd(k*53 + j*11 + sg)*HOUSE.length)|0];
          if (rnd(k*61 + j*3 + sg) < 0.8) block(sg*(xx + ww/2) - ww/2, y + 7, ww, CELL - 14, col, snow ? 4 : (rnd(k*67 + j*5 + sg)*4)|0);
          xx += ww + 10; }
        const x0 = half + 6, hw = 30 + r1*18, hh = CELL - 10, cx = sg*(x0 + hw/2), col = HOUSE[(r2*HOUSE.length)|0];
        { const bk = broken.get(k + ':' + sg); if (bk) rubble(cx - hw/2, y + 5, hw, hh, col, sg, k*31 + sg, bk > 1); else block(cx - hw/2, y + 5, hw, hh, col, snow ? 4 : 2); }
        const x1 = x0 + hw + 8 + r3*10, hw2 = 28 + r3*16, cx2 = sg*(x1 + hw2/2), col2 = HOUSE[(r3*HOUSE.length)|0];
        block(cx2 - hw2/2, y + 8, hw2, hh - 6, col2, snow ? 4 : r2 > 0.5 ? 3 : 1);
        if (snow && r1 > 0.6) pine(sg*(x1 + hw2 + 22 + r2*30), y + CELL/2, 9 + r3*5);
      } else if (st === 'avenue'){
        ctx.fillStyle = '#d6dce3'; ctx.fillRect(sg > 0 ? half : -half - 16, y, 16, CELL + 1);
        { const edge = sg > 0 ? right : -left; for (let j = 0, xx = half + 140 + r3*20; xx < edge && j < 6; j++){ const ww = 50 + rnd(k*43 + j*5 + sg)*50, col = BLDG[(rnd(k*57 + j*13 + sg)*BLDG.length)|0];
          block(sg*(xx + ww/2) - ww/2, y + 4, ww, CELL - 8, col, 1); xx += ww + 14; } }
        const x0 = half + 22, bw = 54 + r1*40, bh = CELL - 6, cx = sg*(x0 + bw/2), col = BLDG[(r2*BLDG.length)|0];
        { const bk = broken.get(k + ':' + sg); if (bk) rubble(cx - bw/2, y + 3, bw, bh, col, sg, k*31 + sg, bk > 1); else block(cx - bw/2, y + 3, bw, bh, col, r3 > 0.6 ? 3 : 1); }
        if ((k & 1) === 0){ ctx.fillStyle = '#4f9a5a'; circle(sg*(half + 8), y + CELL/2, 7); }
      } else if (st === 'port'){
        ctx.fillStyle = '#d6dce3'; ctx.fillRect(sg > 0 ? half : -half - 12, y, 12, CELL + 1);
        { const edge = sg > 0 ? right : -left; for (let j = 0, xx = half + 170 + r3*20; xx < edge && j < 5; j++){ const ww = 80 + rnd(k*47 + j*5 + sg)*60, col = WARE[(rnd(k*59 + j*13 + sg)*WARE.length)|0];
          ctx.fillStyle = col; ctx.fillRect(sg*(xx + ww/2) - ww/2, y + 2, ww, CELL - 4); ctx.fillStyle = shade(col, -0.12); for (let q = sg*(xx + ww/2) - ww/2 + 6; q < sg*(xx + ww/2) + ww/2 - 4; q += 10) ctx.fillRect(q, y + 2, 3, CELL - 4); xx += ww + 16; } }
        if ((k & 3) !== 0 || r1 > 0.3){
          const x0 = half + 18, bw = 80 + r1*60, bh = CELL - 4, cx = sg*(x0 + bw/2), col = WARE[(r2*WARE.length)|0];
          const bk = broken.get(k + ':' + sg);
          if (bk) rubble(cx - bw/2, y + 2, bw, bh, col, sg, k*31 + sg, bk > 1);
          else { block(cx - bw/2, y + 2, bw, bh, col, 0);
            ctx.fillStyle = shade(col, -0.12); for (let xx = cx - bw/2 + 6; xx < cx + bw/2 - 4; xx += 10) ctx.fillRect(xx, y + 2, 3, bh);
            ctx.fillStyle = shade(col, -0.35); ctx.fillRect(sg > 0 ? cx - bw/2 : cx + bw/2 - 6, y + 12, 6, 22); }
        } else { ctx.fillStyle = CONT_COL[(r3*CONT_COL.length)|0]; ctx.fillRect(sg*(half + 30) - 13, y + 4, 26, 48); ctx.fillStyle = 'rgba(0,0,0,0.18)'; for (let yy = y + 8; yy < y + 50; yy += 6) ctx.fillRect(sg*(half + 30) - 13, yy, 26, 2); }
      } else if (st === 'dock'){
        if (sg < 0){
          for (let j = 0; j < 3; j++){ if (rnd(k*31 + j) < 0.25) continue; const cx = -half - 26 - j*30, col = CONT_COL[((rnd(k*17 + j)*CONT_COL.length)|0)];
            ctx.fillStyle = 'rgba(18,28,38,0.22)'; ctx.fillRect(cx - 12 + 3, y + 7, 25, 48); ctx.fillStyle = col; ctx.fillRect(cx - 12, y + 4, 25, 48);
            ctx.fillStyle = 'rgba(0,0,0,0.18)'; for (let yy = y + 8; yy < y + 50; yy += 6) ctx.fillRect(cx - 12, yy, 25, 2); }
        } else {
          ctx.fillStyle = '#20242c'; if ((k & 1) === 0) circle(half + 16, y + CELL/2, 3.5);
          ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = 2; ctx.beginPath(); const wx = half + 50 + r1*120; ctx.moveTo(wx, y + 20); ctx.quadraticCurveTo(wx + 10, y + 14, wx + 20, y + 20); ctx.stroke();
          if (r2 > 0.85){ const bx = half + 90 + r3*90; ctx.fillStyle = '#f7f7f4'; rr(bx - 10, y + 6, 20, 44, 8); ctx.fill(); ctx.fillStyle = '#d9483b'; ctx.fillRect(bx - 10, y + 30, 20, 6); }
        }
      } else if (st === 'bridge'){
        ctx.fillStyle = (k & 1) ? '#e94f37' : '#f7f7f4'; ctx.fillRect(sg > 0 ? half + 2 : -half - 8, y, 6, CELL/2);
        ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = 2; ctx.beginPath(); const wx = sg*(half + 40 + r1*140); ctx.moveTo(wx, y + 26); ctx.quadraticCurveTo(wx + 10, y + 20, wx + 20, y + 26); ctx.stroke();
        if ((k % 9) === 0){ ctx.fillStyle = '#c9ced6'; ctx.fillRect(sg*(half + 10) - 5, y, 10, CELL); }
      } else if (st === 'highway' || st === 'snowhw' || st === 'deserthw'){
        ctx.fillStyle = '#e2e7ec'; ctx.fillRect(sg > 0 ? half + 2 : -half - 5, y, 3, CELL + 1);
        ctx.fillStyle = '#9aa4ae'; ctx.fillRect(sg > 0 ? half + 2 : -half - 5, y + CELL/2, 3, 5);
        if (st === 'highway' && r1 > 0.45){ const tx = sg*(half + 36 + r2*90), tr = 11 + r3*8; ctx.fillStyle = 'rgba(18,28,38,0.2)'; circle(tx + 4, y + CELL/2 + 5, tr); ctx.fillStyle = '#4c8a47'; circle(tx, y + CELL/2, tr); ctx.fillStyle = '#6aa95f'; circle(tx - tr*0.3, y + CELL/2 - tr*0.3, tr*0.45); }
        if (st === 'snowhw' && r1 > 0.5) pine(sg*(half + 34 + r2*110), y + CELL/2, 10 + r3*7);
        if (st === 'deserthw'){ if (r1 > 0.6){ ctx.fillStyle = '#cfae74'; ellipse(sg*(half + 40 + r2*120), y + CELL/2, 16 + r3*14, 8 + r3*6); } if (r2 > 0.82){ const cx = sg*(half + 70 + r3*90); ctx.fillStyle = '#5f9b5a'; ctx.fillRect(cx - 3, y + 18, 6, 20); ctx.fillRect(cx - 9, y + 24, 6, 4); ctx.fillRect(cx + 3, y + 22, 6, 4); } }
      } else if (st === 'pass'){
        ctx.fillStyle = '#ffffff'; ellipse(sg*(half + 8), y + CELL/2, 9 + r1*5, 20); ctx.fillStyle = 'rgba(120,160,200,0.25)'; ellipse(sg*(half + 10), y + CELL/2 + 6, 7, 12);
        if (r2 > 0.25) pine(sg*(half + 34 + r1*40), y + CELL*0.3, 11 + r3*6);
        if (r3 > 0.5) pine(sg*(half + 80 + r2*70), y + CELL*0.75, 10 + r1*7);
      } else if (st === 'canyon'){
        ctx.fillStyle = '#8f4426'; ellipse(sg*(half + 24 + r1*30), y + CELL/2, 12 + r2*10, 9 + r3*6);
        if (r2 > 0.5){ ctx.fillStyle = '#b8653b'; ellipse(sg*(half + 90 + r3*60), y + CELL/2, 18 + r1*12, 12); }
      } else if (st === 'border'){
        ctx.fillStyle = '#7b8590'; ctx.fillRect(sg > 0 ? half + 12 : -half - 14, y, 2, CELL + 1); for (let yy = y; yy < y + CELL; yy += 8) ctx.fillRect(sg > 0 ? half + 10 : -half - 16, yy, 6, 1.5);
        if ((k % 7) === 0) block(sg*(half + 40) - 12, y + 6, 24, 24, '#b08a5c', 1);
        if (r1 > 0.6){ ctx.fillStyle = '#b39469'; ellipse(sg*(half + 60 + r2*120), y + CELL/2, 9 + r3*10, 6 + r3*6); }
      } else {
        if (r1 > 0.55){ ctx.fillStyle = '#b39469'; ellipse(sg*(half + 20 + r2*120), y + CELL/2, 9 + r3*10, 6 + r3*6); }
        if (r2 > 0.8){ const cx = sg*(half + 60 + r3*100); ctx.fillStyle = '#5f9b5a'; ctx.fillRect(cx - 3, y + 18, 6, 20); ctx.fillRect(cx - 9, y + 24, 6, 4); ctx.fillRect(cx + 3, y + 22, 6, 4); }
      }
    }
  }
  // ice patches on the snow pass
  for (const p of ice){
    if (p.y + p.h/2 < top || p.y - p.h/2 > bot) continue;
    ctx.fillStyle = 'rgba(196,232,255,0.82)'; rr(p.x - p.w/2, p.y - p.h/2, p.w, p.h, 16); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.9)'; ctx.lineWidth = 2; ctx.beginPath();
    ctx.moveTo(p.x - p.w*0.3, p.y + p.h*0.2); ctx.lineTo(p.x - p.w*0.05, p.y - p.h*0.15); ctx.moveTo(p.x + p.w*0.05, p.y + p.h*0.3); ctx.lineTo(p.x + p.w*0.3, p.y - p.h*0.05); ctx.stroke();
  }
}
/* the moving or changing part of the ground (crossing gates, stations, works lamps, start and goal lines): drawn every frame */
function drawGroundLive(top, bot, left, right){
  drawFeatures(top, bot, left, right);
  drawWorks(top, bot);
  ctx.fillStyle = '#f2f4f0'; ctx.fillRect(-AREAS[0].half, 24, AREAS[0].half, 5);
  const gy = -GOAL*M, gh = halfAt(GOAL);
  if (gy > top - 60 && gy < bot + 60){
    for (let i = 0, x = -gh; x < gh; x += 14, i++){ ctx.fillStyle = i % 2 ? '#20242c' : '#f7f7f4'; ctx.fillRect(x, gy - 14, 14, 14); ctx.fillStyle = i % 2 ? '#f7f7f4' : '#20242c'; ctx.fillRect(x, gy, 14, 14); }
    ctx.font = '400 30px "Dela Gothic One", sans-serif'; ctx.textAlign = 'center'; ctx.lineWidth = 6; ctx.strokeStyle = '#17324d'; ctx.strokeText('ゴール', 0, gy - 26); ctx.fillStyle = '#ffc83d'; ctx.fillText('ゴール', 0, gy - 26);
  }
}

function drawFeatures(top, bot, left, right){
  for (const q of isecs){
    if (q.y < top - 60 || q.y > bot + 60) continue;
    const half = halfAt(-q.y/M);
    ctx.fillStyle = AREAS[areaIndexAt(-q.y/M)].road; ctx.fillRect(left, q.y - 35, right - left, 70);
    ctx.fillStyle = '#f2f4f0';
    for (let x = Math.floor(left/24)*24; x < right; x += 24) if (Math.abs(x + 6) > half + 16) ctx.fillRect(x, q.y - 1.5, 12, 3);
    for (let x = -half + 3; x < half - 3; x += 10){ ctx.fillRect(x, q.y - 48, 6, 10); ctx.fillRect(x, q.y + 38, 6, 10); }
    for (const sg of [-1, 1]) for (let yy = q.y - 31; yy < q.y + 29; yy += 10) ctx.fillRect(sg > 0 ? half + 4 : -half - 14, yy, 10, 6);
  }
  for (const st of stations){
    if (st.y < top - 120 || st.y > bot + 120) continue;
    if (st.big){
      const half = halfAt(-st.y/M), cx = st.sg*(half + 64);
      ctx.fillStyle = '#c9cdd2'; ctx.fillRect(st.sg > 0 ? half + 4 : -half - 134, st.y - 66, 130, 132);
      for (const [dx, dy, r] of [[-22, -26, 30], [24, 24, 30]]){
        ctx.fillStyle = 'rgba(18,28,38,0.22)'; circle(cx + dx + 4, st.y + dy + 5, r);
        ctx.fillStyle = st.alive ? '#eef0f2' : '#3b3633'; circle(cx + dx, st.y + dy, r);
        if (st.alive){ ctx.fillStyle = '#ff5a36'; circle(cx + dx, st.y + dy, r*0.55); ctx.fillStyle = '#ffffff'; ctx.font = '400 10px "Dela Gothic One", sans-serif'; ctx.textAlign = 'center'; ctx.fillText('燃料', cx + dx, st.y + dy + 4); }
      }
      continue;
    }
    const half = halfAt(-st.y/M), x0 = st.sg > 0 ? half + 4 : -half - 134;
    ctx.fillStyle = '#c9cdd2'; ctx.fillRect(x0, st.y - 62, 130, 124);
    ctx.fillStyle = 'rgba(18,28,38,0.22)'; ctx.fillRect(x0 + 34, st.y - 30, 72, 70);
    ctx.fillStyle = st.alive ? '#ff5a36' : '#3b3633'; ctx.fillRect(x0 + 30, st.y - 36, 72, 70);
    if (st.alive){ ctx.fillStyle = '#ffffff'; ctx.fillRect(x0 + 30, st.y - 6, 72, 12); ctx.font = '400 11px "Dela Gothic One", sans-serif'; ctx.textAlign = 'center'; ctx.fillStyle = '#17324d'; ctx.fillText('ガソリン', x0 + 66, st.y + 4); }
    const px = st.sg * (half + 12);
    for (const dy of [-20, 20]){ ctx.fillStyle = st.alive ? '#f7f7f4' : '#4a4442'; rr(px - 6, st.y + dy - 8, 12, 16, 2); ctx.fill(); ctx.fillStyle = st.alive ? '#38c79a' : '#2b2726'; ctx.fillRect(px - 4, st.y + dy - 5, 8, 4); }
  }
  for (const r of rails){
    if (r.y < top - 60 || r.y > bot + 60) continue;
    const half = halfAt(-r.y/M);
    ctx.fillStyle = '#8b8174'; ctx.fillRect(left, r.y - 16, right - left, 32);
    ctx.fillStyle = '#5a4636'; for (let x = Math.floor(left/12)*12; x < right; x += 12) if (Math.abs(x + 2) > half) ctx.fillRect(x, r.y - 13, 5, 26);
    ctx.fillStyle = AREAS[areaIndexAt(-r.y/M)].road; ctx.fillRect(-half, r.y - 16, half*2, 32);
    ctx.fillStyle = '#c9ced6'; ctx.fillRect(left, r.y - 8, right - left, 3); ctx.fillRect(left, r.y + 5, right - left, 3);
    const active = r.state === 'run' && r.fx - TRAIN_LEN < half + 80, on = ((t*4)|0) % 2 === 0;
    for (const [gx, gy, dir] of [[-half - 6, r.y + 24, 1], [half + 6, r.y - 24, -1]]){
      if (active){ for (let i = 0; i < 6; i++){ ctx.fillStyle = i % 2 ? '#20242c' : '#ffd24a'; ctx.fillRect(gx + dir*(3 + i*half/6), gy - 2, dir*half/6, 4); } }
      else { ctx.fillStyle = '#ffd24a'; ctx.fillRect(gx - 2, gy - 12, 4, 12); }
      ctx.fillStyle = '#20242c'; circle(gx, gy, 4);
      ctx.fillStyle = active && on ? '#ff2d2d' : '#6a1a1a'; circle(gx - 6, gy + 7*dir, 3);
      ctx.fillStyle = active && !on ? '#ff2d2d' : '#6a1a1a'; circle(gx + 6, gy + 7*dir, 3);
    }
  }
}
/* road works, in the toy style: orange-and-white blocks along the open side, striped barricades and cones at both ends,
   an arrow board with running chevrons and blinking lamps at the near end, a temporary light on one-lane stretches */
function cone(x, y){ ctx.fillStyle = 'rgba(18,28,38,0.25)'; circle(x + 2, y + 3, 5); ctx.fillStyle = '#ff8a3d'; circle(x, y, 5); ctx.fillStyle = '#f7f7f4'; circle(x, y, 3.1); ctx.fillStyle = '#ff8a3d'; circle(x, y, 1.6); }
function stripeBar(x, y, w, h){
  ctx.fillStyle = 'rgba(18,28,38,0.25)'; rr(x + 2, y + 3, w, h, 2); ctx.fill();
  ctx.save(); rr(x, y, w, h, 2); ctx.fillStyle = '#f7f7f4'; ctx.fill(); ctx.clip();
  ctx.fillStyle = '#ff8a3d'; ctx.beginPath();
  for (let k = x - h; k < x + w; k += 10){ ctx.moveTo(k, y + h); ctx.lineTo(k + h, y); ctx.lineTo(k + h + 5, y); ctx.lineTo(k + 5, y + h); ctx.closePath(); }
  ctx.fill(); ctx.restore(); rr(x, y, w, h, 2); outline('#ff8a3d');
}
function lamp(x, y, on){ if (on){ ctx.fillStyle = 'rgba(255,210,74,0.35)'; circle(x, y, 6); } ctx.fillStyle = on ? '#ffd24a' : '#7a6420'; circle(x, y, 2.6); }
function drawWorks(top, bot){
  const blink = ((t * 3) | 0) % 2 === 0, run = ((t * 6) | 0) % 4;
  for (const w of works){
    if (w.y0 > bot + 60 || w.y1 < top - 160) continue;
    const half = halfAt(w.d0 + 1), x0 = Math.max(w.x0, -half), x1 = Math.min(w.x1, half), cw = x1 - x0, len = w.y1 - w.y0, mx = x0 + cw/2;
    if (w.alt){ // one-lane stretch: stop line and temporary light for the oncoming lane, past the far end
      const sy = w.y0 - 110, red = P.y > w.y0 - 30;
      ctx.fillStyle = '#f2f4f0'; ctx.fillRect(x1 + 2, sy - 2, half - x1 - 4, 4);
      const lx = half + 9; ctx.fillStyle = 'rgba(18,28,38,0.25)'; rr(lx - 5 + 3, sy - 22 + 4, 10, 20, 3); ctx.fill();
      ctx.fillStyle = '#20242c'; rr(lx - 5, sy - 22, 10, 20, 3); ctx.fill();
      ctx.fillStyle = red ? '#ff2d2d' : '#6a1a1a'; circle(lx, sy - 16, 3); ctx.fillStyle = red ? '#1f4a35' : '#38c79a'; circle(lx, sy - 8, 3);
    }
    if (w.y0 > bot + 20 || w.y1 < top - 20) continue;
    ctx.fillStyle = 'rgba(18,28,38,0.16)'; ctx.fillRect(x0, w.y0, cw, len); // the closed lane: dug up, a heap of earth
    ctx.fillStyle = 'rgba(18,28,38,0.2)'; ctx.fillRect(x0 + cw*0.22, w.y0 + len*0.22, cw*0.56, len*0.2);
    ctx.fillStyle = '#a47c53'; ellipse(mx, w.y0 + len*0.62, cw*0.27, 11); ctx.fillStyle = '#8a6440'; ellipse(mx - cw*0.06, w.y0 + len*0.6, cw*0.13, 5);
    for (const ex of [w.x0 > -half + 1 ? x0 + 4 : null, w.x1 < half - 1 ? x1 - 4 : null]){
      if (ex === null) continue;
      for (let y = w.y0 + 14, k = 0; y < w.y1 - 30; y += 22, k++){
        if (y < top - 30 || y > bot + 10) continue;
        ctx.fillStyle = 'rgba(18,28,38,0.25)'; rr(ex - 3.5 + 2, y + 3, 7, 18, 3); ctx.fill();
        ctx.fillStyle = k & 1 ? '#f7f7f4' : '#ff8a3d'; rr(ex - 3.5, y, 7, 18, 3); ctx.fill(); outline(k & 1 ? '#c9ced6' : '#ff8a3d');
      }
    }
    stripeBar(x0 + 3, w.y0 + 2, cw - 6, 7);
    for (let i = 0; i < 3; i++) cone(x0 + 8 + i*(cw - 16)/2, w.y0 + 17);
    // near end: arrow board, cones, barricade with lamps
    const bw = Math.min(cw - 10, 36), by = w.y1 - 40, dir = w.open;
    ctx.fillStyle = 'rgba(18,28,38,0.25)'; rr(mx - bw/2 + 3, by - 8 + 4, bw, 16, 4); ctx.fill();
    ctx.fillStyle = '#20242c'; rr(mx - bw/2, by - 8, bw, 16, 4); ctx.fill();
    ctx.lineWidth = 2.6; ctx.lineCap = 'round';
    for (let i = 0; i < 3; i++){
      const cx = mx + dir*(i - 1)*9; ctx.strokeStyle = run > i ? '#ffd24a' : '#5c4c1c';
      ctx.beginPath(); ctx.moveTo(cx - dir*3, by - 5); ctx.lineTo(cx + dir*3, by); ctx.lineTo(cx - dir*3, by + 5); ctx.stroke();
    }
    ctx.lineCap = 'butt';
    for (let i = 0; i < 3; i++) cone(x0 + 8 + i*(cw - 16)/2, w.y1 - 20);
    stripeBar(x0 + 3, w.y1 - 10, cw - 6, 7);
    lamp(x0 + 7, w.y1 - 7, blink); lamp(x1 - 7, w.y1 - 7, !blink);
  }
}
/* the warning sign, 100 m before: on a pole at the roadside (drawn over the cars, it may lean over the edge of a wide road) */
function drawWorkSigns(top, bot){
  for (const w of works){
    const y = w.signY; if (y < top - 50 || y > bot + 50) continue;
    const half = halfAt(-y / M), sg = w.signSide, px = sg * (half + Math.max(4, Math.min(26, W/(2*s) - half - 22))), bw = 42, bh = 40;
    ctx.fillStyle = 'rgba(18,28,38,0.25)'; rr(px - bw/2 + 4, y - bh/2 + 6, bw, bh, 6); ctx.fill();
    ctx.fillStyle = '#9aa4ae'; ctx.fillRect(px - 1.5, y + bh/2 - 2, 3, 8);
    ctx.fillStyle = '#f7f7f4'; rr(px - bw/2, y - bh/2, bw, bh, 6); ctx.fill();
    ctx.lineWidth = 2.5; ctx.strokeStyle = '#ff8a3d'; ctx.stroke();
    ctx.textAlign = 'center'; ctx.fillStyle = '#17324d';
    ctx.font = '400 8px "Dela Gothic One", sans-serif'; ctx.fillText('この先', px, y - 9);
    ctx.font = '400 11px "Dela Gothic One", sans-serif'; ctx.fillText('工事中', px, y + 4);
    const d = w.open, ay = y + 12; ctx.fillStyle = '#ff5a36'; ctx.fillRect(d > 0 ? px - 8 : px - 4, ay - 1.5, 12, 3);
    ctx.beginPath(); ctx.moveTo(px + d*11, ay); ctx.lineTo(px + d*4, ay - 5); ctx.lineTo(px + d*4, ay + 5); ctx.closePath(); ctx.fill();
  }
}
function drawCranes(top, bot){
  for (const c of cranes){
    if (c.y < top - 140 || c.y > bot + 140) continue;
    const half = halfAt(-c.y/M), lx = -half - 20, rx = half + 20;
    for (const x of [lx, rx]){ ctx.fillStyle = 'rgba(18,28,38,0.22)'; ctx.fillRect(x - 7 + 5, c.y - 30 + 6, 14, 60); ctx.fillStyle = '#e8a52a'; ctx.fillRect(x - 7, c.y - 30, 14, 60); ctx.fillStyle = '#20242c'; ctx.fillRect(x - 7, c.y - 4, 14, 3); }
    if (c.state === 'warn' || c.state === 'drop'){ // the shadow of what is coming down
      const q = c.state === 'drop' ? clamp(1 - (c.at - t) / 0.35, 0, 1) : 0;
      ctx.globalAlpha = c.state === 'warn' ? (Math.sin(t*16) > 0 ? 0.55 : 0.25) : 0.35 + 0.4*q;
      ctx.fillStyle = c.state === 'warn' ? '#ff5a36' : '#101820'; rr(c.x - c.w/2, c.y - 34, c.w, 68, 4); ctx.fill(); ctx.globalAlpha = 1;
      if (c.state === 'warn') mark(c.x, c.y - 48);
    }
    const hy = c.y - 54; // the beam across the road, with the trolley over the drop point
    ctx.fillStyle = 'rgba(18,28,38,0.2)'; ctx.fillRect(lx, hy + 6, rx - lx, 12);
    ctx.fillStyle = '#f0b23e'; ctx.fillRect(lx - 7, hy - 6, rx - lx + 14, 12);
    ctx.fillStyle = '#c9851c'; for (let x = lx; x < rx; x += 14) ctx.fillRect(x, hy - 6, 3, 12);
    const tx = c.state === 'idle' ? 0 : c.x;
    ctx.fillStyle = '#20242c'; ctx.fillRect(tx - 10, hy - 8, 20, 16);
    if (c.state === 'idle' || c.state === 'warn'){ ctx.fillStyle = c.color; ctx.fillRect(tx - c.w/2 + 6, hy - 30, c.w - 12, 22); ctx.fillStyle = 'rgba(0,0,0,0.2)'; for (let x = tx - c.w/2 + 9; x < tx + c.w/2 - 6; x += 6) ctx.fillRect(x, hy - 30, 2, 22); }
  }
}
function drawFalling(){
  for (const c of cranes){
    if (c.state !== 'drop') continue;
    const q = clamp(1 - (c.at - t) / 0.35, 0, 1), sc = 1.7 - 0.7*q*q;
    ctx.save(); ctx.translate(c.x, c.y - 40*(1 - q)); ctx.scale(sc, sc);
    drawVehicle('container', c.w, 68, c.color); ctx.restore();
  }
}
function drawTrains(left, right){
  for (const r of rails){
    if (r.state !== 'run') continue;
    for (let i = 0; i < 5; i++){
      const x1 = r.fx - i*(CARL + 6), x0 = x1 - CARL;
      if (x1 < left - 20 || x0 > right + 20) continue;
      ctx.fillStyle = 'rgba(18,28,38,0.25)'; rr(x0 + 4, r.y - 9, CARL, 28, 6); ctx.fill();
      ctx.fillStyle = '#f1ede3'; rr(x0, r.y - 14, CARL, 28, i === 0 ? 12 : 5); ctx.fill(); outline('#f1ede3');
      ctx.fillStyle = '#ff8a3d'; ctx.fillRect(x0 + 4, r.y - 3, CARL - 8, 6);
      ctx.fillStyle = '#b8c6d4'; for (let k = 0; k < 4; k++){ rr(x0 + 10 + k*21, r.y - 10, 15, 4, 1); ctx.fill(); }
      if (i === 0){ ctx.fillStyle = '#2a3b52'; rr(x1 - 14, r.y - 10, 9, 20, 3); ctx.fill(); ctx.fillStyle = '#fff6c2'; ctx.fillRect(x1 - 3, r.y - 11, 2, 5); ctx.fillRect(x1 - 3, r.y + 6, 2, 5); }
    }
  }
}

function draw(){
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  if (!P || !W){ ctx.fillStyle = '#17324d'; ctx.fillRect(0, 0, W, H); return; }
  const k = reduceMotion ? 0 : shake, ox = (Math.random() - 0.5) * k, oy = (Math.random() - 0.5) * k;
  const fxOn = !reduceMotion && !window.__NOFX;
  vZm = (1 + 0.12 * zoomK) * (fxOn ? 1 - FLOW_ZOOM * flowK : 1); vZx = camX; vZy = camY;  // lean in around your own car on a big crash (the view never pans toward it); pull back a little in full-speed flow
  const ca = DPR*s*vZm, ce = DPR*(W/2 - vZx*s*vZm + ox), cf = DPR*(H*ANCHOR - vZy*s*vZm + oy);
  ctx.setTransform(ca, 0, 0, ca, ce, cf);
  const sz = s*vZm, top = camY - H*ANCHOR/sz - 20, bot = camY + H*(1 - ANCHOR)/sz + 20, left = camX - W/(2*sz) - 20, right = camX + W/(2*sz) + 20;
  groundStamp(top, bot, left, right);
  drawGroundLive(top, bot, left, right);
  veilFar(top, bot, left, right);
  if (heli){ ctx.fillStyle = 'rgba(255,240,170,0.16)'; circle(P.x, P.y, 34); ctx.fillStyle = 'rgba(18,28,38,0.2)'; ellipse(heli.x + 18, heli.y + 26, 14, 18); }
  for (const dr of drums){
    if (!dr.alive || dr.y < top - 20 || dr.y > bot + 20) continue;
    const toss = dr.own ? Math.max(0, 1 - (t - dr.t0) / 0.3) : 0, r = 6 * (1 + 0.5 * toss);
    ctx.fillStyle = 'rgba(18,28,38,0.25)'; circle(dr.x + 2 + 6*toss, dr.y + 3 + 6*toss, 6);
    ctx.fillStyle = '#d8452b'; circle(dr.x, dr.y, r);
    ctx.fillStyle = '#ffd24a'; circle(dr.x, dr.y, r * 0.4);
    if (dr.own){ ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(dr.x, dr.y, r * 0.72, 0, Math.PI*2); ctx.stroke(); }
  }
  for (const sp of spikes){
    if (sp.y < top - 20 || sp.y > bot + 20) continue;
    const x0 = sp.x - sp.w/2;
    ctx.fillStyle = 'rgba(18,28,38,0.25)'; ctx.fillRect(x0 + 2, sp.y - 1, sp.w, 7);
    ctx.fillStyle = '#3a3f48'; ctx.fillRect(x0, sp.y - 3, sp.w, 6);
    ctx.fillStyle = '#dfe5ec'; ctx.beginPath();
    for (let x = x0 + 1; x + 6 <= x0 + sp.w; x += 6){ ctx.moveTo(x, sp.y - 3); ctx.lineTo(x + 3, sp.y - 8); ctx.lineTo(x + 6, sp.y - 3); ctx.moveTo(x, sp.y + 3); ctx.lineTo(x + 3, sp.y + 8); ctx.lineTo(x + 6, sp.y + 3); }
    ctx.fill();
    ctx.fillStyle = '#ffd24a'; ctx.fillRect(x0 - 3, sp.y - 4, 4, 8); ctx.fillRect(x0 + sp.w - 1, sp.y - 4, 4, 8);
  }
  for (const c of cars) if (c.state === 'wreck' && c.y > top - 80 && c.y < bot + 80) drawBody(c);
  for (const c of cars) if (c.state === 'drive' && c.y > top - 80 && c.y < bot + 80) drawBody(c);
  for (let i = trail.length - 1; i >= 0; i--){ // nitro afterimages (same transform as save/translate/rotate, without the state stack)
    const g = trail[i]; ctx.setTransform(ca*Math.cos(g.a), ca*Math.sin(g.a), -ca*Math.sin(g.a), ca*Math.cos(g.a), ca*g.x + ce, ca*g.y + cf);
    ctx.fillStyle = `rgba(255,${90 + i*20},40,${0.34 - i*0.048})`; rr(-P.w/2, -P.h/2, P.w, P.h, Math.min(P.w, P.h)*0.3); ctx.fill();
  }
  if (trail.length) ctx.setTransform(ca, 0, 0, ca, ce, cf);
  if (flowK > 0.05 && !boosting && fxOn && P.state === 'drive'){ // full-speed flow: tapered streaks of light off the back corners of your car (21回目 しょーくん「先細りの光の筋」)
    const L = 22 + 54*flowK, bend = -P.vx * 0.06, y0 = P.y + P.h*0.34;
    for (const sg of [-1, 1]){
      const x0 = P.x + sg*(P.w/2 - 1.5), hw = 1.5 + 1.7*flowK, tx = x0 + sg*2.5 + bend, ty = y0 + L*(0.9 + 0.1*Math.sin(t*17 + sg*1.7));
      const gr = ctx.createLinearGradient(x0, y0, tx, ty);
      gr.addColorStop(0, `rgba(255,255,255,${0.2 + 0.7*flowK})`); gr.addColorStop(0.3, `rgba(220,242,255,${0.55*flowK})`); gr.addColorStop(1, 'rgba(220,242,255,0)');
      ctx.fillStyle = gr; ctx.beginPath(); ctx.moveTo(x0 - hw, y0);
      ctx.quadraticCurveTo(x0 - hw*0.5 + bend*0.35, y0 + L*0.5, tx, ty); ctx.quadraticCurveTo(x0 + hw*0.5 + bend*0.35, y0 + L*0.5, x0 + hw, y0); ctx.closePath(); ctx.fill();
    }
    if (flowK > 0.55){ // second stage: a soft wake of air in the middle, wider and fainter
      const w = P.w*0.34, k = (flowK - 0.55) / 0.45, tx = P.x + bend*1.2, ty = y0 + L*1.15, gr = ctx.createLinearGradient(P.x, y0, tx, ty);
      gr.addColorStop(0, `rgba(255,255,255,${0.32*k})`); gr.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = gr; ctx.beginPath(); ctx.moveTo(P.x - w, y0); ctx.quadraticCurveTo(P.x - w*0.4 + bend*0.4, y0 + L*0.6, tx, ty); ctx.quadraticCurveTo(P.x + w*0.4 + bend*0.4, y0 + L*0.6, P.x + w, y0); ctx.closePath(); ctx.fill();
    }
  }
  if (state === 'play' && !boosting && boost >= 100){ // full nitro: pulsing aura on your car
    const r = 26 + 4*Math.sin(t*9);
    ctx.fillStyle = 'rgba(255,90,54,0.18)'; circle(P.x, P.y, r);
    ctx.lineWidth = 2.5; ctx.strokeStyle = 'rgba(255,200,61,0.95)'; ctx.beginPath(); ctx.arc(P.x, P.y, r, 0, Math.PI*2); ctx.stroke();
  }
  drawBody(P);
  for (const c of cars){
    if (c.state !== 'drive' || c.y < top - 80 || c.y > bot + 80) continue;
    if (c.strip){
      const sy = c.y + c.h/2 + 14;
      ctx.globalAlpha = Math.sin(t*18) > 0 ? 0.6 : 0.25; ctx.fillStyle = '#ff5a36'; ctx.fillRect(c.strip.x - c.strip.w/2, sy - 5, c.strip.w, 10);
      ctx.globalAlpha = 1; mark(c.x, c.y - c.h/2 - 12);
    }
    if (c.boss && c.boss.mode === 'rev') mark(c.x, c.y - c.h/2 - 14);
    if (c.plan === 'pin' && (c.phase === 'warn' || c.phase === 'slam')){
      mark(c.x, c.y - c.h/2 - 12);
      if (c.phase === 'warn'){ const ax = c.x - c.sg*(c.w/2 + 5); ctx.fillStyle = '#ffc83d'; ctx.beginPath(); ctx.moveTo(ax - c.sg*9, c.y); ctx.lineTo(ax, c.y - 7); ctx.lineTo(ax, c.y + 7); ctx.closePath(); ctx.fill(); }
    }
    if (c.tk === 'wind' && !c.plan){
      mark(c.x, c.y - c.h/2 - 12);
      const ax = c.x - c.sg*(c.w/2 + 5); ctx.fillStyle = '#ffc83d'; ctx.beginPath(); ctx.moveTo(ax - c.sg*9, c.y); ctx.lineTo(ax, c.y - 7); ctx.lineTo(ax, c.y + 7); ctx.closePath(); ctx.fill();
    }
  }
  drawWorkSigns(top, bot);
  drawTrains(left, right);
  drawCranes(top, bot); drawFalling();
  if (heli) drawHeli(heli.x, heli.y);
  ctx.setTransform(ca, 0, 0, ca, ce, cf); let bitT = false;
  for (const p of fx){
    ctx.globalAlpha = Math.max(0, p.life / p.max) * (p.type === 'smoke' ? 0.5 : 1);
    if (bitT && (p.type === 'boom' || p.type === 'smoke' || p.type === 'ring')){ ctx.setTransform(ca, 0, 0, ca, ce, cf); bitT = false; }
    if (p.type === 'boom'){ ctx.fillStyle = p.color; circle(p.x, p.y, p.size * (1.8 - p.life/p.max)); }
    else if (p.type === 'smoke'){ ctx.fillStyle = p.color; circle(p.x, p.y, p.size * (2.2 - p.life/p.max)); }
    else if (p.type === 'ring'){ const q = 1 - p.life/p.max; ctx.strokeStyle = p.color; ctx.lineWidth = 5 * (1 - q) + 1; ctx.beginPath(); ctx.arc(p.x, p.y, p.size * (0.3 + q), 0, Math.PI*2); ctx.stroke(); }
    else if (p.type === 'part' || p.type === 'star'){ drawPart(p, ca, ce, cf); bitT = true; continue; }
    else { const co = Math.cos(p.rot), si = Math.sin(p.rot); ctx.setTransform(ca*co, ca*si, -ca*si, ca*co, ca*p.x + ce, ca*p.y + cf); ctx.fillStyle = p.color; ctx.fillRect(-p.size/2, -p.size/2, p.size, p.size); bitT = true; continue; }
  }
  ctx.globalAlpha = 1;

  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  if (!reduceMotion && (TOWN.ice || TOWN.depot)){
    const snow = !!TOWN.ice; ctx.fillStyle = snow ? 'rgba(255,255,255,0.85)' : 'rgba(226,197,143,0.45)';
    for (let i = 0; i < (snow ? 46 : 24); i++){
      const sp = snow ? 60 + rnd(i*7)*70 : 260 + rnd(i*7)*200, x = ((rnd(i*19)*W + (snow ? Math.sin(t + i)*14 : t*sp)) % (W + 20) + W + 20) % (W + 20) - 10;
      const y = snow ? ((t*sp + rnd(i*23)*(H + 40)) % (H + 40)) - 20 : rnd(i*23)*H;
      if (snow) circle(x, y, 1.5 + rnd(i*3)*2); else ctx.fillRect(x, y, 14 + rnd(i*5)*16, 2);
    }
  }
  if (flowK > 0.03 && !boosting && fxOn){ // full-speed flow: speed lines rushing down the sides of the screen (more at the second stage)
    // tapered streaks (a bright head fading back to nothing, a soft navy edge so they read on the light town) that rush out from a point
    // above the screen along the sides — they grow as they come closer, like a real sense of speed
    if (!streakImg) streakImg = makeStreak();
    const n = Math.round(6 + 18*flowK), vx0 = W/2, vy0 = -H*0.9, a = Math.min(1, 0.4 + 0.55*flowK + (flowPulse > 0 ? flowPulse*1.2 : 0)), band = W*(0.2 + 0.12*flowK);
    for (let i = 0; i < n; i++){
      // each streak runs on a line from the point above toward a spot along the bottom edge's side band, and crosses the whole screen on it
      const sg = i % 2 ? 1 : -1, xb = vx0 + sg*(W/2 - rnd(i*29 + 3)*band), dyb = H*1.05 - vy0, ang = Math.atan2(dyb, xb - vx0), sn = Math.sin(ang);
      const d0 = (-60 - vy0) / sn, d1 = (H + 60 - vy0) / sn, p = (t*(0.9 + rnd(i*5)*0.6) + rnd(i*17)) % 1, d = d0 + (d1 - d0)*p;
      const x = vx0 + Math.cos(ang)*d, y = vy0 + sn*d;
      const len = (60 + 130*p) * (0.6 + 0.6*flowK) * (0.7 + 0.6*rnd(i*11)), lw = (5 + 8*p) * (i % 3 ? 0.75 : 1), th = ang - Math.PI/2, co = Math.cos(th), si = Math.sin(th);
      ctx.globalAlpha = a * Math.min(1, p*6, (1 - p)*8) * (0.6 + 0.4*rnd(i*7));
      ctx.setTransform(DPR*co, DPR*si, -DPR*si, DPR*co, DPR*x, DPR*y); ctx.drawImage(streakImg, -lw/2, -len, lw, len);
    }
    ctx.globalAlpha = 1; ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    if (flowK > 0.55){ // second stage: the sides of the screen glow like a wind tunnel
      if (!flowGlow || flowGlow.w !== W){ const g = ctx.createLinearGradient(0, 0, W, 0); g.addColorStop(0, 'rgba(255,255,255,0.55)'); g.addColorStop(0.12, 'rgba(255,255,255,0)'); g.addColorStop(0.88, 'rgba(255,255,255,0)'); g.addColorStop(1, 'rgba(255,255,255,0.55)'); flowGlow = {w:W, g}; }
      ctx.globalAlpha = (flowK - 0.55) / 0.45 * (0.75 + 0.25*Math.sin(t*11)); ctx.fillStyle = flowGlow.g; ctx.fillRect(0, 0, W, H); ctx.globalAlpha = 1;
    }
  }
  if (boosting && !reduceMotion){
    for (let i = 0; i < 28; i++){   // 21回目: more and longer than the flow lines — nitro is the top of the scale
      const x = rnd(i*31 + 7)*W, len = 80 + rnd(i*13)*140, y = ((t*(1700 + rnd(i*3)*700) + rnd(i*17)*(H + 340)) % (H + 340)) - 170;
      ctx.strokeStyle = i % 3 ? 'rgba(255,255,255,0.45)' : 'rgba(255,138,61,0.75)'; ctx.lineWidth = i % 4 ? 2 : 3.5;
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y + len); ctx.stroke();
    }
  }
  ctx.textAlign = 'center';
  for (const p of pops){
    const x = (P.x + p.rx - vZx)*s*vZm + W/2, y = (P.y + p.ry - vZy)*s*vZm + H*ANCHOR - (1 - p.life)*34;
    ctx.font = p.small ? '400 12px "Dela Gothic One", sans-serif' : '400 17px "Dela Gothic One", sans-serif';
    ctx.globalAlpha = Math.min(1, p.life*2) * (p.small ? 0.9 : 1); ctx.lineWidth = p.small ? 3 : 4; ctx.strokeStyle = '#17324d'; ctx.strokeText(p.text, x, y); ctx.fillStyle = p.color; ctx.fillText(p.text, x, y);
  }
  ctx.globalAlpha = 1;
  if (state === 'play'){
    const by = H - safeBottom - 28;
    for (const c of cars){
      if (c.role !== 'chaser' || c.state !== 'drive') continue;
      const sy = (c.y - (c.boss ? c.h/2 : 0) - camY)*s + H*ANCHOR;
      if (sy < H - 4 || c.y - P.y > 700) continue;
      const sx = clamp((c.x - camX)*s + W/2, 26, W - 26);
      const big = !!c.boss, r = big ? 19 : 14;
      ctx.globalAlpha = 0.65 + 0.35*Math.sin(t*10);
      ctx.fillStyle = big ? '#17324d' : '#ff5a36'; circle(sx, by, r);
      ctx.lineWidth = 3; ctx.strokeStyle = big ? '#ff5a36' : '#ffffff'; ctx.beginPath(); ctx.arc(sx, by, r, 0, Math.PI*2); ctx.stroke();
      ctx.fillStyle = '#ffffff'; ctx.font = big ? '400 12px "Dela Gothic One", sans-serif' : '400 17px "Dela Gothic One", sans-serif'; ctx.fillText(big ? 'ボス' : '！', sx + (big ? 0 : 1), by + (big ? 4 : 6));
    }
    ctx.globalAlpha = 1;
  }
}

