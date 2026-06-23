import { api } from "@/lib/suno-studio"

export type StudioSettings = {
  appleMusicUrl: string
  artistName: string
  deezerUrl: string
  spotifyUrl: string
  youtubeChannelUrl: string
  youtubeMusicUrl: string
  youtubeStudioUrl: string
}

type StudioSettingsInput = Partial<Record<keyof StudioSettings, unknown>>

export const EMPTY_STUDIO_SETTINGS = {
  appleMusicUrl: "",
  artistName: "",
  deezerUrl: "",
  spotifyUrl: "",
  youtubeChannelUrl: "",
  youtubeMusicUrl: "",
  youtubeStudioUrl: "",
} satisfies StudioSettings

export async function fetchStudioSettings() {
  const data = await api<{ settings: StudioSettings }>("/api/suno/settings")

  return normalizeStudioSettings(data.settings)
}

export async function saveStudioSettings(settings: StudioSettings) {
  const data = await api<{ settings: StudioSettings }>(
    "/api/suno/settings",
    settings
  )

  return normalizeStudioSettings(data.settings)
}

function normalizeStudioSettings(settings: StudioSettingsInput = {}) {
  return {
    appleMusicUrl: normalizeText(settings.appleMusicUrl),
    artistName: normalizeTitle(settings.artistName),
    deezerUrl: normalizeText(settings.deezerUrl),
    spotifyUrl: normalizeText(settings.spotifyUrl),
    youtubeChannelUrl: normalizeText(settings.youtubeChannelUrl),
    youtubeMusicUrl: normalizeText(settings.youtubeMusicUrl),
    youtubeStudioUrl: normalizeText(settings.youtubeStudioUrl),
  } satisfies StudioSettings
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
