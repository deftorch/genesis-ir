# Rules: TypeScript Code Style — Genesis IR

## Wajib Diikuti di Seluruh Kode

### 1. Strict Mode & Type Safety
- Semua file TypeScript menggunakan `strict: true`
- Dilarang menggunakan `any` — gunakan `unknown` lalu narrowing
- Gunakan `readonly` untuk properti yang tidak boleh diubah setelah inisialisasi
- Gunakan `as const` untuk konstanta yang dikunci seperti domain names

### 2. Interface & Type Naming
- Semua interface IR menggunakan prefix `IR`: `IRDocument`, `IRNode`, `IRCanvas`
- Type alias untuk union: `IRDomain`, `IRNodeType`, `IRBlendMode`
- Konstanta registry: `IR_MODE_DOMAIN_MAP`, `IR_ALLOWED_NODE_TYPES_BY_DOMAIN`
- Factory functions: `createIRDocument`, `buildAssetURI`, `isValidIRDomain`

### 3. JSDoc Wajib untuk Semua Ekspor Publik
```typescript
/**
 * @stability STABLE | BETA | EXPERIMENTAL | DEPRECATED
 * Deskripsi fungsi/interface ini.
 * @param paramName - Deskripsi parameter
 * @returns Deskripsi return value
 */
```

### 4. Discriminated Union Pattern
- Selalu gunakan properti `kind` sebagai diskriminator untuk `IRNodeContent`
- Selalu gunakan properti `type` sebagai diskriminator untuk `IRCanvasModeContext`
- Jangan gunakan `instanceof` untuk type narrowing

### 5. Immutability untuk Data Kritis
- `ir_id` tidak pernah bisa di-set ulang setelah factory pembuatan
- `actions_taken` array selalu append-only, tidak pernah splice/filter
- Plugin snapshot tidak pernah dimodifikasi setelah commit
- Gunakan `Object.freeze()` untuk konstanta registry

### 6. Error Handling
- Selalu kembalikan `ValidationResult` (bukan throw) untuk error validasi
- Gunakan tipe `{ success: true; data: T } | { success: false; errors: ValidationError[] }`
- Log level: gunakan `error` hanya untuk kondisi yang benar-benar fatal

### 7. Asset Reference
- DILARANG hardcode URL string langsung di properti node
- WAJIB gunakan format `asset://[UUID]` untuk semua referensi aset
- DILARANG embed base64 di luar domain `pixel_art`

### 8. Secret Reference
- DILARANG literal API token, password, atau secret di dalam kode
- WAJIB gunakan format `env:VAR_NAME`, `vault:path`, atau `secret:name`
- Validator `validateSecretRef()` WAJIB dipanggil sebelum binding digunakan
