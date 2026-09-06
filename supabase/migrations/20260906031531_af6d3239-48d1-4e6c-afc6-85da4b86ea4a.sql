-- LOCAL REVIEW CANDIDATE, NOT AN APPROVED PRODUCTION MIGRATION.
-- Apply only after exact live metadata/operator review and explicit approval.
-- No root db push; no customer rows or object bytes are modified/deleted.
-- SCENE-CONTAINMENT-02 SQL phase only. After commit, set both sensitive buckets
-- private using the supported storage control. Public URLs remain open until then.
begin;
set local lock_timeout = '5s';
set local statement_timeout = '30s';

do $$
declare target text; owner_column text; predicate text; routine record;
begin
  -- Abort transaction on unexpected schema rather than silently protecting a subset.
  if to_regprocedure('public.has_role(uuid,public.app_role)') is null then
    raise exception 'Containment requires reviewed has_role(uuid,app_role)';
  end if;
  foreach target in array array['shows','show_artists','show_tags','show_rankings','show_comparisons','profiles','upcoming_shows'] loop
    if not exists(select 1 from pg_class c join pg_namespace n on n.oid=c.relnamespace
      where n.nspname='public' and c.relname=target and c.relrowsecurity) then
      raise exception 'Missing expected RLS table: %',target;
    end if;
    owner_column := case target when 'profiles' then 'id'
      when 'upcoming_shows' then 'created_by_user_id' else 'user_id' end;
    if target in ('show_artists','show_tags') then
      predicate := 'exists(select 1 from public.shows s where s.id=show_id and s.user_id=auth.uid())';
    else
      predicate := format('auth.uid()=%I',owner_column);
    end if;
    predicate := '(' || predicate || ') OR public.has_role(auth.uid(),''admin''::public.app_role)';
    -- RESTRICTIVE combines with AND, so the old permissive USING(true) cannot bypass it.
    execute format('drop policy if exists scene_containment_private_read on public.%I',target);
    execute format('create policy scene_containment_private_read on public.%I as restrictive for select to public using (%s)',target,predicate);
    execute format('drop policy if exists scene_containment_authorized_read on public.%I',target);
    execute format('create policy scene_containment_authorized_read on public.%I for select to authenticated using (%s)',target,predicate);
    execute format('revoke truncate, references, trigger on public.%I from public, anon, authenticated',target);
  end loop;

  -- Cover all overloads. Revoking anon alone would leave inherited PUBLIC EXECUTE.
  for routine in select p.oid::regprocedure as signature from pg_proc p
    join pg_namespace n on n.oid=p.pronamespace
    where n.nspname='public' and p.proname in
      ('get_show_invite_preview','get_upcoming_show_invite_preview','get_mutual_followers',
       'get_referral_rank','get_discover_upcoming_near_me','get_edmtrain_event_preview')
  loop
    execute format('revoke execute on function %s from public, anon, authenticated',routine.signature);
  end loop;
  if (select count(*) from storage.buckets where id in ('show-photos','bug-screenshots')) <> 2 then
    raise exception 'Expected both sensitive storage buckets; aborting';
  end if;
end $$;

drop policy if exists scene_containment_private_media on storage.objects;
create policy scene_containment_private_media on storage.objects as restrictive
for select to public using (
  case
    when bucket_id='show-photos' then
      (auth.uid() is not null and (storage.foldername(name))[1]=auth.uid()::text)
      or public.has_role(auth.uid(),'admin'::public.app_role)
    when bucket_id='bug-screenshots' then public.has_role(auth.uid(),'admin'::public.app_role)
    else true
  end
);
drop policy if exists scene_containment_admin_media on storage.objects;
create policy scene_containment_admin_media on storage.objects for select to authenticated
using(bucket_id in ('show-photos','bug-screenshots') and public.has_role(auth.uid(),'admin'::public.app_role));
revoke truncate, references, trigger on storage.objects from public, anon, authenticated;

notify pgrst, 'reload schema';
commit;