# Personal Portfolio (Bilingual / 中英双语)

This is a dependency-free static portfolio site with:

- `./en/` English version
- `./zh/` 中文版本
- Shared styling/scripts under `./assets/`

## Edit content

- Projects: `assets/js/projects-data.js`
- English page copy: `en/index.html`
- Chinese page copy: `zh/index.html`

Search and replace these placeholders:

- `Your Name` / `你的名字`
- `you@example.com`
- Social links (GitHub / LinkedIn / X)

## Add a resume (optional)

Put your PDF at `assets/resume.pdf` (and keep the link as-is).

## Preview locally

Any static server works. Examples:

```bash
python3 -m http.server 5173
```

Then open:

- `http://localhost:5173/` (auto-redirects to `./en/` or `./zh/`)

If you don’t want to run any command, you can also just open `index.html` directly in your browser (double-click it).

## Deploy

Deploy as a static site on any host (Vercel / Netlify / GitHub Pages).
Just upload the folder and keep the same directory structure.

## Access gate (static “unlock”)

This site uses a lightweight front-end unlock (no real accounts / no database).

- Config: `assets/js/access-config.js`
- Default access code: `Yuzifudai-2026-Access`
- Public preview count: `previewCount` (default `2`)

To change the access code, replace the `hash` with `SHA-256("your-new-code")`.

## Library (PDF → text + navigation)

The Library pages extract text from PDFs in the browser using PDF.js (loaded from a CDN).

- Chinese: `./zh/library.html`
- English: `./en/library.html`
- Document metadata (era/theme/people): `assets/js/library-data.js`

Notes:

- Pages that are mostly handwriting/photos may not have extractable text; the UI will link you to the original PDF page.
- Search is fast but currently only searches pages you’ve already opened (the page cache grows as you browse).

## Philosophy shelf (mirrored open texts)

This repo can also mirror open / public-domain philosophy texts and present them with:

- TOC-style navigation via `Time` + `School`
- `Topics` + `People` filters
- Always-on attribution (source link + license)

Entry pages:

- Chinese: `./zh/philo.html`
- English: `./en/philo.html`

Content + metadata:

- Text files: `assets/philo/texts/`
- Metadata: `assets/js/philo-data.js`

## PDFs

Your PDFs are stored under `assets/docs/` and linked as projects.
