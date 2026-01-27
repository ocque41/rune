# Research: Reliable Email Sending

## Goal
Send approval emails reliably without spamming users (no duplicates) and ensuring delivery.

## Provider: Resend
- **Why**: Existing integration, developer-friendly SDK, good deliverability.
- **Features**: React Email templates, Idempotency support.

## Idempotency Strategy
Resend allows passing an `Idempotency-Key` header. If a network error occurs but the email was queued, retrying with the same key prevents duplicate sends.

**Key Construction**:
```typescript
const idempotencyKey = `approval_${jobId}_${attemptCount}`;
```
Actually, since approval is a one-time event per job state:
```typescript
const idempotencyKey = `job_approval_${jobId}`;
```
This ensures that even if our worker retries the "Send Approval" step 5 times, only 1 email is sent.

## Implementation Architecture

### Option A: Next.js Server Action / Route
- **Pros**: Direct reuse of existing `resend` client setup.
- **Cons**: If Vercel functions time out, we might not know if it sent.
- **Mitigation**: Use Idempotency Key. If timeout -> Retry -> Resend detects dup -> Success.

### Option B: Supabase Edge Function
- **Pros**: Closer to DB trigger.
- **Cons**: Needs new `deno` setup and secret management in Vault.

## Decision for MVP
**Option A (Next.js)** with strict Idempotency Keys. It matches the current stack and the reliability concern is solved by the Idempotency Key + Worker Retry loop.

## Security
- **API Key**: `RESEND_API_KEY` (Server-side only).
- **Templates**: Ensure no user-generated content (like job description) allows HTML injection (React Email handles escaping by default).
