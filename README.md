# EduConnect CRM MVP

EduConnect CRM is a Next.js 14 + Prisma internal CRM for education consultancies.

It includes:

- Public marketing website (`/`, `/about`, `/services`, `/contact`, legal pages)
- Internal CRM app under `/app`
- Direct login with `userId + password`
- Role-based access for `SUPER_ADMIN`, `CONSULTANT`, `STAFF`, and `AGENT`
- Admissions, accounting ledgers, expenses, reports, agent commission rules
- Poster module with branding + WhatsApp share flow
- Optional AI tools behind feature flag (`/app/ai`)

## Product rules implemented

- Internal CRM only (not a marketplace)
- No public signup for CRM users
- University users do not log into the platform
- Agent is view-only for admissions edits/creation
- Staff users are permission-based
- Core accounting: university payable, agent commission, expenses, net profit

## Tech stack

- Next.js 14 App Router
- Prisma + PostgreSQL
- Tailwind CSS + shadcn-style component set
- React Hook Form + Zod
- TanStack Table

## Prerequisites

- Node.js 18+
- npm 9+

## Setup

Run a local PostgreSQL instance (example Docker command):

```bash
docker run --name educonnect-postgres -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=educonnect -p 5432:5432 -d postgres:16
```

Then run:

```bash
npm install
cp .env.example .env
npm run db:generate
npm run db:push
npm run db:seed
npm run dev
```

Open: `http://localhost:3000`

## Local development credentials

From `.env` seed values:

- Super Admin: `admin / change-me`
- Consultant: `consultant / change-me`
- Staff (ops): `staff.ops / change-me`
- Staff (accounts): `staff.accounts / change-me`
- Agent: `agent.a / change-me`
- Demo dataset toggle: `SEED_DEMO_DATA=true` (default)

Change passwords before any real deployment.

## Database workflows

```bash
# Generate Prisma client
npm run db:generate

# Push schema to local database
npm run db:push

# Create and apply migration (if you want migration files)
npm run db:migrate

# Seed users and realistic demo records
npm run db:seed

# Prisma Studio
npm run db:studio
```

## Quality scripts

```bash
npm run typecheck
npm run lint
npm run build
npm run test
npm run format
```

## CI

GitHub Actions workflow runs:

- `npm ci`
- `npm run typecheck`
- `npm run lint`
- `npm run build`

## Environment variables

Copy from `.env.example`.

Important keys:

- `DATABASE_URL`
- `SESSION_COOKIE_NAME`
- `SESSION_TTL_DAYS`
- `NEXT_PUBLIC_SITE_URL`
- `BLOB_READ_WRITE_TOKEN` (required for admission/ledger proof uploads)
- `SECURITY_HASH_SALT`
- `AI_FEATURES_ENABLED` / `NEXT_PUBLIC_AI_FEATURES_ENABLED`
- `OPENAI_API_KEY` (optional, only if AI is enabled)
- `OPENAI_MODEL` (optional)
- Seed credentials (`SEED_*`)

## Key routes

- Marketing: `/`, `/about`, `/services`, `/contact`
- Legal: `/privacy-policy`, `/terms`, `/refund-policy`, `/cookies-policy`, `/security`
- Login: `/login`
- CRM: `/app`
- Posters: `/app/posters`
- AI tools: `/app/ai` (feature-flagged)
- Audit logs (Super Admin): `/app/admin/audit`

## Notes

- Contact form saves leads in `Lead` table with honeypot + basic rate limiting.
- RBAC is enforced in middleware, pages, and server actions.
- Agent commission rules support `PERCENT`, `FLAT`, and `ONE_TIME` with active/inactive status.
- `AuditLog` captures sensitive auth/admission/payment/AI events.

## Production readiness

- Runtime env validation is enforced at startup (`src/lib/env.ts`).
- Security headers are configured in `next.config.mjs`.
- See `SECURITY.md` for operational security notes.
- See `DEPLOYMENT.md` for Vercel + Neon + Blob deployment steps and smoke-test checklist.
