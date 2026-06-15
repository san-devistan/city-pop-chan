import { ExtensionSongCount } from "@/components/extension-song-count"
import { NewAlbumDialogFooter } from "@/components/new-album-dialog-footer"
import { useNewAlbumDialog } from "@/components/use-new-album-dialog"
import { buttonVariants } from "@workspace/ui/components/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@workspace/ui/components/dialog"
import { Plus } from "lucide-react"
import { useMemo } from "react"

function NewAlbumDialog({
  onAlbumCreated,
}: {
  onAlbumCreated: () => Promise<void>
}) {
  const {
    handleCreateAlbumClick,
    handleOpenChange,
    isBusy,
    isCreatingAlbum,
    isLoadingImport,
    isOpen,
    loadedIdCount,
    errorMessage,
  } = useNewAlbumDialog({ onAlbumCreated })
  const triggerButton = useMemo(
    () => (
      <button
        type="button"
        aria-label="New album"
        className={buttonVariants()}
      />
    ),
    []
  )

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger nativeButton render={triggerButton}>
        <Plus data-icon="inline-start" />
        New
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New album</DialogTitle>
        </DialogHeader>

        <ExtensionSongCount
          isLoading={isLoadingImport}
          loadedIdCount={loadedIdCount}
        />

        {errorMessage ? (
          <output
            aria-live="assertive"
            className="block rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive"
          >
            {errorMessage}
          </output>
        ) : null}

        <NewAlbumDialogFooter
          isBusy={isBusy}
          isCreatingAlbum={isCreatingAlbum}
          loadedIdCount={loadedIdCount}
          onCreateAlbumClick={handleCreateAlbumClick}
        />
      </DialogContent>
    </Dialog>
  )
}

export { NewAlbumDialog }
