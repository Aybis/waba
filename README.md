# WABA Office

Dashboard monitoring WABA berbasis **React 19.3.0**, **Vite 8.3.3**, dan **Tailwind CSS 4.3.3**. Versi stabil terbaru dari registry saat migrasi dipin di `package.json` dan `package-lock.json`.

Semua data saat ini adalah **simulasi**, belum terhubung ke backend atau Meta API. Business Unit adalah scope tampilan lokal, bukan mekanisme otorisasi backend.

## Menjalankan

Gunakan Node.js 20.19+ atau 22.12+ (pengembangan diuji pada Node 24).

```sh
npm ci
npm run dev
```

Buka URL yang dicetak Vite. Untuk build produksi:

```sh
npm run build
npm run preview
npm test
```

Output produksi berada di `dist/`. Pada hosting seperti Vercel, pilih preset **Vite**, build command `npm run build`, dan output directory `dist`. Server statis Python sebelumnya tidak lagi menjalankan source aplikasi; source sekarang memerlukan Vite.

## Business Unit, WABA Account, WA number

```text
TSO (Business Unit)
└── TSO · 11234 (WABA Account name · ID)
    ├── 0812xx (Tasya)
    └── 0813xx (TSO - Cilandak)
```

- Satu Business Unit dapat memiliki banyak WABA Account; satu akun dapat memiliki banyak nomor dengan display name masing-masing.
- Setiap blok kantor adalah satu akun (dikelompokkan berdasarkan ID internal yang stabil); setiap orang adalah satu nomor.
- Sidebar menyediakan tiga tingkat dengan expand/collapse dan pemilihan scope. Dropdown menyediakan scope yang sama pada ponsel.
- **Business Unit & WABA** mengatur unit, nama/ID akun, nomor dan display name. **Gunakan contoh TSO** mengisi draft contoh; perubahan baru disimpan setelah memilih Simpan perubahan.
- Konfigurasi v4 memakai `businessUnits` dan `accounts`; setiap nomor memiliki `id`, `number`, dan `displayName`. Data v2/v3 dimigrasikan tanpa mengganti nomor atau mengarang WABA ID. Tenant lama menjadi Business Unit dan service lama menjadi akun. Key lama tidak ditimpa.
- Penyimpanan lokal mengikuti origin browser; data pada port lain tidak otomatis terbaca. Semua metrik tetap simulasi.
- Popup status hanya ditempatkan di ruang kosong yang tidak bertabrakan dengan orang, label nomor, atau popup lain. Bila tidak tersedia ruang aman, popup disembunyikan; detail tetap dapat dibuka melalui orang atau panel aktivitas.

## Tampilan dan kontrol

- **The office:** kantor isometrik dengan satu operator per nomor, blok WABA Account, lounge, meja, tanaman, dan bubble status. Klik operator untuk sesi simulasi; operator juga dapat dipilih melalui keyboard.
- **Workstations:** kartu per nomor dengan miniatur kantor dan metrik.
- **Agent View:** contoh percakapan inbound/outbound dan status tiap nomor.
- **Traffic Flow:** alur customer → webhook → agent → Meta API; klik baris untuk detail sesi.
- **Live:** refresh setiap 15 detik; pause menghentikan refresh otomatis dan animasi. Refresh manual tetap tersedia saat pause. Tab tersembunyi tidak memperbarui telemetry.
- Zoom **− / +**, **Fit view**, **Bubble on/off**, dan mode fokus kantor. Escape menutup dialog terlebih dahulu; Escape berikutnya keluar dari mode fokus.
- Layout responsif: navigasi ringkas dan dropdown scope pada ponsel, sidebar pada tablet/desktop, office dan aktivitas bertumpuk pada layar kecil, tabel/alur lebar scroll di dalam panel. Dialog dibatasi tinggi viewport.
- Canvas dikelola melalui React effects dan dibersihkan saat unmount; animation frame, observer, dan listener tidak ditinggalkan. `prefers-reduced-motion` dihormati.

## Aturan status

Urutan prioritas: **Error → Warning → Working → Standby**.

- Error: `health` = ERROR / SERVER, atau `status` = ERROR.
- Warning: health/status WARN / WARNING, latency ≥ 2,5 detik, atau antrean > 50.
- Working: status ACTIVE / WORKING atau antrean > 0.
- Selain itu: Standby. Error historis saja tidak mengubah status aktif.

## Struktur proyek

```text
src/
  App.jsx                 State React, interval, filter, shell responsif
  index.css               Hanya import Tailwind; tidak ada stylesheet komponen lama
  components/
    Office.jsx            Wrapper canvas dan panel aktivitas
    Tenants.jsx           Hierarki sidebar dan pemilih scope
    Views.jsx             Workstations, Agent View, Flow, tabel
    Dialogs.jsx           Detail sesi dan pengaturan Business Unit/WABA
    ui.jsx                Tombol, input, badge, ikon Tailwind
  lib/
    config.js             Skema Business Unit/WABA, validasi, migrasi, localStorage
    telemetry.js          Generator data dan sesi simulasi
    state.js              Resolver status dan konten bubble murni
    office-scene.js        Renderer Canvas 2D dengan lifecycle dispose
    *.test.js             Tes status, hierarki, migrasi dan isolasi identitas
```

UI menggunakan utility Tailwind dan plugin resmi `@tailwindcss/vite`. Warna/geometri canvas digambar melalui API Canvas, bukan stylesheet. Style numerik inline hanya digunakan untuk panjang/posisi bar waterfall berbasis data.
