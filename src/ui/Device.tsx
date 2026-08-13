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
        <span className="device__screw device__screw--tl" aria-hidden="true" />
        <span className="device__screw device__screw--tr" aria-hidden="true" />
        <span className="device__screw device__screw--bl" aria-hidden="true" />
        <span className="device__screw device__screw--br" aria-hidden="true" />

        <header className="device__top">
          <h1 className="device__mark">RESONANT</h1>
          <button
            type="button"
            className={`device__power ${powered ? 'device__power--on' : ''}`}
            onClick={onPowerToggle}
            aria-pressed={powered}
            aria-label={powered ? 'Power off' : 'Power on'}
          >
            <span className="device__power-housing">
              <span className="device__power-led" />
            </span>
            <span>PWR</span>
          </button>
        </header>

        <div className="device__screen-well">
          <div className="device__grille" aria-hidden="true" />
          <div className={`device__screen-bezel ${powered ? 'device__screen-bezel--live' : ''}`}>
            <div className={`device__screen ${powered ? 'device__screen--live' : ''}`}>
              <div className="device__screen-glass" aria-hidden="true" />
              {screen}
            </div>
          </div>
        </div>

        {deck}
      </div>
    </div>
  )
}
