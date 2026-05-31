# Domain Mockup & Render 3D
## Genesis IR v1.0 — Spesifikasi Domain

> [!IMPORTANT]
> `@stability BETA`
> Halaman ini mendokumentasikan spesifikasi domain `mockup` dan `3d`, mencakup penataan scene 3 dimensi, proyeksi aset 2D ke permukaan 3D (texture mapping), pencahayaan, dan engine render LIR target.

---

## Arsitektur Viewport 3D (`IR3DViewport`)

Setiap dokumen 3D dideklarasikan di dalam objek canvas **`IR3DViewport`** khusus yang menampung dunia visual tiga dimensi (Fase 8.3):

```
            [IR3DViewport]
               ↓
 [Scene Objects]  [Lighting Setup]  [Camera Settings]
  - Mesh/Geometri  - Ambient/Point  - FOV/Orthographic
  - Material/PBR  - Directional   - Target Look-At
```

### 1. Objek & Mesh
- **`mesh_3d`**: Representasi objek 3 dimensi. Memiliki properti `geometry_ref` (referensi file `.gltf` atau `.obj` melalui `asset://`) dan `material_ref`.
- **`material_3d`**: Menampung spesifikasi rendering modern berbasis **PBR (Physically-Based Rendering)** seperti `roughness`, `metalness`, `albedo_color`, dan `normal_map`.

### 2. Sistem Kamera & Pencahayaan
- **Camera Viewport**: Konfigurasi tipe kamera (`perspective` dengan FOV dan aspect ratio, atau `orthographic` untuk rendering isometrik).
- **Lighting**: Dukungan tipe lampu default (`ambient_light`, `directional_light`, dan `point_light`) dengan fitur bayangan (`cast_shadow: true`).

---

## Proyeksi Mockup 2D ke Aset 3D (`mockup`)

Domain `mockup` menjembatani representasi grafis 2D (seperti poster, kemasan cetak) dengan model fisik 3D:

- **Texture Projection**: Mengambil canvas `visual` atau `packaging` 2D, lalu memproyeksikannya sebagai tekstur pembungkus (UV mapping) permukaan `mesh_3d` (contoh: memetakan label 2D ke atas permukaan model botol 3D).
- **UV Coordination Map**: Melacak titik koordinat proyeksi piksel presisi ($u, v$ koordinat) guna mencegah distorsi peregangan gambar di permukaan berlekuk.

---

## LIR Target: WebGL / Three.js Pipeline

Untuk rendering interaktif waktu nyata di browser web, generator LIR Pass 7d mengekspor deskripsi `IR3DViewport` menjadi kode inisialisasi API **Three.js**:

- Menginisialisasi kelas `THREE.WebGLRenderer` dengan fitur antialiasing.
- Mengunggah berkas eksternal GLTF secara asinkron dari pool aset.
- Menghubungkan trigger event interaktif 2D ke dalam scene 3D melalui mekanisme raycasting (`THREE.Raycaster`) untuk deteksi klik mouse pada mesh 3D.
