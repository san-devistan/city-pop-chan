import { Spinner } from "@workspace/ui/components/spinner"

function ExtensionSongCount({
  isLoading,
  loadedIdCount,
}: {
  isLoading: boolean
  loadedIdCount: number
}) {
  const helperText = isLoading
    ? "Loading saved IDs..."
    : loadedIdCount > 0
      ? "Ready to create an album."
      : "Open the extension on Suno to collect songs."

  return (
    <div className="rounded-lg border bg-muted/30 p-4">
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm font-medium">Extension songs</p>
          <p className="text-sm text-muted-foreground">{helperText}</p>
        </div>
        <div className="grid min-w-20 justify-items-end">
          {isLoading ? (
            <Spinner />
          ) : (
            <span className="text-3xl font-semibold tabular-nums">
              {loadedIdCount}
            </span>
          )}
          <span className="text-xs text-muted-foreground">
            {loadedIdCount === 1 ? "song" : "songs"} loaded
          </span>
        </div>
      </div>
    </div>
  )
}

export { ExtensionSongCount }
