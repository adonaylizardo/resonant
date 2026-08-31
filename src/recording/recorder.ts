import { getAudioEngine } from '../audio/engine'
import { ExportCompositor } from './exportCompositor'
import { pickNativeMp4Mime, resolveMp4Backend } from './mp4Capabilities'
import { pickAudioMime } from './utils'
import { WebCodecsMp4Recorder } from './webCodecsMp4Recorder'

export const MP4_VIDEO_MIME = 'video/mp4'

export interface RecordingResult {
  videoBlob: Blob
  audioBlob: Blob
  videoMime: typeof MP4_VIDEO_MIME
  audioMime: string
  durationMs: number
}

const MAX_RECORD_MS = 60_000

export class StageRecorder {
  private backend: 'webcodecs' | 'mediarecorder' | null = null
  private webCodecsRecorder: WebCodecsMp4Recorder | null = null
  private videoRecorder: MediaRecorder | null = null
  private audioRecorder: MediaRecorder | null = null
  private exportCompositor: ExportCompositor | null = null
  private videoChunks: Blob[] = []
  private audioChunks: Blob[] = []
  private audioMime = pickAudioMime()
  private startedAt = 0
  private autoStopTimer: ReturnType<typeof setTimeout> | null = null
  private onAutoStop: (() => void) | null = null

  get isRecording(): boolean {
    if (this.backend === 'webcodecs') {
      return this.webCodecsRecorder?.isRecording ?? false
    }
    return this.videoRecorder?.state === 'recording'
  }

  getDurationMs(): number {
    if (!this.startedAt) return 0
    return Date.now() - this.startedAt
  }

  async start(stageCanvas: HTMLCanvasElement, onAutoStop: () => void): Promise<void> {
    if (this.isRecording) return

    await getAudioEngine().ensureStarted()

    this.onAutoStop = onAutoStop
    this.videoChunks = []
    this.audioChunks = []
    this.audioMime = pickAudioMime()
    this.startedAt = Date.now()

    this.exportCompositor = new ExportCompositor()
    await this.exportCompositor.start(stageCanvas)
    const exportCanvas = this.exportCompositor.getCanvas()

    const backend = await resolveMp4Backend()
    this.backend = backend

    const audioStream = getAudioEngine().getRecordingStream()

    if (backend === 'webcodecs') {
      this.webCodecsRecorder = new WebCodecsMp4Recorder()
      await this.webCodecsRecorder.start(exportCanvas, audioStream)
      this.startAudioOnlyRecorder(audioStream)
    } else {
      const nativeMime = pickNativeMp4Mime()
      if (!nativeMime) {
        throw new Error('Native MP4 recording is unavailable in this browser.')
      }

      const canvasStream = exportCanvas.captureStream(30)
      const combined = new MediaStream([
        ...canvasStream.getVideoTracks(),
        ...audioStream.getAudioTracks(),
      ])

      this.videoRecorder = new MediaRecorder(combined, { mimeType: nativeMime })
      this.videoRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) this.videoChunks.push(event.data)
      }
      this.videoRecorder.start(250)
      this.startAudioOnlyRecorder(audioStream)
    }

    this.autoStopTimer = setTimeout(() => {
      this.onAutoStop?.()
    }, MAX_RECORD_MS)
  }

  async stop(): Promise<RecordingResult | null> {
    if (!this.isRecording && !this.startedAt) {
      return null
    }

    if (this.autoStopTimer) {
      clearTimeout(this.autoStopTimer)
      this.autoStopTimer = null
    }

    const durationMs = this.getDurationMs()
    let videoBlob: Blob
    let audioBlob: Blob

    if (this.backend === 'webcodecs' && this.webCodecsRecorder) {
      videoBlob = await this.webCodecsRecorder.stop()
      audioBlob = this.audioRecorder
        ? await this.stopMediaRecorder(this.audioRecorder, this.audioChunks, this.audioMime)
        : new Blob([], { type: this.audioMime })
      this.webCodecsRecorder = null
    } else if (this.videoRecorder) {
      videoBlob = await this.stopMediaRecorder(this.videoRecorder, this.videoChunks, MP4_VIDEO_MIME)
      audioBlob = this.audioRecorder
        ? await this.stopMediaRecorder(this.audioRecorder, this.audioChunks, this.audioMime)
        : new Blob([], { type: this.audioMime })
    } else {
      return null
    }

    this.videoRecorder = null
    this.audioRecorder = null
    this.backend = null
    this.startedAt = 0
    this.exportCompositor?.stop()
    this.exportCompositor = null

    if (videoBlob.size === 0 && durationMs < 300) return null

    return {
      videoBlob,
      audioBlob,
      videoMime: MP4_VIDEO_MIME,
      audioMime: this.audioMime,
      durationMs,
    }
  }

  discard(): void {
    if (this.autoStopTimer) {
      clearTimeout(this.autoStopTimer)
      this.autoStopTimer = null
    }

    if (this.backend === 'webcodecs') {
      this.webCodecsRecorder?.discard()
      this.webCodecsRecorder = null
    }

    if (this.videoRecorder && this.videoRecorder.state !== 'inactive') {
      this.videoRecorder.stop()
    }
    if (this.audioRecorder && this.audioRecorder.state !== 'inactive') {
      this.audioRecorder.stop()
    }

    this.videoRecorder = null
    this.audioRecorder = null
    this.backend = null
    this.videoChunks = []
    this.audioChunks = []
    this.startedAt = 0
    this.exportCompositor?.stop()
    this.exportCompositor = null
  }

  private startAudioOnlyRecorder(audioStream: MediaStream): void {
    this.audioRecorder = new MediaRecorder(audioStream, { mimeType: this.audioMime })
    this.audioRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) this.audioChunks.push(event.data)
    }
    this.audioRecorder.start(250)
  }

  private stopMediaRecorder(
    recorder: MediaRecorder,
    chunks: Blob[],
    mime: string,
  ): Promise<Blob> {
    if (recorder.state === 'inactive') {
      return Promise.resolve(new Blob(chunks, { type: mime }))
    }

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
