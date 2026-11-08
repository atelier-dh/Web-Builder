MOZA STUDIO ADVANCED V14.7.3 — PREVIEW + ETSY/SHOPEE GALLERY
Base: V14.7.1 Cross Project Preview (with V14.7.2 Preview overlay patch).

CHANGE A — Preview: moza-cross-project.js from V14.7.2. Preview overlay must cover the editor toolbar. Cross-project navigation remains intact.
CHANGE B — Product Image Gallery: moza-product-gallery.js + moza-product-gallery.css.
- Added prominent Elements > Product Photo Gallery (Etsy / Shopee) entry, separate from the existing Carousel widget.
- Layout presets: Shopee (thumbnails underneath), Etsy (thumbnails beside main image), Minimal.
- Add multiple photos with the Upload product photos button or choose assets from Uploads.
- Next / Previous arrows, thumbnail select, mobile touch swipe, counter, optional dots.
- Click to zoom image with close, Escape, arrows, and photo number.
- Main image fitting, typography, colors, thumbnail size, radius, title and price customizable in Properties.
- Gallery runtime/CSS included in exported Preview/published HTML; existing carousel untouched.

UPGRADE FROM V14.7.1: backup your three existing files and replace exactly:
  moza-cross-project.js
  moza-product-gallery.js
  moza-product-gallery.css
Leave index.html and all other files alone.
UPGRADE FROM V14.7.2: replace ONLY moza-product-gallery.js and moza-product-gallery.css.

INSTALL: place these files in the same directory as index.html. Commit and wait for your GitHub Pages deployment. Hard refresh with Ctrl+Shift+R.
EDITOR USE: Elements > Product Photo Gallery > Add Etsy / Shopee Gallery. Select it, open Properties, click Upload product photos, choose Gallery style. Use Preview to interact with arrows, thumbnails, swipes, and zoom.

TESTED IN ISOLATED CHROMIUM: add widget, image properties, 3 thumbnails, next/previous, select thumbnail, zoom open/close, exported runtime/CSS, mobile Etsy responsive flow, Preview overlay priority. ZIP integrity/syntax checked. Production GitHub Pages, real users' stored projects, and cloud features not tested. Existing Carousel remains untouched.
