import { resolveGeneratedFolder, updateAlbumMetadata } from "./albums.ts"
import {
  normalizeCoverTextOverlays,
  normalizeCoverTitle,
  type CoverTextOverlays,
  writeCoverVariants,
} from "./cover-variants.ts"
import { readWorkflowEnv } from "./env.ts"
import {
  extensionForMime,
  fetchGeminiImage,
  findGeminiInlineImage,
  geminiErrorMessage,
  normalizeGeminiApiVersion,
  normalizeGeminiImageSize,
  normalizeGeminiModelName,
  readPositiveInteger,
  type GeminiImageSize,
} from "./gemini-cover-response.ts"
import { readInspirationReferenceImage } from "./inspirations.ts"

const DEFAULT_GEMINI_API_VERSION = "v1beta"
const DEFAULT_GEMINI_IMAGE_MODEL = "gemini-3-pro-image"
const DEFAULT_GEMINI_IMAGE_SIZE: GeminiImageSize = "2K"
const DEFAULT_GEMINI_IMAGE_TIMEOUT_MS = 300000
const COVER_ASPECT_RATIO: CoverAspectRatio = "16:9"

export type CoverAspectRatio = "1:1" | "16:9"

type GenerationStepStatus = "active" | "complete" | "error" | "pending"
type GenerationStepProgress = {
  detail?: string
  id: string
  progress?: number
  status?: GenerationStepStatus
}

type GenerateAlbumCoverOptions = {
  coverLeftText?: string
  coverPrompt?: string
  coverRightText?: string
  coverTopText?: string
  inspirationId?: string
  inspirationIds?: Array<string>
  onProgress?: (event: GenerationStepProgress) => void
  videoImageText?: string
}

type GeminiCoverSettings = {
  apiKey: string
  apiVersion: string
  imageSize: GeminiImageSize | null
  model: string
  timeoutMs: number
}

type CoverGenerationText = {
  coverTextOverlays: CoverTextOverlays
  finalPrompt: string
  savedCoverPrompt: string
  videoImageText: string
}

export async function generateAlbumCover(
  folder: string,
  prompt = "",
  options: GenerateAlbumCoverOptions = {}
) {
  const progress =
    typeof options.onProgress === "function" ? options.onProgress : noop
  progress({
    detail: "Reading album settings and prompt.",
    id: "prepare",
    status: "active",
  })
  const settings = await readGeminiCoverSettings()
  const text = coverGenerationText(prompt, options)

  progress({
    detail: "Prompt and Gemini settings are ready.",
    id: "prepare",
    status: "complete",
  })

  const references = await readCoverReferences(options, progress)

  await updateAlbumMetadata(folder, {
    coverAspectRatio: COVER_ASPECT_RATIO,
    coverLeftText: text.coverTextOverlays.leftText,
    coverPrompt: text.savedCoverPrompt,
    coverRightText: text.coverTextOverlays.rightText,
    coverTopText: text.coverTextOverlays.topText,
    videoImageText: text.videoImageText,
  })

  progress({
    detail: "Waiting for Gemini to return the 16/9 cover.",
    id: "gemini",
    status: "active",
  })
  const image = await requestGeminiCover({
    parts: coverRequestParts(text.finalPrompt, references),
    settings,
  })

  if (!image) {
    throw new Error("Gemini did not return an inline image.")
  }
  progress({
    detail: "Gemini returned the cover image.",
    id: "gemini",
    status: "complete",
  })

  const extension = extensionForMime(image.mimeType)
  const imageBuffer = Buffer.from(image.data, "base64")
  progress({
    detail: "Creating title and square cover variations.",
    id: "variants",
    status: "active",
  })
  const cover = await writeCoverVariants({
    directory: resolveGeneratedFolder(folder),
    extension,
    folder,
    image: imageBuffer,
    textOverlays: text.coverTextOverlays,
    title: text.videoImageText,
  })
  progress({
    detail: "Cover variations are saved.",
    id: "variants",
    status: "complete",
  })

  return cover
}

function noop() {}

async function readGeminiCoverSettings() {
  const env = await readWorkflowEnv()
  const apiKey = env.GEMINI_API_KEY || env.GOOGLE_API_KEY

  if (!apiKey) {
    throw new Error("Set GEMINI_API_KEY before generating cover art.")
  }

  const model = normalizeGeminiModelName(
    env.GEMINI_IMAGE_MODEL || DEFAULT_GEMINI_IMAGE_MODEL
  )

  return {
    apiKey,
    apiVersion: normalizeGeminiApiVersion(
      env.GEMINI_API_VERSION,
      DEFAULT_GEMINI_API_VERSION
    ),
    imageSize: normalizeGeminiImageSize(
      env.GEMINI_IMAGE_SIZE,
      model,
      DEFAULT_GEMINI_IMAGE_SIZE
    ),
    model,
    timeoutMs: readPositiveInteger(
      env.GEMINI_IMAGE_TIMEOUT_MS,
      DEFAULT_GEMINI_IMAGE_TIMEOUT_MS
    ),
  } satisfies GeminiCoverSettings
}

function coverGenerationText(
  prompt: string,
  options: GenerateAlbumCoverOptions
) {
  const finalPrompt = prompt.trim()

  if (!finalPrompt) {
    throw new Error("Enter a cover prompt before generating cover art.")
  }

  return {
    coverTextOverlays: normalizeCoverTextOverlays({
      leftText: options.coverLeftText,
      rightText: options.coverRightText,
      topText: options.coverTopText,
    }),
    finalPrompt,
    savedCoverPrompt:
      options.coverPrompt === undefined
        ? finalPrompt
        : options.coverPrompt.trim(),
    videoImageText: normalizeCoverTitle(options.videoImageText),
  } satisfies CoverGenerationText
}

async function readCoverReferences(
  options: GenerateAlbumCoverOptions,
  progress: (event: GenerationStepProgress) => void
) {
  const inspirationIds = selectedInspirationIds(options)

  progress({
    detail: coverReferencesProgressDetail(inspirationIds.length),
    id: "references",
    status: "active",
  })

  const references = await Promise.all(
    inspirationIds.map((inspirationId) =>
      readInspirationReferenceImage(inspirationId)
    )
  )

  progress({
    detail:
      references.length > 0
        ? "Inspiration references are ready."
        : "Skipping reference images.",
    id: "references",
    status: "complete",
  })

  return references
}

function coverReferencesProgressDetail(count: number) {
  if (count === 0) {
    return "No inspiration references selected."
  }

  return `Loading ${count} inspiration reference${count === 1 ? "" : "s"}.`
}

function coverRequestParts(
  finalPrompt: string,
  references: Array<{ bytes: Buffer; contentType: string }>
) {
  return [
    { text: finalPrompt },
    ...references.map((reference) => ({
      inlineData: {
        data: reference.bytes.toString("base64"),
        mimeType: reference.contentType,
      },
    })),
  ]
}

async function requestGeminiCover({
  parts,
  settings,
}: {
  parts: ReturnType<typeof coverRequestParts>
  settings: GeminiCoverSettings
}) {
  const response = await fetchGeminiImage(
    `https://generativelanguage.googleapis.com/${settings.apiVersion}/models/${settings.model}:generateContent?key=${encodeURIComponent(settings.apiKey)}`,
    {
      body: JSON.stringify({
        contents: [{ parts }],
        generationConfig: {
          imageConfig: {
            aspectRatio: COVER_ASPECT_RATIO,
            ...(settings.imageSize ? { imageSize: settings.imageSize } : {}),
          },
          responseModalities: ["TEXT", "IMAGE"],
        },
      }),
      headers: { "content-type": "application/json" },
      method: "POST",
      signal: AbortSignal.timeout(settings.timeoutMs),
    },
    settings.timeoutMs
  )
  const data = await response.json()

  if (!response.ok) {
    throw new Error(geminiErrorMessage(data))
  }

  return findGeminiInlineImage(data)
}

function selectedInspirationIds(options: {
  inspirationId?: string
  inspirationIds?: Array<string>
}) {
  const ids =
    options.inspirationIds && options.inspirationIds.length > 0
      ? options.inspirationIds
      : options.inspirationId
        ? [options.inspirationId]
        : []

  return [...new Set(ids.map((id) => id.trim()).filter(Boolean))]
}
