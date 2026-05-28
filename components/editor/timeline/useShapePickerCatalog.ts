import { useEffect, useMemo, useState } from "react"
import {
  fetchMaterialSymbolIcon,
  fetchMaterialSymbolNames,
  normalizeMaterialSymbolName,
  type MaterialSymbolFontSettings,
  type MaterialSymbolStyle,
} from "../IconLibrary"
import type { MaterialWipeIconPair } from "../MaterialWipePairs"
import type { ShapeOption } from "./TimelineTypes"
import {
  materialSymbolQuery,
  visibleMaterialSymbols,
  visibleWipePairs,
} from "./MaterialSymbolCatalog"

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
  const [materialSymbolNames, setMaterialSymbolNames] = useState<string[]>([])
  const [materialCatalogLoading, setMaterialCatalogLoading] = useState(false)
  const [materialSymbolStatus, setMaterialSymbolStatus] = useState<{
    state: "idle" | "loading" | "error"
    message?: string
  }>({ state: "idle" })
  const [wipePairMode, setWipePairMode] = useState<"slash" | "morph">("slash")

  useEffect(() => {
    if (
      !openShapePicker ||
      materialSymbolNames.length > 0 ||
      materialCatalogLoading
    )
      return
    let cancelled = false
    setMaterialCatalogLoading(true)
    fetchMaterialSymbolNames()
      .then((names) => {
        if (!cancelled) setMaterialSymbolNames(names)
      })
      .catch(() => {
        if (!cancelled) setMaterialSymbolNames([])
      })
      .finally(() => {
        if (!cancelled) setMaterialCatalogLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [materialCatalogLoading, materialSymbolNames.length, openShapePicker])

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

  const importMaterialSymbol = async (shapeId: string) => {
    const symbolName = normalizeMaterialSymbolName(shapeSearchQuery)
    if (!symbolName || materialSymbolStatus.state === "loading") return
    setMaterialSymbolStatus({ state: "loading" })
    try {
      const icon = await fetchMaterialSymbolIcon(
        symbolName,
        materialSymbolStyle
      )
      onShapeIconChange(shapeId, icon)
      setShapeSearchQuery("")
      setMaterialSymbolStatus({ state: "idle" })
      onOpenShapePicker(null)
    } catch (error) {
      setMaterialSymbolStatus({
        state: "error",
        message:
          error instanceof Error
            ? error.message
            : "Could not import that symbol.",
      })
    }
  }

  const chooseMaterialSymbol = (shapeId: string, symbolName: string) => {
    setMaterialSymbolStatus({ state: "idle" })
    void (async () => {
      setMaterialSymbolStatus({ state: "loading" })
      try {
        const icon = await fetchMaterialSymbolIcon(
          symbolName,
          materialSymbolStyle
        )
        onShapeIconChange(shapeId, icon)
        setShapeSearchQuery("")
        setMaterialSymbolStatus({ state: "idle" })
        onOpenShapePicker(null)
      } catch (error) {
        setMaterialSymbolStatus({
          state: "error",
          message:
            error instanceof Error
              ? error.message
              : "Could not import that symbol.",
        })
      }
    })()
  }

  const chooseWipePair = (shapeId: string, pair: MaterialWipeIconPair) => {
    setMaterialSymbolStatus({ state: "loading" })
    void (async () => {
      try {
        const [enabled, disabled] = await Promise.all([
          fetchMaterialSymbolIcon(pair.enabled, materialSymbolStyle),
          fetchMaterialSymbolIcon(pair.disabled, materialSymbolStyle, {
            syntheticOffSlash: wipePairMode === "slash",
          }),
        ])
        onShapeWipePairChange(shapeId, enabled, disabled)
        setShapeSearchQuery("")
        setMaterialSymbolStatus({ state: "idle" })
        onOpenShapePicker(null)
      } catch (error) {
        setMaterialSymbolStatus({
          state: "error",
          message:
            error instanceof Error
              ? error.message
              : "Could not import that wipe pair.",
        })
      }
    })()
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
