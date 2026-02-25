# Security Notes

## Scope

This project is an internal CRM with public marketing pages. Security controls are focused on:

- strong session handling
- role-based access controls
- input validation
- auditability of sensitive operations
- brute-force and spam protection

## Implemented Controls

- `httpOnly`, `sameSite=lax`, `secure` (production) cookies for sessions.
- Route-level RBAC in middleware and server-side permission checks in actions.
- Zod validation for auth, admissions, ledgers, expenses, posters, and AI tools.
- Security headers via `next.config.mjs`:
  - `Content-Security-Policy` (baseline)
  - `X-Frame-Options: DENY`
  - `X-Content-Type-Options: nosniff`
  - `Referrer-Policy: strict-origin-when-cross-origin`
  - `Permissions-Policy` baseline
- Rate limiting:
  - login server action + middleware-level POST guard
  - contact form server action + middleware-level POST guard
- Audit logs for:
  - login success/failure/rate-limit
  - admission create/update/delete
  - payment and payout creation
  - AI tool usage

## Secret Management

- No secrets should be committed to git.
- Use `.env` and platform-managed secrets (Vercel Environment Variables).
- Rotate keys immediately if exposure is suspected:
  - `SECURITY_HASH_SALT`
  - `BLOB_READ_WRITE_TOKEN`
  - `OPENAI_API_KEY` (if AI enabled)
  - database credentials (`DATABASE_URL`)

## Operational Checklist

- Keep `SECURITY_HASH_SALT` long and random (>= 24 chars).
- Enforce HTTPS in production.
- Review audit logs (`/app/admin/audit`) weekly.
- Monitor repeated login failures and contact-form bursts.
- Re-run `npm run lint && npm run typecheck && npm test && npm run build` before deployment.

## Incident Response (Basic)

1. Disable affected credentials/tokens immediately.
2. Rotate secrets and redeploy.
3. Inspect audit logs and identify blast radius.
4. Patch root cause and add a regression test when possible.
