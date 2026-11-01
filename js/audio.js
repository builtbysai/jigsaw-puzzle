/* Sound effects synthesized with Web Audio: no files to download. */
(function (G) {
  "use strict";

  var ctx = null, master = null, enabled = true, noiseBuf = null;

  function ensure() {
    if (!ctx) {
      var AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      try {
        ctx = new AC();
        master = ctx.createGain();
        master.gain.value = 0.5;
        master.connect(ctx.destination);
        noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 0.5, ctx.sampleRate);
        var d = noiseBuf.getChannelData(0);
        for (var i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      } catch (e) { ctx = null; return null; }
    }
    if (ctx.state === "suspended") ctx.resume();
    return ctx;
  }

  function tone(freq, t0, dur, type, vol, slideTo) {
    var o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type || "sine";
    o.frequency.setValueAtTime(freq, t0);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol, t0 + 0.006);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g); g.connect(master);
    o.start(t0); o.stop(t0 + dur + 0.02);
  }

  function click(t0, dur, vol, freq, q) {
    var s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
    s.buffer = noiseBuf;
    f.type = "bandpass"; f.frequency.value = freq; f.Q.value = q || 1.2;
    g.gain.setValueAtTime(vol, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    s.connect(f); f.connect(g); g.connect(master);
    s.start(t0, Math.random() * 0.3); s.stop(t0 + dur + 0.02);
  }

  function pitch(combo) { return Math.pow(2, Math.min(Math.max(combo, 1) - 1, 9) / 12); }

  function play(fn) { if (!enabled) return; if (!ensure()) return; fn(ctx.currentTime); }

  G.Sound = {
    unlock: function () { ensure(); },
    setEnabled: function (b) { enabled = !!b; },
    isEnabled: function () { return enabled; },
    pickup: function () { play(function (t) { click(t, 0.05, 0.12, 2400, 0.9); tone(220, t, 0.06, "sine", 0.05, 300); }); },
    drop: function () { play(function (t) { tone(150, t, 0.09, "sine", 0.1, 90); click(t, 0.03, 0.05, 900, 0.8); }); },
    snap: function (combo) {
      play(function (t) {
        var p = pitch(combo);
        click(t, 0.04, 0.28, 1700 * p, 1.4);
        tone(340 * p, t, 0.11, "triangle", 0.2, 170 * p);
      });
    },
    merge: function (combo, size) {
      play(function (t) {
        var p = pitch(combo);
        click(t, 0.04, 0.24, 1500 * p, 1.3);
        tone(330 * p, t, 0.1, "triangle", 0.16, 165 * p);
        tone(659 * p, t + 0.03, 0.34, "sine", 0.11);
        tone(988 * p, t + 0.07, 0.4, "sine", 0.08);
        if (size > 6) tone(1318 * p, t + 0.11, 0.5, "sine", 0.06);
      });
    },
    hint: function () { play(function (t) { tone(880, t, 0.5, "sine", 0.1); tone(1320, t + 0.08, 0.5, "sine", 0.06); }); },
    undo: function () { play(function (t) { tone(520, t, 0.12, "triangle", 0.09, 300); }); },
    tidy: function () { play(function (t) { for (var i = 0; i < 6; i++) click(t + i * 0.035, 0.04, 0.07, 1400 + i * 120, 1); }); },
    win: function () {
      play(function (t) {
        var notes = [523.25, 659.25, 783.99, 1046.5, 1318.5];
        notes.forEach(function (f, i) { tone(f, t + i * 0.11, 0.7, "triangle", 0.17); tone(f * 2, t + i * 0.11, 0.5, "sine", 0.05); });
        [523.25, 659.25, 783.99, 1046.5].forEach(function (f) { tone(f, t + 0.7, 1.4, "sine", 0.1); });
      });
    },
    tick: function () { play(function (t) { click(t, 0.025, 0.08, 3000, 1); }); }
  };
})(window.JP = window.JP || {});
