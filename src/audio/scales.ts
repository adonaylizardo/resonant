import type { InstrumentId, ScaleId } from './types'

/** Default tonic: D4 */
export const TONIC = 'D4'

const SCALE_INTERVALS: Record<ScaleId, number[]> = {
  major: [0, 2, 4, 5, 7, 9, 11],
  minor: [0, 2, 3, 5, 7, 8, 10],
  pentatonic: [0, 2, 4, 7, 9],
}

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']

function parseNote(note: string): { pitchClass: number; octave: number } {
  const match = note.match(/^([A-G]#?)(\d+)$/)
  if (!match) throw new Error(`Invalid note: ${note}`)
  const pitchClass = NOTE_NAMES.indexOf(match[1])
  return { pitchClass, octave: parseInt(match[2], 10) }
}

function noteToFrequency(pitchClass: number, octave: number): number {
  const midi = (octave + 1) * 12 + pitchClass
  return 440 * Math.pow(2, (midi - 69) / 12)
}

/** Build scale frequencies across a comfortable range (octaves 3–5). */
export function buildScaleFrequencies(scale: ScaleId, tonic = TONIC): number[] {
  const { pitchClass: tonicPc, octave: tonicOct } = parseNote(tonic)
  const intervals = SCALE_INTERVALS[scale]
  const freqs: number[] = []

  for (let oct = tonicOct - 1; oct <= tonicOct + 1; oct++) {
    for (const interval of intervals) {
      const pc = (tonicPc + interval) % 12
      const octaveOffset = Math.floor((tonicPc + interval) / 12)
      freqs.push(noteToFrequency(pc, oct + octaveOffset))
    }
  }

  return [...new Set(freqs.map((f) => Math.round(f * 100) / 100))].sort((a, b) => a - b)
}

/**
 * Map normalized Y (0 = top, 1 = bottom) to a scale degree.
 * Higher on screen = higher pitch.
 */
export function yToFrequency(
  normalizedY: number,
  scale: ScaleId,
  tonic = TONIC,
): number {
  const freqs = buildScaleFrequencies(scale, tonic)
  const clamped = Math.max(0, Math.min(1, 1 - normalizedY))
  const index = Math.round(clamped * (freqs.length - 1))
  return freqs[index]
}

/** Map wall side to a slight pitch offset within scale. */
export function wallToFrequency(
  wall: 'top' | 'bottom' | 'left' | 'right',
  normalizedY: number,
  scale: ScaleId,
  tonic = TONIC,
  instrument?: InstrumentId,
): number {
  const freqs = buildScaleFrequencies(scale, tonic)
  const base = yToFrequency(normalizedY, scale, tonic)
  const baseIndex = freqs.findIndex((f) => f >= base) || 0
  const offsets: Record<typeof wall, number> = {
    top: 2,
    bottom: -1,
    left: 0,
    right: 1,
  }
  let idx = Math.max(0, Math.min(freqs.length - 1, baseIndex + offsets[wall]))

  if (instrument === 'piano') {
    const midStart = Math.floor(freqs.length * 0.25)
    const midEnd = Math.ceil(freqs.length * 0.75)
    idx = Math.max(midStart, Math.min(midEnd, idx))
    return freqs[idx]
  }

  return freqs[idx]
}
