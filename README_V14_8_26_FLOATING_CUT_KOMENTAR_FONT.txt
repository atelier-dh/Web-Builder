MOZA STUDIO V14.8.26 (basis V14.8.25)

1) Floating Asset: ukuran terpisah Desktop / Tablet / Mobile (+ "Skala otomatis dari Desktop", "Samakan semua").
2) Remove BG & Magic Grab (Cut Studio): tidak lagi tertutup top bar (z-index) dan toolbar dikelompokkan.
3) BARU - Elemen "Ucapan & Doa" (komentar langsung di web): file moza-comments.js + Code.gs baru.
   Ikut koneksi RSVP manual otomatis (satu spreadsheet, tab Comments); tanpa RSVP = tidak tampil. Opsi menampilkan pesan RSVP.
   Lihat PANDUAN_KOMENTAR_V14_8_26.txt.
4) FIX FONT berubah di Preview/deploy (beda dari canvas):
   Penyebab: usedFonts() hanya membaca st.ff, font countdown & tema. Font yang dipilih di tempat lain (tombol & label form RSVP,
   tipografi amplop, teks slide carousel, dan modul/elemen baru) TIDAK dimuat di Preview/website, padahal canvas editor memuat
   semua font Google sekaligus -> terlihat benar di canvas, tapi jatuh ke font cadangan di Preview/deploy. Font upload yang hanya
   dipakai di tempat itu juga tidak ikut ke ZIP.
   Perbaikan: usedFonts() kini memindai SELURUH dokumen untuk setiap nama font yang dikenal (Google, font upload, font GitHub),
   sehingga font di mana pun ikut dimuat/diekspor. Tidak mengubah desain; dokumen kosong tetap hanya memuat font tema.
   Tambahan: file font .ttf/.otf di ZIP kini berekstensi benar (sebelumnya .bin).
   UJI: 7 font di 4 jenis elemen -> semua ter-link; font-family tiap elemen canvas = hasil publish; ZIP dengan font upload valid.
