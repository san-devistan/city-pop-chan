export async function readJsonBody(request: Request) {
  const raw = await request.text()

  if (!raw.trim()) {
    return {}
  }

  const parsed: unknown = JSON.parse(raw)

  return isRecord(parsed) ? parsed : {}
}

export function okJson(value: unknown, init?: ResponseInit) {
  const headers = new Headers(init?.headers)

  headers.set("content-type", "application/json")

  return new Response(JSON.stringify(value), {
    ...init,
    headers,
  })
}

export function errorJson(message: string, status = 500) {
  return okJson({ error: message }, { status })
}

export function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Request failed."
}

export type ProgressStreamEvent =
  | {
      detail?: string
      id: string
      label?: string
      progress?: number
      status?: "active" | "complete" | "error" | "pending"
      type: "step"
    }
  | {
      message: string
      type: "log"
    }
  | {
      result: unknown
      type: "complete"
    }
  | {
      message: string
      stepId?: string
      type: "error"
    }

export function wantsProgressStream(request: Request) {
  return request.headers
    .get("accept")
    ?.split(",")
    .some((value) => value.trim() === "application/x-ndjson")
}

export function progressStream(
  run: (send: (event: ProgressStreamEvent) => void) => Promise<void>
) {
  const encoder = new TextEncoder()
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let isClosed = false
      const send = (event: ProgressStreamEvent) => {
        if (isClosed) {
          return
        }

        controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`))
      }

      try {
        await run(send)
      } catch (error) {
        send({ message: errorMessage(error), type: "error" })
      } finally {
        isClosed = true
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: progressStreamHeaders(),
  })
}

export function progressStreamHeaders() {
  return {
    "cache-control": "no-cache",
    "content-type": "application/x-ndjson; charset=utf-8",
  }
}

export function stringField(body: Record<string, unknown>, key: string) {
  const value = body[key]

  if (typeof value === "string") {
    return value
  }

  if (Array.isArray(value)) {
    return value.filter((item) => typeof item === "string").join("\n")
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return String(value)
  }

  return ""
}

export function stringListField(body: Record<string, unknown>, key: string) {
  const value = body[key]

  if (Array.isArray(value)) {
    return value
      .filter((item): item is string => typeof item === "string")
      .map((item) => item.trim())
      .filter(Boolean)
  }

  if (typeof value === "string") {
    const trimmed = value.trim()

    return trimmed ? [trimmed] : []
  }

  return []
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}
