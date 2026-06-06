# Observability, Telemetry & Jejak Audit
## Genesis IR v1.0 — Panduan Arsitektur Core

> [!NOTE]
> `@stability STABLE`
> Halaman ini mendokumentasikan sistem telemetry kompilator, analisis aksesibilitas visual WCAG otomatis, dan pelacakan provenance debug untuk modifikasi otonom oleh agen AI.

---

## ⏱ Compilation Pass Profiler

Pass kompilasi di Genesis IR dilengkapi instrumen observabilitas bawaan untuk melacak konsumsi memori dan kinerja waktu nyata:

```typescript
export interface IRCompilationProfile {
 pass_id: string;
 start_time_ms: number;
 end_time_ms: number;
 duration_ms: number;
 memory_used_mb?: number;
 resolved_styles_count?: number;
}
```

- **Mekanisme**: Setiap pass mencatat stempel waktu presisi tinggi menggunakan `performance.now()`.
- **Waktu Habis (Timeout)**: Jika suatu pass melebihi batas waktu yang telah ditentukan (`timeout_ms`), sistem observabilitas akan menghasilkan peringatan tanpa menghentikan kompilasi, kecuali pada gate kritis.

---

## Sistem Audit Aksesibilitas WCAG (Fase 9.2)

Disediakan pustaka audit aksesibilitas terintegrasi yang diekspos sebagai built-in tool kompilator `validate_accessibility`:

- **Audit Rasio Kontras**: Menghitung rasio kontras luminansi relatif antara warna teks (`foreground`) dan latar belakang (`background`).
- **Kepatuhan Kriteria**:
 - Lulus tingkat **AA** jika rasio kontras ≥ 4.5:1 untuk teks biasa, atau ≥ 3:1 untuk teks besar (≥18pt).
 - Lulus tingkat **AAA** jika rasio kontras ≥ 7:1 untuk teks biasa, atau ≥ 4.5:1 untuk teks besar.
- **Simulasi Buta Warna**: Menganalisis visibilitas elemen untuk tipe Deuteranopia, Protanopia, dan Tritanopia guna mencegah kegagalan informasi berbasis warna murni.

---

## `x_debug` & Pelacakan Provenance

Semua berkas dokumen HIR memiliki objek `x_debug` opsional untuk mencatat sejarah perubahan otonom oleh agen AI:

```json
{
 "x_debug": {
  "agent_provenance": [
   {
    "agent_id": "agent-crdt-01",
    "timestamp": "2026-05-31T11:00:00Z",
    "action_taken": "apply_brand",
    "nodes_modified": ["n1", "n2"]
   }
  ]
 }
}
```

- **Gestalt Analysis**: Menyimpan statistik keseimbangan tata letak (visual weight, whitespace distribution) yang diperoleh dari pass evaluasi kecerdasan buatan.
- **Diff History**: Menyimpan kompresi snapshot ringkas dari perbedaan antardelta guna melacak orisinalitas perubahan.

---

## Optimasi Performa & Native Rust WASM (Fase V2.0)

Untuk mengatasi masalah bottleneck komputasi (hot paths) seperti re-kalkulasi tata letak Flexbox atau kompresi rekursif pada file yang kompleks, kompilator ini menggunakan paket Rust berkinerja tinggi yang dikompilasi menggunakan `wasm-pack`.

- **Paket Native**: Logika berat diekstrak ke dalam paket crate di direktori `packages/native` (atau dialihkan jika fallback).
- **Transparent Fallback**: Apabila modul WASM gagal diinisialisasi dalam lingkungan *runtime* (seperti browser tanpa akses SharedArrayBuffer atau lingkungan Node terbatas), modul kompiler secara transparan mundur menggunakan *wrapper fallback JS* secara otomatis tanpa memutuskan eksekusi.
