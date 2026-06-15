# City Pop Chan Capture

Small unpacked Chromium extension for sending current browser context to the
local Studio app and filling DistroKid with prepared album packages.

## Load

Build the popup once after installing dependencies:

```sh
pnpm suno:extension:build
```

1. Open `chrome://extensions`.
2. Enable Developer mode.
3. Click `Load unpacked`.
4. Select this folder:

   ```text
   apps/suno-extension
   ```

## Use

### Suno songs

1. Open the Suno create page for the City Pop workspace.
2. Open the extension popup.
3. Start `pnpm suno:studio`, then click `Save IDs for Studio`.
4. In Studio, click `Load extension`, then create the album.

### YouTube inspirations

1. Open a YouTube video page.
2. Open the extension popup.
3. Start `pnpm suno:studio`, then save the image, title, or both.
4. Use the album `Cover` button in Studio to choose the saved inspiration.

### Pinterest cover inspirations

1. Open a Pinterest pin page.
2. Open the extension popup.
3. Start `pnpm suno:studio`, then click `Save image`.
4. Studio downloads the active pin image into `inspiration/` as a cover
   inspiration.

### DistroKid release form

1. Start `pnpm suno:studio`.
2. In Studio, click an album's `Publish` or `Open DistroKid` button.
3. On the DistroKid upload page, open the extension popup.
4. Click `Fill DistroKid form`, then review every DistroKid field before
   submitting.

For City Pop Chan albums, the DistroKid fill includes songwriter names and Apple
Music performer/producer credits from the prepared Studio manifest. It also
checks the mandatory DistroKid release acknowledgement boxes after the user has
asked for that release automation.

The extension reads visible Suno IDs, the current YouTube video's title and
thumbnail, the active Pinterest pin image, or the Studio album folder embedded
in the DistroKid URL hash. It sends requests to `http://127.0.0.1:4177`; the
local TanStack app and workflow package still own downloads, file writes, cover
generation, video generation, prepared DistroKid files, and uploads.
