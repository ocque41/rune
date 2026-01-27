# Research: Secure Approval Links

## Goal
Enable offline approval of autonomous jobs via email links without compromising security or user identity.

## Security Requirements

### 1. Token Generation & Storage
- **Generation**: Use `crypto.randomBytes(32)` to generate a high-entropy string (hex or base64url).
- **Storage**: Do NOT store the raw token in the database. Store `SHA-256(token)`.
- **Reason**: If the database is compromised, attackers cannot generate valid approval links.
- **Verification**: When a user clicks a link with `?token=XYZ`, the server computes `SHA-256(XYZ)` and queries the DB.

### 2. Lifecycle
- **Single Use**: Tokens must be invalidated immediately after use.
  - Implementation: `used_at` timestamp column.
- **Expiry**: Tokens must expire after a short duration (e.g., 7 days).
  - Implementation: `expires_at` column checks.

### 3. URL Safety & Privacy
- **Host Header**: Never trust the `Host` header to generate links. Use a configured `NEXT_PUBLIC_APP_URL` environment variable.
- **Referrer Policy**: The approval page must set `Referrer-Policy: no-referrer` to prevent the token from leaking to third-party scripts or analytics via the Referer header.
  - Implementation: `export const metadata = { referrer: 'no-referrer' }` in Next.js Page.
- **Crawlers**: Minimize side effects on GET. The approval page should only *display* the approval prompt. The actual approval must be a POST request (triggered by user click), guarded by the token.

### 4. Rate Limiting
- To prevent brute-force attacks on tokens (even with 32 bytes entropy), rate limit the verification endpoint by IP.

## Proposed Implementation Plan

### Schema
```sql
CREATE TABLE rune_approval_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID NOT NULL REFERENCES rune_agent_jobs(id),
    token_hash TEXT NOT NULL, -- SHA256 of the token sent in email
    action TEXT NOT NULL CHECK (action IN ('approve', 'reject')),
    expires_at TIMESTAMPTZ NOT NULL,
    used_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_approval_token_hash ON rune_approval_tokens(token_hash);
```

### Flow
1. **Job Paused**: Agent creates job with status `waiting_approval`.
2. **Email Trigger**: System generates random token `T`, hashes it to `H`.
3. **Persist**: Insert `(H, job_id, expires_at)` to DB.
4. **Send**: Email user link `https://app.rune.io/autonomy/approve?token=T`.
5. **User Click**: 
   - GET `/approve?token=T`.
   - Server hashes `T` -> `H'`, looks up DB.
   - If found, unused, and valid: Render "Approve/Reject" UI.
6. **User Action**:
   - POST `/api/approve` with `{ token: T, decision: 'APPROVE' }`.
   - Server re-validates, marks `used_at = now()`, updates Job. 
