import { useCallback, useRef } from 'react'

interface RotaryKnobProps {
  label: string
  value: number
  onChange: (v: number) => void
  readout?: string
  active?: boolean
}

const MIN_ANGLE = -135
const MAX_ANGLE = 135

export function RotaryKnob({ label, value, onChange, readout, active }: RotaryKnobProps) {
  const dragging = useRef(false)
  const startY = useRef(0)
  const startValue = useRef(0)
  const knobRef = useRef<HTMLDivElement>(null)

  const angle = MIN_ANGLE + value * (MAX_ANGLE - MIN_ANGLE)

  const clamp = (v: number) => Math.max(0, Math.min(1, v))

  const updateFromPointer = useCallback(
    (clientX: number, clientY: number, mode: 'drag' | 'polar') => {
      const el = knobRef.current
      if (!el) return

      if (mode === 'drag') {
        const dy = startY.current - clientY
        onChange(clamp(startValue.current + dy / 140))
        return
      }

      const rect = el.getBoundingClientRect()
      const cx = rect.left + rect.width / 2
      const cy = rect.top + rect.height / 2
      const rad = Math.atan2(clientY - cy, clientX - cx)
      let deg = (rad * 180) / Math.PI + 90
      if (deg > 180) deg -= 360
      const t = clamp((deg - MIN_ANGLE) / (MAX_ANGLE - MIN_ANGLE))
      onChange(t)
    },
    [onChange],
  )

  const onPointerDown = (e: React.PointerEvent) => {
    dragging.current = true
    startY.current = e.clientY
    startValue.current = value
    e.currentTarget.setPointerCapture(e.pointerId)
    updateFromPointer(e.clientX, e.clientY, 'polar')
  }

  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragging.current) return
    updateFromPointer(e.clientX, e.clientY, 'drag')
  }

  const onPointerUp = (e: React.PointerEvent) => {
    dragging.current = false
    e.currentTarget.releasePointerCapture(e.pointerId)
  }

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowUp' || e.key === 'ArrowRight') {
      e.preventDefault()
      onChange(clamp(value + 0.03))
    }
    if (e.key === 'ArrowDown' || e.key === 'ArrowLeft') {
      e.preventDefault()
      onChange(clamp(value - 0.03))
    }
  }

  return (
    <div className={`knob ${active ? 'knob--active' : ''}`}>
      <span className="knob__label">{label}</span>
      <div
        ref={knobRef}
        className="knob__housing"
        role="slider"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(value * 100)}
        aria-label={label}
        tabIndex={0}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onKeyDown={onKeyDown}
      >
        <div className="knob__ticks" aria-hidden="true" />
        <div className="knob__dial" style={{ transform: `rotate(${angle}deg)` }}>
          <span className="knob__pointer" />
        </div>
      </div>
      {readout !== undefined && <span className="knob__readout">{readout}</span>}
      {active !== undefined && (
        <span className={`knob__led ${active ? 'knob__led--on' : ''}`} aria-hidden="true" />
      )}
    </div>
  )
}
