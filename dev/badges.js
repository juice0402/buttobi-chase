/* Game Center の実績のバッジ（1024×1024）。ゲームの中と同じコードの絵（drawVehicle・block など）で描く＝game-art-rule の C。
   dev/badges.py が出口の index.html を開いて、このファイルを入れて window.__badge(id, points) を呼ぶ。ゲームの中には入らない。
   形：まわりは紺のフェルト、まん中にメダル（点でふちの色：10 銅・25 銀・50 金・100 ルビー）、メダルの中に小さなジオラマ。字は入れない
   ゲームのコードは1つの関数の中なので、file: で開いたときだけある window.__butto.art(cv, fn) から絵の道具を借りる */
function badgeKit(H){
  const {ctx, drawVehicle, shadowBox, block, circle, ellipse, rr, outline, shade, rnd, BLOCK_COL, CARS, CHASERS, TRAFFIC} = H;
  const TIER = {10:'#cf8a52', 25:'#c3cfda', 50:'#f4c23e', 100:'#e8455a'};
  const SIZE = {};
  for (const c of CARS) SIZE[c.key] = [c.w, c.h, c.color];
  for (const k in CHASERS) SIZE[k] = [CHASERS[k].w, CHASERS[k].h, k === 'police' ? '#f4f6f8' : '#4b5563'];
  for (const k in TRAFFIC) SIZE[k] = [TRAFFIC[k].w, TRAFFIC[k].h, TRAFFIC[k].colors[0]];
  const R = 50;   // the inner disc (scene units; the badge is 128 units across)

  function veh(key, x, y, ang, color, k){
    const [w, h, c0] = SIZE[key];
    ctx.save(); ctx.translate(x, y); ctx.rotate(ang || 0); if (k) ctx.scale(k, k);
    shadowBox(w, h, 3, 4); drawVehicle(key, w, h, color || c0);
    ctx.restore();
  }
  function fill(col){ ctx.fillStyle = col; ctx.fillRect(-70, -70, 140, 140); }
  function road(x, w, col, dash){
    ctx.fillStyle = 'rgba(18,28,38,0.18)'; ctx.fillRect(x - w/2 - 3, -70, w + 6, 140);
    ctx.fillStyle = col || '#5d6672'; ctx.fillRect(x - w/2, -70, w, 140);
    ctx.fillStyle = 'rgba(255,255,255,0.55)'; ctx.fillRect(x - w/2 + 2, -70, 1.5, 140); ctx.fillRect(x + w/2 - 3.5, -70, 1.5, 140);
    if (dash !== false){ ctx.fillStyle = dash || '#f4d35e'; for (let y = -66; y < 70; y += 16) ctx.fillRect(x - 1, y, 2, 9); }
  }
  function star(x, y, r, col, rot){
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot || 0);
    const path = () => { ctx.beginPath(); for (let i = 0; i < 10; i++){ const a = -Math.PI/2 + i*Math.PI/5, rr2 = i % 2 ? r*0.48 : r; ctx.lineTo(Math.cos(a)*rr2, Math.sin(a)*rr2); } ctx.closePath(); };
    ctx.translate(2, 3); path(); ctx.fillStyle = 'rgba(18,28,38,0.25)'; ctx.fill(); ctx.translate(-2, -3);
    path(); ctx.fillStyle = col; ctx.fill(); ctx.lineWidth = 1.4; ctx.strokeStyle = shade(col, -0.3); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.45)'; ctx.beginPath(); ctx.moveTo(0, -r*0.8); ctx.lineTo(r*0.16, -r*0.2); ctx.lineTo(-r*0.36, -r*0.1); ctx.closePath(); ctx.fill();
    ctx.restore();
  }
  function sparkle(x, y, r, col){
    ctx.fillStyle = col || '#ffffff';
    ctx.beginPath(); ctx.moveTo(x, y - r); ctx.quadraticCurveTo(x, y, x + r, y); ctx.quadraticCurveTo(x, y, x, y + r); ctx.quadraticCurveTo(x, y, x - r, y); ctx.quadraticCurveTo(x, y, x, y - r); ctx.fill();
  }
  function speed(x, y, n, len){ ctx.fillStyle = 'rgba(255,255,255,0.7)'; for (let i = 0; i < n; i++) ctx.fillRect(x + (i - (n - 1)/2)*5, y + (i % 2)*6, 1.6, len); }
  function boom(x, y, r){
    ctx.fillStyle = 'rgba(255,170,60,0.55)'; circle(x, y, r*1.25);
    ctx.fillStyle = '#ffb347'; circle(x, y, r); ctx.fillStyle = '#ffe27a'; circle(x - r*0.2, y - r*0.15, r*0.6); ctx.fillStyle = '#fff6d0'; circle(x - r*0.25, y - r*0.2, r*0.28);
  }
  function chips(list){ for (const [x, y, w, h, c, a] of list){ ctx.save(); ctx.translate(x, y); ctx.rotate(a || 0); block(-w/2, -h/2, w, h, c, 0); ctx.restore(); } }
  function grass(col){ fill(col); ctx.fillStyle = 'rgba(255,255,255,0.12)'; for (let i = 0; i < 40; i++) ctx.fillRect(-60 + rnd(i*5)*120, -60 + rnd(i*9)*120, 2, 2); }

  const SCENES = {
    first_run(){ grass('#8fcf8f'); road(0, 46); veh('pkei', -11, 10); speed(-11, 30, 3, 14); veh('car', 11, -30, 0, '#4aa3df'); },
    town_1(){ grass('#e9e2d2'); road(0, 40);
      block(-50, -44, 22, 20, BLOCK_COL[0], 2); block(-48, -16, 18, 18, BLOCK_COL[1], 1); block(-50, 10, 22, 22, BLOCK_COL[2], 2); block(-46, 38, 18, 16, BLOCK_COL[3], 0);
      block(28, -46, 22, 22, BLOCK_COL[4], 2); block(30, -18, 18, 18, BLOCK_COL[6], 3); block(28, 8, 22, 20, BLOCK_COL[0], 1); block(30, 34, 18, 18, BLOCK_COL[1], 2);
      veh('pkei', -9, 8); },
    town_2(){ grass('#c3ccd4'); road(4, 40);
      for (const [x, y, c] of [[-50, -40, '#e8735a'], [-50, -12, '#4f8fc0'], [-50, 16, '#f0b94a'], [-36, -26, '#6fb68b'], [-36, 2, '#e8735a'], [-36, 30, '#4f8fc0']]){ ctx.save(); ctx.translate(x, y); shadowBox(12, 26, 3, 4); drawVehicle('container', 12, 26, c); ctx.restore(); }
      for (const [x, y, c] of [[40, -34, '#f0b94a'], [40, -6, '#a984c9'], [40, 22, '#e8735a'], [54, -20, '#4f8fc0'], [54, 8, '#6fb68b']]){ ctx.save(); ctx.translate(x, y); shadowBox(12, 26, 3, 4); drawVehicle('container', 12, 26, c); ctx.restore(); }
      veh('muscle', -6, 8); },
    town_3(){ grass('#f2f6f9'); road(0, 40, '#767c87', '#ffffff');
      block(-50, -40, 20, 20, '#8fb7d6', 4); block(-48, -8, 18, 18, '#e8735a', 4); block(-50, 24, 20, 22, '#6fb68b', 4); block(30, -30, 20, 22, '#f0b94a', 4); block(30, 6, 20, 20, '#a984c9', 4); block(30, 36, 18, 16, '#4f8fc0', 4);
      ctx.fillStyle = 'rgba(255,255,255,0.8)'; for (let i = 0; i < 30; i++) circle(-48 + rnd(i*3)*96, -48 + rnd(i*7)*96, 0.9 + rnd(i)*1.2);
      veh('sports', -9, 6); },
    town_4(){ grass('#d9b27c'); road(0, 46, '#b98a55', false);
      ctx.fillStyle = 'rgba(120,90,50,0.35)'; for (let i = 0; i < 18; i++) ellipse(-50 + rnd(i*4)*100, -50 + rnd(i*6)*100, 3 + rnd(i)*4, 2 + rnd(i*2)*2);
      veh('armor', 8, 26, 0.12, '#4b3f35', 0.8); boom(11, 4, 9); chips([[-30, 30, 7, 7, '#e8735a', 0.4], [32, -8, 6, 8, '#f0b94a', -0.3], [-24, 46, 6, 6, '#4f8fc0', 0.8]]);
      veh('pkei', -10, -20); speed(-10, 0, 3, 10); },
    new_car(){ fill('#2b3a4c'); ctx.fillStyle = 'rgba(255,255,255,0.6)'; ctx.fillRect(-30, -60, 2, 120); ctx.fillRect(28, -60, 2, 120);
      ctx.fillStyle = '#f4d35e'; for (let x = -60; x < 60; x += 12){ ctx.beginPath(); ctx.moveTo(x, 40); ctx.lineTo(x + 6, 40); ctx.lineTo(x + 12, 46); ctx.lineTo(x + 6, 46); ctx.fill(); }
      veh('muscle', 0, -2, 0, null, 1.25); sparkle(-22, -26, 6); sparkle(22, -10, 4.5); sparkle(18, 26, 5); },
    full_tune(){ fill('#2b3a4c'); ctx.fillStyle = 'rgba(255,255,255,0.08)'; for (let y = -60; y < 60; y += 10) ctx.fillRect(-60, y, 120, 1);
      veh('sports', 0, 8, 0, null, 1.15);
      for (let i = 0; i < 7; i++){ const a = Math.PI*(1.15 + i*0.7/6), x = Math.cos(a)*38, y = Math.sin(a)*38 + 6; block(x - 5, y - 5, 10, 10, '#f4c23e', 0); } },
    gold(){ fill('#f5d36b'); ctx.fillStyle = 'rgba(255,255,255,0.28)'; for (let i = 0; i < 6; i++){ ctx.save(); ctx.rotate(i*Math.PI/3); ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-8, -70); ctx.lineTo(8, -70); ctx.fill(); ctx.restore(); }
      ctx.fillStyle = '#e0a630'; circle(0, 2, 30); ctx.fillStyle = '#f4c23e'; circle(0, 0, 28);
      veh('pkei', 0, 0, 0, null, 1.2); sparkle(-26, -24, 6); sparkle(26, -18, 4.5); sparkle(24, 26, 5.5); },
    maki(){ grass('#e9e2d2'); road(0, 50);
      veh('truck', 12, -16, 0.18, '#06b88a', 0.9); veh('police', -6, -2, -1.1); boom(2, -10, 8);
      chips([[-24, -30, 6, 6, '#4f8fc0', 0.5], [22, 14, 5, 7, '#e8735a', -0.6]]);
      veh('pkei', -14, 36); speed(-14, 52, 3, 10); },
    train(){ grass('#8fcf8f'); road(0, 40);
      ctx.fillStyle = '#8a6a4a'; for (let x = -60; x < 60; x += 8) ctx.fillRect(x, -22, 4, 26); ctx.fillStyle = '#b8c6d4'; ctx.fillRect(-64, -18, 128, 2); ctx.fillRect(-64, -2, 128, 2);
      for (let i = 0; i < 3; i++){ const x0 = 34 - i*46; ctx.fillStyle = 'rgba(18,28,38,0.25)'; rr(x0 - 40 + 4, -19, 40, 22, 4); ctx.fill(); ctx.fillStyle = '#f1ede3'; rr(x0 - 40, -21, 40, 22, i === 0 ? 9 : 4); ctx.fill(); outline('#f1ede3'); ctx.fillStyle = '#ff8a3d'; ctx.fillRect(x0 - 37, -12, 34, 4); }
      veh('police', 10, 18, 2.4); boom(4, 6, 7);
      veh('pkei', -10, 40); },
    clean(){ grass('#8fcf8f'); road(0, 46);
      ctx.fillStyle = 'rgba(255,255,255,0.35)'; circle(0, 4, 24);
      veh('pkei', 0, 4, 0, null, 1.2); sparkle(-20, -18, 6); sparkle(20, -8, 7); sparkle(-16, 24, 4.5); sparkle(18, 28, 4); },
    stars_all(){ fill('#17324d'); ctx.fillStyle = 'rgba(255,255,255,0.5)'; for (let i = 0; i < 30; i++) circle(-50 + rnd(i*3)*100, -50 + rnd(i*7)*100, 0.6 + rnd(i)*0.8);
      star(-24, -10, 12, '#f4c23e', -0.15); star(0, -20, 15, '#f4c23e'); star(24, -10, 12, '#f4c23e', 0.15);
      ctx.fillStyle = '#5d6672'; rr(-40, 16, 80, 30, 6); ctx.fill(); veh('pkei', 0, 30, Math.PI/2); },
    titles_all(){ fill('#f6efe0');
      chips([[-34, -30, 8, 8, '#e8735a', 0.4], [32, -34, 7, 9, '#4f8fc0', -0.5], [-36, 26, 7, 7, '#6fb68b', 0.7], [34, 30, 8, 7, '#a984c9', -0.2], [-10, -44, 6, 6, '#f0b94a', 0.3], [14, 44, 6, 6, '#e8735a', 0.9]]);
      ctx.save(); ctx.translate(2, 3); ctx.fillStyle = 'rgba(18,28,38,0.22)'; cup(); ctx.restore(); ctx.fillStyle = '#f4c23e'; cup();
      ctx.fillStyle = 'rgba(255,255,255,0.4)'; rr(-12, -24, 5, 18, 2.5); ctx.fill(); },
    police(){ fill('#1f2a37'); road(0, 46, '#3a4350');
      ctx.fillStyle = 'rgba(80,140,255,0.35)'; circle(-8, -10, 18); ctx.fillStyle = 'rgba(255,70,70,0.3)'; circle(8, -10, 18);
      veh('ppolice', 0, 6, 0, null, 1.25); },
    tank(){ grass('#d9b27c');
      chips([[-38, -30, 9, 9, '#e8735a', 0.4], [36, -36, 8, 10, '#4f8fc0', -0.5], [-40, 30, 8, 8, '#6fb68b', 0.7], [38, 26, 9, 8, '#f0b94a', -0.2]]);
      ctx.fillStyle = 'rgba(120,90,50,0.35)'; for (let y = -50; y < 60; y += 7){ ctx.fillRect(-14, y, 6, 3); ctx.fillRect(8, y, 6, 3); }
      veh('ptank', 0, 14, 0, null, 0.85); },
  };
  function cup(){
    ctx.beginPath(); ctx.moveTo(-20, -30); ctx.lineTo(20, -30); ctx.lineTo(18, -8); ctx.quadraticCurveTo(14, 8, 4, 10); ctx.lineTo(4, 22); ctx.lineTo(14, 22); ctx.lineTo(14, 30); ctx.lineTo(-14, 30); ctx.lineTo(-14, 22); ctx.lineTo(-4, 22); ctx.lineTo(-4, 10); ctx.quadraticCurveTo(-14, 8, -18, -8); ctx.closePath(); ctx.fill();
    ctx.lineWidth = 5; ctx.strokeStyle = ctx.fillStyle; ctx.beginPath(); ctx.arc(-22, -18, 8, Math.PI*0.5, Math.PI*1.5); ctx.stroke(); ctx.beginPath(); ctx.arc(22, -18, 8, -Math.PI*0.5, Math.PI*0.5); ctx.stroke();
  }

  return function draw(id, points){
    const scene = SCENES[id.replace(/^race_/, '')];
    if (!scene) throw new Error('no scene: ' + id);
    {
      ctx.setTransform(8, 0, 0, 8, 512, 512);
      // the felt around the medal (Game Center shows the badge in a circle, so this is mostly hidden)
      ctx.fillStyle = '#17324d'; ctx.fillRect(-64, -64, 128, 128);
      const ring = TIER[points] || TIER[25];
      ctx.fillStyle = 'rgba(8,16,26,0.35)'; circle(3, 4, 62);
      ctx.fillStyle = shade(ring, -0.22); circle(0, 0, 61);
      ctx.fillStyle = ring; circle(-1, -1, 59.5);
      ctx.save(); ctx.beginPath(); ctx.arc(-1, -1, 59.5, Math.PI*0.75, Math.PI*1.75); ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(255,255,255,0.45)'; ctx.stroke(); ctx.restore();
      for (let i = 0; i < 12; i++){ const a = i*Math.PI/6; ctx.fillStyle = shade(ring, -0.12); circle(Math.cos(a)*55, Math.sin(a)*55, 1.6); ctx.fillStyle = 'rgba(255,255,255,0.5)'; circle(Math.cos(a)*55 - 0.4, Math.sin(a)*55 - 0.4, 0.7); }
      ctx.fillStyle = shade(ring, -0.3); circle(0, 0, R + 1.5);
      ctx.save(); ctx.beginPath(); ctx.arc(0, 0, R, 0, Math.PI*2); ctx.clip();
      ctx.save(); ctx.scale(1.15, 1.15); scene(); ctx.restore();   // a little closer, so the cars read at Game Center's small size
      // a soft inner shadow so the scene sits inside the medal
      const g = ctx.createRadialGradient(0, 0, R*0.72, 0, 0, R); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(10,20,30,0.28)');
      ctx.fillStyle = g; ctx.fillRect(-R, -R, R*2, R*2);
      ctx.restore();
    }
  };
}
window.__badge = (id, points) => {
  const cv = document.createElement('canvas'); cv.width = cv.height = 1024;
  window.__butto.art(cv, H => badgeKit(H)(id, points));
  return cv.toDataURL('image/png');
};
