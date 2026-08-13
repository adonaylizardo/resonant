export type InstrumentId = 'pulse' | 'glass' | 'drift'

export type ScaleId = 'major' | 'minor' | 'pentatonic'

export interface AudioSettings {
  scale: ScaleId
  tempo: number
  delay: number
  momentum: number
  powered: boolean
}

export interface NoteEvent {
  instrument: InstrumentId
  frequency: number
  velocity: number
}

export const INSTRUMENT_COLORS: Record<InstrumentId, string> = {
  pulse: 'var(--pulse)',
  glass: 'var(--glass)',
  drift: 'var(--drift)',
}

export const INSTRUMENT_LABELS: Record<InstrumentId, string> = {
  pulse: 'PULSE',
  glass: 'GLASS',
  drift: 'DRIFT',
}

export const SCALE_LABELS: Record<ScaleId, string> = {
  major: 'MAJOR',
  minor: 'MINOR',
  pentatonic: 'PENTA',
}
