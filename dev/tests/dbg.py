import os
import json, sys, os
from playwright.sync_api import sync_playwright
D = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
W = D + '/index.html'
OUT = D + '/dev/out'
os.makedirs(OUT, exist_ok=True)

class Run:
    def __init__(self, p, w=390, h=844, init=None, touch=False, fresh=True, file=None):
        self.b = p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--autoplay-policy=no-user-gesture-required'])
        self.ctx = self.b.new_context(viewport={'width': w, 'height': h}, has_touch=touch)
        if init: self.ctx.add_init_script(init)
        self.pg = self.ctx.new_page()
        self.errs = []; self.cons = []
        self.pg.on('pageerror', lambda e: self.errs.append(str(e)))
        self.pg.on('console', lambda m: (m.type in ('error', 'warning')) and ('fonts.g' not in m.text and 'ERR_' not in m.text and 'Failed to load resource' not in m.text) and self.cons.append(m.type + ': ' + m.text))
        self.pg.goto('file://' + (file or W))
        if fresh:
            self.pg.evaluate('localStorage.clear()'); self.pg.reload()
    def ev(self, js, arg=None):
        return self.pg.evaluate(js, arg) if arg is not None else self.pg.evaluate(js)
    def wait(self, ms): self.pg.wait_for_timeout(ms)
    def g(self): return self.ev('__butto.get()')
    def click(self, sel, force=False): self.pg.click(sel, force=force, timeout=3000)
    def vis(self, sel): return self.pg.is_visible(sel)
    def snd(self): return self.ev('RaceSound._state()')
    def close(self): self.b.close()

def check(name, ok, info=''):
    print(('PASS ' if ok else 'FAIL ') + name + ((' :: ' + str(info)) if info != '' else ''))
    return ok

WT = OUT + '/wt.html'
INJ = r"""window.__dbg = { ev: function(s){ return eval(s); },
  st: () => { let bad = []; for (const b of [P, ...cars]) for (const k of ['x','y','vx','vy','a','av']) if (!Number.isFinite(b[k])) bad.push((b.key||'?') + '.' + k + '=' + b[k]);
    for (const k of ['dist','t','heatPts','boost','camX','camY','takeMoney','trafMoney','nearMoney','bossMoney','gomiMoney']) if (!Number.isFinite(eval(k))) bad.push(k);
    if (!Number.isFinite(save.money)) bad.push('money'); if (!Number.isFinite(P.hp)) bad.push('hp');
    return {cars:cars.length, fx:fx.length, pops:pops.length, drums:drums.length, booms:booms.length, spikes:spikes.length, trail:trail.length, star, state, dist:Math.round(dist), t:Math.round(t), hp:Math.round(P.hp), bad, boss: boss ? Math.round(boss.boss.hp) : null, nextBoss, finalDown, bossN, chasers: cars.filter(c=>c.role==='chaser').length, wrecks: cars.filter(c=>c.state==='wreck').length, cross: cars.filter(c=>c.cross).length}; } };
"""
def make_test_copy(src=W):
    s = open(src, encoding='utf-8').read()
    k = s.index('function boot(data){')
    s = s[:k] + INJ + s[k:]
    open(WT, 'w', encoding='utf-8').write(s)
    return WT
