# Bean Run — a simple browser platformer


A tiny side-scrolling platformer that runs entirely in the browser: **one file, no build step, no dependencies, no network calls.**

## Class links

Session code `cis91-w4` — the game and the board only accept this code.

| Purpose | URL |
|---|---|
| Game (students) | `https://raw.githack.com/mbp-26/cis91-automation-workflows/372b281/pi-projects/leaderboard-game/index.html?session=cis91-w4` |
| Leaderboard (projector) | `https://raw.githack.com/mbp-26/cis91-automation-workflows/372b281/pi-projects/leaderboard-game/board.html?session=cis91-w4&key=<class-password>` |

The revision `372b281` is pinned on purpose: raw.githack caches branch URLs, so `.../main/...` can
serve a stale page for a few minutes after a push. Replace the hash with a newer commit to force a
fresh copy. The class password is not stored in this repo — it is handed out in class and required by
both pages (the Worker and n8n both check it).


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

## Class leaderboard (n8n)

Finishing the level posts your run to n8n, then shows a leaderboard with **Refresh** and three sort modes: **Score**, **Time**, **Name**.

- Endpoints: `POST /webhook/leaderboard-submit`, `GET /webhook/leaderboard?session=…&sort=score|time|name`
- Session defaults to `wk4`; override with `?session=yourcode` on the page URL
- Score = `coins × 100 + max(0, (300 − seconds) × 10)`
- Name is asked once and kept in `localStorage`; runs are submitted on a honour system
