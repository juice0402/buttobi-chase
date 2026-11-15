import os
import sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from dbg import *
make_test_copy()
CLOCK = r"""(() => { const RD = Date; let off = 0; window.__setNow = ms => { off = ms - RD.now(); };
  class FD extends RD { constructor(...a){ if (a.length) super(...a); else super(RD.now() + off); } static now(){ return RD.now() + off; } }
  window.Date = FD; })();"""
def daylist(r): return r.ev("__dbg.ev('todayMis().map(m=>m.id)')")
def finish(r):  # end the current run as a clear right now
    r.ev("__dbg.ev('dist = GOAL; P.y = -GOAL*M - 5; update(1/60); for (let i=0;i<200 && state===\"ending\";i++) update(1/60);')")
with sync_playwright() as p:
    r = Run(p, file=WT, init=CLOCK); r.wait(2400)
    # find a day whose list contains 'clear'
    import datetime
    base = datetime.datetime(2026, 11, 15, 23, 59, 30)
    day = None
    for k in range(60):
        dt = base + datetime.timedelta(days=k)
        r.ev(f"__setNow(new Date({dt.year},{dt.month-1},{dt.day},23,59,30).getTime())")
        lst = daylist(r)
        nxt = dt + datetime.timedelta(days=1)
        r.ev(f"__setNow(new Date({nxt.year},{nxt.month-1},{nxt.day},0,0,30).getTime())")
        lst2 = daylist(r)
        if 'clear' in lst and 'clear' not in lst2 and 'dist3k' not in lst2 and 'score5k' not in lst2: day = dt; break
    print('day', day, lst, lst2)
    r.ev(f"__setNow(new Date({day.year},{day.month-1},{day.day},12,0,0).getTime())")
    r.ev("(()=>{const s=__butto.save(); s.towns.forEach(t=>t.clear=true); s.owned[14]=true; s.car=14; s.up[14]={eng:5,body:5,boost:3}; s.plays=99;})()")
    r.ev('__butto.start(0)'); m0 = r.ev('__butto.save().money'); finish(r)
    g1 = r.ev("[...document.querySelectorAll('#rGain li')].map(l=>l.textContent)")
    check('daily clear paid', any('今日' in x and 'にげきる' in x for x in g1), g1)
    r.ev('__butto.start(0)'); finish(r)
    g2 = r.ev("[...document.querySelectorAll('#rGain li')].map(l=>l.textContent)")
    check('daily not paid twice same day', not any('今日' in x for x in g2), g2)
    # midnight rollover via garage
    nxt = day + datetime.timedelta(days=1)
    r.ev(f"__setNow(new Date({nxt.year},{nxt.month-1},{nxt.day},0,0,5).getTime())")
    r.ev('__butto.garage()'); r.wait(500); r.click('[data-tab=mis]')
    txt = r.ev("document.getElementById('gPanel').textContent")
    check('garage shows new day list', r.ev("__butto.save().daily.day") == f"{nxt.year}-{nxt.month:02d}-{nxt.day:02d}", r.ev("__butto.save().daily"))
    # run across midnight: start 23:59:50 on `day`, achieve 'clear' mission (in day list, not in next) right before midnight, finish after
    r.ev(f"__setNow(new Date({day.year},{day.month-1},{day.day},23,59,50).getTime())")
    r.ev("(()=>{const s=__butto.save(); s.daily={day:'', done:{}};})()")
    r.ev('__butto.start(0)')
    r.ev("__dbg.ev('dist = GOAL - 1; P.y = -(GOAL-1)*M; endKind = null;')")
    # fake mid-run achievement: mark run as clear-able → use near: pick a mission in day list that we can satisfy with a counter
    lst = daylist(r); print('  list at start', lst)
    setters = {'near20':'nearN=25','take15':'takeN=20','combo3':'maxCombo=6','traf30':'trafN=40','nitro5':'ko.nitro=6','wall4':'ko.wall=5','boom4':'ko.boom=5','score5k':'takeMoney=6000','dist3k':'','spike2':'ko.spike=3','maki6':'ko.maki=7','wrong6':'nearOppN=7','star5':'maxStar=5','train2':'ko.train=3','boss1':'bossN=1'}
    sid = [m for m in lst if m in setters and setters[m]][0]
    r.ev("__dbg.ev('dist = 100; P.y = -1000; " + setters[sid] + "; misCheckT = 0; update(1/60);')")
    toasted = r.ev("document.getElementById('toast').textContent")
    print('  toast before midnight:', toasted)
    r.ev(f"__setNow(new Date({nxt.year},{nxt.month-1},{nxt.day},0,0,20).getTime())")
    r.ev("__dbg.ev('misCheckT = 0; update(1/60);')")
    m0 = r.ev('__butto.save().money')
    r.ev("__dbg.ev('P.hp = 0; playerWreck(); for (let i=0;i<200 && state===\"ending\";i++) update(1/60);')")
    g3 = r.ev("[...document.querySelectorAll('#rGain li')].map(l=>l.textContent)")
    check('mission toasted before midnight is paid', any('今日' in x for x in g3), (sid, g3))
    # stars / gold / rank S
    r.ev("(()=>{const s=__butto.save(); s.towns[0]={clear:false, rank:'', best:0, mis:[false,false,false]}; s.gold[14]=false; s.carRank[14]='';})()")
    r.ev('__butto.start(0)'); r.ev("__dbg.ev('takeMoney = 20000; nearN = 16; ko.train = 1; bossN = 1;')"); finish(r)
    sv = r.ev('__butto.save()')
    check('3 stars + S + gold', sv['towns'][0]['clear'] and sv['towns'][0]['rank'] == 'S' and all(sv['towns'][0]['mis']) and sv['gold'][14] and sv['carRank'][14] == 'S', (sv['towns'][0], sv['gold'][14]))
    print('  gains', r.ev("[...document.querySelectorAll('#rGain li')].map(l=>l.textContent)"))
    # titles: earn ram + boss in one run (fresh titles) -> both collected, dream cars unlock
    r.ev("(()=>{const s=__butto.save(); s.titles={}; s.owned[13]=false; s.owned[14]=true; s.money=0;})()")
    r.ev('__butto.start(0)'); r.ev("__dbg.ev('ko.hit = 25; bossN = 3; nearN = 31; trafN = 70;')"); finish(r)
    sv = r.ev('__butto.save()'); print('  titles', sorted(k for k,v in sv['titles'].items() if v))
    check('all satisfied titles collected', all(sv['titles'].get(k) for k in ['ram','boss','near','town','run']), sv['titles'])
    r.ev('__butto.garage()'); r.wait(500); r.click('.tile[data-i="13"]')
    act = r.ev("document.querySelector('#hero [data-act]').dataset.act")
    check('secret police car unlocked by title', act in ('buy', 'short'), act)
    # mission toast during run
    r.ev("(()=>{const s=__butto.save(); s.towns[1].mis=[false,false,false];})()")
    r.ev('__butto.start(1)'); r.ev("__dbg.ev('trafN = 21; misCheckT = 0; misT = 0; update(1/60); update(1/60);')")
    check('mission toast in run', 'ミッション達成' in r.ev("document.getElementById('toast').textContent"), r.ev("document.getElementById('toast').textContent"))
    print('ERR', r.errs[:5], r.cons[:3])
    r.close()
