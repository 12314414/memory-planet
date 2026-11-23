-- ============================================
-- 回忆星球 · 云端数据表（Supabase）
-- 在 Supabase 控制台 → SQL Editor 里整段执行，可重复执行
-- 目标项目：begrmhzzcqbiozdfmafl
-- ============================================

-- 1. 用户档案 -------------------------------------------------
create table if not exists public.hp_profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  nickname    text not null default '旅人',
  created_at  timestamptz not null default now()
);

-- 2. 星球 -----------------------------------------------------
create table if not exists public.hp_planets (
  id             uuid primary key default gen_random_uuid(),
  owner_id       uuid not null unique references auth.users(id) on delete cascade,
  name           text not null default '我的星球',
  theme          text not null default 'aurora',
  pet_profile    jsonb not null default '{}'::jsonb,
  visibility     text not null default 'PRIVATE' check (visibility in ('PRIVATE','INVITE','PUBLIC')),
  invite_code    text not null unique,
  stats_visits   int not null default 0,
  stats_lights   int not null default 0,
  stats_stars    int not null default 0,
  updated_at     timestamptz not null default now()
);

-- 3. 回忆 -----------------------------------------------------
create table if not exists public.hp_memories (
  id          uuid primary key default gen_random_uuid(),
  planet_id   uuid not null references public.hp_planets(id) on delete cascade,
  owner_id    uuid not null references auth.users(id) on delete cascade,
  text        text not null,
  image_url   text,
  visibility  text not null default 'PUBLIC' check (visibility in ('PRIVATE','PUBLIC')),
  created_at  timestamptz not null default now()
);

-- 4. 留言板 ---------------------------------------------------
create table if not exists public.hp_guestbooks (
  id            uuid primary key default gen_random_uuid(),
  planet_id     uuid not null references public.hp_planets(id) on delete cascade,
  visitor_id    uuid not null references auth.users(id) on delete cascade,
  visitor_name  text not null default '旅人',
  content       text not null,
  ai_reply      text,
  status        text not null default 'VISIBLE' check (status in ('VISIBLE','DELETED')),
  created_at    timestamptz not null default now()
);

-- 5. 足迹 -----------------------------------------------------
create table if not exists public.hp_visits (
  id            uuid primary key default gen_random_uuid(),
  planet_id     uuid not null references public.hp_planets(id) on delete cascade,
  visitor_id    uuid not null references auth.users(id) on delete cascade,
  visitor_name  text not null default '旅人',
  action        text not null,
  created_at    timestamptz not null default now()
);

-- 6. 好友 -----------------------------------------------------
create table if not exists public.hp_friendships (
  id            uuid primary key default gen_random_uuid(),
  requester_id  uuid not null references auth.users(id) on delete cascade,
  addressee_id  uuid not null references auth.users(id) on delete cascade,
  status        text not null default 'PENDING' check (status in ('PENDING','ACCEPTED')),
  created_at    timestamptz not null default now(),
  unique (requester_id, addressee_id)
);

-- 7. 悄悄话 ---------------------------------------------------
create table if not exists public.hp_messages (
  id            uuid primary key default gen_random_uuid(),
  sender_id     uuid not null references auth.users(id) on delete cascade,
  recipient_id  uuid not null references auth.users(id) on delete cascade,
  content       text not null,
  is_read       boolean not null default false,
  created_at    timestamptz not null default now()
);

-- 索引 --------------------------------------------------------
create index if not exists hp_memories_planet_idx   on public.hp_memories (planet_id, created_at desc);
create index if not exists hp_guestbooks_planet_idx on public.hp_guestbooks (planet_id, created_at desc);
create index if not exists hp_visits_planet_idx     on public.hp_visits (planet_id, created_at desc);
create index if not exists hp_messages_pair_idx     on public.hp_messages (sender_id, recipient_id, created_at desc);

-- ============================================
-- 行级安全（RLS）
-- ============================================
alter table public.hp_profiles    enable row level security;
alter table public.hp_planets     enable row level security;
alter table public.hp_memories    enable row level security;
alter table public.hp_guestbooks  enable row level security;
alter table public.hp_visits      enable row level security;
alter table public.hp_friendships enable row level security;
alter table public.hp_messages    enable row level security;

-- 档案：所有人可读，只能改自己
drop policy if exists hp_profiles_read   on public.hp_profiles;
drop policy if exists hp_profiles_write  on public.hp_profiles;
drop policy if exists hp_profiles_update on public.hp_profiles;
create policy hp_profiles_read   on public.hp_profiles for select to authenticated using (true);
create policy hp_profiles_write  on public.hp_profiles for insert to authenticated with check (id = auth.uid());
create policy hp_profiles_update on public.hp_profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

-- 星球：所有人可读，只有主人能改
drop policy if exists hp_planets_read   on public.hp_planets;
drop policy if exists hp_planets_insert on public.hp_planets;
drop policy if exists hp_planets_update on public.hp_planets;
drop policy if exists hp_planets_delete on public.hp_planets;
create policy hp_planets_read   on public.hp_planets for select to authenticated using (true);
create policy hp_planets_insert on public.hp_planets for insert to authenticated with check (owner_id = auth.uid());
create policy hp_planets_update on public.hp_planets for update to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy hp_planets_delete on public.hp_planets for delete to authenticated using (owner_id = auth.uid());

-- 回忆：公开的谁都能看，私密的只有主人能看
drop policy if exists hp_memories_read   on public.hp_memories;
drop policy if exists hp_memories_insert on public.hp_memories;
drop policy if exists hp_memories_update on public.hp_memories;
drop policy if exists hp_memories_delete on public.hp_memories;
create policy hp_memories_read on public.hp_memories for select to authenticated
  using (visibility = 'PUBLIC' or owner_id = auth.uid());
create policy hp_memories_insert on public.hp_memories for insert to authenticated
  with check (owner_id = auth.uid());
create policy hp_memories_update on public.hp_memories for update to authenticated
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy hp_memories_delete on public.hp_memories for delete to authenticated
  using (owner_id = auth.uid());

-- 留言：可见的谁都能看；主人可以删除自己星球下的留言
drop policy if exists hp_guestbooks_read   on public.hp_guestbooks;
drop policy if exists hp_guestbooks_insert on public.hp_guestbooks;
drop policy if exists hp_guestbooks_update on public.hp_guestbooks;
create policy hp_guestbooks_read on public.hp_guestbooks for select to authenticated
  using (
    status = 'VISIBLE'
    or visitor_id = auth.uid()
    or exists (select 1 from public.hp_planets p where p.id = planet_id and p.owner_id = auth.uid())
  );
create policy hp_guestbooks_insert on public.hp_guestbooks for insert to authenticated
  with check (visitor_id = auth.uid());
create policy hp_guestbooks_update on public.hp_guestbooks for update to authenticated
  using (
    visitor_id = auth.uid()
    or exists (select 1 from public.hp_planets p where p.id = planet_id and p.owner_id = auth.uid())
  )
  with check (true);

-- 足迹：只有星球主人能看自己星球的；访客只能写自己的
drop policy if exists hp_visits_read   on public.hp_visits;
drop policy if exists hp_visits_insert on public.hp_visits;
create policy hp_visits_read on public.hp_visits for select to authenticated
  using (exists (select 1 from public.hp_planets p where p.id = planet_id and p.owner_id = auth.uid()));
create policy hp_visits_insert on public.hp_visits for insert to authenticated
  with check (visitor_id = auth.uid());

-- 好友：只涉及双方的记录可见
drop policy if exists hp_friendships_read   on public.hp_friendships;
drop policy if exists hp_friendships_insert on public.hp_friendships;
drop policy if exists hp_friendships_update on public.hp_friendships;
create policy hp_friendships_read on public.hp_friendships for select to authenticated
  using (requester_id = auth.uid() or addressee_id = auth.uid());
create policy hp_friendships_insert on public.hp_friendships for insert to authenticated
  with check (requester_id = auth.uid());
create policy hp_friendships_update on public.hp_friendships for update to authenticated
  using (requester_id = auth.uid() or addressee_id = auth.uid())
  with check (true);
drop policy if exists hp_friendships_delete on public.hp_friendships;
create policy hp_friendships_delete on public.hp_friendships for delete to authenticated
  using (requester_id = auth.uid() or addressee_id = auth.uid());

-- 悄悄话：只有收发双方可见
drop policy if exists hp_messages_read   on public.hp_messages;
drop policy if exists hp_messages_insert on public.hp_messages;
drop policy if exists hp_messages_update on public.hp_messages;
create policy hp_messages_read on public.hp_messages for select to authenticated
  using (sender_id = auth.uid() or recipient_id = auth.uid());
create policy hp_messages_insert on public.hp_messages for insert to authenticated
  with check (sender_id = auth.uid());
create policy hp_messages_update on public.hp_messages for update to authenticated
  using (sender_id = auth.uid() or recipient_id = auth.uid())
  with check (true);

-- 访客互动：访客不能直接改别人的星球，用安全定义函数一次性写足迹 + 累加统计
create or replace function public.hp_record_visit(p_planet uuid, p_action text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare v_name text;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;
  select nickname into v_name from public.hp_profiles where id = auth.uid();
  insert into public.hp_visits (planet_id, visitor_id, visitor_name, action)
  values (p_planet, auth.uid(), coalesce(v_name, '旅人'), p_action);

  update public.hp_planets set
    stats_visits = stats_visits + case when p_action = 'ENTER' then 1 else 0 end,
    stats_lights = stats_lights + case when p_action = 'LIGHT' then 1 else 0 end,
    stats_stars  = stats_stars  + case when p_action = 'STAR' then 1 else 0 end,
    updated_at   = now()
  where id = p_planet;
end;
$$;

revoke all on function public.hp_record_visit(uuid, text) from anon;
grant execute on function public.hp_record_visit(uuid, text) to authenticated;

-- 授权（Supabase 默认已授权，这里显式声明一次）
grant select, insert, update, delete on
  public.hp_profiles, public.hp_planets, public.hp_memories,
  public.hp_guestbooks, public.hp_visits, public.hp_friendships, public.hp_messages
to authenticated;

notify pgrst, 'reload schema';
