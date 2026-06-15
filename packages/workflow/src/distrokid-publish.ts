import { access, copyFile, mkdir, writeFile } from "node:fs/promises"
import path from "node:path"
import sharp from "sharp"

import {
  readAlbum,
  resolveGeneratedFolder,
  updateAlbumMetadata,
} from "./albums.ts"

const DISTROKID_UPLOAD_URL = "https://distrokid.com/new/"
const DISTROKID_PACKAGE_FOLDER = "distrokid"
const DISTROKID_ARTWORK_SIZE = 3000

export type DistroKidReleaseTrack = {
  aiGenerated: true
  file: string
  instrumental: null
  path: string
  sequence: number
  title: string
}

export type DistroKidReleaseWarning = {
  code: "artwork_normalized" | "artwork_upscaled"
  message: string
}

export type DistroKidPreparedRelease = {
  album: {
    folder: string
    title: string
    trackCount: number
  }
  artwork: {
    file: string
    path: string
    source: {
      file: string
      height: number
      path: string
      width: number
    }
  }
  formHints: {
    albumTitle: string
    artistName: string
    originalReleaseDate: null
    language: string
    primaryGenre: string
    producerName: string
    producerRole: string
    recordLabel: string
    releaseDate: null
    performerName: string
    performerRole: string
    secondaryGenre: string
    songwriterRealName: string
    stores: string
    upc: "automatic"
  }
  manifestFile: string
  packageDirectory: string
  preparedAt: string
  tracks: Array<DistroKidReleaseTrack>
  uploadUrl: string
  version: 1
  warnings: Array<DistroKidReleaseWarning>
}

export async function prepareDistroKidRelease(
  folder: string
): Promise<DistroKidPreparedRelease> {
  const album = await readAlbum(folder)
  const albumDirectory = resolveGeneratedFolder(folder)
  const packageDirectory = path.join(albumDirectory, DISTROKID_PACKAGE_FOLDER)

  await mkdir(packageDirectory, { recursive: true })

  const tracks = await prepareTracks(
    albumDirectory,
    packageDirectory,
    album.tracks
  )
  const artwork = await prepareArtwork(albumDirectory, packageDirectory)
  const preparedAt = new Date().toISOString()
  const manifestFile = path.join(packageDirectory, "manifest.json")
  const warnings = artwork.warnings
  const manifest: DistroKidPreparedRelease = {
    album: {
      folder,
      title: album.title,
      trackCount: tracks.length,
    },
    artwork: artwork.artwork,
    formHints: {
      albumTitle: album.title,
      artistName: "City Pop Chan",
      language: "Japanese",
      originalReleaseDate: null,
      performerName: "City Pop Chan",
      performerRole: "Singing & vocals",
      primaryGenre: "J-Pop",
      producerName: "Leo Combaret",
      producerRole: "Producer",
      recordLabel: "City Pop Chan",
      releaseDate: null,
      secondaryGenre: "Pop",
      songwriterRealName: "Leo Combaret",
      stores: "all",
      upc: "automatic",
    },
    manifestFile,
    packageDirectory,
    preparedAt,
    tracks,
    uploadUrl: DISTROKID_UPLOAD_URL,
    version: 1,
    warnings,
  }

  await writeFile(manifestFile, `${JSON.stringify(manifest, null, 2)}\n`)
  await updateAlbumMetadata(folder, {
    distrokidPublish: {
      artworkFile: manifest.artwork.path,
      manifestFile,
      packageDirectory,
      preparedAt,
      status: "prepared",
      trackCount: tracks.length,
      uploadUrl: DISTROKID_UPLOAD_URL,
      warnings: warnings.map((warning) => warning.message),
    },
  })

  return manifest
}

async function prepareTracks(
  albumDirectory: string,
  packageDirectory: string,
  tracks: Array<{ name: string; title: string }>
): Promise<Array<DistroKidReleaseTrack>> {
  return Promise.all(
    tracks.map(async (track, index) => {
      const trackPath = path.join(albumDirectory, track.name)
      const sequence = index + 1
      const packageFile = `${String(sequence).padStart(2, "0")}-${track.name}`
      const packagePath = path.join(packageDirectory, packageFile)

      await access(trackPath)
      await copyFile(trackPath, packagePath)

      return {
        aiGenerated: true,
        file: packageFile,
        instrumental: null,
        path: packagePath,
        sequence,
        title: track.title,
      }
    })
  )
}

async function prepareArtwork(
  albumDirectory: string,
  packageDirectory: string
) {
  const source = await findCover(albumDirectory)
  const normalized = await sharp(source)
    .rotate()
    .toBuffer({ resolveWithObject: true })
  const sourceWidth = normalized.info.width
  const sourceHeight = normalized.info.height

  if (!sourceWidth || !sourceHeight) {
    throw new Error("Could not read cover artwork dimensions.")
  }

  const artworkPath = path.join(packageDirectory, "cover-distrokid-3000.jpg")
  const background = await sharp(normalized.data)
    .resize(DISTROKID_ARTWORK_SIZE, DISTROKID_ARTWORK_SIZE, {
      fit: "cover",
    })
    .blur(42)
    .modulate({ brightness: 0.68, saturation: 0.9 })
    .jpeg({ quality: 92 })
    .toBuffer()
  const foreground = await sharp(normalized.data)
    .resize(DISTROKID_ARTWORK_SIZE, DISTROKID_ARTWORK_SIZE, {
      background: { alpha: 0, b: 0, g: 0, r: 0 },
      fit: "contain",
    })
    .png()
    .toBuffer()

  await sharp(background)
    .composite([{ input: foreground }])
    .jpeg({ chromaSubsampling: "4:4:4", quality: 95 })
    .toFile(artworkPath)

  return {
    artwork: {
      file: path.basename(artworkPath),
      path: artworkPath,
      source: {
        file: path.basename(source),
        height: sourceHeight,
        path: source,
        width: sourceWidth,
      },
    },
    warnings: artworkWarnings(sourceWidth, sourceHeight),
  }
}

function artworkWarnings(
  sourceWidth: number,
  sourceHeight: number
): Array<DistroKidReleaseWarning> {
  const warnings: Array<DistroKidReleaseWarning> = []

  if (sourceWidth !== sourceHeight) {
    warnings.push({
      code: "artwork_normalized",
      message: `Cover was ${sourceWidth}x${sourceHeight}; prepared a square ${DISTROKID_ARTWORK_SIZE}x${DISTROKID_ARTWORK_SIZE} JPG for DistroKid.`,
    })
  }

  if (sourceWidth < 1000 || sourceHeight < 1000) {
    warnings.push({
      code: "artwork_upscaled",
      message: `Source cover is below 1000px on one side (${sourceWidth}x${sourceHeight}); review the prepared artwork before final release submission.`,
    })
  }

  return warnings
}

async function findCover(albumDirectory: string) {
  const candidates = [
    "cover-square.jpeg",
    "cover-square.jpg",
    "cover-square.png",
    "cover-square.webp",
    "cover.jpeg",
    "cover.jpg",
    "cover.png",
    "cover.webp",
  ]
  const results = await Promise.all(
    candidates.map(async (candidate) => {
      const file = path.join(albumDirectory, candidate)

      try {
        await access(file)
        return file
      } catch {
        return null
      }
    })
  )
  const cover = results.find((result): result is string => Boolean(result))

  if (cover) {
    return cover
  }

  throw new Error("No cover artwork found for this album.")
}
