import { useMemo, useState } from "react"
import {
  type MaterialSymbolFontSettings,
  type MaterialSymbolStyle,
} from "../IconLibrary"
import type { ShapeOption } from "./TimelineTypes"
import {
  materialSymbolQuery,
  visibleMaterialSymbols,
  visibleWipePairs,
} from "./MaterialSymbolCatalog"
import { useMaterialSymbolCatalogLoader } from "./useMaterialSymbolCatalogLoader"
import { useMaterialSymbolImportActions } from "./useMaterialSymbolImportActions"

export function useShapePickerCatalog({
  openShapePicker,
  shapeOptions,
  onShapeIconChange,
  onShapeWipePairChange,
  onOpenShapePicker,
}: {
  openShapePicker: string | null
  shapeOptions: ShapeOption[]
  onShapeIconChange: (id: string, option: ShapeOption) => void
  onShapeWipePairChange: (
    id: string,
    enabled: ShapeOption,
    disabled: ShapeOption
  ) => void
  onOpenShapePicker: (id: string | null) => void
}) {
  const [shapeSearchQuery, setShapeSearchQuery] = useState("")
  const [materialSymbolStyle, setMaterialSymbolStyle] =
    useState<MaterialSymbolStyle>("outlined")
  const [materialSymbolSettings, setMaterialSymbolSettings] =
    useState<MaterialSymbolFontSettings>({
      fill: 0,
      weight: 400,
      grade: 0,
      opticalSize: 24,
    })
  const [materialSymbolOptionsOpen, setMaterialSymbolOptionsOpen] =
    useState(false)
  const { materialSymbolNames } = useMaterialSymbolCatalogLoader(
    Boolean(openShapePicker)
  )
  const [wipePairMode, setWipePairMode] = useState<"slash" | "morph">("slash")
  const {
    materialSymbolStatus,
    setMaterialSymbolStatus,
    importMaterialSymbol,
    chooseMaterialSymbol,
    chooseWipePair,
  } = useMaterialSymbolImportActions({
    shapeSearchQuery,
    materialSymbolStyle,
    wipePairMode,
    onShapeIconChange,
    onShapeWipePairChange,
    onSearchQueryChange: setShapeSearchQuery,
    onOpenShapePicker,
  })

  const normalizedShapeQuery = materialSymbolQuery(shapeSearchQuery)
  const visibleShapeOptions = useMemo(() => {
    const query = shapeSearchQuery.trim().toLowerCase()
    if (!query) return shapeOptions
    return shapeOptions.filter((option) => {
      const haystack = [
        option.name,
        option.id,
        option.category,
        ...(option.tags ?? []),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
      return haystack.includes(query) || haystack.includes(normalizedShapeQuery)
    })
  }, [normalizedShapeQuery, shapeOptions, shapeSearchQuery])
  const filteredMaterialSymbols = useMemo(
    () => visibleMaterialSymbols(materialSymbolNames, shapeSearchQuery),
    [materialSymbolNames, shapeSearchQuery]
  )
  const filteredWipePairs = useMemo(
    () => visibleWipePairs(shapeSearchQuery),
    [shapeSearchQuery]
  )

  const updateMaterialSymbolSetting = <
    K extends keyof MaterialSymbolFontSettings,
  >(
    key: K,
    value: MaterialSymbolFontSettings[K]
  ) => {
    setMaterialSymbolSettings((current) => ({ ...current, [key]: value }))
  }

  return {
    shapeSearchQuery,
    setShapeSearchQuery,
    normalizedShapeQuery,
    visibleShapeOptions,
    filteredMaterialSymbols,
    filteredWipePairs,
    materialSymbolStyle,
    setMaterialSymbolStyle,
    materialSymbolSettings,
    updateMaterialSymbolSetting,
    materialSymbolOptionsOpen,
    setMaterialSymbolOptionsOpen,
    materialSymbolStatus,
    setMaterialSymbolStatus,
    wipePairMode,
    setWipePairMode,
    importMaterialSymbol,
    chooseMaterialSymbol,
    chooseWipePair,
  }
}
