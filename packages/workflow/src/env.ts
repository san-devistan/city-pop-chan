import { readFile } from "node:fs/promises"
import path from "node:path"
import { fileURLToPath } from "node:url"

const ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../.."
)

export async function readWorkflowEnv() {
  const fileEnv = await readEnvFiles([".env", ".env.local"])

  return {
    ...fileEnv,
    ...process.env,
  }
}

async function readEnvFiles(files: Array<string>) {
  const entries = await Promise.all(
    files.map((file) => readOptionalEnvFile(path.join(ROOT, file)))
  )
  const env: Record<string, string> = {}

  for (const entry of entries) {
    Object.assign(env, entry)
  }

  return env
}

async function readOptionalEnvFile(file: string) {
  try {
    return parseEnv(await readFile(file, "utf8"))
  } catch (error) {
    if (isNodeError(error) && error.code === "ENOENT") {
      return {}
    }

    throw error
  }
}

function parseEnv(contents: string) {
  const env: Record<string, string> = {}

  for (const rawLine of contents.split(/\r?\n/)) {
    const line = rawLine.trim()

    if (!line || line.startsWith("#") || !line.includes("=")) {
      continue
    }

    const equalsIndex = line.indexOf("=")
    const key = line.slice(0, equalsIndex).trim()
    let value = line.slice(equalsIndex + 1).trim()

    if (
      (value.startsWith(`"`) && value.endsWith(`"`)) ||
      (value.startsWith(`'`) && value.endsWith(`'`))
    ) {
      value = value.slice(1, -1)
    }

    env[key] = value
  }

  return env
}

function isNodeError(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && "code" in error
}
