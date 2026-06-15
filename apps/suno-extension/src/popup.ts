/* eslint-disable max-lines -- The extension popup includes the DistroKid form filler because Chrome executeScript needs a serializable function in this bundle. */
const distrokidAlbumHashKey = "city-pop-chan-album"
const distrokidAlbumFolderPattern = /^[\p{L}\p{N}._-]+$/u
const fallbackPerformerName = "City Pop Chan"
const fallbackPerformerRole = "Singing & vocals"
const fallbackProducerName = "Leo Combaret"
const fallbackProducerRole = "Producer"
const fallbackSongwriterRealName = "Leo Combaret"
const studioOrigin = "http://127.0.0.1:4177"

type SunoClip = {
  id: string
  title: string
}

type SunoCollection = {
  clips: Array<SunoClip>
  expectedCount: number
}

type YoutubeInspiration = {
  thumbnailUrl: string
  title: string
  url: string
  videoId: string
}

type YoutubeInspirationKind = "cover" | "videoTitle"

type PinterestInspiration = {
  imageUrl: string
  title: string
  url: string
}

type DistroKidPreparedRelease = {
  album: {
    folder: string
    title: string
    trackCount: number
  }
  artwork: {
    file: string
  }
  formHints: {
    albumTitle: string
    artistName: string
    language: string
    performerName: string
    performerRole: string
    primaryGenre: string
    producerName: string
    producerRole: string
    secondaryGenre: string
    songwriterRealName: string
  }
  tracks: Array<{
    file: string
    sequence: number
    title: string
  }>
}

type DistroKidFillPayload = {
  albumTitle: string
  artwork: DistroKidFillFile
  language: string
  performerName: string
  performerRole: string
  primaryGenre: string
  producerName: string
  producerRole: string
  secondaryGenre: string
  songwriterRealName: string
  tracks: Array<
    DistroKidFillFile & {
      sequence: number
      title: string
    }
  >
}

type DistroKidFillFile = {
  fileName: string
  url: string
}

type DistroKidFillReport = {
  creditCount: number
  fieldCount: number
  fileCount: number
  mandatoryCheckboxCount: number
  songwriterCount: number
  trackFiles: number
  warnings: Array<string>
}

type PopupState =
  | { mode: "empty" }
  | { albumFolder: string; mode: "distrokid" }
  | { clips: Array<SunoClip>; expectedCount: number; mode: "suno" }
  | { inspiration: PinterestInspiration; mode: "pinterest" }
  | { inspiration: YoutubeInspiration; mode: "youtube" }

const state: { current: PopupState } = {
  current: { mode: "empty" },
}

const elements = {
  count: requiredElement("count", HTMLElement),
  distrokidAlbum: requiredElement("distrokid-album", HTMLElement),
  distrokidMessage: requiredElement("distrokid-message", HTMLElement),
  distrokidView: requiredElement("distrokid-view", HTMLElement),
  emptyView: requiredElement("empty-view", HTMLElement),
  fillDistroKid: requiredElement("fill-distrokid", HTMLButtonElement),
  refresh: requiredElement("refresh", HTMLButtonElement),
  saveBothInspiration: requiredElement(
    "save-both-inspiration",
    HTMLButtonElement
  ),
  saveThumbnailInspiration: requiredElement(
    "save-thumbnail-inspiration",
    HTMLButtonElement
  ),
  saveTitleInspiration: requiredElement(
    "save-title-inspiration",
    HTMLButtonElement
  ),
  sendStudio: requiredElement("send-studio", HTMLButtonElement),
  source: requiredElement("source", HTMLElement),
  status: requiredElement("status", HTMLElement),
  sunoMessage: requiredElement("suno-message", HTMLElement),
  sunoView: requiredElement("suno-view", HTMLElement),
  youtubeThumbnail: requiredElement("youtube-thumbnail", HTMLImageElement),
  youtubeTitle: requiredElement("youtube-title", HTMLElement),
  youtubeView: requiredElement("youtube-view", HTMLElement),
}

document.addEventListener("DOMContentLoaded", () => {
  bindActions()
  void refresh()
})

function bindActions() {
  elements.refresh.addEventListener("click", () => {
    void refresh()
  })
  elements.sendStudio.addEventListener("click", () => {
    void sendIdsToStudio()
  })
  elements.saveThumbnailInspiration.addEventListener("click", () => {
    void saveCoverInspiration()
  })
  elements.saveTitleInspiration.addEventListener("click", () => {
    void saveYoutubeInspiration(["videoTitle"])
  })
  elements.saveBothInspiration.addEventListener("click", () => {
    void saveYoutubeInspiration(["cover", "videoTitle"])
  })
  elements.fillDistroKid.addEventListener("click", () => {
    void fillDistroKid()
  })
}

async function refresh() {
  setStatus("Reading current tab...")
  setPrimaryButtonsDisabled(true)

  try {
    state.current = await currentTabState()
    render()
  } catch (error) {
    state.current = { mode: "empty" }
    render()
    setStatus(errorMessage(error), "error")
  }
}

async function currentTabState(): Promise<PopupState> {
  const tab = await activeTab()

  if (!tab.id || !tab.url) {
    throw new Error("Open a Suno, YouTube, Pinterest, or DistroKid tab.")
  }

  return tabState(tab.id, new URL(tab.url))
}

async function tabState(tabId: number, url: URL): Promise<PopupState> {
  if (url.hostname.endsWith("suno.com")) {
    return sunoState(tabId)
  }

  if (isDistroKidUrl(url)) {
    return {
      albumFolder: distrokidAlbumFolderFromUrl(url),
      mode: "distrokid",
    }
  }

  if (isYoutubeUrl(url)) {
    return youtubeState(tabId)
  }

  if (isPinterestUrl(url)) {
    return pinterestState(tabId)
  }

  throw new Error("Open a Suno, YouTube, Pinterest, or DistroKid tab.")
}

async function sunoState(tabId: number): Promise<PopupState> {
  const [result] = await chrome.scripting.executeScript({
    func: collectSunoLinksFromPage,
    target: { tabId },
  })
  const collection = normalizeSunoCollection(result?.result)

  return { ...collection, mode: "suno" }
}

async function youtubeState(tabId: number): Promise<PopupState> {
  const [result] = await chrome.scripting.executeScript({
    func: collectYoutubeInspirationFromPage,
    target: { tabId },
  })
  const inspiration = normalizeYoutubeInspiration(result?.result)

  return { inspiration, mode: "youtube" }
}

async function pinterestState(tabId: number): Promise<PopupState> {
  const [result] = await chrome.scripting.executeScript({
    func: collectPinterestInspirationFromPage,
    target: { tabId },
  })
  const inspiration = normalizePinterestInspiration(result?.result)

  return { inspiration, mode: "pinterest" }
}

function render() {
  const current = state.current

  elements.distrokidView.hidden = current.mode !== "distrokid"
  elements.sunoView.hidden = current.mode !== "suno"
  elements.youtubeView.hidden = !isImageInspirationState(current)
  elements.emptyView.hidden = current.mode !== "empty"

  if (current.mode === "suno") {
    const count = current.clips.length
    const expected = current.expectedCount
    const isReady = count > 0 && (expected === 0 || count >= expected)
    const message = isReady
      ? expected > 0
        ? `Ready to load ${count}/${expected} in Studio.`
        : "Ready to load in Studio."
      : count > 0
        ? expected > 0
          ? `Found ${count}/${expected}. Reset Suno filters or refresh if songs are still missing.`
          : `Found ${count}. Refresh if songs are still missing.`
        : "No visible Suno song links found."

    elements.count.textContent =
      expected > 0 ? `${count}/${expected}` : String(count)
    elements.source.textContent = "Suno"
    elements.sunoMessage.textContent = message
    elements.sendStudio.disabled = count === 0
    setYoutubeButtonsDisabled(true)
    elements.fillDistroKid.disabled = true
    setStatus(message, count > 0 ? "ok" : undefined)
    return
  }

  if (isImageInspirationState(current)) {
    renderImageInspiration(current)
    return
  }

  if (current.mode === "distrokid") {
    const hasAlbum = Boolean(current.albumFolder)
    const message = hasAlbum
      ? "Ready to fill DistroKid from the local Studio package."
      : "Open DistroKid from Studio so the album can be identified."

    elements.count.textContent = hasAlbum ? "1" : "0"
    elements.source.textContent = "DistroKid"
    elements.distrokidAlbum.textContent = current.albumFolder || "--"
    elements.distrokidMessage.textContent = message
    elements.sendStudio.disabled = true
    setYoutubeButtonsDisabled(true)
    elements.fillDistroKid.disabled = !hasAlbum
    setStatus(message, hasAlbum ? "ok" : "error")
    return
  }

  elements.count.textContent = "0"
  elements.source.textContent = "Current tab"
  setPrimaryButtonsDisabled(true)
}

function renderImageInspiration(
  current: Extract<PopupState, { mode: "pinterest" | "youtube" }>
) {
  elements.count.textContent = "1"
  elements.sendStudio.disabled = true
  elements.fillDistroKid.disabled = true

  if (current.mode === "youtube") {
    elements.source.textContent = "YouTube"
    elements.youtubeThumbnail.src = current.inspiration.thumbnailUrl
    elements.youtubeTitle.textContent = current.inspiration.title
    setYoutubeButtonsDisabled(false)
    setStatus("Ready to save thumbnail, title, or both.", "ok")
    return
  }

  elements.source.textContent = "Pinterest"
  elements.youtubeThumbnail.src = current.inspiration.imageUrl
  elements.youtubeTitle.textContent = current.inspiration.title
  elements.saveBothInspiration.disabled = true
  elements.saveThumbnailInspiration.disabled = false
  elements.saveTitleInspiration.disabled = true
  setStatus("Ready to save image as a cover inspiration.", "ok")
}

function isImageInspirationState(
  current: PopupState
): current is Extract<PopupState, { mode: "pinterest" | "youtube" }> {
  return current.mode === "youtube" || current.mode === "pinterest"
}

async function sendIdsToStudio() {
  if (state.current.mode !== "suno" || state.current.clips.length === 0) {
    setStatus("No Suno IDs to save.", "error")
    return
  }

  try {
    const ids = state.current.clips.map((clip) => clip.id).join("\n")

    await postToStudio("/api/suno/import", { ids })
    setStatus("Saved IDs for Studio.", "ok")
  } catch {
    setStatus("Start Suno Studio first: pnpm suno:studio", "error")
  }
}

async function saveCoverInspiration() {
  if (state.current.mode === "youtube") {
    await saveYoutubeInspiration(["cover"])
    return
  }

  if (state.current.mode === "pinterest") {
    await savePinterestInspiration()
    return
  }

  setStatus("No cover inspiration to save.", "error")
}

async function saveYoutubeInspiration(kinds: Array<YoutubeInspirationKind>) {
  if (state.current.mode !== "youtube") {
    setStatus("No YouTube inspiration to save.", "error")
    return
  }

  try {
    const inspiration = state.current.inspiration
    const payload: Record<string, unknown> = {
      kinds,
      thumbnailUrl: inspiration.thumbnailUrl,
      title: inspiration.title,
      url: inspiration.url,
      videoId: inspiration.videoId,
    }

    await postToStudio("/api/suno/inspirations", payload)
    setStatus(savedYoutubeInspirationMessage(kinds), "ok")
  } catch {
    setStatus("Start Suno Studio first: pnpm suno:studio", "error")
  }
}

async function savePinterestInspiration() {
  if (state.current.mode !== "pinterest") {
    setStatus("No Pinterest inspiration to save.", "error")
    return
  }

  try {
    const inspiration = state.current.inspiration
    const payload: Record<string, unknown> = {
      imageUrl: inspiration.imageUrl,
      title: inspiration.title,
      url: inspiration.url,
    }

    await postToStudio("/api/suno/inspirations", payload)
    setStatus("Saved Pinterest image for cover generation.", "ok")
  } catch {
    setStatus("Start Suno Studio first: pnpm suno:studio", "error")
  }
}

function savedYoutubeInspirationMessage(kinds: Array<YoutubeInspirationKind>) {
  if (kinds.length > 1) {
    return "Saved thumbnail and title inspirations."
  }

  return kinds[0] === "cover"
    ? "Saved thumbnail for cover generation."
    : "Saved title for video naming."
}

async function fillDistroKid() {
  if (state.current.mode !== "distrokid") {
    setStatus("Open DistroKid from Studio first.", "error")
    return
  }

  const albumFolder = state.current.albumFolder

  if (!albumFolder) {
    setStatus("Open DistroKid from a Studio Publish button first.", "error")
    return
  }

  try {
    const tab = await activeTab()

    if (!tab.id || !tab.url || !isDistroKidUrl(new URL(tab.url))) {
      throw new Error("Open the DistroKid upload tab, then try again.")
    }

    elements.fillDistroKid.disabled = true
    setStatus("Preparing the local DistroKid package...")

    const release = await prepareDistroKidRelease(albumFolder)
    const payload = distrokidFillPayload(release)

    setStatus("Filling DistroKid form and attaching files...")

    const [result] = await chrome.scripting.executeScript({
      args: [payload],
      func: fillDistroKidReleaseForm,
      target: { tabId: tab.id },
    })
    const report = normalizeDistroKidFillReport(result?.result)
    const message =
      report.warnings.length > 0
        ? `Filled with ${report.warnings.length} warning${
            report.warnings.length === 1 ? "" : "s"
          }. Review DistroKid before submitting.`
        : `Filled album, cover, ${report.songwriterCount}/${payload.tracks.length} songwriters, ${report.creditCount}/${payload.tracks.length} Apple credits, ${report.mandatoryCheckboxCount}/5 mandatory boxes, and ${report.trackFiles}/${payload.tracks.length} tracks. Review before submitting.`

    setStatus(message, report.warnings.length > 0 ? undefined : "ok")
  } catch (error) {
    setStatus(errorMessage(error), "error")
  } finally {
    elements.fillDistroKid.disabled =
      state.current.mode !== "distrokid" || !state.current.albumFolder
  }
}

async function prepareDistroKidRelease(albumFolder: string) {
  const data = await postToStudio(
    `/api/suno/albums/${encodeURIComponent(albumFolder)}/publish`,
    {}
  )

  if (!isRecord(data)) {
    throw new Error("Studio did not return a DistroKid package.")
  }

  return normalizeDistroKidPreparedRelease(data.distrokid)
}

function distrokidFillPayload(
  release: DistroKidPreparedRelease
): DistroKidFillPayload {
  const folder = release.album.folder
  const tracks = release.tracks
    .toSorted((left, right) => left.sequence - right.sequence)
    .map((track) => ({
      fileName: track.file,
      sequence: track.sequence,
      title: track.title,
      url: studioMediaUrl(folder, `distrokid/${track.file}`),
    }))

  return {
    albumTitle: release.formHints.albumTitle || release.album.title,
    artwork: {
      fileName: release.artwork.file,
      url: studioMediaUrl(folder, `distrokid/${release.artwork.file}`),
    },
    language: release.formHints.language,
    performerName: release.formHints.performerName || fallbackPerformerName,
    performerRole: release.formHints.performerRole || fallbackPerformerRole,
    primaryGenre: release.formHints.primaryGenre,
    producerName: release.formHints.producerName || fallbackProducerName,
    producerRole: release.formHints.producerRole || fallbackProducerRole,
    secondaryGenre: release.formHints.secondaryGenre,
    songwriterRealName:
      release.formHints.songwriterRealName || fallbackSongwriterRealName,
    tracks,
  }
}

function studioMediaUrl(folder: string, file: string) {
  const params = new URLSearchParams({ file, folder })

  return `${studioOrigin}/api/suno/media?${params.toString()}`
}

async function postToStudio(
  pathname: string,
  body: Record<string, unknown>
): Promise<unknown> {
  const response = await fetch(`${studioOrigin}${pathname}`, {
    body: JSON.stringify(body),
    headers: { "content-type": "application/json" },
    method: "POST",
  })
  const data: unknown = await response.json().catch(() => null)

  if (!response.ok) {
    const message = isRecord(data) ? stringValue(data.error) : ""

    throw new Error(message || "Studio request failed.")
  }

  return data
}

async function activeTab() {
  const [tab] = await chrome.tabs.query({
    active: true,
    currentWindow: true,
  })

  return tab
}

function setPrimaryButtonsDisabled(disabled: boolean) {
  elements.fillDistroKid.disabled = disabled
  elements.sendStudio.disabled = disabled
  setYoutubeButtonsDisabled(disabled)
}

function setYoutubeButtonsDisabled(disabled: boolean) {
  elements.saveBothInspiration.disabled = disabled
  elements.saveThumbnailInspiration.disabled = disabled
  elements.saveTitleInspiration.disabled = disabled
}

function setStatus(message: string, tone?: "error" | "ok") {
  elements.status.textContent = message

  if (tone) {
    elements.status.dataset.tone = tone
  } else {
    delete elements.status.dataset.tone
  }
}

function normalizeClips(clips: Array<SunoClip>) {
  const seen = new Set<string>()

  return clips.filter((clip) => {
    if (!clip.id || seen.has(clip.id)) {
      return false
    }

    seen.add(clip.id)
    return true
  })
}

function normalizeSunoCollection(value: unknown): SunoCollection {
  if (!isRecord(value)) {
    return { clips: [], expectedCount: 0 }
  }

  const clips = Array.isArray(value.clips) ? normalizeClips(value.clips) : []
  const expectedCount = Math.max(
    0,
    numberValue(value.expectedCount),
    clips.length
  )

  return { clips, expectedCount }
}

function normalizeYoutubeInspiration(value: unknown): YoutubeInspiration {
  if (!isRecord(value)) {
    throw new Error("Could not read YouTube video details.")
  }

  const videoId = stringValue(value.videoId)

  if (!videoId) {
    throw new Error("Open a YouTube video page, then refresh.")
  }

  return {
    thumbnailUrl:
      stringValue(value.thumbnailUrl) ||
      `https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`,
    title: stringValue(value.title) || "Untitled YouTube video",
    url: stringValue(value.url) || `https://www.youtube.com/watch?v=${videoId}`,
    videoId,
  }
}

function normalizePinterestInspiration(value: unknown): PinterestInspiration {
  if (!isRecord(value)) {
    throw new Error("Could not read Pinterest pin image.")
  }

  const imageUrl = stringValue(value.imageUrl)

  if (!imageUrl) {
    throw new Error("Open a Pinterest pin with a visible image, then refresh.")
  }

  return {
    imageUrl,
    title: stringValue(value.title) || "Pinterest inspiration",
    url: stringValue(value.url) || "",
  }
}

function normalizeDistroKidPreparedRelease(
  value: unknown
): DistroKidPreparedRelease {
  if (!isRecord(value)) {
    throw new Error("Studio did not return a DistroKid package.")
  }

  const album = isRecord(value.album) ? value.album : {}
  const artwork = isRecord(value.artwork) ? value.artwork : {}
  const formHints = isRecord(value.formHints) ? value.formHints : {}
  const tracks = Array.isArray(value.tracks)
    ? value.tracks.map(normalizeDistroKidTrack)
    : []

  if (tracks.length === 0) {
    throw new Error("DistroKid package has no tracks.")
  }

  return {
    album: {
      folder: stringValue(album.folder),
      title: stringValue(album.title),
      trackCount: numberValue(album.trackCount),
    },
    artwork: {
      file: stringValue(artwork.file),
    },
    formHints: {
      albumTitle: stringValue(formHints.albumTitle),
      artistName: stringValue(formHints.artistName),
      language: stringValue(formHints.language),
      performerName: stringValue(formHints.performerName),
      performerRole: stringValue(formHints.performerRole),
      primaryGenre: stringValue(formHints.primaryGenre),
      producerName: stringValue(formHints.producerName),
      producerRole: stringValue(formHints.producerRole),
      secondaryGenre: stringValue(formHints.secondaryGenre),
      songwriterRealName: stringValue(formHints.songwriterRealName),
    },
    tracks,
  }
}

function normalizeDistroKidTrack(value: unknown) {
  if (!isRecord(value)) {
    throw new Error("DistroKid package has an invalid track.")
  }

  const file = stringValue(value.file)
  const sequence = numberValue(value.sequence)
  const title = stringValue(value.title)

  if (!file || !sequence || !title) {
    throw new Error("DistroKid package has an incomplete track.")
  }

  return {
    file,
    sequence,
    title,
  }
}

function isYoutubeUrl(url: URL) {
  return (
    url.hostname === "youtu.be" ||
    url.hostname === "www.youtube.com" ||
    url.hostname.endsWith(".youtube.com")
  )
}

function isPinterestUrl(url: URL) {
  return (
    url.hostname === "pinterest.com" || url.hostname.endsWith(".pinterest.com")
  )
}

function isDistroKidUrl(url: URL) {
  return (
    url.hostname === "distrokid.com" || url.hostname.endsWith(".distrokid.com")
  )
}

function distrokidAlbumFolderFromUrl(url: URL) {
  const params = new URLSearchParams(url.hash.replace(/^#/, ""))
  const folder = params.get(distrokidAlbumHashKey)?.trim() || ""

  return isDistroKidAlbumFolder(folder) ? folder : ""
}

function isDistroKidAlbumFolder(folder: string) {
  return (
    folder !== "." &&
    folder !== ".." &&
    distrokidAlbumFolderPattern.test(folder)
  )
}

function normalizeDistroKidFillReport(value: unknown): DistroKidFillReport {
  if (!isRecord(value)) {
    throw new Error("DistroKid fill did not return a report.")
  }

  return {
    creditCount: numberValue(value.creditCount),
    fieldCount: numberValue(value.fieldCount),
    fileCount: numberValue(value.fileCount),
    mandatoryCheckboxCount: numberValue(value.mandatoryCheckboxCount),
    songwriterCount: numberValue(value.songwriterCount),
    trackFiles: numberValue(value.trackFiles),
    warnings: Array.isArray(value.warnings)
      ? value.warnings.filter(
          (warning): warning is string => typeof warning === "string"
        )
      : [],
  }
}

function requiredElement<T extends HTMLElement>(
  id: string,
  constructor: new () => T
) {
  const element = document.getElementById(id)

  if (!element) {
    throw new Error(`Missing #${id}`)
  }

  if (element instanceof constructor) {
    return element
  }

  throw new Error(`#${id} is not a ${constructor.name}.`)
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Could not read this tab."
}

function stringValue(value: unknown) {
  return typeof value === "string" ? value.trim() : ""
}

function numberValue(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : 0
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null
}

async function collectSunoLinksFromPage() {
  const uuidPattern =
    "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}"
  const uuidRe = new RegExp(uuidPattern, "i")
  const workspaceId = new URL(location.href).searchParams.get("wid")
  const clips: Array<SunoClip> = []
  const seen = new Set<string>()
  const expectedCount = readExpectedWorkspaceSongCount()

  function pushClip(id: string, title = "") {
    const normalizedId = id.toLowerCase()

    if (normalizedId === workspaceId || seen.has(normalizedId)) {
      return
    }

    seen.add(normalizedId)
    clips.push({
      id: normalizedId,
      title,
    })
  }

  function collectRenderedClips() {
    for (const link of document.querySelectorAll('a[href*="/song/"]')) {
      const href = link.getAttribute("href") || ""
      const match = href.match(uuidRe)

      if (match) {
        pushClip(match[0], link.textContent?.trim() || "")
      }
    }

    for (const image of document.querySelectorAll("img[src], img[data-src]")) {
      const source =
        image.getAttribute("src") || image.getAttribute("data-src") || ""
      const match = source.match(
        new RegExp(`image_(?:large_)?(${uuidPattern})`, "i")
      )

      if (match) {
        pushClip(match[1])
      }
    }
  }

  function readExpectedWorkspaceSongCount() {
    const workspaceName =
      document.body.innerText
        .match(/\bWorkspaces\s+([^\n]+)\s+Filters\b/)?.[1]
        ?.trim() || ""

    if (!workspaceName) {
      return 0
    }

    for (const element of document.querySelectorAll('[role="button"]')) {
      const text = element.textContent?.replace(/\s+/g, " ").trim() || ""
      const match = text.match(/^(.*?)(\d+)\s+Songs?\s+[·•]/)

      if (match && match[1].trim() === workspaceName) {
        return Number(match[2])
      }
    }

    return 0
  }

  async function collectFeedClips() {
    if (!workspaceId || typeof fetch !== "function") {
      return
    }

    const seenCursors = new Set<string>()
    let cursor: string | null = null

    for (let page = 0; page < 25; page += 1) {
      if (cursor) {
        if (seenCursors.has(cursor)) {
          return
        }

        seenCursors.add(cursor)
      }

      const response = await fetch("/api/feed/v3", {
        body: JSON.stringify({
          cursor,
          filters: {
            disliked: "False",
            fromStudioProject: { presence: "False" },
            stem: { presence: "False" },
            trashed: "False",
            workspace: { presence: "True", workspaceId },
          },
          limit: Math.max(50, expectedCount || 50),
        }),
        credentials: "include",
        headers: { "content-type": "application/json" },
        method: "POST",
      })

      if (!response.ok) {
        return
      }

      const data = await response.json()
      const feedClips = Array.isArray(data?.clips) ? data.clips : []

      for (const clip of feedClips) {
        if (clip && typeof clip.id === "string") {
          pushClip(clip.id, typeof clip.title === "string" ? clip.title : "")
        }
      }

      cursor = typeof data?.next_cursor === "string" ? data.next_cursor : null

      if (!cursor) {
        return
      }
    }
  }

  async function collectVirtualizedClips() {
    const scrollers = [
      ...document.querySelectorAll<HTMLElement>(".clip-browser-list-scroller"),
    ].filter((element) => element.scrollHeight > element.clientHeight + 8)

    for (const scroller of scrollers) {
      const originalScrollTop = scroller.scrollTop
      const maxScrollTop = scroller.scrollHeight - scroller.clientHeight
      const step = Math.max(160, Math.floor(scroller.clientHeight * 0.75))
      const scrollPositions = [0]

      for (let scrollTop = step; scrollTop < maxScrollTop; scrollTop += step) {
        scrollPositions.push(scrollTop)
      }

      scrollPositions.push(maxScrollTop)

      for (const scrollTop of scrollPositions) {
        scroller.scrollTop = scrollTop
        scroller.dispatchEvent(new Event("scroll", { bubbles: true }))
        await animationFrame()
        collectRenderedClips()
      }

      scroller.scrollTop = originalScrollTop
      scroller.dispatchEvent(new Event("scroll", { bubbles: true }))
    }
  }

  function animationFrame() {
    return new Promise<void>((resolve) =>
      requestAnimationFrame(() => resolve())
    )
  }

  collectRenderedClips()

  try {
    await collectFeedClips()
  } catch {
    // Fall back to the rendered/virtualized DOM when Suno changes its feed API.
  }

  if (expectedCount === 0 || clips.length < expectedCount) {
    await collectVirtualizedClips()
  }

  collectRenderedClips()

  return { clips, expectedCount: Math.max(expectedCount, clips.length) }
}

// eslint-disable-next-line complexity -- Chrome injects this as one standalone function.
function collectYoutubeInspirationFromPage() {
  const currentUrl = new URL(location.href)
  const videoId =
    currentUrl.hostname === "youtu.be"
      ? currentUrl.pathname.slice(1)
      : currentUrl.searchParams.get("v") || ""
  let title = ""

  for (const selector of ["h1 yt-formatted-string", "h1"]) {
    const text = document.querySelector(selector)?.textContent?.trim()

    if (text) {
      title = text
      break
    }
  }

  if (!title) {
    title =
      document
        .querySelector('meta[name="title"], meta[property="og:title"]')
        ?.getAttribute("content")
        ?.trim() || ""
  }

  if (!title) {
    title = document.title.replace(/\s*-\s*YouTube\s*$/i, "")
  }

  return {
    thumbnailUrl: videoId
      ? `https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`
      : "",
    title,
    url: videoId ? `https://www.youtube.com/watch?v=${videoId}` : location.href,
    videoId,
  }
}

/* eslint-disable unicorn/consistent-function-scoping -- Chrome injects this as one standalone function. */
function collectPinterestInspirationFromPage() {
  type ImageCandidate = {
    alt: string
    area: number
    imageUrl: string
    naturalHeight: number
    naturalWidth: number
    score: number
    visible: boolean
  }

  function absoluteUrl(value: string) {
    try {
      return new URL(value, location.href).toString()
    } catch {
      return ""
    }
  }

  function metaContent(selector: string) {
    return (
      document.querySelector(selector)?.getAttribute("content")?.trim() || ""
    )
  }

  function pageTitle() {
    return (
      metaContent('meta[property="og:title"]') ||
      metaContent('meta[name="twitter:title"]') ||
      document.querySelector("h1")?.textContent?.trim() ||
      document.title.replace(/\s*[|–-]\s*Pinterest.*$/i, "").trim() ||
      "Pinterest inspiration"
    )
  }

  function imageScore(candidate: Omit<ImageCandidate, "score">) {
    const dimensionScore = candidate.naturalHeight * candidate.naturalWidth
    const pinimgBoost = candidate.imageUrl.includes("pinimg.com") ? 2 : 1
    const visibilityBoost = candidate.visible ? 3 : 1

    return (
      (candidate.area + dimensionScore / 10) * pinimgBoost * visibilityBoost
    )
  }

  const metaImageUrl = absoluteUrl(
    metaContent('meta[property="og:image"]') ||
      metaContent('meta[name="twitter:image"]')
  )

  if (metaImageUrl.includes("pinimg.com")) {
    return {
      imageUrl: metaImageUrl,
      title: pageTitle(),
      url: location.href,
    }
  }

  const candidates = Array.from(document.images)
    .map((image): ImageCandidate | null => {
      const imageUrl = absoluteUrl(image.currentSrc || image.src)
      const rect = image.getBoundingClientRect()
      const area = Math.max(0, rect.width) * Math.max(0, rect.height)
      const visible =
        area > 0 &&
        rect.bottom > 0 &&
        rect.right > 0 &&
        rect.top < window.innerHeight &&
        rect.left < window.innerWidth
      const candidate = {
        alt: image.alt.trim(),
        area,
        imageUrl,
        naturalHeight: image.naturalHeight,
        naturalWidth: image.naturalWidth,
        visible,
      }

      if (
        !imageUrl ||
        imageUrl.startsWith("data:") ||
        imageUrl.includes("/75x75") ||
        Math.max(candidate.naturalHeight, candidate.naturalWidth) < 300
      ) {
        return null
      }

      return {
        ...candidate,
        score: imageScore(candidate),
      }
    })
    .filter((candidate): candidate is ImageCandidate => Boolean(candidate))
    .toSorted((left, right) => right.score - left.score)

  const selected = candidates[0]

  return {
    imageUrl: selected?.imageUrl || metaImageUrl,
    title: selected?.alt || pageTitle(),
    url: location.href,
  }
}
/* eslint-enable unicorn/consistent-function-scoping */

/* eslint-disable max-lines-per-function, no-await-in-loop, unicorn/consistent-function-scoping -- Chrome injects this as one standalone function, so helper functions and sequential DOM waits must stay inside it. */
async function fillDistroKidReleaseForm(
  release: DistroKidFillPayload
): Promise<DistroKidFillReport> {
  const warnings: Array<string> = []
  let creditCount = 0
  let fieldCount = 0
  let fileCount = 0
  let mandatoryCheckboxCount = 0
  let songwriterCount = 0
  let trackFiles = 0

  const sleep = (milliseconds: number) =>
    new Promise((resolve) => {
      setTimeout(resolve, milliseconds)
    })

  function warn(message: string) {
    warnings.push(message)
  }

  async function waitForElement(
    selector: string,
    label: string,
    timeoutMs = 20000
  ): Promise<Element | null> {
    const startedAt = Date.now()

    while (Date.now() - startedAt < timeoutMs) {
      const element = document.querySelector(selector)

      if (element) {
        return element
      }

      await sleep(250)
    }

    warn(`Could not find ${label} (${selector}).`)
    return null
  }

  async function waitForInput(
    selector: string,
    label: string,
    timeoutMs = 20000
  ) {
    const element = await waitForElement(selector, label, timeoutMs)

    if (!element) {
      return null
    }

    if (element instanceof HTMLInputElement) {
      return element
    }

    warn(`${label} (${selector}) is not an input.`)
    return null
  }

  async function waitForSelect(
    selector: string,
    label: string,
    timeoutMs = 20000
  ) {
    const element = await waitForElement(selector, label, timeoutMs)

    if (!element) {
      return null
    }

    if (element instanceof HTMLSelectElement) {
      return element
    }

    warn(`${label} (${selector}) is not a select.`)
    return null
  }

  function dispatchFormEvents(element: Element) {
    element.dispatchEvent(new Event("input", { bubbles: true }))
    element.dispatchEvent(new Event("change", { bubbles: true }))
  }

  function setControlValue(
    element: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement,
    value: string
  ) {
    const descriptor = Object.getOwnPropertyDescriptor(
      Object.getPrototypeOf(element),
      "value"
    )

    if (descriptor?.set) {
      descriptor.set.call(element, value)
    } else {
      element.value = value
    }

    dispatchFormEvents(element)
    fieldCount += 1
  }

  function setCheckboxChecked(input: HTMLInputElement, checked: boolean) {
    const descriptor = Object.getOwnPropertyDescriptor(
      HTMLInputElement.prototype,
      "checked"
    )

    if (descriptor?.set) {
      descriptor.set.call(input, checked)
    } else {
      input.checked = checked
    }

    dispatchFormEvents(input)
    fieldCount += 1
  }

  function setSelectValue(
    select: HTMLSelectElement,
    requested: string,
    label: string,
    fallbackValues: Record<string, string> = {}
  ) {
    const normalized = requested.trim().toLowerCase()
    const requestedValues = [
      requested,
      fallbackValues[requested],
      fallbackValues[normalized],
    ]
      .map((candidate) => candidate?.trim() || "")
      .filter(Boolean)
    const normalizedValues = new Set(
      requestedValues.map((candidate) => candidate.toLowerCase())
    )
    const option = Array.from(select.options).find(
      (candidate) =>
        normalizedValues.has(candidate.value.trim().toLowerCase()) ||
        normalizedValues.has((candidate.textContent || "").trim().toLowerCase())
    )
    const value = option?.value || requestedValues[1]

    if (!value) {
      warn(`Could not select ${label}: ${requested}.`)
      return false
    }

    setControlValue(select, value)
    return true
  }

  async function setInputText(selector: string, value: string, label: string) {
    if (!value) {
      return false
    }

    const input = await waitForInput(selector, label)

    if (input) {
      setControlValue(input, value)
      return true
    }

    return false
  }

  async function setOptionalInputText(
    selector: string,
    value: string,
    label: string
  ) {
    const input = await waitForInput(selector, label, 5000)

    if (input) {
      setControlValue(input, value)
      return true
    }

    return false
  }

  async function setSongwriterRealName(sequence: number, realName: string) {
    const parts = realName.trim().split(/\s+/).filter(Boolean)
    const firstName = parts.shift() || ""
    const lastName = parts.pop() || ""
    const middleName = parts.join(" ")
    const role = document.querySelectorAll<HTMLSelectElement>(
      "select.songwriter_real_name_role"
    )[sequence - 1]

    if (role) {
      setSelectValue(role, "Music and lyrics", `track ${sequence} songwriter`, {
        "music and lyrics": "197",
      })
    } else {
      warn(`Could not find track ${sequence} songwriter role.`)
    }

    await setInputText(
      `input[name="songwriter_real_name_first${sequence}"]`,
      firstName,
      `track ${sequence} songwriter first name`
    )
    await setOptionalInputText(
      `input[name="songwriter_real_name_middle${sequence}"]`,
      middleName,
      `track ${sequence} songwriter middle name`
    )
    await setInputText(
      `input[name="songwriter_real_name_last${sequence}"]`,
      lastName,
      `track ${sequence} songwriter last name`
    )
    songwriterCount += 1
  }

  async function setAppleMusicCredits(sequence: number) {
    const performerRole = await waitForSelect(
      `#track-${sequence}-performer-1-role`,
      `track ${sequence} performer role`,
      5000
    )
    const producerRole = await waitForSelect(
      `#track-${sequence}-producer-1-role`,
      `track ${sequence} producer role`,
      5000
    )

    const didSetPerformerRole = performerRole
      ? setSelectValue(
          performerRole,
          release.performerRole,
          `track ${sequence} performer role`,
          { audio: "Singing & vocals" }
        )
      : false

    const didSetPerformerName = await setOptionalInputText(
      `#track-${sequence}-performer-1-name`,
      release.performerName,
      `track ${sequence} performer name`
    )

    const didSetProducerRole = producerRole
      ? setSelectValue(
          producerRole,
          release.producerRole,
          `track ${sequence} producer role`,
          { producer: "Producer" }
        )
      : false

    const didSetProducerName = await setOptionalInputText(
      `#track-${sequence}-producer-1-name`,
      release.producerName,
      `track ${sequence} producer name`
    )

    if (
      performerRole &&
      producerRole &&
      didSetPerformerRole &&
      didSetPerformerName &&
      didSetProducerRole &&
      didSetProducerName
    ) {
      creditCount += 1
    }
  }

  async function checkMandatoryCheckbox(selector: string, label: string) {
    const input = await waitForInput(selector, label, 5000)

    if (!input) {
      return false
    }

    if (input.type !== "checkbox") {
      warn(`${label} (${selector}) is not a checkbox.`)
      return false
    }

    if (!input.checked) {
      setCheckboxChecked(input, true)
    }

    return input.checked
  }

  async function checkMandatoryCheckboxes() {
    const checkboxes = [
      ["#areyousureyoutube", "YouTube Music acknowledgement"],
      ["#areyousurepromoservices", "promo services acknowledgement"],
      ["#areyousurerecorded", "recording authorization acknowledgement"],
      ["#areyousureotherartist", "other artist name acknowledgement"],
      ["#areyousuretandc", "DistroKid Distribution Agreement acknowledgement"],
    ] as const

    for (const [selector, label] of checkboxes) {
      const didCheck = await checkMandatoryCheckbox(selector, label)

      if (didCheck) {
        mandatoryCheckboxCount += 1
      }
    }
  }

  async function setFileInput(
    selector: string,
    fileInfo: DistroKidFillFile,
    label: string
  ) {
    const input = await waitForInput(selector, label, 30000)

    if (!input) {
      return false
    }

    const response = await fetch(fileInfo.url)

    if (!response.ok) {
      throw new Error(
        `Could not fetch ${fileInfo.fileName} from Studio (${response.status}).`
      )
    }

    const blob = await response.blob()
    const lowerFileName = fileInfo.fileName.toLowerCase()
    const fallbackType = lowerFileName.endsWith(".mp3")
      ? "audio/mpeg"
      : lowerFileName.endsWith(".jpg") || lowerFileName.endsWith(".jpeg")
        ? "image/jpeg"
        : lowerFileName.endsWith(".png")
          ? "image/png"
          : "application/octet-stream"
    const file = new File([blob], fileInfo.fileName, {
      lastModified: Date.now(),
      type: blob.type || fallbackType,
    })
    const dataTransfer = new DataTransfer()

    dataTransfer.items.add(file)
    input.files = dataTransfer.files
    dispatchFormEvents(input)
    fileCount += 1

    return true
  }

  const songCount = await waitForSelect(
    "#howManySongsOnThisAlbum",
    "song count"
  )

  if (songCount) {
    setSelectValue(songCount, String(release.tracks.length), "song count")
  }

  await setInputText("#albumTitleInput", release.albumTitle, "album title")

  const language = document.querySelector<HTMLSelectElement>("#language")

  if (language) {
    setSelectValue(language, release.language, "language", { Japanese: "21" })
  } else {
    warn("Could not find language (#language).")
  }

  const primaryGenre =
    document.querySelector<HTMLSelectElement>("#genrePrimary")

  if (primaryGenre) {
    setSelectValue(primaryGenre, release.primaryGenre, "primary genre", {
      "j-pop": "19",
      "J-Pop": "19",
    })
  } else {
    warn("Could not find primary genre (#genrePrimary).")
  }

  const secondaryGenre =
    document.querySelector<HTMLSelectElement>("#genreSecondary")

  if (secondaryGenre) {
    setSelectValue(secondaryGenre, release.secondaryGenre, "secondary genre", {
      Pop: "24",
      pop: "24",
    })
  } else {
    warn("Could not find secondary genre (#genreSecondary).")
  }

  const lastTrack = release.tracks.at(-1)

  if (lastTrack) {
    await waitForElement(
      `#js-track-upload-${lastTrack.sequence}`,
      `track ${lastTrack.sequence} audio input`,
      30000
    )
  }

  await setFileInput("#artwork", release.artwork, "cover artwork")

  for (const track of release.tracks) {
    await setInputText(
      `input[placeholder="Track ${track.sequence} title"]`,
      track.title,
      `track ${track.sequence} title`
    )
    await setSongwriterRealName(track.sequence, release.songwriterRealName)
    await setAppleMusicCredits(track.sequence)
    const didSetTrackFile = await setFileInput(
      `#js-track-upload-${track.sequence}`,
      track,
      `track ${track.sequence} audio`
    )

    if (didSetTrackFile) {
      trackFiles += 1
    }
  }

  await checkMandatoryCheckboxes()

  return {
    creditCount,
    fieldCount,
    fileCount,
    mandatoryCheckboxCount,
    songwriterCount,
    trackFiles,
    warnings,
  }
}
/* eslint-enable max-lines-per-function, no-await-in-loop, unicorn/consistent-function-scoping */
