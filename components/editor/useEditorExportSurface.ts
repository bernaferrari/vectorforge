"use client"

import type { Dispatch, RefObject, SetStateAction } from "react"
import type { SvgCanvasRef } from "../3d/SvgCanvas"
import type { ExportSceneSnapshot } from "./ExportSceneSnapshot"
import type { ShapeStop } from "./TimelineModel"
import { useEditorFileSurface } from "./useEditorFileSurface"
import { useExportSceneSnapshot } from "./useExportSceneSnapshot"

type UseEditorExportSurfaceArgs = ExportSceneSnapshot & {
  selectedShapeId: string | null
  setShapes: Dispatch<SetStateAction<ShapeStop[]>>
  canvasRef: RefObject<SvgCanvasRef | null>
  exportTimelineVideo: () => Promise<void>
  markCustom: () => void
}

export function useEditorExportSurface({
  selectedShapeId,
  setShapes,
  canvasRef,
  exportTimelineVideo,
  markCustom,
  ...sceneArgs
}: UseEditorExportSurfaceArgs) {
  const {
    isExportOpen,
    openExport,
    closeExport,
    uploadFileRef,
    handleUploadInputChange,
    handleDropSvg,
    triggerShapeUpload,
  } = useEditorFileSurface({
    selectedShapeId,
    setShapes,
    markCustom,
  })

  const scene = useExportSceneSnapshot(sceneArgs)

  return {
    openExport,
    uploadFileRef,
    handleUploadInputChange,
    handleDropSvg,
    triggerShapeUpload,
    exportModalProps: {
      isOpen: isExportOpen,
      onClose: closeExport,
      onExportGltf: () => canvasRef.current?.exportGltf(),
      onExportVideo: exportTimelineVideo,
      scene,
    },
  }
}
