import os
import json, sys, statistics as stt
from playwright.sync_api import sync_playwright
D = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
FILE = sys.argv[1] if len(sys.argv) > 1 else 'index.html'
N = int(sys.argv[2]) if len(sys.argv) > 2 else 5
SC = [  # name, town, car index, eng, body, boost
  ('t0 sports lv0', 0, 0, 0, 0, 0), ('t0 muscle 2/2/1', 0, 1, 2, 2, 1),
  ('t1 pickup 3/3/1', 1, 2, 3, 3, 1), ('t1 cash 3/3/2', 1, 5, 3, 3, 2),
  ('t2 bus 4/4/2', 2, 7, 4, 4, 2), ('t2 super 5/5/3', 2, 10, 5, 5, 3),
  ('t3 monster 5/5/3', 3, 11, 5, 5, 3), ('t3 tank 5/5/3', 3, 14, 5, 5, 3),
]
if len(sys.argv) > 3: SC = [x for x in SC if x[0].startswith(sys.argv[3])]
errs = []
with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/usr/bin/google-chrome')
    pg = b.new_page(viewport={'width': 390, 'height': 844})
    pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto('file://' + D + '/' + FILE); pg.wait_for_timeout(2700)
    for name, town, ci, e, bd, bo in SC:
        rs = []
        for k in range(N):
            pg.evaluate(f"""(()=>{{const s=__butto.save(); s.towns.forEach(t=>t.clear=true); s.owned[{ci}]=true; s.car={ci}; s.up[{ci}]={{eng:{e},body:{bd},boost:{bo}}}; s.plays=99;}})()""")
            pg.evaluate(f'__butto.start({town})')
            rs.append(pg.evaluate('__butto.sim(700)'))
        clr = sum(r['end'] == 'clear' for r in rs)
        sc = [r['score'] for r in rs]; ds = [r['dist'] for r in rs]; tm = [r['time'] for r in rs]
        boss = [r['boss'] for r in rs]
        print(f"{name:18s} clear {clr}/{N}  score med {int(stt.median(sc)):6d} [{min(sc)}-{max(sc)}]  dist med {int(stt.median(ds))}  time med {int(stt.median(tm))}s  boss {boss}  star {[r['star'] for r in rs]}")
    b.close()
print('ERR', len(errs), errs[:3])
