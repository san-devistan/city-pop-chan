import { okJson, readJsonBody, stringField } from "@/lib/http"
import { createFileRoute } from "@tanstack/react-router"
import {
  getImportedSunoIds,
  setImportedSunoIds,
} from "@workspace/workflow/import-store"

export const Route = createFileRoute("/api/suno/import")({
  server: {
    handlers: {
      GET: async () => okJson({ ids: getImportedSunoIds() }),
      POST: async ({ request }) => {
        const body = await readJsonBody(request)
        const ids = setImportedSunoIds(
          stringField(body, "ids") || stringField(body, "text")
        )

        return okJson({ ids })
      },
    },
  },
})
