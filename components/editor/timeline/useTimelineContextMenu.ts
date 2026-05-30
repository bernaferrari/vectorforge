"use client"

import { useEffect, useRef, useState } from "react"
import { parseTimelineTimeInput } from "./TimelineGeometry"
import type { GoToEditorState } from "./TimelineGoToPopover"
import type { TimelineMenuItem, TimelineMenuState } from "./TimelineMenuModel"

interface TimelineContextMenuOptions {
  duration: number
  onScrubStart?: () => void
  onTimeChange: (time: number) => void
}

export function useTimelineContextMenu({
  duration,
  onScrubStart,
  onTimeChange,
}: TimelineContextMenuOptions) {
  const [contextMenu, setContextMenu] = useState<TimelineMenuState>(null)
  const [goToEditor, setGoToEditor] = useState<GoToEditorState | null>(null)
  const skipGoToCommitRef = useRef(false)

  useEffect(() => {
    if (!contextMenu) return
    const close = () => setContextMenu(null)
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") close()
    }
    window.addEventListener("mousedown", close)
    window.addEventListener("wheel", close, { passive: true })
    window.addEventListener("resize", close)
    window.addEventListener("keydown", handleKeyDown)
    return () => {
      window.removeEventListener("mousedown", close)
      window.removeEventListener("wheel", close)
      window.removeEventListener("resize", close)
      window.removeEventListener("keydown", handleKeyDown)
    }
  }, [contextMenu])

  const openContextMenu = (
    event: React.MouseEvent,
    title: string,
    items: TimelineMenuItem[]
  ) => {
    setGoToEditor(null)
    setContextMenu({
      x: event.clientX,
      y: event.clientY,
      title,
      items,
    })
  }

  const openGoToEditor = (clientX: number, clientY: number, time: number) => {
    const width = 132
    const height = 76
    skipGoToCommitRef.current = false
    setContextMenu(null)
    setGoToEditor({
      x: Math.min(clientX, window.innerWidth - width - 8),
      y: Math.min(clientY, window.innerHeight - height - 8),
      draft: Math.max(0, Math.min(duration, time)).toFixed(2),
    })
  }

  const createGoToMenuItem = (
    event: React.MouseEvent,
    time: number,
    onBeforeOpen?: () => void
  ): TimelineMenuItem => {
    const x = event.clientX
    const y = event.clientY
    const t = Math.max(0, Math.min(duration, time))
    return {
      label: "Go to...",
      shortcut: `${t.toFixed(2)}s`,
      onSelect: () => {
        onBeforeOpen?.()
        openGoToEditor(x, y, t)
      },
    }
  }

  const commitGoToEditor = () => {
    if (skipGoToCommitRef.current) {
      skipGoToCommitRef.current = false
      return
    }
    if (!goToEditor) return
    const parsed = parseTimelineTimeInput(goToEditor.draft)
    if (Number.isFinite(parsed)) {
      onScrubStart?.()
      onTimeChange(Number(Math.max(0, Math.min(duration, parsed)).toFixed(3)))
    }
    setGoToEditor(null)
  }

  const cancelGoToEditor = () => {
    skipGoToCommitRef.current = true
    setGoToEditor(null)
  }

  return {
    contextMenu,
    setContextMenu,
    goToEditor,
    setGoToEditor,
    openContextMenu,
    createGoToMenuItem,
    commitGoToEditor,
    cancelGoToEditor,
  }
}
