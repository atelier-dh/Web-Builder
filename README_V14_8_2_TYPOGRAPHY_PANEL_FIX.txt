MOZA STUDIO ADVANCED V14.8.2 — VISUAL FILTER TYPOGRAPHY + INSPECTOR STABILITY
Basis: Moza Studio Advanced V14.8.1 Gallery Restored FULL

PERUBAHAN
1. Font yang bisa dipilih pada Visual Smart Filter mencakup semua font custom yang sudah di-upload melalui Fonts > Upload Font, termasuk font berlisensi milik pengguna. Tidak ada file font pihak ketiga yang didistribusikan dalam paket ini.
2. Cormorant Garamond tersedia sebagai Google web font. The Seasons tersedia jika font berlisensi telah di-upload; jika tidak, fallback serif digunakan.
3. Font family dan ukuran independen: tombol kategori filter di atas, label kategori di dalam kartu, kotak pencarian, dropdown sorting, dan penghitung hasil. Ukuran judul, deskripsi, harga, dan tombol kartu tetap terpisah.
4. Pilihan layout filter/search: sejajar, kategori di atas, kategori di bawah, atau ditumpuk. Juga tersedia alignment, lebar search/sort, tinggi kontrol, spacing, padding, dan corner radius.
5. Mempertahankan status expand/collapse, posisi scroll dan fokus input ketika Properties dirender ulang setelah edit. Berlaku untuk Visual Smart Filter dan Accordion/FAQ.
6. Mewarisi ukuran kategori lama secara kompatibel; tidak memodifikasi data project aktif secara otomatis saat menginstal file ini.

UPGRADE JIKA SUDAH V14.8.1
- GANTI index.html
- GANTI moza-visual-filter.js
- TAMBAH moza-inspector-stability.js
- File lain biarkan. Jangan hapus assets, Uploads, project editable, B2, RSVP, Supabase.
- Commit file GitHub dan refresh browser Ctrl+Shift+R setelah GitHub Pages deploy.

TEST LOKAL
- JavaScript syntax check
- Pengaturan dan style preview di Chromium: font role, ukuran, kategori berbeda, custom uploaded font
- Regresi template widget lama dan filter/search/sort
- Responsive 900, 375, 320 px pada empat variasi layout
- Expand/collapse tetap, kategori, label, card editor, dan label FAQ setelah simpan

BATAS
- Tes end-to-end langsung pada project pengguna, B2, dan GitHub Pages belum dilakukan.
- Google Fonts memerlukan akses internet pada browser pengunjung. Font custom disimpan sebagai data project; optimalkan ukuran file font bila diperlukan.
- Backup project editable dan repository sebelum memperbarui versi produksi.
