# AAkar — Agent Context Map

> Read this first before touching any file. It is the single-page orientation guide for AI agents working on this repo.

---

## What is AAkar?

**AAkar** is an AI-powered booth-level civic intelligence platform for Delhi election management.
It gives role-locked officials (from State-level down to individual Booth Presidents) dashboards
that show only their geographic area — maps, campaign volunteers, complaints, volunteers, and AI summaries.

---

## Tech Stack

| Layer      | Technology                                      |
|------------|-------------------------------------------------|
| Frontend   | Next.js 16 (App Router) · JSX · Vanilla CSS     |
| Backend    | FastAPI (Python 3.11) · SQLModel · SQLite        |
| Graph DB   | Neo4j — voter + complaint knowledge graph        |
| AI/LLM     | Local Ollama (`qwen2.5:7b`) — NL → Cypher + summaries |
| Auth       | JWT (HS256) · 24-hour tokens · localStorage     |
| Maps       | Leaflet.js + GeoJSON boundaries                 |
| Messaging  | WhatsApp Cloud API webhook + SMS service        |

---

## Role Hierarchy (top → bottom)

```
ELECTION_ADMIN  →  full system control, creates all other users
STATE_ADMIN     →  sees all Delhi data
DISTRICT_ADMIN  →  locked to one district (e.g. "East")
CONSTITUENCY_MGR→  locked to one constituency (e.g. "Krishna Nagar")
MANDAL_MGR      →  locked to constituency (inherits from CONSTITUENCY_MGR)
BOOTH_PRESIDENT →  locked to one booth
VOLUNTEER       →  field worker app (tasks / check-in / surveys)
```

Each user has `state_id`, `district_id`, `constituency_id`, `mandal_id`, `booth_id` stored in the `users` table.
The frontend reads these from the JWT response and enforces geo-locking in every panel.

> ⚠️ DB may store roles in lowercase (`dm`, `cm`). Always `.toUpperCase()` before comparing to the constants above.

---

## Key File Paths

### Backend

```
backend/
├── app/
│   ├── main.py                            # FastAPI app + lifespan + seeding (818 lines — needs splitting)
│   ├── core/
│   │   ├── config.py                      # Settings (NEO4J_URI, JWT_SECRET, OLLAMA_URL …)
│   │   └── security.py                    # JWT creation + get_current_user dependency
│   ├── api/v1/endpoints/                  # One file per resource
│   │   ├── auth.py                        # /auth/login, /auth/register, /auth/me, /auth/logout
│   │   ├── admin.py                       # /admin/* – user management, hierarchy CRUD
│   │   ├── campaign.py                    # /campaign/volunteers, /campaign/coverage, /campaign/summary
│   │   ├── volunteers.py                  # /volunteers/* – field volunteer CRUD
│   │   ├── dashboard.py                   # /dashboard/stats – per-level KPIs
│   │   ├── complaints.py                  # /complaints/*
│   │   ├── drishti.py                     # /drishti/* – document intelligence
│   │   ├── broadcasts.py                  # /broadcasts/*
│   │   ├── tasks.py                       # /tasks/*
│   │   ├── files.py                       # /files/* – file tracker
│   │   ├── action_tracker.py              # /action-tracker/*
│   │   ├── upload.py                      # /upload/* – CSV/PDF ingest
│   │   ├── ask.py                         # /ask – NL → Neo4j Cypher via Ollama
│   │   ├── heatmap.py                     # /heatmap
│   │   └── audit.py                       # /audit
│   ├── domain/
│   │   ├── models/                        # SQLModel table definitions (one file per entity)
│   │   │   ├── user.py                    # User table
│   │   │   ├── campaign.py                # CampaignVolunteer, ConstituencyCoverage
│   │   │   ├── volunteer.py               # Volunteer, VolunteerTask, ConversationState
│   │   │   ├── hierarchy.py               # HierarchyNode (states/districts/constituencies/mandals/booths)
│   │   │   ├── project.py                 # Project, ProjectJustification
│   │   │   ├── task.py                    # Task
│   │   │   ├── file_tracker.py            # FileTracker, FileTimelineEntry
│   │   │   ├── district_metric.py         # DistrictMetric
│   │   │   ├── system_config.py           # SystemConfig (key-value store)
│   │   │   ├── audit_log.py               # AuditLog
│   │   │   ├── cm_instruction.py          # CmInstruction
│   │   │   └── ai_summary.py              # AiSummary
│   │   └── services/                      # Business logic (no HTTP concerns)
│   │       ├── ask_service.py             # NL → Cypher pipeline
│   │       ├── summary_service.py         # AI summary generation
│   │       ├── bosi_service.py            # BOSI score computation
│   │       ├── graph_analytics.py         # Neo4j graph algorithms
│   │       ├── pdf_converter.py           # OCR / PDF → structured data
│   │       ├── seed_graph.py              # Triggers Neo4j seed from CSV
│   │       └── …
│   └── infrastructure/
│       ├── db/
│       │   ├── sqlite_client.py           # SQLModel engine + get_session
│       │   └── neo4j_client.py            # Neo4j driver singleton
│       ├── ai/
│       │   └── ollama_client.py           # Ollama HTTP client
│       ├── sms_service.py
│       └── whatsapp_handler.py / whatsapp_service.py
│
├── data/
│   ├── app.db                             # SQLite DB (gitignored — run seed_all.py after clone)
│   └── uploads/                           # voters.csv, complaints.csv (gitignored)
│
└── scripts/
    ├── setup/                             # Seeding, resetting, and db initialization
    │   ├── seed_all.py
    │   ├── reset_db.py
    │   └── …
    ├── debug/                             # SQLite / Neo4j data diagnostics
    ├── fix/                               # GeoJSON / consistency fix scripts
    └── test/                              # Simulators and validation tests
```

### Frontend

```
frontend/src/
├── app/                                   # Next.js App Router pages
│   ├── page.tsx                           # Root → redirects based on role
│   ├── login/page.tsx                     # Login page
│   ├── dashboard/page.tsx                 # Main dashboard shell (reads role, renders right dashboard)
│   ├── election/page.tsx                  # ELECTION_ADMIN portal
│   └── portal/page.tsx                   # Volunteer portal
│
├── components/
│   ├── dashboards/                        # Role-specific dashboard containers (one per role)
│   │   ├── StateDashboard.jsx             # STATE_ADMIN
│   │   ├── DistrictDashboard.jsx          # DISTRICT_ADMIN
│   │   ├── ConstituencyDashboard.jsx      # CONSTITUENCY_MGR
│   │   ├── MandalDashboard.jsx            # MANDAL_MGR
│   │   ├── BoothDashboard.jsx             # BOOTH_PRESIDENT
│   │   ├── VolunteerDashboard.jsx         # VOLUNTEER
│   │   └── ElectionAdminDashboard.jsx     # ELECTION_ADMIN
│   │
│   ├── panels/                            # Feature panels (tab content)
│   │   ├── MapPanel.jsx                   # Interactive Leaflet map (57 KB — candidate for split)
│   │   ├── ComplaintsPanel.jsx
│   │   ├── AskPanel.jsx                   # AI NL query panel
│   │   ├── AboutPanel.jsx
│   │   ├── OverviewPanel.jsx
│   │   ├── DrivesPanel.jsx
│   │   ├── GraphAnalyticsPanel.jsx
│   │   ├── SettingsPanel.jsx
│   │   └── UploadPanel.jsx
│   │
│   ├── shared/                            # Reusable UI across roles
│   │   ├── LoginPage.jsx
│   │   ├── Hub.jsx
│   │   ├── BroadcastPanel.jsx
│   │   ├── LodgeComplaintPanel.jsx
│   │   ├── ManageUsers.jsx
│   │   └── AICopilot.jsx
│   │
│   ├── CampaignPanel.jsx                  # Campaign management + volunteer map (1874 lines — LARGE)
│   ├── DrishtiPanel.jsx                   # Document intelligence (56 KB — LARGE)
│   ├── TaskManagementPanel.jsx
│   ├── FileTrackingPanel.jsx
│   ├── ActionTrackerPanel.jsx
│   ├── AiSummaryPanel.jsx
│   └── AuditPanel.jsx
│
├── constants/                             # ← Single source of truth for shared constants
│   └── constituencies.js                  # DELHI_DISTRICTS, CONSTITUENCIES_OLD/NEW, DISTRICT_CENTERS,
│                                          #   normDistrict(), normConstit(), getDistrictFromEmail()
│
├── config/
│   └── navigation.jsx                     # ROLE_NAV (sidebar items per role) + ROLE_TITLES
│
└── contexts/
    └── AuthContext.jsx                    # AuthProvider + useAuth() hook
```

---

## Databases

### SQLite (`backend/data/app.db`)
- Used for: auth (users), hierarchy (states/districts/constituencies/mandals/booths),
  campaign volunteers, tasks, file tracker, projects, audit logs, AI summaries, broadcasts
- ORM: SQLModel (SQLAlchemy under the hood)
- Session: `get_session` dependency injected into FastAPI routes

### Neo4j (`bolt://localhost:7687`)
- Used for: voter knowledge graph, complaint nodes, community detection (Louvain),
  PageRank centrality, risk scoring
- Only used by: `ask.py`, `graph_analytics.py`, `graph_builder.py`, `seed_graph.py`
- Client singleton: `neo4j_client.py`

---

## GeoJSON Files (frontend/public/)

| File | Contents |
|------|----------|
| `delhi_districts_abs.geojson` | District boundary polygons |
| `delhi_constituencies_abs.geojson` | Constituency boundary polygons (`AC_NAME` property) |
| `delhi_wards.geojson` | Ward boundary polygons |
| `ward_to_constituency.json` | Ward code → constituency name mapping |

GeoJSON `AC_NAME` values may include `(SC)` or `(ST)` suffixes — always normalise before comparing:
```js
const normConstit = (s) => (s || '').toLowerCase()
  .replace(/\s*\(sc\)/gi, '').replace(/\s*\(st\)/gi, '').replace(/[\s\-\.]/g, '');
```

---

## Auth Flow

1. `POST /api/v1/auth/login` → returns `{ access_token, user: { role, district_id, … } }`
2. Token stored in `localStorage` as both `token` and `praja_token` (legacy dual-key — will be cleaned up)
3. `AuthContext.jsx` validates token on mount via `GET /api/v1/auth/me`
4. Role passed into `dashboard/page.tsx` which renders the correct `<*Dashboard />` component

---

## Default Login Credentials (after `python scripts/setup/seed_all.py`)

| Email | Password | Role |
|-------|----------|------|
| `serveradmin@aakar.gov.in` | `123456` | ELECTION_ADMIN |
| `statedelhi@aakar.gov.in` | `123456` | STATE_ADMIN |
| `delhiadmin@aakar.gov.in` | `123456` | DISTRICT_ADMIN (East Delhi) |
| `cons1@aakar.gov.in` | `123456` | CONSTITUENCY_MGR (Krishna Nagar) |
| `defence@aakar.gov.in` | `123456` | MANDAL_MGR (Defence Colony) |

---

## Known Issues / Gotchas

1. **Role string casing** — DB may store `dm`, `cm` in lowercase. Always `.toUpperCase()` before comparing.
2. **CONSTITUENCIES map has 3 copies** — `main.py`, `campaign.py`, `CampaignPanel.jsx`.
   → Canonical JS copy: `frontend/src/constants/constituencies.js`
   → Canonical Python copy: `backend/app/api/v1/endpoints/campaign.py` (`CONSTITUENCIES_NEW`)
3. **`main.py` is too large (818 lines)** — seeding functions (`seed_campaign_volunteers`, etc.) are embedded here. Target: extract to `app/seeds/`.
4. **`CampaignPanel.jsx` is 1874 lines** — map init, volunteer CRUD, sidebar, coverage stats in one file.
5. **`components/unused/`** — 5 dead components. Do not import or reference them.
6. **`domain/whatsapp_service.py`** — misplaced in domain layer; belongs in `infrastructure/messaging/`.
7. **Volunteer scatter** — volunteers are seeded with random-within-polygon coordinates. If they appear clustered, the GeoJSON boundary polygon used for seeding may be very small or centroid-only.

---

## Campaign Map — Role Locking (geo-lock rules)

| Role | Map default view | Volunteer filter |
|------|-----------------|-----------------|
| STATE_ADMIN | All Delhi | All volunteers |
| DISTRICT_ADMIN | User's district only | `district = user.district_id` |
| CONSTITUENCY_MGR | User's constituency only | `district + constituency` |
| MANDAL_MGR | User's constituency (mandal zoom) | `district + constituency` |
| BOOTH_PRESIDENT | N/A — no CampaignPanel | N/A |

Locks implemented via `lockDistrict` / `lockConstituency` / `lockWard` state vars in `CampaignPanel.jsx`.

---

## Environment Variables (backend/.env)

```env
NEO4J_URI=bolt://localhost:7687
NEO4J_USERNAME=neo4j
NEO4J_PASSWORD=your_password
OLLAMA_URL=http://localhost:11434
OLLAMA_MODEL=qwen2.5:7b
JWT_SECRET_KEY=change-me-to-a-real-secret-key-32chars!
DATABASE_URL=sqlite:///./data/app.db
WHATSAPP_TOKEN=dummy_token
WHATSAPP_PHONE_NUMBER_ID=dummy_id
WHATSAPP_VERIFY_TOKEN=dummy_verify
```
