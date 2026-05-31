# Gated RLVRR Reward Signal Chain
## Genesis IR v1.0 — Penyimpanan & RLVRR

> [!NOTE]
> `@stability STABLE`
> Halaman ini mendokumentasikan spesifikasi rantai evaluasi model pembelajaran penguatan (RLVRR Reward Signal Chain), aturan pembobotan kaku, dan mekanisme gated short-circuiting.

---

## Urutan & Bobot Sinyal Kaku (Keputusan #39)

Model pembuatan aset Genesis IR dilatih menggunakan rantai reward evaluasi sekuensial **RLVRR** (Reinforcement Learning Visual-Render Reward). Bobot kontribusi dari kelima sinyal dikunci secara permanen sebagai berikut:

$$\text{Total Reward} = 0.40 \cdot S_1 + 0.25 \cdot S_2 + 0.20 \cdot S_3 + 0.10 \cdot S_4 + 0.05 \cdot S_5$$

### Rincian 5 Sinyal RLVRR:
1. **$S_1$: Schema Compliance (Bobot 0.40)**:
  - Evaluasi kelulusan dokumen terhadap validasi HIR JSON Schema.
  - Bersifat biner (skor `1.0` jika lulus sepenuhnya, atau `0.0` jika gagal).
2. **$S_2$: Brand Guard (Bobot 0.25)**:
  - Validasi keberadaan theme token dibandingkan dokumen referensi.
  - Palette validation: mencocokkan nilai warna pada token warna (`colors.*`) agar tidak menyimpang dari warna brand referensi.
  - Audit kontras warna teks/primary terhadap background menggunakan standar kalkulasi WCAG AA (rasio minimum 4.5:1).
3. **$S_3$: Render Error Rate (Bobot 0.20)**:
  - Mengukur kegagalan rendering visual LIR (SVG error, open path font, audio clipping, tabrakan box model).
4. **$S_4$: Budget Accuracy (Bobot 0.10)**:
  - Mengukur tingkat efisiensi penggunaan sumber daya (jumlah node terhadap `max_tree_depth`, ukuran file biner terkompresi).
5. **$S_5$: Semantic Quality (Bobot 0.05)**:
  - Evaluasi orisinalitas gaya, kompleksitas layout, dan skor kepatuhan aturan aksesibilitas WCAG.

---

## Alur Gated Short-Circuiting Evaluation

Untuk menghemat daya komputasi pelatihan model AI, proses evaluasi RLVRR diimplementasikan secara **Gated Sequential (Berpagar Sekuensial)**:

```
[Mulai Evaluasi]
    ↓
[Evaluasi S1: Schema] ---> GAGAL ---> [Total Reward = 0.0 (Short-Circuit)]
    ↓ LULUS
[Evaluasi S2: Brand] ---> GAGAL ---> [Total Reward = S1 * 0.40 (Short-Circuit)]
    ↓ LULUS
[Evaluasi S3: Render] ---> GAGAL ---> [Total Reward = (S1 * 0.40) + (S2 * 0.25)]
    ↓ LULUS
[Evaluasi S4 & S5]  ---> HITUNG TOTAL PENUH
```

### Karakteristik Penting:
- **Short-Circuit**: Jika suatu gerbang sinyal ($S_N$) menghasilkan nilai kelulusan di bawah ambang batas minimum, maka evaluasi untuk sinyal berikutnya ($S_{N+1}$ s.d. $S_5$) **dilarang keras untuk dijalankan**.
- **Ambang Batas (Threshold)**: Gerbang sinyal 1 s.d. 3 memiliki ambang batas kelulusan kaku sebesar `1.0` (skor sempurna). Sinyal 4 dan 5 memiliki ambang batas longgar desimal.
- **Konfigurasi Uji Coba**: Meskipun bobot standar dikunci di angka `0.40/0.25/0.20/0.10/0.05`, compiler menyediakan modul konfigurasi dinamis `IRRLVRRConfig` untuk kepentingan penyesuaian bobot selama fase eksperimen pelatihan model internal.
