import {
  errorJson,
  errorMessage,
  okJson,
  readJsonBody,
  stringField,
} from "@/lib/http"
import { createFileRoute } from "@tanstack/react-router"
import { readAlbum } from "@workspace/workflow/albums"
import { buildYoutubeVideo } from "@workspace/workflow/youtube-video"

export const Route = createFileRoute("/api/suno/albums/$folder/upload")({
  server: {
    handlers: {
      POST: async ({ params, request }) => {
        try {
          const body = await readJsonBody(request)
          const currentAlbum = await readAlbum(params.folder)

          if (!currentAlbum.video) {
            return errorJson(
              "Generate the video before uploading to YouTube.",
              400
            )
          }

          const videoTitle =
            stringField(body, "videoTitle").trim() ||
            currentAlbum.videoTitle ||
            currentAlbum.title
          const videoImageText =
            stringField(body, "videoImageText").trim() ||
            currentAlbum.videoImageText
          const result = await buildYoutubeVideo(params.folder, {
            description: currentAlbum.videoDescription || undefined,
            title: videoTitle,
            videoImageText,
          })

          return okJson({
            album: await readAlbum(params.folder),
            logs: result.logs,
          })
        } catch (error) {
          return errorJson(errorMessage(error), 500)
        }
      },
    },
  },
})
