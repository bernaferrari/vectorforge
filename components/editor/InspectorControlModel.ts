"use client"

import { useCallback, useEffect, useRef } from "react"

export const clampInspectorValue = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(max, value))

let inspectorInputDragActive = false

export const isInspectorInputDragActive = () => inspectorInputDragActive

export const setInspectorInputDragActive = (active: boolean) => {
  inspectorInputDragActive = active
}

export const useRafNumberChange = (onChange: (value: number) => void) => {
  const onChangeRef = useRef(onChange)
  const frameRef = useRef<number | null>(null)
  const pendingValueRef = useRef<number | null>(null)

  useEffect(() => {
    onChangeRef.current = onChange
  }, [onChange])

  const flush = useCallback(() => {
    if (frameRef.current !== null) {
      cancelAnimationFrame(frameRef.current)
      frameRef.current = null
    }
    const value = pendingValueRef.current
    pendingValueRef.current = null
    if (value !== null) onChangeRef.current(value)
  }, [])

  const schedule = useCallback(
    (value: number) => {
      if (pendingValueRef.current === value) return
      pendingValueRef.current = value
      if (frameRef.current !== null) return
      frameRef.current = requestAnimationFrame(flush)
    },
    [flush]
  )

  useEffect(
    () => () => {
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current)
    },
    []
  )

  return { flush, schedule }
}
