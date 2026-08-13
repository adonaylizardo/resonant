import { useCallback, useEffect, useState } from 'react'
import type { InstrumentId, ScaleId } from './audio/types'
import { getAudioEngine } from './audio/engine'
import { StageCanvas } from './stage/StageCanvas'
import { Header } from './ui/Header'
import { ControlRail } from './ui/ControlRail'
import { EmptyHint } from './ui/EmptyHint'

export default function App() {
  const [powered, setPowered] = useState(false)
  const [hasThrown, setHasThrown] = useState(false)
  const [activeInstrument, setActiveInstrument] = useState<InstrumentId>('pulse')
  const [scale, setScale] = useState<ScaleId>('pentatonic')
  const [tempo, setTempo] = useState(0.5)
  const [delay, setDelay] = useState(0.35)
  const [momentum, setMomentum] = useState(0.65)

  const engine = getAudioEngine()

  useEffect(() => {
    engine.setScale(scale)
  }, [scale, engine])

  useEffect(() => {
    engine.setTempo(tempo)
  }, [tempo, engine])

  useEffect(() => {
    engine.setDelay(delay)
  }, [delay, engine])

  useEffect(() => {
    engine.setMomentum(momentum)
  }, [momentum, engine])

  const handlePowerToggle = useCallback(async () => {
    await engine.ensureStarted()
    const next = !powered
    setPowered(next)
    engine.setPowered(next)
  }, [engine, powered])

  const handlePowerOn = useCallback(async () => {
    await engine.ensureStarted()
    setPowered(true)
    engine.setPowered(true)
  }, [engine])

  const handleFirstThrow = useCallback(() => {
    setHasThrown(true)
  }, [])

  return (
    <div className="app">
      <Header />
      <div className="stage-wrap">
        <StageCanvas
          activeInstrument={activeInstrument}
          powered={powered}
          hasThrown={hasThrown}
          onFirstThrow={handleFirstThrow}
          onPowerOn={handlePowerOn}
        />
        <EmptyHint visible={!hasThrown} />
      </div>
      <ControlRail
        powered={powered}
        onPowerToggle={handlePowerToggle}
        activeInstrument={activeInstrument}
        onInstrumentChange={setActiveInstrument}
        scale={scale}
        onScaleChange={setScale}
        tempo={tempo}
        onTempoChange={setTempo}
        delay={delay}
        onDelayChange={setDelay}
        momentum={momentum}
        onMomentumChange={setMomentum}
      />
    </div>
  )
}
