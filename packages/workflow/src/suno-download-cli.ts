#!/usr/bin/env node

import { main } from "./suno-download.ts"

main().catch((error) => {
  console.error(error.message)
  process.exitCode = 1
})
