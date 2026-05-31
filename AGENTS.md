# AGENTS.md — Genesis IR Specification v1.0
# Standing Instructions untuk Semua Agen di Workspace Ini

---

## 📌 Konteks Proyek

Proyek ini adalah **Genesis Intermediate Representation (IR) v1.0** — sebuah platform
TypeScript monorepo untuk representasi aset kreatif multi-domain (17 domain: visual,
video, audio, print, music_production, pixel_art, diagram, dll).

Arsitektur terdiri dari:
- HIR → MIR → LIR (3-level IR pipeline)
- 9 pass kompilasi wajib (Pass 0–8)
- 7 package: @genesis/types, @genesis/schema, @genesis/compiler, @genesis/renderer,
  @genesis/agent, @genesis/crdt, @genesis/sdk
- Metodologi: TDD (Red → Green → Refactor) + Incremental Development

---

## ⚠️ ATURAN KERAS (Tidak Boleh Dilanggar)

1. **Semua kode TypeScript wajib menggunakan `strict: true`**
2. **Setiap fitur WAJIB diawali dengan tes Vitest (TDD Red → Green → Refactor)**
3. **Coverage gate minimum 80% sebelum commit apapun**
4. **`ir_id` selalu UUID v4, IMMUTABLE setelah dibuat — tidak pernah boleh di-override**
5. **17 nama domain DIKUNCI permanen** — jangan tambah/ubah nama domain
6. **Status lifecycle dokumen FORWARD-ONLY** — tidak boleh downgrade status
7. **`asset://` URI scheme WAJIB untuk semua referensi aset biner**
8. **Secret/token WAJIB menggunakan `env:`, `vault:`, atau `secret:` prefix — DILARANG literal**
9. **Aksi `irreversible` WAJIB mendapat konfirmasi manusia sebelum dieksekusi**
10. **Plugin snapshot bersifat READ-ONLY setelah commit**

---

## 🔑 Keputusan Arsitektur Kritis (40 Keputusan Terkunci)

| # | Keputusan | Detail |
|---|-----------|--------|
| #01 | Style cascade order | inline → component → global theme → brand profile |
| #02 | ir_id format | UUID v4, immutable setelah dibuat |
| #04 | 3-level IR | HIR → MIR → LIR wajib |
| #05 | Pipeline 7 pass | Pass 0–8 semua wajib |
| #08 | Unit standar | px (digital), mm/pt (print), bar/beat (musik) |
| #09 | 17 domain dikunci | Tidak boleh diubah setelah v1.0 |
| #10 | EM font unit | Hanya 1000 atau 2048 |
| #11 | Pixel data | Disimpan di node `pixel_cel`, base64 RGBA |
| #12 | Musik unit | bar/beat dikonversi ke ms berdasarkan BPM |
| #27 | IRDelta atomik | add, remove, replace, move — deterministik |
| #38 | CRDT library | Loro (Rust + WASM) — dikunci |
| #39 | RLVRR weights | Schema(0.40) → Brand(0.25) → Render(0.20) → Budget(0.10) → Semantik(0.05) |
| #40 | 9 built-in tools | tool_id dikunci permanen di compiler core |

---

## 📐 Standar Koding

### TypeScript
- Gunakan `strict: true`, `noImplicitAny: true`, `strictNullChecks: true`
- Semua fungsi publik WAJIB memiliki JSDoc dengan `@stability` tag (STABLE/BETA/EXPERIMENTAL)
- Gunakan discriminated union dengan properti `kind` untuk polymorphic content
- Konstanta yang dikunci: gunakan `as const` dan `Object.freeze()`
- Naming: `IRxxx` untuk interfaces, `createXxx` untuk factory functions

### Struktur File
```
packages/
  @genesis/types/src/
    domains.ts        # IRDomain, IRMode, IR_MODE_DOMAIN_MAP
    document.ts       # IRDocument, IRCanvas, IRAudioCanvas, IR3DViewport
    nodes.ts          # IRNode, IRNodeType, IRNodeContent
    style.ts          # IRStyleContext, DesignTokenMap, ColorValue
    constraints.ts    # IRConstraintSet, IRSemanticRule
    timeline.ts       # IRTimeline, IRKeyframe, IRAutomationCurve
    agents.ts         # IRAgentContext, IRAgentContract, IRTaskContext
    delta.ts          # IRDelta, IRDeltaStack
    assets.ts         # IRAssetPool, IRAssetRef
    lir.ts            # WebLIR, PrintLIR, VideoLIR, dll
```

### Testing
- File tes di `__tests__/` sejajar dengan source
- Nama file: `xxx.test.ts`
- Setiap unit test: describe → context → it dengan nama deskriptif
- Tes integrasi di `tests/integration/`
- Tes E2E di `tests/e2e/` menggunakan Playwright

### Git
- Commit message: `[FASE-X] feat/fix/test: deskripsi singkat`
- Contoh: `[FASE-1] feat: implementasi IRDomain type alias dan fungsi isValidIRDomain`
- Jangan commit jika ada tes gagal (diblokir Husky)

---

## 🏗️ Milestone & Status Fase

| Milestone | Target | Status |
|-----------|--------|--------|
| M1: Schema Core | Bulan 3 | 🔴 BELUM MULAI |
| M2: Style & Token | Bulan 6 | 🔴 BELUM MULAI |
| M3: Semantic Engine | Bulan 9 | 🔴 BELUM MULAI |
| M4: Renderer | Bulan 12 | 🔴 BELUM MULAI |

**PHASE AKTIF: PRE-PHASE (Setup & Infrastruktur)**

---

## 🚨 Gate Kritis (Jangan Skip)

- `⛔` di CHECKLIST.md = GATE KRITIS, tidak boleh dilewati
- M1 gate: semua tes Fase 1 harus 100% lulus sebelum Fase 2
- M4 gate: visual regression test SVG harus lulus sebelum Fase 5
- M9 gate (Kep. #09–#16): harus audit semua keputusan #09 s.d. #16
