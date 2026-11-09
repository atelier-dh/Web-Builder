Moza Studio V14.8.23 - Perbaikan toolbar atas editor (patch kecil)

PENYEBAB
- #top.v8-top (index.html baris ~626) adalah grid 3 kolom minmax(205px,1fr) auto minmax(218px,1fr).
  Isi 3 grup (id / controls / actions) butuh ~1457px, tapi kolom dibagi per fr, sehingga
  .v8-actions (rata kanan) meluber ke kiri dan menimpa tab Design/Prototype ("Prototyp").
  Tombol "Properti" disisipkan skrip index.html baris ~7809; "Gabungan" baris ~14902.
- Di <=760px bar flex (overflow:hidden) memotong Preview, Cloud, dan menu ☰ (tidak terjangkau).

PERUBAHAN
- BARU moza-top-toolbar-fix.css: tier responsif (1200-1599 ikon saja untuk Properti/Cloud/Gabungan,
  1200-1359 juga Paste + logo saja; 761-1199 target sentuh 40px, <=900 label jadi ikon;
  <=760 semua muat, Advanced/Preview/Cloud jadi ikon di lebar sempit). >=1600 tidak berubah.
- BARU moza-top-toolbar-fix.js: membungkus "ikon label" jadi span (label disembunyikan CSS), nama lengkap
  tetap di title/aria-label. Idempotent; tidak mengubah aksi/handler.
- index.html: hanya menambah 2 tag (css+js ?v=14_8_23) setelah moza-section-batch-copy.js.
- Tidak ada tombol yang dihapus. Properti tetap tersembunyi di 761-1199 (desain lama) dan dapat dibuka
  lewat tombol "Properties" di status bar / handle tepi kanan.
