import {
  errorJson,
  errorMessage,
  okJson,
  readJsonBody,
  stringField,
} from "@/lib/http"
import { createFileRoute } from "@tanstack/react-router"
import { readStudioSettings, writeStudioSettings } from "@workspace/workflow"

export const Route = createFileRoute("/api/suno/settings")({
  server: {
    handlers: {
      GET: async () => okJson({ settings: await readStudioSettings() }),
      POST: async ({ request }) => {
        try {
          const body = await readJsonBody(request)
          const settings = await writeStudioSettings({
            appleMusicUrl: stringField(body, "appleMusicUrl"),
            artistName: stringField(body, "artistName"),
            deezerUrl: stringField(body, "deezerUrl"),
            spotifyUrl: stringField(body, "spotifyUrl"),
            youtubeChannelUrl: stringField(body, "youtubeChannelUrl"),
            youtubeMusicUrl: stringField(body, "youtubeMusicUrl"),
            youtubeStudioUrl: stringField(body, "youtubeStudioUrl"),
          })

          return okJson({ settings })
        } catch (error) {
          return errorJson(errorMessage(error), 500)
        }
      },
    },
  },
})
