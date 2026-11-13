# GATE Mock Test Trainer

This Vite + React app is the mobile-first frontend for the GATE training workflow.

## Local development

```bash
cd web
npm install
cp .env.example .env.local
npm run dev
```

Fill in `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in `.env.local`. The browser app must use only the Supabase anon/publishable key and rely on RLS; never put the service-role key or Groq secret in this directory or in a `VITE_` variable.

## Production build

```bash
npm run build
```

Vercel deployment settings, Supabase setup, environment variables, and PWA phone installation are documented in the repository root's [DEPLOY.md](../DEPLOY.md).
