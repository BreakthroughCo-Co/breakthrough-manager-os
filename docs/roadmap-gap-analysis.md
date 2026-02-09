# Roadmap & Gap Analysis

This document captures feature gaps, compliance requirements, and near/long-term roadmap items to guide product planning.

## Integrations & Core Feature Gaps
- **NDIA API integration** for claim submission, plan sync, and PRODA flows.
- **Support worker mobile app** with EVV/shift check-in plus offline notes.
- **Accounting/payroll integration** with Xero/MYOB and award interpretation.
- **Automated referrals/intake pipeline** with external referral automation or APIs.
- **Explicit NDIA/NDIS Commission submission hooks** for reportable incidents or plan claims.

## Privacy & Incident Readiness
- **Privacy/NDB readiness**: formal breach notification workflows and privacy incident response automation.
- **Automated reportable-incident deadlines** (24-hour / 5-day escalation).

## Security, Tenancy, and Governance
- **Automated tenant-isolation tests**: scan serverless functions to assert `tenant_id` filters or `requireTenantAccess()` usage on entity queries.
- **Secrets & policy review**: enforce Base44 secret manager use; forbid secrets in repo in deployment docs.
- **Role & permission audit**: build a matrix of roles and minimal permissions; enforce least privilege in backend checks.

## Reliability & Observability (P1)
- Centralized error reporting & monitoring (Sentry/Base44 logging + alerting).
- Request validation middleware for all functions (required fields, types, shared validators).
- Rate-limiting & throttling for LLM calls (per-tenant quotas, request throttling, circuit breaker).

## Code Hygiene & Developer Experience (P2)
- Remove debugging logs; add structured logging and log levels.
- Add linting/format enforcement to CI (ESLint/Prettier).
- Resolve mixed typing; migrate frontend to consistent TypeScript or document JS decision, then enable strict checks incrementally.

## Tests & CI/CD (P2)
- Add unit/integration tests for critical functions (tenant enforcement, `generateClientHistorySummary`, etc.).
- Add CI pipeline: build, lint, test on PRs; auto-deploy to staging on main merges.

## Performance & Architecture (P3)
- Consolidate functions where appropriate to reduce cold starts and deployment complexity.
- Caching & batch fetching for slow/expensive AI results with TTLs and invalidation.

## Low-Hanging Wins
- Run `npm audit` and update vulnerable dependencies.
- Add CODEOWNERS and CONTRIBUTING.md.
- Add a simple readiness/healthcheck endpoint.

## Phase 2 / SaaS Readiness
- **Tenant onboarding & admin console** for self-service creation and tenant settings.
- **Subscription & billing** (meter LLM usage, plan limits, Stripe/Xero invoices).
- **Audit evidence packaging**: one-click export of records, incident evidence, training logs with immutable timestamps.
- **SAML/SSO + 2FA** for enterprise security.
- **Role & permission management UI** with NDIS-specific templates.
- **Usage analytics & ROI dashboards** for KPIs, incident trends, and LLM cost impact.
- **Integrations marketplace** for finance, rostering, SMS/email, and plan managers.
