import { useCallback, useEffect, useMemo, useState } from "react"
import {
  normalizeMaterialSymbolName,
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

const RECENT_MATERIAL_SYMBOLS_KEY = "vectorforge.recent-material-symbols.v1"
const FAVORITE_MATERIAL_SYMBOLS_KEY =
  "vectorforge.favorite-material-symbols.v1"
const MAX_RECENT_MATERIAL_SYMBOLS = 18
const MAX_FAVORITE_MATERIAL_SYMBOLS = 48

const readStoredSymbolList = (key: string) => {
  if (typeof window === "undefined") return []
  try {
    const parsed = JSON.parse(window.localStorage.getItem(key) ?? "[]")
    return Array.isArray(parsed)
      ? parsed
          .map((item) =>
            typeof item === "string" ? normalizeMaterialSymbolName(item) : ""
          )
          .filter(Boolean)
      : []
  } catch {
    return []
  }
}

const writeStoredSymbolList = (key: string, symbols: string[]) => {
  if (typeof window === "undefined") return
  window.localStorage.setItem(key, JSON.stringify(symbols))
}

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
  const [recentMaterialSymbolNames, setRecentMaterialSymbolNames] = useState<
    string[]
  >([])
  const [favoriteMaterialSymbolNames, setFavoriteMaterialSymbolNames] =
    useState<string[]>([])
  const { materialSymbolNames } = useMaterialSymbolCatalogLoader(
    Boolean(openShapePicker)
  )

  useEffect(() => {
    setRecentMaterialSymbolNames(readStoredSymbolList(RECENT_MATERIAL_SYMBOLS_KEY))
    setFavoriteMaterialSymbolNames(
      readStoredSymbolList(FAVORITE_MATERIAL_SYMBOLS_KEY)
    )
  }, [])

  const rememberMaterialSymbol = useCallback((symbolName: string) => {
    const normalized = normalizeMaterialSymbolName(symbolName)
    if (!normalized) return
    setRecentMaterialSymbolNames((current) => {
      const next = [
        normalized,
        ...current.filter((candidate) => candidate !== normalized),
      ].slice(0, MAX_RECENT_MATERIAL_SYMBOLS)
      writeStoredSymbolList(RECENT_MATERIAL_SYMBOLS_KEY, next)
      return next
    })
  }, [])

  const toggleMaterialSymbolFavorite = useCallback((symbolName: string) => {
    const normalized = normalizeMaterialSymbolName(symbolName)
    if (!normalized) return
    setFavoriteMaterialSymbolNames((current) => {
      const exists = current.includes(normalized)
      const next = exists
        ? current.filter((candidate) => candidate !== normalized)
        : [normalized, ...current].slice(0, MAX_FAVORITE_MATERIAL_SYMBOLS)
      writeStoredSymbolList(FAVORITE_MATERIAL_SYMBOLS_KEY, next)
      return next
    })
  }, [])

  const {
    materialSymbolStatus,
    setMaterialSymbolStatus,
    importMaterialSymbol,
    chooseMaterialSymbol,
    chooseWipePair,
  } = useMaterialSymbolImportActions({
    shapeSearchQuery,
    materialSymbolStyle,
    onShapeIconChange,
    onShapeWipePairChange,
    onSearchQueryChange: setShapeSearchQuery,
    onOpenShapePicker,
    onSymbolImported: rememberMaterialSymbol,
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
  const favoriteMaterialSymbols = useMemo(
    () =>
      favoriteMaterialSymbolNames.length
        ? visibleMaterialSymbols(favoriteMaterialSymbolNames, shapeSearchQuery)
        : [],
    [favoriteMaterialSymbolNames, shapeSearchQuery]
  )
  const recentMaterialSymbols = useMemo(
    () =>
      recentMaterialSymbolNames.length
        ? visibleMaterialSymbols(recentMaterialSymbolNames, shapeSearchQuery).filter(
            (symbolName) => !favoriteMaterialSymbols.includes(symbolName)
          )
        : [],
    [favoriteMaterialSymbols, recentMaterialSymbolNames, shapeSearchQuery]
  )
  const filteredMaterialSymbols = useMemo(
    () =>
      visibleMaterialSymbols(materialSymbolNames, shapeSearchQuery).filter(
        (symbolName) =>
          !favoriteMaterialSymbols.includes(symbolName) &&
          !recentMaterialSymbols.includes(symbolName)
      ),
    [
      favoriteMaterialSymbols,
      materialSymbolNames,
      recentMaterialSymbols,
      shapeSearchQuery,
    ]
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
    favoriteMaterialSymbols,
    recentMaterialSymbols,
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
    toggleMaterialSymbolFavorite,
    importMaterialSymbol,
    chooseMaterialSymbol,
    chooseWipePair,
  }
}
