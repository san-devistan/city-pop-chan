import { InspirationSection } from "@/components/inspiration-section"
import {
  DEFAULT_INSPIRATION_DEFAULTS,
  type InspirationDefaults,
} from "@/lib/inspiration-defaults"
import {
  deleteInspiration,
  fetchInspirationDefaults,
  fetchInspirations,
  type Inspiration,
  saveInspirationDefaults,
  uploadPhotoInspirations,
} from "@/lib/suno-studio"
import { createFileRoute, Link } from "@tanstack/react-router"
import { Button, buttonVariants } from "@workspace/ui/components/button"
import {
  InputGroup,
  InputGroupInput,
  InputGroupTextarea,
} from "@workspace/ui/components/input-group"
import { Label } from "@workspace/ui/components/label"
import { ArrowLeft, ChevronDown, Plus, RefreshCw } from "lucide-react"
import {
  type ChangeEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react"

export const Route = createFileRoute("/inspirations")({
  component: InspirationsRoute,
})

type DefaultDraftChange = (
  field: keyof InspirationDefaults,
  value: string
) => void

function InspirationsRoute() {
  const [inspirations, setInspirations] = useState<Array<Inspiration>>([])
  const [defaultDraft, setDefaultDraft] = useState<InspirationDefaults>(
    DEFAULT_INSPIRATION_DEFAULTS
  )
  const savedDefaultsRef = useRef<InspirationDefaults>(
    DEFAULT_INSPIRATION_DEFAULTS
  )
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isBusy, setIsBusy] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [status, setStatus] = useState("")

  const loadInspirations = useCallback(async () => {
    setIsLoading(true)

    try {
      const [nextInspirations, nextDefaults] = await Promise.all([
        fetchInspirations(),
        fetchInspirationDefaults(),
      ])

      setInspirations(nextInspirations)
      setDefaultDraft(nextDefaults)
      savedDefaultsRef.current = nextDefaults
      setStatus("")
    } catch (error) {
      setStatus(
        error instanceof Error ? error.message : "Could not load inspirations."
      )
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadInspirations()
  }, [loadInspirations])

  const saveDefaults = useCallback(async () => {
    if (sameDefaults(defaultDraft, savedDefaultsRef.current)) {
      return
    }

    setIsBusy(true)
    setStatus("Saving defaults...")

    try {
      const defaults = await saveInspirationDefaults(defaultDraft)

      setDefaultDraft(defaults)
      savedDefaultsRef.current = defaults
      setStatus("")
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Save failed.")
    } finally {
      setIsBusy(false)
    }
  }, [defaultDraft])

  const removeInspiration = useCallback(async (inspiration: Inspiration) => {
    if (!window.confirm(`Delete "${inspiration.title}" from inspirations?`)) {
      return
    }

    setIsBusy(true)
    setStatus(`Deleting ${inspiration.title}...`)

    try {
      await deleteInspiration(inspiration.id)
      setInspirations((current) =>
        current.filter((item) => item.id !== inspiration.id)
      )
      setStatus(`Deleted ${inspiration.title}.`)
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Delete failed.")
    } finally {
      setIsBusy(false)
    }
  }, [])

  const uploadFiles = useCallback(async (files: Array<File>) => {
    if (files.length === 0) {
      setStatus("Choose JPEG, PNG, or WebP images.")
      return
    }

    setIsBusy(true)
    setStatus(
      `Uploading ${files.length} inspiration photo${files.length === 1 ? "" : "s"}...`
    )

    try {
      const uploaded = await uploadPhotoInspirations(files)

      setInspirations((current) => mergeInspirations(uploaded, current))
      setStatus(
        `Added ${uploaded.length} inspiration photo${
          uploaded.length === 1 ? "" : "s"
        }.`
      )
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Upload failed.")
    } finally {
      setIsBusy(false)
    }
  }, [])

  const handleFileInputChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      void uploadFiles(imageFilesFromList(event.currentTarget.files))
      event.currentTarget.value = ""
    },
    [uploadFiles]
  )
  const handleAddCoverClick = useCallback(() => {
    fileInputRef.current?.click()
  }, [])
  const handleDefaultsBlur = useCallback(() => {
    void saveDefaults()
  }, [saveDefaults])
  const handleDefaultDraftChange = useCallback<DefaultDraftChange>(
    (field, value) => {
      setDefaultDraft((current) => ({
        ...current,
        [field]: value,
      }))
    },
    []
  )
  const handleRefreshClick = useCallback(() => {
    void loadInspirations()
  }, [loadInspirations])

  const coverInspirations = useMemo(
    () => inspirations.filter((inspiration) => inspiration.kind === "cover"),
    [inspirations]
  )
  const videoTitleInspirations = useMemo(
    () =>
      inspirations.filter((inspiration) => inspiration.kind === "videoTitle"),
    [inspirations]
  )

  return (
    <main className="min-h-svh bg-background text-foreground">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6 md:px-6">
        <header className="flex flex-col gap-4 border-b pb-5 md:flex-row md:items-end md:justify-between">
          <div className="min-w-0">
            <Link to="/" className={buttonVariants({ variant: "ghost" })}>
              <ArrowLeft data-icon="inline-start" />
              Albums
            </Link>
            <h1 className="mt-3 text-4xl font-semibold tracking-normal">
              Inspirations
            </h1>
          </div>
          <Button
            type="button"
            variant="outline"
            disabled={isBusy}
            onClick={handleRefreshClick}
          >
            <RefreshCw />
            Refresh
          </Button>
        </header>

        <DefaultSettingsSections
          defaultDraft={defaultDraft}
          disabled={isBusy}
          onBlur={handleDefaultsBlur}
          onChange={handleDefaultDraftChange}
        />

        {status ? (
          <output className="block rounded-md border bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
            {status}
          </output>
        ) : null}

        <InspirationSection
          actions={
            <>
              <Button
                type="button"
                variant="outline"
                size="icon-sm"
                disabled={isBusy}
                aria-label="Add cover inspiration"
                onClick={handleAddCoverClick}
              >
                <Plus />
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                aria-label="Choose cover inspiration photos"
                accept="image/jpeg,image/png,image/webp"
                multiple
                className="sr-only"
                onChange={handleFileInputChange}
              />
            </>
          }
          disabled={isBusy}
          emptyTitle={
            isLoading
              ? "Loading cover inspirations..."
              : "No cover inspirations"
          }
          inspirations={coverInspirations}
          kind="cover"
          title="Cover inspirations"
          onDelete={removeInspiration}
        />

        <InspirationSection
          disabled={isBusy}
          emptyTitle={
            isLoading
              ? "Loading video-title inspirations..."
              : "No video-title inspirations"
          }
          inspirations={videoTitleInspirations}
          kind="videoTitle"
          title="Video title inspirations"
          onDelete={removeInspiration}
        />
      </div>
    </main>
  )
}

function DefaultSettingsSections({
  defaultDraft,
  disabled,
  onBlur,
  onChange,
}: {
  defaultDraft: InspirationDefaults
  disabled: boolean
  onBlur: () => void
  onChange: DefaultDraftChange
}) {
  return (
    <section className="grid gap-3 border-b pb-6 lg:grid-cols-2">
      <CoverDefaultsSection
        defaultDraft={defaultDraft}
        disabled={disabled}
        onBlur={onBlur}
        onChange={onChange}
      />
      <VideoDefaultsSection
        defaultDraft={defaultDraft}
        disabled={disabled}
        onBlur={onBlur}
        onChange={onChange}
      />
    </section>
  )
}

function CoverDefaultsSection({
  defaultDraft,
  disabled,
  onBlur,
  onChange,
}: {
  defaultDraft: InspirationDefaults
  disabled: boolean
  onBlur: () => void
  onChange: DefaultDraftChange
}) {
  return (
    <details className="group rounded-lg border bg-card shadow-sm">
      <DefaultSettingsSummary title="Cover" />
      <div className="grid gap-4 border-t p-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <DefaultInputField
            disabled={disabled}
            field="coverTopText"
            id="default-cover-top-text"
            label="Top text"
            value={defaultDraft.coverTopText}
            onBlur={onBlur}
            onChange={onChange}
          />
          <DefaultInputField
            disabled={disabled}
            field="videoImageText"
            id="default-video-image-text"
            label="Main title"
            value={defaultDraft.videoImageText}
            onBlur={onBlur}
            onChange={onChange}
          />
          <DefaultTextareaField
            disabled={disabled}
            field="coverLeftText"
            groupClassName="min-h-20 items-start"
            id="default-cover-left-text"
            inputClassName="min-h-20 resize-y"
            label="Left side text"
            value={defaultDraft.coverLeftText}
            onBlur={onBlur}
            onChange={onChange}
          />
          <DefaultTextareaField
            disabled={disabled}
            field="coverRightText"
            groupClassName="min-h-20 items-start"
            id="default-cover-right-text"
            inputClassName="min-h-20 resize-y"
            label="Right side text"
            value={defaultDraft.coverRightText}
            onBlur={onBlur}
            onChange={onChange}
          />
        </div>
        <DefaultTextareaField
          disabled={disabled}
          field="coverPrompt"
          groupClassName="min-h-28 items-start"
          id="default-cover-prompt"
          inputClassName="min-h-28 resize-y"
          label="Prompt"
          value={defaultDraft.coverPrompt}
          onBlur={onBlur}
          onChange={onChange}
        />
      </div>
    </details>
  )
}

function VideoDefaultsSection({
  defaultDraft,
  disabled,
  onBlur,
  onChange,
}: {
  defaultDraft: InspirationDefaults
  disabled: boolean
  onBlur: () => void
  onChange: DefaultDraftChange
}) {
  return (
    <details className="group rounded-lg border bg-card shadow-sm">
      <DefaultSettingsSummary title="Video" />
      <div className="grid gap-4 border-t p-4">
        <DefaultInputField
          disabled={disabled}
          field="videoTitle"
          id="default-video-title"
          label="Title"
          value={defaultDraft.videoTitle}
          onBlur={onBlur}
          onChange={onChange}
        />
        <DefaultTextareaField
          disabled={disabled}
          field="videoDescription"
          groupClassName="min-h-44 items-start"
          id="default-video-description"
          inputClassName="min-h-44 resize-y font-mono text-sm"
          label="Description"
          value={defaultDraft.videoDescription}
          onBlur={onBlur}
          onChange={onChange}
        />
      </div>
    </details>
  )
}

function DefaultSettingsSummary({ title }: { title: string }) {
  return (
    <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-left transition outline-none hover:bg-muted/30 focus-visible:ring-3 focus-visible:ring-ring/50 [&::-webkit-details-marker]:hidden">
      <h2 className="text-base font-semibold tracking-normal">{title}</h2>
      <ChevronDown className="size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" />
    </summary>
  )
}

function DefaultInputField({
  className,
  disabled,
  field,
  id,
  label,
  onBlur,
  onChange,
  value,
}: {
  className?: string
  disabled: boolean
  field: keyof InspirationDefaults
  id: string
  label: string
  onBlur: () => void
  onChange: DefaultDraftChange
  value: string
}) {
  return (
    <div className={fieldClassName(className)}>
      <Label htmlFor={id}>{label}</Label>
      <InputGroup>
        <InputGroupInput
          id={id}
          value={value}
          disabled={disabled}
          onBlur={onBlur}
          onChange={(event) => onChange(field, event.currentTarget.value)}
        />
      </InputGroup>
    </div>
  )
}

function DefaultTextareaField({
  disabled,
  field,
  groupClassName,
  id,
  inputClassName,
  label,
  onBlur,
  onChange,
  value,
}: {
  disabled: boolean
  field: keyof InspirationDefaults
  groupClassName: string
  id: string
  inputClassName: string
  label: string
  onBlur: () => void
  onChange: DefaultDraftChange
  value: string
}) {
  return (
    <div className="grid gap-2">
      <Label htmlFor={id}>{label}</Label>
      <InputGroup className={groupClassName}>
        <InputGroupTextarea
          id={id}
          value={value}
          disabled={disabled}
          className={inputClassName}
          onBlur={onBlur}
          onChange={(event) => onChange(field, event.currentTarget.value)}
        />
      </InputGroup>
    </div>
  )
}

function fieldClassName(className: string | undefined) {
  return className ? `grid gap-2 ${className}` : "grid gap-2"
}

function imageFilesFromList(fileList: FileList | null) {
  return Array.from(fileList || []).filter((file) =>
    file.type.startsWith("image/")
  )
}

function mergeInspirations(
  left: Array<Inspiration>,
  right: Array<Inspiration>
) {
  return [...left, ...right].filter((inspiration, index, all) => {
    return all.findIndex((item) => item.id === inspiration.id) === index
  })
}

function sameDefaults(left: InspirationDefaults, right: InspirationDefaults) {
  return (
    left.coverLeftText === right.coverLeftText &&
    left.coverPrompt === right.coverPrompt &&
    left.coverRightText === right.coverRightText &&
    left.coverTopText === right.coverTopText &&
    left.videoDescription === right.videoDescription &&
    left.videoImageText === right.videoImageText &&
    left.videoTitle === right.videoTitle
  )
}
