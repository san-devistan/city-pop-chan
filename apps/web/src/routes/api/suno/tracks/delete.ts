import {
  errorJson,
  errorMessage,
  okJson,
  readJsonBody,
  stringField,
} from "@/lib/http"
import { createFileRoute } from "@tanstack/react-router"
import { deleteGeneratedTrack } from "@workspace/workflow/albums"

export const Route = createFileRoute("/api/suno/tracks/delete")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const body = await readJsonBody(request)
          const folder = stringField(body, "folder")
          const file = stringField(body, "file")

          if (!folder || !file) {
            return errorJson("Missing folder or file.", 400)
          }

          return okJson(await deleteGeneratedTrack(folder, file))
        } catch (error) {
          const message = errorMessage(error)
          const status = message.includes("can be deleted") ? 400 : 500

          return errorJson(message, status)
        }
      },
    },
  },
})
