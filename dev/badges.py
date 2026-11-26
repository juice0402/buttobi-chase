"""Game Center の実績のバッジを描く（dev/badges.js・ゲームと同じコードの絵）。

  python3 dev/badges.py            docs/kobo/gamecenter.json の実績を全部 docs/kobo/achievements/<id>.png（1024×1024・RGB）に描く
  python3 dev/badges.py --sheet F  ついでに、全部を並べた見本を F に（しょーくんに見せる用）
  python3 dev/badges.py --only a,b ためしに一部だけ（--sheet と使う。docs には書かない）

先に node tools/build.mjs（出口の index.html を開いて描く）。/usr/bin/google-chrome を使う。
"""
import asyncio, base64, io, json, pathlib, sys
from PIL import Image
from playwright.async_api import async_playwright

ROOT = pathlib.Path(__file__).resolve().parent.parent
GC = ROOT / 'docs/kobo/gamecenter.json'
OUT = ROOT / 'docs/kobo/achievements'


def arg(name):
    return sys.argv[sys.argv.index(name) + 1] if name in sys.argv else None


async def main():
    only = arg('--only')
    if only:
        items = []   # a,b or a:10,b:50 (the points pick the medal's rim)
        for i in only.split(','):
            k, _, pts = i.partition(':')
            items.append((k if k.startswith('race_') else 'race_' + k, int(pts or 25)))
    else:
        items = [(a['id'], a['points']) for a in json.loads(GC.read_text(encoding='utf-8'))['achievements']]
    pics = []
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path='/usr/bin/google-chrome')
        ctx = await b.new_context(viewport={'width': 400, 'height': 800})
        await ctx.add_init_script('window.__NOFX = true;')
        await ctx.route('**/fonts.g*/**', lambda r: r.abort())
        pg = await ctx.new_page()
        errs = []
        pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto((ROOT / 'index.html').as_uri())
        await pg.wait_for_timeout(300)
        await pg.add_script_tag(path=str(ROOT / 'dev/badges.js'))
        for aid, pts in items:
            url = await pg.evaluate('([i, p]) => window.__badge(i, p)', [aid, pts])
            im = Image.open(io.BytesIO(base64.b64decode(url.split(',', 1)[1]))).convert('RGB')
            pics.append((aid, im))
            if not only:
                OUT.mkdir(parents=True, exist_ok=True)
                im.save(OUT / f'{aid}.png', optimize=True)
        await b.close()
    if errs:
        sys.exit('page errors: ' + '; '.join(errs[:3]))
    sheet = arg('--sheet')
    if sheet:
        n, s, cols = len(pics), 240, 5
        rows = (n + cols - 1) // cols
        out = Image.new('RGB', (cols * (s + 12), rows * (s + 12)), '#ffffff')
        for k, (aid, im) in enumerate(pics):
            out.paste(im.resize((s, s), Image.LANCZOS), ((k % cols) * (s + 12), (k // cols) * (s + 12)))
        out.save(sheet)
    print(len(pics), 'badges', '' if only else f'-> {OUT.relative_to(ROOT)}')


asyncio.run(main())
