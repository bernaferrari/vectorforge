import {
  materialSymbolFontStyle,
  type MaterialSymbolFontSettings,
} from "../IconLibrary"

export type MaterialSymbolStatus = {
  state: "idle" | "loading" | "error"
  message?: string
}

export type MaterialSymbolSettingChange = <
  K extends keyof MaterialSymbolFontSettings,
>(
  key: K,
  value: MaterialSymbolFontSettings[K]
) => void

export const shapePickerSymbolStyle = (
  materialSymbolSettings: MaterialSymbolFontSettings
) => materialSymbolFontStyle(materialSymbolSettings)
