/* Puzzle scenes 7-13, plus the renderer that turns a theme into a canvas. */
(function (G) {
  "use strict";

  var TAU = G.TAU, A = G.A;
  var hsl = A.hsl, pick = A.pick, range = A.range, lin = A.lin, rad = A.rad, disc = A.disc, ell = A.ell;

  function birds(c, r, cx, cy, spread, n, hmin, hmax, h, col) {
    c.strokeStyle = col; c.lineWidth = Math.max(1.5, h * 0.003); c.lineCap = "round";
    for (var b = 0; b < n; b++) {
      var bx = cx + (r() - 0.5) * spread, by = h * range(r, hmin, hmax), bs = h * range(r, 0.008, 0.017);
      c.beginPath(); c.moveTo(bx - bs, by); c.quadraticCurveTo(bx - bs * 0.4, by - bs * 0.8, bx, by); c.quadraticCurveTo(bx + bs * 0.4, by - bs * 0.8, bx + bs, by); c.stroke();
    }
  }

  /* ---------------- 7. Lighthouse Night ---------------- */
  function lighthouse(c, w, h, r) {
    var hz = h * 0.6;
    var lx = w * range(r, 0.7, 0.78), baseY = h * 0.7, th = h * 0.34, bw = h * 0.052, tw = h * 0.034, topY = baseY - th;
    var mx = w * range(r, 0.14, 0.34), my = h * range(r, 0.13, 0.22), mr = h * 0.06;
    c.fillStyle = lin(c, 0, 0, 0, hz, [[0, "#040a22"], [0.55, "#13306a"], [1, "#3d62a6"]]);
    c.fillRect(0, 0, w, h);
    A.stars(c, w, hz * 0.75, r, 360, 0.25);
    c.fillStyle = rad(c, mx, my, mr, mr * 9, [[0, "rgba(200,220,255,.5)"], [1, "rgba(120,160,255,0)"]]);
    c.fillRect(0, 0, w, hz);
    disc(c, mx, my, mr, lin(c, mx - mr, my - mr, mx + mr, my + mr, [[0, "#fffbe8"], [1, "#d8dfef"]]));
    for (var q = 0; q < 6; q++) disc(c, mx + (r() - 0.5) * mr, my + (r() - 0.5) * mr, mr * range(r, 0.08, 0.2), "rgba(150,160,190,.25)");
    for (var i = 0; i < 6; i++) ell(c, w * r(), h * range(r, 0.1, 0.5), w * range(r, 0.08, 0.2), h * range(r, 0.008, 0.02), 0, "rgba(190,210,255,.1)");
    // sea
    c.fillStyle = lin(c, 0, hz, 0, h, [[0, "#254a8c"], [0.3, "#0f2757"], [1, "#040c26"]]);
    c.fillRect(0, hz, w, h - hz);
    for (var g = 0; g < 260; g++) {
      var t = Math.pow(r(), 1.4), y = hz + t * (h - hz) * 0.95, sp = 16 + (y - hz) * 0.22, gw = w * range(r, 0.004, 0.022) * (0.5 + t);
      c.fillStyle = "rgba(255,248,215," + (0.1 + r() * 0.35 * (1 - t * 0.5)).toFixed(2) + ")";
      c.fillRect(mx + (r() - 0.5) * 2 * sp - gw / 2, y, gw, Math.max(1.5, h * 0.003));
    }
    for (var wv = 0; wv < 70; wv++) {
      var wy = hz + Math.pow(r(), 1.2) * (h - hz), wx = r() * w, wl = w * range(r, 0.04, 0.16);
      c.strokeStyle = "rgba(160,200,255," + (0.06 + r() * 0.12).toFixed(2) + ")"; c.lineWidth = Math.max(1, h * 0.002);
      c.beginPath(); c.moveTo(wx, wy); c.quadraticCurveTo(wx + wl / 2, wy - h * 0.007, wx + wl, wy); c.stroke();
    }
    // beams
    var ly = topY - h * 0.012;
    c.globalCompositeOperation = "lighter";
    [[-1, 0.06], [1, 0.05]].forEach(function (d) {
      var ex = d[0] < 0 ? -w * 0.1 : w * 1.1;
      c.fillStyle = lin(c, lx, 0, ex, 0, [[0, "rgba(255,235,160,.55)"], [0.5, "rgba(255,235,160,.18)"], [1, "rgba(255,235,160,0)"]]);
      c.beginPath(); c.moveTo(lx, ly - h * 0.004); c.lineTo(ex, ly - h * d[1] * 1.5); c.lineTo(ex, ly + h * d[1] * 0.9); c.lineTo(lx, ly + h * 0.004); c.closePath(); c.fill();
    });
    c.fillStyle = rad(c, lx, ly, 0, h * 0.14, [[0, "rgba(255,230,150,.8)"], [1, "rgba(255,200,100,0)"]]);
    c.fillRect(lx - h * 0.15, ly - h * 0.15, h * 0.3, h * 0.3);
    c.globalCompositeOperation = "source-over";
    // cliff
    var cliff = new Path2D();
    cliff.moveTo(w * 0.5, h); cliff.lineTo(w * 0.54, h * 0.9); cliff.lineTo(w * 0.6, h * 0.8); cliff.lineTo(w * 0.64, h * 0.75);
    cliff.lineTo(w * 0.68, h * 0.71); cliff.lineTo(w * 0.74, h * 0.695); cliff.lineTo(w * 0.86, h * 0.7); cliff.lineTo(w * 0.93, h * 0.68); cliff.lineTo(w, h * 0.66); cliff.lineTo(w, h); cliff.closePath();
    c.fillStyle = lin(c, 0, h * 0.65, 0, h, [[0, "#1b2236"], [1, "#04070f"]]); c.fill(cliff);
    c.strokeStyle = "rgba(160,190,255,.35)"; c.lineWidth = Math.max(1.5, h * 0.003); c.stroke(cliff);
    for (var f = 0; f < 40; f++) ell(c, w * range(r, 0.48, 0.66), h * range(r, 0.88, 0.97), w * range(r, 0.008, 0.03), h * range(r, 0.004, 0.01), 0, "rgba(220,235,255," + range(r, 0.15, 0.5).toFixed(2) + ")");
    // tower
    c.save();
    c.beginPath(); c.moveTo(lx - bw, baseY); c.lineTo(lx - tw, topY); c.lineTo(lx + tw, topY); c.lineTo(lx + bw, baseY); c.closePath(); c.clip();
    var bands = 6;
    for (var k = 0; k < bands; k++) { c.fillStyle = k % 2 ? "#e9edf5" : "#c4342e"; c.fillRect(lx - bw, baseY - th * (k + 1) / bands, bw * 2, th / bands + 1); }
    c.fillStyle = lin(c, lx - bw, 0, lx + bw, 0, [[0, "rgba(255,255,255,.25)"], [0.5, "rgba(0,0,0,0)"], [1, "rgba(0,0,20,.55)"]]); c.fillRect(lx - bw, topY, bw * 2, th);
    c.restore();
    c.fillStyle = "#1c2336"; c.fillRect(lx - tw * 1.5, topY - h * 0.008, tw * 3, h * 0.012);
    c.fillStyle = "#ffe9a0"; c.fillRect(lx - tw * 0.8, topY - h * 0.04, tw * 1.6, h * 0.034);
    c.fillStyle = "#1c2336"; c.fillRect(lx - tw * 0.85, topY - h * 0.043, tw * 1.7, h * 0.004);
    c.beginPath(); c.moveTo(lx - tw * 1.05, topY - h * 0.043); c.lineTo(lx, topY - h * 0.075); c.lineTo(lx + tw * 1.05, topY - h * 0.043); c.closePath(); c.fill();
    c.fillRect(lx - h * 0.002, topY - h * 0.09, h * 0.004, h * 0.02);
    c.fillStyle = "#ffd58a"; c.fillRect(lx - tw * 0.2, baseY - th * 0.18, tw * 0.4, tw * 0.5);
    // rocks and gulls
    c.fillStyle = "#02050c";
    for (var rk = 0; rk < 5; rk++) { var rx = w * range(r, 0.05, 0.5), ry = h * range(r, 0.92, 1), rr = h * range(r, 0.04, 0.09); c.beginPath(); c.ellipse(rx, ry + rr * 0.4, rr * 1.5, rr, 0, Math.PI, TAU); c.fill(); }
    birds(c, r, w * 0.4, 0, w * 0.5, 4, 0.12, 0.35, h, "rgba(220,230,255,.7)");
  }

  /* ---------------- 8. Nebula Voyage ---------------- */
  function nebula(c, w, h, r) {
    c.fillStyle = "#04030d"; c.fillRect(0, 0, w, h);
    var hues = pick(r, [[320, 270, 200], [200, 260, 330], [20, 330, 270], [160, 210, 280]]);
    c.globalCompositeOperation = "lighter";
    for (var i = 0; i < 26; i++) {
      var hh = hues[i % 3] + (r() - 0.5) * 30, rr = Math.max(w, h) * range(r, 0.12, 0.42), x = w * r(), y = h * r();
      c.fillStyle = rad(c, x, y, 0, rr, [[0, hsl(hh, 80, 52, 0.2)], [0.5, hsl(hh + 15, 80, 40, 0.1)], [1, hsl(hh, 80, 30, 0)]]);
      c.fillRect(x - rr, y - rr, rr * 2, rr * 2);
    }
    for (var d = 0; d < 3200; d++) {
      var a = r() * TAU, rad0 = Math.pow(r(), 0.6) * Math.max(w, h) * 0.5, px = w * 0.5 + Math.cos(a) * rad0 * 1.2, py = h * 0.5 + Math.sin(a) * rad0 * 0.7;
      c.fillStyle = hsl(hues[Math.floor(r() * 3)] + (r() - 0.5) * 40, 80, 70, range(r, 0.05, 0.3));
      c.fillRect(px, py, 2, 2);
    }
    c.globalCompositeOperation = "source-over";
    A.stars(c, w, h, r, 600, 0.3);
    // ringed planet
    var px2 = w * range(r, 0.2, 0.34), py2 = h * range(r, 0.62, 0.74), pr = h * range(r, 0.16, 0.22), tilt = -0.3;
    function ring(front) {
      c.save(); c.translate(px2, py2); c.rotate(tilt);
      c.beginPath(); c.rect(-pr * 3, front ? 0 : -pr * 3, pr * 6, pr * 3); c.clip();
      [[1.55, 0.14, "rgba(240,210,170,.55)"], [1.8, 0.1, "rgba(220,190,150,.4)"], [2.05, 0.05, "rgba(240,220,190,.3)"]].forEach(function (rg) {
        c.strokeStyle = rg[2]; c.lineWidth = pr * rg[1];
        c.beginPath(); c.ellipse(0, 0, pr * rg[0], pr * rg[0] * 0.27, 0, 0, TAU); c.stroke();
      });
      c.restore();
    }
    ring(false);
    var pg = c.createRadialGradient(px2 - pr * 0.4, py2 - pr * 0.4, pr * 0.1, px2, py2, pr * 1.05);
    pg.addColorStop(0, "#ffd9a8"); pg.addColorStop(0.45, "#d98a5b"); pg.addColorStop(1, "#3a1530");
    disc(c, px2, py2, pr, pg);
    c.save(); c.beginPath(); c.arc(px2, py2, pr, 0, TAU); c.clip();
    for (var bnd = 0; bnd < 9; bnd++) { c.fillStyle = "rgba(90,30,50," + range(r, 0.08, 0.22).toFixed(2) + ")"; c.fillRect(px2 - pr, py2 - pr + bnd * pr * 0.23 + (r() - 0.5) * pr * 0.05, pr * 2, pr * range(r, 0.05, 0.13)); }
    c.fillStyle = rad(c, px2 + pr * 0.55, py2 + pr * 0.4, pr * 0.2, pr * 1.5, [[0, "rgba(0,0,0,0)"], [1, "rgba(0,0,12,.85)"]]); c.fillRect(px2 - pr, py2 - pr, pr * 2, pr * 2);
    c.restore();
    ring(true);
    var mx = px2 + pr * 2.4, my = py2 - pr * 1.2;
    disc(c, mx, my, pr * 0.2, rad(c, mx - pr * 0.06, my - pr * 0.06, 1, pr * 0.25, [[0, "#f4f0ff"], [1, "#5b5378"]]));
    // shooting star
    var sx = w * range(r, 0.55, 0.8), sy = h * range(r, 0.1, 0.3), sl = w * 0.16;
    c.strokeStyle = lin(c, sx, sy, sx - sl, sy + sl * 0.4, [[0, "rgba(255,255,255,.9)"], [1, "rgba(255,255,255,0)"]]); c.lineWidth = Math.max(2, h * 0.004); c.lineCap = "round";
    c.beginPath(); c.moveTo(sx, sy); c.lineTo(sx - sl, sy + sl * 0.4); c.stroke();
  }

  /* ---------------- 9. Skyline Dusk ---------------- */
  function skyline(c, w, h, r) {
    var hz = h * 0.66;
    var sx = w * range(r, 0.3, 0.7), sy = hz - h * 0.09, sr = h * 0.1;
    var seed = Math.floor(r() * 1e9);
    function above() {
      var q = G.rng(seed);
      c.fillStyle = lin(c, 0, 0, 0, hz, [[0, "#170f42"], [0.45, "#7a2f86"], [0.8, "#ff6b8b"], [1, "#ffc27a"]]);
      c.fillRect(0, 0, w, hz + 2);
      A.stars(c, w, hz * 0.4, G.rng(seed + 1), 120, 0.2);
      c.fillStyle = rad(c, sx, sy, sr * 0.5, sr * 6, [[0, "rgba(255,200,140,.7)"], [1, "rgba(255,140,120,0)"]]);
      c.fillRect(0, 0, w, hz);
      disc(c, sx, sy, sr, lin(c, 0, sy - sr, 0, sy + sr, [[0, "#fff0c8"], [1, "#ff9a7a"]]));
      var specs = [[0.12, 0.26, 0.026, 0.05, "hsl(285,38,45)", 0], [0.18, 0.4, 0.03, 0.07, "hsl(272,42,28)", 1], [0.22, 0.52, 0.034, 0.08, "hsl(255,48,13)", 2]];
      specs.forEach(function (S) {
        var x = -w * 0.02;
        while (x < w) {
          var bwd = w * range(q, S[2], S[3]), bh = h * range(q, S[0], S[1]) * (0.5 + q() * 0.7);
          c.fillStyle = S[4].replace("hsl(", "hsl(").replace(/,(\d+),(\d+)\)/, ",$1%,$2%)");
          c.fillRect(x, hz - bh, bwd + 1, bh + 2);
          if (q() < 0.3) c.fillRect(x + bwd * 0.45, hz - bh - h * 0.04, bwd * 0.05, h * 0.04);
          if (S[5] > 0) {
            var cell = Math.max(8, bwd / 4.5);
            for (var wy = hz - bh + cell * 0.7; wy < hz - cell; wy += cell * 1.5) {
              for (var wx = x + cell * 0.45; wx < x + bwd - cell * 0.6; wx += cell * 1.25) {
                if (q() < (S[5] === 1 ? 0.25 : 0.4)) { c.fillStyle = q() < 0.82 ? "rgba(255,214,130,.85)" : "rgba(150,230,255,.85)"; c.fillRect(wx, wy, cell * 0.55, cell * 0.78); }
              }
            }
            if (S[5] === 2 && q() < 0.35) { c.fillStyle = q() < 0.5 ? "rgba(255,70,170,.95)" : "rgba(60,230,255,.95)"; c.fillRect(x + bwd * 0.15, hz - bh * q() * 0.6 - cell * 4, bwd * 0.7, cell * 0.5); }
          }
          x += bwd + w * range(q, 0, 0.006);
        }
      });
    }
    above();
    A.mirror(c, w, h, hz, above);
    c.fillStyle = lin(c, 0, hz, 0, h, [[0, "rgba(90,40,110,.35)"], [1, "rgba(10,5,35,.88)"]]);
    c.fillRect(0, hz, w, h - hz);
    for (var i = 0; i < 160; i++) {
      var ry = hz + Math.pow(r(), 1.2) * (h - hz);
      c.fillStyle = "rgba(255," + Math.floor(150 + r() * 90) + ",170," + (0.04 + r() * 0.12).toFixed(2) + ")";
      c.fillRect(r() * w, ry, w * range(r, 0.01, 0.06), Math.max(1.5, h * 0.003));
    }
    c.fillStyle = "#07031a"; c.fillRect(0, h * 0.93, w, h * 0.07);
    for (var l = 0; l < 7; l++) {
      var lx = w * (0.07 + l * 0.145);
      c.fillStyle = "#07031a"; c.fillRect(lx - 2, h * 0.84, 4, h * 0.1);
      c.fillStyle = rad(c, lx, h * 0.835, 0, h * 0.06, [[0, "rgba(255,210,130,.9)"], [1, "rgba(255,180,100,0)"]]); c.fillRect(lx - h * 0.06, h * 0.78, h * 0.12, h * 0.12);
    }
  }

  /* ---------------- 10. Autumn Path ---------------- */
  function foliage(c, cx, cy, rr, hue, n, r) {
    for (var i = 0; i < n; i++) {
      var a = r() * TAU, d = Math.sqrt(r()) * rr, s = rr * range(r, 0.12, 0.3);
      c.fillStyle = hsl(hue + (r() - 0.5) * 34, 75 + r() * 20, 36 + r() * 24, 0.92);
      c.beginPath(); c.arc(cx + Math.cos(a) * d, cy + Math.sin(a) * d * 0.8, s, 0, TAU); c.fill();
    }
    for (var k = 0; k < n * 0.5; k++) {
      var a2 = r() * TAU, d2 = Math.sqrt(r()) * rr;
      c.fillStyle = hsl(hue + 12, 90, 66, 0.5);
      c.beginPath(); c.arc(cx + Math.cos(a2) * d2 - rr * 0.06, cy + Math.sin(a2) * d2 * 0.8 - rr * 0.06, rr * range(r, 0.03, 0.09), 0, TAU); c.fill();
    }
  }
  function autumn(c, w, h, r) {
    var hz = h * 0.55;
    c.fillStyle = lin(c, 0, 0, 0, h, [[0, "#ffe8b0"], [0.4, "#f7b363"], [0.8, "#a8452c"], [1, "#4a1b18"]]);
    c.fillRect(0, 0, w, h);
    var sx = w * range(r, 0.3, 0.55), sy = h * 0.14;
    c.fillStyle = rad(c, sx, sy, 0, w * 0.5, [[0, "rgba(255,250,215,.95)"], [1, "rgba(255,230,160,0)"]]); c.fillRect(0, 0, w, h);
    // far trees
    for (var d = 0; d < 3; d++) {
      var t = d / 2, cnt = 14 - d * 3, baseY = hz + h * (0.03 + d * 0.05);
      for (var i = 0; i < cnt; i++) {
        var tx = w * (i + r()) / cnt, th = h * (0.22 + d * 0.14) * (0.8 + r() * 0.4), tw = h * (0.008 + d * 0.012);
        c.fillStyle = hsl(18, 40 - t * 10, 26 - t * 14);
        c.beginPath(); c.moveTo(tx - tw, baseY); c.lineTo(tx - tw * 0.5, baseY - th); c.lineTo(tx + tw * 0.5, baseY - th); c.lineTo(tx + tw, baseY); c.closePath(); c.fill();
        foliage(c, tx, baseY - th, h * (0.07 + d * 0.05), pick(r, [18, 28, 38, 8]), 16 + d * 6, r);
      }
      c.fillStyle = lin(c, 0, baseY - h * 0.2, 0, baseY + h * 0.05, [[0, "rgba(255,225,170,0)"], [1, "rgba(255,225,170," + (0.35 - d * 0.1).toFixed(2) + ")"]]);
      c.fillRect(0, baseY - h * 0.2, w, h * 0.25);
    }
    // path
    var px = w * 0.5;
    c.fillStyle = lin(c, 0, hz, 0, h, [[0, "#d9923f"], [1, "#6b3114"]]);
    c.beginPath(); c.moveTo(px - w * 0.02, hz + h * 0.05); c.bezierCurveTo(px + w * 0.05, hz + h * 0.2, px - w * 0.2, hz + h * 0.35, px - w * 0.28, h); c.lineTo(px + w * 0.34, h); c.bezierCurveTo(px + w * 0.15, hz + h * 0.3, px + w * 0.08, hz + h * 0.15, px + w * 0.02, hz + h * 0.05); c.closePath(); c.fill();
    // rays
    c.globalCompositeOperation = "lighter";
    for (var rz = 0; rz < 9; rz++) {
      var ang = range(r, 0.2, 1.3), len = h * 1.2;
      c.fillStyle = lin(c, sx, sy, sx + Math.cos(ang) * len, sy + Math.sin(ang) * len, [[0, "rgba(255,240,190,.16)"], [1, "rgba(255,240,190,0)"]]);
      c.beginPath(); c.moveTo(sx, sy); c.lineTo(sx + Math.cos(ang - 0.035) * len, sy + Math.sin(ang - 0.035) * len); c.lineTo(sx + Math.cos(ang + 0.035) * len, sy + Math.sin(ang + 0.035) * len); c.closePath(); c.fill();
    }
    c.globalCompositeOperation = "source-over";
    // big framing trees
    [[0.06, 1], [0.94, -1]].forEach(function (T) {
      var tx = w * T[0], tw = w * 0.05;
      c.fillStyle = lin(c, tx - tw, 0, tx + tw, 0, [[0, "#1f0f0a"], [1, "#4a2616"]]);
      c.beginPath(); c.moveTo(tx - tw, h); c.lineTo(tx - tw * 0.6, 0); c.lineTo(tx + tw * 0.6, 0); c.lineTo(tx + tw, h); c.closePath(); c.fill();
      foliage(c, tx + T[1] * w * 0.08, h * 0.04, h * 0.32, T[1] > 0 ? 8 : 28, 70, r);
    });
    // leaves
    for (var lf = 0; lf < 160; lf++) {
      var ly = h * range(r, 0.2, 1), sc = 0.4 + ly / h;
      ell(c, w * r(), ly, w * 0.007 * sc, w * 0.0035 * sc, r() * TAU, hsl(range(r, 0, 50), 85, range(r, 40, 62), 0.9));
    }
  }

  /* ---------------- 11. Koi Pond ---------------- */
  function koi(c, x, y, L, ang, r) {
    c.save(); c.translate(x, y); c.rotate(ang);
    c.fillStyle = "rgba(0,20,25,.22)"; c.beginPath(); c.ellipse(-L * 0.03 + L * 0.03, L * 0.07, L * 0.5, L * 0.13, 0, 0, TAU); c.fill();
    var tailCol = pick(r, ["rgba(255,150,70,.78)", "rgba(255,240,230,.78)", "rgba(255,110,60,.78)"]);
    c.fillStyle = tailCol;
    c.beginPath(); c.moveTo(-L * 0.4, 0);
    c.bezierCurveTo(-L * 0.52, -L * 0.04, -L * 0.62, -L * 0.2, -L * 0.74, -L * 0.18);
    c.bezierCurveTo(-L * 0.66, -L * 0.08, -L * 0.64, L * 0.02, -L * 0.7, L * 0.12);
    c.bezierCurveTo(-L * 0.58, L * 0.16, -L * 0.5, L * 0.06, -L * 0.4, 0); c.closePath(); c.fill();
    [[-1, 1], [1, -1]].forEach(function (s) {
      c.save(); c.translate(L * 0.2, s[0] * L * 0.1); c.rotate(s[0] * 0.5);
      c.fillStyle = tailCol; c.beginPath(); c.ellipse(-L * 0.04, 0, L * 0.1, L * 0.035, 0, 0, TAU); c.fill(); c.restore();
    });
    var body = new Path2D();
    body.moveTo(L * 0.5, 0);
    body.bezierCurveTo(L * 0.46, -L * 0.14, L * 0.1, -L * 0.17, -L * 0.2, -L * 0.07);
    body.bezierCurveTo(-L * 0.3, -L * 0.04, -L * 0.37, -L * 0.02, -L * 0.42, 0);
    body.bezierCurveTo(-L * 0.37, L * 0.02, -L * 0.3, L * 0.04, -L * 0.2, L * 0.07);
    body.bezierCurveTo(L * 0.1, L * 0.17, L * 0.46, L * 0.14, L * 0.5, 0);
    var base = pick(r, ["#fff4e8", "#ff8c42", "#ffe9d6"]);
    c.fillStyle = base; c.fill(body);
    c.save(); c.clip(body);
    for (var p = 0; p < 5; p++) {
      c.fillStyle = pick(r, ["#ff6a2b", "#ff6a2b", "#e63a1f", "#1b1b22", "#ffb347"]);
      c.beginPath(); c.ellipse(L * range(r, -0.3, 0.35), L * range(r, -0.07, 0.07), L * range(r, 0.05, 0.16), L * range(r, 0.04, 0.1), r() * Math.PI, 0, TAU); c.fill();
    }
    c.fillStyle = lin(c, 0, -L * 0.17, 0, L * 0.17, [[0, "rgba(255,255,255,.35)"], [0.5, "rgba(255,255,255,0)"], [1, "rgba(0,30,40,.3)"]]);
    c.fillRect(-L * 0.5, -L * 0.2, L, L * 0.4);
    c.restore();
    disc(c, L * 0.38, -L * 0.04, L * 0.014, "#14141a"); disc(c, L * 0.38, L * 0.04, L * 0.014, "#14141a");
    c.restore();
  }
  function lotusPad(c, x, y, rr, r) {
    c.save(); c.translate(x, y); c.rotate(r() * TAU);
    c.fillStyle = "rgba(0,25,20,.25)"; c.beginPath(); c.ellipse(rr * 0.06, rr * 0.08, rr, rr * 0.85, 0, 0, TAU); c.fill();
    var notch = 0.12 + r() * 0.1;
    c.fillStyle = lin(c, -rr, -rr, rr, rr, [[0, hsl(105, 55, 48)], [1, hsl(150, 60, 22)]]);
    c.beginPath(); c.moveTo(0, 0); c.ellipse(0, 0, rr, rr * 0.88, 0, notch, TAU - notch); c.closePath(); c.fill();
    c.strokeStyle = "rgba(220,255,200,.25)"; c.lineWidth = Math.max(1, rr * 0.02);
    for (var v = 0; v < 9; v++) { var a = notch + (TAU - 2 * notch) * v / 8; c.beginPath(); c.moveTo(0, 0); c.lineTo(Math.cos(a) * rr * 0.92, Math.sin(a) * rr * 0.8); c.stroke(); }
    c.restore();
  }
  function lotusFlower(c, x, y, rr) {
    for (var ring = 0; ring < 2; ring++) {
      var n = 8 - ring * 2;
      for (var i = 0; i < n; i++) {
        var a = i * TAU / n + ring * 0.3;
        c.save(); c.translate(x, y); c.rotate(a);
        c.fillStyle = ring ? "#ffd3e2" : "#ff9fc0";
        c.beginPath(); c.moveTo(0, 0); c.bezierCurveTo(rr * 0.4, -rr * 0.35 * (1 - ring * 0.3), rr * 0.95, -rr * 0.2, rr * (1 - ring * 0.3), 0); c.bezierCurveTo(rr * 0.95, rr * 0.2, rr * 0.4, rr * 0.35 * (1 - ring * 0.3), 0, 0); c.fill();
        c.strokeStyle = "rgba(255,255,255,.4)"; c.lineWidth = Math.max(1, rr * 0.03); c.stroke();
        c.restore();
      }
    }
    disc(c, x, y, rr * 0.16, "#ffd35a");
  }
  function koiPond(c, w, h, r) {
    c.fillStyle = lin(c, 0, 0, w, h, [[0, "#0a3a47"], [0.5, "#116d70"], [1, "#0b4a52"]]); c.fillRect(0, 0, w, h);
    c.globalCompositeOperation = "lighter";
    for (var i = 0; i < 40; i++) A.softBlob(c, w * r(), h * r(), h * range(r, 0.06, 0.2), "rgba(120,255,230,A)", 0.07);
    c.globalCompositeOperation = "source-over";
    for (var k = 0; k < 7; k++) {
      var rx = w * r(), ry = h * r();
      for (var q = 0; q < 4; q++) { c.strokeStyle = "rgba(200,255,250," + (0.2 - q * 0.04).toFixed(2) + ")"; c.lineWidth = Math.max(1.2, h * 0.003); c.beginPath(); c.ellipse(rx, ry, h * (0.04 + q * 0.035), h * (0.03 + q * 0.026), 0, 0, TAU); c.stroke(); }
    }
    var fish = [];
    for (var f = 0; f < 5; f++) fish.push([w * range(r, 0.12, 0.88), h * range(r, 0.15, 0.85), h * range(r, 0.2, 0.34), r() * TAU]);
    fish.forEach(function (F) { koi(c, F[0], F[1], F[2], F[3], r); });
    for (var p = 0; p < 9; p++) lotusPad(c, w * range(r, 0.02, 0.98), h * range(r, 0.04, 0.96), h * range(r, 0.07, 0.15), r);
    for (var l = 0; l < 3; l++) lotusFlower(c, w * range(r, 0.1, 0.9), h * range(r, 0.15, 0.85), h * range(r, 0.05, 0.085));
    for (var lf = 0; lf < 14; lf++) ell(c, w * r(), h * r(), w * 0.008, w * 0.004, r() * TAU, hsl(range(r, 15, 45), 85, 55, 0.9));
  }

  /* ---------------- 12. Mandala Bloom ---------------- */
  function petal(c, ang, r0, r1, wd, fill, stroke) {
    c.save(); c.rotate(ang);
    c.beginPath(); c.moveTo(r0, 0);
    c.bezierCurveTo(r0 + (r1 - r0) * 0.3, -wd, r0 + (r1 - r0) * 0.78, -wd * 0.85, r1, 0);
    c.bezierCurveTo(r0 + (r1 - r0) * 0.78, wd * 0.85, r0 + (r1 - r0) * 0.3, wd, r0, 0);
    c.fillStyle = fill; c.fill(); c.strokeStyle = stroke; c.lineWidth = Math.max(1, r1 * 0.006); c.stroke();
    c.restore();
  }
  function mandala(c, w, h, r) {
    var cx = w / 2, cy = h / 2, R = Math.min(w, h) * 0.48, h0 = r() * 360;
    c.fillStyle = rad(c, cx, cy, 0, R * 1.5, [[0, hsl(h0 + 250, 60, 14)], [1, hsl(h0 + 260, 70, 5)]]); c.fillRect(0, 0, w, h);
    c.save(); c.translate(cx, cy);
    var spec = [[28, 0.86, 1.0, 0.1], [24, 0.74, 0.92, 0.1], [20, 0.62, 0.8, 0.09], [16, 0.5, 0.68, 0.09], [12, 0.38, 0.56, 0.1], [10, 0.26, 0.44, 0.1], [8, 0.14, 0.32, 0.1]];
    spec.forEach(function (S, i) {
      var n = S[0], a0 = (i % 2) * Math.PI / n;
      for (var k = 0; k < n; k++) {
        var hh = h0 + i * 14 + (k % 2) * 22;
        var g = lin(c, R * S[1], 0, R * S[2], 0, [[0, hsl(hh + 30, 78, 38)], [1, hsl(hh, 85, 58)]]);
        petal(c, a0 + k * TAU / n, R * S[1] * 0.94, R * S[2], R * S[2] * Math.sin(Math.PI / n) * 1.25, g, "rgba(255,235,190,.55)");
      }
      for (var d = 0; d < n; d++) {
        var da = a0 + (d + 0.5) * TAU / n;
        disc(c, Math.cos(da) * R * (S[1] * 0.97), Math.sin(da) * R * (S[1] * 0.97), R * 0.011, "rgba(255,240,200,.9)");
      }
      c.strokeStyle = "rgba(255,225,160,.35)"; c.lineWidth = Math.max(1, R * 0.004);
      c.beginPath(); c.arc(0, 0, R * S[1], 0, TAU); c.stroke();
    });
    // central star
    var pts = 12;
    c.beginPath();
    for (var s = 0; s < pts * 2; s++) { var rr = s % 2 ? R * 0.07 : R * 0.15, aa = s * Math.PI / pts; if (s) c.lineTo(Math.cos(aa) * rr, Math.sin(aa) * rr); else c.moveTo(Math.cos(aa) * rr, Math.sin(aa) * rr); }
    c.closePath(); c.fillStyle = rad(c, 0, 0, 0, R * 0.15, [[0, "#fff7d0"], [1, "#ffb347"]]); c.fill();
    c.restore();
    c.strokeStyle = "rgba(255,225,160,.5)"; c.lineWidth = Math.max(1.5, R * 0.006);
    c.beginPath(); c.arc(cx, cy, R * 1.0, 0, TAU); c.stroke();
    for (var o = 0; o < 72; o++) { var oa = o * TAU / 72; disc(c, cx + Math.cos(oa) * R * 1.05, cy + Math.sin(oa) * R * 1.05, R * 0.007, "rgba(255,230,170," + (0.4 + (o % 2) * 0.4) + ")"); }
    A.stars(c, w, h, r, 120, 0.2);
  }

  /* ---------------- 13. Wildflower Meadow ---------------- */
  function bloom(c, type, x, y, s, r) {
    if (type === 0) {
      for (var i = 0; i < 12; i++) { var a = i * TAU / 12; ell(c, x + Math.cos(a) * s * 0.6, y + Math.sin(a) * s * 0.6, s * 0.48, s * 0.17, a, "#fffdf6"); }
      disc(c, x, y, s * 0.3, "#ffc83a");
    } else if (type === 1) {
      for (var j = 0; j < 5; j++) { var b = j * TAU / 5 + 0.3; ell(c, x + Math.cos(b) * s * 0.4, y + Math.sin(b) * s * 0.4, s * 0.52, s * 0.46, b, "#e8321f"); }
      disc(c, x, y, s * 0.16, "#2a1414");
    } else if (type === 2) {
      for (var k = 0; k < 8; k++) { var d = k * TAU / 8; ell(c, x + Math.cos(d) * s * 0.42, y + Math.sin(d) * s * 0.42, s * 0.4, s * 0.12, d, "#4d7cf0"); }
      disc(c, x, y, s * 0.14, "#2a2a7a");
    } else if (type === 3) {
      for (var m = 0; m < 5; m++) { var e = m * TAU / 5; disc(c, x + Math.cos(e) * s * 0.35, y + Math.sin(e) * s * 0.35, s * 0.34, "#ffd93b"); }
      disc(c, x, y, s * 0.2, "#e8a30c");
    } else {
      for (var n = 0; n < 6; n++) ell(c, x + (n % 2 ? s * 0.08 : -s * 0.08), y - n * s * 0.34, s * 0.2, s * 0.15, 0, "#9a5fe0");
    }
  }
  function meadow(c, w, h, r) {
    var hz = h * 0.4;
    c.fillStyle = lin(c, 0, 0, 0, hz + h * 0.1, [[0, "#78c6f7"], [0.7, "#cfeeff"], [1, "#fff3d6"]]); c.fillRect(0, 0, w, h);
    c.fillStyle = rad(c, w * 0.8, h * 0.08, 0, w * 0.4, [[0, "rgba(255,250,210,.95)"], [1, "rgba(255,250,210,0)"]]); c.fillRect(0, 0, w, h);
    for (var i = 0; i < 6; i++) A.cloud(c, w * r(), h * range(r, 0.05, 0.28), w * range(r, 0.1, 0.2), r, "rgba(255,255,255,.85)");
    var hills = [["#8fc2c9", "#a6d4d6"], ["#6fb36e", "#8cc987"], ["#4d9a52", "#6fb86c"]];
    for (var k = 0; k < 3; k++) {
      var ys = A.ridge(w, 8, hz + h * (0.04 + k * 0.08), h * 0.1, r, 0.5);
      A.fillRidge(c, ys, 8, h, lin(c, 0, hz, 0, h, [[0, hills[k][1]], [1, hills[k][0]]]));
    }
    c.fillStyle = lin(c, 0, hz + h * 0.1, 0, h, [[0, "rgba(40,110,50,0)"], [1, "rgba(25,80,40,.6)"]]); c.fillRect(0, hz + h * 0.1, w, h);
    var rows = [[0.5, 0.011, 90], [0.64, 0.016, 80], [0.8, 0.026, 60], [0.95, 0.04, 40]];
    rows.forEach(function (RW, ri) {
      var list = [];
      for (var f = 0; f < RW[2]; f++) list.push([w * r(), h * (RW[0] + (r() - 0.5) * 0.12), r()]);
      list.sort(function (a, b) { return a[1] - b[1]; });
      list.forEach(function (F) {
        var s = h * RW[1] * (0.8 + F[2] * 0.5), type = Math.floor(r() * 5), headY = F[1] - s * 4 - h * 0.03 * (ri + 1);
        c.strokeStyle = hsl(110 + r() * 25, 55, 28 + ri * 4); c.lineWidth = Math.max(1.2, s * 0.22); c.lineCap = "round";
        c.beginPath(); c.moveTo(F[0], F[1] + s * 2); c.quadraticCurveTo(F[0] + (r() - 0.5) * s * 4, (F[1] + headY) / 2, F[0], headY); c.stroke();
        bloom(c, type, F[0], headY, s, r);
      });
      for (var g = 0; g < 160; g++) {
        var gx = w * r(), gy = h * (RW[0] + 0.07 + r() * 0.05), gh = h * range(r, 0.02, 0.06) * (0.7 + ri * 0.4);
        c.strokeStyle = hsl(range(r, 85, 135), 60, range(r, 20, 46)); c.lineWidth = Math.max(1.2, h * 0.003 * (1 + ri * 0.5)); c.lineCap = "round";
        c.beginPath(); c.moveTo(gx, gy); c.quadraticCurveTo(gx + (r() - 0.5) * gh * 0.6, gy - gh * 0.6, gx + (r() - 0.5) * gh * 0.9, gy - gh); c.stroke();
      }
    });
    for (var b = 0; b < 4; b++) {
      var bx = w * range(r, 0.1, 0.9), by = h * range(r, 0.2, 0.65), bs = h * range(r, 0.018, 0.034), col = pick(r, ["#ff8a3d", "#ffd23d", "#6ea8ff", "#ff6fa5"]), rot = (r() - 0.5) * 0.8;
      c.save(); c.translate(bx, by); c.rotate(rot);
      ell(c, -bs * 0.6, -bs * 0.3, bs, bs * 0.7, -0.4, col); ell(c, bs * 0.6, -bs * 0.3, bs, bs * 0.7, 0.4, col);
      ell(c, -bs * 0.45, bs * 0.45, bs * 0.7, bs * 0.5, 0.4, col); ell(c, bs * 0.45, bs * 0.45, bs * 0.7, bs * 0.5, -0.4, col);
      c.fillStyle = "rgba(40,20,20,.5)"; c.beginPath(); c.ellipse(-bs * 0.6, -bs * 0.3, bs * 0.35, bs * 0.25, -0.4, 0, TAU); c.ellipse(bs * 0.6, -bs * 0.3, bs * 0.35, bs * 0.25, 0.4, 0, TAU); c.fill();
      ell(c, 0, 0, bs * 0.1, bs * 0.55, 0, "#2a1a16");
      c.restore();
    }
  }

  G.THEMES.push(
    { id: "lighthouse", name: "Lighthouse Night", tag: "Moonlit coast", aspect: 1.5, draw: lighthouse },
    { id: "nebula", name: "Nebula Voyage", tag: "Deep space", aspect: 1.5, draw: nebula },
    { id: "skyline", name: "Skyline Dusk", tag: "City lights", aspect: 1.5, draw: skyline },
    { id: "autumn", name: "Autumn Path", tag: "Golden forest", aspect: 1.25, draw: autumn },
    { id: "koi", name: "Koi Pond", tag: "Lotus and koi", aspect: 1.5, draw: koiPond },
    { id: "mandala", name: "Mandala Bloom", tag: "Radiant pattern", aspect: 1, draw: mandala },
    { id: "meadow", name: "Wildflower Meadow", tag: "Summer blooms", aspect: 1.5, draw: meadow }
  );

  G.themeById = function (id) {
    for (var i = 0; i < G.THEMES.length; i++) if (G.THEMES[i].id === id) return G.THEMES[i];
    return G.THEMES[0];
  };

  /* Render a theme to a canvas whose long side is `long` pixels. */
  G.renderScene = function (theme, seed, long) {
    var asp = theme.aspect;
    var w = asp >= 1 ? long : Math.round(long * asp);
    var h = asp >= 1 ? Math.round(long / asp) : long;
    var cv = document.createElement("canvas");
    cv.width = w; cv.height = h;
    var c = cv.getContext("2d");
    var r = G.rng(G.hash(theme.id + ":" + seed));
    theme.draw(c, w, h, r);
    A.finish(c, w, h, G.rng(G.hash("finish:" + seed)), theme.id === "nebula" || theme.id === "mandala" ? 0.18 : 0.26);
    return cv;
  };
})(window.JP = window.JP || {});
