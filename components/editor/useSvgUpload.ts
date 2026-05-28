import { useRef } from "react"
import type {
  ChangeEvent,
  Dispatch,
  DragEvent,
  RefObject,
  SetStateAction,
} from "react"
import type { ShapeStop } from "./TimelineModel"

const isSvgFile = (file: File | undefined | null) =>
  Boolean(file && (!file.type || file.type === "image/svg+xml"))

const readSvgFile = (
  file: File,
  onLoad: (content: string) => void,
  onDone?: () => void
) => {
  const reader = new FileReader()
  reader.onload = (event) => {
    const content = event.target?.result
    if (typeof content === "string" && content) onLoad(content)
    onDone?.()
  }
  reader.onerror = () => onDone?.()
  reader.readAsText(file)
}

export const useSvgUpload = ({
  selectedShapeId,
  setShapes,
  markCustom,
}: {
  selectedShapeId: string | null
  setShapes: Dispatch<SetStateAction<ShapeStop[]>>
  markCustom: () => void
}): {
  uploadFileRef: RefObject<HTMLInputElement | null>
  triggerShapeUpload: (shapeId: string) => void
  handleUploadInputChange: (event: ChangeEvent<HTMLInputElement>) => void
  uploadSvgToShape: (
    event: ChangeEvent<HTMLInputElement>,
    shapeId: string
  ) => void
  handleDropSvg: (event: DragEvent) => void
} => {
  const uploadFileRef = useRef<HTMLInputElement>(null)
  const uploadTargetRef = useRef<string | null>(null)

  const applyCustomSvg = (shapeId: string, svgContent: string) => {
    setShapes((prev) =>
      prev.map((shape) =>
        shape.id === shapeId
          ? { ...shape, iconId: "custom", iconName: "Custom", svgContent }
          : shape
      )
    )
  }

  const uploadSvgToShape = (
    event: ChangeEvent<HTMLInputElement>,
    shapeId: string
  ) => {
    const input = event.currentTarget
    const file = input.files?.[0]
    if (!isSvgFile(file)) {
      input.value = ""
      return
    }

    markCustom()
    readSvgFile(
      file!,
      (content) => applyCustomSvg(shapeId, content),
      () => {
        input.value = ""
      }
    )
  }

  const handleUploadInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    const shapeId = uploadTargetRef.current
    if (!shapeId) {
      event.currentTarget.value = ""
      return
    }
    uploadSvgToShape(event, shapeId)
  }

  const handleDropSvg = (event: DragEvent) => {
    const file = event.dataTransfer.files[0]
    if (!isSvgFile(file) || !selectedShapeId) return

    markCustom()
    readSvgFile(file!, (content) => applyCustomSvg(selectedShapeId, content))
  }

  const triggerShapeUpload = (shapeId: string) => {
    uploadTargetRef.current = shapeId
    uploadFileRef.current?.click()
  }

  return {
    uploadFileRef,
    triggerShapeUpload,
    handleUploadInputChange,
    uploadSvgToShape,
    handleDropSvg,
  }
}
