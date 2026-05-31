# Domain Grafis & Visual
## Genesis IR v1.0 — Spesifikasi Domain

> [!NOTE]
> `@stability STABLE`
> Halaman ini mendokumentasikan spesifikasi domain-domain grafis dan media visual statis di Genesis IR, termasuk visual layout, editing gambar, signage, dan packaging cetak.

---

## Gambaran Umum Domain Visual

Domain-domain visual melayani pembuatan representasi visual 2D baik digital maupun fisik (cetak).

### 1. `visual` (STABLE)
- **Fokus**: Tata letak 2D berbasis vektor dan bitmap dinamis (e.g. logo, poster, media sosial, layout UI).
- **Unit Standar**: Piksel (`px`) (Keputusan #08).
- **Node yang Diperoleh**: `text`, `image`, `shape`, `path`, `group`, `frame`, `svg_path`, `gradient`, `blur_effect`, `flex_container`, `grid_container`, dll.

### 2. `image_edit` (STABLE)
- **Fokus**: Komposisi gambar non-destruktif dan manipulasi piksel bitmap.
- **Fitur**: Filter warna, kontras, brightness, mask, dan blend modes.
- **LIR Target**: HTML5 Canvas 2D API call sequence.

### 3. `motion` (STABLE)
- **Fokus**: Animasi vector dan composite video klip temporal.
- **Node yang Diperoleh**: `video_clip`, `animation`, `lottie`, `particle_system`, `shader_effect`.

### 4. `interactive` (STABLE)
- **Fokus**: Prototyping UI interaktif dan dynamic states.
- **Mekanisme**: Kompatibel dengan state machine runtime di `IRInteractionModel`.

---

## Spesifikasi Cetak Fisik: `signage` & `packaging` (Fase 7)

Dua domain visual khusus ini memerlukan koordinasi langsung dengan spesifikasi fisik (`IRPhysicalSpec`) dan unit presisi:

```
         [HIR Document]
            ↓
     [Pass 3: Physical Validation]
   - Validasi Bleed & Safe Guide (mm/pt)
   - Verifikasi Sinkronisasi DPI (min 300)
            ↓
     [LIR Output: PDF/X-4 atau DXF]
```

### 1. `signage` (STABLE)
- **Fokus**: Papan nama, spanduk, baliho luar ruangan.
- **Kekangan**: Wajib mendefinisikan warna fisik (e.g. Pantone/CMYK) dan safe margin yang kaku untuk mencegah pemotongan info saat pemasangan.

### 2. `packaging` (STABLE)
- **Fokus**: Kardus pembungkus, label botol, folding box.
- **Dieline System**: Wajib memiliki node `print_dieline`, `print_fold_line` (garis lipatan), `print_cut_line` (garis potong), dan `print_master_ref` untuk pemotongan pisau mekanis.
- **LIR Target**: Ekspor ke format CAD vektor standar seperti berkas **DXF** (Drawing Exchange Format).
- **DPI Policy**: Aturan `strict` (Keputusan #25) mewajibkan DPI canvas tepat cocok dengan DPI cetak.
