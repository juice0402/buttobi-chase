/* ---------- drawing ---------- */
/* toy cars: a lifted shadow, chunky tyres with hubs, a plastic gloss and a shine down the side; wrecks roll over and show the chassis */
let glossG = null;
const NO_GLOSS = {bike:1, container:1};
function toyGloss(w, h){
  if (!glossG){ glossG = ctx.createLinearGradient(-0.5, -0.5, 0.5, 0.5); glossG.addColorStop(0, 'rgba(255,255,255,0.42)'); glossG.addColorStop(0.38, 'rgba(255,255,255,0.06)'); glossG.addColorStop(0.62, 'rgba(0,0,0,0)'); glossG.addColorStop(1, 'rgba(0,0,0,0.24)'); }
  rr(-w/2, -h/2, w, h, Math.min(w, h)*0.26); ctx.save(); ctx.scale(w, h); ctx.fillStyle = glossG; ctx.fill(); ctx.restore();
  ctx.fillStyle = 'rgba(255,255,255,0.5)'; rr(-w*0.42, -h*0.4, Math.max(1.6, w*0.09), h*0.34, w*0.05); ctx.fill();
}
function toyUnder(w, h, col){
  const r = Math.min(w, h)*0.26, ww = Math.max(4, w*0.24), wh = Math.max(6, h*0.17);
  ctx.fillStyle = shade(col, -0.3); rr(-w/2, -h/2, w, h, r); ctx.fill();
  ctx.fillStyle = '#3a4049'; rr(-w*0.4, -h*0.44, w*0.8, h*0.88, r*0.7); ctx.fill();
  ctx.fillStyle = '#5c6470'; ctx.fillRect(-w*0.4, -h*0.31, w*0.8, 2); ctx.fillRect(-w*0.4, h*0.31 - 2, w*0.8, 2); ctx.fillRect(-1, -h*0.31, 2, h*0.62);
  for (const yy of [-h*0.31, h*0.31]) for (const sx of [-1, 1]){ const x = sx*(w/2 - ww/2); ctx.fillStyle = '#16191e'; rr(x - ww/2, yy - wh/2, ww, wh, ww*0.4); ctx.fill(); ctx.fillStyle = '#9aa3ad'; circle(x, yy, Math.min(ww, wh)*0.24); }
  ctx.fillStyle = '#c9ced6'; circle(0, 0, Math.max(1.6, w*0.08)); ctx.fillStyle = '#ffffff'; circle(-0.5, -0.5, Math.max(0.6, w*0.03));
}
/* flying parts and wooden blocks: a shadow on the ground, the piece lifted by its height */
function drawPart(p, ca, ce, cf){
  ctx.globalAlpha = Math.min(1, p.life / 0.45);
  const lift = p.z || 0, sc = 1 + lift / 90, px = p.x, py = p.y - lift*0.55;
  if (p.type === 'part'){ ctx.setTransform(ca, 0, 0, ca, ce, cf); ctx.fillStyle = 'rgba(18,28,38,0.22)'; ellipse(p.x + 2 + lift*0.25, p.y + 3 + lift*0.3, p.size*0.8, p.size*0.55); }
  const co = Math.cos(p.rot)*sc, si = Math.sin(p.rot)*sc;
  ctx.setTransform(ca*co, ca*si, -ca*si, ca*co, ca*px + ce, ca*py + cf);
  const z = p.size;
  if (p.type === 'star'){ ctx.fillStyle = p.color; ctx.beginPath(); ctx.moveTo(0, -z); ctx.lineTo(z*0.3, -z*0.3); ctx.lineTo(z, 0); ctx.lineTo(z*0.3, z*0.3); ctx.lineTo(0, z); ctx.lineTo(-z*0.3, z*0.3); ctx.lineTo(-z, 0); ctx.lineTo(-z*0.3, -z*0.3); ctx.closePath(); ctx.fill(); return; }
  switch (p.k){
    case 'tyre': ctx.fillStyle = '#1b1e24'; circle(0, 0, z); ctx.fillStyle = '#8a929c'; circle(0, 0, z*0.45); ctx.fillStyle = '#1b1e24'; ctx.fillRect(-0.6, -z*0.45, 1.2, z*0.9); break;
    case 'bolt': ctx.fillStyle = '#9aa3ad'; circle(0, 0, z); ctx.fillStyle = '#ffffff'; circle(-z*0.3, -z*0.3, z*0.35); break;
    case 'panel': ctx.fillStyle = p.color; rr(-z/2, -z*0.32, z, z*0.64, z*0.18); ctx.fill(); ctx.lineWidth = 1; ctx.strokeStyle = shade(p.color, -0.35); ctx.stroke(); ctx.fillStyle = 'rgba(255,255,255,0.45)'; ctx.fillRect(-z*0.4, -z*0.22, z*0.8, 1.2); break;
    case 'cyl': ctx.fillStyle = p.color; circle(0, 0, z*0.55); ctx.fillStyle = 'rgba(255,255,255,0.35)'; circle(-z*0.15, -z*0.15, z*0.25); ctx.lineWidth = 1; ctx.strokeStyle = shade(p.color, -0.3); ctx.beginPath(); ctx.arc(0, 0, z*0.55, 0, Math.PI*2); ctx.stroke(); break;
    default: ctx.fillStyle = p.color; ctx.fillRect(-z/2, -z/2, z, z); ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.fillRect(-z/2, -z/2, z, 1.6); ctx.fillRect(-z/2, -z/2, 1.6, z); ctx.fillStyle = 'rgba(0,0,0,0.18)'; ctx.fillRect(-z/2, z/2 - 1.6, z, 1.6); ctx.fillRect(z/2 - 1.6, -z/2, 1.6, z);
  }
}
function outline(c){ ctx.lineWidth = 1.2; ctx.strokeStyle = shade(c, -0.35); ctx.stroke(); }
function shadowBox(w, h, dx, dy){ const r = Math.min(w,h)*0.3; ctx.fillStyle = 'rgba(18,28,38,0.14)'; rr(-w/2 + dx*1.7 - 1, -h/2 + dy*1.7 - 1, w + 2, h + 2, r); ctx.fill(); ctx.fillStyle = 'rgba(18,28,38,0.22)'; rr(-w/2+dx, -h/2+dy, w, h, r); ctx.fill(); }
function wheels(w, h){
  const ww = Math.max(3.5, w*0.18), wh = Math.max(6, Math.min(11, h*0.17)), fy = -h*0.36, ry = h*0.36 - wh, xl = -w/2 - ww*0.34, xr = w/2 - ww*0.66;
  const one = (x, y) => { ctx.fillStyle = '#1b1e24'; rr(x, y, ww, wh, ww*0.4); ctx.fill(); ctx.fillStyle = '#8a929c'; ctx.fillRect(x + ww*0.3, y + wh*0.36, ww*0.4, wh*0.28); };
  one(xl, fy); one(xr, fy); one(xl, ry); one(xr, ry);
  if (h > 55){ one(xl, ry - wh - 2); one(xr, ry - wh - 2); }
}
function cab(w, h, color, frac){
  ctx.fillStyle = color; rr(-w/2, -h/2, w, h*frac, Math.min(w,h)*0.22); ctx.fill(); outline(color);
  ctx.fillStyle = '#2a3b52'; rr(-w*0.38, -h/2 + h*frac*0.18, w*0.76, h*frac*0.3, 2); ctx.fill();
  ctx.fillStyle = shade(color, 0.22); rr(-w*0.34, -h/2 + h*frac*0.55, w*0.68, h*frac*0.32, 2); ctx.fill();
}
function drawVehicle(key, w, h, color){
  const r = Math.min(w, h) * 0.26;
  switch (key){
    case 'container': {
      ctx.fillStyle = color; ctx.fillRect(-w/2, -h/2, w, h); outline(color);
      ctx.fillStyle = 'rgba(0,0,0,0.2)'; for (let x = -w/2 + 4; x < w/2 - 2; x += 6) ctx.fillRect(x, -h/2 + 2, 2, h - 4);
      ctx.fillStyle = 'rgba(255,255,255,0.25)'; ctx.fillRect(-w/2, -h/2, w, 3);
      break; }
    case 'kei': case 'car': case 'van': case 'police': {
      wheels(w, h);
      const body = key === 'police' ? '#20242c' : color;
      ctx.fillStyle = body; rr(-w/2, -h/2, w, h, r); ctx.fill(); outline(key === 'police' ? '#5a6070' : body);
      if (key === 'police'){ ctx.fillStyle = '#f7f7f4'; rr(-w*0.38, -h*0.46, w*0.76, h*0.92, r*0.8); ctx.fill(); }
      const top = key === 'police' ? '#f7f7f4' : body;
      ctx.fillStyle = '#2a3b52'; rr(-w*0.36, key === 'van' ? -h*0.4 : -h*0.27, w*0.72, h*0.15, 2); ctx.fill();
      ctx.fillStyle = shade(top, key === 'police' ? -0.06 : 0.2); rr(-w*0.33, key === 'van' ? -h*0.22 : -h*0.1, w*0.66, h*(key === 'van' ? 0.6 : 0.32), 3); ctx.fill();
      ctx.fillStyle = '#2a3b52'; rr(-w*0.32, h*(key === 'van' ? 0.4 : 0.26), w*0.64, h*0.07, 2); ctx.fill();
      ctx.fillStyle = '#fff6c2'; ctx.fillRect(-w*0.42, -h*0.49, w*0.18, 2); ctx.fillRect(w*0.24, -h*0.49, w*0.18, 2);
      if (key === 'police'){ const on = ((t*6)|0) % 2; ctx.fillStyle = on ? '#ff2d2d' : '#7a1515'; ctx.fillRect(-w*0.32, -h*0.02, w*0.3, h*0.09); ctx.fillStyle = on ? '#7a1515' : '#ff2d2d'; ctx.fillRect(w*0.02, -h*0.02, w*0.3, h*0.09); }
      break; }
    case 'sports': case 'muscle': {
      wheels(w, h);
      ctx.fillStyle = color; rr(-w/2, -h/2, w, h, key === 'sports' ? w*0.45 : r); ctx.fill(); outline(color);
      if (key === 'muscle'){ ctx.fillStyle = '#20242c'; ctx.fillRect(-w*0.16, -h/2 + 1, w*0.1, h - 2); ctx.fillRect(w*0.06, -h/2 + 1, w*0.1, h - 2); }
      ctx.fillStyle = '#2a3b52'; rr(-w*0.34, -h*0.12, w*0.68, h*0.14, 3); ctx.fill();
      ctx.fillStyle = shade(color, 0.2); rr(-w*0.3, h*0.03, w*0.6, h*0.2, 3); ctx.fill();
      if (key === 'sports'){ ctx.fillStyle = '#20242c'; ctx.fillRect(-w*0.48, h*0.38, w*0.96, 3); }
      ctx.fillStyle = '#fff6c2'; ctx.fillRect(-w*0.38, -h*0.49, w*0.2, 2); ctx.fillRect(w*0.18, -h*0.49, w*0.2, 2);
      break; }
    case 'pickup': {
      wheels(w, h);
      cab(w, h, color, 0.45);
      const by = -h/2 + h*0.47, bh = h*0.53;
      ctx.fillStyle = shade(color, -0.2); rr(-w/2+1, by, w-2, bh, 3); ctx.fill(); outline(color);
      ctx.fillStyle = shade(color, -0.42); rr(-w/2+4, by+3, w-8, bh-6, 2); ctx.fill();
      break; }
    case 'bus': {
      wheels(w, h);
      ctx.fillStyle = color; rr(-w/2, -h/2, w, h, r*0.7); ctx.fill(); outline(color);
      ctx.fillStyle = '#f4f6f8'; rr(-w*0.38, -h*0.42, w*0.76, h*0.86, 3); ctx.fill();
      ctx.fillStyle = '#2a3b52'; rr(-w*0.42, -h*0.49, w*0.84, h*0.06, 2); ctx.fill();
      ctx.fillStyle = '#cfd8e0'; rr(-w*0.22, -h*0.1, w*0.44, h*0.18, 2); ctx.fill();
      break; }
    case 'truck': {
      wheels(w, h);
      cab(w, h, color, 0.25);
      ctx.fillStyle = '#eef1f4'; rr(-w/2, -h/2 + h*0.28, w, h*0.72, 3); ctx.fill(); outline('#eef1f4');
      ctx.fillStyle = color; ctx.fillRect(-w/2 + 2, -h/2 + h*0.55, w - 4, h*0.08);
      break; }
    case 'tanker': {
      wheels(w, h);
      cab(w, h, color, 0.25);
      ctx.fillStyle = '#dfe7ee'; rr(-w*0.47, -h/2 + h*0.28, w*0.94, h*0.72, w*0.45); ctx.fill(); outline('#dfe7ee');
      ctx.fillStyle = '#ffffff'; rr(-w*0.12, -h/2 + h*0.32, w*0.24, h*0.62, w*0.12); ctx.fill();
      ctx.fillStyle = '#ff8a3d'; ctx.save(); ctx.translate(0, h*0.22); ctx.rotate(Math.PI/4); ctx.fillRect(-3.5, -3.5, 7, 7); ctx.restore();
      break; }
    case 'bike': {
      ctx.fillStyle = '#1f232b'; ctx.fillRect(-1.5, -h/2, 3, 5); ctx.fillRect(-1.5, h/2-5, 3, 5);
      ctx.fillStyle = '#f7f7f4'; ellipse(0, 0, w/2, h*0.36); ctx.lineWidth = 1; ctx.strokeStyle = '#6a7280'; ctx.stroke();
      ctx.fillStyle = '#2f5fb3'; circle(0, h*0.05, w*0.36);
      ctx.fillStyle = '#f7f7f4'; circle(0, h*0.05, w*0.24);
      ctx.fillStyle = ((t*7)|0) % 2 ? '#ff2d2d' : '#7a1515'; circle(0, -h*0.36, 2);
      break; }
    case 'tank': {
      ctx.fillStyle = '#3f4628'; rr(-w/2, -h/2, w*0.24, h, 3); ctx.fill(); rr(w/2 - w*0.24, -h/2, w*0.24, h, 3); ctx.fill();
      ctx.fillStyle = '#2b301b'; const off = (t*60) % 6; for (let y = -h/2 + off; y < h/2; y += 6){ ctx.fillRect(-w/2, y, w*0.24, 2); ctx.fillRect(w/2 - w*0.24, y, w*0.24, 2); }
      ctx.fillStyle = '#6b7a3a'; rr(-w*0.32, -h*0.44, w*0.64, h*0.88, 4); ctx.fill(); outline('#6b7a3a');
      ctx.fillStyle = '#56622e'; ctx.fillRect(-2.5, -h*0.75, 5, h*0.6);
      ctx.fillStyle = '#7f8f45'; circle(0, 0, w*0.3);
      break; }
    case 'armor': {
      wheels(w, h);
      ctx.fillStyle = '#3b4a5e'; rr(-w/2, -h/2, w, h, w*0.18); ctx.fill(); outline('#3b4a5e');
      ctx.fillStyle = '#20242c'; rr(-w/2 - 2, -h/2 - 3, w + 4, 6, 2); ctx.fill();
      ctx.fillStyle = '#8a94a6'; for (let i = -2; i <= 2; i++) ctx.fillRect(i*w*0.18 - 1.5, -h/2 - 2, 3, 4);
      ctx.fillStyle = '#9fd3ff'; rr(-w*0.32, -h*0.37, w*0.64, h*0.06, 2); ctx.fill();
      ctx.fillStyle = '#56677d'; rr(-w*0.36, -h*0.25, w*0.72, h*0.28, 3); ctx.fill(); rr(-w*0.36, h*0.1, w*0.72, h*0.3, 3); ctx.fill();
      ctx.fillStyle = '#9aa7b8'; for (const yy of [-h*0.21, -h*0.01, h*0.14, h*0.36]) for (const xx of [-w*0.29, w*0.29]) circle(xx, yy, 1.4);
      for (let i = 0; i < 6; i++){ ctx.fillStyle = i % 2 ? '#20242c' : '#ffc83d'; ctx.fillRect(-w/2 + 2 + i*(w - 4)/6, h/2 - 6, (w - 4)/6, 4); }
      const on = ((t*6)|0) % 2;
      ctx.fillStyle = on ? '#ff2d2d' : '#2d6bff'; ctx.fillRect(-w*0.3, h*0.04, w*0.28, 5);
      ctx.fillStyle = on ? '#2d6bff' : '#ff2d2d'; ctx.fillRect(w*0.02, h*0.04, w*0.28, 5);
      ctx.fillStyle = '#fff6c2'; ctx.fillRect(-w*0.42, -h*0.49, w*0.16, 2); ctx.fillRect(w*0.26, -h*0.49, w*0.16, 2);
      break; }
    /* ---- cars you can buy (toy cars seen from above) ---- */
    case 'pkei': {
      drawVehicle('kei', w, h, color);
      ctx.fillStyle = '#ffffff'; circle(0, h*0.06, w*0.13);
      ctx.fillStyle = shade(color, -0.25); circle(0, h*0.06, w*0.06);
      break; }
    case 'taxi': {
      drawVehicle('car', w, h, color);
      ctx.fillStyle = '#20242c';
      for (let i = 0; i < 6; i++) if (i % 2){ ctx.fillRect(-w/2, -h*0.14 + i*3, 2, 3); ctx.fillRect(w/2 - 2, -h*0.14 + i*3, 2, 3); }
      ctx.fillStyle = '#ffffff'; rr(-w*0.24, -h*0.02, w*0.48, h*0.12, 2); ctx.fill();
      ctx.lineWidth = 1; ctx.strokeStyle = '#20242c'; ctx.stroke();
      ctx.fillStyle = '#ff5a36'; ctx.fillRect(-w*0.14, h*0.02, w*0.28, h*0.04);
      break; }
    case 'cash': {
      drawVehicle('van', w, h, color);
      ctx.fillStyle = '#ffc83d'; ctx.fillRect(-w/2 + 1, -h*0.2, 2, h*0.55); ctx.fillRect(w/2 - 3, -h*0.2, 2, h*0.55);
      ctx.fillStyle = '#ffc83d'; circle(0, h*0.08, w*0.24);
      ctx.lineWidth = 1.2; ctx.strokeStyle = '#d9a21f'; ctx.beginPath(); ctx.arc(0, h*0.08, w*0.24, 0, Math.PI*2); ctx.stroke();
      ctx.save(); ctx.fillStyle = '#b07d12'; ctx.font = `900 ${Math.round(w*0.34)}px sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('¥', 0, h*0.08 + 0.5); ctx.restore();
      break; }
    case 'amb': {
      drawVehicle('van', w, h, color);
      ctx.fillStyle = '#e3261b'; ctx.fillRect(-w/2 + 1, -h*0.05, 2.5, h*0.4); ctx.fillRect(w/2 - 3.5, -h*0.05, 2.5, h*0.4);
      ctx.fillRect(-w*0.06, h*0.0, w*0.12, h*0.26); ctx.fillRect(-w*0.19, h*0.08, w*0.38, h*0.1);
      { const on = ((t*6)|0) % 2; ctx.fillStyle = on ? '#ff2d2d' : '#7a1515'; ctx.fillRect(-w*0.3, -h*0.2, w*0.28, 3); ctx.fillStyle = on ? '#7a1515' : '#ff2d2d'; ctx.fillRect(w*0.02, -h*0.2, w*0.28, 3); }
      break; }
    case 'pbus': {
      drawVehicle('bus', w, h, color);
      ctx.fillStyle = '#ffc83d'; rr(-w*0.3, -h*0.44, w*0.6, h*0.035, 1); ctx.fill();
      ctx.fillStyle = shade(color, -0.1); ctx.fillRect(-w*0.38, h*0.2, w*0.76, 2);
      break; }
    case 'fire': {
      wheels(w, h);
      ctx.fillStyle = color; rr(-w/2, -h/2, w, h, w*0.18); ctx.fill(); outline(color);
      ctx.fillStyle = '#2a3b52'; rr(-w*0.38, -h*0.45, w*0.76, h*0.08, 2); ctx.fill();
      { const on = ((t*6)|0) % 2; ctx.fillStyle = on ? '#ff2d2d' : '#ffffff'; ctx.fillRect(-w*0.32, -h*0.33, w*0.3, 3); ctx.fillStyle = on ? '#ffffff' : '#ff2d2d'; ctx.fillRect(w*0.02, -h*0.33, w*0.3, 3); }
      ctx.fillStyle = '#cfd6dd'; ctx.fillRect(-w*0.24, -h*0.24, 2.5, h*0.7); ctx.fillRect(w*0.24 - 2.5, -h*0.24, 2.5, h*0.7);
      for (let y = -h*0.22; y < h*0.44; y += 5) ctx.fillRect(-w*0.24, y, w*0.48, 1.5);
      ctx.fillStyle = '#ffffff'; ctx.fillRect(-w/2 + 1, h*0.02, 2, h*0.4); ctx.fillRect(w/2 - 3, h*0.02, 2, h*0.4);
      ctx.fillStyle = '#fff6c2'; ctx.fillRect(-w*0.42, -h*0.49, w*0.16, 2); ctx.fillRect(w*0.26, -h*0.49, w*0.16, 2);
      break; }
    case 'gomi': {
      wheels(w, h);
      cab(w, h, color, 0.3);
      const by = -h/2 + h*0.32, bh = h*0.68;
      ctx.fillStyle = '#e9eef3'; rr(-w/2, by, w, bh, 4); ctx.fill(); outline('#e9eef3');
      ctx.fillStyle = shade(color, -0.05); rr(-w/2 + 2, by + 3, w - 4, bh*0.22, 2); ctx.fill();
      ctx.fillStyle = '#c3ccd5'; for (let y = by + bh*0.32; y < by + bh*0.78; y += 6) ctx.fillRect(-w/2 + 3, y, w - 6, 2);
      ctx.fillStyle = '#20242c'; rr(-w*0.4, h/2 - h*0.11, w*0.8, h*0.08, 2); ctx.fill();
      break; }
    case 'super': {
      wheels(w, h);
      ctx.fillStyle = color; ctx.beginPath();
      ctx.moveTo(-w*0.3, -h/2); ctx.lineTo(w*0.3, -h/2); ctx.quadraticCurveTo(w/2, -h*0.32, w/2, -h*0.06);
      ctx.lineTo(w/2, h*0.44); ctx.quadraticCurveTo(w/2, h/2, w*0.4, h/2); ctx.lineTo(-w*0.4, h/2); ctx.quadraticCurveTo(-w/2, h/2, -w/2, h*0.44);
      ctx.lineTo(-w/2, -h*0.06); ctx.quadraticCurveTo(-w/2, -h*0.32, -w*0.3, -h/2); ctx.closePath(); ctx.fill(); outline(color);
      ctx.fillStyle = shade(color, 0.35); ctx.fillRect(-w*0.07, -h*0.49, w*0.14, h*0.36);
      ctx.fillStyle = '#2a3b52'; rr(-w*0.28, -h*0.12, w*0.56, h*0.22, 5); ctx.fill();
      ctx.fillStyle = '#20242c'; ctx.fillRect(-w*0.47, h*0.1, 2.5, h*0.16); ctx.fillRect(w*0.47 - 2.5, h*0.1, 2.5, h*0.16);
      rr(-w*0.54, h*0.39, w*1.08, 4, 1); ctx.fill();
      ctx.fillStyle = '#fff6c2'; ctx.fillRect(-w*0.36, -h*0.47, w*0.16, 2); ctx.fillRect(w*0.2, -h*0.47, w*0.16, 2);
      break; }
    case 'monster': {
      ctx.fillStyle = '#1f232b';
      const tw = w*0.32, th = h*0.27;
      for (const [x, y] of [[-w/2 - 2, -h*0.44], [w/2 - tw + 2, -h*0.44], [-w/2 - 2, h*0.17], [w/2 - tw + 2, h*0.17]]){
        ctx.fillStyle = '#1f232b'; rr(x, y, tw, th, 3); ctx.fill();
        ctx.fillStyle = '#3d434f'; for (let k = 1; k < 4; k++) ctx.fillRect(x + 1, y + k*th/4 - 1, tw - 2, 1.5);
      }
      ctx.fillStyle = color; rr(-w*0.3, -h*0.42, w*0.6, h*0.84, 5); ctx.fill(); outline(color);
      ctx.fillStyle = '#2a3b52'; rr(-w*0.24, -h*0.24, w*0.48, h*0.12, 2); ctx.fill();
      ctx.fillStyle = shade(color, 0.22); rr(-w*0.22, -h*0.08, w*0.44, h*0.26, 3); ctx.fill();
      ctx.fillStyle = '#ffc83d'; ctx.fillRect(-w*0.2, h*0.24, w*0.4, 3);
      ctx.fillStyle = '#e3261b'; ctx.fillRect(-w*0.2, h*0.29, w*0.4, 2);
      ctx.fillStyle = '#fff6c2'; ctx.fillRect(-w*0.26, -h*0.41, w*0.14, 2); ctx.fillRect(w*0.12, -h*0.41, w*0.14, 2);
      break; }
    case 'rocket': {
      wheels(w, h*0.8);
      { const fl = 4 + Math.abs(Math.sin(t*30))*4; ctx.fillStyle = '#ff8a3d'; ellipse(0, h/2 + 2 + fl*0.4, w*0.2, fl); ctx.fillStyle = '#ffc83d'; ellipse(0, h/2 + 1, w*0.11, fl*0.55); }
      ctx.fillStyle = shade(color, -0.25); ctx.beginPath(); ctx.moveTo(-w*0.28, h*0.2); ctx.lineTo(-w*0.62, h*0.46); ctx.lineTo(-w*0.28, h*0.42); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.moveTo(w*0.28, h*0.2); ctx.lineTo(w*0.62, h*0.46); ctx.lineTo(w*0.28, h*0.42); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#cfd6dd'; rr(-w*0.3, h*0.16, w*0.6, h*0.34, 3); ctx.fill(); outline('#cfd6dd');
      ctx.fillStyle = color; rr(-w/2, -h/2, w, h*0.7, w*0.48); ctx.fill(); outline(color);
      ctx.fillStyle = '#2a3b52'; ellipse(0, -h*0.12, w*0.24, h*0.1);
      ctx.fillStyle = '#ffffff'; ctx.fillRect(-w*0.06, -h*0.46, w*0.12, h*0.18);
      ctx.fillStyle = '#ff5a36'; ctx.fillRect(-w/2 + 2, h*0.02, w - 4, 2.5);
      break; }
    case 'ppolice': {
      drawVehicle('police', w, h, color);
      ctx.fillStyle = '#ffc83d'; ctx.beginPath();
      for (let i = 0; i < 10; i++){ const a = -Math.PI/2 + i*Math.PI/5, r = i % 2 ? 2 : 4.6; ctx.lineTo(Math.cos(a)*r, -h*0.34 + Math.sin(a)*r); }
      ctx.closePath(); ctx.fill();
      break; }
    case 'ptank': {
      const tr = shade(color, -0.45);
      ctx.fillStyle = tr; rr(-w/2, -h/2, w*0.24, h, 3); ctx.fill(); rr(w/2 - w*0.24, -h/2, w*0.24, h, 3); ctx.fill();
      ctx.fillStyle = shade(color, -0.6); const off = (t*60) % 6; for (let y = -h/2 + off; y < h/2; y += 6){ ctx.fillRect(-w/2, y, w*0.24, 2); ctx.fillRect(w/2 - w*0.24, y, w*0.24, 2); }
      ctx.fillStyle = color; rr(-w*0.32, -h*0.44, w*0.64, h*0.88, 4); ctx.fill(); outline(color);
      ctx.fillStyle = shade(color, -0.2); ctx.fillRect(-2.5, -h*0.75, 5, h*0.6);
      ctx.fillStyle = shade(color, 0.12); circle(0, 0, w*0.3);
      ctx.fillStyle = '#ff5a36'; circle(0, 0, w*0.08);
      break; }
  }
}
function mark(x, y){
  const r = 8 * (1 + 0.15*Math.sin(t*14));
  ctx.fillStyle = '#ff5a36'; circle(x, y, r);
  ctx.lineWidth = 2; ctx.strokeStyle = '#ffffff'; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI*2); ctx.stroke();
  ctx.fillStyle = '#ffffff'; ctx.font = '400 11px "Dela Gothic One", sans-serif'; ctx.textAlign = 'center'; ctx.fillText('！', x + 0.5, y + 4);
}
function drawHeli(hx, hy){
  const w = 30, h = 46;
  ctx.save(); ctx.translate(hx, hy);
  ctx.fillStyle = '#24406b'; ctx.fillRect(-2, 0, 4, h*0.5); ctx.fillRect(-7, h*0.45, 14, 3);
  ellipse(0, -h*0.12, w*0.32, h*0.3);
  ctx.fillStyle = '#9fd3ff'; ellipse(0, -h*0.26, w*0.2, h*0.12);
  ctx.fillStyle = '#e9eef3'; ctx.fillRect(-w*0.32, -h*0.06, w*0.64, 3);
  ctx.save(); ctx.rotate(t*28); ctx.fillStyle = 'rgba(25,30,40,0.55)'; ctx.fillRect(-w*0.85, -1.5, w*1.7, 3); ctx.fillRect(-1.5, -w*0.85, 3, w*1.7); ctx.restore();
  ctx.fillStyle = '#ff2d2d'; circle(0, -h*0.12, 2.2);
  ctx.restore();
}
/* car sprites (11/17, lightening): each toy car (type, colour, size, light phase) is painted once with its tyres, details and gloss,
   and every frame only stamps the picture. Flashing lights keep 2 pictures, tank treads 6; the rocket car's flame moves, so it is drawn as before */
const SPR = new Map(), SPR_MAX = 140, SPR_PAD = 6;
const SPR_FLASH = {police:6, armor:6, amb:6, fire:6, bike:7};
let sprPs = 0;
function carSprite(b){
  if (b.key === 'rocket'){ drawVehicle(b.key, b.w, b.h, b.color); toyGloss(b.w, b.h); return; }
  const ps = s * DPR * 1.12;
  if (ps !== sprPs){ SPR.clear(); sprPs = ps; }
  const fr = SPR_FLASH[b.key], ph = fr ? ((t*fr)|0) % 2 : (b.key === 'tank' || b.key === 'ptank') ? ((t*60) % 6)|0 : 0;
  const key = b.key + '|' + b.color + '|' + b.w + '|' + b.h + '|' + ph;
  let c = SPR.get(key);
  if (!c){
    const w = b.w + SPR_PAD*2, h = b.h + SPR_PAD*2;
    c = document.createElement('canvas'); c.width = Math.ceil(w * ps); c.height = Math.ceil(h * ps);
    const saved = ctx, tSaved = t;
    ctx = c.getContext('2d'); ctx.setTransform(ps, 0, 0, ps, w * ps / 2, h * ps / 2);
    t = fr ? (ph + 0.5) / fr : (b.key === 'tank' || b.key === 'ptank') ? (ph + 0.5) / 60 : t;
    try { drawVehicle(b.key, b.w, b.h, b.color); if (!NO_GLOSS[b.key]) toyGloss(b.w, b.h); } finally { ctx = saved; t = tSaved; }
    if (SPR.size >= SPR_MAX) SPR.delete(SPR.keys().next().value);
  } else SPR.delete(key);
  SPR.set(key, c);   // newest last, so the oldest picture goes first when the cache is full
  ctx.drawImage(c, -b.w/2 - SPR_PAD, -b.h/2 - SPR_PAD, b.w + SPR_PAD*2, b.h + SPR_PAD*2);
}
// the nitro glow is one soft picture under the car instead of a canvas blur on every shape of it
let nitroGlow = null;
function drawNitroGlow(w, h){
  if (!nitroGlow){ nitroGlow = document.createElement('canvas'); nitroGlow.width = nitroGlow.height = 128; const g = nitroGlow.getContext('2d'), gr = g.createRadialGradient(64, 64, 8, 64, 64, 64);
    gr.addColorStop(0, 'rgba(255,90,54,0.85)'); gr.addColorStop(0.45, 'rgba(255,90,54,0.4)'); gr.addColorStop(1, 'rgba(255,90,54,0)'); g.fillStyle = gr; g.fillRect(0, 0, 128, 128); }
  ctx.drawImage(nitroGlow, -w*1.05, -h*0.85, w*2.1, h*1.7);
}
function drawBody(b){
  let sc = 1, so = 1;
  if (b.air > 0 && b.airMax > 0){ const q = Math.sin((1 - b.air / b.airMax) * Math.PI); sc = 1 + 0.4*q; so = 1 + 3*q; }
  ctx.save(); ctx.translate(b.x, b.y); ctx.rotate(b.a);
  shadowBox(b.w, b.h, 3*so, 4*so);
  if (b === P && boosting){
    const fl = (len, wd, col) => { ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(-b.w*wd, b.h/2 - 2); ctx.lineTo(0, b.h/2 + len); ctx.lineTo(b.w*wd, b.h/2 - 2); ctx.fill(); };
    fl(36 + Math.random()*16, 0.44, '#e3261b'); fl(26 + Math.random()*10, 0.34, '#ff8a3d'); fl(14 + Math.random()*6, 0.2, '#ffe27a');
    drawNitroGlow(b.w, b.h);
  }
  ctx.scale(sc, sc);
  const roll = b.rollTo ? b.rollTo * (b.airMax > 0 && b.air > 0 ? 1 - b.air / b.airMax : 1) : 0, cr = Math.cos(roll);
  if (roll) ctx.scale(Math.max(0.14, Math.abs(cr)), 1);
  if (cr < 0){ toyUnder(b.w, b.h, b.key === 'police' ? '#f7f7f4' : (b.color || '#cfd6dd')); if (b.fire > 0){ ctx.fillStyle = (t*14|0) % 2 ? '#ff8a3d' : '#ffc83d'; circle((Math.random()-0.5)*4, -b.h*0.15, 3 + Math.random()*3); } ctx.restore(); return; }
  carSprite(b);
  if (b.brk > 0 && b.state === 'drive'){ ctx.fillStyle = '#ff2d2d'; ctx.fillRect(-b.w*0.42, b.h/2 - 3, b.w*0.22, 3); ctx.fillRect(b.w*0.2, b.h/2 - 3, b.w*0.22, 3); }
  if (b.boss && b.state === 'drive'){
    if (b.boss.mode === 'rev' || b.boss.mode === 'charge'){ ctx.fillStyle = 'rgba(255,246,194,0.45)'; circle(-b.w*0.34, -b.h/2 - 4, 6); circle(b.w*0.34, -b.h/2 - 4, 6); }
    if (b.boss.brake){ ctx.fillStyle = '#ff2d2d'; ctx.fillRect(-b.w*0.46, b.h/2 - 4, b.w*0.2, 4); ctx.fillRect(b.w*0.26, b.h/2 - 4, b.w*0.2, 4); ctx.fillStyle = 'rgba(255,45,45,0.3)'; circle(-b.w*0.36, b.h/2, 7); circle(b.w*0.36, b.h/2, 7); }
    if (b.boss.flash > 0){ ctx.fillStyle = 'rgba(255,255,255,0.55)'; rr(-b.w/2, -b.h/2, b.w, b.h, b.w*0.18); ctx.fill(); }
    if (b.boss.hp < b.boss.max*0.5 && Math.random() < 0.3) smoke(b.x, b.y - b.h*0.2);
  }
  if (b.state === 'wreck' && !b.fixed){ ctx.fillStyle = 'rgba(30,28,26,0.45)'; rr(-b.w/2, -b.h/2, b.w, b.h, Math.min(b.w, b.h)*0.26); ctx.fill(); }
  if (b.fire > 0){ ctx.fillStyle = (t*14|0) % 2 ? '#ff8a3d' : '#ffc83d'; circle((Math.random()-0.5)*4, -b.h*0.15, 3 + Math.random()*3); }
  else if (b === P && b.state === 'drive' && P.hp < P.maxHp*0.3){ ctx.fillStyle = (t*16|0) % 2 ? '#ff5a36' : '#ffc83d'; circle((Math.random()-0.5)*b.w*0.4, -b.h*0.22, 2.5 + Math.random()*3); circle((Math.random()-0.5)*b.w*0.3, -b.h*0.3, 1.5 + Math.random()*2); }
  ctx.restore();
}

const HOUSE = ['#e8735a','#4f8fc0','#f0b94a','#6fb68b','#a984c9','#e7ded0'];
const BLDG = ['#8da2b7','#a6b4c3','#7a8da2','#bcc7d2','#95a7a0'];
const WARE = ['#d4dbe2','#a9bccb','#c9b48f','#8fa9b8','#b7c4b0'];
const WATER = '#3b8ec4';
const HW_STYLES = {highway:1, bridge:1, snowhw:1, deserthw:1};
const NO_LANES = {dirt:1, canyon:1, border:1};
function pine(x, y, r){ ctx.fillStyle = 'rgba(18,28,38,0.18)'; circle(x + 3, y + 4, r); ctx.fillStyle = '#2f6b4a'; circle(x, y, r); ctx.fillStyle = '#3f8a5c'; circle(x - r*0.25, y - r*0.25, r*0.55); ctx.fillStyle = '#f7fbff'; circle(x - r*0.35, y - r*0.4, r*0.28); }
/* wide screens (tablets) see far more roadside than a phone; a navy veil over the far part keeps the eye on the road (same view distance, no zoom) */
let veilKey = '', veilG = null;
function veilFar(top, bot, left, right){
  const span = W / s; if (span <= 340) return;
  let hm = 0; for (let y = top; y < bot; y += 48) hm = Math.max(hm, halfAt(-y / M));
  const x0 = Math.max(hm + 40, 110), x1 = x0 + 170, a = Math.min(0.55, 0.22 + (span - 340) / 900);
  const gk = x0 + '|' + a; if (gk !== veilKey){ veilKey = gk; veilG = [-1, 1].map(sg => { const g = ctx.createLinearGradient(sg*x0, 0, sg*x1, 0); g.addColorStop(0, 'rgba(23,50,77,0)'); g.addColorStop(1, `rgba(23,50,77,${a})`); return g; }); }
  for (const sg of [-1, 1]){
    ctx.fillStyle = veilG[sg > 0 ? 1 : 0];
    if (sg > 0) ctx.fillRect(x0, top, Math.max(0, right - x0), bot - top); else ctx.fillRect(left, top, Math.max(0, -x0 - left), bot - top);
  }
}
/* toy-town diorama: buildings are wooden blocks (grain, lit and shaded edges, a smaller block, a roof or a round block on top), the ground has a felt-mat speckle */
let woodP = null, feltP = null;
function texPat(kind){
  const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d');
  if (kind === 'wood'){ g.strokeStyle = 'rgba(90,55,25,0.16)'; g.lineWidth = 1; for (let i = 0; i < 9; i++){ const y = 4 + i*7 + rnd(i*3)*3; g.beginPath(); g.moveTo(0, y); g.bezierCurveTo(20, y - 3 + rnd(i)*6, 44, y + 3 - rnd(i*5)*6, 64, y); g.stroke(); } }
  else { for (let i = 0; i < 140; i++){ g.fillStyle = i % 2 ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.06)'; g.fillRect(rnd(i*7)*64, rnd(i*11)*64, 1.4, 1.4); } }
  return ctx.createPattern(c, 'repeat');
}
// a wooden block seen from above. top: 0 plain, 1 a smaller block, 2 a roof, 3 a round block, 4 snow
function block(x, y, w, h, col, top){
  if (!woodP){ woodP = texPat('wood'); feltP = texPat('felt'); }
  ctx.fillStyle = 'rgba(18,28,38,0.22)'; ctx.fillRect(x + 4, y + 5, w, h);
  ctx.fillStyle = col; ctx.fillRect(x, y, w, h);
  ctx.fillStyle = woodP; ctx.fillRect(x, y, w, h);
  const e = Math.min(2.6, w*0.1, h*0.1);
  ctx.fillStyle = 'rgba(255,255,255,0.3)'; ctx.fillRect(x, y, w, e); ctx.fillRect(x, y, e, h);
  ctx.fillStyle = 'rgba(0,0,0,0.16)'; ctx.fillRect(x, y + h - e, w, e); ctx.fillRect(x + w - e, y, e, h);
  if (top === 1 && w > 18 && h > 18){ const iw = w*0.56, ih = h*0.56, ix = x + (w - iw)/2, iy = y + (h - ih)/2; ctx.fillStyle = 'rgba(18,28,38,0.2)'; ctx.fillRect(ix + 2.5, iy + 3, iw, ih); ctx.fillStyle = shade(col, 0.1); ctx.fillRect(ix, iy, iw, ih); ctx.fillStyle = woodP; ctx.fillRect(ix, iy, iw, ih); ctx.fillStyle = 'rgba(255,255,255,0.3)'; ctx.fillRect(ix, iy, iw, 2); ctx.fillRect(ix, iy, 2, ih); }
  else if (top === 2){ ctx.fillStyle = 'rgba(255,255,255,0.18)'; ctx.fillRect(x + e, y + e, w/2 - e, h - e*2); ctx.fillStyle = 'rgba(0,0,0,0.12)'; ctx.fillRect(x + w/2, y + e, w/2 - e, h - e*2); ctx.fillStyle = shade(col, -0.3); ctx.fillRect(x + w/2 - 0.8, y + 1, 1.6, h - 2); }
  else if (top === 3){ const r = Math.min(w, h)*0.3, cx = x + w/2, cy = y + h/2; ctx.fillStyle = 'rgba(18,28,38,0.2)'; circle(cx + 2.5, cy + 3, r); ctx.fillStyle = shade(col, 0.14); circle(cx, cy, r); ctx.fillStyle = 'rgba(255,255,255,0.35)'; circle(cx - r*0.3, cy - r*0.3, r*0.4); }
  else if (top === 4){ ctx.fillStyle = '#f7fbff'; ctx.fillRect(x, y, w, h*0.45); ctx.fillStyle = 'rgba(160,190,220,0.35)'; ctx.fillRect(x, y + h*0.45 - 1.5, w, 1.5); }
}
/* a building knocked down: a low stump, blocks spilled toward the road, dust on the ground (fixed per cell, so it stays the same while you pass) */
function rubble(x, y, w, h, col, sg, seed, big){
  ctx.fillStyle = big ? 'rgba(40,34,30,0.28)' : 'rgba(120,100,80,0.2)'; ellipse(x + w/2, y + h/2, w*0.62, h*0.55);
  block(sg > 0 ? x + w*0.45 : x, y + h*0.45, w*0.55, h*0.55, shade(col, -0.08), 0);
  for (let i = 0; i < 7; i++){
    const bw = 6 + rnd(seed + i*3)*8, bh = 6 + rnd(seed + i*5)*6, px = x + rnd(seed + i*7)*w - sg*rnd(seed + i*11)*14, py = y + rnd(seed + i*13)*h, a = rnd(seed + i*17)*Math.PI;
    const c = i % 3 === 0 ? BLOCK_COL[(rnd(seed + i*19)*BLOCK_COL.length)|0] : col;
    ctx.save(); ctx.translate(px, py); ctx.rotate(a);
    ctx.fillStyle = 'rgba(18,28,38,0.22)'; ctx.fillRect(-bw/2 + 2, -bh/2 + 2.5, bw, bh); ctx.fillStyle = c; ctx.fillRect(-bw/2, -bh/2, bw, bh);
    ctx.fillStyle = 'rgba(255,255,255,0.3)'; ctx.fillRect(-bw/2, -bh/2, bw, 1.5); ctx.fillStyle = 'rgba(0,0,0,0.16)'; ctx.fillRect(-bw/2, bh/2 - 1.5, bw, 1.5);
    ctx.restore();
  }
}
