import { getAudioEngine } from '../audio/engine'
import { pickAudioMime, pickVideoMime } from './utils'

export interface RecordingResult {
  videoBlob: Blob
  audioBlob: Blob
  videoMime: string
  audioMime: string
  durationMs: number
}

const MAX_RECORD_MS = 60_000

export class StageRecorder {
  private videoRecorder: MediaRecorder | null = null
  private audioRecorder: MediaRecorder | null = null
  private videoChunks: Blob[] = []
  private audioChunks: Blob[] = []
  private videoMime = pickVideoMime()
  private audioMime = pickAudioMime()
  private startedAt = 0
  private autoStopTimer: ReturnType<typeof setTimeout> | null = null
  private onAutoStop: (() => void) | null = null

  get isRecording(): boolean {
    return this.videoRecorder?.state === 'recording'
  }

  getDurationMs(): number {
    if (!this.startedAt) return 0
    return Date.now() - this.startedAt
  }

  async start(canvas: HTMLCanvasElement, onAutoStop: () => void): Promise<void> {
    if (this.isRecording) return

    await getAudioEngine().ensureStarted()

    this.onAutoStop = onAutoStop
    this.videoChunks = []
    this.audioChunks = []
    this.videoMime = pickVideoMime()
    this.audioMime = pickAudioMime()

    const canvasStream = canvas.captureStream(30)
    const audioStream = getAudioEngine().getRecordingStream()

    const combined = new MediaStream([
      ...canvasStream.getVideoTracks(),
      ...audioStream.getAudioTracks(),
    ])

    this.videoRecorder = new MediaRecorder(combined, { mimeType: this.videoMime })
    this.audioRecorder = new MediaRecorder(audioStream, { mimeType: this.audioMime })

    this.videoRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) this.videoChunks.push(e.data)
    }
    this.audioRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) this.audioChunks.push(e.data)
    }

    this.videoRecorder.start(250)
    this.audioRecorder.start(250)
    this.startedAt = Date.now()

    this.autoStopTimer = setTimeout(() => {
      this.onAutoStop?.()
    }, MAX_RECORD_MS)
  }

  async stop(): Promise<RecordingResult | null> {
    if (!this.videoRecorder || this.videoRecorder.state === 'inactive') {
      return null
    }

    if (this.autoStopTimer) {
      clearTimeout(this.autoStopTimer)
      this.autoStopTimer = null
    }

    const durationMs = this.getDurationMs()

    const videoBlob = await this.stopRecorder(this.videoRecorder, this.videoChunks, this.videoMime)
    const audioBlob = this.audioRecorder
      ? await this.stopRecorder(this.audioRecorder, this.audioChunks, this.audioMime)
      : new Blob([], { type: this.audioMime })

    this.videoRecorder = null
    this.audioRecorder = null
    this.startedAt = 0

    if (videoBlob.size === 0 && durationMs < 300) return null

    return {
      videoBlob,
      audioBlob,
      videoMime: this.videoMime,
      audioMime: this.audioMime,
      durationMs,
    }
  }

  discard(): void {
    if (this.autoStopTimer) {
      clearTimeout(this.autoStopTimer)
      this.autoStopTimer = null
    }
    if (this.videoRecorder && this.videoRecorder.state !== 'inactive') {
      this.videoRecorder.stop()
    }
    if (this.audioRecorder && this.audioRecorder.state !== 'inactive') {
      this.audioRecorder.stop()
    }
    this.videoRecorder = null
    this.audioRecorder = null
    this.videoChunks = []
    this.audioChunks = []
    this.startedAt = 0
  }

  private stopRecorder(
    recorder: MediaRecorder,
    chunks: Blob[],
    mime: string,
  ): Promise<Blob> {
    return new Promise((resolve) => {
      recorder.addEventListener(
        'stop',
        () => {
          resolve(new Blob(chunks, { type: mime }))
        },
        { once: true },
      )
      recorder.stop()
    })
  }
}

let recorder: StageRecorder | null = null

export function getStageRecorder(): StageRecorder {
  if (!recorder) recorder = new StageRecorder()
  return recorder
}
