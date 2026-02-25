# Deployment Guide (Vercel + Neon + Blob)

## Recommended Stack

- App: Vercel (Next.js 14 App Router)
- Database: Neon Postgres
- File storage: Vercel Blob
- Domain:
  - `example.com` -> marketing site
  - `app.example.com` -> CRM

## 1. Provision Services

1. Create a Neon database and copy the connection string.
2. Create/enable Vercel Blob and generate `BLOB_READ_WRITE_TOKEN`.
3. Create project on Vercel and connect this repository.

## 2. Configure Environment Variables

Set these in Vercel for Production (and Preview as needed):

- `DATABASE_URL`
- `SESSION_COOKIE_NAME` (e.g. `educonnect_session`)
- `SESSION_TTL_DAYS` (e.g. `14`)
- `NEXT_PUBLIC_SITE_URL` (production URL, https)
- `SECURITY_HASH_SALT` (strong random secret)
- `BLOB_READ_WRITE_TOKEN`
- `AI_FEATURES_ENABLED` (`true`/`false`)
- `NEXT_PUBLIC_AI_FEATURES_ENABLED` (`true`/`false`)
- `OPENAI_API_KEY` (optional, only if AI is enabled)
- `OPENAI_MODEL` (optional, default `gpt-4o-mini`)

## 3. Database Setup

1. Run schema push/migration against production DB.
2. Run seed once with secure credentials:
   - Set `SEED_SUPERADMIN_USERID`
   - Set `SEED_SUPERADMIN_PASSWORD` (strong password)
   - Set `SEED_SUPERADMIN_NAME`
3. Remove seed secrets after initial provisioning.

## 4. Deploy

1. Trigger production deploy from Vercel.
2. Confirm build succeeds.
3. Verify routes:
   - marketing pages
   - `/login`
   - `/app/*`
   - upload and PDF endpoints

## 5. Smoke Test Checklist

- [ ] Login succeeds and rejects invalid credentials.
- [ ] Admissions wizard creates records with uploads and ledgers.
- [ ] Poster module uploads and generates branded PNG.
- [ ] Poster share fallback works (WhatsApp + download).
- [ ] University and agent payment actions update ledgers.
- [ ] CSV/PDF exports are downloadable.
- [ ] Audit logs appear under `/app/admin/audit`.
- [ ] Contact form accepts valid submissions and rate limits bursts.
- [ ] Security headers present on responses.
