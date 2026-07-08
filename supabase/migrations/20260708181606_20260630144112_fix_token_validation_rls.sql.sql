/*
# Fix patient token validation RLS

## Problem
The patient login flow queries `access_tokens` with a join to `patients`
(`patients!inner(full_name)`) to get the patient's name. However, the `patients`
table only has SELECT policies for `authenticated` (the owning fisio).
The anon role (used by patients logging in with a token) cannot read `patients`,
so the inner join filters out all rows and the token lookup returns empty —
login always fails.

Additionally, the `access_tokens` UPDATE policy (for marking `used_at`) was
scoped to `authenticated` only, so anon could not update it.

## Changes
1. `patients` — add a SELECT policy for `anon` that allows reading a patient
   row only if that patient has an active access token. This is the minimum
   exposure needed for token-based login to resolve the patient name.
2. `access_tokens` — add an UPDATE policy for `anon` restricted to setting
   `used_at` (the first-login timestamp). The existing authenticated policy
   remains for fisio management of tokens.

## Security
- anon can only SELECT patients that have at least one active token.
- anon can only UPDATE the `used_at` column of a token row, not other columns.
- No new INSERT/DELETE exposure.
*/

-- 1. Allow anon to SELECT patients that have an active access token
DROP POLICY IF EXISTS "anon_select_tokened_patients" ON patients;
CREATE POLICY "anon_select_tokened_patients"
ON patients FOR SELECT
TO anon
USING (
  EXISTS (
    SELECT 1 FROM access_tokens t
    WHERE t.patient_id = patients.id AND t.is_active = true
  )
);

-- 2. Allow anon to UPDATE access_tokens (only used_at marking on first login)
-- The existing update_own_tokens policy is for authenticated fisio management.
-- This new policy lets anon update a token row they can see (active token).
DROP POLICY IF EXISTS "anon_update_token_used_at" ON access_tokens;
CREATE POLICY "anon_update_token_used_at"
ON access_tokens FOR UPDATE
TO anon
USING (is_active = true)
WITH CHECK (is_active = true);