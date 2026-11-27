"""Game Center の点検（11/26）：gamecenter.json と、ゲームが送る実績の id・バッジの絵がそろっているか。
python3 dev/tests/gc_check.py（先に node tools/build.mjs）"""
import asyncio, json, pathlib, sys
from PIL import Image
from playwright.async_api import async_playwright
ROOT = pathlib.Path(__file__).resolve().parents[2]
GC = json.loads((ROOT / 'docs/kobo/gamecenter.json').read_text(encoding='utf-8'))
IDS = [a['id'] for a in GC['achievements']]
bad = []
def check(ok, msg):
    print(('PASS ' if ok else 'FAIL ') + msg)
    if not ok: bad.append(msg)
check(len(IDS) == len(set(IDS)) and sum(a['points'] for a in GC['achievements']) <= 1000, f"{len(IDS)} ids, {sum(a['points'] for a in GC['achievements'])} points")
for a in GC['achievements']:
    p = ROOT / 'docs/kobo' / a['image']
    ok = p.exists() and Image.open(p).size == (1024, 1024) and Image.open(p).mode == 'RGB'
    if not ok: check(False, 'badge ' + a['image'])
    for L in ('ja', 'en-US'):
        if not all(a.get(L, {}).get(k) for k in ('name', 'before', 'after')): check(False, f"text {a['id']} {L}")
check(not bad, 'badges 1024 RGB and ja/en-US text')
STUB = "window.APP_PLATFORM='ios';window.APP_GAMECENTER=false;window.__ach=[];window.__score=[];window.APP_ACHIEVE=function(i){__ach.push(i)};window.APP_SCORE=function(n){__score.push(n)};"
FULL = """(() => { const s = JSON.parse(localStorage.getItem('butto-chase-v1') || '{}'); return s; })()"""
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path='/usr/bin/google-chrome')
        ctx = await b.new_context(viewport={'width': 440, 'height': 956})
        await ctx.add_init_script(STUB)
        await ctx.route('**/fonts.g*/**', lambda r: r.abort())
        pg = await ctx.new_page(); errs = []
        pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto((ROOT / 'index.html').as_uri()); await pg.wait_for_timeout(400)
        check(await pg.evaluate('__ach.length') == 0, 'a new save sends nothing')
        # a save with everything done: every car, every title, every town cleared with S and all missions
        await pg.evaluate("""() => { const t = {}; for (const k of ['legend','clean','boss','town','train','boom','wall','near','wrong','spike','pinch','maki','ram','nitro','drum','combo','run','rookie']) t[k] = true;
          localStorage.setItem('butto-chase-v1', JSON.stringify({money:1, best:1, car:0, owned:Array(15).fill(true), pts:[7].concat(Array(14).fill(0)), up:[{eng:5, body:2, boost:0, ram:0}].concat(Array(14).fill({eng:0, body:0, boost:0, ram:0})), upV:2, carV:2, clears:4, hiScore:12345, plays:9, titles:t, tutDone:true,
            towns:[0,1,2,3].map(() => ({clear:true, rank:'S', best:99999, mis:[true,true,true]})), gold:[true].concat(Array(14).fill(false))})); }""")
        await pg.reload(); await pg.wait_for_timeout(400)
        sent = await pg.evaluate('__ach')
        check(sorted(sent) == sorted(IDS), f"a full save sends every id on open ({len(sent)}/{len(IDS)}) missing {sorted(set(IDS) - set(sent))} extra {sorted(set(sent) - set(IDS))}")
        await pg.evaluate("__ach.length = 0; window.APP_GAMECENTER = true; window.dispatchEvent(new Event('app-gamecenter'))")
        check(len(await pg.evaluate('__ach')) == len(IDS) and await pg.evaluate('__score') == [12345], 'signing in sends them all again and the best score')
        await pg.evaluate("__ach.length = 0; location.hash = 'shot=result:1:0:14'"); await pg.wait_for_timeout(300)
        check(await pg.evaluate('__ach.length') == 0, 'screenshot scenes send nothing')
        # a real run on a new save (web hook __butto, so no APP_PLATFORM here): the first one goes out when the run ends
        c2 = await b.new_context(viewport={'width': 440, 'height': 956})
        await c2.add_init_script("window.__ach=[];window.APP_ACHIEVE=function(i){__ach.push(i)};")
        await c2.route('**/fonts.g*/**', lambda r: r.abort())
        p2 = await c2.new_page(); p2.on('pageerror', lambda e: errs.append(str(e)))
        await p2.goto((ROOT / 'index.html').as_uri()); await p2.wait_for_timeout(400)
        await p2.evaluate("__butto.start(0); __butto.sim(900)"); await p2.wait_for_timeout(300)
        got = await p2.evaluate('__ach')
        check('race_first_run' in got and len(got) == len(set(got)), f'a run on a new save sends race_first_run once ({got})')
        check(not errs, 'no page errors ' + '; '.join(errs[:2]))
        await b.close()
asyncio.run(main())
sys.exit(1 if bad else 0)
