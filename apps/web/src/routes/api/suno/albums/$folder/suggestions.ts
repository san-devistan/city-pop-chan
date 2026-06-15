import {
  errorJson,
  errorMessage,
  okJson,
  readJsonBody,
  stringField,
} from "@/lib/http"
import { createFileRoute } from "@tanstack/react-router"
import { readAlbum } from "@workspace/workflow/albums"
import {
  generateAlbumCreativeSuggestion,
  type AlbumCreativeSuggestionKind,
} from "@workspace/workflow/codex-suggestions"

export const Route = createFileRoute("/api/suno/albums/$folder/suggestions")({
  server: {
    handlers: {
      POST: async ({ params, request }) => {
        try {
          const body = await readJsonBody(request)
          const kind = suggestionKind(stringField(body, "kind"))

          if (!kind) {
            return errorJson("Unknown suggestion kind.", 400)
          }

          const album = await readAlbum(params.folder)
          const suggestion = await generateAlbumCreativeSuggestion({
            albumTitle: album.title,
            currentValue: stringField(body, "currentValue"),
            kind,
            tracks: album.tracks.map((track) => ({ title: track.title })),
          })

          return okJson({ suggestion })
        } catch (error) {
          return errorJson(errorMessage(error), 500)
        }
      },
    },
  },
})

function suggestionKind(value: string): AlbumCreativeSuggestionKind | null {
  if (
    value === "coverPrompt" ||
    value === "videoTitleName" ||
    value === "youtubeTitle"
  ) {
    return value
  }

  return null
}
