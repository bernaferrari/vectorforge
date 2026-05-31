"use client"

import { AppLayoutView } from "./AppLayoutView"
import { useAppLayoutController } from "./useAppLayoutController"

export default function AppLayout() {
  return <AppLayoutView {...useAppLayoutController()} />
}
