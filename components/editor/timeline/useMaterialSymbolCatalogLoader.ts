"use client"

import { getMaterialSymbolNames } from "../IconLibrary"

export const useMaterialSymbolCatalogLoader = (_enabled: boolean) => {
  return {
    materialSymbolNames: getMaterialSymbolNames(),
    materialCatalogLoading: false,
  }
}
