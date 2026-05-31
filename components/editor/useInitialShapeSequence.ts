"use client"

import { useEffect } from "react"
import { useLatestRef } from "@/lib/use-latest-ref"
import type { ShapeStop } from "./TimelineModel"
import { createDefaultShapeSequence } from "./ShapeSequenceModel"

interface InitialShapeSequenceOptions {
  onInitialShapes: (shapes: ShapeStop[]) => void
}

export function useInitialShapeSequence({
  onInitialShapes,
}: InitialShapeSequenceOptions) {
  const onInitialShapesRef = useLatestRef(onInitialShapes)

  useEffect(() => {
    const initialShapes = createDefaultShapeSequence()
    if (initialShapes.length > 0) {
      onInitialShapesRef.current(initialShapes)
    }
  }, [])
}
