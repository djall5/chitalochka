-- One private workspace per teacher account. Run in Supabase SQL Editor.
create table if not exists public.teacher_workspaces (
  user_id uuid primary key references auth.users (id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.teacher_workspaces enable row level security;

drop policy if exists "Teachers can read their own workspace" on public.teacher_workspaces;
create policy "Teachers can read their own workspace"
  on public.teacher_workspaces for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Teachers can create their own workspace" on public.teacher_workspaces;
create policy "Teachers can create their own workspace"
  on public.teacher_workspaces for insert to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "Teachers can update their own workspace" on public.teacher_workspaces;
create policy "Teachers can update their own workspace"
  on public.teacher_workspaces for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

grant select, insert, update on public.teacher_workspaces to authenticated;
