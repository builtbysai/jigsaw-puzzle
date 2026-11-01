// Minimal DOM shim to run the puzzle script in Node and simulate drag + undo.
const fs = require("fs");
class ClassList {
  constructor(el){ this.el = el; this.s = new Set(); }
  add(...c){ c.forEach(x=>this.s.add(x)); }
  remove(...c){ c.forEach(x=>this.s.delete(x)); }
  toggle(c, force){
    if(force === undefined){ this.s.has(c) ? this.s.delete(c) : this.s.add(c); }
    else if(force) this.s.add(c); else this.s.delete(c);
    return this.s.has(c);
  }
  contains(c){ return this.s.has(c); }
}
class El {
  constructor(tag){
    this.tagName = tag.toUpperCase();
    this.children = []; this.parent = null;
    this.style = {}; this.dataset = {};
    this.classList = new ClassList(this);
    this._handlers = {};
    this.textContent = "";
    this._className = "";
    Object.defineProperty(this, "innerHTML", {
      get(){ return ""; },
      set(){ this.children.forEach(c => { c.parent = null; }); this.children = []; }
    });
    if(tag === "canvas") this._ctx = { setTransform(){}, beginPath(){}, moveTo(){}, lineTo(){}, bezierCurveTo(){}, closePath(){}, clip(){}, drawImage(){}, stroke(){}, scale(){} };
    if(tag === "img"){ this.naturalWidth = 0; this.naturalHeight = 0; }
  }
  set className(v){ this._className = v; this.classList.s = new Set(v.split(/\s+/).filter(Boolean)); }
  get className(){ return this._className; }
  appendChild(ch){
    if(ch.parent){ const i = ch.parent.children.indexOf(ch); if(i>=0) ch.parent.children.splice(i,1); }
    ch.parent = this; this.children.push(ch); return ch;
  }
  addEventListener(t, fn){ (this._handlers[t] = this._handlers[t] || []).push(fn); }
  dispatch(t, e){
    e = e || {}; e.target = e.target || this; e.preventDefault = e.preventDefault || (()=>{});
    if(e.target.closest === undefined || e.target._closestPatched !== true){
      const tgt = e.target;
      tgt.closest = (sel) => {
        if(sel === "button[data-n]" && tgt.tagName === "BUTTON" && tgt.dataset && tgt.dataset.n !== undefined) return tgt;
        if(sel === ".piece" && tgt.classList && tgt.classList.contains("piece")) return tgt;
        return null;
      };
      tgt._closestPatched = true;
    }
    (this._handlers[t] || []).forEach(fn => fn.call(this, e));
  }
  querySelector(sel){
    const all = this.querySelectorAll(sel); return all[0] || null;
  }
  querySelectorAll(sel){
    const out = [];
    const walk = (el) => {
      for(const ch of el.children){
        let ok = false;
        if(sel === ".pick" && ch.classList.contains("pick")) ok = true;
        if(sel === "button" && ch.tagName === "BUTTON") ok = true;
        if(sel === "img" && ch.tagName === "IMG") ok = true;
        if(sel.startsWith(".pick[data-file=") && ch.classList.contains("pick") && ch.dataset.file === sel.match(/"([^"]+)"/)[1]) ok = true;
        if(ok) out.push(ch);
        walk(ch);
      }
    };
    walk(this); return out;
  }
  getBoundingClientRect(){
    if(this._rect) return this._rect;
    // board-sized default for loose pieces: derive from style
    const w = parseFloat(this.style.width) || 100, h = parseFloat(this.style.height) || 75;
    const l = parseFloat(this.style.left) || 0, t = parseFloat(this.style.top) || 0;
    return { left: l, top: t, width: w, height: h, right: l+w, bottom: t+h };
  }
  get clientWidth(){ return this._cw || 0; }
  get clientHeight(){ return this._ch || 0; }
  scrollIntoView(){}
  setPointerCapture(){}
  releasePointerCapture(){}
  getContext(){ return this._ctx; }
}
const byId = {};
function mk(id, tag, rect, cw, ch){
  const el = new El(tag); el.id = id; if(rect) el._rect = rect; if(cw) el._cw = cw; if(ch) el._ch = ch; byId[id] = el; return el;
}
const board = mk("board","div",{left:0,top:0,width:800,height:600,right:800,bottom:600},800,600);
mk("ghost","img"); mk("grid","canvas"); mk("placedLayer","div"); mk("looseLayer","div");
mk("flash","div"); mk("peek","img"); mk("tray","div"); mk("trayCount","span");
mk("trayEmpty","p"); mk("winBar","div"); mk("winText","span");
mk("statPlaced","b"); mk("statTime","b"); mk("statMoves","b");
mk("picker","div"); mk("fileInput","input"); mk("newBtn","button"); mk("againBtn","button");
mk("ghostBtn","button"); mk("peekBtn","button"); mk("hintBtn","button"); mk("undoBtn","button");
mk("picError","p"); mk("picSearch","input"); mk("picName","span");
const sizeSeg = mk("sizeSeg","div");
[12,24,48,96,192].forEach(n => { const b = new El("button"); b.dataset.n = String(n); if(n===24) b.classList.add("sel"); sizeSeg.appendChild(b); });
global.document = {
  getElementById: (id) => byId[id],
  createElement: (tag) => new El(tag),
};
global.window = {
  addEventListener(){}, devicePixelRatio: 1,
};
global.requestAnimationFrame = (fn) => fn();
// Image stub: loading any src succeeds with 1200x800
global.Image = class {
  constructor(){ this._src = ""; this.onload = null; this.onerror = null; this.naturalWidth = 0; this.naturalHeight = 0; }
  set src(v){ this._src = v; this.naturalWidth = 1200; this.naturalHeight = 800; if(this.onload) this.onload(); }
  get src(){ return this._src; }
};
global.URL = { createObjectURL: () => "blob:x", revokeObjectURL(){} };
global.setInterval = () => 0; global.clearInterval = () => {};
global.Math.random = (() => { let s = 42; return () => { s = (s * 1103515245 + 12345) % 2147483648; return s / 2147483648; }; })();

const src = fs.readFileSync("/home/hatch/workspace/puzzle-fix/index.html", "utf8");
const m = src.match(/<script>([\s\S]*)<\/script>/);
eval(m[1]);

// helpers to inspect state via DOM
const tray = byId.tray, placedLayer = byId.placedLayer, looseLayer = byId.looseLayer;
function counts(){
  const inTray = tray.children.length, inPlaced = placedLayer.children.length, inLoose = looseLayer.children.length;
  return { trayDOM: inTray, placedDOM: inPlaced, looseDOM: inLoose,
    header: byId.trayCount.textContent, placed: byId.statPlaced.textContent, moves: byId.statMoves.textContent };
}
function trayPiece(i){ return tray.children[i]; }
function dragPiece(pieceEl, moves){
  // moves: array of {x,y} client coords; first is pointerdown on the piece
  const start = moves[0];
  pieceEl.dispatch("pointerdown", { pointerId: 1, clientX: start.x, clientY: start.y, pointerType: "mouse" });
  for(let k = 1; k < moves.length; k++){
    pieceEl.dispatch("pointermove", { pointerId: 1, clientX: moves[k].x, clientY: moves[k].y, pointerType: "mouse" });
  }
  const end = moves[moves.length-1];
  pieceEl.dispatch("pointerup", { pointerId: 1, clientX: end.x, clientY: end.y, pointerType: "mouse" });
}
// initial game is Mountain Lake at 24 pieces (from script start); switch to 12 via sizeSeg click
sizeSeg.dispatch("click", { target: sizeSeg.children[0] });
console.log("after size 12:", counts());
// place one piece correctly via tap-to-place: tap a tray piece, then tap board at its home cell
// piece home: use el._piece r,c; board tap handler needs target.closest -> null (default)
let p0 = tray.children[0]._piece;
console.log("p0 home r,c:", p0.r, p0.c);
tray.children[0].dispatch("pointerdown", { pointerId: 1, clientX: 900, clientY: 100, pointerType: "mouse" });
tray.children[0].dispatch("pointerup", { pointerId: 1, clientX: 900, clientY: 100, pointerType: "mouse" });
// board tap at home cell center: board rect 800x600, cols/rows for 12 = ? compute from piece: use 4 cols x 3 rows (1200x800 aspect)
const cols = 4, rows = 3;
const homeX = (p0.c + 0.5) / cols * 800, homeY = (p0.r + 0.5) / rows * 600;
board.dispatch("pointerdown", { clientX: homeX, clientY: homeY });
console.log("after tap-place p0:", counts());
// drag a tray piece to a wrong spot: tray piece at (900,100), move across board to bottom-right cell area (700,500), release
let p1 = tray.children[0];
console.log("dragging piece home:", p1._piece.r, p1._piece.c, "parent before:", p1.parent.id);
dragPiece(p1, [{x:900,y:100},{x:850,y:150},{x:700,y:400},{x:700,y:500}]);
console.log("after wrong drag:", counts(), "p1 parent:", p1.parent.id, "p1 state:", p1._piece.state, "lx,ly:", p1._piece.lx, p1._piece.ly);
// undo
byId.undoBtn.dispatch("click", {});
console.log("after undo:", counts(), "p1 parent:", p1.parent.id, "p1 state:", p1._piece.state);
