MOZA STUDIO V14.8.25 - PERBAIKAN ARSITEKTUR EKSPOR (basis V14.8.24)
=====================================================================
Masalah: Combined Website ZIP gagal "Invalid string length" karena seluruh gambar (base64) dibenamkan di HTML
tiap kali dipakai, lalu dipisah dengan regex SESUDAH string raksasa jadi.

TAHAP A - ekspor berbasis token (moza-export-media.js)
  Saat ekspor, assetSrc/vidSrc/font/musik/embed mengembalikan penanda "moza-asset://<n>". HTML kecil. Tiap aset di-decode
  SATU kali, di-hash SHA-256, ditulis satu file di assets/<hash12>.<ext> (dipakai bersama semua halaman & proyek).
  Preview, editor, dan ekspor HTML tunggal tidak berubah (tetap data: URI).
TAHAP B - ZIP besar yang aman
  - index.html: A33ZipWriter (Blob parts, tanpa satu ArrayBuffer raksasa); a33Zip memakainya. CRC32 lebih cepat.
  - moza-cross-project.js exportCombined: fase 1 hanya struktur dokumen (cek link); fase 2 muat->bangun->tulis->lepas per proyek.
  - Batas 80/350/450 MB dihapus. Tersisa batas mesin (string JS, ZIP klasik 4 GB) + peringatan (HTML>25 MB, ZIP>700 MB).
  - Pesan error menyebut proyek/halaman/aset + saran. Ekspor gagal tidak mengubah proyek asli.
TAHAP C - optimasi dari sumber (moza-image-tools.js, objek window.MZI)
  - Tombol "Optimasi gambar proyek" di tab Uploads: daftar aset (ukuran, pemakaian, sesudah), Analisis, kompres
    (mode Ganti / Simpan asli), Gabungkan aset kembar (hemat MB), kualitas thumbnail Smart Filter, "Ringkas Smart Filter lama".
  - Upload: hash isi; gambar identik memakai ulang aset lama. Gambar > 2 MB: tawaran kompres otomatis (JPEG/WebP ~82, lebar maks 1920;
    PNG transparan -> WebP alpha / PNG). Import HTML ikut dedup.
  - Smart Filter: kartu menyimpan referensi aset + thumbnail (a.thumb); embedCode memuat "moza-thumb://<id>", bukan data gambar.
    Preview/editor/ekspor HTML tunggal mengubahnya kembali ke data URI; ekspor ZIP menulis file thumbnail saja (asli 4-7 MB tidak ikut).
  - Salin section/halaman: clipboard & localStorage hanya berisi REFERENSI (data dibaca dari proyek sumber saat tempel; hash sama = pakai ulang).
    Duplikat proyek memakai ulang rekaman media IndexedDB (tidak menyalin data).
HASIL UKUR (Chromium headless, sandbox 4 GB)
  Skenario                                   Sebelum (V14.8.24, dari catatan)   Sesudah
  3 proyek, 10 aset/30 pakai, embed 21 MB    14,1 dtk, heap 681 MB, ZIP 76,6 MB  2,8-2,9 dtk, heap 142-161 MB
  3 proyek, 10 aset/60 pakai                 tab crash                           3,1 dtk, heap 131 MB
  3 proyek, 100 aset(3-5 MB)/~3000 pakai,    (tidak bisa)                        7,1 dtk, heap 197 MB, ZIP 402,9 MB,
  11 halaman, embed ~20 MB                                                       HTML 1,91+0,52+0,35 MB
  Smart Filter 6 kartu (1300 px)             embed ~4,3 MB inline                embed 20 KB; ZIP 2 thumbnail WebP ~0,55 MB
  Heap = heap JS saja (memori Blob tidak terukur).
TES LOLOS: kesetaraan HTML lama/baru; ZIP tunggal (CRC); error (RangeError, aset rusak, embed besar, link hilang) + proyek tidak berubah;
  dedup/kompres/gabung; clip hanya referensi (2,5 KB vs ~4 MB), tempel 2x tak menambah aset, hash sama dipakai ulang, duplikat proyek
  tanpa rekaman media baru; upload nyata + tawaran kompres; Preview A->B->Back, link rusak -> pesan jelas; situs hasil ZIP lewat
  http.server tanpa 404 (1280 & 390), gambar di dalam iframe Smart Filter termuat (termasuk ../../assets/), link A->B->Back; ZIP Editable valid.
BELUM TERUJI: browser HP, Safari/Firefox (canvas WebP encode di Safari jatuh ke PNG), proyek asli pengguna, GitHub Pages, ZIP > 1 GB,
  font & video nyata di ZIP, paste lintas-sesi setelah proyek sumber dihapus (pesan "aset tidak ditemukan").
SENGAJA TIDAK DIUBAH: ekspor HTML tunggal (batas 95 MB tetap), format ZIP klasik (tanpa ZIP64), penyimpanan template/JSON backup,
  siteHTML tetap membangun satu string per proyek (kecil berkat token).
CATATAN: Gabungkan aset kembar mereset Undo. Nama file ekspor = hash isi (bukan ID aset) agar isi identik lintas proyek jadi satu file.
Cache key dinaikkan: moza-export-media/cross-project/image-tools/visual-filter ?v=14_8_25b.
USULAN LANJUTAN: ZIP64 + streaming ke disk (File System Access API), build per halaman, uji di HP.
