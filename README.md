# Mohammed Akbar Hossen — static portfolio

A fully static portfolio for GitHub Pages, living inside this repo in `portfolio-static/`.
Built from the Taste Skill template design system. No framework, no runtime dependencies,
no trackers. Only the `portfolio-static/` folder is deployed — the Laravel app in this
repo is unrelated to the published site.

## Layout

```
portfolio-static/
├── index.html            home: hero, quick stats, featured projects, testimonials, CTA
├── about.html            bio, objective/mission/vision, current focus, languages, process
├── skills.html           5 skill groups with levels, tech stack chips, pinned repos
├── projects.html         all 8 projects
├── project/<slug>.html   8 detail pages (brief, metrics, modules, case study)
├── experience.html       work, education, milestones
├── services.html         16 services in 4 groups, 3 pricing plans, FAQs
├── blog.html             post list
├── blog/<slug>.html      9 post pages
├── contact.html          contact panel + details + socials
├── 404.html              GitHub Pages error page
├── robots.txt, sitemap.xml
├── .nojekyll             bypass Jekyll on GitHub Pages (required)
├── assets/images/        images copied from portfolio-akbar/public/uploads/portfolio
├── css/  js/             template design system (css/custom.css holds additions)
├── data/                 per-variant content snapshots (portfolio-personal.json, portfolio-company.json)
└── tools/                generator + checks (not deployed, but harmless if shipped)
```

## Regenerate content

Pages are generated from the exported portfolio data. There are **two content
variants** — `personal` and `company` — baked at seed time by `Site::isCompany()`.
Each has a committed snapshot under `data/`, and every rebuild patches the
case-study implementation notes back in automatically (see below):

```bash
# in portfolio-akbar (variant is baked at seed time):
SITE_MODE=personal DB_DATABASE=portfolio_akbar php artisan db:seed --force
SITE_MODE=personal DB_DATABASE=portfolio_akbar php artisan portfolio:export-json \
  --pretty --path=../multivendor-laravel/portfolio-static/data/portfolio-personal.json

# ...repeat with SITE_MODE=company into data/portfolio-company.json

# in portfolio-static (after exporting, see note below):
node tools/expand-case-studies.mjs         # re-apply implementation notes to data/*.json
node tools/build.mjs                       # personal -> site root
node tools/build.mjs --mode company --out dist-company   # company -> dist-company/
node tools/check.mjs                       # integrity: refs, ids, anchors, leaks
```

> **Important:** after a fresh Laravel export, always re-run
> `node tools/expand-case-studies.mjs` — the implementation notes added to the
> case studies live in this repo's snapshots, not yet in the Laravel seeders.

The generator picks `data/portfolio-<mode>.json` via `--mode personal|company`
(default personal; the snapshot's `meta.site_mode` must match, or the build
fails). Override the snapshot with `--data path/to/portfolio.json` and the
canonical/sitemap base with `--site <url>`.

### Choosing which variant gets published

The publish flow (see "Deploy to GitHub Pages" below) syncs the **personal**
build — the site root. To publish the company variant instead, build it with
`--mode company --out dist-company` and sync that folder.

## Develop locally

Open `index.html` directly, or serve the folder:

```bash
python -m http.server 8124     # then visit http://localhost:8124
```

## Deploy to GitHub Pages (live at http://xevrilon.me)

**This repo is private, and GitHub Pages (Free plan) serves public repos only** —
so the included `.github/workflows/deploy-pages.yml` is a build+check gate for
both variants, not a deploy. The public site is published from the separate,
public user-pages repo **`Akbar758742/Akbar758742.github.io`**, which carries
the custom domain `xevrilon.me` (via its `CNAME`).

To publish or update the live site:

```bash
# 1. Rebuild and verify (personal is the published variant)
node tools/build.mjs && node tools/check.mjs

# 2. Sync the built site into a checkout of the user-pages repo
#    (keeps CNAME, excludes tools/ data/ dist-company/ verify images)
D=/c/laragon/www/__userpages-deploy        # clone of Akbar758742.github.io
S=/c/laragon/www/multivendor-laravel/portfolio-static
cd "$D" && git pull
rm -rf blog project css js assets *.html robots.txt sitemap.xml
cp "$S"/*.html . && cp -r "$S"/css "$S"/js "$S"/assets "$S"/blog "$S"/project .
cp "$S"/robots.txt "$S"/sitemap.xml .
touch .nojekyll                            # bypass Jekyll — do not delete

# 3. Commit + push; Pages serves it within seconds
git add -A && git commit -m "Publish portfolio build" && git push origin main

# The first time (fresh clone):
git clone git@github.com:Akbar758742/Akbar758742.github.io.git "$D"
# (default branch: main)
```

To publish the **company** variant instead, build with
`node tools/build.mjs --mode company --out dist-company` and sync `dist-company/`
(the gate workflow already verifies that build on every push).

> Alternative: make this repo public or use GitHub Pro, then re-enable the
> deploy workflow from git history (it served `xevrilon.me/multivendor-laravel/`).
> The folder is fully self-contained either way.

## Editing CSS

All design tokens live in `css/variables.css` (measured from the original template).
Additions live in `css/custom.css` and reuse those tokens only. Keep the template's
locks: one accent, the existing radius set, no new shadows, hairline borders.
# portfolio-akbar-static
