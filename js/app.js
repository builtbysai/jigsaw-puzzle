/* Jigsaw Puzzle: game state, camera, input, rendering and UI.

   The play area is a "table" drawn on one canvas. The target board sits at world
   (0,0); pieces start scattered on the table around it. The camera pans and zooms
   (wheel, pinch, drag on empty felt), and a dropped piece within snapping range
   of its home cell locks into place. */
(function (G) {
  "use strict";

  var E = G.Engine;
  var $ = function (id) { return document.getElementById(id); };

  var canvas = $("table");
  var ctx = canvas.getContext("2d");
  var hitCtx = document.createElement("canvas").getContext("2d");
  var stage = $("stage");
  var reduceMotion = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;

  var BOARD_LONG = 1200;           // long side of the board in world units
  var MAX_ZOOM = 4;
  var SIZES = [12, 24, 48, 96, 192];
  var PICSUM = "https://picsum.photos/seed/";

  /* ---------------- preferences ---------------- */
  var PREF_KEY = "jigsaw-puzzle:v2";
  function loadPrefs() {
    var p = { n: 24, guide: true };
    try {
      var s = JSON.parse(localStorage.getItem(PREF_KEY) || "{}");
      if (SIZES.indexOf(s.n) !== -1) p.n = s.n;
      if (typeof s.guide === "boolean") p.guide = s.guide;
    } catch (e) { /* storage unavailable */ }
    return p;
  }
  function savePrefs() {
    try { localStorage.setItem(PREF_KEY, JSON.stringify({ n: S.n, guide: S.guide })); } catch (e) { /* ignore */ }
  }
  var prefs = loadPrefs();

  /* ---------------- state ---------------- */
  var S = {
    img: null, imgW: 0, imgH: 0, name: "", seed: "",
    n: prefs.n, cols: 0, rows: 0, total: 0,
    bw: 0, bh: 0, cw: 0, ch: 0, m: 0, k: 1,
    table: { x: 0, y: 0, w: 1, h: 1 },
    pieces: [], order: [], locked: [],
    placed: 0, moves: 0, elapsed: 0, startedAt: 0, running: false, solved: false, winAt: 0,
    undo: [], hint: null, flash: null, peek: false, guide: prefs.guide, drag: null
  };
  var cam = { x: 0, y: 0, z: 1, auto: true, tween: null };
  var view = { w: 1, h: 1, dpr: 1 };
  var theme = {};

  function readTheme() {
    var cs = getComputedStyle(document.documentElement);
    function v(n) { return cs.getPropertyValue(n).trim(); }
    theme = { felt: v("--felt"), feltDeep: v("--felt-deep"), gold: v("--gold-bright"), accent: v("--accent") };
  }

  /* ---------------- helpers ---------------- */
  function fmt(s) { var m = Math.floor(s / 60), r = s % 60; return m + ":" + (r < 10 ? "0" : "") + r; }
  function clamp(v, a, b) { return Math.min(b, Math.max(a, v)); }

  var toastEl = $("toast"), toastTimer = 0;
  function toast(msg) {
    toastEl.textContent = msg;
    toastEl.classList.add("on");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastEl.classList.remove("on"); }, 3200);
  }

  /* Destructive actions need a second tap while a puzzle is in progress. */
  var pending = { key: "", until: 0 };
  function guard(key, fn) {
    var inProgress = S.pieces.length && S.placed > 0 && !S.solved;
    if (!inProgress) { pending.key = ""; fn(); return; }
    if (pending.key === key && Date.now() < pending.until) { pending.key = ""; fn(); return; }
    pending.key = key; pending.until = Date.now() + 3500;
    toast("This puzzle is in progress. Tap again to start over.");
  }

  /* ---------------- canvas + camera ---------------- */
  function resize() {
    var r = stage.getBoundingClientRect();
    view.w = Math.max(1, Math.round(r.width));
    view.h = Math.max(1, Math.round(r.height));
    view.dpr = Math.min(window.devicePixelRatio || 1, 3);
    canvas.width = Math.round(view.w * view.dpr);
    canvas.height = Math.round(view.h * view.dpr);
    if (S.pieces.length) {
      if (cam.auto) applyCam(fitRect(S.table, 14)); else clampCam();
    }
    dirty();
  }

  function fitRect(rect, pad) {
    var z = Math.min((view.w - pad * 2) / rect.w, (view.h - pad * 2) / rect.h);
    return { x: rect.x + rect.w / 2, y: rect.y + rect.h / 2, z: z };
  }
  function applyCam(c) { cam.x = c.x; cam.y = c.y; cam.z = c.z; cam.tween = null; clampCam(); }
  function minZoom() { return fitRect(S.table, 14).z * 0.85; }
  function maxZoom() { return Math.max(MAX_ZOOM, minZoom() * 1.5); }

  function clampCam() {
    cam.z = clamp(cam.z, minZoom(), maxZoom());
    var t = S.table, hx = view.w / 2 / cam.z, hy = view.h / 2 / cam.z;
    cam.x = hx * 2 >= t.w ? t.x + t.w / 2 : clamp(cam.x, t.x + hx, t.x + t.w - hx);
    cam.y = hy * 2 >= t.h ? t.y + t.h / 2 : clamp(cam.y, t.y + hy, t.y + t.h - hy);
  }

  function flyTo(target, ms) {
    cam.auto = false;
    if (reduceMotion || !ms) { applyCam(target); dirty(); return; }
    cam.tween = { from: { x: cam.x, y: cam.y, z: cam.z }, to: target, start: performance.now(), dur: ms };
    dirty();
  }

  function toWorld(px, py) { return { x: cam.x + (px - view.w / 2) / cam.z, y: cam.y + (py - view.h / 2) / cam.z }; }

  function zoomAt(px, py, z) {
    var w = toWorld(px, py);
    cam.tween = null; cam.auto = false;
    cam.z = clamp(z, minZoom(), maxZoom());
    cam.x = w.x - (px - view.w / 2) / cam.z;
    cam.y = w.y - (py - view.h / 2) / cam.z;
    clampCam();
    dirty();
  }

  /* ---------------- game setup ---------------- */
  /* Lay out a table shaped like the viewport (so the fitted view has no dead
     strips), then find enough free slots around the board for every piece. */
  function buildTable() {
    var cw = S.cw, ch = S.ch, n = S.total;
    var slotW = cw * 1.3, slotH = ch * 1.3;
    var pad = Math.min(cw, ch) * 0.15;
    var aspect = view.w / view.h;
    var minM = Math.max(slotW, slotH);
    var th0 = S.bh + 2 * minM, tw0 = S.bw + 2 * minM;
    var th = Math.max(th0, tw0 / aspect), tw = th * aspect;
    var slots;
    for (var guard = 0; guard < 60; guard++) {
      var tx = S.bw / 2 - tw / 2, ty = S.bh / 2 - th / 2;
      var nc = Math.floor(tw / slotW), nr = Math.floor(th / slotH);
      var ox = tx + (tw - nc * slotW) / 2, oy = ty + (th - nr * slotH) / 2;
      slots = [];
      for (var r = 0; r < nr; r++) {
        for (var c = 0; c < nc; c++) {
          var x0 = ox + c * slotW, y0 = oy + r * slotH;
          var hitsBoard = x0 + slotW > -pad && x0 < S.bw + pad && y0 + slotH > -pad && y0 < S.bh + pad;
          if (!hitsBoard) slots.push({ x: x0 + slotW / 2, y: y0 + slotH / 2 });
        }
      }
      S.table = { x: tx, y: ty, w: tw, h: th };
      if (slots.length >= n) break;
      tw *= 1.05; th *= 1.05;
    }
    return slots;
  }

  function newGame() {
    stopClock();
    var aspect = S.imgW / S.imgH;
    var g = E.gridFor(S.n, aspect);
    S.cols = g.cols; S.rows = g.rows; S.total = g.cols * g.rows;
    if (aspect >= 1) { S.bw = BOARD_LONG; S.bh = BOARD_LONG / aspect; }
    else { S.bh = BOARD_LONG; S.bw = BOARD_LONG * aspect; }
    S.cw = S.bw / S.cols; S.ch = S.bh / S.rows;
    S.m = Math.ceil(Math.max(S.cw, S.ch) * 0.32);
    S.k = clamp(Math.max(S.imgW, S.imgH) / BOARD_LONG, 1, 2);

    var rand = Math.random;
    var edges = E.makeEdges(S.cols, S.rows, rand);
    var slots = E.shuffle(buildTable(), rand);
    var geo = { cw: S.cw, ch: S.ch, m: S.m, k: S.k };

    S.pieces = []; S.order = []; S.locked = []; S.undo = [];
    S.placed = 0; S.moves = 0; S.elapsed = 0; S.solved = false; S.winAt = 0;
    S.hint = null; S.flash = null; S.drag = null; S.peek = false;

    for (var r = 0; r < S.rows; r++) {
      for (var c = 0; c < S.cols; c++) {
        var p = { r: r, c: c, hx: c * S.cw, hy: r * S.ch, state: "loose" };
        p.path = E.piecePath(S.cw, S.ch, edges, r, c, S.cols, S.rows);
        p.sprite = E.makeSprite(S.img, S.imgW, S.imgH, S.bw, S.bh, p, geo);
        S.pieces.push(p);
      }
    }
    E.shuffle(S.pieces.slice(), rand).forEach(function (p, i) {
      var s = slots[i];
      var jx = (rand() - 0.5) * S.cw * 0.22, jy = (rand() - 0.5) * S.ch * 0.22;
      p.x = s.x - S.cw / 2 + jx; p.y = s.y - S.ch / 2 + jy;
      S.order.push(p);
    });

    $("winBar").classList.remove("on");
    cam.auto = true;
    applyCam(fitRect(S.table, 14));
    updateStats(); updateButtons();
    dirty();
  }

  /* ---------------- clock ---------------- */
  var clockId = 0;
  function startClock() {
    if (S.running || S.solved) return;
    S.running = true;
    S.startedAt = Date.now() - S.elapsed * 1000;
    clockId = setInterval(function () {
      S.elapsed = Math.floor((Date.now() - S.startedAt) / 1000);
      $("statTime").textContent = fmt(S.elapsed);
    }, 250);
  }
  function stopClock() {
    S.running = false;
    if (clockId) { clearInterval(clockId); clockId = 0; }
  }
  document.addEventListener("visibilitychange", function () {
    if (document.hidden) {
      if (S.running) { S.elapsed = Math.floor((Date.now() - S.startedAt) / 1000); stopClock(); S.resumeOnShow = true; }
    } else if (S.resumeOnShow) { S.resumeOnShow = false; startClock(); }
  });

  function updateStats() {
    $("statPlaced").textContent = S.placed + " / " + S.total;
    $("statTime").textContent = fmt(S.elapsed);
    $("statMoves").textContent = String(S.moves);
  }
  function updateButtons() {
    $("undoBtn").disabled = !S.undo.length || S.solved;
    $("hintBtn").disabled = S.solved || !S.order.length;
    $("ghostBtn").setAttribute("aria-pressed", String(S.guide));
    Array.prototype.forEach.call($("sizeSeg").children, function (b) {
      var on = Number(b.dataset.n) === S.n;
      b.classList.toggle("sel", on);
      b.setAttribute("aria-pressed", String(on));
    });
  }

  /* ---------------- moves, snapping, undo, win ---------------- */
  function bringToFront(p) {
    var i = S.order.indexOf(p);
    if (i !== -1) { S.order.splice(i, 1); S.order.push(p); }
  }

  function lock(p) {
    p.x = p.hx; p.y = p.hy; p.state = "locked";
    var i = S.order.indexOf(p);
    if (i !== -1) S.order.splice(i, 1);
    S.locked.push(p);
    S.placed++;
    S.flash = { p: p, until: performance.now() + 450 };
  }

  function finishDrag() {
    var d = S.drag; if (!d) return;
    S.drag = null;
    canvas.classList.remove("grabbing");
    var p = d.p;
    if (!d.moved) { p.x = d.startX; p.y = d.startY; dirty(); return; }
    var entry = { p: p, x: d.startX, y: d.startY, placed: S.placed, moves: S.moves };
    S.moves++;
    var snap = Math.min(S.cw, S.ch) * 0.32;
    if (Math.hypot(p.x - p.hx, p.y - p.hy) < snap) lock(p);
    S.undo.push(entry);
    if (S.undo.length > 100) S.undo.shift();
    if (S.placed === S.total) win();
    updateStats(); updateButtons(); dirty();
  }

  function undoLast() {
    var u = S.undo.pop();
    if (!u || S.solved) { updateButtons(); return; }
    var p = u.p;
    if (p.state === "locked") {
      S.locked.splice(S.locked.indexOf(p), 1);
      S.order.push(p);
      p.state = "loose";
    }
    p.x = u.x; p.y = u.y;
    S.placed = u.placed; S.moves = u.moves;
    S.flash = null;
    updateStats(); updateButtons(); dirty();
  }

  function bestKey() { return "jigsaw-puzzle:best:" + S.total; }
  function win() {
    stopClock();
    S.solved = true;
    S.winAt = performance.now();
    S.hint = null;
    var text = "Solved in " + fmt(S.elapsed) + " with " + S.moves + " moves.";
    try {
      var best = Number(localStorage.getItem(bestKey()) || 0);
      if (!best || S.elapsed < best) {
        localStorage.setItem(bestKey(), String(S.elapsed));
        if (best) text += " New best time!";
      } else {
        text += " Best: " + fmt(best) + ".";
      }
    } catch (e) { /* ignore */ }
    $("winText").textContent = text;
    $("winBar").classList.add("on");
    flyTo(fitRect({ x: 0, y: 0, w: S.bw, h: S.bh }, 22), 700);
  }

  /* ---------------- hint ---------------- */
  function hint() {
    if (S.solved || !S.order.length) return;
    var p = S.order[Math.floor(Math.random() * S.order.length)];
    S.hint = { p: p, until: performance.now() + 3600 };
    var m = S.m;
    var x0 = Math.min(p.x, p.hx) - m, y0 = Math.min(p.y, p.hy) - m;
    var x1 = Math.max(p.x, p.hx) + S.cw + m, y1 = Math.max(p.y, p.hy) + S.ch + m;
    var tl = worldToScreen(x0, y0), br = worldToScreen(x1, y1);
    var inside = tl.x > 10 && tl.y > 10 && br.x < view.w - 10 && br.y < view.h - 10;
    if (!inside) {
      var f = fitRect({ x: x0, y: y0, w: x1 - x0, h: y1 - y0 }, 50);
      flyTo({ x: f.x, y: f.y, z: Math.min(cam.z, f.z) }, 450);
    }
    dirty();
  }
  function worldToScreen(wx, wy) { return { x: (wx - cam.x) * cam.z + view.w / 2, y: (wy - cam.y) * cam.z + view.h / 2 }; }

  /* ---------------- rendering ---------------- */
  var raf = 0, lastTick = 0;
  function dirty() { if (!raf) raf = requestAnimationFrame(tick); }

  function tick(now) {
    raf = 0;
    var dt = lastTick ? Math.min(0.05, (now - lastTick) / 1000) : 0.016;
    lastTick = now;
    var again = false;

    if (cam.tween) {
      var tw = cam.tween, u = Math.min(1, (now - tw.start) / tw.dur);
      var e = u < 0.5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2;
      cam.x = tw.from.x + (tw.to.x - tw.from.x) * e;
      cam.y = tw.from.y + (tw.to.y - tw.from.y) * e;
      cam.z = tw.from.z + (tw.to.z - tw.from.z) * e;
      clampCam();
      if (u >= 1) cam.tween = null; else again = true;
    }

    var d = S.drag;
    if (d && (d.edge.x || d.edge.y)) {
      var sp = 520 / cam.z * dt;
      cam.x += d.edge.x * sp; cam.y += d.edge.y * sp;
      clampCam();
      dragTo(d.px, d.py);
      again = true;
    }

    draw(now);

    if (S.hint && now < S.hint.until) again = true;
    if (S.flash && now < S.flash.until) again = true;
    if (S.solved && now - S.winAt < 900) again = true;
    if (again) raf = requestAnimationFrame(tick); else lastTick = 0;
  }

  function draw(now) {
    var d = view.dpr;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = theme.feltDeep;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    if (!S.pieces.length) return;

    ctx.setTransform(d * cam.z, 0, 0, d * cam.z, d * (view.w / 2 - cam.x * cam.z), d * (view.h / 2 - cam.y * cam.z));
    ctx.imageSmoothingQuality = "high";
    var z = cam.z, t = S.table, m = S.m, cw = S.cw, ch = S.ch;

    ctx.fillStyle = theme.felt;
    ctx.fillRect(t.x, t.y, t.w, t.h);

    // board
    ctx.fillStyle = "rgba(0,0,0,0.22)";
    ctx.fillRect(0, 0, S.bw, S.bh);
    if (S.guide || S.solved) {
      ctx.globalAlpha = 0.26;
      ctx.drawImage(S.img, 0, 0, S.bw, S.bh);
      ctx.globalAlpha = 1;
    }
    ctx.beginPath();
    for (var i = 1; i < S.cols; i++) { ctx.moveTo(i * cw, 0); ctx.lineTo(i * cw, S.bh); }
    for (var j = 1; j < S.rows; j++) { ctx.moveTo(0, j * ch); ctx.lineTo(S.bw, j * ch); }
    ctx.strokeStyle = "rgba(255,255,255,0.13)";
    ctx.lineWidth = 1 / z;
    ctx.stroke();
    ctx.strokeStyle = "rgba(255,255,255,0.4)";
    ctx.lineWidth = 2 / z;
    ctx.strokeRect(0, 0, S.bw, S.bh);

    var k, p;
    for (k = 0; k < S.locked.length; k++) {
      p = S.locked[k];
      ctx.drawImage(p.sprite, p.x - m, p.y - m, cw + 2 * m, ch + 2 * m);
    }

    // flash on the piece that just locked
    if (S.flash && now < S.flash.until) {
      var fp = S.flash.p;
      ctx.save();
      ctx.translate(fp.x, fp.y);
      ctx.globalAlpha = 0.55 * (S.flash.until - now) / 450;
      ctx.fillStyle = "#fff";
      ctx.fill(fp.path);
      ctx.restore();
    }

    // hint: where the piece is, and where it belongs
    if (S.hint && now < S.hint.until && S.hint.p.state === "loose") {
      var hp = S.hint.p, pulse = 0.55 + 0.45 * Math.sin(now / 170);
      ctx.save();
      ctx.lineWidth = 3.5 / z;
      ctx.strokeStyle = theme.gold;
      ctx.fillStyle = theme.gold;
      ctx.translate(hp.hx, hp.hy);
      ctx.globalAlpha = 0.2 + 0.2 * pulse;
      ctx.fill(hp.path);
      ctx.globalAlpha = 0.9;
      ctx.setLineDash([9 / z, 6 / z]);
      ctx.stroke(hp.path);
      ctx.restore();
    }

    var dragged = S.drag ? S.drag.p : null;
    for (k = 0; k < S.order.length; k++) {
      p = S.order[k];
      if (p === dragged) continue;
      ctx.drawImage(p.sprite, p.x - m, p.y - m, cw + 2 * m, ch + 2 * m);
    }
    if (dragged) {
      ctx.save();
      ctx.shadowColor = "rgba(0,0,0,0.5)";
      ctx.shadowBlur = 16 * d;
      ctx.shadowOffsetY = 6 * d;
      ctx.drawImage(dragged.sprite, dragged.x - m, dragged.y - m, cw + 2 * m, ch + 2 * m);
      ctx.restore();
    }

    if (S.hint && now < S.hint.until && S.hint.p.state === "loose") {
      var hq = S.hint.p;
      ctx.save();
      ctx.translate(hq.x, hq.y);
      ctx.lineWidth = 4 / z;
      ctx.strokeStyle = theme.gold;
      ctx.globalAlpha = 0.55 + 0.45 * Math.sin(now / 170);
      ctx.stroke(hq.path);
      ctx.restore();
    }

    if (S.peek) {
      ctx.drawImage(S.img, 0, 0, S.bw, S.bh);
      ctx.strokeStyle = "rgba(255,255,255,0.7)";
      ctx.lineWidth = 2 / z;
      ctx.strokeRect(0, 0, S.bw, S.bh);
    }

    if (S.solved) {
      ctx.globalAlpha = clamp((now - S.winAt) / 800, 0, 1);
      ctx.drawImage(S.img, 0, 0, S.bw, S.bh);
      ctx.globalAlpha = 1;
    }
  }

  /* ---------------- input ---------------- */
  var ptrs = new Map();
  var gesture = null;

  function local(e) { var r = canvas.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; }

  function hitTest(wx, wy) {
    var tol = Math.min(9 / cam.z, Math.min(S.cw, S.ch) * 0.25);
    var offs = [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]];
    for (var k = 0; k < offs.length; k++) {
      var x = wx + offs[k][0] * tol, y = wy + offs[k][1] * tol;
      for (var i = S.order.length - 1; i >= 0; i--) {
        var p = S.order[i], lx = x - p.x, ly = y - p.y;
        if (lx < -S.m || ly < -S.m || lx > S.cw + S.m || ly > S.ch + S.m) continue;
        if (hitCtx.isPointInPath(p.path, lx, ly)) return p;
      }
    }
    return null;
  }

  function beginDrag(p, w, pt) {
    bringToFront(p);
    S.drag = { p: p, offX: w.x - p.x, offY: w.y - p.y, startX: p.x, startY: p.y, px: pt.x, py: pt.y, sx: pt.x, sy: pt.y, moved: false, edge: { x: 0, y: 0 } };
    gesture = { type: "drag" };
    canvas.classList.add("grabbing");
    dirty();
  }

  function dragTo(px, py) {
    var d = S.drag; if (!d) return;
    d.px = px; d.py = py;
    if (!d.moved && Math.hypot(px - d.sx, py - d.sy) > 4) { d.moved = true; startClock(); }
    var w = toWorld(px, py), t = S.table;
    d.p.x = clamp(w.x - d.offX, t.x, t.x + t.w - S.cw);
    d.p.y = clamp(w.y - d.offY, t.y, t.y + t.h - S.ch);
    var band = 26;
    d.edge.x = px < band ? -1 : px > view.w - band ? 1 : 0;
    d.edge.y = py < band ? -1 : py > view.h - band ? 1 : 0;
    dirty();
  }

  function startPinch() {
    var a = Array.from(ptrs.values());
    var mid = { x: (a[0].x + a[1].x) / 2, y: (a[0].y + a[1].y) / 2 };
    gesture = { type: "pinch", dist: Math.hypot(a[0].x - a[1].x, a[0].y - a[1].y) || 1, z: cam.z, wpt: toWorld(mid.x, mid.y) };
    cam.tween = null; cam.auto = false;
  }

  canvas.addEventListener("pointerdown", function (e) {
    if (!S.pieces.length) return;
    try { canvas.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
    var pt = local(e);
    ptrs.set(e.pointerId, pt);
    if (ptrs.size === 2) { finishDrag(); startPinch(); return; }
    if (ptrs.size > 2) return;
    var w = toWorld(pt.x, pt.y);
    var p = (e.button === 0 && !S.solved) ? hitTest(w.x, w.y) : null;
    if (p) { beginDrag(p, w, pt); return; }
    cam.tween = null; cam.auto = false;
    gesture = { type: "pan", x: pt.x, y: pt.y };
    canvas.classList.add("grabbing");
  });

  canvas.addEventListener("pointermove", function (e) {
    var pt = local(e);
    if (!ptrs.has(e.pointerId)) {
      if (e.pointerType === "mouse" && S.pieces.length) {
        var w = toWorld(pt.x, pt.y);
        canvas.classList.toggle("over-piece", !S.solved && !!hitTest(w.x, w.y));
      }
      return;
    }
    ptrs.set(e.pointerId, pt);
    if (!gesture) return;
    if (gesture.type === "drag") dragTo(pt.x, pt.y);
    else if (gesture.type === "pan") {
      cam.x -= (pt.x - gesture.x) / cam.z;
      cam.y -= (pt.y - gesture.y) / cam.z;
      gesture.x = pt.x; gesture.y = pt.y;
      clampCam(); dirty();
    } else if (gesture.type === "pinch" && ptrs.size >= 2) {
      var a = Array.from(ptrs.values());
      var mid = { x: (a[0].x + a[1].x) / 2, y: (a[0].y + a[1].y) / 2 };
      var dist = Math.hypot(a[0].x - a[1].x, a[0].y - a[1].y) || 1;
      cam.z = clamp(gesture.z * dist / gesture.dist, minZoom(), maxZoom());
      cam.x = gesture.wpt.x - (mid.x - view.w / 2) / cam.z;
      cam.y = gesture.wpt.y - (mid.y - view.h / 2) / cam.z;
      clampCam(); dirty();
    }
  });

  function endPointer(e) {
    if (!ptrs.has(e.pointerId)) return;
    ptrs.delete(e.pointerId);
    if (gesture && gesture.type === "drag") finishDrag();
    if (ptrs.size === 0) { gesture = null; canvas.classList.remove("grabbing"); }
    else if (gesture && gesture.type === "pinch" && ptrs.size < 2) { gesture = null; }
  }
  canvas.addEventListener("pointerup", endPointer);
  canvas.addEventListener("pointercancel", endPointer);
  canvas.addEventListener("pointerleave", function () { canvas.classList.remove("over-piece"); });
  canvas.addEventListener("contextmenu", function (e) { e.preventDefault(); });

  canvas.addEventListener("wheel", function (e) {
    e.preventDefault();
    if (!S.pieces.length) return;
    var unit = e.deltaMode === 1 ? 16 : 1;
    var pt = local(e);
    zoomAt(pt.x, pt.y, cam.z * Math.exp(-e.deltaY * unit * (e.ctrlKey ? 0.012 : 0.0016)));
  }, { passive: false });

  /* ---------------- toolbar ---------------- */
  $("newBtn").addEventListener("click", function () { guard("new", function () { newGame(); }); });
  $("undoBtn").addEventListener("click", undoLast);
  $("hintBtn").addEventListener("click", hint);
  $("againBtn").addEventListener("click", function () { newGame(); });
  $("ghostBtn").addEventListener("click", function () {
    S.guide = !S.guide; savePrefs(); updateButtons(); dirty();
  });
  $("sizeSeg").addEventListener("click", function (e) {
    var b = e.target.closest("button"); if (!b) return;
    var n = Number(b.dataset.n);
    if (n === S.n) return;
    guard("size" + n, function () { S.n = n; savePrefs(); newGame(); });
  });

  var peekBtn = $("peekBtn");
  function peekOn(e) { if (e && e.preventDefault && e.type !== "keydown") e.preventDefault(); S.peek = true; dirty(); }
  function peekOff() { if (S.peek) { S.peek = false; dirty(); } }
  peekBtn.addEventListener("pointerdown", peekOn);
  ["pointerup", "pointerleave", "pointercancel", "blur"].forEach(function (ev) { peekBtn.addEventListener(ev, peekOff); });
  peekBtn.addEventListener("keydown", function (e) { if (e.key === " " || e.key === "Enter") { e.preventDefault(); peekOn(e); } });
  peekBtn.addEventListener("keyup", peekOff);
  peekBtn.addEventListener("contextmenu", function (e) { e.preventDefault(); });

  $("zoomIn").addEventListener("click", function () { zoomAt(view.w / 2, view.h / 2, cam.z * 1.4); });
  $("zoomOut").addEventListener("click", function () { zoomAt(view.w / 2, view.h / 2, cam.z / 1.4); });
  $("fitAll").addEventListener("click", function () { flyTo(fitRect(S.table, 14), 350); cam.auto = true; });
  $("fitBoard").addEventListener("click", function () { flyTo(fitRect({ x: 0, y: 0, w: S.bw, h: S.bh }, 22), 350); });

  document.addEventListener("keydown", function (e) {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") { e.preventDefault(); undoLast(); }
  });

  /* ---------------- pictures ---------------- */
  var DEFAULT = { seed: "mountain-lake", name: "Mountain Lake", generated: true, look: { hue: 212, warm: true } };
  var entries = [DEFAULT].concat(G.PICTURES.map(function (p) { return { seed: p[0], name: p[1] }; }));
  var picker = $("picker"), loadSeq = 0, selectedBtn = null;

  function setBusy(msg) {
    var el = $("busy");
    if (msg) { el.textContent = msg; el.classList.add("on"); } else el.classList.remove("on");
  }

  function adopt(source, w, h, name, btn) {
    S.img = source; S.imgW = w; S.imgH = h; S.name = name;
    $("picName").textContent = name;
    if (selectedBtn) selectedBtn.classList.remove("sel");
    selectedBtn = btn || null;
    if (selectedBtn) selectedBtn.classList.add("sel");
    newGame();
  }

  function generated(entry) { return G.makeScene(entry.seed, 1800, 1200, entry.look); }

  function loadEntry(entry, btn) {
    var seq = ++loadSeq;
    if (entry.generated) { adopt(generated(entry), 1800, 1200, entry.name, btn); return; }
    setBusy("Loading " + entry.name + "…");
    var im = new Image(), done = false;
    function fail() {
      if (done || seq !== loadSeq) return;
      done = true; setBusy("");
      toast("Couldn't download that photo, so this is generated artwork instead.");
      adopt(generated(entry), 1800, 1200, entry.name, btn);
    }
    var timer = setTimeout(function () { if (!done && seq === loadSeq) { im.onload = im.onerror = null; fail(); } }, 15000);
    im.onload = function () {
      clearTimeout(timer);
      if (done || seq !== loadSeq) return;
      done = true; setBusy("");
      adopt(im, im.naturalWidth, im.naturalHeight, entry.name, btn);
    };
    im.onerror = function () { clearTimeout(timer); fail(); };
    im.src = PICSUM + encodeURIComponent(entry.seed) + "/1200/800";
  }

  function buildPicker() {
    var frag = document.createDocumentFragment();
    entries.forEach(function (entry) {
      var b = document.createElement("button");
      b.type = "button"; b.className = "pick";
      b.dataset.name = entry.name.toLowerCase();
      b.style.setProperty("--h", String(G.hash(entry.seed) % 360));
      var im = document.createElement("img");
      im.alt = ""; im.draggable = false; im.loading = "lazy"; im.decoding = "async";
      if (entry.generated) im.src = thumbFor(entry);
      else im.src = PICSUM + encodeURIComponent(entry.seed) + "/184/123";
      im.onerror = function () { im.onerror = null; im.removeAttribute("src"); };
      var s = document.createElement("span"); s.textContent = entry.name;
      b.appendChild(im); b.appendChild(s);
      b.addEventListener("click", function () { guard("pic:" + entry.seed, function () { loadEntry(entry, b); }); });
      entry.btn = b;
      frag.appendChild(b);
    });
    var up = document.createElement("button");
    up.type = "button"; up.className = "pick upload"; up.dataset.name = "your photo upload";
    up.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 16V4m0 0l-4 4m4-4l4 4"/><path d="M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3"/></svg><span>Your photo</span>';
    up.addEventListener("click", function () { $("fileInput").click(); });
    frag.insertBefore(up, frag.firstChild);
    picker.appendChild(frag);
    return up;
  }

  function thumbFor(entry) {
    var c = G.makeScene(entry.seed, 276, 184, entry.look);
    return c.toDataURL("image/jpeg", 0.7);
  }

  var uploadBtn = buildPicker();

  $("picSearch").addEventListener("input", function () {
    var q = this.value.trim().toLowerCase();
    Array.prototype.forEach.call(picker.children, function (el) {
      el.hidden = !!q && el.dataset.name.indexOf(q) === -1;
    });
  });

  $("fileInput").addEventListener("change", function () {
    var f = this.files && this.files[0];
    this.value = "";
    if (!f) return;
    guard("upload", function () {
      var seq = ++loadSeq;
      var url = URL.createObjectURL(f), im = new Image();
      setBusy("Opening your photo…");
      im.onload = function () {
        URL.revokeObjectURL(url);
        setBusy("");
        if (seq !== loadSeq) return;
        var w = im.naturalWidth, h = im.naturalHeight, src = im, long = Math.max(w, h);
        if (long > 2400) {
          var f2 = 2400 / long, c = document.createElement("canvas");
          c.width = Math.round(w * f2); c.height = Math.round(h * f2);
          c.getContext("2d").drawImage(im, 0, 0, c.width, c.height);
          src = c; w = c.width; h = c.height;
        }
        adopt(src, w, h, "Your photo", uploadBtn);
      };
      im.onerror = function () { URL.revokeObjectURL(url); setBusy(""); toast("That file couldn't be opened as a picture."); };
      im.src = url;
    });
  });

  /* ---------------- start ---------------- */
  readTheme();
  if (window.matchMedia) {
    var mq = matchMedia("(prefers-color-scheme: dark)");
    var onTheme = function () { readTheme(); dirty(); };
    if (mq.addEventListener) mq.addEventListener("change", onTheme); else if (mq.addListener) mq.addListener(onTheme);
  }
  if (window.ResizeObserver) new ResizeObserver(resize).observe(stage); else window.addEventListener("resize", resize);
  resize();
  loadEntry(DEFAULT, DEFAULT.btn);

  G.game = { state: S, cam: cam, view: view, toWorld: toWorld, worldToScreen: worldToScreen };
})(window.JP = window.JP || {});
