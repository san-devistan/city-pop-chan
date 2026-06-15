import { mkdir, readFile, writeFile } from "node:fs/promises"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { transformSync } from "oxc-transform"

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const manifest = JSON.parse(await readFile(path.join(ROOT, "manifest.json")))

if (manifest.manifest_version !== 3) {
  throw new Error("Expected Manifest V3")
}

if (!manifest.action?.default_popup) {
  throw new Error("Missing extension popup entrypoint")
}

const input = path.join(ROOT, "src/popup.ts")
const output = path.join(ROOT, "dist/popup.js")
const source = await readFile(input, "utf8")
const result = transformSync(input, source, {
  lang: "ts",
  sourceType: "module",
  target: "es2022",
})

await mkdir(path.dirname(output), { recursive: true })
await writeFile(output, result.code)
await mkdir(path.join(ROOT, ".output"), { recursive: true })
await writeFile(path.join(ROOT, ".output/build-ok"), "ok")
console.log("Built Suno extension popup.")
