MOZA STUDIO V14.7.2 — PREVIEW LAYER FIX
Base: Moza Studio Advanced V14.7.1 Cross-Project Preview Full.

BUG: Editor top toolbar had z-index:1200 while the full-screen Preview overlay had z-index:500. On opening Preview, the editor toolbar remained visually above the Preview header, giving the impression that Preview stayed in Design mode or was covered.

FIX: Raise #pv.show to z-index:20000 and isolate its stacking context. Preserve the Preview iframe, in-app project navigation, and video viewer overlay layering. Update the module version marker only; do not change project data, HTML renderer, carousel, or exports.

UPGRADE FROM V14.7.1:
1. Backup the deployed moza-cross-project.js.
2. Replace ONLY moza-cross-project.js in the same folder as index.html.
3. Commit on GitHub or upload to hosting.
4. Wait for deployment; then hard-refresh (Ctrl+Shift+R).
5. Open Moza, choose Preview: the dark Preview header should appear above the editor. Test cross-project navigation and Close.

TESTED: JavaScript syntax; browser click of Preview; overlay layering; main->linked->main navigation; preview Back; no editor project mutation.
LIMITATION: Deployed GitHub Pages and the user's specific project were not directly tested. A browser test under a standalone inline document logged an invalid-URL warning from the local test environment.
