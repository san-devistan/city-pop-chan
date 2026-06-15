import { errorJson, errorMessage, okJson } from "@/lib/http"
import { createFileRoute } from "@tanstack/react-router"
import { deleteGeneratedAlbum } from "@workspace/workflow/albums"

export const Route = createFileRoute("/api/suno/albums/$folder/delete")({
  server: {
    handlers: {
      POST: async ({ params }) => {
        try {
          return okJson(await deleteGeneratedAlbum(params.folder))
        } catch (error) {
          return errorJson(errorMessage(error), 500)
        }
      },
    },
  },
})
