"use client"

import { useRef, useState } from "react"
import {
  fetchMaterialSymbolIcon,
  normalizeMaterialSymbolName,
  type MaterialSymbolStyle,
} from "../IconLibrary"
import type { MaterialWipeIconPair } from "../MaterialWipePairs"
import type { ShapeOption } from "./TimelineTypes"
import type { MaterialSymbolStatus } from "./ShapePickerSymbolModel"

const errorMessageFromUnknown = (error: unknown, fallback: string) =>
  error instanceof Error ? error.message : fallback

export const useMaterialSymbolImportActions = ({
  shapeSearchQuery,
  materialSymbolStyle,
  wipePairMode,
  onShapeIconChange,
  onShapeWipePairChange,
  onSearchQueryChange,
  onOpenShapePicker,
}: {
  shapeSearchQuery: string
  materialSymbolStyle: MaterialSymbolStyle
  wipePairMode: "slash" | "morph"
  onShapeIconChange: (id: string, option: ShapeOption) => void
  onShapeWipePairChange: (
    id: string,
    enabled: ShapeOption,
    disabled: ShapeOption
  ) => void
  onSearchQueryChange: (value: string) => void
  onOpenShapePicker: (id: string | null) => void
}) => {
  const [materialSymbolStatus, setMaterialSymbolStatus] =
    useState<MaterialSymbolStatus>({ state: "idle" })
  const importInFlightRef = useRef(false)

  const chooseMaterialSymbol = (shapeId: string, symbolName: string) => {
    const normalizedName = normalizeMaterialSymbolName(symbolName)
    if (!normalizedName || importInFlightRef.current) return

    setMaterialSymbolStatus({ state: "idle" })
    void (async () => {
      importInFlightRef.current = true
      setMaterialSymbolStatus({ state: "loading" })
      try {
        const icon = await fetchMaterialSymbolIcon(
          normalizedName,
          materialSymbolStyle
        )
        onShapeIconChange(shapeId, icon)
        onSearchQueryChange("")
        setMaterialSymbolStatus({ state: "idle" })
        onOpenShapePicker(null)
      } catch (error) {
        setMaterialSymbolStatus({
          state: "error",
          message: errorMessageFromUnknown(
            error,
            "Could not import that symbol."
          ),
        })
      } finally {
        importInFlightRef.current = false
      }
    })()
  }

  const importMaterialSymbol = (shapeId: string) => {
    chooseMaterialSymbol(shapeId, shapeSearchQuery)
  }

  const chooseWipePair = (shapeId: string, pair: MaterialWipeIconPair) => {
    if (importInFlightRef.current) return

    void (async () => {
      importInFlightRef.current = true
      setMaterialSymbolStatus({ state: "loading" })
      try {
        const [enabled, disabled] = await Promise.all([
          fetchMaterialSymbolIcon(pair.enabled, materialSymbolStyle),
          fetchMaterialSymbolIcon(pair.disabled, materialSymbolStyle, {
            syntheticOffSlash: wipePairMode === "slash",
          }),
        ])
        onShapeWipePairChange(shapeId, enabled, disabled)
        onSearchQueryChange("")
        setMaterialSymbolStatus({ state: "idle" })
        onOpenShapePicker(null)
      } catch (error) {
        setMaterialSymbolStatus({
          state: "error",
          message: errorMessageFromUnknown(
            error,
            "Could not import that wipe pair."
          ),
        })
      } finally {
        importInFlightRef.current = false
      }
    })()
  }

  return {
    materialSymbolStatus,
    setMaterialSymbolStatus,
    importMaterialSymbol,
    chooseMaterialSymbol,
    chooseWipePair,
  }
}
