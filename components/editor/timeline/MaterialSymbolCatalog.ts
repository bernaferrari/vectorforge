import { normalizeMaterialSymbolName } from "../IconLibrary"
import {
  MATERIAL_WIPE_READY_PAIRS,
  type MaterialWipeIconPair,
} from "../MaterialWipePairs"

const FALLBACK_MATERIAL_SYMBOL_NAMES = [
  "home",
  "search",
  "settings",
  "person",
  "favorite",
  "star",
  "arrow_forward",
  "event_list",
  "palette",
  "bolt",
]

export const materialSymbolQuery = (query: string) =>
  normalizeMaterialSymbolName(query)

const MATERIAL_WIPE_READY_PAIR_INDEX = MATERIAL_WIPE_READY_PAIRS.map(
  (pair) => ({
    pair,
    query: normalizeMaterialSymbolName(
      `${pair.label} ${pair.enabled} ${pair.disabled}`
    ),
  })
)

export const visibleMaterialSymbols = (
  names: string[],
  query: string,
  limit = 80
) => {
  const normalizedQuery = materialSymbolQuery(query)
  const source = names.length > 0 ? names : FALLBACK_MATERIAL_SYMBOL_NAMES
  const uniqueSource = Array.from(new Set(source))
  const filtered = normalizedQuery
    ? uniqueSource.filter((name) => name.includes(normalizedQuery))
    : uniqueSource
  return filtered.slice(0, limit)
}

export const visibleWipePairs = (
  query: string,
  limit = 24
): MaterialWipeIconPair[] => {
  const normalizedQuery = materialSymbolQuery(query)
  const filtered = normalizedQuery
    ? MATERIAL_WIPE_READY_PAIR_INDEX.filter(({ query }) =>
        query.includes(normalizedQuery)
      ).map(({ pair }) => pair)
    : MATERIAL_WIPE_READY_PAIRS
  return filtered.slice(0, limit)
}
