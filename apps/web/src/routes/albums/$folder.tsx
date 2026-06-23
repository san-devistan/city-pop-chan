/* eslint-disable max-lines-per-function -- The album route owns polling, actions, and rendering for one local Studio workflow. */

import { GenerationProgressPanel } from "@/lib/generation-progress"
import {
  applyGenerationEvent,
  createGenerationProgress,
  fetchGenerationJob,
  failGenerationProgress,
  generationProgressFromJob,
  streamGenerationAction,
  type GenerationKind,
  type GenerationProgress,
} from "@/lib/generation-progress-state"
import {
  type Album,
  type AlbumAction,
  type AlbumTrack,
  type ApiBody,
  AlbumDetailPanel,
  actionStatus,
  api,
  fetchAlbum,
} from "@/lib/suno-studio"
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router"
import { Button, buttonVariants } from "@workspace/ui/components/button"
import { ArrowLeft, RefreshCw, Trash2 } from "lucide-react"
import { useCallback, useEffect, useRef, useState } from "react"

export const Route = createFileRoute("/albums/$folder")({
  component: AlbumRoute,
})

function AlbumRoute() {
  const { folder } = Route.useParams()
  const navigate = useNavigate()
  const [album, setAlbum] = useState<Album | null>(null)
  const [busyAlbumAction, setBusyAlbumAction] = useState<AlbumAction | null>(
    null
  )
  const [reattachedGenerationKind, setReattachedGenerationKind] =
    useState<GenerationKind | null>(null)
  const [isBusy, setIsBusy] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [generation, setGeneration] = useState<GenerationProgress | null>(null)
  const [status, setStatus] = useState("")
  const busyAlbumActionRef = useRef<AlbumAction | null>(null)

  const loadAlbum = useCallback(async () => {
    setIsLoading(true)

    try {
      const nextAlbum = await fetchAlbum(folder)

      setAlbum(nextAlbum)
      setStatus(nextAlbum ? "" : "Album not found.")
    } catch (error) {
      setStatus(
        error instanceof Error ? error.message : "Could not load album."
      )
    } finally {
      setIsLoading(false)
    }
  }, [folder])

  useEffect(() => {
    void loadAlbum()
  }, [loadAlbum])

  useEffect(() => {
    busyAlbumActionRef.current = busyAlbumAction
  }, [busyAlbumAction])

  useEffect(() => {
    let isCurrent = true
    let timeout: ReturnType<typeof setTimeout> | null = null
    let refreshedJobKey = ""

    async function syncGenerationJob() {
      try {
        if (!isCurrent) {
          return
        }

        // react-doctor-disable-next-line react-doctor/async-defer-await -- The post-await guard prevents stale polling results from mutating state after cleanup.
        const job = await fetchGenerationJob(folder)

        if (!isCurrent) {
          return
        }

        if (!job) {
          setReattachedGenerationKind(null)
          return
        }

        const localAction = busyAlbumActionRef.current

        if (localAction !== job.kind) {
          setGeneration(generationProgressFromJob(job))
        }

        setReattachedGenerationKind(job.phase === "running" ? job.kind : null)

        if (job.phase === "complete") {
          const jobKey = `${job.kind}:${job.updatedAt}`

          if (refreshedJobKey !== jobKey) {
            refreshedJobKey = jobKey

            const nextAlbum = await fetchAlbum(folder)

            if (isCurrent) {
              setAlbum(nextAlbum)
            }
          }
        }
      } catch {
        // Generation status is best-effort; direct actions still report errors.
      } finally {
        if (isCurrent) {
          timeout = setTimeout(() => {
            void syncGenerationJob()
          }, 2000)
        }
      }
    }

    void syncGenerationJob()

    return () => {
      isCurrent = false

      if (timeout) {
        clearTimeout(timeout)
      }
    }
  }, [folder])

  const runAction = useCallback(
    async (statusMessage: string, action: () => Promise<void>) => {
      setIsBusy(true)
      setStatus(statusMessage)

      try {
        await action()
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Action failed."

        setStatus(errorMessage)
        setGeneration((current) =>
          current ? failGenerationProgress(current, errorMessage) : current
        )
      } finally {
        setIsBusy(false)
      }
    },
    []
  )

  const runGenerationAction = useCallback(
    async (
      targetFolder: string,
      action: GenerationKind,
      message: string,
      body?: ApiBody
    ) => {
      const initialProgress = createGenerationProgress(action)

      setGeneration(initialProgress)
      await runAction(message, async () => {
        setStatus("")

        const data = await streamGenerationAction<{
          album: Album
          logs?: string
        }>(
          `/api/suno/albums/${encodeURIComponent(targetFolder)}/${action}`,
          body ?? {},
          (event) => {
            setGeneration((current) =>
              applyGenerationEvent(current || initialProgress, event)
            )
          }
        )

        setAlbum(data.album)
      })
    },
    [runAction]
  )

  const runAlbumAction = useCallback(
    async (
      targetFolder: string,
      action: AlbumAction,
      message: string,
      body?: ApiBody
    ) => {
      setBusyAlbumAction(action)

      try {
        if (isGenerationAction(action)) {
          await runGenerationAction(targetFolder, action, message, body)
          return
        }

        await runAction(message, async () => {
          const data = await api<{ album: Album; logs?: string }>(
            `/api/suno/albums/${encodeURIComponent(targetFolder)}/${action}`,
            body ?? {}
          )

          setAlbum(data.album)
          setStatus(actionStatus(action, data.album))
        })
      } finally {
        setBusyAlbumAction(null)
      }
    },
    [runAction, runGenerationAction]
  )

  const deleteTrack = useCallback(
    async (targetFolder: string, track: AlbumTrack) => {
      await runAction(`Deleting ${track.title}...`, async () => {
        await api("/api/suno/tracks/delete", {
          file: track.name,
          folder: targetFolder,
        })

        const nextAlbum = await fetchAlbum(targetFolder)

        if (!nextAlbum) {
          // react-doctor-disable-next-line react-doctor/tanstack-start-no-navigate-in-render -- This navigation runs from an async user action, not render.
          await navigate({ to: "/" })
          return
        }

        setAlbum(nextAlbum)
        setStatus(`Deleted ${track.title}.`)
      })
    },
    [navigate, runAction]
  )

  const deleteAlbum = useCallback(async () => {
    const albumTitle = album?.title || folder.replaceAll("-", " ")

    if (!window.confirm(`Delete "${albumTitle}" from local files?`)) {
      return
    }

    await runAction(`Deleting ${albumTitle}...`, async () => {
      await api(`/api/suno/albums/${encodeURIComponent(folder)}/delete`, {})
      // react-doctor-disable-next-line react-doctor/tanstack-start-no-navigate-in-render -- This navigation runs from an async user action, not render.
      await navigate({ to: "/" })
    })
  }, [album?.title, folder, navigate, runAction])

  const handleRefreshAlbum = useCallback(() => {
    void loadAlbum()
  }, [loadAlbum])
  const handleDeleteAlbum = useCallback(() => {
    void deleteAlbum()
  }, [deleteAlbum])

  const activeBusyAction = busyAlbumAction ?? reattachedGenerationKind
  const isAlbumBusy = isBusy || activeBusyAction !== null

  return (
    <main className="min-h-svh bg-background text-foreground">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6 md:px-6">
        <header className="flex flex-col gap-4 border-b pb-5 md:flex-row md:items-end md:justify-between">
          <div className="min-w-0">
            <Link to="/" className={buttonVariants({ variant: "ghost" })}>
              <ArrowLeft data-icon="inline-start" />
              Albums
            </Link>
            <h1 className="mt-3 truncate text-4xl font-semibold tracking-normal">
              {album?.title || folder.replaceAll("-", " ")}
            </h1>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={isAlbumBusy}
              onClick={handleRefreshAlbum}
            >
              <RefreshCw data-icon="inline-start" />
              Refresh
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={isAlbumBusy || !album}
              onClick={handleDeleteAlbum}
            >
              <Trash2 data-icon="inline-start" />
              Delete
            </Button>
          </div>
        </header>

        {generation ? (
          <GenerationProgressPanel progress={generation} />
        ) : status ? (
          <output className="block rounded-md border bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
            {status}
          </output>
        ) : null}

        {album ? (
          <AlbumDetailPanel
            album={album}
            busyAction={activeBusyAction}
            isBusy={isAlbumBusy}
            onAction={runAlbumAction}
            onDeleteTrack={deleteTrack}
          />
        ) : (
          <div className="grid min-h-56 place-items-center rounded-lg border bg-card text-center shadow-sm">
            <p className="font-medium">
              {isLoading ? "Loading album..." : "Album not found"}
            </p>
          </div>
        )}
      </div>
    </main>
  )
}

function isGenerationAction(action: AlbumAction): action is GenerationKind {
  return action === "cover" || action === "video"
}
