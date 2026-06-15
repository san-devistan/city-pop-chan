import { spawn } from "node:child_process"
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import path from "node:path"
import { fileURLToPath } from "node:url"

const ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../.."
)
const DEFAULT_CODEX_COMMAND = "codex"
const DEFAULT_CODEX_MODEL = process.env.CODEX_SUGGESTION_MODEL || ""
const DEFAULT_CODEX_REASONING_EFFORT =
  process.env.CODEX_SUGGESTION_REASONING_EFFORT || "minimal"
const DEFAULT_CODEX_TIMEOUT_MS = Number(
  process.env.CODEX_SUGGESTION_TIMEOUT_MS || 90_000
)
const VIDEO_TITLE_NAME_PLACEHOLDER = "{{name}}"

export type AlbumCreativeSuggestionKind =
  | "coverPrompt"
  | "videoTitleName"
  | "youtubeTitle"

export type AlbumCreativeSuggestionInput = {
  albumTitle: string
  codexCommand?: string
  codexModel?: string | null
  currentValue?: string
  kind: AlbumCreativeSuggestionKind
  tracks: Array<{ title: string }>
}

export async function generateAlbumCreativeSuggestion(
  input: AlbumCreativeSuggestionInput
) {
  const tempDir = await mkdtemp(path.join(tmpdir(), "city-pop-codex-"))
  const schemaFile = path.join(tempDir, "schema.json")
  const outputFile = path.join(tempDir, "suggestion.json")

  try {
    await writeFile(schemaFile, JSON.stringify(suggestionSchema(), null, 2))

    const args = [
      "--ask-for-approval",
      "never",
      "exec",
      "--ignore-rules",
      "--sandbox",
      "read-only",
      "--ephemeral",
      "--cd",
      ROOT,
      "-c",
      "features.plugins=false",
      "-c",
      "mcp_servers={}",
      "-c",
      "notify=[]",
      "-c",
      `model_reasoning_effort=${tomlString(DEFAULT_CODEX_REASONING_EFFORT)}`,
      "--output-schema",
      schemaFile,
      "--output-last-message",
      outputFile,
    ]

    const model = input.codexModel || DEFAULT_CODEX_MODEL

    if (model) {
      args.push("--model", model)
    }

    args.push("-")

    await captureCommand(input.codexCommand || DEFAULT_CODEX_COMMAND, args, {
      input: suggestionPrompt(input),
      timeoutMs: DEFAULT_CODEX_TIMEOUT_MS,
    })

    return normalizeSuggestion(
      parseJsonObject(await readFile(outputFile, "utf8")),
      input.kind
    )
  } catch (error) {
    throw new Error(
      `Codex CLI suggestion generation failed: ${errorMessage(error)}`,
      {
        cause: error,
      }
    )
  } finally {
    await rm(tempDir, { force: true, recursive: true })
  }
}

function suggestionSchema() {
  return {
    $schema: "https://json-schema.org/draft/2020-12/schema",
    additionalProperties: false,
    properties: {
      suggestion: {
        type: "string",
      },
    },
    required: ["suggestion"],
    type: "object",
  }
}

function suggestionPrompt(input: AlbumCreativeSuggestionInput) {
  const coverContext = `Album: ${input.albumTitle}
Tracks:
${formatTracks(input.tracks)}

Current value:
${input.currentValue?.trim() || "(none)"}`
  const titleContext = `Tracks:
${formatTracks(input.tracks)}

Current value:
${titleCurrentValue(input)}`

  if (input.kind === "coverPrompt") {
    return `Generate one image-generation prompt for a Suno City Pop album cover.

Return JSON only, matching the provided schema.

Need:
- suggestion: one polished prompt for the cover generation input.

${coverContext}

Style:
- Vintage Japanese 1980s city pop, late-night Tokyo or Yokohama, neon reflections, expressways, sports cars, cassette or FM radio culture, cafes, rain, glass, chrome, and glossy magazine lighting.
- Keep it cinematic and specific: subject, setting, composition, lighting, colors, textures, mood, and camera or illustration treatment.
- Make it work as a widescreen 16:9 cover that can also crop cleanly for album artwork.
- Avoid artist names, brand names, copyrighted characters, visible UI, logos, and readable text.
- Return one natural English paragraph, 35-70 words.
- Do not label it as an example, do not include alternatives, and do not wrap it in quotes.`
  }

  if (input.kind === "videoTitleName") {
    return `Generate one short Japanese phrase for a City Pop YouTube video title.

Return JSON only, matching the provided schema.

Need:
- suggestion: one poetic Japanese sentence that can replace a {{name}} token in the video title.

${titleContext}

Style:
- Write natural Japanese only, no English translation.
- Make it quiet, nostalgic, cinematic, and emotionally ambiguous, like a line from an 80s Japanese city pop film.
- Good reference tone: 未来なんてちょっとしたはずみでは変わるから。 / 迷いは、時に美しく見えるよね。 / 桜の下で笑ってた。 / 君が君らしくいられるように。
- Do not copy those examples exactly.
- Do not include an album name, local folder name, exact track title, emoji, hashtags, or alternatives.
- Return one sentence, preferably 10-28 Japanese characters, ending with Japanese punctuation.
- Do not label it as an example and do not wrap it in quotes.`
  }

  return `Generate one YouTube title for a City Pop radio or BGM video.

Return JSON only, matching the provided schema.

Need:
- suggestion: one title template that feels clickable, nostalgic, and polished for YouTube.

${titleContext}

Style:
- 1980s Japanese city pop radio/BGM energy for studying, cafe ambience, night drives, soft groove, nostalgia, neon city lights, and relaxed listening.
- Make the viewer curious enough to click without sounding spammy or false.
- Include radio, BGM, playlist, mix, or chill only if it fits naturally.
- Include the literal token {{name}} exactly once where a short Japanese phrase should appear.
- Do not include an album name, local folder name, or exact track title.
- Keep it readable on YouTube and under 100 characters.
- Tasteful Unicode styling or one small emoji is allowed only if it improves the title.
- Do not label it as an example, do not include alternatives, do not add hashtags, and do not wrap it in quotes.`
}

function titleCurrentValue(input: AlbumCreativeSuggestionInput) {
  const currentValue = input.currentValue?.trim()

  if (!currentValue) {
    return "(none)"
  }

  return currentValue.toLowerCase() === input.albumTitle.trim().toLowerCase()
    ? "(none)"
    : currentValue
}

function formatTracks(tracks: Array<{ title: string }>) {
  if (tracks.length === 0) {
    return "(none)"
  }

  return tracks
    .slice(0, 20)
    .map((track) => `- ${track.title}`)
    .join("\n")
}

function normalizeSuggestion(
  parsed: unknown,
  kind: AlbumCreativeSuggestionKind
) {
  if (!isRecord(parsed) || typeof parsed.suggestion !== "string") {
    throw new Error("Codex returned no suggestion.")
  }

  const normalized = parsed.suggestion
    .replace(/\s+/g, " ")
    .replace(/^["'`]+|["'`]+$/g, "")
    .trim()

  if (!normalized) {
    throw new Error("Codex returned an empty suggestion.")
  }

  if (kind === "youtubeTitle") {
    return withVideoTitleNamePlaceholder(
      normalized.length > 100 ? trimYoutubeTitle(normalized) : normalized
    )
  }

  if (kind === "videoTitleName") {
    return normalizeVideoTitleName(normalized)
  }

  return normalized
}

function normalizeVideoTitleName(value: string) {
  const sentence = value
    .replace(/^["'`「『]+|["'`」』]+$/g, "")
    .replace(/\s+/g, "")
    .trim()

  if (!sentence) {
    throw new Error("Codex returned an empty suggestion.")
  }

  return /[。！？]$/.test(sentence) ? sentence : `${sentence}。`
}

function trimYoutubeTitle(value: string) {
  const trimmed = value
    .slice(0, 100)
    .replace(/\s+\S*$/, "")
    .trim()

  return trimmed || value.slice(0, 100).trim()
}

function withVideoTitleNamePlaceholder(value: string) {
  if (value.includes(VIDEO_TITLE_NAME_PLACEHOLDER)) {
    return value
  }

  return `${value} ${VIDEO_TITLE_NAME_PLACEHOLDER}`
}

function parseJsonObject(raw: string): unknown {
  try {
    return JSON.parse(raw) as unknown
  } catch {
    const match = raw.match(/\{[\s\S]*\}/)

    if (!match) {
      throw new Error("Codex did not return JSON.")
    }

    return JSON.parse(match[0]) as unknown
  }
}

function captureCommand(
  command: string,
  args: Array<string>,
  options: { input?: string; timeoutMs?: number } = {}
) {
  return new Promise<string>((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: ROOT,
      detached: process.platform !== "win32",
      stdio: ["pipe", "pipe", "pipe"],
    })
    const stdout: Array<Buffer> = []
    const stderr: Array<Buffer> = []
    const timeoutMs = normalizeTimeoutMs(options.timeoutMs)
    let didTimeout = false
    let isSettled = false
    const timeout =
      timeoutMs === null
        ? null
        : setTimeout(() => {
            didTimeout = true
            killProcessTree(child)
          }, timeoutMs)

    const settle = (action: () => void) => {
      if (isSettled) {
        return
      }

      isSettled = true

      if (timeout) {
        clearTimeout(timeout)
      }

      action()
    }

    child.stdout.on("data", (chunk) => {
      stdout.push(Buffer.from(chunk))
    })
    child.stderr.on("data", (chunk) => {
      stderr.push(Buffer.from(chunk))
    })
    child.on("error", (error) => {
      settle(() =>
        reject(new Error(`${command} failed to start: ${error.message}`))
      )
    })
    child.on("close", (code, signal) => {
      const stdoutText = Buffer.concat(stdout).toString("utf8")
      const stderrText = Buffer.concat(stderr).toString("utf8")

      if (didTimeout && typeof timeoutMs === "number") {
        settle(() =>
          reject(
            new Error(`${command} timed out after ${formatDuration(timeoutMs)}`)
          )
        )
        return
      }

      if (code === 0) {
        settle(() => resolve(stdoutText))
        return
      }

      settle(() =>
        reject(
          new Error(
            `${command} failed with ${
              signal || `exit code ${code}`
            }: ${stderrText || stdoutText}`.trim()
          )
        )
      )
    })

    if (options.input) {
      child.stdin.write(options.input)
    }

    child.stdin.end()
  })
}

function killProcessTree(child: ReturnType<typeof spawn>) {
  if (!child.pid) {
    return
  }

  try {
    if (process.platform === "win32") {
      child.kill("SIGTERM")
      return
    }

    process.kill(-child.pid, "SIGTERM")
  } catch {
    child.kill("SIGTERM")
  }
}

function normalizeTimeoutMs(value: number | undefined): number | null {
  return typeof value === "number" && Number.isFinite(value) && value > 0
    ? value
    : null
}

function formatDuration(milliseconds: number) {
  const seconds = Math.ceil(milliseconds / 1000)

  return `${seconds}s`
}

function tomlString(value: string) {
  return JSON.stringify(value)
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Unknown error"
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null
}
