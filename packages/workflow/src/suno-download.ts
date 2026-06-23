/* eslint-disable max-lines */
// @ts-nocheck

import { spawn } from "node:child_process"
import {
  access,
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  rename,
  rm,
  stat,
  writeFile,
} from "node:fs/promises"
import os from "node:os"
import path from "node:path"
import { fileURLToPath } from "node:url"

import { registerAlbumCreatedAt } from "./albums.ts"

const ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../.."
)
const GENERATED = path.join(ROOT, "generated")
const DEFAULT_EXPECTED_COUNT = 14
const DEFAULT_POLL_SECONDS = 600
const DEFAULT_POLL_INTERVAL_SECONDS = 10
const DEFAULT_CODEX_COMMAND = "codex"
const DEFAULT_WORKSPACE_ID = "2f74dbe0-75a6-4be0-b95b-2bfef7915a76"
const BOOLEAN_OPTIONS = new Set(["dryRun"])
const UUID_PATTERN =
  "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}"
const MP3_SAMPLE_BYTES = 4095
const MIN_MP3_BYTES = 4096
const JAPANESE_SCRIPT_PATTERN =
  /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}]/u
const noop = () => {}

export function sunoDownloadUsage() {
  return `Usage:
  pnpm suno:download <suno-song-url-or-clip-id>...
  pbpaste | pnpm suno:download
  pnpm suno:download --from-file suno-links.txt

Examples:
  pnpm suno:download https://suno.com/song/f9943d42-4b47-4374-b1ac-eaedf3bc3d8d ...
  pbpaste | pnpm suno:download --expected-count 14
  pnpm suno:download --from-file /tmp/suno-links.txt --output-dir generated

Options:
  --from-file <path>             Read Suno song URLs or clip IDs from a file
  --output-dir <path>            Output base directory (default: generated)
  --expected-count <n>           Required unique clip count (default: 14)
  --poll-seconds <n>             CDN readiness timeout (default: 600)
  --poll-interval-seconds <n>    CDN readiness poll interval (default: 10)
  --codex-command <command>      Codex CLI command (default: codex)
  --codex-model <model>          Optional model passed to codex exec
  --dry-run                      Generate names and check readiness without writing files
  --help                         Show this help

The script downloads only MP3s. It does not create Suno songs, delete Suno songs,
or write manifests under generated/. Names are generated through Codex CLI.`
}

function parseArgs(argv) {
  const options = {}
  const positionals = []

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index]

    if (arg === "--") {
      positionals.push(...argv.slice(index + 1))
      break
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

    if (BOOLEAN_OPTIONS.has(key) || !next || next.startsWith("--")) {
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
    console.log(sunoDownloadUsage())
    return
  }

  const config = normalizeOptions(options)
  const input = await collectInput(positionals, config.fromFile)
  await downloadSunoBatch(input, {
    codexCommand: config.codexCommand,
    codexModel: config.codexModel,
    dryRun: config.dryRun,
    expectedCount: config.expectedCount,
    outputDir: config.outputDir,
    pollIntervalSeconds: config.pollIntervalSeconds,
    pollSeconds: config.pollSeconds,
    onLog: console.log,
  })
}

export async function downloadSunoBatch(input, options = {}) {
  const logs = []
  const log = (line) => {
    logs.push(line)
    options.onLog?.(line)
  }
  const config = {
    ...normalizeOptions(options),
    fromFile: null,
    log,
  }
  const clipIds = extractClipIds(input)

  if (clipIds.length !== config.expectedCount) {
    throw new Error(
      `Expected ${config.expectedCount} unique Suno clip IDs, found ${clipIds.length}.\n` +
        `Found: ${clipIds.join(", ") || "(none)"}\n\n${sunoDownloadUsage()}`
    )
  }

  await mkdir(config.outputDir, { recursive: true })

  const existingFolders = await readExistingFolderNames(config.outputDir)
  const names = await generateNamesWithCodex({
    codexCommand: config.codexCommand,
    codexModel: config.codexModel,
    clipCount: clipIds.length,
    existingFolders,
  })
  const plan = buildDownloadPlan(clipIds, names, existingFolders, config)

  config.log(`Batch folder: ${relative(plan.batchDir)}`)
  config.log("Waiting for Suno CDN MP3 URLs...")

  const readyClips = await waitForCdnReadiness(clipIds, config)

  if (config.dryRun) {
    config.log("Dry run complete. No files were written.")
    printPlan(plan, readyClips, config.log)
    return {
      batchDir: plan.batchDir,
      dryRun: true,
      folder: plan.folderName,
      logs: logs.join("\n"),
    }
  }

  const downloaded = await downloadBatch(plan, readyClips, config.log)
  const verified = await verifyBatch(plan.batchDir, clipIds.length)
  await registerAlbumCreatedAt(plan.folderName)

  printSummary(plan.batchDir, downloaded, verified, config.log)

  return {
    batchDir: plan.batchDir,
    downloaded,
    dryRun: false,
    folder: plan.folderName,
    logs: logs.join("\n"),
    verified,
  }
}

function normalizeOptions(options) {
  const logger = typeof options.onLog === "function" ? options.onLog : noop

  return {
    codexCommand: String(options.codexCommand || DEFAULT_CODEX_COMMAND),
    codexModel: options.codexModel ? String(options.codexModel) : null,
    dryRun: options.dryRun === true,
    expectedCount: parsePositiveInteger(
      options.expectedCount,
      DEFAULT_EXPECTED_COUNT,
      "--expected-count"
    ),
    fromFile: options.fromFile
      ? resolveRootPath(String(options.fromFile))
      : null,
    outputDir: options.outputDir
      ? resolveRootPath(String(options.outputDir))
      : GENERATED,
    pollIntervalSeconds: parsePositiveInteger(
      options.pollIntervalSeconds,
      DEFAULT_POLL_INTERVAL_SECONDS,
      "--poll-interval-seconds"
    ),
    pollSeconds: parsePositiveInteger(
      options.pollSeconds,
      DEFAULT_POLL_SECONDS,
      "--poll-seconds"
    ),
    log: logger,
  }
}

function parsePositiveInteger(value, fallback, optionName) {
  if (value === undefined || value === null || value === "") {
    return fallback
  }

  const parsed = Number(value)

  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`${optionName} must be a positive integer`)
  }

  return parsed
}

async function collectInput(positionals, fromFile) {
  const parts = [...positionals]

  if (fromFile) {
    parts.push(await readFile(fromFile, "utf8"))
  }

  const stdin = await readStdinIfPiped()

  if (stdin) {
    parts.push(stdin)
  }

  if (parts.join("").trim()) {
    return parts.join("\n")
  }

  const clipboard = await readClipboardText()

  if (clipboard.trim()) {
    return clipboard
  }

  throw new Error(
    `No Suno song URLs or clip IDs provided.\n\n${sunoDownloadUsage()}`
  )
}

export function extractSunoClipIds(input) {
  const workspaceIds = new Set(
    [
      DEFAULT_WORKSPACE_ID,
      ...matchAll(input, new RegExp(`[?&]wid=(${UUID_PATTERN})`, "gi")),
    ].map((id) => id.toLowerCase())
  )
  const preferred = [
    ...matchAll(
      input,
      new RegExp(`(?:/song/|cdn[12]\\.suno\\.ai/)(${UUID_PATTERN})`, "gi")
    ),
  ]
  const candidates =
    preferred.length > 0
      ? preferred
      : matchAll(input, new RegExp(`\\b(${UUID_PATTERN})\\b`, "gi"))

  return unique(
    candidates
      .map((id) => id.toLowerCase())
      .filter((id) => !workspaceIds.has(id))
  )
}

const extractClipIds = extractSunoClipIds

function matchAll(input, pattern) {
  return [...input.matchAll(pattern)].map((match) => match[1] || match[0])
}

function unique(values) {
  return values.filter((value, index) => values.indexOf(value) === index)
}

async function generateNamesWithCodex({
  codexCommand,
  codexModel,
  clipCount,
  existingFolders,
}) {
  const tempDir = await mkdtemp(path.join(os.tmpdir(), "suno-codex-names-"))
  const schemaFile = path.join(tempDir, "schema.json")
  const outputFile = path.join(tempDir, "names.json")

  try {
    await writeFile(schemaFile, JSON.stringify(nameSchema(clipCount), null, 2))

    const args = [
      "--ask-for-approval",
      "never",
      "exec",
      "--sandbox",
      "read-only",
      "--ephemeral",
      "--cd",
      ROOT,
      "--output-schema",
      schemaFile,
      "--output-last-message",
      outputFile,
    ]

    if (codexModel) {
      args.push("--model", codexModel)
    }

    args.push("-")

    await captureCommand(codexCommand, args, {
      input: namePrompt(clipCount, existingFolders),
    })

    const raw = await readFile(outputFile, "utf8")
    const parsed = parseJsonObject(raw)

    return normalizeGeneratedNames(parsed, clipCount)
  } catch (error) {
    throw new Error(`Codex CLI name generation failed: ${error.message}`, {
      cause: error,
    })
  } finally {
    await rm(tempDir, { force: true, recursive: true })
  }
}

function nameSchema(clipCount) {
  return {
    $schema: "https://json-schema.org/draft/2020-12/schema",
    additionalProperties: false,
    properties: {
      folderNames: {
        items: { type: "string" },
        minItems: 4,
        type: "array",
      },
      songNames: {
        items: { type: "string" },
        maxItems: clipCount,
        minItems: clipCount,
        type: "array",
      },
    },
    required: ["folderNames", "songNames"],
    type: "object",
  }
}

function namePrompt(clipCount, existingFolders) {
  return `Generate local file names for a Suno City Pop download batch.

Return JSON only, matching the provided schema.

Need:
- folderNames: 4 imaginative candidate album or batch folder names.
- songNames: exactly ${clipCount} unique local song names.

Style:
- 1980s/1990s Tokyo or Japan city pop.
- Vintage nightlife, neon streets, city night drives, expressways, taxis, cars, cassette/FM radio, bayside lights, rain, light-mellow moods.
- Keep the same nostalgic Japanese city-pop mood, but make the names feel natural, varied, and less formulaic.
- Use Japanese-first title language and word order. Prefer kanji/kana titles with natural particles like の, へ, で, まで, から, and short Japanese phrases.
- English words are allowed sparingly when they feel like Japanese music titles, for example Drive, FM, Midnight, Memory, Bay, Neon, or Radio.
- Avoid romaji-only titles and avoid full English titles unless one English word is embedded in an otherwise Japanese title.
- Every folder name and song name must include at least one Japanese character: kanji, hiragana, or katakana.
- Mix title shapes across the batch: one-word Japanese titles, names, place names, 2-3 segment titles, 3-5 word titles, and the occasional short sentence-like title.
- Do not make every title three words or give every title the same grammatical structure.
- Use Japanese scripts, ASCII letters, numbers, and spaces only. The downloader will turn spaces and punctuation into hyphens.
- Reference range, not exact names to copy: 夜風のDrive, 246号線の雨, 湾岸電話ボックス, 真夜中のFM, Last Trainのあとで, ミナトまでのMemory.
- No file extensions.
- No explicit years.
- No clip IDs.
- No slashes.
- Keep names usable as local file and folder names. Usually 1-8 words; avoid very long titles.

Existing generated folders to avoid:
${existingFolders.length > 0 ? existingFolders.join("\n") : "(none)"}`
}

function parseJsonObject(raw) {
  try {
    return JSON.parse(raw)
  } catch {
    const match = raw.match(/\{[\s\S]*\}/)

    if (!match) {
      throw new Error("Codex did not return JSON")
    }

    return JSON.parse(match[0])
  }
}

function normalizeGeneratedNames(parsed, clipCount) {
  const folderNames = Array.isArray(parsed.folderNames)
    ? parsed.folderNames.map(slugifyName).filter(isJapaneseName)
    : []
  const songNames = Array.isArray(parsed.songNames)
    ? parsed.songNames.map(slugifyName).filter(isJapaneseName)
    : []

  if (folderNames.length === 0) {
    throw new Error("Codex returned no usable Japanese folder names")
  }

  if (songNames.length !== clipCount) {
    throw new Error(
      `Codex returned ${songNames.length} usable Japanese song names; expected ${clipCount}`
    )
  }

  return {
    folderNames: unique(folderNames),
    songNames: uniquifyNames(songNames),
  }
}

function isJapaneseName(value) {
  return value.length > 0 && JAPANESE_SCRIPT_PATTERN.test(value)
}

function buildDownloadPlan(clipIds, names, existingFolders, config) {
  const existing = new Set(existingFolders)
  const folderName = chooseFolderName(names.folderNames, existing)
  const batchDir = path.join(config.outputDir, folderName)
  const files = clipIds.map((id, index) => ({
    fileName: `${names.songNames[index]}.mp3`,
    id,
    localName: names.songNames[index],
    target: path.join(batchDir, `${names.songNames[index]}.mp3`),
  }))

  return { batchDir, files, folderName, outputDir: config.outputDir }
}

function chooseFolderName(folderNames, existingFolders) {
  for (const folderName of folderNames) {
    if (!existingFolders.has(folderName)) {
      return folderName
    }
  }

  for (let index = 2; index < 100; index += 1) {
    const candidate = `${folderNames[0]}-${index}`

    if (!existingFolders.has(candidate)) {
      return candidate
    }
  }

  throw new Error("Could not choose a unique generated folder name")
}

function uniquifyNames(names) {
  const used = new Set()

  return names.map((name) => {
    let candidate = name
    let index = 2

    while (used.has(candidate)) {
      candidate = `${name}-${index}`
      index += 1
    }

    used.add(candidate)
    return candidate
  })
}

async function waitForCdnReadiness(clipIds, config) {
  const deadline = Date.now() + config.pollSeconds * 1000
  return pollCdnReadiness(clipIds, config, deadline)
}

async function pollCdnReadiness(clipIds, config, deadline) {
  const results = await Promise.all(clipIds.map((id) => probeSunoMp3(id)))
  const latest = new Map(results.map((result) => [result.id, result]))
  const readyCount = results.filter((result) => result.ok).length

  if (readyCount === clipIds.length) {
    config.log(`CDN ready: ${readyCount}/${clipIds.length}`)
    return latest
  }

  if (Date.now() > deadline) {
    throw new Error(
      `Timed out waiting for CDN readiness:\n${formatPending(latest)}`
    )
  }

  const pending = results
    .filter((result) => !result.ok)
    .map((result) => result.id)

  config.log(
    `CDN ready: ${readyCount}/${clipIds.length}; pending ${pending.join(", ")}`
  )

  await delay(config.pollIntervalSeconds * 1000)
  return pollCdnReadiness(clipIds, config, deadline)
}

async function probeSunoMp3(id) {
  return probeSunoMp3Cdn(id, ["cdn1", "cdn2"], [])
}

async function probeSunoMp3Cdn(id, cdns, attempts) {
  const [cdn, ...remainingCdns] = cdns

  if (!cdn) {
    return { attempts, id, ok: false, url: null }
  }

  const url = `https://${cdn}.suno.ai/${id}.mp3`

  try {
    const response = await fetch(url, {
      headers: { Range: `bytes=0-${MP3_SAMPLE_BYTES}` },
      signal: AbortSignal.timeout(15000),
    })
    const bytes = Buffer.from(await response.arrayBuffer())
    const contentType = response.headers.get("content-type") || ""
    const isMp3 = isValidMp3Response(response, bytes, contentType)
    const nextAttempts = [
      ...attempts,
      {
        bytes: bytes.length,
        cdn,
        contentType,
        isMp3,
        status: response.status,
        url,
      },
    ]

    if (isMp3) {
      return { attempts: nextAttempts, id, ok: true, url }
    }

    return probeSunoMp3Cdn(id, remainingCdns, nextAttempts)
  } catch (error) {
    return probeSunoMp3Cdn(id, remainingCdns, [
      ...attempts,
      { cdn, error: error.message, url },
    ])
  }
}

function isValidMp3Response(response, bytes, contentType) {
  return (
    (response.status === 200 || response.status === 206) &&
    bytes.length > 0 &&
    isMp3Bytes(bytes, contentType)
  )
}

function isMp3Bytes(bytes, contentType = "") {
  return (
    bytes.subarray(0, 3).toString("latin1") === "ID3" ||
    bytes[0] === 0xff ||
    contentType.toLowerCase().includes("audio")
  )
}

async function downloadBatch(plan, readyClips, log) {
  const stagingDir = await mkdtemp(
    path.join(plan.outputDir, `.${plan.folderName}.staging-`)
  )
  let shouldCleanStaging = true

  try {
    await assertMissing(plan.batchDir)

    const downloaded = await Promise.all(
      plan.files.map(async (file) => {
        const ready = readyClips.get(file.id)

        if (!ready?.ok) {
          throw new Error(`Clip is not CDN-ready: ${file.id}`)
        }

        const stagingFile = path.join(stagingDir, file.fileName)
        const result = await downloadMp3(file.id, ready.url, stagingFile)

        log(`Downloaded ${file.fileName} (${formatBytes(result.bytes)})`)

        return {
          ...file,
          bytes: result.bytes,
          sourceUrl: result.sourceUrl,
          target: path.join(plan.batchDir, file.fileName),
        }
      })
    )

    await verifyBatch(stagingDir, plan.files.length)
    await rename(stagingDir, plan.batchDir)
    shouldCleanStaging = false

    return downloaded
  } finally {
    if (shouldCleanStaging) {
      await rm(stagingDir, { force: true, recursive: true })
    }
  }
}

async function downloadMp3(id, readyUrl, target) {
  const urls = unique(
    [
      readyUrl,
      `https://cdn1.suno.ai/${id}.mp3`,
      `https://cdn2.suno.ai/${id}.mp3`,
    ].filter(Boolean)
  )

  return downloadMp3FromUrls(id, urls, target, [])
}

async function downloadMp3FromUrls(id, urls, target, attempts) {
  const [url, ...remainingUrls] = urls

  if (!url) {
    throw new Error(`Failed to download ${id}: ${JSON.stringify(attempts)}`)
  }

  let nextAttempts = attempts

  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(60000) })
    const bytes = Buffer.from(await response.arrayBuffer())
    const contentType = response.headers.get("content-type") || ""
    const isMp3 =
      response.ok &&
      bytes.length > MIN_MP3_BYTES &&
      isMp3Bytes(bytes, contentType)

    nextAttempts = [
      ...attempts,
      {
        bytes: bytes.length,
        contentType,
        isMp3,
        status: response.status,
        url,
      },
    ]

    if (isMp3) {
      await writeFile(target, bytes, { flag: "wx" })
      return { bytes: bytes.length, sourceUrl: url }
    }
  } catch (error) {
    nextAttempts = [...attempts, { error: error.message, url }]
  }

  return downloadMp3FromUrls(id, remainingUrls, target, nextAttempts)
}

async function verifyBatch(directory, expectedCount) {
  const entries = await readdir(directory, { withFileTypes: true })
  const files = entries
    .filter((entry) => entry.isFile())
    .map((entry) => path.join(directory, entry.name))
    .toSorted((left, right) =>
      path.basename(left).localeCompare(path.basename(right))
    )

  if (files.length !== expectedCount) {
    throw new Error(
      `Expected ${expectedCount} files in ${relative(directory)}, found ${files.length}`
    )
  }

  const nonMp3 = files.filter((file) => !file.toLowerCase().endsWith(".mp3"))

  if (nonMp3.length > 0) {
    throw new Error(`Non-MP3 files found: ${nonMp3.map(relative).join(", ")}`)
  }

  return Promise.all(
    files.map(async (file) => {
      const fileStat = await stat(file)
      const sample = await readFile(file)

      if (fileStat.size <= MIN_MP3_BYTES || !isMp3Bytes(sample)) {
        throw new Error(`Invalid MP3 file: ${relative(file)}`)
      }

      return { bytes: fileStat.size, file }
    })
  )
}

async function readExistingFolderNames(outputDir) {
  try {
    const entries = await readdir(outputDir, { withFileTypes: true })

    return entries
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)
  } catch (error) {
    if (error.code === "ENOENT") {
      return []
    }

    throw error
  }
}

async function assertMissing(file) {
  try {
    await access(file)
  } catch (error) {
    if (error.code === "ENOENT") {
      return
    }

    throw error
  }

  throw new Error(`Refusing to overwrite existing path: ${relative(file)}`)
}

function formatPending(results) {
  return [...results.values()]
    .filter((result) => !result.ok)
    .map((result) => {
      const attempts = result.attempts
        .map((attempt) => {
          if (attempt.error) {
            return `${attempt.cdn}: ${attempt.error}`
          }

          return `${attempt.cdn}: HTTP ${attempt.status} ${attempt.contentType}`
        })
        .join("; ")

      return `- ${result.id}: ${attempts}`
    })
    .join("\n")
}

function slugifyName(value) {
  return String(value)
    .normalize("NFKC")
    .replaceAll(/[^\p{L}\p{N}]+/gu, "-")
    .replaceAll(/-+/g, "-")
    .replace(/^-|-$/g, "")
}

function resolveRootPath(file) {
  return path.isAbsolute(file) ? file : path.join(ROOT, file)
}

function relative(file) {
  return path.relative(ROOT, file)
}

function delay(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms)
  })
}

async function readStdinIfPiped() {
  if (process.stdin.isTTY) {
    return ""
  }

  const chunks = []

  for await (const chunk of process.stdin) {
    chunks.push(Buffer.from(chunk))
  }

  return Buffer.concat(chunks).toString("utf8")
}

async function readClipboardText() {
  if (process.platform !== "darwin") {
    return ""
  }

  try {
    return await captureCommand("pbpaste", [])
  } catch {
    return ""
  }
}

function captureCommand(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: ROOT,
      stdio: ["pipe", "pipe", "pipe"],
    })
    const stdout = []
    const stderr = []

    child.stdout.on("data", (chunk) => {
      stdout.push(Buffer.from(chunk))
    })
    child.stderr.on("data", (chunk) => {
      stderr.push(Buffer.from(chunk))
    })
    child.on("error", (error) => {
      reject(new Error(`${command} failed to start: ${error.message}`))
    })
    child.on("exit", (code, signal) => {
      const stdoutText = Buffer.concat(stdout).toString("utf8")
      const stderrText = Buffer.concat(stderr).toString("utf8")

      if (code === 0) {
        resolve(stdoutText)
        return
      }

      reject(
        new Error(
          `${command} failed with ${signal || `exit code ${code}`}: ${
            stderrText || stdoutText
          }`
        )
      )
    })

    if (options.input) {
      child.stdin.end(options.input)
    } else {
      child.stdin.end()
    }
  })
}

function formatBytes(bytes) {
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

function printPlan(plan, readyClips, log) {
  for (const file of plan.files) {
    const ready = readyClips.get(file.id)

    log(`${file.id} -> ${relative(file.target)} via ${ready?.url}`)
  }
}

function printSummary(batchDir, downloaded, verified, log) {
  log(`\nSaved ${verified.length} MP3 files to ${relative(batchDir)}:`)

  for (const file of downloaded) {
    log(`- ${relative(file.target)} (${formatBytes(file.bytes)})`)
  }
}
