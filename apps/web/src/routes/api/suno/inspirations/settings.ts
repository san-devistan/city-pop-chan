import {
  errorJson,
  errorMessage,
  okJson,
  readJsonBody,
  stringField,
} from "@/lib/http"
import {
  DEFAULT_INSPIRATION_DEFAULTS,
  normalizeInspirationDefaults,
} from "@/lib/inspiration-defaults"
import { createFileRoute } from "@tanstack/react-router"
import {
  readInspirationDefaults,
  writeInspirationDefaults,
} from "@workspace/workflow/inspirations"

export const Route = createFileRoute("/api/suno/inspirations/settings")({
  server: {
    handlers: {
      GET: async () =>
        okJson({
          defaults: normalizeInspirationDefaults({
            ...DEFAULT_INSPIRATION_DEFAULTS,
            ...(await readInspirationDefaults()),
          }),
        }),
      POST: async ({ request }) => {
        try {
          const body = await readJsonBody(request)
          const defaults = normalizeInspirationDefaults({
            coverLeftText: stringField(body, "coverLeftText"),
            coverPrompt: stringField(body, "coverPrompt"),
            coverRightText: stringField(body, "coverRightText"),
            coverTopText: stringField(body, "coverTopText"),
            videoDescription: stringField(body, "videoDescription"),
            videoImageText: stringField(body, "videoImageText"),
            videoTitle: stringField(body, "videoTitle"),
          })

          return okJson({
            defaults: normalizeInspirationDefaults(
              await writeInspirationDefaults(defaults)
            ),
          })
        } catch (error) {
          return errorJson(errorMessage(error), 500)
        }
      },
    },
  },
})
