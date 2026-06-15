import { errorJson, errorMessage, okJson } from "@/lib/http"
import { createFileRoute } from "@tanstack/react-router"
import { readAlbum } from "@workspace/workflow/albums"
import { prepareDistroKidRelease } from "@workspace/workflow/distrokid-publish"

export const Route = createFileRoute("/api/suno/albums/$folder/publish")({
  server: {
    handlers: {
      POST: async ({ params }) => {
        try {
          const distrokid = await prepareDistroKidRelease(params.folder)

          return okJson({
            album: await readAlbum(params.folder),
            distrokid,
          })
        } catch (error) {
          return errorJson(errorMessage(error), 500)
        }
      },
    },
  },
})
