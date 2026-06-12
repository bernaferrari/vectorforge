#!/usr/bin/env node

import fs from "node:fs/promises"
import path from "node:path"
import { fileURLToPath } from "node:url"

const CATALOG_URL =
  "https://raw.githubusercontent.com/bernaferrari/diagonal-wipe-icon/main/composeApp/src/commonMain/kotlin/com/bernaferrari/diagonalwipeicon/demo/MaterialWipeIconCatalog.kt"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const projectRoot = path.resolve(__dirname, "..")
const outputPath = path.join(
  projectRoot,
  "components/editor/MaterialWipePairs.generated.json"
)
const sourcePath = process.argv[2]

const readCatalogSource = async () => {
  if (sourcePath) return fs.readFile(path.resolve(sourcePath), "utf8")

  const response = await fetch(CATALOG_URL)
  if (!response.ok) {
    throw new Error(
      `Failed to download Material wipe catalog: ${response.status} ${response.statusText}`
    )
  }
  return response.text()
}

const sliceBalancedList = (source, name) => {
  const marker = `internal val ${name} = listOf(`
  const start = source.indexOf(marker)
  if (start === -1) throw new Error(`Missing Kotlin list: ${name}`)

  let depth = 1
  let inString = false
  let escaped = false
  const bodyStart = start + marker.length
  for (let index = bodyStart; index < source.length; index += 1) {
    const char = source[index]
    if (inString) {
      if (escaped) escaped = false
      else if (char === "\\") escaped = true
      else if (char === '"') inString = false
      continue
    }
    if (char === '"') inString = true
    else if (char === "(") depth += 1
    else if (char === ")") {
      depth -= 1
      if (depth === 0) return source.slice(bodyStart, index)
    }
  }

  throw new Error(`Unterminated Kotlin list: ${name}`)
}

const findPairCalls = (listBody) => {
  const calls = []
  let cursor = 0
  const marker = "MaterialWipeIconPair("

  while (true) {
    const start = listBody.indexOf(marker, cursor)
    if (start === -1) return calls

    let depth = 1
    let inString = false
    let escaped = false
    const bodyStart = start + marker.length
    let index = bodyStart
    for (; index < listBody.length; index += 1) {
      const char = listBody[index]
      if (inString) {
        if (escaped) escaped = false
        else if (char === "\\") escaped = true
        else if (char === '"') inString = false
        continue
      }
      if (char === '"') inString = true
      else if (char === "(") depth += 1
      else if (char === ")") {
        depth -= 1
        if (depth === 0) break
      }
    }

    calls.push(listBody.slice(bodyStart, index))
    cursor = index + 1
  }
}

const splitTopLevelArgs = (callBody) => {
  const args = []
  let start = 0
  let depth = 0
  let inString = false
  let escaped = false

  for (let index = 0; index < callBody.length; index += 1) {
    const char = callBody[index]
    if (inString) {
      if (escaped) escaped = false
      else if (char === "\\") escaped = true
      else if (char === '"') inString = false
      continue
    }
    if (char === '"') inString = true
    else if (char === "(") depth += 1
    else if (char === ")") depth -= 1
    else if (char === "," && depth === 0) {
      args.push(callBody.slice(start, index).trim())
      start = index + 1
    }
  }

  const lastArg = callBody.slice(start).trim()
  if (lastArg) args.push(lastArg)
  return args
}

const stripKotlinString = (value) => value.replace(/^"|"$/g, "")

const codeIconNameToMaterialName = (codeIconName) =>
  codeIconName
    .replace(/([A-Z]+)([A-Z][a-z])/g, "$1_$2")
    .replace(/([a-z])([A-Z])/g, "$1_$2")
    .replace(/([A-Za-z])([0-9])/g, "$1_$2")
    .replace(/([0-9])([A-Z])/g, "$1_$2")
    .replace(/_3x_3/g, "_3x3")
    .replace(/_2_d/g, "_2d")
    .toLowerCase()

const parsePairCall = (callBody) => {
  const args = splitTopLevelArgs(callBody)
  const namedArgs = Object.fromEntries(
    args
      .map((arg) => arg.split("=").map((part) => part.trim()))
      .filter((parts) => parts.length === 2)
      .map(([key, value]) => [key, stripKotlinString(value)])
  )
  const iconCode = (arg) => arg.replace("MaterialSymbolIcons.", "").trim()

  return {
    label: stripKotlinString(args[0]),
    enabled: codeIconNameToMaterialName(
      namedArgs.enabledCodeIconName ?? iconCode(args[1])
    ),
    disabled: codeIconNameToMaterialName(
      namedArgs.disabledCodeIconName ?? iconCode(args[2])
    ),
  }
}

const parseCatalog = (source, listName) =>
  findPairCalls(sliceBalancedList(source, listName)).map(parsePairCall)

const source = await readCatalogSource()
const catalog = {
  ready: parseCatalog(source, "coreMaterialWipeIconCatalog"),
  refinement: parseCatalog(source, "knownProblemsMaterialWipeIconCatalog"),
}

await fs.writeFile(outputPath, `${JSON.stringify(catalog, null, 2)}\n`)
console.log(
  `Wrote ${catalog.ready.length} ready pairs and ${catalog.refinement.length} refinement pairs to ${path.relative(
    projectRoot,
    outputPath
  )}.`
)
