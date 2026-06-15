import { AlbumCard } from "@/components/album-card"
import { NewAlbumDialog } from "@/components/new-album-dialog"
import { SettingsDialog } from "@/components/settings-dialog"
import { type Album, fetchAlbums } from "@/lib/suno-studio"
import { createFileRoute, Link } from "@tanstack/react-router"
import { Button, buttonVariants } from "@workspace/ui/components/button"
import { Images, ListMusic, RefreshCw } from "lucide-react"
import { useCallback, useEffect, useState } from "react"

export const Route = createFileRoute("/")({ component: AlbumsIndex })

function AlbumsIndex() {
  const [albums, setAlbums] = useState<Array<Album>>([])
  const loadAlbums = useCallback(async () => {
    setAlbums(await fetchAlbums())
  }, [])
  const handleRefreshAlbums = useCallback(() => {
    void loadAlbums()
  }, [loadAlbums])

  useEffect(() => {
    void loadAlbums()
  }, [loadAlbums])

  return (
    <main className="min-h-svh bg-background text-foreground">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6 md:px-6">
        <header className="flex flex-col gap-4 border-b pb-5 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-semibold tracking-[0.16em] text-primary uppercase">
              City Pop Chan
            </p>
            <h1 className="mt-1 text-4xl font-semibold tracking-normal">
              Albums
            </h1>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              to="/inspirations"
              className={buttonVariants({ variant: "outline" })}
            >
              <Images data-icon="inline-start" />
              Inspirations
            </Link>
            <SettingsDialog />
            <NewAlbumDialog onAlbumCreated={loadAlbums} />
            <Button
              type="button"
              variant="outline"
              onClick={handleRefreshAlbums}
            >
              <RefreshCw data-icon="inline-start" />
              Refresh
            </Button>
          </div>
        </header>

        <section>
          {albums.length > 0 ? (
            <div className="grid gap-3 sm:grid-cols-2">
              {albums.map((album) => (
                <AlbumCard key={album.folder} album={album} />
              ))}
            </div>
          ) : (
            <div className="grid min-h-56 place-items-center rounded-lg border bg-card text-center shadow-sm">
              <div className="grid gap-2 px-4">
                <ListMusic className="mx-auto size-8 text-muted-foreground" />
                <p className="font-medium">No albums yet</p>
              </div>
            </div>
          )}
        </section>
      </div>
    </main>
  )
}
