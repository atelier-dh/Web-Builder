# Google Sheets Only — Manual Apps Script (V13)

Mode ini **tidak memerlukan Supabase** dan tidak menghapus mode Client Dashboard Only, Dashboard + Google Sheets, atau Sheets Only (integrasi server) yang sudah ada.

1. Buat Google Spreadsheet baru untuk tiap undangan. Buka **Extensions → Apps Script**. Tempel seluruh isi `Code.gs` dari paket V13. Jika script berdiri sendiri (bukan terikat dengan spreadsheet), masukkan Spreadsheet ID ke `MOZA_RSVP_V13.SPREADSHEET_ID`.
2. Pilih **Deploy → New deployment → Web app**, **Execute as: Me** dan **Who has access: Anyone** untuk menerima submit tamu tanpa login Google. Berikan izin Google saat diminta. Salin URL deployment **/exec** (bukan `/dev`). Jangan menempel spreadsheet URL; yang dibutuhkan URL Web App.
3. Di Moza V13 buka **Advanced → RSVP · Google Sheets Manual**. Pilih *Main RSVP* atau *Additional RSVP*, aktifkan mode manual, tempel URL /exec, isi worksheet/tab, kemudian **Save URL & destination**.
4. Untuk *Additional RSVP*, buka **RSVP Visual Editor → RSVP Management → Save & Sync all forms** setelah menyimpan URL, karena modul lama membutuhkan status sinkronisasi lokal. *Main RSVP* tidak membutuhkan sinkronisasi Supabase.
5. Simpan project, **Export HTML**, deploy, lalu tes RSVP dari situs staging. Buka Google Sheet dan pastikan baris baru muncul di tab yang benar. Jika tes dikirim, sebuah tab akan dibuat otomatis.

**Perilaku dan batasan**

- Setiap form bisa menggunakan nama tab berbeda dalam satu spreadsheet; endpoint yang sama dapat dipakai beberapa form.
- Responses ditulis dengan request ID unik, sehingga duplikat karena retry dibatasi. `doGet?action=status` hanya mengonfirmasi apakah ID ditemukan tanpa membuka isi RSVP.
- Pertanyaan dinamis tersimpan sebagai JSON di kolom `Answers JSON`, dengan kolom utama untuk nama, attendance, guest count, dan message.
- Apps Script publik tidak memiliki autentikasi per tamu; URL bisa disalahgunakan. Gunakan reCAPTCHA / pembatasan akses tambahan jika membutuhkan perlindungan anti-spam yang kuat. Jangan menyimpan informasi sensitif di RSVP.
- Bila Google Apps Script mengembalikan pesan gagal verifikasi setelah POST, cek spreadsheet: koneksi/redirect browser bisa gagal walau baris berhasil ditulis.
- Mode manual mengirim ke Google Sheets, **bukan otomatis menampilkan data di Client Panel**. Client Panel yang sudah ada tetap menggunakan jalur servernya sendiri.
- Setiap kali mengedit script setelah deploy, buat **New version** pada deployment lalu uji kembali.
