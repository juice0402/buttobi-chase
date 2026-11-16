# ko_check: crashes must be counted per kind (ko) as well as in total (takeN) — missions and titles read ko
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from dbg import *
make_test_copy()
with sync_playwright() as p:
    r = Run(p, 390, 844, file=WT); r.wait(2400)
    r.ev("(()=>{const s=__butto.save(); s.towns.forEach(t=>t.clear=true); s.tutDone=true; s.plays=99;})()")
    r.ev('__butto.start(1)'); r.ev('__butto.sim(150)')
    takeN = r.ev("__dbg.ev('takeN')"); kos = r.ev("__dbg.ev('Object.values(ko).reduce((a,b)=>a+b,0)')")
    check('ko counts every takedown', takeN > 0 and kos == takeN, f'takeN {takeN} ko {kos}')
    r.close()
