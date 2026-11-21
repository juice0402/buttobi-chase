  /* ---- continuous loops: engine + siren (nodes created once) ---- */
  function makeEngine(g) {
    var c = g.ctx, E = { on: false, last: -1, sp: -1, bo: false }, t = c.currentTime;
    E.out = c.createGain(); E.out.gain.value = 0; E.out.connect(g.loopVol);
    E.lp = c.createBiquadFilter(); E.lp.type = 'lowpass'; E.lp.frequency.value = 400; E.lp.Q.value = 1.8; E.lp.connect(E.out);
    E.am = c.createGain(); E.am.gain.value = 0.65; E.am.connect(E.lp);
    E.o1 = c.createOscillator(); E.o1.type = 'sawtooth'; E.o1.frequency.value = 50; E.o1.connect(E.am);
    var sg = c.createGain(); sg.gain.value = 0.6; sg.connect(E.am);
    E.o2 = c.createOscillator(); E.o2.type = 'square'; E.o2.frequency.value = 25; E.o2.detune.value = 8; E.o2.connect(sg);
    E.lfo = c.createOscillator(); E.lfo.frequency.value = 25;
    var lg = c.createGain(); lg.gain.value = 0.35; E.lfo.connect(lg); lg.connect(E.am.gain);
    E.nf = c.createBiquadFilter(); E.nf.type = 'bandpass'; E.nf.frequency.value = 500; E.nf.Q.value = 0.9;
    E.ng = c.createGain(); E.ng.gain.value = 0; E.nf.connect(E.ng); E.ng.connect(E.out);
    E.nz = c.createBufferSource(); E.nz.buffer = g.noise; E.nz.loop = true; E.nz.connect(E.nf);
    // wind (21回目): an airy rush that rises while you keep full speed (flow) and roars with nitro, swaying slowly so it breathes
    E.wf = c.createBiquadFilter(); E.wf.type = 'bandpass'; E.wf.frequency.value = 1200; E.wf.Q.value = 0.7;
    E.wg = c.createGain(); E.wg.gain.value = 0; E.wf.connect(E.wg); E.wg.connect(E.out);
    E.wz = c.createBufferSource(); E.wz.buffer = g.noise; E.wz.loop = true; E.wz.connect(E.wf);
    E.wl = c.createOscillator(); E.wl.frequency.value = 0.4; var wlg = c.createGain(); wlg.gain.value = 380; E.wl.connect(wlg); wlg.connect(E.wf.frequency);
    E.o1.start(t); E.o2.start(t); E.lfo.start(t); E.nz.start(t); E.wz.start(t, 0.43); E.wl.start(t);
    return E;
  }
  function engSet(E, sp, bo, now, fl) {
    fl = +fl || 0;
    var f = 32 + sp * 50 + (bo ? 16 : 0), tc = 0.07;
    E.o1.frequency.setTargetAtTime(f, now, tc); E.o2.frequency.setTargetAtTime(f * 0.5, now, tc); E.lfo.frequency.setTargetAtTime(f * 0.5, now, tc);
    E.lp.frequency.setTargetAtTime(240 + sp * 650 + (bo ? 1100 : 0), now, 0.08);
    E.out.gain.setTargetAtTime(0.028 + 0.017 * (sp > 1.2 ? 1.2 : sp) + (bo ? 0.02 : 0), now, 0.1);
    E.ng.gain.setTargetAtTime(bo ? 0.55 : 0.05 * sp, now, 0.1);
    E.nf.frequency.setTargetAtTime(bo ? 950 : 420 + sp * 200, now, 0.1);
    E.wg.gain.setTargetAtTime(bo ? 0.55 : fl * 0.45, now, 0.3);
    E.wf.frequency.setTargetAtTime(1000 + fl * 1000 + (bo ? 900 : 0), now, 0.3);
  }
  function makeSiren(g) {
    var c = g.ctx, R = { lv: 0, last: -1 }, t = c.currentTime, i;
    R.out = c.createGain(); R.out.gain.value = 0; R.out.connect(g.loopVol);
    var lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 1700; lp.Q.value = 0.8; lp.connect(R.out);
    for (i = 0; i < 2; i++) { // two patrol cars wailing slightly out of phase: "ウー…ウー…"
      var o = c.createOscillator(); o.type = i ? 'triangle' : 'square'; o.frequency.value = i ? 680 : 700;
      var vg = c.createGain(); vg.gain.value = i ? 0.8 : 0.45; o.connect(vg); vg.connect(lp);
      var l = c.createOscillator(); l.type = 'triangle'; l.frequency.value = i ? 0.47 : 0.41;
      var lg = c.createGain(); lg.gain.value = i ? 160 : 175; l.connect(lg); lg.connect(o.frequency);
      o.start(t); l.start(t + i * 0.7);
    }
    return R;
  }
  function sirSet(R, lv, now) { R.out.gain.setTargetAtTime(lv * 0.04, now, lv > 0 ? 0.12 : 0.25); }

  /* ================= live state & public API ================= */
  var ctx = null, G0 = null, player = null, timer = 0, pool = { act: [], last: {} }, lastJ = {};
  var st = { se: true, bgm: true, want: null, heat: 1, boss: false, nitro: false, muffle: false, susp: false };

  function applyLevels() {
    if (!G0) return;
    var now = ctx.currentTime, g = G0, on = st.se && !st.muffle ? 1 : 0;
    g.musicVol.gain.setTargetAtTime(st.bgm ? (st.muffle ? 0.32 : 1) : 0, now, 0.06);
    g.musicFilt.frequency.setTargetAtTime(st.muffle ? 480 : (st.nitro ? 16000 : 7000), now, 0.05);
    g.seVol.gain.setTargetAtTime(on, now, 0.03);
    g.loopVol.gain.setTargetAtTime(on, now, 0.05);
    g.jingleVol.gain.setTargetAtTime(st.muffle ? 0.3 : 1, now, 0.05);
  }
  function tick() {
    try {
      if (!player || !ctx) { if (timer) { clearInterval(timer); timer = 0; } return; }
      var now = ctx.currentTime;
      if (player.t < now) player.t = now + 0.02;
      player.run(now + (hidden() ? 1.2 : 0.13), st);
    } catch (e) {}
  }
  function applyMusic() {
    if (!G0) return;
    var target = st.bgm ? st.want : null, now = ctx.currentTime, start = now + 0.06;
    if (player && player.id === target) return;
    if (player) { killSong(player.S, now, 0.3); player = null; start = now + 0.32; }
    if (target) {
      player = new Player(G0, target, start, st);
      if (!timer) timer = setInterval(tick, 25);
      tick();
    }
  }
  function steal(v, now) {
    try { v.out.gain.cancelScheduledValues(now); v.out.gain.setTargetAtTime(0, now, 0.012); } catch (e) {}
    for (var i = 0; i < v.srcs.length; i++) { try { v.srcs[i].stop(now + 0.08); } catch (e) {} }
  }

  var API = {
    unlock: function () {
      try {
        if (!AC) return;
        if (ctx && ctx.state === 'running') return;
        if (!ctx || ctx.state === 'closed') {
          try { ctx = new AC({ latencyHint: 'interactive' }); } catch (e) { ctx = new AC(); }
          G0 = makeGraph(ctx); pool = { act: [], last: {} }; lastJ = {}; player = null;
          try { var b = ctx.createBuffer(1, 1, 22050), s = ctx.createBufferSource(); s.buffer = b; s.connect(ctx.destination); s.start(0); } catch (e) {}
          applyLevels(); applyMusic();
        }
        if (ctx.state !== 'running' && !(st.susp && hidden())) {
          var p = ctx.resume(); if (p && p.then) p.then(noop, noop);
        }
      } catch (e) {}
    },
    setSe: function (b) { try { st.se = !!b; applyLevels(); } catch (e) {} },
    setBgm: function (b) { try { st.bgm = !!b; applyLevels(); applyMusic(); } catch (e) {} },
    getSe: function () { return st.se; },
    getBgm: function () { return st.bgm; },
    music: function (id) {
      try {
        if (id === undefined || id === '') id = null;
        if (id !== null && !SONGS[id]) return;
        if (id === st.want) return;
        st.want = id; applyMusic();
      } catch (e) {}
    },
    boss: function (on) { st.boss = !!on; },
    heat: function (star) { var h = Math.round(+star); st.heat = h >= 1 && h <= 5 ? h : (h > 5 ? 5 : 1); },
    nitro: function (on) {
      try {
        on = !!on;
        if (on === st.nitro) return;
        st.nitro = on;
        if (!G0) return;
        applyLevels();
        if (on && player && player.def.run && st.bgm && ctx.state === 'running') riser(player.S, ctx.currentTime + 0.01);
      } catch (e) {}
    },
    pauseMuffle: function (on) { try { st.muffle = !!on; applyLevels(); } catch (e) {} },
    suspend: function () {
      try { st.susp = true; if (ctx && ctx.state === 'running') { var p = ctx.suspend(); if (p && p.then) p.then(noop, noop); } } catch (e) {}
    },
    resume: function () {
      try {
        st.susp = false;
        if (ctx && ctx.state !== 'running' && ctx.state !== 'closed') { var p = ctx.resume(); if (p && p.then) p.then(noop, noop); }
      } catch (e) {}
    },
    jingle: function (id) {
      try {
        if (!JING[id]) return;
        var stop = id === 'clear' || id === 'wreck';
        if (stop) { st.want = null; applyMusic(); }
        if (!ctx) return;
        if (id === 'stars' ? !st.se : !st.bgm) return;
        if (ctx.state !== 'running') return;
        var now = ctx.currentTime;
        if (lastJ[id] !== undefined && now >= lastJ[id] && now - lastJ[id] < 0.25) return;
        lastJ[id] = now;
        var J = fireJingle(G0, id, now + (stop ? 0.12 : 0.02));
        setTimeout(function () {
          for (var i = 0; i < J.S.nodes.length; i++) { try { J.S.nodes[i].disconnect(); } catch (e) {} }
        }, (J.dur + 2) * 1000);
      } catch (e) {}
    },
    engine: function (speed, boosting, flow) {
      try {
        if (!ctx || !st.se || st.muffle) return;
        var E = G0.eng || (G0.eng = makeEngine(G0)), now = ctx.currentTime, bo = !!boosting, sp = +speed || 0, fl = +flow || 0;
        sp = sp < 0 ? 0 : sp > 1.6 ? 1.6 : sp; fl = fl < 0 ? 0 : fl > 1 ? 1 : fl;
        if (E.on && now - E.last < 0.05 && now >= E.last) return;
        if (E.on && bo === E.bo && Math.abs(sp - E.sp) < 0.01 && Math.abs(fl - (E.fl || 0)) < 0.02) return;
        E.last = now; E.on = true; E.sp = sp; E.bo = bo; E.fl = fl;
        engSet(E, sp, bo, now, fl);
      } catch (e) {}
    },
    engineOff: function () {
      try {
        var E = G0 && G0.eng; if (!E || !E.on) return;
        var now = ctx.currentTime; E.on = false;
        E.out.gain.setTargetAtTime(0, now, 0.12); E.ng.gain.setTargetAtTime(0, now, 0.1);
      } catch (e) {}
    },
    siren: function (level) {
      try {
        if (!ctx || !st.se || st.muffle) return;
        var lv = +level || 0; lv = lv < 0 ? 0 : lv > 1 ? 1 : lv;
        var R = G0.sir;
        if (!R) { if (lv <= 0) return; R = G0.sir = makeSiren(G0); }
        var now = ctx.currentTime;
        if (Math.abs(lv - R.lv) < 0.01) return;
        if (lv > 0 && now - R.last < 0.05 && now >= R.last) return;
        R.last = now; R.lv = lv;
        sirSet(R, lv, now);
      } catch (e) {}
    },
    se: function (name, amount) {
      try {
        if (!ctx || !st.se || st.muffle || ctx.state !== 'running' || !SE.hasOwnProperty(name)) return;
        seFire(G0, pool, name, ctx.currentTime, amount);
      } catch (e) {}
    },
    /* dev hook: render offline with the same synthesis code.
       kind 'music' (opts.boss/heat/nitro), 'se' (opts.amount), 'jingle', 'engine' (opts.speed/boost), 'siren' (opts.level),
       'mix' (opts.events). Output starts at the sound onset (an internal 0.5 s pre-roll settles the limiter).
       opts.stereo -> interleaved L/R, opts.raw -> bypass master limiter. Resolves Float32Array. */
    _render: function (kind, id, seconds, opts) {
      return new Promise(function (resolve) {
        try {
          opts = opts || {}; seconds = +seconds || 4;
          if (!OAC) { resolve(new Float32Array(0)); return; }
          var sr = opts.sampleRate || 44100, pre = 0.5, skip = Math.round(pre * sr), n = Math.ceil(sr * seconds);
          var oc = new OAC(2, n + skip, sr), g = makeGraph(oc, !!opts.raw), t0 = pre + 0.005;
          var s = { heat: clamp(Math.round(opts.heat || 1), 1, 5), boss: !!opts.boss, nitro: !!opts.nitro };
          if (kind === 'music') {
            if (!SONGS[id]) { resolve(new Float32Array(0)); return; }
            if (s.nitro && SONGS[id].run) g.musicFilt.frequency.value = 16000;
            var P = new Player(g, id, t0, s); P.run(pre + seconds, s);
            if (s.nitro && SONGS[id].run) riser(P.S, t0);
          } else if (kind === 'se') { if (!SE.hasOwnProperty(id)) { resolve(new Float32Array(0)); return; } fireSe(g, id, t0, opts.amount); }
          else if (kind === 'jingle') { if (!JING[id]) { resolve(new Float32Array(0)); return; } fireJingle(g, id, t0); }
          else if (kind === 'engine') { var E = makeEngine(g); engSet(E, clamp(+opts.speed || 1, 0, 1.6), !!opts.boost, t0, clamp(+opts.flow || 0, 0, 1)); }
          else if (kind === 'siren') { var R = makeSiren(g); sirSet(R, clamp(opts.level == null ? 1 : +opts.level, 0, 1), t0); }
          else if (kind === 'mix') { // dev: opts.events = [[seName, time, amount], ...] (+ optional music id with boss/heat/nitro)
            if (SONGS[id]) { var MP = new Player(g, id, t0, s); MP.run(pre + seconds, s); }
            var ev = (opts.events || []).slice().sort(function (a, b) { return a[1] - b[1]; }), op = { act: [], last: {} }, k;
            for (k = 0; k < ev.length; k++) if (SE.hasOwnProperty(ev[k][0])) seFire(g, op, ev[k][0], t0 + (+ev[k][1] || 0), ev[k][2]);
          }
          var done = function (buf) {
            var L = buf.getChannelData(0), Rr = buf.numberOfChannels > 1 ? buf.getChannelData(1) : L, out, i, m = L.length - skip;
            if (opts.stereo) { out = new Float32Array(m * 2); for (i = 0; i < m; i++) { out[2 * i] = L[i + skip]; out[2 * i + 1] = Rr[i + skip]; } }
            else { out = new Float32Array(m); for (i = 0; i < m; i++) out[i] = (L[i + skip] + Rr[i + skip]) * 0.5; }
            resolve(out);
          };
          var pr = oc.startRendering();
          if (pr && pr.then) pr.then(done, function () { resolve(new Float32Array(0)); });
          else oc.oncomplete = function (e) { done(e.renderedBuffer); };
        } catch (e) { resolve(new Float32Array(0)); }
      });
    },
    // dev: snapshot of the live engine (for the test page)
    _state: function () {
      var P = player;
      return { ctx: ctx ? ctx.state : 'none', song: P ? P.id : null, want: st.want, part: P ? P.seq.charAt(P.pi) : null, bar: P ? P.bar : -1,
        heat: st.heat, boss: st.boss, nitro: st.nitro, muffle: st.muffle, se: st.se, bgm: st.bgm, voices: pool.act.length };
    },
    // dev: list malformed song data (should be empty)
    _lint: function () {
      var bad = [], id, k, i, p, j;
      for (id in SONGS) for (k in SONGS[id].parts) {
        p = SONGS[id].parts[k];
        if (p.chs.length !== 8) bad.push(id + k + ' chords');
        for (i = 0; i < p.chs.length; i++) for (j = 0; j < p.chs[i].length; j++) if (p.chs[i][j] < -7) bad.push(id + k + ' chord ' + i);
        if (p.m.length !== 8) bad.push(id + k + ' bars');
        for (i = 0; i < p.m.length; i++) {
          if (p.m[i].length !== 16) bad.push(id + k + ' mel ' + i + ' len ' + p.m[i].length);
          for (j = 0; j < 16; j++) { var ch = p.m[i].charAt(j); if (ch !== '.' && ch !== '-' && dg(ch) < -7) bad.push(id + k + ' mel ' + i + ' char ' + ch); }
        }
        if (p.b.length !== 16) bad.push(id + k + ' bass len ' + p.b.length);
        if (p.c.length !== 16) bad.push(id + k + ' comp len ' + p.c.length);
        var ds = p.d.split('|');
        for (i = 0; i < ds.length; i++) if (ds[i].length !== 18) bad.push(id + k + ' drum ' + ds[i].charAt(0) + ' len ' + (ds[i].length - 2));
      }
      return bad;
    },
    songs: ['garage', 'town0', 'town1', 'town2', 'town3'],
    effects: [],
    jingles: ['clear', 'wreck', 'unlock', 'stars']
  };
  for (var nm in SE) if (SE.hasOwnProperty(nm)) API.effects.push(nm);
  W.RaceSound = API;
})();
