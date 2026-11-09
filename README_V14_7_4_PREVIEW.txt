MOZA STUDIO V14.7.4 — PREVIEW "INVALID STRING LENGTH" HOTFIX
BASE: V14.7.3 Preview + Etsy/Shopee Gallery

CHANGED WEBSITE FILE:
  moza-cross-project.js (replace existing file with this version)

Preview now compiles only the selected page instead of every page at once.
Large uploaded images, videos and fonts are loaded via the isolated iframe
using on-demand messages so repeated data URLs do not blow up generated HTML.
Page selector, another-project navigation, Back and existing carousel remain.

NO CHANGE: editor data, RSVP, Supabase, publish/website ZIP export code,
index.html, CSS, other JavaScript. Backup and overwrite only the named file.

LIMITS: This patch is tested with synthetic large asset project in Chromium.
It cannot diagnose the exact saved browser project from a screenshot alone.
External embeds/inline HTML that contain enormous embedded data can still
exceed browser limits. In that case, export the editable project backup for
focused debugging; do not delete browser data.
