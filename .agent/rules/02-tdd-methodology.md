# Rules: Test-Driven Development (TDD) — Genesis IR

## Siklus Wajib: 🔴 RED → 🟢 GREEN → 🔵 REFACTOR

### Urutan yang Tidak Boleh Dilanggar
1. **TULIS TES DULU** — Sebelum menulis implementasi apapun, tulis tes yang GAGAL
2. **Implementasi MINIMAL** — Tulis kode paling sederhana yang membuat tes lulus
3. **Refactor** — Bersihkan kode sambil memastikan tes tetap hijau

### Struktur Tes Vitest
```typescript
import { describe, it, expect, beforeEach } from 'vitest'

describe('IRDomain', () => {
  describe('isValidIRDomain()', () => {
    it('should accept all 17 valid domain strings', () => {
      expect(isValidIRDomain('visual')).toBe(true)
      // ... semua 17 domain
    })

    it('should reject domain strings outside the 17 registered values', () => {
      expect(isValidIRDomain('unknown_domain')).toBe(false)
    })
  })
})
```

### Coverage Gate (TIDAK BOLEH BYPASS)
- Minimum **80% line coverage** di semua package
- Dijalankan otomatis di CI sebelum merge
- Command: `pnpm test:coverage`

### Kategori Tes yang Wajib Ada
1. **Unit test** — Setiap fungsi/interface ekspor publik
2. **Integration test** — Antar package (misal: @genesis/types + @genesis/schema)
3. **Validation test** — Semua kondisi valid DAN invalid harus diuji
4. **Gate test** — Tes yang ditandai `⛔` di CHECKLIST.md

### Tes untuk Kondisi Kritis
Setiap item di CHECKLIST.md yang memiliki prefix 🔴 WAJIB dibuat tes sebelum
prefix berubah ke 🟢.

### Naming Konvensi Tes
- `should accept [valid input]` → Untuk happy path
- `should reject [invalid input]` → Untuk validation error
- `should throw when [kondisi]` → Untuk exception
- `should return [expected output] when [kondisi]` → Untuk complex logic

### File Tes Wajib per Fase
- Fase 1: `IRDomain.test.ts`, `IRDocument.test.ts`, `TierSystem.test.ts`, `AJVValidator.test.ts`
- Fase 2: `StyleCascade.test.ts`, `IRCanvas.test.ts`, `CanvasPresets.test.ts`
- Fase 3: `IRNode.test.ts`, `IRNodeContent.test.ts`, `WCAGEngine.test.ts`
