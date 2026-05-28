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
  "play_arrow",
  "shopping_cart",
  "add",
  "close",
  "check",
  "menu",
  "camera_alt",
  "image",
  "music_note",
  "mail",
  "chat",
  "call",
  "calendar_month",
  "lock",
  "folder",
  "shopping_bag",
  "location_on",
  "public",
  "rocket_launch",
  "diamond",
  "notifications",
  "cloud",
  "shield",
  "trophy",
  "mood",
  "download",
  "upload",
  "edit",
  "delete",
  "visibility",
  "bookmark",
  "share",
  "refresh",
  "sync",
  "layers",
  "dashboard",
  "terminal",
  "code",
  "auto_awesome",
  "brush",
  "format_paint",
  "lightbulb",
  "extension",
  "widgets",
  "animation",
  "view_in_ar",
  "deployed_code",
  "gesture",
  "emoji_objects",
]

export const materialSymbolQuery = (query: string) =>
  normalizeMaterialSymbolName(query)

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
    ? MATERIAL_WIPE_READY_PAIRS.filter((pair) =>
        normalizeMaterialSymbolName(
          `${pair.label} ${pair.enabled} ${pair.disabled}`
        ).includes(normalizedQuery)
      )
    : MATERIAL_WIPE_READY_PAIRS
  return filtered.slice(0, limit)
}
