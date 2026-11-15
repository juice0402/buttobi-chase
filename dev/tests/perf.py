import os
import sys, json
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from dbg import *
make_test_copy()
RATE = float(sys.argv[1]) if len(sys.argv) > 1 else 6
WRAP = r"""
window.__pf = {u:[], d:[], on:false};
const _u = update, _d = draw;
update = function(dt){ const a = performance.now(); _u(dt); if (__pf.on) __pf.u.push(performance.now() - a); };
draw = function(){ const a = performance.now(); _d(); if (__pf.on) __pf.d.push(performance.now() - a); };
"""
KEEP = r"""(() => { if (state !== 'play') return; P.hp = P.maxHp; const sc = window.__scn;
  if (sc === 'pile' && Math.random() < 0.12){ const b = cars[(Math.random()*cars.length)|0]; explodeAt(P.x + (Math.random()-0.5)*120, P.y - 60 - Math.random()*200, 90, 420, true, 0); for (let k=0;k<3;k++) spawnTraffic(P.y - 100 - Math.random()*300, false); }
  if (sc === 'star5'){ heatPts = Math.max(heatPts, 520); }
  if (sc === 'nitro' && !boosting){ boost = 100; tryBoost(); }
})()"""
SCN = {
  'pile':  (0, "P.y = -2100*M; camY = P.y; dist = 2100; heatPts = 300; for (let k=0;k<40;k++) spawnTraffic(P.y - Math.random()*500, false); for (const c of cars) if (Math.random()<0.5){ c.lastHit='player'; c.lastHitT=t; crash(c,'hit'); }"),
  'star5': (1, "P.y = -2700*M; camY = P.y; dist = 2700; heatPts = 520; nextBoss = 9;"),
  'boss':  (3, "P.y = -5152*M; camY = P.y; dist = 5152; nextBoss = 3; heatPts = 450;"),
  'nitro': (1, "P.y = -2800*M; camY = P.y; dist = 2800; heatPts = 450; nextBoss = 9; boost = 100; tryBoost();"),
}
def stats(a):
    a = sorted(a); n = len(a)
    if not n: return (0, 0, 0, 0)
    return (round(sum(a)/n, 2), round(a[int(n*0.95)-1 if n > 1 else 0], 2), round(a[-1], 2), n)
with sync_playwright() as p:
    for (w, h) in [(390, 844), (1180, 820)]:
        r = Run(p, w, h, file=WT); r.wait(2400)
        r.ev("__dbg.ev(" + json.dumps(WRAP) + ")")
        cdp = r.ctx.new_cdp_session(r.pg); cdp.send('Emulation.setCPUThrottlingRate', {'rate': RATE})
        for name, (town, setup) in SCN.items():
            r.ev("(()=>{const s=__butto.save(); s.towns.forEach(t=>t.clear=true); s.owned[14]=true; s.car=14; s.up[14]={eng:5,body:5,boost:3}; s.plays=99;})()")
            r.ev(f"window.__scn = '{name}'"); r.ev(f"__butto.start({town})"); r.ev("__dbg.ev(" + json.dumps(setup) + ")")
            r.wait(300)
            r.ev("__pf.u = []; __pf.d = []; __pf.on = true;")
            fr = []
            for k in range(100):
                r.ev("__dbg.ev(" + json.dumps(KEEP) + ")"); r.wait(40)
            r.ev("__pf.on = false")
            u = r.ev('__pf.u'); d = r.ev('__pf.d'); tot = [a + b for a, b in zip(u, d)]
            st = r.ev('__dbg.st()')
            print(f"{w}x{h} x{RATE} {name:6s} update {stats(u)} draw {stats(d)} total avg/p95/max/n {stats(tot)}  cars {st['cars']} fx {st['fx']} star {st['star']} boss {st['boss']}")
        r.close()
