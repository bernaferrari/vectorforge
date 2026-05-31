import type { ExportSceneSnapshot } from "./ExportSceneSnapshot"

export type ExportCodeTemplateParams = ExportSceneSnapshot

export const escapeTemplateSvg = (svg: string) =>
  svg.replace(/`/g, "\\`").trim()
