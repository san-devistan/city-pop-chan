import { type Inspiration, InspirationThumbnail } from "@/lib/suno-studio"
import { Button } from "@workspace/ui/components/button"
import { Check, Copy, ExternalLink, Trash2, X } from "lucide-react"
import {
  type MouseEvent,
  type MouseEventHandler,
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react"

export function InspirationSection({
  actions,
  disabled,
  emptyTitle,
  kind,
  inspirations,
  onDelete,
  title,
}: {
  actions?: ReactNode
  disabled: boolean
  emptyTitle: string
  kind: Inspiration["kind"]
  inspirations: Array<Inspiration>
  onDelete: (inspiration: Inspiration) => Promise<void>
  title: string
}) {
  const inspirationsById = useMemo(() => {
    return new Map(
      inspirations.map((inspiration) => [inspiration.id, inspiration])
    )
  }, [inspirations])
  const [previewInspiration, setPreviewInspiration] =
    useState<Inspiration | null>(null)
  const handleDeleteClick = useCallback<MouseEventHandler<HTMLButtonElement>>(
    (event) => {
      const id = event.currentTarget.dataset.inspirationId
      const inspiration = id ? inspirationsById.get(id) : null

      if (inspiration) {
        void onDelete(inspiration)
      }
    },
    [inspirationsById, onDelete]
  )
  const handlePreviewClick = useCallback<MouseEventHandler<HTMLButtonElement>>(
    (event) => {
      const id = event.currentTarget.dataset.inspirationId
      const inspiration = id ? inspirationsById.get(id) : null

      if (inspiration) {
        setPreviewInspiration(inspiration)
      }
    },
    [inspirationsById]
  )
  const handlePreviewClose = useCallback(() => {
    setPreviewInspiration(null)
  }, [])

  useEffect(() => {
    if (!previewInspiration) {
      return undefined
    }

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setPreviewInspiration(null)
      }
    }

    window.addEventListener("keydown", closeOnEscape)

    return () => {
      window.removeEventListener("keydown", closeOnEscape)
    }
  }, [previewInspiration])

  return (
    <section className="grid gap-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-baseline gap-2">
          <h2 className="text-xl font-semibold">{title}</h2>
          <p className="font-mono text-sm text-muted-foreground tabular-nums">
            {inspirations.length}
          </p>
        </div>
        {actions ? <div className="flex shrink-0 gap-2">{actions}</div> : null}
      </div>

      {inspirations.length > 0 ? (
        <div
          className={
            kind === "cover"
              ? "grid gap-3 sm:grid-cols-2 xl:grid-cols-3"
              : "grid gap-2"
          }
        >
          {inspirations.map((inspiration) => (
            <InspirationCard
              key={inspiration.id}
              disabled={disabled}
              inspiration={inspiration}
              onDelete={handleDeleteClick}
              onPreview={handlePreviewClick}
            />
          ))}
        </div>
      ) : (
        <div className="grid min-h-32 place-items-center rounded-lg border bg-card px-4 text-center shadow-sm">
          <p className="font-medium text-muted-foreground">{emptyTitle}</p>
        </div>
      )}

      {previewInspiration ? (
        <InspirationPreviewDialog
          inspiration={previewInspiration}
          onClose={handlePreviewClose}
        />
      ) : null}
    </section>
  )
}

function InspirationCard({
  disabled,
  inspiration,
  onDelete,
  onPreview,
}: {
  disabled: boolean
  inspiration: Inspiration
  onDelete: MouseEventHandler<HTMLButtonElement>
  onPreview: MouseEventHandler<HTMLButtonElement>
}) {
  return inspiration.kind === "cover" ? (
    <CoverInspirationCard
      disabled={disabled}
      inspiration={inspiration}
      onDelete={onDelete}
      onPreview={onPreview}
    />
  ) : (
    <TitleInspirationRow
      disabled={disabled}
      inspiration={inspiration}
      onDelete={onDelete}
    />
  )
}

function CoverInspirationCard({
  disabled,
  inspiration,
  onDelete,
  onPreview,
}: {
  disabled: boolean
  inspiration: Inspiration
  onDelete: MouseEventHandler<HTMLButtonElement>
  onPreview: MouseEventHandler<HTMLButtonElement>
}) {
  const shouldShowTitle = inspiration.source === "youtube"

  return (
    <article className="group relative overflow-hidden rounded-lg border bg-card shadow-sm">
      <button
        type="button"
        aria-label={`Preview ${inspiration.title}`}
        data-inspiration-id={inspiration.id}
        className="block w-full text-left transition outline-none hover:brightness-105 focus-visible:ring-3 focus-visible:ring-ring/50"
        onClick={onPreview}
      >
        <InspirationThumbnail
          inspiration={inspiration}
          className="aspect-square w-full object-cover"
        />
      </button>
      {shouldShowTitle ? (
        <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-background/95 via-background/75 to-transparent px-3 pt-10 pb-3 opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100">
          <p className="line-clamp-2 text-sm leading-5 font-medium">
            {inspiration.title}
          </p>
        </div>
      ) : null}
      <InspirationControls
        className="absolute top-2 right-2 rounded-md bg-background/80 p-1 shadow-sm backdrop-blur"
        disabled={disabled}
        inspiration={inspiration}
        onDelete={onDelete}
      />
    </article>
  )
}

function InspirationPreviewDialog({
  inspiration,
  onClose,
}: {
  inspiration: Inspiration
  onClose: () => void
}) {
  return (
    <dialog
      open
      aria-label={`${inspiration.title} inspiration preview`}
      aria-modal="true"
      className="fixed inset-0 z-50 m-0 grid h-auto max-h-none w-auto max-w-none place-items-center border-0 bg-black/85 p-4 text-inherit"
    >
      <button
        type="button"
        aria-label="Close inspiration preview"
        className="absolute inset-0 cursor-default"
        onClick={onClose}
      />
      <div className="pointer-events-none relative z-10 grid max-w-[calc(100vw-2rem)] place-items-center">
        <InspirationThumbnail
          inspiration={inspiration}
          className="pointer-events-auto max-h-[76svh] max-w-[calc(100vw-2rem)] rounded-md object-contain shadow-2xl"
        />
      </div>
      <button
        type="button"
        aria-label="Close inspiration preview"
        className="absolute top-4 right-4 grid size-10 place-items-center rounded-md border border-white/20 bg-black/50 text-white backdrop-blur transition outline-none hover:bg-black/70 focus-visible:ring-3 focus-visible:ring-white/50"
        onClick={onClose}
      >
        <X className="size-5" />
      </button>
    </dialog>
  )
}

function TitleInspirationRow({
  disabled,
  inspiration,
  onDelete,
}: {
  disabled: boolean
  inspiration: Inspiration
  onDelete: MouseEventHandler<HTMLButtonElement>
}) {
  const hasThumbnail = Boolean(
    inspiration.thumbnail || inspiration.thumbnailSourceUrl
  )

  return (
    <article className="group relative flex min-h-16 items-center justify-between gap-3 rounded-lg border bg-card px-3 py-2 shadow-sm">
      {hasThumbnail ? (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute right-0 bottom-full z-20 mb-2 w-80 max-w-[calc(100vw-2rem)] overflow-hidden rounded-md border bg-card p-1 opacity-0 shadow-xl transition-opacity group-focus-within:opacity-100 group-hover:opacity-100 md:w-96"
        >
          <InspirationThumbnail
            inspiration={inspiration}
            className="aspect-video w-full rounded-sm object-cover"
          />
        </div>
      ) : null}
      <p className="min-w-0 flex-1 text-sm leading-5 font-medium">
        {inspiration.title}
      </p>
      <InspirationControls
        disabled={disabled}
        inspiration={inspiration}
        onDelete={onDelete}
        showCopy
      />
    </article>
  )
}

function InspirationControls({
  className = "",
  disabled,
  inspiration,
  onDelete,
  showCopy = false,
}: {
  className?: string
  disabled: boolean
  inspiration: Inspiration
  onDelete: MouseEventHandler<HTMLButtonElement>
  showCopy?: boolean
}) {
  const [didCopy, setDidCopy] = useState(false)
  const handleCopyClick = useCallback(
    (event: MouseEvent<HTMLButtonElement>) => {
      const title = event.currentTarget.dataset.title || ""

      void copyTitleToClipboard(title, setDidCopy)
    },
    []
  )

  return (
    <div
      className={`z-30 flex shrink-0 items-center gap-2 opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100 ${className}`}
    >
      {showCopy ? (
        <Button
          type="button"
          variant="outline"
          size="icon-sm"
          aria-label={`Copy ${inspiration.title}`}
          data-title={inspiration.title}
          onClick={handleCopyClick}
        >
          {didCopy ? <Check /> : <Copy />}
        </Button>
      ) : null}
      {inspiration.url ? (
        <a
          href={inspiration.url}
          target="_blank"
          rel="noreferrer"
          aria-label={`Open ${inspiration.title} source`}
          className="inline-flex size-7 items-center justify-center rounded-lg border border-border bg-background text-foreground transition hover:bg-muted focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
        >
          <ExternalLink className="size-4" />
        </a>
      ) : null}
      <Button
        type="button"
        variant="destructive"
        size="icon-sm"
        disabled={disabled}
        data-inspiration-id={inspiration.id}
        aria-label={`Delete ${inspiration.title}`}
        onClick={onDelete}
      >
        <Trash2 />
      </Button>
    </div>
  )
}

async function copyTitleToClipboard(
  value: string,
  setDidCopy: (didCopy: boolean) => void
) {
  const didCopy = await copyTextToClipboard(value)

  if (didCopy) {
    setDidCopy(true)
    window.setTimeout(() => setDidCopy(false), 1200)
  }
}

async function copyTextToClipboard(value: string) {
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(value)
      return true
    } catch {
      return copyTextWithSelection(value)
    }
  }

  return copyTextWithSelection(value)
}

function copyTextWithSelection(value: string) {
  const element = document.createElement("textarea")
  const activeElement = document.activeElement
  const selection = document.getSelection()
  const selectedRange =
    selection && selection.rangeCount > 0 ? selection.getRangeAt(0) : null

  element.value = value
  element.readOnly = true
  element.setAttribute("aria-hidden", "true")
  element.style.position = "fixed"
  element.style.left = "-9999px"
  element.style.opacity = "0"
  document.body.append(element)
  element.focus()
  element.select()

  const didCopy = document.execCommand("copy")

  element.remove()

  if (selectedRange && selection) {
    selection.removeAllRanges()
    selection.addRange(selectedRange)
  }

  if (activeElement instanceof HTMLElement) {
    activeElement.focus()
  }

  return didCopy
}
