# Keranjang dan WhatsApp Novola — 1 November 2026

- Penyebab: detail mengganti tombol tambah dengan tautan inquiry saat `price_confirm=true`, lalu checkout menolak produk tersebut. Empat produk Novola memakai harga konfirmasi.
- Semua produk kini dapat dimasukkan ke keranjang setelah memilih warna, dengan pemeriksaan stok dan jumlah tetap berlaku. Footer tombol/quantity selalu terlihat; bagian foto/detail memiliki scroll sendiri. Produk yang stoknya benar-benar habis tetap tidak dapat ditambahkan.
- Harga konfirmasi diberi label menunggu admin, termasuk subtotal keranjang dan draft WhatsApp. Keranjang campuran menghitung subtotal hanya dari harga yang tersedia, disertai jumlah pilihan yang masih menunggu harga. Harga/status konfirmasi yang berubah harus ditinjau ulang sebelum checkout berikutnya.
- Draft WhatsApp berisi daftar bernomor: nama produk, warna bila ada, jumlah, harga satuan, subtotal tiap pilihan, ringkasan jumlah/subtotal, catatan opsional, serta konfirmasi stok/ongkir/pembayaran.
- `npm test`: 22 lulus, mencakup beberapa produk/warna, harga campuran/semua inquiry, catatan dan URL encoding, revalidasi harga/nama/warna, stok kurang, produk/varian hilang, dan keranjang kosong. Production build dan verifier lulus.
- Browser: tombol terlihat dan aktif setelah memilih warna pada 360×640, 390×844, 768×900, dan 1366×900; tidak ada overflow horizontal di dialog.
- Preview: Kanaya Coksu–Milo ×2, Kanaya Aurora–Nude ×1, Blouse Hitam ×1 menghasilkan tiga baris / empat pcs berikut catatan pada halaman draft WhatsApp.
- Data Supabase asli: Kanaya Coksu–Milo ×2 dan Blouse Putih ×1 berhasil melalui pemuatan detail dan revalidasi checkout, lalu muncul lengkap pada draft WhatsApp ke nomor toko. Tidak ada pesan yang dikirim atau data katalog yang ditulis dalam QA.
- Bukti lokal (diabaikan Git): `.tools/qa/cart-checkout/` berisi screenshot detail HP/desktop, keranjang, dan draft teks.
