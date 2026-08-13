interface ParticleCounterProps {
  count: number
  max?: number
}

export function ParticleCounter({ count, max = 10 }: ParticleCounterProps) {
  return (
    <div className="particle-counter" aria-live="polite" aria-label={`${count} of ${max} particles`}>
      <span className="particle-counter__value">{String(count).padStart(2, '0')}</span>
      <span className="particle-counter__sep">/</span>
      <span className="particle-counter__max">{max}</span>
    </div>
  )
}
