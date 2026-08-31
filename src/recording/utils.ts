export { evenDimension, pickNativeMp4Mime, resolveMp4Backend } from './mp4Capabilities'
export { MP4_VIDEO_MIME } from './recorder'

export function pickAudioMime(): string {
  const candidates = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg']
  for (const mime of candidates) {
    if (MediaRecorder.isTypeSupported(mime)) return mime
  }
  return 'audio/webm'
}

export function extensionForMime(mime: string): string {
  if (mime.includes('wav')) return 'wav'
  if (mime.includes('mp4')) return 'mp4'
  if (mime.includes('ogg')) return 'ogg'
  return 'webm'
}

export function recordingFilename(prefix: string, mime: string): string {
  const date = new Date().toISOString().slice(0, 10)
  return `${prefix}-${date}.${extensionForMime(mime)}`
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  URL.revokeObjectURL(url)
}

export async function shareVideoFile(blob: Blob, filename: string): Promise<'shared' | 'downloaded'> {
  const file = new File([blob], filename, { type: 'video/mp4' })
  if (navigator.canShare?.({ files: [file] })) {
    await navigator.share({
      files: [file],
      title: 'RESONANT',
      text: 'Throw light. Catch sound.',
    })
    return 'shared'
  }
  downloadBlob(blob, filename)
  return 'downloaded'
}
