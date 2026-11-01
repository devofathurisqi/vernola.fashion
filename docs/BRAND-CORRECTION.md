# Koreksi identitas Novola Fashion

Instruksi pemilik 1 November 2026 menetapkan nama yang benar **Novola.fashion** dan username dashboard **novola**. Kata sandi diperbarui langsung melalui akun Auth milik toko, tidak disimpan dalam source atau materi klien. Login baru berhasil diverifikasi.

Nama toko online, teks storefront/admin, pesan WhatsApp, metadata, favicon, monogram dan logo telah diperbarui. Slug database `vernola-fashion`, alias email Auth lama, UUID toko, folder lokal dan remote GitHub tetap dipertahankan agar environment Vercel dan membership tidak perlu diubah. Username yang diketik pengguna adalah novola.

27 listing Vuyama di tenant ini telah dihapus melalui akses admin dengan filter store_id dan ID produk yang terhubung ke master Vuyama. Sebelum dihapus, snapshot disimpan di .tools/backups yang diabaikan Git. Tersisa empat produk contoh milik Novola. Master supplier dan bucket foto bersama tidak dihapus agar tenant lain tidak terpengaruh. Kategori kosong tetap dapat dikelola admin, tetapi disembunyikan dari katalog pelanggan. Data preview juga hanya memuat empat contoh Novola.

Logo baru dibuat melalui built-in Imagegen dengan referensi logo sebelumnya. Aset aktif: public/assets/novola-fashion.png dan public/assets/novola-logo.webp. Versi lama berada dalam riwayat Git dan tidak lagi ikut public build.

Prompt yang digunakan:

> Edit the supplied existing fashion brand logo. This is a precise brand spelling correction for the SAME logo, not a redesign. The only brand text must read exactly 'Novola.fashion' (capital N, then ovola, a period, then fashion). Preserve the sweeping hijab silhouette/emblem, elegant connected calligraphic script, baseline, pink/magenta/plum ink colors and subtle shadow, generous horizontal composition and original proportions. Adapt the sweeping initial into a clear capital N that joins 'ovola.fashion', so the full word unmistakably reads Novola.fashion, not Vernola or Nervola. Keep a clean solid pale blush background exactly #fde9e9 to blend with the website navbar. No extra slogan, no extra text, no decorative objects. Sharp high resolution brand asset.

Logo dipertahankan dalam palet pink dan diekspor ke WebP untuk navbar. Hasil generatif tidak diklaim identik piksel atau font dengan referensi.
