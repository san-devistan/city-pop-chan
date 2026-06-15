import {
  EMPTY_STUDIO_SETTINGS,
  fetchStudioSettings,
  saveStudioSettings,
  type StudioSettings,
} from "@/lib/studio-settings"
import {
  type ChangeEvent,
  type FormEvent,
  useCallback,
  useRef,
  useState,
} from "react"

export type SettingsChangeHandler = (
  key: keyof StudioSettings,
  value: string
) => void

export function useSettingsDialogState() {
  const [draft, setDraft] = useState<StudioSettings>(EMPTY_STUDIO_SETTINGS)
  const [isLoading, setIsLoading] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [status, setStatus] = useState("")
  const savedSettingsRef = useRef<StudioSettings>(EMPTY_STUDIO_SETTINGS)

  const applySettings = useCallback((settings: StudioSettings) => {
    setDraft(settings)
    savedSettingsRef.current = settings
  }, [])
  const loadSettings = useCallback(async () => {
    setIsLoading(true)
    setStatus("Loading settings...")

    try {
      applySettings(await fetchStudioSettings())
      setStatus("")
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Could not load.")
    } finally {
      setIsLoading(false)
    }
  }, [applySettings])
  const onOpenChange = useCallback(
    (nextOpen: boolean) => {
      setIsOpen(nextOpen)

      if (nextOpen) {
        void loadSettings()
      }
    },
    [loadSettings]
  )
  const onLinkChange = useCallback<SettingsChangeHandler>((key, value) => {
    setDraft((current) => ({ ...current, [key]: value }))
  }, [])
  const onArtistNameChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      onLinkChange("artistName", event.currentTarget.value)
    },
    [onLinkChange]
  )
  const saveDraft = useCallback(async () => {
    setIsSaving(true)
    setStatus("Saving settings...")

    try {
      applySettings(await saveStudioSettings(draft))
      setStatus("")
      setIsOpen(false)
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Save failed.")
    } finally {
      setIsSaving(false)
    }
  }, [applySettings, draft])
  const onSubmit = useCallback(
    (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault()
      void saveDraft()
    },
    [saveDraft]
  )
  const onCancel = useCallback(() => {
    setIsOpen(false)
  }, [])
  const isBusy = isLoading || isSaving

  return {
    draft,
    hasChanges: !sameStudioSettings(draft, savedSettingsRef.current),
    isBusy,
    isOpen,
    isSaving,
    onArtistNameChange,
    onCancel,
    onLinkChange,
    onOpenChange,
    onSubmit,
    status,
  }
}

function sameStudioSettings(left: StudioSettings, right: StudioSettings) {
  return (
    left.appleMusicUrl === right.appleMusicUrl &&
    left.artistName === right.artistName &&
    left.deezerUrl === right.deezerUrl &&
    left.spotifyUrl === right.spotifyUrl &&
    left.youtubeChannelUrl === right.youtubeChannelUrl &&
    left.youtubeMusicUrl === right.youtubeMusicUrl &&
    left.youtubeStudioUrl === right.youtubeStudioUrl
  )
}
