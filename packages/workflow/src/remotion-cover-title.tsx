import { loadFont } from "@remotion/fonts"
import type { CSSProperties } from "react"
import {
  AbsoluteFill,
  Composition,
  Img,
  registerRoot,
  staticFile,
  type CalculateMetadataFunction,
  useVideoConfig,
} from "remotion"

export const CITY_POP_COVER_COMPOSITION_ID = "CityPopCoverTitle"
const CITY_POP_FONT_FAMILY = "City Pop Inter"
const COVER_TITLE_FONT_WEIGHT = 900
const COVER_TITLE_LETTER_SPACING = "-0.05em"
const COVER_TITLE_OPTICAL_OFFSET_RATIO = 0.028
const COVER_OVERLAY_FONT_WEIGHT = 700
const INTER_FONT_FILE = "inter-latin-wght-normal.woff2"
const backgroundStyle = { backgroundColor: "black" } satisfies CSSProperties
const imageStyle = {
  height: "100%",
  inset: 0,
  objectFit: "cover",
  position: "absolute",
  width: "100%",
} satisfies CSSProperties
const backgroundImageStyle = {
  ...imageStyle,
  zIndex: 0,
} satisfies CSSProperties
const foregroundImageStyle = {
  ...imageStyle,
  zIndex: 2,
} satisfies CSSProperties
const overlayTextColor = "white"

type CoverTitleProps = {
  fontWidthRatio: number
  foregroundFileName: string | null
  height: number
  imageFileName: string
  leftText: string
  marginRatio: number
  rightText: string
  title: string
  topText: string
  width: number
}

type CoverTextLayout = {
  fontSize: number
  marginX: number
  marginY: number
  sideFontSize: number
  sideInset: number
  sideMaxWidth: number
  sideTop: number
  titleBaselineY: number
  titleInset: number
  titleOpticalOffset: number
  titleWidth: number
  topFontSize: number
  topY: number
}

const defaultCoverTitleProps = {
  fontWidthRatio: 4.1,
  foregroundFileName: null,
  height: 1080,
  imageFileName: "cover-source.png",
  leftText: "WINTER HAZE\nNOSTALGIC NOIR",
  marginRatio: 0.055,
  rightText: "JAPANESE R&B\nMELANCHOLY VIBE",
  title: "CITY POP",
  topText: "TOKYO CHILL LAB",
  width: 1920,
} satisfies CoverTitleProps

const calculateMetadata: CalculateMetadataFunction<CoverTitleProps> = ({
  props,
}) => ({
  durationInFrames: 1,
  fps: 30,
  height: props.height,
  width: props.width,
})

void loadFont({
  family: CITY_POP_FONT_FAMILY,
  format: "woff2",
  url: staticFile(INTER_FONT_FILE),
  weight: `${COVER_TITLE_FONT_WEIGHT}`,
})

void loadFont({
  family: CITY_POP_FONT_FAMILY,
  format: "woff2",
  url: staticFile(INTER_FONT_FILE),
  weight: `${COVER_OVERLAY_FONT_WEIGHT}`,
})

function CityPopCoverTitle({
  fontWidthRatio,
  foregroundFileName,
  imageFileName,
  leftText,
  marginRatio,
  rightText,
  title,
  topText,
}: CoverTitleProps) {
  const { height, width } = useVideoConfig()
  const layout = coverTextLayout({
    fontWidthRatio,
    height,
    marginRatio,
    topText,
    width,
  })

  return (
    <AbsoluteFill style={backgroundStyle}>
      <Img src={staticFile(imageFileName)} style={backgroundImageStyle} />
      <svg aria-hidden="true" style={titleTextStyle}>
        <text {...titleTextAttributes(layout)}>{title}</text>
      </svg>
      {foregroundFileName ? (
        <Img
          src={staticFile(foregroundFileName)}
          style={foregroundImageStyle}
        />
      ) : null}
      {topText ? <div style={topTextStyle(layout)}>{topText}</div> : null}
      {leftText ? (
        <div style={sideTextStyle(layout, "left")}>{leftText}</div>
      ) : null}
      {rightText ? (
        <div style={sideTextStyle(layout, "right")}>{rightText}</div>
      ) : null}
    </AbsoluteFill>
  )
}

function coverTextLayout({
  fontWidthRatio,
  height,
  marginRatio,
  topText,
  width,
}: {
  fontWidthRatio: number
  height: number
  marginRatio: number
  topText: string
  width: number
}) {
  const marginX = Math.round(width * marginRatio)
  const sideInset = Math.round(width * 0.023)
  const titleInset = sideInset
  const titleWidth = width - titleInset * 2
  const fontSize = Math.round(titleWidth / fontWidthRatio)

  return {
    fontSize,
    marginX,
    marginY: Math.round(height * marginRatio),
    sideFontSize: Math.round(width * 0.032),
    sideInset,
    sideMaxWidth: Math.round(width * 0.43),
    sideTop: Math.round(height * 0.515),
    titleBaselineY: Math.round(height * marginRatio + fontSize * 0.82),
    titleInset,
    titleOpticalOffset: Math.round(fontSize * COVER_TITLE_OPTICAL_OFFSET_RATIO),
    titleWidth,
    topFontSize: Math.round(
      Math.max(
        18,
        Math.min(
          width * 0.021,
          (width - marginX * 2) / topTextWidthRatio(topText)
        )
      )
    ),
    topY: Math.round(height * 0.026),
  } satisfies CoverTextLayout
}

const titleTextStyle = {
  height: "100%",
  inset: 0,
  overflow: "visible",
  position: "absolute",
  width: "100%",
  zIndex: 1,
} satisfies CSSProperties

function titleTextAttributes(layout: CoverTextLayout) {
  return {
    fill: overlayTextColor,
    fontFamily: CITY_POP_FONT_FAMILY,
    fontSize: layout.fontSize,
    fontWeight: COVER_TITLE_FONT_WEIGHT,
    lengthAdjust: "spacingAndGlyphs",
    letterSpacing: COVER_TITLE_LETTER_SPACING,
    textLength: layout.titleWidth,
    x: layout.titleInset - layout.titleOpticalOffset,
    y: layout.titleBaselineY,
  } as const
}

function topTextStyle(layout: CoverTextLayout) {
  return {
    color: overlayTextColor,
    fontFamily: CITY_POP_FONT_FAMILY,
    fontSize: layout.topFontSize,
    fontWeight: COVER_OVERLAY_FONT_WEIGHT,
    left: layout.marginX,
    letterSpacing: 0,
    lineHeight: 1,
    position: "absolute",
    right: layout.marginX,
    textAlign: "center",
    textShadow: "0 2px 12px rgba(0,0,0,0.35)",
    top: layout.topY,
    whiteSpace: "nowrap",
    zIndex: 3,
  } satisfies CSSProperties
}

function sideTextStyle(layout: CoverTextLayout, side: "left" | "right") {
  const position =
    side === "left"
      ? ({ left: layout.sideInset, textAlign: "left" } satisfies CSSProperties)
      : ({
          right: layout.sideInset,
          textAlign: "right",
        } satisfies CSSProperties)

  return {
    ...position,
    color: overlayTextColor,
    fontFamily: CITY_POP_FONT_FAMILY,
    fontSize: layout.sideFontSize,
    fontWeight: COVER_OVERLAY_FONT_WEIGHT,
    letterSpacing: 0,
    lineHeight: 0.95,
    maxWidth: layout.sideMaxWidth,
    overflowWrap: "break-word",
    position: "absolute",
    textShadow: "0 2px 14px rgba(0,0,0,0.35)",
    top: layout.sideTop,
    whiteSpace: "pre-line",
    zIndex: 3,
  } satisfies CSSProperties
}

function topTextWidthRatio(text: string) {
  return Math.max(1, text.length * 0.62)
}

function RemotionRoot() {
  return (
    <Composition
      id={CITY_POP_COVER_COMPOSITION_ID}
      component={CityPopCoverTitle}
      durationInFrames={1}
      fps={30}
      height={1080}
      width={1920}
      defaultProps={defaultCoverTitleProps}
      calculateMetadata={calculateMetadata}
    />
  )
}

registerRoot(RemotionRoot)
