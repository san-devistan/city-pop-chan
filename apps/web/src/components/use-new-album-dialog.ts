import { api } from "@/lib/suno-studio"
import { useNavigate } from "@tanstack/react-router"
import { useCallback, useState } from "react"

type AlbumDialogBusyAction = "create" | "load"

function useNewAlbumDialog({
  onAlbumCreated,
}: {
  onAlbumCreated: () => Promise<void>
}) {
  const navigate = useNavigate()
  const [ids, setIds] = useState("")
  const [busyAction, setBusyAction] = useState<AlbumDialogBusyAction | null>(
    null
  )
  const [isOpen, setIsOpen] = useState(false)
  const [errorMessage, setErrorMessage] = useState("")
  const loadedIdCount = ids.split(/\s+/).filter(Boolean).length
  const isLoadingImport = busyAction === "load"
  const isCreatingAlbum = busyAction === "create"
  const isBusy = busyAction !== null

  const runAction = useCallback(
    async (busy: AlbumDialogBusyAction, action: () => Promise<void>) => {
      setBusyAction(busy)
      setErrorMessage("")

      try {
        await action()
      } catch (error) {
        setErrorMessage(
          error instanceof Error ? error.message : "Action failed."
        )
      } finally {
        setBusyAction(null)
      }
    },
    []
  )

  const loadImport = useCallback(async () => {
    setIds("")

    await runAction("load", async () => {
      const data = await api<{ ids: Array<string> }>("/api/suno/import")

      setIds(data.ids.join("\n"))
    })
  }, [runAction])

  const downloadSongs = useCallback(async () => {
    await runAction("create", async () => {
      const data = await api<{ folder: string; logs: string }>(
        "/api/suno/download",
        { ids }
      )

      await onAlbumCreated()
      setIsOpen(false)
      await navigate({
        to: "/albums/$folder",
        params: { folder: data.folder },
      })
    })
  }, [ids, navigate, onAlbumCreated, runAction])

  const handleOpenChange = useCallback(
    (open: boolean) => {
      setIsOpen(open)

      if (open) {
        void loadImport()
      }
    },
    [loadImport]
  )
  const handleCreateAlbumClick = useCallback(() => {
    void downloadSongs()
  }, [downloadSongs])

  return {
    handleCreateAlbumClick,
    handleOpenChange,
    isBusy,
    isCreatingAlbum,
    isLoadingImport,
    isOpen,
    loadedIdCount,
    errorMessage,
  }
}

export { useNewAlbumDialog }
