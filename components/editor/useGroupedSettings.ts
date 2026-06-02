"use client"

import { useCallback, useState, type SetStateAction } from "react"

const resolveSettingValue = <T>(value: SetStateAction<T>, previous: T) =>
  typeof value === "function" ? (value as (current: T) => T)(previous) : value

const isPlainRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value)

const shallowEqualRecord = (
  a: Record<string, unknown>,
  b: Record<string, unknown>
) => {
  const aKeys = Object.keys(a)
  const bKeys = Object.keys(b)
  if (aKeys.length !== bKeys.length) return false
  return aKeys.every((key) => Object.is(a[key], b[key]))
}

const isSameSettingValue = <T>(previous: T, next: T) => {
  if (Object.is(previous, next)) return true
  if (!isPlainRecord(previous) || !isPlainRecord(next)) return false
  return shallowEqualRecord(previous, next)
}

export function useGroupedSettings<Settings extends Record<string, unknown>>(
  initialSettings: Settings
) {
  const [settings, setSettings] = useState(initialSettings)

  const setSetting = useCallback(
    <Key extends keyof Settings>(
      key: Key,
      value: SetStateAction<Settings[Key]>
    ) => {
      setSettings((previous) => {
        const nextValue = resolveSettingValue(value, previous[key])
        if (isSameSettingValue(previous[key], nextValue)) return previous

        return {
          ...previous,
          [key]: nextValue,
        }
      })
    },
    []
  )

  return [settings, setSettings, setSetting] as const
}
