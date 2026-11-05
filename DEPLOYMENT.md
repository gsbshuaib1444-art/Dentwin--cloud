# DENTWIN Cloud — deployment package

This is a deployable Next.js + Supabase starter for the DENTWIN 15-profile pilot.

## Before entering real patient data
This starter is not certified for clinical or research data. Obtain institutional approval for the cloud provider, data location, access, retention, consent/assent, image handling and security. Use fictional data until your institution authorises the setup. Do not collect names, phone numbers, addresses or facial photographs unless explicitly required and approved.

## 1. Create Supabase project
1. Create a Supabase project at https://supabase.com.
2. Open SQL Editor → New query.
3. Paste and run `supabase_setup.sql`.
4. In Project Settings → API, copy the Project URL and `anon`/publishable key.
5. In Authentication settings, enable email/password. Configure email confirmation and allowed redirect URLs for your eventual Vercel domain.

## 2. Run locally
1. Install Node.js 20+.
2. Extract this ZIP and open the folder in a terminal.
3. Copy `.env.example` to `.env.local`.
4. Set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
5. Run:
   ```bash
   npm install
   npm run dev
   ```
6. Open http://localhost:3000.

## 3. Deploy to Vercel
1. Push this folder to a private GitHub repository.
2. Import that repository at https://vercel.com/new.
3. Add the two environment variables from `.env.local` in Vercel Project Settings → Environment Variables.
4. Deploy.
5. Add the Vercel URL to Supabase Authentication → URL Configuration → Site URL and Redirect URLs.
6. Redeploy after changing environment variables.

## Important implementation notes
- Maximum 15 patient rows per authenticated account is enforced by a PostgreSQL trigger, not only by the UI.
- Row Level Security restricts patient rows to the authenticated owner.
- Image bucket is private; files are stored under the authenticated user's UUID and use short-lived signed URLs.
- This starter includes email/password auth, patient CRUD, photo upload and a print-oriented child education poster.
- For a production-ready release, add verified email flows, stronger password policy/MFA, audit logs, data export/deletion workflow, image deletion on patient update, backup/restore testing, retention rules, rate limiting, server-side validation, error monitoring and an institution-approved privacy/security review.
- Never expose the Supabase `service_role` key in browser code or Vercel `NEXT_PUBLIC_*` variables.
