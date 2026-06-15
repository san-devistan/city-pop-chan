import { generationJobStream, startGenerationJob } from "@/lib/generation-jobs"
import {
  errorJson,
  errorMessage,
  okJson,
  readJsonBody,
  stringField,
  stringListField,
  wantsProgressStream,
} from "@/lib/http"
import { createFileRoute } from "@tanstack/react-router"
import { readAlbum } from "@workspace/workflow/albums"
import { generateAlbumCover } from "@workspace/workflow/gemini-cover"

export const Route = createFileRoute("/api/suno/albums/$folder/cover")({
  server: {
    handlers: {
      POST: async ({ params, request }) => {
        try {
          const body = await readJsonBody(request)
          const input = coverGenerationInput(body)

          if (wantsProgressStream(request)) {
            startGenerationJob({
              folder: params.folder,
              kind: "cover",
              run: async (send) => {
                const cover = await generateAlbumCover(
                  params.folder,
                  input.prompt,
                  {
                    coverLeftText: input.coverLeftText,
                    coverPrompt: input.coverPrompt,
                    coverRightText: input.coverRightText,
                    coverTopText: input.coverTopText,
                    inspirationIds: input.inspirationIds,
                    onProgress: (event) => {
                      send({ ...event, type: "step" })
                    },
                    videoImageText: input.videoImageText,
                  }
                )

                send({
                  detail: "Refreshing album data.",
                  id: "album",
                  status: "active",
                  type: "step",
                })

                const album = await readAlbum(params.folder)

                send({
                  detail: "Album cover is ready.",
                  id: "album",
                  status: "complete",
                  type: "step",
                })
                send({ result: { album, cover }, type: "complete" })
              },
            })

            return generationJobStream(params.folder, "cover")
          }

          const cover = await generateAlbumCover(params.folder, input.prompt, {
            coverLeftText: input.coverLeftText,
            coverPrompt: input.coverPrompt,
            coverRightText: input.coverRightText,
            coverTopText: input.coverTopText,
            inspirationIds: input.inspirationIds,
            videoImageText: input.videoImageText,
          })

          return okJson({
            album: await readAlbum(params.folder),
            cover,
          })
        } catch (error) {
          return errorJson(errorMessage(error), 500)
        }
      },
    },
  },
})

function coverGenerationInput(body: Record<string, unknown>) {
  const coverLeftText = Object.hasOwn(body, "coverLeftText")
    ? stringField(body, "coverLeftText")
    : undefined
  const coverPrompt = Object.hasOwn(body, "coverPrompt")
    ? stringField(body, "coverPrompt")
    : undefined
  const coverRightText = Object.hasOwn(body, "coverRightText")
    ? stringField(body, "coverRightText")
    : undefined
  const coverTopText = Object.hasOwn(body, "coverTopText")
    ? stringField(body, "coverTopText")
    : undefined
  const videoImageText = Object.hasOwn(body, "videoImageText")
    ? stringField(body, "videoImageText")
    : undefined
  const inspirationIds = stringListField(body, "inspirationIds")
  const legacyInspirationId = stringField(body, "inspirationId").trim()

  return {
    coverLeftText,
    coverPrompt,
    coverRightText,
    coverTopText,
    inspirationIds:
      inspirationIds.length > 0
        ? inspirationIds
        : legacyInspirationId
          ? [legacyInspirationId]
          : [],
    prompt: stringField(body, "prompt"),
    videoImageText,
  }
}
