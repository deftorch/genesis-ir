# Panduan Penggunaan Antigravity — Genesis IR
## Quick Reference Card

---

## Memulai Antigravity untuk Proyek Ini

### 1. Setup Proyek di Antigravity 2.0
```
1. Buka Antigravity
2. Klik Select Project → New Project
3. Add Folder: [root folder genesis-ir]
4. Pilih profil: Review-driven development
5. AGENTS.md akan otomatis dibaca oleh semua agen
```

### 2. Profil Otonomi
**Pilih: Review-driven development**
(Terminal: Auto | Review: Request Review)

---

## ⌨ Shortcuts Harian

| Command | Fungsi |
|---------|--------|
| `/implement-feature` | Implementasi item CHECKLIST dengan TDD |
| `/validate-ir` | Validasi dokumen IR terhadap spec |
| `/phase-status` | Cek progres dan item berikutnya |
| `/new-package [nama]` | Generate boilerplate package @genesis |
| `/new-ir-doc [domain]` | Generate template IRDocument valid |

---

## Prompt Efektif untuk Genesis IR

### Untuk Implementasi Feature
```
"Implementasikan IRDomain type alias dan fungsi isValidIRDomain()
di package @genesis/types, mengikuti siklus TDD.
Mulai dengan tes yang gagal dulu."
```

### Untuk Debug Validation Error
```
"Dokumen ini gagal validasi Pass 1 dengan error [error message].
Ini adalah dokumen IRDocument: [paste JSON]
Bantu identifikasi masalah dan fix yang diperlukan."
```

### Untuk Review Architecture Decision
```
"Saya akan mengimplementasikan [fitur X]. Berdasarkan Keputusan #[N]
di spec, apa yang perlu saya perhatikan? Apakah ada konflik dengan
keputusan lain?"
```

---

## Urutan Implementasi yang Benar

```
PRE-PHASE (sekarang)
 → 0.1 Monorepo + TypeScript setup
 → 0.2 Package architecture creation

FASE 1 (bulan 1-3)
 → 1.1 IRDomain & IRMode
 → 1.2 IRDocument root schema
 → 1.3 Tier system
 → 1.4 AJV validator
  M1 GATE: 100% tes harus lulus

FASE 2 (bulan 4-6)
 → Style cascade
 → IRCanvas & mode contexts
 ...
```

---

## Yang Tidak Boleh Dilakukan

- Skip penulisan tes (TDD tidak bisa dibalik)
- Mengubah nama 17 domain yang sudah dikunci
- Bypass gate kritis ``
- Hardcode API token atau secret
- Menggunakan `any` type di TypeScript
- Menulis LIR langsung tanpa melalui HIR → MIR pipeline

---

## Coverage Report

Jalankan setelah setiap sesi:
```bash
pnpm test:coverage
```

Target: **≥ 80%** di semua package sebelum merge ke main.
