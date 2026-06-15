#!/usr/bin/env node

import { youtubeUploadMain } from "./youtube-upload.ts"

youtubeUploadMain().catch((error) => {
  console.error(error.message)
  process.exitCode = 1
})
