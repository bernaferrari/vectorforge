import { useRef } from "react"

export const useCanvasRecorder = () => {
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const recordedChunksRef = useRef<Blob[]>([])

  const startRecording = (canvas: HTMLCanvasElement | null) => {
    if (!canvas) return

    recordedChunksRef.current = []
    const stream = canvas.captureStream(60)
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
    recorder.start()
  }

  const stopRecording = (callback: (blob: Blob) => void) => {
    const recorder = mediaRecorderRef.current
    if (!recorder) return

    recorder.onstop = () => {
      callback(
        new Blob(recordedChunksRef.current, {
          type: "video/webm",
        })
      )
    }

    recorder.stop()
    mediaRecorderRef.current = null
  }

  return { startRecording, stopRecording }
}
