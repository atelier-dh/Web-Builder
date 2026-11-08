MOZA STUDIO ADVANCED V14.7.5 — PREVIEW + B2 MEDIA HOTFIX
Basis: Moza Studio V14.7.4 PREVIEW OPTIMIZED (bukan V14.6.1).

UPGRADE V14.7.4 -> V14.7.5 (tanpa menghapus file lain di GitHub):
1. Backup repository dan backup project editable terlebih dulu.
2. Ganti dua file di root GitHub Pages: index.html dan moza-cross-project.js.
3. Commit changes; cek GitHub Actions/Pages deployment selesai.
4. Refresh website dengan Ctrl+Shift+R; lakukan tes pada project cadangan.

PERBAIKAN:
- Review B2 menghitung gambar/video yang direferensikan oleh dokumen desain,
  bukan semua library uploads. Video yang hanya tersimpan di Uploads tidak dikirim
  saat menyimpan revisi baru ke B2. Data dalam Uploads browser tidak dihapus.
- Penting: media yang TIDAK dipakai dan TIDAK disimpan ke B2 hanya ada di browser
  lokal. Jika ingin mempertahankan library penuh lintas perangkat, ekspor backup
  project editable/JSON lengkap secara terpisah sebelum mengubah perangkat.
- Preview gambar besar: cegah pesan error carousel prematur selama gambar masih
  diambil oleh jembatan media iframe. Foto asli tetap digunakan setelah dimuat.
- Preview halaman: tombol internal / section dan Smart Filter ditangani oleh
  routing Preview dari dokumen lengkap walau hanya halaman aktif dirender.
  Link halaman tak valid menampilkan peringatan, bukan diam-diam ke cover.
- Preview antar-project dan Combined Website ZIP dipertahankan.

YANG DIUJI SECARA LOKAL:
- Media asset besar di carousel tampil, tanpa error palsu sebelum dimuat.
- Navigasi Page1 -> Page2, Main -> linked project -> Back.
- Project uji 5 halaman x 36 gambar, preview tetap memuat 1 halaman.
- Filter gambar/video terpakai vs library saja pada snapshot B2.
- Sintaks JS dan integritas ZIP.

BATAS PENGUJIAN:
- Belum dites dengan proyek Digital Haus asli, B2 live, atau GitHub Pages akun pengguna.
- Jika suatu gambar BENAR-BENAR hilang (URL private expired / file B2 terhapus),
  mengganti loading flow tidak memulihkan file. Perlu cek asset di Uploads/B2.
- Jangan upload Code.gs, project editable backup, atau token cloud ke GitHub publik.
