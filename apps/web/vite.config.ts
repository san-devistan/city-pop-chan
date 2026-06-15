import tailwindcss from "@tailwindcss/vite"
import { tanstackStart } from "@tanstack/react-start/plugin/vite"
import viteReact from "@vitejs/plugin-react"
import {
  readGeneratedMediaFile,
  readInspirationMediaFile,
} from "@workspace/workflow"
import { nitro } from "nitro/vite"
import { defineConfig, type Plugin, type Rollup } from "vite"
import viteTsConfigPaths from "vite-tsconfig-paths"

const ignoredRollupWarningCodes = new Set([
  "EMPTY_BUNDLE",
  "MODULE_LEVEL_DIRECTIVE",
])

const handleRollupWarning: Rollup.WarningHandlerWithDefault = (
  warning,
  warn
) => {
  if (ignoredRollupWarningCodes.has(warning.code ?? "")) {
    return
  }

  warn(warning)
}

const localMediaPlugin = (): Plugin => ({
  name: "local-suno-media",
  configureServer(server) {
    server.middlewares.use((request, response, next) => {
      void (async () => {
        const url = new URL(request.url || "/", "http://127.0.0.1")

        if (
          url.pathname !== "/api/suno/media" &&
          url.pathname !== "/inspiration-assets/asset"
        ) {
          next()
          return
        }

        if (request.method === "OPTIONS") {
          response.writeHead(204, mediaCorsHeaders())
          response.end()
          return
        }

        try {
          const media =
            url.pathname === "/api/suno/media"
              ? await readGeneratedMediaFile(
                  url.searchParams.get("folder") || "",
                  url.searchParams.get("file") || ""
                )
              : await readInspirationMediaFile(
                  url.searchParams.get("id") || "",
                  url.searchParams.get("file") || ""
                )
          const range = request.headers.range
          const includeBody = request.method !== "HEAD"
          const headers = baseMediaHeaders(media)

          if (!range) {
            headers["content-length"] = String(media.bytes.length)
            response.writeHead(200, headers)
            response.end(includeBody ? media.bytes : undefined)
            return
          }

          const parsed = parseRange(range, media.bytes.length)

          if (!parsed) {
            response.writeHead(416, {
              ...headers,
              "content-range": `bytes */${media.bytes.length}`,
            })
            response.end()
            return
          }

          const body = media.bytes.subarray(parsed.start, parsed.end + 1)

          response.writeHead(206, {
            ...headers,
            "content-length": String(body.length),
            "content-range": `bytes ${parsed.start}-${parsed.end}/${media.bytes.length}`,
          })
          response.end(includeBody ? body : undefined)
        } catch (error) {
          response.writeHead(404, {
            ...mediaCorsHeaders(),
            "content-type": "application/json",
          })
          response.end(
            JSON.stringify({
              error: error instanceof Error ? error.message : "Media not found",
            })
          )
        }
      })()
    })
  },
})

function baseMediaHeaders(
  media: Awaited<ReturnType<typeof readGeneratedMediaFile>>
): Record<string, string> {
  return {
    ...mediaCorsHeaders(),
    "accept-ranges": "bytes",
    "cache-control": "no-store",
    "content-type": media.contentType,
  }
}

function mediaCorsHeaders(): Record<string, string> {
  return {
    "access-control-allow-headers": "content-type, range",
    "access-control-allow-methods": "GET, HEAD, OPTIONS",
    "access-control-allow-origin": "*",
    "access-control-expose-headers":
      "accept-ranges, content-length, content-range, content-type",
  }
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
    return parseSuffixRange(endValue, size)
  }

  return parseStartRange(startValue, endValue, size)
}

function parseSuffixRange(endValue: string | undefined, size: number) {
  const suffixLength = Number(endValue)

  if (!Number.isInteger(suffixLength) || suffixLength <= 0) {
    return null
  }

  return {
    end: size - 1,
    start: Math.max(0, size - suffixLength),
  }
}

function parseStartRange(
  startValue: string,
  endValue: string | undefined,
  size: number
) {
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

const config = defineConfig({
  resolve: {
    extensions: [".tsx", ".ts", ".jsx", ".js", ".mjs", ".json"],
  },
  build: {
    rollupOptions: {
      onwarn: handleRollupWarning,
    },
  },
  plugins: [
    localMediaPlugin(),
    nitro({
      rollupConfig: {
        onwarn: handleRollupWarning,
      },
    }),
    viteTsConfigPaths({
      projects: ["./tsconfig.json"],
    }),
    tailwindcss(),
    tanstackStart({
      router: {
        routeFileIgnorePattern: "\\.js$",
      },
    }),
    viteReact(),
  ],
})

export default config
