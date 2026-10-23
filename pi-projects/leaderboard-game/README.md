# Bean Run — class leaderboard game

A small browser platformer where finishing a run posts your score to **n8n**, which keeps a
session leaderboard. Built for a CIS 91 class demo: the game is public, the plumbing behind it
is not.

```
GitHub repo → raw.githack.com CDN → student browser
                                        │ POST /submit, GET /board
                                        ▼
                             Cloudflare Worker relay  (password, CORS, rate limit)
                                        │ forwards to secret webhook URLs
                                        ▼
                                  n8n workflows  →  Data Table (leaderboard)
```

Full diagram: [`diagrams/project-flow.svg`](diagrams/project-flow.svg) ·
editable [`diagrams/project-flow.drawio`](diagrams/project-flow.drawio) ·
source [`diagrams/project-flow.mmd`](diagrams/project-flow.mmd)

## Class links

Session code `cis91-w4` — the game and the board only accept this code.

| Purpose | URL |
|---|---|
| Game (students) | `https://raw.githack.com/mbp-26/cis91-automation-workflows/372b281/pi-projects/leaderboard-game/index.html?session=cis91-w4` |
| Leaderboard (projector) | `https://raw.githack.com/mbp-26/cis91-automation-workflows/372b281/pi-projects/leaderboard-game/board.html?session=cis91-w4&key=<class-password>` |

The commit hash is pinned on purpose: raw.githack caches branch URLs, so `.../main/...` can serve a
stale page for several minutes after a push. Bump the hash to force a fresh copy.

The class password is **not** in this repo. Students type it into the start screen; the Worker and
n8n both verify it.

## How it plays

| Action | Keys |
|---|---|
| Move | `←` `→` or `A` `D` |
| Jump | `Space`, `W`, or `↑` (hold longer = jump higher) |
| Restart | `R` (or `Enter` on the win screen) |
| Touch | Tap the canvas to jump |

Collect all **21 coins**, avoid the spikes, don't fall in the pits, and touch the pink flag at the far
right. A run posts automatically on the flag, then shows the leaderboard with **Score / Time / Name**
sorting and a **Refresh** button.

**Score** is `coins × 100 + max(0, (300 − seconds) × 10)` — recomputed by n8n, never trusted from
the browser.

## Files

| File | Role |
|---|---|
| `index.html` | the game — canvas, physics, level, HUD, win screen (single file, no build step) |
| `leaderboard-client.js` | name + password prompt, posts a finished run, renders the leaderboard panel |
| `board.html` | projector view: full-screen board, auto-refresh every 5 s, keys `1`/`2`/`3` switch sort |
| `diagrams/` | the request-flow diagram (`.svg`, `.drawio`, `.mmd`) |

`index.html` + `leaderboard-client.js` are the only files students load; `board.html` is for the
projector.

## Security model

The page is public, so it contains **no secrets** — no webhook URL, no password, no session list.
What protects the data lives server-side:

| Control | Where | Effect |
|---|---|---|
| Secret webhook URLs | Cloudflare Worker **secrets** | the page only knows the Worker URL; scanning it reveals nothing useful |
| Class password | Worker + n8n `Check Password` node | every request is rejected (`401`) before n8n is touched |
| Session allowlist | n8n | only known class codes are accepted |
| Server-computed score | n8n | a client-supplied `score` is ignored |
| Clamps | n8n | `coins 0…21`, `ms 10 s…1 h` |
| Rate limit | n8n | 3 submissions per player per 60 s |
| Row cap | n8n | a session stops accepting at 300 rows |
| Name scrub | n8n | letters, digits, space, `.` `'` `-` only, 20 chars |
| Read cap | n8n | board returns at most 100 rows |

## Troubleshooting

| Symptom | Meaning |
|---|---|
| "class password was rejected" (`401`) | wrong password as typed — use **Enter password again**, or clear `localStorage["beanrun.key"]` and reload |
| "slow down (rate limited)" (`429`) | more than 3 submissions from one name in 60 s |
| "rejected by the server" (`502`) | n8n threw — check Executions in n8n (the Worker deliberately hides upstream error bodies) |
| Empty board | wrong `session` code in the URL |
| Stale page after a push | githack cache — pin the commit hash instead of `main` |

## Running it locally

```bash
cd pi-projects/leaderboard-game
python -m http.server 8000        # or any static server
# http://localhost:8000/index.html?session=cis91-w4
```

Opening `index.html` from `file://` also works; the Worker allows cross-origin calls.

## Credits

Game, relay and workflows by Michael Parina for CIS 91. Fonts and graphics are drawn in code — no
external assets, no dependencies.
