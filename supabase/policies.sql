-- Row-level security for all application tables.
alter table public.questions enable row level security;
alter table public.attempts enable row level security;
alter table public.attempt_answers enable row level security;
alter table public.notes enable row level security;
alter table public.bookmarks enable row level security;

-- Authenticated users can read the shared question bank and notes.
drop policy if exists "Authenticated users can read questions" on public.questions;
create policy "Authenticated users can read questions"
  on public.questions for select to authenticated
  using (true);

drop policy if exists "Authenticated users can read notes" on public.notes;
create policy "Authenticated users can read notes"
  on public.notes for select to authenticated
  using (true);

-- Users can only read or modify their own attempts.
drop policy if exists "Owners can manage attempts" on public.attempts;
create policy "Owners can manage attempts"
  on public.attempts for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- Attempt answers inherit ownership from their parent attempt.
drop policy if exists "Owners can manage attempt answers" on public.attempt_answers;
create policy "Owners can manage attempt answers"
  on public.attempt_answers for all to authenticated
  using (
    exists (
      select 1
      from public.attempts
      where attempts.id = attempt_answers.attempt_id
        and attempts.user_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1
      from public.attempts
      where attempts.id = attempt_answers.attempt_id
        and attempts.user_id = (select auth.uid())
    )
  );

-- Users can only read or modify bookmarks belonging to themselves.
drop policy if exists "Owners can manage bookmarks" on public.bookmarks;
create policy "Owners can manage bookmarks"
  on public.bookmarks for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
