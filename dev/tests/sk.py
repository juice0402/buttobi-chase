import os
import sys, json
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from dbg import *
make_test_copy()
def setup(r, ci, town, d):
    r.ev(f"(()=>{{const s=__butto.save(); s.towns.forEach(t=>t.clear=true); s.owned[{ci}]=true; s.car={ci}; s.up[{ci}]={{eng:0,body:0,boost:0}}; s.plays=99; s.titles.ram=true; s.titles.boss=true;}})()")
    r.ev(f"__butto.start({town})"); r.ev(f"__dbg.ev('P.y = -{d}*M; camY = P.y; dist = {d}; cars = []; nextChaser = 99; P.x = 0; targetX = 0; spikeNext = 1e9; pinchNext = 1e9;')")
E = lambda r, s: r.ev("__dbg.ev(" + json.dumps(s) + ")")
with sync_playwright() as p:
    r = Run(p, file=WT); r.wait(2400)
    # bus pincer bounce
    got = 0
    for k in range(5):
        setup(r, 7, 1, 1500)
        E(r, "heatPts = 250; star = 3; spawnPincers();")
        out = E(r, "(() => { for (let i=0;i<600 && state==='play';i++){ targetX = 0; update(1/60); if (ko.pinch) break; } return {pinch: ko.pinch, hp: Math.round(P.hp), maxHp: P.maxHp, pins: cars.filter(c=>c.plan==='pin').map(c=>c.phase)}; })()")
        got += out['pinch'] >= 1
    check('bus bounces pincers', got >= 3, f'{got}/5 {out}')
    got2 = 0
    for k in range(5):
        setup(r, 0, 1, 1500)
        E(r, "heatPts = 250; star = 3; spawnPincers();")
        out2 = E(r, "(() => { const h0 = P.hp; for (let i=0;i<600 && state==='play';i++){ targetX = 0; update(1/60); } return {pinch: ko.pinch, dmg: Math.round(h0 - P.hp), slow: P.slowT}; })()")
        got2 += out2['pinch']
    print('  sports vs pincers (reference): pinch kos', got2)
    # ambulance heal
    setup(r, 6, 0, 300); out = E(r, "(() => { P.hp = P.maxHp/2; const h0 = P.hp; for (let i=0;i<300;i++){ update(1/60); P.y = Math.min(P.y, P.y); } return [Math.round(h0), Math.round(P.hp), P.maxHp]; })()")
    check('ambulance heals', out[1] > out[0], out)
    # fire truck vs explosion
    setup(r, 8, 0, 300); out = E(r, "(() => { const h0 = P.hp; explodeAt(P.x + 20, P.y - 20, 150, 560, true, 28); return [h0, P.hp]; })()")
    setup(r, 0, 0, 300); ref = E(r, "(() => { const h0 = P.hp; explodeAt(P.x + 20, P.y - 20, 150, 560, true, 28); return [h0, P.hp]; })()")
    check('fire truck ignores explosions', out[0] == out[1] and ref[1] < ref[0], (out, ref))
    # garbage truck swallows wrecks
    setup(r, 9, 0, 300); out = E(r, "(() => { for (let k=0;k<3;k++){ spawnTraffic(P.y - 60 - k*50, false); } for (const c of cars){ c.x = P.x; c.vy = 0; c.state = 'wreck'; } for (let i=0;i<120;i++){ targetX = 0; update(1/60); } return {gomi: gomiMoney, left: cars.filter(c=>c.collected).length}; })()")
    check('garbage truck collects wrecks', out['gomi'] > 0, out)
    # monster truck crushes small cars
    setup(r, 11, 0, 300); out = E(r, "(() => { const h0 = P.hp; spawnTraffic(P.y - 60, false); const c = cars[cars.length-1]; c.key = 'kei'; c.w = 16; c.h = 26; c.x = P.x; c.vy = -20; for (let i=0;i<60;i++){ targetX = P.x; update(1/60); } return {st: c.state, dmg: h0 - P.hp, traf: trafN}; })()")
    check('monster truck crushes', out['st'] == 'wreck' and out['dmg'] == 0, out)
    # rocket nitro lasts twice as long
    setup(r, 12, 0, 300); a = E(r, "(() => { boost = 100; tryBoost(); for (let i=0;i<60;i++) update(1/60); return boost; })()")
    setup(r, 0, 0, 300); b = E(r, "(() => { boost = 100; tryBoost(); for (let i=0;i<60;i++) update(1/60); return boost; })()")
    check('rocket drains half', abs((100 - a) * 2 - (100 - b)) < 3, (a, b))
    # secret police: half heat, no spikes while hidden, notice on ram
    setup(r, 13, 1, 1500); a = E(r, "(() => { heatPts = 150; star = 2; const h0 = heatPts; spikeNext = t + 0.1; for (let i=0;i<120;i++) update(1/60); return {dh: heatPts - h0, spikers: cars.filter(c=>c.plan==='spike').length}; })()")
    setup(r, 0, 1, 1500); b = E(r, "(() => { heatPts = 150; star = 2; const h0 = heatPts; spikeNext = t + 0.1; for (let i=0;i<120;i++) update(1/60); return {dh: heatPts - h0, spikers: cars.filter(c=>c.plan==='spike').length}; })()")
    check('secret police: half heat, no spike', abs(a['dh'] * 2 - b['dh']) < 0.5 and a['spikers'] == 0 and b['spikers'] == 1, (a, b))
    setup(r, 13, 1, 1500); c = E(r, "(() => { const pc = newPolice(P.x, P.y - 40); pc.vy = P.vy + 120; cars.push(pc); for (let i=0;i<60;i++){ targetX = pc.x; update(1/60); } return noticeT; })()")
    check('secret police noticed after ramming', c > 0, c)
    # tank ignores tackles
    for ci in (14, 0):
        setup(r, ci, 1, 1500)
        out = E(r, "(() => { const h0 = P.hp; const pc = newPolice(P.x + 40, P.y); pc.vy = P.vy; cars.push(pc); let tk = 0; for (let i=0;i<900 && state==='play';i++){ targetX = 0; update(1/60); if (pc.tk === 'tackle') tk++; if (pc.tkHit) break; } return {hit: !!pc.tkHit, dmg: Math.round((h0 - P.hp)*10)/10, src: dmgBy}; })()")
        print('  tackle on car', ci, out)
    print('ERR', r.errs[:3])
    r.close()
