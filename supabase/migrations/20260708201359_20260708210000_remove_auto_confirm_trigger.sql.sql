/*
# Remove auto-confirm email trigger

## Reason
The app now requires proper email verification on signup and password reset.
The auto-confirm trigger (which set email_confirmed_at = now() on every new
user) must be removed so that Supabase's built-in email verification flow
works correctly — users will receive a verification email/link after signup.

## Changes
1. Drop the `on_auth_user_auto_confirm` trigger on auth.users.
2. Drop the `auto_confirm_email` function.

## Security
- No RLS changes. Existing users keep their confirmed status.
- New users will need to verify their email before they can log in.
*/

DROP TRIGGER IF EXISTS on_auth_user_auto_confirm ON auth.users;
DROP FUNCTION IF EXISTS public.auto_confirm_email();