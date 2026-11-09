MOZA STUDIO ADVANCED V14.8.7 — PREVIEW ROUTING & SMART FILTER STABILITY
Source: V14.8.6 SECTION_COPY_FULL (not an older release).

What changed
1) moza-cross-project.js
   - Load linked project page/section metadata before HTML Preview render, so deep-link href is not empty.
   - In cross-project Preview, intercept relative and same-host absolute project URLs.
   - Resolve links within a virtual Combined Website ZIP structure, even before deployment.
   - Prevent unrecognized local project links from loading a GitHub Pages 404 iframe.
   - Keep #/page navigation within the active project, and handle widget page/section messages.
   - Published site / Combined Website export behavior was not intentionally changed.

2) moza-visual-filter.js
   - Editing a card, size, font or color no longer remounts the whole editing canvas.
   - Refresh the selected widget iframe after a short delay; retain Undo and native Save.
   - Populate image dropdowns when used rather than for all cards immediately.
   - Resolve full image preview only for expanded card editor panels.
   - Keep the same item photos, IDs, links, styling, and original widget data.

INSTALL (if currently on V14.8.6)
Back up the existing GitHub repository AND export a current Editable Project backup.
Replace only these two files in the SAME location as index.html:
  moza-cross-project.js
  moza-visual-filter.js
Do not delete index.html, media assets, B2 integrations, RSVP, carousel JS/CSS, or other files.
Commit, wait for GitHub Pages deployment, then hard-refresh.

TEST CHECKLIST
- Open Preview: Project A -> Project B -> specific page/section -> Back.
- Test internal #/page links, including invalid links (should show notice, not 404).
- Select an existing Visual Smart Filter with photos, open a card, edit fields twice,
  then confirm its image, values, and expanded panel are still intact.
- Test saving, reopening the same project, and ensure existing photos remain.

VERIFICATION SCOPE
Syntax check and isolated Chromium routing/editor tests passed.
Not tested on user's actual Digital Haus project, B2 credentials, or GitHub Pages deployment.
If Preview still fails, share an Editable Project ZIP and a reproducible page/link case.
