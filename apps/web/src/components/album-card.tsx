import {
  AlbumSummary,
  type Album,
  useAlbumDurationText,
} from "@/lib/suno-studio"
import { Link } from "@tanstack/react-router"
import { useMemo } from "react"

function AlbumCard({ album }: { album: Album }) {
  const albumParams = useMemo(() => ({ folder: album.folder }), [album.folder])
  const albumDurationText = useAlbumDurationText(album.tracks)

  return (
    <Link
      to="/albums/$folder"
      params={albumParams}
      className="group block overflow-hidden rounded-lg border bg-card shadow-sm transition hover:border-primary/40 hover:bg-muted/20 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
    >
      <div className="min-w-0 p-4">
        <AlbumSummary
          album={album}
          albumDurationText={albumDurationText}
          linkYoutube={false}
        />
      </div>
    </Link>
  )
}

export { AlbumCard }
