# RESONANT

**Throw light. Catch sound.**

A kinetic mini-instrument — a handheld device you pull back and release glowing particles across; every wall hit becomes music.

## Run locally

```bash
npm install
npm run dev
```

Open the URL Vite prints (usually `http://localhost:5173`).

Build for production:

```bash
npm run build
```

Output lands in `dist/`.

## How to play (30 seconds)

1. **Resonant boots powered off** — the screen shows a short credits message. Press **PWR** (top right) to turn on. The coral LED means live audio.
2. **Pull back & release** anywhere on the full device screen — top, bottom, corners, center. Touch down to set an anchor, drag away to stretch the rubber band, release to launch from the anchor opposite your pull.
3. A **particle counter** at the top of the screen shows how many orbs are live (`01` … `10 / 10`).
4. Particles **never fade out** — they keep bouncing and sounding on every wall hit until you power off (or the 10-particle cap drops the oldest).
5. Pick an **instrument** (Piano, Harp, Marimba, Beat) before throwing; each particle keeps the voice it was born with.
6. Layer up to **10 particles**. Switch **scale** (Penta / Major / Minor), tweak **Tempo**, **Delay**, and **Momentum**.
7. **Power off** silences everything and clears the stage. Next boot shows the credits again until you press PWR and throw.

Default: Piano instrument, Pentatonic scale, tonic D.

## Record / share / download

1. Power on and play. Press **RECORD** on the deck (red dot). Recording starts immediately — keep throwing; the stage stays live.
2. Press **STOP** (coral) when done. A take modal opens with video preview (stage canvas + synced audio only — no device chrome).
3. **SHARE** — uses the OS share sheet when the browser supports sharing video files (common on mobile). On desktop, falls back to downloading the video.
4. **DOWNLOAD VIDEO** — WebM or MP4 depending on browser.
5. **DOWNLOAD AUDIO** — audio-only WebM (or supported format).
6. Recordings auto-stop at **60 seconds**. Power off while recording stops the take and opens the modal if anything was captured.

Filenames look like `resonant-2026-08-13.webm`.

## Stack

- Vite + React + TypeScript
- HTML Canvas 2D (device screen, particles, trails)
- Tone.js (audio)
- Custom bounce physics (no Matter.js)
- CSS design tokens
- Client-side MediaRecorder (no backend)

## v1.1 ideas

1. **Reverse effect** — time-stretched echoes on wall hits for surreal playback.
2. **Particle lifetime / clear** — optional gentle fade-out plus a “clear stage” gesture without powering off.
3. **MIDI export** — capture wall hits as a simple MIDI file from the same performance.

---

Built as a portfolio-ready thin wedge: one composition, immediate delight, no accounts, no backend.
