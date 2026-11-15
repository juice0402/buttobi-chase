import os
from playwright.sync_api import sync_playwright
D=os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
errs=[]
with sync_playwright() as p:
    b=p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--autoplay-policy=no-user-gesture-required'])
    for vp in [{'width':390,'height':844},{'width':1180,'height':820}]:
        pg=b.new_page(viewport=vp)
        pg.on('pageerror', lambda e: errs.append('PAGE '+str(e)))
        pg.on('console', lambda m: errs.append('CON '+m.text) if m.type in ('error','warning') and 'fonts.g' not in m.text and 'ERR_TUNNEL' not in m.text else None)
        pg.goto('file://'+D+'/index.html'); pg.mouse.click(200,400); pg.wait_for_timeout(2600)
        st = pg.evaluate("RaceSound._state ? JSON.stringify(RaceSound._state()) : 'nostate'")
        print('sound state', st[:200])
        for town in range(4):
            pg.evaluate(f"(()=>{{const s=__butto.save(); s.towns.forEach(t=>t.clear=true); s.owned[7]=true; s.car=7; s.up[7]={{eng:4,body:4,boost:2}};}})()")
            pg.evaluate(f'__butto.start({town})'); r=pg.evaluate('__butto.sim(120)')
        pg.evaluate('__butto.start(1)'); pg.wait_for_timeout(500); pg.evaluate('__butto.pause()'); pg.wait_for_timeout(300)
        pg.click('#pBgm'); pg.click('#pBgm'); pg.click('#pSe'); pg.click('#pSe'); pg.click('#resume'); pg.wait_for_timeout(1500)
        pg.evaluate('__butto.pause()'); pg.click('#quit'); pg.wait_for_timeout(500)
        print('after quit', pg.evaluate('__butto.get()')['state'], pg.evaluate("JSON.stringify(RaceSound._state())")[:160])
        pg.click('[data-tab="mis"]'); pg.click('#openSet'); pg.click('#swBgm'); pg.click('#swBgm'); pg.click('#closeSet'); pg.click('#go'); pg.wait_for_timeout(2000)
        print('run again', pg.evaluate('__butto.get()')['state'])
        pg.close()
    b.close()
print('ERRORS', len(errs)); [print(e[:200]) for e in errs[:10]]
