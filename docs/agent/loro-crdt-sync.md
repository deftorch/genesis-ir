# Rantai Sinkronisasi Loro CRDT
## Genesis IR v1.0 — Kolaborasi & Multi-Agen

> [!NOTE]
> `@stability STABLE`
> Halaman ini mendokumentasikan spesifikasi integrasi sinkronisasi kolaboratif multi-user waktu nyata (real-time collaborative state sync) berbasis delta stack dan WebSocket di Genesis IR.

> [!NOTE]
> **Status Implementasi**: Seluruh fitur kolaborasi waktu nyata telah berhasil diimplementasikan di Fase 3 dalam paket `@genesis/sync`, yang beroperasi di atas model delta stack Last-Write-Wins (`GenesisLWWDoc`) di `@genesis/crdt`.

---

## Pilihan Library CRDT (Keputusan #38)

Untuk memfasilitasi kolaborasi real-time tanpa konflik antara agen AI dan manusia pengembang di workspace yang sama, Genesis IR menyediakan dua backend:

- **LWW (Last-Write-Wins) Backend**: Implementasi murni JavaScript (`GenesisLWWDoc`) yang mengurutkan delta berdasarkan stempel waktu secara deterministik.
- **Loro WASM Backend**: Dukungan masa depan untuk integrasi langsung library Rust Loro WASM melalui flag konfigurasi `GENESIS_CRDT_BACKEND`.

---

## Arsitektur Sinkronisasi Kolaborasi (`@genesis/sync`)

Paket `@genesis/sync` menyediakan transport layer untuk komunikasi multi-peer secara real-time menggunakan pustaka WebSocket (`ws`):

### 1. Protokol Komunikasi WebSocket
Klien dan server bertukar pesan terstruktur sebagai berikut:
- `join_room`: Klien meminta untuk bergabung ke dalam ruang kerja kolaborasi dokumen berdasarkan `roomId`.
- `loro_update`: Klien memancarkan update dokumen (serialized delta atau snapshot base64) ke seluruh peer lainnya.
- `presence_update`: Klien memancarkan status kehadiran seperti koordinat kursor, node yang sedang aktif dipilih, dan identitas pengguna.
- `sync_request` / `sync_response`: Klien meminta snapshot penuh dokumen dari server untuk sinkronisasi awal atau pasca terputusnya koneksi.

### 2. Presence & Ephemeral Layer
Data kehadiran pengguna (kursor, node aktif) bersifat transien dan tidak di-persistensi ke database. Server melakukan broadcast langsung update presensi ini ke seluruh anggota ruang kerja.

### 3. Snapshot Persistence
Server kolaborasi menyimpan snapshot biner Loro/LWW terbaru ke persistence store (menggunakan adapter `ISyncPersistenceStore` yang dapat diintegrasikan dengan Redis atau kolom `bytea` PostgreSQL).

### 4. Reconnection Handling & Sync Recovery
Klien (`GenesisSyncClient`) mendukung penanganan auto-reconnect dengan jeda eksponensial (exponential backoff). Apabila koneksi terputus melebihi batas 30 detik, klien akan otomatis memicu `sync_request` pasca terhubung kembali untuk mencegah terjadinya state divergence.

---

## Delta Update Atomik (`IRDelta`)

Seluruh mutasi dokumen wajib dikemas dalam bentuk operasi atomik terstruktur **`IRDelta`** (Keputusan #27):

```typescript
export type IRDelta =
 | { kind: 'add'; path: string; value: any }
 | { kind: 'remove'; path: string }
 | { kind: 'replace'; path: string; value: any; prev_value: any }
 | { kind: 'move'; from_path: string; to_path: string };
```

### 1. Sifat Deterministik
Setiap delta memodifikasi struktur pohon secara spesifik menggunakan skema path (contoh: `objects.node_n1.style.color`). Karena urutan delta diatur oleh Loro, hasil penggabungan dokumen (merge) pada seluruh peer dijamin 100% identik secara deterministik.

### 2. Delta-Only Return Policy (Keputusan #35)
Apabila agen melakukan request perubahan dengan bendera `delta_only: true`, server kolaborasi dilarang keras mengembalikan dokumen penuh. Server hanya boleh memancarkan payload minimal berupa deretan update `IRDelta` terkompresi.

---

## Alur Rekonsiliasi & Delta Stack

Rekonsiliasi revisi dikelola oleh `IRDeltaStack` yang melacak sejarah modifikasi secara berurutan:

```
[Peer A: Edit Style] ---> [Local Loro Doc] ---> [Export Update Bytes]
                            ↓
[Peer B: Loro Merge] <--- [Apply Update] <--- [Transport Layer]
```

1. **Local Update**: Modifikasi lokal diaplikasikan langsung ke dokumen Loro lokal demi responsivitas instan (zero latency).
2. **Conflict Resolution**: Resolusi konflik otomatis diselesaikan oleh Loro menggunakan strategi **Last-Write-Wins (LWW)** untuk properti nilai tunggal, dan penataan indeks unik untuk tipe koleksi daftar (list).
3. **Revisi Rollback**: Pengembang dapat memutar balik (rollback) keadaan dokumen ke nomor versi revisi tertentu dengan mengekstraksi snapshot historis Loro CRDT secara asinkron.
