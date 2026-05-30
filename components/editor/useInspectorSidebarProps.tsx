"use client"

import { useMemo } from "react"
import type { UseInspectorSidebarPropsArgs } from "./InspectorSidebarPropsModel"
import { useGeometrySidebarProps } from "./useGeometrySidebarProps"
import { useLightSidebarProps } from "./useLightSidebarProps"
import { useStyleSidebarProps } from "./useStyleSidebarProps"
import { useTransformSidebarProps } from "./useTransformSidebarProps"

export function useInspectorSidebarProps(args: UseInspectorSidebarPropsArgs) {
  const styleProps = useStyleSidebarProps(args)
  const geometryProps = useGeometrySidebarProps(args)
  const transformProps = useTransformSidebarProps(args)
  const lightProps = useLightSidebarProps(args)

  return useMemo(
    () => ({ styleProps, geometryProps, transformProps, lightProps }),
    [styleProps, geometryProps, transformProps, lightProps]
  )
}
