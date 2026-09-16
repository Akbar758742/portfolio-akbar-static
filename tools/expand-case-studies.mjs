/* Append two implementation paragraphs to each of the 4 case studies in
   EVERY committed variant snapshot (data/portfolio-*.json), keeping the
   Laravel DB and the static builds in sync. Idempotent: re-runs are no-ops.
   Run: node tools/expand-case-studies.mjs */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DATA_DIR = path.join(ROOT, "data");
const files = fs.readdirSync(DATA_DIR).filter((f) => /^portfolio-.+\.json$/.test(f));

const ADDITIONS = {
  "sellino-ecommerce-platform": `
<h2>Implementation notes</h2>
<p>Seller-facing features run behind a role-aware policy layer, so the same controller surface serves different capabilities per account type. Cart and pricing rules live in dedicated service classes with queue-backed side effects (order confirmations, invoice records, wallet movements), keeping request cycles short even on heavy checkout paths. Multi-warehouse inventory is resolved at quote time: stock reservations are scoped per location, delivery-charge rules are cached per zone, and returns re-enter the same state machine as fresh orders so the fulfilment flow has exactly one source of truth.</p>
<p>On the data side, schema changes ship as expand-contract migrations so deploys never block on long ALTERs: new columns fill in the background, readers switch behind a feature flag, and the old column is dropped a release later. Search and catalog endpoints are cache-tagged per category and vendor, which makes invalidation surgical after price or stock updates. The API v10 layer mirrors the web controllers' form requests and resources, so the Next.js storefront and the server-rendered app consume byte-identical payloads from one codebase.</p>`,

  "baillows-nextjs-storefront": `
<h2>Implementation notes</h2>
<p>Session handling routes every login response through a Next.js route handler that sets an HTTP-only cookie and immediately refreshes the shared auth context, so OTP, password, and social-login paths converge on one code path. Server components fetch catalog and navigation data directly, while account, wallet, and checkout interactions run client-side against a typed API client with per-route error envelopes, which keeps expired-token handling in one interceptor rather than scattered across pages.</p>
<p>Protected areas sit behind layout-level guards that validate the session before rendering any account UI, so dashboard, wallet, wishlist, and affiliate pages share a single gate. Real-time chat and order-status updates subscribe through Laravel Reverb-backed channels with graceful fallback to polling on reconnect. Products and CMS-managed sections are server-rendered for first paint and SEO, while cart mutations are optimistic and reconciled against the API response, so the cart never shows a state the backend did not confirm.</p>`,

  "parcelfly-delivery-management": `
<h2>Implementation notes</h2>
<p>The parcel lifecycle is modelled as an explicit status machine: pickup-requested, collected, in-hub, in-transit, out-for-delivery, delivered, or returned. Every transition writes an immutable tracking event, which is what the public tracking endpoints and merchant timelines replay. COD settlement runs on a per-hub ledger with reconciliation reports that match courier remittances against delivered parcels, so accounting sees a closed loop per payout cycle instead of scattered records.</p>
<p>Rate calculation separates domestic and international pricing into their own structures. International shipments additionally carry pre-alerts, commodity declarations, and plan-based insurance, all validated before label generation so bad payloads fail early. Merchant onboarding, hub assignments, and delivery-personnel accounts share one role system with scoped permissions, and status webhooks notify merchants on every transition their integrations subscribe to.</p>`,

  "ai-powered-multivendor-ecommerce": `
<h2>Implementation notes</h2>
<p>The architecture keeps Laravel as the commerce core and moves model inference into separate Python services, so training and deployment cycles stay independent from feature releases. The recommendation pipeline starts content-based (embeddings over product attributes) and blends in collaborative signals as interaction data accrues, which is what keeps recommendations useful during the cold-start period. The dynamic pricing module scores price elasticity from historical orders and proposes adjustments inside vendor-defined floors and ceilings, never overriding them.</p>
<p>Trust and safety work is classifier-first: scam and spam detection run as ensemble classifiers over listing text and user behaviour, with vulnerability scanning handled as a separate pipeline over code and content payloads. Every AI feature ships with an evaluation harness so prompt or model changes are gated on measurable precision before they reach production, and all inference calls pass through a queue with cost metering so experiments cannot silently burn budget.</p>`,
};

let touched = [];
for (const file of files.map((f) => path.join(DATA_DIR, f))) {
  const data = JSON.parse(fs.readFileSync(file, "utf8"));
  let changed = 0;
  for (const cs of data.case_studies) {
    const addition = ADDITIONS[cs.slug];
    if (addition && !cs.content.includes("Implementation notes")) {
      cs.content = cs.content + addition;
      changed++;
    }
  }
  if (changed) {
    fs.writeFileSync(file, JSON.stringify(data, null, 2) + "\n");
    touched.push(`${path.basename(file)}: ${changed}`);
  }
}

console.log(touched.length ? `Expanded case studies in: ${touched.join(", ")}` : "All snapshots already expanded — nothing to do.");
