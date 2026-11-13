-- Core question bank. Public question data is readable only to authenticated users via RLS.
create table if not exists public.questions (
  id uuid primary key default gen_random_uuid(),
  year int,
  paper_set text,
  section text,
  topic text,
  subtopic text,
  qtype text check (qtype in ('MCQ', 'MSQ', 'NAT')),
  marks int,
  question_text text,
  options jsonb,
  answer text,
  nat_min numeric,
  nat_max numeric,
  explanation text,
  image_url text,
  answer_source text check (answer_source in ('official', 'ai_agreed', 'ai_unsure')),
  is_generated boolean default false,
  text_hash text unique
);

create table if not exists public.attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  started_at timestamptz not null default now(),
  ends_at timestamptz not null,
  submitted_at timestamptz,
  config jsonb,
  score numeric,
  violations int default 0
);

create table if not exists public.attempt_answers (
  attempt_id uuid not null references public.attempts (id) on delete cascade,
  question_id uuid not null references public.questions (id) on delete cascade,
  response text,
  status text,
  time_spent int,
  primary key (attempt_id, question_id)
);

create table if not exists public.notes (
  id uuid primary key default gen_random_uuid(),
  topic text,
  title text,
  content text,
  is_ai boolean default true
);

create table if not exists public.bookmarks (
  user_id uuid not null references auth.users (id) on delete cascade,
  question_id uuid not null references public.questions (id) on delete cascade,
  note text,
  primary key (user_id, question_id)
);
