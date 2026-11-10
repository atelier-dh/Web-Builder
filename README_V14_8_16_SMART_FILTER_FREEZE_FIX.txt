MOZA STUDIO V14.8.16 — FIX "PAGE UNRESPONSIVE" / EDITOR FREEZE WITH VISUAL SMART FILTER
Targeted patch on V14.8.15. No rebuild, no change to project storage format.

ROOT CAUSES (reproduced with a 30-card Smart Filter and large photos)
1. Inspector "Advanced Embed" put the ENTIRE generated widget code (tens of MB, because card images are inlined
   as base64) into a <textarea> through esc() on EVERY inspector render -> ~4.5 s freeze per click/edit.
2. Card images were inlined at full original size, making the widget, every Undo snapshot, every autosave and
   every iframe reload huge.

FIXES
- index.html: for a Smart Filter (or any widget > 1.5 MB) the Advanced Embed panel shows a short notice with the
  code size instead of the giant textarea.
- moza-visual-filter.js: on UPLOAD each distinct card image is downscaled once to max 960px wide (WebP, JPEG fallback).
  Originals in Uploads are NOT modified. UPLOAD is async, shows "Memproses...", and ignores double clicks.
- Cache key for moza-visual-filter.js bumped to 14_8_16.

MEASURED (headless Chromium, 30 cards, 8 photos 3000x2000, ~13 MB of originals)
                      before        after
  widget code size    ~20-50 MB     1.4 MB
  inspector render    4,576 ms      37 ms
  Undo snapshot       102 ms        11 ms
  autosave            1,593 ms      161 ms
  canvas render       410 ms        56 ms

IMPORTANT FOR YOUR EXISTING PROJECT
- Replace the whole website package, hard-refresh once.
- Open "Website Digital Haus Fix", select each Smart Filter and press UPLOAD ONCE so the old heavy widget code
  is regenerated in the small form. Until then the stored old code is still large (but the editor no longer
  freezes on selecting it).
- Press UPLOAD only after finishing all card edits.
- Still untested: your real data on the live site and real tablets/phones.
