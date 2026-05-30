"use client"

import * as React from "react"
import type { ColorStopEditorAnchor } from "./color-gradient-stop-rows"

export function useColorStopEditorState({
  isOpen,
  isGradient,
  stopCount,
}: {
  isOpen: boolean
  isGradient: boolean
  stopCount: number
}) {
  const [activeStop, setActiveStop] = React.useState(0)
  const [openStopEditor, setOpenStopEditor] = React.useState<number | null>(
    null
  )
  const [openStopEditorAnchor, setOpenStopEditorAnchor] =
    React.useState<ColorStopEditorAnchor>(null)
  const openingStopEditorRef = React.useRef(false)

  React.useEffect(() => {
    if (!isGradient) setActiveStop(0)
    setOpenStopEditor(null)
  }, [isGradient])

  React.useEffect(() => {
    if (!isOpen && openStopEditor !== null) {
      setOpenStopEditor(null)
      setOpenStopEditorAnchor(null)
    }
  }, [isOpen, openStopEditor])

  React.useEffect(() => {
    if (activeStop >= stopCount) setActiveStop(Math.max(0, stopCount - 1))
    if (openStopEditor !== null && openStopEditor >= stopCount) {
      setOpenStopEditor(null)
      setOpenStopEditorAnchor(null)
    }
  }, [activeStop, openStopEditor, stopCount])

  const closeStopEditor = React.useCallback(() => {
    openingStopEditorRef.current = false
    setOpenStopEditor(null)
    setOpenStopEditorAnchor(null)
  }, [])

  const markStopEditorOpenIntent = React.useCallback(() => {
    openingStopEditorRef.current = true
  }, [])

  const setOpenStopEditorState = React.useCallback(
    (stop: number | null, anchor: ColorStopEditorAnchor) => {
      if (stop !== null) openingStopEditorRef.current = false
      setOpenStopEditor(stop)
      setOpenStopEditorAnchor(anchor)
    },
    []
  )

  return {
    activeStop,
    closeStopEditor,
    markStopEditorOpenIntent,
    openStopEditor,
    openStopEditorAnchor,
    openingStopEditorRef,
    setActiveStop,
    setOpenStopEditor,
    setOpenStopEditorAnchor,
    setOpenStopEditorState,
  }
}
