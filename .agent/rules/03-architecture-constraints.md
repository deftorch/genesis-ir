# Rules: Arsitektur Genesis IR — Domain & Compilation Pipeline

## Prinsip Arsitektur yang Selalu Diikuti

### 1. Hierarki IR (TIDAK BOLEH DIBALIK)
```
HIR (deklaratif, user intent)
  ↓ Pass 1-5
MIR (resolved, normalized)
  ↓ Pass 6-7
LIR (platform-specific instructions)
```
Agen TIDAK BOLEH menulis LIR secara langsung — selalu mulai dari HIR.

### 2. Isolasi Domain Spec
- Setiap domain memiliki spec opsionalnya sendiri: `music_spec`, `pixel_spec`, `font_spec`, dll.
- Field spec domain lain harus `null/undefined` jika tidak relevan
- JANGAN menyematkan properti domain A ke dalam struktur domain B
- Rujuk `IR_DOMAIN_FIELD_MATRIX` untuk menentukan field mana yang `mandatory/optional/forbidden`

### 3. Domain Validation (Pass 1)
- Sebelum memproses node apapun, cek `IR_ALLOWED_NODE_TYPES_BY_DOMAIN`
- Node `music_track` di domain `visual` → TOLAK di Pass 1
- Node `glyph` di luar domain `font_design` → TOLAK di Pass 1
- Semua dangling reference (node_id tidak ada) → TOLAK di Pass 1

### 4. Style Cascade (Pass 2) — Urutan DIKUNCI
```
inline/object_overrides (prioritas tertinggi)
  ↓ kalah dari
component_styles
  ↓ kalah dari
theme_tokens
  ↓ kalah dari
brand_profile (prioritas terendah)
```
JANGAN membalik urutan ini.

### 5. Asset URI Scheme
- Format: `asset://[UUID v4]`
- Resolusi di Pass 5 oleh compiler
- JANGAN resolve asset URI di Pass 1, 2, 3, atau 4
- Untuk pixel_art: data piksel base64 BOLEH di node `pixel_cel` saja

### 6. Lifecycle Dokumen (FORWARD-ONLY)
```
draft → experiment → staging → production → deprecated → archived
```
- Tidak ada jalan mundur
- Dokumen `archived`: compiler DILARANG re-compile
- Dokumen `production`: perubahan breaking DILARANG tanpa major version bump

### 7. Tier Constraints
| Tier | Max Nodes | Max Depth | Max File |
|------|-----------|-----------|----------|
| nano | 100 | 8 | 50KB |
| core | 1,000 | 32 | 5MB |
| full | 100,000 | 64 | unlimited |

Tier `nano` DILARANG menggunakan aset eksternal atau plugin.

### 8. Compilation Pass Sequence (WAJIB BERURUTAN)
- Pass 0: Dependency Resolution (plugin)
- Pass 1: Schema Validation (AJV)
- Pass 2: Style Cascade Resolution
- Pass 3: Semantic Validation (WCAG, domain rules)
- Pass 4: Layout Computation
- Pass 5: Media & Temporal Resolution
- Pass 6: Renderer Dispatch
- Pass 7: LIR Generation
- Pass 8: Post-Compilation & Optimization

Pass TIDAK BOLEH dijalankan di luar urutan ini.

### 9. IRDelta Rules (Keputusan #27)
- Delta harus atomik: `add | remove | replace | move`
- Setiap delta memiliki `delta_id` unik, append-only
- `delta_only: true` → agen HANYA mengembalikan IRDelta, bukan dokumen penuh
- Undo delta: gunakan `reverses_delta_id` referensi

### 10. Plugin Sandboxing
- Plugin `community` trust level: akses HANYA ke `declared_ir_access`
- Plugin `official`: akses semua IR paths
- `strict_ir_access: true` by default
- Snapshot plugin READ-ONLY setelah commit
