# Legislative Document Monitor

**Executive Summary — Project Scope & Architecture**
*March 26, 2026*

---

## Project Overview

The Legislative Document Monitor is a web application designed to track, analyze, and respond to legislative activity across all 50 U.S. state legislatures and the U.S. Congress. The system provides real-time monitoring of bills and resolutions, automatic detection of document changes through diff comparison, and a suite of civic engagement tools for annotation, markup, and testimony preparation.

> **Mission:** Empower users to stay informed on legislative changes, organize their analysis, and produce actionable feedback for legislators — all through deterministic, non-AI-dependent processing.

---

## Core Capabilities

- **Bill Monitoring & Diffing** — Ingest bill text from official APIs, store versioned snapshots, and compute line-by-line diffs to instantly surface what changed between versions.
- **Watchlists & Position Tracking** — Flag specific bills with a position stance (Support, Oppose, Watch, Neutral) and receive alerts when they're updated.
- **Keyword Monitoring** — Define terms to watch for across all ingested legislation. Automatic matching with contextual snippets.
- **Inline Annotations & Comment Chains** — Select specific language in bill text and attach threaded discussion comments for analysis and review.
- **Legislative Markup & Redlining** — Highlight, strikethrough, and suggest alternative language directly on bill text. Export as formatted documents for legislator feedback.
- **Testimony Drafting** — Structured workspace for composing written testimony linked to specific bill sections.
- **Legislative Calendar** — Track hearing dates, committee schedules, and floor votes.
- **Legislator Directory** — Searchable sponsor database with contact information and sponsored legislation.
- **Email Digests** — Configurable daily or weekly email summaries of changes, matches, and upcoming events.
- **Cross-Bill Comparison** — Side-by-side comparison of different bills from any jurisdictions.
- **Shareable Views** — Generate read-only links to annotated bill views for coordination with others.

---

## Data Sources

| Source | Coverage | Cost | Format |
|--------|----------|------|--------|
| **LegiScan API** (Primary) | All 50 states + U.S. Congress | Free tier: 30,000 queries/month | JSON |
| **Congress.gov API** (Secondary) | U.S. Congress (federal only) | Free with API key | JSON / XML |

API keys are managed through an in-app Settings page and stored in the local data directory. No AI or machine learning services are used — all processing (diffing, keyword matching, alerting) is handled by deterministic algorithms.

---

## Technology Stack

### Original Spec (Executive Summary)

| Layer | Technology |
|-------|------------|
| Frontend | Vite + React |
| Backend | Express.js (Node.js) |
| Database | PostgreSQL |
| Migrations | Knex.js |
| Scheduling | node-cron |
| Diffing | diff (npm) |
| Email | Nodemailer (SMTP) |
| PDF Export | PDFKit / Puppeteer |

### Current Implementation

| Layer | Technology | Notes |
|-------|------------|-------|
| Framework | **Next.js 16** (App Router) | Unified frontend + API routes |
| Storage | **File-based** (`.data/` JSON) | Pragmatic for solo dev; PostgreSQL migration possible later |
| Diffing | **diff** (npm) | As spec'd |
| PDF Export | **Puppeteer** | As spec'd |
| Rich Text | **TipTap** (WYSIWYG) | For testimony workspace |
| Styling | **Vanilla CSS** | Dark theme, WCAG 2.1 AA compliant |

> **Note:** The shift from Vite+Express+PostgreSQL to Next.js+file-storage was a pragmatic decision for development speed. The data layer (`lib/store.js`) is abstracted enough that a database migration would be localized to the `lib/` modules.

---

## Development Roadmap

### Phase 1 — Foundation (MVP) ✅

| Deliverable | Status |
|-------------|--------|
| Bill ingestion pipeline (LegiScan) | ✅ Done |
| Diff engine (line-by-line text comparison) | ✅ Done |
| Watchlists with position tracking | ✅ Done |
| Dashboard with stats + ingestion controls | ✅ Done |
| Settings page (API keys, jurisdictions, data management) | ✅ Done |
| Multi-jurisdiction support | ✅ Done |
| Bill Explorer with search & filtering | ✅ Done |
| Auto-Ingest Scheduler (setInterval, start/stop via Settings) | ✅ Done |

---

### Phase 2 — Engagement ✅

| Deliverable | Status |
|-------------|--------|
| Inline annotations on bill text | ✅ Done |
| Threaded comment chains on annotations | ✅ Done |
| Tags system (custom colors, per-bill) | ✅ Done |
| Collections (folders for organizing bills) | ✅ Done |
| Keyword monitoring with auto-matching | ✅ Done |
| Alerts system (changes, keywords, watchlist) | ✅ Done |
| WCAG 2.1 AA accessibility compliance | ✅ Done |

---

### Phase 3 — Advocacy ✅

| Deliverable | Status |
|-------------|--------|
| Markup/redlining tools (highlight, strikethrough, suggest) | ✅ Done |
| PDF export (Puppeteer, branded template) | ✅ Done |
| Testimony workspace (TipTap WYSIWYG, section linking) | ✅ Done |
| Status pipeline (Kanban board by legislative stage) | ✅ Done |
| Congress.gov API integration (CRS summaries, amendments) | ✅ Done |

---

### Phase 4 — Awareness 

| Deliverable | Status | Description |
|-------------|--------|-------------|
| Legislative Calendar | ✅ Done | Hearing dates, committee schedules, floor votes — pulled from LegiScan calendar data |
| Email Digest Service | ⏳ Deferred | Deferred pending client communication requirements |
| Legislator Directory | ✅ Done | Searchable sponsor database with contact info, committee assignments, sponsored bills |
| Bill Relationship Mapping | ✅ Done | Companion bills, related legislation across chambers/jurisdictions |

---

### Phase 5 — Collaboration 

| Deliverable | Status | Description |
|-------------|--------|-------------|
| Cross-Bill Comparison | ✅ Done | Side-by-side diff of two different bills from any jurisdiction (`app/compare`) |
| Shareable Links | ⏳ Deferred | Read-only URLs for annotated bill views (public sharing) - pending email integration |
| Multi-User Support | ✅ Done | User accounts, role-based access, shared Prisma workspaces |
| Responsive Polish | ✅ Done | Mobile-first layout refinements, touch interactions |
| Advanced PDF Engine | ⬜ Todo | Enhanced server-side Puppeteer engine for heavily branded, deterministic advocacy print packets (replacing browser print flows) |

---

### Phase 6 — Regulatory Intelligence (Current)

| Deliverable | Status | Description |
|-------------|--------|-------------|
| UI Scaffolding | 🔄 In Progress | New dashboard feeds, Regulations tab, and data tables mapping NCUA/CFPB metadata. |
| Regulations.gov Adapter | ⬜ Todo | Backend connector pulling structured rulemakings directly from the federal API. |
| Stakeholder Feed Convergence | ⬜ Todo | Polymorphic Dashboard feed rendering state bills alongside regulatory open comment periods. |

---

## Architecture Summary

The system follows a unified Next.js App Router architecture. Server-side API routes (`app/api/`) handle data operations against file-based JSON storage in `.data/`. Client components communicate via `fetch()` to these API routes.

A built-in ingestion pipeline (`lib/ingest.js`) polls the LegiScan and Congress.gov APIs to ingest new bills, detect version changes, compute diffs, and trigger alerts. PDF export is handled server-side via Puppeteer.

```
├── app/                    # Next.js App Router pages + API routes
│   ├── api/                # REST endpoints (bills, markups, testimonies, export, etc.)
│   ├── bills/[id]/         # Bill detail + diff viewer
│   ├── testimony/          # TipTap testimony workspace
│   └── page.js             # Dashboard with status pipeline
├── components/             # Shared UI (Sidebar)
├── lib/                    # Server-side logic
│   ├── store.js            # File-based CRUD (bills, texts, diffs)
│   ├── legiscan.js         # LegiScan API client
│   ├── congress.js         # Congress.gov API client
│   ├── ingest.js           # Ingestion pipeline + enrichment
│   ├── scheduler.js        # Auto-ingest scheduler (setInterval)
│   ├── diff-engine.js      # Text diffing + PDF extraction
│   ├── markups.js          # Markup CRUD
│   ├── testimonies.js      # Testimony CRUD (with sectionRef)
│   ├── pdf-template.js     # Branded HTML for Puppeteer
│   ├── annotations.js      # Annotation + comment CRUD
│   └── settings.js         # Settings persistence
└── .data/                  # JSON file storage (gitignored)
```

## Key Design Principles

- **No AI Dependency** — All processing is deterministic. Diffing uses standard text comparison algorithms; keyword matching uses exact and pattern-based search; alerting follows rule-based triggers.
- **API-First Data** — Relies on structured API data from official sources (LegiScan, Congress.gov) rather than fragile web scraping.
- **Self-Hosted & Configurable** — API keys, polling intervals, and email settings are managed through the app's Settings page. The instance is fully self-contained.
- **Civic Engagement Focus** — Goes beyond passive monitoring with annotation, markup, testimony, and export tools designed for real legislative advocacy workflows.

---

*Legislative Document Monitor — v0.3.1 Phase 3 (gap fixes) — March 2026*
