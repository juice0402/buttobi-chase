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

  /* ---- song channel set (one per playing song / jingle; faded & dropped as a whole) ---- */
  function makeSong(g, dest, def) {
    var c = g.ctx, S = { g: g, c: c, def: def, nodes: [] };
    function reg(n) { S.nodes.push(n); return n; }
    function bq(type, f, q) { var n = reg(c.createBiquadFilter()); n.type = type; n.frequency.value = f; n.Q.value = q; return n; }
    function out(n, pan) {
      if (pan && c.createStereoPanner) { var p = reg(c.createStereoPanner()); p.pan.value = pan; n.connect(p); p.connect(S.out); }
      else n.connect(S.out);
      return n;
    }
    S.out = reg(c.createGain()); S.out.connect(dest);
    S.hat = out(bq('highpass', 7000, 0.7), 0.25);
    S.crash = out(bq('highpass', 4200, 0.5), -0.2);
    S.snr = out(bq('highpass', 800, 0.6));
    S.clap = out(bq('bandpass', 1300, 0.8), 0.08);
    S.shk = out(bq('bandpass', 6500, 1.2), -0.35);
    S.bell = out(bq('bandpass', 7600, 2.5), 0.3);
    S.lead = out(bq('lowpass', def.lc || 4500, 0.5));
    S.comp = out(bq('lowpass', def.cc || 3200, 0.5), 0.18);
    S.arp = out(reg(c.createGain()), -0.3);
    var dl = reg(c.createDelay(1)), fb = reg(c.createGain()), lp = bq('lowpass', 2400, 0.5), wet = reg(c.createGain());
    dl.delayTime.value = Math.min(0.9, 45 / (def.bpm || 120));
    fb.gain.value = 0.3; wet.gain.value = def.wet || 0.2;
    dl.connect(lp); lp.connect(fb); fb.connect(dl); lp.connect(wet); wet.connect(S.out);
    S.lead.connect(dl); S.arp.connect(dl);
    S.fb = fb;
    if (def.inst.c === 'power') {
      var ws = reg(c.createWaveShaper()); ws.curve = g.dist || (g.dist = distCurve());
      var dlp = bq('lowpass', 2600, 0.7), dgn = reg(c.createGain()); dgn.gain.value = 0.06;
      S.dist = reg(c.createGain()); S.dist.connect(ws); ws.connect(dlp); dlp.connect(dgn); out(dgn, 0.12);
    }
    return S;
  }
  function killSong(S, now, fade) {
    try { S.out.gain.cancelScheduledValues(now); S.out.gain.setTargetAtTime(0, now, fade / 4); } catch (e) {}
    try {
      setTimeout(function () {
        for (var i = 0; i < S.nodes.length; i++) { try { S.nodes[i].disconnect(); } catch (e) {} }
        S.nodes.length = 0;
      }, (fade + 1.6) * 1000);
    } catch (e) {}
  }

  /* ================= instruments ================= */
  function kick(S, t, v, heavy) {
    var x = voice(S.g, S.out, t), g = G(x, x.out), d = heavy ? 0.4 : 0.28;
    env(g.gain, t, LV.kick * v * (heavy ? 1.1 : 1), 0.002, d);
    var o = O(x, 'sine', heavy ? 150 : 175, t, t + d + 0.03, g);
    o.frequency.exponentialRampToValueAtTime(heavy ? 40 : 48, t + (heavy ? 0.11 : 0.075));
    if (heavy) {
      var c = G(x, x.out); env(c.gain, t, LV.kick * 0.35 * v, 0.001, 0.03);
      O(x, 'triangle', 900, t, t + 0.05, c).frequency.exponentialRampToValueAtTime(120, t + 0.03);
    }
  }
  function snare(S, t, v) {
    var x = voice(S.g, S.out, t), gn = G(x, S.snr), gt = G(x, x.out);
    env(gn.gain, t, LV.snare * v, 0.001, 0.17); N(x, t, t + 0.2, gn);
    env(gt.gain, t, LV.stone * v, 0.001, 0.07);
    O(x, 'triangle', 200, t, t + 0.09, gt).frequency.exponentialRampToValueAtTime(150, t + 0.06);
  }
  function clap(S, t, v) {
    var x = voice(S.g, S.clap, t), g = G(x, x.out), p = g.gain, a = LV.clap * v;
    p.setValueAtTime(0, t); p.linearRampToValueAtTime(a, t + 0.001); p.linearRampToValueAtTime(a * 0.2, t + 0.01);
    p.linearRampToValueAtTime(a, t + 0.011); p.linearRampToValueAtTime(a * 0.2, t + 0.02);
    p.linearRampToValueAtTime(a, t + 0.021); p.exponentialRampToValueAtTime(0.0001, t + 0.16);
    N(x, t, t + 0.18, g);
  }
  function hat(S, t, v, open) {
    var x = voice(S.g, S.hat, t), g = G(x, x.out), d = open ? 0.22 : 0.035;
    env(g.gain, t, (open ? LV.ohat : LV.hat) * v, 0.001, d); N(x, t, t + d + 0.02, g);
  }
  function crash(S, t, v) {
    var x = voice(S.g, S.crash, t), g = G(x, x.out);
    env(g.gain, t, LV.crash * v, 0.002, 1.2); N(x, t, t + 1.25, g);
  }
  function shaker(S, t, v) {
    var x = voice(S.g, S.shk, t), g = G(x, x.out);
    env(g.gain, t, LV.shk * v, 0.008, 0.05); N(x, t, t + 0.08, g);
  }
  function sleigh(S, t, v) {
    var x = voice(S.g, S.bell, t), g = G(x, x.out), p = g.gain, a = LV.bell * v;
    p.setValueAtTime(0, t); p.linearRampToValueAtTime(a, t + 0.002); p.exponentialRampToValueAtTime(a * 0.3, t + 0.025);
    p.linearRampToValueAtTime(a * 0.8, t + 0.03); p.exponentialRampToValueAtTime(0.0001, t + 0.14);
    N(x, t, t + 0.16, g);
  }
  function rim(S, t, v) {
    var x = voice(S.g, S.out, t), g = G(x, x.out);
    env(g.gain, t, LV.rim * v, 0.001, 0.05);
    O(x, 'triangle', 820, t, t + 0.07, g).frequency.exponentialRampToValueAtTime(600, t + 0.04);
  }
  function tom(S, t, v, f) {
    var x = voice(S.g, S.out, t), g = G(x, x.out);
    env(g.gain, t, LV.tom * v, 0.002, 0.26);
    O(x, 'sine', f * 1.5, t, t + 0.3, g).frequency.exponentialRampToValueAtTime(f, t + 0.08);
  }

  function leadNote(S, t, dur, m, vel, prev, dbl) {
    var def = S.def, k = def.inst.l, x = voice(S.g, S.lead, t), f = mtof(m), g = G(x, x.out), lv = LV.lead * vel, end, o, fl;
    if (k === 'pluck') {
      end = t + Math.max(0.2, dur + 0.12);
      env(g.gain, t, lv * 1.25, 0.003, end - t - 0.003);
      fl = F(x, 'lowpass', 3800, 1.5, g);
      fl.frequency.setValueAtTime(3800, t); fl.frequency.exponentialRampToValueAtTime(900, t + 0.22);
      o = O(x, 'sawtooth', f, t, end + 0.02, fl);
    } else if (k === 'soft') {
      end = adsr(g.gain, t, lv * 1.5, 0.012, 0.25, 0.55, dur, 0.2);
      o = O(x, 'triangle', f, t, end + 0.02, g);
      O(x, 'sine', f * 2, t, end + 0.02, G(x, g, 0.18));
    } else if (k === 'saw') {
      end = adsr(g.gain, t, lv * 0.8, 0.008, 0.12, 0.8, dur, 0.06);
      o = O(x, 'sawtooth', f, t, end + 0.02, g);
    } else {
      end = adsr(g.gain, t, lv, 0.004, 0.09, 0.75, dur, 0.04);
      o = O(x, S.g.pw25, f, t, end + 0.02, g);
    }
    if (prev && def.slide && prev !== m && Math.abs(prev - m) <= 5) {
      o.frequency.setValueAtTime(mtof(prev), t); o.frequency.exponentialRampToValueAtTime(f, t + 0.045);
    }
    if (!dbl && dur > 0.26 && k !== 'pluck') addVib(x, o, t + 0.12, end + 0.02, def.vib || 12, 5.6);
  }
  function bassNote(S, t, dur, m, vel, ghost) {
    var k = S.def.inst.b, x = voice(S.g, S.out, t), g = G(x, x.out), f = mtof(m), lv = LV.bass * vel, end;
    var fl = F(x, 'lowpass', 800, k === 'slap' ? 3 : 1.2, g);
    if (ghost) {
      end = t + 0.05; env(g.gain, t, lv * 0.45, 0.002, 0.04);
      fl.frequency.setValueAtTime(600, t);
    } else {
      end = adsr(g.gain, t, lv, 0.004, 0.12, 0.7, dur * 0.92, 0.03);
      var f0 = k === 'slap' ? 3000 : k === 'heavy' ? 1100 : 1600, f1 = k === 'slap' ? 420 : k === 'heavy' ? 300 : 380;
      fl.frequency.setValueAtTime(f0, t); fl.frequency.exponentialRampToValueAtTime(f1, t + (k === 'slap' ? 0.09 : 0.16));
    }
    O(x, 'sawtooth', f, t, end + 0.02, fl);
    if (k === 'heavy' && !ghost) O(x, 'square', f, t, end + 0.02, fl).detune.value = -10;
  }
  function stabChord(S, t, dur, ns, vel, chop) {
    var x = voice(S.g, S.comp, t), g = G(x, x.out), fl = F(x, 'lowpass', 3000, chop ? 2 : 1.2, g), i;
    var d = chop ? Math.min(dur, 0.09) : Math.min(dur, 0.22);
    var end = adsr(g.gain, t, LV.stab * vel, 0.003, 0.05, 0.6, d, 0.05);
    fl.frequency.setValueAtTime(chop ? 4200 : 3400, t);
    fl.frequency.exponentialRampToValueAtTime(chop ? 700 : 1000, t + (chop ? 0.08 : 0.18));
    for (i = 0; i < ns.length; i++) O(x, chop ? 'square' : 'sawtooth', mtof(ns[i]), t, end + 0.02, fl).detune.value = (i - 1) * 4;
  }
  function epChord(S, t, dur, ns, vel) {
    var x = voice(S.g, S.comp, t), g = G(x, x.out), i;
    var end = adsr(g.gain, t, LV.ep * vel, 0.004, 0.6, 0.45, dur, 0.25);
    for (i = 0; i < ns.length; i++) {
      var f = mtof(ns[i]), car = O(x, 'sine', f, t, end + 0.02, g), mg = G(x, car.frequency);
      mg.gain.setValueAtTime(f * 1.6, t); mg.gain.exponentialRampToValueAtTime(f * 0.12, t + 0.5);
      O(x, 'sine', f, t, end + 0.02, mg);
    }
  }
  function padChord(S, t, dur, ns, vel) {
    var x = voice(S.g, S.comp, t), g = G(x, x.out), i;
    var end = adsr(g.gain, t, LV.pad * vel, 0.12, 0.3, 0.8, dur, 0.3);
    for (i = 0; i < ns.length; i++) O(x, 'sawtooth', mtof(ns[i]), t, end + 0.02, g).detune.value = i % 2 ? 7 : -7;
  }
  function powerChord(S, t, dur, m, vel) {
    var x = voice(S.g, S.dist, t), g = G(x, x.out), f = mtof(m);
    var end = adsr(g.gain, t, LV.power * vel, 0.004, 0.1, 0.75, dur, 0.05);
    O(x, 'sawtooth', f, t, end + 0.02, g);
    O(x, 'sawtooth', f * 1.4983, t, end + 0.02, g).detune.value = 5;
    O(x, 'sawtooth', f * 2, t, end + 0.02, g).detune.value = -6;
  }
  function compChord(S, t, dur, r, vel) {
    var def = S.def, k = def.inst.c, sc = def.sc, ns = [], i;
    if (k === 'power') { powerChord(S, t, dur, fold(dm(sc, def.key, r), def.cl), vel); return; }
    var degs = def.voi === 'r9' ? [r + 2, r + 4, r + 6, r + 8] : [r, r + 2, r + 4];
    for (i = 0; i < degs.length; i++) ns.push(fold(dm(sc, def.key, degs[i]), def.cl));
    if (k === 'ep') epChord(S, t, dur, ns, vel);
    else if (k === 'pad') padChord(S, t, dur, ns, vel);
    else stabChord(S, t, dur, ns, vel, k === 'chop');
  }
  function arpNote(S, t, m, vel) {
    var x = voice(S.g, S.arp, t), g = G(x, x.out);
    env(g.gain, t, LV.arp * vel, 0.002, 0.16); O(x, 'triangle', mtof(m), t, t + 0.18, g);
  }
  function sirenStab(S, t, m, vel) {
    var x = voice(S.g, S.comp, t), g = G(x, x.out);
    env(g.gain, t, LV.siren * vel, 0.004, 0.11);
    O(x, S.g.pw25, mtof(m - 2), t, t + 0.13, g).frequency.exponentialRampToValueAtTime(mtof(m), t + 0.035);
  }
  function nitroNote(S, t, m) {
    var x = voice(S.g, S.out, t), g = G(x, x.out);
    env(g.gain, t, LV.nitro, 0.002, 0.07); O(x, S.g.pw125, mtof(m), t, t + 0.09, g);
  }
  function riser(S, t) {
    var x = voice(S.g, S.out, t), g = G(x, x.out), f = F(x, 'bandpass', 300, 2, g);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.09, t + 0.7); g.gain.linearRampToValueAtTime(0, t + 0.95);
    f.frequency.setValueAtTime(300, t); f.frequency.exponentialRampToValueAtTime(7000, t + 0.9);
    N(x, t, t + 1, f);
    var g2 = G(x, x.out); g2.gain.setValueAtTime(0, t); g2.gain.linearRampToValueAtTime(0.03, t + 0.7); g2.gain.linearRampToValueAtTime(0, t + 0.95);
    O(x, 'sawtooth', 220, t, t + 1, g2).frequency.exponentialRampToValueAtTime(1760, t + 0.9);
  }
  function bassMidi(def, r, c) {
    var sc = def.sc, root = fold(dm(sc, def.key, r), def.bl), base = dm(sc, 0, r);
    if (c === '8') return root + 12;
    if (c === '5') return root + dm(sc, 0, r + 4) - base;
    if (c === '3') return root + dm(sc, 0, r + 2) - base;
    if (c === '7') return root + dm(sc, 0, r + 6) - base;
    return root;
  }

  /* ================= sequencer ================= */
  var ARP = [0, 1, 2, 3, 4, 5, 4, 3, 1, 2, 3, 4, 5, 4, 3, 2], NIT = [0, 12, 7, 12];
  function Player(g, id, t0, st) {
    this.g = g; this.id = id; this.def = SONGS[id];
    this.S = makeSong(g, g.musicIn, this.def);
    this.t = t0; this.step = 0; this.bar = 0; this.pi = 0; this.prev = 0;
    this.bossOn = !!(this.def.run && st.boss && this.def.boss);
    this.seq = this.bossOn ? this.def.boss : this.def.seq;
    this.heat = this.def.run ? st.heat : 1;
  }
  Player.prototype.run = function (until, st) {
    var n = 0;
    while (this.t < until && n++ < 4096) this.tick(st);
  };
  Player.prototype.tick = function (st) {
    var def = this.def, run = !!def.run;
    if (this.step === 0) {
      var wb = !!(run && st.boss && def.boss);
      if (wb !== this.bossOn) { this.bossOn = wb; this.seq = wb ? def.boss : def.seq; this.pi = 0; this.bar = 0; }
      this.heat = run ? st.heat : 1;
    }
    var nit = run && st.nitro;
    var sd = 15 / (def.bpm * (this.bossOn ? 1.08 : 1) * (nit ? 1.1 : 1));
    var t = this.t + ((this.step & 1) ? (def.sw || 0) * sd : 0);
    this.play(def.parts[this.seq.charAt(this.pi)], t, sd, nit);
    this.t += sd;
    if (++this.step >= 16) { this.step = 0; if (++this.bar >= 8) { this.bar = 0; this.pi = (this.pi + 1) % this.seq.length; } }
  };
  Player.prototype.play = function (part, t, sd, nit) {
    var S = this.S, def = this.def, s = this.step, bar = this.bar, H = this.heat, boss = this.bossOn;
    var ct = part.chs[bar], r = (ct.length > 1 && s >= 8) ? ct[1] : ct[0];
    var sc = def.sc, dr = part.dr, heavy = !!def.heavy || boss || H >= 4, dv = def.dv || 1, v, c, n;
    var rock = def.fill !== 0, fill = rock && bar === 7 && s >= 12;
    // drums
    if ((v = dr.k[s])) kick(S, t, v * dv, heavy);
    else if (rock && H >= 4 && (s === 3 || s === 11)) kick(S, t, 0.6, heavy);
    if (fill) snare(S, t, (0.45 + (s - 12) * 0.17) * dv);
    else if (dr.s && (v = dr.s[s])) { snare(S, t, v * dv); if (H >= 4 && v > 0.5) clap(S, t, 0.7); }
    if (dr.c && (v = dr.c[s])) clap(S, t, v * dv);
    if (dr.h && (v = dr.h[s])) hat(S, t, v * dv, false);
    else if ((H >= 2 || nit) && (s & 1)) hat(S, t, 0.4 * dv, false);
    if (dr.o && (v = dr.o[s])) hat(S, t, v * dv, true);
    if (dr.z && (v = dr.z[s])) shaker(S, t, v);
    else if (H >= 2 && (s & 3) === 2) shaker(S, t, 0.6);
    if (dr.b && (v = dr.b[s])) sleigh(S, t, v);
    if (dr.m && (v = dr.m[s])) rim(S, t, v);
    if (dr.t && (v = dr.t[s])) tom(S, t, v, 110);
    if (s === 0 && def.crash !== 0 && (bar === 0 || (H >= 4 && (bar & 1) === 0) || (boss && (bar & 3) === 0))) crash(S, t, 0.85);
    if (rock && bar === 7 && (s === 8 || s === 10)) tom(S, t, 0.8, s === 8 ? 150 : 110);
    // bass
    c = part.b.charAt(s);
    if (c !== '.' && c !== '-') { n = len(part.b, s); bassNote(S, t, n * sd, bassMidi(def, r, c), 1, c === 'x'); }
    // comp
    c = part.c.charAt(s);
    if (c === 'x' || c === 'o') compChord(S, t, len(part.c, s) * sd, r, c === 'o' ? 0.7 : 1);
    // crystal arpeggio
    if (def.arp) {
      var a0 = fold(dm(sc, def.key, r), def.arp), a1 = fold(dm(sc, def.key, r + 2), def.arp), a2 = fold(dm(sc, def.key, r + 4), def.arp);
      if (a1 < a0) a1 += 12;
      if (a2 < a1) a2 += 12;
      var ai = ARP[s], am = ai === 0 ? a0 : ai === 1 ? a1 : ai === 2 ? a2 : ai === 3 ? a0 + 12 : ai === 4 ? a1 + 12 : a2 + 12;
      arpNote(S, t, am, (s & 3) === 0 ? 1 : 0.7);
    }
    // lead
    var mel = part.m[bar];
    c = mel.charAt(s);
    if (c !== '.' && c !== '-') {
      var d = dg(c);
      if (d > -8) {
        n = len(mel, s);
        var m = dm(sc, def.lk, d), du = n * sd * 0.92;
        leadNote(S, t, du, m, 1, this.prev);
        if (H >= 5) leadNote(S, t, du, m + 12, 0.42, 0, true);
        this.prev = m;
      }
    }
    // heat 3+: two-tone siren stabs on the off-beats
    if (H >= 3 && (s & 3) === 2) sirenStab(S, t, fold(dm(sc, def.key, (s & 7) === 2 ? r + 4 : r + 2), 72), 1);
    // nitro: driving 16th ostinato
    if (nit) nitroNote(S, t, fold(dm(sc, def.key, r), 60) + NIT[s & 3]);
  };

  /* ================= jingles ================= */
  var JDEF = { bpm: 120, sc: SC.maj, key: 36, lk: 60, cl: 60, bl: 36, inst: { l: 'pulse', b: 'rock', c: 'stab' }, lc: 6000, cc: 4000, wet: 0.16 };
  function jbell(S, t, m, lvl, dec) { var x = voice(S.g, S.out, t); bell(x, t, mtof(m), lvl, dec); }
  function wah(S, t, d, m, vib) {
    var x = voice(S.g, S.lead, t), g = G(x, x.out), fl = F(x, 'lowpass', 400, 4, g);
    var end = adsr(g.gain, t, 0.075, 0.02, 0.1, 0.8, d, 0.12);
    fl.frequency.setValueAtTime(350, t); fl.frequency.linearRampToValueAtTime(1500, t + 0.08);
    fl.frequency.exponentialRampToValueAtTime(450, t + d);
    var o = O(x, 'sawtooth', mtof(m), t, end + 0.02, fl);
    if (vib) addVib(x, o, t + 0.15, end + 0.02, 45, 6);
  }
  var JING = {
    clear: function (S, t) {
      var L = [[0, 67, 0.08], [0.1, 67, 0.08], [0.2, 67, 0.08], [0.3, 72, 0.3], [0.64, 74, 0.13], [0.8, 77, 0.13], [0.96, 79, 1.15]], i;
      for (i = 0; i < L.length; i++) { leadNote(S, t + L[i][0], L[i][2], L[i][1], 1.3, 0, i < 6); leadNote(S, t + L[i][0], L[i][2], L[i][1] - 12, 0.55, 0, true); }
      stabChord(S, t + 0.3, 0.3, [60, 64, 67], 1.4); stabChord(S, t + 0.64, 0.13, [58, 62, 65], 1.4);
      stabChord(S, t + 0.8, 0.13, [58, 62, 65], 1.4);
      var x = voice(S.g, S.comp, t + 0.96), g = G(x, x.out), end = adsr(g.gain, t + 0.96, 0.05, 0.01, 0.3, 0.6, 1.1, 0.4), ns = [60, 64, 67, 72];
      for (i = 0; i < 4; i++) O(x, 'sawtooth', mtof(ns[i]), t + 0.96, end + 0.02, g).detune.value = i * 3 - 4;
      bassNote(S, t + 0.3, 0.3, 48, 1.2); bassNote(S, t + 0.64, 0.13, 46, 1.2); bassNote(S, t + 0.8, 0.13, 46, 1.2); bassNote(S, t + 0.96, 1.1, 36, 1.3);
      for (i = 0; i < 6; i++) snare(S, t + i * 0.05, 0.3 + i * 0.12);
      kick(S, t + 0.3, 1); crash(S, t + 0.3, 1); kick(S, t + 0.64, 0.8); kick(S, t + 0.8, 0.8); kick(S, t + 0.96, 1.1, true); crash(S, t + 0.96, 1.3);
      var sp = [84, 88, 91, 96, 100];
      for (i = 0; i < sp.length; i++) arpNote(S, t + 1.08 + i * 0.07, sp[i], 1.4);
      return 2.5;
    },
    wreck: function (S, t) {
      var ns = [67, 66, 65, 64], i;
      for (i = 0; i < 4; i++) {
        var d = i === 3 ? 0.85 : 0.32;
        wah(S, t + i * 0.38, d, ns[i], i === 3);
        bassNote(S, t + i * 0.38, d, ns[i] - 24, 0.9);
      }
      kick(S, t + 1.14, 0.7); tom(S, t + 1.14, 0.6, 70);
      return 2.1;
    },
    unlock: function (S, t) {
      var fs = [72, 76, 79, 84, 88, 91, 96], i;
      for (i = 0; i < fs.length; i++) jbell(S, t + i * 0.06, fs[i], 0.075, 0.6);
      var x = voice(S.g, S.out, t), g = G(x, x.out), end = adsr(g.gain, t + 0.3, 0.03, 0.1, 0.2, 0.8, 0.45, 0.7), ns = [84, 88, 91];
      for (i = 0; i < 3; i++) O(x, 'sine', mtof(ns[i]), t + 0.3, end + 0.02, g);
      for (i = 0; i < 6; i++) sleigh(S, t + 0.1 + i * 0.08, 1 - i * 0.12);
      return 1.6;
    },
    stars: function (S, t) {
      jbell(S, t, 88, 0.09, 0.5); jbell(S, t + 0.09, 95, 0.09, 0.6); jbell(S, t + 0.2, 100, 0.04, 0.4);
      sleigh(S, t + 0.1, 0.9);
      return 0.8;
    }
  };

  /* ================= sound effects ================= */
  function blip(v, t, f, lvl, dur, type, f2, dest) {
    var g = G(v, dest || v.out); env(g.gain, t, lvl, 0.003, dur);
    var o = O(v, type || 'square', f, t, t + dur + 0.03, g);
    if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + dur);
    return o;
  }
  function bell(v, t, f, lvl, dec, dest) {
    var d = dest || v.out, g = G(v, d), g2 = G(v, d);
    env(g.gain, t, lvl, 0.002, dec); O(v, 'sine', f, t, t + dec + 0.03, g);
    env(g2.gain, t, lvl * 0.3, 0.001, dec * 0.4); O(v, 'sine', f * 2.76, t, t + dec * 0.4 + 0.03, g2);
  }
  function nz(v, t, dur, lvl, type, f, q, a, dest) {
    a = a || 0.002;
    var g = G(v, dest || v.out); env(g.gain, t, lvl, a, dur);
    var fl = F(v, type, f, q, g); N(v, t, t + a + dur + 0.03, fl);
    return fl;
  }
  function thump(v, t, f1, f2, dur, lvl) {
    var g = G(v, v.out); env(g.gain, t, lvl, 0.003, dur);
    var o = O(v, 'sine', f1, t, t + dur + 0.03, g); o.frequency.exponentialRampToValueAtTime(f2, t + dur * 0.6);
    return o;
  }
  function metal(v, t, fs, lvl, dec, type, k) {
    var g = G(v, v.out), i; env(g.gain, t, lvl, 0.001, dec); k = k || 1;
    for (i = 0; i < fs.length; i++) O(v, type || 'square', fs[i] * k, t, t + dec + 0.03, g);
  }
  function boom(v, t, s) {
    thump(v, t, 95, 28, 0.9, 0.7 * s);
    var f = nz(v, t, 1.2, 0.6 * s, 'lowpass', 3000, 0.8, 0.004);
    f.frequency.setValueAtTime(3200, t); f.frequency.exponentialRampToValueAtTime(160, t + 1.1);
    nz(v, t, 1.7, 0.45 * s, 'lowpass', 140, 0.7, 0.06);
    nz(v, t + 0.04, 0.35, 0.18 * s, 'bandpass', 1300, 1.2);
  }
  function amt(a, lo) { return a == null || isNaN(a) ? 1 : lo + (1 - lo) * clamp(+a, 0, 1); }

  var SE = {
    tap: function (v) { blip(v, v.t, 1500, 0.2, 0.05, 'triangle', 1000); },
    buy: function (v) {
      var t = v.t; nz(v, t, 0.04, 0.25, 'highpass', 3000, 0.7);
      blip(v, t + 0.02, 1320, 0.12, 0.08, 'square'); bell(v, t + 0.05, 1760, 0.22, 0.4); bell(v, t + 0.12, 2637, 0.2, 0.55);
    },
    upgrade: function (v) {
      var t = v.t, fs = [523, 659, 784, 1047, 1319], i;
      for (i = 0; i < 5; i++) blip(v, t + i * 0.055, fs[i], 0.12, 0.09, 'square');
      blip(v, t, 300, 0.07, 0.35, 'triangle', 1400); bell(v, t + 0.28, 2093, 0.18, 0.5);
    },
    // tuning bay (11/17): a ratchet's ガチャガチャ when a point goes in, a looser one when it comes out, a ding at a full stat,
    // a till for a new point, and a tool clatter when all points come back
    ratchet: function (v) {
      var t = v.t, i;
      for (i = 0; i < 6; i++) { var s = t + i * 0.045, k = rnd(0.92, 1.08); nz(v, s, 0.025, 0.32, 'highpass', 3600 * k, 0.9, 0.001); metal(v, s, [1180, 1870, 2650], 0.05, 0.05, 'square', k); }
      thump(v, t + 0.27, 210, 90, 0.08, 0.3);
    },
    unbolt: function (v) {
      var t = v.t, i;
      for (i = 0; i < 4; i++) { var s = t + i * 0.06, k = rnd(0.9, 1.1); nz(v, s, 0.03, 0.26, 'bandpass', 2200 * k, 1.1, 0.001); metal(v, s, [780, 1240], 0.04, 0.06, 'square', k); }
    },
    statMax: function (v) {
      var t = v.t; SE.ratchet(v);
      bell(v, t + 0.3, 1568, 0.2, 0.5); bell(v, t + 0.38, 2349, 0.18, 0.6); blip(v, t + 0.3, 784, 0.1, 0.12, 'square');
    },
    ptBuy: function (v) {
      var t = v.t; thump(v, t, 160, 70, 0.1, 0.32); nz(v, t + 0.02, 0.06, 0.22, 'highpass', 2800, 0.7);
      bell(v, t + 0.06, 2093, 0.22, 0.45); bell(v, t + 0.06, 2637, 0.14, 0.5); blip(v, t + 0.14, 1047, 0.1, 0.1, 'square');
    },
    respec: function (v) {
      var t = v.t, i;
      var f = nz(v, t, 0.35, 0.3, 'bandpass', 2600, 1.1); f.frequency.setValueAtTime(2600, t); f.frequency.exponentialRampToValueAtTime(500, t + 0.3);
      for (i = 0; i < 5; i++) { var s = t + 0.05 + i * 0.05 + rnd(0, 0.02), k = rnd(0.8, 1.2); metal(v, s, [640, 1020, 1530], 0.05, 0.12, 'square', k); }
      thump(v, t + 0.3, 140, 60, 0.12, 0.34);
    },
    denied: function (v) {
      for (var i = 0; i < 2; i++) {
        var s = v.t + i * 0.13, g = G(v, v.out), fl = F(v, 'lowpass', 900, 1, g);
        env(g.gain, s, 0.17, 0.006, 0.1); O(v, 'square', 150, s, s + 0.13, fl); O(v, 'sawtooth', 157, s, s + 0.13, fl);
      }
    },
    ride: function (v) {
      var t = v.t, g = G(v, v.out), fl = F(v, 'lowpass', 900, 3, g);
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.32, t + 0.03); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.5);
      fl.frequency.setValueAtTime(600, t); fl.frequency.linearRampToValueAtTime(1800, t + 0.12); fl.frequency.exponentialRampToValueAtTime(500, t + 0.45);
      var o = O(v, 'sawtooth', 70, t, t + 0.52, fl); o.frequency.linearRampToValueAtTime(175, t + 0.12); o.frequency.exponentialRampToValueAtTime(90, t + 0.45);
      var o2 = O(v, 'square', 35, t, t + 0.52, fl); o2.frequency.linearRampToValueAtTime(88, t + 0.12); o2.frequency.exponentialRampToValueAtTime(45, t + 0.45);
    },
    crash: function (v, a) {
      var t = v.t, k = rnd(0.88, 1.12), s = amt(a, 0.6);
      thump(v, t, 170 * k, 55, 0.14, 0.42 * s); nz(v, t, 0.26, 0.48 * s, 'bandpass', 2300 * k, 0.9);
      nz(v, t, 0.12, 0.35 * s, 'lowpass', 600, 0.7); metal(v, t, [383, 587, 971, 1433], 0.07 * s, 0.14, 'square', k);
    },
    bigcrash: function (v) {
      var t = v.t, i; thump(v, t, 130, 34, 0.55, 0.6); nz(v, t, 0.7, 0.45, 'lowpass', 900, 0.7);
      for (i = 0; i < 3; i++) {
        var s = t + i * 0.085, k = rnd(0.85, 1.15);
        nz(v, s, 0.32, 0.36, 'bandpass', 2000 * k + i * 500, 0.8); metal(v, s, [311, 523, 877, 1291], 0.06, 0.18, 'square', k);
      }
      for (i = 0; i < 6; i++) bell(v, t + 0.05 + Math.random() * 0.35, rnd(2600, 5600), 0.05, 0.12);
    },
    explode: function (v, a) { boom(v, v.t, amt(a, 0.5)); },
    train: function (v) {
      var t = v.t, g = G(v, v.out), fl = F(v, 'bandpass', 700, 0.7, g), i;
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.42, t + 0.75); g.gain.linearRampToValueAtTime(0, t + 1.95);
      fl.frequency.setValueAtTime(500, t); fl.frequency.linearRampToValueAtTime(1500, t + 0.75); fl.frequency.linearRampToValueAtTime(450, t + 1.95);
      N(v, t, t + 2, fl);
      var ct = [0.3, 0.42, 0.66, 0.78, 1.02, 1.14, 1.38, 1.5];
      for (i = 0; i < ct.length; i++) nz(v, t + ct[i], 0.08, 0.3 * (1 - Math.abs(ct[i] - 0.85) / 1.1), 'lowpass', 500, 1.5);
      var hg = G(v, v.out), hl = F(v, 'lowpass', 1800, 0.7, hg);
      hg.gain.setValueAtTime(0, t + 0.1); hg.gain.linearRampToValueAtTime(0.11, t + 0.18); hg.gain.setValueAtTime(0.11, t + 1.0); hg.gain.linearRampToValueAtTime(0, t + 1.2);
      for (i = 0; i < 2; i++) {
        var f0 = i ? 370 : 311, o = O(v, 'sawtooth', f0 * 1.04, t + 0.1, t + 1.25, hl);
        o.frequency.linearRampToValueAtTime(f0, t + 0.75); o.frequency.linearRampToValueAtTime(f0 * 0.93, t + 1.15);
      }
    },
    railbell: function (v) {
      var t = v.t, g = G(v, v.out), p = g.gain, i, s, f = 820;
      p.setValueAtTime(0, t);
      for (i = 0; i < 5; i++) { s = t + i * 0.32; p.linearRampToValueAtTime(0.27, s + 0.004); p.exponentialRampToValueAtTime(0.02, s + 0.3); }
      p.exponentialRampToValueAtTime(0.0001, t + 1.75);
      O(v, 'sine', f, t, t + 1.78, g); O(v, 'sine', f * 2.24, t, t + 1.78, G(v, g, 0.45)); O(v, 'triangle', f * 3.07, t, t + 1.78, G(v, g, 0.22));
    },
    tackle: function (v) {
      var t = v.t; thump(v, t, 140, 52, 0.18, 0.55); nz(v, t, 0.12, 0.35, 'lowpass', 900, 0.8); metal(v, t, [300, 470, 730], 0.06, 0.1, 'triangle');
    },
    hit: function (v) {
      var t = v.t, i; thump(v, t, 105, 38, 0.32, 0.65); nz(v, t, 0.26, 0.42, 'bandpass', 1500, 0.8);
      metal(v, t, [520, 830, 1250], 0.05, 0.16, 'square');
      for (i = 0; i < 5; i++) bell(v, t + 0.02 + Math.random() * 0.25, rnd(3000, 6200), 0.06, 0.14);
    },
    wall: function (v) {
      var t = v.t, g = G(v, v.out), fl = F(v, 'bandpass', 2600, 3, g);
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.4, t + 0.02); g.gain.setValueAtTime(0.4, t + 0.2); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.4);
      N(v, t, t + 0.42, fl); O(v, 'square', 23, t, t + 0.42, G(v, fl.frequency, 700));
      blip(v, t, 1900, 0.03, 0.35, 'sawtooth', 1650);
    },
    near: function (v) {
      var t = v.t, pn = P(v, -0.7, v.out), g = G(v, pn), fl = F(v, 'bandpass', 450, 1.2, g);
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.4, t + 0.11); g.gain.linearRampToValueAtTime(0, t + 0.34);
      fl.frequency.setValueAtTime(450, t); fl.frequency.exponentialRampToValueAtTime(2400, t + 0.12); fl.frequency.exponentialRampToValueAtTime(700, t + 0.33);
      if (pn !== v.out) { pn.pan.setValueAtTime(-0.7, t); pn.pan.linearRampToValueAtTime(0.7, t + 0.32); }
      N(v, t, t + 0.36, fl);
    },
    nitroReady: function (v) {
      var t = v.t, fs = [1319, 1661, 1976, 2637, 3322], i;
      for (i = 0; i < 5; i++) bell(v, t + i * 0.045, fs[i], 0.13, 0.28);
      nz(v, t, 0.45, 0.07, 'highpass', 7000, 0.7, 0.05);
    },
    // full-speed flow (21回目): an airy "ヒュオッ" each time the speed lines step up a stage (a = the stage, 1 or 2)
    whoosh: function (v, a) {
      var t = v.t, k = clamp(Math.round(+a || 1), 1, 2), f = nz(v, t, 0.6, 0.3, 'bandpass', 420, 1.3, 0.14);
      f.frequency.setValueAtTime(420, t); f.frequency.exponentialRampToValueAtTime(2200 * k, t + 0.45);
      if (k >= 2) { bell(v, t + 0.16, 1760, 0.045, 0.32); bell(v, t + 0.22, 2637, 0.035, 0.3); }
    },
    // nitro shockwave (21回目): a deep ドォン with a crumbling rush, played with the nitro start and when nitro smashes the roadside
    shock: function (v, a) {
      var t = v.t, k = clamp(+a || 1, 0.3, 1); thump(v, t, 72, 28, 0.55, 0.8 * k);
      var f = nz(v, t, 0.65, 0.42 * k, 'lowpass', 2600, 0.8, 0.004); f.frequency.setValueAtTime(2600, t); f.frequency.exponentialRampToValueAtTime(150, t + 0.55);
      nz(v, t + 0.03, 0.28, 0.16 * k, 'highpass', 3200, 0.7, 0.004);
    },
    nitroGo: function (v) {
      var t = v.t; thump(v, t, 85, 42, 0.3, 0.5);
      var f = nz(v, t, 0.35, 0.4, 'lowpass', 300, 1, 0.02); f.frequency.setValueAtTime(300, t); f.frequency.exponentialRampToValueAtTime(6000, t + 0.2);
      var g = G(v, v.out), b = F(v, 'bandpass', 520, 0.8, g);
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.42, t + 0.1); g.gain.setValueAtTime(0.42, t + 0.45); g.gain.exponentialRampToValueAtTime(0.0001, t + 1.4);
      N(v, t, t + 1.45, b);
      var g2 = G(v, v.out), l2 = F(v, 'lowpass', 700, 1, g2);
      g2.gain.setValueAtTime(0, t); g2.gain.linearRampToValueAtTime(0.16, t + 0.08); g2.gain.exponentialRampToValueAtTime(0.0001, t + 1.2);
      O(v, 'sawtooth', 55, t, t + 1.25, l2).frequency.exponentialRampToValueAtTime(120, t + 0.4);
    },
    coin: function (v, a) {
      var t = v.t, n = clamp(Math.round(+a || 1), 1, 5), k = Math.pow(2, (n - 1) * 2 / 12);
      blip(v, t, 1047 * k, 0.14, 0.05, 'square'); blip(v, t + 0.055, 1568 * k, 0.14, 0.2, 'square');
      if (n >= 3) bell(v, t + 0.06, 3136 * k, 0.05, 0.2);
    },
    star: function (v) {
      var t = v.t, i; for (i = 0; i < 4; i++) blip(v, t + i * 0.075, i & 1 ? 1175 : 880, 0.13, 0.065, v.g.pw25);
      bell(v, t + 0.3, 1760, 0.14, 0.35);
    },
    warn: function (v) {
      var t = v.t; blip(v, t, 1760, 0.2, 0.16, 'triangle'); blip(v, t + 0.07, 2349, 0.2, 0.25, 'triangle'); blip(v, t, 880, 0.05, 0.12, 'square');
    },
    spike: function (v) {
      var t = v.t; nz(v, t, 0.03, 0.55, 'highpass', 1500, 0.7); thump(v, t, 420, 120, 0.06, 0.4);
      var g = G(v, v.out), f = F(v, 'highpass', 4000, 0.7, g);
      g.gain.setValueAtTime(0, t + 0.02); g.gain.linearRampToValueAtTime(0.2, t + 0.04); g.gain.exponentialRampToValueAtTime(0.0001, t + 1.0);
      N(v, t + 0.02, t + 1.02, f);
    },
    bossIn: function (v) {
      var t = v.t, i;
      for (i = 0; i < 3; i++) {
        var s = t + i * 0.46, g = G(v, v.out), fl = F(v, 'lowpass', 400, 2, g);
        g.gain.setValueAtTime(0, s); g.gain.linearRampToValueAtTime(0.26, s + 0.05); g.gain.setValueAtTime(0.26, s + 0.3); g.gain.linearRampToValueAtTime(0, s + 0.4);
        fl.frequency.setValueAtTime(300, s); fl.frequency.linearRampToValueAtTime(1400, s + 0.15); fl.frequency.linearRampToValueAtTime(700, s + 0.4);
        O(v, 'sawtooth', 110, s, s + 0.42, fl); O(v, 'sawtooth', 116.5, s, s + 0.42, fl); O(v, 'square', 55, s, s + 0.42, fl);
        blip(v, s, 660, 0.05, 0.16, 'square'); blip(v, s + 0.18, 880, 0.05, 0.16, 'square');
      }
      thump(v, t, 70, 30, 0.6, 0.4);
    },
    bossHit: function (v) {
      var t = v.t; metal(v, t, [523, 1187, 1873, 2711, 3510], 0.12, 0.45, 'triangle', rnd(0.95, 1.05));
      nz(v, t, 0.02, 0.3, 'highpass', 2500, 0.7); thump(v, t, 210, 90, 0.1, 0.35);
    },
    bossDown: function (v) {
      var t = v.t, fs = [1047, 1319, 1568, 2093, 2637, 3136], i;
      boom(v, t, 1.1); boom(v, t + 0.28, 0.7);
      for (i = 0; i < fs.length; i++) bell(v, t + 0.55 + i * 0.06, fs[i], 0.11, 0.5);
    },
    bonk: function (v) {
      var t = v.t; blip(v, t, 700, 0.32, 0.12, 'sine', 220); blip(v, t + 0.13, 820, 0.28, 0.15, 'sine', 260);
      blip(v, t, 1200, 0.1, 0.03, 'triangle'); blip(v, t + 0.13, 1350, 0.08, 0.03, 'triangle');
    },
    drum: function (v) {
      var t = v.t; thump(v, t, 150, 92, 0.35, 0.5); metal(v, t, [262, 415, 611], 0.1, 0.5, 'triangle'); nz(v, t, 0.08, 0.28, 'lowpass', 1200, 0.8);
    },
    heal: function (v) {
      var t = v.t, fs = [784, 988, 1175, 1568], i;
      for (i = 0; i < 4; i++) {
        var s = t + i * 0.08, g = G(v, v.out);
        g.gain.setValueAtTime(0, s); g.gain.linearRampToValueAtTime(0.11, s + 0.03); g.gain.exponentialRampToValueAtTime(0.0001, s + 0.6);
        O(v, 'sine', fs[i], s, s + 0.62, g);
      }
      blip(v, t, 600, 0.04, 0.5, 'sine', 1200);
    },
    crush: function (v) {
      var t = v.t, g = G(v, v.out); env(g.gain, t, 0.5, 0.005, 0.5);
      var am = G(v, g, 0.5), f = F(v, 'lowpass', 1500, 0.7, am);
      N(v, t, t + 0.55, f); O(v, 'square', 28, t, t + 0.55, G(v, am.gain, 0.5));
      thump(v, t, 85, 34, 0.42, 0.6); metal(v, t, [211, 331, 472], 0.06, 0.25, 'square');
    },
    busted: function (v) {
      for (var i = 0; i < 6; i++) blip(v, v.t + i * 0.07, i & 1 ? 784 : 1047, 0.13, 0.06, 'square');
    },
    gomi: function (v) {
      var t = v.t, g = G(v, v.out), f = F(v, 'bandpass', 300, 2, g);
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.36, t + 0.45); g.gain.linearRampToValueAtTime(0, t + 0.7);
      f.frequency.setValueAtTime(300, t); f.frequency.exponentialRampToValueAtTime(2600, t + 0.6);
      N(v, t, t + 0.72, f);
      blip(v, t + 0.05, 180, 0.08, 0.6, 'sine', 900); blip(v, t + 0.66, 900, 0.12, 0.06, 'sine', 1400);
    },
    container: function (v) {
      var t = v.t; thump(v, t, 62, 27, 1.0, 0.85); nz(v, t, 0.8, 0.6, 'lowpass', 700, 0.7);
      metal(v, t, [98, 147, 233, 371, 587], 0.15, 1.4, 'triangle'); metal(v, t, [741, 1129], 0.07, 0.3, 'square');
      nz(v, t, 0.5, 0.2, 'bandpass', 2500, 1);
    },
    ice: function (v) {
      var t = v.t, f = nz(v, t, 0.3, 0.24, 'bandpass', 6000, 1.5, 0.03);
      f.frequency.setValueAtTime(6000, t); f.frequency.exponentialRampToValueAtTime(2500, t + 0.3);
      blip(v, t, 3000, 0.03, 0.25, 'sine', 2000);
    },
    skid: function (v) {
      var t = v.t, f = nz(v, t, 0.5, 0.5, 'bandpass', 2000, 12, 0.02);
      f.frequency.setValueAtTime(2200, t); f.frequency.linearRampToValueAtTime(1800, t + 0.5);
      var g = G(v, v.out); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.06, t + 0.03); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.5);
      var o = O(v, 'triangle', 1250, t, t + 0.52, g); o.frequency.linearRampToValueAtTime(1050, t + 0.5);
      O(v, 'sine', 17, t, t + 0.52, G(v, o.frequency, 45));
    },
    mission: function (v) {
      var t = v.t, w = v.g.pw25; blip(v, t, 1047, 0.13, 0.08, w); blip(v, t + 0.09, 1319, 0.13, 0.08, w); blip(v, t + 0.18, 1568, 0.14, 0.32, w);
      bell(v, t + 0.18, 3136, 0.06, 0.4);
    },
    newTitle: function (v) {
      var t = v.t, fs = [784, 1047, 1319, 1568], i;
      for (i = 0; i < 4; i++) { var d = i === 3 ? 0.55 : 0.09; blip(v, t + i * 0.1, fs[i], 0.1, d, 'square'); blip(v, t + i * 0.1, fs[i] / 2, 0.08, d, 'triangle'); }
      bell(v, t + 0.32, 3136, 0.07, 0.5); bell(v, t + 0.42, 4186, 0.05, 0.5);
    },
    stamp: function (v) {
      var t = v.t; thump(v, t, 115, 44, 0.3, 0.7); nz(v, t, 0.13, 0.5, 'lowpass', 700, 0.7); nz(v, t, 0.05, 0.25, 'bandpass', 1800, 1);
    },
    goal: function (v) {
      var t = v.t, g = G(v, v.out), am = G(v, g, 0.6), i, fs = [523, 659, 784, 1047];
      env(g.gain, t, 0.16, 0.01, 0.4); O(v, 'sine', 2150, t, t + 0.43, am); O(v, 'square', 26, t, t + 0.43, G(v, am.gain, 0.4));
      var h = G(v, v.out), hl = F(v, 'lowpass', 2600, 0.7, h); env(h.gain, t, 0.1, 0.005, 0.35);
      for (i = 0; i < 4; i++) O(v, 'sawtooth', fs[i], t, t + 0.38, hl);
      nz(v, t, 0.6, 0.14, 'highpass', 5000, 0.7);
    },
    unlockTown: function (v) {
      var t = v.t, fs = [1047, 1319, 1568, 2093, 2637], i;
      for (i = 0; i < 5; i++) bell(v, t + i * 0.05, fs[i], 0.12, 0.35);
      nz(v, t + 0.1, 0.5, 0.06, 'highpass', 7000, 0.7, 0.05);
    }
  };
  // minimum seconds between two plays of the same effect
  var RL = { coin: 0.05, crash: 0.05, near: 0.08, explode: 0.08, bigcrash: 0.1, container: 0.15, train: 0.6, railbell: 0.8,
    bossIn: 0.6, bossDown: 0.6, nitroGo: 0.2, whoosh: 0.3, shock: 0.12, wall: 0.06, skid: 0.1, ice: 0.08, stamp: 0.1 };
  var MAXV = 14;
  // per-effect output trims (balance the bus: effects peak ~0.4-0.85 before the master)
  var SEG = { tap: 2.5, buy: 1.7, upgrade: 2.2, denied: 1.9, ratchet: 2.4, unbolt: 2.4, statMax: 2.2, ptBuy: 1.9, respec: 2.2, crash: 0.9, explode: 0.85, train: 1.35, railbell: 1.15, wall: 2.4, near: 2.6,
    nitroReady: 2, nitroGo: 1.4, whoosh: 2.2, shock: 1.1, coin: 3, star: 2.6, warn: 2.1, spike: 0.8, bossIn: 0.85, bossDown: 0.8, bonk: 1.5, heal: 2.8,
    busted: 3.5, gomi: 2.8, container: 0.8, ice: 2.8, skid: 4, mission: 2.3, newTitle: 2.1, goal: 1.5, unlockTown: 2.2 };
  var JT = { clear: 1, wreck: 1.6, unlock: 2, stars: 2.5 };

  // rate limit + voice cap, shared by the live API and the offline 'mix' render (pool = {act:[], last:{}})
  function seFire(g, pool, name, now, amount) {
    var lim = RL[name] || 0.045, lt = pool.last[name], act = pool.act, i;
    if (lt !== undefined && now >= lt && now - lt < lim) return;
    pool.last[name] = now;
    for (i = act.length - 1; i >= 0; i--) if (act[i].dead || act[i].end < now) act.splice(i, 1);
    while (act.length >= MAXV) steal(act.shift(), now);
    act.push(fireSe(g, name, now + 0.005, amount));
  }
  function fireSe(g, name, t, amount) {
    var v = voice(g, g.seVol, t, true);
    v.out.gain.value = SEG[name] || 1;
    SE[name](v, amount);
    return v;
  }
  function fireJingle(g, id, t) {
    var S = makeSong(g, g.jingleIn, JDEF);
    S.out.gain.value = JT[id] || 1;
    return { S: S, dur: JING[id](S, t) };
  }

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
