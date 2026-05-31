"use client"

import { useEffect, useState } from "react"
import { fetchMaterialSymbolNames } from "../IconLibrary"

export const useMaterialSymbolCatalogLoader = (enabled: boolean) => {
  const [materialSymbolNames, setMaterialSymbolNames] = useState<string[]>([])
  const [materialCatalogLoading, setMaterialCatalogLoading] = useState(false)

  useEffect(() => {
    if (!enabled || materialSymbolNames.length > 0 || materialCatalogLoading) {
      return
    }

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
  }, [enabled, materialCatalogLoading, materialSymbolNames.length])

  return {
    materialSymbolNames,
    materialCatalogLoading,
  }
}
