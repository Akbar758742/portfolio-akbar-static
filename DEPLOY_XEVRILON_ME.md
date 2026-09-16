# Deploy to xevrilon.me — Manual

`http://xevrilon.me/` serves the public repo **`Akbar758742/Akbar758742.github.io`** (branch `main`).
This private repo (`portfolio-static`) only *builds* the files. Publishing = copy built files into a checkout of the public repo and push.

Two variants exist:

* **personal** (root of this repo) → `Mohammed Akbar Hossen`
* **company** (`dist-company/`) → `Xevrilon`

Built with:

```bash
node tools/build.mjs                       # personal -> site root
node tools/build.mjs --mode company --out dist-company   # company -> dist-company/
node tools/check.mjs                       # must end with ALL CLEAN
```

---

## One-time setup (Git Bash on Windows)

```bash
git clone git@github.com:Akbar758742/Akbar758742.github.io.git /c/laragon/www/__userpages-deploy
```

Definitions used below:

```bash
D=/c/laragon/www/__userpages-deploy
S_PERSONAL=/c/laragon/www/portfolio-static
S_COMPANY=/c/laragon/www/portfolio-static/dist-company
```

## Publish COMPANY data (Xevrilon) — current live mode

Run in `/c/laragon/www/portfolio-static`:

```bash
node tools/build.mjs --mode company --out dist-company
node tools/check.mjs
# expect: ALL CLEAN (dash warnings are normal)
```

Then publish:

```bash
cd "$D" && git pull
rm -rf blog project css js assets *.html robots.txt sitemap.xml
cp "$S_COMPANY"/*.html .
cp -r "$S_COMPANY"/css "$S_COMPANY"/js "$S_COMPANY"/assets "$S_COMPANY"/blog "$S_COMPANY"/project .
cp "$S_COMPANY"/robots.txt "$S_COMPANY"/sitemap.xml .
touch .nojekyll
cat CNAME   # must show: xevrilon.me — if missing: echo "xevrilon.me" > CNAME

git add -A && git commit -m "Publish company build" && git push origin main
```

## Publish PERSONAL data (Mohammed Akbar Hossen) — rollback

Run in `/c/laragon/www/portfolio-static`:

```bash
node tools/build.mjs
node tools/check.mjs
```

Then publish:

```bash
cd "$D" && git pull
rm -rf blog project css js assets *.html robots.txt sitemap.xml
cp "$S_PERSONAL"/*.html .
cp -r "$S_PERSONAL"/css "$S_PERSONAL"/js "$S_PERSONAL"/assets "$S_PERSONAL"/blog "$S_PERSONAL"/project .
cp "$S_PERSONAL"/robots.txt "$S_PERSONAL"/sitemap.xml .
touch .nojekyll
cat CNAME   # must show: xevrilon.me

git add -A && git commit -m "Publish personal build" && git push origin main
```

## Verify before push (in $D)

```bash
cat CNAME
grep -o "<title>[^<]*</title>" index.html
# company should be: <title>Xevrilon — Software studio</title>
# personal should be: <title>Mohammed Akbar Hossen ...
ls
# company has NO skills.html, NO experience.html (expected)
# personal has skills.html + experience.html
git status --short
```

## After push

1. Wait 30s–2min for GitHub Pages.
2. Open `http://xevrilon.me/` in incognito / Ctrl+F5 hard refresh.
3. If old content still shows: cache — try incognito or another browser.

## Troubleshooting

* `CNAME` deleted → domain breaks. Restore with `echo "xevrilon.me" > CNAME`, commit + push.
* `.nojekyll` missing → css/js may 404 on Pages. Restore with `touch .nojekyll`, commit + push.
* `skills.html` / `experience.html` 404 on company site → expected, company mode does not generate them.
* Push rejected → run `cd "$D" && git pull` first, then retry.
* Wrong variant live → you synced the wrong `S_*` folder. Re-do Publish section with the other folder.
