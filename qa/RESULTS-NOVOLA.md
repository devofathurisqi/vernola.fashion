# Verifikasi Novola 1 November 2026

Perubahan ini menggantikan status brand/akun serta jumlah produk dalam laporan V1 sampai V3 sebelumnya.

- Brand online Novola.fashion, username novola, dan kata sandi yang diminta pemilik sudah diterapkan serta diuji login. Alias Auth dan slug teknis lama dipertahankan agar env Vercel tidak berubah. Tidak ada SQL Editor yang dibutuhkan.
- 27 listing Vuyama di toko ini dihapus setelah backup lokal. Public bootstrap dan dashboard sama-sama melaporkan 4 produk. Seluruh 27 master Vuyama tetap dapat dibaca dan tidak terhapus. Foto master dan tenant lain tidak diubah.
- Mode preview juga hanya 4 contoh. Kategori publik yang kosong disembunyikan tanpa menghapus kategori admin.
- Semua teks UI, title/meta, pesan WhatsApp, favicon, monogram dan logo telah memakai Novola. Login browser menggunakan username baru berhasil; editor, kategori dan pengaturan dapat dibuka. Tidak ada perubahan produk yang disimpan selama pengambilan gambar.
- Verifikasi hosted lolos: login, bootstrap ringkas, full detail/variant count, master read-only, anonymous admin-context denial, temporary draft/category create/update/delete, anonymous draft denial, conflict revision, kategori terpakai tidak bisa dihapus, WebP upload/public retrieval, audit. Record dan foto QA dibersihkan, audit dipertahankan.
- npm test: 17 lulus. Production build dan verifier lulus; tidak ada password/secret di bundle. Admin dan SDK tetap dimuat terpisah. Preview dataset kini 0,97 KB gzip, sebelumnya sekitar 17 KB.
- Video final: 1080 x 1920, 30 fps, 34 detik, H.264 + AAC, faststart, 2.488.691 byte. Decode penuh video/audio lulus. Audio terukur -13,97 LUFS dengan true peak -1,97 dBTP. Tujuh frame kunci diperiksa untuk teks, crop, keterbacaan dan kesesuaian nama.
- Panduan klien: 7 halaman, 368.963 byte. Seluruh halaman dirender ke PNG dengan Poppler dan diperiksa; tidak ada clipping, overlap, atau password. Materi menjelaskan harga/stok contoh perlu diisi, stok manual dan pemesanan melalui WhatsApp.

Materi final ada di deliverables/ dan docs/Panduan-Klien-Novola-Fashion.pdf. Sumber panduan yang dapat diperbarui ada di docs/PANDUAN-KLIEN.md. Tidak ada pesan WhatsApp yang dikirim dalam pengujian atau pembuatan video. Build lokal dan push tidak dengan sendirinya membuktikan deployment Vercel berstatus Ready.
