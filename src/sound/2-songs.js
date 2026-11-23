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

