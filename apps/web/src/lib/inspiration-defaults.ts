export type InspirationDefaults = {
  coverLeftText: string
  coverPrompt: string
  coverRightText: string
  coverTopText: string
  videoDescription: string
  videoImageText: string
  videoTitle: string
}

export const VIDEO_TRACKLIST_TOKEN = "{{tracklist}}"
export const VIDEO_NAME_TOKEN = "{{name}}"

const DEFAULT_VIDEO_DESCRIPTION = `A long 80s-inspired city pop mix for Tokyo night drives.

Tracklist:
${VIDEO_TRACKLIST_TOKEN}

Mood: city pop, 80s style, vintage Tokyo night, neon expressway, nostalgic chill.`
const DEFAULT_VIDEO_TITLE = `𝐏𝐥𝐚𝐲𝐥𝐢𝐬𝐭 80s Japanese City Pop ☕️ ${VIDEO_NAME_TOKEN}`

export const DEFAULT_INSPIRATION_DEFAULTS = {
  coverLeftText: "WINTER HAZE\nNOSTALGIC NOIR",
  coverPrompt: `Inspire you from these image to generate an japanese, 80's vintage image, just like from a movie.
Have the image quality a little bit blurry and low contrast to have an old school image style.`,
  coverRightText: "JAPANESE R&B\nMELANCHOLY VIBE",
  coverTopText: "TOKYO CHILL LAB",
  videoDescription: DEFAULT_VIDEO_DESCRIPTION,
  videoImageText: "CITY POP",
  videoTitle: DEFAULT_VIDEO_TITLE,
} satisfies InspirationDefaults

export function normalizeInspirationDefaults(
  defaults: Partial<InspirationDefaults>
) {
  return {
    coverLeftText:
      normalizeMultilineText(defaults.coverLeftText) ||
      DEFAULT_INSPIRATION_DEFAULTS.coverLeftText,
    coverPrompt:
      normalizePrompt(defaults.coverPrompt) ||
      DEFAULT_INSPIRATION_DEFAULTS.coverPrompt,
    coverRightText:
      normalizeMultilineText(defaults.coverRightText) ||
      DEFAULT_INSPIRATION_DEFAULTS.coverRightText,
    coverTopText:
      normalizeTitle(defaults.coverTopText) ||
      DEFAULT_INSPIRATION_DEFAULTS.coverTopText,
    videoDescription: normalizeVideoDescription(defaults.videoDescription),
    videoImageText:
      normalizeTitle(defaults.videoImageText) ||
      DEFAULT_INSPIRATION_DEFAULTS.videoImageText,
    videoTitle: normalizeVideoTitle(defaults.videoTitle),
  } satisfies InspirationDefaults
}

function normalizePrompt(value = "") {
  return value.replace(/\r\n?/g, "\n").trim()
}

function normalizeVideoDescription(value = "") {
  const description =
    normalizePrompt(value) || DEFAULT_INSPIRATION_DEFAULTS.videoDescription

  return withTracklistToken(withoutNameToken(description))
}

function withTracklistToken(description: string) {
  if (description.includes(VIDEO_TRACKLIST_TOKEN)) {
    return description
  }

  return `${description}\n\n${VIDEO_TRACKLIST_TOKEN}`
}

function normalizeTitle(value = "") {
  return value.replace(/\s+/g, " ").trim()
}

function normalizeVideoTitle(value = "") {
  const title = normalizeTitle(value) || DEFAULT_INSPIRATION_DEFAULTS.videoTitle

  if (title.includes(VIDEO_NAME_TOKEN)) {
    return title
  }

  return `${title} ${VIDEO_NAME_TOKEN}`
}

function withoutNameToken(description: string) {
  return description
    .replaceAll(VIDEO_NAME_TOKEN, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
}

function normalizeMultilineText(value = "") {
  return value
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .map((line) => line.replace(/[^\S\n]+/g, " ").trim())
    .join("\n")
    .trim()
}
