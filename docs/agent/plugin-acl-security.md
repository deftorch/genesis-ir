# Keamanan Plugin & Akses Kontrol (ACL)
## Genesis IR v1.0 — Kolaborasi & Multi-Agen

> [!NOTE]
> `@stability STABLE`
> Halaman ini mendokumentasikan aturan keamanan plugin pihak ketiga, kebijakan isolasi namespace, pembatasan akses data IR, dan penanganan parameter rahasia.

---

## 🔒 Namespace Plugin Terisolasi (Keputusan #17)

Seluruh plugin yang dipasang di workspace wajib mematuhi standar penamaan berbasis namespace terisolasi:

```
@[namespace]/[plugin-name]
Contoh: @genesis-official/contrast-checker
```

Tindakan ini mencegah terjadinya bentrokan nama fungsi (collision) dan memastikan audit log `actions_taken` dapat merujuk asal-usul eksekusi kode secara presisi.

---

## 🎖️ Hirarki Kepercayaan Plugin (Keputusan #29)

Untuk memitigasi eksekusi kode berbahaya (malicious code execution), dipasang **Hirarki Kepercayaan**:

| Kategori | Deskripsi | Hak Akses |
|----------|-----------|-----------|
| **Official** | Dikembangkan resmi oleh tim core Genesis. | Akses penuh tanpa batasan sandboxing. |
| **Verified** | Dikembangkan komunitas, telah diaudit keamanannya. | Izin bersyarat (read-only atau partial write). |
| **Community** | Plugin dari publik tanpa proses audit eksternal. | Wajib dijalankan dalam kondisi sandboxing ketat. |

---

## 🛡️ Aturan Keamanan & Akses Data (Keputusan #21 & #31)

1. **Strict IR Access Control**:
   Apabila opsi `strict_ir_access` bernilai `true` (default), plugin dilarang mengakses objek node di luar domain kerja yang dideklarasikan pada kontraknya (Keputusan #21).
2. **Isolasi Aksi Plugin**:
   Aksi yang dipicu oleh plugin dibatasi secara ketat hanya pada ruang lingkup (scope) artboard atau node target yang sedang aktif (Keputusan #30).
3. **Snapshot Immutable**:
   Data snapshot dokumen yang dikirimkan ke modul plugin pihak ketiga dikunci sebagai objek **Read-Only (Immutable)** menggunakan mekanisme pembekuan JavaScript (`Object.freeze`). Modifikasi dokumen hanya diperbolehkan melalui pemancaran delta update terenkripsi (Keputusan #31).

---

## 🔑 Kebijakan Referensi Rahasia / Secret Token (Keputusan #36)

Rahasia pengembang (seperti kunci enkripsi API Loro, token LLM, atau password database eksternal) dilarang keras ditulis secara literal (hardcoded) di dalam dokumen HIR.

Semua rahasia wajib menggunakan salah satu prefix terdaftar berikut:
- **`env:[VARIABLE_NAME]`**: Mengambil nilai dari variabel lingkungan sistem.
- **`vault:[SECRET_PATH]`**: Mengambil nilai secara aman dari HashiCorp Vault.
- **`secret:[KEY_ID]`**: Mengambil dari secure storage bawaan runtime.

*Jika compiler Pass 0 mendeteksi adanya string rahasia sensitif tanpa prefix di atas, dokumen akan ditolak seketika.*
