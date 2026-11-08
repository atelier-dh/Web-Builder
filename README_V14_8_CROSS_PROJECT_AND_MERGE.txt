MOZA STUDIO ADVANCED V14.8 — CROSS-PROJECT DEEP LINKS + EDITABLE ZIP MERGE
Baseline: Moza Studio Advanced V14.7.6 (full ZIP).

FEATURE 1 — NAVIGATE TO EXACT PAGE / SECTION IN ANOTHER PROJECT
• Link to → Another Project → Destination page → Destination section (optional).
• Also available in Prototype / Interactions → Navigate to another project.
• Existing Link to surfaces: buttons, links, linked images, navigation items,
  Floating Assets, and Visual Smart Filter card buttons.
• Page/section menus load the selected project's LOCAL editable record.
• Combined Website ZIP writes relative URLs with the target page/section hash.
• Cross-project Preview routes to the exact destination and retains Back.
• Export validates missing project/page/section links rather than silently landing
  on the cover. Projects must be selected in Combined Website ZIP.

FEATURE 2 — MERGE MULTIPLE EDITABLE ZIP BACKUPS INTO ONE PROJECT
• Open Projects → Merge Editable ZIPs… (also in the ☰ menu).
• Select 1 or more Moza Editable Project ZIP files. NOT public deploy ZIPs.
• Check a read-only summary; download a backup of the current project.
• Confirm the checkbox and click Merge into Current Project.
• Imports additional pages/sections/layers/media/fonts plus Moza design-system
  styles, variants, variables, and components.
• Conflicting object IDs and page slugs are remapped; internal image refs follow.
• Current project's theme, default navigation, RSVP settings, cloud connection,
  original pages, and original project ID remain unchanged.
• Importing a separate project's GLOBAL floating navigation is deliberately
  not automatic: such elements would otherwise unexpectedly appear on every page.
• Merge runs in local project storage. It does not upload ZIP media to B2 or
  alter a Supabase / Google Sheets configuration.
• Local storage quota and RAM can limit large multi-ZIP merges. Use desktop and
  always retain the backup. ZIPs may contain sensitive design/customer content;
  do not upload editable backups to public GitHub repositories.

IMPORTANT
• Existing project links remain project links after MERGE. Where desired, change
  them to local Page/Section navigation in the newly merged project.
• Imported pages inherit the active project's global theme and navigation unless
  the imported page contains its own page-level navigation.
• Old behavior (open an editable ZIP as a separate new project) is unchanged.
• Normal standalone website export and Combined Website ZIP remain distinct from
  editable project backup ZIP.

HOW TO UPGRADE FROM V14.7.6
1. Backup repository (GitHub → Code → Download ZIP) and your editable project.
2. Replace these 3 existing website files:
   - index.html
   - moza-cross-project.js
   - moza-visual-filter.js
3. Add this NEW website file:
   - moza-editable-merge.js
4. Leave ALL OTHER files and folders unchanged.
5. Commit to GitHub and test using staging or a backup project first.
6. Refresh browser with Ctrl+Shift+R after GitHub Pages finishes deployment.

LOCAL TESTS
• Syntax checks on all changed JS and the embedded source script: passed.
• Chrome isolated Link to / Interactions dependent page+section options: passed.
• Combined Website ZIP link to exact other-project page and section: passed.
• Two editable ZIP merge: page and slug collision remap; image ref remap: passed
  with mocked successful local storage writes.
• Normal persistent local storage, B2, and real GitHub Pages are NOT verified
  in the isolated test harness. Validate before production.
