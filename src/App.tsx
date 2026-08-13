import { useCallback, useEffect, useRef, useState } from 'react'
import type { InstrumentId, ScaleId } from './audio/types'
import { getAudioEngine } from './audio/engine'
import { MAX_PARTICLES } from './stage/types'
import { StageCanvas, type StageCanvasHandle } from './stage/StageCanvas'
import { Device } from './ui/Device'
import { BootScreen } from './ui/BootScreen'
import { ControlDeck } from './ui/ControlDeck'
import { EmptyHint } from './ui/EmptyHint'
import { ParticleCounter } from './ui/ParticleCounter'

export default function App() {
  const [powered, setPowered] = useState(false)
  const [hasThrown, setHasThrown] = useState(false)
  const [particleCount, setParticleCount] = useState(0)
  const [activeInstrument, setActiveInstrument] = useState<InstrumentId>('piano')
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
      setParticleCount(0)
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

  const handleParticleCountChange = useCallback((count: number) => {
    setParticleCount(count)
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
              onParticleCountChange={handleParticleCountChange}
            />
            <ParticleCounter count={particleCount} max={MAX_PARTICLES} />
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
