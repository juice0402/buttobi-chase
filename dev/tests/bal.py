# balance harness: python3 bal.py <file.html> <mode: ship|lazy|line> <N> [scenario-set: t2|lazy] [filter]
# ship = the shipped dodge autopilot (__butto.sim); lazy = hugs the middle, dodges only what is right ahead, taps nitro whenever full;
# line = drives x=0 with no dodging at all, taps nitro whenever full.
import sys, json, statistics as stt, os
from playwright.sync_api import sync_playwright
D = os.path.dirname(os.path.abspath(__file__))
SRC, MODE, N = sys.argv[1], sys.argv[2], int(sys.argv[3])
SET = sys.argv[4] if len(sys.argv) > 4 else 't2'
FLT = sys.argv[5] if len(sys.argv) > 5 else ''
T2 = [('t0 sports lv0', 0, 0, 0, 0, 0), ('t0 muscle 2/2/1', 0, 1, 2, 2, 1),
      ('t1 pickup 3/3/1', 1, 2, 3, 3, 1), ('t1 cash 3/3/2', 1, 5, 3, 3, 2),
      ('t2 bus 4/4/2', 2, 7, 4, 4, 2), ('t2 super 5/5/3', 2, 10, 5, 5, 3),
      ('t3 monster 5/5/3', 3, 11, 5, 5, 3), ('t3 tank 5/5/3', 3, 14, 5, 5, 3)]
LZ = [('t0 sports lv0', 0, 0, 0, 0, 0), ('t0 sports 5/5/3', 0, 0, 5, 5, 3), ('t1 sports 5/5/3', 1, 0, 5, 5, 3),
      ('t2 sports 5/5/3', 2, 0, 5, 5, 3), ('t3 sports 5/5/3', 3, 0, 5, 5, 3), ('t1 cash 3/3/2', 1, 5, 3, 3, 2),
      ('t2 super 5/5/3', 2, 10, 5, 5, 3), ('t3 tank 5/5/3', 3, 14, 5, 5, 3)]
SC = [x for x in (T2 if SET == 't2' else LZ) if any(x[0].startswith(f) for f in FLT.split(','))]
INJ = r"""window.__dbg = { ev: function(s){ return eval(s); } };
"""
s = open(os.path.join(D, SRC), encoding='utf-8').read()
k = s.index('function boot(data){'); s = s[:k] + INJ + s[k:]
TMP = os.path.join(D, '_bal_' + os.path.basename(SRC)); open(TMP, 'w', encoding='utf-8').write(s)
LAZY = r"""(function(sec, line){
  const dt = 1/60, stopAt = t + sec;
  while ((state === 'play' || state === 'ending') && t < stopAt){
    if (state === 'play'){
      if (line){ if (typeof works === 'undefined' || !closedAt(0, P.y, P.w, 30)) targetX = 0; }
      else {
        const half = halfAt(dist), lim = half - P.w/2 - 2; let best = P.x, bs = -1e9;
        for (let x = -lim; x <= lim; x += 8){
          let free = 420;
          for (const c of cars){ const ahead = P.y - c.y; if (ahead < -10 || ahead > 420) continue; if (c.role === 'chaser' && c.state === 'drive' && !c.boss) continue;
            if (Math.abs(c.x - x) < (c.w + P.w)/2 + 6) free = Math.min(free, ahead - (c.opp ? 120 : 0)); }
          if (typeof works !== 'undefined') for (const w of works){ const ahead = P.y - w.y1; if (ahead < -(w.y1 - w.y0) || ahead > 420) continue; if (x + P.w/2 + 4 > w.x0 && x - P.w/2 - 4 < w.x1) free = Math.min(free, Math.max(0, ahead)); }
          const sc = Math.min(free, 170) - Math.abs(x) * 0.6 - Math.abs(x - P.x) * 0.1;
          if (sc > bs){ bs = sc; best = x; }
        }
        targetX = best;
      }
      if (boost >= 100) tryBoost();
    }
    update(dt);
  }
  return 1;
})"""
def stats():
    return """({end:endKind || state, dist:Math.round(dist), score:runScore(), take:Math.round(takeMoney), traf:Math.round(trafMoney), near:Math.round(nearMoney), bossM:Math.round(bossMoney),
      boss:bossN, time:Math.round(t), ko:Object.assign({}, ko), nitros:(window.__nit||0), dmg:Object.fromEntries(Object.entries(dmgBy).map(([k, v]) => [k, Math.round(v)]))})"""
errs = []
with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/usr/bin/google-chrome')
    pg = b.new_page(viewport={'width': 390, 'height': 844})
    pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto('file://' + TMP); pg.wait_for_timeout(2500)
    pg.evaluate('__dbg.ev(%s)' % json.dumps("(function(){ const _tb = tryBoost; tryBoost = function(){ const was = boosting; _tb(); if (!was && boosting) window.__nit = (window.__nit || 0) + 1; }; return 1; })()"))
    out = {}
    for name, town, ci, e, bd, bo in SC:
        rs = []
        for kk in range(N):
            pg.evaluate(f"""(()=>{{const s=__butto.save(); s.towns.forEach(t=>t.clear=true); s.owned[{ci}]=true; s.car={ci}; s.up[{ci}]={{eng:{e},body:{bd},boost:{bo}}}; s.plays=99; s.tips={{}}; s.tutDone=true;}})()""")
            pg.evaluate(f'__butto.start({town})'); pg.evaluate('window.__nit = 0')
            if MODE == 'ship': pg.evaluate('__butto.sim(700)')
            else: pg.evaluate('__dbg.ev(%s)' % json.dumps(LAZY + '(700, %s)' % ('true' if MODE == 'line' else 'false')))
            rs.append(pg.evaluate('__dbg.ev(%s)' % json.dumps(stats())))
        clr = sum(r['end'] == 'clear' for r in rs)
        sc = [r['score'] for r in rs]
        mean = lambda kf: round(sum(kf(r) for r in rs) / len(rs))
        kos = {}
        for r in rs:
            for kk, v in r['ko'].items(): kos[kk] = kos.get(kk, 0) + v
        kos = {kk: round(v / len(rs), 1) for kk, v in kos.items() if v}
        dm = {}
        for r in rs:
            for kk, v in r['dmg'].items(): dm[kk] = dm.get(kk, 0) + v
        dm = {kk: round(v / len(rs)) for kk, v in sorted(dm.items(), key=lambda x: -x[1])[:7]}
        print(f"{name:17s} clear {clr}/{N} med {int(stt.median(sc)):6d} [{min(sc)}-{max(sc)}] dist {int(stt.median([r['dist'] for r in rs]))} t {int(stt.median([r['time'] for r in rs]))}s | take {mean(lambda r: r['take'])} traf {mean(lambda r: r['traf'])} near {mean(lambda r: r['near'])} boss {mean(lambda r: r['bossM'])} | ko {kos} | nitros {mean(lambda r: r['nitros'])} dmg {dm}", flush=True)
        out[name] = {'clear': clr, 'med': stt.median(sc), 'scores': sc}
    b.close()
json.dump(out, open(os.path.join(D, f'bal_{os.path.basename(SRC)}_{MODE}_{SET}.json'), 'w'))
print('ERR', len(errs), errs[:3])
