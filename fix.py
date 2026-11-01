import re, sys
p = "/home/hatch/workspace/puzzle-fix/index.html"
s = open(p).read()
def rep(old, new, n=1):
    global s
    c = s.count(old)
    assert c == n, f"count {c} != {n} for: {old[:90]!r}"
    s = s.replace(old, new)

# ---------- CSS: board pieces must scale to cell size (was intrinsic source px = oversized) ----------
rep("#tray .piece canvas{width:100%;height:auto}",
    "#tray .piece canvas{width:100%;height:auto}\n  #board .piece canvas{width:100%;height:auto}")
# full picture names wrap instead of ellipsizing
rep(".pick span{display:block;font-size:11.5px;font-weight:700;margin:4px 2px 2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}",
    ".pick span{display:block;font-size:11.5px;font-weight:700;margin:4px 2px 2px;line-height:1.25}")
# header + search + error styles
rep("  /* ---------- toolbar ---------- */",
    """  .page-head{display:flex;align-items:baseline;gap:12px;margin-bottom:10px}
  .page-head h1{font-size:20px;margin:0}
  .page-head span{font-size:14px;color:var(--muted);font-weight:600}
  .search-row{display:flex;gap:10px;margin-bottom:10px}
  .search-row input{flex:1;max-width:320px;font:inherit;font-size:14px;padding:8px 12px;border:1px solid var(--line);border-radius:9px;background:var(--surface);color:var(--ink)}
  #picError{display:none;font-size:13.5px;color:var(--gold);font-weight:700;margin:0 0 10px}
  /* ---------- toolbar ---------- */""")

# ---------- HTML: header, undo button, search, error ----------
rep('<div class="wrap">\n\n  <div class="bar">',
    '<div class="wrap">\n\n  <header class="page-head"><h1>Puzzle</h1><span id="picName">Mountain Lake</span></header>\n\n  <div class="bar">')
rep('<button class="btn primary" id="newBtn" type="button">New game</button>',
    '<button class="btn primary" id="newBtn" type="button">New game</button>\n      <button class="btn" id="undoBtn" type="button" disabled>Undo</button>')
rep('  <div class="picker" id="picker" role="group" aria-label="Choose a picture"></div>',
    '  <div class="search-row"><input id="picSearch" type="search" placeholder="Search pictures" aria-label="Search pictures" /><p id="picError"></p></div>\n  <div class="picker" id="picker" role="group" aria-label="Choose a picture"></div>')

# ---------- JS vars ----------
rep("  var selected = null;    // piece chosen by tap, waiting for a board tap",
    "  var selected = null;    // piece chosen by tap, waiting for a board tap\n  var undoStack = [];\n  var undoBtn = document.getElementById(\"undoBtn\");\n  var picError = document.getElementById(\"picError\");\n  var picSearch = document.getElementById(\"picSearch\");\n  var picNameEl = document.getElementById(\"picName\");")

# ---------- picker: seeded photos that actually exist; thumbnails never show a broken icon ----------
rep('im.src = "assets/" + p.file + ".webp"; im.alt = ""; im.loading = "lazy"; im.draggable = false;',
    'im.src = "https://picsum.photos/seed/" + p.file + "/276/184"; im.alt = ""; im.loading = "lazy"; im.draggable = false;\n    im.onerror = function(){ im.style.display = "none"; };')
rep('b.addEventListener("click", function(){ loadPicture("assets/" + p.file + ".webp", p.name, b); });',
    'b.addEventListener("click", function(){ loadPicture("https://picsum.photos/seed/" + p.file + "/1200/800", p.name, b); });')
# search filter
rep('  var up = document.createElement("button");',
    """  picSearch.addEventListener("input", function(){
    var q = picSearch.value.trim().toLowerCase();
    picker.querySelectorAll(".pick").forEach(function(el){
      if(el.classList.contains("upload")) return;
      el.style.display = (!q || el.textContent.toLowerCase().indexOf(q) !== -1) ? "" : "none";
    });
  });
  var up = document.createElement("button");""")
# your-photo passes its button so selection survives load
rep('    loadPicture(customURL, "Your photo", null);',
    '    loadPicture(customURL, "Your photo", up);')

# ---------- loadPicture: only swap on successful load, so a failed picture can never poison the game ----------
s2 = re.sub(r"  function loadPicture\(url, name, btn\)\{.*?\n  \}\n",
    """  function loadPicture(url, name, btn){
    picError.style.display = "none";
    var t = new Image();
    t.onload = function(){
      img = t; imgURL = url; imgName = name;
      picNameEl.textContent = name;
      if(btn){
        picker.querySelectorAll(".pick").forEach(function(el){ el.classList.remove("sel"); });
        btn.classList.add("sel");
      }
      newGame();
    };
    t.onerror = function(){
      picError.textContent = "That picture did not load. Keeping " + (imgName || "the last picture") + ".";
      picError.style.display = "block";
    };
    t.src = url;
  }
""", s, count=1, flags=re.DOTALL)
assert s2 != s, "loadPicture not replaced"
s = s2

# ---------- undo ----------
rep("  /* ---------------- placement ---------------- */",
    """  /* ---------------- undo: a piece can never be lost by a bad drop ---------------- */
  function pushUndo(p){
    undoStack.push({ p:p, state:p.state, lx:p.lx, ly:p.ly, placed:placed, moves:moves, solved:solved });
    if(undoStack.length > 50) undoStack.shift();
  }
  function undoLast(){
    var u = undoStack.pop(); if(!u) return;
    var p = u.p;
    p.state = u.state; p.lx = u.lx; p.ly = u.ly;
    p.el.classList.remove("locked");
    if(u.state === "tray"){ tray.appendChild(p.el); }
    else if(u.state === "loose"){ looseLayer.appendChild(p.el); positionPiece(p); }
    else { placedLayer.appendChild(p.el); p.el.classList.add("locked"); positionPiece(p); }
    placed = u.placed; moves = u.moves; solved = u.solved;
    if(!solved) winBar.classList.remove("on");
    deselect(); updateStats();
  }
  undoBtn.addEventListener("click", undoLast);

  /* ---------------- placement ---------------- */""")
rep("  function lockPiece(p){\n", "  function lockPiece(p){\n    pushUndo(p);\n")
rep("  function placeLoose(p, fx, fy){\n", "  function placeLoose(p, fx, fy){\n    pushUndo(p);\n")
rep("  function sendToTray(p){\n", "  function sendToTray(p){\n    pushUndo(p);\n")
# placeLoose must clamp inside the board, never off-board
rep("    fx = Math.max(-cw * 0.4, Math.min(1 - cw * 0.6, fx));\n    fy = Math.max(-ch * 0.4, Math.min(1 - ch * 0.6, fy));",
    "    fx = Math.max(0, Math.min(1 - cw, fx));\n    fy = Math.max(0, Math.min(1 - ch, fy));")
# newGame clears undo; stats reflect undo availability
rep("    placed = 0; moves = 0; elapsed = 0; running = false; solved = false; selected = null;",
    "    placed = 0; moves = 0; elapsed = 0; running = false; solved = false; selected = null; undoStack.length = 0;")
rep("    trayEmpty.classList.toggle(\"on\", inTray === 0);",
    "    trayEmpty.classList.toggle(\"on\", inTray === 0);\n    undoBtn.disabled = undoStack.length === 0;")

# ---------- drag: tap stays in tray, drag lifts on first move, cancel/drop-outside always returns the piece ----------
s2 = re.sub(r"  function attachDrag\(p\)\{.*?\n  \}\n\n  /\* ---------------- controls ---------------- \*/",
    """  function attachDrag(p){
    var el = p.el;
    var drag = null;

    el.addEventListener("pointerdown", function(e){
      if(p.state === "locked" || solved) return;
      e.preventDefault();
      drag = {
        id: e.pointerId,
        grabFX: 0, grabFY: 0,
        startX: e.clientX, startY: e.clientY,
        moved: false, lifted: false,
        fromTray: p.state === "tray",
        prevState: p.state, prevLx: p.lx, prevLy: p.ly
      };
      var rect = el.getBoundingClientRect();
      drag.grabFX = (e.clientX - rect.left) / rect.width;
      drag.grabFY = (e.clientY - rect.top) / rect.height;
      el.classList.add("dragging");
      el.setPointerCapture(e.pointerId);
      startTimer();
    });

    el.addEventListener("pointermove", function(e){
      if(!drag || e.pointerId !== drag.id) return;
      var dx = e.clientX - drag.startX, dy = e.clientY - drag.startY;
      if(Math.abs(dx) + Math.abs(dy) > 6) drag.moved = true;
      if(!drag.moved) return;
      if(drag.fromTray && !drag.lifted){
        // lift only once the pointer actually moves: a tap never leaves the tray
        var brect0 = board.getBoundingClientRect();
        p.lx = (e.clientX - brect0.left) / brect0.width - 0.5 / cols;
        p.ly = (e.clientY - brect0.top) / brect0.height - 0.5 / rows;
        p.state = "loose";
        looseLayer.appendChild(el);
        renderPiece(p);
        positionPiece(p);
        var nr = el.getBoundingClientRect();
        drag.grabDX = nr.width / 2;
        drag.grabDY = nr.height / 2;
        drag.lifted = true;
      }
      if(p.state !== "loose") return;
      var brect = board.getBoundingClientRect();
      var m = margin();
      var lift = e.pointerType === "touch" ? cellH() * 0.55 : 0;
      var left = e.clientX - brect.left - drag.grabDX;
      var top  = e.clientY - brect.top - drag.grabDY - lift;
      el.style.left = left + "px";
      el.style.top  = top + "px";
      drag.cellX = (left + m) / brect.width;
      drag.cellY = (top + m) / brect.height;
    });

    function restorePrev(){
      if(drag.prevState === "tray"){ p.state = "tray"; tray.appendChild(p.el); }
      else { p.state = "loose"; p.lx = drag.prevLx; p.ly = drag.prevLy; looseLayer.appendChild(p.el); positionPiece(p); }
    }
    function finish(e, cancelled){
      if(!drag || e.pointerId !== drag.id) return;
      var d = drag; drag = null;
      el.classList.remove("dragging");
      if(cancelled){ if(d.lifted) restorePrev(); return; }
      if(!d.moved){
        // a tap: select in place, never move the piece
        if(selected === p) deselect(); else select(p);
        return;
      }
      if(!d.lifted){ restorePrev(); return; }
      deselect();
      var brect = board.getBoundingClientRect();
      // dropped outside the board in screen space: back to the tray, never lost
      if(e.clientX < brect.left - 8 || e.clientX > brect.right + 8 ||
         e.clientY < brect.top - 8 || e.clientY > brect.bottom + 8){ sendToTray(p); return; }
      var m = margin();
      var lift = e.pointerType === "touch" ? cellH() * 0.55 : 0;
      var fx = (e.clientX - brect.left - d.grabDX + m) / brect.width;
      var fy = (e.clientY - brect.top - d.grabDY - lift + m) / brect.height;
      if(!trySnap(p, fx, fy)) placeLoose(p, fx, fy);
    }
    el.addEventListener("pointerup", function(e){ finish(e, false); });
    el.addEventListener("pointercancel", function(e){ finish(e, true); });
  }

  /* ---------------- controls ---------------- */""",
    s, count=1, flags=re.DOTALL)
assert s2 != s, "attachDrag not replaced"
s = s2

open(p, "w").write(s)
print("ok, bytes", len(s))
