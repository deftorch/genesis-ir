# Workflow: /phase-status

## Nama: Cek Status Fase & Rekomendasi Langkah Berikutnya

**Dipanggil dengan:** `/phase-status`

## Tujuan
Memberikan ringkasan progres implementasi berdasarkan CHECKLIST.md,
mengidentifikasi blocker, dan merekomendasikan item prioritas berikutnya.

---

## Langkah

### 1. Baca CHECKLIST.md saat ini
Hitung status:
- `[ ]` = Belum mulai
- `[-]` = Sedang berjalan
- `[x]` = Selesai & lulus tes

### 2. Identifikasi Gate Kritis
Tandai semua item `⛔` yang belum selesai — ini adalah BLOCKER keras.

### 3. Hitung Progress per Fase
Tampilkan persentase completion tiap fase.

### 4. Identifikasi Ketergantungan
Item mana yang tidak bisa dimulai karena gate sebelumnya belum lulus?

### 5. Rekomendasi Prioritas
Berikan 3–5 item yang sebaiknya dikerjakan berikutnya berdasarkan:
- Ketergantungan (dependency)
- Urutan milestone
- Gate kritis yang memblokir

---

## Output Format

```
╔══════════════════════════════════════════════════╗
║      GENESIS IR — STATUS IMPLEMENTASI            ║
╠══════════════════════════════════════════════════╣
║ PRE-PHASE: Setup & Infrastruktur       [ 0/ 8] ║
║ FASE 1:    IR Foundation               [ 0/28] ║
║ FASE 2:    Style System                [ 0/22] ║
║ ...                                            ║
╠══════════════════════════════════════════════════╣
║ GATE KRITIS AKTIF: M1 (Bulan 3)               ║
║ BLOCKER: Setup monorepo belum selesai          ║
╠══════════════════════════════════════════════════╣
║ REKOMENDASI LANGKAH BERIKUTNYA:                ║
║ 1. [PRE-0.1] Inisialisasi monorepo Turborepo   ║
║ 2. [PRE-0.1] Setup TypeScript strict           ║
║ 3. [PRE-0.1] Setup Vitest runner               ║
╚══════════════════════════════════════════════════╝
```
