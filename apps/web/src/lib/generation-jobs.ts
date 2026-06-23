import type { GenerationKind } from "@/lib/generation-progress-state"
import {
  errorMessage,
  type ProgressStreamEvent,
  progressStreamHeaders,
} from "@/lib/http"

type GenerationJobPhase = "complete" | "error" | "running"

export type GenerationJobSnapshot = {
  events: Array<ProgressStreamEvent>
  folder: string
  kind: GenerationKind
  phase: GenerationJobPhase
  startedAt: number
  updatedAt: number
}

type GenerationJob = GenerationJobSnapshot & {
  listeners: Set<(event: ProgressStreamEvent) => void>
  promise: Promise<void>
}

type StartGenerationJobInput = {
  folder: string
  kind: GenerationKind
  run: (send: (event: ProgressStreamEvent) => void) => Promise<void>
}

const COMPLETED_JOB_RETENTION_MS = 10 * 60 * 1000
const generationJobs = new Map<string, GenerationJob>()

export function startGenerationJob(input: StartGenerationJobInput) {
  cleanupGenerationJobs()

  const key = generationJobKey(input.folder, input.kind)
  const currentJob = generationJobs.get(key)

  if (currentJob?.phase === "running") {
    return jobSnapshot(currentJob)
  }

  const now = Date.now()
  const job: GenerationJob = {
    events: [],
    folder: input.folder,
    kind: input.kind,
    listeners: new Set(),
    phase: "running",
    promise: Promise.resolve(),
    startedAt: now,
    updatedAt: now,
  }

  generationJobs.set(key, job)
  job.promise = Promise.resolve()
    .then(() => input.run((event) => recordGenerationEvent(job, event)))
    .then(() => {
      if (job.phase === "running") {
        recordGenerationEvent(job, { result: null, type: "complete" })
      }

      return undefined
    })
    .catch((error: unknown) => {
      recordGenerationEvent(job, {
        message: errorMessage(error),
        type: "error",
      })
    })

  return jobSnapshot(job)
}

export function getAlbumGenerationJob(folder: string) {
  cleanupGenerationJobs()

  const jobs = [...generationJobs.values()].filter(
    (job) => job.folder === folder
  )
  const runningJob = jobs.find((job) => job.phase === "running")
  const latestJob = jobs.toSorted((first, second) => {
    return second.updatedAt - first.updatedAt
  })[0]

  return runningJob
    ? jobSnapshot(runningJob)
    : latestJob
      ? jobSnapshot(latestJob)
      : null
}

export function generationJobStream(folder: string, kind: GenerationKind) {
  cleanupGenerationJobs()

  const job = generationJobs.get(generationJobKey(folder, kind))

  if (!job) {
    return new Response(null, { headers: progressStreamHeaders(), status: 204 })
  }

  const encoder = new TextEncoder()
  let streamListener: ((event: ProgressStreamEvent) => void) | null = null
  let heartbeat: ReturnType<typeof setInterval> | null = null
  const clearHeartbeat = () => {
    if (heartbeat) {
      clearInterval(heartbeat)
      heartbeat = null
    }
  }
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      let isClosed = false
      const send = (event: ProgressStreamEvent) => {
        if (isClosed) {
          return
        }

        controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`))

        if (event.type === "complete" || event.type === "error") {
          isClosed = true
          clearHeartbeat()
          job.listeners.delete(send)
          controller.close()
        }
      }

      for (const event of job.events) {
        send(event)

        if (isClosed) {
          return
        }
      }

      if (job.phase === "running") {
        streamListener = send
        job.listeners.add(send)
        heartbeat = setInterval(() => {
          if (!isClosed) {
            controller.enqueue(encoder.encode("\n"))
          }
        }, 15_000)
        return
      }

      isClosed = true
      clearHeartbeat()
      controller.close()
    },
    cancel() {
      clearHeartbeat()

      if (streamListener) {
        job.listeners.delete(streamListener)
      }
    },
  })

  return new Response(stream, {
    headers: progressStreamHeaders(),
  })
}

function recordGenerationEvent(job: GenerationJob, event: ProgressStreamEvent) {
  job.events.push(event)
  job.updatedAt = Date.now()

  if (event.type === "complete") {
    job.phase = "complete"
  }

  if (event.type === "error") {
    job.phase = "error"
  }

  for (const listener of job.listeners) {
    listener(event)
  }
}

function cleanupGenerationJobs() {
  const now = Date.now()

  for (const [key, job] of generationJobs) {
    if (
      job.phase !== "running" &&
      now - job.updatedAt > COMPLETED_JOB_RETENTION_MS
    ) {
      generationJobs.delete(key)
    }
  }
}

function jobSnapshot(job: GenerationJob): GenerationJobSnapshot {
  return {
    events: [...job.events],
    folder: job.folder,
    kind: job.kind,
    phase: job.phase,
    startedAt: job.startedAt,
    updatedAt: job.updatedAt,
  }
}

function generationJobKey(folder: string, kind: GenerationKind) {
  return `${folder}:${kind}`
}
