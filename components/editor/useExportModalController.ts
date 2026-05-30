"use client"

import { useCallback, useMemo, useState } from "react"
import confetti from "canvas-confetti"
import {
  type ExportCodeTemplateParams,
  generateAndroidFilamentCode,
  generateAndroidGradleCode,
  generateR3fCode,
} from "./ExportCodeTemplates"
import type { ExportSceneSnapshot } from "./ExportSceneSnapshot"

export type ExportTab = "options" | "r3f" | "android"

export const isExportTab = (value: string): value is ExportTab =>
  value === "options" || value === "r3f" || value === "android"

export function useExportModalController({
  scene,
  onExportVideo,
}: {
  scene: ExportSceneSnapshot
  onExportVideo: () => Promise<void>
}) {
  const [activeTab, setActiveTab] = useState<ExportTab>("options")
  const [isRecording, setIsRecording] = useState(false)
  const [isCopied, setIsCopied] = useState(false)

  const codeTemplateParams = useMemo<ExportCodeTemplateParams>(
    () => ({ ...scene }),
    [scene]
  )

  const r3fCode = useMemo(
    () => generateR3fCode(codeTemplateParams),
    [codeTemplateParams]
  )
  const androidGradleCode = useMemo(() => generateAndroidGradleCode(), [])
  const androidFilamentCode = useMemo(
    () => generateAndroidFilamentCode(codeTemplateParams),
    [codeTemplateParams]
  )

  const handleTabChange = useCallback((value: string) => {
    if (isExportTab(value)) setActiveTab(value)
  }, [])

  const handleCopyCode = useCallback((text: string) => {
    void navigator.clipboard.writeText(text)
    setIsCopied(true)
    confetti({
      particleCount: 80,
      spread: 60,
      origin: { y: 0.6 },
      colors: ["#7c5cff", "#ff5b9a", "#ffd700"],
    })
    window.setTimeout(() => setIsCopied(false), 2000)
  }, [])

  const handleVideoExport = useCallback(async () => {
    if (isRecording) return
    try {
      setIsRecording(true)
      await onExportVideo()
      confetti({
        particleCount: 150,
        spread: 80,
        origin: { y: 0.6 },
        colors: ["#4ee2a3", "#7c5cff", "#ffffff"],
      })
    } finally {
      setIsRecording(false)
    }
  }, [isRecording, onExportVideo])

  return {
    activeTab,
    androidFilamentCode,
    androidGradleCode,
    handleCopyCode,
    handleTabChange,
    handleVideoExport,
    isCopied,
    isRecording,
    r3fCode,
  }
}
