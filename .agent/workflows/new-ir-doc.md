# Workflow: /new-ir-doc [domain]

## Nama: Generate Template IRDocument Valid untuk Domain Tertentu

**Dipanggil dengan:** `/new-ir-doc [domain]`

## Contoh
- `/new-ir-doc visual`
- `/new-ir-doc print`
- `/new-ir-doc music_production`

---

## Apa yang Dihasilkan

Sebuah dokumen IRDocument JSON minimal yang VALID untuk domain yang diminta,
mengikuti semua constraint dari Genesis IR Specification v1.0.

### Yang Selalu Ada
- `meta.ir_id`: UUID v4 baru
- `meta.schema_version`: "1.0"
- `meta.domain`: domain yang diminta
- `meta.tier`: "nano" (default)
- `meta.lifecycle_status`: "draft"
- `meta.created_at`: timestamp ISO 8601 saat ini
- `meta.created_by`: "ai_agent"
- `canvas`: sesuai domain (standard/audio/3d)
- `style_context`: minimal kosong
- `objects`: array kosong
- `constraints`: minimal

### Field Mandatory per Domain (dari IR_DOMAIN_FIELD_MATRIX)
- `visual`: canvas + style_context + objects
- `print`: canvas + style_context + objects + print_spec + physical
- `video`: canvas + style_context + objects + timeline + asset_pool
- `music_production`: canvas (audio type) + objects + timeline + music_spec + asset_pool
- `pixel_art`: canvas + objects + timeline + pixel_spec
- `diagram`: canvas + style_context + objects + diagram_spec
- `font_design`: canvas (font type) + objects + font_spec

### Field Forbidden per Domain
Pastikan TIDAK ADA field yang dilarang (status `forbidden`) untuk domain tersebut.

---

## Output Format

```json
{
  "meta": {
    "schema_version": "1.0",
    "ir_version": "0.1.0",
    "ir_id": "[UUID-v4]",
    "created_at": "[ISO-8601]",
    "created_by": "ai_agent",
    "domain": "[domain]",
    "session_id": "[UUID-v4]",
    "tier": "nano",
    "lifecycle_status": "draft",
    "max_tree_depth": 64,
    "change_summary": "Initial document for [domain] domain"
  },
  "canvas": { ... },
  "style_context": { ... },
  "objects": [],
  "constraints": { ... }
}
```

Sertakan komentar `// MANDATORY`, `// OPTIONAL`, atau `// FORBIDDEN` di samping
setiap field untuk memudahkan pemahaman.
