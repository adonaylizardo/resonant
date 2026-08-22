import type { InstrumentId, ScaleId } from '../audio/types'
import {
  INSTRUMENT_IDS,
  INSTRUMENT_LABELS,
  SCALE_LABELS,
} from '../audio/types'
import { RotaryKnob } from './RotaryKnob'

interface ControlDeckProps {
  powered: boolean
  recording: boolean
  onRecordToggle: () => void
  activeInstrument: InstrumentId
  onInstrumentChange: (id: InstrumentId) => void
  scale: ScaleId
  onScaleChange: (id: ScaleId) => void
  tempo: number
  onTempoChange: (v: number) => void
  delay: number
  onDelayChange: (v: number) => void
  momentum: number
  onMomentumChange: (v: number) => void
}

const SCALES: ScaleId[] = ['pentatonic', 'major', 'minor']

function tempoReadout(value: number): number {
  return Math.round(60 + value * 100)
}

export function ControlDeck({
  powered,
  recording,
  onRecordToggle,
  activeInstrument,
  onInstrumentChange,
  scale,
  onScaleChange,
  tempo,
  onTempoChange,
  delay,
  onDelayChange,
  momentum,
  onMomentumChange,
}: ControlDeckProps) {
  return (
    <footer className={`deck ${powered ? 'deck--live' : ''}`}>
      <div className="deck__panel">
        <div className="deck__row deck__row--record">
          <button
            type="button"
            className={`deck__key deck__key--record ${recording ? 'deck__key--record-active' : ''}`}
            onClick={onRecordToggle}
            disabled={!powered}
            aria-pressed={recording}
            aria-label={recording ? 'Stop recording' : 'Start recording'}
          >
            <span className="deck__rec-housing">
              <span className={`deck__rec-jewel ${recording ? 'deck__rec-jewel--live' : ''}`} />
            </span>
            {recording ? 'STOP' : 'RECORD'}
          </button>
        </div>

        <div className="deck__row deck__row--instruments" role="group" aria-label="Instruments">
          {INSTRUMENT_IDS.map((id) => (
            <button
              key={id}
              type="button"
              className={`deck__key deck__key--instrument ${
                activeInstrument === id ? 'deck__key--pressed' : ''
              }`}
              onClick={() => onInstrumentChange(id)}
              aria-pressed={activeInstrument === id}
            >
              <span className={`deck__jewel deck__jewel--${id}`} />
              {INSTRUMENT_LABELS[id]}
            </button>
          ))}
        </div>

        <div className="deck__row deck__row--scales" role="group" aria-label="Scale">
          {SCALES.map((id) => (
            <button
              key={id}
              type="button"
              className={`deck__key deck__key--scale ${scale === id ? 'deck__key--pressed' : ''}`}
              onClick={() => onScaleChange(id)}
              aria-pressed={scale === id}
            >
              {SCALE_LABELS[id]}
            </button>
          ))}
        </div>

        <div className="deck__row deck__row--knobs">
          <RotaryKnob
            label="TEMPO"
            value={tempo}
            onChange={onTempoChange}
            formatReadout={(v) => String(tempoReadout(v))}
          />
          <RotaryKnob
            label="DELAY"
            value={delay}
            onChange={onDelayChange}
            activeAbove={0.08}
          />
          <RotaryKnob
            label="MOMENTUM"
            value={momentum}
            onChange={onMomentumChange}
            activeAbove={0.08}
          />
        </div>
      </div>
    </footer>
  )
}
