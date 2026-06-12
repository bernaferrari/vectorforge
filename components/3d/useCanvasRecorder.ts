import { useRef } from "react"

export type CanvasRecorderOptions = {
  frameRate?: number
  manualFrames?: boolean
}

type CanvasVideoTrack = MediaStreamTrack & {
  requestFrame?: () => void
}

export const useCanvasRecorder = () => {
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const recordedChunksRef = useRef<Blob[]>([])
  const streamRef = useRef<MediaStream | null>(null)
  const canvasTrackRef = useRef<CanvasVideoTrack | null>(null)

  const startRecording = (
    canvas: HTMLCanvasElement | null,
    { frameRate = 30, manualFrames = false }: CanvasRecorderOptions = {}
  ) => {
    if (!canvas) return

    recordedChunksRef.current = []
    const createStream = (requestedFrameRate: number) =>
      canvas.captureStream(requestedFrameRate)
    let stream = createStream(manualFrames ? 0 : frameRate)
    let canvasTrack = stream.getVideoTracks()[0] as CanvasVideoTrack | undefined

    if (manualFrames && !canvasTrack?.requestFrame) {
      stream.getTracks().forEach((track) => track.stop())
      stream = createStream(frameRate)
      canvasTrack = stream.getVideoTracks()[0] as CanvasVideoTrack | undefined
    }

    const options = { mimeType: "video/webm;codecs=vp9" }
    let recorder: MediaRecorder

    try {
      recorder = new MediaRecorder(stream, options)
    } catch {
      recorder = new MediaRecorder(stream)
    }

    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        recordedChunksRef.current.push(event.data)
      }
    }

    mediaRecorderRef.current = recorder
    streamRef.current = stream
    canvasTrackRef.current = canvasTrack ?? null
    recorder.start(250)
  }

  const requestFrame = () => {
    canvasTrackRef.current?.requestFrame?.()
  }

  const stopRecording = (callback: (blob: Blob) => void) => {
    const recorder = mediaRecorderRef.current
    if (!recorder) return

    recorder.onstop = () => {
      streamRef.current?.getTracks().forEach((track) => track.stop())
      streamRef.current = null
      canvasTrackRef.current = null
      callback(
        new Blob(recordedChunksRef.current, {
          type: "video/webm",
        })
      )
    }

    recorder.stop()
    mediaRecorderRef.current = null
  }

  return { requestFrame, startRecording, stopRecording }
}
