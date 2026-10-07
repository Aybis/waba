# WABA Office

Dashboard monitoring WABA berbasis **React 19.3.0**, **Vite 8.3.3**, dan **Tailwind CSS 4.3.3**. Versi stabil terbaru dari registry saat migrasi dipin di `package.json` dan `package-lock.json`.

Semua data saat ini adalah **simulasi**, belum terhubung ke backend atau Meta API. Tenant adalah scope tampilan lokal, bukan mekanisme otorisasi backend.

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

## Tenant dan subtenant

```text
ISO
UDSO
LSO
HSO
HO
AWO
├── TSO
├── DSO
├── ACC
├── FIF
└── Bank Saqu
```

- Pilih tenant di sidebar, atau dropdown **Tenant utama** dan **Subtenant** pada desktop maupun ponsel.
- Memilih **AWO** menggabungkan nomor milik AWO dan seluruh subtenant; memilih **AWO / TSO** membatasi tampilan ke TSO.
- Filter service, pencarian, status, KPI, kantor, daftar aktivitas, dan tabel menggunakan scope yang sama. Berpindah tenant mereset filter turunan agar data tidak tersembunyi oleh pilihan lama.
- Service lama TSO/DSO dipetakan ke AWO. Tenant lain tersedia tetapi kosong sampai Anda menambahkan nomor; tidak dibuat nomor demo tambahan.
- Buka **Tenant & Nomor** untuk menambah tenant/subtenant, mengatur induk, atau menempatkan service dan nomor pada tenant yang benar. Tenant yang masih memiliki anak atau service tidak dapat dihapus sebelum isinya dipindahkan/dihapus.
- Model mendukung dua tingkat tenant, dengan ID stabil untuk tenant dan service. Service dan nomor dengan nama yang sama di tenant berbeda tetap memiliki identitas terpisah.
- Konfigurasi baru disimpan pada `waba-monitor-config-v3`. Konfigurasi `waba-monitor-config-v2` terbaca dan dimigrasikan tanpa menimpa key lama. Service lama yang tidak dapat dipetakan ditempatkan di **Belum dipetakan**, agar nomor tetap tersedia.
- Penyimpanan mengikuti origin browser. Jika sebelumnya memakai port 8899, localStorage port tersebut tidak otomatis tersedia di port 5173. Jalankan Vite di origin lama (`npm run dev -- --port 8899`, setelah server lama dihentikan) untuk membaca konfigurasi lamanya.

## Tampilan dan kontrol

- **The office:** kantor isometrik dengan satu operator per nomor, zona service, lounge, meja, tanaman, dan bubble status. Klik operator untuk sesi simulasi; operator juga dapat dipilih melalui keyboard.
- **Workstations:** kartu per nomor dengan miniatur kantor dan metrik.
- **Agent View:** contoh percakapan inbound/outbound dan status tiap nomor.
- **Traffic Flow:** alur customer → webhook → agent → Meta API; klik baris untuk detail sesi.
- **Live:** refresh setiap 15 detik; pause menghentikan refresh otomatis dan animasi. Refresh manual tetap tersedia saat pause. Tab tersembunyi tidak memperbarui telemetry.
- Zoom **− / +**, **Fit view**, **Bubble on/off**, dan mode fokus kantor. Escape menutup dialog terlebih dahulu; Escape berikutnya keluar dari mode fokus.
- Layout responsif: navigasi ringkas dan dropdown tenant pada ponsel, sidebar pada tablet/desktop, office dan aktivitas bertumpuk pada layar kecil, tabel/alur lebar scroll di dalam panel. Dialog dibatasi tinggi viewport.
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
    Dialogs.jsx           Detail sesi dan pengaturan tenant/service
    ui.jsx                Tombol, input, badge, ikon Tailwind
  lib/
    config.js             Skema tenant, validasi, migrasi, localStorage
    telemetry.js          Generator data dan sesi simulasi
    state.js              Resolver status dan konten bubble murni
    office-scene.js        Renderer Canvas 2D dengan lifecycle dispose
    *.test.js             Tes status, hierarki, migrasi dan isolasi identitas
```

UI menggunakan utility Tailwind dan plugin resmi `@tailwindcss/vite`. Warna/geometri canvas digambar melalui API Canvas, bukan stylesheet. Style numerik inline hanya digunakan untuk panjang/posisi bar waterfall berbasis data.
