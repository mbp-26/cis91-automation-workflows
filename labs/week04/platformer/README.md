# Bean Run — a simple browser platformer

A tiny side-scrolling platformer that runs entirely in the browser: **one file, no build step, no dependencies, no network calls.**

## Run it

Open `index.html` in any modern browser:

- **Double-click** `index.html`, or
- `start index.html` (Windows), or
- serve the folder if you prefer: `python -m http.server 8000` → <http://localhost:8000>

Works from `file://` too, so you can drop the folder on any static host (GitHub Pages, Netlify, S3) as-is.

## Controls

| Action | Keys |
| --- | --- |
| Move | `←` `→` or `A` `D` |
| Jump | `Space`, `W`, or `↑` (hold longer = jump higher) |
| Restart | `R` (or `Enter` on the win screen) |
| Touch | Tap the canvas to jump |

## Goal

Run left to right, collect the 21 coins, avoid the spikes, and don't fall in the pits. Reach the pink flag at the far end to win. The HUD tracks coins, elapsed time, and deaths.

## What's in the box

```
platformer/
└── index.html   # everything: markup, styles, canvas game loop
```

## Notes on the implementation

- **Canvas 2D** rendering, fixed 960×540 logical resolution, HiDPI-aware, letterboxed to fit the window.
- **Fixed 60 Hz timestep** with an accumulator, so physics are frame-rate independent.
- **Axis-separated AABB collision** against platform rectangles, resolved on the X axis first, then Y.
- Game-feel touches: gravity, terminal velocity, coyote time (6 frames), jump input buffering (8 frames), variable jump height (releasing early cuts the jump), and squash-and-stretch on takeoff, landing, and coin pickup.
- **Parallax** hills, drifting sun glow, twinkling stars, spinning coins, and a waving flag — all procedurally drawn, no image assets.
- Player falls below the level → respawn at the start (coins already collected stay collected); `R` resets the whole run.
