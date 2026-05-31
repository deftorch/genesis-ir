# Domain Game Sprite & Pixel Art
## Genesis IR v1.0 — Spesifikasi Domain

> [!IMPORTANT]
> `@stability BETA`
> Halaman ini mendokumentasikan spesifikasi domain `pixel_art`, mencakup penyimpanan biner base64 di pixel_cel, format indeks warna kaku, dan sistem animasi frame/cel.

---

## Penyimpanan Data Piksel (Keputusan #11)

Berbeda dengan domain vektor visual biasa, domain `pixel_art` menyimpan representasi raster piksel secara langsung di dalam dokumen HIR menggunakan node **`pixel_cel`**.

- **Format Data**: Piksel disimpan sebagai string RGBA biner yang dikodekan ke dalam format **base64**.
- **Indeks Warna Palet**: Palet warna didefinisikan secara statis pada properti `pixel_spec.palettes`. Setiap warna dalam palet wajib didefinisikan menggunakan format string hex heksadesimal yang kaku (Keputusan #16).
- **Efisiensi Memori**: Untuk menghindari luapan memori dokumen JSON, resolusi canvas pixel dibatasi secara ketat dalam rentang $8 \times 8$ piksel hingga maksimum $512 \times 512$ piksel.

---

## Arsitektur Animasi Frame & Cel

Sistem animasi sprite pixel menggunakan konsep Grid-Cell Frame yang efisien:

```
[Frame 0] ---> [Layer 0: Background Cel] + [Layer 1: Character Cel]
[Frame 1] ---> [Layer 0: Background Cel] + [Layer 1: Character Cel (Move)]
```

### Properti Utama:
1. **`pixel_layer`**: Definisi layer gambar (e.g. background, player, overlay).
2. **`pixel_frame`**: Definisi frame waktu animasi yang melacak durasi kemunculan frame (dalam milidetik) dan mendukung penayangan transparan frame sebelumnya (onion skin).
3. **`sprite_tag`**: Tag pengelompokan frame untuk mendefinisikan klip gerakan tertentu (e.g. tag `"walk"`, `"jump"`) dengan arah loop (`forward`, `ping-pong`).

---

## LIR Target: Sprite Sheet Packing (Pass 7b)

Saat kompilasi ke LIR target, compiler tidak mengekspor frame piksel satu-per-satu sebagai berkas terpisah. Sebaliknya, generator Pass 7b melakukan **Sprite Sheet Packing**:

- **Algoritma**: Memadatkan seluruh cel animasi ke dalam satu gambar grid atlas piksel besar secara non-overlapping menggunakan algoritma bin-packing.
- **Metadata**: Menghasilkan berkas pendamping berupa JSON berisi indeks koordinat klip (`x, y, width, height`) dari masing-masing frame untuk langsung digunakan oleh engine game (seperti Phaser, Unity, atau Godot).
