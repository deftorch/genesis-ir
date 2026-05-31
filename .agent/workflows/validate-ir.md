# Workflow: /validate-ir

## Nama: Validasi Dokumen IR terhadap Spesifikasi Genesis

**Dipanggil dengan:** `/validate-ir`

## Tujuan
Memvalidasi sebuah dokumen IRDocument JSON terhadap semua constraint
dari Genesis IR Specification v1.0.

---

## Langkah Validasi

### Pass 1: Schema Validation
Periksa:
- [ ] `meta.ir_id` format UUID v4?
- [ ] `meta.schema_version` === "1.0"?
- [ ] `meta.domain` ada di 17 domain yang valid?
- [ ] `meta.tier` adalah "nano" | "core" | "full"?
- [ ] `meta.max_tree_depth` ≤ 64?
- [ ] `meta.lifecycle_status` valid?

### Pass 1b: Tier Constraints
- [ ] Tier `nano`: nodes ≤ 100, depth ≤ 8, tidak ada aset eksternal?
- [ ] Tier `core`: nodes ≤ 1.000, depth ≤ 32?
- [ ] Tier `full`: depth ≤ 64?

### Pass 1c: Domain Field Matrix
Berdasarkan `meta.domain`, periksa `IR_DOMAIN_FIELD_MATRIX`:
- [ ] Field `mandatory` ada semua?
- [ ] Field `forbidden` tidak ada?
- [ ] Node types sesuai `IR_ALLOWED_NODE_TYPES_BY_DOMAIN`?

### Pass 1d: Asset URI Validation
- [ ] Semua `asset_id` menggunakan format `asset://[UUID]`?
- [ ] Semua referensi ada di `asset_pool`?
- [ ] `IRAssetRef` punya `checksum` (SHA-256)?

### Pass 2: Style Cascade Check
- [ ] Token `theme://` dapat di-resolve dari `theme_tokens`?
- [ ] Token `brand://` dapat di-resolve dari brand profile aktif?
- [ ] Tidak ada circular reference pada style overrides?

### Pass 3: Semantic Validation
- [ ] Teks putih di atas putih → WCAG rasio 1:1 FAIL?
- [ ] Domain `video` punya `timeline`?
- [ ] Domain `print` punya `print_spec` dan `physical`?
- [ ] Tidak ada dangling `chain_to` reference?
- [ ] `diagram_edge` merujuk node yang ada?

### Pass 5: Lifecycle Check
- [ ] `lifecycle_status: "archived"` → tidak boleh di-compile?
- [ ] Transisi status valid (forward-only)?

### Secret Check
- [ ] Tidak ada literal token/password di `data_bindings`?
- [ ] Semua secret menggunakan `env:`, `vault:`, atau `secret:` prefix?

---

## Output Format

```
VALIDASI DOKUMEN: [ir_id]
Domain: [domain] | Tier: [tier] | Lifecycle: [status]

✅ LULUS: Pass 1 Schema
✅ LULUS: Pass 1b Tier Constraints
⚠️  WARNING: Pass 3 - Text contrast ratio 3.2:1 pada node [node_id]
❌ GAGAL: Pass 1d - Asset 'hero-img' tidak menggunakan format asset://

Total: X lulus, Y warning, Z gagal
```
