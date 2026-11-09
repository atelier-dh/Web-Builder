MOZA STUDIO V14.8.13
PREVIEW + PERFORMANCE + MOBILE RESPONSIVE FIX

WHAT CHANGED

1. PREVIEW RELIABILITY
- Preview rendering now returns a Promise so the render lifecycle can be awaited by callers.
- Preview status remains visible while the iframe loads.
- If the cross-project preview bridge fails for the project currently being edited, Moza falls back to the original single-project srcdoc renderer instead of leaving a blank preview. Cross-project navigation is disabled only in that fallback state.
- Large preview media are now requested on demand. Visible and near-visible media load first; off-screen media wait until they approach the viewport.
- Preview media requests are limited to four concurrent transfers to reduce browser memory spikes.
- The mobile preview toolbar no longer displays the Desktop/Tablet/Mobile switch row on phones. Page/project selectors and actions wrap within the viewport.

2. PERFORMANCE
- The image-frame decorator no longer calls findEl() for every canvas element. It builds one page-local Map and performs O(n) lookups instead of repeated project-wide searches.
- Prototype connection rendering also resolves DOM nodes through one Map per render.
- Touch/mobile media optimization is batched with requestAnimationFrame. The IntersectionObserver is reused instead of disconnected and recreated on every canvas render.
- Off-screen sections are resolved with a Map instead of repeated Array.find() scans.

3. RESPONSIVE MOBILE
- Added “Terapkan Auto Fit Mobile ke Semua Halaman” under Responsive Sync.
- The action clears Mobile-only geometry, font, section-height, and responsive-group base overrides across the project, then enables proportional Desktop Master sync.
- Desktop and Tablet values are preserved. The action is undoable.
- The selected-element Mobile Fit action remains available separately.

DEPLOYMENT
- Replace the previous package with this complete ZIP. Keep the folder structure and all sidecar CSS/JS files.
- Updated script and stylesheet URLs use the V14.8.13 cache key. After deployment, perform a hard refresh once.
- Before using project-wide Auto Fit Mobile on a project with custom mobile layouts, save a backup. The action intentionally removes those Mobile-only overrides; Undo is available in the editor.

QA NOTES
- All external JavaScript files and both inline JavaScript blocks pass Node syntax checks.
- Chromium mobile viewport checks at 320, 360, 375, 390, 430, and 600 CSS pixels showed no document-level horizontal overflow. The preview iframe stays within the viewport; the device-switch row is hidden on mobile.
- At 390px width, the preview header reduced from about 184px to about 100px in the isolated test page.
- Auto Fit Mobile test confirmed that bp.m and _groupBase.m overrides are removed and proportional Mobile geometry inherits from Desktop. Desktop and Tablet data remain unchanged.
- Preview media test confirmed that a visible large image loads immediately, an off-screen image remains a lightweight placeholder, and the image loads when scrolled into view.
- Synthetic 2,000-element test: three calls to decorateFrames() fell from about 48.7ms to 3.4ms. Full canvas render averaged about 176ms before and 165ms after in that synthetic test. Actual timing depends on project complexity and device hardware.

TEST LIMITATION
- The isolated browser harness uses about:blank, while the app expects a real hosted origin for URL-based features. It reports an invalid-URL warning in that harness. Final acceptance should still include opening Preview on the deployed site and checking the user's actual project data.
