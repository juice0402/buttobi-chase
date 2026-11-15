import os
from playwright.sync_api import sync_playwright
D=os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
old = {"money":23456,"best":4100,"car":2,"owned":[True,True,True]+[False]*12,"up":[{"eng":2,"body":1,"boost":0},{"eng":0,"body":0,"boost":0},{"eng":1,"body":1,"boost":1}]+[{"eng":0,"body":0,"boost":0}]*12,"carBest":[14000,5000,9000]+[0]*12,"clears":2,"hiScore":14000,"titles":{"town":True,"run":True},"plays":12,"tips":{"boss":True}}
with sync_playwright() as p:
    b=p.chromium.launch(executable_path='/usr/bin/google-chrome'); ctx=b.new_context(viewport={'width':390,'height':844})
    pg=ctx.new_page(); errs=[]; pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto('file://'+D+'/index.html')
    import json
    pg.evaluate("s => localStorage.setItem('butto-chase-v1', s)", json.dumps(old))
    pg.reload(); pg.wait_for_timeout(2700)
    print(pg.evaluate("(()=>{const s=__butto.save(); return {money:s.money, car:s.car, town0:s.towns[0], gold:s.gold.slice(0,3), rank:s.carRank.slice(0,3), daily:s.daily.day, se:s.se}})()"))
    print(pg.evaluate("__butto.get()"))
    print('errs', errs)
    b.close()
