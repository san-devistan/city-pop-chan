import {
  errorJson,
  errorMessage,
  okJson,
  readJsonBody,
  stringField,
} from "@/lib/http"
import { createFileRoute } from "@tanstack/react-router"
import { deleteInspiration } from "@workspace/workflow/inspirations"

export const Route = createFileRoute("/api/suno/inspirations/delete")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const body = await readJsonBody(request)
          const id = stringField(body, "id")

          if (!id) {
            return errorJson("Missing inspiration id.", 400)
          }

          return okJson(await deleteInspiration(id))
        } catch (error) {
          return errorJson(errorMessage(error), 500)
        }
      },
    },
  },
})
