MOZA STUDIO V14.8.11 — STABILITY / PREVIEW / EXPORT FIX

BASE
- Built from Moza Studio V14.8.9.
- V14.8.2 and V14.8.3 were used as comparison references.

CHANGES
1. Visual Smart Filter content edits no longer call afterEdit(), which remounts the full canvas. The selected widget iframe is refreshed after a short debounce; the properties panel is refreshed independently. Undo and autosave still use commit().
2. Local Preview router resolves same-origin absolute project URLs and relative project paths against the local project map, preventing same-site GitHub Pages URLs from escaping to a public 404 route.
3. Visual Smart Filter navigation in Preview now routes project, page, and section destinations through the editor Preview controller.
4. Standalone HTML retains the 95 MB safety limit. Website ZIP no longer inherits that limit; it extracts data-URL media into assets/ and applies explicit limits to rewritten HTML, media, and ZIP size.
5. Combined Website ZIP no longer rejects a project merely because the source HTML contains more than 95 MB of embedded media; it applies limits after media extraction.
6. Script cache-busting updated for modified Visual Smart Filter scripts.

VALIDATION
- JavaScript syntax checks are required before deployment.
- This package has not been tested against a live browser session, GitHub Pages repository, or the user's actual linked-project data. Test with a duplicated project before production deployment.

DEPLOY
- Upload the full contents of this ZIP together; do not upload the ZIP file itself as a single website file.
- Preserve all JS/CSS files and folder structure.
- Hard-refresh the browser after deployment.

QA SUMMARY
- 27 external JavaScript files passed Node syntax validation.
- Automated route tests passed for same-origin absolute URLs, trailing-slash URLs, relative paths, and external-host isolation.
- Automated Visual Smart Filter message tests passed for project/page/section navigation.
- See QA_V14_8_11.txt for scope and limitations.
