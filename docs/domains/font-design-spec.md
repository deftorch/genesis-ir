# Domain Desain & Pembuatan Font
## Genesis IR v1.0 — Spesifikasi Domain

> [!IMPORTANT]
> `@stability BETA`
> Halaman ini mendokumentasikan spesifikasi domain `font_design`, termasuk batasan EM unit, kelas kerning grup, dan ekspor biner OpenType.

---

## Batasan Units Per EM (Keputusan #10)

Untuk menjamin kompatibilitas rendering font di sistem operasi tingkat rendah dan rasterizer web browser, properti `units_per_em` pada `IRFontSpec` dibatasi secara mutlak:

- **Nilai yang Diperoleh**: Hanya angka **`1000`** (standar PostScript/CFF) atau **`2048`** (standar TrueType).
- **Validasi**: Jika diisi nilai di luar kedua angka tersebut, Pass 3 akan segera menghentikan kompilasi dengan fatal error.

---

## Struktur Node Glyph & Kurva Vektor

Setiap karakter didefinisikan sebagai glyph vektor independen:

- **`glyph`**: Representasi visual karakter (properti: `unicode` integer, `contours`, `advance_width`).
- **Kontur Tertutup (Closed Contours)**: Semua kontur gambar pada `glyph` wajib bertipe tertutup (kurva Bezier kuadratik/kubik tertutup). Validator Pass 3b mendeteksi adanya kontur bocor (open paths) untuk menghindari kegagalan proses fill warna oleh OS rasterizer.
- **Auto-Hinting**: Mendukung penambahan instruksi visual TrueType hinting otomatis (`auto_hint: true`) guna memastikan teks tetap tajam pada monitor resolusi rendah.

---

## Sistem Kelas Kerning & Fitur OpenType (Keputusan #15)

Dibanding mendefinisikan kerning pasangan huruf per huruf (yang berujung pada ribuan data tidak efisien), Genesis IR mengunci sistem **Kerning Class**:

- **`IRKerningGroupDef`**: Mengelompokkan glyph dengan bentuk visual mirip (e.g. huruf `o`, `c`, `e` ke dalam satu grup kerning kiri/kanan).
- **`IRKerningPairDef`**: Mendefinisikan jarak adjustment antar kelas grup (contoh: mendekatkan kelas grup `A` dan `V`).
- **Fitur OpenType (`IROpenTypeFeature`)**: Compiler Pass 7c mendukung deklarasi fitur ligatur otomatis (`liga`), kapital kecil (`smcp`), dan substitusi kontekstual (`calt`).

---

## Kompilasi Binar OpenType `.otf` / `.ttf`

Generator LIR Pass 7c mengompilasi seluruh deskripsi glyph, metrik, kerning, dan fitur OpenType ke dalam bytes biner font TrueType/OpenType standar menggunakan library pembantu OpenType compilation:

- Menghasilkan tabel biner terstruktur: `glyf` (kurva glyph), `head` (metadata global), `hhea` (metrik horizontal), `kern` / `GPOS` (informasi kerning).
- Hasil akhir diekspor dalam format Buffer biner siap pakai untuk instalasi di OS (Windows, macOS, Linux) atau `@font-face` CSS.
