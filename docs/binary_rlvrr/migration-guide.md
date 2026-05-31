# Panduan Migrasi Dokumen & Schema
## Genesis IR v1.0 — Penyimpanan & RLVRR

> [!NOTE]
> `@stability STABLE`
> Halaman ini mendokumentasikan panduan penulisan naskah migrasi schema dokumen menggunakan 5 operator deklaratif kaku di Genesis IR.

---

## 🚫 Larangan Kode JavaScript Bebas (Keputusan #22)

Untuk memastikan bahwa migrasi dapat diputar balik (rolled back) secara otomatis dan diprediksi perilakunya secara aman oleh agen kecerdasan buatan, **penggunaan kode JavaScript bebas (`eval`, fungsi kustom) dilarang keras**.

Seluruh transformasi dokumen wajib dideklarasikan secara tertulis menggunakan **5 Operator Deklaratif** terdaftar:

### 1. `rename_field`
Mengubah nama kunci/properti pada suatu objek tanpa menghilangkan data nilai di dalamnya.
```json
{
  "operator": "rename_field",
  "path": "objects.n1.style",
  "old_name": "color",
  "new_name": "fill_color"
}
```

### 2. `remove_field`
Menghapus kunci/properti tertentu dari objek node secara permanen.
```json
{
  "operator": "remove_field",
  "path": "objects.n1.style",
  "field_name": "deprecated_prop"
}
```

### 3. `add_field`
Menambahkan properti gaya baru dengan nilai bawaan (default value) tertentu.
```json
{
  "operator": "add_field",
  "path": "objects.n1.style",
  "field_name": "opacity",
  "value": 1.0
}
```

### 4. `change_type`
Melakukan konversi tipe data properti (misalnya mengubah string `"100"` menjadi integer `100`).
```json
{
  "operator": "change_type",
  "path": "objects.n1.style.opacity",
  "target_type": "number"
}
```

### 5. `restructure`
Memindahkan sub-struktur data ke lokasi path baru.
```json
{
  "operator": "restructure",
  "from_path": "objects.n1.style.legacy_margin",
  "to_path": "objects.n1.style.margin.top"
}
```

---

## 📜 Registrasi Naskah Migrasi (`IRMigrationScript`)

Setiap skrip migrasi didaftarkan ke dalam `MigrationRegistry` dengan format berikut:

```typescript
export interface IRMigrationScript {
  script_id: string; // Wajib diisi (Keputusan #26)
  from_version: string; // Format semver (e.g. "1.0.0")
  to_version: string; // Format semver (e.g. "1.1.0")
  transformers: IRMigrationTransformer[];
}
```

- **Pencatatan Sejarah (Keputusan #26)**: Setiap kali migrasi berhasil diaplikasikan pada dokumen, sistem wajib menambahkan `script_id` dan stempel waktu eksekusi ke dalam array `x_debug.migration_history[]`.
- **Mekanisme Rollback Otomatis**: Jika terjadi kesalahan (error) di tengah proses transformasi multi-langkah, `MigrationRegistry` akan menghentikan eksekusi, memicu alur rollback berantai dengan urutan terbalik untuk mengembalikan dokumen ke keadaan awal sebelum migrasi dimulai.
