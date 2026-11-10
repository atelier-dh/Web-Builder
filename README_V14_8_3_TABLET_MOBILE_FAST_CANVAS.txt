MOZA STUDIO ADVANCED V14.8.3 — TABLET & MOBILE FAST CANVAS
Base: Moza Studio Advanced V14.8.2 FULL ZIP (not V14.7.x).

UPGRADE FROM V14.8.2:
REPLACE: index.html
ADD: moza-v14.8.3-performance.js
ADD: moza-v14.8.3-performance.css
LEAVE ALONE: every other file, directory and user project.

PERFORMANCE IMPROVEMENTS (EDITOR ONLY)
1. Properties image pickers no longer concatenate all uploaded image data-URLs
   into their HTML on tablet/mobile. They show 24 photos at a time, plus any
   currently selected photo, and a Show more photos button.
2. Canvas sections away from the viewport use browser-native content-visibility
   with responsive intrinsic-size hints, where supported. The active section
   remains fully rendered. This reduces offscreen layout/paint cost.
3. Existing V14.7.6 Light Mode remains the master switch, including uploads
   batches, lazy images/iframes, and paused offscreen editor animation.
   Turning Light Mode OFF restores the full Properties picker and canvas effects.
4. All new optimizations apply to editor UI only. They do not remove, re-encode
   or recompress uploads and do not change project JSON, RSVP, B2, Supabase,
   cross-project links, published HTML or export ZIP layout.

CHANGES ARE CONSERVATIVE:
- This update does NOT make 2,000+ element projects as fast as Canva on every
  low-memory phone/tablet; browser memory limits and media sizes still matter.
- On tablets/phones with dense pages, expect better scrolling/responsiveness
  primarily when sections are offscreen or when opening image pickers.
- No performance promise for real hardware without benchmarking that device.

QA (local isolated Chromium)
- Mobile 390px and tablet 820px: Light Mode enabled; canvas virtualization active.
- Desktop 1400px: old full quality mode remains default.
- 96 image Uploads: initial 24 mobile/tablet; desktop shows 96.
- Properties with 100 images: first 24 + selected, then 48 + selected on Show more.
- Switching Light Mode off restores all 100 images; switching it on re-enables batching.
- Selection keeps currently chosen asset visible even when it is photo #83.
- Project assets count stays identical before/after optimized render.
- Exported site HTML contains none of the editor-only optimization markup.
- JavaScript syntax validated; the complete ZIP passed CRC integrity validation.
- A known originless-browser test warning, "Failed to construct 'URL': Invalid URL",
  can appear from existing app functionality when using about:blank in tests.
- Real iPad/Android device and live GitHub Pages: NOT TESTED.

DEPLOY (GITHUB PAGES)
1. Back up the repository (Code > Download ZIP) and your editable projects.
2. Unzip the upgrade package and upload 3 website files to the same folder
   as your active index.html. Overwrite only index.html.
3. Commit to main. Wait until Pages deployment finishes, then hard-refresh.
4. Test light mode, Properties image picker, canvas scrolling, project saving,
   preview, cross-project navigation, and published output on a copy.
5. To temporarily disable the optimization, use the existing Light Mode toggle.
