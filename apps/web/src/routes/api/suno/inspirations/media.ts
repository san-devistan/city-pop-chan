import { errorJson, errorMessage } from "@/lib/http"
import { createFileRoute } from "@tanstack/react-router"
import { readInspirationMediaFile } from "@workspace/workflow/inspirations"

export const Route = createFileRoute("/api/suno/inspirations/media")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          const url = new URL(request.url)
          const id = url.searchParams.get("id") || ""
          const file = url.searchParams.get("file") || ""
          const media = await readInspirationMediaFile(id, file)
          const headers = new Headers({
            "cache-control": "no-store",
            "content-length": String(media.bytes.length),
            "content-type": media.contentType,
          })

          return new Response(media.bytes, {
            headers,
          })
        } catch (error) {
          return errorJson(errorMessage(error), 404)
        }
      },
    },
  },
})
