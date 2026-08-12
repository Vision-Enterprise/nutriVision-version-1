# NutriVision

**Nutrition Commodity Inventory System**
Municipal Nutrition Action Office (MNAO), Manolo Fortich, Bukidnon

---

## Tech Stack

| Layer          | Technology                    |
|----------------|-------------------------------|
| Frontend       | HTML, CSS, Vanilla JavaScript |
| Build Tool     | Vite                          |
| Backend        | Supabase                      |
| Database       | Supabase PostgreSQL            |
| Authentication | Supabase Auth                 |

---

## Getting Started

### Prerequisites

- Node.js 18 or higher
- npm 9 or higher
- Git

### 1. Clone the repository

```bash
git clone https://github.com/YOUR-ORG/nutrivision.git
cd nutrivision
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment variables

Copy `.env.example` to `.env.local`:

```bash
cp .env.example .env.local
```

Edit `.env.local` with your Supabase project credentials:

```
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

Get these from: **Supabase Dashboard → Settings → API**

### 4. Start the development server

```bash
npm run dev
```

Open `http://localhost:5173`

---

## Project Structure

```
nutrivision/
├── index.html
├── vite.config.js
├── .env.example          ← Committed. Shows required variables.
├── .env.local            ← NOT committed. Contains real credentials.
│
└── src/
    ├── main.js           ← Application entry point
    │
    ├── core/             ← App-wide infrastructure
    │   ├── supabase.js   ← Supabase client singleton
    │   ├── router.js     ← Hash router (Phase 3)
    │   ├── auth.js       ← Auth state management (Phase 2)
    │   └── permissions.js← Role-based access control (Phase 2)
    │
    ├── features/         ← One folder per feature
    │   ├── auth/         ← Login, logout (Phase 2)
    │   ├── dashboard/    ← Summary cards, recent activity (Phase 4)
    │   ├── commodities/  ← Commodity + batch management (Phase 5)
    │   ├── users/        ← Admin user management (Phase 7)
    │   ├── audit-logs/   ← Activity history (Phase 8)
    │   └── account/      ← Account settings (Phase 9)
    │
    ├── shared/           ← Reusable code used by multiple features
    │   ├── components/   ← Shared UI components
    │   ├── utils/        ← Utility functions
    │   ├── validators/   ← Input validation
    │   └── constants/    ← App-wide constants
    │       └── app.constants.js
    │
    └── styles/           ← CSS design system
        ├── variables.css ← Design tokens (colors, spacing, etc.)
        ├── global.css    ← Reset and base styles
        ├── layout.css    ← App shell layout (sidebar, header, mobile nav)
        └── components.css← Reusable component styles
```

---

## Development Workflow

### Branching Strategy

```
main                    ← Stable releases only
 └── chore/...          ← Project setup and configuration
 └── feature/...        ← New features
 └── fix/...            ← Bug fixes
 └── refactor/...       ← Code improvements
 └── docs/...           ← Documentation
 └── perf/...           ← Performance improvements
 └── security/...       ← Security reviews
```

### Commit Convention

Follows [Conventional Commits](https://www.conventionalcommits.org/):

```
feat(auth): implement Supabase email login
fix(expiration): correct days-remaining calculation
docs(readme): update setup instructions
refactor(commodities): extract database queries to service module
perf(dashboard): replace N+1 queries with aggregate query
security(rls): add policy for batches table
```

---

## Development Phases

| Phase | Branch | Description |
|-------|--------|-------------|
| 0 | `chore/project-foundation` | Project setup, CSS design system |
| 1 | `feature/database-foundation` | Supabase schema, RLS policies |
| 2 | `feature/authentication` | Login, logout, session handling |
| 3 | `feature/application-shell` | Sidebar, header, routing |
| 4 | `feature/dashboard` | Summary cards, recent activity |
| 5 | `feature/commodity-management` | Commodity + batch registration |
| 6 | `feature/expiration-status` | Expiration monitoring |
| 7 | `feature/user-management` | Admin user management |
| 8 | `feature/audit-logs` | Activity history |
| 9 | `feature/account-settings` | Profile and password management |
| 10 | `test/core-system` | System testing |
| 11 | `perf/core-system` | Performance review |
| 12 | `security/core-system` | Security review |

---

## User Roles

| Role | Access |
|------|--------|
| Administrator | Full system access including user management and audit logs |
| Nutrition Personnel | Dashboard, commodities, account settings |

Authorization is enforced through Supabase Row Level Security policies —
not solely through frontend visibility checks.

---

## License

University Capstone Project
Municipal Nutrition Action Office, Manolo Fortich, Bukidnon
