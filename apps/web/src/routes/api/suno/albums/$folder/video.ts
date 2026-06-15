import { generationJobStream, startGenerationJob } from "@/lib/generation-jobs"
import {
  errorJson,
  errorMessage,
  okJson,
  type ProgressStreamEvent,
  readJsonBody,
  stringField,
  wantsProgressStream,
} from "@/lib/http"
import { createFileRoute } from "@tanstack/react-router"
import { readAlbum } from "@workspace/workflow/albums"
import { buildYoutubeVideo } from "@workspace/workflow/youtube-video"

export const Route = createFileRoute("/api/suno/albums/$folder/video")({
  server: {
    handlers: {
      POST: async ({ params, request }) => {
        try {
          const body = await readJsonBody(request)
          const currentAlbum = await readAlbum(params.folder)
          const videoTitle =
            stringField(body, "videoTitle").trim() ||
            currentAlbum.videoTitle ||
            currentAlbum.title
          const videoDescription = stringField(body, "videoDescription").trim()
          const videoImageText = stringField(body, "videoImageText").trim()

          if (wantsProgressStream(request)) {
            startGenerationJob({
              folder: params.folder,
              kind: "video",
              run: async (send) => {
                send({
                  detail: "Preparing title, description, and output files.",
                  id: "metadata",
                  status: "active",
                  type: "step",
                })

                const result = await buildYoutubeVideo(params.folder, {
                  descriptionTemplate: videoDescription,
                  force: true,
                  onLog: (line: string) => {
                    for (const event of videoProgressEventsFromLog(line)) {
                      send(event)
                    }
                  },
                  title: videoTitle,
                  upload: false,
                  videoImageText,
                })

                send({
                  detail: "Refreshing album data.",
                  id: "album",
                  status: "active",
                  type: "step",
                })

                const album = await readAlbum(params.folder)

                send({
                  detail: "Animated video is ready.",
                  id: "album",
                  status: "complete",
                  type: "step",
                })
                send({
                  result: {
                    album,
                    logs: result.logs,
                  },
                  type: "complete",
                })
              },
            })

            return generationJobStream(params.folder, "video")
          }

          const result = await buildYoutubeVideo(params.folder, {
            descriptionTemplate: videoDescription,
            force: true,
            title: videoTitle,
            upload: false,
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

function videoProgressEventsFromLog(line: string): Array<ProgressStreamEvent> {
  const trimmed = line.trim()

  if (!trimmed || trimmed.startsWith("$ ")) {
    return []
  }

  if (trimmed === "Preparing album audio for video...") {
    return [
      {
        detail: "Video files are prepared.",
        id: "metadata",
        status: "complete",
        type: "step",
      },
      {
        detail: "Concatenating album tracks into one audio file.",
        id: "audio",
        status: "active",
        type: "step",
      },
    ]
  }

  if (trimmed.includes("Remotion title overlays")) {
    return [
      {
        detail: "Album audio is ready.",
        id: "audio",
        status: "complete",
        type: "step",
      },
      {
        detail: trimmed,
        id: "render",
        progress: 0,
        status: "active",
        type: "step",
      },
    ]
  }

  if (
    trimmed === "No track title overlays needed." ||
    (trimmed.startsWith("Prepared ") && trimmed.includes("track title overlay"))
  ) {
    return [
      {
        detail: "Track title overlays are ready.",
        id: "render",
        progress: 100,
        status: "complete",
        type: "step",
      },
      {
        detail: "Compositing waveform, titles, and audio.",
        id: "finalize",
        status: "active",
        type: "step",
      },
    ]
  }

  if (trimmed.startsWith("Rendered animated video")) {
    return [
      {
        detail: "Animated video is rendered.",
        id: "render",
        progress: 100,
        status: "complete",
        type: "step",
      },
      {
        detail: "Saving video output.",
        id: "finalize",
        status: "active",
        type: "step",
      },
    ]
  }

  if (trimmed.startsWith("Assembling full-length video")) {
    return [
      {
        detail: trimmed,
        id: "finalize",
        status: "active",
        type: "step",
      },
    ]
  }

  if (trimmed.startsWith("Built video:")) {
    return [
      {
        detail: "Video file is saved.",
        id: "finalize",
        status: "complete",
        type: "step",
      },
    ]
  }

  return [{ message: trimmed, type: "log" }]
}
