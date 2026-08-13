# RESONANT

**Throw light. Catch sound.**

A kinetic mini-instrument — a handheld device you drag glowing particles across; every wall hit becomes music.

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
2. **Drag and release** inside the device screen to throw a glowing particle. Throws stay inside the small screen — short, natural bounces.
3. Particles **never fade out** — they keep bouncing and sounding on every wall hit until you power off (or the 10-particle cap drops the oldest).
4. Pick an **instrument** (Pulse, Glass, Drift) before throwing; each particle keeps the voice it was born with.
5. Layer up to **10 particles**. Switch **scale** (Penta / Major / Minor), tweak **Tempo**, **Delay**, and **Momentum**.
6. **Power off** silences everything and clears the stage. Next boot shows the credits again until you press PWR and throw.

Default: Pulse instrument, Pentatonic scale, tonic D.

## Stack

- Vite + React + TypeScript
- HTML Canvas 2D (device screen, particles, trails)
- Tone.js (audio)
- Custom bounce physics (no Matter.js)
- CSS design tokens

## v1.1 ideas

1. **Reverse effect** — time-stretched echoes on wall hits for surreal playback.
2. **Record / export** — capture a 30-second performance as WAV or WebM.
3. **Particle lifetime / clear** — optional gentle fade-out plus a “clear stage” gesture without powering off.

---

Built as a portfolio-ready thin wedge: one composition, immediate delight, no accounts, no backend.
