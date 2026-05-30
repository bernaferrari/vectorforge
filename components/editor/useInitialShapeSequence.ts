"use client"

import { useEffect, useRef } from "react"
import type { ShapeStop } from "./TimelineModel"
import { createDefaultShapeSequence } from "./ShapeSequenceModel"

interface InitialShapeSequenceOptions {
  onInitialShapes: (shapes: ShapeStop[]) => void
}

export function useInitialShapeSequence({
  onInitialShapes,
}: InitialShapeSequenceOptions) {
  const onInitialShapesRef = useRef(onInitialShapes)

  useEffect(() => {
    onInitialShapesRef.current = onInitialShapes
  }, [onInitialShapes])

  useEffect(() => {
    let cancelled = false

    void (async () => {
      const initialShapes = await createDefaultShapeSequence()
      if (!cancelled && initialShapes.length > 0) {
        onInitialShapesRef.current(initialShapes)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [])
}
