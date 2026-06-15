import { getAlbumGenerationJob } from "@/lib/generation-jobs"
import { okJson } from "@/lib/http"
import { createFileRoute } from "@tanstack/react-router"

export const Route = createFileRoute("/api/suno/albums/$folder/generation")({
  server: {
    handlers: {
      GET: ({ params }) => {
        return okJson({
          job: getAlbumGenerationJob(params.folder),
        })
      },
    },
  },
})
