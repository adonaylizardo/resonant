import type { InstrumentId, ScaleId } from '../audio/types'
import {
  INSTRUMENT_LABELS,
  SCALE_LABELS,
} from '../audio/types'

interface ControlDeckProps {
  powered: boolean
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

const INSTRUMENTS: InstrumentId[] = ['pulse', 'glass', 'drift']
const SCALES: ScaleId[] = ['pentatonic', 'major', 'minor']

function tempoReadout(value: number): number {
  return Math.round(60 + value * 100)
}

function SliderControl({
  label,
  value,
  onChange,
  readout,
  active,
}: {
  label: string
  value: number
  onChange: (v: number) => void
  readout?: string
  active?: boolean
}) {
  return (
    <label className={`deck__slider ${active ? 'deck__slider--active' : ''}`}>
      <span className="deck__slider-head">
        <span className="deck__label">{label}</span>
        {readout !== undefined && <span className="deck__readout">{readout}</span>}
        {active !== undefined && (
          <span className={`deck__status-dot ${active ? 'deck__status-dot--on' : ''}`} />
        )}
      </span>
      <input
        type="range"
        min={0}
        max={1}
        step={0.01}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
      />
    </label>
  )
}

export function ControlDeck({
  powered,
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
      <div className="deck__row deck__row--instruments" role="group" aria-label="Instruments">
        {INSTRUMENTS.map((id) => (
          <button
            key={id}
            type="button"
            className={`deck__btn deck__btn--instrument ${
              activeInstrument === id ? 'deck__btn--active' : ''
            }`}
            onClick={() => onInstrumentChange(id)}
            aria-pressed={activeInstrument === id}
          >
            <span className={`deck__dot deck__dot--${id}`} />
            {INSTRUMENT_LABELS[id]}
          </button>
        ))}
      </div>

      <div className="deck__row deck__row--scales" role="group" aria-label="Scale">
        {SCALES.map((id) => (
          <button
            key={id}
            type="button"
            className={`deck__btn deck__btn--chip ${scale === id ? 'deck__btn--active' : ''}`}
            onClick={() => onScaleChange(id)}
            aria-pressed={scale === id}
          >
            {SCALE_LABELS[id]}
          </button>
        ))}
      </div>

      <div className="deck__row deck__row--sliders">
        <SliderControl
          label="TEMPO"
          value={tempo}
          onChange={onTempoChange}
          readout={String(tempoReadout(tempo))}
        />
        <SliderControl
          label="DELAY"
          value={delay}
          onChange={onDelayChange}
          active={delay > 0.08}
        />
        <SliderControl
          label="MOMENTUM"
          value={momentum}
          onChange={onMomentumChange}
          active={momentum > 0.08}
        />
      </div>
    </footer>
  )
}
