-- 0008_cleanup_rpc_revoke_public.sql  (non-breaking — safe to apply while live)
--
-- 0005 revoked cleanup_expired_data() from anon and authenticated, but Postgres
-- also grants EXECUTE on new functions to PUBLIC, and both roles inherit it. So
-- anyone with the public anon key could still run the security-definer cleanup
-- job through /rest/v1/rpc. 0004 already does this right for
-- get_invitation_public; this brings 0005 in line.
--
-- pg_cron runs the job as the owner, so the nightly schedule is unaffected.

revoke execute on function public.cleanup_expired_data() from public, anon, authenticated;

-- Verify (should return false):
--   select has_function_privilege('anon', 'public.cleanup_expired_data()', 'execute');
