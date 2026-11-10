MOZA STUDIO V14.8.26 - Floating Asset per perangkat + perbaikan UI Remove BG / Magic Grab
(basis V14.8.25, hanya index.html yang diubah)

1) FLOATING ASSET - UKURAN TERPISAH PER PERANGKAT
   - Tiap aset kini punya sizes {d,t,m}. Mengubah satu perangkat TIDAK mengubah yang lain.
   - Editor (Floating Assets > Edit): kotak baru "Ukuran per perangkat (px)" berisi Desktop / Tablet / Mobile.
     Perangkat yang sedang aktif di editor diberi tanda "aktif".
   - Perintah baru:
       "Skala otomatis dari Desktop"  -> Tablet 90%, Mobile 75% dari ukuran Desktop
       "Samakan semua"                -> ketiga perangkat = ukuran perangkat yang sedang aktif
   - Tombol - / + di toolbar kecil dan handle tarik (resize) di kanvas hanya mengubah perangkat yang sedang aktif.
     Label toolbar menampilkan mis. "WhatsApp . Mobile 31px".
   - Aset baru dari upload/Uploads otomatis diberi ukuran D 70 / T 63 / M 53 (bisa diubah).
   - Proyek lama aman: aset lama (hanya 'size') tetap sama di semua perangkat sampai kamu mengubahnya.
   - Hasil publish/preview memakai CSS media query (<=1024 tablet, <=640 mobile), jadi ukuran benar tanpa JS.
   - Perbaikan terkait: aset yang disembunyikan di Desktop tapi tampil di Tablet/Mobile (centang D/T/M)
     sebelumnya tidak ikut ter-publish; sekarang tetap ter-render dan disembunyikan per perangkat via CSS.

2) REMOVE BACKGROUND & MAGIC GRAB (Cut Studio) - UI TIDAK LAGI BERTUMPUK
   - Penyebab: top bar Moza dipaksa z-index 1200 (moza-v14.6-canvas-table-editor.js) sedangkan Cut Studio hanya 600,
     sehingga header (Cancel / Apply / Create layers) dan baris alat tertutup top bar.
   - Cut Studio & Trace kini berada di atas semua panel (z-index tinggi, tinggi layar penuh).
   - Toolbar dikelompokkan: ALAT | ATUR (Tolerance, Brush, Whole photo) | AI (Model, Auto Cut) | aksi (Invert, Undo, ...),
     otomatis membungkus ke baris baru; di HP tiap grup satu baris dan area foto tetap luas.
   - Semua tombol/ID/aksi lama tidak diubah.

UJI: sintaks JS lolos; render headless di 3 lebar layar (1400/900/500 px -> 80/50/30 px); Cut Studio dicek di desktop & HP.
