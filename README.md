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

## PDFs

Your PDFs are stored under `assets/docs/` and linked as projects.
