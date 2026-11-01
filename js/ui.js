/* Interface: HUD, dock, library, win screen, settings, stats and shortcuts. */
(function (G) {
  "use strict";

  var $ = function (id) { return document.getElementById(id); };
  var SIZES = [[12, "Cozy"], [24, "Easy"], [48, "Classic"], [96, "Hard"], [192, "Epic"]];
  var opts = G.store.get("jp2.opts", {});
  opts = { guide: opts.guide !== false, sound: opts.sound !== false, haptics: opts.haptics !== false, table: opts.table || "oak", n: opts.n || 48 };
  var stats = G.store.get("jp2.stats", null) || { solved: 0, time: 0, stars: 0, streak: 0, best: 0, lastDaily: "", fast: {}, done: {}, daily: {} };
  var lastResult = null, resumeAfter = false, toastTimer = 0, current = null;

  function saveOpts() { G.store.set("jp2.opts", opts); }
  function saveStats() { G.store.set("jp2.stats", stats); }

  /* ---------- toast ---------- */
  function toast(msg) {
    var t = $("toast"); t.textContent = msg; t.classList.add("on");
    clearTimeout(toastTimer); toastTimer = setTimeout(function () { t.classList.remove("on"); }, 2600);
  }

  /* ---------- HUD ---------- */
  var lastPlaced = -1, lastScore = -1;
  function updateHud() {
    var i = G.Game.info();
    if (!i.has) return;
    $("h-name").textContent = i.name;
    $("h-sub").textContent = i.tag + " · " + i.total + " pieces";
    $("h-prog").textContent = i.placed + "/" + i.total;
    $("ring").style.strokeDashoffset = (94.25 * (1 - i.placed / i.total)).toFixed(2);
    $("h-time").textContent = G.fmtTime(i.elapsed);
    $("h-score").textContent = i.score.toLocaleString();
    if (i.placed !== lastPlaced && lastPlaced >= 0) bump($("h-prog").parentNode);
    if (i.score !== lastScore && lastScore >= 0) bump($("h-score"));
    lastPlaced = i.placed; lastScore = i.score;
    $("d-undo").disabled = !i.canUndo; $("d-hint").disabled = i.solved; $("d-tidy").disabled = i.solved;
    var showCombo = i.combo > 1 && i.comboLeft > 0 && !i.solved;
    $("combo").hidden = !showCombo;
    if (showCombo) { $("combo-n").textContent = "Combo x" + Math.min(5, i.combo); $("combo-bar").style.transform = "scaleX(" + i.comboLeft.toFixed(3) + ")"; }
    $("intro").hidden = !(i.showIntro && !$("lib").classList.contains("on"));
  }
  function bump(el) { el.classList.remove("bump"); void el.offsetWidth; el.classList.add("bump"); }

  /* ---------- library ---------- */
  function drawCover(cv, src) {
    var c = cv.getContext("2d"), s = Math.max(cv.width / src.width, cv.height / src.height);
    var w = src.width * s, h = src.height * s;
    c.drawImage(src, (cv.width - w) / 2, (cv.height - h) / 2, w, h);
  }

  function dailyInfo() {
    var key = G.dateKey(new Date()), t = G.THEMES[G.hash("daily:" + key) % G.THEMES.length];
    return { key: key, theme: t, n: 48 };
  }

  function renderSizes() {
    var box = $("sizes"); box.innerHTML = "";
    SIZES.forEach(function (s) {
      var b = document.createElement("button");
      b.className = "size"; b.setAttribute("role", "radio"); b.setAttribute("aria-checked", String(opts.n === s[0]));
      b.innerHTML = "<b>" + s[0] + "</b><span>" + s[1] + "</span>";
      b.onclick = function () { opts.n = s[0]; saveOpts(); renderSizes(); renderCards(); };
      box.appendChild(b);
    });
  }

  var thumbCache = {};
  function thumb(theme) { return thumbCache[theme.id] || (thumbCache[theme.id] = G.renderScene(theme, "thumb", 360)); }

  function starsHtml(n) {
    var h = "";
    for (var i = 0; i < 3; i++) h += '<svg class="' + (i < n ? "" : "off") + '"><use href="#i-star"/></svg>';
    return h;
  }

  function renderCards() {
    var grid = $("grid"); grid.innerHTML = "";
    G.THEMES.forEach(function (t, idx) {
      var b = document.createElement("button");
      b.className = "card";
      var best = (stats.done[t.id] || {})[opts.n] || 0;
      var cv = document.createElement("canvas"); cv.width = 360; cv.height = 240;
      b.appendChild(cv);
      var st = document.createElement("div"); st.className = "st"; st.innerHTML = best ? starsHtml(best) : ""; b.appendChild(st);
      var m = document.createElement("div"); m.className = "meta"; m.innerHTML = "<b></b><span></span>";
      m.firstChild.textContent = t.name; m.lastChild.textContent = t.tag; b.appendChild(m);
      b.onclick = function () { play({ themeId: t.id, seed: Math.random().toString(36).slice(2, 8), n: opts.n }); };
      grid.appendChild(b);
      setTimeout(function () { drawCover(cv, thumb(t)); }, 12 * idx);
    });
  }

  function renderHero() {
    var d = dailyInfo(), done = stats.daily[d.key];
    $("daily-name").textContent = d.theme.name;
    $("daily-sub").textContent = d.n + " pieces · same puzzle for everyone today";
    $("daily-badge").textContent = done ? "Done · " + done + (done === 1 ? " star" : " stars") : "";
    drawCover($("card-daily").querySelector("canvas"), thumb(d.theme));

    var sv = G.store.get("jp2.save", null), cont = $("card-cont");
    cont.hidden = !(sv && sv.themeId && G.themeById(sv.themeId));
    if (!cont.hidden) {
      var th = G.themeById(sv.themeId);
      $("cont-name").textContent = th.name;
      $("cont-sub").textContent = sv.placed + " of " + sv.total + " placed · " + G.fmtTime(sv.elapsed || 0);
      $("cont-bar").style.width = Math.round(100 * sv.placed / sv.total) + "%";
      drawCover(cont.querySelector("canvas"), thumb(th));
    }
  }

  function currentStreak() {
    if (!stats.lastDaily) return 0;
    var today = G.dateKey(new Date()), y = new Date(); y.setDate(y.getDate() - 1);
    return (stats.lastDaily === today || stats.lastDaily === G.dateKey(y)) ? stats.streak : 0;
  }

  function renderStats() {
    var items = [[stats.solved, "Puzzles solved"], [stats.stars, "Stars earned"], [currentStreak(), "Daily streak"], [stats.best, "Best streak"],
                 [G.fmtTime(stats.time), "Time played"]];
    SIZES.forEach(function (s) { if (stats.fast[s[0]]) items.push([G.fmtTime(stats.fast[s[0]]), "Fastest " + s[0]]); });
    $("statgrid").innerHTML = items.map(function (x) { return '<div class="stat"><b>' + x[0] + "</b><span>" + x[1] + "</span></div>"; }).join("");
    var s = currentStreak();
    $("streak").hidden = !s; $("streak-n").textContent = s;
  }

  function renderSettings() {
    var seg = $("seg-table"); seg.innerHTML = "";
    G.TABLES.forEach(function (t) {
      var b = document.createElement("button");
      b.setAttribute("role", "radio"); b.setAttribute("aria-checked", String(opts.table === t.id));
      b.innerHTML = '<i style="background:' + t.swatch + '"></i>' + t.name;
      b.onclick = function () { opts.table = t.id; saveOpts(); G.Game.setOptions({ table: t.id }); renderSettings(); };
      seg.appendChild(b);
    });
    [["sw-guide", "guide"], ["sw-sound", "sound"], ["sw-haptics", "haptics"]].forEach(function (p) { $(p[0]).setAttribute("aria-checked", String(opts[p[1]])); });
    $("btn-sound").firstChild.firstChild.setAttribute("href", opts.sound ? "#i-sound" : "#i-mute");
  }

  function openLib() {
    G.Game.cancelPointers();
    resumeAfter = G.Game.pause();
    renderHero(); renderStats(); renderSizes(); renderSettings();
    $("lib-close").hidden = !G.Game.info().has;
    $("lib").classList.add("on");
    $("intro").hidden = true;
    $("lib").querySelector(".lib-body").scrollTop = 0;
  }
  function closeLib() {
    if (!G.Game.info().has) return;
    $("lib").classList.remove("on");
    if (resumeAfter) G.Game.resume();
    resumeAfter = false;
    updateHud();
  }

  /* ---------- starting games ---------- */
  function play(o) {
    $("win").classList.remove("on");
    $("lib").classList.remove("on");
    resumeAfter = false;
    current = o;
    G.Game.start(o);
    $("hud").hidden = false; $("dock").hidden = false;
    lastPlaced = lastScore = -1;
    updateHud();
    if (o.saved) toast("Welcome back. Your puzzle is just as you left it.");
  }

  function playDaily() {
    var d = dailyInfo();
    play({ themeId: d.theme.id, seed: d.key, n: d.n, edgeSeed: G.hash("edges:" + d.key), daily: true });
  }

  function playContinue() {
    var sv = G.store.get("jp2.save", null);
    if (!sv) return;
    play({ themeId: sv.themeId, seed: sv.seed, n: sv.n, edgeSeed: sv.edgeSeed, daily: !!sv.daily, saved: sv });
  }

  function loadImage(src, name, cors) {
    return new Promise(function (resolve, reject) {
      var img = new Image();
      if (cors) img.crossOrigin = "anonymous";
      img.onload = function () {
        var long = Math.max(img.naturalWidth, img.naturalHeight), s = Math.min(1, 2000 / long);
        var cv = document.createElement("canvas");
        cv.width = Math.max(2, Math.round(img.naturalWidth * s)); cv.height = Math.max(2, Math.round(img.naturalHeight * s));
        cv.getContext("2d").drawImage(img, 0, 0, cv.width, cv.height);
        resolve({ image: cv, imgW: cv.width, imgH: cv.height, name: name, n: opts.n });
      };
      img.onerror = reject;
      img.src = src;
    });
  }

  $("file").addEventListener("change", function (e) {
    var f = e.target.files && e.target.files[0]; e.target.value = "";
    if (!f) return;
    var url = URL.createObjectURL(f);
    loadImage(url, f.name.replace(/\.[^.]+$/, "").slice(0, 28) || "Your photo").then(function (o) { URL.revokeObjectURL(url); play(o); })
      .catch(function () { toast("That file couldn't be read as a picture."); });
  });

  $("btn-random").onclick = function () {
    toast("Fetching a photo…");
    var id = Math.random().toString(36).slice(2, 9);
    loadImage("https://picsum.photos/seed/" + id + "/1600/1067", "Random photo", true).then(play)
      .catch(function () { toast("Couldn't reach the photo service. Try one of the built-in pictures."); });
  };

  /* ---------- win ---------- */
  function onWin(r) {
    lastResult = r;
    stats.solved++; stats.time += r.elapsed; stats.stars += r.stars;
    if (!stats.fast[r.total] || r.elapsed < stats.fast[r.total]) stats.fast[r.total] = r.elapsed;
    var prevBest = 0;
    if (!r.photo) {
      var d = stats.done[r.themeId] = stats.done[r.themeId] || {};
      prevBest = d[r.n] || 0; if (r.stars > prevBest) d[r.n] = r.stars;
    }
    if (r.daily) {
      var today = G.dateKey(new Date()), y = new Date(); y.setDate(y.getDate() - 1);
      if (stats.lastDaily !== today) { stats.streak = stats.lastDaily === G.dateKey(y) ? stats.streak + 1 : 1; stats.lastDaily = today; }
      stats.best = Math.max(stats.best, stats.streak);
      stats.daily[today] = Math.max(stats.daily[today] || 0, r.stars);
    }
    saveStats();
    G.store.remove("jp2.save");

    $("win-stars").innerHTML = [0, 1, 2].map(function (i) {
      return '<svg class="' + (i < r.stars ? "on" : "off") + '" style="--d:' + (i * 0.22 + 0.15) + 's"><use href="#i-star"/></svg>';
    }).join("");
    $("win-title").textContent = r.stars === 3 ? "Flawless!" : r.stars === 2 ? "Nicely done!" : "Puzzle complete!";
    $("win-sub").textContent = r.name + (r.daily ? " · daily streak " + currentStreak() + (currentStreak() === 1 ? " day" : " days") : "");
    $("win-stats").innerHTML = [[G.fmtTime(r.elapsed), "Time"], [r.score.toLocaleString(), "Score"], [r.moves, "Moves"]]
      .map(function (x) { return "<div><b>" + x[0] + "</b><span>" + x[1] + "</span></div>"; }).join("");
    $("win-again").textContent = r.photo ? "Pick another picture" : r.daily ? "Play a random puzzle" : "Another " + r.name + " puzzle";
    $("win").classList.add("on");
  }

  $("win-again").onclick = function () {
    var r = lastResult;
    if (!r || r.photo) { $("win").classList.remove("on"); openLib(); return; }
    var theme = r.daily ? G.THEMES[Math.floor(Math.random() * G.THEMES.length)].id : r.themeId;
    play({ themeId: theme, seed: Math.random().toString(36).slice(2, 8), n: r.n });
  };
  $("win-lib").onclick = function () { $("win").classList.remove("on"); openLib(); };
  $("win-view").onclick = function () { $("win").classList.remove("on"); };

  /* ---------- wiring ---------- */
  function setEdges(on) {
    opts.edges = on;
    G.Game.setOptions({ edges: on });
    $("d-edges").classList.toggle("on", on); $("d-edges").setAttribute("aria-pressed", String(on));
  }
  function toggleSound() { opts.sound = !opts.sound; G.Sound.setEnabled(opts.sound); saveOpts(); renderSettings(); if (opts.sound) G.Sound.tick(); }

  $("btn-lib").onclick = openLib;
  $("lib-close").onclick = closeLib;
  $("card-daily").onclick = playDaily;
  $("card-cont").onclick = playContinue;
  $("btn-sound").onclick = toggleSound;
  $("sw-sound").onclick = toggleSound;
  $("sw-guide").onclick = function () { opts.guide = !opts.guide; saveOpts(); G.Game.setOptions({ guide: opts.guide }); renderSettings(); };
  $("sw-haptics").onclick = function () { opts.haptics = !opts.haptics; saveOpts(); G.Game.setOptions({ haptics: opts.haptics }); renderSettings(); };
  $("d-undo").onclick = function () { G.Game.undo(); };
  $("d-hint").onclick = function () { G.Game.hint(); };
  $("d-tidy").onclick = function () { G.Game.tidy(); };
  $("d-edges").onclick = function () { setEdges(!opts.edges); };
  $("d-fit").onclick = function () { G.Game.fit("table"); };
  $("d-zin").onclick = function () { G.Game.zoomBy(1.35); };
  $("d-zout").onclick = function () { G.Game.zoomBy(1 / 1.35); };

  var peek = $("d-peek");
  peek.addEventListener("pointerdown", function (e) { e.preventDefault(); G.Game.peek(true); peek.classList.add("on"); });
  ["pointerup", "pointerleave", "pointercancel"].forEach(function (ev) { peek.addEventListener(ev, function () { G.Game.peek(false); peek.classList.remove("on"); }); });

  document.addEventListener("keydown", function (e) {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    var libOpen = $("lib").classList.contains("on"), k = e.key.toLowerCase();
    if (k === "escape") { if (libOpen) closeLib(); else if ($("win").classList.contains("on")) $("win").classList.remove("on"); else openLib(); return; }
    if (libOpen || $("win").classList.contains("on") || !G.Game.info().has) return;
    if (k === "z") G.Game.undo();
    else if (k === "h") G.Game.hint();
    else if (k === "t") G.Game.tidy();
    else if (k === "e") setEdges(!opts.edges);
    else if (k === "f") G.Game.fit("table");
    else if (k === "m") toggleSound();
    else if (k === "+" || k === "=") G.Game.zoomBy(1.25);
    else if (k === "-") G.Game.zoomBy(0.8);
    else if (k === " ") { e.preventDefault(); if (!e.repeat) { G.Game.peek(true); peek.classList.add("on"); } }
  });
  document.addEventListener("keyup", function (e) { if (e.key === " ") { G.Game.peek(false); peek.classList.remove("on"); } });

  /* ---------- boot ---------- */
  G.Sound.setEnabled(opts.sound);
  G.Game.init($("table"), $("stage"), {
    change: updateHud,
    win: onWin,
    toast: toast,
    save: function (obj) { if (obj) G.store.set("jp2.save", obj); else G.store.remove("jp2.save"); }
  });
  G.Game.setOptions({ guide: opts.guide, haptics: opts.haptics, table: opts.table, edges: false });
  setInterval(function () { if (G.Game.info().has && !$("lib").classList.contains("on")) updateHud(); }, 200);
  renderSizes(); renderCards(); renderSettings(); renderStats(); renderHero();
  $("lib").classList.add("on");

  G._ui = { play: play, openLib: openLib };
})(window.JP = window.JP || {});
