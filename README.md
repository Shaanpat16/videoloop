# kiosk-loop

A screen that plays videos fullscreen, on a loop, forever. To change what's on
the screen you drop video files into `videos/` and push — nothing else.

No backend, no database, no admin login. Render rebuilds on every push and the
kiosk picks up the change on its own within a minute.

---

## Adding or removing videos

1. Put `.mp4` files in the `videos/` folder.
2. Commit and push.

```bash
git add videos/
git commit -m "new videos"
git push
```

Render redeploys in ~1 minute. Any screen already showing the page notices the
new playlist on its next poll and rolls it in after the current video finishes —
nobody has to touch the kiosk.

**Order** is alphabetical, so prefix filenames when it matters:
`01-welcome.mp4`, `02-events.mp4`, `03-donate.mp4`.

**Deleting** a file from `videos/` and pushing drops it from the loop.

---

## First-time Render setup

1. Push this repo to GitHub.
2. In Render: **New → Static Site**, connect the repo. `render.yaml` fills in the
   rest (build command `node scripts/build.js`, publish directory `dist`).
3. Deploy. The URL it gives you is the kiosk URL.

Static sites on Render are free and always on — no spin-down between visits,
which matters for a screen that's meant to run unattended.

---

## Pointing a kiosk at it

On the Ubuntu kiosks, the URL goes in the Chromium line in `~/.xinitrc`:

```
chromium-browser --kiosk --noerrdialogs --disable-infobars \
  --autoplay-policy=no-user-gesture-required \
  --check-for-update-interval=31536000 \
  "https://<your-site>.onrender.com/"
```

`--autoplay-policy=no-user-gesture-required` isn't strictly needed (the videos
are muted, which browsers allow to autoplay on their own) but it removes any
doubt.

For a portrait screen, rotate at the display level rather than in the page —
`xrandr --output HDMI-1 --rotate left` in `.xinitrc` before launching Chromium.

---

## Options

Append to the URL:

| Option | Default | What it does |
|---|---|---|
| `?fit=contain` | `cover` | Letterbox instead of cropping to fill. Use when video and screen aspect ratios don't match. |
| `?shuffle=1` | off | Random order instead of alphabetical. |
| `?poll=30` | `60` | Seconds between checks for newly pushed videos. |
| `?fade=0` | `400` | Crossfade length in ms. `0` for a hard cut. |
| `?reloadHours=6` | `12` | Hard page reload interval — a safety net for screens up for weeks. |
| `?debug` | off | Overlay showing what's loading and any playback errors. |

Combine with `&`: `https://.../?fit=contain&shuffle=1&poll=30`

---

## Encoding for kiosk screens

Portrait 1080x1920, H.264, well-compressed:

```bash
ffmpeg -i input.mov -vf "scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920" \
  -c:v libx264 -preset slow -crf 24 -pix_fmt yuv420p -movflags +faststart \
  -an videos/01-welcome.mp4
```

`-an` strips audio (the player is muted anyway, and it saves space).
`-movflags +faststart` matters — without it the browser downloads the whole
file before the first frame appears.

---

## Limits worth knowing

- **100 MB per file** — GitHub rejects a push containing anything larger. The
  build prints a warning above 50 MB.
- **Repo size** — a few GB of video in git history will make clones slow. If this
  grows past a handful of files, switch to Git LFS or host the videos elsewhere.
- Videos live in the repo, so anyone who can see the repo can see the videos.
  Keep the repo private if that matters.

---

## Running it locally

```bash
npm start
```

Then open http://localhost:3000.
