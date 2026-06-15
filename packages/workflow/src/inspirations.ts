import { randomUUID } from "node:crypto"
import { mkdir, readdir, readFile, rm, stat, writeFile } from "node:fs/promises"
import path from "node:path"
import { fileURLToPath } from "node:url"

const ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../.."
)
const INSPIRATION = path.join(ROOT, "inspiration")
const METADATA_FILE = "metadata.json"
const DEFAULTS_FILE = "defaults.json"

export type WorkflowInspirationKind = "cover" | "videoTitle"
export type WorkflowInspirationSource = "photo" | "youtube"

export type WorkflowInspiration = {
  id: string
  kind: WorkflowInspirationKind
  source: WorkflowInspirationSource
  thumbnail: string | null
  thumbnailSourceUrl: string
  title: string
  url: string
}

export type WorkflowInspirationDefaults = {
  coverLeftText: string
  coverPrompt: string
  coverRightText: string
  coverTopText: string
  videoDescription: string
  videoImageText: string
  videoTitle: string
}

export type SaveYoutubeInspirationInput = {
  kinds?: Array<WorkflowInspirationKind>
  thumbnailUrl: string
  title: string
  url: string
  videoId: string
}

export type SavePhotoInspirationInput = {
  bytes: Buffer
  contentType: string
  fileName: string
  sourceUrl?: string
  title?: string
  url?: string
}

export type SaveRemotePhotoInspirationInput = {
  imageUrl: string
  title?: string
  url?: string
}

type StoredInspiration = Omit<WorkflowInspiration, "thumbnail"> & {
  thumbnailFile: string | null
}

type StoredInspirationMetadata = Omit<StoredInspiration, "kind"> & {
  kind?: WorkflowInspirationKind
}

type SavedThumbnail = {
  fileName: string
  sourceUrl: string
}

export async function listInspirations() {
  await mkdir(INSPIRATION, { recursive: true })
  const entries = await readdir(INSPIRATION, { withFileTypes: true })
  const inspirations = await Promise.all(
    entries
      .filter((entry) => entry.isDirectory() && !entry.name.startsWith("."))
      .map(async (entry) => {
        const directory = resolveInspirationFolder(entry.name)
        const [inspiration, metadataStat] = await Promise.all([
          readStoredInspiration(entry.name).catch(() => null),
          stat(path.join(directory, METADATA_FILE)).catch(() => null),
        ])

        return inspiration
          ? {
              inspiration,
              sortTimeMs: metadataStat?.mtimeMs || 0,
            }
          : null
      })
  )

  return inspirations
    .filter(
      (
        entry
      ): entry is { inspiration: WorkflowInspiration; sortTimeMs: number } =>
        Boolean(entry)
    )
    .toSorted((left, right) => right.sortTimeMs - left.sortTimeMs)
    .map((entry) => entry.inspiration)
}

export async function saveYoutubeInspirations(
  input: SaveYoutubeInspirationInput
) {
  const videoId = normalizeVideoId(input.videoId || videoIdFromUrl(input.url))
  const title = input.title.trim() || "Untitled YouTube video"
  const kinds = normalizeInspirationKinds(input.kinds)

  return Promise.all(
    kinds.map((kind) =>
      writeYoutubeInspiration({ ...input, title, videoId }, kind)
    )
  )
}

export async function saveYoutubeInspiration(
  input: SaveYoutubeInspirationInput
) {
  const [inspiration] = await saveYoutubeInspirations({
    ...input,
    kinds: input.kinds && input.kinds.length > 0 ? input.kinds : ["cover"],
  })

  if (!inspiration) {
    throw new Error("Choose at least one YouTube inspiration type.")
  }

  return inspiration
}

async function writeYoutubeInspiration(
  input: SaveYoutubeInspirationInput & { title: string; videoId: string },
  kind: WorkflowInspirationKind
) {
  const id = `${slugify(input.title)}-${input.videoId}-${kind === "cover" ? "cover" : "title"}`
  const directory = resolveInspirationFolder(id)
  await mkdir(directory, { recursive: true })
  const thumbnail = await saveThumbnail(directory, {
    thumbnailUrl: input.thumbnailUrl,
    videoId: input.videoId,
  })
  const stored: StoredInspiration = {
    id,
    kind,
    source: "youtube",
    thumbnailFile: thumbnail?.fileName || null,
    thumbnailSourceUrl:
      thumbnail?.sourceUrl ||
      input.thumbnailUrl.trim() ||
      fallbackYoutubeThumbnailUrl(input.videoId),
    title: normalizeTitle(input.title),
    url: input.url.trim() || `https://www.youtube.com/watch?v=${input.videoId}`,
  }

  await writeFile(
    path.join(directory, METADATA_FILE),
    `${JSON.stringify(stored, null, 2)}\n`
  )

  const inspiration = publicInspiration(stored)

  if (!inspiration) {
    throw new Error("Could not save YouTube inspiration.")
  }

  return inspiration
}

export async function savePhotoInspirations(
  inputs: Array<SavePhotoInspirationInput>
) {
  return Promise.all(inputs.map((input) => writePhotoInspiration(input)))
}

export async function savePhotoInspiration(input: SavePhotoInspirationInput) {
  const [inspiration] = await savePhotoInspirations([input])

  return inspiration
}

export async function saveRemotePhotoInspiration(
  input: SaveRemotePhotoInspirationInput
) {
  const imageUrl = normalizeRemoteImageUrl(input.imageUrl)
  const image = await downloadImage(imageUrl)

  if (!image) {
    throw new Error("Could not download the remote inspiration image.")
  }

  return writePhotoInspiration({
    bytes: image.bytes,
    contentType: image.contentType,
    fileName: fileNameFromRemoteImageUrl(imageUrl),
    sourceUrl: imageUrl,
    title: input.title,
    url: normalizeRemotePageUrl(input.url) || imageUrl,
  })
}

async function writePhotoInspiration(input: SavePhotoInspirationInput) {
  const title =
    normalizeTitle(input.title || titleFromFileName(input.fileName)) ||
    "Uploaded inspiration"
  const id = `${slugify(title)}-${randomUUID().slice(0, 8)}`
  const directory = resolveInspirationFolder(id)
  const contentTypeHeader = normalizeImageContentType(input.contentType)
  const fileName = `thumbnail.${extensionForContentType(contentTypeHeader)}`
  const stored: StoredInspiration = {
    id,
    kind: "cover",
    source: "photo",
    thumbnailFile: fileName,
    thumbnailSourceUrl: input.sourceUrl || "",
    title,
    url: input.url || "",
  }

  if (input.bytes.byteLength === 0) {
    throw new Error("Uploaded inspiration image is empty.")
  }

  if (input.bytes.byteLength > 20 * 1024 * 1024) {
    throw new Error("Uploaded inspiration image must be under 20 MB.")
  }

  await mkdir(directory, { recursive: true })
  await writeFile(path.join(directory, fileName), input.bytes)
  await writeFile(
    path.join(directory, METADATA_FILE),
    `${JSON.stringify(stored, null, 2)}\n`
  )

  return publicInspiration(stored)
}

export async function deleteInspiration(id: string) {
  const directory = resolveInspirationFolder(id)

  await rm(directory, { force: true, recursive: true })

  return { id }
}

export function resolveInspirationFolder(id: string) {
  if (!/^[\w.-]+$/.test(id)) {
    throw new Error("Invalid inspiration id.")
  }

  const directory = path.resolve(INSPIRATION, id)
  const relative = path.relative(INSPIRATION, directory)

  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error("Inspiration folder must stay inside inspiration/.")
  }

  return directory
}

export function resolveInspirationMediaFile(id: string, file: string) {
  const directory = resolveInspirationFolder(id)
  const target = path.resolve(directory, file)
  const relative = path.relative(directory, target)

  if (
    relative.startsWith("..") ||
    path.isAbsolute(relative) ||
    path.basename(file) !== file
  ) {
    throw new Error("Invalid inspiration media path.")
  }

  return target
}

export async function readInspirationMediaFile(id: string, file: string) {
  const target = resolveInspirationMediaFile(id, file)

  return {
    bytes: await readFile(target),
    contentType: contentType(target),
  }
}

export async function readInspirationReferenceImage(id: string) {
  const stored = await readStoredMetadata(resolveInspirationFolder(id))

  if (stored?.kind !== "cover") {
    throw new Error("Cover inspiration image not found.")
  }

  if (!stored?.thumbnailFile) {
    throw new Error("Inspiration image not found.")
  }

  return {
    ...(await readInspirationMediaFile(id, stored.thumbnailFile)),
    inspiration: publicInspiration(stored),
  }
}

export async function readInspirationDefaults() {
  try {
    const data: unknown = JSON.parse(
      await readFile(path.join(INSPIRATION, DEFAULTS_FILE), "utf8")
    )

    if (!isRecord(data)) {
      return emptyInspirationDefaults()
    }

    return {
      coverLeftText: normalizeMultilineTitle(stringValue(data.coverLeftText)),
      coverPrompt: stringValue(data.coverPrompt),
      coverRightText: normalizeMultilineTitle(stringValue(data.coverRightText)),
      coverTopText: normalizeTitle(stringValue(data.coverTopText)),
      videoDescription: stringValue(data.videoDescription),
      videoImageText: normalizeTitle(stringValue(data.videoImageText)),
      videoTitle: normalizeTitle(stringValue(data.videoTitle)),
    } satisfies WorkflowInspirationDefaults
  } catch {
    return emptyInspirationDefaults()
  }
}

export async function writeInspirationDefaults(
  defaults: WorkflowInspirationDefaults
) {
  const stored = {
    coverLeftText: normalizeMultilineTitle(defaults.coverLeftText),
    coverPrompt: normalizePrompt(defaults.coverPrompt),
    coverRightText: normalizeMultilineTitle(defaults.coverRightText),
    coverTopText: normalizeTitle(defaults.coverTopText),
    videoDescription: normalizePrompt(defaults.videoDescription),
    videoImageText: normalizeTitle(defaults.videoImageText),
    videoTitle: normalizeTitle(defaults.videoTitle),
  } satisfies WorkflowInspirationDefaults

  await mkdir(INSPIRATION, { recursive: true })
  await writeFile(
    path.join(INSPIRATION, DEFAULTS_FILE),
    `${JSON.stringify(stored, null, 2)}\n`
  )

  return stored
}

function inspirationMediaUrl(id: string, file: string) {
  const params = new URLSearchParams({ file, id })

  return `/inspiration-assets/asset?${params.toString()}`
}

async function readStoredInspiration(id: string) {
  return publicInspiration(
    await readStoredMetadata(resolveInspirationFolder(id))
  )
}

async function readStoredMetadata(directory: string) {
  try {
    const data: unknown = JSON.parse(
      await readFile(path.join(directory, METADATA_FILE), "utf8")
    )

    if (!isStoredInspiration(data)) {
      return null
    }

    return normalizeStoredInspiration(data)
  } catch {
    return null
  }
}

function normalizeStoredInspiration(stored: StoredInspirationMetadata) {
  return {
    id: stored.id,
    kind: stored.kind || "cover",
    source: stored.source,
    thumbnailFile: stored.thumbnailFile,
    thumbnailSourceUrl: stored.thumbnailSourceUrl || "",
    title: normalizeTitle(stored.title),
    url: stored.url,
  } satisfies StoredInspiration
}

function publicInspiration(stored: StoredInspiration | null) {
  if (!stored) {
    return null
  }

  return {
    id: stored.id,
    kind: stored.kind,
    source: stored.source,
    thumbnail: stored.thumbnailFile
      ? inspirationMediaUrl(stored.id, stored.thumbnailFile)
      : null,
    thumbnailSourceUrl: stored.thumbnailSourceUrl,
    title: stored.title,
    url: stored.url,
  } satisfies WorkflowInspiration
}

function normalizeInspirationKinds(
  kinds: Array<WorkflowInspirationKind> | undefined
): Array<WorkflowInspirationKind> {
  const selected = Array.from(new Set(kinds || [])).filter(isInspirationKind)

  return selected.length > 0 ? selected : ["cover"]
}

function emptyInspirationDefaults() {
  return {
    coverLeftText: "",
    coverPrompt: "",
    coverRightText: "",
    coverTopText: "",
    videoDescription: "",
    videoImageText: "",
    videoTitle: "",
  } satisfies WorkflowInspirationDefaults
}

function normalizePrompt(value: string) {
  return value.replace(/\r\n?/g, "\n").trim()
}

function isInspirationKind(value: unknown): value is WorkflowInspirationKind {
  return value === "cover" || value === "videoTitle"
}

async function saveThumbnail(
  directory: string,
  input: { thumbnailUrl: string; videoId: string }
): Promise<SavedThumbnail | null> {
  await mkdir(directory, { recursive: true })

  const downloads = await Promise.all(
    thumbnailCandidates(input).map(async (url) => ({
      thumbnail: await downloadThumbnail(url).catch(() => null),
      url,
    }))
  )
  const selected = downloads.find((download) => download.thumbnail)

  if (!selected?.thumbnail) {
    return null
  }

  const fileName = `thumbnail.${extensionForContentType(
    selected.thumbnail.contentType
  )}`

  await writeFile(path.join(directory, fileName), selected.thumbnail.bytes)

  return {
    fileName,
    sourceUrl: selected.url,
  }
}

function thumbnailCandidates(input: { thumbnailUrl: string; videoId: string }) {
  const urls = [
    `https://i.ytimg.com/vi/${input.videoId}/maxresdefault.jpg`,
    `https://i.ytimg.com/vi/${input.videoId}/hq720.jpg`,
    `https://i.ytimg.com/vi/${input.videoId}/sddefault.jpg`,
    input.thumbnailUrl.trim(),
    fallbackYoutubeThumbnailUrl(input.videoId),
  ].filter(Boolean)

  return [...new Set(urls)]
}

function fallbackYoutubeThumbnailUrl(videoId: string) {
  return `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`
}

async function downloadThumbnail(url: string) {
  return downloadImage(url, { minBytes: 8_000 })
}

async function downloadImage(url: string, options: { minBytes?: number } = {}) {
  const response = await fetch(url, { signal: AbortSignal.timeout(30000) })

  if (!response.ok) {
    return null
  }

  normalizeRemoteImageUrl(response.url)

  const contentTypeHeader = response.headers.get("content-type") || ""

  const imageContentType = normalizeImageContentType(contentTypeHeader)
  const contentLength = Number(response.headers.get("content-length") || 0)

  if (contentLength > 20 * 1024 * 1024) {
    return null
  }

  const bytes = Buffer.from(await response.arrayBuffer())

  if (bytes.byteLength < (options.minBytes || 1)) {
    return null
  }

  if (bytes.byteLength > 20 * 1024 * 1024) {
    return null
  }

  return {
    bytes,
    contentType: imageContentType,
  }
}

function normalizeTitle(value: string) {
  return value.replace(/\s+/g, " ").trim()
}

function normalizeMultilineTitle(value: string) {
  return value
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .map((line) => line.replace(/[^\S\n]+/g, " ").trim())
    .join("\n")
    .trim()
}

function titleFromFileName(fileName: string) {
  return path
    .basename(fileName)
    .replace(/\.[^.]+$/, "")
    .replace(/[-_]+/g, " ")
}

function videoIdFromUrl(url: string) {
  try {
    const parsed = new URL(url)

    if (parsed.hostname.includes("youtu.be")) {
      return parsed.pathname.slice(1)
    }

    return parsed.searchParams.get("v") || ""
  } catch {
    return ""
  }
}

function normalizeVideoId(value: string) {
  const videoId = value.trim()

  if (!/^[A-Za-z0-9_-]{6,32}$/.test(videoId)) {
    throw new Error("Invalid YouTube video id.")
  }

  return videoId
}

function slugify(value: string) {
  const slug = value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 72)
    .replace(/-+$/g, "")
    .toLowerCase()

  return slug || "youtube"
}

function fileNameFromRemoteImageUrl(url: string) {
  try {
    const parsed = new URL(url)
    const fileName = path.basename(parsed.pathname)

    return fileName || "remote-inspiration"
  } catch {
    return "remote-inspiration"
  }
}

function normalizeRemoteImageUrl(value: string) {
  const url = normalizeRemoteUrl(value)

  if (!url) {
    throw new Error("Remote inspiration image URL must be http or https.")
  }

  return url
}

function normalizeRemotePageUrl(value: string | undefined) {
  return normalizeRemoteUrl(value || "")
}

function normalizeRemoteUrl(value: string) {
  try {
    const parsed = new URL(value.trim())

    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return ""
    }

    if (isLocalNetworkHost(parsed.hostname)) {
      return ""
    }

    return parsed.toString()
  } catch {
    return ""
  }
}

function isLocalNetworkHost(hostname: string) {
  const host = hostname.toLowerCase().replace(/^\[|\]$/g, "")

  return isLocalHostname(host) || isPrivateIpv4Host(host)
}

function isLocalHostname(host: string) {
  return (
    host === "localhost" ||
    host === "::1" ||
    host === "0.0.0.0" ||
    host.startsWith("127.")
  )
}

function isPrivateIpv4Host(host: string) {
  const parts = host.split(".").map((part) => Number(part))

  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part))) {
    return false
  }

  const [first = 0, second = 0] = parts

  return (
    first === 10 ||
    (first === 172 && second >= 16 && second <= 31) ||
    (first === 192 && second === 168) ||
    (first === 169 && second === 254)
  )
}

function isStoredInspiration(
  value: unknown
): value is StoredInspirationMetadata {
  if (!isRecord(value)) {
    return false
  }

  return (
    (value.kind === undefined || isInspirationKind(value.kind)) &&
    (value.source === "photo" || value.source === "youtube") &&
    typeof value.id === "string" &&
    (typeof value.thumbnailSourceUrl === "string" ||
      value.thumbnailSourceUrl === undefined) &&
    typeof value.title === "string" &&
    typeof value.url === "string" &&
    (typeof value.thumbnailFile === "string" || value.thumbnailFile === null)
  )
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null
}

function stringValue(value: unknown) {
  return typeof value === "string" ? value : ""
}

function extensionForContentType(contentTypeHeader: string) {
  if (contentTypeHeader.includes("png")) {
    return "png"
  }

  if (contentTypeHeader.includes("webp")) {
    return "webp"
  }

  return "jpg"
}

function normalizeImageContentType(contentTypeHeader: string) {
  const contentTypeValue = contentTypeHeader.toLowerCase().split(";")[0].trim()

  if (
    contentTypeValue === "image/jpeg" ||
    contentTypeValue === "image/png" ||
    contentTypeValue === "image/webp"
  ) {
    return contentTypeValue
  }

  throw new Error("Upload a JPEG, PNG, or WebP inspiration image.")
}

function contentType(file: string) {
  const extension = path.extname(file).toLowerCase()

  return (
    {
      ".jpeg": "image/jpeg",
      ".jpg": "image/jpeg",
      ".png": "image/png",
      ".webp": "image/webp",
    }[extension] || "application/octet-stream"
  )
}
