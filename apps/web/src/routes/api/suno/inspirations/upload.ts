import { errorJson, errorMessage, okJson } from "@/lib/http"
import { createFileRoute } from "@tanstack/react-router"
import { savePhotoInspirations } from "@workspace/workflow/inspirations"
import { Buffer } from "node:buffer"

export const Route = createFileRoute("/api/suno/inspirations/upload")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const formData = await request.formData()
          const files = formData.getAll("files").filter(isUploadFile)

          if (files.length === 0) {
            return errorJson("Drop at least one image file.", 400)
          }

          const uploads = await Promise.all(
            files.map(async (file) => ({
              bytes: Buffer.from(await file.arrayBuffer()),
              contentType: file.type,
              fileName: file.name,
            }))
          )
          const inspirations = await savePhotoInspirations(uploads)

          return okJson({ inspirations })
        } catch (error) {
          return errorJson(errorMessage(error), 500)
        }
      },
    },
  },
})

function isUploadFile(value: FormDataEntryValue): value is File {
  return (
    typeof value === "object" &&
    value !== null &&
    "arrayBuffer" in value &&
    "name" in value &&
    "type" in value
  )
}
