import {
  errorJson,
  errorMessage,
  okJson,
  readJsonBody,
  stringField,
  stringListField,
} from "@/lib/http"
import { createFileRoute } from "@tanstack/react-router"
import {
  listInspirations,
  saveRemotePhotoInspiration,
  saveYoutubeInspirations,
  type WorkflowInspirationKind,
} from "@workspace/workflow/inspirations"

export const Route = createFileRoute("/api/suno/inspirations")({
  server: {
    handlers: {
      GET: async () => okJson({ inspirations: await listInspirations() }),
      POST: async ({ request }) => {
        try {
          const body = await readJsonBody(request)
          const imageUrl = stringField(body, "imageUrl").trim()

          if (imageUrl) {
            const inspiration = await saveRemotePhotoInspiration({
              imageUrl,
              title: stringField(body, "title"),
              url: stringField(body, "url"),
            })

            return okJson({ inspiration, inspirations: [inspiration] })
          }

          const inspirations = await saveYoutubeInspirations({
            kinds: youtubeInspirationKinds(body),
            thumbnailUrl: stringField(body, "thumbnailUrl"),
            title: stringField(body, "title"),
            url: stringField(body, "url"),
            videoId: stringField(body, "videoId"),
          })

          return okJson({ inspiration: inspirations[0] || null, inspirations })
        } catch (error) {
          return errorJson(errorMessage(error), 500)
        }
      },
    },
  },
})

function youtubeInspirationKinds(
  body: Record<string, unknown>
): Array<WorkflowInspirationKind> {
  const kinds = [
    ...stringListField(body, "kinds"),
    ...stringListField(body, "kind"),
  ].filter(isWorkflowInspirationKind)

  if (kinds.length > 0) {
    return [...new Set(kinds)]
  }

  if (
    Object.hasOwn(body, "importThumbnail") ||
    Object.hasOwn(body, "importTitle")
  ) {
    return [
      booleanField(body, "importThumbnail") ? "cover" : "",
      booleanField(body, "importTitle") ? "videoTitle" : "",
    ].filter(isWorkflowInspirationKind)
  }

  return ["cover"]
}

function booleanField(body: Record<string, unknown>, key: string) {
  const value = body[key]

  return value === true || value === "true"
}

function isWorkflowInspirationKind(
  value: string
): value is WorkflowInspirationKind {
  return value === "cover" || value === "videoTitle"
}
