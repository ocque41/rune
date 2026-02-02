# Deployment Checklist (Vercel)

## Pre-deploy
- [ ] Pull latest changes: `git pull --rebase`
- [ ] Install deps if needed: `pnpm install`
- [ ] Run tests (if applicable): `pnpm test`
- [ ] Run lint/typecheck (if applicable): `pnpm lint` / `pnpm typecheck`
- [ ] Build locally (if needed): `pnpm build`
- [ ] Review changes: `git status` + `git diff`

## Deploy
- [ ] Commit changes with clear message
- [ ] Push to origin: `git push origin <branch>`
- [ ] Confirm Vercel auto-deploy triggered for branch

## Post-deploy
- [ ] Monitor Vercel build logs for errors
- [ ] Verify production/preview URL
- [ ] Smoke test key flows
- [ ] If failure: note error, fix, and redeploy
