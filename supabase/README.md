# Supabase backend

This app uses Supabase Auth, Postgres, and private Storage for report PDFs.

## Deploy

1. Create a Supabase project.
2. Run the migration in `migrations/202606140001_backend.sql`.
3. Deploy the Edge Functions:

```bash
supabase functions deploy verify-result-access
supabase functions deploy cleanup-expired-report-files
```

4. Add a daily scheduled invocation for `cleanup-expired-report-files` in Supabase so expired report files are removed automatically.
5. Add the browser env vars from `.env.example` to local `.env` and your hosting provider.

## First admin

Create the staff user in Supabase Auth, then promote the user:

```sql
update public.profiles
set role = 'admin'
where email = 'admin@example.com';
```

Reports are stored in the private `reports` bucket. The frontend stores only `report_path`, file name, upload date, and `report_expires_at`; clients receive a short-lived signed URL only after phone/password verification.
