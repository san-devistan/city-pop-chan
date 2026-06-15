import { errorJson } from "@/lib/http"
import { createFileRoute } from "@tanstack/react-router"
import { readGeneratedMediaFile } from "@workspace/workflow/albums"

export const Route = createFileRoute("/api/suno/media")({
  server: {
    handlers: {
      GET: async ({ request }) => sendMediaResponse(request, true),
      HEAD: async ({ request }) => sendMediaResponse(request, false),
      OPTIONS: () => new Response(null, { headers: mediaCorsHeaders() }),
    },
  },
})

async function sendMediaResponse(request: Request, includeBody: boolean) {
  try {
    const url = new URL(request.url)
    const folder = url.searchParams.get("folder") || ""
    const file = url.searchParams.get("file") || ""
    const media = await readGeneratedMediaFile(folder, file)

    return buildMediaResponse(request, media, includeBody)
  } catch (error) {
    const response = errorJson(
      error instanceof Error ? error.message : "Media file not found.",
      404
    )

    for (const [key, value] of mediaCorsHeaders()) {
      response.headers.set(key, value)
    }

    return response
  }
}

function buildMediaResponse(
  request: Request,
  media: Awaited<ReturnType<typeof readGeneratedMediaFile>>,
  includeBody: boolean
) {
  const range = request.headers.get("range")
  const headers = baseMediaHeaders(media)

  if (!range) {
    headers.set("content-length", String(media.bytes.length))

    return new Response(includeBody ? media.bytes : null, { headers })
  }

  const parsed = parseRange(range, media.bytes.length)

  if (!parsed) {
    headers.set("content-range", `bytes */${media.bytes.length}`)

    return new Response(null, { headers, status: 416 })
  }

  const body = media.bytes.subarray(parsed.start, parsed.end + 1)

  headers.set("content-length", String(body.length))
  headers.set(
    "content-range",
    `bytes ${parsed.start}-${parsed.end}/${media.bytes.length}`
  )

  return new Response(includeBody ? body : null, {
    headers,
    status: 206,
  })
}

function baseMediaHeaders(
  media: Awaited<ReturnType<typeof readGeneratedMediaFile>>
) {
  const headers = mediaCorsHeaders({
    "accept-ranges": "bytes",
    "cache-control": "no-store",
    "content-type": media.contentType,
  })

  return headers
}

function mediaCorsHeaders(init?: HeadersInit) {
  const headers = new Headers(init)

  headers.set("access-control-allow-headers", "content-type, range")
  headers.set("access-control-allow-methods", "GET, HEAD, OPTIONS")
  headers.set("access-control-allow-origin", "*")
  headers.set(
    "access-control-expose-headers",
    "accept-ranges, content-length, content-range, content-type"
  )

  return headers
}

function parseRange(range: string, size: number) {
  const match = range.match(/^bytes=(\d*)-(\d*)$/)

  if (!match) {
    return null
  }

  const [, startValue, endValue] = match

  if (!startValue && !endValue) {
    return null
  }

  if (!startValue) {
    const suffixLength = Number(endValue)

    if (!Number.isInteger(suffixLength) || suffixLength <= 0) {
      return null
    }

    return {
      end: size - 1,
      start: Math.max(0, size - suffixLength),
    }
  }

  const start = Number(startValue)
  const requestedEnd = endValue ? Number(endValue) : size - 1
  const end = Math.min(requestedEnd, size - 1)

  if (
    !Number.isInteger(start) ||
    !Number.isInteger(requestedEnd) ||
    start < 0 ||
    start > end ||
    start >= size
  ) {
    return null
  }

  return { end, start }
}
