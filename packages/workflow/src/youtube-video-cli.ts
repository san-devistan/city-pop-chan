#!/usr/bin/env node

import { main } from "./youtube-video.ts"

main().catch((error) => {
  console.error(error.message)
  process.exitCode = 1
})
