import { createRequire } from "node:module"
import path from "node:path"
import { pathToFileURL } from "node:url"

const requireRuntime = createRequire(import.meta.url)
const WORKFLOW_DIRECTORY = path.dirname(
  requireRuntime.resolve("@workspace/workflow")
)
const WORKFLOW_PACKAGE_DIRECTORY = path.resolve(WORKFLOW_DIRECTORY, "..")
const requireWorkflowRuntime = createRequire(
  path.join(WORKFLOW_PACKAGE_DIRECTORY, "package.json")
)
const BACKGROUND_REMOVAL_PUBLIC_PATH = pathToFileURL(
  path.dirname(
    requireWorkflowRuntime.resolve("@imgly/background-removal-node")
  ) + path.sep
).href

type BackgroundRemovalConfig = {
  model: "medium"
  output: {
    format: "image/png"
  }
  publicPath: string
}

type BackgroundRemovalNodeModule = {
  removeBackground: (
    image: Blob,
    configuration: BackgroundRemovalConfig
  ) => Promise<Blob>
}

export async function createForegroundCutout(image: Buffer, mimeType: string) {
  try {
    const { removeBackground } = loadBackgroundRemoval()
    const blob = await removeBackground(
      new Blob([Uint8Array.from(image)], { type: mimeType }),
      {
        model: "medium",
        output: { format: "image/png" },
        publicPath: BACKGROUND_REMOVAL_PUBLIC_PATH,
      }
    )

    return Buffer.from(await blob.arrayBuffer())
  } catch {
    return null
  }
}

function loadBackgroundRemoval() {
  const module = requireWorkflowRuntime("@imgly/background-removal-node")

  if (!isBackgroundRemovalNodeModule(module)) {
    throw new Error("Could not load background removal tool.")
  }

  return module
}

function isBackgroundRemovalNodeModule(
  value: unknown
): value is BackgroundRemovalNodeModule {
  return isRecord(value) && typeof value.removeBackground === "function"
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null
}
