/* eslint-disable max-lines */
// @ts-nocheck

import { spawn } from "node:child_process"
import { createHash, randomBytes } from "node:crypto"
import { chmod, mkdir, readFile, stat, writeFile } from "node:fs/promises"
import { createServer } from "node:http"
import path from "node:path"
import { fileURLToPath } from "node:url"

const ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../.."
)
const DEFAULT_CLIENT_ID =
  "174707988673-e9a2ncnp8mm57q5ako24437ihfr2qj9o.apps.googleusercontent.com"
const YOUTUBE_UPLOAD_SCOPE = "https://www.googleapis.com/auth/youtube.upload"
const DEFAULT_TOKEN_FILE = path.join(ROOT, ".secrets/youtube-oauth-token.json")
const DEFAULT_CLIENT_FILE = path.join(
  ROOT,
  ".secrets/youtube-oauth-client.json"
)
const DEFAULT_VIDEO_FILE = path.join(
  ROOT,
  "generated/suno/youtube/city-pop-tokyo-night-drive.mp4"
)
const DEFAULT_MANIFEST_FILE = path.join(
  ROOT,
  "generated/suno/youtube/city-pop-tokyo-night-drive-manifest.json"
)

const RETRIABLE_STATUS_CODES = new Set([500, 502, 503, 504])

export function youtubeUploadUsage() {
  return `Usage:
  pnpm youtube:auth [options]
  pnpm youtube:upload [options]

Auth options:
  --client-id <id>          OAuth desktop client ID
  --client-secret <secret>  Optional OAuth client secret, if your client requires it
  --client-file <path>      Optional downloaded OAuth client JSON
  --token-file <path>       Token output path (default: .secrets/youtube-oauth-token.json)
  --login-hint <email>      Hint the Google account on the consent screen
  --no-open                 Print the consent URL without opening it

Upload options:
  --file <path>             MP4 file to upload
  --title <title>           YouTube video title
  --description <text>      YouTube video description
  --description-file <path> Read description from a file
  --thumbnail-file <path>   Read image file to use as the custom thumbnail
  --tags <a,b,c>            Comma-separated tags
  --category <id>           YouTube category ID (default: 10, Music)
  --privacy <status>        private, unlisted, or public (default: private)
  --made-for-kids           Mark as made for kids
  --dry-run                 Print metadata without uploading

Environment:
  YOUTUBE_OAUTH_CLIENT_ID
  YOUTUBE_OAUTH_CLIENT_SECRET
  YOUTUBE_OAUTH_CLIENT_FILE
  YOUTUBE_OAUTH_TOKEN_FILE
`
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
      options[toCamelCase(arg.slice("--no-".length))] = false
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

function base64Url(buffer) {
  return Buffer.from(buffer)
    .toString("base64")
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replaceAll("=", "")
}

function sha256(value) {
  return createHash("sha256").update(value).digest()
}

async function readOptionalText(file) {
  try {
    return await readFile(file, "utf8")
  } catch (error) {
    if (error?.code === "ENOENT") {
      return null
    }

    throw error
  }
}

async function readOptionalJson(file) {
  const contents = await readOptionalText(file)

  if (!contents) {
    return null
  }

  return JSON.parse(contents)
}

async function readEnv() {
  const envFile = await readOptionalText(path.join(ROOT, ".env"))
  const env = { ...process.env }

  if (!envFile) {
    return env
  }

  for (const rawLine of envFile.split(/\r?\n/)) {
    const line = rawLine.trim()

    if (!line || line.startsWith("#") || !line.includes("=")) {
      continue
    }

    const equalsIndex = line.indexOf("=")
    const key = line.slice(0, equalsIndex).trim()
    let value = line.slice(equalsIndex + 1).trim()

    if (
      (value.startsWith(`"`) && value.endsWith(`"`)) ||
      (value.startsWith(`'`) && value.endsWith(`'`))
    ) {
      value = value.slice(1, -1)
    }

    if (!env[key]) {
      env[key] = value
    }
  }

  return env
}

async function loadClientConfig(options) {
  const env = await readEnv()
  const clientFile = resolveRootPath(
    options.clientFile || env.YOUTUBE_OAUTH_CLIENT_FILE || DEFAULT_CLIENT_FILE
  )
  const fileConfig = await readOptionalJson(clientFile)
  const nestedConfig = fileConfig?.installed || fileConfig?.web || fileConfig

  const clientId = firstValue(
    options.clientId,
    env.YOUTUBE_OAUTH_CLIENT_ID,
    nestedConfig?.client_id,
    DEFAULT_CLIENT_ID
  )
  const clientSecret = firstValue(
    options.clientSecret,
    env.YOUTUBE_OAUTH_CLIENT_SECRET,
    nestedConfig?.client_secret
  )

  if (!clientId) {
    throw new Error(
      "Missing OAuth client ID. Set YOUTUBE_OAUTH_CLIENT_ID or pass --client-id."
    )
  }

  return { clientId, clientSecret }
}

function firstValue(...values) {
  return values.find(
    (value) => value !== undefined && value !== null && value !== ""
  )
}

function resolveRootPath(file) {
  if (!file) {
    return file
  }

  return path.isAbsolute(file) ? file : path.join(ROOT, file)
}

async function writeJsonSecure(file, value) {
  await mkdir(path.dirname(file), { recursive: true })
  await writeFile(file, `${JSON.stringify(value, null, 2)}\n`, {
    mode: 0o600,
  })
  await chmod(file, 0o600)
}

function startLoopbackServer(expectedState) {
  let server
  const serverOrigin = "http://127.0.0.1"
  let timeout

  const codePromise = new Promise((resolve, reject) => {
    server = createServer((request, response) => {
      const requestUrl = new URL(request.url || "/", serverOrigin)

      if (requestUrl.pathname !== "/oauth2callback") {
        response.writeHead(404, { "Content-Type": "text/plain" })
        response.end("Not found")
        return
      }

      const error = requestUrl.searchParams.get("error")
      const state = requestUrl.searchParams.get("state")
      const code = requestUrl.searchParams.get("code")

      if (error) {
        response.writeHead(400, { "Content-Type": "text/html; charset=utf-8" })
        response.end(`<h1>Authorization failed</h1><p>${escapeHtml(error)}</p>`)
        cleanup()
        reject(new Error(`Google OAuth failed: ${error}`))
        return
      }

      if (state !== expectedState) {
        response.writeHead(400, { "Content-Type": "text/html; charset=utf-8" })
        response.end("<h1>Authorization failed</h1><p>State mismatch.</p>")
        cleanup()
        reject(new Error("Google OAuth callback state mismatch."))
        return
      }

      if (!code) {
        response.writeHead(400, { "Content-Type": "text/html; charset=utf-8" })
        response.end("<h1>Authorization failed</h1><p>Missing code.</p>")
        cleanup()
        reject(new Error("Google OAuth callback did not include a code."))
        return
      }

      response.writeHead(200, { "Content-Type": "text/html; charset=utf-8" })
      response.end(
        "<h1>YouTube authorization complete</h1><p>You can close this tab and return to the terminal.</p>"
      )
      cleanup()
      resolve(code)
    })

    timeout = setTimeout(
      () => {
        cleanup()
        reject(new Error("Timed out waiting for Google OAuth callback."))
      },
      5 * 60 * 1000
    )
  })

  const listenPromise = new Promise((resolve, reject) => {
    server.on("error", reject)
    server.listen(0, "127.0.0.1", () => {
      const port = server.address().port
      resolve({
        codePromise,
        redirectUri: `http://127.0.0.1:${port}/oauth2callback`,
      })
    })
  })

  function cleanup() {
    clearTimeout(timeout)

    if (server.listening) {
      server.close()
    }
  }

  return listenPromise
}

function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
}

function openUrl(url) {
  const command =
    process.platform === "darwin"
      ? "open"
      : process.platform === "win32"
        ? "cmd"
        : "xdg-open"
  const args = process.platform === "win32" ? ["/c", "start", "", url] : [url]
  // react-doctor-disable-next-line react-doctor/local-rpc-native-bridge-risk -- This only opens the OAuth URL; the callback server binds to 127.0.0.1, accepts one path, and validates OAuth state.
  const child = spawn(command, args, {
    detached: true,
    stdio: "ignore",
  })
  child.unref()
}

async function exchangeAuthorizationCode({
  clientId,
  clientSecret,
  code,
  codeVerifier,
  redirectUri,
}) {
  const body = new URLSearchParams({
    client_id: clientId,
    code,
    code_verifier: codeVerifier,
    grant_type: "authorization_code",
    redirect_uri: redirectUri,
  })

  if (clientSecret) {
    body.set("client_secret", clientSecret)
  }

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  })

  return parseJsonResponse(response, "OAuth token exchange failed")
}

async function refreshAccessToken(tokenFile, options) {
  const token = await readOptionalJson(tokenFile)

  if (!token?.refresh_token) {
    throw new Error(
      `Missing refresh token at ${relative(tokenFile)}. Run pnpm youtube:auth first.`
    )
  }

  if (token.access_token && token.expires_at > Date.now() + 60_000) {
    return token
  }

  const config = await loadClientConfig({
    ...options,
    clientId: options.clientId || token.client_id,
  })
  const body = new URLSearchParams({
    client_id: config.clientId,
    grant_type: "refresh_token",
    refresh_token: token.refresh_token,
  })

  if (config.clientSecret) {
    body.set("client_secret", config.clientSecret)
  }

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  })
  const refreshed = await parseJsonResponse(
    response,
    "OAuth token refresh failed"
  )
  const nextToken = normalizeTokenRecord({
    ...token,
    ...refreshed,
    refresh_token: token.refresh_token,
    client_id: config.clientId,
    scope: refreshed.scope || token.scope,
  })

  await writeJsonSecure(tokenFile, nextToken)

  return nextToken
}

function normalizeTokenRecord(token) {
  const issuedAt = Date.now()
  const expiresIn = Number(token.expires_in || 3600)

  return {
    ...token,
    created_at: token.created_at || new Date(issuedAt).toISOString(),
    expires_at: issuedAt + expiresIn * 1000,
  }
}

async function parseJsonResponse(response, message) {
  const text = await response.text()
  let json = null

  if (text) {
    try {
      json = JSON.parse(text)
    } catch {
      json = null
    }
  }

  if (!response.ok) {
    const detail = json?.error_description || json?.error?.message || text
    throw new Error(`${message}: ${response.status} ${detail}`)
  }

  return json || {}
}

export async function runAuth(options) {
  const log = typeof options.onLog === "function" ? options.onLog : console.log
  const tokenFile = resolveRootPath(
    options.tokenFile ||
      (await readEnv()).YOUTUBE_OAUTH_TOKEN_FILE ||
      DEFAULT_TOKEN_FILE
  )
  const { clientId, clientSecret } = await loadClientConfig(options)
  const codeVerifier = base64Url(randomBytes(64))
  const codeChallenge = base64Url(sha256(codeVerifier))
  const state = base64Url(randomBytes(32))
  const { codePromise, redirectUri } = await startLoopbackServer(state)
  const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth")

  authUrl.searchParams.set("client_id", clientId)
  authUrl.searchParams.set("redirect_uri", redirectUri)
  authUrl.searchParams.set("response_type", "code")
  authUrl.searchParams.set("scope", YOUTUBE_UPLOAD_SCOPE)
  authUrl.searchParams.set("code_challenge", codeChallenge)
  authUrl.searchParams.set("code_challenge_method", "S256")
  authUrl.searchParams.set("state", state)
  authUrl.searchParams.set("access_type", "offline")
  authUrl.searchParams.set("prompt", "consent")

  if (options.loginHint) {
    authUrl.searchParams.set("login_hint", options.loginHint)
  }

  log(`Open this URL to authorize YouTube uploads:\n${authUrl.href}\n`)

  if (options.open !== false) {
    try {
      openUrl(authUrl.href)
    } catch (error) {
      console.warn(`Could not open browser automatically: ${error.message}`)
    }
  }

  const code = await codePromise
  const token = await exchangeAuthorizationCode({
    clientId,
    clientSecret,
    code,
    codeVerifier,
    redirectUri,
  })
  const tokenRecord = normalizeTokenRecord({
    ...token,
    client_id: clientId,
    scope: token.scope || YOUTUBE_UPLOAD_SCOPE,
  })

  if (!tokenRecord.refresh_token) {
    throw new Error(
      "Google did not return a refresh token. Re-run pnpm youtube:auth; if it still happens, revoke this app in your Google Account permissions and try again."
    )
  }

  await writeJsonSecure(tokenFile, tokenRecord)
  log(`Saved YouTube OAuth token to ${relative(tokenFile)}`)
}

export async function runUpload(options) {
  const log = typeof options.onLog === "function" ? options.onLog : console.log
  const env = await readEnv()
  const tokenFile = resolveRootPath(
    options.tokenFile || env.YOUTUBE_OAUTH_TOKEN_FILE || DEFAULT_TOKEN_FILE
  )
  const file = resolveRootPath(options.file || DEFAULT_VIDEO_FILE)
  const thumbnailFile = resolveRootPath(
    options.thumbnailFile || options.thumbnail
  )
  const fileStats = await stat(file)
  const thumbnailStats = thumbnailFile ? await stat(thumbnailFile) : null
  const metadata = await buildVideoMetadata(options)

  if (options.dryRun) {
    const result = {
      file: relative(file),
      metadata,
      sizeBytes: fileStats.size,
      thumbnailFile: thumbnailFile ? relative(thumbnailFile) : null,
      thumbnailSizeBytes: thumbnailStats?.size || null,
      tokenFile: relative(tokenFile),
    }

    log(JSON.stringify(result, null, 2))
    return result
  }

  const token = await refreshAccessToken(tokenFile, options)
  const uploadUrl = await createResumableUpload({
    accessToken: token.access_token,
    fileSize: fileStats.size,
    metadata,
  })
  const video = await uploadVideoBytes({
    accessToken: token.access_token,
    file,
    fileSize: fileStats.size,
    uploadUrl,
  })

  await setThumbnailIfRequested({
    accessToken: token.access_token,
    log,
    thumbnailFile,
    video,
  })

  log(`Uploaded video: https://www.youtube.com/watch?v=${video.id}`)
  log(JSON.stringify(video, null, 2))
  return video
}

async function buildVideoMetadata(options) {
  const manifest = await readOptionalJson(DEFAULT_MANIFEST_FILE)
  const title =
    options.title || "City Pop Tokyo Night Drive - 80s Japanese City Pop Mix"
  const description =
    options.description ||
    (options.descriptionFile
      ? await readFile(resolveRootPath(options.descriptionFile), "utf8")
      : buildDefaultDescription(manifest))
  const tags = String(
    options.tags ||
      "city pop,80s japanese city pop,tokyo night drive,synth pop,driving mix"
  )
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean)
  const privacyStatus = options.privacy || options.privacyStatus || "private"

  if (!["private", "unlisted", "public"].includes(privacyStatus)) {
    throw new Error("--privacy must be private, unlisted, or public")
  }

  return {
    snippet: {
      categoryId: String(options.category || "10"),
      description,
      tags,
      title,
    },
    status: {
      privacyStatus,
      selfDeclaredMadeForKids: Boolean(options.madeForKids),
    },
  }
}

function buildDefaultDescription(manifest) {
  const lines = ["A long 80s-inspired city pop mix for Tokyo night drives.", ""]

  if (manifest?.tracks?.length) {
    lines.push("Tracklist:")
    let cursor = 0

    for (const track of manifest.tracks) {
      lines.push(`${formatTime(cursor)} ${formatTrackTitle(track.name)}`)
      cursor += Number(track.durationSeconds || 0)
    }

    lines.push("")
  }

  lines.push(
    "Mood: city pop, 80s style, vintage Tokyo night, neon expressway, sports car."
  )

  return lines.join("\n")
}

function formatTrackTitle(name) {
  return name.replace(/\.mp3$/i, "").replaceAll("-", " ")
}

function formatTime(seconds) {
  const totalSeconds = Math.max(0, Math.floor(seconds))
  const minutes = Math.floor(totalSeconds / 60)
  const remainingSeconds = totalSeconds % 60

  return `${minutes}:${String(remainingSeconds).padStart(2, "0")}`
}

async function createResumableUpload({ accessToken, fileSize, metadata }) {
  const body = JSON.stringify(metadata)
  const response = await fetch(
    "https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Length": String(Buffer.byteLength(body)),
        "Content-Type": "application/json; charset=UTF-8",
        "X-Upload-Content-Length": String(fileSize),
        "X-Upload-Content-Type": "video/mp4",
      },
      body,
    }
  )

  if (!response.ok) {
    await parseJsonResponse(response, "Could not create YouTube upload session")
  }

  const uploadUrl = response.headers.get("location")

  if (!uploadUrl) {
    throw new Error("YouTube did not return a resumable upload URL.")
  }

  return uploadUrl
}

async function uploadVideoBytes({ accessToken, file, fileSize, uploadUrl }) {
  const videoBytes = await readFile(file)
  let delayMs = 1000

  for (let attempt = 1; attempt <= 5; attempt += 1) {
    // eslint-disable-next-line no-await-in-loop
    const response = await fetch(uploadUrl, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Length": String(fileSize),
        "Content-Type": "video/mp4",
      },
      body: videoBytes,
    })

    if (response.ok) {
      return parseJsonResponse(response, "Could not parse YouTube response")
    }

    if (!RETRIABLE_STATUS_CODES.has(response.status) || attempt === 5) {
      // eslint-disable-next-line no-await-in-loop
      await parseJsonResponse(response, "YouTube upload failed")
    }

    console.warn(
      `YouTube upload attempt ${attempt} failed with ${response.status}; retrying in ${delayMs}ms.`
    )
    // eslint-disable-next-line no-await-in-loop
    await wait(delayMs)
    delayMs *= 2
  }

  throw new Error("YouTube upload failed.")
}

async function setVideoThumbnail({ accessToken, file, videoId }) {
  const thumbnailBytes = await readFile(file)
  const response = await fetch(
    `https://www.googleapis.com/upload/youtube/v3/thumbnails/set?videoId=${encodeURIComponent(
      videoId
    )}`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Length": String(thumbnailBytes.length),
        "Content-Type": imageContentType(file),
      },
      body: thumbnailBytes,
    }
  )

  return parseJsonResponse(response, "Could not set YouTube thumbnail")
}

async function setThumbnailIfRequested({
  accessToken,
  log,
  thumbnailFile,
  video,
}) {
  if (!thumbnailFile || typeof video.id !== "string") {
    return
  }

  const thumbnail = await setVideoThumbnail({
    accessToken,
    file: thumbnailFile,
    videoId: video.id,
  })

  video.thumbnail = thumbnail
  log(`Set thumbnail: ${relative(thumbnailFile)}`)
}

function imageContentType(file) {
  const extension = path.extname(file).toLowerCase()

  if (extension === ".jpg" || extension === ".jpeg") {
    return "image/jpeg"
  }

  if (extension === ".png") {
    return "image/png"
  }

  return "application/octet-stream"
}

function wait(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms)
  })
}

function relative(file) {
  return path.relative(ROOT, file)
}

async function main() {
  const [command, ...rest] = process.argv.slice(2)
  const { options } = parseArgs(rest)

  if (!command || options.help || command === "--help" || command === "-h") {
    console.log(youtubeUploadUsage())
    return
  }

  if (command === "auth") {
    await runAuth(options)
    return
  }

  if (command === "upload") {
    await runUpload(options)
    return
  }

  throw new Error(`Unknown command: ${command}\n\n${youtubeUploadUsage()}`)
}

export { main as youtubeUploadMain }
