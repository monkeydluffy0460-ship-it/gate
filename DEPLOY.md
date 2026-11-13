# Deployment guide

This guide deploys the Vite app from this repository to Vercel and connects it to Supabase. The frontend uses only Supabase's anon/publishable key; never put the Supabase service-role key or Groq key in `web/`, Vercel client-side environment variables, or any `VITE_` variable.

## 1. Create and configure Supabase

1. Create a Supabase project and save its project URL and anon/publishable key. These will be used as `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
2. In the Supabase Dashboard, open **SQL Editor** and run `supabase/schema.sql` first, then run `supabase/policies.sql`.
3. In **Storage**, create a bucket named `question-images`. Set it to **Public** so the image URLs used by questions can be displayed by the web app. Uploads should be performed by the trusted pipeline using the service key, not by the browser.
4. Configure email authentication under **Authentication → Providers → Email**. Set the site URL and allowed redirect URLs for your eventual Vercel production URL (and any preview URLs you use).
5. Install and log in to the Supabase CLI if needed, then from the repository root link the local project and add Edge Function secrets:

   ```bash
   supabase login
   supabase link --project-ref <project-ref>
   supabase secrets set GROQ_API_KEY=<your-groq-key> GROQ_MODEL=<model-from-your-pipeline-config>
   supabase functions deploy explain-question
   ```

   Supabase provides `SUPABASE_URL` and `SUPABASE_ANON_KEY` to Edge Functions. Do not set or expose the service-role key for this function. `supabase/config.toml` keeps JWT verification enabled; the function also validates the caller's user token.
6. In the Supabase Auth URL configuration, set **Site URL** to the deployed app URL and add it to **Redirect URLs**. This ensures email sign-in links return to the app.

## 2. Configure and import the repository in Vercel

1. Push the repository to GitHub and sign in to [Vercel](https://vercel.com/).
2. Choose **Add New → Project**, import `monkeydluffy0460-ship-it/gate` (or the repository fork you deploy).
3. Keep the project **Root Directory** at the repository root. The root `vercel.json` runs `npm install --prefix web`, builds with `npm run build --prefix web`, and publishes `web/dist`.
4. In the Vercel project settings, add these environment variables for the appropriate deployment environments (Production, Preview, and Development as desired):

   ```text
   VITE_SUPABASE_URL=https://<project-ref>.supabase.co
   VITE_SUPABASE_ANON_KEY=<supabase-anon-or-publishable-key>
   ```

   These are browser-visible configuration values; Supabase Row Level Security must protect data. Never add `SUPABASE_SERVICE_KEY`, `GROQ_API_KEY`, or any other secret with a `VITE_` prefix.
5. Deploy. The SPA rewrite in `vercel.json` sends app routes to `index.html`, so refreshing routes such as `/setup` or `/result` works.
6. Copy the production domain from Vercel and update Supabase Auth's Site URL and Redirect URLs to match it. Redeploy if you change Vercel environment variables; Vite embeds them at build time.

## 3. Install the PWA on a phone

The web app is served over HTTPS by Vercel and includes a PWA manifest and SVG app icons.

- **Android (Chrome):** open the deployed URL, tap the browser menu, then choose **Install app** or **Add to Home screen** and confirm.
- **iPhone/iPad (Safari):** open the deployed URL in Safari, tap **Share**, choose **Add to Home Screen**, edit the name if desired, then tap **Add**. iOS does not show the same install prompt as Chrome; use Safari's Share menu.

Launch the new home-screen icon to use the app in its standalone display mode. Some browser capabilities, including fullscreen during tests, are limited on iPhone Safari.

## 4. Local environment and build

For local development, create `web/.env.local` from `web/.env.example`, fill in the two Vite variables, then run:

```bash
cd web
npm install
npm run dev
```

To verify a production build locally, run `npm run build` in `web/`. Only the Supabase anon/publishable key belongs in the web environment. Keep pipeline credentials in `pipeline/.env` and Supabase Edge Function secrets in Supabase secrets.
