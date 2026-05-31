# Format File Biner .gir
## Genesis IR v1.0 — Penyimpanan & RLVRR

> [!NOTE]
> `@stability STABLE`
> Halaman ini mendokumentasikan spesifikasi implementasi format biner berkas `.gir` terkompresi, struktur header 64-byte yang kaku, dan mekanisme proteksi checksum.

---

## Spesifikasi Header 64-Byte Kaku

Format berkas `.gir` diawali dengan blok data meta (header) berukuran tepat **64 byte** tanpa perkecualian:

```
+------------------+------------------+------------------+------------------+
| Magic (4B)    | Version (4B)   | Reserve (8B)   | UUID (16B)    |
+------------------+------------------+------------------+------------------+
| Size Block 0 (4B)| Size Block 1 (4B)| Size Block 2 (4B)| Size Block 3 (4B)|
+------------------+------------------+------------------+------------------+
| SHA-256 Checksum (12B / 96-bit)            | Reserve (4B)   |
+------------------+------------------+------------------+------------------+
```

### 1. Rincian Peta Byte:
*  **Byte 0–3 (Magic Number)**: Harus bernilai string ASCII `GIR!` (`0x47 0x49 0x52 0x21`).
*  **Byte 4–7 (Format Version)**: Format integer big-endian 32-bit (versi 1.0 disimpan sebagai `1`).
*  **Byte 8–15 (Reserved)**: Byte cadangan, diisi `0x00` secara default.
*  **Byte 16–31 (Document UUID)**: Berisi representasi biner 128-bit (16 byte) dari dokumen `meta.ir_id`. Nilai ini wajib identik dengan `ir_id` setelah proses deserialisasi selesai.
*  **Byte 32–35 (Size Block 0)**: Ukuran biner terkompresi blok 0 (Metadata).
*  **Byte 36–39 (Size Block 1)**: Ukuran biner terkompresi blok 1 (Canvas).
*  **Byte 40–43 (Size Block 2)**: Ukuran biner terkompresi blok 2 (Nodes).
*  **Byte 44–47 (Size Block 3)**: Ukuran biner terkompresi blok 3 (Observability/History - Tanpa Kompresi).
*  **Byte 48–59 (SHA-256 Checksum)**: Bagian pemotongan 96-bit pertama dari checksum SHA-256 yang dihitung dari seluruh byte payload tubuh (blok 0 s.d. 3).
*  **Byte 60–63 (Reserved)**: Byte cadangan, diisi `0x00`.

---

## Pembagian 4 Blok Payload Tubuh

Tubuh dokumen terbagi menjadi 4 komponen biner mandiri yang disusun secara berurutan setelah byte ke-64:

```
[Header 64B] ---> [Blok 0: Metadata (LZ4)] ---> [Blok 1: Canvas (LZ4)] ---> [Blok 2: Nodes (LZ4)] ---> [Blok 3: Observability (MsgPack)]
```

1. **Blok 0: Metadata**
  - Berisi informasi global (`ir_version`, `domain`, `title`).
  - Diserialisasi ke **MessagePack**, lalu dikompresi menggunakan **LZ4 Block Format**.
2. **Blok 1: Canvas & Contexts**
  - Berisi pengaturan canvas geometri (`IRCanvas`, `IRAudioCanvas`, atau `IR3DViewport`).
  - Diserialisasi ke **MessagePack**, lalu dikompresi menggunakan **LZ4 Block Format**.
3. **Blok 2: Nodes AST Tree**
  - Berisi seluruh daftar node grafis/media (`objects` tree).
  - Diserialisasi ke **MessagePack**, lalu dikompresi menggunakan **LZ4 Block Format**.
4. **Blok 3: Observability & Jejak Audit**
  - Berisi log `actions_taken`, profil performa, dan provenance.
  - Diserialisasi langsung ke **MessagePack** tanpa kompresi untuk kemudahan pembacaan kilat telemetry (Keputusan #19).

---

## Struktur Kompresi LZ4 Block

Kompresi block diimplementasikan secara murni (pure-JS) untuk kecepatan tinggi:

- **Token (1 Byte)**: Menyimpan panjang literal dan panjang match secara padat:
 $$\text{Literal Length} = \text{Token} \gg 4$$
 $$\text{Match Length} = \text{Token} \& 0x0F$$
- **Offset (2 Byte - Little Endian)**: Jarak mundur ke belakang buffer untuk menyalin data duplikat yang cocok (match).
- **Integritas Payload**: SHA-256 checksum bertindak sebagai tameng keamanan. Setiap modifikasi ilegal di tingkat biner pada data terkompresi akan dideteksi instan oleh parser saat pemecahan checksum 96-bit dilakukan.
