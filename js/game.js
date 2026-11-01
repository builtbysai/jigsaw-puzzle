/* Game core: puzzle state, piece groups, input, camera and rendering.

   The play area is a table drawn on one canvas. The board sits at world (0,0)
   and pieces start scattered around it. Every piece belongs to a group:
   a group is either the locked board group or a loose cluster that moves as
   one. Two groups merge when a pair of neighbouring pieces line up, and a
   group locks when any of its pieces lands on its home cell. */
(function (G) {
  "use strict";

  var E = G.Engine, clamp = G.clamp, TAU = G.TAU;

  var BOARD_LONG = 1200;     // long side of the board, in world units
  var IMG_LONG = 2000;       // resolution generated pictures are drawn at
  var MAX_ZOOM = 4;
  var COMBO_MS = 6000;
  var PAR = { 12: 75, 24: 180, 48: 480, 96: 1200, 192: 3000 };

  function noop() {}
  var hooks = { change: noop, win: noop, toast: noop, save: noop };
  var canvas, ctx, stage;
  var hitCtx = document.createElement("canvas").getContext("2d");
  var S = null;                                   // current game, or null
  var cam = { x: 0, y: 0, z: 1, auto: true, tween: null };
  var view = { w: 1, h: 1, dpr: 1 };
  var opts = { guide: true, edges: false, haptics: true, table: "oak" };
  var reduceMotion = !!(window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches);
  var tablePattern = null, tableKind = "";
  var parts = [];
  var raf = 0, lastTick = 0, saveTimer = 0;
  var ptrs = new Map(), gesture = null, lastTap = { t: 0, x: 0, y: 0 };

  /* ---------------- setup ---------------- */
  function init(c, st, h) {
    canvas = c; ctx = c.getContext("2d"); stage = st;
    for (var k in h) hooks[k] = h[k];
    bindInput();
    if (window.ResizeObserver) new ResizeObserver(resize).observe(stage); else window.addEventListener("resize", resize);
    document.addEventListener("visibilitychange", function () {
      if (!S) return;
      if (document.hidden) { if (S.running) { pauseClock(); S.resume = true; } flushSave(); }
      else if (S.resume) { S.resume = false; startClock(); }
    });
    window.addEventListener("pagehide", flushSave);
    resize();
  }

  function setOptions(o) {
    for (var k in o) opts[k] = o[k];
    if (o.table) buildTablePattern();
    dirty();
  }

  function buildTablePattern() {
    if (!ctx || tableKind === opts.table) return;
    tableKind = opts.table;
    var tile = G.makeTableTile(tableKind);
    tablePattern = ctx.createPattern(tile, "repeat");
    if (tablePattern && tablePattern.setTransform && window.DOMMatrix) tablePattern.setTransform(new DOMMatrix([1.6, 0, 0, 1.6, 0, 0]));
  }

  function resize() {
    var r = stage.getBoundingClientRect();
    view.w = Math.max(1, Math.round(r.width));
    view.h = Math.max(1, Math.round(r.height));
    view.dpr = Math.min(window.devicePixelRatio || 1, 3);
    canvas.width = Math.round(view.w * view.dpr);
    canvas.height = Math.round(view.h * view.dpr);
    if (S) { if (cam.auto) applyCam(fitRect(S.table, 18)); else clampCam(); }
    dirty();
  }

  /* ---------------- camera ---------------- */
  function fitRect(rect, pad) {
    var z = Math.min((view.w - pad * 2) / rect.w, (view.h - pad * 2) / rect.h);
    return { x: rect.x + rect.w / 2, y: rect.y + rect.h / 2, z: z };
  }
  function boardRect() { return { x: 0, y: 0, w: S.bw, h: S.bh }; }
  function applyCam(c) { cam.x = c.x; cam.y = c.y; cam.z = c.z; cam.tween = null; clampCam(); }
  function minZoom() { return fitRect(S.table, 18).z * 0.85; }
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
  function toScreen(wx, wy) { return { x: (wx - cam.x) * cam.z + view.w / 2, y: (wy - cam.y) * cam.z + view.h / 2 }; }
  function zoomAt(px, py, z) {
    if (!S) return;
    var w = toWorld(px, py);
    cam.tween = null; cam.auto = false;
    cam.z = clamp(z, minZoom(), maxZoom());
    cam.x = w.x - (px - view.w / 2) / cam.z;
    cam.y = w.y - (py - view.h / 2) / cam.z;
    clampCam(); dirty();
  }
  function fit(kind) {
    if (!S) return;
    if (kind === "board") flyTo(fitRect(boardRect(), 28), 380);
    else { flyTo(fitRect(S.table, 18), 380); cam.auto = true; }
  }

  /* ---------------- building a game ---------------- */
  function buildTable() {
    var cw = S.cw, ch = S.ch, n = S.total;
    var slotW = cw * 1.3, slotH = ch * 1.3, pad = Math.min(cw, ch) * 0.15;
    var aspect = view.w / view.h;
    var minM = Math.max(slotW, slotH);
    var th = Math.max(S.bh + 2 * minM, (S.bw + 2 * minM) / aspect), tw = th * aspect, slots = [];
    for (var guard = 0; guard < 80; guard++) {
      var tx = S.bw / 2 - tw / 2, ty = S.bh / 2 - th / 2;
      var nc = Math.floor(tw / slotW), nr = Math.floor(th / slotH);
      var ox = tx + (tw - nc * slotW) / 2, oy = ty + (th - nr * slotH) / 2;
      slots = [];
      for (var r = 0; r < nr; r++) for (var c = 0; c < nc; c++) {
        var x0 = ox + c * slotW, y0 = oy + r * slotH;
        var hits = x0 + slotW > -pad && x0 < S.bw + pad && y0 + slotH > -pad && y0 < S.bh + pad;
        if (!hits) slots.push({ x: x0 + slotW / 2, y: y0 + slotH / 2 });
      }
      S.table = { x: tx, y: ty, w: tw, h: th };
      if (slots.length >= n) break;
      tw *= 1.05; th *= 1.05;
    }
    return slots;
  }

  /* o: {themeId, seed, n, edgeSeed?, saved?} for a generated picture,
        {image, imgW, imgH, name, n} for a photo */
  function start(o) {
    stopClock();
    parts = [];
    var theme = o.image ? null : G.themeById(o.themeId);
    var img = o.image || G.renderScene(theme, o.seed, IMG_LONG);
    var iw = o.image ? o.imgW : img.width, ih = o.image ? o.imgH : img.height;
    var g = E.gridFor(o.n, iw / ih);
    S = {
      themeId: theme ? theme.id : "", seed: o.seed || "", photo: !theme, daily: !!o.daily,
      name: o.name || (theme ? theme.name : "Your photo"), tag: theme ? theme.tag : "Your photo",
      n: o.n, cols: g.cols, rows: g.rows, total: g.cols * g.rows,
      img: img, imgW: iw, imgH: ih, edgeSeed: o.edgeSeed || ((Math.random() * 4294967295) >>> 0),
      bw: 0, bh: 0, cw: 0, ch: 0, m: 0, k: 1, snap: 0,
      table: { x: 0, y: 0, w: 1, h: 1 }, slots: [],
      pieces: [], order: [], board: { id: 0, pieces: [], locked: true },
      placed: 0, moves: 0, score: 0, hints: 0, combo: 0, lastSnap: 0,
      elapsed: 0, startedAt: 0, running: false, solved: false, winAt: 0, resume: false,
      undo: [], hint: null, flash: null, peek: false, drag: null, pulse: null, showIntro: !o.saved
    };
    var aspect = iw / ih;
    if (aspect >= 1) { S.bw = BOARD_LONG; S.bh = BOARD_LONG / aspect; } else { S.bh = BOARD_LONG; S.bw = BOARD_LONG * aspect; }
    S.cw = S.bw / S.cols; S.ch = S.bh / S.rows;
    S.m = Math.ceil(Math.max(S.cw, S.ch) * 0.32);
    S.k = clamp(Math.max(iw, ih) / BOARD_LONG, 1, 2);
    S.snap = Math.min(S.cw, S.ch) * 0.3;

    var rand = G.rng(S.edgeSeed);
    var edges = E.makeEdges(S.cols, S.rows, rand);
    var geo = { cw: S.cw, ch: S.ch, m: S.m, k: S.k };
    S.slots = buildTable();
    for (var r = 0; r < S.rows; r++) for (var c = 0; c < S.cols; c++) {
      var p = { id: r * S.cols + c, r: r, c: c, hx: c * S.cw, hy: r * S.ch, x: 0, y: 0,
                edge: r === 0 || c === 0 || r === S.rows - 1 || c === S.cols - 1, g: null, tw: null };
      p.path = E.piecePath(S.cw, S.ch, edges, r, c, S.cols, S.rows);
      p.sprite = E.makeSprite(img, iw, ih, S.bw, S.bh, p, geo);
      S.pieces.push(p);
    }

    var restored = false;
    if (o.saved && o.saved.pos && o.saved.pos.length === S.total * 2 && o.saved.gid && o.saved.gid.length === S.total) {
      restoreSnapshot(o.saved);
      S.moves = o.saved.moves || 0; S.score = o.saved.score || 0; S.hints = o.saved.hints || 0; S.elapsed = o.saved.elapsed || 0;
      restored = true;
    }
    if (!restored) scatter(G.rng((Math.random() * 4294967295) >>> 0));

    buildTablePattern();
    cam.auto = true;
    applyCam(fitRect(S.table, 18));
    hooks.change();
    dirty();
    if (restored && S.placed === S.total) { S.solved = true; }
    return S;
  }

  function scatter(rand) {
    var slots = G.shuffle(S.slots.slice(), rand);
    S.board.pieces = []; S.order = [];
    S.pieces.forEach(function (p, i) {
      var s = slots[i % slots.length];
      var jx = (rand() - 0.5) * S.cw * 0.22, jy = (rand() - 0.5) * S.ch * 0.22;
      p.x = s.x - S.cw / 2 + jx; p.y = s.y - S.ch / 2 + jy;
      var g = { id: p.id + 1, pieces: [p], locked: false };
      p.g = g;
      S.order.push(g);
    });
    G.shuffle(S.order, rand);
    S.placed = 0;
  }

  /* ---------------- snapshots (undo + autosave) ---------------- */
  function snapshot() {
    var pos = new Array(S.total * 2), gid = new Array(S.total), keys = new Map();
    keys.set(S.board, 0);
    S.order.forEach(function (g, i) { keys.set(g, i + 1); });
    S.pieces.forEach(function (p, i) {
      pos[2 * i] = Math.round(p.x * 10) / 10; pos[2 * i + 1] = Math.round(p.y * 10) / 10; gid[i] = keys.get(p.g);
    });
    return { pos: pos, gid: gid, orderLen: S.order.length, placed: S.placed, moves: S.moves, score: S.score };
  }

  function restoreSnapshot(sn) {
    var groups = { 0: S.board }, i, p;
    S.board.pieces = []; S.order = [];
    for (i = 0; i < S.total; i++) {
      p = S.pieces[i]; p.x = sn.pos[2 * i]; p.y = sn.pos[2 * i + 1];
      var key = sn.gid[i], g = groups[key];
      if (!g) g = groups[key] = { id: key, pieces: [], locked: false };
      g.pieces.push(p); p.g = g;
    }
    var seen = {};
    for (var k = 1; k <= sn.orderLen; k++) if (groups[k]) { S.order.push(groups[k]); seen[k] = 1; }
    Object.keys(groups).forEach(function (key2) { if (key2 !== "0" && !seen[key2]) S.order.push(groups[key2]); });
    S.board.pieces.forEach(function (q) { q.x = q.hx; q.y = q.hy; q.tw = null; });
    S.placed = S.board.pieces.length;
  }

  function serialize() {
    if (!S || S.photo || S.solved) return null;
    var sn = snapshot();
    return { v: 2, themeId: S.themeId, seed: S.seed, n: S.n, edgeSeed: S.edgeSeed, daily: S.daily,
             pos: sn.pos, gid: sn.gid, orderLen: sn.orderLen, moves: S.moves, score: S.score, hints: S.hints,
             elapsed: Math.floor(S.elapsed), placed: S.placed, total: S.total, updated: Date.now() };
  }
  function queueSave() { clearTimeout(saveTimer); saveTimer = setTimeout(flushSave, 700); }
  function flushSave() { clearTimeout(saveTimer); if (S && !S.photo) hooks.save(S.solved ? null : serialize()); }

  /* ---------------- clock ---------------- */
  var clockId = 0;
  function startClock() {
    if (!S || S.running || S.solved) return;
    S.running = true;
    S.startedAt = Date.now() - S.elapsed * 1000;
    clockId = setInterval(function () {
      S.elapsed = (Date.now() - S.startedAt) / 1000;
      hooks.change();
    }, 250);
  }
  function pauseClock() {
    if (S && S.running) S.elapsed = (Date.now() - S.startedAt) / 1000;
    stopClock();
  }
  function stopClock() { if (S) S.running = false; if (clockId) { clearInterval(clockId); clockId = 0; } }

  /* ---------------- groups, snapping ---------------- */
  function neighbours(p) {
    var out = [], c = S.cols, r = S.rows;
    if (p.r > 0) out.push(S.pieces[p.id - c]);
    if (p.r < r - 1) out.push(S.pieces[p.id + c]);
    if (p.c > 0) out.push(S.pieces[p.id - 1]);
    if (p.c < c - 1) out.push(S.pieces[p.id + 1]);
    return out;
  }

  /* What would group g snap to where it is now? (does not change anything) */
  function findSnap(g) {
    var snap = S.snap, best = null, bd = 1e9, i, j, p, d;
    for (i = 0; i < g.pieces.length; i++) {
      p = g.pieces[i];
      d = Math.hypot(p.x - p.hx, p.y - p.hy);
      if (d < snap && d < bd) { best = { type: "board", p: p, mx: p.hx - p.x, my: p.hy - p.y }; bd = d; }
    }
    if (best) return best;
    for (i = 0; i < g.pieces.length; i++) {
      p = g.pieces[i];
      var nbs = neighbours(p);
      for (j = 0; j < nbs.length; j++) {
        var nb = nbs[j];
        if (nb.g === g) continue;
        var mx = (nb.x - nb.hx) - (p.x - p.hx), my = (nb.y - nb.hy) - (p.y - p.hy);
        d = Math.hypot(mx, my);
        if (d < snap && d < bd) { best = { type: "group", p: p, nb: nb, mx: mx, my: my }; bd = d; }
      }
    }
    return best;
  }

  function mergeInto(dst, src, dx, dy) {
    var i, p;
    for (i = 0; i < src.pieces.length; i++) {
      p = src.pieces[i]; p.x += dx; p.y += dy; p.g = dst; dst.pieces.push(p);
    }
    var idx = S.order.indexOf(src);
    if (idx >= 0) S.order.splice(idx, 1);
    if (dst.locked) {
      for (i = 0; i < dst.pieces.length; i++) { p = dst.pieces[i]; p.x = p.hx; p.y = p.hy; }
      S.placed = dst.pieces.length;
    } else {
      var di = S.order.indexOf(dst);
      if (di >= 0) { S.order.splice(di, 1); S.order.push(dst); }
    }
  }

  function settle(g) {
    var res = { joins: 0, locked: false, px: 0, py: 0, gained: 0 };
    for (var i = 0; i < 60; i++) {
      var f = findSnap(g);
      if (!f) break;
      var dst = f.type === "board" ? S.board : f.nb.g;
      res.joins++;
      res.px = f.p.x + f.mx + S.cw / 2; res.py = f.p.y + f.my + S.ch / 2;
      if (dst.locked) res.gained += g.pieces.length;
      mergeInto(dst, g, f.mx, f.my);
      g = dst;
      if (dst.locked) { res.locked = true; break; }
    }
    res.group = g;
    return res;
  }

  /* ---------------- scoring, effects ---------------- */
  function award(res) {
    var now = performance.now();
    S.combo = (S.lastSnap && now - S.lastSnap < COMBO_MS) ? S.combo + 1 : 1;
    S.lastSnap = now;
    var mult = Math.min(5, S.combo);
    var base = res.locked ? 10 * Math.max(1, res.gained) : 15 * res.joins;
    var pts = base * mult;
    S.score += pts;
    floatText("+" + pts + (mult > 1 ? "  x" + mult : ""), res.px, res.py - S.ch * 0.2, mult > 1 ? "#ffd45a" : "#ffffff");
    spark(res.px, res.py, 10 + Math.min(14, res.joins * 4), res.locked);
    var p = res.group.pieces[0];
    if (res.locked) S.flash = { g: res.group, until: now + 500, fresh: res.gained };
    else S.pulse = { g: res.group, until: now + 320 };
    if (opts.haptics && navigator.vibrate) { try { navigator.vibrate(res.locked ? 14 : 9); } catch (e) { /* ignore */ } }
    if (res.locked) G.Sound.snap(S.combo); else G.Sound.merge(S.combo, res.group.pieces.length);
    return p;
  }

  function spark(x, y, n, gold) {
    var cols = gold ? ["#ffe07a", "#fff3b8", "#ffffff", "#ffb347"] : ["#ffffff", "#c8f1ff", "#fff3b8"];
    for (var i = 0; i < n; i++) {
      var a = Math.random() * TAU, sp = S.cw * (1.2 + Math.random() * 3);
      parts.push({ k: "spark", x: x, y: y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, t: 0, life: 0.45 + Math.random() * 0.4,
                   size: S.cw * (0.04 + Math.random() * 0.07), color: cols[i % cols.length], g: 0 });
    }
    dirty();
  }
  function floatText(text, x, y, color) { parts.push({ k: "text", x: x, y: y, vx: 0, vy: -S.ch * 0.9, t: 0, life: 1.1, text: text, color: color, g: 0 }); dirty(); }
  function confetti() {
    var cols = ["#ff5d73", "#ffd45a", "#4ad7c7", "#6c8cff", "#ff9f43", "#b57cff", "#ffffff"];
    var n = reduceMotion ? 40 : 190;
    for (var i = 0; i < n; i++) {
      var x = cam.x + (Math.random() - 0.5) * view.w / cam.z, y = cam.y - view.h / 2 / cam.z - Math.random() * view.h * 0.4 / cam.z;
      parts.push({ k: "conf", x: x, y: y, vx: (Math.random() - 0.5) * 260 / cam.z, vy: (60 + Math.random() * 240) / cam.z, g: 120 / cam.z,
                   t: 0, life: 3.2 + Math.random() * 1.6, size: (6 + Math.random() * 8) / cam.z, color: cols[i % cols.length], rot: Math.random() * TAU, vr: (Math.random() - 0.5) * 10 });
    }
    dirty();
  }
  function updateParts(dt) {
    for (var i = parts.length - 1; i >= 0; i--) {
      var q = parts[i];
      q.t += dt; q.x += q.vx * dt; q.y += q.vy * dt; q.vy += (q.g || 0) * dt;
      if (q.k === "spark") { q.vx *= 0.94; q.vy *= 0.94; }
      if (q.rot !== undefined) q.rot += q.vr * dt;
      if (q.t >= q.life) parts.splice(i, 1);
    }
  }

  /* ---------------- moves ---------------- */
  function groupBox(g) {
    var minX = 1e9, minY = 1e9, maxX = -1e9, maxY = -1e9;
    for (var i = 0; i < g.pieces.length; i++) {
      var p = g.pieces[i];
      if (p.x < minX) minX = p.x; if (p.y < minY) minY = p.y;
      if (p.x + S.cw > maxX) maxX = p.x + S.cw; if (p.y + S.ch > maxY) maxY = p.y + S.ch;
    }
    return { minX: minX, minY: minY, maxX: maxX, maxY: maxY };
  }

  function hitTest(wx, wy) {
    var tol = Math.min(9 / cam.z, Math.min(S.cw, S.ch) * 0.25);
    var offs = [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]];
    for (var k = 0; k < offs.length; k++) {
      var x = wx + offs[k][0] * tol, y = wy + offs[k][1] * tol;
      for (var i = S.order.length - 1; i >= 0; i--) {
        var g = S.order[i];
        for (var j = g.pieces.length - 1; j >= 0; j--) {
          var p = g.pieces[j], lx = x - p.x, ly = y - p.y;
          if (lx < -S.m || ly < -S.m || lx > S.cw + S.m || ly > S.ch + S.m) continue;
          if (hitCtx.isPointInPath(p.path, lx, ly)) return { g: g, p: p };
        }
      }
    }
    return null;
  }

  function beginDrag(hit, w, pt) {
    var g = hit.g;
    S.order.splice(S.order.indexOf(g), 1); S.order.push(g);
    g.pieces.forEach(function (p) { p.tw = null; });
    var box = groupBox(g), t = S.table;
    S.drag = {
      g: g, sw: w, snap: snapshot(), moved: false, sx: pt.x, sy: pt.y, px: pt.x, py: pt.y, lastPx: pt.x, vx: 0, tilt: 0,
      start: g.pieces.map(function (p) { return [p.x, p.y]; }), edge: { x: 0, y: 0 }, target: null, pivot: { x: w.x, y: w.y },
      dxMin: t.x - box.minX, dxMax: t.x + t.w - box.maxX, dyMin: t.y - box.minY, dyMax: t.y + t.h - box.maxY
    };
    gesture = { type: "drag" };
    canvas.classList.add("grabbing");
    G.Sound.pickup();
    dirty();
  }

  function dragTo(px, py) {
    var d = S.drag; if (!d) return;
    d.vx = d.vx * 0.6 + (px - d.lastPx) * 0.4; d.lastPx = px;
    d.px = px; d.py = py;
    if (!d.moved && Math.hypot(px - d.sx, py - d.sy) > 4) {
      d.moved = true; S.showIntro = false;
      startClock();
    }
    var w = toWorld(px, py);
    var dx = clamp(w.x - d.sw.x, d.dxMin, d.dxMax), dy = clamp(w.y - d.sw.y, d.dyMin, d.dyMax);
    for (var i = 0; i < d.g.pieces.length; i++) { d.g.pieces[i].x = d.start[i][0] + dx; d.g.pieces[i].y = d.start[i][1] + dy; }
    d.pivot = { x: w.x, y: w.y };
    d.target = d.moved ? findSnap(d.g) : null;
    var band = 28;
    d.edge.x = px < band ? -1 : px > view.w - band ? 1 : 0;
    d.edge.y = py < band ? -1 : py > view.h - band ? 1 : 0;
    dirty();
  }

  function finishDrag() {
    var d = S.drag; if (!d) return;
    S.drag = null;
    canvas.classList.remove("grabbing");
    if (!d.moved) {
      for (var i = 0; i < d.g.pieces.length; i++) { d.g.pieces[i].x = d.start[i][0]; d.g.pieces[i].y = d.start[i][1]; }
      dirty(); return;
    }
    S.undo.push(d.snap);
    if (S.undo.length > 100) S.undo.shift();
    S.moves++;
    var res = settle(d.g);
    if (res.joins) award(res); else G.Sound.drop();
    if (S.placed === S.total) win();
    hooks.change(); queueSave(); dirty();
  }

  function undo() {
    if (!S || S.solved || S.drag || !S.undo.length) return;
    var sn = S.undo.pop();
    restoreSnapshot(sn);
    S.moves = sn.moves; S.score = sn.score;
    S.flash = null; S.hint = null; S.combo = 0;
    G.Sound.undo();
    hooks.change(); queueSave(); dirty();
  }

  function win() {
    pauseClock();
    S.solved = true; S.winAt = performance.now(); S.hint = null; S.flash = null; S.drag = null;
    S.elapsed = Math.floor(S.elapsed);
    var par = PAR[S.n] || 600, stars = S.elapsed <= par ? 3 : S.elapsed <= par * 1.7 ? 2 : 1;
    S.score += Math.max(0, Math.round((par * 1.7 - S.elapsed) * 2));
    flyTo(fitRect(boardRect(), 28), 800);
    confetti();
    G.Sound.win();
    if (opts.haptics && navigator.vibrate) { try { navigator.vibrate([30, 40, 30, 40, 60]); } catch (e) { /* ignore */ } }
    hooks.save(null);
    var result = { themeId: S.themeId, seed: S.seed, n: S.n, total: S.total, name: S.name, photo: S.photo, daily: S.daily,
                   elapsed: S.elapsed, moves: S.moves, score: S.score, stars: stars, par: par, hints: S.hints };
    setTimeout(function () { hooks.win(result); }, reduceMotion ? 200 : 1500);
    hooks.change();
  }

  /* ---------------- helpers players can trigger ---------------- */
  function hint() {
    if (!S || S.solved || !S.order.length) return;
    var good = [], edge = [], any = [];
    S.order.forEach(function (g) {
      if (S.drag && S.drag.g === g) return;
      g.pieces.forEach(function (p) {
        any.push(p);
        if (p.edge) edge.push(p);
        var nbs = neighbours(p);
        for (var i = 0; i < nbs.length; i++) if (nbs[i].g.locked) { good.push(p); break; }
      });
    });
    var corners = edge.filter(function (p) { return (p.r === 0 || p.r === S.rows - 1) && (p.c === 0 || p.c === S.cols - 1); });
    var pool = good.length ? good : corners.length && !S.board.pieces.length ? corners : edge.length ? edge : any;
    var p = pool[Math.floor(Math.random() * pool.length)];
    S.hint = { p: p, until: performance.now() + 4200 };
    S.hints++; S.score = Math.max(0, S.score - 25);
    G.Sound.hint();
    var m = S.m, x0 = Math.min(p.x, p.hx) - m, y0 = Math.min(p.y, p.hy) - m;
    var x1 = Math.max(p.x, p.hx) + S.cw + m, y1 = Math.max(p.y, p.hy) + S.ch + m;
    var a = toScreen(x0, y0), b = toScreen(x1, y1);
    if (!(a.x > 70 && a.y > 90 && b.x < view.w - 70 && b.y < view.h - 110)) {
      var f = fitRect({ x: x0, y: y0, w: x1 - x0, h: y1 - y0 }, 90);
      flyTo({ x: f.x, y: f.y, z: Math.min(cam.z, f.z) }, 450);
    }
    hooks.change(); dirty();
  }

  /* Neatly line up every loose single piece around the board. */
  function tidy() {
    if (!S || S.solved || S.drag) return;
    var singles = S.order.filter(function (g) { return g.pieces.length === 1; }).map(function (g) { return g.pieces[0]; });
    if (!singles.length) { hooks.toast("Nothing to tidy: every loose piece is already in a cluster."); return; }
    var occupied = [];
    S.order.forEach(function (g) { if (g.pieces.length > 1) { var b = groupBox(g); occupied.push([b.minX - S.cw * 0.3, b.minY - S.ch * 0.3, b.maxX + S.cw * 0.3, b.maxY + S.ch * 0.3]); } });
    var cx = S.bw / 2, cy = S.bh / 2;
    var slots = S.slots.filter(function (s) {
      for (var i = 0; i < occupied.length; i++) { var o = occupied[i]; if (s.x > o[0] && s.x < o[2] && s.y > o[1] && s.y < o[3]) return false; }
      return true;
    });
    slots.sort(function (a, b) { return Math.hypot(a.x - cx, (a.y - cy) * 1.2) - Math.hypot(b.x - cx, (b.y - cy) * 1.2); });
    singles.sort(function (a, b) { return (b.edge ? 1 : 0) - (a.edge ? 1 : 0) || a.id - b.id; });
    var now = performance.now();
    singles.forEach(function (p, i) {
      var s = slots[i] || S.slots[i % S.slots.length];
      p.tw = { x0: p.x, y0: p.y, x1: s.x - S.cw / 2, y1: s.y - S.ch / 2, t0: now + Math.min(i, 40) * 8, dur: 480 };
    });
    G.Sound.tidy();
    dirty();
  }

  function setPeek(b) { if (S) { S.peek = !!b; dirty(); } }

  /* ---------------- rendering ---------------- */
  function dirty() { if (!raf) raf = requestAnimationFrame(tick); }

  function tick(now) {
    raf = 0;
    if (!S) { draw(now); return; }
    var dt = lastTick ? Math.min(0.05, (now - lastTick) / 1000) : 0.016;
    lastTick = now;
    var again = false, i;

    if (cam.tween) {
      var tw = cam.tween, u = Math.min(1, (now - tw.start) / tw.dur);
      var e = u < 0.5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2;
      cam.x = tw.from.x + (tw.to.x - tw.from.x) * e; cam.y = tw.from.y + (tw.to.y - tw.from.y) * e; cam.z = tw.from.z + (tw.to.z - tw.from.z) * e;
      clampCam();
      if (u >= 1) cam.tween = null; else again = true;
    }

    var d = S.drag;
    if (d) {
      if (d.edge.x || d.edge.y) {
        var sp = 520 / cam.z * dt;
        cam.x += d.edge.x * sp; cam.y += d.edge.y * sp; clampCam();
        dragTo(d.px, d.py);
      }
      var target = reduceMotion ? 0 : clamp(d.vx * 0.014, -0.14, 0.14);
      d.tilt += (target - d.tilt) * 0.22; d.vx *= 0.86;
      again = true;
    }

    for (i = 0; i < S.pieces.length; i++) {
      var p = S.pieces[i];
      if (!p.tw) continue;
      var t = (now - p.tw.t0) / p.tw.dur;
      if (t < 0) { again = true; continue; }
      var k = Math.min(1, t), ek = 1 - Math.pow(1 - k, 3);
      p.x = p.tw.x0 + (p.tw.x1 - p.tw.x0) * ek; p.y = p.tw.y0 + (p.tw.y1 - p.tw.y0) * ek;
      if (k >= 1) p.tw = null; else again = true;
    }

    if (parts.length) { updateParts(dt); again = true; }
    draw(now);
    if (S.hint && now < S.hint.until) again = true;
    if (S.flash && now < S.flash.until) again = true;
    if (S.pulse && now < S.pulse.until) again = true;
    if (S.solved && now - S.winAt < 1000) again = true;
    if (S.showIntro && S.order.length) again = false;
    if (again) raf = requestAnimationFrame(tick); else lastTick = 0;
  }

  function drawGroupShadows(g, ox, oy, a) {
    ctx.fillStyle = "rgba(10,5,0," + a + ")";
    for (var i = 0; i < g.pieces.length; i++) {
      var p = g.pieces[i];
      ctx.save(); ctx.translate(p.x + ox, p.y + oy); ctx.fill(p.path); ctx.restore();
    }
  }
  function drawGroupSprites(g) {
    var m = S.m, w = S.cw + 2 * m, h = S.ch + 2 * m;
    for (var i = 0; i < g.pieces.length; i++) { var p = g.pieces[i]; ctx.drawImage(p.sprite, p.x - m, p.y - m, w, h); }
  }

  function draw(now) {
    var d = view.dpr, z = cam.z;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = "#1a120c"; ctx.fillRect(0, 0, canvas.width, canvas.height);
    if (!S) return;

    ctx.setTransform(d * z, 0, 0, d * z, d * (view.w / 2 - cam.x * z), d * (view.h / 2 - cam.y * z));
    ctx.imageSmoothingQuality = "high";
    var t = S.table, m = S.m, cw = S.cw, ch = S.ch, i, g;
    ctx.fillStyle = tablePattern || "#5a3a22";
    ctx.fillRect(t.x, t.y, t.w, t.h);

    // board mat
    ctx.fillStyle = "rgba(0,0,0,0.30)"; ctx.fillRect(0, 0, S.bw, S.bh);
    var ins = Math.min(S.bw, S.bh) * 0.03;
    var gt = ctx.createLinearGradient(0, 0, 0, ins); gt.addColorStop(0, "rgba(0,0,0,0.45)"); gt.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = gt; ctx.fillRect(0, 0, S.bw, ins);
    var gl = ctx.createLinearGradient(0, 0, ins, 0); gl.addColorStop(0, "rgba(0,0,0,0.4)"); gl.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = gl; ctx.fillRect(0, 0, ins, S.bh);
    if (opts.guide || S.solved) { ctx.globalAlpha = 0.24; ctx.drawImage(S.img, 0, 0, S.bw, S.bh); ctx.globalAlpha = 1; }
    ctx.beginPath();
    for (i = 1; i < S.cols; i++) { ctx.moveTo(i * cw, 0); ctx.lineTo(i * cw, S.bh); }
    for (i = 1; i < S.rows; i++) { ctx.moveTo(0, i * ch); ctx.lineTo(S.bw, i * ch); }
    ctx.strokeStyle = "rgba(255,255,255,0.10)"; ctx.lineWidth = 1 / z; ctx.stroke();
    ctx.strokeStyle = "rgba(255,240,210,0.38)"; ctx.lineWidth = 2.5 / z; ctx.strokeRect(0, 0, S.bw, S.bh);

    drawGroupSprites(S.board);

    if (S.flash && now < S.flash.until) {
      var fa = 0.6 * (S.flash.until - now) / 500;
      ctx.globalAlpha = fa; ctx.fillStyle = "#fff";
      S.flash.g.pieces.forEach(function (p) { ctx.save(); ctx.translate(p.x, p.y); ctx.fill(p.path); ctx.restore(); });
      ctx.globalAlpha = 1;
    }

    // hint: where the piece belongs
    if (S.hint && now < S.hint.until && !S.hint.p.g.locked) {
      var hp = S.hint.p, pulse = 0.55 + 0.45 * Math.sin(now / 170);
      ctx.save(); ctx.translate(hp.hx, hp.hy);
      ctx.globalAlpha = 0.2 + 0.22 * pulse; ctx.fillStyle = "#ffd45a"; ctx.fill(hp.path);
      ctx.globalAlpha = 0.95; ctx.strokeStyle = "#ffd45a"; ctx.lineWidth = 3.5 / z; ctx.setLineDash([9 / z, 6 / z]); ctx.stroke(hp.path);
      ctx.restore();
    }

    var dragged = S.drag ? S.drag.g : null;
    for (i = 0; i < S.order.length; i++) {
      g = S.order[i];
      if (g === dragged) continue;
      var dim = opts.edges && !g.pieces.some(function (p) { return p.edge; });
      if (dim) ctx.globalAlpha = 0.28;
      var pulseOn = S.pulse && S.pulse.g === g && now < S.pulse.until;
      if (pulseOn) {
        var q = 1 + 0.025 * Math.sin(Math.PI * (1 - (S.pulse.until - now) / 320));
        var cc = groupBox(g); var pcx = (cc.minX + cc.maxX) / 2, pcy = (cc.minY + cc.maxY) / 2;
        ctx.save(); ctx.translate(pcx, pcy); ctx.scale(q, q); ctx.translate(-pcx, -pcy);
      }
      drawGroupShadows(g, 2.5, 4, dim ? 0.12 : 0.26);
      if (z > 0.28) drawGroupShadows(g, 6, 10, dim ? 0.05 : 0.11);
      drawGroupSprites(g);
      if (pulseOn) ctx.restore();
      ctx.globalAlpha = 1;
    }

    // glow where the dragged group would snap
    if (dragged && S.drag.target) {
      var tg = S.drag.target;
      ctx.save();
      ctx.lineWidth = 4 / z; ctx.strokeStyle = "rgba(255,225,120,0.95)"; ctx.fillStyle = "rgba(255,225,120,0.18)";
      if (tg.type === "board") { ctx.translate(tg.p.hx, tg.p.hy); ctx.fill(tg.p.path); ctx.stroke(tg.p.path); }
      else { ctx.translate(tg.nb.x, tg.nb.y); ctx.fill(tg.nb.path); ctx.stroke(tg.nb.path); }
      ctx.restore();
    }

    if (S.hint && now < S.hint.until && !S.hint.p.g.locked && S.hint.p.g !== dragged) {
      var hq = S.hint.p;
      ctx.save(); ctx.translate(hq.x, hq.y); ctx.lineWidth = 4.5 / z; ctx.strokeStyle = "#ffd45a";
      ctx.globalAlpha = 0.55 + 0.45 * Math.sin(now / 170); ctx.stroke(hq.path); ctx.restore();
    }

    if (dragged) {
      var dr = S.drag, lift = 1.045;
      ctx.save();
      ctx.translate(dr.pivot.x, dr.pivot.y); ctx.rotate(dr.tilt); ctx.scale(lift, lift); ctx.translate(-dr.pivot.x, -dr.pivot.y);
      drawGroupShadows(dragged, 5, 9, 0.28);
      drawGroupShadows(dragged, 12, 20, 0.12);
      drawGroupSprites(dragged);
      ctx.restore();
    }

    // particles
    for (i = 0; i < parts.length; i++) {
      var q2 = parts[i], life = 1 - q2.t / q2.life;
      if (q2.k === "spark") {
        ctx.globalAlpha = Math.max(0, life); ctx.fillStyle = q2.color;
        ctx.beginPath(); ctx.arc(q2.x, q2.y, q2.size * (0.4 + life), 0, TAU); ctx.fill();
      } else if (q2.k === "conf") {
        ctx.globalAlpha = Math.min(1, life * 2); ctx.fillStyle = q2.color;
        ctx.save(); ctx.translate(q2.x, q2.y); ctx.rotate(q2.rot); ctx.scale(1, Math.abs(Math.cos(q2.t * 5 + q2.rot)) * 0.8 + 0.2);
        ctx.fillRect(-q2.size / 2, -q2.size / 3, q2.size, q2.size * 0.66); ctx.restore();
      } else {
        ctx.globalAlpha = Math.min(1, life * 1.6);
        ctx.font = "800 " + (20 / z) + "px ui-rounded, 'SF Pro Rounded', system-ui, sans-serif"; ctx.textAlign = "center";
        ctx.lineWidth = 4 / z; ctx.strokeStyle = "rgba(40,20,0,0.75)"; ctx.strokeText(q2.text, q2.x, q2.y);
        ctx.fillStyle = q2.color; ctx.fillText(q2.text, q2.x, q2.y);
      }
    }
    ctx.globalAlpha = 1;

    if (S.peek) {
      ctx.drawImage(S.img, 0, 0, S.bw, S.bh);
      ctx.strokeStyle = "rgba(255,255,255,0.75)"; ctx.lineWidth = 3 / z; ctx.strokeRect(0, 0, S.bw, S.bh);
    }
    if (S.solved) {
      var wa = clamp((now - S.winAt) / 900, 0, 1);
      ctx.globalAlpha = wa; ctx.drawImage(S.img, 0, 0, S.bw, S.bh);
      ctx.globalAlpha = wa * 0.9; ctx.strokeStyle = "#ffe9a8"; ctx.lineWidth = 5 / z; ctx.strokeRect(0, 0, S.bw, S.bh);
      ctx.globalAlpha = 1;
    }

    // screen-space light and vignette
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    var W = canvas.width, H = canvas.height;
    var lg = ctx.createLinearGradient(0, 0, W, H);
    lg.addColorStop(0, "rgba(255,236,200,0.13)"); lg.addColorStop(0.5, "rgba(255,236,200,0)"); lg.addColorStop(1, "rgba(0,0,10,0.12)");
    ctx.fillStyle = lg; ctx.fillRect(0, 0, W, H);
    var tb = G.TABLES.filter(function (x) { return x.id === opts.table; })[0];
    var vg = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.35, W / 2, H / 2, Math.max(W, H) * 0.75);
    vg.addColorStop(0, "rgba(0,0,0,0)"); vg.addColorStop(1, "rgba(0,0,0," + (tb ? tb.vignette : 0.4) + ")");
    ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);
  }

  /* ---------------- input ---------------- */
  function local(e) { var r = canvas.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; }

  function startPinch() {
    var a = Array.from(ptrs.values());
    var mid = { x: (a[0].x + a[1].x) / 2, y: (a[0].y + a[1].y) / 2 };
    gesture = { type: "pinch", dist: Math.hypot(a[0].x - a[1].x, a[0].y - a[1].y) || 1, z: cam.z, wpt: toWorld(mid.x, mid.y) };
    cam.tween = null; cam.auto = false;
  }

  function bindInput() {
    canvas.addEventListener("pointerdown", function (e) {
      if (!S) return;
      G.Sound.unlock();
      try { canvas.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
      var pt = local(e);
      ptrs.set(e.pointerId, pt);
      if (ptrs.size === 2) { if (S.drag) finishDrag(); startPinch(); return; }
      if (ptrs.size > 2) return;
      var w = toWorld(pt.x, pt.y);
      var hit = (e.button === 0 && !S.solved) ? hitTest(w.x, w.y) : null;
      if (hit) { beginDrag(hit, w, pt); return; }
      cam.tween = null; cam.auto = false;
      gesture = { type: "pan", x: pt.x, y: pt.y, sx: pt.x, sy: pt.y, moved: false };
      canvas.classList.add("grabbing");
    });

    canvas.addEventListener("pointermove", function (e) {
      if (!S) return;
      var pt = local(e);
      if (!ptrs.has(e.pointerId)) {
        if (e.pointerType === "mouse") {
          var w = toWorld(pt.x, pt.y);
          canvas.classList.toggle("over-piece", !S.solved && !!hitTest(w.x, w.y));
        }
        return;
      }
      ptrs.set(e.pointerId, pt);
      if (!gesture) return;
      if (gesture.type === "drag") dragTo(pt.x, pt.y);
      else if (gesture.type === "pan") {
        if (Math.hypot(pt.x - gesture.sx, pt.y - gesture.sy) > 6) gesture.moved = true;
        cam.x -= (pt.x - gesture.x) / cam.z; cam.y -= (pt.y - gesture.y) / cam.z;
        gesture.x = pt.x; gesture.y = pt.y;
        clampCam(); dirty();
      } else if (gesture.type === "pinch" && ptrs.size >= 2) {
        var a = Array.from(ptrs.values());
        var mid = { x: (a[0].x + a[1].x) / 2, y: (a[0].y + a[1].y) / 2 };
        var dist = Math.hypot(a[0].x - a[1].x, a[0].y - a[1].y) || 1;
        cam.z = clamp(gesture.z * dist / gesture.dist, minZoom(), maxZoom());
        cam.x = gesture.wpt.x - (mid.x - view.w / 2) / cam.z; cam.y = gesture.wpt.y - (mid.y - view.h / 2) / cam.z;
        clampCam(); dirty();
      }
    });

    function up(e) {
      if (!ptrs.has(e.pointerId)) return;
      var pt = ptrs.get(e.pointerId);
      ptrs.delete(e.pointerId);
      if (gesture && gesture.type === "drag") finishDrag();
      if (gesture && gesture.type === "pan" && !gesture.moved && e.type === "pointerup") {
        var now = performance.now();
        if (now - lastTap.t < 340 && Math.hypot(pt.x - lastTap.x, pt.y - lastTap.y) < 30) {
          if (cam.z < minZoom() * 2) zoomAt(pt.x, pt.y, Math.max(0.9, cam.z * 2.4)); else fit("table");
          lastTap.t = 0;
        } else { lastTap = { t: now, x: pt.x, y: pt.y }; }
      }
      if (ptrs.size === 0) { gesture = null; canvas.classList.remove("grabbing"); }
      else if (gesture && gesture.type === "pinch" && ptrs.size < 2) gesture = null;
    }
    canvas.addEventListener("pointerup", up);
    canvas.addEventListener("pointercancel", up);
    canvas.addEventListener("pointerleave", function () { canvas.classList.remove("over-piece"); });
    canvas.addEventListener("contextmenu", function (e) { e.preventDefault(); });
    canvas.addEventListener("wheel", function (e) {
      e.preventDefault();
      if (!S) return;
      var unit = e.deltaMode === 1 ? 16 : 1, pt = local(e);
      zoomAt(pt.x, pt.y, cam.z * Math.exp(-e.deltaY * unit * (e.ctrlKey ? 0.012 : 0.0016)));
    }, { passive: false });
  }

  /* ---------------- public API ---------------- */
  function info() {
    if (!S) return { has: false };
    var now = performance.now();
    return {
      has: true, name: S.name, tag: S.tag, n: S.n, total: S.total, placed: S.placed, moves: S.moves, score: S.score,
      elapsed: S.running ? (Date.now() - S.startedAt) / 1000 : S.elapsed, solved: S.solved, canUndo: S.undo.length > 0 && !S.solved,
      combo: S.combo, comboLeft: S.lastSnap ? Math.max(0, 1 - (now - S.lastSnap) / COMBO_MS) : 0,
      themeId: S.themeId, seed: S.seed, photo: S.photo, daily: S.daily, showIntro: S.showIntro, hints: S.hints,
      clusters: S.order.filter(function (g) { return g.pieces.length > 1; }).length, loose: S.order.length
    };
  }

  G.Game = {
    init: init, start: start, setOptions: setOptions, undo: undo, hint: hint, tidy: tidy, peek: setPeek, fit: fit,
    zoomBy: function (f) { zoomAt(view.w / 2, view.h / 2, cam.z * f); }, info: info, serialize: serialize, flushSave: flushSave,
    snapshotImage: function () { return S ? S.img : null; },
    pause: function () { var r = !!(S && S.running); pauseClock(); return r; }, resume: function () { startClock(); },
    cancelPointers: function () { ptrs.clear(); if (S && S.drag) finishDrag(); gesture = null; },
    _debug: function () { return { S: S, cam: cam, view: view, toScreen: toScreen, toWorld: toWorld }; }
  };
})(window.JP = window.JP || {});
