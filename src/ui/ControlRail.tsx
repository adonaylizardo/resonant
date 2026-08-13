import type { InstrumentId, ScaleId } from '../audio/types'
import {
  INSTRUMENT_LABELS,
  SCALE_LABELS,
} from '../audio/types'

interface ControlRailProps {
  powered: boolean
  onPowerToggle: () => void
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

function SliderControl({
  label,
  value,
  onChange,
}: {
  label: string
  value: number
  onChange: (v: number) => void
}) {
  return (
    <label className="control control--slider">
      <span className="control__label">{label}</span>
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

export function ControlRail({
  powered,
  onPowerToggle,
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
}: ControlRailProps) {
  return (
    <footer className={`rail ${powered ? 'rail--live' : ''}`}>
      <button
        type="button"
        className={`rail__power ${powered ? 'rail__power--on' : ''}`}
        onClick={onPowerToggle}
        aria-pressed={powered}
        aria-label={powered ? 'Power off' : 'Power on'}
      >
        <span className="rail__power-dot" />
        <span>POWER</span>
      </button>

      <div className="rail__group" role="group" aria-label="Instruments">
        {INSTRUMENTS.map((id) => (
          <button
            key={id}
            type="button"
            className={`rail__instrument rail__instrument--${id} ${
              activeInstrument === id ? 'rail__instrument--active' : ''
            }`}
            onClick={() => onInstrumentChange(id)}
            aria-pressed={activeInstrument === id}
          >
            {INSTRUMENT_LABELS[id]}
          </button>
        ))}
      </div>

      <div className="rail__group" role="group" aria-label="Scale">
        {SCALES.map((id) => (
          <button
            key={id}
            type="button"
            className={`rail__chip ${scale === id ? 'rail__chip--active' : ''}`}
            onClick={() => onScaleChange(id)}
            aria-pressed={scale === id}
          >
            {SCALE_LABELS[id]}
          </button>
        ))}
      </div>

      <SliderControl label="TEMPO" value={tempo} onChange={onTempoChange} />
      <SliderControl label="DELAY" value={delay} onChange={onDelayChange} />
      <SliderControl label="MOMENTUM" value={momentum} onChange={onMomentumChange} />
    </footer>
  )
}
