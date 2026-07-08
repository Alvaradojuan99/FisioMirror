/*
# Add auto-profile trigger for physiotherapists

## Problem
The frontend calls supabase.auth.signUp() and then immediately INSERTs into
physiotherapists with id = new_user.id. But signUp() returns before the auth
session is established, so auth.uid() is null at insert time and the RLS
policy WITH CHECK (auth.uid() = id) rejects the insert with:
"new row violates row-level security policy for table physiotherapists".

## Solution
Create a Postgres trigger that fires AFTER INSERT on auth.users and creates
the physiotherapists profile row automatically. The frontend passes
full_name, email, and university via signUp() options.metadata, and the
trigger reads them from raw_user_meta_data to populate the profile.

This way:
- The profile row is created server-side with service-role privileges
  (triggers bypass RLS), so no policy violation.
- The frontend no longer needs to INSERT into physiotherapists; it just
  signs up and then SELECTs the profile.

## Changes
1. Create function `handle_new_physiotherapist()` that inserts a row into
   physiotherapists using NEW.id and metadata from raw_user_meta_data.
2. Create trigger on auth.users AFTER INSERT to call the function.
3. Make both idempotent (DROP IF EXISTS before CREATE).

## Security
- The trigger function runs with SECURITY DEFINER (definer = postgres),
  bypassing RLS. This is the standard Supabase pattern for auto-profiles.
- No new RLS policies needed; existing policies remain intact.
*/

CREATE OR REPLACE FUNCTION public.handle_new_physiotherapist()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.physiotherapists (id, full_name, email, university)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'university', '')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_physiotherapist();