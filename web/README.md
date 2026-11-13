# GATE Mock Test Trainer

This Vite + React + Tailwind app is the mobile-first frontend for the GATE training workflow.

## Local development

```bash
cd web
npm install
npm run dev
```

## Production build

```bash
npm run build
```

## Environment variables

Create a `.env.local` file with at least:

```bash
VITE_SUPABASE_URL=https://<project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon-key>
```

The app falls back to a local demo state when Supabase config is missing.
