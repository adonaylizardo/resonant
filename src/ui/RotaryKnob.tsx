import { useCallback, useEffect, useRef, useState } from 'react'

interface RotaryKnobProps {
  label: string
  value: number
  onChange: (v: number) => void
  readout?: string
  formatReadout?: (value: number) => string
  active?: boolean
  /** When set, LED follows local drag value above this threshold. */
  activeAbove?: number
}

const MIN_ANGLE = -135
const MAX_ANGLE = 135
/** Throttle parent commits while dragging — keeps audio/UI in sync without flooding React. */
const COMMIT_INTERVAL_MS = 48

export function RotaryKnob({
  label,
  value,
  onChange,
  readout,
  formatReadout,
  active,
  activeAbove,
}: RotaryKnobProps) {
  const dragging = useRef(false)
  const startY = useRef(0)
  const startValue = useRef(0)
  const knobRef = useRef<HTMLDivElement>(null)
  const pendingValue = useRef(value)
  const lastCommitAt = useRef(0)
  const [displayValue, setDisplayValue] = useState(value)

  useEffect(() => {
    if (!dragging.current) {
      pendingValue.current = value
      setDisplayValue(value)
    }
  }, [value])

  const angle = MIN_ANGLE + displayValue * (MAX_ANGLE - MIN_ANGLE)

  const clamp = (v: number) => Math.max(0, Math.min(1, v))

  const commitValue = useCallback(
    (next: number, force = false) => {
      const clamped = clamp(next)
      pendingValue.current = clamped
      setDisplayValue(clamped)

      const now = performance.now()
      if (force || now - lastCommitAt.current >= COMMIT_INTERVAL_MS) {
        lastCommitAt.current = now
        onChange(clamped)
      }
    },
    [onChange],
  )

  const updateFromPointer = useCallback(
    (clientX: number, clientY: number, mode: 'drag' | 'polar') => {
      const el = knobRef.current
      if (!el) return

      if (mode === 'drag') {
        const dy = startY.current - clientY
        commitValue(startValue.current + dy / 140)
        return
      }

      const rect = el.getBoundingClientRect()
      const cx = rect.left + rect.width / 2
      const cy = rect.top + rect.height / 2
      const rad = Math.atan2(clientY - cy, clientX - cx)
      let deg = (rad * 180) / Math.PI + 90
      if (deg > 180) deg -= 360
      const t = clamp((deg - MIN_ANGLE) / (MAX_ANGLE - MIN_ANGLE))
      commitValue(t)
    },
    [commitValue],
  )

  const onPointerDown = (e: React.PointerEvent) => {
    dragging.current = true
    startY.current = e.clientY
    startValue.current = pendingValue.current
    e.currentTarget.setPointerCapture(e.pointerId)
    updateFromPointer(e.clientX, e.clientY, 'polar')
  }

  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragging.current) return
    updateFromPointer(e.clientX, e.clientY, 'drag')
  }

  const endDrag = (e: React.PointerEvent) => {
    if (!dragging.current) return
    dragging.current = false
    commitValue(pendingValue.current, true)
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId)
    }
  }

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowUp' || e.key === 'ArrowRight') {
      e.preventDefault()
      commitValue(displayValue + 0.03, true)
    }
    if (e.key === 'ArrowDown' || e.key === 'ArrowLeft') {
      e.preventDefault()
      commitValue(displayValue - 0.03, true)
    }
  }

  const ledOn = activeAbove !== undefined ? displayValue > activeAbove : active

  return (
    <div className={`knob ${ledOn ? 'knob--active' : ''}`}>
      <div
        ref={knobRef}
        className="knob__housing"
        role="slider"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(displayValue * 100)}
        aria-label={label}
        tabIndex={0}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onKeyDown={onKeyDown}
      >
        <div className="knob__ticks" aria-hidden="true" />
        <div className="knob__dial" style={{ transform: `rotate(${angle}deg)` }}>
          <span className="knob__pointer" />
        </div>
      </div>
      <span className="knob__label">{label}</span>
      {(readout !== undefined || formatReadout) && (
        <span className="knob__readout">
          {formatReadout ? formatReadout(displayValue) : readout}
        </span>
      )}
      {(active !== undefined || activeAbove !== undefined) && (
        <span className={`knob__led ${ledOn ? 'knob__led--on' : ''}`} aria-hidden="true" />
      )}
    </div>
  )
}
