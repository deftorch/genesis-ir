# Spatial Layout & Text Reflow Engine
## Genesis IR v1.0 — Panduan Arsitektur Core

> [!NOTE]
> `@stability STABLE`
> Halaman ini mendokumentasikan implementasi kalkulasi spatial layout engine (Flexbox & Grid) serta penataan ulang (reflow) konten tekstual multi-halaman pada platform LIR target.

---

## Perhitungan Spatial Layout (Pass 4)

Pass 4 bertanggung jawab menghitung letak dan dimensi mutlak (`ComputedLayoutMap`) setiap node berdasarkan parameter geometri relatif (`IRGeometry`) dan kekangan model (constraints).

```
     [HIR Node: Flex/Grid Constraints]
             ↓
      [Pass 4: Yoga Layout Engine]
             ↓
[LIR Node: Posisi Absolut / Absolute Pixel Coordinates]
```

### 1. Flexbox Layout Engine
- Sistem diimplementasikan di atas API berbasis Flexbox standard (seperti Yoga Layout).
- Mendukung parameter: `flexDirection`, `justifyContent`, `alignItems`, `flexWrap`, dan `flexGrow`.

### 2. Grid Layout Engine
- Menyediakan penataan grid dua dimensi yang dinamis.
- Berguna untuk penyusunan layout berbasis baris dan kolom yang kaku, seperti pada domain `visual` dan konteks canvas `diagram` (`IRDiagramCanvasContext`).

### 3. Dirty-Tracking Optimization
- Demi performa tinggi (terutama di tier `core` dan `full`), Pass 4 tidak menghitung ulang seluruh pohon dokumen jika hanya terjadi perubahan lokal.
- Node yang diubah akan ditandai sebagai `dirty`, dan hanya sub-pohon yang terpengaruh yang akan diletakkan ulang (recompute).

---

## Multi-Page Text Reflow Engine (Fase 10A)

Untuk dokumen multi-halaman (`meta.domain: "document"`), text reflow engine menangani aliran teks dinamis lintas batas halaman fisik secara otomatis:

- **Text Overflow & Chaining**: Teks mengalir melalui properti `chain_to` yang menunjuk ID node frame berikutnya.
- **Auto-Page Generation**: Jika teks meluap dari frame halaman terakhir, engine secara otomatis menambahkan objek halaman baru (`artboard` / `frame` baru) ke dalam dokumen LIR.
- **Aturan Pemisah**: Mematuhi kriteria tipografi standar seperti pencegahan yatim piatu (orphan) dan janda (widow) teks.

---

## Native WASM Fallback & Layout Benchmarks (Fase 3.3)

Untuk menjamin performa maksimal pada runtime yang mendukung WebAssembly, compiler menyediakan modul penyelesaian layout berbasis Rust/WASM (`packages/native`) secara transparan:

### 1. Transparent Fallback Wrapper
Fungsi `nativeComputeLayout` mencoba mengimpor package native `@genesis/native` secara asinkron. Apabila runtime tidak mendukung WASM atau paket native belum terinstal/terkompilasi, sistem akan melakukan fallback secara otomatis dan aman ke layouter murni JavaScript tanpa mengganggu alur kerja rendering.

### 2. Layout Benchmarking
Fungsi `runLayoutBenchmark` mengukur dan membandingkan kecepatan kalkulasi layouter murni JS terhadap WASM layouter. Ini membantu mengidentifikasi bottleneck pada dokumen berskala besar dengan jumlah node tinggi, serta mengukur rasio peningkatan performa (speedup multiplier).

