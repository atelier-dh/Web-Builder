MOZA STUDIO ADVANCED V14.7.6 — TABLET & MOBILE PERFORMANCE
Based exclusively on V14.7.5 Preview & B2 Fixed Full ZIP.

Files to REPLACE when upgrading from V14.7.5:
  - index.html
  - moza-product-gallery.js

Files to ADD (new):
  - moza-touch-performance.js
  - moza-touch-performance.css

Do NOT delete any other files or your GitHub folders.

CHANGES
• Tablet and mobile editor use Light Mode automatically on compact/coarse-pointer devices.
• Uploads: 24 thumbnails are built initially. Load more in batches of 24.
• Search still scans the entire local image library (including images not yet displayed).
• Product Gallery photo picker and Add Photo frame picker show 24 items at a time.
• Canvas image decoding and embedded iframes are flagged lazy; editor video preloading is reduced.
• Continuous animations in *offscreen* editor sections are paused, then resume when visible.
• Status bar has a Light Mode On/Off toggle on touch/compact devices.
• Preview, exported/published website, cloud/B2/RSVP and saved project JSON are unchanged.
• All assets stay in project storage; this upgrade never deletes or recompresses user media.

LIMITS
• Desktop untouched unless user explicitly toggles Light Mode.
• This does not make every 2,000+-element design instant on low-memory hardware.
• Large embedded HTML, background video, numerous fonts and unusually large images
  can still be slow. Back up before deployment.
• Test in the actual Android/iPad browser and with real cloud data before production.
• Isolated test runner logs `Failed to construct URL: Invalid URL` because it has
  no hosting origin; this is not a tested production URL error.

QA
• JS syntax checks: PASS (index inline script, product gallery, touch performance)
• Chromium mobile 390px / tablet 820px / desktop 1440px: PASS
• 64 images: initial 24 (mobile+tablet), 48 after Load More, full 64 preserved: PASS
• Search image 64 despite initial 24: PASS
• Product gallery images: 24 initially, 48 after Load More: PASS
• Website HTML does not include the optimization module: PASS
• Live GitHub Pages and physical devices: NOT TESTED

DEPLOY
1. Backup repository and editable Moza projects first.
2. Extract PATCH and place the four website files alongside the current index.html.
3. Overwrite exactly the two existing files and add exactly the two new files.
4. Commit. Wait for GitHub Pages deployment to complete.
5. Refresh with Ctrl+Shift+R. On mobile, close/reopen the browser tab if it caches old JS.
6. Test Uploads > Search, Photo Gallery, Properties, Preview, and saving on a copy.
