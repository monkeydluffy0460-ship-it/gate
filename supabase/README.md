# Supabase database

This directory contains SQL for the GATE trainer database and its row-level security rules.

## Apply the database

Create or select a Supabase project, then apply `schema.sql` followed by `policies.sql` using the Supabase SQL Editor. Alternatively, place these files in a Supabase CLI project's migrations directory and apply them with the Supabase CLI.

The web client must use only the Supabase anon key; keep the service-role key in the trusted pipeline environment. RLS is enabled by `policies.sql`.
