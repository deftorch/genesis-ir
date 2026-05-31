# Runtime Agen & Kontrak Kolaborasi
## Genesis IR v1.0 — Kolaborasi & Multi-Agen

> [!NOTE]
> `@stability STABLE`
> Halaman ini mendokumentasikan spesifikasi implementasi runtime agen kecerdasan buatan (AI agent), kontrak pendelegasian tugas, jejak tindakan append-only, dan protokol eskalasi keputusan manual.

---

## Kontrak Tugas Agen (`IRAgentContract`)

Agen AI di workspace Genesis IR bekerja di bawah aturan kapabilitas kaku yang dideklarasikan pada berkas `AGENTS.md` proyek.

Setiap pendelegasian tugas wajib melampirkan kontrak **`IRAgentContract`** berisi:
- `agent_id`: Identifikasi unik UUID v4 agen pelaksana.
- `capabilities`: Array berisi izin operasi spesifik (e.g. `["read_schema", "modify_styles", "evaluate_accessibility"]`).
- `budget_token`: Batas kuota pengeluaran token API LLM untuk mencegah kebocoran finansial otomatis.
- `isolation_level`: Tingkat pembatasan modifikasi direktori file.

---

## 🪵 Log Tindakan Append-Only (Keputusan #19)

Untuk menjaga akuntabilitas tindakan otonom yang dilakukan oleh kecerdasan buatan, runtime wajib merekam setiap perubahan ke dalam properti **`actions_taken`** di tingkat root dokumen metadata.

- **Sifat Append-Only**: Deretan item pada array `actions_taken` bersifat hanya-tambah (append-only). Dilarang keras memodifikasi, mengurutkan ulang, atau menghapus entri sejarah tindakan yang sudah tercatat.
- **Deteksi Tamper**: Upaya pemalsuan log tindakan akan terdeteksi saat Pass 0 melakukan audit checksum integritas dokumen.

---

## Eskalasi Keputusan `irreversible` (Keputusan #37)

Beberapa aksi penting dikategorikan bersifat tidak dapat dibatalkan (**`irreversible`**), seperti:
1. Menghapus artboard utama dokumen fisik.
2. Memublikasikan berkas LIR secara permanen ke server produksi.
3. Melakukan migrasi destruktif tanpa backup terdaftar.

```
    [AI Agent: Request Irreversible Action]
             ↓
 [Runtime Check: capability.irreversible == true]
             ↓
   [Eskalasi Manual: Kirim Konfirmasi Manusia]
             ↓
  [Persetujuan Manusia] ---> [Eksekusi Aksi]
  [Penolakan Manusia]  ---> [Batalkan & Rollback]
```

### Protokol Konfirmasi:
- Agen dilarang mengeksekusi aksi ini secara mandiri.
- Runtime wajib memotong alur eksekusi, memancarkan event `AWAITING_HUMAN_APPROVAL`, dan meminta tanda tangan otorisasi manual desainer (melalui token rahasia) sebelum melanjutkan proses kompilasi.
