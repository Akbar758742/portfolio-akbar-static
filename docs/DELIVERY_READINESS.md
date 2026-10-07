# Product delivery and implementation readiness

Prepared: 2026-10-07 (Asia/Dhaka). Applies alongside the repository's `docs/PRD.md`. These are delivery requirements, not assertions that the application has passed them.

## Status definitions

| Status | Evidence required |
| --- | --- |
| Proposed | Requirement/decision written; no implementation claim |
| Ready to implement | Scope, actor, rules, errors, acceptance and dependencies clear for the selected slice |
| Code present | Files/routes/models exist; functional behavior not yet established |
| Verified | Recorded test run and representative walkthrough against exact revision and environment |
| Released | Verified revision deployed, smoke checks and rollback evidence recorded |

A plan, test file, model, configuration flag, mock screen, or successful login alone cannot establish the final two statuses. Repository-local implementation conventions/ADRs remain applicable. Resolve PRD/spec conflicts explicitly before changing their behavior; retain historical evidence.

## Turn a requirement into an implementation ticket

Every ticket records: PRD ID, user/outcome, in/out of scope, existing code pointers, proposed data/API/UI changes, authorization and row scope, state transitions, validations, concurrency/idempotency, failure states, acceptance scenarios, dependencies/decisions and rollback impact. For new endpoints, mark method/path/request/response/error contracts as proposed until implemented. Do not overwrite working APIs to match an illustrative path in a plan.

Definition of ready: the slice has no unresolved decision affecting its schema or behavior. Decisions for later releases do not block unrelated foundation work. Split changes at a complete workflow boundary rather than producing an unconnected model-only release.

## Shared acceptance and nonfunctional requirements

| Area | Requirement / acceptance |
| --- | --- |
| Access | Authentication plus action and row/field scope on direct requests, APIs, exports, search, files and queued jobs; denied requests cause no state changes |
| Validation | Server validates dates, relationships, statuses, unique IDs, files and totals; never trust browser computations or hidden form fields |
| Data integrity | Multi-row writes transactional; state transitions explicit; repeated commands/providers/jobs do not duplicate effects |
| Money/history | Exact currency units; immutable posted history and auditable corrections; snapshot applicable policies; concurrent operations reconcile |
| UI | Loading, empty, validation, denied, conflict and provider-failure states; pending work not labeled completed |
| Mobile/accessibility | Test 320/375/390/430 px plus desktop; no unintended document overflow; keyboard/focus/reduced motion; target WCAG 2.2 AA and document audit gaps before claiming conformance |
| Performance | Proposed pilot budget: p95 ordinary reads under 1 second and writes under 2 seconds at 20 concurrent users; external providers and asynchronous work measured separately. Define dataset/host/load method and tune budget before commercial SLA |
| Pagination | Paginate unbounded lists; prevent N+1 reads and unbounded exports; stable filtering/sorting |
| Secrets/privacy | Mask provider secrets in APIs/logs; no passwords/tokens in product docs or public exports; private files authorized; retention approved before purge |
| Localization/time | Use application translation conventions; company/site timezone explicit; UTC stored instants; money currency and rounding visible |
| Providers | Sandbox signature/replay/failure checks; credentials and production policy selected before enabling live payment/SMS/email features |
| Operations | Queues/scheduler observed; retry/backoff and failed-job handling; backup with separate restore drill and encrypted-key recovery plan |

Budgets and targets above are proposed requirements. This documentation task did not measure load, run functional test suites, perform accessibility certification or prove a restore. Owner-reviewed retention and statutory policies must be specified using verified current primary sources during the relevant implementation; no legal/tax rates are asserted here.

## Test and release procedure

1. Work on a feature branch or isolated checkout from the recorded baseline. Preserve unrelated local changes and stage only intentional files.
2. Use a dedicated test database and provider sandboxes. Never run `migrate:fresh`, seed real data, charge a customer, send real-user messages or purge records as a test/release shortcut.
3. Implement the slice following repository conventions. Add meaningful invariant/authorization regressions for business changes; documentation-only changes need link, scope and formatting checks.
4. Run appropriate backend tests/format checks and frontend typecheck/lint/build using actual repository scripts. Save command, exit status, revision and environment. Avoid installing developer bootstrap tooling onto a running production deployment solely for documentation.
5. Complete role-by-role acceptance, negative cases, retries/concurrency where applicable and mobile walkthrough. Attach evidence, not only checkmarks.
6. Deploy reviewed artifact/migrations with backup, compatibility checks and rollback/recovery instructions. Destructive schema changes require an approved migration plan.
7. Verify primary pages/auth/API and background work; observe logs/metrics. Document environment-only settings separately from code. Keep demo data/access separate from real-user environments.
8. Mark Released only for the verified deployment; update PRD/technical plan/decision register when scope or evidence changes.

## Acceptance evidence template

```text
Requirement IDs:
Commit / branch:
Environment / test database:
Commands and exit codes:
Role and workflow walkthrough:
Negative / concurrency / replay cases:
Frontend and mobile evidence:
Provider sandbox evidence, if required:
Migration / backup / restore / rollback:
Open defects and severity:
Owner / reviewer / date:
Result: Proposed | Ready to implement | Code present | Verified | Released
```

## Decision handling

Record each unresolved item with owner, working assumption, affected requirement/phase and its decision deadline. Do not mark assumptions approved because an agent wrote them. Do not claim multi-tenancy from an organization column, financial correctness from a ledger model, real authentication from a demo shortcut, or provider delivery from a configuration screen.
