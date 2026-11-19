-- ============================================================================
-- «Высота Кода» — полная схема базы данных Supabase (PostgreSQL + Realtime)
-- Вставьте этот файл целиком в Supabase → SQL Editor → New query → Run
-- ============================================================================

create extension if not exists pgcrypto;

-- 1. Активная комната соревнования
create table if not exists public.rooms (
  id text primary key default 'main',
  status text not null default 'lobby' check (status in ('lobby', 'running', 'finished')),
  max_participants integer not null default 16,
  max_level integer not null default 10,
  started_at bigint,
  duration_minutes integer,
  ends_at bigint,
  finished_at bigint,
  finish_reason text check (finish_reason in ('all_finished', 'teacher_stopped', 'time_up')),
  updated_at timestamptz not null default now()
);

insert into public.rooms (id, status, max_participants, max_level)
values ('main', 'lobby', 16, 10)
on conflict (id) do nothing;

-- 2. Текущие участники активного раунда (до 16 человек по 3 группам)
create table if not exists public.participants (
  id uuid primary key default gen_random_uuid(),
  room_id text not null default 'main' references public.rooms(id) on delete cascade,
  first_name text not null,
  last_name text not null,
  track text not null check (track in ('cpp', 'csharp', 'python')),
  group_name text not null check (group_name in ('Группа 1', 'Группа 2', 'Группа 3')),
  level integer not null default 0,
  max_level integer not null default 10,
  solved_task_ids text[] not null default '{}',
  skipped_task_ids text[] not null default '{}',
  wrong_attempts_by_task jsonb not null default '{}'::jsonb,
  wrong_answers_log jsonb not null default '[]'::jsonb,
  attempts integer not null default 0,
  connected boolean not null default true,
  joined_at bigint not null default (extract(epoch from now()) * 1000)::bigint,
  finished_at bigint,
  finish_place integer,
  final_rank integer,
  last_climb_at bigint,
  color_index integer not null default 0,
  customization jsonb not null default '{"suitColorIndex":0,"hairStyle":"short","hairColor":"#1E1B18","pattern":"stripes","barStyle":"classic"}'::jsonb,
  is_demo boolean not null default false
);

create index if not exists idx_participants_room on public.participants(room_id);

-- 3. Живые события подъёма для запуска анимаций и звуков в Realtime
create table if not exists public.climb_events (
  id uuid primary key default gen_random_uuid(),
  room_id text not null default 'main' references public.rooms(id) on delete cascade,
  participant_id uuid not null,
  participant_name text not null,
  track text not null,
  group_name text not null,
  from_level integer not null,
  to_level integer not null,
  finished boolean not null default false,
  created_at bigint not null default (extract(epoch from now()) * 1000)::bigint
);

create index if not exists idx_climb_events_room_time on public.climb_events(room_id, created_at desc);

-- 4. Постоянный архив завершённых этапов (сохраняется навсегда)
create table if not exists public.competition_rounds (
  id uuid primary key default gen_random_uuid(),
  started_at bigint,
  finished_at bigint not null default (extract(epoch from now()) * 1000)::bigint,
  duration_minutes integer,
  finish_reason text not null default 'teacher_stopped',
  participant_count integer not null default 0,
  max_level integer not null default 10,
  created_at timestamptz not null default now()
);

-- 5. Постоянный архив результатов каждого ученика и его ошибок по задачам
create table if not exists public.competition_round_results (
  id uuid primary key default gen_random_uuid(),
  round_id uuid not null references public.competition_rounds(id) on delete cascade,
  first_name text not null,
  last_name text not null,
  track text not null check (track in ('cpp', 'csharp', 'python')),
  group_name text not null check (group_name in ('Группа 1', 'Группа 2', 'Группа 3')),
  score integer not null default 0,
  max_score integer not null default 10,
  final_rank integer not null default 1,
  group_rank integer not null default 1,
  attempts integer not null default 0,
  solved_task_ids text[] not null default '{}',
  skipped_task_ids text[] not null default '{}',
  wrong_attempts_by_task jsonb not null default '{}'::jsonb,
  wrong_answers_log jsonb not null default '[]'::jsonb,
  finished_at bigint,
  is_demo boolean not null default false
);

create index if not exists idx_round_results_round on public.competition_round_results(round_id);

-- ============================================================================
-- Вспомогательная серверная функция проверки ответов по всем 30 задачам
-- Ответы проверяются внутри PostgreSQL — ученики не увидят их в консоли
-- ============================================================================
create or replace function public.check_task_answer_internal(
  p_track text,
  p_task_id text,
  p_raw_answer text
)
returns boolean
language plpgsql
immutable
as $$
declare
  v_text text;
  v_code text;
  v_unquoted text;
  v_param text;
  v_body text;
  v_match text[];
begin
  v_text := btrim(regexp_replace(coalesce(p_raw_answer, ''), '\s+', ' ', 'g'));
  v_code := regexp_replace(regexp_replace(btrim(coalesce(p_raw_answer, '')), ';+$', ''), '\s+', '', 'g');
  v_unquoted := btrim(coalesce(p_raw_answer, ''));
  if (left(v_unquoted, 1) = '"' and right(v_unquoted, 1) = '"')
     or (left(v_unquoted, 1) = '''' and right(v_unquoted, 1) = '''') then
    v_unquoted := btrim(substring(v_unquoted from 2 for length(v_unquoted) - 2));
  end if;

  -- C++ (1..10)
  if p_track = 'cpp' then
    case p_task_id
      when 'cpp-1' then return v_text = '5';
      when 'cpp-2' then
        v_code := regexp_replace(v_code, '^\((.*)\)$', '\1');
        return v_code in ('i%2==0', '0==i%2', '!(i%2)', '(i&1)==0', 'i&1==0', '0==(i&1)', 'i%2!=1');
      when 'cpp-3' then return v_text = '13';
      when 'cpp-4' then return v_text = '19';
      when 'cpp-5' then return v_code in ('nums.push_back(40)', 'nums.emplace_back(40)');
      when 'cpp-6' then return v_text = '14';
      when 'cpp-7' then return v_code in ('s.size()', 's.length()');
      when 'cpp-8' then return v_text = '4';
      when 'cpp-9' then return v_text = '24';
      when 'cpp-10' then return v_text = '14';
      else return false;
    end case;

  -- C# (1..10)
  elsif p_track = 'csharp' then
    case p_task_id
      when 'csharp-1' then return v_text = '14';
      when 'csharp-2' then return v_code in ('scores.Length', 'scores.Count()');
      when 'csharp-3' then return v_text = '18';
      when 'csharp-4' then return v_unquoted = 'SHA';
      when 'csharp-5' then
        v_match := regexp_match(v_code, '^\(?([a-zA-Z_][a-zA-Z0-9_]*)\)?=>\(?(.+?)\)?$');
        if v_match is null then
          return false;
        end if;
        v_param := v_match[1];
        v_body := v_match[2];
        return v_body = (v_param || '>10') or v_body = ('10<' || v_param);
      when 'csharp-6' then return v_text = '7';
      when 'csharp-7' then return v_code = 'list.Add(3)';
      when 'csharp-8' then return v_text = '20';
      when 'csharp-9' then return v_unquoted = 'c_sharp';
      when 'csharp-10' then return v_text = '3';
      else return false;
    end case;

  -- Python (1..10)
  elsif p_track = 'python' then
    case p_task_id
      when 'python-1' then return v_text = '11';
      when 'python-2' then return v_unquoted = 'YTH';
      when 'python-3' then return v_code in ('items.append(40)', 'items+=[40]', 'items.extend([40])', 'items.insert(3,40)');
      when 'python-4' then return v_text = '9';
      when 'python-5' then return v_text = '29';
      when 'python-6' then return v_text = '15';
      when 'python-7' then return v_code = 'len(data)';
      when 'python-8' then return v_text = '17';
      when 'python-9' then return v_text = '90';
      when 'python-10' then return v_text = '16';
      else return false;
    end case;
  end if;

  return false;
end;
$$;

-- ============================================================================
-- RPC: Завершение этапа, подсчёт мест и сохранение в постоянный архив
-- ============================================================================
create or replace function public.finalize_competition_round(
  p_reason text default 'teacher_stopped'
)
returns uuid
language plpgsql
security definer
as $$
declare
  v_room public.rooms%rowtype;
  v_now bigint := (extract(epoch from now()) * 1000)::bigint;
  v_round_id uuid;
  v_count integer;
begin
  select * into v_room from public.rooms where id = 'main' for update;
  if not found then
    return null;
  end if;

  if v_room.status = 'finished' then
    return null;
  end if;

  -- Выставляем final_rank всем участникам
  with ranked as (
    select
      id,
      row_number() over (
        order by
          (finish_place is null) asc,
          coalesce(finish_place, 9999) asc,
          level desc,
          coalesce(last_climb_at, 9223372036854775807) asc,
          attempts asc,
          joined_at asc
      ) as rnk
    from public.participants
    where room_id = 'main'
  )
  update public.participants p
  set final_rank = r.rnk
  from ranked r
  where p.id = r.id;

  select count(*) into v_count from public.participants where room_id = 'main';

  -- Сохраняем постоянный снимок раунда в архив, если были участники
  if v_count > 0 then
    insert into public.competition_rounds (
      started_at,
      finished_at,
      duration_minutes,
      finish_reason,
      participant_count,
      max_level
    )
    values (
      v_room.started_at,
      v_now,
      v_room.duration_minutes,
      coalesce(p_reason, 'teacher_stopped'),
      v_count,
      v_room.max_level
    )
    returning id into v_round_id;

    insert into public.competition_round_results (
      round_id,
      first_name,
      last_name,
      track,
      group_name,
      score,
      max_score,
      final_rank,
      group_rank,
      attempts,
      solved_task_ids,
      skipped_task_ids,
      wrong_attempts_by_task,
      wrong_answers_log,
      finished_at,
      is_demo
    )
    select
      v_round_id,
      p.first_name,
      p.last_name,
      p.track,
      p.group_name,
      p.level,
      p.max_level,
      coalesce(p.final_rank, 1),
      row_number() over (
        partition by p.group_name
        order by coalesce(p.final_rank, 9999) asc
      ),
      p.attempts,
      p.solved_task_ids,
      p.skipped_task_ids,
      p.wrong_attempts_by_task,
      p.wrong_answers_log,
      p.finished_at,
      p.is_demo
    from public.participants p
    where p.room_id = 'main';
  end if;

  update public.rooms
  set
    status = 'finished',
    finished_at = v_now,
    finish_reason = coalesce(p_reason, 'teacher_stopped'),
    updated_at = now()
  where id = 'main';

  return v_round_id;
end;
$$;

-- ============================================================================
-- RPC: Проверка ответа ученика + подъём на этаж + запись ошибок
-- ============================================================================
create or replace function public.submit_task_answer(
  p_participant_id uuid,
  p_task_id text,
  p_answer text
)
returns jsonb
language plpgsql
security definer
as $$
declare
  v_room public.rooms%rowtype;
  v_p public.participants%rowtype;
  v_now bigint := (extract(epoch from now()) * 1000)::bigint;
  v_correct boolean;
  v_new_level integer;
  v_finish_place integer;
  v_finished boolean := false;
  v_all_done boolean := false;
  v_prev_err integer;
  v_new_wrong_map jsonb;
  v_new_wrong_log jsonb;
  v_msg text;
begin
  select * into v_room from public.rooms where id = 'main';
  if not found or v_room.status <> 'running' then
    return jsonb_build_object(
      'correct', false,
      'error', 'Соревнование сейчас не активно.'
    );
  end if;

  -- Автозавершение, если таймер уже вышел
  if v_room.ends_at is not null and v_now >= v_room.ends_at then
    perform public.finalize_competition_round('time_up');
    return jsonb_build_object(
      'correct', false,
      'error', 'Время этапа вышло — результаты уже подведены.'
    );
  end if;

  select * into v_p from public.participants where id = p_participant_id for update;
  if not found then
    return jsonb_build_object(
      'correct', false,
      'error', 'Участник не найден в текущей сессии.'
    );
  end if;

  if v_p.level >= v_room.max_level then
    return jsonb_build_object(
      'correct', true,
      'newLevel', v_p.level,
      'finished', true,
      'message', format('Все %s этажей уже пройдены!', v_room.max_level)
    );
  end if;

  if p_task_id = any(v_p.solved_task_ids) then
    return jsonb_build_object(
      'correct', true,
      'newLevel', v_p.level,
      'finished', v_p.level >= v_room.max_level,
      'message', 'Эта задача уже решена! Переходите к следующей.'
    );
  end if;

  v_correct := public.check_task_answer_internal(v_p.track, p_task_id, p_answer);

  if v_correct then
    v_new_level := least(v_room.max_level, v_p.level + 1);
    v_finish_place := v_p.finish_place;

    if v_new_level >= v_room.max_level and v_p.finished_at is null then
      v_finished := true;
      select coalesce(max(finish_place), 0) + 1
        into v_finish_place
      from public.participants
      where room_id = 'main';
    end if;

    update public.participants
    set
      level = v_new_level,
      attempts = attempts + 1,
      last_climb_at = v_now,
      solved_task_ids = array_append(solved_task_ids, p_task_id),
      skipped_task_ids = array_remove(skipped_task_ids, p_task_id),
      finished_at = case when v_finished then v_now else finished_at end,
      finish_place = case when v_finished then v_finish_place else finish_place end
    where id = v_p.id;

    insert into public.climb_events (
      room_id, participant_id, participant_name, track, group_name,
      from_level, to_level, finished, created_at
    )
    values (
      'main', v_p.id, v_p.first_name || ' ' || v_p.last_name, v_p.track, v_p.group_name,
      v_p.level, v_new_level, v_finished, v_now
    );

    -- Проверяем, финишировали ли все участники
    select not exists (
      select 1 from public.participants
      where room_id = 'main' and level < v_room.max_level
    ) into v_all_done;

    if v_all_done then
      perform public.finalize_competition_round('all_finished');
    end if;

    if v_finished then
      v_msg := 'Верно! Вершина взята — спортсмен забрался на самый верх!';
    elsif v_new_level = 1 then
      v_msg := 'Верно! Спортсмен подпрыгнул и зацепился палкой за пазы 1-го этажа!';
    else
      v_msg := format('Верно! Отличный перехват — подъём на этаж %s!', v_new_level);
    end if;

    return jsonb_build_object(
      'correct', true,
      'newLevel', v_new_level,
      'finished', v_finished,
      'message', v_msg
    );
  else
    v_prev_err := coalesce((v_p.wrong_attempts_by_task ->> p_task_id)::integer, 0);
    v_new_wrong_map := jsonb_set(
      coalesce(v_p.wrong_attempts_by_task, '{}'::jsonb),
      array[p_task_id],
      to_jsonb(v_prev_err + 1),
      true
    );
    v_new_wrong_log := coalesce(v_p.wrong_answers_log, '[]'::jsonb) || jsonb_build_array(
      jsonb_build_object(
        'taskId', p_task_id,
        'answer', left(coalesce(p_answer, ''), 120),
        'timestamp', v_now
      )
    );

    update public.participants
    set
      attempts = attempts + 1,
      wrong_attempts_by_task = v_new_wrong_map,
      wrong_answers_log = v_new_wrong_log
    where id = v_p.id;

    return jsonb_build_object(
      'correct', false,
      'newLevel', v_p.level,
      'finished', false,
      'message', 'Ответ не совпал. Проверьте решение, попробуйте снова или пропустите задачу.'
    );
  end if;
end;
$$;

-- ============================================================================
-- RPC: Тестовый подъём (+1 этаж) для преподавателя
-- ============================================================================
create or replace function public.advance_demo_participant(
  p_participant_id uuid default null,
  p_group text default null
)
returns void
language plpgsql
security definer
as $$
declare
  v_room public.rooms%rowtype;
  v_p public.participants%rowtype;
  v_now bigint := (extract(epoch from now()) * 1000)::bigint;
  v_new_level integer;
  v_finish_place integer;
  v_finished boolean := false;
  v_task_id text;
  v_all_done boolean := false;
begin
  select * into v_room from public.rooms where id = 'main';
  if not found then return; end if;

  if v_room.status = 'lobby' then
    update public.rooms
    set status = 'running', started_at = v_now, finished_at = null, finish_reason = null, updated_at = now()
    where id = 'main';
  end if;

  if p_participant_id is not null then
    select * into v_p from public.participants where id = p_participant_id and level < v_room.max_level for update;
  else
    select * into v_p
    from public.participants
    where room_id = 'main'
      and level < v_room.max_level
      and (p_group is null or group_name = p_group)
    order by random()
    limit 1
    for update;
  end if;

  if not found then return; end if;

  v_new_level := least(v_room.max_level, v_p.level + 1);
  v_task_id := v_p.track || '-' || v_new_level::text;
  v_finish_place := v_p.finish_place;

  if v_new_level >= v_room.max_level and v_p.finished_at is null then
    v_finished := true;
    select coalesce(max(finish_place), 0) + 1
      into v_finish_place
    from public.participants
    where room_id = 'main';
  end if;

  update public.participants
  set
    level = v_new_level,
    attempts = attempts + 1,
    last_climb_at = v_now,
    solved_task_ids = case when v_task_id = any(solved_task_ids) then solved_task_ids else array_append(solved_task_ids, v_task_id) end,
    skipped_task_ids = array_remove(skipped_task_ids, v_task_id),
    finished_at = case when v_finished then v_now else finished_at end,
    finish_place = case when v_finished then v_finish_place else finish_place end
  where id = v_p.id;

  insert into public.climb_events (
    room_id, participant_id, participant_name, track, group_name,
    from_level, to_level, finished, created_at
  )
  values (
    'main', v_p.id, v_p.first_name || ' ' || v_p.last_name, v_p.track, v_p.group_name,
    v_p.level, v_new_level, v_finished, v_now
  );

  select not exists (
    select 1 from public.participants
    where room_id = 'main' and level < v_room.max_level
  ) into v_all_done;

  if v_all_done then
    perform public.finalize_competition_round('all_finished');
  end if;
end;
$$;

-- ============================================================================
-- Права доступа (RLS) для работы со статического сайта GitHub Pages
-- ============================================================================
alter table public.rooms enable row level security;
alter table public.participants enable row level security;
alter table public.climb_events enable row level security;
alter table public.competition_rounds enable row level security;
alter table public.competition_round_results enable row level security;

drop policy if exists "public_all_rooms" on public.rooms;
create policy "public_all_rooms" on public.rooms for all using (true) with check (true);

drop policy if exists "public_all_participants" on public.participants;
create policy "public_all_participants" on public.participants for all using (true) with check (true);

drop policy if exists "public_all_climb_events" on public.climb_events;
create policy "public_all_climb_events" on public.climb_events for all using (true) with check (true);

drop policy if exists "public_all_rounds" on public.competition_rounds;
create policy "public_all_rounds" on public.competition_rounds for all using (true) with check (true);

drop policy if exists "public_all_round_results" on public.competition_round_results;
create policy "public_all_round_results" on public.competition_round_results for all using (true) with check (true);

grant execute on function public.submit_task_answer(uuid, text, text) to anon, authenticated;
grant execute on function public.finalize_competition_round(text) to anon, authenticated;
grant execute on function public.advance_demo_participant(uuid, text) to anon, authenticated;

-- ============================================================================
-- Включение Realtime-подписок для мгновенной синхронизации всех экранов
-- ============================================================================
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'rooms'
  ) then
    alter publication supabase_realtime add table public.rooms;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'participants'
  ) then
    alter publication supabase_realtime add table public.participants;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'climb_events'
  ) then
    alter publication supabase_realtime add table public.climb_events;
  end if;
end;
$$;
