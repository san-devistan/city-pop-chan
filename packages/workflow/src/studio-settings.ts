import { mkdir, readFile, writeFile } from "node:fs/promises"
import path from "node:path"
import { fileURLToPath } from "node:url"

const ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../.."
)
const SUNO = path.join(ROOT, ".suno")
const SETTINGS_FILE = path.join(SUNO, "settings.json")

export type WorkflowStudioSettings = {
  appleMusicUrl: string
  artistName: string
  deezerUrl: string
  spotifyUrl: string
  youtubeChannelUrl: string
  youtubeMusicUrl: string
  youtubeStudioUrl: string
}

type WorkflowStudioSettingsInput = Partial<
  Record<keyof WorkflowStudioSettings, unknown>
>

export const EMPTY_STUDIO_SETTINGS = {
  appleMusicUrl: "",
  artistName: "",
  deezerUrl: "",
  spotifyUrl: "",
  youtubeChannelUrl: "",
  youtubeMusicUrl: "",
  youtubeStudioUrl: "",
} satisfies WorkflowStudioSettings

export async function readStudioSettings() {
  try {
    const data: unknown = JSON.parse(await readFile(SETTINGS_FILE, "utf8"))

    return normalizeStudioSettings(isRecord(data) ? data : {})
  } catch {
    return EMPTY_STUDIO_SETTINGS
  }
}

export async function writeStudioSettings(
  settings: WorkflowStudioSettingsInput
) {
  const stored = normalizeStudioSettings(settings)

  await mkdir(SUNO, { recursive: true })
  await writeFile(SETTINGS_FILE, `${JSON.stringify(stored, null, 2)}\n`)

  return stored
}

export function normalizeStudioSettings(settings: WorkflowStudioSettingsInput) {
  return {
    appleMusicUrl: normalizeText(settings.appleMusicUrl),
    artistName: normalizeTitle(settings.artistName),
    deezerUrl: normalizeText(settings.deezerUrl),
    spotifyUrl: normalizeText(settings.spotifyUrl),
    youtubeChannelUrl: normalizeText(settings.youtubeChannelUrl),
    youtubeMusicUrl: normalizeText(settings.youtubeMusicUrl),
    youtubeStudioUrl: normalizeText(settings.youtubeStudioUrl),
  } satisfies WorkflowStudioSettings
}

function normalizeTitle(value: unknown) {
  return stringValue(value).replace(/\s+/g, " ").trim()
}

function normalizeText(value: unknown) {
  return stringValue(value).trim()
}

function stringValue(value: unknown) {
  return typeof value === "string" ? value : ""
}

function isRecord(value: unknown): value is WorkflowStudioSettingsInput {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}
