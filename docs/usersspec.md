# Vitavision Specification: Authentication, Quotas, and Future Paid Access

**Status:** Draft for implementation  
**Audience:** Implementation team (Codex, Claude Code, human developers)  
**Project:** vitavision.dev  
**Date:** 2026-03-16  
**Owner:** Vitaly Vorobyev

---

## 1. Purpose

Vitavision is planned as a public technical website with two main functions:

1. A **public-facing blog and portfolio surface** for computer vision, calibration, and interactive algorithm demos.
2. A **compute-backed application surface** where users can upload images, run algorithms, and work with generated artifacts.

If Vitavision becomes popular, the current setup may not scale operationally or financially. This specification defines how to prepare the system for:

- controlled public growth,
- user-level access management,
- fair resource usage,
- abuse prevention,
- future monetization,
- and minimal architectural rework later.

This document does **not** require implementing full billing immediately. It does require the system to be designed so that billing, quotas, and premium plans can be added without major API or data model rewrites.

---

## 2. Problem Statement

The current and near-term architecture is suitable for development, demos, and limited public use, but it is not sufficient for sustained usage by tens or hundreds of users if heavy backend compute is publicly exposed.

Main risks:

- anonymous users can consume expensive compute,
- frontend-exposed shared credentials are not appropriate for multi-user public access,
- there is no durable user identity boundary,
- no per-user quota enforcement exists,
- no metering exists for pricing or capacity planning,
- no clear separation exists between cheap public features and expensive protected features,
- scaling costs could rise before there is a mechanism to recover them.

The project must therefore introduce a staged model:
- public content remains open,
- expensive execution paths become identity-aware,
- usage is tracked,
- quotas are enforced,
- and pricing can be introduced later.

---

## 3. Goals

### 3.1 Primary goals

- Keep **blog, documentation, and discovery surfaces public**.
- Protect expensive backend compute from anonymous abuse.
- Introduce **real user identity** for protected features.
- Track usage per user and per feature.
- Enforce quotas and hard limits.
- Prepare for future free and paid plans.
- Avoid overbuilding enterprise-grade infrastructure too early.

### 3.2 Secondary goals

- Support saved projects, uploads, and artifacts tied to a user.
- Enable future premium features such as priority jobs, higher limits, and API access.
- Improve operational observability and cost awareness.
- Preserve a good UX for first-time visitors.

### 3.3 Non-goals

This specification does **not** require immediate implementation of:
- subscriptions,
- invoices,
- tax handling,
- marketplace features,
- team/organization billing,
- full enterprise RBAC,
- or a complex multi-region infrastructure.

---

## 4. Product Principles

1. **Public discovery should stay friction-light.**  
   People should be able to read articles, browse demos, and understand the product without creating an account.

2. **Expensive compute must never be effectively anonymous.**  
   Any meaningful server-side processing should be attributable to a user or a well-defined temporary access tier.

3. **Usage should be measurable before it is billable.**  
   Metering comes before monetization.

4. **Limits are a product feature, not just an infrastructure defense.**  
   Users should understand what is free, what is limited, and what requires upgrade.

5. **Storage is cost. Compute is cost. Retention is cost.**  
   The system must treat all three explicitly.

6. **Design for staged rollout.**  
   Architecture should support:
   - public-only phase,
   - free account phase,
   - paid/pro phase,
   - API phase.

---

## 5. High-Level Product Model

Vitavision should distinguish three categories of capability.

### 5.1 Public features
Accessible without authentication.

Examples:
- landing pages,
- blog posts,
- documentation,
- static images and diagrams,
- lightweight in-browser-only tools,
- limited read-only demos using bundled sample data.

### 5.2 Authenticated free features
Require a user account but are available without payment.

Examples:
- uploading images up to a small limit,
- running selected algorithms with monthly quotas,
- storing a small number of projects,
- accessing generated artifacts for a limited retention period,
- viewing job history.

### 5.3 Premium / paid features
Require authentication and a paid entitlement.

Examples:
- larger uploads,
- more runs per month,
- more concurrent jobs,
- longer artifact retention,
- private workspaces/projects,
- priority queue,
- API access,
- bulk processing,
- more compute-intensive pipelines,
- export/report packs.

---

## 6. Scope of This Specification

This specification covers:

- authentication and identity,
- authorization concepts,
- quotas and hard limits,
- usage metering,
- job model,
- storage ownership and retention,
- plan model,
- API changes,
- data model,
- rollout phases,
- implementation constraints,
- acceptance criteria.

---

## 7. Functional Requirements

## 7.1 Authentication

The system shall support authenticated user accounts for protected features.

### Requirements
- Users shall be able to sign up and sign in using a managed authentication solution or equivalent server-side auth implementation.
- Each authenticated user shall have a stable internal `user_id`.
- Protected resources shall be attributable to a `user_id`.
- Authentication state shall be usable by both frontend and backend services.
- Anonymous access shall remain possible for explicitly public routes only.

### Notes
A hosted identity provider is preferred initially to avoid building custom auth from scratch.

---

## 7.2 Authorization

The system shall authorize actions based on:
- route type,
- user identity,
- plan/entitlement,
- quota availability,
- and resource ownership.

### Requirements
- Public routes shall not require authentication.
- Protected routes shall require authentication.
- Resources such as uploads, jobs, artifacts, and projects shall belong to a user.
- A user shall only access their own protected resources unless explicitly made public.
- Admin access, if needed, shall be separated from normal user access.

### Minimum role model
- `anonymous`
- `user`
- `admin`

Future roles may be added later, but are not required now.

---

## 7.3 Plans and Entitlements

The system shall support a plan model even if only one free plan exists initially.

### Required initial plan concepts
- `public`
- `free`
- `pro` (placeholder, can be inactive at launch)

### Each plan may define
- max upload size,
- max runs per period,
- max concurrent jobs,
- max stored projects,
- retention duration,
- access to premium algorithms,
- API access allowed or not,
- queue priority.

### Requirement
Plan evaluation shall happen server-side. The frontend may display limits, but must not be the source of truth.

---

## 7.4 Quotas

The system shall enforce quotas per authenticated user.

### Quota dimensions
At minimum, quota support shall be designed for:
- algorithm runs per month,
- bytes uploaded per month,
- max image size,
- max concurrent active jobs,
- stored artifact count,
- stored artifact bytes,
- project count,
- retention duration.

### Requirements
- Quotas shall be evaluated before job acceptance whenever practical.
- Quotas shall be enforced server-side.
- Quota exhaustion shall return a clear machine-readable error.
- The UI should display quota usage and remaining allowance where relevant.
- Some quotas may be hard-stop limits. Others may be soft warning thresholds.

### Public mode
Anonymous users should either:
- have no access to expensive compute, or
- have extremely limited sandbox quotas not suitable for abuse.

Preferred approach: reserve meaningful compute for authenticated users.

---

## 7.5 Usage Metering

The system shall record usage events for protected operations.

### Metering objectives
- support quota enforcement,
- support operational visibility,
- support future billing,
- support product analytics.

### Minimum tracked entities
- user,
- plan,
- algorithm or feature,
- timestamp,
- request size,
- execution duration,
- result size,
- status,
- resource identifiers.

### Requirement
Every accepted protected compute job shall produce a durable usage record, regardless of success or failure.

### Usage events may include
- upload created,
- job accepted,
- job started,
- job completed,
- job failed,
- artifact generated,
- artifact deleted,
- quota exceeded,
- plan changed.

---

## 7.6 Jobs

Expensive compute shall be modeled as jobs.

### Rationale
A job model provides:
- clean quota enforcement,
- queueing,
- retries,
- observability,
- priority handling,
- future async scale-out.

### Requirements
- Expensive algorithm execution shall have a job abstraction even if initially executed inline.
- Jobs shall have states such as:
  - `queued`
  - `running`
  - `completed`
  - `failed`
  - `cancelled`
- Jobs shall belong to a user.
- Jobs shall be linked to inputs and generated artifacts.
- Jobs shall expose timestamps for lifecycle transitions.
- The API shall allow polling or subscription to job status.

### Recommendation
Even if an endpoint remains request-response initially, the domain model should still create a job record internally.

---

## 7.7 Uploads and Artifacts

Uploads and derived artifacts shall be treated as owned resources.

### Requirements
- Uploaded files shall belong to a user or public demo context.
- Derived artifacts shall belong to the job and the user.
- Retention policies shall be plan-aware.
- The system shall support artifact expiration and cleanup.
- The backend shall not retain uploads forever by default.
- Users shall be able to list their own resources.
- The system shall support future deletion by user request.

### Retention examples
- free: short retention
- pro: longer retention
- public demo: ephemeral only

---

## 7.8 Public vs Protected Feature Segmentation

The system shall explicitly classify features by cost and access policy.

### Required classification labels
At minimum:
- `public-cheap`
- `authenticated-free`
- `premium`

### Product rule
No route with significant compute or storage cost shall remain ambiguously public.

---

## 7.9 Rate Limiting and Abuse Prevention

The system shall enforce abuse controls at multiple layers.

### Requirements
- IP-based rate limiting for public routes.
- User-based rate limiting for authenticated routes.
- Quota-based admission control for protected compute.
- Upload validation for file type, size, and content characteristics.
- Limits on concurrent jobs per user.
- Logging for repeated quota abuse or suspicious patterns.

### Recommendation
Use both:
- coarse network-level rate limiting,
- and fine user-level product limits.

---

## 7.10 Observability

The system shall provide enough telemetry to understand cost and behavior.

### Minimum required metrics
- daily active users,
- authenticated users,
- jobs accepted per algorithm,
- job completion and failure rate,
- p50/p95 job runtime,
- bytes uploaded,
- bytes stored,
- artifact count,
- quota exceeded counts,
- storage cleanup counts.

### Requirement
Observability must be sufficient to answer:
- which features cost the most,
- which plans/users consume the most resources,
- whether premium gating is justified,
- and which limits should be adjusted.

---

## 8. Non-Functional Requirements

## 8.1 Simplicity
The first implementation should favor a simple architecture with clear extension points over a fully generalized billing platform.

## 8.2 Security
Protected APIs must not rely on secrets embedded in the frontend bundle for access control.

## 8.3 Scalability
The design should support migration from:
- synchronous single-node execution
to
- queued execution
to
- separated worker processes/services.

## 8.4 UX clarity
Users should receive clear messages when:
- authentication is required,
- a quota is exhausted,
- an upload exceeds limits,
- a feature requires a higher tier.

## 8.5 Data ownership
Protected user resources must be attributable, queryable, and removable.

---

## 9. Proposed Architecture

## 9.1 Logical components

1. **Frontend**
   - public pages,
   - authenticated dashboard/workspace,
   - quota display,
   - job status UI,
   - upgrade prompts.

2. **Auth layer**
   - sign-up/sign-in,
   - session/token validation,
   - user identity resolution.

3. **API/backend**
   - resource ownership checks,
   - plan resolution,
   - quota checks,
   - job creation,
   - usage metering,
   - artifact management.

4. **Job execution layer**
   - synchronous executor initially or queue-backed executor later,
   - algorithm-specific workers.

5. **Data/storage**
   - relational metadata store,
   - object/file storage for uploads and artifacts,
   - cleanup process.

6. **Observability**
   - structured logs,
   - metrics,
   - dashboards,
   - alerts.

---

## 9.2 Recommended progression

### Initial implementation
- managed auth provider,
- backend session verification,
- server-side plan and quota checks,
- metadata in relational DB,
- local or simple object storage,
- background cleanup process,
- inline jobs with persistent records.

### Later evolution
- queue for jobs,
- dedicated worker services,
- payment provider integration,
- API token management,
- admin tooling,
- team accounts.

---

## 10. Domain Model

This is a conceptual model, not a final schema.

## 10.1 User
Represents an authenticated person.

Suggested fields:
- `id`
- `email`
- `display_name`
- `created_at`
- `status`
- `auth_provider_subject`

---

## 10.2 Plan
Represents a named plan/tier.

Suggested fields:
- `id`
- `code` (`public`, `free`, `pro`)
- `name`
- `active`
- `description`

---

## 10.3 UserPlan
Represents the plan assigned to a user over time.

Suggested fields:
- `id`
- `user_id`
- `plan_id`
- `starts_at`
- `ends_at`
- `source` (`default`, `manual`, `payment`, `promo`)
- `status`

---

## 10.4 PlanLimit
Represents a specific limit for a plan.

Suggested fields:
- `id`
- `plan_id`
- `metric_key`
- `window_type` (`request`, `daily`, `monthly`, `lifetime`, `retention`)
- `limit_value`
- `unit`

Example metric keys:
- `max_upload_bytes`
- `max_runs_per_month`
- `max_concurrent_jobs`
- `max_artifact_retention_days`
- `max_projects`
- `api_access_enabled`

---

## 10.5 Project
Optional saved workspace grouping jobs/resources.

Suggested fields:
- `id`
- `user_id`
- `name`
- `visibility`
- `created_at`
- `updated_at`

---

## 10.6 Upload
Represents an uploaded input file.

Suggested fields:
- `id`
- `user_id`
- `project_id` nullable
- `storage_key`
- `filename`
- `mime_type`
- `size_bytes`
- `sha256`
- `created_at`
- `expires_at`
- `source_type` (`user`, `demo`, `system`)

---

## 10.7 Job
Represents a compute request.

Suggested fields:
- `id`
- `user_id`
- `project_id` nullable
- `algorithm_key`
- `status`
- `priority`
- `submitted_at`
- `started_at`
- `completed_at`
- `failed_at`
- `input_upload_id` nullable
- `request_json`
- `result_json` nullable
- `error_code` nullable
- `error_message` nullable
- `plan_snapshot`
- `quota_snapshot`

---

## 10.8 Artifact
Represents a generated output.

Suggested fields:
- `id`
- `user_id`
- `job_id`
- `project_id` nullable
- `storage_key`
- `artifact_type`
- `mime_type`
- `size_bytes`
- `created_at`
- `expires_at`

---

## 10.9 UsageEvent
Represents a metered action.

Suggested fields:
- `id`
- `user_id`
- `job_id` nullable
- `project_id` nullable
- `event_type`
- `feature_key`
- `plan_code`
- `quantity`
- `unit`
- `metadata_json`
- `created_at`

---

## 10.10 QuotaLedger or Aggregation Model
Represents aggregated usage for quota evaluation.

Possible approaches:
1. aggregate from `UsageEvent`,
2. maintain a rolling ledger,
3. keep periodic materialized summaries.

Implementation may choose the simplest reliable path first.

---

## 11. API Requirements

## 11.1 Public API
Public endpoints may exist for:
- blog/content delivery,
- docs,
- static demo metadata,
- low-cost in-browser helper functionality.

These must not expose expensive compute unintentionally.

---

## 11.2 Protected API
Protected endpoints shall require authenticated user context.

Examples:
- create upload,
- create job,
- list jobs,
- fetch own artifacts,
- fetch own projects,
- delete own resources,
- read usage summary.

---

## 11.3 Required API behaviors

### On protected compute request
The backend shall:
1. authenticate user,
2. resolve effective plan,
3. validate feature access,
4. validate request limits,
5. check quota availability,
6. create job record,
7. emit usage/metering event(s),
8. execute or queue job,
9. persist outputs and status.

### Errors
Protected API should return structured errors for:
- unauthenticated,
- unauthorized,
- feature not in plan,
- quota exceeded,
- upload too large,
- too many concurrent jobs,
- retention expired.

---

## 11.4 Usage summary endpoint
A protected endpoint should provide:
- current plan,
- usage counters,
- remaining quota,
- retention information,
- upgrade hints.

This is needed for the dashboard and future upsell flow.

---

## 12. Quota Design

## 12.1 Initial quota approach
Start simple. Do not implement a highly abstract rules engine on day one.

Recommended initial quotas:
- max upload size,
- max monthly job count,
- max concurrent jobs,
- max stored projects,
- max stored artifact retention days.

This is enough to control early cost.

---

## 12.2 Evaluation timing
Quota checks should happen:
- before accepting upload,
- before accepting a job,
- before extending retention,
- before enabling premium-only features.

---

## 12.3 Suggested starter plan examples

These are placeholders for implementation and product testing, not final business decisions.

### Public
- no protected job execution,
- static/demo only,
- no private storage.

### Free
- modest upload size,
- modest runs per month,
- short retention,
- low concurrency,
- small project count.

### Pro
- larger upload size,
- more runs,
- longer retention,
- higher concurrency,
- premium features,
- API access optional.

Exact numbers should be configurable, not hardcoded in business logic.

---

## 13. Job Execution Model

## 13.1 Initial mode
The system may execute jobs inline in the API process if load is still low, but it must create persistent job metadata as if the work were asynchronous.

## 13.2 Future mode
The system should support moving to:
- queued execution,
- worker processes,
- priority by plan,
- retry policies.

## 13.3 Required job fields for transition readiness
- lifecycle timestamps,
- owner,
- algorithm key,
- priority,
- status,
- structured inputs and outputs.

---

## 14. Storage and Retention

## 14.1 Ownership
All non-public uploads and artifacts must have a clear owner.

## 14.2 Expiration
Files should have `expires_at` when appropriate.

## 14.3 Cleanup
A scheduled cleanup process shall remove expired files and update metadata accordingly.

## 14.4 Retention policy
Retention shall be plan-aware and configurable.

## 14.5 Product rule
Persistence is not free by default. Long-term retention should be intentionally granted.

---

## 15. Monetization Readiness

## 15.1 What must be ready now
- user identity,
- plan model,
- quota enforcement,
- usage metering,
- upgrade-aware UX states.

## 15.2 What can wait
- actual payment checkout,
- invoices,
- proration,
- tax/VAT handling,
- coupons,
- seats,
- enterprise contracts.

## 15.3 Design requirement
Do not hardwire assumptions that “all authenticated users are free forever.”

---

## 16. UX Requirements

## 16.1 Public user experience
A visitor should be able to:
- understand what Vitavision is,
- read articles,
- inspect demos,
- see which features require sign-in.

## 16.2 Authenticated user experience
A signed-in user should be able to:
- see their current plan,
- see relevant limits,
- see recent jobs,
- see failures with useful explanation,
- understand when a feature is unavailable due to quota or plan.

## 16.3 Upgrade prompts
When a user hits a plan boundary, the UI should show:
- what limit was hit,
- what action is available,
- whether waiting for next cycle or upgrading would help.

Even before billing exists, this should be represented structurally.

---

## 17. Rollout Plan

## Phase 0 — Preparation
Goal: make architecture ready without changing business model yet.

### Deliverables
- define public vs protected routes,
- introduce user-aware resource ownership in backend model,
- add plan and limit tables/config,
- add usage event model,
- add job records for compute actions,
- remove reliance on shared frontend-secret style access for protected compute.

### Exit criteria
- protected compute paths can be associated with a user,
- public pages remain public,
- codebase has extension points for plan/quota checks.

---

## Phase 1 — Authentication + Free Accounts
Goal: identity-aware protected usage.

### Deliverables
- managed auth integrated,
- sign-in/sign-up flows,
- protected dashboard/workspace,
- uploads/jobs/artifacts bound to user,
- usage summary endpoint,
- basic quota checks.

### Exit criteria
- protected compute requires auth,
- a signed-in free user can run within limits,
- usage is visible in logs and dashboard API.

---

## Phase 2 — Hard Limits + Retention
Goal: operational control.

### Deliverables
- enforce upload size limits,
- enforce monthly runs,
- enforce concurrency limits,
- add artifact expiration,
- add cleanup job,
- add clear error states.

### Exit criteria
- system can reject over-limit usage predictably,
- stored data does not grow unbounded,
- users see why actions fail.

---

## Phase 3 — Premium Readiness
Goal: product and backend ready for monetization.

### Deliverables
- `pro` plan support in backend,
- premium feature flags,
- priority handling hooks,
- upgrade UI placeholders,
- admin/manual plan assignment.

### Exit criteria
- a user can be moved between free and pro without code changes,
- premium-only routes/features can be toggled server-side.

---

## Phase 4 — Billing Integration
Goal: actual payments if usage justifies it.

### Deliverables
- payment provider integration,
- subscription lifecycle handling,
- entitlement sync,
- cancellation/downgrade behavior.

### Exit criteria
- payment state updates user plan correctly,
- quota and feature access reflect plan changes.

---

## 18. Implementation Guidance

## 18.1 Prefer managed auth
Do not spend energy building bespoke auth flows unless there is a strong reason.

## 18.2 Keep plan logic server-side
Frontend can display limits but must never enforce access by itself.

## 18.3 Use configuration for limits
Limits should be changeable without rewriting application logic.

## 18.4 Start with simple quota accounting
A well-structured simple implementation beats an overgeneralized system that becomes brittle.

## 18.5 Build the job abstraction early
This is the cleanest seam for future queueing and premium prioritization.

## 18.6 Keep public static content separate from protected compute concerns
Do not let auth logic leak unnecessarily into blog/docs delivery.

---

## 19. Risks and Mitigations

## Risk 1: Overengineering too early
**Mitigation:** start with free-plan auth, hard limits, and basic metering only.

## Risk 2: Anonymous compute abuse
**Mitigation:** require auth for meaningful jobs and enforce server-side quotas.

## Risk 3: Storage growth without control
**Mitigation:** retention policies and cleanup jobs from early phase.

## Risk 4: Payment added later causes schema rewrite
**Mitigation:** introduce plan and entitlement model now.

## Risk 5: Bad UX from abrupt limits
**Mitigation:** show usage and limit messages clearly in UI.

## Risk 6: Inline execution becomes bottleneck
**Mitigation:** define persistent job model so queueing can be added later.

---

## 20. Suggested ADRs

The implementation team should create ADRs for at least the following:

1. **ADR: Authentication provider selection**
2. **ADR: Protected API authentication model**
3. **ADR: Plan and quota evaluation architecture**
4. **ADR: Job abstraction and execution lifecycle**
5. **ADR: Upload/artifact storage and retention policy**
6. **ADR: Usage metering model**
7. **ADR: Billing integration boundary (future)**

---

## 21. Suggested Backlog Epics

## Epic 1 — Access model and route segmentation
Define which routes/features are public vs protected vs premium.

## Epic 2 — User identity integration
Add authentication and stable internal user mapping.

## Epic 3 — Resource ownership
Bind uploads, jobs, artifacts, and projects to users.

## Epic 4 — Plan model
Add plans, user-plan assignment, and plan-configurable limits.

## Epic 5 — Quota enforcement
Implement server-side checks for uploads, jobs, concurrency, and retention.

## Epic 6 — Usage metering
Emit durable usage records and provide user-facing summaries.

## Epic 7 — Job lifecycle
Introduce persistent jobs with status and timestamps.

## Epic 8 — Retention and cleanup
Add expiration metadata and background cleanup.

## Epic 9 — Dashboard UX
Show plan, limits, usage, job history, and over-limit states.

## Epic 10 — Premium readiness
Add pro-tier feature switches and manual entitlement changes.

---

## 22. Acceptance Criteria

The implementation is acceptable when all of the following are true:

1. Public blog/docs content is accessible without login.
2. Protected compute functionality requires authentication.
3. Protected uploads, jobs, and artifacts are owned by a specific user.
4. The backend evaluates plan and quota rules server-side.
5. Quota exhaustion returns clear structured errors.
6. Usage for protected compute is durably recorded.
7. A job record exists for expensive compute actions.
8. Artifact retention can expire and be cleaned up.
9. A free user and a pro user can be represented distinctly in the data model.
10. The system can add real billing later without replacing the core access model.

---

## 23. Open Questions for Product/Architecture

These questions should be answered during implementation planning:

1. Which features should remain fully public forever?
2. Should any anonymous compute be allowed at all?
3. What are the initial free-plan limits?
4. Which algorithms/features are clearly premium candidates?
5. What retention duration is acceptable for free users?
6. Which auth provider best fits the current stack and deployment?
7. Will the initial metadata store be relational DB only, and where will object storage live?
8. At what point should execution move from inline to queued?
9. Will manual admin plan assignment be needed before billing exists?
10. Should API access be delayed until after consumer UI plans stabilize?

---

## 24. Recommended Initial Decisions

To keep momentum, the implementation team may assume the following unless changed by the product owner:

- Blog/docs remain public.
- Compute-heavy image processing requires authentication.
- Free users exist before paid users.
- Plan and quota logic is server-side.
- Job model is introduced immediately.
- Uploads and artifacts expire unless explicitly retained by plan.
- Limits are configurable, not hardcoded.
- Premium billing integration is deferred, but premium plan support exists in the domain model.

---

## 25. Final Summary

Vitavision should not build full commercial SaaS billing right now. It should, however, become **identity-aware, quota-aware, and cost-aware now**.

The right near-term architecture is:

- public content stays open,
- protected compute requires login,
- user resources are owned and metered,
- quotas are enforced server-side,
- jobs become first-class objects,
- storage gets retention rules,
- and plans exist before payments do.

This keeps the product open enough to grow, while preventing popularity from turning into an uncontrolled infrastructure bill.

---