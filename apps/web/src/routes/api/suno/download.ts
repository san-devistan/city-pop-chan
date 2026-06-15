import {
  errorJson,
  errorMessage,
  okJson,
  readJsonBody,
  stringField,
} from "@/lib/http"
import { createFileRoute } from "@tanstack/react-router"
import {
  downloadSunoBatch,
  extractSunoClipIds,
} from "@workspace/workflow/suno-download"

export const Route = createFileRoute("/api/suno/download")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const body = await readJsonBody(request)
          const input = stringField(body, "ids") || stringField(body, "text")
          const ids = extractSunoClipIds(input)

          if (ids.length === 0) {
            return errorJson("No Suno clip IDs found.", 400)
          }

          const result = await downloadSunoBatch(input, {
            expectedCount: ids.length,
          })

          return okJson({
            folder: result.folder,
            ids,
            logs: result.logs,
          })
        } catch (error) {
          return errorJson(errorMessage(error), 500)
        }
      },
    },
  },
})
