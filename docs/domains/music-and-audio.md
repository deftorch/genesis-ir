# Domain Musik & Produksi Audio
## Genesis IR v1.0 — Spesifikasi Domain

> [!IMPORTANT]
> `@stability BETA`
> Halaman ini mendokumentasikan spesifikasi domain `music_production` dan `audio`, mencakup konversi waktu temporal tempo-map, instrumen synthesizer virtual, automasi efek, dan pembuatan graf audio platform target.

---

## Konsep Waktu Temporal (Beat/Bar ke Milidetik)

Mengikuti **Keputusan Arsitektur #12**, seluruh domain musik menggunakan koordinat ketukan (beat/bar) sebagai koordinat waktu utama pada HIR. Pass 5 (Temporal Resolution) bertanggung jawab mengonversinya ke satuan milidetik absolut berdasarkan peta tempo (BPM) aktif.

### Rumus Konversi Dasar:
Untuk tempo statis tanpa perubahan:

$$\text{Durasi per Beat (ms)} = \frac{60 \times 1000}{\text{BPM}}$$

Pada dokumen dengan automasi perubahan tempo dinamis (`IRTempoChange`), ketukan ke-$N$ diselesaikan secara kumulatif dengan mengintegrasikan durasi beat di setiap segmen tempo.

---

## Struktur DAW & Track System

Dokumen bertipe `IRAudioCanvas` membagi audio ke dalam track virtual yang diproses secara paralel:

```
        [IRAudioCanvas]
           ↓
 [Track 1: MIDI] [Track 2: Audio] [Track 3: Master]
     ↓         ↓         ↓
  [Synthesizer]   [WAV/MP3 Clip]  [Reverb Effect]
```

### Tipe Node Khusus:
1. **`music_track`**: Wadah untuk klip audio. Memiliki parameter kontrol global seperti `volume`, `pan`, dan `mute`.
2. **`music_clip`**: Representasi kontainer data suara. Klip MIDI berisi daftar note (`music_note`), sedangkan klip instrumen melacak file biner audio eksternal.
3. **`music_note`**: Representasi instrumen MIDI (properti: `pitch` 0–127, `velocity`, `start_beat`, `duration_beats`).
4. **`music_instrument`**: Virtual synthesizer atau sampler. Mengonfigurasi properti ADSR Envelope, filter cutoff, LFO, atau rujukan drum pad.

---

## LIR Generation: Web Audio API Graph

Saat mengekspor dokumen MIR ke LIR target web, engine mengonversi deskripsi DAW ke grafik simpul suara **Web Audio API**:

- **AudioBufferSourceNode**: Untuk klip audio bitmap (`.wav`, `.mp3`).
- **OscillatorNode**: Untuk synthesizer virtual primitif (`sine`, `square`, `sawtooth`).
- **BiquadFilterNode & ConvolverNode**: Untuk eksekusi equalizer dan reverb master efek.
- Seluruh automasi perubahan volume/pitch dikonversi ke call ber-timing presisi menggunakan metode `.setValueAtTime()` atau `.linearRampToValueAtTime()` pada parameter audio node.
