# CHECKLIST IMPLEMENTASI TEKNIS — Genesis IR Specification v1.0
## Metodologi: Test-Driven Development (TDD) + Incremental Development

> **Konvensi Status:**
> `[ ]` = Belum dimulai · `[-]` = Sedang berjalan · `[x]` = Selesai & lulus tes
>
> **Siklus TDD per item:** 🔴 **RED** (tulis tes, pastikan gagal) → 🟢 **GREEN** (tulis implementasi minimal) → 🔵 **REFACTOR** (bersihkan kode)
>
> **Blokir keras:** Item bertanda `⛔` tidak boleh dilewati. Item bertanda `🔑` adalah keputusan arsitektur kritis dari spec.

---

## PRE-PHASE: Setup & Infrastruktur Proyek

### 0.1 Toolchain & Monorepo Setup
- [x] Inisialisasi monorepo (Turborepo / pnpm workspaces)
- [x] Konfigurasi TypeScript `strict: true` di seluruh package
- [x] Setup test runner: **Vitest** untuk unit/integrasi, **Playwright** untuk E2E
- [x] Setup coverage gate: minimum **80%** baris kode tercakup sebelum merge
- [x] Konfigurasi AJV (Another JSON Validator) sebagai dependency wajib untuk skema validasi
- [x] Setup CI pipeline (GitHub Actions): lint → test → build → coverage report
- [x] Setup linter: ESLint + Prettier dengan rules TypeScript strict
- [x] Setup commit hooks (Husky): block commit jika ada tes gagal

### 0.2 Package Architecture
- [x] `@genesis/types` — seluruh TypeScript interface & type aliases dari spec
- [x] `@genesis/schema` — JSON Schema v7 & AJV validator
- [x] `@genesis/compiler` — compilation pipeline Pass 0–8
- [x] `@genesis/renderer` — output backends (SVG, PDF, Audio, 3D)
- [x] `@genesis/agent` — agent runtime & tool registry
- [x] `@genesis/crdt` — Loro-based sync & delta stack
- [x] `@genesis/sdk` — public API layer untuk konsumen eksternal

---

## FASE 1 — IR Foundation (HIR Schema Core)
**Milestone M1: Skema Core Siap (Target: Akhir Bulan ke-3)**
**Tier Target: IR-Nano → IR-Core**

### 1.1 `IRDomain` & Konstanta Dasar
> 🔑 Keputusan #09: 17 nama domain dikunci permanen. Tidak boleh diubah setelah v1.0.

- [x] 🔴 Tulis tes: validasi bahwa semua 17 string literal domain terdefinisi dengan benar
- [x] 🟢 Implementasi `IRDomain` type alias (11 STABLE + 6 BETA)
  - [x] STABLE: `visual`, `image_edit`, `video`, `audio`, `motion`, `print`, `signage`, `packaging`, `data_viz`, `interactive`, `3d`
  - [x] BETA: `document`, `music_production`, `pixel_art`, `diagram`, `mockup`, `font_design`
- [x] 🔵 Refactor: pastikan domain tersimpan sebagai frozen const untuk tree-shaking
- [x] 🔴 Tulis tes: domain string di luar 17 nilai resmi harus ditolak validator
- [x] 🟢 Implementasi fungsi `isValidIRDomain(value: string): value is IRDomain`
- [x] ⛔ Jalankan tes suite lengkap domain — 100% harus lulus sebelum lanjut

### 1.2 `IRMode` & `IR_MODE_DOMAIN_MAP`
> 🔑 Keputusan #32: Hubungan kompatibilitas mode dan domain dikunci pada konstanta `IR_MODE_DOMAIN_MAP`.

- [x] 🔴 Tulis tes: setiap mode (`canvas_editor`, `video_editor`, `audio_editor`, `image_editor`) memiliki `primary_domain`, `secondary_domains`, `timeline_required`, `canvas_types` yang valid
- [x] 🟢 Implementasi `IRMode` type dan `IRModeContext` interface
- [x] 🟢 Implementasi konstanta `IR_MODE_DOMAIN_MAP` (4 mode bawaan + extensible)
- [x] 🔴 Tulis tes: `video_editor` wajib memiliki `timeline_required: true`
- [x] 🔴 Tulis tes: `canvas_editor` harus memiliki `timeline_required: false`
- [x] 🟢 Implementasi fungsi `getModeContext(mode: IRMode): IRModeContext | undefined`
- [x] 🔵 Refactor: `Record<string, IRModeContext>` harus readonly untuk mencegah mutasi

### 1.3 `IRDocumentLifecycleStatus` & `IRProductionGate`
> 🔑 Transisi status bersifat forward-only. Dilarang keras downgrade status dokumen.

- [x] 🔴 Tulis tes: transisi dari `staging` ke `production` valid; dari `production` ke `draft` invalid
- [x] 🔴 Tulis tes: dokumen berstatus `archived` harus menolak operasi compile
- [x] 🟢 Implementasi `IRDocumentLifecycleStatus` type alias (6 nilai)
- [x] 🟢 Implementasi `IRProductionGate` interface dengan semua field wajib
- [x] 🟢 Implementasi fungsi `canTransition(from: IRDocumentLifecycleStatus, to: IRDocumentLifecycleStatus): boolean`
- [x] 🔵 Refactor: buat state machine eksplisit dengan adjacency map transisi valid

### 1.4 `IRDocument` Root Schema
> 🔑 Keputusan #02: `ir_id` wajib UUID v4, immutable setelah dibuat.
> 🔑 Keputusan #06: field `meta.domain` tidak boleh null/empty.

- [x] 🔴 Tulis tes: dokumen tanpa `ir_id` harus gagal validasi Pass 1
- [x] 🔴 Tulis tes: dokumen dengan `ir_id` bukan UUID v4 harus gagal validasi
- [x] 🔴 Tulis tes: `meta.domain` null/empty harus gagal validasi
- [x] 🔴 Tulis tes: `meta.schema_version` harus selalu `"1.0"`
- [x] 🔴 Tulis tes: `meta.tier` hanya boleh `"nano" | "core" | "full"`
- [x] 🔴 Tulis tes: `meta.max_tree_depth` harus ≤ 64 (Keputusan #24)
- [x] 🟢 Implementasi `IRDocument` interface TypeScript dengan semua field `meta`
- [x] 🟢 Implementasi JSON Schema Draft 7 untuk `IRDocument.meta`
- [x] 🟢 Implementasi factory `createIRDocument(opts): IRDocument` — auto-generate UUID v4
- [x] 🔵 Refactor: factory harus memastikan `ir_id` tidak dapat di-override setelah set pertama kali

### 1.5 Tier System (Nano ⊂ Core ⊂ Full)
- [x] 🔴 Tulis tes: dokumen tier `nano` dengan lebih dari 100 node harus ditolak
- [x] 🔴 Tulis tes: dokumen tier `nano` dengan kedalaman pohon > 8 harus ditolak
- [x] 🔴 Tulis tes: dokumen tier `core` dengan lebih dari 1.000 node harus ditolak
- [x] 🔴 Tulis tes: dokumen tier `core` dengan kedalaman pohon > 32 harus ditolak
- [x] 🔴 Tulis tes: dokumen tier `nano` tidak boleh memuat asset eksternal atau plugin
- [x] 🟢 Implementasi `TierConstraints` config per tier
- [x] 🟢 Implementasi `validateTierLimits(doc: IRDocument): ValidationResult`
- [x] 🔵 Refactor: constraint values harus diambil dari konstanta yang dapat dikonfigurasi

### 1.6 `IRGapRegistry`
- [x] 🔴 Tulis tes: setiap `IRGapEntry` harus memiliki `id` unik dengan prefix `IRGAP-`
- [x] 🔴 Tulis tes: gap dengan `status: "resolved"` harus memiliki `resolved_in` field
- [x] 🟢 Implementasi `IRGapEntry` interface
- [x] 🟢 Implementasi konstanta `IR_GAP_REGISTRY_V1` dengan 4 entri aktif (IRGAP-001 s.d. IRGAP-004)
- [x] 🟢 Implementasi fungsi `getOpenGaps(): IRGapEntry[]` dan `getGapById(id: string): IRGapEntry | undefined`

### 1.7 JSON Schema & AJV Validator (Pass 1 Foundation)
> ⛔ Milestone M1 gate: semua tes di fase 1 harus lulus 100% sebelum fase 2.

- [x] 🔴 Tulis tes integrasi: dokumen valid minimal (Nano tier) lulus validasi AJV tanpa error
- [x] 🔴 Tulis tes integrasi: dokumen dengan field tambahan tidak dikenal (unknown fields) ditangani sesuai mode `additionalProperties: false`
- [x] 🟢 Generate JSON Schema dari TypeScript interfaces menggunakan `ts-json-schema-generator`
- [x] 🟢 Konfigurasi instance AJV dengan opsi `strict: true`, `coerceTypes: false`
- [x] 🟢 Implementasi `validateHIR(document: unknown): ValidationResult` sebagai entry point Pass 1
- [x] 🔵 Refactor: kumpulkan seluruh error AJV menjadi array `ValidationError[]` yang terstruktur

---

## FASE 2 — Style System & Token Resolution
**Milestone M2: Cascade & Token Resolution Berjalan (Target: Akhir Bulan ke-6)**

### 2.1 `IRStyleContext` & Design Tokens
> 🔑 Keputusan #01: Urutan cascade = inline → component → global theme → brand profile.

- [x] 🔴 Tulis tes: token `theme://colors.primary` harus resolve ke nilai konkret berdasarkan `theme_tokens` aktif
- [x] 🔴 Tulis tes: token `brand://palette.accent` harus resolve ke nilai brand profile aktif
- [x] 🔴 Tulis tes: token yang tidak ditemukan harus mengembalikan `fallback` value atau error terstruktur
- [x] 🟢 Implementasi `IRStyleContext` interface (theme_tokens, brand_profile, component_styles)
- [x] 🟢 Implementasi `ColorValue` type alias (hex, rgba, cmyk, hsl, brand://, theme://, pantone://)

### 2.2 `IRBrandProfile`
- [x] 🔴 Tulis tes: dokumen domain `print` dengan brand profile harus memiliki palet warna CMYK
- [x] 🔴 Tulis tes: brand profile dengan warna Pantone harus memiliki format `pantone://[name]`
- [x] 🟢 Implementasi `IRBrandProfile` interface (color_palette, typography_tokens, spacing_tokens)
- [x] 🟢 Implementasi `resolveBrandToken(ref: string, brand: IRBrandProfile): string | undefined`

### 2.3 Style Cascade Resolution (Pass 2)
- [x] 🔴 Tulis tes: inline style override sebuah node harus mengalahkan component style
- [x] 🔴 Tulis tes: component style harus mengalahkan global theme
- [x] 🔴 Tulis tes: global theme harus mengalahkan brand profile
- [x] 🔴 Tulis tes: `StyleOverride` pada node anak tidak boleh mempengaruhi node induk
- [x] 🟢 Implementasi fungsi `resolveStyleCascade(node: IRNode, context: IRStyleContext): ResolvedStyle`
- [x] 🟢 Implementasi `resolveColorValue(value: ColorValue, context: IRStyleContext): string`
- [x] 🔵 Refactor: gunakan memoization pada token resolution untuk dokumen besar

### 2.4 `IRCanvas` & Mode Context
> 🔑 Keputusan #08: unit dasar dikunci per domain (px untuk digital, mm/pt untuk cetak, bar/beat untuk musik).

- [x] 🔴 Tulis tes: `IRCanvas` dengan `width: 0` atau `height: 0` harus gagal validasi
- [x] 🔴 Tulis tes: `IRCanvas` domain `print` harus memiliki `dpi` field
- [x] 🔴 Tulis tes: `IRCanvas` domain `music_production` harus memiliki `sample_rate` field
- [x] 🟢 Implementasi `IRCanvas` interface (standard canvas)
- [x] 🟢 Implementasi `IRAudioCanvas` interface (audio/music domain)
- [x] 🟢 Implementasi `IR3DViewport` interface (3D domain)
- [x] 🔴 Tulis tes: `IRCanvasModeContext` discriminated union memilih tipe yang benar berdasarkan `type` field
- [x] 🟢 Implementasi seluruh 7 konteks canvas:
  - [x] `IRPixelCanvasContext` (pixel art, pixel_width: 8–512)
  - [x] `IRMultiPageContext` (print, document)
  - [x] `IRMusicCanvasContext` (music_production, bpm: 20–300)
  - [x] `IRFontCanvasContext` (font_design, em: 1000|2048)
  - [x] `IRDiagramCanvasContext` (diagram)
  - [x] `IR3DCanvasContext` (3d)
  - [x] `IRMockupCanvasContext` (mockup)

### 2.5 Canvas Presets
> 🔑 Keputusan #33: ID preset standar bersifat permanen (e.g., `"A4"`, `"1080p"`).

- [x] 🔴 Tulis tes: preset `A4` harus menghasilkan canvas 210×297mm, dpi 300, color_space CMYK
- [x] 🔴 Tulis tes: preset `1080p` harus menghasilkan canvas 1920×1080px, sRGB
- [x] 🟢 Implementasi `CANVAS_PRESETS` konstanta (minimal 10 preset umum)
- [x] 🟢 Implementasi `applyPreset(preset_id: string): Partial<IRCanvas>`

---

## FASE 3 — Constraint & Semantic Engine
**Milestone M3: Validasi Semantik Live (Target: Akhir Bulan ke-9)**

### 3.1 `IRNode` & `IRNodeType` Registry
> 🔑 Keputusan #17: mapping `IR_ALLOWED_NODE_TYPES_BY_DOMAIN` dikunci setelah v1.0.

- [x] 🔴 Tulis tes: node bertipe `music_track` dalam domain `visual` harus ditolak Pass 1
- [x] 🔴 Tulis tes: node bertipe `glyph` hanya valid di domain `font_design`
- [x] 🔴 Tulis tes: node bertipe `bpmn_element` hanya valid di domain `diagram`
- [x] 🟢 Implementasi `IRNodeType` union type (seluruh 60+ tipe node dari spec)
- [x] 🟢 Implementasi konstanta `IR_ALLOWED_NODE_TYPES_BY_DOMAIN` untuk 17 domain
- [x] 🟢 Implementasi `isNodeAllowedInDomain(nodeType: IRNodeType, domain: IRDomain): boolean`
- [x] 🔵 Refactor: validasi dilakukan di Pass 1 sebelum proses lebih lanjut

### 3.2 `IRGeometry` & Transformasi
- [x] 🔴 Tulis tes: `IRGeometry` dengan `width < 0` atau `height < 0` harus gagal validasi
- [x] 🔴 Tulis tes: `rotation` harus dalam rentang 0–360 derajat
- [x] 🔴 Tulis tes: `IRMatrix2D` dengan nilai `a=1, b=0, c=0, d=1, tx=0, ty=0` adalah identitas
- [x] 🟢 Implementasi `IRGeometry` interface (2D + properti 3D opsional)
- [x] 🟢 Implementasi `IRMatrix2D` interface
- [x] 🟢 Implementasi fungsi `applyTransform(geo: IRGeometry, matrix: IRMatrix2D): IRGeometry`

### 3.3 `IRNodeContent` — Discriminated Union
> 🔑 Keputusan #18: discriminated union berdasarkan properti `kind`.

- [x] 🔴 Tulis tes: `IRTextContent` tanpa `raw` harus gagal validasi
- [x] 🔴 Tulis tes: `IRImageContent` tanpa `asset_id` dan tanpa `fit` harus gagal
- [x] 🔴 Tulis tes: `IRVideoContent` dengan `in_point_ms > out_point_ms` harus gagal
- [x] 🔴 Tulis tes: `IRShapeContent` dengan `shape_type: "polygon"` harus memiliki `sides >= 3`
- [x] 🔴 Tulis tes: `IRSVGPathContent` dengan `d` string kosong harus gagal
- [x] 🟢 Implementasi 17 `IRNodeContent` subtypes:
  - [x] `IRTextContent` (raw, rich_text, font_ref, text_align, overflow, chain_to)
  - [x] `IRImageContent` (asset_id, fit, focal_point, filters)
  - [x] `IRShapeContent` (shape_type, corner_radius, sides, star_ratio)
  - [x] `IRSVGPathContent` (d, fill_rule, path_type)
  - [x] `IRVideoContent` (asset_id, in_point_ms, out_point_ms, volume, muted, loop, playback_speed)
  - [x] `IRAudioContent` (asset_id, in_point_ms, out_point_ms, volume, muted, pan, loop)
  - [x] `IRChartContent` (chart_type, data_source, axes, series)
  - [x] `IRDocContent` (doc_type, paragraphs, toc)
  - [x] `IRDiagramNodeContent` (diagram_type, label, shape)
  - [x] `IRDiagramEdgeContent` (source_id, target_id, edge_type, waypoints)
  - [x] `IRMusicTrackContent` (track_type, clips, effects, volume, pan)
  - [x] `IRMusicNoteContent` (pitch, velocity, start_beat, duration_beats, channel)
  - [x] `IRPixelCelContent` (layer_id, pixel_data)
  - [x] `IRMesh3DContent` (geometry, material_id, cast_shadow)
  - [x] `IRGlyphContent` (unicode, contours, advance_width)
  - [x] `IRDeviceFrameContent` (device_type, screen_content_id)
  - [x] `IRPrintTextFrameContent` (text_chain_id, columns)

### 3.4 `IRAssetRef` & `asset://` URI Scheme
> 🔑 Keputusan #34: referensi ke media biner wajib menggunakan `asset://[UUID]`.

- [x] 🔴 Tulis tes: `IRAssetRef` dengan URL bukan format `asset://` harus gagal validasi
- [x] 🔴 Tulis tes: `IRAssetRef` tanpa `checksum` (SHA-256) harus gagal
- [x] 🔴 Tulis tes: `IRAssetRef` tipe `image` wajib memiliki `dimensions`
- [x] 🔴 Tulis tes: `IRAssetRef` tipe `audio` wajib memiliki `duration_ms`
- [x] 🟢 Implementasi `IRAssetRef` interface
- [x] 🟢 Implementasi `buildAssetURI(assetId: string): string` → `"asset://{uuid}"`
- [x] 🟢 Implementasi `parseAssetURI(uri: string): string | null` → extract UUID

### 3.5 `IRSemanticRule` & WCAG Engine
> 🔑 Keputusan #07: setiap aturan harus diberi label `STABLE`, `BETA`, atau `x_*`.

- [x] 🔴 Tulis tes: teks putih (#FFFFFF) di atas latar putih (#FFFFFF) harus gagal WCAG AA (rasio 1:1)
- [x] 🔴 Tulis tes: teks hitam (#000000) di atas latar putih (#FFFFFF) harus lulus WCAG AAA (rasio 21:1)
- [x] 🔴 Tulis tes: teks 16px dengan rasio kontras ≥ 4.5:1 harus lulus WCAG AA
- [x] 🟢 Implementasi `calculateContrastRatio(fg: string, bg: string): number`
- [x] 🟢 Implementasi `checkWCAGCompliance(ratio: number, level: "A"|"AA"|"AAA", fontSize: number): boolean`
- [x] 🟢 Implementasi `IRSemanticRule` interface (rule_id, severity, evaluate_at, condition)
- [x] 🔵 Refactor: aturan WCAG harus callable sebagai tool `validate_accessibility` (lihat Fase 7)

### 3.6 Constraint Engine (Pass 3)
- [x] 🔴 Tulis tes: domain `print` tanpa `physical` spec harus gagal Pass 3
- [x] 🔴 Tulis tes: domain `video` tanpa `timeline` harus gagal Pass 3
- [x] 🔴 Tulis tes: domain `audio` tanpa `IRAudioCanvas` harus gagal Pass 3
- [x] 🔴 Tulis tes: kedalaman pohon node melebihi `max_tree_depth` harus gagal Pass 3
- [x] 🟢 Implementasi `runPass3(doc: IRDocument): SemanticValidationResult`
- [x] 🟢 Implementasi validasi matriks domain coverage (lihat tabel §8.9 spec)
- [x] 🔵 Refactor: sub-pass 3a–3e harus dapat dijalankan secara paralel

---

## FASE 4 — Renderer Core (SVG & Web Canvas)
**Milestone M4: Rendering Statis Live (Target: Akhir Bulan ke-12)**

### 4.1 Layout Computation (Pass 4)
- [x] 🔴 Tulis tes: node dengan `layout: "flex"` dan anak-anaknya harus menghasilkan posisi absolut yang benar
- [x] 🔴 Tulis tes: node `group` harus menghitung bounding box dari seluruh anaknya
- [x] 🔴 Tulis tes: `IRNodeConstraints` (min_width, max_width) harus diterapkan saat layout
- [x] 🟢 Implementasi `computeLayout(doc: IRDocument): ComputedLayoutMap`
- [x] 🟢 Implementasi Flexbox layout engine (menggunakan `yoga-layout` atau implementasi sendiri)
- [x] 🟢 Implementasi Grid layout engine
- [x] 🔵 Refactor: layout harus mendukung dirty-tracking untuk tier `core` (hanya recompute node berubah)

### 4.2 SVG Renderer Backend
- [x] 🔴 Tulis tes: node `IRShapeContent` tipe `rect` harus menghasilkan elemen `<rect>` SVG yang valid
- [x] 🔴 Tulis tes: node `IRShapeContent` tipe `ellipse` harus menghasilkan `<ellipse>` SVG
- [x] 🔴 Tulis tes: node `IRSVGPathContent` harus menghasilkan `<path d="...">` SVG yang identik
- [x] 🔴 Tulis tes: node `IRTextContent` harus menghasilkan `<text>` SVG dengan atribut font yang benar
- [x] 🔴 Tulis tes: node dengan `blend_mode: "multiply"` harus menghasilkan `mix-blend-mode: multiply` di SVG
- [x] 🔴 Tulis tes: node dengan `opacity: 0.5` harus menghasilkan `opacity="0.5"` di SVG
- [x] 🟢 Implementasi `SVGRenderer`: IRDocument → string (SVG output)
- [x] 🟢 Implementasi semua `IRShapeContent` types ke SVG primitives
- [x] 🟢 Implementasi `IRImageContent` ke `<image>` SVG dengan href ke asset
- [x] 🟢 Implementasi `IRBlendMode` ke SVG/CSS mix-blend-mode
- [x] 🔵 Refactor: gunakan virtual DOM SVG untuk operasi diff yang efisien

### 4.3 Web Canvas 2D Renderer Backend
- [x] 🔴 Tulis tes: `IRShapeContent` tipe `rect` menghasilkan call `ctx.fillRect()` yang benar
- [x] 🔴 Tulis tes: node dengan `IRImageFilter` brightness harus menghasilkan filter canvas yang sesuai
- [x] 🟢 Implementasi `Canvas2DRenderer`: IRDocument → HTMLCanvasElement instructions
- [x] 🔵 Refactor: group render calls menggunakan `ctx.save()` / `ctx.restore()`

### 4.4 LIR Generation (Pass 7 — Static)
- [x] 🔴 Tulis tes: MIR domain `visual` harus generate LIR bertipe SVG instructions
- [x] 🔴 Tulis tes: MIR domain `image_edit` harus generate LIR bertipe Canvas2D instructions
- [x] 🟢 Implementasi `IRLIRDocument` interface (low-level representation)
- [x] 🟢 Implementasi `generateLIR(mir: IRMIRDocument, target: PlatformTarget): IRLIRDocument`
- [x] ⛔ **Milestone M4 Gate:** Render dokumen Nano-tier domain `visual` menjadi SVG valid. Jalankan visual regression tests sebelum lanjut ke Fase 5.

---

## FASE 5 — Timeline & Temporal Resolution
**Milestone M5: Animasi & Keyframe Live (Target: Akhir Bulan ke-15)**

### 5.1 `IRTimeline` & Track System
- [x] 🔴 Tulis tes: `IRTimeline` tanpa `duration_ms` di domain `video` harus gagal validasi
- [x] 🔴 Tulis tes: track audio dan track visual dalam dokumen `video` harus dapat berjalan bersamaan
- [x] 🔴 Tulis tes: klip pada timeline tidak boleh saling overlap jika `allow_overlap: false`
- [x] 🟢 Implementasi `IRTimeline` interface (tracks, markers, duration_ms)
- [x] 🟢 Implementasi `IRTimelineTrack` (id, type: video|audio|motion, clips)
- [x] 🟢 Implementasi `IRTimelineClip` (id, start_ms, duration_ms, asset_id)

### 5.2 `IRKeyframe` & Easing Engine
> 🔑 Keputusan #28: properti keyframe harus dideklarasikan tipe datanya secara statis.

- [x] 🔴 Tulis tes: keyframe `geometry.x` dengan value string harus gagal validasi (type mismatch)
- [x] 🔴 Tulis tes: keyframe pada waktu `t=0ms` dan `t=1000ms` untuk `opacity: 0→1` harus menghasilkan `opacity=0.5` pada `t=500ms` dengan easing `linear`
- [x] 🔴 Tulis tes: easing `ease-in` harus menghasilkan nilai lebih rendah dari `linear` pada titik tengah
- [x] 🟢 Implementasi `IRKeyframe` interface (time, property, value, easing)
- [x] 🟢 Implementasi `interpolateKeyframe(keyframes: IRKeyframe[], time: number): PropertyMap`
- [x] 🟢 Implementasi fungsi easing: `linear`, `ease-in`, `ease-out`, `ease-in-out`, `cubic-bezier()`

### 5.3 Temporal Resolution (Pass 5)
> 🔑 Keputusan #12: domain `music_production` menggunakan unit bar/beat yang dikonversi ke ms berdasarkan BPM.

- [x] 🔴 Tulis tes: pada BPM=120, 1 beat = 500ms; bar pertama (4/4) dimulai pada 0ms, berakhir 2000ms
- [x] 🔴 Tulis tes: `IRTempoChange` pada bar ke-5 dari 120 BPM ke 180 BPM harus mengubah timing semua note setelahnya
- [x] 🟢 Implementasi `convertBeatToMs(beat: number, bpm: number, timeSigNum: number, timeSigDen: number): number`
- [x] 🟢 Implementasi `resolveTempoChanges(changes: IRTempoChange[], totalBars: number): TempoMap`
- [x] 🟢 Implementasi `runPass5(doc: IRDocument, assetPool: IRAssetRef[]): TemporalResolutionResult`

### 5.4 Automation Schedules
- [x] 🔴 Tulis tes: otomasi `volume` pada track audio dari 0.0 ke 1.0 dalam 1 detik harus interpolasi dengan benar
- [x] 🟢 Implementasi `IRAutomationCurve` interface (parameter, control_points, range)
- [x] 🟢 Implementasi `evaluateAutomation(curve: IRAutomationCurve, time_ms: number): number`

---

## FASE 6 — Data Binding & Interaction Store
**Milestone M6: Interaksi & State Engine (Target: Akhir Bulan ke-18)**

### 6.1 `IRDataBinding` System
> 🔑 Keputusan #36: penggunaan token literal dalam data binding dilarang. Wajib `env:`, `vault:`, atau `secret:` prefix.

- [x] 🔴 Tulis tes: `IRDataBinding` dengan `auth.token: "Bearer abc123"` literal harus gagal validasi
- [x] 🔴 Tulis tes: `IRDataBinding` dengan `auth.token: "env:API_TOKEN"` harus lulus validasi
- [x] 🔴 Tulis tes: `IRDataBinding` tipe `api_rest` tanpa `endpoint` harus gagal validasi
- [x] 🔴 Tulis tes: `IRDataBinding` dengan transform `op: "filter"` tanpa `params` harus gagal
- [x] 🟢 Implementasi `IRDataBinding` interface (source, endpoint, method, transforms, fallback)
- [x] 🟢 Implementasi `SecretRef` type (`env:*`, `vault:*`, `secret:*`)
- [x] 🟢 Implementasi `validateSecretRef(value: unknown): value is SecretRef`
- [x] 🟢 Implementasi `circuit_breaker` dan `retry` logic untuk data binding failures
- [x] 🔵 Refactor: semua token autentikasi harus melewati `SecretRef` validator sebelum digunakan

### 6.2 `IRInteractionModel` & State Machine
> 🔑 Keputusan #18: `IRAction` menggunakan discriminated union untuk validasi statis payload.

- [x] 🔴 Tulis tes: state machine dengan state `active` dan `inactive`, trigger `click` harus berpindah state dengan benar
- [x] 🔴 Tulis tes: aksi `navigate` tanpa `target_id` harus gagal validasi
- [x] 🔴 Tulis tes: aksi `toggle_state` harus membalik state boolean target dengan benar
- [x] 🟢 Implementasi `IRInteractionModel` (states, transitions, triggers, variables)
- [x] 🟢 Implementasi `IRAction` discriminated union (navigate, toggle_state, play_animation, open_modal, scroll_to, custom)
- [x] 🟢 Implementasi `InteractionEngine`: evaluasi trigger & eksekusi aksi di runtime

### 6.3 DSL Expression Engine
- [x] 🔴 Tulis tes: ekspresi `"$data.count > 10"` dengan `$data.count = 15` harus evaluate `true`
- [x] 🔴 Tulis tes: ekspresi DSL dengan referensi variabel yang tidak ada harus mengembalikan error
- [x] 🟢 Implementasi `IRDSLExpression` type
- [x] 🟢 Implementasi `evaluateDSL(expr: IRDSLExpression, context: Record<string, unknown>): unknown`
- [x] 🔵 Refactor: sandboxing DSL evaluator — tidak boleh mengakses global scope

---

## FASE 7 — Physical Output (PDF/X & DXF)
**Milestone M7: Output Cetak Sempurna (Target: Akhir Bulan ke-21)**

### 7.1 `IRPhysicalSpec` & Print Domain
> 🔑 Keputusan #25: domain `print` dan `packaging` wajib menghentikan kompilasi jika DPI tidak match.

- [x] 🔴 Tulis tes: dokumen domain `print` dengan `dpi_sync_policy: "strict"` dan DPI canvas ≠ DPI fisik harus gagal Pass 1
- [x] 🔴 Tulis tes: dokumen domain `packaging` tanpa `print_dieline` node harus gagal Pass 3
- [x] 🔴 Tulis tes: area konten yang melewati `safe_zone` di domain `signage` harus menghasilkan warning
- [x] 🟢 Implementasi `IRPhysicalSpec` interface (bleed, safe_zone, trim_size, dpi, color_space)
- [x] 🟢 Implementasi `IRPrintSpec` (paper_size, binding, folding, varnish_areas)
- [x] 🟢 Implementasi `IRPackagingSpec` (dieline_id, fold_lines, cut_lines, score_lines)
- [x] 🟢 Sub-pass 3e: validasi `print_bleed_guide` dan `print_safe_guide` nodes

### 7.2 PDF/X-4 Renderer Backend
- [x] 🔴 Tulis tes: output PDF/X-4 harus mengandung metadata `%PDF-1.6` header
- [x] 🔴 Tulis tes: warna CMYK dalam PDF output harus sesuai dengan nilai spesifikasi (tidak dikonversi ke RGB)
- [x] 🔴 Tulis tes: font dalam PDF harus di-embed, bukan referenced
- [x] 🟢 Implementasi `PDFXRenderer`: IRDocument → Buffer (PDF/X-4 output) menggunakan library `pdf-lib` atau `pdfkit`
- [x] 🟢 Implementasi color space conversion: `sRGB → CMYK` menggunakan ICC profile
- [x] 🔵 Refactor: DXF export untuk domain `packaging` (dieline output)

---

## FASE 8 — Domain Expansion & Mode Context
**Milestone M8: Konteks Mode Terintegrasi (Target: Akhir Bulan ke-24)**

### 8.1 Multi-Domain Document Support
- [x] 🔴 Tulis tes: dokumen dengan `meta.domain: "video"` dan `meta.active_domains: ["audio", "visual"]` harus valid
- [x] 🔴 Tulis tes: domain `visual` tidak boleh berisi domain `3d` tanpa `IR3DViewport` canvas
- [x] 🟢 Implementasi validasi `active_domains` kompatibilitas di Pass 1
- [x] 🟢 Implementasi multi-renderer dispatch untuk dokumen multi-domain

### 8.2 `IRAudioCanvas` — Domain Audio & Music
- [x] 🔴 Tulis tes: `IRAudioCanvas` dengan `sample_rate` bukan 44100/48000/96000 Hz harus gagal
- [x] 🔴 Tulis tes: `IRAudioCanvas` domain `music_production` tanpa `bit_depth` harus gagal
- [x] 🟢 Implementasi `IRAudioCanvas` interface lengkap

### 8.3 `IR3DViewport` — Domain 3D
- [x] 🔴 Tulis tes: `IR3DViewport` tanpa `camera_3d` node harus gagal Pass 3
- [x] 🔴 Tulis tes: `mesh_3d` tanpa `material_id` yang valid harus gagal Pass 3
- [x] 🟢 Implementasi `IR3DViewport` interface (scene_config, lighting, camera)
- [x] 🟢 Implementasi Three.js/WebGL renderer backend untuk domain `3d`

---

## FASE 9 — Observability & Telemetry
**Milestone M9: Jejak Audit & Audit WCAG (Target: Akhir Bulan ke-27)**

> ⛔ **CRITICAL GATE (Keputusan #09–#16):** Seluruh keputusan arsitektur #09 s.d. #16 harus teruji dan audit sebelum Fase 10. Kegagalan di sini menyebabkan storage rewrite.

### 9.1 Compilation Pass Profiler
- [x] 🔴 Tulis tes: setiap pass kompilasi harus mencatat `start_time_ms`, `end_time_ms`, dan `duration_ms`
- [x] 🔴 Tulis tes: pass yang melebihi `timeout_ms` harus menghasilkan warning observability
- [x] 🟢 Implementasi `IRCompilationProfile` interface (per-pass timing, memory_used_mb)
- [x] 🟢 Implementasi `CompilerProfiler.startPass(passId)` / `.endPass(passId)`

### 9.2 Accessibility Audit System
- [x] 🔴 Tulis tes: node `IRTextContent` tanpa `aria_label` di domain `interactive` harus menghasilkan WCAG warning
- [x] 🔴 Tulis tes: `IRAccessibilityAuditResult` dengan `status: "fail"` harus memiliki `message` dan `wcag_criterion`
- [x] 🟢 Implementasi `IRAccessibilityAuditResult` interface
- [x] 🟢 Implementasi `IRAccessibilityAnnotations` interface (wcag_level, audit_results, color_blind_simulations)
- [x] 🟢 Implementasi built-in tool `validate_accessibility` (tool_id dari IR_BUILTIN_TOOLS)

### 9.3 `x_debug` & Provenance Tracking
- [x] 🔴 Tulis tes: setiap modifikasi oleh AI agent harus dicatat di `x_debug.agent_provenance`
- [x] 🟢 Implementasi `IRDebugExtension` interface (compilation_trace, agent_provenance, diff_snapshot)
- [x] 🟢 Implementasi `IRVisualConstraintExtension` (gestalt_analysis, typography_analysis)

---

## FASE 10A — Document Domain
**Milestone M10-A: Dokumen Rich Text (Target: Akhir Bulan ke-30)**

### 10A.1 Document Node Types
- [ ] 🔴 Tulis tes: `doc_heading` harus memiliki level 1–6
- [ ] 🔴 Tulis tes: `doc_list_item` harus selalu berada di dalam `doc_list`
- [ ] 🔴 Tulis tes: `doc_code_block` harus memiliki `language` field
- [ ] 🟢 Implementasi semua 14 node type domain `document`
- [ ] 🟢 Sub-pass 4a: Multi-page Text Reflow engine

---

## FASE 10B — Diagram Domain
**Milestone M10-B: Diagram Alir (Target: Akhir Bulan ke-30)**

### 10B.1 Diagram Node & Edge System
- [ ] 🔴 Tulis tes: `diagram_edge` yang merujuk `source_id` node tidak ada harus gagal Pass 1 (dangling reference)
- [ ] 🔴 Tulis tes: graf diagram siklik harus terdeteksi dan dilaporkan di sub-pass 3d
- [ ] 🔴 Tulis tes: `bpmn_element` harus memiliki `bpmn_type` yang valid (start_event, end_event, task, gateway)
- [ ] 🟢 Implementasi semua 13 node type domain `diagram` (diagram_node, diagram_edge, uml_class, bpmn_element, dll.)
- [ ] 🟢 Sub-pass 3d: cyclic graph detection menggunakan DFS
- [ ] 🟢 Sub-pass 4b: A* pathfinding untuk auto-routing diagram edges
- [ ] 🟢 Sub-pass 7d: SVG connector generation dengan kurva Bezier

---

## FASE 11A — Music Production Domain
**Milestone M11-A: Editor DAW (Target: Akhir Bulan ke-33)**

### 11A.1 `IRMusicSpec` Implementation
> 🔑 Keputusan #12: domain `music_production` menggunakan bar/beat sebagai unit.

- [ ] 🔴 Tulis tes: `IRMusicSpec.project.bpm` di luar rentang 20–300 harus gagal
- [ ] 🔴 Tulis tes: `IRMidiNote.pitch` di luar 0–127 harus gagal
- [ ] 🔴 Tulis tes: `IRVirtualInstrument` tipe `synthesizer` harus memiliki `synth_params`
- [ ] 🔴 Tulis tes: `IRMusicEffect` dengan `type: "reverb"` harus memiliki `room_size` param
- [ ] 🟢 Implementasi `IRMusicSpec` interface (project, tracks, instruments, master_effects)
- [ ] 🟢 Implementasi `IRMusicTrack`, `IRMusicClip`, `IRMidiNote`
- [ ] 🟢 Implementasi `IRVirtualInstrument` (drum_machine, synthesizer, sampler)
- [ ] 🟢 Implementasi `IREnvelope`, `IRLFO`, `IRSampleMapEntry`, `IRDrumPad`
- [ ] 🟢 Sub-pass 3a: Music Semantic Validation (harmoni, ketukan, frekuensi)
- [ ] 🟢 Sub-pass 5a: konversi bar/beat → milidetik berdasarkan tempo map
- [ ] 🟢 Sub-pass 7a: Web Audio API node graph generation

---

## FASE 11B — Pixel Art Domain
**Milestone M11-B: Game Sprite & Pixel Art (Target: Akhir Bulan ke-33)**

### 11B.1 `IRPixelSpec` Implementation
> 🔑 Keputusan #11: data piksel biner tersimpan di node `pixel_cel`.

- [ ] 🔴 Tulis tes: `IRPixelCanvasContext.pixel_width` di luar rentang 8–512 harus gagal
- [ ] 🔴 Tulis tes: `IRPixelPalette` dengan `locked: true` tidak boleh menambah warna baru
- [ ] 🔴 Tulis tes: `IRSpriteTag` dengan `from_frame > to_frame` harus gagal
- [ ] 🔴 Tulis tes: `IRTilemapLayer` dengan `data.length ≠ map_width × map_height` harus gagal
- [ ] 🟢 Implementasi `IRPixelSpec` interface (palettes, layer_definitions, frames, sprite_tags, tilesets, tilemaps)
- [ ] 🟢 Implementasi `IRPixelLayerDef`, `IRPixelFrameDef`, `IRPixelCelRef`
- [ ] 🟢 Implementasi `IRSpriteTag` (from_frame, to_frame, direction, repeat)
- [ ] 🟢 Implementasi `IRTileset` dan `IRTilemap` (tile_width, tile_height, collision detection)
- [ ] 🟢 Sub-pass 3c: Pixel Semantic Validation (palet indeks, batas dimensi)
- [ ] 🟢 Sub-pass 5b: Pixel Frame Timing (durasi cel per frame, onion skin)
- [ ] 🟢 Sub-pass 7b: Canvas2D LIR generation, sprite sheet packing

---

## FASE 12A — Font Design Domain
**Milestone M12-A: Ekspor Font OTF/TTF (Target: Akhir Bulan ke-36)**

### 12A.1 `IRFontSpec` Implementation
> 🔑 Keputusan #10: EM unit dikunci 1000 atau 2048.
> 🔑 Keputusan #15: kerning class system menggunakan `IRKerningGroupDef`.

- [ ] 🔴 Tulis tes: `IRFontSpec.units_per_em` bukan 1000 atau 2048 harus gagal validasi
- [ ] 🔴 Tulis tes: `IRGlyphContent.contours` tidak boleh memiliki kontur terbuka (open contour)
- [ ] 🔴 Tulis tes: `IRKerningPairDef` dengan `left_class` dan `right_class` yang tidak ada di `grid_groups` harus gagal
- [ ] 🔴 Tulis tes: font dengan `auto_hint: true` harus menghasilkan TrueType hinting instructions
- [ ] 🟢 Implementasi `IRFontSpec` interface (family_name, metrics, glyphs, kerning_pairs, opentype_features, variable_axes)
- [ ] 🟢 Implementasi `IRKerningPairDef` dan `IRKerningGroupDef`
- [ ] 🟢 Implementasi `IROpenTypeFeature` (liga, smcp, calt, dll.)
- [ ] 🟢 Implementasi `IRVariableAxis` dan `IRFontMaster`
- [ ] 🟢 Sub-pass 3b: Font Semantic Validation (kontur bocor, metrik konsistensi)
- [ ] 🟢 Sub-pass 5c: Font Asset Resolution ke binary opentype
- [ ] 🟢 Sub-pass 7c: Kompilasi tabel OpenType (glyf, head, hhea) → `.otf`/`.ttf` menggunakan `opentype.js`

---

## FASE 12B — Mockup Domain
**Milestone M12-B: Mockup 3D Device Frame (Target: Akhir Bulan ke-36)**

### 12B.1 `IRMockupSpec` Implementation
- [ ] 🔴 Tulis tes: `device_frame` tanpa `screen_content_id` yang valid harus gagal Pass 3
- [ ] 🔴 Tulis tes: sudut perspektif mockup harus dalam rentang yang valid untuk CSS 3D transform
- [ ] 🟢 Implementasi `IRMockupSpec` interface (scene_3d_config, device_type, perspective)
- [ ] 🟢 Implementasi `IRDeviceFrameContent` (device_type, screen_content_id, bezel_color)
- [ ] 🟢 Sub-pass 7f: CSS 3D transform composition untuk mockup rendering

---

## FASE 13 — CRDT & Collaborative Sync
**Milestone M13: Kolaborasi Multi-Peer (Target: Akhir Bulan ke-40)**

### 13.1 `IRDelta` & Delta Stack
> 🔑 Keputusan #27: `IRDelta` wajib berupa operasi atomik (add, remove, replace, move) — deterministik.

- [ ] 🔴 Tulis tes: `IRDelta` dengan `delta_type: "undo"` harus memiliki `reverses_delta_id`
- [ ] 🔴 Tulis tes: menerapkan delta yang sama dua kali (idempotent) harus menghasilkan state yang sama
- [ ] 🔴 Tulis tes: delta bertipe `"migration"` harus memiliki `from_migration_id` field
- [ ] 🔴 Tulis tes: `IRDeltaStack` saat penuh (`max_size` terlampaui) harus membuang delta terlama
- [ ] 🟢 Implementasi semua `IRNodeOp`, `IRMetaOp`, `IRStyleOp`, `IRTimelineOp`, `IRAssetOp`, `IRSuggestionOp` types
- [ ] 🟢 Implementasi `IRDelta` interface
- [ ] 🟢 Implementasi `IRDeltaStack` (append-only, undo_pointer tracking)
- [ ] 🟢 Implementasi `applyDelta(doc: IRDocument, delta: IRDelta): IRDocument`
- [ ] 🟢 Implementasi `revertDelta(doc: IRDocument, delta: IRDelta): IRDocument`
- [ ] 🔵 Refactor: pastikan `delta_id` unik dan append-only — tidak dapat dihapus

### 13.2 Loro CRDT Integration
> 🔑 Keputusan #38: CRDT dikunci menggunakan pustaka **Loro** (Rust + WASM).

- [ ] 🔴 Tulis tes: dua peer mengubah `node.geometry.x` secara bersamaan harus menghasilkan state akhir yang deterministik
- [ ] 🔴 Tulis tes: merge konflik pada field yang sama harus menggunakan strategi Last-Write-Wins (LWW) berdasarkan timestamp
- [ ] 🔴 Tulis tes: Undo/Redo multi-user harus tidak merusak state peer lain
- [ ] 🟢 Instalasi dan konfigurasi `loro-crdt` WASM package
- [ ] 🟢 Implementasi `GenesisLoroDoc`: wrapper di atas Loro yang memetakan IRDocument ke Loro Map
- [ ] 🟢 Implementasi `syncWithPeer(localState: LoroState, remoteState: LoroState): IRDelta[]`
- [ ] 🟢 Implementasi `broadcastDelta(delta: IRDelta): void` via WebSocket transport
- [ ] 🔵 Refactor: pastikan Loro WASM berjalan di Worker thread untuk non-blocking sync

### 13.3 Multi-Agent Communication Protocol
> 🔑 Keputusan #20: jenis payload pesan antar agen dibatasi secara ketat.

- [ ] 🔴 Tulis tes: pesan agent dengan tipe payload yang tidak dikenal harus ditolak
- [ ] 🔴 Tulis tes: `IRAgentMessage` dari agent dengan `trust_level: "community"` tidak boleh melakukan aksi `irreversible`
- [ ] 🟢 Implementasi `IRAgentMessage` interface (from_agent, to_agent, payload_type, payload)
- [ ] 🟢 Implementasi `IRAgentRouter`: meneruskan pesan ke agent yang tepat berdasarkan `agent_type`

---

## FASE AGEN — Agent System & Tool Registry
**Paralel dengan Fase 9–13 | Milestone: Agent Runtime Live**

### A.1 `IRAgentContext` & `IRAgentContract`
> 🔑 Keputusan #19: `IRAgentContext.actions_taken` bersifat append-only. Tidak boleh dimodifikasi.
> 🔑 Keputusan #37: aksi dengan risk_level `irreversible` wajib eskalasi ke manusia.

- [ ] 🔴 Tulis tes: agent yang mencoba menghapus entry dari `actions_taken` harus menghasilkan error
- [ ] 🔴 Tulis tes: agent dengan `max_complexity: "simple"` tidak boleh memproses dokumen dengan 1000+ node
- [ ] 🔴 Tulis tes: aksi dengan `risk_level: "irreversible"` harus menghasilkan `escalate_to_human` decision
- [ ] 🟢 Implementasi `IRAgentContext` interface (agent_id, agent_type, session_id, actions_taken)
- [ ] 🟢 Implementasi `IRAgentAction` interface (timestamp, action_type, description, confidence)
- [ ] 🟢 Implementasi `IRAgentContract` interface (capabilities, decision_rules, coordination, escalation)
- [ ] 🟢 Implementasi `appendAgentAction(ctx: IRAgentContext, action: IRAgentAction): IRAgentContext`
- [ ] 🔵 Refactor: `actions_taken` harus menggunakan immutable append pattern (Object.freeze pada setiap entry)

### A.2 `IRTaskContext` & `IRAgentPlugin`
> 🔑 Keputusan #35: saat `delta_only: true`, agen hanya boleh mengembalikan IRDelta. Bukan seluruh dokumen.

- [ ] 🔴 Tulis tes: agen dengan `delta_only: true` yang mengembalikan full IRDocument harus ditolak
- [ ] 🔴 Tulis tes: `IRTaskContext.ir_slice` hanya boleh berisi path yang ada di `relevant_paths`
- [ ] 🟢 Implementasi `IRTaskContext` interface (task_id, intent, relevant_paths, delta_only, ir_slice)
- [ ] 🟢 Implementasi `buildIRSlice(doc: IRDocument, paths: string[]): Partial<IRDocument>`

### A.3 Plugin System
> 🔑 Keputusan #17: plugin menggunakan namespace `@namespace/name`.
> 🔑 Keputusan #21: `strict_ir_access` default `true` — plugin hanya mengakses properti yang dideklarasikan.
> 🔑 Keputusan #29: hirarki kepercayaan: `official` > `verified` > `community`.
> 🔑 Keputusan #30: aksi plugin dilarang memanipulasi properti di luar cakupan runtime-nya.
> 🔑 Keputusan #31: snapshot plugin bersifat read-only (immutable).

- [ ] 🔴 Tulis tes: plugin `@genesis/core` (official) dapat mengakses semua IR paths
- [ ] 🔴 Tulis tes: plugin `@community/xyz` tidak boleh mengakses paths di luar `declared_ir_access`
- [ ] 🔴 Tulis tes: plugin dengan `strict_ir_access: true` yang mengakses path tidak dideklarasikan harus throw error
- [ ] 🔴 Tulis tes: `plugin_registry_snapshot` setelah commit tidak dapat dimodifikasi
- [ ] 🟢 Implementasi `IRPluginManifest` interface (namespace, version, trust_level, declared_ir_access)
- [ ] 🟢 Implementasi `PluginSandbox`: eksekusi plugin dalam isolated environment
- [ ] 🟢 Implementasi `PluginRegistry`: manage plugin lifecycle (install, enable, disable, snapshot)

### A.4 `IRToolRegistry` & 9 Built-in Tools
> 🔑 Keputusan #40: 9 registry ID built-in tools dikunci permanen di compiler core.

- [ ] 🔴 Tulis tes: seluruh 9 built-in tools terdaftar dengan `tool_id` yang benar
- [ ] 🔴 Tulis tes: tool `validate_accessibility` dengan `wcag_level: "AA"` mendeteksi rasio kontras < 4.5
- [ ] 🔴 Tulis tes: tool `apply_brand` mengembalikan `IRDelta` (bukan full dokumen)
- [ ] 🔴 Tulis tes: tool `check_contrast` dengan warna identik mengembalikan `ratio: 1`
- [ ] 🔴 Tulis tes: tool `resolve_token` dengan token tidak ada dan `fallback` tersedia mengembalikan fallback
- [ ] 🔴 Tulis tes: tool dengan `risk_level: "dangerous"` harus memerlukan konfirmasi eksplisit
- [ ] 🟢 Implementasi seluruh 9 built-in tools:
  - [ ] `validate_accessibility` — WCAG audit (timeout: 2000ms)
  - [ ] `apply_brand` — brand token application (timeout: 3000ms)
  - [ ] `check_contrast` — WCAG contrast ratio (timeout: 500ms)
  - [ ] `resolve_token` — design token resolution (timeout: 200ms)
  - [ ] `get_ir_slice` — IR partial extraction (timeout: 1000ms)
  - [ ] `generate_ir_node` — AI node generation (timeout: 5000ms)
  - [ ] `validate_schema` — Pass 1 re-validation (timeout: 2000ms)
  - [ ] `compute_layout` — layout recalculation (timeout: 3000ms)
  - [ ] `export_asset` — asset compilation & export (timeout: 10000ms)
- [ ] 🟢 Implementasi `IRToolRegistry` interface dan `loadBuiltinTools(): IRToolRegistry`
- [ ] 🔵 Refactor: setiap tool harus memiliki `input_schema` dan `output_schema` JSON Schema v7 yang valid

---

## FASE BINARY — Serialisasi & Format .gir
**Paralel dengan Fase 8–13**

### B.1 `.gir` Binary Format
- [ ] 🔴 Tulis tes: header `.gir` byte 0–3 harus selalu `GIR!` (0x47 0x49 0x52 0x21)
- [ ] 🔴 Tulis tes: Document UUID di byte 16–31 harus identik dengan `meta.ir_id` setelah parse
- [ ] 🔴 Tulis tes: checksum SHA-256 (byte 52–63) harus mendeteksi payload yang dimodifikasi
- [ ] 🔴 Tulis tes: serialisasi → deserialisasi harus menghasilkan dokumen yang identik byte-per-byte
- [ ] 🟢 Implementasi `GIRHeader` structure (64 byte tepat, semua field sesuai spec)
- [ ] 🟢 Implementasi MessagePack serialization untuk 4 blok body
- [ ] 🟢 Implementasi LZ4 compression/decompression untuk blok 1–3
- [ ] 🟢 Implementasi `serializeToGIR(doc: IRDocument): Buffer`
- [ ] 🟢 Implementasi `deserializeFromGIR(buffer: Buffer): IRDocument`
- [ ] 🔵 Refactor: benchmark target < 50ms untuk serialisasi dokumen 1000 node

### B.2 Migration System
> 🔑 Keputusan #22: transformasi migrasi wajib menggunakan operator deklaratif, dilarang JS bebas.
> 🔑 Keputusan #26: setiap dokumen yang bermigrasi wajib mencatat `script_id`.

- [ ] 🔴 Tulis tes: `IRMigrationScript` tanpa `script_id` harus gagal registrasi
- [ ] 🔴 Tulis tes: operator deklaratif `rename_field` harus mengubah nama field tanpa kehilangan data
- [ ] 🔴 Tulis tes: `rollback` harus mengembalikan dokumen ke state sebelum migrasi
- [ ] 🟢 Implementasi `IRMigrationTransformer` (expand_migrate_contract, big_bang strategies)
- [ ] 🟢 Implementasi `IRMigrationScript` interface (script_id, from_version, to_version, transformers)
- [ ] 🟢 Implementasi `MigrationRegistry`: manage dan eksekusi skrip migrasi

---

## FASE RLVRR — Training Chain
**Paralel dengan Fase 13**

### R.1 RLVRR Reward Signal Chain
> 🔑 Keputusan #39: urutan evaluasi RLVRR dan bobotnya dikunci: Schema(0.40) → Brand(0.25) → Render(0.20) → Budget(0.10) → Semantik(0.05).

- [ ] 🔴 Tulis tes: output model yang gagal Sinyal 1 (schema) harus mendapat total reward 0 (short-circuit)
- [ ] 🔴 Tulis tes: output yang lulus 5 sinyal harus mendapat total reward = `0.40(1) + 0.25(1) + 0.20(1) + 0.10(1) + 0.05(1) = 1.0`
- [ ] 🔴 Tulis tes: output yang gagal Sinyal 3 (render) tidak boleh mengevaluasi Sinyal 4 dan 5
- [ ] 🟢 Implementasi `IRRLVRRSignal` interface (schema_compliance, brand_guard, render_error_rate, budget_accuracy, semantic_quality)
- [ ] 🟢 Implementasi `evaluateRLVRR(output: IRDocument, reference: IRDocument): IRRLVRRResult`
- [ ] 🟢 Implementasi gated evaluation: setiap sinyal hanya dievaluasi jika sinyal sebelumnya lulus
- [ ] 🔵 Refactor: bobot sinyal harus dapat dikonfigurasi via `IRRLVRRConfig` per training run

---

## CHECKLIST LINTAS-FASE: Keputusan Arsitektur Kritis

> Tabel berikut adalah rekap **40 keputusan arsitektur** dari spec yang harus diimplementasikan dan diuji.

| # | Keputusan | Implementasi | Tes | Status |
|---|-----------|:---:|:---:|:------:|
| #01 | Urutan cascade style: inline → component → theme → brand | Fase 2.3 | ✓ | `[ ]` |
| #02 | `ir_id` wajib UUID v4, immutable | Fase 1.4 | ✓ | `[ ]` |
| #03 | *(reserved)* | — | — | `[ ]` |
| #04 | Arsitektur 3-level HIR → MIR → LIR | Fase 1–4 | ✓ | `[ ]` |
| #05 | Pipeline 7 pass wajib (Pass 0–8) | Fase 1–9 | ✓ | `[ ]` |
| #06 | `meta.domain` tidak boleh null/empty | Fase 1.4 | ✓ | `[ ]` |
| #07 | Label stabilitas: STABLE, BETA, x_*, DEPRECATED | Semua fase | ✓ | `[ ]` |
| #08 | Unit standar per domain (px/mm/bar) | Fase 2.4 | ✓ | `[ ]` |
| #09 | 17 nama domain dikunci permanen | Fase 1.1 | ✓ | `[ ]` |
| #10 | EM unit font: 1000 atau 2048 | Fase 12A | ✓ | `[ ]` |
| #11 | Data piksel biner tersimpan di `pixel_cel` | Fase 11B | ✓ | `[ ]` |
| #12 | Bar/beat sebagai unit domain musik | Fase 5.3, 11A | ✓ | `[ ]` |
| #13 | *(reserved)* | — | — | `[ ]` |
| #14 | *(reserved)* | — | — | `[ ]` |
| #15 | Kerning class system `IRKerningGroupDef` | Fase 12A | ✓ | `[ ]` |
| #16 | Warna pixel palette wajib format hex | Fase 11B | ✓ | `[ ]` |
| #17 | Namespace plugin `@namespace/name` | Fase A.3 | ✓ | `[ ]` |
| #18 | Discriminated union `IRAction` & `IRNodeContent` | Fase 3.3, 6.2 | ✓ | `[ ]` |
| #19 | `actions_taken` append-only | Fase A.1 | ✓ | `[ ]` |
| #20 | Protokol pesan multi-agen kaku | Fase 13.3 | ✓ | `[ ]` |
| #21 | `strict_ir_access` default true | Fase A.3 | ✓ | `[ ]` |
| #22 | Migrasi wajib operator deklaratif | Fase B.2 | ✓ | `[ ]` |
| #23 | Canvas khusus Audio (`IRAudioCanvas`) dan 3D (`IR3DViewport`) | Fase 2.4, 8.2, 8.3 | ✓ | `[ ]` |
| #24 | `max_tree_depth` dikunci 64 | Fase 1.5 | ✓ | `[ ]` |
| #25 | DPI sync policy `strict` untuk domain cetak | Fase 7.1 | ✓ | `[ ]` |
| #26 | Migrasi wajib mencatat `script_id` | Fase B.2 | ✓ | `[ ]` |
| #27 | `IRDelta` wajib operasi atomik | Fase 13.1 | ✓ | `[ ]` |
| #28 | Properti keyframe dideklarasikan tipe statik | Fase 5.2 | ✓ | `[ ]` |
| #29 | Hirarki kepercayaan plugin: official > verified > community | Fase A.3 | ✓ | `[ ]` |
| #30 | Plugin action terisolasi pada scope-nya | Fase A.3 | ✓ | `[ ]` |
| #31 | Plugin snapshot immutable (read-only) | Fase A.3 | ✓ | `[ ]` |
| #32 | `IR_MODE_DOMAIN_MAP` dikunci sebagai konstanta | Fase 1.2 | ✓ | `[ ]` |
| #33 | ID canvas preset standar bersifat permanen | Fase 2.5 | ✓ | `[ ]` |
| #34 | Skema URI aset menggunakan `asset://` | Fase 3.4 | ✓ | `[ ]` |
| #35 | `delta_only: true` menolak full document return | Fase A.2 | ✓ | `[ ]` |
| #36 | Secret reference wajib `env:`, `vault:`, atau `secret:` | Fase 6.1 | ✓ | `[ ]` |
| #37 | Aksi `irreversible` wajib eskalasi ke manusia | Fase A.1 | ✓ | `[ ]` |
| #38 | CRDT menggunakan Loro (Rust + WASM) | Fase 13.2 | ✓ | `[ ]` |
| #39 | Urutan & bobot RLVRR dikunci | Fase R.1 | ✓ | `[ ]` |
| #40 | 9 built-in tool registry ID dikunci permanen | Fase A.4 | ✓ | `[ ]` |

---

## RINGKASAN MILESTONE & GATE KRITIS

```
[M1]  Bulan  3 — Schema Core, IRDomain, IRDocument, AJV validator        ⛔ GATE
[M2]  Bulan  6 — Style cascade, IRCanvas, token resolution
[M3]  Bulan  9 — Semantic engine, WCAG, IRNode system                    ⛔ GATE
[M4]  Bulan 12 — SVG & Canvas2D renderer (Nano-tier live)                ⛔ GATE
[M5]  Bulan 15 — Timeline, keyframe, temporal resolution
[M6]  Bulan 18 — Data binding, interaction state machine
[M7]  Bulan 21 — PDF/X-4, DXF, physical output
[M8]  Bulan 24 — Multi-domain, Audio canvas, 3D viewport
[M9]  Bulan 27 — Observability, WCAG audit, profiler                    ⛔ GATE (Kep. #09-#16)
[M10] Bulan 30 — Document & Diagram domains (paralel)
[M11] Bulan 33 — Music DAW & Pixel Art (paralel)
[M12] Bulan 36 — Font OTF/TTF & Mockup 3D (paralel)
[M13] Bulan 40 — CRDT Loro, multi-peer, multi-agent                     ⛔ GATE FINAL
```

**Estimasi total:** 27–40 bulan bergantung alokasi tim paralel

---

*Genesis IR Specification v1.0 — CHECKLIST.md*
*Dihasilkan dari: ir-specification-v1_0.md (Unified Edition)*
*Metodologi: TDD (Red → Green → Refactor) + Incremental Development*
