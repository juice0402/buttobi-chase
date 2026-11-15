import os
import sys, json
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from dbg import *
make_test_copy()
GOD = r"""(sec => { const dt = 1/60, stop = t + sec; let mx = 0;
  while ((state === 'play' || state === 'ending') && t < stop){ if (state === 'play'){ P.hp = P.maxHp; targetX = Math.sin(t*0.7) * 60; if (boost >= 100) tryBoost(); } update(dt); mx = Math.max(mx, cars.length); }
  return mx; })"""
with sync_playwright() as p:
    r = Run(p, file=WT); r.wait(2400)
    for town in [0, 3]:
        r.ev("(()=>{const s=__butto.save(); s.towns.forEach(t=>t.clear=true); s.car=0; s.plays=99;})()")
        r.ev(f"__butto.start({town})"); r.ev("__dbg.ev('GOAL = 40000')")
        for k in range(12):
            mx = r.ev("__dbg.ev(" + json.dumps(GOD) + ")(60)"); st = r.ev('__dbg.st()')
            print(town, 't', st['t'], 'dist', st['dist'], 'maxcars', mx, {k2: st[k2] for k2 in ['cars','fx','pops','drums','booms','spikes','chasers','wrecks','cross','star']}, 'bad', st['bad'], 'misQ', r.ev("__dbg.ev('misQueue.length')"))
    print('ERR', r.errs[:3])
    r.close()
