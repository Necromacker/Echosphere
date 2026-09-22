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
| Production logs are empty — no `✅ MongoDB connected`, no startup lines | Winston level is `info` by default now, but on an older deploy `NODE_ENV=production` suppressed all info logs. Redeploy with the logger fix or set `LOG_LEVEL=info` on Render. The `username_1` warning proving Mongo connected only prints *after* a successful connect |
| `/api/health` returns plain-text 404 with a `vercel.app` CORS header | You're hitting a **stale service** that still owns the hostname. Copy the exact URL from the Render **service whose logs show the new code** (its subdomain differs if `echosphere-api` was taken), update `VITE_API_URL`, and redeploy |
| CORS errors in browser console | `CLIENT_URL` on Render mismatches Netlify URL (trailing slash / http vs https). Test with `curl -I -X OPTIONS -H 'Origin: https://your-site.netlify.app' <backend>/api/health` — a missing `access-control-allow-origin` header = still not whitelisted |
| API calls return `index.html` | `VITE_API_URL` unset at build time — set in `netlify.toml` and redeploy |
| First request takes ~30–60s | Free-tier cold start after idle — expected; the `/api/health` endpoint warms it up |
| Build/OOM failure | `@xenova/transformers` + LangChain are memory-heavy. On free instances (512 MB) upgrade to paid if reproducible |
| Job lists empty / old | Redis cache stale — run `clearJobsCache()` or temporarily `REDIS_ENABLED=false` |
| 401s after JWT changes | Restart login; tokens signed with old secrets are rejected |
| Render logs `[Agora] Failed to start AI agent (delayed): Request failed with status code 401` | Agora REST API rejected your **Customer ID / Customer Secret** (or an **`AGORA_BASIC_AUTH`** that overrides them). Copy the pair fresh from **Agora Console → Project Management → your project → RESTful API**. If `AGORA_BASIC_AUTH` is set on Render it wins over `AGORA_CUSTOMER_ID`/`AGORA_CUSTOMER_SECRET` — delete the stale value. New deploy → **Manual Deploy** (env changes never auto-deploy) |
| Browser console `AgoraRTCError CAN_NOT_GET_GATEWAY_SERVER: no active status` during `client.join()` | The App ID isn't an active Agora project. Verify `AGORA_APP_ID` matches a project with **Real-Time Communication (RTC)** activated and the **Conversational AI Agent** product enabled. A project created in the wrong region/account or an expired/free-tier-quota project returns `no active status`. Test the App ID with Agora's official [web demo](https://webdemo.agora.io/basicVideoCall/) before wiring it here |
| After fixing credentials, agent still won't speak (`TaskConflict` / 409s) | The in-memory `activeAgents` map lost the agent ID after a server redeploy, so new launches use the same channel name while the old agent still runs. Call the `/stop` endpoint or wait for `idle_timeout` before retrying |

## 8. Agora credentials cheat-sheet (where each value lives)

| Env var | Found in Agora Console | Notes |
|---|---|---|
| `AGORA_APP_ID` | Project Management → project → **App ID** | Must be an enabled project with RTC activated |
| `AGORA_APP_CERTIFICATE` | Project Management → project → **App Certificate** (enable it first) | Required — server mints RTC tokens with it; the browser **and** the AI agent both need tokens |
| `AGORA_CUSTOMER_ID` | Project Management → project → **RESTful API** | Used for Basic auth to the Conversational AI REST API |
| `AGORA_CUSTOMER_SECRET` | Project Management → project → **RESTful API** | Same project as the App ID — mismatched pairs → 401 |
| `AGORA_BASIC_AUTH` | *optional* — precomputed `base64(customerId:customerSecret)` | If set, it **overrides** the two fields above |
| `AGORA_PIPELINE_ID` | Conversational AI Studio → your published agent | Guides which TTS/LLM/ASR config the agent uses |