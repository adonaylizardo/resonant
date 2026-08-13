import * as Tone from 'tone'
import type { InstrumentId, ScaleId } from './types'
import { INSTRUMENT_IDS } from './types'
import { wallToFrequency } from './scales'

type Wall = 'top' | 'bottom' | 'left' | 'right'

interface Voice {
  connect(destination: Tone.InputNode): void
  trigger(frequency: number, velocity: number, duration: string): void
  releaseAll(): void
  dispose(): void
}

const NOTE_DURATIONS: Record<InstrumentId, string> = {
  piano: '4n.',
  harp: '2n',
  marimba: '8n',
  beat: '16n',
}

/** Hammer transient + decaying tonal body. */
class PianoVoice implements Voice {
  private body: Tone.PolySynth<Tone.Synth>
  private hammer: Tone.NoiseSynth
  private output: Tone.Gain

  constructor() {
    this.output = new Tone.Gain(0.78)
    this.body = new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: 'triangle' },
      envelope: { attack: 0.006, decay: 0.85, sustain: 0.1, release: 1.3 },
    })
    this.hammer = new Tone.NoiseSynth({
      noise: { type: 'pink' },
      envelope: { attack: 0.001, decay: 0.035, sustain: 0, release: 0.015 },
    })
    this.body.maxPolyphony = 12
    this.body.connect(this.output)
    this.hammer.connect(this.output)
  }

  connect(destination: Tone.InputNode) {
    this.output.connect(destination)
  }

  trigger(frequency: number, velocity: number, duration: string) {
    const v = Math.max(0.2, Math.min(0.78, velocity))
    this.body.triggerAttackRelease(frequency, duration, undefined, v * 0.72)
    this.hammer.triggerAttackRelease('64n', undefined, v * 0.18)
  }

  releaseAll() {
    this.body.releaseAll()
  }

  dispose() {
    this.body.dispose()
    this.hammer.dispose()
    this.output.dispose()
  }
}

/** Bright pluck with fast decay and airy sparkle. */
class HarpVoice implements Voice {
  private synth: Tone.PolySynth<Tone.FMSynth>
  private output: Tone.Gain

  constructor() {
    this.output = new Tone.Gain(0.72)
    this.synth = new Tone.PolySynth(Tone.FMSynth, {
      harmonicity: 2.4,
      modulationIndex: 1.4,
      oscillator: { type: 'sine' },
      envelope: { attack: 0.001, decay: 0.38, sustain: 0.06, release: 2.4 },
      modulation: { type: 'triangle' },
      modulationEnvelope: { attack: 0.001, decay: 0.12, sustain: 0, release: 0.25 },
    })
    this.synth.maxPolyphony = 12
    this.synth.connect(this.output)
  }

  connect(destination: Tone.InputNode) {
    this.output.connect(destination)
  }

  trigger(frequency: number, velocity: number, duration: string) {
    const v = Math.max(0.2, Math.min(0.75, velocity))
    this.synth.triggerAttackRelease(frequency, duration, undefined, v * 0.68)
  }

  releaseAll() {
    this.synth.releaseAll()
  }

  dispose() {
    this.synth.dispose()
    this.output.dispose()
  }
}

/** Wooden mallet tick + warm hollow tone. */
class MarimbaVoice implements Voice {
  private synth: Tone.PolySynth<Tone.MembraneSynth>
  private output: Tone.Gain

  constructor() {
    this.output = new Tone.Gain(0.74)
    this.synth = new Tone.PolySynth(Tone.MembraneSynth, {
      pitchDecay: 0.006,
      octaves: 1.6,
      oscillator: { type: 'sine' },
      envelope: { attack: 0.001, decay: 0.48, sustain: 0.03, release: 0.75 },
    })
    this.synth.maxPolyphony = 12
    this.synth.connect(this.output)
  }

  connect(destination: Tone.InputNode) {
    this.output.connect(destination)
  }

  trigger(frequency: number, velocity: number, duration: string) {
    const v = Math.max(0.2, Math.min(0.76, velocity))
    this.synth.triggerAttackRelease(frequency, duration, undefined, v * 0.62)
  }

  releaseAll() {
    this.synth.releaseAll()
  }

  dispose() {
    this.synth.dispose()
    this.output.dispose()
  }
}

/** Percussive musical hit — pitched pulse, not a kick or bass guitar. */
class BeatVoice implements Voice {
  private body: Tone.PolySynth<Tone.MembraneSynth>
  private accent: Tone.NoiseSynth
  private output: Tone.Gain

  constructor() {
    this.output = new Tone.Gain(0.68)
    this.body = new Tone.PolySynth(Tone.MembraneSynth, {
      pitchDecay: 0.035,
      octaves: 1.3,
      oscillator: { type: 'sine' },
      envelope: { attack: 0.001, decay: 0.22, sustain: 0.02, release: 0.38 },
    })
    this.accent = new Tone.NoiseSynth({
      noise: { type: 'white' },
      envelope: { attack: 0.001, decay: 0.018, sustain: 0, release: 0.01 },
    })
    this.body.maxPolyphony = 12
    this.body.connect(this.output)
    this.accent.connect(this.output)
  }

  connect(destination: Tone.InputNode) {
    this.output.connect(destination)
  }

  trigger(frequency: number, velocity: number, duration: string) {
    const v = Math.max(0.18, Math.min(0.72, velocity))
    this.body.triggerAttackRelease(frequency, duration, undefined, v * 0.55)
    this.accent.triggerAttackRelease('64n', undefined, v * 0.12)
  }

  releaseAll() {
    this.body.releaseAll()
  }

  dispose() {
    this.body.dispose()
    this.accent.dispose()
    this.output.dispose()
  }
}

function createVoice(id: InstrumentId): Voice {
  switch (id) {
    case 'piano':
      return new PianoVoice()
    case 'harp':
      return new HarpVoice()
    case 'marimba':
      return new MarimbaVoice()
    case 'beat':
      return new BeatVoice()
  }
}

export class AudioEngine {
  private voices: Map<InstrumentId, Voice> = new Map()
  private delay: Tone.FeedbackDelay
  private masterGain: Tone.Gain
  private started = false
  private powered = false

  scale: ScaleId = 'pentatonic'
  tempo = 0.5
  delayAmount = 0.35
  momentum = 0.65

  constructor() {
    this.masterGain = new Tone.Gain(0).toDestination()
    this.delay = new Tone.FeedbackDelay({
      delayTime: '8n',
      feedback: 0.4,
      wet: 0.35,
    })
    this.delay.connect(this.masterGain)

    for (const id of INSTRUMENT_IDS) {
      const voice = createVoice(id)
      voice.connect(this.delay)
      this.voices.set(id, voice)
    }
  }

  async ensureStarted(): Promise<void> {
    if (this.started) return
    await Tone.start()
    this.started = true
    if (this.powered) {
      this.masterGain.gain.value = 1
      Tone.getTransport().start()
    }
  }

  setPowered(on: boolean) {
    this.powered = on
    if (!this.started) return

    if (on) {
      this.masterGain.gain.rampTo(1, 0.08)
      Tone.getTransport().start()
    } else {
      this.masterGain.gain.rampTo(0, 0.06)
      Tone.getTransport().pause()
      this.releaseAll()
    }
  }

  setDelay(amount: number) {
    this.delayAmount = amount
    this.delay.wet.rampTo(amount, 0.1)
    this.delay.feedback.rampTo(0.15 + amount * 0.55, 0.1)
  }

  setTempo(amount: number) {
    this.tempo = amount
    const bpm = 60 + amount * 100
    Tone.getTransport().bpm.rampTo(bpm, 0.15)
    const delayTime = amount < 0.33 ? '8n' : amount < 0.66 ? '4n.' : '4n'
    this.delay.delayTime.rampTo(delayTime, 0.15)
  }

  setScale(scale: ScaleId) {
    this.scale = scale
  }

  setMomentum(amount: number) {
    this.momentum = amount
  }

  getVelocityScale(): number {
    return 0.45 + this.momentum * 0.55
  }

  getRestitution(): number {
    return 0.94 + this.momentum * 0.05
  }

  playWallHit(
    instrument: InstrumentId,
    wall: Wall,
    normalizedY: number,
    impactSpeed: number,
  ) {
    if (!this.powered || !this.started) return

    const frequency = wallToFrequency(wall, normalizedY, this.scale, undefined, instrument)
    const speedFactor = Math.max(impactSpeed, 8) / 350
    const velocity = Math.max(0.28, Math.min(0.88, speedFactor * this.getVelocityScale() + 0.22))
    const duration = NOTE_DURATIONS[instrument]

    this.voices.get(instrument)?.trigger(frequency, velocity, duration)
  }

  releaseAll() {
    for (const voice of this.voices.values()) {
      voice.releaseAll()
    }
  }

  dispose() {
    this.releaseAll()
    for (const voice of this.voices.values()) voice.dispose()
    this.delay.dispose()
    this.masterGain.dispose()
  }
}

let engine: AudioEngine | null = null

export function getAudioEngine(): AudioEngine {
  if (!engine) engine = new AudioEngine()
  return engine
}
