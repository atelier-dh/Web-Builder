MOZA STUDIO V14.8.1 — PRODUCT PHOTO GALLERY VISIBILITY HOTFIX

BASE: Moza Studio Advanced V14.8 Cross-Project Merge (FULL)

WHAT WAS CHECKED
- Product Photo Gallery (Etsy/Shopee style) is already present in V14.8's complete package.
- If the deployed editor has no gallery, check the presence of moza-product-gallery.js and moza-product-gallery.css in the same directory as index.html.
- Previously the add button was present in Elements but not in the Konten Dinamis group.

THIS FIX
- Adds one visible 'Product Photo Carousel · Etsy / Shopee' button to Elements > Konten Dinamis.
- Retains the existing gallery in the Elements area, image picker, thumbs, swipe, arrows and zoom.
- Does NOT replace the original Carousel, Cross-Project navigation, editable-merge, RSVP, B2, or any project data.

GITHUB PAGES UPDATE FROM V14.8
1. Download/backup your repository first.
2. Replace moza-product-gallery.js in the same folder as index.html.
3. Upload moza-product-gallery.css ONLY if it is missing (or overwrite with included same CSS).
4. Do not delete or replace any other Moza files.
5. Commit and reload with Ctrl+Shift+R; check Elements > Konten Dinamis.

If the gallery still does not appear, open Chrome DevTools > Network and check for a 404 response for moza-product-gallery.js or moza-product-gallery.css. Both must be deployed alongside index.html.

TESTS: JS syntax; isolated Chromium Elements > Konten Dinamis insertion; repeat rendering (no duplicate); click creates productgallery; ZIP integrity.
LIMITATION: Not directly tested on your live GitHub Pages or your actual saved projects.
