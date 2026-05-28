import { RefObject, useRef } from "react"
import type { SvgCanvasRef } from "../3d/SvgCanvas"

const downloadVideoBlob = (blob: Blob) => {
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = "vectorforge-timeline.webm"
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export const useVideoExport = ({
  canvasRef,
  duration,
  setLoop,
  setIsPlaying,
  setCurrentTime,
}: {
  canvasRef: RefObject<SvgCanvasRef | null>
  duration: number
  setLoop: (loop: boolean) => void
  setIsPlaying: (isPlaying: boolean) => void
  setCurrentTime: (time: number) => void
}) => {
  const resolveRef = useRef<(() => void) | null>(null)
  const rejectRef = useRef<((error: Error) => void) | null>(null)
  const timeoutRef = useRef<number | null>(null)

  const clearExportTimeout = () => {
    if (timeoutRef.current === null) return
    window.clearTimeout(timeoutRef.current)
    timeoutRef.current = null
  }

  const finishVideoExport = (blob: Blob) => {
    clearExportTimeout()
    downloadVideoBlob(blob)
    resolveRef.current?.()
    resolveRef.current = null
    rejectRef.current = null
  }

  const failVideoExport = (error: unknown) => {
    clearExportTimeout()
    rejectRef.current?.(
      error instanceof Error ? error : new Error("Video export failed.")
    )
    resolveRef.current = null
    rejectRef.current = null
  }

  const stopVideoExportRecording = () => {
    try {
      canvasRef.current?.stopRecording(finishVideoExport)
    } catch (error) {
      failVideoExport(error)
    }
  }

  const exportTimelineVideo = () =>
    new Promise<void>((resolve, reject) => {
      if (!canvasRef.current) {
        reject(new Error("Canvas is not ready."))
        return
      }
      if (resolveRef.current) {
        reject(new Error("Video export is already running."))
        return
      }

      resolveRef.current = resolve
      rejectRef.current = reject
      setLoop(false)
      setIsPlaying(false)
      setCurrentTime(0)

      window.requestAnimationFrame(() => {
        window.requestAnimationFrame(() => {
          try {
            canvasRef.current?.startRecording()
            setCurrentTime(0)
            setIsPlaying(true)
            timeoutRef.current = window.setTimeout(
              stopVideoExportRecording,
              Math.ceil(duration * 1000) + 250
            )
          } catch (error) {
            failVideoExport(error)
          }
        })
      })
    })

  return {
    isVideoExportPendingRef: resolveRef,
    exportTimelineVideo,
    stopVideoExportRecording,
  }
}
