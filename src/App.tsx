import { useCallback, useEffect, useRef, useState } from 'react'
import type { InstrumentId, ScaleId } from './audio/types'
import { getAudioEngine } from './audio/engine'
import { MAX_PARTICLES } from './stage/types'
import { StageCanvas, type StageCanvasHandle } from './stage/StageCanvas'
import { getStageRecorder, type RecordingResult } from './recording/recorder'
import { Device } from './ui/Device'
import { BootScreen } from './ui/BootScreen'
import { ControlDeck } from './ui/ControlDeck'
import { EmptyHint } from './ui/EmptyHint'
import { ParticleCounter } from './ui/ParticleCounter'
import { RecIndicator } from './ui/RecIndicator'
import { RecordModal } from './ui/RecordModal'

export default function App() {
  const [powered, setPowered] = useState(false)
  const [hasThrown, setHasThrown] = useState(false)
  const [particleCount, setParticleCount] = useState(0)
  const [recording, setRecording] = useState(false)
  const [recordingResult, setRecordingResult] = useState<RecordingResult | null>(null)
  const [activeInstrument, setActiveInstrument] = useState<InstrumentId>('piano')
  const [scale, setScale] = useState<ScaleId>('pentatonic')
  const [tempo, setTempo] = useState(0.5)
  const [delay, setDelay] = useState(0.35)
  const [momentum, setMomentum] = useState(0.65)

  const stageRef = useRef<StageCanvasHandle>(null)
  const engine = getAudioEngine()
  const stageRecorder = getStageRecorder()

  useEffect(() => {
    engine.setScale(scale)
  }, [scale, engine])

  const handleTempoChange = useCallback(
    (v: number) => {
      setTempo(v)
      engine.setTempo(v)
    },
    [engine],
  )

  const handleDelayChange = useCallback(
    (v: number) => {
      setDelay(v)
      engine.setDelay(v)
    },
    [engine],
  )

  const handleMomentumChange = useCallback(
    (v: number) => {
      setMomentum(v)
      engine.setMomentum(v)
    },
    [engine],
  )

  const finishRecording = useCallback(async () => {
    const result = await stageRecorder.stop()
    setRecording(false)
    if (result && result.durationMs >= 300) {
      setRecordingResult(result)
    }
  }, [stageRecorder])

  const handleRecordToggle = useCallback(async () => {
    if (recording) {
      await finishRecording()
      return
    }

    const canvas = stageRef.current?.getCanvas()
    if (!canvas || !powered) return

    await engine.ensureStarted()
    setRecordingResult(null)
    await stageRecorder.start(canvas, () => {
      void finishRecording()
    })
    setRecording(true)
  }, [recording, powered, engine, stageRecorder, finishRecording])

  const handlePowerToggle = useCallback(async () => {
    await engine.ensureStarted()
    const next = !powered

    if (!next) {
      if (recording) {
        const result = await stageRecorder.stop()
        setRecording(false)
        if (result && result.durationMs >= 300) {
          setRecordingResult(result)
        }
      }
      stageRef.current?.clearParticles()
      setHasThrown(false)
      setParticleCount(0)
      engine.setPowered(false)
      setPowered(false)
    } else {
      engine.setPowered(true)
      setPowered(true)
    }
  }, [engine, powered, recording, stageRecorder])

  const handleFirstThrow = useCallback(() => {
    setHasThrown(true)
  }, [])

  const handleParticleCountChange = useCallback((count: number) => {
    setParticleCount(count)
  }, [])

  const handleCloseModal = useCallback(() => {
    setRecordingResult(null)
  }, [])

  return (
    <>
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
              <RecIndicator visible={recording} />
              <EmptyHint visible={!hasThrown && !recording} />
            </>
          ) : (
            <BootScreen />
          )
        }
        deck={
          <ControlDeck
            powered={powered}
            recording={recording}
            onRecordToggle={handleRecordToggle}
            activeInstrument={activeInstrument}
            onInstrumentChange={setActiveInstrument}
            scale={scale}
            onScaleChange={setScale}
            tempo={tempo}
            onTempoChange={handleTempoChange}
            delay={delay}
            onDelayChange={handleDelayChange}
            momentum={momentum}
            onMomentumChange={handleMomentumChange}
          />
        }
      />
      {recordingResult && (
        <RecordModal result={recordingResult} onClose={handleCloseModal} />
      )}
    </>
  )
}
