# Arsitektur Renderer & Ekspor Spesifik Domain
## Genesis IR v1.0 — Rendering Backends V2.0

> [!NOTE]
> `@stability STABLE`
> Dokumen ini menjelaskan arsitektur implementasi sistem kompilasi dari representasi Intermediate (MIR) menjadi output biner spesifik level rendah (LIR/Physical Output) untuk berbagai domain sesuai dengan Milestone V2.0.

Sistem rendering Genesis IR mengadopsi pola arsitektur **Multi-Backend Dispatcher**. Dokumen yang telah lolos Pass kompilasi awal akan diteruskan ke mesin *renderer* spesifik sesuai domain aktifnya (`meta.active_domains`).

---

## 1. Domain Dokumen Cetak (PDF/X-4 Renderer)

Untuk memfasilitasi kebutuhan mesin cetak industri (Offset/Digital), Genesis IR membuang implementasi SVG tiruan dan secara eksklusif mengekspor biner PDF berbasis spesifikasi PDF/X-4 menggunakan pustaka `pdf-lib` dan ekstensi `@pdf-lib/fontkit`.

### A. Metadata PDF/X-4 & Profil Warna
Sistem secara otomatis menyuntikkan metadata pra-cetak (Pre-press metadata):
- `GTS_PDFXVersion`: Menandai kepatuhan standar PDF/X.
- `OutputIntent`: Otomatis diatur ke `Fogra39` untuk operasi cetak standar, memastikan konsistensi warna profil warna ICC.
- **Color Space Conversion**: Setiap entitas visual dengan profil `sRGB` di-bypass melalui fungsi `convertSRGBToCMYK()` untuk menghindari konversi otomatis dari *printer driver* yang sering meleset.

### B. Font Embedding & Trapping
Semua rujukan font di dalam kanvas `IRPrintCanvas` otomatis disertakan sebagai *subset font* (bukan referensi URI eksternal) berkat kompilasi `@pdf-lib/fontkit` di memori.

---

## 2. Domain Video & Motion (`video/webm`)

Rendering domain `video` dan `motion` difasilitasi oleh `CanvasVideoRenderer`, yang mengonversi `IRTimeline` menjadi bingkai video aktual.

### A. Interpolasi Frame-by-Frame
Sistem me-render dokumen ke sebuah memori `OffscreenCanvas` secara serial menggunakan `interpolateKeyframe(time_ms)`. Durasi total didapatkan dari node timeline utama.

### B. MediaRecorder Pipeline
Dibandingkan membebani server dengan utilitas ffmpeg (yang kini dialihkan ke komputasi *cloud* sekunder), Genesis IR membungkus *stream* frame dari kanvas menggunakan abstraksi API `MediaRecorder`.
- **Codec**: Format output dikunci pada `video/webm;codecs=vp9` untuk mencapai rasio kualitas & kompresi terbaik di platform web.

---

## 3. Domain Pembuatan Musik (Web Audio API Graph)

Pada Fase 2, *fallback renderer* audio digantikan dengan implementasi generasi instruksi graf audio otentik. `IRMusicSpec` dikonversi menjadi barisan operasi `AudioGraphInstruction[]` (format `webaudio` dari WebLIR).

### Audio Nodes
Tiap instrumen (seperti `synthesizer`) dan lapisan ketukan diturunkan ke node audio hierarkis:
- Pembangkit suara dasar (mis. `IRMidiNote`) dikompilasi ke inisialisasi `OscillatorNode`.
- Pemrosesan envelope (`IREnvelope`) dan volume diletakkan ke dalam parameter automasi `GainNode`.
- Evaluasi tingkat lanjut seperti `IRMusicEffect` ("reverb", "compression") diinstansiasi menggunakan node native seperti `DynamicsCompressorNode` atau `ConvolverNode`.

---

## 4. Domain Font Design (OpenType Compiler)

Desain tipografi dalam `font_design` digenerasi menjadi file font format standar (`.otf` / `.ttf`) yang dapat langsung diinstal pada sistem operasi, memanfaatkan mesin `opentype.js`.

### Konversi Sumbu & Matriks Tipografi
- Kordinat kontur SVG memiliki pangkal $Y$ di sudut kiri atas (turun ke bawah).
- Kordinat OpenType Cartesian berawal dari garis dasar (*baseline*). Oleh karena itu, *renderer* memberlakukan fungsi wajib `svgPathToOTPath()` yang menginversi seluruh poin sumbu Y dengan rumus: $y_{ot} = UPM - y_{svg}$ (UPM dikunci di 1000 atau 2048).
- Output header mencakup tabel OpenType seutuhnya (seperti `glyf`, `head`, `hhea`, `GSUB`).

---

## 5. Domain 3D & Mockup (Three.js Engine)

Generator *scene* berbasis spesifikasi `IR3DViewport` menginstansiasi dunia tiga dimensi di *runtime* rendering menggunakan pustaka Three.js. 

### Material & Objek
- **GeometryFactory**: Mesin bertugas memetakan nilai `mesh_type` semantik (seperti `box` atau `sphere`) menjadi wujud aktual (`BoxGeometry`, `SphereGeometry`).
- **PBR Render Model**: `MeshStandardMaterial` diinstansiasi secara default. Properti parameter IR seperti *metalness*, *roughness*, dan profil pencahayaan dieksekusi secara native.
- **Navigasi Viewport**: Integrasi pengamat jarak jauh menggunakan injeksi utilitas `OrbitControls`.

---

## 6. Domain Pixel Art (Sprite Sheet Packing)

Aset `pixel_cel` yang berisi data biner tidak dibiarkan sebagai berkas individual. *Renderer* memaketkannya (*bin-packing*) ke dalam satu matriks lembar *sprite*.

- **MaxRects Packer**: Algoritma heuristik dari paket npm `maxrects-packer` memastikan penyusunan lapisan cel dengan tumpang-tindih nol (*zero overlap*) dan tanpa ruang grafis yang terbuang.
- **Manifestasi Frame**: Hasil ekspor mencakup citra dasar biner gabungan (`atlasBase64 PNG`) serta file spesifikasi manifest JSON standar industri (sepenuhnya kompatibel dengan *game engine* pihak ketiga seperti Phaser.js atau PixiJS).
