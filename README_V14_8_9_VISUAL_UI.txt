MOZA STUDIO V14.8.9 — RESTORE VISUAL SMART FILTER INSPECTOR
Based strictly on V14.8.8 STABLE_BEHAVIOR FULL.

Why the panel could become the old V8 editor:
- The app loads both moza-smart-filter.js (legacy V8) and moza-visual-filter.js (V14).
- Both modules can contribute a Properties inspector for the same saved widget.
- If moza-visual-filter.js fails to load (404/cache/script error), the V8 editor is the fallback.

Changes (2 JS files + one HTML cache-buster):
1) moza-smart-filter.js — show legacy panel only if Visual editor isn't initialized.
2) moza-visual-filter.js — remove any duplicate old panel, display the Visual panel
   where the old panel was, preserve widget configuration and old action handlers.
3) index.html — load the two updated scripts with a versioned URL so GitHub Pages
   and Chrome do not silently reuse stale JavaScript.

DEPLOY ONLY IF currently installed V14.8.8 FULL:
1) Backup GitHub repo AND editable project ZIP.
2) Overwrite both JS files AND index.html in GitHub Pages.
3) Wait for GitHub Pages deployment then hard reload.
4) Click the existing Smart Filter widget: Properties should show
   'Visual Smart Filter V14' and 'Design & Typography', and NOT the old
   'Update HTML Widget' interface.
5) Make two edits to an already-open card. It should remain open.

IF THE OLD EDITOR STILL APPEARS, OPEN DEVTOOLS > NETWORK AND CHECK
moza-visual-filter.js (HTTP 200) AND CONSOLE FOR JAVASCRIPT ERRORS.
Do not delete the widget, clear browser site data, or rebuild card content.

Not changed: all project data, Supabase, B2, RSVP,
carousel, preview navigation, HTML publishing, or other app modules.

This is a targeted compatibility fix and not proof the 2,000+ element
Digital Haus project runs without lag. Test in a backup first.
