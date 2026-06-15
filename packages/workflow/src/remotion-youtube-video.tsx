import { loadFont } from "@remotion/fonts"
import { useMemo, type CSSProperties } from "react"
import {
  AbsoluteFill,
  Composition,
  registerRoot,
  staticFile,
  type CalculateMetadataFunction,
} from "remotion"

export const CITY_POP_TRACK_TITLE_COMPOSITION_ID = "CityPopTrackTitle"

const FPS = 24
const WIDTH = 1920
const HEIGHT = 1080
const VIDEO_FONT_FAMILY = "City Pop Video Inter"
const INTER_FONT_FILE = "inter-latin-wght-normal.woff2"
const VIDEO_TEXT_COLOR = "#FEFEFE"

type TrackTitleProps = {
  title: string
}

const defaultTrackTitleProps = {
  title: "Aoyama Tail Lights",
} satisfies TrackTitleProps

const titleMetadata: CalculateMetadataFunction<TrackTitleProps> = () => ({
  durationInFrames: 1,
  fps: FPS,
  height: HEIGHT,
  width: WIDTH,
})

void loadFont({
  family: VIDEO_FONT_FAMILY,
  format: "woff2",
  url: staticFile(INTER_FONT_FILE),
  weight: "700",
})

function TrackTitleOverlay({ title }: TrackTitleProps) {
  const normalizedTitle = title.trim() || "Untitled"
  const fontSize =
    normalizedTitle.length > 42 ? 38 : normalizedTitle.length > 28 ? 46 : 54
  const titleStyle = useMemo(
    () =>
      ({
        color: VIDEO_TEXT_COLOR,
        fontFamily: `${VIDEO_FONT_FAMILY}, sans-serif`,
        fontSize,
        fontWeight: 700,
        left: "50%",
        letterSpacing: 0,
        lineHeight: 1.08,
        maxWidth: "82%",
        position: "absolute",
        textAlign: "center",
        top: "87%",
        transform: "translate(-50%, -50%)",
        width: "82%",
        wordBreak: "break-word",
      }) satisfies CSSProperties,
    [fontSize]
  )

  return (
    <AbsoluteFill>
      <div style={titleStyle}>{normalizedTitle}</div>
    </AbsoluteFill>
  )
}

function RemotionRoot() {
  return (
    <Composition
      id={CITY_POP_TRACK_TITLE_COMPOSITION_ID}
      component={TrackTitleOverlay}
      durationInFrames={1}
      fps={FPS}
      height={HEIGHT}
      width={WIDTH}
      defaultProps={defaultTrackTitleProps}
      calculateMetadata={titleMetadata}
    />
  )
}

registerRoot(RemotionRoot)
