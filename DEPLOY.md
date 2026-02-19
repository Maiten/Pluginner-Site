# Deploying the Beta Tester Site (Secure)

## Architecture

```
Browser → Vercel (static HTML + serverless API routes)
                ↓
         Supabase (database + file storage)

Password check:  POST /api/verify  → sets HTTP-only cookie (server-side, not in HTML source)
Session check:   GET  /api/check   → validates cookie
Download:        GET  /api/download → validates cookie → returns signed Supabase Storage URL
Form data:       Direct to Supabase REST API (anon key, RLS-protected)
```

Nothing secret is exposed in the client-side code. The password lives only in Vercel environment variables. Downloads require a valid server-issued cookie.

---

## 1. Supabase Setup

### Database (SQL Editor)

1. Go to your Supabase project → **SQL Editor** → New Query
2. Paste the entire contents of `supabase-schema.sql` and click **Run**

### Storage (for the download file)

1. Go to **Storage** in the left sidebar
2. Click **New Bucket**
3. Name: `beta-downloads`
4. **Public**: OFF (this is a private bucket)
5. Click **Create**
6. Click into the `beta-downloads` bucket
7. Upload your zip file (e.g., `PluginnerFX-beta.zip`)

### Preparing the zip file

On your Mac, from the installed plugin locations:
```bash
mkdir -p /tmp/pluginner-beta
cp -R ~/Library/Audio/Plug-Ins/VST3/PluginnerFX.vst3 /tmp/pluginner-beta/
cp -R ~/Library/Audio/Plug-Ins/Components/PluginnerFX.component /tmp/pluginner-beta/
cd /tmp/pluginner-beta
zip -r ~/Desktop/PluginnerFX-beta.zip PluginnerFX.vst3 PluginnerFX.component
```

Upload `PluginnerFX-beta.zip` to the `beta-downloads` bucket in Supabase Storage.

### Get your service role key

1. Go to **Settings** → **API**
2. Under **Project API keys**, find the **service_role** key (the secret one, NOT the anon/public one)
3. Copy it — you'll need it for Vercel environment variables

---

## 2. Vercel Setup

### Deploy

**Option A: GitHub (recommended)**
1. Push `site/beta/` to a GitHub repo
2. Vercel → **Add New** → **Project** → import the repo
3. Set **Root Directory** to `site/beta`
4. Framework preset: **Other** → Deploy

**Option B: Vercel CLI**
```bash
cd site/beta && npx vercel
```

### Environment Variables

In Vercel → **Settings** → **Environment Variables**, add:

| Variable | Value |
|----------|-------|
| `BETA_PASSWORD` | `90210` |
| `SUPABASE_URL` | `https://rdwafvmldnybnssyyrmc.supabase.co` |
| `SUPABASE_SERVICE_KEY` | *(your service_role key from Supabase)* |
| `DOWNLOAD_FILENAME` | `PluginnerFX-beta.zip` |

**Redeploy after adding env vars.**

---

## 3. Security Summary

| Attack | Protection |
|--------|-----------|
| View source to find password | Password is NOT in HTML — verified server-side |
| Guess download URL | Private Supabase Storage bucket, no public URL |
| Share a download link | Signed URLs expire after 10 minutes |
| Access API without password | HTTP-only cookie required, HMAC-signed |
| Submit fake form data | Low risk — it's only beta feedback data |

---

## 4. Updating the Download

1. Supabase → Storage → `beta-downloads` → delete old zip → upload new zip
2. Keep the same filename (or update `DOWNLOAD_FILENAME` in Vercel env vars)
3. No code changes needed
