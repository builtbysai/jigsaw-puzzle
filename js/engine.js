/* Puzzle geometry: choosing the grid, drawing interlocking piece outlines and
   cutting each piece out of the picture as a ready-to-draw sprite.

   Every interior edge is generated once and shared by the two pieces that
   meet there, so neighbours always fit exactly. */
(function (G) {
  "use strict";

  /* Pick cols x rows close to n pieces with roughly square cells. */
  function gridFor(n, aspect) {
    var best = null;
    for (var cols = 2; cols <= 48; cols++) {
      var rows = Math.max(2, Math.round(n / cols));
      var total = cols * rows;
      var cellAspect = aspect * rows / cols;
      var score = Math.abs(Math.log(cellAspect)) + 4 * Math.abs(Math.log(total / n));
      if (!best || score < best.score) best = { cols: cols, rows: rows, score: score };
    }
    return { cols: best.cols, rows: best.rows };
  }

  /* One tab/blank, in unit space along an edge from (0,0) to (1,0).
     P are anchor points, C the two bezier controls for each segment.
     dir = +1 bulges toward the canonical normal, -1 the other way. */
  function makeEdge(rand) {
    var c = 0.5 + (rand() - 0.5) * 0.12;
    var t = 0.2 + rand() * 0.07;
    var bw = 0.125 + rand() * 0.03;
    var nw = 0.052 + rand() * 0.02;
    var left = c - nw, right = c + nw;
    var P = [[0, 0], [left, 0], [c - bw, t * 0.75], [c, t], [c + bw, t * 0.75], [right, 0], [1, 0]];
    var C = [
      [[left / 3, 0], [left * 2 / 3, 0]],
      [[c - nw * 0.9, t * 0.35], [c - bw - 0.02, t * 0.4]],
      [[c - bw, t * 0.95], [c - bw * 0.55, t]],
      [[c + bw * 0.55, t], [c + bw, t * 0.95]],
      [[c + bw + 0.02, t * 0.4], [c + nw * 0.9, t * 0.35]],
      [[right + (1 - right) / 3, 0], [right + (1 - right) * 2 / 3, 0]]
    ];
    return { P: P, C: C, dir: rand() < 0.5 ? 1 : -1 };
  }

  /* v[r][c]: edge between piece (r,c) and (r+1,c), a horizontal line.
     h[r][c]: edge between piece (r,c) and (r,c+1), a vertical line. */
  function makeEdges(cols, rows, rand) {
    var v = [], h = [], r, c;
    for (r = 0; r < rows - 1; r++) { v.push([]); for (c = 0; c < cols; c++) v[r].push(makeEdge(rand)); }
    for (r = 0; r < rows; r++) { h.push([]); for (c = 0; c < cols - 1; c++) h[r].push(makeEdge(rand)); }
    return { v: v, h: h };
  }

  function addEdge(path, e, x0, y0, vertical, L, perp, reversed) {
    var d = e.dir;
    function map(p) {
      return vertical ? [x0 + perp * p[1] * d, y0 + L * p[0]]
                      : [x0 + L * p[0], y0 + perp * p[1] * d];
    }
    var i, a, b, q;
    if (!reversed) {
      for (i = 0; i < e.C.length; i++) {
        a = map(e.C[i][0]); b = map(e.C[i][1]); q = map(e.P[i + 1]);
        path.bezierCurveTo(a[0], a[1], b[0], b[1], q[0], q[1]);
      }
    } else {
      for (i = e.C.length - 1; i >= 0; i--) {
        a = map(e.C[i][1]); b = map(e.C[i][0]); q = map(e.P[i]);
        path.bezierCurveTo(a[0], a[1], b[0], b[1], q[0], q[1]);
      }
    }
  }

  /* Outline of piece (r,c) with its body at (0,0)-(cw,ch), clockwise. */
  function piecePath(cw, ch, edges, r, c, cols, rows) {
    var p = new Path2D();
    var perp = (cw + ch) / 2;
    var top = r > 0 ? edges.v[r - 1][c] : null;
    var bottom = r < rows - 1 ? edges.v[r][c] : null;
    var left = c > 0 ? edges.h[r][c - 1] : null;
    var right = c < cols - 1 ? edges.h[r][c] : null;
    p.moveTo(0, 0);
    if (top) addEdge(p, top, 0, 0, false, cw, perp, false); else p.lineTo(cw, 0);
    if (right) addEdge(p, right, cw, 0, true, ch, perp, false); else p.lineTo(cw, ch);
    if (bottom) addEdge(p, bottom, 0, ch, false, cw, perp, true); else p.lineTo(0, ch);
    if (left) addEdge(p, left, 0, 0, true, ch, perp, true); else p.lineTo(0, 0);
    p.closePath();
    return p;
  }

  /* Cut one piece from the picture. geo = {cw, ch, m, k} in board units;
     the picture is stretched over a board of bw x bh. */
  function makeSprite(source, srcW, srcH, bw, bh, p, geo) {
    var cw = geo.cw, ch = geo.ch, m = geo.m, k = geo.k;
    var sprite = document.createElement("canvas");
    sprite.width = Math.ceil((cw + 2 * m) * k);
    sprite.height = Math.ceil((ch + 2 * m) * k);
    var c = sprite.getContext("2d");
    c.scale(sprite.width / (cw + 2 * m), sprite.height / (ch + 2 * m));
    c.translate(m, m);
    c.save();
    c.clip(p.path);
    var sx = srcW / bw, sy = srcH / bh;
    var bx = p.c * cw, by = p.r * ch;
    c.drawImage(source, (bx - m) * sx, (by - m) * sy, (cw + 2 * m) * sx, (ch + 2 * m) * sy,
                -m, -m, cw + 2 * m, ch + 2 * m);
    // soft bevel: light edge down-right, dark edge on the outline
    c.translate(0.9, 0.9);
    c.strokeStyle = "rgba(255,255,255,0.28)";
    c.lineWidth = 3;
    c.stroke(p.path);
    c.translate(-0.9, -0.9);
    c.strokeStyle = "rgba(0,0,0,0.42)";
    c.lineWidth = 1.6;
    c.stroke(p.path);
    c.restore();
    return sprite;
  }

  function shuffle(a, rand) {
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(rand() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  G.Engine = { gridFor: gridFor, makeEdges: makeEdges, piecePath: piecePath, makeSprite: makeSprite, shuffle: shuffle };
})(window.JP = window.JP || {});
