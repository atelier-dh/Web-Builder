MOZA STUDIO V14.8.14 — MANUAL SMART FILTER UPLOAD + PREVIEW LINKING + RESPONSIVE SCALING
Basis: Moza Studio V14.8.13 FULL ZIP. This is a targeted add-on, NOT a rebuild.

CHANGES
1. Manual Smart Filter rendering:
   - Editing cards, filter options, images, labels, colors and project destinations now saves a draft without regenerating embedCode/iframe.
   - Click "⬆ UPLOAD · Render Smart Filter" in the widget Properties inspector to apply all draft settings together.
   - Pending indicator clearly distinguishes draft data from the last rendered version.
   - The UPLOAD button builds one widget HTML snapshot, preserves old render if generation fails, then updates only its iframe.
   - Undo and the pre-existing local autosave remain enabled. UPLOAD means apply/render widget; it does not send anything to a cloud server.
   - Preview and export show the last uploaded widget version; click UPLOAD before export if you have pending drafts.
2. Cross-project Preview:
   - Target project document metadata loads before deep page/section hrefs are compiled, avoiding dead href="#" from uninitialized cache.
   - Invalid page/section destinations are rejected before changing project/history state.
   - A DOM-ready handshake updates status when an iframe is ready, even if its load event is delayed.
   - Loading-timeout and failed-linked-project messages are displayed rather than leaving a silent blank preview.
   - Back button returns to the previous project and restores the selected page.
3. Visual Smart Filter proportional scaling:
   - On UPLOAD, records effective Desktop/Tablet/Mobile widget widths using inherited Transfer Sync geometry.
   - Widget internal spacing, typography, controls, borders and buttons use the same width-responsive scale factor rather than just shrinking the iframe box.
   - Mobile uses a mobile-specific baseline to keep text legible instead of reducing a 900px desktop design to tiny text.
   - Live CSS resize calculations do not repeatedly rebuild widget HTML.
4. Mobile:
   - Inherits V14.8.13 responsive fixes. Mobile Smart Filter uses one-column responsive cards where configured and scales at narrower widths.
   - Mobile fitting actions no longer silently regenerate a pending Smart Filter.

DO NOT DELETE your editable projects or manually replace their storage IDs.
UPGRADE: Replace the entire older website package with this ZIP, keeping all CSS/JS sibling files next to index.html.
For an existing project, save an editable project backup before replacing the website package. Hard-refresh once after deployment.

IMPORTANT LIMITS:
- This package does not change server code, Supabase, B2, Google Sheets, project ID format or project persistence format.
- A project's deep link can only be previewed if its target project exists in the SAME BROWSER's local Moza project store (opened/imported and saved previously).
- For public deployment involving multiple projects, use Combined Website ZIP and select all linked projects. Single-project HTML export is not a substitute.
- Existing published files remain unchanged until you explicitly re-export/redeploy.
- Preview tested with synthetic projects in an isolated Chromium browser; live GitHub Pages and production projects require user acceptance testing.
