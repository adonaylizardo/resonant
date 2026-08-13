import type { ReactNode } from 'react'

interface DeviceProps {
  powered: boolean
  onPowerToggle: () => void
  screen: ReactNode
  deck: ReactNode
}

export function Device({ powered, onPowerToggle, screen, deck }: DeviceProps) {
  return (
    <div className="page">
      <div className="device">
        <header className="device__top">
          <h1 className="device__mark">RESONANT</h1>
          <button
            type="button"
            className={`device__power ${powered ? 'device__power--on' : ''}`}
            onClick={onPowerToggle}
            aria-pressed={powered}
            aria-label={powered ? 'Power off' : 'Power on'}
          >
            <span className="device__power-led" />
            <span>PWR</span>
          </button>
        </header>

        <div className={`device__screen ${powered ? 'device__screen--live' : ''}`}>
          {screen}
        </div>

        {deck}
      </div>
    </div>
  )
}
