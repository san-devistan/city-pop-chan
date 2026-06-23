/* eslint-disable complexity, max-lines, max-lines-per-function -- Suno Studio is one local workflow surface; split by feature module when the surface grows further. */
/* eslint-disable react-perf/jsx-no-jsx-as-prop, react-perf/jsx-no-new-function-as-prop, react/jsx-max-depth -- This local tool favors direct control wiring over wrapper-heavy indirection. */

import {
  DEFAULT_INSPIRATION_DEFAULTS,
  normalizeInspirationDefaults,
  VIDEO_NAME_TOKEN,
  VIDEO_TRACKLIST_TOKEN,
  type InspirationDefaults,
} from "@/lib/inspiration-defaults"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
  InputGroupTextarea,
} from "@workspace/ui/components/input-group"
import { Label } from "@workspace/ui/components/label"
import {
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Image,
  Pause,
  Play,
  RadioTower,
  Sparkles,
  Trash2,
  Video,
  X,
} from "lucide-react"
import { useEffect, useRef, useState, type ReactNode } from "react"

export type AlbumTrack = {
  duration: number | null
  name: string
  title: string
  url: string
}

export type CoverAspectRatio = "1:1" | "16:9"

export type CoverVariant = {
  aspectRatio: CoverAspectRatio
  file: string
  kind: "square" | "widescreen" | "widescreen-title"
  label: string
  url: string
}

export type Album = {
  cover: string | null
  coverAspectRatio: CoverAspectRatio
  coverLeftText: string
  coverVariants: Array<CoverVariant>
  coverPrompt: string
  coverRightText: string
  coverTopText: string
  createdAt: number
  folder: string
  title: string
  tracks: Array<AlbumTrack>
  updatedAt: number
  video: string | null
  videoDescription: string | null
  videoImageText: string
  videoTitle: string
  distrokidPublish: {
    artworkFile: string
    manifestFile: string
    packageDirectory: string
    preparedAt: string
    status: "prepared"
    trackCount: number
    uploadUrl: string
    warnings: Array<string>
  } | null
  youtubeUpload: {
    privacy: string
    status: "uploaded"
    uploadedAt: string
    url: string
    videoId: string
  } | null
}

export type AlbumAction = "cover" | "publish" | "upload" | "video"

export type ApiBody = Record<string, unknown>

type CoverOverlayText = {
  leftText: string
  rightText: string
  topText: string
}

type CoverOverlayTextField = keyof CoverOverlayText

type AlbumDraftSource = {
  coverLeftText: string
  coverPrompt: string
  coverRightText: string
  coverTopText: string
  folder: string
  videoDescription: string
  videoImageText: string
  videoTitle: string
}

export type Inspiration = {
  id: string
  kind: "cover" | "videoTitle"
  source: "photo" | "youtube"
  thumbnail: string | null
  thumbnailSourceUrl: string
  title: string
  url: string
}

const COVER_BADGE_CLASS =
  "border-sky-500/30 bg-sky-500/12 text-sky-700 hover:bg-sky-500/18 hover:text-sky-800 dark:text-sky-300 dark:hover:text-sky-200"
const VIDEO_BADGE_CLASS =
  "border-amber-500/30 bg-amber-500/12 text-amber-700 hover:bg-amber-500/18 hover:text-amber-800 dark:text-amber-300 dark:hover:text-amber-200"
const YOUTUBE_BADGE_CLASS =
  "border-orange-500/30 bg-orange-500/12 text-orange-700 hover:bg-orange-500/18 hover:text-orange-800 dark:text-orange-300 dark:hover:text-orange-200"
const COVER_BUTTON_CLASS =
  "!border-sky-500/30 !bg-sky-500/12 !text-sky-700 hover:!bg-sky-500/18 hover:!text-sky-800 dark:!text-sky-300 dark:hover:!text-sky-200"
const VIDEO_BUTTON_CLASS =
  "!border-amber-500/30 !bg-amber-500/12 !text-amber-700 hover:!bg-amber-500/18 hover:!text-amber-800 dark:!text-amber-300 dark:hover:!text-amber-200"
const YOUTUBE_BUTTON_CLASS =
  "!border-orange-500/30 !bg-orange-500/12 !text-orange-700 hover:!bg-orange-500/18 hover:!text-orange-800 dark:!text-orange-300 dark:hover:!text-orange-200"
const DISTROKID_BUTTON_CLASS =
  "!border-emerald-500/30 !bg-emerald-500/12 !text-emerald-700 hover:!bg-emerald-500/18 hover:!text-emerald-800 dark:!text-emerald-300 dark:hover:!text-emerald-200"
const STATUS_BADGE_CLASS = "size-5 rounded-md p-0"

function editableCoverPrompt(
  savedPrompt: string,
  defaults: InspirationDefaults
) {
  return savedPrompt.trim() ? savedPrompt : defaults.coverPrompt
}

function editableCoverOverlayText(
  album: Pick<Album, "coverLeftText" | "coverRightText" | "coverTopText">,
  defaults: InspirationDefaults
) {
  return {
    leftText: editableCoverText(album.coverLeftText, defaults.coverLeftText),
    rightText: editableCoverText(album.coverRightText, defaults.coverRightText),
    topText: editableCoverText(album.coverTopText, defaults.coverTopText),
  } satisfies CoverOverlayText
}

function defaultCoverOverlayText(defaults: InspirationDefaults) {
  return {
    leftText: defaults.coverLeftText,
    rightText: defaults.coverRightText,
    topText: defaults.coverTopText,
  } satisfies CoverOverlayText
}

function editableCoverText(savedText: string, defaultText: string) {
  return savedText.trim() ? savedText : defaultText
}

function editableVideoTitle(defaults: InspirationDefaults) {
  return defaults.videoTitle
}

function editableVideoDescription(defaults: InspirationDefaults) {
  return defaults.videoDescription
}

function editableVideoImageText(
  savedText: string,
  defaults: InspirationDefaults
) {
  return savedText.trim() ? savedText : defaults.videoImageText
}

function albumDraftSource(
  album: Pick<
    Album,
    | "coverLeftText"
    | "coverPrompt"
    | "coverRightText"
    | "coverTopText"
    | "folder"
    | "videoImageText"
  >,
  defaults: InspirationDefaults
): AlbumDraftSource {
  return {
    coverLeftText: album.coverLeftText,
    coverPrompt: album.coverPrompt,
    coverRightText: album.coverRightText,
    coverTopText: album.coverTopText,
    folder: album.folder,
    videoDescription: defaults.videoDescription,
    videoImageText: album.videoImageText,
    videoTitle: defaults.videoTitle,
  }
}

function isSameAlbumDraftSource(
  left: AlbumDraftSource,
  right: AlbumDraftSource
) {
  return (
    left.coverLeftText === right.coverLeftText &&
    left.coverPrompt === right.coverPrompt &&
    left.coverRightText === right.coverRightText &&
    left.coverTopText === right.coverTopText &&
    left.folder === right.folder &&
    left.videoDescription === right.videoDescription &&
    left.videoImageText === right.videoImageText &&
    left.videoTitle === right.videoTitle
  )
}

export async function api<T>(path: string, body?: ApiBody): Promise<T> {
  const response = await fetchStudio(path, {
    body: body === undefined ? undefined : JSON.stringify(body),
    headers:
      body === undefined ? undefined : { "content-type": "application/json" },
    method: body === undefined ? "GET" : "POST",
  })
  const data = await readApiJson(response)

  if (!response.ok) {
    throw new Error(errorMessageFromResponse(data, response.status))
  }

  // eslint-disable-next-line typescript/no-unsafe-type-assertion -- Local Studio API endpoints define their response shape at each call site.
  return data as T
}

async function fetchStudio(path: string, init: RequestInit) {
  try {
    return await fetch(path, init)
  } catch (error) {
    throw new Error(
      `Could not reach Studio while requesting ${path}. Make sure pnpm suno:studio is still running.`,
      { cause: error }
    )
  }
}

async function readApiJson(response: Response): Promise<unknown> {
  return response.json().catch(() => null)
}

function errorMessageFromResponse(data: unknown, status: number) {
  if (isApiError(data)) {
    return data.error
  }

  return `Request failed with HTTP ${status}.`
}

function isApiError(value: unknown): value is { error: string } {
  return (
    isRecord(value) &&
    "error" in value &&
    typeof value.error === "string" &&
    value.error.length > 0
  )
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null
}

export async function fetchAlbums() {
  const data = await api<{ albums: Array<Album> }>("/api/suno/albums")

  return data.albums
}

export async function fetchAlbum(folder: string) {
  const albums = await fetchAlbums()

  return albums.find((album) => album.folder === folder) || null
}

export async function fetchInspirations() {
  const data = await api<{ inspirations: Array<Inspiration> }>(
    "/api/suno/inspirations"
  )

  return data.inspirations
}

export async function fetchInspirationDefaults() {
  const data = await api<{ defaults: InspirationDefaults }>(
    "/api/suno/inspirations/settings"
  )

  return normalizeInspirationDefaults(data.defaults)
}

export async function saveInspirationDefaults(defaults: InspirationDefaults) {
  const data = await api<{ defaults: InspirationDefaults }>(
    "/api/suno/inspirations/settings",
    defaults
  )

  return normalizeInspirationDefaults(data.defaults)
}

function distrokidUploadUrl(folder: string) {
  const params = new URLSearchParams({
    "city-pop-chan-album": folder,
  })

  return `https://distrokid.com/new/#${params.toString()}`
}

export async function deleteInspiration(id: string) {
  return api<{ id: string }>("/api/suno/inspirations/delete", { id })
}

export async function uploadPhotoInspirations(files: Array<File>) {
  const formData = new FormData()

  for (const file of files) {
    formData.append("files", file)
  }

  const response = await fetch("/api/suno/inspirations/upload", {
    body: formData,
    method: "POST",
  })
  const data = await readApiJson(response)

  if (!response.ok) {
    throw new Error(isApiError(data) ? data.error : "Upload failed.")
  }

  return inspirationsFromUploadResponse(data)
}

function inspirationsFromUploadResponse(data: unknown) {
  if (!isRecord(data) || !Array.isArray(data.inspirations)) {
    return []
  }

  return data.inspirations.filter(isInspiration)
}

function isInspiration(value: unknown): value is Inspiration {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    (value.kind === "cover" || value.kind === "videoTitle") &&
    (value.source === "photo" || value.source === "youtube") &&
    (typeof value.thumbnail === "string" || value.thumbnail === null) &&
    typeof value.thumbnailSourceUrl === "string" &&
    typeof value.title === "string" &&
    typeof value.url === "string"
  )
}

export function InspirationThumbnail({
  className = "aspect-video w-full rounded-md object-cover",
  inspiration,
}: {
  className?: string
  inspiration: Inspiration
}) {
  const fallbackSrc = browserImageUrl(inspiration.thumbnailSourceUrl)
  const localSrc = browserImageUrl(inspiration.thumbnail || "")
  const [fallbackKey, setFallbackKey] = useState("")
  const currentKey = [
    inspiration.id,
    inspiration.thumbnail || "",
    inspiration.thumbnailSourceUrl,
  ].join(":")
  const shouldUseFallback = fallbackKey === currentKey && fallbackSrc
  const src = shouldUseFallback ? fallbackSrc : localSrc || fallbackSrc

  if (!src) {
    return (
      <div className="grid aspect-video w-full place-items-center rounded-md bg-muted text-xs text-muted-foreground">
        No thumbnail
      </div>
    )
  }

  return (
    <img
      alt=""
      src={src}
      className={className}
      onError={() => {
        if (src === localSrc && fallbackSrc) {
          setFallbackKey(currentKey)
        }
      }}
    />
  )
}

function browserImageUrl(value: string) {
  return value.startsWith("http://") ||
    value.startsWith("https://") ||
    value.startsWith("/")
    ? value
    : ""
}

function coverInspirations(inspirations: Array<Inspiration>) {
  return inspirations.filter((inspiration) => inspiration.kind === "cover")
}

export function actionStatus(action: AlbumAction, album?: Album) {
  if (action === "cover") {
    return "Cover ready."
  }

  if (action === "video") {
    return "Video ready."
  }

  if (action === "publish") {
    if (!album?.distrokidPublish) {
      return "DistroKid package prepared. Open DistroKid and use the extension to fill the form."
    }

    const warnings = album.distrokidPublish.warnings

    return warnings.length > 0
      ? `DistroKid package prepared with ${warnings.length} warning${
          warnings.length === 1 ? "" : "s"
        }.`
      : "DistroKid package prepared."
  }

  if (album?.youtubeUpload) {
    return `Uploaded to YouTube: ${album.youtubeUpload.url}`
  }

  return "Upload complete."
}

function AlbumBadges({
  album,
  linkYoutube = true,
}: {
  album: Album
  linkYoutube?: boolean
}) {
  const hasCover = albumCoverVariants(album).length > 0

  return (
    <>
      {hasCover ? (
        <GeneratedIconBadge
          label="Cover generated"
          className={COVER_BADGE_CLASS}
          icon={<Image />}
        />
      ) : null}
      {album.video ? (
        <GeneratedIconBadge
          label="Video generated"
          className={VIDEO_BADGE_CLASS}
          icon={<Video />}
        />
      ) : null}
      {album.youtubeUpload ? (
        linkYoutube ? (
          <a
            href={album.youtubeUpload.url}
            target="_blank"
            rel="noreferrer"
            aria-label={`Open ${album.title} on YouTube`}
            title="Open on YouTube"
          >
            <YoutubeUploadedBadge />
          </a>
        ) : (
          <YoutubeUploadedBadge />
        )
      ) : null}
    </>
  )
}

export function AlbumSummary({
  album,
  albumDurationText,
  coverFrameClass = "aspect-video w-40 sm:w-52",
  linkYoutube = true,
  onCoverClick,
}: {
  album: Album
  albumDurationText: string
  coverFrameClass?: string
  linkYoutube?: boolean
  onCoverClick?: () => void
}) {
  const primaryCover = primaryAlbumCover(album)
  const coverClassName = `grid shrink-0 place-items-center overflow-hidden rounded-md bg-muted ${coverFrameClass}`
  const coverSrc = primaryCover
    ? cacheBustedUrl(primaryCover, album.updatedAt)
    : null

  return (
    <div className="flex min-w-0 items-center gap-3">
      {coverSrc ? (
        onCoverClick ? (
          <button
            type="button"
            aria-label={`View ${album.title} cover`}
            className={`group ${coverClassName} ring-offset-background transition outline-none hover:brightness-110 focus-visible:ring-3 focus-visible:ring-ring/50`}
            onClick={onCoverClick}
          >
            <AlbumCoverImage alt={`${album.title} cover`} src={coverSrc} />
          </button>
        ) : (
          <div className={coverClassName}>
            <AlbumCoverImage alt={`${album.title} cover`} src={coverSrc} />
          </div>
        )
      ) : (
        <div className={coverClassName}>
          <span className="px-2 text-center text-xs text-muted-foreground">
            No cover
          </span>
        </div>
      )}
      <div className="min-w-0">
        <h3 className="truncate text-lg font-semibold">{album.title}</h3>
        <p className="mt-1 font-mono text-sm text-muted-foreground tabular-nums">
          {album.tracks.length} tracks · {albumDurationText}
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <AlbumBadges album={album} linkYoutube={linkYoutube} />
        </div>
      </div>
    </div>
  )
}

function AlbumCoverImage({ alt, src }: { alt: string; src: string }) {
  const [failedSrc, setFailedSrc] = useState("")
  const didFail = failedSrc === src

  if (didFail) {
    return (
      <span className="px-2 text-center text-xs text-muted-foreground">
        Cover unavailable
      </span>
    )
  }

  return (
    <img
      alt={alt}
      src={src}
      className="h-full w-full object-cover transition group-hover:scale-[1.03]"
      onError={() => {
        setFailedSrc(src)
      }}
    />
  )
}

function cacheBustedUrl(url: string, updatedAt: number) {
  const separator = url.includes("?") ? "&" : "?"

  return `${url}${separator}t=${updatedAt}`
}

function GeneratedIconBadge({
  className,
  icon,
  label,
}: {
  className: string
  icon: ReactNode
  label: string
}) {
  return (
    <Badge
      variant="outline"
      aria-label={label}
      title={label}
      className={`${STATUS_BADGE_CLASS} ${className}`}
    >
      {icon}
    </Badge>
  )
}

function YoutubeLogoIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="currentColor"
        fillRule="evenodd"
        clipRule="evenodd"
        d="M21.6 7.2c-.2-.9-.9-1.6-1.8-1.8C18.2 5 12 5 12 5s-6.2 0-7.8.4c-.9.2-1.6.9-1.8 1.8C2 8.8 2 12 2 12s0 3.2.4 4.8c.2.9.9 1.6 1.8 1.8C5.8 19 12 19 12 19s6.2 0 7.8-.4c.9-.2 1.6-.9 1.8-1.8.4-1.6.4-4.8.4-4.8s0-3.2-.4-4.8ZM10 15.2V8.8l5.5 3.2L10 15.2Z"
      />
    </svg>
  )
}

function YoutubeUploadedBadge() {
  return (
    <Badge
      variant="outline"
      aria-label="Uploaded to YouTube"
      title="Uploaded to YouTube"
      className={`${STATUS_BADGE_CLASS} ${YOUTUBE_BADGE_CLASS}`}
    >
      <YoutubeLogoIcon />
    </Badge>
  )
}

// react-doctor-disable-next-line react-doctor/no-giant-component -- The panel is a local workflow shell with extracted leaf components below.
export function AlbumDetailPanel({
  album,
  busyAction,
  isBusy,
  onAction,
  onDeleteTrack,
}: {
  album: Album
  busyAction: AlbumAction | null
  isBusy: boolean
  onAction: (
    folder: string,
    action: AlbumAction,
    message: string,
    body?: ApiBody
  ) => Promise<void>
  onDeleteTrack: (folder: string, track: AlbumTrack) => Promise<void>
}) {
  const audioRef = useRef<HTMLAudioElement>(null)
  const [activeTrack, setActiveTrack] = useState<AlbumTrack | null>(null)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [coverPreviewIndex, setCoverPreviewIndex] = useState(0)
  const [isCoverPreviewOpen, setIsCoverPreviewOpen] = useState(false)
  const [isCoverPickerOpen, setIsCoverPickerOpen] = useState(false)
  const [isVideoDialogOpen, setIsVideoDialogOpen] = useState(false)
  const [coverPromptSuggestionError, setCoverPromptSuggestionError] =
    useState("")
  const [inspirationError, setInspirationError] = useState("")
  const [inspirations, setInspirations] = useState<Array<Inspiration>>([])
  const [isLoadingInspirations, setIsLoadingInspirations] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isSuggestingCoverPrompt, setIsSuggestingCoverPrompt] = useState(false)
  const [isSuggestingVideoTitle, setIsSuggestingVideoTitle] = useState(false)
  const [isVideoPreviewOpen, setIsVideoPreviewOpen] = useState(false)
  const [inspirationDefaults, setInspirationDefaults] = useState(
    DEFAULT_INSPIRATION_DEFAULTS
  )
  const [playerError, setPlayerError] = useState("")
  const [coverPrompt, setCoverPrompt] = useState(() =>
    editableCoverPrompt(album.coverPrompt, DEFAULT_INSPIRATION_DEFAULTS)
  )
  const [coverText, setCoverText] = useState(() =>
    editableCoverOverlayText(album, DEFAULT_INSPIRATION_DEFAULTS)
  )
  const [selectedInspirationIds, setSelectedInspirationIds] = useState<
    Array<string>
  >([])
  const [videoTitleSuggestionError, setVideoTitleSuggestionError] = useState("")
  const [videoTitle, setVideoTitle] = useState(() =>
    editableVideoTitle(DEFAULT_INSPIRATION_DEFAULTS)
  )
  const [videoImageText, setVideoImageText] = useState(() =>
    editableVideoImageText(album.videoImageText, DEFAULT_INSPIRATION_DEFAULTS)
  )
  const [videoDescription, setVideoDescription] = useState(() =>
    editableVideoDescription(DEFAULT_INSPIRATION_DEFAULTS)
  )
  const trackDurations = useTrackDurations(album.tracks)
  const draftSourceRef = useRef<AlbumDraftSource | null>(null)
  const draftSource =
    draftSourceRef.current ??
    albumDraftSource(album, DEFAULT_INSPIRATION_DEFAULTS)

  if (draftSourceRef.current === null) {
    draftSourceRef.current = draftSource
  }

  const nextDraftSource = albumDraftSource(album, inspirationDefaults)

  if (!isSameAlbumDraftSource(draftSource, nextDraftSource)) {
    draftSourceRef.current = nextDraftSource
    setCoverPrompt(editableCoverPrompt(album.coverPrompt, inspirationDefaults))
    setCoverPreviewIndex(0)
    setCoverText(
      editableCoverOverlayText(
        {
          coverLeftText: album.coverLeftText,
          coverRightText: album.coverRightText,
          coverTopText: album.coverTopText,
        },
        inspirationDefaults
      )
    )
    setVideoTitle(editableVideoTitle(inspirationDefaults))
    setVideoImageText(
      editableVideoImageText(album.videoImageText, inspirationDefaults)
    )
    setVideoDescription(editableVideoDescription(inspirationDefaults))
  }

  useEffect(
    () => () => {
      audioRef.current?.pause()
    },
    []
  )

  useEffect(() => {
    let isCurrent = true

    async function loadDefaults() {
      try {
        if (!isCurrent) {
          return
        }

        // react-doctor-disable-next-line react-doctor/async-defer-await -- The post-await guard prevents stale defaults from mutating state after cleanup.
        const defaults = await fetchInspirationDefaults()

        if (!isCurrent) {
          return
        }

        setInspirationDefaults(defaults)
      } catch {
        // Keep the built-in defaults when Studio settings cannot be loaded.
      }
    }

    void loadDefaults()

    return () => {
      isCurrent = false
    }
  }, [album.folder])

  useEffect(() => {
    if (!isCoverPreviewOpen) {
      return undefined
    }

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsCoverPreviewOpen(false)
      }
    }

    window.addEventListener("keydown", closeOnEscape)

    return () => {
      window.removeEventListener("keydown", closeOnEscape)
    }
  }, [isCoverPreviewOpen])

  async function toggleTrack(track: AlbumTrack) {
    const audio = audioRef.current

    if (!audio) {
      return
    }

    const nextUrl = new URL(track.url, window.location.href).href

    setPlayerError("")

    const isSameSource = audio.currentSrc === nextUrl

    if (isSameSource && !audio.paused) {
      audio.pause()
      return
    }

    if (!isSameSource) {
      audio.src = track.url
      audio.load()
      setCurrentTime(0)
      setDuration(0)
    }

    setActiveTrack(track)

    try {
      await audio.play()
      setIsPlaying(true)
    } catch (error) {
      setIsPlaying(false)
      setPlayerError(
        error instanceof Error ? error.message : "Could not play this track."
      )
    }
  }

  function syncAudioProgress() {
    const audio = audioRef.current

    if (!audio) {
      return
    }

    setCurrentTime(audio.currentTime)
    setDuration(Number.isFinite(audio.duration) ? audio.duration : 0)
  }

  function seekTo(value: number) {
    const audio = audioRef.current

    if (!audio || !Number.isFinite(value)) {
      return
    }

    const seekLimit = duration || audio.duration || 0
    const nextTime = Math.min(Math.max(value, 0), seekLimit)

    audio.currentTime = nextTime
    setCurrentTime(nextTime)
  }

  async function deleteTrack(track: AlbumTrack) {
    if (!window.confirm(`Delete "${track.title}" from ${album.title}?`)) {
      return
    }

    if (activeTrack?.name === track.name) {
      audioRef.current?.pause()
      setActiveTrack(null)
      setCurrentTime(0)
      setDuration(0)
      setIsPlaying(false)
    }

    await onDeleteTrack(album.folder, track)
  }

  async function openCoverPicker() {
    setIsCoverPickerOpen(true)
    setInspirationError("")
    setCoverPromptSuggestionError("")
    setIsLoadingInspirations(true)

    try {
      const nextInspirations = await fetchInspirations()

      setInspirations(coverInspirations(nextInspirations))
      setSelectedInspirationIds([])
    } catch (error) {
      setInspirationError(
        error instanceof Error ? error.message : "Could not load inspirations."
      )
    } finally {
      setIsLoadingInspirations(false)
    }
  }

  function openVideoDialog() {
    setVideoTitleSuggestionError("")
    setVideoTitle(editableVideoTitle(inspirationDefaults))
    setIsVideoDialogOpen(true)
  }

  function updateCoverText(field: CoverOverlayTextField, value: string) {
    setCoverText((current) => ({
      ...current,
      [field]: value,
    }))
  }

  function generateCover(selectedInspirations: Array<Inspiration>) {
    const savedCoverPrompt = coverPrompt.trim()
    const savedCoverText = {
      leftText: coverText.leftText.trim(),
      rightText: coverText.rightText.trim(),
      topText: coverText.topText.trim(),
    } satisfies CoverOverlayText
    const savedVideoImageText =
      videoImageText.trim() || inspirationDefaults.videoImageText
    const body: ApiBody = {
      coverLeftText: savedCoverText.leftText,
      coverPrompt: savedCoverPrompt,
      coverRightText: savedCoverText.rightText,
      coverTopText: savedCoverText.topText,
      prompt: savedCoverPrompt,
      videoImageText: savedVideoImageText,
    }

    if (selectedInspirations.length > 0) {
      body.inspirationIds = selectedInspirations.map(
        (inspiration) => inspiration.id
      )
    }

    setIsCoverPickerOpen(false)
    void onAction(album.folder, "cover", "Generating cover...", body)
  }

  function toggleSelectedInspiration(id: string) {
    setSelectedInspirationIds((current) =>
      current.includes(id)
        ? current.filter((selectedId) => selectedId !== id)
        : [...current, id]
    )
  }

  function generateVideo() {
    const savedVideoTitle = videoTitle.trim() || inspirationDefaults.videoTitle
    const savedVideoImageText =
      videoImageText.trim() || inspirationDefaults.videoImageText
    const savedVideoDescription =
      videoDescription.trim() || inspirationDefaults.videoDescription

    setIsVideoDialogOpen(false)
    void onAction(album.folder, "video", "Building video...", {
      videoDescription: savedVideoDescription,
      videoImageText: savedVideoImageText,
      videoTitle: savedVideoTitle,
    })
  }

  async function suggestCoverPrompt() {
    setIsSuggestingCoverPrompt(true)
    setCoverPromptSuggestionError("")

    try {
      const data = await api<{ suggestion: string }>(
        `/api/suno/albums/${encodeURIComponent(album.folder)}/suggestions`,
        {
          currentValue: coverPrompt,
          kind: "coverPrompt",
        }
      )

      setCoverPrompt(data.suggestion)
    } catch (error) {
      setCoverPromptSuggestionError(
        error instanceof Error ? error.message : "Could not generate prompt."
      )
    } finally {
      setIsSuggestingCoverPrompt(false)
    }
  }

  async function suggestVideoTitle() {
    setIsSuggestingVideoTitle(true)
    setVideoTitleSuggestionError("")

    try {
      const data = await api<{ suggestion: string }>(
        `/api/suno/albums/${encodeURIComponent(album.folder)}/suggestions`,
        {
          currentValue: videoTitle,
          kind: "youtubeTitle",
        }
      )

      setVideoTitle(data.suggestion)
    } catch (error) {
      setVideoTitleSuggestionError(
        error instanceof Error
          ? error.message
          : "Could not generate video title."
      )
    } finally {
      setIsSuggestingVideoTitle(false)
    }
  }

  function requestCoverPromptSuggestion() {
    void suggestCoverPrompt()
  }

  function requestVideoTitleSuggestion() {
    void suggestVideoTitle()
  }

  function openCoverPreview() {
    setCoverPreviewIndex(0)
    setIsCoverPreviewOpen(true)
  }

  function uploadToYouTube() {
    const savedVideoTitle = videoTitle.trim() || inspirationDefaults.videoTitle
    const savedVideoImageText =
      videoImageText.trim() || inspirationDefaults.videoImageText

    void onAction(album.folder, "upload", "Uploading to YouTube...", {
      videoImageText: savedVideoImageText,
      videoTitle: savedVideoTitle,
    })
  }

  function openDistroKidPublish() {
    window.open(
      distrokidUploadUrl(album.folder),
      "_blank",
      "noopener,noreferrer"
    )
  }

  const activeDuration =
    activeTrack && trackDurations[activeTrack.name]
      ? trackDurations[activeTrack.name]
      : duration
  const albumDuration = totalTrackDuration(album.tracks, trackDurations)
  const albumDurationText = albumDuration ? formatTime(albumDuration) : "--:--"
  const canSeek = activeDuration > 0
  const displayedTime = canSeek ? Math.min(currentTime, activeDuration) : 0
  const coverVariants = albumCoverVariants(album)
  const hasGeneratedCover = coverVariants.length > 0
  const hasGeneratedVideo = Boolean(album.video)
  const isGeneratingVideo = busyAction === "video"
  const isDistroKidBlockedByBusy = isBusy && !isGeneratingVideo
  const videoTitleForDisplay = album.videoTitle || album.title
  const videoPreviewId = `video-preview-${album.folder}`

  return (
    <article className="overflow-hidden rounded-lg border bg-card shadow-sm">
      <div className="min-w-0 p-4">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <AlbumSummary
            album={album}
            albumDurationText={albumDurationText}
            onCoverClick={openCoverPreview}
          />
          <div className="grid w-full gap-2 sm:w-auto md:min-w-56">
            <div className="grid grid-cols-2 gap-2">
              <Button
                type="button"
                variant="outline"
                className={COVER_BUTTON_CLASS}
                disabled={isBusy}
                onClick={() => void openCoverPicker()}
              >
                <Image />
                Cover
              </Button>
              <Button
                type="button"
                variant="outline"
                className={VIDEO_BUTTON_CLASS}
                disabled={isBusy || !hasGeneratedCover}
                onClick={openVideoDialog}
              >
                <Video />
                Video
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Button
                type="button"
                variant="outline"
                className={YOUTUBE_BUTTON_CLASS}
                disabled={isBusy || !hasGeneratedVideo}
                onClick={uploadToYouTube}
              >
                <YoutubeLogoIcon />
                YouTube
              </Button>
              <Button
                type="button"
                variant="outline"
                className={DISTROKID_BUTTON_CLASS}
                disabled={isDistroKidBlockedByBusy || !hasGeneratedCover}
                onClick={openDistroKidPublish}
              >
                <RadioTower />
                DistroKid
              </Button>
            </div>
          </div>
        </div>

        <audio
          ref={audioRef}
          preload="metadata"
          aria-label={`Album player for ${album.title}`}
          onEnded={() => setIsPlaying(false)}
          onError={() => {
            setIsPlaying(false)
            setPlayerError("Could not load this audio file.")
          }}
          onPause={() => setIsPlaying(false)}
          onPlay={() => setIsPlaying(true)}
          onDurationChange={syncAudioProgress}
          onLoadedMetadata={syncAudioProgress}
          onTimeUpdate={syncAudioProgress}
        >
          <track kind="captions" />
        </audio>

        {album.video ? (
          <section className="mt-4 overflow-hidden rounded-md border bg-background">
            <button
              aria-controls={videoPreviewId}
              aria-expanded={isVideoPreviewOpen}
              className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left transition hover:bg-muted/40 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
              type="button"
              onClick={() => setIsVideoPreviewOpen((isOpen) => !isOpen)}
            >
              <span className="flex min-w-0 items-center gap-2">
                <ChevronDown
                  className={`size-4 shrink-0 text-muted-foreground transition-transform ${
                    isVideoPreviewOpen ? "rotate-0" : "-rotate-90"
                  }`}
                />
                <Video className="size-4 shrink-0 text-muted-foreground" />
                <span className="truncate text-sm font-medium">
                  {videoTitleForDisplay}
                </span>
              </span>
              <span className="text-xs text-muted-foreground">
                {isVideoPreviewOpen ? "Hide" : "Show"}
              </span>
            </button>

            {isVideoPreviewOpen ? (
              <VideoPreview
                album={album}
                id={videoPreviewId}
                title={videoTitleForDisplay}
              />
            ) : null}
          </section>
        ) : null}

        <ol className="mt-4 divide-y rounded-md border">
          {album.tracks.map((track) => (
            <TrackRow
              key={track.name}
              track={track}
              duration={
                activeTrack?.name === track.name
                  ? activeDuration
                  : trackDurations[track.name]
              }
              currentTime={displayedTime}
              disabled={isBusy}
              isActive={activeTrack?.name === track.name}
              isPlaying={activeTrack?.name === track.name && isPlaying}
              canSeek={activeTrack?.name === track.name && canSeek}
              onDelete={() => void deleteTrack(track)}
              onPlay={() => void toggleTrack(track)}
              onSeek={seekTo}
            />
          ))}
        </ol>
        {playerError ? (
          <output className="mt-3 block text-sm text-destructive">
            {playerError}
          </output>
        ) : null}
        {isCoverPreviewOpen && coverVariants.length > 0 ? (
          <CoverPreviewDialog
            album={album}
            coverVariants={coverVariants}
            index={coverPreviewIndex}
            onClose={() => setIsCoverPreviewOpen(false)}
            onIndexChange={setCoverPreviewIndex}
          />
        ) : null}
        {isCoverPickerOpen ? (
          <CoverInspirationDialog
            album={album}
            error={inspirationError}
            coverText={coverText}
            defaultCoverText={defaultCoverOverlayText(inspirationDefaults)}
            defaultVideoImageText={inspirationDefaults.videoImageText}
            inspirations={inspirations}
            isBusy={isBusy}
            isLoading={isLoadingInspirations}
            isSuggestingPrompt={isSuggestingCoverPrompt}
            coverPrompt={coverPrompt}
            promptSuggestionError={coverPromptSuggestionError}
            selectedInspirationIds={selectedInspirationIds}
            videoImageText={videoImageText}
            onClose={() => setIsCoverPickerOpen(false)}
            onCoverPromptChange={setCoverPrompt}
            onCoverTextChange={updateCoverText}
            onGenerate={generateCover}
            onSelect={toggleSelectedInspiration}
            onSuggestPrompt={requestCoverPromptSuggestion}
            onVideoImageTextChange={setVideoImageText}
          />
        ) : null}
        {isVideoDialogOpen ? (
          <VideoNameDialog
            album={album}
            description={videoDescription}
            defaultVideoDescription={inspirationDefaults.videoDescription}
            isBusy={isBusy}
            isSuggestingTitle={isSuggestingVideoTitle}
            suggestionError={videoTitleSuggestionError}
            defaultVideoTitle={inspirationDefaults.videoTitle}
            value={videoTitle}
            onChange={setVideoTitle}
            onClose={() => setIsVideoDialogOpen(false)}
            onDescriptionChange={setVideoDescription}
            onGenerate={generateVideo}
            onSuggestTitle={requestVideoTitleSuggestion}
          />
        ) : null}
      </div>
    </article>
  )
}

function CoverPreviewDialog({
  album,
  coverVariants,
  index,
  onClose,
  onIndexChange,
}: {
  album: Album
  coverVariants: Array<CoverVariant>
  index: number
  onClose: () => void
  onIndexChange: (index: number) => void
}) {
  const activeIndex = Math.min(Math.max(index, 0), coverVariants.length - 1)
  const activeVariant = coverVariants[activeIndex]
  const hasMultipleVariants = coverVariants.length > 1

  function move(step: number) {
    const nextIndex =
      (activeIndex + step + coverVariants.length) % coverVariants.length

    onIndexChange(nextIndex)
  }

  return (
    <dialog
      open
      aria-label={`${album.title} cover preview`}
      aria-modal="true"
      className="fixed inset-0 z-50 m-0 grid h-auto max-h-none w-auto max-w-none place-items-center border-0 bg-black/85 p-4 text-inherit"
    >
      <button
        type="button"
        aria-label="Close cover preview"
        className="absolute inset-0 cursor-default"
        onClick={onClose}
      />
      <div className="relative grid w-full max-w-5xl gap-3">
        <div className="relative grid place-items-center">
          {hasMultipleVariants ? (
            <button
              type="button"
              aria-label="Previous cover variation"
              className="absolute left-2 z-10 grid size-10 place-items-center rounded-md border border-white/20 bg-black/50 text-white backdrop-blur transition outline-none hover:bg-black/70 focus-visible:ring-3 focus-visible:ring-white/50 md:left-4"
              onClick={() => move(-1)}
            >
              <ChevronLeft className="size-5" />
            </button>
          ) : null}
          <img
            alt={`${album.title} ${activeVariant.label} cover`}
            src={`${activeVariant.url}&t=${album.updatedAt}`}
            className="max-h-[76svh] max-w-full rounded-md object-contain shadow-2xl"
          />
          {hasMultipleVariants ? (
            <button
              type="button"
              aria-label="Next cover variation"
              className="absolute right-2 z-10 grid size-10 place-items-center rounded-md border border-white/20 bg-black/50 text-white backdrop-blur transition outline-none hover:bg-black/70 focus-visible:ring-3 focus-visible:ring-white/50 md:right-4"
              onClick={() => move(1)}
            >
              <ChevronRight className="size-5" />
            </button>
          ) : null}
        </div>

        <div className="mx-auto flex max-w-full items-center gap-2 overflow-x-auto rounded-md border border-white/20 bg-black/50 p-2 text-white backdrop-blur">
          {coverVariants.map((variant, variantIndex) => (
            <button
              key={variant.kind}
              type="button"
              aria-label={`Show ${variant.label} cover`}
              aria-pressed={variantIndex === activeIndex}
              className={`flex min-w-28 items-center gap-2 rounded-sm border px-2 py-1.5 text-left text-xs transition outline-none focus-visible:ring-3 focus-visible:ring-white/50 ${
                variantIndex === activeIndex
                  ? "border-white bg-white text-black"
                  : "border-white/20 bg-black/30 hover:bg-black/60"
              }`}
              onClick={() => onIndexChange(variantIndex)}
            >
              <img
                alt=""
                src={`${variant.url}&t=${album.updatedAt}`}
                className={
                  variant.aspectRatio === "16:9"
                    ? "h-9 w-14 shrink-0 rounded-sm object-cover"
                    : "size-9 shrink-0 rounded-sm object-cover"
                }
              />
              <span className="truncate">{variant.label}</span>
            </button>
          ))}
        </div>
      </div>
      <button
        type="button"
        aria-label="Close cover preview"
        className="absolute top-4 right-4 grid size-10 place-items-center rounded-md border border-white/20 bg-black/50 text-white backdrop-blur transition outline-none hover:bg-black/70 focus-visible:ring-3 focus-visible:ring-white/50"
        onClick={onClose}
      >
        <X className="size-5" />
      </button>
    </dialog>
  )
}

function albumCoverVariants(album: Album): Array<CoverVariant> {
  if (album.coverVariants.length > 0) {
    return album.coverVariants
  }

  if (!album.cover) {
    return []
  }

  return [
    {
      aspectRatio: album.coverAspectRatio,
      file: "cover",
      kind: album.coverAspectRatio === "1:1" ? "square" : "widescreen",
      label: album.coverAspectRatio.replace(":", "/"),
      url: album.cover,
    },
  ]
}

function primaryAlbumCover(album: Album) {
  const coverVariants = albumCoverVariants(album)

  return (
    coverVariants.find((variant) => variant.kind === "widescreen-title")?.url ||
    coverVariants[0]?.url ||
    album.cover
  )
}

function CoverInspirationDialog({
  album,
  coverPrompt,
  coverText,
  defaultCoverText,
  defaultVideoImageText,
  error,
  inspirations,
  isBusy,
  isLoading,
  isSuggestingPrompt,
  onClose,
  onCoverPromptChange,
  onCoverTextChange,
  onGenerate,
  onSelect,
  onSuggestPrompt,
  onVideoImageTextChange,
  promptSuggestionError,
  selectedInspirationIds,
  videoImageText,
}: {
  album: Album
  coverPrompt: string
  coverText: CoverOverlayText
  defaultCoverText: CoverOverlayText
  defaultVideoImageText: string
  error: string
  inspirations: Array<Inspiration>
  isBusy: boolean
  isLoading: boolean
  isSuggestingPrompt: boolean
  onClose: () => void
  onCoverPromptChange: (prompt: string) => void
  onCoverTextChange: (field: CoverOverlayTextField, value: string) => void
  onGenerate: (inspirations: Array<Inspiration>) => void
  onSelect: (id: string) => void
  onSuggestPrompt: () => void
  onVideoImageTextChange: (value: string) => void
  promptSuggestionError: string
  selectedInspirationIds: Array<string>
  videoImageText: string
}) {
  const hasCoverPrompt = coverPrompt.trim().length > 0
  const selectedInspirations = inspirations.filter((inspiration) =>
    selectedInspirationIds.includes(inspiration.id)
  )

  return (
    <dialog
      open
      aria-label={`Choose cover inspiration for ${album.title}`}
      aria-modal="true"
      className="fixed inset-0 z-50 m-0 grid h-auto max-h-none w-auto max-w-none place-items-center border-0 bg-black/75 p-4 text-inherit"
    >
      <button
        type="button"
        aria-label="Close inspiration chooser"
        className="absolute inset-0 cursor-default"
        onClick={onClose}
      />
      <div className="relative z-10 grid max-h-[88svh] w-full max-w-3xl grid-rows-[minmax(0,1fr)_auto] overflow-hidden rounded-lg border bg-background shadow-2xl">
        <div className="grid gap-4 overflow-auto p-4">
          {error ? (
            <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          ) : null}

          <div className="grid gap-3 sm:grid-cols-2">
            <CoverTextInput
              album={album}
              defaultText={defaultCoverText.topText}
              disabled={isBusy}
              field="topText"
              label="Top text"
              value={coverText.topText}
              onChange={onCoverTextChange}
            />
            <div className="grid gap-2">
              <Label htmlFor={`video-image-text-${album.folder}`}>
                Main title
              </Label>
              <InputGroup>
                <InputGroupInput
                  id={`video-image-text-${album.folder}`}
                  value={videoImageText}
                  disabled={isBusy}
                  placeholder={defaultVideoImageText}
                  onChange={(event) =>
                    onVideoImageTextChange(event.currentTarget.value)
                  }
                />
              </InputGroup>
            </div>
            <CoverTextTextarea
              album={album}
              defaultText={defaultCoverText.leftText}
              disabled={isBusy}
              field="leftText"
              label="Left side text"
              value={coverText.leftText}
              onChange={onCoverTextChange}
            />
            <CoverTextTextarea
              album={album}
              defaultText={defaultCoverText.rightText}
              disabled={isBusy}
              field="rightText"
              label="Right side text"
              value={coverText.rightText}
              onChange={onCoverTextChange}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor={`cover-prompt-${album.folder}`}>Cover prompt</Label>
            <InputGroup className="min-h-24 items-start">
              <InputGroupTextarea
                id={`cover-prompt-${album.folder}`}
                value={coverPrompt}
                disabled={isBusy || isSuggestingPrompt}
                placeholder="Late-night Shibuya arcade, glossy magazine lighting, blue neon reflections..."
                className="min-h-24 resize-y"
                onChange={(event) =>
                  onCoverPromptChange(event.currentTarget.value)
                }
              />
              <InputGroupAddon align="inline-end" className="items-start pt-2">
                <InputGroupButton
                  type="button"
                  size="icon-sm"
                  aria-label="Generate cover prompt with Codex"
                  title="Generate cover prompt with Codex"
                  disabled={isBusy || isSuggestingPrompt}
                  onClick={onSuggestPrompt}
                >
                  <Sparkles
                    className={isSuggestingPrompt ? "animate-spin" : undefined}
                  />
                </InputGroupButton>
              </InputGroupAddon>
            </InputGroup>
            {promptSuggestionError ? (
              <output className="text-xs text-destructive">
                {promptSuggestionError}
              </output>
            ) : null}
          </div>

          {isLoading ? (
            <div className="grid min-h-36 place-items-center rounded-md border bg-muted/30 text-sm text-muted-foreground">
              Loading inspirations…
            </div>
          ) : inspirations.length > 0 ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {inspirations.map((inspiration, index) => {
                const isSelected = selectedInspirationIds.includes(
                  inspiration.id
                )

                return (
                  <button
                    key={inspiration.id}
                    type="button"
                    aria-label={`Toggle cover inspiration ${index + 1}`}
                    aria-pressed={isSelected}
                    className={`group relative grid overflow-hidden rounded-lg border bg-card shadow-sm transition hover:border-primary/50 hover:bg-muted/20 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none ${
                      isSelected ? "border-primary ring-2 ring-primary/20" : ""
                    }`}
                    onClick={() => onSelect(inspiration.id)}
                  >
                    <InspirationThumbnail
                      inspiration={inspiration}
                      className="aspect-square w-full object-cover"
                    />
                    {inspiration.source === "youtube" ? (
                      <span className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-background/95 via-background/75 to-transparent px-3 pt-10 pb-3 text-left opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
                        <span className="line-clamp-2 text-sm leading-5 font-medium">
                          {inspiration.title}
                        </span>
                      </span>
                    ) : null}
                    <span className="absolute top-2 right-2 grid size-7 place-items-center rounded-full border bg-background/95 shadow-sm">
                      {isSelected ? (
                        <Check className="size-4 text-primary" />
                      ) : null}
                    </span>
                  </button>
                )
              })}
            </div>
          ) : (
            <div className="grid min-h-36 place-items-center rounded-md border bg-muted/30 px-4 text-center">
              <div>
                <Sparkles className="mx-auto mb-2 size-5 text-muted-foreground" />
                <p className="text-sm font-medium">No inspirations saved</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Open the extension on a YouTube video to save one.
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end border-t bg-background/95 p-4 shadow-[0_-10px_24px_rgba(0,0,0,0.08)]">
          <Button
            type="button"
            disabled={isBusy || isSuggestingPrompt || !hasCoverPrompt}
            onClick={() => onGenerate(selectedInspirations)}
          >
            <Sparkles />
            Generate cover
          </Button>
        </div>
      </div>
    </dialog>
  )
}

function CoverTextInput({
  album,
  defaultText,
  disabled,
  field,
  label,
  onChange,
  value,
}: {
  album: Album
  defaultText: string
  disabled: boolean
  field: CoverOverlayTextField
  label: string
  onChange: (field: CoverOverlayTextField, value: string) => void
  value: string
}) {
  const id = `cover-${field}-${album.folder}`

  return (
    <div className="grid gap-2">
      <Label htmlFor={id}>{label}</Label>
      <InputGroup>
        <InputGroupInput
          id={id}
          value={value}
          disabled={disabled}
          placeholder={defaultText}
          onChange={(event) => onChange(field, event.currentTarget.value)}
        />
      </InputGroup>
    </div>
  )
}

function CoverTextTextarea({
  album,
  defaultText,
  disabled,
  field,
  label,
  onChange,
  value,
}: {
  album: Album
  defaultText: string
  disabled: boolean
  field: CoverOverlayTextField
  label: string
  onChange: (field: CoverOverlayTextField, value: string) => void
  value: string
}) {
  const id = `cover-${field}-${album.folder}`

  return (
    <div className="grid gap-2">
      <Label htmlFor={id}>{label}</Label>
      <InputGroup className="min-h-20 items-start">
        <InputGroupTextarea
          id={id}
          value={value}
          disabled={disabled}
          placeholder={defaultText}
          className="min-h-20 resize-y"
          onChange={(event) => onChange(field, event.currentTarget.value)}
        />
      </InputGroup>
    </div>
  )
}

function VideoNameDialog({
  album,
  defaultVideoDescription,
  defaultVideoTitle,
  description,
  isBusy,
  isSuggestingTitle,
  onChange,
  onClose,
  onDescriptionChange,
  onGenerate,
  onSuggestTitle,
  suggestionError,
  value,
}: {
  album: Album
  defaultVideoDescription: string
  defaultVideoTitle: string
  description: string
  isBusy: boolean
  isSuggestingTitle: boolean
  onChange: (value: string) => void
  onClose: () => void
  onDescriptionChange: (value: string) => void
  onGenerate: () => void
  onSuggestTitle: () => void
  suggestionError: string
  value: string
}) {
  return (
    <dialog
      open
      aria-label={`Set video details for ${album.title}`}
      aria-modal="true"
      className="fixed inset-0 z-50 m-0 grid h-auto max-h-none w-auto max-w-none place-items-center border-0 bg-black/75 p-4 text-inherit"
    >
      <button
        type="button"
        aria-label="Close video name dialog"
        className="absolute inset-0 cursor-default"
        onClick={onClose}
      />
      <div className="relative z-10 grid max-h-[88svh] w-full max-w-2xl grid-rows-[minmax(0,1fr)_auto] overflow-hidden rounded-lg border bg-background shadow-2xl">
        <div className="grid gap-4 overflow-auto p-4">
          <div className="grid gap-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <Label htmlFor={`video-title-${album.folder}`}>Video name</Label>
              <code className="rounded-sm border bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
                {VIDEO_NAME_TOKEN}
              </code>
            </div>
            <InputGroup>
              <InputGroupInput
                id={`video-title-${album.folder}`}
                value={value}
                disabled={isBusy || isSuggestingTitle}
                placeholder={defaultVideoTitle}
                onChange={(event) => onChange(event.currentTarget.value)}
              />
              <InputGroupAddon align="inline-end">
                <InputGroupButton
                  type="button"
                  size="icon-sm"
                  aria-label="Generate YouTube title with Codex"
                  title="Generate YouTube title with Codex"
                  disabled={isBusy || isSuggestingTitle}
                  onClick={onSuggestTitle}
                >
                  <Sparkles
                    className={isSuggestingTitle ? "animate-spin" : undefined}
                  />
                </InputGroupButton>
              </InputGroupAddon>
            </InputGroup>
            {suggestionError ? (
              <output className="text-xs text-destructive">
                {suggestionError}
              </output>
            ) : null}
          </div>

          <div className="grid gap-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <Label htmlFor={`video-description-${album.folder}`}>
                Description
              </Label>
              <code className="rounded-sm border bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
                {VIDEO_TRACKLIST_TOKEN}
              </code>
            </div>
            <InputGroup className="min-h-44 items-start">
              <InputGroupTextarea
                id={`video-description-${album.folder}`}
                value={description}
                disabled={isBusy}
                placeholder={defaultVideoDescription}
                className="min-h-44 resize-y font-mono text-sm"
                onChange={(event) =>
                  onDescriptionChange(event.currentTarget.value)
                }
              />
            </InputGroup>
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t bg-background/95 p-4 shadow-[0_-10px_24px_rgba(0,0,0,0.08)]">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="button"
            disabled={isBusy || isSuggestingTitle}
            onClick={onGenerate}
          >
            <Video />
            Generate video
          </Button>
        </div>
      </div>
    </dialog>
  )
}

function VideoPreview({
  album,
  id,
  title,
}: {
  album: Album
  id: string
  title: string
}) {
  return (
    <div id={id} className="border-t bg-background">
      <div className="aspect-video bg-zinc-950">
        <video
          aria-label={`${album.title} generated video`}
          controls
          playsInline
          preload="metadata"
          poster={videoPoster(album)}
          src={album.video || undefined}
          className="h-full w-full bg-zinc-950 object-contain"
        >
          <track kind="captions" />
        </video>
      </div>
      <div className="grid gap-3 p-4">
        <div>
          <h4 className="line-clamp-2 text-lg font-semibold">{title}</h4>
        </div>
        <div className="rounded-lg bg-muted/60 p-3">
          <div className="mb-2 text-sm font-medium">Description</div>
          <p className="max-h-64 overflow-auto text-sm whitespace-pre-wrap text-muted-foreground">
            {album.videoDescription || "No generated description found."}
          </p>
        </div>
      </div>
    </div>
  )
}

function videoPoster(album: Album) {
  return (
    albumCoverVariants(album).find(
      (variant) => variant.kind === "widescreen-title"
    )?.url ||
    album.cover ||
    undefined
  )
}

function TrackRow({
  canSeek,
  currentTime,
  disabled,
  duration,
  isActive,
  isPlaying,
  onDelete,
  onPlay,
  onSeek,
  track,
}: {
  canSeek: boolean
  currentTime: number
  disabled: boolean
  duration: number | undefined
  isActive: boolean
  isPlaying: boolean
  onDelete: () => void
  onPlay: () => void
  onSeek: (time: number) => void
  track: AlbumTrack
}) {
  const formattedDuration = duration ? formatTime(duration) : "--:--"
  const playLabel = isPlaying ? "Pause" : "Play"

  return (
    <li className="grid gap-2 p-3 text-sm">
      <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
        <div className="min-w-0">
          <div className="flex min-w-0 items-center gap-3">
            <div className="truncate font-medium text-foreground">
              {track.title}
            </div>
            <div className="shrink-0 font-mono text-xs text-muted-foreground tabular-nums">
              {formattedDuration}
            </div>
          </div>
          {isActive ? (
            <div className="mt-1 text-xs text-muted-foreground">
              {isPlaying ? "Playing" : "Paused"} · {formatTime(currentTime)} /{" "}
              {formattedDuration}
            </div>
          ) : null}
        </div>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant={isPlaying ? "default" : "outline"}
            disabled={disabled}
            onClick={onPlay}
          >
            {isPlaying ? <Pause /> : <Play />}
            {playLabel}
          </Button>
          <Button
            type="button"
            variant="destructive"
            disabled={disabled}
            aria-label={`Delete ${track.title}`}
            title={`Delete ${track.title}`}
            onClick={onDelete}
          >
            <Trash2 />
          </Button>
        </div>
      </div>
      {isActive ? (
        <input
          type="range"
          min={0}
          max={duration || 0}
          step={0.1}
          value={currentTime}
          disabled={!canSeek}
          aria-label={`Seek within ${track.title}`}
          className="h-2 w-full cursor-pointer accent-primary disabled:cursor-not-allowed disabled:opacity-40"
          onChange={(event) => onSeek(event.currentTarget.valueAsNumber)}
          onInput={(event) => onSeek(event.currentTarget.valueAsNumber)}
        />
      ) : null}
    </li>
  )
}

function useTrackDurations(tracks: Array<AlbumTrack>) {
  const [durations, setDurations] = useState<Record<string, number>>(() =>
    initialTrackDurations(tracks)
  )

  useEffect(() => {
    let isCancelled = false
    const audioElements: Array<HTMLAudioElement> = []
    const cleanupMetadataListeners: Array<() => void> = []

    setDurations(initialTrackDurations(tracks))

    for (const track of tracks) {
      if (track.duration) {
        continue
      }

      const audio = new Audio(track.url)

      audio.preload = "metadata"
      audioElements.push(audio)

      const updateDuration = () => {
        if (isCancelled || !Number.isFinite(audio.duration)) {
          return
        }

        setDurations((currentDurations) => ({
          ...currentDurations,
          [track.name]: audio.duration,
        }))
      }

      audio.addEventListener("durationchange", updateDuration)
      audio.addEventListener("loadedmetadata", updateDuration)
      cleanupMetadataListeners.push(() => {
        audio.removeEventListener("durationchange", updateDuration)
        audio.removeEventListener("loadedmetadata", updateDuration)
      })
      audio.load()
    }

    return () => {
      isCancelled = true

      for (const cleanup of cleanupMetadataListeners) {
        cleanup()
      }

      for (const audio of audioElements) {
        audio.pause()
        audio.removeAttribute("src")
        audio.load()
      }
    }
  }, [tracks])

  return durations
}

function initialTrackDurations(tracks: Array<AlbumTrack>) {
  return Object.fromEntries(
    tracks.flatMap((track) =>
      track.duration && Number.isFinite(track.duration)
        ? [[track.name, track.duration]]
        : []
    )
  )
}

export function useAlbumDurationText(tracks: Array<AlbumTrack>) {
  const durations = useTrackDurations(tracks)
  const totalDuration = totalTrackDuration(tracks, durations)

  return totalDuration ? formatTime(totalDuration) : "--:--"
}

function totalTrackDuration(
  tracks: Array<AlbumTrack>,
  durations: Record<string, number>
) {
  let totalDuration = 0

  for (const track of tracks) {
    const duration = durations[track.name]

    if (!duration) {
      return null
    }

    totalDuration += duration
  }

  return totalDuration
}

function formatTime(seconds: number) {
  if (!Number.isFinite(seconds) || seconds <= 0) {
    return "0:00"
  }

  const wholeSeconds = Math.floor(seconds)
  const hours = Math.floor(wholeSeconds / 3600)
  const minutes = Math.floor((wholeSeconds % 3600) / 60)
  const remainingSeconds = wholeSeconds % 60
  const paddedSeconds = String(remainingSeconds).padStart(2, "0")

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, "0")}:${paddedSeconds}`
  }

  return `${minutes}:${paddedSeconds}`
}
