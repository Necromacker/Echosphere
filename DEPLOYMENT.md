# 🌐 Echosphere — Deployment Guide

Full-stack hosting split across two platforms:

| Component | Host | URL |
|---|---|---|
| **Backend** — Express + Socket.io (`backend/`) | [Render](https://render.com) Web Service | `https://echosphere-api.onrender.com` |
| **Frontend** — React + Vite (`frontend/`) | [Netlify](https://netlify.com) static site | `https://<site>.netlify.app` |

Deploy configs live in this repo: [`render.yaml`](render.yaml) (Render Blueprint) and [`frontend/netlify.toml`](frontend/netlify.toml).

---

## 1. One-time prerequisites

1. **MongoDB Atlas** → Network Access → **Allow Access from Anywhere** (`0.0.0.0/0`). Render's servers use dynamic IPs, so a home-IP whitelist will not work in production.
2. Generate two random secrets (used for `JWT_SECRET` / `JWT_REFRESH_SECRET`):
   ```bash
   openssl rand -hex 64
   ```
3. Keep your local `backend/.env` at hand — every value (except `PORT` & local Redis) is reused in Render.

## 2. Backend → Render

> **Blueprint route (recommended, uses `render.yaml`):**
> 1. Push this repo to GitHub, then open
>    `https://dashboard.render.com/select-repo?type=blueprint`
> 2. Select the repo → Render reads `render.yaml` → first deploy
> 3. Fill in every `sync: false` secret (prompted during setup)
> 4. Wait for the build, then verify:
>    ```bash
>    curl https://echosphere-api.onrender.com/api/health
>    # → {"success":true,"message":"OK",...}
>    ```

> **Dashboard route (manual):** Render → **New → Web Service** →
> Root Directory `backend` · Runtime **Node** · Build `npm install` ·
> Start `npm start` · then add the env vars below manually.

### Backend environment (Render)
| Key | Value |
|---|---|
| `NODE_ENV` | `production` |
| `CLIENT_URL` | `https://<your-site>.netlify.app` — **must match exactly** (CORS + Socket.io origin check) |
| `REDIS_ENABLED` | `false` initially (see §5 to enable) |
| `MONGO_URI` | Atlas connection string |
| `JWT_SECRET` / `JWT_REFRESH_SECRET` | `openssl rand -hex 64` output |
| `GROQ_API_KEY` (+`GROQ_MODEL`) | Groq console |
| `RESEND_API_KEY`, `PINECONE_API_KEY` | dashboard keys |
| `CLOUDINARY_CLOUD_NAME` / `_API_KEY` / `_API_SECRET` | Cloudinary dashboard |
| `ADZUNA_APP_ID` / `ADZUNA_APP_KEY` / `ADZUNA_COUNTRY` | Adzuna portal |
| `AGORA_APP_ID`, `AGORA_APP_CERTIFICATE`, `AGORA_CUSTOMER_ID`, `AGORA_CUSTOMER_SECRET`, `AGORA_BASIC_AUTH`, `AGORA_PIPELINE_ID` | Agora console |
| `PORT` | *(auto-injected by Render — do not set)* |

After changing env vars: **Manual Deploy → Deploy** (env changes never auto-deploy).

## 3. Frontend → Netlify

1. In [`frontend/netlify.toml`](frontend/netlify.toml) set `VITE_API_URL` to your Render URL:
   ```toml
   [build.environment]
     VITE_API_URL = "https://echosphere-api.onrender.com/api"
   ```
   > ⚠️ `VITE_*` vars are baked in **at build time** — a plain env edit on
   > Netlify does nothing until you redeploy with them set.
2. Netlify → **Add new site → Import an existing project** → pick GitHub repo.
3. Settings are auto-read from `netlify.toml` (**Base directory `frontend`** ·
   build `npm ci && npm run build` · publish dir `dist` relative to base ·
   SPA redirect `/* → /index.html`).
   > ⚠️ If you configure these in the Netlify **UI**, the UI values **override**
   > `netlify.toml`. If your build ran at the repo root and failed with
   > `Missing script "build"`, you forgot the **Base directory = `frontend`**
   > in **Build & deploy → Continuous deployment → Build settings**.

## 4. Optional: CI/CD via GitHub Actions

Two workflows are included:

- **[`ci.yml`](.github/workflows/ci.yml)** — on every push/PR: backend `npm ci` + syntax check, frontend production build.
- **[`deploy.yml`](.github/workflows/deploy.yml)** — on `main` pushes, **path-filtered** deploy-hook triggers (backend/Netlify only build when their code changed).

To activate deploy hooks:

1. **Render:** Dashboard → your service → **Settings → Deploy Hook** → copy URL.
   → GitHub repo → **Settings → Secrets and variables → Actions** → add `RENDER_DEPLOY_HOOK_URL`.
2. **Netlify:** Site → **Build & deploy → Build hooks** → add a hook → copy URL.
   → GitHub repo → add secret `NETLIFY_BUILD_HOOK_URL`.

(If you'd rather keep it dumb-simple: skip the workflow hooks — Git-connected deploys on both platforms rebuild on every push automatically. The hooks exist to *skip* irrelevant rebuilds.)

## 5. Enabling Redis (Upstash free tier)

The app runs fine with Redis off (`REDIS_ENABLED=false`). To enable caching:

1. Create a free DB at <https://upstash.com> (follow [Upstash | Redis](https://upstash.com/docs))
2. Render dashboard → copy the `rediss://<user>:<pass>@...` URL into `REDIS_URL`
3. Set `REDIS_ENABLED=true` → **Redeploy**
4. Check logs for `[Redis] Redis Connected`

## 6. Post-deploy verification checklist

- [ ] `curl https://echosphere-api.onrender.com/api/health` → `200 OK`
- [ ] Register / login on the Netlify site (auth → JWT via Render)
- [ ] Run a complete AI interview session (Groq + embeddings + Agora voice)
- [ ] Client-side React Router deep links render (SPA redirect working)
- [ ] Render logs show no `[GROQ] Warning` or `[CORS] Rejected origin` lines
- [ ] `CLIENT_URL` matches the exact Netlify origin in your browser

## 7. Troubleshooting

| Symptom | Cause / Fix |
|---|---|
| CORS errors in browser console | `CLIENT_URL` on Render mismatches Netlify URL (trailing slash / http vs https) |
| API calls return `index.html` | `VITE_API_URL` unset at build time — set in `netlify.toml` and redeploy |
| First request takes ~30–60s | Free-tier cold start after idle — expected; the `/api/health` endpoint warms it up |
| Build/OOM failure | `@xenova/transformers` + LangChain are memory-heavy. On free instances (512 MB) upgrade to paid if reproducible |
| Job lists empty / old | Redis cache stale — run `clearJobsCache()` or temporarily `REDIS_ENABLED=false` |
| 401s after JWT changes | Restart login; tokens signed with old secrets are rejected |