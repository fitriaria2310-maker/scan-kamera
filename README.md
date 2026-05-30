# scan-kamera

Website demo Photo Booth Studio dengan berbagai efek realtime: imut, lucu, menarik, seram, glitch, pixelate, dan lainnya.

Cara pakai:

1. Buka folder ini dan jalankan server statis (direkomendasikan) atau buka `index.html` di browser.

	Contoh menggunakan Python 3 (port 8000):

	```bash
	python3 -m http.server 8000
	# lalu buka http://localhost:8000
	```

2. Klik `Mulai Kamera` untuk memberikan izin kamera.
3. Pilih salah satu efek di panel kanan.
4. Centang `Tambahkan stiker` dan klik salah satu stiker untuk menambahkannya. Klik `Ambil Foto` untuk melihat hasil, atau `Unduh` untuk menyimpan.

Fitur stiker tambahan:
- Setelah memilih stiker, klik di area video untuk menambahkannya.
- Klik dan geser stiker untuk memindahkannya (drag).
- Gunakan slider `Ukuran stiker` untuk mengubah ukuran stiker yang baru ditambahkan atau ukuran stiker yang sedang dipilih.
- Gunakan tombol `Hapus Stiker` untuk mengosongkan semua stiker.

Fitur wajah:
- Aktifkan `Aktifkan efek wajah` untuk menempelkan efek yang mengikuti muka.
- Pilih opsi `Kacamata nyata`, `Topi nyata`, atau `Efek kucing` untuk melihat overlay yang lebih realistis.

Catatan:
- Kamera hanya berfungsi di koneksi yang aman (HTTPS) atau ketika dijalankan dari `localhost`.
- Kode ini adalah demo sederhana: Anda dapat menambahkan lebih banyak efek dan aset stiker.
