from playwright.sync_api import sync_playwright
import os
D=os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import sys
f = sys.argv[1] if len(sys.argv) > 1 else 'index.html'
with sync_playwright() as p:
    b=p.chromium.launch(executable_path='/usr/bin/google-chrome'); pg=b.new_page(viewport={'width':390,'height':844})
    pg.goto('file://'+D+'/'+f); pg.wait_for_timeout(2700)
    if pg.evaluate("!document.getElementById('tut').hidden"): pg.wait_for_timeout(500); pg.click('#tutSkip')
    pg.evaluate("(()=>{const s=__butto.save(); s.plays=99; s.tips={camp:true}; s.owned[14]=true; s.car=14; s.up[14]={eng:0,body:5,boost:0};})()")
    # A: sit 7 s, then one lane change (right), check it clears
    for k in range(3):
        pg.evaluate('__butto.start(1)'); pg.wait_for_timeout(7300)
        g1 = pg.evaluate('__butto.get()')
        pg.keyboard.down('ArrowRight'); pg.wait_for_timeout(200); pg.keyboard.up('ArrowRight'); pg.wait_for_timeout(1000)
        g2 = pg.evaluate('__butto.get()')
        print('A sit→1 lane:', 'x', g1['x'], '->', g2['x'], 'camping', g1['camping'], '->', g2['camping'])
    # B: weave between two lanes every 4 s for 30 s: count how often camping is on
    pg.evaluate('__butto.start(1)'); on = 0; n = 0
    for i in range(30):
        if i % 4 == 0:
            key = 'ArrowRight' if (i // 4) % 2 == 0 else 'ArrowLeft'
            pg.keyboard.down(key); pg.wait_for_timeout(200); pg.keyboard.up(key)
        pg.wait_for_timeout(800); g = pg.evaluate('__butto.get()'); n += 1; on += 1 if g['camping'] else 0
        if g['state'] != 'play': break
    print('B weaving every 4 s: camping on', on, 'of', n, 'checks')
    b.close()
