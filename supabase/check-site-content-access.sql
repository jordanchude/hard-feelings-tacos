-- READ-ONLY OPERATOR PREFLIGHT — run this file by itself in the Supabase SQL editor.
-- STOP unless every required capability below is confirmed. Do not add grants or
-- change RLS/policies here; have a database operator correct missing prerequisites
-- separately, then rerun this file and inspect its results again.

-- 1. `ON CONFLICT (key)` needs a primary/unique constraint on key alone.
SELECT c.conname, c.contype, key_column.attname
FROM pg_constraint AS c
JOIN pg_class AS t ON t.oid = c.conrelid
JOIN pg_namespace AS n ON n.oid = t.relnamespace
JOIN pg_attribute AS key_column ON key_column.attrelid = t.oid
WHERE n.nspname = 'public'
  AND t.relname = 'site_content'
  AND key_column.attname = 'key'
  AND c.contype IN ('p', 'u')
  AND c.conkey = ARRAY[key_column.attnum];

-- 2. The public table must have RLS enabled.
SELECT n.nspname, t.relname, t.relrowsecurity
FROM pg_class AS t
JOIN pg_namespace AS n ON n.oid = t.relnamespace
WHERE n.nspname = 'public' AND t.relname = 'site_content';

-- 3. Data API table privileges must be explicit. Every row must be present.
WITH required_grants (grantee, privilege_type) AS (
  VALUES
    ('anon', 'SELECT'),
    ('authenticated', 'SELECT'),
    ('authenticated', 'INSERT'),
    ('authenticated', 'UPDATE')
)
SELECT required_grants.grantee, required_grants.privilege_type,
       EXISTS (
         SELECT 1
         FROM information_schema.role_table_grants AS grants
         WHERE grants.table_schema = 'public'
           AND grants.table_name = 'site_content'
           AND grants.grantee = required_grants.grantee
           AND grants.privilege_type = required_grants.privilege_type
       ) AS granted
FROM required_grants
ORDER BY required_grants.grantee, required_grants.privilege_type;

-- 4. Candidate RLS policies. This query deliberately does not decide whether a
-- predicate permits an operation: an arbitrary qual/with_check expression, the
-- interaction of permissive policies, and restrictive policies require review.
WITH requested_access (role_name, command) AS (
  VALUES
    ('anon', 'SELECT'),
    ('authenticated', 'SELECT'),
    ('authenticated', 'INSERT'),
    ('authenticated', 'UPDATE')
)
SELECT format('%s %s candidate policy', requested_access.role_name, requested_access.command) AS candidate_policy,
       requested_access.role_name, requested_access.command,
       policy.policyname, policy.permissive, policy.roles, policy.cmd, policy.qual, policy.with_check
FROM requested_access
LEFT JOIN LATERAL (
  SELECT policyname, permissive, roles, cmd, qual, with_check
  FROM pg_policies
  WHERE schemaname = 'public'
    AND tablename = 'site_content'
    AND (roles && ARRAY[requested_access.role_name::name, 'public'::name])
    AND cmd IN (requested_access.command, 'ALL')
) AS policy ON TRUE
ORDER BY requested_access.role_name, requested_access.command, policy.policyname;

-- STOP if query 1 has no single-column primary or unique key, query 2 does not
-- show RLS enabled, or any grant is false. Also STOP unless an authorized operator
-- confirms the candidate-policy semantics: combined SELECT policies permit anon and authenticated public reads;
-- INSERT WITH CHECK permits authenticated writes;
-- UPDATE USING and WITH CHECK permit authenticated writes; and all restrictive
-- policies are accounted for. UPDATE requires SELECT, so its authenticated SELECT
-- prerequisite must remain in place. Only after those conditions are confirmed may
-- the operator separately run supabase/seed-site-content.sql.
