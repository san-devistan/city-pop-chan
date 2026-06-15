export type GeminiImageSize = "512" | "1K" | "2K" | "4K"

export function normalizeGeminiApiVersion(
  version: string | undefined,
  fallback: string
) {
  const value = version?.trim()

  if (!value) {
    return fallback
  }

  return value.replace(/^\/+|\/+$/g, "")
}

export function normalizeGeminiModelName(model: string) {
  return model.trim().replace(/^models\//, "")
}

export function normalizeGeminiImageSize(
  value: string | undefined,
  model: string,
  fallback: GeminiImageSize
): GeminiImageSize | null {
  const size = value?.trim()

  if (isGeminiImageSize(size)) {
    return size
  }

  if (size) {
    throw new Error(
      `GEMINI_IMAGE_SIZE must be one of: 512, 1K, 2K, or 4K. Received ${size}.`
    )
  }

  return model.startsWith("gemini-3") ? fallback : null
}

export function readPositiveInteger(
  value: string | undefined,
  fallback: number
) {
  const parsed = Number(value)

  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback
}

export async function fetchGeminiImage(
  url: string,
  init: RequestInit,
  timeoutMs: number
) {
  try {
    return await fetch(url, init)
  } catch (error) {
    if (isTimeoutError(error)) {
      throw new Error(
        `Gemini cover generation timed out after ${Math.round(
          timeoutMs / 1000
        )} seconds. Try again, or set GEMINI_IMAGE_TIMEOUT_MS to a larger value.`,
        { cause: error }
      )
    }

    throw error
  }
}

export function geminiErrorMessage(data: unknown) {
  if (
    typeof data === "object" &&
    data &&
    "error" in data &&
    typeof data.error === "object" &&
    data.error &&
    "message" in data.error &&
    typeof data.error.message === "string"
  ) {
    return data.error.message
  }

  return "Gemini cover generation failed."
}

export function findGeminiInlineImage(data: unknown) {
  if (!isRecord(data) || !Array.isArray(data.candidates)) {
    return null
  }

  for (const candidate of data.candidates) {
    const image = findCandidateInlineImage(candidate)

    if (image) {
      return image
    }
  }

  return null
}

export function extensionForMime(mimeType: string) {
  if (mimeType.includes("jpeg") || mimeType.includes("jpg")) {
    return "jpeg"
  }

  if (mimeType.includes("webp")) {
    return "webp"
  }

  return "png"
}

function isGeminiImageSize(
  value: string | undefined
): value is GeminiImageSize {
  return value === "512" || value === "1K" || value === "2K" || value === "4K"
}

function isTimeoutError(error: unknown) {
  return (
    error instanceof DOMException &&
    (error.name === "TimeoutError" || error.name === "AbortError")
  )
}

function findCandidateInlineImage(candidate: unknown) {
  const parts = candidateParts(candidate)

  if (!parts) {
    return null
  }

  for (const part of parts) {
    const image = inlineImageFromPart(part)

    if (image) {
      return image
    }
  }

  return null
}

function candidateParts(candidate: unknown) {
  if (!isRecord(candidate) || !isRecord(candidate.content)) {
    return null
  }

  return Array.isArray(candidate.content.parts) ? candidate.content.parts : null
}

function inlineImageFromPart(part: unknown) {
  if (!isRecord(part)) {
    return null
  }

  const inlineData = part.inlineData || part.inline_data

  if (!isRecord(inlineData) || typeof inlineData.data !== "string") {
    return null
  }

  return {
    data: inlineData.data,
    mimeType: inlineImageMimeType(inlineData),
  }
}

function inlineImageMimeType(inlineData: Record<string, unknown>) {
  if (typeof inlineData.mimeType === "string") {
    return inlineData.mimeType
  }

  if (typeof inlineData.mime_type === "string") {
    return inlineData.mime_type
  }

  return "image/png"
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null
}
