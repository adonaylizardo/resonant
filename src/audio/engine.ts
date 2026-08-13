import * as Tone from 'tone'
import type { InstrumentId, ScaleId } from './types'
import { wallToFrequency } from './scales'

type Wall = 'top' | 'bottom' | 'left' | 'right'

class InstrumentVoice {
  private synth: Tone.PolySynth | Tone.MetalSynth | Tone.PluckSynth
  private output: Tone.Gain

  constructor(id: InstrumentId) {
    this.output = new Tone.Gain(0.85)

    switch (id) {
      case 'pulse':
        this.synth = new Tone.PolySynth(Tone.Synth, {
          oscillator: { type: 'sine' },
          envelope: { attack: 0.02, decay: 0.35, sustain: 0.08, release: 0.4 },
        })
        break
      case 'glass':
        this.synth = new Tone.MetalSynth({
          harmonicity: 5.1,
          modulationIndex: 32,
          resonance: 4000,
          octaves: 1.5,
          envelope: { attack: 0.001, decay: 0.8, release: 1.2 },
        })
        break
      case 'drift':
        this.synth = new Tone.PluckSynth({
          attackNoise: 0.4,
          dampening: 2400,
          resonance: 0.92,
        })
        break
    }

    this.synth.connect(this.output)
  }

  connect(destination: Tone.InputNode) {
    this.output.connect(destination)
  }

  trigger(frequency: number, velocity: number, duration: string) {
    const v = Math.max(0.08, Math.min(0.95, velocity))
    if (this.synth instanceof Tone.PolySynth) {
      this.synth.triggerAttackRelease(frequency, duration, undefined, v * 0.7)
    } else if (this.synth instanceof Tone.MetalSynth) {
      this.synth.triggerAttackRelease(frequency, duration, undefined, v * 0.5)
    } else if (this.synth instanceof Tone.PluckSynth) {
      this.output.gain.setValueAtTime(v * 0.8, Tone.now())
      this.synth.triggerAttack(frequency)
    }
  }

  releaseAll() {
    if (this.synth instanceof Tone.PolySynth) {
      this.synth.releaseAll()
    }
  }

  dispose() {
    this.synth.dispose()
    this.output.dispose()
  }
}

export class AudioEngine {
  private voices: Map<InstrumentId, InstrumentVoice> = new Map()
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
      feedback: 0.35,
      wet: 0.35,
    })
    this.delay.connect(this.masterGain)

    for (const id of ['pulse', 'glass', 'drift'] as InstrumentId[]) {
      const voice = new InstrumentVoice(id)
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
    this.delay.feedback.rampTo(amount * 0.65, 0.1)
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
    return 0.35 + this.momentum * 0.65
  }

  getRestitution(): number {
    return 0.55 + this.momentum * 0.4
  }

  playWallHit(
    instrument: InstrumentId,
    wall: Wall,
    normalizedY: number,
    impactSpeed: number,
  ) {
    if (!this.powered || !this.started) return

    const frequency = wallToFrequency(wall, normalizedY, this.scale)
    const velocity = Math.min(1, (impactSpeed / 800) * this.getVelocityScale() + 0.15)
    const duration = instrument === 'drift' ? '2n' : instrument === 'glass' ? '8n' : '16n'

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
