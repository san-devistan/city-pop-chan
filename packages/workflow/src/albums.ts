import { spawn } from "node:child_process"
import type { Dirent, Stats } from "node:fs"
import {
  access,
  mkdir,
  readdir,
  readFile,
  rm,
  stat,
  writeFile,
} from "node:fs/promises"
import path from "node:path"
import { fileURLToPath } from "node:url"

import {
  COVER_VARIANT_DEFINITIONS,
  type WorkflowCoverAspectRatio,
  type WorkflowCoverVariant,
} from "./cover-variants.ts"

const ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../.."
)
const GENERATED = path.join(ROOT, "generated")
const GENERATED_FOLDER_NAME_PATTERN = /^[\p{L}\p{N}._-]+$/u

export type WorkflowAlbumTrack = {
  duration: number | null
  name: string
  title: string
  url: string
}

export type WorkflowYoutubeUpload = {
  privacy: string
  status: "uploaded"
  uploadedAt: string
  url: string
  videoId: string
}

export type WorkflowDistroKidPublish = {
  artworkFile: string
  manifestFile: string
  packageDirectory: string
  preparedAt: string
  status: "prepared"
  trackCount: number
  uploadUrl: string
  warnings: Array<string>
}

export type { WorkflowCoverAspectRatio, WorkflowCoverVariant }

export type WorkflowAlbum = {
  cover: string | null
  coverAspectRatio: WorkflowCoverAspectRatio
  coverLeftText: string
  coverVariants: Array<WorkflowCoverVariant>
  coverPrompt: string
  coverRightText: string
  coverTopText: string
  createdAt: number
  distrokidPublish: WorkflowDistroKidPublish | null
  folder: string
  title: string
  tracks: Array<WorkflowAlbumTrack>
  updatedAt: number
  video: string | null
  videoDescription: string | null
  videoImageText: string
  videoTitle: string
  youtubeUpload: WorkflowYoutubeUpload | null
}

const DEFAULT_COVER_ASPECT_RATIO: WorkflowCoverAspectRatio = "16:9"

export async function listAlbums() {
  await mkdir(GENERATED, { recursive: true })
  const entries = await readdir(GENERATED, { withFileTypes: true })
  const albums = await Promise.all(
    entries
      .filter((entry) => entry.isDirectory() && !entry.name.startsWith("."))
      .map((entry) => readAlbum(entry.name).catch(() => null))
  )

  return albums
    .filter((album): album is WorkflowAlbum => Boolean(album))
    .toSorted(
      (left, right) =>
        right.createdAt - left.createdAt ||
        right.updatedAt - left.updatedAt ||
        right.title.localeCompare(left.title)
    )
}

export async function readAlbum(folder: string): Promise<WorkflowAlbum> {
  const directory = resolveGeneratedFolder(folder)
  const entries = await readdir(directory, { withFileTypes: true })
  const tracks = entries
    .filter(
      (entry) => entry.isFile() && entry.name.toLowerCase().endsWith(".mp3")
    )
    .map((entry) => ({
      name: entry.name,
      title: entry.name.replace(/\.mp3$/i, "").replaceAll("-", " "),
      url: mediaUrl(folder, entry.name),
    }))
    .toSorted((left, right) =>
      left.name.localeCompare(right.name, undefined, {
        numeric: true,
        sensitivity: "base",
      })
    )

  if (tracks.length === 0) {
    throw new Error(`No MP3 tracks found in ${folder}`)
  }

  const metadata = await readAlbumMetadata(directory)
  const trackDurations = await readTrackDurations(directory, tracks, metadata)
  const coverVariants = await findCoverVariants(directory, folder)
  const updatedAt = await latestAlbumUpdatedAt(
    directory,
    entries,
    coverVariants
  )
  const createdAt =
    readCreatedAt(metadata) || (await inferAlbumCreatedAt(directory, entries))
  const cover = coverVariants.find((variant) => variant.kind === "widescreen")
  const video = await findExistingFile(path.join(directory, "youtube"), [
    `${folder}.mp4`,
  ])
  const videoDescription = await findExistingFile(
    path.join(directory, "youtube"),
    [`${folder}-description.txt`]
  )
  const coverAspectRatio = readCoverAspectRatio(metadata)
  const coverLeftText = readCoverText(metadata, "coverLeftText")
  const coverPrompt = readCoverPrompt(metadata)
  const coverRightText = readCoverText(metadata, "coverRightText")
  const coverTopText = readCoverText(metadata, "coverTopText")
  const distrokidPublish = readDistroKidPublish(metadata)
  const videoImageText = readVideoImageText(metadata)
  const videoTitle = readVideoTitle(metadata)
  const youtubeUpload = readYoutubeUpload(metadata)

  return {
    cover: cover?.url || null,
    coverAspectRatio,
    coverLeftText,
    coverVariants,
    coverPrompt,
    coverRightText,
    coverTopText,
    createdAt,
    distrokidPublish,
    folder,
    title: folder.replaceAll("-", " "),
    tracks: tracks.map((track) => ({
      ...track,
      duration: trackDurations[track.name] ?? null,
    })),
    updatedAt,
    video: video ? mediaUrl(folder, `youtube/${video}`) : null,
    videoDescription: videoDescription
      ? await readFile(
          path.join(directory, "youtube", videoDescription),
          "utf8"
        )
      : null,
    videoImageText,
    videoTitle,
    youtubeUpload,
  }
}

export async function updateAlbumMetadata(
  folder: string,
  patch: Record<string, unknown>
) {
  const directory = resolveGeneratedFolder(folder)
  const metadata = (await readAlbumMetadata(directory)) || {}
  const createdAt =
    readCreatedAt(metadata) ||
    (await inferAlbumCreatedAtForDirectory(directory))
  const nextMetadata = {
    folder,
    title: folder.replaceAll("-", " "),
    version: 1,
    ...metadata,
    ...patch,
    createdAt: new Date(createdAt).toISOString(),
  }

  await writeFile(
    path.join(directory, "album.json"),
    `${JSON.stringify(nextMetadata, null, 2)}\n`
  )

  return nextMetadata
}

export async function registerAlbumCreatedAt(folder: string) {
  return updateAlbumMetadata(folder, {})
}

export function resolveGeneratedFolder(folder: string) {
  if (!isGeneratedFolderName(folder)) {
    throw new Error("Invalid generated folder name.")
  }

  const directory = path.resolve(GENERATED, folder)
  const relative = path.relative(GENERATED, directory)

  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error("Generated folder must stay inside generated/.")
  }

  return directory
}

function isGeneratedFolderName(folder: string) {
  return (
    folder !== "." &&
    folder !== ".." &&
    GENERATED_FOLDER_NAME_PATTERN.test(folder)
  )
}

export function resolveGeneratedMediaFile(folder: string, file: string) {
  const albumDirectory = resolveGeneratedFolder(folder)
  const target = path.resolve(albumDirectory, file)
  const relative = path.relative(albumDirectory, target)

  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error("Invalid generated media path.")
  }

  return target
}

export async function readGeneratedMediaFile(folder: string, file: string) {
  const target = resolveGeneratedMediaFile(folder, file)

  return {
    bytes: await readFile(target),
    contentType: contentType(target),
  }
}

export async function deleteGeneratedTrack(folder: string, file: string) {
  if (
    path.dirname(file) !== "." ||
    path.extname(file).toLowerCase() !== ".mp3"
  ) {
    throw new Error("Only album MP3 tracks can be deleted.")
  }

  const target = resolveGeneratedMediaFile(folder, file)

  await rm(target)

  return {
    file,
    folder,
  }
}

export async function deleteGeneratedAlbum(folder: string) {
  const directory = resolveGeneratedFolder(folder)
  const details = await stat(directory)

  if (!details.isDirectory()) {
    throw new Error("Only generated album folders can be deleted.")
  }

  await rm(directory, { recursive: true })

  return { folder }
}

export function mediaUrl(folder: string, file: string) {
  const params = new URLSearchParams({ file, folder })

  return `/api/suno/media?${params.toString()}`
}

async function findExistingFile(directory: string, names: Array<string>) {
  const results = await Promise.all(
    names.map(async (name) => {
      try {
        await access(path.join(directory, name))
        return name
      } catch {
        return null
      }
    })
  )

  return results.find(Boolean) || null
}

async function findCoverVariants(directory: string, folder: string) {
  const variants = await Promise.all(
    COVER_VARIANT_DEFINITIONS.map(async (definition) => {
      const file = await findExistingFile(directory, definition.files)

      if (!file) {
        return null
      }

      return {
        aspectRatio: definition.aspectRatio,
        file,
        kind: definition.kind,
        label: definition.label,
        url: mediaUrl(folder, file),
      }
    })
  )

  return variants.filter((variant): variant is WorkflowCoverVariant =>
    Boolean(variant)
  )
}

async function latestAlbumUpdatedAt(
  directory: string,
  entries: Array<Dirent>,
  coverVariants: Array<WorkflowCoverVariant>
) {
  const fileNames = new Set(
    entries.filter((entry) => entry.isFile()).map((entry) => entry.name)
  )

  for (const variant of coverVariants) {
    fileNames.add(variant.file)
  }

  const stats = await Promise.all([
    stat(directory).catch(() => null),
    ...Array.from(fileNames, (fileName) =>
      stat(path.join(directory, fileName)).catch(() => null)
    ),
  ])

  return Math.max(...stats.map((fileStat) => fileStat?.mtimeMs ?? 0))
}

async function inferAlbumCreatedAtForDirectory(directory: string) {
  const entries = await readdir(directory, { withFileTypes: true })

  return inferAlbumCreatedAt(directory, entries)
}

async function inferAlbumCreatedAt(directory: string, entries: Array<Dirent>) {
  const fileNames = entries
    .filter((entry) => entry.isFile())
    .map((entry) => entry.name)
  const stats = await Promise.all([
    stat(directory).catch(() => null),
    ...fileNames.map((fileName) =>
      stat(path.join(directory, fileName)).catch(() => null)
    ),
  ])
  const createdAtTimes = stats.flatMap((fileStat) =>
    fileStat ? [statCreatedAt(fileStat)] : []
  )

  return Math.min(...createdAtTimes, Date.now())
}

function statCreatedAt(fileStat: Stats) {
  if (Number.isFinite(fileStat.birthtimeMs) && fileStat.birthtimeMs > 0) {
    return fileStat.birthtimeMs
  }

  if (Number.isFinite(fileStat.ctimeMs) && fileStat.ctimeMs > 0) {
    return fileStat.ctimeMs
  }

  return fileStat.mtimeMs
}

function readYoutubeUpload(
  metadata: Record<string, unknown> | null
): WorkflowYoutubeUpload | null {
  if (!metadata || !isRecord(metadata.youtubeUpload)) {
    return null
  }

  const data = metadata.youtubeUpload

  if (!isRecord(data) || data.status !== "uploaded") {
    return null
  }

  if (
    typeof data.privacy !== "string" ||
    typeof data.uploadedAt !== "string" ||
    typeof data.url !== "string" ||
    typeof data.videoId !== "string"
  ) {
    return null
  }

  return {
    privacy: data.privacy,
    status: "uploaded",
    uploadedAt: data.uploadedAt,
    url: data.url,
    videoId: data.videoId,
  }
}

function readDistroKidPublish(
  metadata: Record<string, unknown> | null
): WorkflowDistroKidPublish | null {
  if (!metadata || !isRecord(metadata.distrokidPublish)) {
    return null
  }

  const data = metadata.distrokidPublish

  if (!isRecord(data) || data.status !== "prepared") {
    return null
  }

  if (
    typeof data.artworkFile !== "string" ||
    typeof data.manifestFile !== "string" ||
    typeof data.packageDirectory !== "string" ||
    typeof data.preparedAt !== "string" ||
    typeof data.trackCount !== "number" ||
    typeof data.uploadUrl !== "string"
  ) {
    return null
  }

  return {
    artworkFile: data.artworkFile,
    manifestFile: data.manifestFile,
    packageDirectory: data.packageDirectory,
    preparedAt: data.preparedAt,
    status: "prepared",
    trackCount: data.trackCount,
    uploadUrl: data.uploadUrl,
    warnings: Array.isArray(data.warnings)
      ? data.warnings.filter((warning): warning is string => {
          return typeof warning === "string"
        })
      : [],
  }
}

function readCoverPrompt(metadata: Record<string, unknown> | null) {
  return metadata && typeof metadata.coverPrompt === "string"
    ? metadata.coverPrompt
    : ""
}

function readCoverText(
  metadata: Record<string, unknown> | null,
  field: "coverLeftText" | "coverRightText" | "coverTopText"
) {
  return metadata && typeof metadata[field] === "string" ? metadata[field] : ""
}

function readCoverAspectRatio(metadata: Record<string, unknown> | null) {
  if (!metadata || typeof metadata.coverAspectRatio !== "string") {
    return DEFAULT_COVER_ASPECT_RATIO
  }

  return normalizeCoverAspectRatio(metadata.coverAspectRatio)
}

function normalizeCoverAspectRatio(value: string): WorkflowCoverAspectRatio {
  if (value.trim() === "16:9" || value.trim() === "16/9") {
    return "16:9"
  }

  return DEFAULT_COVER_ASPECT_RATIO
}

function readVideoTitle(metadata: Record<string, unknown> | null) {
  return metadata && typeof metadata.videoTitle === "string"
    ? metadata.videoTitle
    : ""
}

function readVideoImageText(metadata: Record<string, unknown> | null) {
  return metadata && typeof metadata.videoImageText === "string"
    ? metadata.videoImageText
    : ""
}

function readCreatedAt(metadata: Record<string, unknown> | null) {
  if (!metadata) {
    return 0
  }

  if (typeof metadata.createdAt === "number") {
    return Number.isFinite(metadata.createdAt) && metadata.createdAt > 0
      ? metadata.createdAt
      : 0
  }

  if (typeof metadata.createdAt !== "string") {
    return 0
  }

  const createdAt = Date.parse(metadata.createdAt)

  return Number.isFinite(createdAt) ? createdAt : 0
}

async function readTrackDurations(
  directory: string,
  tracks: Array<Omit<WorkflowAlbumTrack, "duration">>,
  metadata: Record<string, unknown> | null
) {
  const cachedDurations = readCachedTrackDurations(metadata)
  const entries = await Promise.all(
    tracks.map(async (track) => [
      track.name,
      cachedDurations[track.name] ??
        (await readTrackDuration(directory, track)),
    ])
  )

  return Object.fromEntries(entries)
}

function readCachedTrackDurations(metadata: Record<string, unknown> | null) {
  if (!metadata || !isRecord(metadata.trackDurations)) {
    return {}
  }

  return Object.fromEntries(
    Object.entries(metadata.trackDurations).flatMap(([name, duration]) =>
      isPositiveDuration(duration) ? [[name, duration]] : []
    )
  )
}

async function readTrackDuration(
  directory: string,
  track: Omit<WorkflowAlbumTrack, "duration">
) {
  try {
    const stdout = await captureCommand("ffprobe", [
      "-v",
      "error",
      "-show_entries",
      "format=duration",
      "-of",
      "default=noprint_wrappers=1:nokey=1",
      path.join(directory, track.name),
    ])
    const duration = Number(stdout.trim())

    return isPositiveDuration(duration) ? duration : null
  } catch {
    return null
  }
}

function isPositiveDuration(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0
}

function captureCommand(command: string, args: Array<string>) {
  return new Promise<string>((resolve, reject) => {
    const child = spawn(command, args, { stdio: ["ignore", "pipe", "pipe"] })
    let stdout = ""
    let stderr = ""

    child.stdout.setEncoding("utf8")
    child.stderr.setEncoding("utf8")
    child.stdout.on("data", (chunk) => {
      stdout += chunk
    })
    child.stderr.on("data", (chunk) => {
      stderr += chunk
    })
    child.on("error", reject)
    child.on("close", (code) => {
      if (code === 0) {
        resolve(stdout)
        return
      }

      reject(new Error(stderr.trim() || `${command} exited with ${code}`))
    })
  })
}

async function readAlbumMetadata(
  directory: string
): Promise<Record<string, unknown> | null> {
  try {
    const data: unknown = JSON.parse(
      await readFile(path.join(directory, "album.json"), "utf8")
    )

    return isRecord(data) ? data : null
  } catch {
    return null
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null
}

function contentType(file: string) {
  const extension = path.extname(file).toLowerCase()

  return (
    {
      ".jpeg": "image/jpeg",
      ".jpg": "image/jpeg",
      ".json": "application/json",
      ".mp3": "audio/mpeg",
      ".mp4": "video/mp4",
      ".png": "image/png",
      ".webp": "image/webp",
    }[extension] || "application/octet-stream"
  )
}
