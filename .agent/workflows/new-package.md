# Workflow: /new-package

## Nama: Generate Boilerplate Package @genesis

**Dipanggil dengan:** `/new-package [nama-package]`

## Contoh Penggunaan
- `/new-package types`
- `/new-package schema`
- `/new-package compiler`

---

## Yang Dihasilkan

### Struktur Direktori
```
packages/@genesis/[nama]/
  src/
    index.ts          # Public API exports
  __tests__/
    .gitkeep
  package.json
  tsconfig.json
  vitest.config.ts
  README.md
```

### package.json Template
```json
{
  "name": "@genesis/[nama]",
  "version": "0.1.0",
  "private": true,
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "scripts": {
    "build": "tsc",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:coverage": "vitest run --coverage"
  }
}
```

### tsconfig.json Template
```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "dist",
    "rootDir": "src",
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true
  },
  "include": ["src/**/*"],
  "exclude": ["dist", "node_modules", "**/__tests__/**"]
}
```

### index.ts Template
```typescript
/**
 * @package @genesis/[nama]
 * @description [Deskripsi package]
 * @stability EXPERIMENTAL
 */

// Re-export semua public API
export * from './[module-utama]'
```

### vitest.config.ts Template
```typescript
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  }
})
```
