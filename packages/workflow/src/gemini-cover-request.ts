import sharp from "sharp"

import {
  fetchGeminiImage,
  findGeminiInlineImage,
  geminiErrorMessage,
  type GeminiImageSize,
} from "./gemini-cover-response.ts"

const GEMINI_COVER_MAX_ATTEMPTS = 2
const MIN_COVER_AVERAGE_CHANNEL_STDEV = 25
const MIN_COVER_ENTROPY = 6.4

export type GeminiCoverSettings = {
  apiKey: string
  apiVersion: string
  imageSize: GeminiImageSize | null
  model: string
  timeoutMs: number
}

export type GeminiCoverReference = {
  bytes: Buffer
  contentType: string
}

type GeminiCoverImage = {
  data: string
  mimeType: string
}

type CheckedGeminiCoverImage = {
  buffer: Buffer
  image: GeminiCoverImage
}

type GeneratedCoverQuality = {
  averageChannelStdev: number
  entropy: number
}

type GeminiCoverResponse = {
  data: unknown
  image: GeminiCoverImage | null
}

export async function requestUsableGeminiCover({
  coverAspectRatio,
  finalPrompt,
  onBlankRetry,
  references,
  settings,
}: {
  coverAspectRatio: string
  finalPrompt: string
  onBlankRetry: () => void
  references: Array<GeminiCoverReference>
  settings: GeminiCoverSettings
}): Promise<CheckedGeminiCoverImage> {
  return requestUsableGeminiCoverAttempt({
    attempt: 1,
    coverAspectRatio,
    finalPrompt,
    onBlankRetry,
    references,
    rejectedQuality: null,
    settings,
  })
}

async function requestUsableGeminiCoverAttempt({
  attempt,
  coverAspectRatio,
  finalPrompt,
  onBlankRetry,
  references,
  rejectedQuality,
  settings,
}: {
  attempt: number
  coverAspectRatio: string
  finalPrompt: string
  onBlankRetry: () => void
  references: Array<GeminiCoverReference>
  rejectedQuality: GeneratedCoverQuality | null
  settings: GeminiCoverSettings
}): Promise<CheckedGeminiCoverImage> {
  const response = await requestGeminiCover({
    coverAspectRatio,
    parts: coverRequestParts(
      geminiPromptForAttempt(finalPrompt, attempt),
      references
    ),
    settings,
  })
  const { data, image } = response

  if (!image) {
    throw new Error(missingGeminiImageMessage(data))
  }

  const buffer = Buffer.from(image.data, "base64")
  const quality = await generatedCoverQuality(buffer)

  if (isUsableGeneratedCover(quality)) {
    return { buffer, image }
  }

  if (attempt >= GEMINI_COVER_MAX_ATTEMPTS) {
    throw new Error(blankGeminiCoverMessage(quality || rejectedQuality))
  }

  onBlankRetry()

  return requestUsableGeminiCoverAttempt({
    attempt: attempt + 1,
    coverAspectRatio,
    finalPrompt,
    onBlankRetry,
    references,
    rejectedQuality: quality,
    settings,
  })
}

function coverRequestParts(
  finalPrompt: string,
  references: Array<GeminiCoverReference>
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
  coverAspectRatio,
  parts,
  settings,
}: {
  coverAspectRatio: string
  parts: ReturnType<typeof coverRequestParts>
  settings: GeminiCoverSettings
}): Promise<GeminiCoverResponse> {
  const response = await fetchGeminiImage(
    `https://generativelanguage.googleapis.com/${settings.apiVersion}/models/${settings.model}:generateContent?key=${encodeURIComponent(settings.apiKey)}`,
    {
      body: JSON.stringify({
        contents: [{ parts }],
        generationConfig: {
          imageConfig: {
            aspectRatio: coverAspectRatio,
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

  return {
    data,
    image: findGeminiInlineImage(data),
  }
}

function geminiPromptForAttempt(finalPrompt: string, attempt: number) {
  if (attempt === 1) {
    return finalPrompt
  }

  return `${finalPrompt}

The previous response was rejected because it was nearly blank or flat. Regenerate a complete 16:9 photographic scene with visible subjects, background, lighting, depth, and color variation. Do not output a blank wall, texture-only image, gradient, flat color field, or near-monochrome placeholder.`
}

async function generatedCoverQuality(
  image: Buffer
): Promise<GeneratedCoverQuality> {
  const stats = await sharp(image).stats()
  const colorChannels = stats.channels.slice(0, 3)
  const averageChannelStdev =
    colorChannels.reduce((total, channel) => total + channel.stdev, 0) /
    colorChannels.length

  return {
    averageChannelStdev,
    entropy: stats.entropy,
  }
}

function isUsableGeneratedCover(quality: GeneratedCoverQuality) {
  return (
    quality.averageChannelStdev >= MIN_COVER_AVERAGE_CHANNEL_STDEV ||
    quality.entropy >= MIN_COVER_ENTROPY
  )
}

function blankGeminiCoverMessage(quality: GeneratedCoverQuality | null) {
  const detail = quality
    ? ` Average color variation: ${quality.averageChannelStdev.toFixed(1)}. Entropy: ${quality.entropy.toFixed(2)}.`
    : ""

  return `Gemini returned an almost blank cover image twice, so no files were overwritten.${detail} Try a different inspiration image or a more concrete cover prompt.`
}

function missingGeminiImageMessage(data: unknown) {
  const reason = geminiNoImageReason(data)

  return reason
    ? `Gemini did not return an inline image. ${reason}`
    : "Gemini did not return an inline image."
}

function geminiNoImageReason(data: unknown) {
  const details = [
    promptFeedbackReason(data),
    ...candidateReasons(data),
    ...candidateTextSnippets(data),
  ].filter(Boolean)

  return [...new Set(details)].join(" ")
}

function promptFeedbackReason(data: unknown) {
  if (!isRecord(data) || !isRecord(data.promptFeedback)) {
    return ""
  }

  const reason = stringValue(data.promptFeedback.blockReason)

  return reason ? `Prompt was blocked: ${reason}.` : ""
}

function candidateReasons(data: unknown) {
  return candidates(data).flatMap((candidate) => {
    const reason = stringValue(candidate.finishReason)

    return reason ? [`Gemini finish reason: ${reason}.`] : []
  })
}

function candidateTextSnippets(data: unknown) {
  return candidates(data).flatMap((candidate) =>
    candidateParts(candidate)
      .map((part) => textSnippet(part))
      .filter(Boolean)
  )
}

function candidates(data: unknown) {
  return isRecord(data) && Array.isArray(data.candidates)
    ? data.candidates.filter(isRecord)
    : []
}

function candidateParts(candidate: Record<string, unknown>) {
  return isRecord(candidate.content) && Array.isArray(candidate.content.parts)
    ? candidate.content.parts.filter(isRecord)
    : []
}

function textSnippet(part: Record<string, unknown>) {
  const text = stringValue(part.text).replace(/\s+/g, " ").trim()

  return text ? `Gemini text response: ${text.slice(0, 240)}` : ""
}

function stringValue(value: unknown) {
  return typeof value === "string" ? value : ""
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null
}
