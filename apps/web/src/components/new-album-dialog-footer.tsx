import { Button, buttonVariants } from "@workspace/ui/components/button"
import { DialogClose, DialogFooter } from "@workspace/ui/components/dialog"
import { Spinner } from "@workspace/ui/components/spinner"
import { Download } from "lucide-react"
import { useMemo } from "react"

function NewAlbumDialogFooter({
  isBusy,
  isCreatingAlbum,
  loadedIdCount,
  onCreateAlbumClick,
}: {
  isBusy: boolean
  isCreatingAlbum: boolean
  loadedIdCount: number
  onCreateAlbumClick: () => void
}) {
  const closeButton = useMemo(
    () => (
      <button
        type="button"
        aria-label="Cancel"
        className={buttonVariants({ variant: "outline" })}
      />
    ),
    []
  )

  return (
    <DialogFooter>
      <DialogClose render={closeButton}>Cancel</DialogClose>
      <Button
        type="button"
        disabled={isBusy || loadedIdCount === 0}
        onClick={onCreateAlbumClick}
      >
        {isCreatingAlbum ? (
          <Spinner data-icon="inline-start" />
        ) : (
          <Download data-icon="inline-start" />
        )}
        Create album
      </Button>
    </DialogFooter>
  )
}

export { NewAlbumDialogFooter }
