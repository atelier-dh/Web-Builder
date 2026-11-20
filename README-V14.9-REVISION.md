# Moza Studio V14.9 — Mobile Core & Cinematic Envelope Upgrade

Basis: `Moza_Studio_V14_8_31.zip` (V14.8.31)

## Included in this revision

### 1. Mobile canvas interaction
- Added two-finger pinch zoom that keeps the zoom anchor near the gesture midpoint.
- Added on-canvas mobile zoom controls: minus, percentage, plus, and Fit.
- Added one-finger canvas panning on empty canvas and locked elements. Locked elements no longer start a drag, so users can move the canvas/viewport while the asset remains locked.
- The mobile interaction patch is editor-only; it does not change the published website's touch behavior.

### 2. Image and video resize
- Image/video resize preserves the current aspect ratio by default.
- Hold `Shift` while resizing to temporarily unlock the ratio.
- Imported/selected local video metadata is inspected; the selected video element can be resized to the source ratio.
- Video rendering defaults to `Contain` to avoid unexpected cropping. `Cover` remains available in Video properties.

### 3. Permanent section deletion
- `Delete section` now asks for confirmation and removes the section object from the active page's project data.
- The section's child elements are removed with it.
- Undo can restore the deleted section.
- Per-device `Hide section on` remains a separate responsive visibility setting.
- Links pointing to the removed section are redirected to the containing page.

### 4. Modular Envelope & Card Reveal
- Envelope content is replaceable independently from the animation.
- Envelope modes: `Layered` (separate body, flap, and seal assets) or `Single artwork` (one static envelope image).
- Each envelope part can be selected from Asset Library or uploaded directly from Envelope properties.
- Card visibility has an explicit `Show invitation card` ON/OFF setting.
- Card sources: editable text card, Asset Library image, existing Canvas Element, or existing Canvas Group.
- Card size and image fit can be adjusted. Existing Canvas Element/Group sources remain editable in the editor; the source can be hidden on the published page to avoid duplication.
- Turning the card OFF does not hide a previously selected source element/group from the published page.
- A flat single-image envelope is supported, but its flap cannot be independently animated. Use Layered mode for an articulated flap.

### 5. One-page cinematic sequence
- An MP4/WebM from Video Library can be attached to an Envelope element.
- With `Enable one-page cinematic sequence` enabled, the envelope does not navigate to another page.
- After the envelope opens, the cinematic video appears in the same envelope frame and plays.
- The video stage remains visible after playback ends (unless Loop is enabled), so the last frame remains as the top visual while invitation sections continue below on the same page.
- Video autoplay is muted for browser compatibility. If autoplay is blocked, a `Tap to play cinematic` fallback is shown.
- The envelope element can be fitted to the selected video's native aspect ratio; its containing section expands to avoid clipping when one-page mode is enabled.

## Setup / usage notes

1. Open the Envelope element's properties.
2. In `Replaceable Envelope & Card`, choose Layered or Single artwork mode.
3. Upload/select the envelope assets. Turn `Show invitation card` ON or OFF.
4. If ON, choose Text, Asset, Existing Canvas Element, or Existing Canvas Group as the card source.
5. Enable `One-page cinematic sequence`, select a video from Video Library, and use `Fit element to video ratio` if needed.
6. Place the remaining invitation sections below the Envelope element on the same page.
7. Use Preview to test the complete opening sequence.

## Compatibility and validation
- Existing V14.8.31 project data is not migrated destructively; new envelope settings receive defaults when the properties panel is opened.
- Legacy Cinematic Intro, multi-page Cinematic Wedding templates, ordinary Video Elements, and responsive visibility settings remain available.
- JavaScript syntax checks and Node-based behavior stubs pass for the V14.9 patch. A full interactive browser/device test could not be completed in this environment, so validate touch gestures, video autoplay, and export on target iOS/Android browsers before production release.

## Added files
- `moza-v14.9-revision.js` — additive editor/runtime patch.
- `moza-v14.9-revision.css` — matching V14.9 styles for reference/standalone use; the JS patch injects these styles into the editor and generated website HTML.
- `README-V14.9-REVISION.md` — this revision note.


## V14.9.1 — Additional carousel, motion, FAQ and font revisions

### Carousel / Digital Haus Continuous
- Added four flow directions: left, right, up, and down.
- Vertical flow uses pointer drag/swipe and keyboard up/down navigation.
- Continuous carousel sizing now honors the selected frame width and aspect ratio.
- Removed inline clip-path and border-radius overrides that previously masked the selected frame shape.
- Reverse directions are supported when Loop is disabled.

### Always Moving effects
- Motion-oriented loop presets (Float, Bob, Spin, Wiggle, Swing, Orbit, Drift, Float Diagonal, Pendulum, Rock, Wave, and rotation/hue loops) use linear timing to avoid easing pauses at cycle boundaries.
- Rhythmic effects such as Pulse, Heartbeat, Flash and Tada retain their eased timing.

### FAQ Builder
- FAQ items support additional editable content blocks: Text, Button, Copy to Clipboard, Icon, and Image.
- Copy blocks support custom copied text, optional copy icon, and icon-only presentation.
- Each FAQ box supports per-item width, minimum height, shape, radius, padding, background, border color and border width.
- FAQ title and answer typography can use project-uploaded fonts or GitHub Font Library families.
- The widget embeds selected project fonts and references selected GitHub-hosted fonts for Preview and published output.
- Sandboxed widget iframes request clipboard-write permission; the copy control includes a fallback for browsers where Clipboard API is unavailable.

### Countdown
- Countdown font selector now includes GitHub Font Library families as well as project-uploaded and Google fonts.
- When the GitHub font catalog finishes loading, Countdown Properties refreshes so the newly available families appear.

### Validation
- Modified inline editor scripts and modified external scripts pass Node syntax checks.
- FAQ widget generation tests verify copy controls, icon rendering, buttons, local uploaded fonts, GitHub font rules, per-item box sizing and shape options.
- Full live-device testing is still required for Android Chrome and iOS Safari, especially clipboard permissions and touch gestures.

## V14.9.2 — Supabase + Google Sheets Comments Bridge

- Updated `moza-comments.js` to mirror Supabase comments to the shared Apps Script V21.2 bridge and verify the Sheets write through JSONP.
- Added a separate warning when Supabase accepts a comment but its Google Sheets mirror cannot be confirmed; Supabase remains the display source.
- Added project mapping diagnostics in the Comments connection test.
- Updated Atelier's protected `wsp-sheets` request to include the current `project_id` for automatic project-to-spreadsheet routing.
- Added `Code_GS_V21_2_Moza_Comments_Bridge.gs` and `README-V14.9.2-SUPABASE-SHEETS-COMMENTS.md`.
- The legacy `Code.gs` for bound Google Sheets Only / Manual RSVP remains unchanged.

See `README-V14.9.2-SUPABASE-SHEETS-COMMENTS.md` for deployment and connection instructions. The deployed Supabase `wsp-sheets` Edge Function must forward `project_id` to the bridge; its source was not included in this package, so that pass-through cannot be verified here.
