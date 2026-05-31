"use client"

import { useCallback, useState, type SetStateAction } from "react"

const resolveSettingValue = <T>(value: SetStateAction<T>, previous: T) =>
  typeof value === "function" ? (value as (current: T) => T)(previous) : value

export function useGroupedSettings<Settings extends Record<string, unknown>>(
  initialSettings: Settings
) {
  const [settings, setSettings] = useState(initialSettings)

  const setSetting = useCallback(
    <Key extends keyof Settings>(
      key: Key,
      value: SetStateAction<Settings[Key]>
    ) => {
      setSettings((previous) => ({
        ...previous,
        [key]: resolveSettingValue(value, previous[key]),
      }))
    },
    []
  )

  return [settings, setSettings, setSetting] as const
}
