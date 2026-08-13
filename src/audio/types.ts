export type InstrumentId = 'piano' | 'harp' | 'marimba' | 'beat'

export type ScaleId = 'major' | 'minor' | 'pentatonic'

export const INSTRUMENT_IDS: InstrumentId[] = ['piano', 'harp', 'marimba', 'beat']

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
  piano: 'var(--piano)',
  harp: 'var(--harp)',
  marimba: 'var(--marimba)',
  beat: 'var(--beat)',
}

export const INSTRUMENT_LABELS: Record<InstrumentId, string> = {
  piano: 'PIANO',
  harp: 'HARP',
  marimba: 'MARIMBA',
  beat: 'BEAT',
}

export const SCALE_LABELS: Record<ScaleId, string> = {
  major: 'MAJOR',
  minor: 'MINOR',
  pentatonic: 'PENTA',
}
