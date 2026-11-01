/* Procedural tabletop textures (tileable). */
(function (G) {
  "use strict";

  var TAU = G.TAU;

  G.TABLES = [
    { id: "oak", name: "Oak", swatch: "#a8703f", vignette: 0.42 },
    { id: "felt", name: "Felt", swatch: "#2f6a50", vignette: 0.38 },
    { id: "slate", name: "Slate", swatch: "#2d3440", vignette: 0.5 }
  ];

  function noiseDots(c, S, r, n, light, dark, size) {
    for (var i = 0; i < n; i++) {
      c.fillStyle = r() < 0.5 ? light : dark;
      c.fillRect(r() * S, r() * S, size, size);
    }
  }

  G.makeTableTile = function (kind) {
    var S = 1024, cv = document.createElement("canvas");
    cv.width = S; cv.height = S;
    var c = cv.getContext("2d"), r = G.rng(G.hash("table:" + kind)), i, k;

    if (kind === "felt") {
      c.fillStyle = "#2d6a50"; c.fillRect(0, 0, S, S);
      for (i = 0; i < 18; i++) {
        var x = r() * S, y = r() * S, rr = 140 + r() * 260;
        for (var ox = -S; ox <= S; ox += S) for (var oy = -S; oy <= S; oy += S) {
          var g = c.createRadialGradient(x + ox, y + oy, 0, x + ox, y + oy, rr);
          g.addColorStop(0, r() < 0.5 ? "rgba(255,255,255,.035)" : "rgba(0,0,0,.06)"); g.addColorStop(1, "rgba(0,0,0,0)");
          c.fillStyle = g; c.fillRect(x + ox - rr, y + oy - rr, rr * 2, rr * 2);
        }
      }
      noiseDots(c, S, r, 150000, "rgba(255,255,255,.045)", "rgba(0,0,0,.07)", 1.4);
      c.lineCap = "round";
      for (i = 0; i < 2600; i++) {
        var fx = r() * S, fy = r() * S, a = r() * TAU, l = 3 + r() * 7;
        c.strokeStyle = r() < 0.5 ? "rgba(255,255,255,.05)" : "rgba(0,0,0,.07)"; c.lineWidth = 0.8;
        c.beginPath(); c.moveTo(fx, fy); c.lineTo(fx + Math.cos(a) * l, fy + Math.sin(a) * l); c.stroke();
      }
      return cv;
    }

    if (kind === "slate") {
      c.fillStyle = "#2c3340"; c.fillRect(0, 0, S, S);
      for (i = 0; i < 24; i++) {
        var sx = r() * S, sy = r() * S, sr = 120 + r() * 300;
        for (var ax = -S; ax <= S; ax += S) for (var ay = -S; ay <= S; ay += S) {
          var gg = c.createRadialGradient(sx + ax, sy + ay, 0, sx + ax, sy + ay, sr);
          gg.addColorStop(0, r() < 0.5 ? "rgba(150,170,210,.05)" : "rgba(0,0,10,.1)"); gg.addColorStop(1, "rgba(0,0,0,0)");
          c.fillStyle = gg; c.fillRect(sx + ax - sr, sy + ay - sr, sr * 2, sr * 2);
        }
      }
      noiseDots(c, S, r, 120000, "rgba(200,215,255,.05)", "rgba(0,0,0,.1)", 1.6);
      for (i = 0; i < 90; i++) {
        var lx = r() * S, ly = r() * S, ll = 30 + r() * 120, la = -0.4 + r() * 0.2;
        c.strokeStyle = "rgba(190,205,240," + (0.03 + r() * 0.05).toFixed(3) + ")"; c.lineWidth = 0.7 + r();
        c.beginPath(); c.moveTo(lx, ly); c.lineTo(lx + Math.cos(la) * ll, ly + Math.sin(la) * ll); c.stroke();
      }
      return cv;
    }

    // oak planks: grain is built from whole-number sine waves so it tiles
    var planks = 4, ph = S / planks;
    for (var p = 0; p < planks; p++) {
      var y0 = p * ph, hue = 26 + r() * 6, lig = 36 + r() * 8;
      c.fillStyle = "hsl(" + hue + ",46%," + lig + "%)"; c.fillRect(0, y0, S, ph);
      c.save(); c.beginPath(); c.rect(0, y0, S, ph); c.clip();
      for (i = 0; i < 80; i++) {
        var gy = y0 + r() * ph, k1 = 1 + Math.floor(r() * 3), k2 = 2 + Math.floor(r() * 5);
        var a1 = 2 + r() * 8, a2 = 0.5 + r() * 2.5, p1 = r() * TAU, p2 = r() * TAU;
        c.strokeStyle = r() < 0.55 ? "rgba(58,28,8," + (0.05 + r() * 0.12).toFixed(3) + ")" : "rgba(255,225,175," + (0.03 + r() * 0.07).toFixed(3) + ")";
        c.lineWidth = 0.6 + r() * 1.8;
        c.beginPath();
        for (var x2 = 0; x2 <= S; x2 += 8) {
          var yy = gy + a1 * Math.sin(TAU * k1 * x2 / S + p1) + a2 * Math.sin(TAU * k2 * x2 / S + p2);
          if (x2) c.lineTo(x2, yy); else c.moveTo(x2, yy);
        }
        c.stroke();
      }
      if (r() < 0.8) {
        var kx = 120 + r() * (S - 240), ky = y0 + ph * (0.3 + r() * 0.4);
        for (k = 6; k > 0; k--) {
          c.strokeStyle = "rgba(50,22,6," + (0.06 + (6 - k) * 0.02).toFixed(3) + ")"; c.lineWidth = 1.4;
          c.beginPath(); c.ellipse(kx, ky, k * 9, k * 4.2, 0, 0, TAU); c.stroke();
        }
      }
      var jx = r() * S;
      c.fillStyle = "rgba(25,10,2,.4)"; c.fillRect(jx, y0, 2.2, ph);
      c.fillStyle = "rgba(255,230,190,.09)"; c.fillRect(jx + 2.2, y0, 1.4, ph);
      c.restore();
      c.fillStyle = "rgba(20,8,0,.55)"; c.fillRect(0, y0 - 1.5, S, 3);
      c.fillStyle = "rgba(255,230,190,.12)"; c.fillRect(0, y0 + 1.5, S, 1.5);
    }
    noiseDots(c, S, r, 60000, "rgba(255,230,190,.04)", "rgba(30,12,0,.05)", 1.3);
    return cv;
  };
})(window.JP = window.JP || {});
