import { useEffect, useRef } from 'react'
import type { RecordingResult } from '../recording/recorder'
import { downloadBlob, recordingFilename, shareVideoFile } from '../recording/utils'

interface RecordModalProps {
  result: RecordingResult
  onClose: () => void
}

export function RecordModal({ result, onClose }: RecordModalProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const videoUrlRef = useRef<string | null>(null)

  useEffect(() => {
    const url = URL.createObjectURL(result.videoBlob)
    videoUrlRef.current = url
    if (videoRef.current) {
      videoRef.current.src = url
    }
    return () => {
      if (videoUrlRef.current) URL.revokeObjectURL(videoUrlRef.current)
    }
  }, [result.videoBlob])

  const videoName = recordingFilename('resonant', result.videoMime)
  const audioName = recordingFilename('resonant-audio', result.audioMime)

  const handleShare = async () => {
    await shareVideoFile(result.videoBlob, result.videoMime, videoName)
  }

  const handleDownloadVideo = () => {
    downloadBlob(result.videoBlob, videoName)
  }

  const handleDownloadAudio = () => {
    downloadBlob(result.audioBlob, audioName)
  }

  return (
    <div className="record-modal-backdrop" role="presentation" onClick={onClose}>
      <div
        className="record-modal"
        role="dialog"
        aria-labelledby="record-modal-title"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          className="record-modal__close"
          onClick={onClose}
          aria-label="Close"
        >
          ×
        </button>

        <h2 id="record-modal-title" className="record-modal__title">
          TAKE READY
        </h2>

        <div className="record-modal__preview">
          <video ref={videoRef} controls playsInline className="record-modal__video" />
        </div>

        <div className="record-modal__actions">
          <button type="button" className="record-modal__btn record-modal__btn--primary" onClick={handleShare}>
            SHARE
          </button>
          <div className="record-modal__secondary">
            <button type="button" className="record-modal__btn" onClick={handleDownloadVideo}>
              DOWNLOAD VIDEO
            </button>
            <button type="button" className="record-modal__btn" onClick={handleDownloadAudio}>
              DOWNLOAD AUDIO
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
