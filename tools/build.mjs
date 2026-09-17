/* ==========================================================================
   build.mjs - static page generator for the portfolio
   Zero dependencies. Reads the exported portfolio.json (from
   portfolio-akbar `php artisan portfolio:export-json`) and writes every
   HTML page, sharing one head/nav/footer implementation.

   Usage:
     node tools/build.mjs
     node tools/build.mjs --mode personal|company   content variant (default personal)
     node tools/build.mjs --data path/to/portfolio.json
     node tools/build.mjs --out path/to/dir         build into a separate folder
     node tools/build.mjs --site https://akbar.dev
   ========================================================================== */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

/* ------------------------------------------------------------------ */
/* CLI args                                                            */
/* ------------------------------------------------------------------ */

function arg(name, fallback) {
  const i = process.argv.indexOf(`--${name}`);
  return i !== -1 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
}

// Content variant: "personal" (default) or "company". Each variant has its
// own snapshot in data/ (seeded with SITE_MODE=...) and a few mode-specific
// authored copy lines (COPY below). The snapshot's meta.site_mode is the
// source of truth; a mismatch with --mode is a hard error.
const MODE = arg("mode", "personal");
if (!["personal", "company"].includes(MODE)) {
  console.error(`Unknown --mode "${MODE}". Expected "personal" or "company".`);
  process.exit(1);
}
const DEFAULT_DATA = fs.existsSync(path.join(ROOT, "data", `portfolio-${MODE}.json`))
  ? path.join(ROOT, "data", `portfolio-${MODE}.json`)
  : path.resolve(ROOT, "../../portfolio-akbar/storage/app/portfolio-export/portfolio.json");
const DATA_PATH = arg("data", DEFAULT_DATA);
const SITE_URL = arg("site", "https://akbar758742.github.io/portfolio").replace(/\/$/, "");

const data = JSON.parse(fs.readFileSync(DATA_PATH, "utf8"));
const p = data.profile;

if (data.meta?.site_mode && data.meta.site_mode !== MODE) {
  console.error(
    `Data mismatch: --mode=${MODE} but ${path.basename(DATA_PATH)} was seeded with site_mode=${data.meta.site_mode}.`,
  );
  console.error("Re-seed with the matching SITE_MODE and re-export, or pass the correct --mode.");
  process.exit(1);
}

/* ------------------------------------------------------------------ */
/* Site identity (company branding layer)                               */
/* ------------------------------------------------------------------ */

// data.site_identity carries the resolved Site::identity() block. In company
// mode it is the studio branding (name, contacts, hero copy) and it overlays
// the profile everywhere the Laravel runtime would resolve it; in personal
// mode the raw profile keeps rendering, so existing output is unchanged.
const id = data.site_identity ?? {};
const IS_COMPANY = MODE === "company" && Boolean(id.name);
if (IS_COMPANY) {
  // The seeders hardcode the thesis project's client line; a studio build
  // should not advertise a personal university affiliation.
  const scrub = (s) => String(s).replace(/Feni University/g, "Internal R&D");
  for (const pr of data.projects) {
    if (/Feni University/i.test(pr.client ?? "")) pr.client = "Internal R&D";
    for (const [k, v] of Object.entries(pr.facts ?? {})) {
      if (typeof v === "string" && v.includes("Feni University")) pr.facts[k] = scrub(v);
    }
  }
  for (const cs of data.case_studies) {
    if (typeof cs.content === "string" && cs.content.includes("Feni University")) cs.content = scrub(cs.content);
    if (typeof cs.seo_description === "string" && cs.seo_description.includes("Feni University")) cs.seo_description = scrub(cs.seo_description);
    for (const m of cs.metrics ?? []) {
      if (typeof m.label === "string" && m.label.includes("Feni University")) m.label = "Internal R&D";
    }
  }
}
if (IS_COMPANY) {
  p.name = id.name || p.name;
  p.initials = id.initials || p.name.slice(0, 2).toUpperCase();
  p.tagline = id.tagline || p.tagline;
  p.contact_email = id.email || p.contact_email;
  p.contact_phone_display = id.phone || p.contact_phone_display;
  p.location = id.location || p.location;
  if (id.hero_title) p.hero_title = id.hero_title;
  if (id.hero_lead) p.hero_description = id.hero_lead;
  if (id.roles_line) p.hero_roles = id.roles_line.split("·").map((s) => s.trim()).filter(Boolean);
  if (id.hero_badge) p.availability_badge = id.hero_badge;
}

/* ------------------------------------------------------------------ */
/* Mode-specific authored copy                                          */
/* ------------------------------------------------------------------ */

// Variant differences mostly live in the data snapshots (the seeders bake
// project/service strings per mode). A handful of template-voiced lines also
// shift per mode; personal values must stay identical to the original build.
const COPY =
  MODE === "company"
    ? {
        projectsSub: "Products and platforms delivered end to end, from commerce to healthcare.",
        testimonialsSub: "From clients, founders and product leads we have shipped with.",
        compatTitle: `One platform, <em>many</em> surfaces.`,
        compatBody: "Web apps, versioned REST APIs and headless storefronts built on the same core. This is the stack behind every product we operate.",
        compatCta: "See platform capabilities",
      }
    : {
        projectsSub: "Company products and personal builds, from commerce to healthcare.",
        testimonialsSub: "From teammates and product leads I have built with.",
        compatTitle: `One backend, <em>many</em> surfaces.`,
        compatBody: "Web apps, versioned REST APIs and headless storefronts built on the same core. This is the stack I reach for by default, across every product I ship.",
        compatCta: "See all skills",
      };

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

const esc = (s) =>
  String(s ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");

const asset = (file) =>
  String(file ?? "").replace(/^\/?uploads\/portfolio\//, "assets/images/");

const href = (root, page) => `${root}${page}`;

const fmtDate = (iso) => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
};

// Company-mode copy overrides (need esc, defined above).
const FOOTER_ABOUT = IS_COMPANY && id.footer_about ? esc(id.footer_about) : null;
const ABOUT_HERO_TITLE = IS_COMPANY && id.about_heading ? esc(id.about_heading) : `From database schema to <em>production</em> frontend.`;
const CTA_BODY = IS_COMPANY && id.cta_note ? esc(id.cta_note) : esc(p.objective);

// Personal-only surfaces. The Laravel app 404s pinned repos and the CV in
// company mode (GitHubController/ResumeController), and it has no
// experience/skills pages at all — a studio site should not advertise one
// person's work history. Those pages are skipped entirely in company builds.
const PERSONAL_ONLY_PAGES = IS_COMPANY ? new Set(["skills.html", "experience.html"]) : new Set();
const COMPAT_LINK = IS_COMPANY ? "services.html" : "skills.html";
const ANNOUNCE_TEXT = IS_COMPANY && id.roles_line ? id.roles_line : p.availability_text;

// In company mode the personal narrative (bio, focus items, SEO lines) is
// replaced by the studio copy; Laravel does the same via @company blocks on
// the about page.
const SEO_TITLE = IS_COMPANY ? `${p.name} — ${p.tagline}` : p.seo_title;
const SEO_DESC = IS_COMPANY && id.hero_lead ? id.hero_lead : p.seo_description;
const BIO_HTML = IS_COMPANY ? (id.about_text || id.hero_lead || "") : p.bio_text;
const STATUS_LINE = IS_COMPANY ? `Currently accepting new projects.` : p.status_project;
const SHOW_FOCUS = !IS_COMPANY;

// Socials: Laravel company mode shows ONLY the GitHub org (contact.blade.php
// builds $links from $site['github_org'] alone). Personal profile socials are
// personal identity and stay out of studio builds. Empty org => no links.
const SOCIAL_GITHUB = IS_COMPANY
  ? (id.github_org ? `https://github.com/${id.github_org}` : "")
  : p.social_github;
const SHOW_GITHUB = Boolean(SOCIAL_GITHUB);
const CONTACT_NOTE = IS_COMPANY && id.cta_note ? id.cta_note : p.availability_text;

// Read time: explicit value when present, else a ~200 wpm estimate from the
// post body (the export omits read_minutes for blog posts).
const readMins = (post) => {
  const n = Number(post.read_minutes);
  if (Number.isFinite(n) && n > 0) return n;
  const words = String(post.content ?? "").replace(/<[^>]*>/g, " ").trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
};

const isRealUrl = (u) => Boolean(u) && u !== "#" && !u.includes("example.com");

const tagList = (tags) =>
  (tags ?? [])
    .map((t) => (typeof t === "string" ? { label: t, tone: "" } : t))
    .filter((t) => t.label)
    .map((t) => `<span class="tag${t.tone === "accent" ? " tag--accent" : ""}">${esc(t.label)}</span>`)
    .join("\n            ");

const sectionHead = (title, lede, size = "") =>
  `<div class="section-head" data-reveal>
          <h2 class="section-head__title${size ? ` section-head__title--${size}` : ""}">${title}</h2>
          ${lede ? `<p class="section-head__lede">${lede}</p>` : ""}
        </div>`;

const chip = (label) => `<span class="tag">${esc(label)}</span>`;

/* ------------------------------------------------------------------ */
/* Shared chrome                                                       */
/* ------------------------------------------------------------------ */

const ICONS = `
  <svg class="visually-hidden" aria-hidden="true" focusable="false" xmlns="http://www.w3.org/2000/svg">
    <symbol id="i-arrow-right" viewBox="0 0 24 24"><path d="M5 12h13"></path><path d="m12 6 6 6-6 6"></path></symbol>
    <symbol id="i-external" viewBox="0 0 24 24"><path d="M8 16 16 8"></path><path d="M9.5 8H16v6.5"></path></symbol>
    <symbol id="i-copy" viewBox="0 0 24 24"><rect x="9" y="9" width="11" height="11" rx="2.5"></rect><path d="M15 5.5A2.5 2.5 0 0 0 12.5 3h-7A2.5 2.5 0 0 0 3 5.5v7A2.5 2.5 0 0 0 5.5 15"></path></symbol>
    <symbol id="i-check" viewBox="0 0 24 24"><path d="m4.5 12.5 5 5 10-11"></path></symbol>
    <symbol id="i-chevron-down" viewBox="0 0 24 24"><path d="m6 9.5 6 6 6-6"></path></symbol>
    <symbol id="i-menu" viewBox="0 0 24 24"><path d="M4 7h16"></path><path d="M4 12h16"></path><path d="M4 17h16"></path></symbol>
    <symbol id="i-close" viewBox="0 0 24 24"><path d="m6 6 12 12"></path><path d="M18 6 6 18"></path></symbol>
  </svg>`;

const NAV_LINKS = [
  ["projects.html", "Projects"],
  ["skills.html", "Skills"],
  ["services.html", "Services"],
  ["experience.html", "Experience"],
  ["blog.html", "Blog"],
  ["about.html", "About"],
];

function head({ root, title, description, canonicalPath }) {
  const url = `${SITE_URL}/${canonicalPath || CURRENT_FILE || "index.html"}`;
  return `  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="color-scheme" content="light">
  <meta name="theme-color" content="#f5f4f2">

  <title>${esc(title)}</title>
  <meta name="description" content="${esc(description)}">
  <meta name="author" content="${esc(p.name)}">
  <link rel="canonical" href="${esc(url)}">

  <meta property="og:type" content="website">
  <meta property="og:title" content="${esc(title)}">
  <meta property="og:description" content="${esc(description)}">
  <meta property="og:url" content="${esc(url)}">
  <meta name="twitter:card" content="summary">

  <link rel="icon" href="${root}assets/icons/favicon.svg" type="image/svg+xml">

  <script>document.documentElement.classList.add("js");</script>

  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700&amp;family=IBM+Plex+Mono:wght@400;500&amp;family=Playfair+Display:ital,wght@0,500;1,500&amp;display=swap">

  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css">

  <link rel="stylesheet" href="${root}css/variables.css">
  <link rel="stylesheet" href="${root}css/base.css">
  <link rel="stylesheet" href="${root}css/layout.css">
  <link rel="stylesheet" href="${root}css/components.css">
  <link rel="stylesheet" href="${root}css/sections.css">
  <link rel="stylesheet" href="${root}css/responsive.css">
  <link rel="stylesheet" href="${root}css/custom.css">`;
}

function nav(root, active) {
  const links = NAV_LINKS.filter(([page]) => !PERSONAL_ONLY_PAGES.has(page)).map(
    ([page, label]) => `            <li>
              <a class="nav__link"${active === page ? ' aria-current="true"' : ""} href="${href(root, page)}">${label}</a>
            </li>`,
  ).join("\n");

  return `  <div class="scroll-sentinel" data-header-sentinel aria-hidden="true"></div>

  <header class="site-header" data-header>
    <div class="container">
      <nav class="nav" aria-label="Primary">
        <a class="brand" href="${href(root, "index.html")}">
          <span class="brand__initials" aria-hidden="true">${esc(p.initials)}</span>
          <span>${esc(p.name)}</span>
        </a>

        <div class="nav__panel" id="nav-panel">
          <ul class="nav__list">
${links}
          </ul>

          <div class="nav__actions">
            ${SHOW_GITHUB ? `<a class="btn btn-outline btn--sm" href="${esc(SOCIAL_GITHUB)}" target="_blank" rel="noopener">GitHub</a>` : ""}
            <a class="btn btn-primary btn--sm" href="${href(root, "contact.html")}">Contact</a>
          </div>
        </div>

        <button class="nav__toggle" type="button" aria-expanded="false" aria-controls="nav-panel" aria-label="Open menu" data-nav-toggle>
          <svg class="icon nav__toggle-icon--open" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><use href="#i-menu"></use></svg>
          <svg class="icon nav__toggle-icon--close" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><use href="#i-close"></use></svg>
        </button>
      </nav>
    </div>
  </header>`;
}

const announceBar = (root) => `  <div class="announce">
    <div class="container">
      <a class="announce__link" href="${href(root, "contact.html")}">
        <span class="tag announce__chip">${esc(p.availability_badge)}</span>
        <span>${esc(ANNOUNCE_TEXT.split(".")[0])}</span>
        <svg class="icon icon--xs announce__arrow" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><use href="#i-arrow-right"></use></svg>
      </a>
    </div>
  </div>`;

function footer(root) {
  const navLinks = NAV_LINKS.filter(([page]) => !PERSONAL_ONLY_PAGES.has(page)).map(
    ([page, label]) => `<li><a href="${href(root, page)}">${label}</a></li>`,
  ).join("\n            ");
  const featured = data.projects.filter((x) => x.featured).slice(0, 4);
  const projectLinks = featured
    .map((x) => `<li><a href="${href(root, `project/${x.slug}.html`)}">${esc(x.title.split(" — ")[0])}</a></li>`)
    .join("\n            ");
  const socials = (
    IS_COMPANY
      ? [["GitHub", SOCIAL_GITHUB]]
      : [
          ["GitHub", p.social_github],
          ["LinkedIn", p.social_linkedin],
          ["Facebook", p.social_facebook],
          ["X", p.social_x],
        ]
  ).filter(([, url]) => url)
    .map(([label, url]) => `<li><a href="${esc(url)}" target="_blank" rel="noopener">${label}</a></li>`)
    .join("\n            ");

  return `  <footer class="site-footer">
    <div class="container">
      <div class="footer__grid">
        <div>
          <a class="brand" href="${href(root, "index.html")}">
            <span class="brand__initials" aria-hidden="true">${esc(p.initials)}</span>
            <span>${esc(p.name)}</span>
          </a>
          <p class="footer__blurb">${FOOTER_ABOUT ?? `${esc(p.tagline)}. ${esc(p.location)}. ${esc(p.availability_badge)}.`}</p>
        </div>

        <nav aria-labelledby="footer-pages">
          <h2 class="footer__heading" id="footer-pages">Pages</h2>
          <ul class="footer__list">
            ${navLinks}
          </ul>
        </nav>

        <nav aria-labelledby="footer-projects">
          <h2 class="footer__heading" id="footer-projects">Projects</h2>
          <ul class="footer__list">
            ${projectLinks}
            <li><a href="${href(root, "projects.html")}">All projects</a></li>
          </ul>
        </nav>

        <div>
          <h2 class="footer__heading" id="footer-elsewhere">Elsewhere</h2>
          <ul class="footer__list">
            ${socials}
            <li><a href="mailto:${esc(p.contact_email)}">${esc(p.contact_email)}</a></li>
          </ul>
        </div>
      </div>

      <div class="footer__bottom">
        <p>&copy; <span data-year>2026</span> ${esc(p.name)}. Static site, no trackers.</p>
        <p><a class="text-link" href="${href(root, "contact.html")}">Get in touch</a></p>
      </div>
    </div>
  </footer>

  <script src="${root}js/navigation.js" defer></script>
  <script src="${root}js/animations.js" defer></script>
  <script src="${root}js/hero.js" defer></script>
  <script src="${root}js/interactions.js" defer></script>
  <script src="${root}js/main.js" defer></script>`;
}

/** One full page. `body` excludes <body> tags; chrome wraps it. */
let CURRENT_FILE = "index.html";
function page({ root = "", file, title, description, active = "", body }) {
  CURRENT_FILE = file;
  const canonicalPath = root ? `${root.replace("../", "")}${file}` : file;
  return `<!DOCTYPE html>
<html lang="en">
<head>
${head({ root, title, description, canonicalPath })}
</head>

<body>
  ${ICONS}

  <a class="skip-link" href="#main">Skip to content</a>

${announceBar(root)}

${nav(root, active)}

  <main id="main">
${body}
  </main>

${footer(root)}
</body>
</html>
`;
}

/* ------------------------------------------------------------------ */
/* Reusable blocks                                                     */
/* ------------------------------------------------------------------ */

const codeBlock = (id, value) => `                  <div class="code-block">
                    <code class="code-block__cmd" id="${id}"><span class="code-block__prompt" aria-hidden="true">$</span> ${esc(value)}</code>
                    <button class="copy-btn" type="button" data-copy="#${id}">
                      <svg class="icon icon--xs copy-btn__icon--copy" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><use href="#i-copy"></use></svg>
                      <svg class="icon icon--xs copy-btn__icon--done" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><use href="#i-check"></use></svg>
                      <span data-copy-label>Copy</span>
                    </button>
                  </div>`;

const contactPanel = () => `          <div class="install-panel" id="contact-panel">
            <div class="install-panel__head">
              <p class="install-panel__title">Get in touch</p>
              <div class="tablist" role="tablist" aria-label="Contact channels" data-tabs>
                <button class="tab" type="button" role="tab" id="tab-email" aria-controls="panel-email" aria-selected="true">Email</button>
                <button class="tab" type="button" role="tab" id="tab-phone" aria-controls="panel-phone" aria-selected="false" tabindex="-1">Phone</button>
                ${SHOW_GITHUB ? `<button class="tab" type="button" role="tab" id="tab-github" aria-controls="panel-github" aria-selected="false" tabindex="-1">GitHub</button>` : ""}
              </div>
            </div>

            <div class="tabpanel" id="panel-email" role="tabpanel" aria-labelledby="tab-email">
              ${codeBlock("cmd-email", p.contact_email)}
            </div>
            <div class="tabpanel" id="panel-phone" role="tabpanel" aria-labelledby="tab-phone" hidden>
              ${codeBlock("cmd-phone", p.contact_phone_display)}
            </div>
            ${SHOW_GITHUB ? `<div class="tabpanel" id="panel-github" role="tabpanel" aria-labelledby="tab-github" hidden>
              ${codeBlock("cmd-github", SOCIAL_GITHUB.replace("https://", ""))}
            </div>` : ""}

            <p class="install-panel__note">${esc(CONTACT_NOTE)}</p>
            <p class="install-panel__meta">
              <svg class="icon icon--xs" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><use href="#i-check"></use></svg>
              ${IS_COMPANY ? "Replies within 24 hours" : `${esc(p.work_hours)} &middot; replies within 24 hours`}
            </p>
          </div>`;

const heroTiles = (images) =>
  images
    .map((src) => `<figure class="hero__tile"><img src="${src}" alt="" width="640" height="440" loading="lazy" decoding="async"></figure>`)
    .join("\n            ");

const heroMarquee = (images) => {
  const group = images
    .map((src) => `<figure><img src="${src}" alt="" width="480" height="330" loading="lazy" decoding="async"></figure>`)
    .join("\n            ");
  return `      <div class="hero__flow" aria-hidden="true">
        <div class="hero__flow-track">
          <div class="hero__flow-group">
            ${group}
          </div>
          <div class="hero__flow-group">
            ${group}
          </div>
        </div>
      </div>`;
};

const statGrid = (stats) => `<div class="row grid-regular" data-reveal-group>
          ${stats
            .map(
              (s) => `<div class="col-6 col-lg-3" data-reveal>
            <div class="stat-card">
              <p class="stat-card__value">${esc(String(s.value))}${esc(s.suffix ?? "")}</p>
              <p class="stat-card__label">${esc(s.label)}</p>
            </div>
          </div>`,
            )
            .join("\n          ")}
        </div>`;

const mediaCard = (image, title, tags, link, alt) => `<article class="media-card">
              <a class="media-card__link" href="${link}">
                <div class="media-card__media">
                  <img src="${image}" alt="${esc(alt ?? title)}" width="1200" height="750" loading="lazy" decoding="async">
                </div>
                <div class="media-card__body">
                  <h3 class="media-card__name">${esc(title)}</h3>
                  <span class="tag">${esc(tags)}</span>
                </div>
              </a>
            </article>`;

const quoteCard = (t) => `<div class="col-12 col-md-6" data-reveal>
            <figure class="quote">
              <blockquote class="quote__text">
                <p>${esc(t.quote)}</p>
              </blockquote>
              <figcaption class="quote__meta">
                <img class="quote__avatar" src="${asset(t.avatar)}" alt="" width="40" height="40" loading="lazy" decoding="async">
                <div>
                  <p class="quote__who">${esc(t.name)}</p>
                  <p class="quote__role">${esc(t.role)}${t.company ? `, ${esc(t.company)}` : ""}</p>
                </div>
              </figcaption>
            </figure>
          </div>`;

const ruleRow = (gutter, title, desc) => `<li class="rule" data-reveal>
            <span class="rule__id">${gutter}</span>
            <h3 class="rule__title">${title}</h3>
            <p class="rule__desc">${desc}</p>
          </li>`;

const timelineItem = (item, current = false) => `<li class="timeline__item${current ? " timeline__item--current" : ""}" data-reveal>
        ${item.period ? `<p class="timeline__period">${esc(item.period)}</p>` : ""}
        <h3 class="timeline__title">${item.title}</h3>
        ${item.body ? `<p class="timeline__body">${item.body}</p>` : ""}
        ${item.tags ? tagList(item.tags) : ""}
      </li>`;

const pageHero = (title, lede, extra = "") => `    <section class="page-hero">
      <div class="container">
        <h1 class="page-hero__title" data-reveal>${title}</h1>
        ${lede ? `<p class="page-hero__lede" data-reveal>${lede}</p>` : ""}
        ${extra}
      </div>
    </section>`;

/* ------------------------------------------------------------------ */
/* Pages                                                               */
/* ------------------------------------------------------------------ */

const tileImages = [
  "assets/images/project-ecommerce.svg",
  "assets/images/project-brightlms.svg",
  "assets/images/project-shiproute.svg",
  "assets/images/project-billstack.svg",
  "assets/images/project-medicore.svg",
  "assets/images/project-stockpilot.svg",
  "assets/images/project-threat.svg",
];

/* --- index.html ----------------------------------------------------- */

const featured = data.projects.filter((x) => x.featured);

const indexBody = `    <!-- Hero -->
    <section class="hero" aria-labelledby="hero-title">
      <div class="container">
        <div class="hero__main">
          <div class="hero__copy" data-reveal>
            <p class="tag hero__chip"><span class="hero__dot" aria-hidden="true"></span> ${esc(p.availability_badge)}</p>
            <h1 class="hero__title" id="hero-title">${esc(p.hero_title)}</h1>
            <p class="hero__lede">${esc(p.tagline)}.</p>
            <p class="hero__body">${esc(p.hero_description)}</p>
            <p class="hero__roles">${p.hero_roles.map(esc).join(" &middot; ")}</p>

            <div class="hero__actions">
              ${IS_COMPANY
                ? `<a class="btn btn-primary" href="contact.html">Start a project</a>
              <a class="btn btn-outline" href="projects.html">View projects</a>`
                : `<a class="btn btn-primary" href="projects.html">View projects</a>
              <a class="btn btn-outline" href="${asset(p.resume_file)}" download>Download CV</a>`}
            </div>
          </div>

          <div class="hero__stage" data-hero-field aria-hidden="true">
            <div class="hero__field">
            ${heroTiles(tileImages)}
            </div>
          </div>
        </div>
      </div>

${heroMarquee(tileImages)}

      <div class="container">
        <div class="hero__install" data-reveal>
${contactPanel()}
        </div>
      </div>
    </section>

    <!-- Quick stats -->
    <section class="section section--tight" aria-labelledby="stats-title">
      <div class="container">
        <h2 class="section-head__title section-head__title--sm" id="stats-title" data-reveal>By the numbers</h2>
        ${statGrid(p.quick_stats)}
      </div>
    </section>

    <!-- Featured projects -->
    <section class="section" id="projects" aria-labelledby="featured-title">
      <div class="container">
${sectionHead("Featured <em>projects</em>.", COPY.projectsSub)}
        <div class="row grid-regular projects__grid" data-reveal-group>
          ${featured
            .map((x) => `<div class="col-12 col-md-6" data-reveal>${mediaCard(asset(x.image), x.title, x.badge_label ?? x.category, `project/${x.slug}.html`, x.tagline)}</div>`)
            .join("\n          ")}
        </div>
        <p class="projects__invite"><a class="text-link" href="projects.html">All ${data.projects.length} projects</a></p>
      </div>
    </section>

    <!-- Testimonials -->
    <section class="section" id="testimonials" aria-labelledby="testimonials-title">
      <div class="container">
${sectionHead("Kind <em>words</em>.", COPY.testimonialsSub)}
        <div class="row grid-regular" data-reveal-group>
          ${data.testimonials.map(quoteCard).join("\n          ")}
        </div>
      </div>
    </section>

    <!-- Works with every stack (compat stage) -->
    <section class="compat-stage" id="stack" aria-labelledby="compat-title">
      <div class="compat-stage__bg" aria-hidden="true">
        <svg class="compat-stage__schematic" viewBox="0 0 1440 760" preserveAspectRatio="xMidYMid slice" focusable="false">
          <!-- registration crosses + title -->
          <g stroke="#b4aca2" stroke-width="1.5" stroke-linecap="round">
            <path d="M72 64v16M64 72h16"></path>
            <path d="M1368 64v16M1360 72h16"></path>
            <path d="M72 680v16M64 688h16"></path>
            <path d="M1368 680v16M1360 688h16"></path>
          </g>
          <text class="schematic__label" x="88" y="76">SCHEMATIC 07 — ONE CORE, MANY SURFACES</text>

          <!-- two quiet bus rails in the clear margins; the floating cards
               between them are the surfaces they serve -->
          <g fill="none" stroke="#b4aca2" stroke-width="1.5" stroke-linecap="round">
            <path d="M110 60 H1330"></path>
            <path d="M270 528 H1330"></path>
          </g>
          <g fill="#f5f4f2" stroke="#b4aca2" stroke-width="1.5">
            <circle cx="1330" cy="60" r="5"></circle>
            <circle cx="1330" cy="528" r="5"></circle>
          </g>

          <!-- core chip, parked in the copy column's clear bottom-left zone -->
          <g>
            <g transform="rotate(-8 200 570)">
              <rect x="146" y="516" width="108" height="108" rx="14" fill="#ffffff" stroke="#b4aca2" stroke-width="1.5"></rect>
              <rect x="175" y="545" width="50" height="50" rx="8" fill="none" stroke="#ff6b00" stroke-width="1.5"></rect>
              <g stroke="#b4aca2" stroke-width="1.5">
                <path d="M164 516v-10M184 516v-10M204 516v-10M224 516v-10M244 516v-10"></path>
                <path d="M164 624v10M184 624v10M204 624v10M224 624v10M244 624v10"></path>
              </g>
            </g>
            <circle class="schematic__pulse" cx="200" cy="570" r="26" fill="none" stroke="#ff6b00" stroke-width="1.5"></circle>
            <circle cx="200" cy="570" r="4.5" fill="#ff6b00"></circle>
            <text class="schematic__label" x="200" y="666" text-anchor="middle">CORE-01 · LARAVEL</text>
          </g>

          <!-- packets riding the bus rails (SMIL, desynced by negative begin) -->
          <g class="schematic__packets" fill="#ff6b00">
            <circle r="3.5">
              <animateMotion dur="12s" begin="0s" repeatCount="indefinite" path="M110 60 H1330"></animateMotion>
              <animate attributeName="opacity" values="0;1;1;0" keyTimes="0;0.08;0.92;1" dur="12s" begin="0s" repeatCount="indefinite"></animate>
            </circle>
            <circle r="3.5">
              <animateMotion dur="16s" begin="-9s" repeatCount="indefinite" path="M110 60 H1330"></animateMotion>
              <animate attributeName="opacity" values="0;1;1;0" keyTimes="0;0.08;0.92;1" dur="16s" begin="-9s" repeatCount="indefinite"></animate>
            </circle>
            <circle r="3.5">
              <animateMotion dur="13s" begin="-4s" repeatCount="indefinite" path="M270 528 H1330"></animateMotion>
              <animate attributeName="opacity" values="0;1;1;0" keyTimes="0;0.08;0.92;1" dur="13s" begin="-4s" repeatCount="indefinite"></animate>
            </circle>
            <circle r="3.5">
              <animateMotion dur="17s" begin="-12s" repeatCount="indefinite" path="M270 528 H1330"></animateMotion>
              <animate attributeName="opacity" values="0;1;1;0" keyTimes="0;0.08;0.92;1" dur="17s" begin="-12s" repeatCount="indefinite"></animate>
            </circle>
          </g>
        </svg>
      </div>
      <div class="container">
        <div class="compat-stage__hero" data-reveal>
          <div class="compat-stage__copy">
            <h2 class="compat__title" id="compat-title">${COPY.compatTitle}</h2>
            <p class="compat__body">${COPY.compatBody}</p>
            <div class="compat__actions">
              <a class="btn btn-primary btn--sm" href="${COMPAT_LINK}">${COPY.compatCta}</a>
              ${SHOW_GITHUB ? `<a class="btn btn-outline btn--sm" href="${esc(SOCIAL_GITHUB)}" target="_blank" rel="noopener">
                GitHub
                <svg class="icon icon--xs" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><use href="#i-external"></use></svg>
              </a>` : ""}
            </div>
          </div>
          <div class="compat-stage__cards" aria-label="Product surfaces">
            <figure class="compat-stage__card compat-stage__card--terminal"><img src="assets/images/project-ecommerce.svg" alt="" width="900" height="600" loading="lazy" decoding="async"></figure>
            <figure class="compat-stage__card compat-stage__card--system"><img src="assets/images/case-shiproute.svg" alt="" width="900" height="600" loading="lazy" decoding="async"></figure>
            <figure class="compat-stage__card compat-stage__card--skill"><img src="assets/images/project-brightlms.svg" alt="" width="900" height="600" loading="lazy" decoding="async"></figure>
            <figure class="compat-stage__card compat-stage__card--mark"><img src="assets/images/avatar.svg" alt="" width="900" height="600" loading="lazy" decoding="async"></figure>
            <figure class="compat-stage__card compat-stage__card--code"><img src="assets/images/blog-rag.svg" alt="" width="900" height="600" loading="lazy" decoding="async"></figure>
          </div>
        </div>

        <div class="compat-stage__agents" data-reveal>
          <h3 class="label" id="stack-label">Daily stack</h3>
          <ol class="agent-strip" aria-labelledby="stack-label">
            ${[
              "PHP",
              "Laravel",
              "MySQL",
              "Redis",
              "JavaScript",
              "Next.js",
              "Python",
              "Git / GitHub",
            ]
              .map((t) => `<li class="agent-tile"><span>${esc(t)}</span></li>`)
              .join("\n            ")}
          </ol>
        </div>
      </div>
    </section>

    <!-- Statement band -->
    <section class="band-poster" aria-labelledby="band-title">
      <h2 class="visually-hidden" id="band-title">${esc(p.bio_heading)}</h2>

      <div class="band-poster__glow band-poster__glow--left" aria-hidden="true"></div>
      <div class="band-poster__glow band-poster__glow--right" aria-hidden="true"></div>

      <!-- faint schematic bus behind the sentence, same language as the
           compat stage above -->
      <svg class="band-poster__bus" viewBox="0 0 1440 400" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false">
        <path d="M0 200 H1440" fill="none" stroke="#b4aca2" stroke-width="1.5"></path>
        <g fill="#f5f4f2" stroke="#b4aca2" stroke-width="1.5">
          <circle cx="120" cy="200" r="5"></circle>
          <circle cx="1320" cy="200" r="5"></circle>
        </g>
        <g class="schematic__packets" fill="#ff6b00">
          <circle r="3.5">
            <animateMotion dur="14s" begin="0s" repeatCount="indefinite" path="M0 200 H1440"></animateMotion>
            <animate attributeName="opacity" values="0;1;1;0" keyTimes="0;0.08;0.92;1" dur="14s" begin="0s" repeatCount="indefinite"></animate>
          </circle>
          <circle r="3.5">
            <animateMotion dur="19s" begin="-11s" repeatCount="indefinite" path="M0 200 H1440"></animateMotion>
            <animate attributeName="opacity" values="0;1;1;0" keyTimes="0;0.08;0.92;1" dur="19s" begin="-11s" repeatCount="indefinite"></animate>
          </circle>
        </g>
      </svg>

      <div class="container">
        <div class="band-poster__copy" aria-hidden="true" data-reveal>
          <div class="band-poster__line">
            <span class="band-poster__word band-poster__word--rise">From</span>
            <span class="band-poster__pill band-poster__pill--land">
              <!-- DB-01: storage cylinder, drawn in the schematic accent -->
              <svg viewBox="0 0 112 48" focusable="false" aria-hidden="true">
                <ellipse cx="56" cy="12" rx="34" ry="7" fill="none" stroke="#ff6b00" stroke-width="1.75"></ellipse>
                <path d="M22 12 V36 C22 39.5 37 41 56 41 C75 41 90 39.5 90 36 V12" fill="none" stroke="#ff6b00" stroke-width="1.75"></path>
                <path d="M22 24 C22 27.5 37 29 56 29 C75 29 90 27.5 90 24" fill="none" stroke="#ff6b00" stroke-width="1.75" opacity="0.45"></path>
                <circle cx="56" cy="24" r="2.5" fill="#ff6b00"></circle>
              </svg>
            </span>
          </div>

          <div class="band-poster__line band-poster__line--baseline">
            <span class="band-poster__word band-poster__word--accent band-poster__word--slide">database</span>
            <span class="band-poster__word band-poster__word--rise">schema</span>
          </div>

          <div class="band-poster__line">
            <span class="band-poster__node" aria-hidden="true"></span>
            <span class="band-poster__word band-poster__word--ink band-poster__word--wide">to</span>
            <span class="band-poster__pill band-poster__pill--code">
              <!-- APP-01: dark terminal chip matching the install panel -->
              <svg viewBox="0 0 120 48" focusable="false" aria-hidden="true">
                <rect x="1.5" y="1.5" width="117" height="45" rx="8" fill="#1a1a1a" stroke="#3a3a3a" stroke-width="1"></rect>
                <circle cx="11" cy="10" r="1.8" fill="#5f5850"></circle>
                <circle cx="18" cy="10" r="1.8" fill="#5f5850"></circle>
                <circle cx="25" cy="10" r="1.8" fill="#ff6b00"></circle>
                <text x="14" y="31" fill="#f5f4f2" font-family="IBM Plex Mono, ui-monospace, monospace" font-size="10" font-weight="500">php artisan serve</text>
                <circle cx="14" cy="39" r="2" fill="#ff6b00"></circle>
                <rect x="21" y="37.5" width="26" height="3" rx="1.5" fill="#3a3a3a"></rect>
              </svg>
            </span>
          </div>

          <div class="band-poster__line band-poster__line--end">
            <span class="band-poster__word band-poster__word--rise">production</span>
            <span class="band-poster__word band-poster__word--ship band-poster__word--rise">frontend.</span>
            <span class="band-poster__packet" aria-hidden="true"></span>
          </div>
        </div>
      </div>
    </section>

    <!-- Closing CTA -->
    <section class="section" aria-labelledby="cta-title">
      <div class="container">
        <div class="support__panel" data-reveal>
          <div class="support__copy">
            <h2 class="support__title" id="cta-title">${IS_COMPANY ? `Start with <em>${esc(p.name)}</em>.` : `Have a project in <em>mind</em>?`}</h2>
            <p class="support__body">${CTA_BODY}</p>
          </div>
          <div class="support__actions">
            <a class="btn btn-primary" href="contact.html">Start a conversation</a>
            <a class="btn btn-outline" href="services.html">See services</a>
          </div>
        </div>
      </div>
    </section>`;

/* --- about.html ------------------------------------------------------ */

const focusCard = (f) => {
  let inner = "";
  if (f.progress != null) inner += `<div class="skill-row__bar"><span class="skill-row__bar-fill" style="width:${Number(f.progress)}%"></span></div>`;
  if (Array.isArray(f.items) && typeof f.items[0] === "string") inner += `<ul class="focus-list">${f.items.map((i) => `<li>${esc(i)}</li>`).join("")}</ul>`;
  if (Array.isArray(f.items) && typeof f.items[0] === "object") {
    inner += `<ul class="focus-list">${f.items
      .map((i) => `<li><span class="tag tag--accent">${esc(i.quarter)}</span> ${esc(i.text)}</li>`)
      .join("")}</ul>`;
  }
  if (Array.isArray(f.chips) && typeof f.chips[0] === "string") inner += tagList(f.chips);
  if (Array.isArray(f.chips) && typeof f.chips[0] === "object") inner += tagList(f.chips.map((c) => c.label));
  if (f.body) inner += `<p class="rule__desc">${f.body}</p>`;
  return `<div class="col-12 col-md-6 col-xl-4" data-reveal>
            <article class="card skill-card">
              <div class="skill-card__top">${f.badge ? chip(f.badge) : ""}</div>
              <h3 class="skill-card__name">${esc(f.title)}</h3>
              ${inner}
            </article>
          </div>`;
};

const aboutBody = `${pageHero(ABOUT_HERO_TITLE, IS_COMPANY ? esc(SEO_DESC) : esc(p.objective))}

    <section class="section section--tight" aria-label="Biography">
      <div class="container">
        <div class="row grid-regular">
          <div class="col-12 col-lg-8" data-reveal>
            <div class="prose">${BIO_HTML}</div>
          </div>
          <div class="col-12 col-lg-4" data-reveal>
            <img class="about-photo" src="${asset(p.bio_image)}" alt="Portrait illustration of ${esc(p.name)}" width="320" height="320" loading="lazy" decoding="async">
            <p class="install-panel__meta"><svg class="icon icon--xs" viewBox="0 0 24 24" aria-hidden="true"><use href="#i-check"></use></svg> ${esc(STATUS_LINE)}</p>
          </div>
        </div>
      </div>
    </section>

    <section class="section section--tight" aria-labelledby="mv-title">
      <div class="container">
        <div class="row grid-regular" data-reveal-group>
          ${[
            ["Objective", p.objective],
            ["Mission", p.mission],
            ["Vision", p.vision],
          ]
            .map(
              ([t, b]) => `<div class="col-12 col-md-4" data-reveal>
            <div class="note-panel"><h3 class="note-panel__title">${t}</h3><p>${esc(b)}</p></div>
          </div>`,
            )
            .join("\n          ")}
        </div>
      </div>
    </section>

    <section class="section section--tight" aria-labelledby="focus-title">
      <div class="container">
${SHOW_FOCUS ? sectionHead("Current <em>focus</em>.", "What I am building, learning and planning this year.") : ""}
        <ul class="row grid-tight skills__grid" data-reveal-group>
          ${SHOW_FOCUS ? p.current_focus.map(focusCard).join("\n          ") : ""}
        </ul>
      </div>
    </section>

    <section class="section section--tight" aria-labelledby="lang-title">
      <div class="container">
        <div class="row grid-regular">
          <div class="col-12 col-lg-5" data-reveal>
            <h2 class="section-head__title section-head__title--sm" id="lang-title">Languages</h2>
            <div class="card skill-card">
              ${p.languages
                .map(
                  (l) => `<div class="skill-row">
                <p class="skill-row__name">${esc(l.name)}</p>
                <p class="skill-row__level">${esc(l.label ?? `${l.level}%`)}</p>
                <div class="skill-row__bar"><span class="skill-row__bar-fill" style="width:${Number(l.level)}%"></span></div>
              </div>`,
                )
                .join("\n              ")}
            </div>
          </div>
          <div class="col-12 col-lg-7" data-reveal>
            ${IS_COMPANY
              ? `<h2 class="section-head__title section-head__title--sm">The team</h2>
            <div class="row grid-tight">
              ${data.team
                .map(
                  (m) => `<div class="col-12 col-md-6"><div class="card skill-card">
                <h3 class="skill-card__name">${esc(m.name)}</h3>
                <p class="label">${esc(m.role)}</p>
                <p class="skill-card__desc">${esc(m.bio)}</p>
              </div></div>`,
                )
                .join("\n              ")}
            </div>`
              : `<h2 class="section-head__title section-head__title--sm">Beyond the keyboard</h2>
            <div class="card skill-card">
              <p class="skill-card__desc">${p.interests.map((i) => esc(i.label)).join(" &middot; ")}</p>
              <ul class="focus-list">
                ${p.fun_facts.map((f) => `<li>${esc(f)}</li>`).join("\n                ")}
              </ul>
            </div>`}
          </div>
        </div>
      </div>
    </section>

    <section class="section" aria-labelledby="process-title">
      <div class="container">
${sectionHead("How I <em>work</em>.", "A repeatable process from first call to maintenance.")}
        <ul class="rules" data-reveal-group>
          ${p.process_steps
            .map((s) => ruleRow(esc(s.step), esc(s.title), ""))
            .join("\n          ")}
        </ul>
      </div>
    </section>`;

/* --- skills.html ------------------------------------------------------ */

const skillsBody = `${pageHero(`Technical <em>skills</em>.`, "Depth where it matters: backend, data and the AI layer on top.")}

    <section class="section section--tight" aria-label="Skill groups">
      <div class="container">
        <ul class="row grid-tight skills__grid" data-reveal-group>
          ${data.skill_groups
            .map(
              (g) => `<li class="col-12 col-md-6" data-reveal>
            <article class="card skill-card">
              <div class="skill-card__top">${chip(g.name)}</div>
              <h3 class="skill-card__name">${esc(g.name)}</h3>
              ${g.skills
                .map(
                  (s) => `<div class="skill-row">
                <p class="skill-row__name">${esc(s.name)}</p>
                <p class="skill-row__level">${Number(s.level)}%</p>
                <div class="skill-row__bar"><span class="skill-row__bar-fill" style="width:${Number(s.level)}%"></span></div>
                <p class="skill-row__desc">${esc(s.description)}</p>
              </div>`,
                )
                .join("\n              ")}
            </article>
          </li>`,
            )
            .join("\n          ")}
        </ul>
      </div>
    </section>

    <section class="section section--tight" aria-labelledby="stack-title">
      <div class="container">
${sectionHead("Daily <em>stack</em>.", "The tools and frameworks I reach for by default.")}
        <div class="row grid-regular" data-reveal-group>
          ${data.tech_stack_groups
            .map(
              (g) => `<div class="col-12 col-lg-6" data-reveal>
            <div class="card skill-card">
              <div class="skill-card__top">${chip(g.title)}</div>
              <h3 class="skill-card__name">${esc(g.title)}</h3>
              ${tagList(g.chips)}
            </div>
          </div>`,
            )
            .join("\n          ")}
        </div>
      </div>
    </section>

    <section class="section" aria-labelledby="repos-title">
      <div class="container">
${sectionHead("Pinned <em>repos</em>.", "Open source experiments and practice builds.")}
        <div class="row grid-regular" data-reveal-group>
          ${p.pinned_repos
            .map(
              (r) => `<div class="col-12 col-md-6 col-lg-4" data-reveal>
            <a class="card skill-card repo-card" href="${esc(p.social_github)}/${esc(r.name)}" target="_blank" rel="noopener">
              <div class="skill-card__top">${chip(r.language ?? "Code")}</div>
              <h3 class="skill-card__name">${esc(r.name)}</h3>
              <p class="skill-card__desc">${r.description ? esc(r.description) : "Repository on GitHub."}</p>
            </a>
          </div>`,
            )
            .join("\n          ")}
        </div>
      </div>
    </section>`;

/* --- projects.html ---------------------------------------------------- */

const projectMeta = (x) => [x.client, x.role, x.timeline].filter(Boolean).map(esc).join(" &middot; ");

const projectsBody = `${pageHero(`Selected <em>projects</em>.`, "Commerce platforms, storefronts, logistics and an AI thesis, built end to end.")}

    <section class="section section--tight" aria-label="All projects">
      <div class="container">
        <div class="row grid-regular projects__grid" data-reveal-group>
          ${data.projects
            .map(
              (x) => `<div class="col-12 col-md-6" data-reveal>
            ${mediaCard(asset(x.image), x.title, x.tagline.split(",")[0].split(" with ")[0], `project/${x.slug}.html`, x.tagline)}
            <p class="project-card-meta">${projectMeta(x)}</p>
          </div>`,
            )
            .join("\n          ")}
        </div>
      </div>
    </section>`;

/* --- project detail --------------------------------------------------- */

const caseBySlug = (slug) => data.case_studies.find((c) => c.slug === slug);

function projectPage(x) {
  const root = "../";
  const cs = caseBySlug(x.slug);
  const facts = Object.entries(x.facts ?? {})
    .filter(([, v]) => v)
    .map(
      ([k, v]) => `<li class="rule" data-reveal>
            <span class="rule__id">${esc(k.replace(/_/g, " "))}</span>
            <p class="rule__desc">${esc(v)}</p>
          </li>`,
    )
    .join("\n          ");

  const metrics = cs?.metrics?.length
    ? statGrid(cs.metrics.map((m) => ({ value: m.value, suffix: "", label: m.label })))
    : "";

  return page({
    root,
    file: `${x.slug}.html`,
    title: `${x.seo_title ?? x.title}`,
    description: x.seo_description ?? x.tagline,
    body: `${pageHero(esc(x.title), esc(x.tagline), `
          <div class="page-hero__meta" data-reveal>
            ${chip(x.badge_label ?? x.category)}
            ${tagList((x.badges ?? []).slice(0, 3))}
            <p class="project-card-meta">${projectMeta(x)}</p>
          </div>`)}

    <section class="section section--tight" aria-label="Project visual">
      <div class="container">
        <figure class="media-card" data-reveal>
          <div class="media-card__media"><img src="${root}${asset(x.image)}" alt="${esc(x.title)}" width="1200" height="750" loading="lazy" decoding="async"></div>
        </figure>
        ${(isRealUrl(x.demo_url) || isRealUrl(x.github_url)) ? `<div class="hero__actions" data-reveal>
          ${isRealUrl(x.demo_url) ? `<a class="btn btn-primary btn--sm" href="${esc(x.demo_url)}" target="_blank" rel="noopener">Live demo<svg class="icon icon--xs" viewBox="0 0 24 24" aria-hidden="true"><use href="#i-external"></use></svg></a>` : ""}
          ${isRealUrl(x.github_url) ? `<a class="btn btn-outline btn--sm" href="${esc(x.github_url)}" target="_blank" rel="noopener">Source<svg class="icon icon--xs" viewBox="0 0 24 24" aria-hidden="true"><use href="#i-external"></use></svg></a>` : ""}
        </div>` : ""}
      </div>
    </section>

    ${metrics ? `<section class="section section--tight" aria-label="Key metrics"><div class="container">${metrics}</div></section>` : ""}

    <section class="section section--tight" aria-labelledby="facts-title">
      <div class="container">
        <h2 class="section-head__title section-head__title--md" id="facts-title" data-reveal>The <em>brief</em>.</h2>
        <ul class="rules" data-reveal-group>
          ${facts}
        </ul>
      </div>
    </section>

    <section class="section section--tight" aria-labelledby="modules-title">
      <div class="container">
        <h2 class="section-head__title section-head__title--sm" id="modules-title" data-reveal>Modules I worked on</h2>
        <div class="card skill-card" data-reveal>
          ${tagList((x.modules ?? []).map((m) => m.label))}
          <h3 class="skill-card__name">Stack</h3>
          ${tagList(x.tech_stack)}
        </div>
      </div>
    </section>

    ${cs ? `<section class="section" aria-labelledby="cs-title">
      <div class="container">
        <h2 class="section-head__title section-head__title--md" id="cs-title" data-reveal>Case <em>study</em>.</h2>
        <div class="prose" data-reveal>${cs.content}</div>
      </div>
    </section>` : ""}

    <section class="section section--tight" aria-label="Project navigation">
      <div class="container">
        <p class="projects__invite"><a class="text-link" href="${root}projects.html">&larr; All projects</a></p>
      </div>
    </section>`,
  });
}

/* --- experience.html --------------------------------------------------- */

const exp = data.experiences[0];
const edu = data.educations[0];

const experienceBody = `${pageHero(`Experience &amp; <em>education</em>.`, "Where I have worked, what I studied and the road so far.")}

    <section class="section section--tight" aria-labelledby="exp-title">
      <div class="container">
        <h2 class="section-head__title section-head__title--md" id="exp-title" data-reveal>Work.</h2>
        <ul class="timeline" data-reveal-group>
          ${timelineItem({
            period: `${exp.period_start} to ${exp.period_end}`,
            title: `${esc(exp.role_title)} at ${esc(exp.company)}`,
            body: `${esc(exp.description)}<br>${tagList(exp.tags)}`,
          }, exp.is_current)}
        </ul>
      </div>
    </section>

    <section class="section section--tight" aria-labelledby="edu-title">
      <div class="container">
        <h2 class="section-head__title section-head__title--md" id="edu-title" data-reveal>Education.</h2>
        <ul class="timeline" data-reveal-group>
          ${timelineItem({
            period: edu.period,
            title: esc(edu.degree),
            body: `${esc(edu.institution)}. ${esc(edu.description)}`,
          })}
        </ul>
      </div>
    </section>

    <section class="section" aria-labelledby="milestones-title">
      <div class="container">
        <h2 class="section-head__title section-head__title--md" id="milestones-title" data-reveal>Milestones.</h2>
        <ul class="timeline" data-reveal-group>
          ${data.milestones
            .map((m) =>
              timelineItem({
                period: m.period,
                title: esc(m.title),
                body: esc(m.description),
              }, m.is_current),
            )
            .join("\n          ")}
        </ul>
      </div>
    </section>`;

/* --- services.html ------------------------------------------------------ */

const GROUP_LABELS = { build: "Build", intelligence: "Intelligence", connect: "Connect", sustain: "Sustain" };
const groups = Object.keys(GROUP_LABELS).map((key) => ({
  key,
  label: GROUP_LABELS[key],
  items: data.services.filter((s) => s.group === key),
}));

const servicesBody = `${pageHero(`Services &amp; <em>pricing</em>.`, "Fixed-scope modules, full products or an ongoing partnership.")}

    <section class="section section--tight" aria-label="Service groups">
      <div class="container">
        ${groups
          .map(
            (g) => `<div class="service-group" data-reveal>
          <h2 class="section-head__title section-head__title--sm">${g.label}</h2>
          <ul class="row grid-tight skills__grid">
            ${g.items
              .map(
                (s) => `<li class="col-12 col-md-6 col-xl-3">
              <article class="card skill-card">
                <div class="skill-card__top">${chip(g.label)}</div>
                <h3 class="skill-card__name">${esc(s.name)}</h3>
                <p class="skill-card__desc">${esc(s.description)}</p>
                <div class="skill-card__install">
                  <code class="skill-card__slug">from ${esc(s.price_from)}</code>
                </div>
              </article>
            </li>`,
              )
              .join("\n            ")}
          </ul>
        </div>`,
          )
          .join("\n        ")}
      </div>
    </section>

    <section class="section section--tight" aria-labelledby="plans-title">
      <div class="container">
${sectionHead("Pricing <em>plans</em>.", "Every quote is itemized by module, so scope can be trimmed without renegotiating.")}
        <div class="row grid-regular" data-reveal-group>
          ${data.pricing_plans
            .map(
              (plan) => `<div class="col-12 col-lg-4" data-reveal>
            <article class="card skill-card plan-card${plan.featured ? " plan-card--featured" : ""}">
              <div class="skill-card__top">${chip(plan.featured ? "Most popular" : plan.period)}</div>
              <h3 class="skill-card__name">${esc(plan.name)}</h3>
              <p class="plan-card__price">${esc(plan.price)} <span>${esc(plan.period)}</span></p>
              <p class="skill-card__desc">${esc(plan.tagline)}</p>
              <ul class="focus-list">
                ${plan.features.map((f) => `<li>${esc(f)}</li>`).join("\n                ")}
              </ul>
              <a class="btn ${plan.featured ? "btn-primary" : "btn-outline"}" href="contact.html">${esc(plan.cta_label)}</a>
            </article>
          </div>`,
            )
            .join("\n          ")}
        </div>
      </div>
    </section>

    <section class="section" aria-labelledby="faq-title">
      <div class="container">
${sectionHead("Common <em>questions</em>.", "The things clients usually ask before we start.")}
        <ul class="rules" data-reveal-group>
          ${data.faqs
            .map((f, i) => ruleRow(`Q0${i + 1}`, esc(f.question), esc(f.answer)))
            .join("\n          ")}
        </ul>
      </div>
    </section>`;

/* --- blog.html ---------------------------------------------------------- */

const blogBody = `${pageHero(`Writing about the <em>craft</em>.`, IS_COMPANY ? "Notes on engineering, APIs and shipping production systems." : "Notes on Laravel, APIs, AI in production and the freelance business.")}

    <section class="section section--tight" aria-label="All posts">
      <div class="container">
        <div class="row grid-regular projects__grid" data-reveal-group>
          ${data.blog_posts
            .map(
              (post) => `<div class="col-12 col-md-6" data-reveal>
            ${mediaCard(asset(post.featured_image ?? "assets/images/blog-api.svg"), post.title, `${post.category?.name ?? "Notes"} &middot; ${fmtDate(post.published_at)} &middot; ${readMins(post)} min read`, `blog/${post.slug}.html`, post.excerpt)}
            <p class="project-card-meta">${esc(post.excerpt)}</p>
          </div>`,
            )
            .join("\n          ")}
        </div>
      </div>
    </section>`;

/* --- blog post pages ----------------------------------------------------- */

function blogPostPage(post) {
  const root = "../";
  return page({
    root,
    file: `${post.slug}.html`,
    title: `${post.title} | ${p.name}`,
    description: post.excerpt,
    body: `${pageHero(esc(post.title), "", `
          <div class="page-hero__meta" data-reveal>              ${chip(`${post.category?.name ?? "Notes"} &middot; ${fmtDate(post.published_at)} &middot; ${readMins(post)} min read`)}
            ${tagList(post.tags)}
          </div>`)}

    <section class="section section--tight">
      <div class="container">
        <figure class="media-card" data-reveal>
          <div class="media-card__media"><img src="${root}${asset(post.featured_image ?? "assets/images/blog-api.svg")}" alt="${esc(post.title)}" width="1200" height="750" loading="lazy" decoding="async"></div>
        </figure>
        <div class="prose" data-reveal>${post.content}</div>
        <p class="projects__invite"><a class="text-link" href="${root}blog.html">&larr; All posts</a></p>
      </div>
    </section>`,
  });
}

/* --- contact.html -------------------------------------------------------- */

const contactBody = `${pageHero(`Let&rsquo;s <em>talk</em>.`, esc(CONTACT_NOTE))}

    <section class="section section--tight" aria-label="Contact details">
      <div class="container">
        <div class="row grid-regular">
          <div class="col-12 col-lg-7" data-reveal>
${contactPanel()}
          </div>
          <div class="col-12 col-lg-5" data-reveal>
            <dl class="contact-rows">
              <div class="contact-row"><dt>Email</dt><dd><a class="text-link" href="mailto:${esc(p.contact_email)}">${esc(p.contact_email)}</a></dd></div>
              <div class="contact-row"><dt>Phone</dt><dd>${esc(p.contact_phone_display)}</dd></div>
              <div class="contact-row"><dt>Location</dt><dd>${esc(p.location)}${IS_COMPANY ? "" : ` &middot; ${esc(p.location_coords)}`}</dd></div>
              ${IS_COMPANY ? "" : `<div class="contact-row"><dt>Hours</dt><dd>${esc(p.work_hours)}</dd></div>
              <div class="contact-row"><dt>Timezone</dt><dd>${esc(p.timezone)}</dd></div>`}
              ${IS_COMPANY ? "" : `<div class="contact-row"><dt>Resume</dt><dd><a class="text-link" href="${asset(p.resume_file)}" download>Download CV (PDF)</a></dd></div>`}
            </dl>
            <div class="hero__actions">
              ${SHOW_GITHUB ? `<a class="btn btn-outline btn--sm" href="${esc(SOCIAL_GITHUB)}" target="_blank" rel="noopener">GitHub</a>` : ""}
              ${IS_COMPANY ? "" : `<a class="btn btn-outline btn--sm" href="${esc(p.social_linkedin)}" target="_blank" rel="noopener">LinkedIn</a>
              <a class="btn btn-outline btn--sm" href="${esc(p.social_x)}" target="_blank" rel="noopener">X</a>`}
            </div>
          </div>
        </div>
      </div>
    </section>`;

/* --- 404.html ------------------------------------------------------------ */

const notFoundBody = `${pageHero(`404 &mdash; nothing <em>here</em>.`, "The page you were looking for does not exist or moved.")}

    <section class="section section--tight">
      <div class="container">
        <div class="hero__actions" data-reveal>
          <a class="btn btn-primary" href="index.html">Back home</a>
          <a class="btn btn-outline" href="projects.html">View projects</a>
        </div>
      </div>
    </section>`;

/* ------------------------------------------------------------------ */
/* Extra CSS hooks used above (kept tiny, token-based)                  */
/* ------------------------------------------------------------------ */

const EXTRA_CSS = `
/* Generator companions (build.mjs) */
.brand__initials{display:inline-flex;align-items:center;justify-content:center;width:1.75rem;height:1.75rem;border-radius:6px;background:var(--ink-fill);color:var(--on-ink);font-family:var(--font-mono);font-size:.7rem;font-weight:500;letter-spacing:.02em}
.hero__roles{margin:0 0 var(--space-5);font-family:var(--font-mono);font-size:var(--fs-label);text-transform:uppercase;letter-spacing:var(--tracking-label);color:var(--faint)}
.media-card__link{display:block;color:inherit;text-decoration:none}
.project-card-meta{margin:var(--space-2) 0 0;font-size:var(--fs-small);color:var(--muted)}
.about-photo{width:100%;max-width:320px;border-radius:var(--radius-lg);border:1px solid var(--line);display:block;margin-bottom:var(--space-3)}
.focus-list{margin:var(--space-3) 0;padding-left:1.1rem;display:grid;gap:var(--space-2)}
.focus-list li{font-size:var(--fs-body-sm);color:var(--muted)}
.repo-card{display:block;color:inherit;text-decoration:none;transition:border-color var(--dur) var(--ease),transform var(--dur) var(--ease)}
.repo-card:hover{border-color:var(--line-strong);transform:translateY(-1px)}
.page-hero__meta{display:flex;flex-wrap:wrap;gap:var(--space-2);align-items:center;margin-top:var(--space-4)}
.plan-card{display:flex;flex-direction:column;gap:var(--space-3)}
.plan-card__price{margin:0;font-size:var(--fs-display-4);font-weight:600;color:var(--text)}
.plan-card__price span{font-size:var(--fs-small);font-weight:400;color:var(--muted)}
.plan-card .btn{margin-top:auto}
.service-group{margin-bottom:var(--space-8)}
.timeline .tag{margin-right:var(--space-1)}
`;

/* ------------------------------------------------------------------ */
/* SEO files                                                           */
/* ------------------------------------------------------------------ */

const allPaths = [
  "index.html",
  "about.html",
  "skills.html",
  "projects.html",
  "experience.html",
  "services.html",
  "blog.html",
  "contact.html",
].filter((u) => !PERSONAL_ONLY_PAGES.has(u)).concat([
  ...data.projects.map((x) => `project/${x.slug}.html`),
  ...data.blog_posts.map((x) => `blog/${x.slug}.html`),
]);

const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${allPaths.map((u) => `  <url><loc>${SITE_URL}/${u}</loc></url>`).join("\n")}
</urlset>
`;

const robots = `User-agent: *
Allow: /

Sitemap: ${SITE_URL}/sitemap.xml
`;

/* ------------------------------------------------------------------ */
/* Write everything                                                    */
/* ------------------------------------------------------------------ */

const OUT_ARG = arg("out", null);
const OUT = OUT_ARG ? path.resolve(ROOT, OUT_ARG) : ROOT; // the site root is this repo folder
const write = (rel, content) => {
  const file = path.join(OUT, rel);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content);
  return rel;
};

const written = [];

// Builds into a separate folder (e.g. --out dist-company) need the static
// chrome copied over; in-place builds already have it.
function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, entry.name);
    const d = path.join(dest, entry.name);
    if (entry.isDirectory()) copyDir(s, d);
    else fs.copyFileSync(s, d);
  }
}
if (OUT !== ROOT) {
  // Separate builds start from a clean dir so pages skipped in this mode
  // (e.g. skills.html in company builds) cannot linger from a previous run.
  fs.rmSync(OUT, { recursive: true, force: true });
  for (const dir of ["css", "js", "assets"]) copyDir(path.join(ROOT, dir), path.join(OUT, dir));
  fs.writeFileSync(path.join(OUT, ".nojekyll"), "");
}

// Append companion styles once (idempotent build).
const customCssPath = path.join(OUT, "css", "custom.css");
let customCss = fs.readFileSync(customCssPath, "utf8");
if (!customCss.includes("Generator companions")) {
  customCss += EXTRA_CSS;
  fs.writeFileSync(customCssPath, customCss);
}

written.push(write("index.html", page({ file: "index.html", title: SEO_TITLE, description: SEO_DESC, active: "", body: indexBody })));
written.push(write("about.html", page({ file: "about.html", title: `About | ${p.name}`, description: IS_COMPANY ? SEO_DESC : p.objective, active: "about.html", body: aboutBody })));
if (!PERSONAL_ONLY_PAGES.has("skills.html")) written.push(write("skills.html", page({ file: "skills.html", title: `Skills | ${p.name}`, description: p.tagline, active: "skills.html", body: skillsBody })));
written.push(write("projects.html", page({ file: "projects.html", title: `Projects | ${p.name}`, description: SEO_DESC, active: "projects.html", body: projectsBody })));
if (!PERSONAL_ONLY_PAGES.has("experience.html")) written.push(write("experience.html", page({ file: "experience.html", title: `Experience | ${p.name}`, description: `${p.tagline} at ${exp.company}.`, active: "experience.html", body: experienceBody })));
written.push(write("services.html", page({ file: "services.html", title: `Services & Pricing | ${p.name}`, description: p.mission, active: "services.html", body: servicesBody })));
written.push(write("blog.html", page({ file: "blog.html", title: `Blog | ${p.name}`, description: "Notes on Laravel, APIs and AI in production.", active: "blog.html", body: blogBody })));
written.push(write("contact.html", page({ file: "contact.html", title: `Contact | ${p.name}`, description: p.availability_text, active: "contact.html", body: contactBody })));
written.push(write("404.html", page({ file: "404.html", title: `Page not found | ${p.name}`, description: "Page not found.", body: notFoundBody })));

for (const x of data.projects) written.push(write(`project/${x.slug}.html`, projectPage(x)));
for (const post of data.blog_posts) written.push(write(`blog/${post.slug}.html`, blogPostPage(post)));

written.push(write("sitemap.xml", sitemap));
written.push(write("robots.txt", robots));

console.log(`Wrote ${written.length} files to ${OUT} [mode=${MODE}]`);
