import { okJson } from "@/lib/http"
import { createFileRoute } from "@tanstack/react-router"
import { listAlbums } from "@workspace/workflow/albums"

export const Route = createFileRoute("/api/suno/albums")({
  server: {
    handlers: {
      GET: async () => okJson({ albums: await listAlbums() }),
    },
  },
})
