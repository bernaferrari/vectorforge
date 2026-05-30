"use client"

import { useState, type Dispatch, type SetStateAction } from "react"
import type { ShapeStop } from "./TimelineModel"
import { useSvgUpload } from "./useSvgUpload"

export function useEditorFileSurface({
  selectedShapeId,
  setShapes,
  markCustom,
}: {
  selectedShapeId: string | null
  setShapes: Dispatch<SetStateAction<ShapeStop[]>>
  markCustom: () => void
}) {
  const [isExportOpen, setIsExportOpen] = useState(false)
  const upload = useSvgUpload({
    selectedShapeId,
    setShapes,
    markCustom,
  })

  return {
    isExportOpen,
    setIsExportOpen,
    openExport: () => setIsExportOpen(true),
    closeExport: () => setIsExportOpen(false),
    ...upload,
  }
}
