# Jigsaw

A cozy jigsaw puzzle game that runs in the browser. No build step, no dependencies.

**Play:** https://builtbysai.com/jigsaw-puzzle/

## What's in it
- **13 original scenes** drawn by code (mountains, aurora, koi pond, nebula, balloons and more), so every puzzle is crisp, offline and different each time.
- **12 to 192 pieces**, with real interlocking Bezier edges shared between neighbours.
- **Pieces that feel good**: lift and tilt while dragging, soft shadows, a glow where a piece will snap, sparks, floating score, and a satisfying click.
- **Groups**: matching pieces join anywhere on the table and move together. Combo scoring rewards quick chains.
- **Daily puzzle** (same for everyone) with a streak, a **collection** of stars per picture and size, and stats.
- **Helpers**: hint, tidy loose pieces, dim middle pieces (Edges), hold-to-peek, undo.
- **Your photo** or a random online photo as a puzzle.
- Oak, felt or slate table, synthesized sound, haptics, autosave and resume.
- Touch friendly: pinch to zoom, drag to pan, double tap to zoom.

## Shortcuts
`Z` undo · `H` hint · `T` tidy · `E` edges · `Space` peek · `F` fit · `+`/`-` zoom · `M` mute · `Esc` library

## Structure
`js/util.js` helpers · `js/art.js`, `js/art2.js` scenes · `js/engine.js` piece geometry · `js/table.js` textures · `js/audio.js` sound · `js/game.js` game core · `js/ui.js` interface.
