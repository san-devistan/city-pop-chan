import { extractSunoClipIds } from "./suno-download.ts"

let importedIds: Array<string> = []

export function getImportedSunoIds() {
  return importedIds
}

export function setImportedSunoIds(value: string) {
  importedIds = extractSunoClipIds(value)

  return importedIds
}
