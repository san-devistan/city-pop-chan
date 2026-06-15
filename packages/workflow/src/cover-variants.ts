import { copyFile, mkdir, mkdtemp, rm, writeFile } from "node:fs/promises"
import { createRequire } from "node:module"
import { tmpdir } from "node:os"
import path from "node:path"
import sharp from "sharp"

import { createForegroundCutout } from "./foreground-cutout.ts"

export const DEFAULT_COVER_TITLE = "CITY POP"
const COVER_TITLE_FONT_WIDTH_RATIO = 4.1
const COVER_TITLE_LETTER_WIDTH_RATIO = 0.56
const COVER_TITLE_SPACE_WIDTH_RATIO = 0.28
const COVER_TITLE_TRACKING_WIDTH_RATIO = -0.05
const COVER_TITLE_MARGIN_RATIO = 0.055
const CITY_POP_COVER_COMPOSITION_ID = "CityPopCoverTitle"
const CITY_POP_FOREGROUND_FILE = "cover-foreground.png"
const INTER_FONT_FILE = "files/inter-latin-wght-normal.woff2"
const REMOTION_INTER_FONT_FILE = "inter-latin-wght-normal.woff2"
const requireRuntime = createRequire(import.meta.url)
const WORKFLOW_DIRECTORY = path.dirname(
  requireRuntime.resolve("@workspace/workflow")
)
const WORKFLOW_PACKAGE_DIRECTORY = path.resolve(WORKFLOW_DIRECTORY, "..")
const REMOTION_COVER_ENTRY = path.join(
  WORKFLOW_DIRECTORY,
  "remotion-cover-title.tsx"
)
const requireWorkflowRuntime = createRequire(
  path.join(WORKFLOW_PACKAGE_DIRECTORY, "package.json")
)

export type CoverTextOverlays = {
  leftText: string
  rightText: string
  topText: string
}

type CityPopCoverInputProps = {
  fontWidthRatio: number
  foregroundFileName: string | null
  height: number
  imageFileName: string
  leftText: string
  marginRatio: number
  rightText: string
  title: string
  topText: string
  width: number
}

type RemotionBundleOptions = {
  entryPoint: string
  ignoreRegisterRootWarning: boolean
  outDir: string
  publicDir: string
  rootDir: string
}

type RemotionBundlerModule = {
  bundle: (options: RemotionBundleOptions) => Promise<string>
}

type RemotionRendererModule = {
  renderStill: (options: {
    composition: unknown
    imageFormat: "png"
    inputProps: CityPopCoverInputProps
    logLevel: "error"
    serveUrl: string
  }) => Promise<{ buffer: Buffer | null }>
  selectComposition: (options: {
    id: string
    inputProps: CityPopCoverInputProps
    logLevel: "error"
    serveUrl: string
  }) => Promise<unknown>
}

export type WorkflowCoverAspectRatio = "1:1" | "16:9"

export type WorkflowCoverVariant = {
  aspectRatio: WorkflowCoverAspectRatio
  file: string
  kind: "square" | "widescreen" | "widescreen-title"
  label: string
  url: string
}

export const COVER_VARIANT_DEFINITIONS = [
  {
    aspectRatio: "16:9",
    files: [
      "cover-city-pop.png",
      "cover-city-pop.jpeg",
      "cover-city-pop.jpg",
      "cover-city-pop.webp",
    ],
    kind: "widescreen-title",
    label: "16/9 title",
  },
  {
    aspectRatio: "1:1",
    files: [
      "cover-square.jpeg",
      "cover-square.jpg",
      "cover-square.png",
      "cover-square.webp",
    ],
    kind: "square",
    label: "1/1 crop",
  },
  {
    aspectRatio: "16:9",
    files: ["cover.jpeg", "cover.jpg", "cover.png", "cover.webp"],
    kind: "widescreen",
    label: "16/9",
  },
] satisfies Array<{
  aspectRatio: WorkflowCoverAspectRatio
  files: Array<string>
  kind: WorkflowCoverVariant["kind"]
  label: string
}>

export async function writeCoverVariants({
  directory,
  folder,
  image,
  textOverlays,
  extension,
  title,
}: {
  directory: string
  extension: string
  folder: string
  image: Buffer
  textOverlays?: Partial<CoverTextOverlays>
  title?: string
}) {
  const fileName = `cover.${extension}`
  const cityPopFileName = "cover-city-pop.png"
  const squareFileName = `cover-square.${extension}`
  const [cityPopCover, squareCover] = await Promise.all([
    renderCoverTitleImage({ extension, image, textOverlays, title }),
    centerCropSquare(image, extension),
  ])

  await Promise.all([
    writeFile(path.join(directory, fileName), image),
    writeFile(path.join(directory, cityPopFileName), cityPopCover),
    writeFile(path.join(directory, squareFileName), squareCover),
  ])

  return {
    fileName,
    folder,
    variants: [
      {
        aspectRatio: "16:9",
        fileName: cityPopFileName,
        kind: "widescreen-title",
      },
      {
        aspectRatio: "1:1",
        fileName: squareFileName,
        kind: "square",
      },
      {
        aspectRatio: "16:9",
        fileName,
        kind: "widescreen",
      },
    ],
  }
}

export async function renderCoverTitleImage({
  extension,
  image,
  textOverlays,
  title,
}: {
  extension: string
  image: Buffer
  textOverlays?: Partial<CoverTextOverlays>
  title?: string
}) {
  const metadata = await imageMetadata(image)
  const normalizedTitle = normalizeCoverTitle(title)
  const normalizedTextOverlays = normalizeCoverTextOverlays(textOverlays)
  const foreground = await createForegroundCutout(
    image,
    mimeTypeForExtension(extension)
  )
  const tempDirectory = await mkdtemp(path.join(tmpdir(), "city-pop-cover-"))
  const publicDirectory = path.join(tempDirectory, "public")
  const imageFileName = `cover-source.${extension}`

  try {
    await mkdir(publicDirectory, { recursive: true })
    await Promise.all([
      writeFile(path.join(publicDirectory, imageFileName), image),
      ...(foreground
        ? [
            writeFile(
              path.join(publicDirectory, CITY_POP_FOREGROUND_FILE),
              foreground
            ),
          ]
        : []),
      copyFile(
        interFontPath(),
        path.join(publicDirectory, REMOTION_INTER_FONT_FILE)
      ),
    ])

    const { bundle } = loadRemotionBundler()
    const { renderStill, selectComposition } = loadRemotionRenderer()
    const serveUrl = await bundle({
      entryPoint: REMOTION_COVER_ENTRY,
      ignoreRegisterRootWarning: true,
      outDir: path.join(tempDirectory, "bundle"),
      publicDir: publicDirectory,
      rootDir: WORKFLOW_PACKAGE_DIRECTORY,
    })
    const inputProps = {
      fontWidthRatio: coverTitleFontWidthRatio(normalizedTitle),
      foregroundFileName: foreground ? CITY_POP_FOREGROUND_FILE : null,
      height: metadata.height,
      imageFileName,
      leftText: normalizedTextOverlays.leftText,
      marginRatio: COVER_TITLE_MARGIN_RATIO,
      rightText: normalizedTextOverlays.rightText,
      title: normalizedTitle,
      topText: normalizedTextOverlays.topText,
      width: metadata.width,
    }
    const composition = await selectComposition({
      id: CITY_POP_COVER_COMPOSITION_ID,
      inputProps,
      logLevel: "error",
      serveUrl,
    })
    const rendered = await renderStill({
      composition,
      imageFormat: "png",
      inputProps,
      logLevel: "error",
      serveUrl,
    })

    if (!rendered.buffer) {
      throw new Error("Remotion did not return a cover image.")
    }

    return rendered.buffer
  } finally {
    await rm(tempDirectory, { force: true, recursive: true })
  }
}

export function normalizeCoverTitle(value: string | undefined) {
  const title = (value || "").replace(/\s+/g, " ").trim()

  return title || DEFAULT_COVER_TITLE
}

export function normalizeCoverTextOverlays(
  value: Partial<CoverTextOverlays> | undefined
) {
  return {
    leftText: normalizeCoverSideText(value?.leftText),
    rightText: normalizeCoverSideText(value?.rightText),
    topText: normalizeCoverOverlayText(value?.topText),
  } satisfies CoverTextOverlays
}

export function normalizeCoverOverlayText(value: string | undefined) {
  return (value || "").replace(/\s+/g, " ").trim()
}

function normalizeCoverSideText(value: string | undefined) {
  return (value || "")
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .map((line) => line.replace(/[^\S\n]+/g, " ").trim())
    .join("\n")
    .trim()
}

function coverTitleFontWidthRatio(title: string) {
  const characters = Array.from(title)
  const glyphWidthRatio = characters.reduce(
    (total, character) =>
      total +
      (character.trim()
        ? COVER_TITLE_LETTER_WIDTH_RATIO
        : COVER_TITLE_SPACE_WIDTH_RATIO),
    0
  )
  const trackingWidthRatio =
    Math.max(0, characters.length - 1) * COVER_TITLE_TRACKING_WIDTH_RATIO

  return Math.max(
    COVER_TITLE_FONT_WIDTH_RATIO,
    glyphWidthRatio + trackingWidthRatio
  )
}

async function centerCropSquare(image: Buffer, extension: string) {
  const metadata = await imageMetadata(image)
  const size = Math.min(metadata.width, metadata.height)

  return sharp(image)
    .extract({
      height: size,
      left: Math.floor((metadata.width - size) / 2),
      top: Math.floor((metadata.height - size) / 2),
      width: size,
    })
    .toFormat(outputFormatForExtension(extension))
    .toBuffer()
}

async function imageMetadata(image: Buffer) {
  const metadata = await sharp(image).metadata()

  if (!metadata.width || !metadata.height) {
    throw new Error("Could not read generated cover dimensions.")
  }

  return {
    height: metadata.height,
    width: metadata.width,
  }
}

function interFontPath() {
  const packageRoot = path.dirname(
    requireWorkflowRuntime.resolve("@fontsource-variable/inter/package.json")
  )

  return path.join(packageRoot, INTER_FONT_FILE)
}

function outputFormatForExtension(extension: string) {
  if (extension === "jpeg") {
    return "jpeg"
  }

  if (extension === "webp") {
    return "webp"
  }

  return "png"
}

function mimeTypeForExtension(extension: string) {
  if (extension === "jpeg" || extension === "jpg") {
    return "image/jpeg"
  }

  if (extension === "webp") {
    return "image/webp"
  }

  return "image/png"
}

function loadRemotionBundler() {
  const module = requireWorkflowRuntime("@remotion/bundler")

  if (!isRemotionBundlerModule(module)) {
    throw new Error("Could not load Remotion bundler.")
  }

  return module
}

function loadRemotionRenderer() {
  const module = requireWorkflowRuntime("@remotion/renderer")

  if (!isRemotionRendererModule(module)) {
    throw new Error("Could not load Remotion renderer.")
  }

  return module
}

function isRemotionBundlerModule(
  value: unknown
): value is RemotionBundlerModule {
  return isRecord(value) && typeof value.bundle === "function"
}

function isRemotionRendererModule(
  value: unknown
): value is RemotionRendererModule {
  return (
    isRecord(value) &&
    typeof value.renderStill === "function" &&
    typeof value.selectComposition === "function"
  )
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null
}
