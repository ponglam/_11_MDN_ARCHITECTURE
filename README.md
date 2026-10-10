# MDN_ARCHITECTURE (Life Grid)

A generative Mondrian-style architecture, seeded by a person's name, birthday and birth time.
Lines cross, the crossings become candidate rectangles, and some of them become solids with real depth.
The whole structure moves through a 100-year life.

## Open it

Double-click `index.html` and it opens in Chrome. You don't need a server or an internet connection:
three.js is included in `vendor/`. The two Google fonts (Jost, IBM Plex Mono) load only when you're online.
Offline, the page falls back to system fonts.

## Folder

```
index.html            page markup; loads the scripts below in order
css/style.css         page and panel styles
data/acacia-tree.js   the black acacia tree, converted from the FBX (no textures, Z-up, height 1)
vendor/three-r128/    three.js r128 + OrbitControls (MIT, see LICENSE)
js/
  00-utils.js         math helpers, seeded random (rngOf)
  01-config.js        palette, density flows, height modes, sample names, shared state S
  02-model.js         build(): lines, candidate rects area[n], solids, open faces, tree schedule
  03-paper.js         makePaper(w, h): procedural paper at any size
  04-scene.js         renderer, lights, shadows, solid shaders, tree mesh, rebuildScene()
  05-update.js        update(): positions everything for the current year
  06-camera.js        the 7 views, lens and vanishing point, eased camera moves
  07-ui.js            canvas layout, sparkline, reading panel, control handlers
  08-export.js        2K / 4K / 8K PNG export (tiled rendering)
  09-main.js          animation loop and start-up
```

These are plain scripts, not modules, so they also work when opened as a local file.
They share one global scope, so the load order in `index.html` matters: keep `09-main.js` last.

## Where to change things

| To change | Edit |
|---|---|
| Colours, tone weights | `TONES` in `js/01-config.js` |
| Density flows over the life | `PROFILES` in `js/01-config.js` (the density floor is the line after it) |
| Height modes | `HEIGHTS` in `js/01-config.js`, `zOf()` in `js/02-model.js` |
| Line weights (60 / 30 / 10 %) | `thick()` in `js/02-model.js` |
| Round-solid share (0–20 %) | `roundShare` in `js/02-model.js` |
| Open-box share, rim thickness | `openShare`, `rim` in `js/02-model.js` |
| Tree size and walking | `hOf` and `TRAVEL` in `js/05-update.js`; host choice in `js/02-model.js` |
| Lighting and shadows | top of `js/04-scene.js` |
| Camera views | `viewPose()` in `js/06-camera.js` |
| Export sizes | the `#exp` buttons in `index.html` (`data-h`) |

## Seed

The same name, birthday and birth time always give the same life.
Every random choice comes from `rngOf(seedString + '|purpose')`, so changing one rule does not reshuffle the others.
