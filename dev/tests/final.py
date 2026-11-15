import os
import sys, json
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from dbg import *
with sync_playwright() as p:
    r = Run(p); r.wait(2400)
    for town in range(4):
        r.ev("(()=>{const s=__butto.save(); s.towns.forEach(t=>t.clear=true); s.owned[14]=true; s.car=14; s.up[14]={eng:5,body:5,boost:3}; s.plays=99;})()")
        r.ev(f'__butto.start({town})'); res = r.ev('__butto.sim(700)')
        print(f"sim700 town {town}: {res['end']} {res['dist']}m {res['time']}s score {res['score']} boss {res['boss']} hp {res['hp']} state {r.g()['state']}")
    print('ERR', r.errs, r.cons)
    r.close()
