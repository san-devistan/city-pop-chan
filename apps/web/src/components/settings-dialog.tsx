import {
  type SettingsChangeHandler,
  useSettingsDialogState,
} from "@/components/use-settings-dialog-state"
import type { StudioSettings } from "@/lib/studio-settings"
import { Button, buttonVariants } from "@workspace/ui/components/button"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@workspace/ui/components/dialog"
import {
  Field,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@workspace/ui/components/field"
import { Input } from "@workspace/ui/components/input"
import { Settings as SettingsIcon } from "lucide-react"
import { type ChangeEvent, useCallback, useMemo } from "react"

type LinkFieldDefinition = {
  key: Exclude<keyof StudioSettings, "artistName">
  label: string
  placeholder: string
}

const LINK_FIELDS = [
  {
    key: "youtubeChannelUrl",
    label: "YouTube channel",
    placeholder: "https://youtube.com/@...",
  },
  {
    key: "youtubeStudioUrl",
    label: "YouTube Studio",
    placeholder: "https://studio.youtube.com/...",
  },
  {
    key: "youtubeMusicUrl",
    label: "YouTube Music",
    placeholder: "https://music.youtube.com/channel/...",
  },
  {
    key: "spotifyUrl",
    label: "Spotify",
    placeholder: "https://open.spotify.com/artist/...",
  },
  {
    key: "appleMusicUrl",
    label: "Apple Music",
    placeholder: "https://music.apple.com/artist/...",
  },
  {
    key: "deezerUrl",
    label: "Deezer",
    placeholder: "https://deezer.com/artist/...",
  },
] satisfies Array<LinkFieldDefinition>

function SettingsDialog() {
  const state = useSettingsDialogState()
  const triggerButton = useMemo(
    () => (
      <button
        type="button"
        aria-label="Settings"
        className={buttonVariants({ variant: "outline" })}
      />
    ),
    []
  )

  return (
    <Dialog open={state.isOpen} onOpenChange={state.onOpenChange}>
      <DialogTrigger nativeButton render={triggerButton}>
        <SettingsIcon data-icon="inline-start" />
        Settings
      </DialogTrigger>
      <DialogContent className="max-h-[calc(100svh-2rem)] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Settings</DialogTitle>
        </DialogHeader>
        <SettingsForm {...state} />
      </DialogContent>
    </Dialog>
  )
}

function SettingsForm({
  draft,
  hasChanges,
  isBusy,
  isSaving,
  onArtistNameChange,
  onCancel,
  onLinkChange,
  onSubmit,
  status,
}: ReturnType<typeof useSettingsDialogState>) {
  return (
    <form className="grid gap-4" onSubmit={onSubmit}>
      <SettingsFields
        draft={draft}
        disabled={isBusy}
        onArtistNameChange={onArtistNameChange}
        onLinkChange={onLinkChange}
      />
      <SettingsStatus status={status} />
      <DialogFooter>
        <Button
          type="button"
          variant="outline"
          disabled={isSaving}
          onClick={onCancel}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={isBusy || !hasChanges}>
          {isSaving ? "Saving..." : "Save"}
        </Button>
      </DialogFooter>
    </form>
  )
}

function SettingsFields({
  disabled,
  draft,
  onArtistNameChange,
  onLinkChange,
}: {
  disabled: boolean
  draft: StudioSettings
  onArtistNameChange: (event: ChangeEvent<HTMLInputElement>) => void
  onLinkChange: SettingsChangeHandler
}) {
  return (
    <FieldGroup>
      <Field>
        <FieldLabel htmlFor="studio-artist-name">Artist name</FieldLabel>
        <Input
          id="studio-artist-name"
          value={draft.artistName}
          disabled={disabled}
          placeholder="City Pop Chan"
          onChange={onArtistNameChange}
        />
      </Field>
      <FieldSet>
        <FieldLegend variant="label">Links</FieldLegend>
        <FieldGroup className="gap-3">
          {LINK_FIELDS.map((field) => (
            <SettingsLinkField
              key={field.key}
              disabled={disabled}
              field={field}
              value={draft[field.key]}
              onChange={onLinkChange}
            />
          ))}
        </FieldGroup>
      </FieldSet>
    </FieldGroup>
  )
}

function SettingsLinkField({
  disabled,
  field,
  onChange,
  value,
}: {
  disabled: boolean
  field: LinkFieldDefinition
  onChange: SettingsChangeHandler
  value: string
}) {
  const updateLinkValue = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      onChange(field.key, event.currentTarget.value)
    },
    [field.key, onChange]
  )

  return (
    <Field>
      <FieldLabel htmlFor={`studio-${field.key}`}>{field.label}</FieldLabel>
      <Input
        id={`studio-${field.key}`}
        value={value}
        disabled={disabled}
        inputMode="url"
        placeholder={field.placeholder}
        spellCheck={false}
        onChange={updateLinkValue}
      />
    </Field>
  )
}

function SettingsStatus({ status }: { status: string }) {
  if (!status) {
    return null
  }

  return (
    <output className="block rounded-md border bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
      {status}
    </output>
  )
}

export { SettingsDialog }
