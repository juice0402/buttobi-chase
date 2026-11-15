import os
import json, sys
from playwright.sync_api import sync_playwright
D = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
MAXR = int(sys.argv[1]) if len(sys.argv) > 1 else 120
POLICY = r"""(()=>{
  const s = __butto.save(), out = [];
  const UP = [{k:'eng', p:[150,350,700,1200,1900]}, {k:'body', p:[150,350,700,1200,1900]}, {k:'boost', p:[250,700,1500]}];
  const PR = [0,1000,3000,5000,8000,12000,18000,25000,35000,45000,60000,80000,100000,130000,160000];
  const NEED = {13:'ram', 14:'boss'};
  const upP = (u, lv, ci) => lv < u.p.length ? Math.round(u.p[lv] * (1 + ci*0.25) / 10) * 10 : null;
  for (let guard = 0; guard < 60; guard++){
    // next car in order, once the riding car is at least half upgraded
    const nxt = s.owned.indexOf(false), U = s.up[s.car], lv = U.eng + U.body + U.boost;
    if (nxt >= 0 && (!NEED[nxt] || s.titles[NEED[nxt]]) && s.money >= PR[nxt] && lv >= 6){ s.money -= PR[nxt]; s.owned[nxt] = true; s.car = nxt; out.push('car' + nxt); continue; }
    let best = null; for (const u of UP){ const p = upP(u, U[u.k], s.car); if (p !== null && p <= s.money && (!best || p < best.p)) best = {u, p}; }
    if (best){ s.money -= best.p; U[best.u.k]++; out.push(best.u.k); continue; }
    break;
  }
  let top = 0; for (let i = 0; i < 4; i++) if (i === 0 || s.towns[i-1].clear) top = i;
  s.town = top; s.plays = 99;
  return out.join(',');
})()"""
with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/usr/bin/google-chrome')
    pg = b.new_page(viewport={'width': 390, 'height': 844})
    pg.goto('file://' + D + '/index.html'); pg.wait_for_timeout(2700)
    pg.evaluate("localStorage.clear()"); pg.evaluate("__butto.load({})")
    pg.evaluate("(()=>{const s=__butto.save(); Object.assign(s,{money:0,car:0}); s.owned=s.owned.map((v,i)=>i===0); s.up=s.up.map(()=>({eng:0,body:0,boost:0})); s.towns.forEach(t=>{t.clear=false;t.rank='';t.best=0;t.mis=[false,false,false]}); s.titles={};})()")
    opened = {}; tsum = 0
    for r in range(1, MAXR + 1):
        bought = pg.evaluate(POLICY)
        st = pg.evaluate("(()=>{const s=__butto.save(); return {town:s.town, money:s.money, car:s.car, owned:s.owned.filter(Boolean).length, up:s.up[s.car]}})()")
        pg.evaluate(f"__butto.start({st['town']})")
        res = pg.evaluate('__butto.sim(700)'); tsum += res['time']
        sv = pg.evaluate("(()=>{const s=__butto.save(); return {money:s.money, clears:s.towns.map(t=>t.clear), stars:s.towns.map(t=>(t.clear?1:0)+((t.rank==='S'||t.rank==='A')?1:0)+(t.mis.every(Boolean)?1:0))}})()")
        for i, c in enumerate(sv['clears']):
            if c and i not in opened: opened[i] = r
        if r % 5 == 0 or r < 6:
            print(f"run {r:3d} town {st['town']} car {st['car']:2d} owned {st['owned']:2d} up {st['up']} -> {res['end']:5s} {res['dist']:5d}m score {res['score']:6d} money {sv['money']:7d} stars {sv['stars']} min {tsum//60}")
        if st['owned'] == 15 and all(v == (5 if k != 'boost' else 3) for k, v in st['up'].items()): break
    print('cleared town at run', opened, 'total minutes', tsum // 60)
    b.close()
