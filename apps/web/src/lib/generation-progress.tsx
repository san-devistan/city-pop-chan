import type { ApiBody } from "@/lib/suno-studio"
import { AlertTriangle, Check, Circle, Loader2 } from "lucide-react"

export type GenerationKind = "cover" | "video"
export type GenerationPhase = "complete" | "error" | "running"
export type GenerationStepStatus = "active" | "complete" | "error" | "pending"

export type GenerationStep = {
  detail: string
  id: string
  label: string
  progress: number | null
  status: GenerationStepStatus
}

export type GenerationProgress = {
  error: string
  kind: GenerationKind
  phase: GenerationPhase
  steps: Array<GenerationStep>
  title: string
}

export type GenerationJobSnapshot = {
  events: Array<GenerationStreamEvent>
  folder: string
  kind: GenerationKind
  phase: GenerationPhase
  startedAt: number
  updatedAt: number
}

type GenerationStepDefinition = {
  detail: string
  id: string
  label: string
}

type GenerationStreamStepEvent = {
  detail?: string
  id: string
  label?: string
  progress?: number
  status?: GenerationStepStatus
  type: "step"
}

type GenerationStreamLogEvent = {
  message: string
  type: "log"
}

type GenerationStreamCompleteEvent = {
  result: unknown
  type: "complete"
}

type GenerationStreamErrorEvent = {
  message: string
  stepId?: string
  type: "error"
}

export type GenerationStreamEvent =
  | GenerationStreamCompleteEvent
  | GenerationStreamErrorEvent
  | GenerationStreamLogEvent
  | GenerationStreamStepEvent

const generationDefinitions: Record<
  GenerationKind,
  {
    steps: Array<GenerationStepDefinition>
    title: string
  }
> = {
  cover: {
    steps: [
      {
        detail: "Reading album settings and prompt.",
        id: "prepare",
        label: "Prepare prompt",
      },
      {
        detail: "Loading selected inspiration images.",
        id: "references",
        label: "Load references",
      },
      {
        detail: "Waiting for Gemini to return the 16/9 cover.",
        id: "gemini",
        label: "Generate cover",
      },
      {
        detail: "Creating title and square cover variations.",
        id: "variants",
        label: "Build variations",
      },
      {
        detail: "Refreshing album data.",
        id: "album",
        label: "Refresh album",
      },
    ],
    title: "Cover generation",
  },
  video: {
    steps: [
      {
        detail: "Preparing title, description, and output files.",
        id: "metadata",
        label: "Prepare video",
      },
      {
        detail: "Concatenating album tracks into one audio file.",
        id: "audio",
        label: "Build audio",
      },
      {
        detail: "Rendering a short Remotion motion loop.",
        id: "render",
        label: "Render motion",
      },
      {
        detail: "Looping the motion render with the full album audio.",
        id: "finalize",
        label: "Finalize files",
      },
      {
        detail: "Refreshing album data.",
        id: "album",
        label: "Refresh album",
      },
    ],
    title: "Video generation",
  },
}

export function createGenerationProgress(
  kind: GenerationKind
): GenerationProgress {
  const definition = generationDefinitions[kind]

  return {
    error: "",
    kind,
    phase: "running",
    steps: definition.steps.map((step, index) => ({
      ...step,
      progress: null,
      status: index === 0 ? "active" : "pending",
    })),
    title: definition.title,
  }
}

export function applyGenerationEvent(
  progress: GenerationProgress,
  event: GenerationStreamEvent
): GenerationProgress {
  if (event.type === "step") {
    return applyStepEvent(progress, event)
  }

  if (event.type === "error") {
    return failGenerationProgress(progress, event.message, event.stepId)
  }

  if (event.type === "complete") {
    return completeGenerationProgress(progress)
  }

  return progress
}

export function failGenerationProgress(
  progress: GenerationProgress,
  message: string,
  stepId?: string
): GenerationProgress {
  const activeIndex = progress.steps.findIndex((step) =>
    stepId ? step.id === stepId : step.status === "active"
  )
  const errorIndex = activeIndex === -1 ? 0 : activeIndex

  return {
    ...progress,
    error: message,
    phase: "error",
    steps: progress.steps.map((step, index) =>
      index === errorIndex
        ? {
            ...step,
            detail: message,
            status: "error",
          }
        : step
    ),
  }
}

export async function streamGenerationAction<T>(
  path: string,
  body: ApiBody,
  onEvent: (event: GenerationStreamEvent) => void
) {
  const response = await fetch(path, {
    body: JSON.stringify(body),
    headers: {
      accept: "application/x-ndjson",
      "content-type": "application/json",
    },
    method: "POST",
  })
  const contentType = response.headers.get("content-type") || ""

  if (!contentType.includes("application/x-ndjson") || !response.body) {
    return readJsonResponse<T>(response)
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ""
  let result: T | null = null
  let failure: Error | null = null

  while (true) {
    const { done, value } = await reader.read()

    if (done) {
      break
    }

    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split("\n")
    buffer = lines.pop() || ""

    for (const line of lines) {
      const event = parseGenerationEvent(line)

      if (!event) {
        continue
      }

      onEvent(event)

      if (event.type === "complete") {
        result = event.result as T
      }

      if (event.type === "error") {
        failure = new Error(event.message)
      }
    }
  }

  const finalEvent = parseGenerationEvent(buffer)

  if (finalEvent) {
    onEvent(finalEvent)

    if (finalEvent.type === "complete") {
      result = finalEvent.result as T
    }

    if (finalEvent.type === "error") {
      failure = new Error(finalEvent.message)
    }
  }

  if (failure) {
    throw failure
  }

  if (!result) {
    throw new Error("Generation finished without a result.")
  }

  return result
}

export async function fetchGenerationJob(folder: string) {
  const response = await fetch(
    `/api/suno/albums/${encodeURIComponent(folder)}/generation`
  )
  const data: unknown = await response.json().catch(() => null)

  if (!response.ok) {
    throw new Error(generationStatusError(data, response.status))
  }

  if (!isRecord(data) || !("job" in data)) {
    return null
  }

  return normalizeGenerationJobSnapshot(data.job)
}

export function generationProgressFromJob(job: GenerationJobSnapshot) {
  let progress = createGenerationProgress(job.kind)

  for (const event of job.events) {
    progress = applyGenerationEvent(progress, event)
  }

  if (job.phase === "complete" && progress.phase !== "complete") {
    return completeGenerationProgress(progress)
  }

  if (job.phase === "error" && progress.phase !== "error") {
    return failGenerationProgress(progress, "Generation failed.")
  }

  return progress
}

export function GenerationProgressPanel({
  progress,
}: {
  progress: GenerationProgress
}) {
  const activeStep =
    progress.steps.find((step) => step.status === "active") ||
    progress.steps.find((step) => step.status === "error")
  const isError = progress.phase === "error"
  const phaseLabel =
    progress.phase === "running"
      ? "Running"
      : progress.phase === "complete"
        ? "Complete"
        : "Needs attention"

  return (
    <section
      aria-live="polite"
      className={`rounded-lg border bg-card p-4 shadow-sm ${
        isError ? "border-destructive/40" : ""
      }`}
    >
      {progress.error ? (
        <output className="mb-4 flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" />
          <span>{progress.error}</span>
        </output>
      ) : null}

      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold">{progress.title}</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {activeStep?.detail || "Generation is complete."}
          </p>
        </div>
        <span
          className={`w-fit rounded-md border px-2 py-1 text-xs font-medium ${
            isError
              ? "border-destructive/30 bg-destructive/10 text-destructive"
              : progress.phase === "complete"
                ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                : "border-primary/30 bg-primary/10 text-primary"
          }`}
        >
          {phaseLabel}
        </span>
      </div>

      <ol className="mt-4 grid gap-2 md:grid-cols-5">
        {progress.steps.map((step) => (
          <li
            key={step.id}
            className={`min-w-0 rounded-md border p-3 ${
              step.status === "active"
                ? "border-primary/40 bg-primary/5"
                : step.status === "error"
                  ? "border-destructive/40 bg-destructive/10"
                  : step.status === "complete"
                    ? "border-emerald-500/30 bg-emerald-500/10"
                    : "bg-background"
            }`}
          >
            <div className="flex min-w-0 items-center gap-2">
              <StepIcon status={step.status} />
              <span className="truncate text-sm font-medium">{step.label}</span>
            </div>
            {step.progress !== null ? (
              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary transition-[width]"
                  style={{
                    width: `${Math.min(100, Math.max(0, step.progress))}%`,
                  }}
                />
              </div>
            ) : null}
          </li>
        ))}
      </ol>
    </section>
  )
}

function applyStepEvent(
  progress: GenerationProgress,
  event: GenerationStreamStepEvent
): GenerationProgress {
  const targetIndex = progress.steps.findIndex((step) => step.id === event.id)
  const status = event.status || "active"

  if (targetIndex === -1) {
    return {
      ...progress,
      steps: [
        ...progress.steps,
        {
          detail: event.detail || "",
          id: event.id,
          label: event.label || event.id,
          progress: event.progress ?? null,
          status,
        },
      ],
    }
  }

  return {
    ...progress,
    error: status === "error" ? progress.error : "",
    phase: status === "error" ? "error" : progress.phase,
    steps: progress.steps.map((step, index) => {
      if (index < targetIndex && status === "active") {
        return {
          ...step,
          progress: step.progress === null ? 100 : step.progress,
          status: step.status === "error" ? "error" : "complete",
        }
      }

      if (index !== targetIndex) {
        return step
      }

      return {
        ...step,
        detail: event.detail || step.detail,
        label: event.label || step.label,
        progress:
          event.progress ?? (status === "complete" ? 100 : step.progress),
        status,
      }
    }),
  }
}

function completeGenerationProgress(
  progress: GenerationProgress
): GenerationProgress {
  return {
    ...progress,
    error: "",
    phase: "complete",
    steps: progress.steps.map((step) => ({
      ...step,
      progress: step.progress === null ? 100 : step.progress,
      status: "complete",
    })),
  }
}

function StepIcon({ status }: { status: GenerationStepStatus }) {
  if (status === "complete") {
    return <Check className="size-4 shrink-0 text-emerald-600" />
  }

  if (status === "active") {
    return <Loader2 className="size-4 shrink-0 animate-spin text-primary" />
  }

  if (status === "error") {
    return <AlertTriangle className="size-4 shrink-0 text-destructive" />
  }

  return <Circle className="size-4 shrink-0 text-muted-foreground" />
}

async function readJsonResponse<T>(response: Response) {
  const data = (await response.json()) as { error?: string }

  if (!response.ok) {
    throw new Error(data.error || "Request failed.")
  }

  return data as T
}

function parseGenerationEvent(line: string) {
  const trimmed = line.trim()

  if (!trimmed) {
    return null
  }

  try {
    return normalizeGenerationEvent(JSON.parse(trimmed))
  } catch {
    return null
  }
}

function normalizeGenerationEvent(
  value: unknown
): GenerationStreamEvent | null {
  if (!isRecord(value) || typeof value.type !== "string") {
    return null
  }

  if (value.type === "step" && typeof value.id === "string") {
    return {
      detail: stringValue(value.detail),
      id: value.id,
      label: stringValue(value.label),
      progress: numberValue(value.progress),
      status: stepStatusValue(value.status),
      type: "step",
    }
  }

  if (value.type === "complete" && "result" in value) {
    return {
      result: value.result,
      type: "complete",
    }
  }

  if (value.type === "error" && typeof value.message === "string") {
    return {
      message: value.message,
      stepId: stringValue(value.stepId),
      type: "error",
    }
  }

  if (value.type === "log" && typeof value.message === "string") {
    return {
      message: value.message,
      type: "log",
    }
  }

  return null
}

function normalizeGenerationJobSnapshot(
  value: unknown
): GenerationJobSnapshot | null {
  if (!isRecord(value)) {
    return null
  }

  const kind = generationKindValue(value.kind)
  const phase = generationPhaseValue(value.phase)

  if (!kind || !phase || typeof value.folder !== "string") {
    return null
  }

  return {
    events: Array.isArray(value.events)
      ? value.events.flatMap((event) => {
          const normalizedEvent = normalizeGenerationEvent(event)

          return normalizedEvent ? [normalizedEvent] : []
        })
      : [],
    folder: value.folder,
    kind,
    phase,
    startedAt: numberValue(value.startedAt) ?? 0,
    updatedAt: numberValue(value.updatedAt) ?? 0,
  }
}

function generationStatusError(data: unknown, status: number) {
  if (
    isRecord(data) &&
    typeof data.error === "string" &&
    data.error.length > 0
  ) {
    return data.error
  }

  return `Could not read generation status. HTTP ${status}.`
}

function generationKindValue(value: unknown): GenerationKind | null {
  return value === "cover" || value === "video" ? value : null
}

function generationPhaseValue(value: unknown): GenerationPhase | null {
  return value === "complete" || value === "error" || value === "running"
    ? value
    : null
}

function stepStatusValue(value: unknown) {
  return value === "active" ||
    value === "complete" ||
    value === "error" ||
    value === "pending"
    ? value
    : undefined
}

function numberValue(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined
}

function stringValue(value: unknown) {
  return typeof value === "string" ? value : undefined
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null
}
