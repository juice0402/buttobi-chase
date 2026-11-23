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

