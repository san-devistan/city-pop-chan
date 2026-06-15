import { errorJson, errorMessage } from "@/lib/http"
import { createFileRoute } from "@tanstack/react-router"
import { readInspirationMediaFile } from "@workspace/workflow/inspirations"

export const Route = createFileRoute("/api/suno/inspirations/assets/$id/$file")(
  {
    server: {
      handlers: {
        GET: async ({ params }) => {
          try {
            const media = await readInspirationMediaFile(params.id, params.file)
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
  }
)
