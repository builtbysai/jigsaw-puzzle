# Jigsaw Puzzle

A focused jigsaw puzzle game that runs entirely in the browser. No build step, no dependencies.

Live: https://builtbysai.com/jigsaw-puzzle/

## Play

- Pick a picture (217 photos, a generated default, or **Your photo**) and a piece count: 12, 24, 48, 96 or 192.
- Drag pieces onto the board. A piece dropped near its spot snaps in and locks.
- Drag empty felt to move around, scroll or pinch to zoom. The buttons on the table fit the whole table or just the board.
- **Guide** shows a faint copy of the picture on the board, **Hold to peek** shows it in full, **Hint** highlights a piece and where it goes, **Undo** (or Ctrl/Cmd+Z) takes back a move.
- Best times are saved per piece count in your browser.

## Code

| File | What it does |
| --- | --- |
| `index.html`, `style.css` | Page, toolbar, picture shelf, light/dark theme |
| `js/engine.js` | Grid choice, interlocking piece outlines, cutting pieces from the picture |
| `js/scene.js` | Generated artwork used as the default picture and as the offline fallback |
| `js/pictures.js` | Picture library (picsum.photos seeds) |
| `js/app.js` | Game state, camera, input, canvas rendering, UI |

Photos load from picsum.photos. If a download fails, the game falls back to generated artwork so it always works.
