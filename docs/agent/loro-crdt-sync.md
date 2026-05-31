# Rantai Sinkronisasi Loro CRDT
## Genesis IR v1.0 — Kolaborasi & Multi-Agen

> [!NOTE]
> `@stability BETA`
> Halaman ini mendokumentasikan spesifikasi integrasi sinkronisasi kolaboratif multi-user waktu nyata (real-time collaborative state sync) berbasis Loro CRDT di Genesis IR.

> [!WARNING]
> **Status Implementasi**: Saat ini, paket `@genesis/crdt` diimplementasikan menggunakan LWW (Last-Write-Wins) delta stack murni berbasis JavaScript (kelas `GenesisLWWDoc`). Integrasi asli menggunakan pustaka Loro CRDT (Rust + WASM) dijadwalkan untuk dikerjakan pada **Fase 3** sesuai dengan Roadmap v2.0.

---

## Pilihan Library CRDT (Keputusan #38)

Untuk memfasilitasi kolaborasi real-time tanpa konflik antara agen AI dan manusia pengembang di workspace yang sama, Genesis IR mengunci penggunaan **Loro CRDT** sebagai target akhir:

- **Target Akhir (Fase 3)**: Berbasis **Rust** dengan kompilasi web berkecepatan tinggi **WASM (WebAssembly)**.
- **Implementasi Transisi (Fase 0 - Fase 2)**: Menggunakan kelas `GenesisLWWDoc` dengan delta stack murni JavaScript yang menerapkan penggabungan LWW (Last-Write-Wins) berbasis stempel waktu string (`created_at`).

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
