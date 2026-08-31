export type Mp4RecordingBackend = 'webcodecs' | 'mediarecorder'

const NATIVE_MP4_MIMES = [
  'video/mp4;codecs=h264,aac',
  'video/mp4;codecs=avc1,mp4a',
  'video/mp4',
]

export function pickNativeMp4Mime(): string | null {
  for (const mime of NATIVE_MP4_MIMES) {
    if (MediaRecorder.isTypeSupported(mime)) return mime
  }
  return null
}

/** WebKit (Safari, all iOS browsers) emits H.264+AAC MP4. Chromium video/mp4 is VP9-only. */
export function isWebKitMp4Browser(): boolean {
  const ua = navigator.userAgent
  if (/iPhone|iPad|iPod/i.test(ua)) return true
  return /Safari/i.test(ua) && !/Chrome|Chromium|Edg|OPR/i.test(ua)
}

async function supportsWebCodecsH264Video(): Promise<boolean> {
  if (typeof VideoEncoder === 'undefined') return false
  if (typeof MediaStreamTrackProcessor === 'undefined') return false

  const video = await VideoEncoder.isConfigSupported({
    codec: 'avc1.42001f',
    width: 640,
    height: 480,
    bitrate: 4_000_000,
  })
  return video.supported === true
}

async function supportsWebCodecsAacAudio(): Promise<boolean> {
  if (typeof AudioEncoder === 'undefined') return false

  const audio = await AudioEncoder.isConfigSupported({
    codec: 'mp4a.40.2',
    sampleRate: 48_000,
    numberOfChannels: 2,
    bitrate: 128_000,
  })
  return audio.supported === true
}

async function supportsWebCodecsMp4(): Promise<boolean> {
  return (await supportsWebCodecsH264Video()) && (await supportsWebCodecsAacAudio())
}

function supportsWebKitNativeMp4(): boolean {
  return isWebKitMp4Browser() && pickNativeMp4Mime() !== null
}

let backendPromise: Promise<Mp4RecordingBackend> | null = null

/** Desktop Chrome: WebCodecs H.264+AAC. Safari/iOS: native MediaRecorder MP4. */
export function resolveMp4Backend(): Promise<Mp4RecordingBackend> {
  if (!backendPromise) {
    backendPromise = (async () => {
      if (await supportsWebCodecsMp4()) return 'webcodecs'
      if (supportsWebKitNativeMp4()) return 'mediarecorder'
      throw new Error('This browser cannot export iPhone-compatible MP4 recordings.')
    })()
  }
  return backendPromise
}

export function evenDimension(value: number): number {
  const rounded = Math.max(2, Math.round(value))
  return rounded % 2 === 0 ? rounded : rounded - 1
}
