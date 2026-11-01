/* Original illustrated puzzle scenes, drawn entirely in code.
   Each theme is a function(ctx, w, h, rand) that paints a full picture.
   Same theme + same seed always gives the same picture, at any resolution.
   Themes 1-6 live here; themes 7-13 are in art2.js. */
(function (G) {
  "use strict";

  var TAU = G.TAU;

  /* ---------------- drawing helpers (shared with art2.js) ---------------- */
  var A = G.A = {};

  A.hsl = function (h, s, l, a) {
    h = ((h % 360) + 360) % 360;
    return a === undefined ? "hsl(" + h.toFixed(1) + "," + s + "%," + l + "%)"
                           : "hsla(" + h.toFixed(1) + "," + s + "%," + l + "%," + a + ")";
  };
  A.pick = function (r, arr) { return arr[Math.floor(r() * arr.length)]; };
  A.range = function (r, a, b) { return a + (b - a) * r(); };
  A.lin = function (c, x0, y0, x1, y1, stops) {
    var g = c.createLinearGradient(x0, y0, x1, y1);
    for (var i = 0; i < stops.length; i++) g.addColorStop(stops[i][0], stops[i][1]);
    return g;
  };
  A.rad = function (c, x, y, r0, r1, stops) {
    var g = c.createRadialGradient(x, y, r0, x, y, r1);
    for (var i = 0; i < stops.length; i++) g.addColorStop(stops[i][0], stops[i][1]);
    return g;
  };
  A.disc = function (c, x, y, rr, fill) {
    c.fillStyle = fill; c.beginPath(); c.arc(x, y, rr, 0, TAU); c.fill();
  };
  A.ell = function (c, x, y, rx, ry, rot, fill) {
    c.fillStyle = fill; c.beginPath(); c.ellipse(x, y, rx, ry, rot || 0, 0, TAU); c.fill();
  };

  /* ridge line as an array of y values, one every `step` px */
  A.ridge = function (w, step, base, amp, r, sharp) {
    var f1 = (2 + r() * 2.4) / w * Math.PI * (sharp || 1);
    var f2 = (6 + r() * 4) / w * Math.PI;
    var f3 = (14 + r() * 8) / w * Math.PI;
    var p1 = r() * TAU, p2 = r() * TAU, p3 = r() * TAU;
    var ys = [];
    for (var x = 0; x <= w + step; x += step) {
      var v = 0.62 * (1 - Math.abs(Math.sin(x * f1 + p1)))
            + 0.28 * (0.5 + 0.5 * Math.sin(x * f2 + p2))
            + 0.10 * Math.sin(x * f3 + p3);
      ys.push(base - amp * v);
    }
    return ys;
  };
  A.fillRidge = function (c, ys, step, bottom, fill) {
    c.fillStyle = fill;
    c.beginPath();
    c.moveTo(0, bottom);
    for (var i = 0; i < ys.length; i++) c.lineTo(i * step, ys[i]);
    c.lineTo((ys.length - 1) * step, bottom);
    c.closePath();
    c.fill();
  };
  A.strokeRidge = function (c, ys, step, stroke, lw) {
    c.strokeStyle = stroke; c.lineWidth = lw;
    c.beginPath();
    for (var i = 0; i < ys.length; i++) { if (i) c.lineTo(i * step, ys[i]); else c.moveTo(0, ys[0]); }
    c.stroke();
  };

  A.stars = function (c, w, maxY, r, n, minA) {
    var u = w / 2000;
    for (var i = 0; i < n; i++) {
      var x = r() * w, y = Math.pow(r(), 1.25) * maxY;
      var big = r() < 0.05;
      var s = (big ? A.range(r, 1.8, 3.2) : A.range(r, 0.5, 1.5)) * Math.max(0.8, u * 1.4);
      c.globalAlpha = A.range(r, minA || 0.35, 1) * (1 - 0.5 * (y / maxY));
      c.fillStyle = r() < 0.2 ? "#ffe9c4" : r() < 0.3 ? "#cfe0ff" : "#ffffff";
      c.beginPath(); c.arc(x, y, s, 0, TAU); c.fill();
      if (big) {
        c.strokeStyle = c.fillStyle; c.lineWidth = Math.max(0.6, s * 0.35);
        c.beginPath(); c.moveTo(x - s * 3.2, y); c.lineTo(x + s * 3.2, y); c.moveTo(x, y - s * 3.2); c.lineTo(x, y + s * 3.2); c.stroke();
      }
    }
    c.globalAlpha = 1;
  };

  A.cloud = function (c, x, y, s, r, col) {
    c.fillStyle = col;
    c.beginPath();
    var n = 5 + Math.floor(r() * 4);
    for (var i = 0; i < n; i++) {
      var dx = (i - n / 2) * s * 0.42 + (r() - 0.5) * s * 0.2;
      var rr = s * (0.28 + r() * 0.28) * (1 - Math.abs(i - n / 2) / n * 0.9);
      c.moveTo(x + dx + rr, y - rr * 0.3);
      c.arc(x + dx, y - rr * 0.3, rr, 0, TAU);
    }
    c.moveTo(x + s * 0.6, y + s * 0.05);
    c.ellipse(x, y + s * 0.05, s * 0.6, s * 0.16, 0, 0, TAU);
    c.fill();
  };

  A.pine = function (c, x, baseY, height, color) {
    var tiers = 6, wd = height * 0.36;
    c.fillStyle = color;
    for (var i = 0; i < tiers; i++) {
      var top = baseY - height + height * 0.84 * (i / tiers);
      var bot = baseY - height + height * 0.84 * ((i + 1.4) / tiers);
      var half = wd * (0.3 + 0.7 * ((i + 1) / tiers));
      c.beginPath(); c.moveTo(x, top); c.lineTo(x + half, bot); c.lineTo(x - half, bot); c.closePath(); c.fill();
    }
    c.fillRect(x - wd * 0.05, baseY - height * 0.18, wd * 0.1, height * 0.18);
  };

  /* paint reflection of `fn` below horizon line hz */
  A.mirror = function (c, w, h, hz, fn) {
    c.save();
    c.beginPath(); c.rect(0, hz, w, h - hz); c.clip();
    c.translate(0, hz * 2); c.scale(1, -1);
    fn();
    c.restore();
  };

  A.ripples = function (c, w, h, hz, r, n, alpha) {
    for (var i = 0; i < n; i++) {
      var ry = hz + (h - hz) * Math.pow(r(), 1.4);
      var rl = w * (0.01 + r() * 0.05) * (0.6 + (ry - hz) / (h - hz));
      c.fillStyle = "rgba(255,255,255," + (0.03 + r() * (alpha || 0.1)).toFixed(3) + ")";
      c.fillRect(r() * w, ry, rl, Math.max(1, h * 0.0024));
    }
  };

  A.softBlob = function (c, x, y, rr, color, alpha) {
    var g = c.createRadialGradient(x, y, 0, x, y, rr);
    g.addColorStop(0, color.replace("A", alpha));
    g.addColorStop(1, color.replace("A", 0));
    c.fillStyle = g; c.fillRect(x - rr, y - rr, rr * 2, rr * 2);
  };

  A.palm = function (c, x, baseY, hgt, lean, color, r) {
    // trunk: quadratic curve drawn as tapering segments
    var tx = x + lean, ty = baseY - hgt;
    var cx = x + lean * 0.15, cy = baseY - hgt * 0.55;
    c.fillStyle = color; c.strokeStyle = color; c.lineCap = "round";
    var prev = [x, baseY];
    for (var i = 1; i <= 24; i++) {
      var t = i / 24, mt = 1 - t;
      var px = mt * mt * x + 2 * mt * t * cx + t * t * tx;
      var py = mt * mt * baseY + 2 * mt * t * cy + t * t * ty;
      c.lineWidth = hgt * (0.034 - 0.016 * t);
      c.beginPath(); c.moveTo(prev[0], prev[1]); c.lineTo(px, py); c.stroke();
      prev = [px, py];
    }
    // fronds
    var n = 9;
    for (var k = 0; k < n; k++) {
      var a = -Math.PI * (0.05 + 0.9 * (k / (n - 1))) + (r() - 0.5) * 0.18;
      var len = hgt * (0.34 + r() * 0.14);
      var ex = tx + Math.cos(a) * len, ey = ty + Math.sin(a) * len * 0.55 + len * 0.42 * Math.abs(Math.cos(a));
      var mx = tx + Math.cos(a) * len * 0.55, my = ty + Math.sin(a) * len * 0.75 - len * 0.12;
      var th = len * 0.11;
      c.beginPath();
      c.moveTo(tx, ty);
      c.quadraticCurveTo(mx, my - th, ex, ey);
      c.quadraticCurveTo(mx, my + th, tx, ty);
      c.fill();
    }
    A.disc(c, tx, ty + hgt * 0.015, hgt * 0.022, color);
  };

  A.finish = function (c, w, h, r, vignette) {
    // film grain + gentle vignette so every picture feels printed, not flat
    var n = Math.floor(w * h / 70);
    for (var i = 0; i < n; i++) {
      c.fillStyle = r() < 0.5 ? "rgba(255,255,255,0.035)" : "rgba(0,0,0,0.035)";
      c.fillRect(r() * w, r() * h, 1.6, 1.6);
    }
    var g = c.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.45, w / 2, h / 2, Math.max(w, h) * 0.78);
    g.addColorStop(0, "rgba(0,0,0,0)");
    g.addColorStop(1, "rgba(0,0,0," + (vignette === undefined ? 0.28 : vignette) + ")");
    c.fillStyle = g; c.fillRect(0, 0, w, h);
  };

  var hsl = A.hsl, pick = A.pick, range = A.range, lin = A.lin, rad = A.rad, disc = A.disc, ell = A.ell;

  /* ---------------- 1. Alpenglow ---------------- */
  function alpenglow(c, w, h, r) {
    var P = pick(r, [[212, true], [16, true], [172, false], [290, true]]);
    var hue = P[0], warm = P[1], hz = h * 0.66, step = 6;
    var sunX = w * range(r, 0.2, 0.8), sunY = hz - h * range(r, 0.14, 0.32), sunR = h * range(r, 0.045, 0.075);
    var layers = [];
    for (var i = 0; i < 4; i++) {
      layers.push({ ys: A.ridge(w, step, hz - h * (0.2 - i * 0.045), h * (0.22 - i * 0.034), r, 1 + i * 0.35),
                    col: hsl(hue + 12 * i, 28 + i * 6, 76 - i * 15) });
    }
    var clouds = [];
    for (var k = 0; k < 6; k++) clouds.push([r() * w, h * range(r, 0.06, 0.3), w * range(r, 0.05, 0.12)]);

    function above() {
      c.fillStyle = lin(c, 0, 0, 0, hz, [[0, hsl(hue, 52, warm ? 34 : 24)], [0.6, hsl(hue + 24, 62, 62)], [1, hsl(hue + 44, 72, 82)]]);
      c.fillRect(0, 0, w, hz + 2);
      c.fillStyle = rad(c, sunX, sunY, 0, sunR * 7, [[0, "rgba(255,248,220,.95)"], [0.15, "rgba(255,236,190,.55)"], [1, "rgba(255,220,170,0)"]]);
      c.fillRect(0, 0, w, hz);
      disc(c, sunX, sunY, sunR, "#fff8e2");
      clouds.forEach(function (cl) { A.cloud(c, cl[0], cl[1], cl[2], r, "rgba(255,255,255,.22)"); });
      layers.forEach(function (L) {
        A.fillRidge(c, L.ys, step, hz + 2, L.col);
        A.strokeRidge(c, L.ys, step, "rgba(255,244,220,.25)", Math.max(1, h * 0.0016));
      });
      c.fillStyle = lin(c, 0, hz - h * 0.12, 0, hz, [[0, "rgba(255,240,215,0)"], [1, "rgba(255,240,215,.5)"]]);
      c.fillRect(0, hz - h * 0.12, w, h * 0.12 + 2);
    }
    above();
    A.mirror(c, w, h, hz, above);
    c.fillStyle = lin(c, 0, hz, 0, h, [[0, hsl(hue + 30, 50, 55, 0.18)], [1, hsl(hue + 200, 55, 14, 0.72)]]);
    c.fillRect(0, hz, w, h - hz);
    A.ripples(c, w, h, hz, r, 90, 0.12);
    var dark = hsl(hue + 150, 35, 9);
    for (var t = 0; t < 10; t++) {
      var left = t % 2 === 0;
      A.pine(c, left ? w * r() * 0.22 : w * (0.78 + r() * 0.22), h * (0.93 + r() * 0.07), h * range(r, 0.18, 0.38), dark);
    }
    c.fillStyle = lin(c, 0, h * 0.94, 0, h, [[0, "rgba(0,0,0,0)"], [1, "rgba(0,0,0,.45)"]]);
    c.fillRect(0, h * 0.94, w, h * 0.06);
  }

  /* ---------------- 2. Dune Dusk ---------------- */
  function dunes(c, w, h, r) {
    var hz = h * 0.56, step = 5;
    c.fillStyle = lin(c, 0, 0, 0, hz, [[0, "#150f40"], [0.4, "#6a2a72"], [0.75, "#e0566a"], [1, "#ffb860"]]);
    c.fillRect(0, 0, w, h);
    A.stars(c, w, hz * 0.55, r, 220, 0.3);
    var sx = w * range(r, 0.28, 0.72), sy = hz - h * 0.01, sr = h * range(r, 0.09, 0.13);
    c.fillStyle = rad(c, sx, sy, sr * 0.8, sr * 6, [[0, "rgba(255,200,120,.65)"], [1, "rgba(255,140,90,0)"]]);
    c.fillRect(0, 0, w, hz + sr);
    disc(c, sx, sy, sr, lin(c, 0, sy - sr, 0, sy + sr, [[0, "#fff1c4"], [1, "#ffc46b"]]));
    var n = 6, near = [];
    for (var i = 0; i < n; i++) {
      var t = i / (n - 1);
      var base = hz + h * 0.015 + t * (h - hz) * 0.78;
      var amp = h * (0.07 + t * 0.1);
      var ys = [], f1 = (1.2 + r() * 1.3) / w * Math.PI, p1 = r() * TAU, f2 = (3 + r() * 2) / w * Math.PI, p2 = r() * TAU;
      for (var x = 0; x <= w + step; x += step) {
        var s1 = Math.sin(x * f1 + p1), s2 = Math.sin(x * f2 + p2);
        var crest = Math.pow(Math.abs(s1), 0.65) * (s1 > 0 ? 1 : 0.55);
        ys.push(base - amp * (0.55 * crest + 0.25 * (0.5 + 0.5 * s2)));
      }
      var top = Math.min.apply(null, ys);
      var light = hsl(28 - t * 12, 80 - t * 15, 66 - t * 38), dark = hsl(335 - t * 40, 45, 38 - t * 26);
      A.fillRidge(c, ys, step, h, lin(c, 0, top, 0, base + amp, [[0, light], [1, dark]]));
      A.strokeRidge(c, ys, step, "rgba(255,230,190," + (0.35 - t * 0.2).toFixed(2) + ")", Math.max(1.2, h * 0.002));
      if (i === n - 1) near = ys;
    }
    // cacti on the nearest dune
    c.fillStyle = "#1b0f20"; c.strokeStyle = "#1b0f20"; c.lineCap = "round";
    [[0.12, 0.2], [0.86, 0.26], [0.78, 0.15]].forEach(function (cp) {
      var cx = w * cp[0], idx = Math.min(near.length - 1, Math.round(cx / step)), by = near[idx] + h * 0.02, ch = h * cp[1];
      c.lineWidth = ch * 0.1; c.beginPath(); c.moveTo(cx, by); c.lineTo(cx, by - ch); c.stroke();
      c.lineWidth = ch * 0.07;
      c.beginPath(); c.moveTo(cx, by - ch * 0.4); c.quadraticCurveTo(cx - ch * 0.3, by - ch * 0.4, cx - ch * 0.3, by - ch * 0.68); c.stroke();
      c.beginPath(); c.moveTo(cx, by - ch * 0.55); c.quadraticCurveTo(cx + ch * 0.26, by - ch * 0.55, cx + ch * 0.26, by - ch * 0.8); c.stroke();
    });
    // birds
    c.strokeStyle = "rgba(40,16,50,.8)"; c.lineWidth = Math.max(1.5, h * 0.003);
    for (var b = 0; b < 7; b++) {
      var bx = sx + (r() - 0.5) * w * 0.4, by2 = sy - h * range(r, 0.1, 0.3), bs = h * range(r, 0.008, 0.017);
      c.beginPath(); c.moveTo(bx - bs, by2); c.quadraticCurveTo(bx - bs * 0.4, by2 - bs * 0.8, bx, by2); c.quadraticCurveTo(bx + bs * 0.4, by2 - bs * 0.8, bx + bs, by2); c.stroke();
    }
  }

  /* ---------------- 3. Aurora Fjord ---------------- */
  function aurora(c, w, h, r) {
    var hz = h * 0.68, step = 5;
    var m1 = A.ridge(w, step, hz - h * 0.06, h * 0.3, r, 1.6), m2 = A.ridge(w, step, hz + 1, h * 0.17, r, 2.4);
    var ribbons = [];
    for (var k = 0; k < 3; k++) ribbons.push({ base: h * (0.16 + k * 0.07), a1: h * range(r, 0.03, 0.07), f1: range(r, 1.5, 3.5) / w * Math.PI, p1: r() * TAU, a2: h * 0.015, f2: range(r, 7, 12) / w * Math.PI, p2: r() * TAU, f3: range(r, 3, 6) / w * Math.PI, p3: r() * TAU, hue: 125 + k * 28 + r() * 20 });
    var starR = G.rng(w);
    var cab = { x: w * range(r, 0.62, 0.8), y: hz + h * 0.035 };

    function above() {
      c.fillStyle = lin(c, 0, 0, 0, hz, [[0, "#02071a"], [0.55, "#0a2644"], [1, "#16506a"]]);
      c.fillRect(0, 0, w, hz + 2);
      A.stars(c, w, hz * 0.7, starR, 420, 0.25);
      c.globalCompositeOperation = "lighter";
      ribbons.forEach(function (R) {
        for (var x = 0; x < w; x += 3) {
          var y = R.base + Math.sin(x * R.f1 + R.p1) * R.a1 + Math.sin(x * R.f2 + R.p2) * R.a2;
          var len = h * (0.2 + 0.1 * Math.sin(x * R.f3 + R.p3));
          var hh = R.hue + 80 * (1 - len / (h * 0.3)) * 0.6;
          c.fillStyle = lin(c, 0, y - len, 0, y, [[0, hsl(hh + 60, 85, 55, 0)], [0.7, hsl(hh, 90, 55, 0.22)], [1, hsl(hh - 10, 95, 68, 0.55)]]);
          c.fillRect(x, y - len, 4, len);
        }
      });
      c.globalCompositeOperation = "source-over";
      A.fillRidge(c, m1, step, hz + 2, "#12304f");
      A.strokeRidge(c, m1, step, "rgba(170,215,255,.35)", Math.max(1.4, h * 0.002));
      A.fillRidge(c, m2, step, hz + 2, "#08182c");
      A.strokeRidge(c, m2, step, "rgba(150,200,255,.22)", Math.max(1.2, h * 0.0016));
    }
    above();
    A.mirror(c, w, h, hz, above);
    c.fillStyle = lin(c, 0, hz, 0, h, [[0, "rgba(10,50,80,.25)"], [1, "rgba(1,8,22,.85)"]]);
    c.fillRect(0, hz, w, h - hz);
    A.ripples(c, w, h, hz, r, 80, 0.1);
    // shoreline, pines, cabin
    c.fillStyle = "#030b17";
    c.beginPath(); c.moveTo(0, h); c.lineTo(0, h * 0.88); c.quadraticCurveTo(w * 0.35, h * 0.83, w * 0.55, h * 0.9); c.quadraticCurveTo(w * 0.8, h * 0.84, w, h * 0.87); c.lineTo(w, h); c.closePath(); c.fill();
    var cw = h * 0.07;
    c.fillStyle = "#030b17"; c.fillRect(cab.x, cab.y + h * 0.04, cw, cw * 0.62);
    c.beginPath(); c.moveTo(cab.x - cw * 0.1, cab.y + h * 0.04); c.lineTo(cab.x + cw * 0.5, cab.y + h * 0.04 - cw * 0.4); c.lineTo(cab.x + cw * 1.1, cab.y + h * 0.04); c.closePath(); c.fill();
    c.fillStyle = rad(c, cab.x + cw * 0.3, cab.y + h * 0.05 + cw * 0.15, 0, cw * 1.2, [[0, "rgba(255,200,100,.65)"], [1, "rgba(255,180,80,0)"]]);
    c.fillRect(cab.x - cw, cab.y - cw * 0.4, cw * 3, cw * 2.6);
    c.fillStyle = "#ffcf7a"; c.fillRect(cab.x + cw * 0.2, cab.y + h * 0.04 + cw * 0.1, cw * 0.22, cw * 0.2);
    for (var i = 0; i < 12; i++) A.pine(c, w * range(r, 0, 1), h * range(r, 0.89, 0.97), h * range(r, 0.1, 0.24), "#020912");
  }

  /* ---------------- 4. Tropical Sunset ---------------- */
  function tropical(c, w, h, r) {
    var hz = h * 0.58;
    c.fillStyle = lin(c, 0, 0, 0, hz, [[0, "#26175a"], [0.4, "#b53a7d"], [0.75, "#ff8a5c"], [1, "#ffd27a"]]);
    c.fillRect(0, 0, w, hz + 2);
    for (var i = 0; i < 9; i++) ell(c, w * r(), h * range(r, 0.08, 0.5), w * range(r, 0.08, 0.2), h * range(r, 0.008, 0.02), 0, "rgba(255," + Math.floor(120 + r() * 80) + ",150,.3)");
    var sx = w * range(r, 0.4, 0.62), sy = hz - h * 0.035, sr = h * 0.085;
    c.fillStyle = rad(c, sx, sy, sr * 0.7, sr * 7, [[0, "rgba(255,210,130,.8)"], [1, "rgba(255,120,90,0)"]]);
    c.fillRect(0, 0, w, hz + 4);
    disc(c, sx, sy, sr, lin(c, 0, sy - sr, 0, sy + sr, [[0, "#fff6d0"], [1, "#ffc067"]]));
    // sea
    c.fillStyle = lin(c, 0, hz, 0, h, [[0, "#ff9b66"], [0.18, "#c24b7f"], [0.6, "#3a2468"], [1, "#150d36"]]);
    c.fillRect(0, hz, w, h - hz);
    for (var g = 0; g < 320; g++) {
      var t = Math.pow(r(), 1.5), y = hz + t * (h - hz) * 0.9, spread = 40 + (y - hz) * 0.55;
      var gw = (w * range(r, 0.006, 0.03)) * (0.5 + t);
      c.fillStyle = "rgba(255,236,170," + (0.12 + r() * 0.4 * (1 - t * 0.6)).toFixed(2) + ")";
      c.fillRect(sx + (r() - 0.5) * 2 * spread - gw / 2, y, gw, Math.max(1.5, h * 0.003));
    }
    for (var wv = 0; wv < 60; wv++) {
      var wy = hz + Math.pow(r(), 1.3) * (h - hz);
      c.strokeStyle = "rgba(30,10,60," + (0.1 + r() * 0.2).toFixed(2) + ")"; c.lineWidth = Math.max(1, h * 0.002);
      var wx = r() * w, wl = w * range(r, 0.04, 0.14);
      c.beginPath(); c.moveTo(wx, wy); c.quadraticCurveTo(wx + wl / 2, wy - h * 0.006, wx + wl, wy); c.stroke();
    }
    // distant island
    var ix = w * range(r, 0.1, 0.25);
    c.fillStyle = "#4a1f5c";
    c.beginPath(); c.moveTo(ix - w * 0.16, hz + 2); c.quadraticCurveTo(ix - w * 0.05, hz - h * 0.06, ix, hz - h * 0.05); c.quadraticCurveTo(ix + w * 0.08, hz - h * 0.07, ix + w * 0.17, hz + 2); c.closePath(); c.fill();
    A.palm(c, ix + w * 0.02, hz - h * 0.04, h * 0.1, w * 0.01, "#3a1750", r);
    A.palm(c, ix - w * 0.04, hz - h * 0.035, h * 0.08, -w * 0.008, "#3a1750", r);
    // foreground beach and palms
    c.fillStyle = "#14082c";
    c.beginPath(); c.moveTo(0, h); c.lineTo(0, h * 0.8); c.quadraticCurveTo(w * 0.18, h * 0.86, w * 0.38, h * 0.97); c.lineTo(w * 0.4, h); c.closePath(); c.fill();
    c.beginPath(); c.moveTo(w, h); c.lineTo(w, h * 0.84); c.quadraticCurveTo(w * 0.86, h * 0.92, w * 0.66, h * 0.98); c.lineTo(w * 0.64, h); c.closePath(); c.fill();
    A.palm(c, w * 0.1, h * 0.88, h * 0.62, w * 0.1, "#0d0520", r);
    A.palm(c, w * 0.2, h * 0.93, h * 0.42, w * 0.05, "#0d0520", r);
    A.palm(c, w * 0.9, h * 0.92, h * 0.55, -w * 0.09, "#0d0520", r);
    c.strokeStyle = "rgba(20,8,40,.8)"; c.lineWidth = Math.max(1.5, h * 0.003);
    for (var b = 0; b < 6; b++) {
      var bx = sx + (r() - 0.5) * w * 0.5, by = h * range(r, 0.12, 0.38), bs = h * range(r, 0.008, 0.016);
      c.beginPath(); c.moveTo(bx - bs, by); c.quadraticCurveTo(bx - bs * 0.4, by - bs * 0.8, bx, by); c.quadraticCurveTo(bx + bs * 0.4, by - bs * 0.8, bx + bs, by); c.stroke();
    }
  }

  /* ---------------- 5. Blossom Lane ---------------- */
  function flower(c, x, y, s, hue, light, rot) {
    for (var i = 0; i < 5; i++) {
      var a = rot + i * TAU / 5;
      c.fillStyle = hsl(hue, 78, light);
      c.beginPath(); c.ellipse(x + Math.cos(a) * s * 0.55, y + Math.sin(a) * s * 0.55, s * 0.58, s * 0.42, a, 0, TAU); c.fill();
    }
    disc(c, x, y, s * 0.2, hsl(hue + 25, 80, 62));
    c.strokeStyle = hsl(45, 90, 70, 0.9); c.lineWidth = Math.max(0.8, s * 0.04);
    for (var k = 0; k < 6; k++) {
      var b = rot + k * TAU / 6;
      c.beginPath(); c.moveTo(x, y); c.lineTo(x + Math.cos(b) * s * 0.42, y + Math.sin(b) * s * 0.42); c.stroke();
    }
  }
  function blossom(c, w, h, r) {
    var hz = h * 0.68;
    var mx = w * range(r, 0.3, 0.5), mh = h * 0.34, mw = w * 0.32;
    var hill = [A.ridge(w, 8, hz - h * 0.0, h * 0.05, r, 0.6), A.ridge(w, 8, hz + 2, h * 0.035, r, 0.8)];
    function above() {
      c.fillStyle = lin(c, 0, 0, 0, hz, [[0, "#9cc4f2"], [0.5, "#e6dcf3"], [1, "#ffe6e8"]]);
      c.fillRect(0, 0, w, hz + 2);
      c.fillStyle = rad(c, w * 0.2, h * 0.1, 0, w * 0.5, [[0, "rgba(255,255,240,.9)"], [1, "rgba(255,255,240,0)"]]);
      c.fillRect(0, 0, w, hz);
      c.fillStyle = lin(c, 0, hz - mh, 0, hz, [[0, "#7a90cf"], [1, "#bcc8ea"]]);
      c.beginPath(); c.moveTo(mx - mw, hz + 2);
      c.bezierCurveTo(mx - mw * 0.45, hz - mh * 0.2, mx - mw * 0.2, hz - mh * 0.92, mx - mw * 0.07, hz - mh); c.lineTo(mx + mw * 0.07, hz - mh);
      c.bezierCurveTo(mx + mw * 0.2, hz - mh * 0.92, mx + mw * 0.45, hz - mh * 0.2, mx + mw, hz + 2); c.closePath(); c.fill();
      c.fillStyle = "#f7f9ff";
      c.beginPath(); c.moveTo(mx - mw * 0.07, hz - mh); c.lineTo(mx + mw * 0.07, hz - mh);
      c.bezierCurveTo(mx + mw * 0.13, hz - mh * 0.9, mx + mw * 0.19, hz - mh * 0.78, mx + mw * 0.25, hz - mh * 0.62);
      c.lineTo(mx + mw * 0.12, hz - mh * 0.7); c.lineTo(mx + mw * 0.03, hz - mh * 0.6); c.lineTo(mx - mw * 0.06, hz - mh * 0.72); c.lineTo(mx - mw * 0.14, hz - mh * 0.64); c.lineTo(mx - mw * 0.25, hz - mh * 0.62);
      c.bezierCurveTo(mx - mw * 0.19, hz - mh * 0.78, mx - mw * 0.13, hz - mh * 0.9, mx - mw * 0.07, hz - mh); c.closePath(); c.fill();
      A.fillRidge(c, hill[0], 8, hz + 2, "#9fbf9a");
      A.fillRidge(c, hill[1], 8, hz + 2, "#6f9f78");
      c.fillStyle = lin(c, 0, hz - h * 0.08, 0, hz, [[0, "rgba(255,240,245,0)"], [1, "rgba(255,240,245,.6)"]]);
      c.fillRect(0, hz - h * 0.08, w, h * 0.08 + 2);
    }
    above();
    A.mirror(c, w, h, hz, above);
    c.fillStyle = lin(c, 0, hz, 0, h, [[0, "rgba(255,225,235,.35)"], [1, "rgba(120,150,205,.65)"]]);
    c.fillRect(0, hz, w, h - hz);
    A.ripples(c, w, h, hz, r, 70, 0.12);
    for (var b = 0; b < 36; b++) disc(c, w * r(), h * r() * 0.8, h * range(r, 0.01, 0.045), "rgba(255," + Math.floor(205 + r() * 40) + ",230," + (0.07 + r() * 0.13).toFixed(2) + ")");

    function branch(x0, y0, x1, y1, cx, cy, w0, w1, pts) {
      var prev = [x0, y0];
      c.strokeStyle = "#3a2630"; c.lineCap = "round";
      for (var st = 1; st <= 34; st++) {
        var t = st / 34, mt = 1 - t;
        var px = mt * mt * x0 + 2 * mt * t * cx + t * t * x1, py = mt * mt * y0 + 2 * mt * t * cy + t * t * y1;
        c.lineWidth = w0 + (w1 - w0) * t;
        c.beginPath(); c.moveTo(prev[0], prev[1]); c.lineTo(px, py); c.stroke();
        if (pts && st % 2 === 0) pts.push([px, py, t]);
        prev = [px, py];
      }
    }
    var pts = [];
    branch(w * 1.06, h * 0.02, w * 0.2, h * 0.34, w * 0.75, h * 0.36, w * 0.04, w * 0.006, pts);
    branch(-w * 0.06, h * 0.16, w * 0.5, h * 0.16, w * 0.15, h * 0.34, w * 0.03, w * 0.005, pts);
    [[0.35, 1], [0.55, -1], [0.72, 1], [0.45, -1]].forEach(function (sb) {
      var t = sb[0], mt = 1 - t;
      var bx = mt * mt * w * 1.06 + 2 * mt * t * w * 0.75 + t * t * w * 0.2, by = mt * mt * h * 0.02 + 2 * mt * t * h * 0.36 + t * t * h * 0.34;
      branch(bx, by, bx - w * 0.14, by + h * 0.14 * sb[1] + h * 0.06, bx - w * 0.04, by + h * 0.05 * sb[1], w * 0.014, w * 0.003, pts);
    });
    var fl = [];
    pts.forEach(function (p) {
      var nf = 6 + Math.floor(r() * 8);
      for (var f = 0; f < nf; f++) fl.push([p[0] + (r() - 0.5) * w * 0.15, p[1] + (r() - 0.4) * h * 0.2, w * range(r, 0.011, 0.03), r()]);
    });
    fl.sort(function (a2, b2) { return a2[2] - b2[2]; });
    fl.forEach(function (f) {
      flower(c, f[0], f[1], f[2], 338 + f[3] * 18, 80 + f[3] * 12 - (f[2] / (w * 0.03)) * 9, r() * TAU);
    });
    for (var p = 0; p < 70; p++) {
      var py2 = h * range(r, 0.15, 1), onWater = py2 > hz;
      ell(c, w * r(), py2, w * range(r, 0.003, 0.008), w * range(r, 0.002, 0.0045) * (onWater ? 0.5 : 1), r() * TAU, "rgba(255,205,222," + (0.55 + r() * 0.45).toFixed(2) + ")");
    }
  }

  /* ---------------- 6. Balloon Fiesta ---------------- */
  function balloon(c, x, y, R, cols, r) {
    c.save();
    c.beginPath();
    c.moveTo(x - R * 0.22, y + R * 1.22);
    c.bezierCurveTo(x - R * 1.28, y + R * 0.5, x - R * 1.05, y - R * 1.28, x, y - R * 1.28);
    c.bezierCurveTo(x + R * 1.05, y - R * 1.28, x + R * 1.28, y + R * 0.5, x + R * 0.22, y + R * 1.22);
    c.closePath();
    c.clip();
    var n = 8, sw = (R * 2.6) / n;
    for (var i = 0; i < n; i++) { c.fillStyle = cols[i % cols.length]; c.fillRect(x - R * 1.3 + i * sw, y - R * 1.4, sw + 1, R * 2.8); }
    c.fillStyle = "rgba(255,255,255,.55)"; c.fillRect(x - R * 1.3, y + R * 0.1, R * 2.6, R * 0.14);
    c.fillStyle = rad(c, x - R * 0.4, y - R * 0.5, R * 0.1, R * 1.7, [[0, "rgba(255,255,255,.42)"], [0.5, "rgba(255,255,255,0)"], [1, "rgba(30,10,40,.4)"]]);
    c.fillRect(x - R * 1.4, y - R * 1.4, R * 2.8, R * 2.9);
    c.restore();
    c.strokeStyle = "rgba(60,40,30,.8)"; c.lineWidth = Math.max(1, R * 0.03);
    c.beginPath(); c.moveTo(x - R * 0.2, y + R * 1.2); c.lineTo(x - R * 0.14, y + R * 1.62); c.moveTo(x + R * 0.2, y + R * 1.2); c.lineTo(x + R * 0.14, y + R * 1.62); c.stroke();
    c.fillStyle = "#7a4a2a"; c.fillRect(x - R * 0.17, y + R * 1.6, R * 0.34, R * 0.22);
    c.fillStyle = "#a8683a"; c.fillRect(x - R * 0.17, y + R * 1.6, R * 0.34, R * 0.06);
  }
  function balloons(c, w, h, r) {
    var hz = h * 0.7;
    c.fillStyle = lin(c, 0, 0, 0, hz, [[0, "#4aa5ee"], [0.6, "#a9dcff"], [1, "#ffe6c8"]]);
    c.fillRect(0, 0, w, h);
    c.fillStyle = rad(c, w * 0.85, h * 0.05, 0, w * 0.55, [[0, "rgba(255,250,220,.9)"], [1, "rgba(255,250,220,0)"]]);
    c.fillRect(0, 0, w, h);
    for (var i = 0; i < 9; i++) A.cloud(c, w * r(), h * range(r, 0.08, 0.55), w * range(r, 0.1, 0.22), r, "rgba(255,255,255," + range(r, 0.55, 0.9).toFixed(2) + ")");
    var hills = [["#9cc6a2", "#b8d9bc"], ["#6fae7d", "#8ec59a"]];
    for (var k = 0; k < 2; k++) {
      var ys = A.ridge(w, 8, hz + h * (0.01 + k * 0.04), h * 0.07, r, 0.7);
      A.fillRidge(c, ys, 8, h, lin(c, 0, hz - h * 0.05, 0, h, [[0, hills[k][1]], [1, hills[k][0]]]));
    }
    // patchwork fields in perspective
    var fieldCols = ["#e8c85a", "#7fc06a", "#4f9d5a", "#d9a441", "#a8d86e", "#c97f3a", "#63b08a"];
    c.save();
    c.beginPath(); c.rect(0, hz + h * 0.04, w, h); c.clip();
    for (var row = 0; row < 14; row++) {
      var t0 = row / 14, t1 = (row + 1) / 14;
      var y0 = hz + h * 0.04 + (h - hz) * Math.pow(t0, 1.4), y1 = hz + h * 0.04 + (h - hz) * Math.pow(t1, 1.4) + 2;
      var cx = 0;
      while (cx < w * 1.3) {
        var cwd = w * range(r, 0.03, 0.12) * (0.4 + t1 * 1.8);
        c.fillStyle = pick(r, fieldCols);
        c.beginPath();
        c.moveTo(w / 2 + (cx - w * 0.15 - w / 2) * (0.5 + t0 * 0.9), y0);
        c.lineTo(w / 2 + (cx - w * 0.15 + cwd - w / 2) * (0.5 + t0 * 0.9), y0);
        c.lineTo(w / 2 + (cx - w * 0.15 + cwd - w / 2) * (0.5 + t1 * 0.9), y1);
        c.lineTo(w / 2 + (cx - w * 0.15 - w / 2) * (0.5 + t1 * 0.9), y1);
        c.closePath(); c.fill();
        c.strokeStyle = "rgba(255,255,255,.06)"; c.lineWidth = 1; c.stroke();
        cx += cwd;
      }
    }
    c.restore();
    c.fillStyle = lin(c, 0, hz, 0, hz + h * 0.1, [[0, "rgba(255,240,220,.5)"], [1, "rgba(255,240,220,0)"]]);
    c.fillRect(0, hz, w, h * 0.1);
    var palettes = [["#e63946", "#f1fa8c", "#ffffff"], ["#2a9d8f", "#e9c46a", "#264653"], ["#ff6b9d", "#ffd166", "#6a4c93"], ["#3a86ff", "#ffbe0b", "#ff006e"], ["#f77f00", "#fcbf49", "#d62828"], ["#8338ec", "#ffbe0b", "#06d6a0"], ["#ef476f", "#ffd166", "#118ab2"]];
    var bs = [];
    for (var b = 0; b < 8; b++) bs.push([w * range(r, 0.08, 0.92), h * range(r, 0.14, 0.52), h * range(r, 0.055, 0.14)]);
    bs.sort(function (a, b2) { return a[2] - b2[2]; });
    bs.forEach(function (q) { balloon(c, q[0], q[1], q[2], pick(r, palettes), r); });
  }

  G.THEMES = [
    { id: "alpenglow", name: "Alpenglow", tag: "Mountain lake", aspect: 1.5, draw: alpenglow },
    { id: "dunes", name: "Dune Dusk", tag: "Desert sunset", aspect: 1.5, draw: dunes },
    { id: "aurora", name: "Aurora Fjord", tag: "Northern lights", aspect: 1.5, draw: aurora },
    { id: "tropical", name: "Tropical Sunset", tag: "Palm beach", aspect: 1.5, draw: tropical },
    { id: "blossom", name: "Blossom Lane", tag: "Cherry blossom", aspect: 1.5, draw: blossom },
    { id: "balloons", name: "Balloon Fiesta", tag: "Hot air balloons", aspect: 1.25, draw: balloons }
  ];
})(window.JP = window.JP || {});
