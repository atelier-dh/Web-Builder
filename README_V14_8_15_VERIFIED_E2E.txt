MOZA STUDIO V14.8.15 — VERIFIED PREVIEW LINKING + SMART FILTER (targeted patch on V14.8.14)

Basis: the V14.8.14 ZIP. Nothing rebuilt; 3 small fixes found by an actual browser test.

FIXES
1. Preview page selector ("Halaman") was left EMPTY when previewing a linked project (Project B).
   Cause: a legacy message handler in index.html matched the page slug against the project being EDITED
   (Project A) and overwrote the selector. It now ignores messages while another project is previewed.
   moza-cross-project.js also re-syncs the selector once the preview is ready.
2. Mobile/touch startup error "Cannot read properties of null (reading 'pages')" after reload
   (moza-v14.8.3-performance.js, optimizeSections called before a project was loaded). Now guarded.
3. Cache keys bumped to 14_8_15 for the two changed scripts. Hard-refresh once after deploy.

VERIFIED (headless Chromium, real app served over http://localhost, desktop 1280x800 and mobile 390x844)
- Preview Project A -> click Project Linking button -> Preview Project B shows B's real content (not blank)
  -> Back returns to A (history count 1 -> 0). Same for a Smart Filter CARD link (nested iframe).
- Link config persists after UPLOAD, save and a full page reload (linkType/target/targetPage still set).
- Smart Filter: editing a card keeps the old embedCode and sets "pending"; UPLOAD renders once, clears pending.
- Smart Filter scaling at 900/600/320 CSS px: heading 16.0 -> 13.5 -> 14.8px, buttons and gaps scale too
  (mobile uses its own baseline so text stays legible); no horizontal overflow at any width.
- node --check passes on every .js file and on both inline blocks of index.html.

NOT VERIFIED HERE (needs your acceptance test)
- Real iPad/Android touch, your real projects, GitHub Pages / combined-ZIP deployment, Supabase/B2.
- Preview linking works only if Project B exists in the SAME browser's local project store.
