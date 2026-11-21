/* ぶっとびチェイス — RaceSound
   Music + sound effects, all synthesized with the Web Audio API (no files, no libraries).
   Every public method is a silent no-op when Web Audio is missing or something fails. */
(function () {
  'use strict';
  var W = typeof window !== 'undefined' ? window : {};
  var AC = W.AudioContext || W.webkitAudioContext;
  var OAC = W.OfflineAudioContext || W.webkitOfflineAudioContext;
  function noop() {}
  function clamp(x, a, b) { return x < a ? a : x > b ? b : x; }
  function mtof(m) { return 440 * Math.pow(2, (m - 69) / 12); }
  function rnd(a, b) { return a + Math.random() * (b - a); }
  function hidden() { return !!(W.document && W.document.hidden); }

  /* ================= music theory ================= */
  // Melody alphabet: one char = one 16th step. '.' rest, '-' tie.
  // z..m = scale degrees one octave below, 1..7 = degrees, 8 = octave, 9 0 q w e r t = above.
  var DEG = 'zxcvbnm1234567890qwert';
  function dg(c) { return DEG.indexOf(c) - 7; }
  var SC = {
    maj: [0, 2, 4, 5, 7, 9, 11],
    dor: [0, 2, 3, 5, 7, 9, 10],
    mix: [0, 2, 4, 5, 7, 9, 10],
    phd: [0, 1, 4, 5, 7, 8, 10] // Phrygian dominant (Hijaz)
  };
  function dm(sc, base, d) { var o = Math.floor(d / 7); return base + sc[d - o * 7] + 12 * o; }
  function fold(m, lo) { while (m < lo) m += 12; while (m >= lo + 12) m -= 12; return m; }
  function len(p, i) { var n = 1; while (i + n < p.length && p.charAt(i + n) === '-') n++; return n; }

  // per-voice peak levels (music stays well below effects)
  var LV = {
    kick: 0.17, snare: 0.1, stone: 0.06, clap: 0.08, hat: 0.034, ohat: 0.03, crash: 0.05,
    shk: 0.03, bell: 0.034, rim: 0.035, tom: 0.11, bass: 0.075, lead: 0.048, stab: 0.019,
    ep: 0.02, pad: 0.011, power: 0.12, arp: 0.022, siren: 0.026, nitro: 0.02
  };
  var MUSIC_TRIM = 0.9, JINGLE_TRIM = 1.25, MAKEUP_FIX = 0.85;

  /* ================= songs ================= */
  // part: ch = chord degree per bar ('4/5' = two chords), m = 8 melody bars,
  // b = bass (1 3 5 7 8 = chord tones, x = ghost), c = comp hits (x/o), d = drums
  // drums: k kick, s snare, c clap, h hat, o open hat, z shaker, b sleigh bell, m rim, t tom
  var SONGS = {
    garage: {
      bpm: 104, sc: SC.dor, key: 38, lk: 62, cl: 55, bl: 36, sw: 0.13, dv: 0.8, crash: 0, fill: 0,
      inst: { l: 'soft', b: 'slap', c: 'ep' }, voi: 'r9', lc: 3600, cc: 2600, vib: 10, seq: 'AABB',
      parts: {
        A: { ch: '1 1 4 4 1 1 3 4',
          m: ['........5.7.8-5-', '3-----..........', '........4.6.8-6-', '5-----..........',
              '8-.8-.7-5---3-5-', '4-3-1-----......', '3-5-7-9-0-------', '9-8-6-4---------'],
          b: '1--.x.8.1-.1x.7.', c: 'x-----.x---.x---',
          d: 'k:x.....x.x.....x.|s:....x..g.g..x..g|h:x.x.x.x.x.x.x.x.' },
        B: { ch: '3 3 4 4 7 7 5 4',
          m: ['9---8-7-8---5---', '7---5-3-5-------', '8---6-8-0---8---', '6-----4-6-8-----',
              '9---8-9-q---9---', '8-7-5-7-9-------', '9---7---5-7-9---', '8-------........'],
          b: '1-.81-.x1-.5x.8.', c: 'x---.x-----.x-..',
          d: 'k:x.....x.x..x....|s:....x..g.g..x.g.|h:x.xxx.x.x.xxx...|o:..............x.' }
      }
    },
    town0: { // はじまりの街 — bright pop-rock, D major
      bpm: 148, sc: SC.maj, key: 38, lk: 62, cl: 57, bl: 36, run: 1,
      inst: { l: 'pulse', b: 'rock', c: 'stab' }, voi: 'tri', lc: 4800, cc: 3200, vib: 12,
      seq: 'AABB', boss: 'CCDD',
      parts: {
        A: { ch: '1 5 6 4 1 5 4 5',
          m: ['5.5.6-5-8---3-5-', '7---6-5-2---5---', '6.6.7-6-0---8-6-', '8---7-6-4---6-8-',
              '8.8.9-8-0---9-8-', '7---5-7-9---7---', '6-8-6-4-6---8-9-', '9---8-7-5-----..'],
          b: '1-1-1-1-1-1-8-5-', c: '..x...x...x...x.',
          d: 'k:x.....x.x.......|s:....x.......x...|h:x.x.x.x.x.x.x.x.' },
        B: { ch: '4 5 3 6 2 5 1 1',
          m: ['8---8-9-0---9-8-', '9---7---5---7-9-', '0---0-q-w---0-9-', '8-----6-8-9-0---',
              'q---0-9-8---6-8-', '9---9-0-9-7-5---', '8---5-3-5-8-0-w-', '8-------....5-7-'],
          b: '1-1-8-1-1-1-8-1-', c: 'x..x..x...x..x..',
          d: 'k:x.....x.x...x...|s:....x.......x...|h:x.x.x.x.x.x.x...|o:..............x.' },
        C: { ch: '6 6 4 5 6 6 2 3',
          m: ['6.6.8.6.0-9-8-7-', '6---3---6-7-8-9-', '8.8.6.8.q-0-9-8-', '7---5---7-8-9-0-',
              'q-0-9-8-0---6---', '6.6.8.9.0-9-8-7-', '6---4---6-8-9-q-', '0-------7-------'],
          b: '1.1.1.111.1.1.11', c: 'x.x.x.x.x.x.x.x.',
          d: 'k:x.x...x.x.x.....|s:....x.......x...|h:xgxgxgxgxgxgxgxg' },
        D: { ch: '4 5 6 6 4 5 3 3',
          m: ['8---6---4-6-8-q-', 'w---9---7-9-w-9-', '0-9-8-6-8-9-0---', '6.6.6.6.8-6-3---',
              'q-0-9-8-6-8-q---', 'w-q-0-9-7-9-w---', '0---7---5-7-0---', 'w-------0-------'],
          b: '1.181.181.181.18', c: 'x..x..x.x..x..x.',
          d: 'k:x.x.x.x.x.x.x.x.|s:....x.......x.x.|h:xgxgxgxgxgxgxgxg' }
      }
    },
    town1: { // 港の街 — funky surf rock, A Mixolydian
      bpm: 140, sc: SC.mix, key: 45, lk: 57, cl: 55, bl: 36, run: 1, wet: 0.3,
      inst: { l: 'pluck', b: 'slap', c: 'chop' }, voi: 'tri', lc: 5200, cc: 3400, vib: 10,
      seq: 'AABB', boss: 'CCDD',
      parts: {
        A: { ch: '1 1 7 7 4 4 7 1',
          m: ['5-5.8.5.7-8-0---', '8---7-5-3---5---', '7-7.9.7.q-9-7---', '9---7-4-2---4---',
              '6-6.8.6.q-0-8---', '8---6-4-6-8-q-w-', 'q---9-7-9---8---', '8-------5-7-8...'],
          b: '1.15.8.1.15.8.7.', c: '..x..x.x..x..x.x',
          d: 'k:x..x..x...x..x..|s:....x.......x...|h:x.xxx.xxx.xxx.xx|z:....x.......x...' },
        B: { ch: '4 4 1 1 7 4 5 5',
          m: ['8888q-0-8888q-0-', '8-6-4-6-8-------', '0000w-q-0000w-q-', '0-8-5-8-0-------',
              '9999q-9-7-9-q---', '8---6---4---6---', '5-7-9-w-9-7-5---', '5-------........'],
          b: '1-8-1-8-1-8-5-8-', c: '..x...x...x...x.',
          d: 'k:x...x...x...x...|s:....x.......x...|h:x...x...x...x...|o:..x...x...x...x.|z:g.g.g.g.g.g.g.g.' },
        C: { ch: '6 6 5 5 4 4 5 7',
          m: ['6.6.8.6.0-8-6-5-', '6---0---6-8-0-w-', '5.5.7.5.9-7-5-4-', '5---9---5-7-9-q-',
              '8.8.6.8.q-8-6-4-', '4---8---4-6-8-0-', '9-7-5-7-9-w-9-7-', '9---------------'],
          b: '1.11.11.1.11.11.', c: 'x.x.x.x.x.x.x.x.',
          d: 'k:x.x...x.x.x.....|s:....x.......x...|h:xgxgxgxgxgxgxgxg|z:..x...x...x...x.' },
        D: { ch: '4 5 6 6 4 5 7 7',
          m: ['q-0-8-6-q-0-8-6-', 'w-q-9-7-w-q-9-7-', '0---8---6---8---', '0-q-w-e-w-q-0---',
              'q-q.q.0-8-6-8-q-', 'w-w.w.q-9-7-9-w-', 'q---9---7---9---', 'q-------w-------'],
          b: '1.181.181.181.18', c: 'x..x..x.x..x..x.',
          d: 'k:x.x.x.x.x.x.x.x.|s:....x.......x.x.|h:xgxgxgxgxgxgxgxg' }
      }
    },
    town2: { // 雪の峠 — fast, crystal arps + sleigh bells, E Dorian
      bpm: 156, sc: SC.dor, key: 40, lk: 64, cl: 55, bl: 36, run: 1, arp: 76,
      inst: { l: 'saw', b: 'rock', c: 'pad' }, voi: 'tri', lc: 3800, cc: 1700, vib: 14,
      seq: 'AABB', boss: 'CCDD',
      parts: {
        A: { ch: '1 1 7 7 3 3 4 4',
          m: ['1---5---8-----7-', '5-----3-5-7-8---', '7---4---7-----6-', '4-----2-4-6-7---',
              '3---7---0-----9-', '7-----5-7-9-0---', 'q---9-8-6---8---', '6-------7---5---'],
          b: '1.111.111.111.11', c: 'x-------x-------',
          d: 'k:x.......x.x.....|s:....x.......x...|h:x.x.x.x.x.x.x.x.|b:xgogxgogxgogxgog' },
        B: { ch: '4 7 1 1 4 7 1 5',
          m: ['8-8.6.8.9-8-6-4-', '7---9---q-9-7---', '8---5---3-5-8-9-', '0-----9-8---5---',
              '8-8.6.8.9-8-6-8-', '9---q---w-q-9---', '8---9---0---9-8-', '9-------7-5-7---'],
          b: '1.881.881.881.88', c: 'x---------------',
          d: 'k:x.....x.x.......|s:....x.......x...|h:x.x.x.x.x.x.x...|o:..............x.|b:xgxgxgxgxgxgxgxg' },
        C: { ch: '1 1 2 2 1 1 7 7',
          m: ['1.1.3.1.5-4-3-2-', '1---5---8-7-5-3-', '2.2.4.2.6-4-2-1-', '2---6---9-8-6-4-',
              '8.8.7.8.0-9-8-7-', '8---5---3-5-8-0-', 'q-9-7-9-q-9-7-4-', '7-------4-------'],
          b: '1.111.111.111.18', c: 'x-------x-------',
          d: 'k:x.x.x.x.x.x.x.x.|s:....x.......x...|h:xgxgxgxgxgxgxgxg|b:x.o.x.o.x.o.x.o.' },
        D: { ch: '3 4 3 4 5 5 7 7',
          m: ['0-9-7-5-7-9-0---', 'q-9-8-6-8-9-q---', 'w-0-9-7-9-0-w---', 'q---8---6---8---',
              '9.9.7.9.w-9-7-5-', '9---w---e-w-9---', 'q---9---7---9---', 'q-------w-------'],
          b: '1.881.881.881.88', c: 'x---------------',
          d: 'k:x.xxx.x.x.xxx.x.|s:....x.......x...|h:xgxgxgxgxgxgxgxg|b:x.o.x.o.x.o.x.o.' }
      }
    },
    town3: { // 国境の荒れ地 — heavy desert rock, E Phrygian dominant
      bpm: 144, sc: SC.phd, key: 40, lk: 64, cl: 43, bl: 36, run: 1, heavy: 1, slide: 1,
      inst: { l: 'saw', b: 'heavy', c: 'power' }, voi: 'pow', lc: 3400, cc: 2600, vib: 20,
      seq: 'AABB', boss: 'CCDD',
      parts: {
        A: { ch: '1 1 2 2 1 1 7 2',
          m: ['1.1.2-3-5---3-2-', '3-2-1-------m-1-', '2.2.3-4-6---4-3-', '4-3-2-------3-2-',
              '5.5.6-5-8---6-5-', '6-5-3-----5-3-2-', '7---6-5-4---3-2-', '2-3-2-----------'],
          b: '1.1.1.11.1.11.1.', c: 'x-..x-..x-x-..x-',
          d: 'k:x.....x.x.......|s:....x.......x...|h:x.x.x.x.x.x.x.x.|m:..x..x....x..x..' },
        B: { ch: '4 4 7 7 2 2 1 1',
          m: ['8---8-9-0---9-8-', '6---4-6-8-6-4-3-', 'q---9-8-7---6-5-', '7-6-7-9-q-------',
              '9---0-9-8-9-0---', 'q-0-9-8-6-------', '8---5---3---5---', '8-------0-9-8-7-'],
          b: '1.11.11.1.11.11.', c: 'x-x-x-x-x-x-x-x-',
          d: 'k:x.x...x.x.x...x.|s:....x.......x...|h:x.x.x.x.x.x.x...|o:..............x.|m:..x..x....x..x..' },
        C: { ch: '1 2 1 2 1 2 7 2',
          m: ['1.1.2.1.3-2-1-m-', '2.2.3.2.4-3-2-1-', '5.5.6.5.8-6-5-3-', '6.6.8.6.9-8-6-4-',
              '8---5---8-9-0---', '9---6---9-0-q---', 'q-9-8-7-6-5-4-3-', '2---------------'],
          b: '1111111111111111', c: 'x.x.x.x.x.x.x.x.',
          d: 'k:x.x.x.x.x.x.x.x.|s:....x.......x...|h:xgxgxgxgxgxgxgxg|m:..x..x....x..x..' },
        D: { ch: '4 4 6 6 7 7 2 2',
          m: ['4.4.6.4.8-6-4-3-', '4---8---0-9-8-6-', '6.6.8.6.0-8-6-5-', '6---0---e-0-8-6-',
              '7.7.9.7.q-9-7-6-', '7---q---e-q-9-7-', '9---q---e---q---', '9-------8-------'],
          b: '1118111811181118', c: 'x.xxx.xxx.xxx.x.',
          d: 'k:xxx.xxx.xxx.xxx.|s:....x.......x...|h:xgxgxgxgxgxgxgxg|c:....x.......x...' }
      }
    }
  };
  var VEL = { x: 1, o: 0.7, g: 0.35 };
  function parseSongs() {
    for (var id in SONGS) {
      var parts = SONGS[id].parts;
      for (var k in parts) {
        var p = parts[k], toks = p.ch.split(' '), i, j;
        p.chs = [];
        for (i = 0; i < toks.length; i++) {
          var hs = toks[i].split('/'), a = [];
          for (j = 0; j < hs.length; j++) a.push(dg(hs[j]));
          p.chs.push(a);
        }
        p.dr = {};
        var ds = p.d.split('|');
        for (i = 0; i < ds.length; i++) {
          var key = ds[i].charAt(0), pat = ds[i].slice(2), arr = [];
          for (j = 0; j < 16; j++) arr.push(VEL[pat.charAt(j)] || 0);
          p.dr[key] = arr;
        }
        if (!p.dr.k) p.dr.k = [];
      }
    }
  }
  parseSongs();

  /* ================= graph (works on live or offline contexts) ================= */
  function pulseWave(c, duty) {
    var n = 40, re = new Float32Array(n), im = new Float32Array(n);
    for (var k = 1; k < n; k++) re[k] = 2 / (k * Math.PI) * Math.sin(k * Math.PI * duty);
    return c.createPeriodicWave(re, im);
  }
  function softCurve() { // linear to 0.6, then soft knee; never exceeds ~0.98
    var n = 2048, cv = new Float32Array(n);
    for (var i = 0; i < n; i++) {
      var s = (i / (n - 1) * 2 - 1) * 2, a = Math.abs(s);
      var y = a < 0.6 ? a : 0.6 + 0.38 * Math.tanh((a - 0.6) / 0.38);
      cv[i] = s < 0 ? -y : y;
    }
    return cv;
  }
  function distCurve() {
    var n = 1024, cv = new Float32Array(n), k = 3, nk = Math.tanh(k);
    for (var i = 0; i < n; i++) { var x = i / (n - 1) * 2 - 1; cv[i] = Math.tanh(k * x) / nk; }
    return cv;
  }
  function makeGraph(c, raw) {
    var g = { ctx: c }, i;
    var len0 = Math.floor(c.sampleRate), nb = c.createBuffer(1, len0, c.sampleRate), d = nb.getChannelData(0);
    for (i = 0; i < len0; i++) d[i] = Math.random() * 2 - 1;
    g.noise = nb;
    g.pw25 = pulseWave(c, 0.25);
    g.pw125 = pulseWave(c, 0.125);
    g.master = c.createGain();
    if (raw) g.master.connect(c.destination);
    else {
      var comp = c.createDynamicsCompressor();
      comp.threshold.value = -4; comp.knee.value = 4; comp.ratio.value = 12;
      comp.attack.value = 0.002; comp.release.value = 0.16;
      var pre = c.createGain(); pre.gain.value = 0.5 * MAKEUP_FIX;
      var sh = c.createWaveShaper(); sh.curve = softCurve();
      g.master.connect(comp); comp.connect(pre); pre.connect(sh); sh.connect(c.destination);
    }
    g.musicIn = c.createGain(); g.musicIn.gain.value = MUSIC_TRIM;
    g.musicFilt = c.createBiquadFilter(); g.musicFilt.type = 'lowpass';
    g.musicFilt.frequency.value = 7000; g.musicFilt.Q.value = 0.5;
    g.musicVol = c.createGain();
    g.musicIn.connect(g.musicFilt); g.musicFilt.connect(g.musicVol); g.musicVol.connect(g.master);
    g.seVol = c.createGain(); g.seVol.connect(g.master);
    g.loopVol = c.createGain(); g.loopVol.connect(g.master);
    g.jingleVol = c.createGain(); g.jingleVol.connect(g.master);
    g.jingleIn = c.createGain(); g.jingleIn.gain.value = JINGLE_TRIM; g.jingleIn.connect(g.jingleVol);
    return g;
  }

  /* ---- per-sound voice: tracks its nodes, disconnects everything when all sources end ---- */
  function voice(g, dest, t, own) {
    var v = { c: g.ctx, g: g, t: t, out: dest, n: [], srcs: [], left: 0, end: t, dead: false };
    if (own) { v.out = g.ctx.createGain(); v.out.connect(dest); v.n.push(v.out); }
    return v;
  }
  function fin(v) {
    if (v.dead) return;
    v.dead = true;
    for (var i = 0; i < v.n.length; i++) { try { v.n[i].disconnect(); } catch (e) {} }
    v.n.length = 0; v.srcs.length = 0;
  }
  function src(v, s, t0, t1) {
    v.left++; v.n.push(s); v.srcs.push(s);
    s.onended = function () { if (--v.left <= 0) fin(v); };
    if (t1 > v.end) v.end = t1;
    return s;
  }
  function O(v, type, f, t0, t1, dest) {
    var o = v.c.createOscillator();
    if (typeof type === 'string') o.type = type; else o.setPeriodicWave(type);
    o.frequency.value = f; o.frequency.setValueAtTime(f, t0);
    o.connect(dest); src(v, o, t0, t1); o.start(t0); o.stop(t1);
    return o;
  }
  function N(v, t0, t1, dest) {
    var b = v.c.createBufferSource(); b.buffer = v.g.noise; b.loop = true;
    b.connect(dest); src(v, b, t0, t1); b.start(t0, Math.random() * 0.9); b.stop(t1);
    return b;
  }
  function G(v, dest, val) { var x = v.c.createGain(); x.gain.value = val === undefined ? 0 : val; x.connect(dest); v.n.push(x); return x; }
  function F(v, type, f, q, dest) {
    var x = v.c.createBiquadFilter(); x.type = type; x.frequency.value = f; if (q) x.Q.value = q;
    x.connect(dest); v.n.push(x); return x;
  }
  function P(v, pan, dest) {
    if (!v.c.createStereoPanner) return dest;
    var x = v.c.createStereoPanner(); x.pan.value = pan; x.connect(dest); v.n.push(x); return x;
  }
  function env(p, t, pk, a, d) {
    p.setValueAtTime(0, t); p.linearRampToValueAtTime(pk, t + a); p.exponentialRampToValueAtTime(0.0001, t + a + d);
  }
  function adsr(p, t, pk, a, d, s, dur, r) {
    p.setValueAtTime(0, t); p.linearRampToValueAtTime(pk, t + a);
    var te = t + Math.max(dur, a + 0.002);
    if (dur > a + d) { p.linearRampToValueAtTime(pk * s, t + a + d); p.setValueAtTime(pk * s, te); }
    p.linearRampToValueAtTime(0, te + r);
    return te + r;
  }
  function addVib(x, o, t, end, cents, rate) {
    var lg = G(x, o.detune); lg.gain.setValueAtTime(0, t); lg.gain.linearRampToValueAtTime(cents, t + 0.25);
    O(x, 'sine', rate, t, end, lg);
  }

