import os
import sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from dbg import *
VW = int(sys.argv[1]) if len(sys.argv) > 1 else 390
VH = int(sys.argv[2]) if len(sys.argv) > 2 else 844
with sync_playwright() as p:
    r = Run(p, VW, VH)
    r.wait(300); check('title shown', r.g()['state'] == 'title', r.g())
    r.wait(2200); g = r.g(); check('first launch shows how-to cards', g['state'] == 'tut', g)
    r.wait(500); r.click('#tutNext'); r.click('#tutNext'); r.click('#tutNext'); r.wait(300)
    g = r.g(); check('cards → run starts', g['state'] == 'play', g)
    res = r.ev('__butto.sim(700)'); g = r.g()
    check('run ends in result', g['state'] == 'result', (res['end'], res['dist'], g['state']))
    check('result visible', r.vis('#result'))
    r.wait(900)
    r.click('#toGarage'); r.wait(500)
    check('garage after result', r.g()['state'] == 'garage' and r.vis('#garage'))
    sv = r.ev('__butto.save()'); print('  money after run', sv['money'], 'plays', sv['plays'])
    # give money, buy car 1 by tapping tile then buy
    r.ev('__butto.save().money = 5000'); r.click('[data-tab=up]'); r.click('[data-tab=car]')
    r.click('.tile[data-i="1"]'); r.wait(100)
    btn = r.ev("document.querySelector('#hero [data-act]').dataset.act")
    check('hero shows buy for car1', btn == 'buy', btn)
    # double tap buy
    r.ev("(()=>{const b=document.querySelector('#hero [data-act=buy]'); b.click(); b.click();})()")
    sv = r.ev('__butto.save()')
    check('double buy charges once', sv['money'] == 4000 and sv['owned'][1] and sv['car'] == 1, (sv['money'], sv['car']))
    r.ev("(()=>{const b=document.querySelector('#hero [data-act]'); if (b) b.click();})()")  # tap on のってる
    check('tapping のってる is harmless', r.ev('__butto.save().money') == 4000)
    # upgrade
    r.click('[data-tab=up]'); r.wait(100)
    m0 = r.ev('__butto.save().money')
    # tuning (11/17): buy a point (the button re-renders, so a double tap buys one), spread it, the cap, free re-spread
    r.ev("(()=>{const b=document.querySelector('[data-act=pt-buy]'); b.click(); b.click();})()")
    sv = r.ev('__butto.save()')
    check('double tap on the point button buys one point', sv['pts'][1] == 1 and m0 - sv['money'] == 500, (sv['pts'][1], m0 - sv['money']))
    r.ev("(()=>{const b=document.querySelector('[data-act=st-add][data-k=eng]'); b.click(); const c=document.querySelector('[data-act=st-add][data-k=eng]'); if (c) c.click();})()")
    sv = r.ev('__butto.save()')
    check('a point goes into one stat, and no further without a free point', sv['up'][1]['eng'] == 1 and r.ev("document.querySelector('[data-act=st-add][data-k=body]').disabled"), sv['up'][1])
    r.ev("(()=>{const s=__butto.save(); s.money=99999; for(let i=0;i<12;i++){ const b=document.querySelector('[data-act=pt-buy]'); if (b && !b.disabled) b.click(); } })()")
    sv = r.ev('__butto.save()')
    check('points stop at 7 (one stat full + 2)', sv['pts'][1] == 7 and r.ev("!document.querySelector('[data-act=pt-buy]')"), sv['pts'][1])
    r.ev("(()=>{for(let i=0;i<9;i++){ const b=document.querySelector('[data-act=st-add][data-k=body]'); if (b && !b.disabled) b.click(); } })()")
    sv = r.ev('__butto.save()')
    check('a stat stops at 5 and the spread never passes the points', sv['up'][1]['body'] == 5 and sum(sv['up'][1].values()) == 6, sv['up'][1])
    r.click('[data-act=respec]'); r.wait(50)
    sv = r.ev('__butto.save()')
    check('ふりなおし returns every point for free', sum(sv['up'][1].values()) == 0 and sv['pts'][1] == 7 and sv['money'] == r.ev('__butto.save().money'), sv['up'][1])
    r.ev('__butto.save().money = 4000')
    # locked town
    r.ev('__butto.save().town = 0'); r.click('#townNext'); r.wait(100)
    st = r.ev('__butto.save().town'); check('town next goes to 1', st == 1, st)
    r.click('#go'); r.wait(150)
    check('locked town refused', r.g()['state'] == 'garage', r.g())
    r.click('#townPrev'); r.click('#go'); r.wait(150)
    g = r.g(); check('start town 0', g['state'] == 'play' and g['townI'] == 0, g)
    # clear town 0 with a strong car: set hp huge
    r.ev("(()=>{})()")
    r.ev('__butto.pause()'); check('pause', r.g()['state'] == 'pause' and r.vis('#pauseOv'))
    r.click('#resume'); check('resume', r.g()['state'] == 'play' and not r.vis('#pauseOv'))
    r.ev('__butto.sim(20)'); r.ev('__butto.pause()')
    m0 = r.ev('__butto.save().money'); coins = r.g()['coins']; d0 = r.g()['dist']
    r.click('#retry'); g = r.g()
    check('retry restarts same town', g['state'] == 'play' and g['townI'] == 0 and g['dist'] < 5, g)
    check('retry keeps coins', r.ev('__butto.save().money') >= m0 + coins, (m0, coins, r.ev('__butto.save().money')))
    r.ev('__butto.sim(20)'); r.ev('__butto.pause()')
    m0 = r.ev('__butto.save().money'); coins = r.g()['coins']
    r.click('#quit'); r.wait(500)
    check('quit to garage', r.g()['state'] == 'garage' and r.vis('#garage') and not r.vis('#pauseOv'))
    check('quit keeps coins', r.ev('__butto.save().money') >= m0 + coins, (m0, coins))
    # clear town 0: give car 14 maxed
    r.ev("(()=>{const s=__butto.save(); s.owned[14]=true; s.car=14; s.up[14]={eng:5,body:5,boost:3}; s.town=0;})()")
    ok = False
    for k in range(6):
        r.ev('__butto.start(0)'); res = r.ev('__butto.sim(700)')
        if res['end'] == 'clear': ok = True; break
    check('cleared town 0', ok, res['end'])
    r.wait(900)
    sv = r.ev('__butto.save()'); check('town 0 clear recorded', sv['towns'][0]['clear'])
    gains = r.ev("[...document.querySelectorAll('#rGain li')].map(l=>l.textContent)"); print('  gains', gains)
    # again: should stay on town 0
    r.click('#again'); g = r.g(); check('again restarts same town (0)', g['state'] == 'play' and g['townI'] == 0, g)
    r.ev('__butto.pause()'); r.click('#quit'); r.wait(500)
    check('garage pre-selects next town', r.ev('__butto.save().town') == 1, r.ev('__butto.save().town'))
    # settings
    r.click('#openSet'); r.click('#swSe'); r.click('#swBgm'); r.click('#closeSet')
    r.pg.reload(); r.wait(400)
    sv = r.ev('__butto.save()'); check('settings persist', sv['se'] is False and sv['bgm'] is False, (sv['se'], sv['bgm']))
    s = r.snd(); check('sound engine got settings', s['se'] is False and s['bgm'] is False, s)
    r.wait(2200)
    # wipe
    r.ev('__butto.garage()'); r.wait(500); r.click('#openSet'); r.click('#wipe'); r.click('#wipeYes'); r.wait(100)
    sv = r.ev('__butto.save()')
    check('wipe resets', sv['money'] == 0 and sv['owned'].count(True) == 1 and not sv['towns'][0]['clear'] and sv['town'] == 0 and sv['plays'] == 0, (sv['money'], sv['town']))
    check('wipe keeps sound', sv['se'] is False and sv['bgm'] is False)
    r.pg.reload(); r.wait(300)
    sv = r.ev('__butto.save()'); check('wipe survives reload', sv['money'] == 0 and sv['se'] is False)
    # reload in every state
    for stname, js in [('play', '__butto.start(0)'), ('pause', '__butto.start(0); __butto.pause()'), ('ending', None), ('result', None), ('garage', '__butto.garage()')]:
        r.pg.reload(); r.wait(2400)
        if js: r.ev(js)
        elif stname == 'result': r.ev('__butto.start(0)'); r.ev('__butto.sim(700)')
        elif stname == 'ending':
            r.ev('__butto.start(0)'); r.ev("(()=>{__butto.sim(3)})()")
        r.pg.reload(); r.wait(2400); g = r.g()
        check('reload from ' + stname, g['state'] in ('play', 'title'), g['state'])
    print('ERR', r.errs[:5], 'CONSOLE', r.cons[:5])
    r.close()
