# Sistem Cascade Style & Token Desain
## Genesis IR v1.0 — Panduan Arsitektur Core

> [!NOTE]
> `@stability STABLE`
> Halaman ini mendokumentasikan aturan prioritas resolusi style (cascade hierarchy) dan pemecahan token desain abstrak menjadi nilai rendering konkret.

---

## 🔝 Hierarki Prioritas Cascade (Keputusan #01)

Sistem cascading style di Genesis IR bersifat kaku dan deterministik. Jika terjadi pertentangan definisi gaya untuk suatu properti gaya pada elemen (node), compiler Pass 2 wajib menyelesaikannya dengan urutan prioritas dari tertinggi ke terendah sebagai berikut:

```
[Prioritas 1]  Inline Style Override (Ditetapkan langsung pada node)
     ↓
[Prioritas 2]  Component Style (Definisi gaya reusable component)
     ↓
[Prioritas 3]  Global Theme Tokens (Desain tema aktif dokumen)
     ↓
[Prioritas 4]  Brand Profile Tokens (Palet warna dan identitas brand induk)
```

Setiap perubahan di tingkat induk/brand profile akan tersaring ke bawah, namun tidak akan pernah menimpa inline style yang dideklarasikan secara eksplisit.

---

## 🎨 Spesifikasi Nilai Warna (`ColorValue`)

Mendukung representasi warna multi-domain secara presisi:

1. **Format Hex (Digital & Pixel Art)**:
   - String berupa `#RRGGBB` atau `#RRGGBBAA`.
   - Wajib digunakan secara eksklusif pada domain `pixel_art` (Keputusan #16).
2. **Format RGBA & HSL**:
   - `rgba(r, g, b, a)` dan `hsl(h, s, l)`.
3. **Format CMYK (Print Domain)**:
   - Representasi fisik empat tinta cetak: `cmyk(c, m, y, k)` di mana komponen bernilai desimal `0.0` s.d. `1.0`.
4. **Format Pantone (Identitas Brand Fisik)**:
   - String rujukan menggunakan format `pantone://[name]`. Wajib diselesaikan ke nilai representasi CMYK/Lab terdekat saat ekspor fisik dilakukan.

---

## 🏷️ Rujukan Token Desain (`theme://` dan `brand://`)

Token desain adalah referensi tidak langsung untuk memisahkan data desain dari struktur dokumen:

- **Token Tema**: Berupa prefix `theme://[path]` (contoh: `theme://colors.primary`).
- **Token Brand**: Berupa prefix `brand://[path]` (contoh: `brand://palette.accent`).

### Contoh Skema Resolusi di Pass 2:
```typescript
import { resolveStyleCascade, ColorValue, IRStyleContext } from '@genesis/types';

const context: IRStyleContext = {
  theme_tokens: {
    'colors.primary': '#ff0000',
  },
  brand_profile: {
    color_palette: {
      'palette.accent': '#00ff00',
    },
    typography_tokens: {},
    spacing_tokens: {},
  },
  component_styles: {},
};

// Nilai token "theme://colors.primary" akan diselesaikan ke "#ff0000" secara deterministik
```
