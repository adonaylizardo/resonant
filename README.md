# RESONANT

**Throw light. Catch sound.**

A kinetic mini-instrument — drag glowing particles across a cinematic stage and let wall collisions become music.

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

1. **Power on** (bottom rail) — the coral dot means live audio.
2. **Drag and release** on the black stage to throw a glowing particle. Your throw direction and speed set its trajectory.
3. Particles **bounce off walls** — each hit plays a note quantized to the selected scale, so it always sounds musical.
4. Pick an **instrument** (Pulse, Glass, Drift) before throwing; each particle keeps the voice it was born with.
5. Layer up to **10 particles** at once. Switch **scale** (Penta / Major / Minor), tweak **Tempo**, **Delay**, and **Momentum** to taste.
6. **Power off** to mute and stop all sound cleanly.

Default: Pulse instrument, Pentatonic scale, tonic D.

## Stack

- Vite + React + TypeScript
- HTML Canvas 2D (stage, particles, trails)
- Tone.js (audio)
- Custom bounce physics (no Matter.js)
- CSS design tokens

## v1.1 ideas

1. **Reverse effect** — time-stretched echoes on wall hits for surreal playback.
2. **Record / export** — capture a 30-second performance as WAV or WebM.
3. **Particle lifetime / clear** — gentle fade-out over time plus a “clear stage” gesture to reset without reloading.

---

Built as a portfolio-ready thin wedge: one composition, immediate delight, no accounts, no backend.
