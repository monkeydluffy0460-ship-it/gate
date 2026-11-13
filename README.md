# GATE 2027 Mock Test Trainer

This repository is organized as a monorepo. The question-extraction pipeline lives in `pipeline/`, Supabase database assets live in `supabase/`, and the mobile-first Vite app lives in `web/`.

## Project areas

- `pipeline/` — Python tools for extracting and preparing GATE questions.
- `web/` — Vite/React frontend and PWA.
- `supabase/` — database schema, row-level security policies, and Edge Functions.

See each directory's README for setup and run instructions. See [DEPLOY.md](DEPLOY.md) for Supabase, Vercel, and phone installation steps.
