/* Generated artwork: a layered mountain-lake scene drawn on a canvas.
   Used as the default picture (so the game works instantly and offline) and as
   the fallback when a photo can't be downloaded. Same seed, same picture. */
(function (G) {
  "use strict";

  function hash(str) {
    var h = 2166136261 >>> 0;
    for (var i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }

  function rng(seed) {
    var a = seed >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) >>> 0;
      var t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function hsl(h, s, l, a) {
    h = ((h % 360) + 360) % 360;
    return a === undefined
      ? "hsl(" + h + "," + s + "%," + l + "%)"
      : "hsla(" + h + "," + s + "%," + l + "%," + a + ")";
  }

  function pine(c, x, baseY, height, color) {
    var tiers = 5, w = height * 0.34;
    c.fillStyle = color;
    for (var i = 0; i < tiers; i++) {
      var top = baseY - height + (height * 0.82) * (i / tiers);
      var bottom = baseY - height + (height * 0.82) * ((i + 1.35) / tiers);
      var half = w * (0.35 + 0.65 * ((i + 1) / tiers));
      c.beginPath();
      c.moveTo(x, top);
      c.lineTo(x + half, bottom);
      c.lineTo(x - half, bottom);
      c.closePath();
      c.fill();
    }
    c.fillRect(x - w * 0.05, baseY - height * 0.2, w * 0.1, height * 0.2);
  }

  G.hash = hash;
  G.rng = rng;

  G.makeScene = function (seed, w, h, look) {
    var r = rng(hash(String(seed)));
    var cv = document.createElement("canvas");
    cv.width = w; cv.height = h;
    var c = cv.getContext("2d");

    var hue = Math.floor(r() * 360);
    var warm = r() < 0.5;
    if (look) {
      if (typeof look.hue === "number") hue = look.hue;
      if (typeof look.warm === "boolean") warm = look.warm;
    }
    var horizon = h * 0.66;
    var sunX = w * (0.18 + r() * 0.64);
    var sunY = horizon - h * (0.14 + r() * 0.22);
    var sunR = h * (0.045 + r() * 0.04);

    // mountain ridges, far to near
    var layers = [], count = 4, steps = Math.ceil(w / 6);
    for (var i = 0; i < count; i++) {
      var baseY = horizon - h * (0.2 - i * 0.04);
      var amp = h * (0.2 - i * 0.032);
      var f1 = (2.2 + r() * 2.2) * (1 + i * 0.35) / w * Math.PI;
      var f2 = (6 + r() * 4) / w * Math.PI;
      var f3 = (15 + r() * 8) / w * Math.PI;
      var p1 = r() * 6.28, p2 = r() * 6.28, p3 = r() * 6.28;
      var ys = [];
      for (var s = 0; s <= steps; s++) {
        var x = s * 6;
        var v = 0.62 * (1 - Math.abs(Math.sin(x * f1 + p1)))
              + 0.28 * (0.5 + 0.5 * Math.sin(x * f2 + p2))
              + 0.10 * Math.sin(x * f3 + p3);
        ys.push(baseY - amp * v);
      }
      layers.push({
        ys: ys,
        color: hsl(hue + 12 * i, 28 + i * 6, 74 - i * 15),
      });
    }

    var clouds = [];
    for (var k = 0; k < 6; k++) {
      clouds.push({ x: r() * w, y: h * (0.06 + r() * 0.28), rx: w * (0.05 + r() * 0.08), ry: h * (0.012 + r() * 0.018) });
    }

    function paintSky() {
      var g = c.createLinearGradient(0, 0, 0, horizon);
      g.addColorStop(0, hsl(hue, 52, warm ? 34 : 24));
      g.addColorStop(0.6, hsl(hue + 24, 62, 62));
      g.addColorStop(1, hsl(hue + 44, 72, 82));
      c.fillStyle = g;
      c.fillRect(0, 0, w, horizon + 2);

      var sg = c.createRadialGradient(sunX, sunY, 0, sunX, sunY, sunR * 7);
      sg.addColorStop(0, "rgba(255,248,220,0.95)");
      sg.addColorStop(0.15, "rgba(255,236,190,0.55)");
      sg.addColorStop(1, "rgba(255,220,170,0)");
      c.fillStyle = sg;
      c.fillRect(0, 0, w, horizon);
      c.fillStyle = "#fff8e2";
      c.beginPath(); c.arc(sunX, sunY, sunR, 0, 6.2832); c.fill();

      c.fillStyle = "rgba(255,255,255,0.22)";
      clouds.forEach(function (cl) {
        c.beginPath(); c.ellipse(cl.x, cl.y, cl.rx, cl.ry, 0, 0, 6.2832); c.fill();
        c.beginPath(); c.ellipse(cl.x + cl.rx * 0.5, cl.y - cl.ry * 0.6, cl.rx * 0.6, cl.ry * 0.9, 0, 0, 6.2832); c.fill();
      });

      layers.forEach(function (L) {
        c.fillStyle = L.color;
        c.beginPath();
        c.moveTo(0, horizon + 2);
        for (var s = 0; s < L.ys.length; s++) c.lineTo(s * 6, L.ys[s]);
        c.lineTo(w, horizon + 2);
        c.closePath();
        c.fill();
      });

      var hz = c.createLinearGradient(0, horizon - h * 0.12, 0, horizon);
      hz.addColorStop(0, "rgba(255,240,215,0)");
      hz.addColorStop(1, "rgba(255,240,215,0.45)");
      c.fillStyle = hz;
      c.fillRect(0, horizon - h * 0.12, w, h * 0.12 + 2);
    }

    paintSky();

    // reflection in the lake
    c.save();
    c.beginPath(); c.rect(0, horizon, w, h - horizon); c.clip();
    c.translate(0, horizon * 2);
    c.scale(1, -1);
    paintSky();
    c.restore();

    var water = c.createLinearGradient(0, horizon, 0, h);
    water.addColorStop(0, hsl(hue + 30, 50, 55, 0.18));
    water.addColorStop(1, hsl(hue + 200, 55, 14, 0.7));
    c.fillStyle = water;
    c.fillRect(0, horizon, w, h - horizon);

    for (var q = 0; q < 70; q++) {
      var ry = horizon + (h - horizon) * Math.pow(r(), 1.4);
      var rl = w * (0.012 + r() * 0.05) * (0.6 + (ry - horizon) / (h - horizon));
      c.fillStyle = "rgba(255,255,255," + (0.05 + r() * 0.1).toFixed(3) + ")";
      c.fillRect(r() * w, ry, rl, Math.max(1, h * 0.0025));
    }

    // foreground pines
    var dark = hsl(hue + 150, 35, 9);
    var n = 9;
    for (var t = 0; t < n; t++) {
      var onLeft = t % 2 === 0;
      var px = onLeft ? w * r() * 0.22 : w * (0.78 + r() * 0.22);
      pine(c, px, h * (0.93 + r() * 0.07), h * (0.18 + r() * 0.2), dark);
    }
    var shore = c.createLinearGradient(0, h * 0.94, 0, h);
    shore.addColorStop(0, "rgba(0,0,0,0)");
    shore.addColorStop(1, "rgba(0,0,0,0.45)");
    c.fillStyle = shore;
    c.fillRect(0, h * 0.94, w, h * 0.06);

    return cv;
  };
})(window.JP = window.JP || {});
