import catalog from "./MaterialWipePairs.generated.json"

export interface MaterialWipeIconPair {
  label: string
  enabled: string
  disabled: string
}

type MaterialWipeCatalog = {
  ready: MaterialWipeIconPair[]
  refinement: MaterialWipeIconPair[]
}

// Generated from https://github.com/bernaferrari/diagonal-wipe-icon/blob/main/composeApp/src/commonMain/kotlin/com/bernaferrari/diagonalwipeicon/demo/MaterialWipeIconCatalog.kt
// Keep the large pair list in JSON so this module remains a typed adapter.
const materialWipeCatalog = catalog as MaterialWipeCatalog

export const MATERIAL_WIPE_READY_PAIRS = materialWipeCatalog.ready
export const MATERIAL_WIPE_REFINEMENT_PAIRS = materialWipeCatalog.refinement
