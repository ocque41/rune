# Rune

Rune is a workflow command deck for building, simulating, saving, and running node-based automations.

Production app: https://rune.cumulush.com

## License

Rune is open source under the MIT License.

Copyright (c) 2026 Cumulus - cumulush.com - hi@cumulush.com.

## Local Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Copy the example environment file:

   ```bash
   cp .env.example .env.local
   ```

3. Fill in Supabase settings in `.env.local`.

4. Set `RUNE_SECRETS_ENCRYPTION_KEY` to a strong random value before using Supabase-backed secrets. Production fails closed without this value.

5. Run the app:

   ```bash
   npm run dev
   ```

## Bring Your Own Key

Hosted Rune is BYOK. The app does not use shared `GOOGLE_API_KEY`, `OPENAI_API_KEY`, or `ANTHROPIC_API_KEY` environment variables for user model calls.

Each user stores provider keys in Rune Secrets. The UI lists secret names only. Create or replace a key value from the Secrets drawer, then select the secret name in agent or AI-node settings. Secret values are accepted by the server, encrypted, and never returned by the API.

Recommended secret names:

- `GOOGLE_API_KEY`
- `OPENAI_API_KEY`
- `ANTHROPIC_API_KEY`

Local development can use `SECRETS_PROVIDER=env` with `WORKFLOW_SECRET_*` variables, but hosted production should use `SECRETS_PROVIDER=supabase`.

## Security Gate

Before publishing or opening a pull request, run:

```bash
npm run security:secrets
npm run lint
npm test -- --run
npm run build
```

The secret scan blocks high-confidence raw keys and generated artifacts that should not be published.
