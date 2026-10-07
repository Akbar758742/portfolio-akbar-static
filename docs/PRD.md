# Static Portfolio Product Requirements Document

Version: 1.0 | Prepared: 2026-10-07 (Asia/Dhaka) | Status: static publishing requirements

## Purpose and success

Publish an accessible, fast portfolio from reviewed content snapshots, with no application server/database dependency. Keep personal and company variants reproducible and preserve the owner's project implementation notes.

## Evidence and baseline

Reviewed checkout `b74ce60` and `README.md`. The documented site lives in `portfolio-static/`, with HTML pages, CSS/JS, image assets, personal/company JSON snapshots and Node generation/check tools. README deployment statements about the root domain are historical; this session's VM deployment uses `portfolio.xevrilon.me`, while `xevrilon.me` serves the dynamic repository. Verify the publishing target before every release. See [delivery readiness](DELIVERY_READINESS.md).

## Scope and actors

Visitor reads profile, skills, experience, services, projects and blog, then follows contact links. Maintainer reviews snapshot content, builds selected variant, validates and publishes. Dynamic authentication, databases, server contact storage, admin UI, payments and subscriber storage are out of scope. A visual form must not imply a backend exists.

## Requirements and acceptance

| ID | Priority | Requirement | Acceptance |
| --- | --- | --- | --- |
| SP-01 | P0 | Deterministic generation | Same snapshot and tool version produce equivalent site; snapshot mode mismatch fails |
| SP-02 | P0 | Personal/company separation | Build chooses explicit variant; personal publishing cannot leak company-only/private fields |
| SP-03 | P0 | Content and asset integrity | Every internal URL/image/anchor resolves; duplicate IDs/slugs fail checker; no credentials/private contact submissions exported |
| SP-04 | P0 | Responsive navigation/footer | 320–430 px and desktop walkthrough show no page overflow, clipped links, or unusable menu |
| SP-05 | P1 | Search visibility | Sitemap/canonical/robots agree with the selected host; custom 404 works on target host |
| SP-06 | P0 | Contact truthfulness | Email/social links work; no success message for a submission without an actual endpoint/provider |
| SP-07 | P1 | Accessible content | Keyboard menu and focus, meaningful alt text, readable contrast and reduced motion |
| SP-08 | P0 | Safe deployment/rollback | Publish only built public artifacts; previous complete build retained and recoverable |

## Workflow and data rules

Export approved public content from the dynamic app or edit reviewed snapshot → reapply case-study notes with the documented expansion tool → build chosen mode with correct `--site` → run integrity checker → inspect key/mobile pages → publish artifact → verify host → record revision/build provenance.

Export must omit users, secrets, subscribers, inquiries and unpublished content. Stable slugs preserve external links; renamed public URLs need redirects where the host supports them or compatibility pages otherwise. Do not perform a database reset to export content. A generator failure blocks publication; do not serve partially updated output.

## Screens and architecture

Static home/about/skills/projects/detail/experience/services/blog/detail/contact/404. Keep framework-independent assets and explicit relative links that work under the publishing base. Build tooling stays out of the deployed artifact when possible; never expose raw internal snapshots containing private data. Source changes are reviewed in Git; deploy target is recorded independently of repository name.

## Delivery and measurements

R0: establish current deployment target and reproducible build. R1: integrity/privacy and mobile checks. R2: content improvements and optional measured performance optimization. Release runs documented Node generator/check commands in a staging output location so source pages are not overwritten during inspection. Targets: zero broken internal links/assets, zero snapshot-private fields, zero mobile overflow, successful restore of previous artifact.

## Decisions and readiness

Working target: VM subdomain; GitHub Pages remains an alternative documented workflow, not simultaneously assumed active. Contact provider and analytics are optional future decisions; default to honest email links and no trackers. Static hardening/build work can proceed without external credentials.
