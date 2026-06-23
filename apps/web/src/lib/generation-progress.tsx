import type {
  GenerationProgress,
  GenerationStepStatus,
} from "@/lib/generation-progress-state"
import { AlertTriangle, Check, Circle, Loader2 } from "lucide-react"
import { useMemo, type CSSProperties } from "react"

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
              <StepProgressBar progress={step.progress} />
            ) : null}
          </li>
        ))}
      </ol>
    </section>
  )
}

function StepProgressBar({ progress }: { progress: number }) {
  const percentage = Math.min(100, Math.max(0, progress))
  const progressStyle = useMemo<CSSProperties>(
    () => ({
      width: `${percentage}%`,
    }),
    [percentage]
  )

  return (
    <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted">
      <div
        className="h-full rounded-full bg-primary transition-[width]"
        style={progressStyle}
      />
    </div>
  )
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
