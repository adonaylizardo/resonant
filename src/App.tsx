import { useCallback, useEffect, useRef, useState } from 'react'
import type { InstrumentId, ScaleId } from './audio/types'
import { getAudioEngine } from './audio/engine'
import { StageCanvas, type StageCanvasHandle } from './stage/StageCanvas'
import { Device } from './ui/Device'
import { BootScreen } from './ui/BootScreen'
import { ControlDeck } from './ui/ControlDeck'
import { EmptyHint } from './ui/EmptyHint'

export default function App() {
  const [powered, setPowered] = useState(false)
  const [hasThrown, setHasThrown] = useState(false)
  const [activeInstrument, setActiveInstrument] = useState<InstrumentId>('pulse')
  const [scale, setScale] = useState<ScaleId>('pentatonic')
  const [tempo, setTempo] = useState(0.5)
  const [delay, setDelay] = useState(0.35)
  const [momentum, setMomentum] = useState(0.65)

  const stageRef = useRef<StageCanvasHandle>(null)
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

    if (!next) {
      stageRef.current?.clearParticles()
      setHasThrown(false)
      engine.setPowered(false)
      setPowered(false)
    } else {
      engine.setPowered(true)
      setPowered(true)
    }
  }, [engine, powered])

  const handleFirstThrow = useCallback(() => {
    setHasThrown(true)
  }, [])

  return (
    <Device
      powered={powered}
      onPowerToggle={handlePowerToggle}
      screen={
        powered ? (
          <>
            <StageCanvas
              ref={stageRef}
              activeInstrument={activeInstrument}
              powered={powered}
              hasThrown={hasThrown}
              onFirstThrow={handleFirstThrow}
            />
            <EmptyHint visible={!hasThrown} />
          </>
        ) : (
          <BootScreen />
        )
      }
      deck={
        <ControlDeck
          powered={powered}
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
      }
    />
  )
}
