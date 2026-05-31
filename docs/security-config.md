# Konfigurasi Keamanan Antigravity — Genesis IR

## Profil Otonomi yang Direkomendasikan

### Untuk Development Sehari-hari
**Profil: Review-driven development**
- Terminal: `Auto` — Agen memutuskan, tapi minta review untuk perintah destruktif
- Review Policy: `Request Review` — Selalu review implementation plan sebelum eksekusi
- Alasan: Proyek ini memiliki 40 keputusan arsitektur kritis — review manual penting

### Untuk Setup & Infrastruktur (PRE-PHASE)
**Profil: Agent-assisted development**
- Terminal: `Auto`
- Review Policy: `Agent Decides`
- Aman untuk: `npm install`, `tsc --init`, `vitest run`

### JANGAN Gunakan untuk Proyek Ini
**Profil: Agent-driven development (Turbo)**
- Terlalu berisiko untuk proyek dengan constraint arsitektur ketat
- Bisa bypass gate kritis tanpa review

---

## Allow List Commands (Terminal)

### AMAN — Auto Execute
```
pnpm install
pnpm build
pnpm test
pnpm test:coverage
pnpm lint
pnpm format
tsc --noEmit
vitest run
vitest run --coverage
git status
git diff
git log --oneline
cat [file]
ls [directory]
```

### PERLU REVIEW — Request Review
```
git commit
git push
rm -rf
pnpm exec [anything]
node --eval [script]
npx [package]
curl [url]
wget [url]
```

### DENY LIST — Jangan Pernah Auto Execute
```
sudo [anything]
chmod 777
git push --force
git reset --hard
DROP TABLE
DELETE FROM
rm -rf /
```

---

## Browser Allow List
```
localhost:*     # Dev server lokal
127.0.0.1:*    # Dev server lokal
docs.antigravity.google  # Dokumentasi Antigravity
typescriptlang.org    # TypeScript docs
vitest.dev        # Vitest docs
ajv.js.org       # AJV validator docs
loro.dev        # Loro CRDT docs
```

---

## Untuk Tim (Saat Proyek Lebih Matang)
Setelah M1 gate lulus dan monorepo stabil, pertimbangkan:
- Terminal: `Auto` untuk perintah test/build
- Tambahkan Allow List untuk CI/CD commands
- Jangan pernah tambahkan `git push --force` ke Allow List
