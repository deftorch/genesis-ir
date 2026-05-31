# Workflow: /implement-feature

## Nama: Implementasi Fitur Genesis IR dengan TDD

**Dipanggil dengan:** `/implement-feature`

## Konteks
Digunakan ketika ingin mengimplementasikan satu item dari CHECKLIST.md
mengikuti siklus TDD Red → Green → Refactor yang ketat.

---

## Langkah Wajib

### Step 1: Identifikasi
Tanyakan kepada saya:
1. **Nomor item** dari CHECKLIST.md yang akan diimplementasikan (contoh: "Fase 1.1 - IRDomain")
2. **Package target** (`@genesis/types`, `@genesis/schema`, dll.)

### Step 2: 🔴 RED — Tulis Tes Dulu
```
1. Buat file tes: packages/@genesis/<package>/src/__tests__/<NamaFitur>.test.ts
2. Import fungsi/interface yang BELUM ADA
3. Tulis semua tes dari CHECKLIST.md untuk item tersebut
4. Verifikasi tes GAGAL (merah) — ini membuktikan tes valid
5. Tampilkan output error tes ke saya
```

### Step 3: 🟢 GREEN — Implementasi Minimal
```
1. Buat file implementasi: packages/@genesis/<package>/src/<NamaFitur>.ts
2. Tulis HANYA kode yang cukup untuk membuat tes lulus
3. Jangan over-engineer — minimal dulu
4. Jalankan tes, pastikan semua hijau
```

### Step 4: 🔵 REFACTOR — Bersihkan
```
1. Tambahkan JSDoc lengkap dengan @stability tag
2. Pastikan TypeScript strict tidak ada error
3. Pastikan naming mengikuti konvensi IR (prefix IR, dll.)
4. Jalankan tes sekali lagi untuk konfirmasi masih hijau
5. Cek coverage: pnpm test:coverage
```

### Step 5: Checklist Update
Tampilkan ringkasan:
- Item mana yang berubah dari `[ ]` ke `[x]`
- Status coverage saat ini
- Item berikutnya yang direkomendasikan

---

## Output Format
Selalu tampilkan dalam urutan:
1. File tes yang dibuat (kode lengkap)
2. File implementasi (kode lengkap)
3. Ringkasan perubahan status CHECKLIST
