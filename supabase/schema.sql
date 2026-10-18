-- Supabase PostgreSQL. Exécuter dans SQL Editor après création du projet.
create extension if not exists pgcrypto;
create table if not exists public.families(
 id uuid primary key default gen_random_uuid(), name text not null check(length(trim(name)) between 1 and 80),
 created_by uuid not null references auth.users(id), created_at timestamptz not null default now()
);
create table if not exists public.family_members(
 family_id uuid not null references public.families(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade,
 role text not null check(role in ('owner','admin','editor','viewer')),
 joined_at timestamptz not null default now(), primary key(family_id,user_id)
);
create table if not exists public.family_invitations(
 id uuid primary key default gen_random_uuid(),
 family_id uuid not null references public.families(id) on delete cascade,
 token_hash text not null unique,
 role text not null check(role in ('admin','editor','viewer')),
 created_by uuid not null references auth.users(id),
 expires_at timestamptz not null, max_uses integer not null default 1 check(max_uses between 1 and 20),
 uses integer not null default 0 check(uses>=0), revoked_at timestamptz,
 created_at timestamptz not null default now()
);
create table if not exists public.family_join_requests(
 family_id uuid not null references public.families(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade,
 invitation_id uuid not null references public.family_invitations(id),
 requested_role text not null check(requested_role in ('admin','editor','viewer')),
 status text not null default 'pending' check(status in ('pending','approved','rejected')),
 created_at timestamptz not null default now(),
 primary key(family_id,user_id)
);
create table if not exists public.simulations(
 id uuid primary key default gen_random_uuid(),
 family_id uuid not null references public.families(id) on delete cascade,
 created_by uuid not null references auth.users(id),
 title text not null check(length(trim(title)) between 1 and 120),
 tax_year integer not null check(tax_year between 2020 and 2100),
 payload jsonb not null check(jsonb_typeof(payload)='object' and pg_column_size(payload)<200000),
 updated_at timestamptz not null default now(), created_at timestamptz not null default now()
);
create index if not exists simulations_family_idx on public.simulations(family_id,updated_at desc);
create index if not exists invites_family_idx on public.family_invitations(family_id);
create index if not exists join_requests_family_idx on public.family_join_requests(family_id,status);
create or replace function public.my_family_role(fid uuid) returns text
language sql security definer set search_path='' stable as $$
 select role from public.family_members where family_id=fid and user_id=(select auth.uid()) limit 1
$$;
revoke all on function public.my_family_role(uuid) from public;
grant execute on function public.my_family_role(uuid) to authenticated;
alter table public.families enable row level security;
alter table public.family_members enable row level security;
alter table public.family_invitations enable row level security;
alter table public.family_join_requests enable row level security;
alter table public.simulations enable row level security;
create policy families_read on public.families for select to authenticated using(public.my_family_role(id) is not null);
create policy members_read on public.family_members for select to authenticated using(public.my_family_role(family_id) is not null);
create policy requests_read on public.family_join_requests for select to authenticated using(user_id=(select auth.uid()) or public.my_family_role(family_id) in ('owner','admin'));
create policy invites_read on public.family_invitations for select to authenticated using(public.my_family_role(family_id) in ('owner','admin'));
create policy simulations_read on public.simulations for select to authenticated using(public.my_family_role(family_id) is not null);
create policy simulations_insert on public.simulations for insert to authenticated with check(created_by=(select auth.uid()) and public.my_family_role(family_id) in ('owner','admin','editor'));
create policy simulations_update on public.simulations for update to authenticated using(public.my_family_role(family_id) in ('owner','admin','editor')) with check(public.my_family_role(family_id) in ('owner','admin','editor'));
create policy simulations_delete on public.simulations for delete to authenticated using(public.my_family_role(family_id) in ('owner','admin','editor'));
-- All privileged membership/invitation changes go through SECURITY DEFINER RPCs.
create or replace function public.create_family(family_name text) returns uuid
language plpgsql security definer set search_path='' as $$
declare fid uuid; uid uuid := auth.uid();
begin
 if uid is null then raise exception 'Authentication required'; end if;
 if length(trim(family_name)) not between 1 and 80 then raise exception 'Invalid family name'; end if;
 insert into public.families(name,created_by) values(trim(family_name),uid) returning id into fid;
 insert into public.family_members(family_id,user_id,role) values(fid,uid,'owner');
 return fid;
end $$;
create or replace function public.create_family_invite(fid uuid, desired_role text default 'viewer', valid_hours integer default 24)
returns text language plpgsql security definer set search_path='' as $$
declare raw_token text;
begin
 if public.my_family_role(fid) not in ('owner','admin') then raise exception 'Forbidden'; end if;
 if desired_role not in ('viewer','editor','admin') then raise exception 'Invalid role'; end if;
 if valid_hours not between 1 and 168 then raise exception 'Invalid expiry'; end if;
 raw_token:=encode(gen_random_bytes(32),'hex');
 insert into public.family_invitations(family_id,token_hash,role,created_by,expires_at)
 values(fid,encode(digest(raw_token,'sha256'),'hex'),desired_role,auth.uid(),now()+make_interval(hours=>valid_hours));
 return raw_token;
end $$;
create or replace function public.request_family_join(raw_token text) returns uuid
language plpgsql security definer set search_path='' as $$
declare inv public.family_invitations%rowtype; uid uuid := auth.uid();
begin
 if uid is null then raise exception 'Authentication required'; end if;
 select * into inv from public.family_invitations where token_hash=encode(digest(raw_token,'sha256'),'hex') for update;
 if not found or inv.revoked_at is not null or inv.expires_at<=now() or inv.uses>=inv.max_uses then raise exception 'Invitation invalid or expired'; end if;
 if exists(select 1 from public.family_members where family_id=inv.family_id and user_id=uid) then raise exception 'Already a member'; end if;
 insert into public.family_join_requests(family_id,user_id,invitation_id,requested_role)
 values(inv.family_id,uid,inv.id,inv.role)
 on conflict(family_id,user_id) do update set invitation_id=excluded.invitation_id,requested_role=excluded.requested_role,status='pending',created_at=now();
 return inv.family_id;
end $$;
create or replace function public.review_family_join(fid uuid, applicant uuid, approve boolean)
returns void language plpgsql security definer set search_path='' as $$
declare req public.family_join_requests%rowtype; inv public.family_invitations%rowtype;
begin
 if public.my_family_role(fid) not in ('owner','admin') then raise exception 'Forbidden'; end if;
 select * into req from public.family_join_requests where family_id=fid and user_id=applicant and status='pending' for update;
 if not found then raise exception 'Request missing'; end if;
 if approve then
 select * into inv from public.family_invitations where id=req.invitation_id for update;
 if inv.revoked_at is not null or inv.expires_at<=now() or inv.uses>=inv.max_uses then raise exception 'Invitation expired'; end if;
 if req.requested_role='admin' and public.my_family_role(fid)<>'owner' then raise exception 'Only owner may approve admins'; end if;
 insert into public.family_members(family_id,user_id,role) values(fid,applicant,req.requested_role) on conflict do nothing;
 update public.family_invitations set uses=uses+1 where id=inv.id;
 end if;
 update public.family_join_requests set status=case when approve then 'approved' else 'rejected' end where family_id=fid and user_id=applicant;
end $$;
create or replace function public.set_family_role(fid uuid, member uuid, new_role text)
returns void language plpgsql security definer set search_path='' as $$
begin
 if public.my_family_role(fid)<>'owner' then raise exception 'Only owner may change roles'; end if;
 if new_role not in ('admin','editor','viewer') then raise exception 'Invalid role'; end if;
 if member=auth.uid() then raise exception 'Owner role cannot be changed'; end if;
 update public.family_members set role=new_role where family_id=fid and user_id=member and role<>'owner';
 if not found then raise exception 'Member not found or protected'; end if;
end $$;
create or replace function public.remove_family_member(fid uuid, member uuid)
returns void language plpgsql security definer set search_path='' as $$
begin
 if member<>auth.uid() and public.my_family_role(fid) not in ('owner','admin') then raise exception 'Forbidden'; end if;
 delete from public.family_members where family_id=fid and user_id=member and role<>'owner';
 if not found then raise exception 'Owner cannot be removed or member missing'; end if;
end $$;
revoke all on function public.create_family(text),public.create_family_invite(uuid,text,integer),public.request_family_join(text),public.review_family_join(uuid,uuid,boolean),public.set_family_role(uuid,uuid,text),public.remove_family_member(uuid,uuid) from public;
grant execute on function public.create_family(text),public.create_family_invite(uuid,text,integer),public.request_family_join(text),public.review_family_join(uuid,uuid,boolean),public.set_family_role(uuid,uuid,text),public.remove_family_member(uuid,uuid) to authenticated;
-- Authenticated clients have no direct write grants on families, members, invitations or requests.
revoke insert,update,delete on public.families,public.family_members,public.family_invitations,public.family_join_requests from anon,authenticated;
grant select on public.families,public.family_members,public.family_invitations,public.family_join_requests,public.simulations to authenticated;
grant insert,update,delete on public.simulations to authenticated;
