import { ArrayBufferTarget, Muxer } from 'mp4-muxer'
import { computeVideoBitrate, evenDimension } from './mp4Capabilities'

const AUDIO_BITRATE = 128_000
const SAMPLE_RATE = 48_000
const CHANNELS = 2
const MAX_ENCODE_QUEUE = 12

export class WebCodecsMp4Recorder {
  private muxer: Muxer<ArrayBufferTarget> | null = null
  private videoEncoder: VideoEncoder | null = null
  private audioEncoder: AudioEncoder | null = null
  private videoReader: ReadableStreamDefaultReader<VideoFrame> | null = null
  private audioReader: ReadableStreamDefaultReader<AudioData> | null = null
  private videoTrack: MediaStreamTrack | null = null
  private audioTrack: MediaStreamTrack | null = null
  private canvasStream: MediaStream | null = null
  private recording = false
  private frameCount = 0
  private videoLoopPromise: Promise<void> | null = null
  private audioLoopPromise: Promise<void> | null = null

  get isRecording(): boolean {
    return this.recording
  }

  async start(canvas: HTMLCanvasElement, audioStream: MediaStream): Promise<void> {
    if (this.recording) return

    const width = evenDimension(canvas.width)
    const height = evenDimension(canvas.height)

    this.muxer = new Muxer({
      target: new ArrayBufferTarget(),
      video: { codec: 'avc', width, height },
      audio: { codec: 'aac', sampleRate: SAMPLE_RATE, numberOfChannels: CHANNELS },
      fastStart: 'in-memory',
    })

    this.videoEncoder = new VideoEncoder({
      output: (chunk, meta) => this.muxer!.addVideoChunk(chunk, meta),
      error: (error) => {
        console.error('VideoEncoder error', error)
      },
    })

    this.audioEncoder = new AudioEncoder({
      output: (chunk, meta) => this.muxer!.addAudioChunk(chunk, meta),
      error: (error) => {
        console.error('AudioEncoder error', error)
      },
    })

    this.videoEncoder.configure({
      codec: 'avc1.42001f',
      width,
      height,
      bitrate: computeVideoBitrate(width, height),
      framerate: 30,
    })

    this.audioEncoder.configure({
      codec: 'mp4a.40.2',
      sampleRate: SAMPLE_RATE,
      numberOfChannels: CHANNELS,
      bitrate: AUDIO_BITRATE,
    })

    this.canvasStream = canvas.captureStream(30)
    this.videoTrack = this.canvasStream.getVideoTracks()[0] ?? null
    this.audioTrack = audioStream.getAudioTracks()[0] ?? null

    if (!this.videoTrack) {
      throw new Error('Canvas video track unavailable for MP4 export.')
    }

    const videoProcessor = new MediaStreamTrackProcessor({ track: this.videoTrack })
    this.videoReader = videoProcessor.readable.getReader() as ReadableStreamDefaultReader<VideoFrame>
    this.recording = true
    this.frameCount = 0
    this.videoLoopPromise = this.pumpVideo()

    if (this.audioTrack) {
      const audioProcessor = new MediaStreamTrackProcessor({ track: this.audioTrack })
      this.audioReader = audioProcessor.readable.getReader() as unknown as ReadableStreamDefaultReader<AudioData>
      this.audioLoopPromise = this.pumpAudio()
    }
  }

  async stop(): Promise<Blob> {
    if (!this.recording || !this.videoEncoder || !this.muxer) {
      return new Blob([], { type: 'video/mp4' })
    }

    this.recording = false
    this.videoTrack?.stop()
    this.audioTrack?.stop()
    this.canvasStream?.getTracks().forEach((track) => track.stop())

    await Promise.allSettled([this.videoLoopPromise, this.audioLoopPromise])

    await this.videoEncoder.flush()
    if (this.audioEncoder) {
      await this.audioEncoder.flush()
    }
    this.muxer.finalize()

    const buffer = this.muxer.target.buffer
    this.cleanup()

    return new Blob([buffer], { type: 'video/mp4' })
  }

  discard(): void {
    this.recording = false
    this.videoTrack?.stop()
    this.audioTrack?.stop()
    this.canvasStream?.getTracks().forEach((track) => track.stop())
    void this.videoReader?.cancel()
    void this.audioReader?.cancel()
    this.cleanup()
  }

  private async pumpVideo(): Promise<void> {
    const encoder = this.videoEncoder
    const reader = this.videoReader
    if (!encoder || !reader) return

    try {
      while (this.recording) {
        const { value: frame, done } = await reader.read()
        if (done || !frame) break
        if (!this.recording) {
          frame.close()
          break
        }

        while (encoder.encodeQueueSize > MAX_ENCODE_QUEUE && this.recording) {
          await this.delay(8)
        }

        const keyFrame = this.frameCount % 60 === 0
        this.frameCount += 1
        encoder.encode(frame, { keyFrame })
        frame.close()
      }
    } catch (error) {
      if (this.recording) console.error('Video frame pump failed', error)
    }
  }

  private async pumpAudio(): Promise<void> {
    const encoder = this.audioEncoder
    const reader = this.audioReader
    if (!encoder || !reader) return

    try {
      while (this.recording) {
        const { value: audioData, done } = await reader.read()
        if (done || !audioData) break
        if (!this.recording) {
          audioData.close()
          break
        }

        while (encoder.encodeQueueSize > MAX_ENCODE_QUEUE && this.recording) {
          await this.delay(8)
        }

        encoder.encode(audioData)
        audioData.close()
      }
    } catch (error) {
      if (this.recording) console.error('Audio frame pump failed', error)
    }
  }

  private cleanup(): void {
    this.videoEncoder?.close()
    this.audioEncoder?.close()
    this.videoEncoder = null
    this.audioEncoder = null
    this.muxer = null
    this.videoReader = null
    this.audioReader = null
    this.videoTrack = null
    this.audioTrack = null
    this.canvasStream = null
    this.videoLoopPromise = null
    this.audioLoopPromise = null
    this.frameCount = 0
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }
}
