# Study Tracker Cloud

A free-friendly account-based study tracker using:

- Supabase Auth for login and signup
- Supabase Postgres for study entries
- a static frontend deployable on Vercel Hobby

## Files you need

- `index.html`, `styles.css`, `script.js`
- `config.js`
- `supabase-schema.sql`
- `vercel.json`

## Supabase setup

1. Create a new Supabase project.
2. In Supabase, open the SQL Editor.
3. Run the SQL from `supabase-schema.sql`.
4. In Authentication -> Providers -> Email, enable email auth.
5. In Authentication -> URL Configuration, add your local URL and future Vercel URL.
6. In Project Settings -> API, copy:
   - Project URL
   - anon public key
7. Paste those values into `config.js`.

Example:

```js
window.STUDY_TRACKER_SUPABASE_URL = "https://your-project-ref.supabase.co";
window.STUDY_TRACKER_SUPABASE_ANON_KEY = "your-supabase-anon-key";
```

## Run locally

Open `index.html` in your browser after filling in `config.js`.

## Deploy to Vercel for free

1. Push this folder to a GitHub repository.
2. In Vercel, create a new project from that repository.
3. Use the default static deployment settings.
4. Make sure the committed `config.js` contains your real Supabase URL and anon key.
5. Deploy.

## Important notes

- The Supabase anon key is safe to expose in a browser app. Row Level Security protects each user's data.
- If email confirmation is enabled in Supabase, new users may need to confirm their email before signing in.
- The old Node/Render backend is no longer needed for the free Vercel + Supabase deployment path.
