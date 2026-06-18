/* eslint-disable max-lines */
// @ts-nocheck

import { spawn } from "node:child_process"
import {
  access,
  copyFile,
  mkdir,
  mkdtemp,
  readdir,
  readFile,
  rm,
  writeFile,
} from "node:fs/promises"
import { createRequire } from "node:module"
import { tmpdir } from "node:os"
import path from "node:path"
import { fileURLToPath } from "node:url"
import sharp from "sharp"

import { updateAlbumMetadata } from "./albums.ts"
import { generateAlbumCreativeSuggestion } from "./codex-suggestions.ts"
import { normalizeCoverTitle, renderCoverTitleImage } from "./cover-variants.ts"
import { runUpload } from "./youtube-upload.ts"

const ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../.."
)
const GENERATED = path.join(ROOT, "generated")
const ALBUM_AUDIO_FILE = "album-audio.m4a"
const CITY_POP_TRACK_TITLE_COMPOSITION_ID = "CityPopTrackTitle"
const INTER_FONT_FILE = "files/inter-latin-wght-normal.woff2"
const REMOTION_INTER_FONT_FILE = "inter-latin-wght-normal.woff2"
const VIDEO_TITLE_COVER_CANDIDATES = [
  "cover-city-pop.png",
  "cover-city-pop.jpeg",
  "cover-city-pop.jpg",
  "cover-city-pop.webp",
]
const VIDEO_COVER_CANDIDATES = [
  ...VIDEO_TITLE_COVER_CANDIDATES,
  "cover.jpeg",
  "cover.jpg",
  "cover.png",
  "cover.webp",
]
const VIDEO_COVER_FILE = "cover-video.jpg"
const VIDEO_FPS = 24
const VIDEO_HEIGHT = 1080
const VIDEO_X264_PRESET = process.env.YOUTUBE_VIDEO_X264_PRESET || "veryfast"
const VIDEO_WIDTH = 1920
const THUMBNAIL_SIZE = "1280:720"
const UPLOAD_PRIVACY_STATUS = "public"
const TRACKLIST_PLACEHOLDER = "{{tracklist}}"
const VIDEO_TITLE_NAME_PLACEHOLDER = "{{name}}"
const FALLBACK_VIDEO_TITLE_NAME = "夜に溶けていく。"
const REMOTION_RENDER_TIMEOUT_MS = Number(
  process.env.REMOTION_RENDER_TIMEOUT_MS || 300_000
)
const requireRuntime = createRequire(import.meta.url)
const WORKFLOW_DIRECTORY = path.dirname(
  requireRuntime.resolve("@workspace/workflow")
)
const WORKFLOW_PACKAGE_DIRECTORY = path.resolve(WORKFLOW_DIRECTORY, "..")
const REMOTION_VIDEO_ENTRY = path.join(
  WORKFLOW_DIRECTORY,
  "remotion-youtube-video.tsx"
)
const requireWorkflowRuntime = createRequire(
  path.join(WORKFLOW_PACKAGE_DIRECTORY, "package.json")
)
const noop = () => {}

export function youtubeVideoUsage() {
  return `Usage:
  pnpm youtube:video <generated-folder> [options]

Examples:
  pnpm youtube:video Shuto-FM-Afterglow
  pnpm youtube:video generated/Shuto-FM-Afterglow
  pnpm youtube:video Shuto-FM-Afterglow --no-upload

Options:
  --title <title>           Override the YouTube title (default: folder name)
  --video-title-name <text> Override the generated {{name}} phrase
  --video-image-text <text> Text rendered on the video image
  --tags <a,b,c>            Comma-separated YouTube tags
  --category <id>           YouTube category ID
  --made-for-kids           Mark as made for kids
  --output-dir <path>       Output directory (default: <folder>/youtube)
  --force                   Regenerate existing MP4 output
  --dry-run                 Build files, then dry-run the YouTube upload
  --no-upload               Build files without uploading

Title templates may use {{name}} for a Codex-generated Japanese phrase.
Description templates may use {{tracklist}} for the tracklist.
Uploads are always public.
Requires ffmpeg. ffprobe is optional and only used for timestamped tracklists.`
}

function parseArgs(argv) {
  const options = {}
  const positionals = []

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index]

    if (arg === "--") {
      continue
    }

    if (!arg.startsWith("--")) {
      positionals.push(arg)
      continue
    }

    if (arg === "--help" || arg === "-h") {
      options.help = true
      continue
    }

    if (arg.startsWith("--no-")) {
      options[toCamelCase(arg.slice(5))] = false
      continue
    }

    const equalsIndex = arg.indexOf("=")

    if (equalsIndex !== -1) {
      options[toCamelCase(arg.slice(2, equalsIndex))] = arg.slice(
        equalsIndex + 1
      )
      continue
    }

    const key = toCamelCase(arg.slice(2))
    const next = argv[index + 1]

    if (!next || next.startsWith("--")) {
      options[key] = true
      continue
    }

    options[key] = next
    index += 1
  }

  return { options, positionals }
}

function toCamelCase(value) {
  return value.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase())
}

export async function main(argv = process.argv.slice(2)) {
  const { options, positionals } = parseArgs(argv)

  if (options.help) {
    console.log(youtubeVideoUsage())
    return
  }

  if (positionals.length !== 1) {
    throw new Error(`Expected one generated folder.\n\n${youtubeVideoUsage()}`)
  }

  await buildYoutubeVideo(positionals[0], {
    ...options,
    onLog: console.log,
  })
}

export async function buildYoutubeVideo(folder, options = {}) {
  const logs = []
  const log = typeof options.onLog === "function" ? options.onLog : noop
  const captureLog = (line) => {
    logs.push(line)
    log(line)
  }

  validateOptions(options)

  const album = await readAlbum(folder)
  const videoTitle = await videoTitleFromOptions({
    albumName: album.name,
    log: captureLog,
    options,
    tracks: album.tracks,
  })
  const videoImageText = videoImageTextFromOptions(
    options,
    album.videoImageText
  )
  const coverTextOverlays = {
    leftText: album.coverLeftText,
    rightText: album.coverRightText,
    topText: album.coverTopText,
  }

  await updateAlbumMetadata(album.name, { videoImageText, videoTitle })
  await assertCommandAvailable("ffmpeg")

  const files = await prepareOutputFiles(album, options)
  const durations = await readDurations(album.tracks)
  const tempFiles = await prepareTempFiles()

  try {
    await writeConcatFile(tempFiles.concatList, album.tracks)
    await writeFile(
      files.description,
      buildDescription({
        durations,
        options,
        tracks: album.tracks,
      })
    )

    if (options.force || !(await exists(files.video))) {
      await renderVideo({
        audio: tempFiles.audio,
        concatList: tempFiles.concatList,
        cover: album.cover,
        coverTextOverlays,
        output: files.video,
        publicDirectory: tempFiles.publicDirectory,
        tempDirectory: tempFiles.directory,
        trackDurations: durations,
        tracks: album.tracks,
        videoImageText,
        log: captureLog,
      })
    } else {
      captureLog(`Keeping existing MP4: ${relative(files.video)}`)
    }

    await cleanupLegacyOutputFiles(files)

    if (options.upload === false) {
      captureLog(`Built video: ${relative(files.video)}`)
      return {
        files: publicOutputFiles(files),
        logs: logs.join("\n"),
        uploaded: null,
      }
    }

    await prepareThumbnail({
      cover: album.cover,
      coverTextOverlays,
      log: captureLog,
      output: tempFiles.thumbnail,
      videoImageText,
    })

    const uploaded = await uploadVideo({
      albumName: album.name,
      description: files.description,
      options: {
        ...options,
        onLog: captureUploadLog(captureLog),
        title: videoTitle,
      },
      thumbnail: tempFiles.thumbnail,
      video: files.video,
    })

    await writeUploadMetadata(album.name, uploaded, {
      videoImageText,
      videoTitle,
    })

    return { files: publicOutputFiles(files), logs: logs.join("\n"), uploaded }
  } finally {
    await rm(tempFiles.directory, { force: true, recursive: true })
  }
}

function validateOptions(options) {
  if (options.privacy && options.privacy !== UPLOAD_PRIVACY_STATUS) {
    throw new Error(
      "youtube:video always uploads public. Remove --privacy or use --privacy public."
    )
  }
}

async function videoTitleFromOptions({ albumName, log, options, tracks }) {
  const title = String(options.title || "").trim() || albumName

  if (!title.includes(VIDEO_TITLE_NAME_PLACEHOLDER)) {
    return title
  }

  const videoTitleName = await videoTitleNameFromOptions({
    albumName,
    log,
    options,
    title,
    tracks,
  })

  return title.replaceAll(VIDEO_TITLE_NAME_PLACEHOLDER, videoTitleName)
}

async function videoTitleNameFromOptions({
  albumName,
  log,
  options,
  title,
  tracks,
}) {
  const explicitName = normalizeVideoTitleName(options.videoTitleName)

  if (explicitName) {
    return explicitName
  }

  log("Generating Japanese title phrase with Codex...")

  try {
    return await generateAlbumCreativeSuggestion({
      albumTitle: albumName,
      codexCommand: stringValue(options.codexCommand) || undefined,
      codexModel: stringValue(options.codexModel) || null,
      currentValue: title,
      kind: "videoTitleName",
      tracks: tracks.map((track) => ({
        title: formatTrackTitle(path.basename(track)),
      })),
    })
  } catch {
    log("Codex title phrase unavailable. Using fallback phrase.")

    return FALLBACK_VIDEO_TITLE_NAME
  }
}

function normalizeVideoTitleName(value) {
  return typeof value === "string" ? value.replace(/\s+/g, " ").trim() : ""
}

function videoImageTextFromOptions(options, fallback) {
  return normalizeCoverTitle(options.videoImageText || fallback)
}

async function readAlbum(input) {
  const directory = resolveGeneratedFolder(input)
  const entries = await readdir(directory, { withFileTypes: true })
  const tracks = entries
    .filter(
      (entry) => entry.isFile() && entry.name.toLowerCase().endsWith(".mp3")
    )
    .map((entry) => path.join(directory, entry.name))
    .toSorted((left, right) =>
      path.basename(left).localeCompare(path.basename(right), undefined, {
        numeric: true,
        sensitivity: "base",
      })
    )

  if (tracks.length === 0) {
    throw new Error(`No .mp3 files found in ${relative(directory)}`)
  }

  const cover = await findCover(directory, VIDEO_COVER_CANDIDATES)
  const metadata = await readAlbumMetadata(directory)

  return {
    cover,
    coverLeftText: stringValue(metadata?.coverLeftText),
    coverRightText: stringValue(metadata?.coverRightText),
    coverTopText: stringValue(metadata?.coverTopText),
    directory,
    name: path.basename(directory),
    tracks,
    videoImageText: stringValue(metadata?.videoImageText),
  }
}

async function findCover(directory, candidates) {
  const coverCandidates = await Promise.all(
    candidates.map(async (fileName) => {
      const cover = path.join(directory, fileName)

      return (await exists(cover)) ? cover : null
    })
  )
  const cover = coverCandidates.find(Boolean)

  if (cover) {
    return cover
  }

  throw new Error(`No cover image found in ${relative(directory)}`)
}

async function readAlbumMetadata(directory) {
  try {
    const data = JSON.parse(
      await readFile(path.join(directory, "album.json"), "utf8")
    )

    return isRecord(data) ? data : null
  } catch {
    return null
  }
}

function stringValue(value) {
  return typeof value === "string" ? value : ""
}

function resolveGeneratedFolder(input) {
  const candidate = path.isAbsolute(input)
    ? input
    : input.includes(path.sep)
      ? path.resolve(ROOT, input)
      : path.join(GENERATED, input)
  const directory = path.resolve(candidate)
  const relativeToGenerated = path.relative(GENERATED, directory)

  if (
    relativeToGenerated.startsWith("..") ||
    path.isAbsolute(relativeToGenerated)
  ) {
    throw new Error("Folder must be inside generated/")
  }

  return directory
}

async function prepareOutputFiles(album, options) {
  const outputDir = options.outputDir
    ? resolveRootPath(options.outputDir)
    : path.join(album.directory, "youtube")
  const outputBase = slugify(album.name)

  await mkdir(outputDir, { recursive: true })

  return {
    description: path.join(outputDir, `${outputBase}-description.txt`),
    legacyAudio: path.join(outputDir, `${outputBase}.mp3`),
    legacyConcatList: path.join(outputDir, `${outputBase}-concat.txt`),
    uploadMetadata: path.join(album.directory, "album.json"),
    video: path.join(outputDir, `${outputBase}.mp4`),
  }
}

async function prepareTempFiles() {
  const directory = await mkdtemp(path.join(tmpdir(), "city-pop-youtube-"))

  return {
    audio: path.join(directory, ALBUM_AUDIO_FILE),
    concatList: path.join(directory, "concat.txt"),
    directory,
    publicDirectory: path.join(directory, "public"),
    thumbnail: path.join(directory, "thumbnail.jpg"),
  }
}

function publicOutputFiles(files) {
  return {
    description: files.description,
    uploadMetadata: files.uploadMetadata,
    video: files.video,
  }
}

async function cleanupLegacyOutputFiles(files) {
  await Promise.all([
    rm(files.legacyAudio, { force: true }),
    rm(files.legacyConcatList, { force: true }),
  ])
}

async function writeUploadMetadata(
  albumName,
  uploaded,
  { videoImageText, videoTitle }
) {
  const videoId = typeof uploaded?.id === "string" ? uploaded.id : null

  if (!videoId) {
    return
  }

  await updateAlbumMetadata(albumName, {
    videoImageText,
    videoTitle,
    youtubeUpload: {
      privacy: UPLOAD_PRIVACY_STATUS,
      status: "uploaded",
      uploadedAt: youtubePublishedAt(uploaded) || new Date().toISOString(),
      url: `https://www.youtube.com/watch?v=${videoId}`,
      videoId,
    },
  })
}

function captureUploadLog(log) {
  return (line) => {
    const trimmed = line.trimStart()

    if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
      return
    }

    log(line)
  }
}

function youtubePublishedAt(uploaded) {
  const publishedAt = uploaded?.snippet?.publishedAt

  return typeof publishedAt === "string" ? publishedAt : null
}

function resolveRootPath(file) {
  return path.isAbsolute(file) ? file : path.join(ROOT, file)
}

async function writeConcatFile(file, tracks) {
  const lines = tracks.map((track) => `file '${escapeConcatPath(track)}'`)
  await writeFile(file, `${lines.join("\n")}\n`)
}

function escapeConcatPath(file) {
  return file.replaceAll("'", "'\\''")
}

async function renderVideo({
  audio,
  concatList,
  cover,
  coverTextOverlays,
  output,
  publicDirectory,
  tempDirectory,
  trackDurations,
  tracks,
  videoImageText,
  log,
}) {
  log("Preparing album audio for video...")
  await runCommand(
    "ffmpeg",
    [
      "-y",
      "-f",
      "concat",
      "-safe",
      "0",
      "-i",
      concatList,
      "-vn",
      "-c:a",
      "aac",
      "-b:a",
      "192k",
      "-movflags",
      "+faststart",
      audio,
    ],
    log
  )

  const durationSeconds = await readAudioDurationSeconds(audio)
  const titleCues = buildTrackTitleCues(tracks, trackDurations, durationSeconds)
  const coverImage = path.join(publicDirectory, VIDEO_COVER_FILE)

  log("Preparing video image and Remotion title overlays...")
  await mkdir(publicDirectory, { recursive: true })
  await Promise.all([
    writeRemotionVideoCover(
      cover,
      coverImage,
      videoImageText,
      coverTextOverlays
    ),
    copyFile(
      interFontPath(),
      path.join(publicDirectory, REMOTION_INTER_FONT_FILE)
    ),
  ])

  const titleOverlays = await renderTrackTitleOverlays({
    publicDirectory,
    tempDirectory,
    titleCues,
    log,
  })

  await assembleLoopedVideo({
    audio,
    coverImage,
    durationSeconds,
    output,
    titleOverlays,
    log,
  })
}

async function renderTrackTitleOverlays({
  log,
  publicDirectory,
  tempDirectory,
  titleCues,
}) {
  if (titleCues.length === 0) {
    log("No track title overlays needed.")
    return []
  }

  const { bundle } = loadRemotionBundler()
  const { renderStill, selectComposition } = loadRemotionRenderer()
  const serveUrl = await bundle({
    entryPoint: REMOTION_VIDEO_ENTRY,
    ignoreRegisterRootWarning: true,
    outDir: path.join(tempDirectory, "bundle"),
    publicDir: publicDirectory,
    rootDir: WORKFLOW_PACKAGE_DIRECTORY,
  })

  const overlays = await Promise.all(
    titleCues.map((cue, index) =>
      renderTrackTitleOverlay({
        cue,
        index,
        renderStill,
        selectComposition,
        serveUrl,
        tempDirectory,
      })
    )
  )

  log(
    `Prepared ${overlays.length} track title overlay${overlays.length === 1 ? "" : "s"}.`
  )

  return overlays
}

async function renderTrackTitleOverlay({
  cue,
  index,
  renderStill,
  selectComposition,
  serveUrl,
  tempDirectory,
}) {
  const inputProps = { title: cue.title }
  const composition = await selectComposition({
    id: CITY_POP_TRACK_TITLE_COMPOSITION_ID,
    inputProps,
    logLevel: "error",
    serveUrl,
  })
  const rendered = await renderStill({
    composition,
    imageFormat: "png",
    inputProps,
    logLevel: "error",
    serveUrl,
    timeoutInMilliseconds: REMOTION_RENDER_TIMEOUT_MS,
  })

  if (!rendered.buffer) {
    throw new Error(`Remotion did not return a title overlay for ${cue.title}.`)
  }

  const file = path.join(
    tempDirectory,
    `track-title-${String(index + 1).padStart(2, "0")}.png`
  )

  await writeFile(file, rendered.buffer)

  return { ...cue, file }
}

async function assembleLoopedVideo({
  audio,
  coverImage,
  durationSeconds,
  output,
  titleOverlays,
  log,
}) {
  log(`Assembling full-length video (${formatTime(durationSeconds)})...`)
  const titleInputArgs = titleOverlays.flatMap((overlay) => [
    "-loop",
    "1",
    "-i",
    overlay.file,
  ])
  const filterGraph = buildFinalVideoFilterGraph(titleOverlays)

  await runCommand(
    "ffmpeg",
    [
      "-y",
      "-loop",
      "1",
      "-framerate",
      String(VIDEO_FPS),
      "-i",
      coverImage,
      "-i",
      audio,
      ...titleInputArgs,
      "-filter_complex",
      filterGraph,
      "-map",
      "[vout]",
      "-map",
      "1:a:0",
      "-c:v",
      "libx264",
      "-preset",
      VIDEO_X264_PRESET,
      "-crf",
      "23",
      "-pix_fmt",
      "yuv420p",
      "-c:a",
      "copy",
      "-t",
      secondsForFfmpeg(durationSeconds),
      "-shortest",
      "-movflags",
      "+faststart",
      output,
    ],
    log
  )

  log(`Rendered animated video: ${relative(output)}`)
}

function buildFinalVideoFilterGraph(titleOverlays) {
  const lineHeight = 100
  const lineTop = 796
  const filters = [
    "[0:v]setpts=PTS-STARTPTS[base]",
    `[1:a]aformat=channel_layouts=mono,lowpass=f=120,volume=0.58,showwaves=s=${VIDEO_WIDTH}x${lineHeight}:mode=p2p:rate=${VIDEO_FPS}:scale=lin:draw=scale:colors=white,format=gray,dilation,gblur=sigma=0.6[waveAlpha]`,
    `color=c=white:s=${VIDEO_WIDTH}x${lineHeight}:r=${VIDEO_FPS},format=rgba[waveColor]`,
    `[waveColor][waveAlpha]alphamerge,colorchannelmixer=aa=0.70,pad=${VIDEO_WIDTH}:${VIDEO_HEIGHT}:0:${lineTop}:color=black@0[line]`,
    "[base][line]overlay=0:0:format=auto:shortest=0[withline]",
  ]

  let input = "[withline]"

  titleOverlays.forEach((overlay, index) => {
    const output =
      index === titleOverlays.length - 1 ? "[vout]" : `[title${index}]`
    const inputIndex = index + 2

    filters.push(
      `${input}[${inputIndex}:v]overlay=0:0:enable='between(t,${secondsForFfmpeg(overlay.start)},${secondsForFfmpeg(overlay.end)})':shortest=0${output}`
    )
    input = output
  })

  if (titleOverlays.length === 0) {
    filters.push("[withline]format=yuv420p[vout]")
  }

  return filters.join(";")
}

function buildTrackTitleCues(tracks, durations, totalDurationSeconds) {
  let cursor = 0

  return tracks
    .map((track, index) => {
      const duration = durations.get(track)
      const start = cursor
      const isLastTrack = index === tracks.length - 1
      const hasDuration = Number.isFinite(duration) && duration > 0
      const end = hasDuration
        ? isLastTrack
          ? totalDurationSeconds
          : Math.min(totalDurationSeconds, cursor + duration)
        : isLastTrack
          ? totalDurationSeconds
          : cursor

      if (hasDuration) {
        cursor = end
      }

      if (end <= start) {
        return null
      }

      return {
        end,
        start,
        title: formatNumberedTrackTitle(index + 1, path.basename(track)),
      }
    })
    .filter(Boolean)
}

async function readAudioDurationSeconds(audio) {
  try {
    const { getAudioDurationInSeconds } = loadRemotionMediaUtils()
    const duration = await getAudioDurationInSeconds(audio)

    if (Number.isFinite(duration) && duration > 0) {
      return duration
    }
  } catch {
    // Fall back to ffprobe below when media-utils cannot parse the file.
  }

  const duration = await readDuration(audio)

  if (Number.isFinite(duration) && duration > 0) {
    return duration
  }

  throw new Error("Could not read generated album audio duration.")
}

async function prepareThumbnail({
  cover,
  coverTextOverlays,
  log,
  output,
  videoImageText,
}) {
  const thumbnailCover = path.join(path.dirname(output), "thumbnail-cover.jpg")

  await writeRemotionVideoCover(
    cover,
    thumbnailCover,
    videoImageText,
    coverTextOverlays
  )
  await runCommand(
    "ffmpeg",
    [
      "-y",
      "-i",
      thumbnailCover,
      "-vf",
      `scale=${THUMBNAIL_SIZE}:force_original_aspect_ratio=decrease,pad=${THUMBNAIL_SIZE}:(ow-iw)/2:(oh-ih)/2,format=yuv420p`,
      "-frames:v",
      "1",
      "-update",
      "1",
      "-q:v",
      "3",
      output,
    ],
    log
  )
}

async function readDurations(tracks) {
  if (!(await commandSucceeds("ffprobe", ["-version"]))) {
    return new Map()
  }

  const entries = await Promise.all(
    tracks.map(async (track) => [track, await readDuration(track)])
  )

  return new Map(entries.filter(([, duration]) => duration !== null))
}

async function readDuration(track) {
  try {
    const stdout = await captureCommand("ffprobe", [
      "-v",
      "error",
      "-show_entries",
      "format=duration",
      "-of",
      "default=noprint_wrappers=1:nokey=1",
      track,
    ])
    const duration = Number(stdout.trim())
    return Number.isFinite(duration) ? duration : null
  } catch {
    return null
  }
}

function buildDescription({ durations, options = {}, tracks }) {
  const tracklist = buildTracklist(tracks, durations)
  const description = normalizeDescription(options.description)

  if (description) {
    return `${renderDescriptionTemplate(description, tracklist)}\n`
  }

  const template = normalizeDescription(options.descriptionTemplate)

  if (!template) {
    return `${tracklist}\n`
  }

  const renderedTemplate = renderDescriptionTemplate(template, tracklist)

  if (template.includes(TRACKLIST_PLACEHOLDER)) {
    return `${renderedTemplate}\n`
  }

  return `${renderedTemplate}\n\n${tracklist}\n`
}

function renderDescriptionTemplate(template, tracklist) {
  return template
    .replaceAll(VIDEO_TITLE_NAME_PLACEHOLDER, "")
    .replaceAll(TRACKLIST_PLACEHOLDER, tracklist)
    .replace(/\n{3,}/g, "\n\n")
    .trim()
}

function buildTracklist(tracks, durations) {
  const lines = []
  let cursor = 0

  tracks.forEach((track, index) => {
    const duration = durations.get(track)
    const prefix = duration ? `${formatTime(cursor)} - ` : `${index + 1}. `
    lines.push(`${prefix}${formatTrackTitle(path.basename(track))}`)

    if (duration) {
      cursor += duration
    }
  })

  return lines.join("\n")
}

function normalizeDescription(value) {
  return typeof value === "string" ? value.replace(/\r\n?/g, "\n").trim() : ""
}

function formatTrackTitle(fileName) {
  return fileName.replace(/\.mp3$/i, "").replaceAll("-", " ")
}

function formatNumberedTrackTitle(trackNumber, fileName) {
  const number = String(trackNumber).padStart(2, "0")

  return `${number}. ${formatTrackTitle(fileName)}`
}

function formatTime(seconds) {
  const totalSeconds = Math.max(0, Math.floor(seconds))
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const remainingSeconds = totalSeconds % 60

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, "0")}:${String(
      remainingSeconds
    ).padStart(2, "0")}`
  }

  return `${String(minutes).padStart(2, "0")}:${String(
    remainingSeconds
  ).padStart(2, "0")}`
}

function secondsForFfmpeg(seconds) {
  return Math.max(0.001, seconds).toFixed(3)
}

async function writeRemotionVideoCover(
  source,
  output,
  videoImageText,
  coverTextOverlays
) {
  const cover = await videoCoverImage(source, videoImageText, coverTextOverlays)

  await sharp(cover)
    .rotate()
    .resize(VIDEO_WIDTH, VIDEO_HEIGHT, { fit: "cover" })
    .toColorspace("srgb")
    .jpeg({ quality: 92 })
    .toFile(output)
}

async function videoCoverImage(source, videoImageText, coverTextOverlays) {
  const image = await readFile(source)

  if (isTitleCover(source)) {
    return image
  }

  return renderCoverTitleImage({
    extension: imageExtensionForPath(source),
    image,
    textOverlays: coverTextOverlays,
    title: videoImageText,
  })
}

function isTitleCover(file) {
  return VIDEO_TITLE_COVER_CANDIDATES.includes(
    path.basename(file).toLowerCase()
  )
}

function imageExtensionForPath(file) {
  const extension = path.extname(file).slice(1).toLowerCase()

  if (extension === "jpg") {
    return "jpeg"
  }

  return extension || "png"
}

async function uploadVideo({
  albumName,
  description,
  options,
  thumbnail,
  video,
}) {
  return runUpload({
    ...options,
    descriptionFile: description,
    file: video,
    privacy: UPLOAD_PRIVACY_STATUS,
    thumbnailFile: thumbnail,
    title: String(options.title || albumName),
  })
}

function runCommand(command, args, log) {
  log(`\n$ ${[command, ...args].map(shellQuote).join(" ")}`)

  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: ROOT,
      stdio: "inherit",
    })

    child.on("error", (error) => {
      reject(new Error(`${command} failed to start: ${error.message}`))
    })

    child.on("exit", (code, signal) => {
      if (code === 0) {
        resolve()
        return
      }

      reject(
        new Error(`${command} failed with ${signal || `exit code ${code}`}`)
      )
    })
  })
}

function captureCommand(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: ROOT,
      stdio: ["ignore", "pipe", "ignore"],
    })
    const chunks = []

    child.stdout.on("data", (chunk) => {
      chunks.push(chunk)
    })

    child.on("error", reject)
    child.on("exit", (code) => {
      if (code === 0) {
        resolve(Buffer.concat(chunks).toString("utf8"))
        return
      }

      reject(new Error(`${command} failed with exit code ${code}`))
    })
  })
}

async function commandSucceeds(command, args) {
  try {
    await captureCommand(command, args)
    return true
  } catch {
    return false
  }
}

async function assertCommandAvailable(command) {
  if (await commandSucceeds(command, ["-version"])) {
    return
  }

  throw new Error(
    `Missing required command: ${command}. Install ffmpeg and try again.`
  )
}

function loadRemotionBundler() {
  const module = requireWorkflowRuntime("@remotion/bundler")

  if (!isRecord(module) || typeof module.bundle !== "function") {
    throw new Error("Could not load Remotion bundler.")
  }

  return module
}

function loadRemotionRenderer() {
  const module = requireWorkflowRuntime("@remotion/renderer")

  if (
    !isRecord(module) ||
    typeof module.renderStill !== "function" ||
    typeof module.selectComposition !== "function"
  ) {
    throw new Error("Could not load Remotion renderer.")
  }

  return module
}

function loadRemotionMediaUtils() {
  const module = requireWorkflowRuntime("@remotion/media-utils")

  if (
    !isRecord(module) ||
    typeof module.getAudioDurationInSeconds !== "function"
  ) {
    throw new Error("Could not load Remotion media utils.")
  }

  return module
}

function interFontPath() {
  const packageRoot = path.dirname(
    requireWorkflowRuntime.resolve("@fontsource-variable/inter/package.json")
  )

  return path.join(packageRoot, INTER_FONT_FILE)
}

function isRecord(value) {
  return typeof value === "object" && value !== null
}

async function exists(file) {
  try {
    await access(file)
    return true
  } catch {
    return false
  }
}

function slugify(value) {
  return (
    value
      .normalize("NFKC")
      .trim()
      .replaceAll(/\s+/g, "-")
      .replaceAll(/[^\p{L}\p{N}._-]/gu, "")
      .replaceAll(/-+/g, "-")
      .replace(/^-|-$/g, "") || "youtube-video"
  )
}

function shellQuote(value) {
  if (/^[\w./:=@+-]+$/.test(value)) {
    return value
  }

  return `'${value.replaceAll("'", "'\\''")}'`
}

function relative(file) {
  return path.relative(ROOT, file)
}

export { main as youtubeVideoMain }
