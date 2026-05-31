# Pendaftaran Built-in Tools Core
## Genesis IR v1.0 — Kolaborasi & Multi-Agen

> [!NOTE]
> `@stability STABLE`
> Halaman ini mendokumentasikan 9 built-in tool registry ID yang dikunci secara permanen di dalam modul inti compiler Genesis IR.

---

## Daftar 9 Built-in Tools Terkunci (Keputusan #40)

Setiap agen pelaksana memiliki akses langsung ke 9 built-in tools yang terdaftar di dalam `CompilerToolRegistry`. ID alat ini bersifat permanen dan dilarang ditimpa (overridden) atau dimodifikasi strukturnya:

### 1. `validate_schema`
- **Fungsi**: Memvalidasi kesesuaian dokumen HIR dengan spesifikasi JSON Schema resmi.
- **Input**: `(doc: IRDocument)`.
- **Output**: `{ valid: boolean, errors?: AJVError[] }`.

### 2. `resolve_tokens`
- **Fungsi**: Memecahkan rujukan style token abstrak (`theme://`, `brand://`) menjadi nilai rendering konkret.
- **Input**: `(doc: IRDocument, context: IRStyleContext)`.

### 3. `compute_layout`
- **Fungsi**: Melakukan kalkulasi spasial (koordinat piksel) untuk node berbasis Flexbox/Grid.
- **Input**: `(doc: IRDocument)`.

### 4. `interpolate_timeline`
- **Fungsi**: Menghitung interpolasi easing keyframe berdasarkan durasi temporal.
- **Input**: `(timeline: IRTimeline, current_ms: number)`.

### 5. `bind_assets`
- **Fungsi**: Memuat dan memverifikasi berkas biner luar melalui rujukan `asset://` URI.

### 6. `generate_lir`
- **Fungsi**: Menghasilkan instruksi rendering tingkat rendah (SVG/PDF/WebGL/Web Audio) dari representasi MIR.

### 7. `serialize_gir`
- **Fungsi**: Mengompresi dokumen ke format biner terpadu `.gir` (MessagePack + LZ4).

### 8. `validate_accessibility`
- **Fungsi**: Memeriksa rasio kontras teks WCAG AA/AAA dan visibilitas simulasi buta warna.

### 9. `evaluate_rlvrr`
- **Fungsi**: Menghitung total reward keluaran model AI secara gated sekuensial (5 sinyal evaluasi).
