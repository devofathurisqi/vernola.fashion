# Menyiapkan klien paket berikutnya

Fondasi: satu Supabase project, tenant dan akun terpisah, satu master/foto Vuyama. Setiap klien mendapatkan aplikasi Vite dengan identitas sendiri. Jangan menyalin data, kredensial atau membership Vernola.

1. Salin source bersih. Kecualikan node_modules, dist, .env.local, .vercel, .tools dan artefak QA runtime. Ganti foto/identitas/data preview Vernola untuk brand tujuan. Master Vuyama dan URL foto publik boleh dipakai bersama.
2. Tentukan UUID toko baru, slug unik, nama brand, WhatsApp dan email admin yang disetujui pemilik. Buat akun Auth melalui Supabase Dashboard/Admin API, lalu tambahkan store_members untuk UUID toko itu saja. Jangan membuat akun/alias lain tanpa konteks atau memakai akun vernola.
3. Masukkan row stores dan kategori awal klien. Database yang sudah dimigrasi tidak memerlukan SETUP-VERNOLA.sql, UPGRADE-VERNOLA.sql atau FINAL-SHARED-LIBRARY.sql lagi. File seed berisi UUID/konten Vernola; jangan menjalankannya sebagai onboarding toko baru.
4. Isi VITE_STORE_SLUG, URL/publishable key project bersama, dan pemetaan adminUsername/adminEmail di src/config.js. Samakan validasi login dengan akun tujuan. Kata sandi hanya pada Auth, tidak pada source/config/deploy variables publik.
5. Sesuaikan logo, warna navbar berdasarkan aset logo, hero, editorial copy, judul/metadata index.html, CTA dan brand dalam source. CRUD/picker bisa dipakai ulang; identitas visual harus ditinjau per klien.
6. Login ke dashboard klien baru → Katalog Vuyama → pilih produk. RPC attach membuat referensi master dan kategori bila diperlukan; produk dimulai sebagai draft. Periksa harga jual, foto, warna, stok dan publikasikan sesuai keputusan pemilik. Tidak ada upload ulang foto master.
7. Produk khusus klien dibuat melalui CRUD biasa. Upload masuk catalog-images/<store UUID>/; URL Vuyama tetap vuyama-library/v1/. Jangan menyalin seluruh master ke produk khusus kecuali klien sengaja membuat snapshot mandiri (aksi duplikasi).
8. Jalankan npm test dan npm run build. Periksa tenant A/B, draft, konflik edit, upload folder sendiri dan nomor WhatsApp tujuan. Uji desktop/mobile, warna, foto dan checkout. QA hosted script saat ini khusus Vernola; ubah tenant/alias dan ekspektasi count sebelum memakai pada klien lain.
9. Siapkan Vercel dengan root aplikasi klien, preset Vite, output dist dan tiga VITE variables. Review ketentuan paket hosting sesuai penggunaan, lalu deploy sesuai instruksi pemilik. Perubahan data produk berikutnya langsung dari Supabase tanpa build ulang.

## Batas perubahan master

Admin toko hanya dapat membaca master. Harga/stok/publikasi dan override milik masing-masing toko. Konten yang diwarisi mengikuti pembaruan master; konten yang dioverride tetap lokal. Perubahan susunan/ID warna master memerlukan review dampak terhadap override lama; gunakan ID stabil.

Operator mengubah master dengan SQL/Admin API yang ditinjau, menaikkan revision dan updated_at, dan memakai path/version foto baru untuk mengganti konten yang di-cache. Publish helper hanya untuk pengelola project. Jangan memberi client secret/service-role key. Seed memakai ON CONFLICT DO NOTHING, jadi menjalankan ulang seed tidak memperbarui master yang ada.

Satu project memudahkan biaya awal, tetapi storage, database dan traffic memakai kuota bersama. Pantau pemakaian serta backup/retensi audit. Library publik berisi data produk yang memang ditujukan untuk publik, tanpa biaya pengadaan atau data pelanggan.
