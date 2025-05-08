📁 README.md

# StargledPanelSimple

StargledPanelSimple adalah panel web sederhana berbasis Node.js dan EJS yang memungkinkan Anda mengelola banyak server Minecraft secara independen. Cocok untuk pengguna yang ingin menjalankan dan mengatur banyak instance server Minecraft di satu panel terpusat.

---

## 🚀 Fitur Utama

* 🔧 Mendukung banyak server Minecraft
* ▶️ Memulai & menghentikan masing-masing server secara independen
* 📁 File Manager per server (upload, download, hapus, edit, rename, dan lainnya)
* ⚙️ Konfigurasi startup command khusus per server
* 📋 Panel web berbasis EJS yang mudah digunakan
* 🧠 Penyimpanan konfigurasi di config.json
* 📡 Status real-time untuk setiap server (Running / Stopped)

---

## 🗂 Struktur Folder

```
StargledPanelSimple/
├── servers/
│   ├── survival/
│   │   ├── server.jar
│   │   └── ...
│   └── skyblock/
│       ├── paper.jar
│       └── ...
├── views/
│   └── *.ejs
├── public/
│   └── css/, js/
├── config.json
├── server.js
└── README.md
```

---

## ⚙️ Konfigurasi Server

Edit file config.json:

```json
{
  "servers": [
    {
      "id": "survival",
      "name": "Survival Server",
      "path": "./servers/survival",
      "startup": "java -Xmx1G -jar server.jar nogui",
      "status": "stopped"
    },
    {
      "id": "skyblock",
      "name": "Skyblock Server",
      "path": "./servers/skyblock",
      "startup": "java -Xmx2G -jar paper.jar nogui",
      "status": "stopped"
    }
  ]
}
```

📌 Catatan:

* id harus unik.
* path mengarah ke folder server.
* startup adalah command yang dijalankan ketika tombol “Start” ditekan.
* status diperbarui otomatis saat server dijalankan.

---

## 🛠 Instalasi

1. Clone repository:

```bash
git clone https://github.com/username/StargledPanelSimple.git
cd StargledPanelSimple
```

2. Install dependencies:

```bash
npm install
```

3. Jalankan server:

```bash
npm start
```

Default akan berjalan di [http://localhost:3000](http://localhost:3000)

---

## 🌐 Panel Web

Akses panel di browser:

[http://localhost:3000](http://localhost:3000)

Tampilan web akan menampilkan:

* Daftar server
* Tombol Start / Stop
* Status server
* Akses ke file manager
* Edit konfigurasi startup

---

## 🧰 File Manager

Fitur file manager per server:

* Upload file (max 500MB)
* Download file/folder
* Edit file
* Buat/hapus folder
* Rename file/folder
* Arsipkan & ekstrak .zip

Akses dari tombol “File Manager” per server.

---

## ❓ FAQ

❓ Bisakah menjalankan server beda versi?
✅ Bisa, selama startup command dan .jar disesuaikan di config.json.

❓ Apakah mendukung Forge atau modded server?
✅ Ya, selama startup command benar dan dependencies tersedia.

---

## 📄 Lisensi

GPL License © 2025 StargledMC

---
