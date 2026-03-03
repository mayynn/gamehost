<![CDATA[<div align="center">

# 🎮 GameHost Platform

**Production-grade game server hosting built on [Pterodactyl Panel](https://pterodactyl.io/)**

Automated billing · One-click plugins · VPS reselling · Admin dashboard

[![Node](https://img.shields.io/badge/Node-20-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![NestJS](https://img.shields.io/badge/NestJS-10-E0234E?logo=nestjs&logoColor=white)](https://nestjs.com/)
[![Next.js](https://img.shields.io/badge/Next.js-14-000?logo=next.js&logoColor=white)](https://nextjs.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169E1?logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Docker](https://img.shields.io/badge/Docker-Ready-2496ED?logo=docker&logoColor=white)](https://www.docker.com/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

</div>

---

## ✨ Features

<table>
<tr><td>🔐</td><td><b>Auth</b></td><td>Google + Discord OAuth, Email signup/login with verification & password reset, JWT sessions, Pterodactyl account auto-heal</td></tr>
<tr><td>🖥️</td><td><b>Servers</b></td><td>Provision, power control, live console (WebSocket), file manager (rename, create folder), backups (delete, download), databases (delete), reinstall, network, startup vars</td></tr>
<tr><td>📋</td><td><b>Plans</b></td><td>Free / Premium / Custom builder with slider pricing, dynamic node assignment</td></tr>
<tr><td>💳</td><td><b>Billing</b></td><td>Razorpay, Cashfree, UPI manual (admin approval), wallet balance, auto-renewal lifecycle</td></tr>
<tr><td>🪙</td><td><b>Credits</b></td><td>Ad-based earning (AdSense + Adsterra), auto-suspend at 0 credits, auto-delete after inactivity</td></tr>
<tr><td>🧩</td><td><b>Plugins</b></td><td>Search Modrinth + SpigotMC (with version history), one-click install, server software detection</td></tr>
<tr><td>👥</td><td><b>Players</b></td><td>Whitelist, ban/unban, op/deop, kick — Minecraft auto-detection</td></tr>
<tr><td>☁️</td><td><b>VPS</b></td><td>Datalix reseller — custom pricing (cost vs sell), provision, control, auto-billing, renewal, auto-suspend/terminate</td></tr>
<tr><td>⚡</td><td><b>Admin</b></td><td>Dashboard stats, user/server management, plan CRUD, UPI queue, VPS plan management (sync, pricing, profit stats), alt account detection, settings, audit logs</td></tr>
<tr><td>🤖</td><td><b>Discord</b></td><td>Bot logs payments, signups, server creation, errors as rich embeds</td></tr>
<tr><td>🌐</td><td><b>Cloudflare</b></td><td>Auto-subdomain creation (A + SRV records for Minecraft)</td></tr>
<tr><td>🧾</td><td><b>Paymenter</b></td><td>External billing panel integration — products, orders, invoices, coupons</td></tr>
</table>

---

## 📦 What You Need Before Starting

You need a **Linux VPS** (Ubuntu 20.04 or newer recommended) and a **Pterodactyl Panel** already setup.

### Install Docker & Docker Compose

If you don't have Docker yet, run this on your VPS:

```bash
# Update system packages
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com | sh

# Add your user to docker group (so you don't need sudo)
sudo usermod -aG docker $USER

# Log out and log back in for the group change to work
exit
```

Log back in via SSH, then verify:

```bash
docker --version
docker compose version
```

You should see version numbers. If `docker compose` doesn't work, try `docker-compose` — both are supported.

### Install Git

```bash
sudo apt install git -y
git --version
```

---

## 🚀 Full Production Deployment Guide (Step by Step)

> This guide assumes you have a fresh Ubuntu VPS with Docker installed. Follow every step in order.

### Step 1 — Connect to your VPS

```bash
ssh root@your-server-ip
```

### Step 2 — Clone the project

```bash
cd /
git clone https://github.com/your-org/gamehost.git
cd gamehost
```

> `/gamehost` is the recommended location. You can use any directory.

### Step 3 — Run the installer

```bash
bash install.sh
```

This single command does everything:

- ✅ Creates `nginx/ssl` and `backups` directories
- ✅ **If `.env` does NOT exist** → copies `.env.example` → `.env` and generates random passwords for JWT, sessions, database, and Redis
- ✅ **If `.env` already exists** → merges missing keys from `.env.example`, preserves your existing config and secrets
- ✅ Syncs DATABASE_URL and REDIS_URL connection strings
- ✅ Auto-detects domain/VPS IP and syncs OAuth redirect URLs
- ✅ Validates SMTP and shows email login status
- ✅ Builds all 5 Docker containers from scratch
- ✅ Starts PostgreSQL 16, Redis 7, Backend, Frontend, and Nginx
- ✅ Waits for the database to be ready
- ✅ Runs Prisma database migrations to create all tables
- ✅ Health check with DB/Redis status and response time

> **💡 Safe to run again:** If you already ran `install.sh` before and have a `.env` file, running it again will NOT overwrite your secrets or config. It will just rebuild and restart everything.

Wait for it to finish. You'll see:

```
============================================
 GameHost installed successfully!
============================================

 Frontend: http://localhost:3000
 Backend:  http://localhost:4000
```

### Step 4 — Verify everything is running

```bash
docker compose ps
```

You should see 5 containers, all showing `Up`:

```
gamehost-db        Up (healthy)
gamehost-redis     Up (healthy)
gamehost-backend   Up
gamehost-frontend  Up
gamehost-nginx     Up
```

### Step 5 — Check health endpoint

```bash
curl http://localhost:4000/api/health
```

You should see `"status":"ok"` with database and redis both `"connected"`.

### Step 6 — Open in browser

Open `http://your-server-ip` in your browser. You should see the landing page.

> **⚠️ OAuth login won't work yet** — you need to configure OAuth keys first. Email login works immediately if SMTP is configured. Continue to Step 7.

### Step 7 — Configure OAuth & Pterodactyl

```bash
nano /gamehost/.env
```

Find and update these lines with your actual values:

```env
# Your domain or IP
APP_URL=https://yourdomain.com
BACKEND_URL=https://yourdomain.com
# Leave NEXT_PUBLIC_API_URL empty — Nginx handles routing
NEXT_PUBLIC_API_URL=

# Google OAuth — get from https://console.cloud.google.com/apis/credentials
GOOGLE_CLIENT_ID=your-client-id-here
GOOGLE_CLIENT_SECRET=your-client-secret-here
GOOGLE_CALLBACK_URL=https://yourdomain.com/api/auth/google/callback

# Discord OAuth — get from https://discord.com/developers/applications
DISCORD_CLIENT_ID=your-client-id-here
DISCORD_CLIENT_SECRET=your-client-secret-here
DISCORD_CALLBACK_URL=https://yourdomain.com/api/auth/discord/callback

# Pterodactyl Panel — your existing panel
PTERODACTYL_URL=https://panel.yourdomain.com
PTERODACTYL_APP_KEY=ptla_your-application-api-key
PTERODACTYL_CLIENT_KEY=ptlc_your-client-api-key
```

Save the file (`Ctrl+X`, then `Y`, then `Enter`).

### Step 8 — Restart to apply changes

```bash
cd /gamehost
bash restart.sh
```

### Step 9 — Test login

1. Open `https://yourdomain.com` in your browser
2. Click **Login with Google**, **Login with Discord**, or use **Email signup**
3. You should be redirected to your dashboard

### Step 10 — Make yourself admin

After logging in for the first time, you need to promote your account to admin via the database:

```bash
cd /gamehost

# Open the database
docker compose exec postgres psql -U gamehost -d gamehost

# Find your user (lists all users)
SELECT id, email, name, role FROM "User";

# Copy YOUR email from the list, then run:
UPDATE "User" SET role = 'ADMIN' WHERE email = 'your-email@gmail.com';

# Verify it worked
SELECT email, role FROM "User" WHERE email = 'your-email@gmail.com';

# Exit database
\q
```

Now when you refresh the website, you'll have access to the **Admin Dashboard** at `/admin`.

### Step 11 — Create your first hosting plan

1. Go to `/admin` on your website
2. Click on **Plans** and create a new plan
3. Set the name, resource limits (RAM, CPU, disk), pricing, and select which eggs (server types) are available
4. Users can now create servers using this plan

### 🎉 Done! Your hosting platform is live.

---

## 🐳 Docker Architecture

The platform runs 5 containers optimized for VPS deployment:

```
Internet ──► :80/:443 ──► Nginx (128MB)
                            ├── /api/  ──► Backend:4000 (512MB) ──► PostgreSQL:5432 (512MB)
                            │                                   └── Redis:6379 (256MB)
                            └── /      ──► Frontend:3000 (256MB)
```

**VPS hardening applied:**

| Feature | Detail |
|---------|--------|
| Network isolation | DB, Redis, Backend, Frontend bound to `127.0.0.1` — only Nginx faces the internet |
| Non-root containers | Backend & Frontend run as `appuser:1001`, not root |
| Signal handling | `dumb-init` as PID 1 for proper SIGTERM forwarding (graceful shutdown) |
| Memory limits | Per-container limits prevent any single service from OOM-killing the VPS |
| Log rotation | `json-file` driver with `max-size` + `max-file` so logs never fill your disk |
| Redis tuning | `maxmemory 128mb` with LRU eviction, password-protected, RDB persistence |
| Nginx optimization | `epoll`, upstream keepalive, proxy buffering, open file cache, WebSocket `map` |
| Rate limiting | 30 req/s API, 5 req/min auth — returns proper HTTP 429 |
| Security headers | HSTS-ready, X-Frame-Options, CSP-compatible, Permissions-Policy, `server_tokens off` |

---

## 💻 GitHub Codespaces

The project includes a `.devcontainer/devcontainer.json` for one-click development in GitHub Codespaces.

1. Open the repo on GitHub
2. Click **Code** → **Codespaces** → **Create codespace on main**
3. Wait for the container to build (Docker-in-Docker + Node 20 are auto-installed)
4. Run `bash install.sh` in the terminal
5. Port 80 auto-forwards — click the URL to open your instance

> Codespaces uses Docker-in-Docker, so all 5 containers run inside the codespace. Internal ports (3000, 4000, 5432, 6379) are silenced — only port 80 (Nginx) auto-opens.

---

## ❓ Troubleshooting

### "Refused to connect" when clicking Login

**Why it happens:**

When you click "Login with Google", your browser is redirected to Google for authentication. After you log in, Google sends your browser back to the `GOOGLE_CALLBACK_URL` from your `.env` file. If this URL still says `http://localhost:4000/...`, your browser tries to connect to `localhost` — which is your own computer, not the VPS. Your computer has nothing running on port 4000, so it says "refused to connect".

```
  You click Login ──► Google ──► Google sends you back to CALLBACK_URL
                                         │
              If CALLBACK_URL = localhost ──► Your computer ──► ❌ Refused
              If CALLBACK_URL = yourdomain ──► Your VPS ──► ✅ Works
```

**How to fix:**

1. Open your `.env`:

```bash
nano /gamehost/.env
```

2. Update ALL three URL-related settings to your actual domain:

```env
APP_URL=https://yourdomain.com

GOOGLE_CALLBACK_URL=https://yourdomain.com/api/auth/google/callback
DISCORD_CALLBACK_URL=https://yourdomain.com/api/auth/discord/callback
```

3. **Also update Google Cloud Console:**

   - Go to [Google Cloud Console → Credentials](https://console.cloud.google.com/apis/credentials)
   - Click your OAuth 2.0 Client
   - Under **Authorized redirect URIs**, add: `https://yourdomain.com/api/auth/google/callback`
   - Remove the old `http://localhost:4000/...` entry
   - Click **Save**

4. Rebuild and restart:

```bash
cd /gamehost
docker compose down && docker compose up -d --build
```

> **Note:** `NEXT_PUBLIC_API_URL` should be left **empty** in your `.env` — the frontend uses relative URLs that go through Nginx automatically. You do NOT need to set it to your domain.

### Backend returns 404 on `/`

This is normal. The backend API lives under `/api/`. Use these URLs:

| What | URL |
|------|-----|
| Root (info) | `http://your-ip/` or `http://your-ip:4000/` |
| Health check | `http://your-ip/api/health` |
| Login | `http://your-ip/api/auth/google` |

---

## 🔁 Auto-Restart on VPS Reboot

All containers are configured with `restart: unless-stopped` in `docker-compose.yml`. This means:

- ✅ **If your VPS reboots** — all 5 containers (database, redis, backend, frontend, nginx) will restart automatically
- ✅ **If a container crashes** — Docker will restart it automatically
- ❌ Containers will NOT restart only if you manually stop them with `docker compose down`

**To verify auto-restart is working:**

```bash
# Check restart policy
docker inspect gamehost-backend --format '{{.HostConfig.RestartPolicy.Name}}'
# Should output: unless-stopped
```

**If you want containers to start even after `docker compose down`**, change the policy to `always`:

```bash
nano /gamehost/docker-compose.yml
# Change "restart: unless-stopped" to "restart: always" for each service
```

**To test it:**

```bash
# Reboot your VPS
sudo reboot

# After reconnecting via SSH, check containers are running
ssh root@your-server-ip
docker compose -f /gamehost/docker-compose.yml ps
```

---

## 🔄 How to Update (When You Push New Code)

### From your VPS (one command)

```bash
cd /gamehost
bash update.sh
```

This does everything safely:

- ✅ Auto-backs up database before any changes
- ✅ Pulls latest code from Git (`git pull --rebase`)
- ✅ Merges new .env keys from .env.example (without overwriting existing values)
- ✅ Re-syncs OAuth redirect URLs based on your resolved domain/IP
- ✅ Rebuilds all containers from scratch
- ✅ Graceful restart (data services stay up during rebuild)
- ✅ Runs any new database migrations (Prisma migrate deploy)
- ✅ Health check with response time
- ✅ **Your `.env`, database data, and backups are NEVER touched**

### Manual update (step by step)

If you prefer to do it yourself:

```bash
cd /gamehost

# 1. Pull latest code
git pull

# 2. Rebuild containers
docker compose build --no-cache

# 3. Restart everything
docker compose down
docker compose up -d

# 4. Run any new database migrations
docker compose exec backend npx prisma migrate deploy
```

### Update workflow from your local machine

If you're developing locally and want to deploy changes:

```bash
# On your LOCAL machine — push changes
git add .
git commit -m "your changes"
git push

# On your VPS — pull and update
ssh root@your-server-ip
cd /gamehost
bash update.sh
```

---

## 💾 Backups

### Create a backup now

```bash
cd /gamehost
bash backup.sh
```

Creates a compressed database dump at `./backups/gamehost_YYYYMMDD_HHMMSS.sql.gz`.  
Auto-deletes backups older than 30 days.

### Advanced backup options

```bash
bash backup.sh --verify              # verify backup integrity (checksums)
bash backup.sh --encrypt             # encrypt with GPG (set GPG_PASSPHRASE in .env)
bash backup.sh --full                # include Docker volumes (pgdata, redisdata)
bash backup.sh --remote              # copy to remote server (set BACKUP_REMOTE_* in .env)
bash backup.sh --full --verify --encrypt   # combine options
```

### Set up automatic daily backups

```bash
crontab -e
```

Add this line at the bottom:

```
0 3 * * * cd /gamehost && bash backup.sh >> /var/log/gamehost-backup.log 2>&1
```

This runs a backup every day at 3 AM.

### List your backups

```bash
ls -lh /gamehost/backups/
```

### Restore from a backup

```bash
cd /gamehost

# Decompress the backup file
gunzip -k ./backups/gamehost_20260301_030000.sql.gz

# Restore into the database
cat ./backups/gamehost_20260301_030000.sql | docker compose exec -T postgres psql -U gamehost -d gamehost

# Restart backend
docker compose restart backend
```

---

## 🔒 SSL / HTTPS Setup

### Option A — Let's Encrypt (Free SSL)

```bash
# 1. Install Certbot on your VPS
sudo apt install certbot -y

# 2. Stop Nginx so Certbot can use port 80
cd /gamehost
docker compose stop nginx

# 3. Get your certificate
sudo certbot certonly --standalone -d yourdomain.com

# 4. Copy certificate files to the project
sudo cp /etc/letsencrypt/live/yourdomain.com/fullchain.pem ./nginx/ssl/fullchain.pem
sudo cp /etc/letsencrypt/live/yourdomain.com/privkey.pem ./nginx/ssl/privkey.pem

# 5. Start Nginx again
docker compose start nginx
```

Now edit `nginx/nginx.conf`:

```bash
nano nginx/nginx.conf
```

Uncomment these lines (remove the `#` at the start):

```nginx
listen 443 ssl http2;
ssl_certificate     /etc/nginx/ssl/fullchain.pem;
ssl_certificate_key /etc/nginx/ssl/privkey.pem;
ssl_protocols       TLSv1.2 TLSv1.3;
ssl_ciphers         HIGH:!aNULL:!MD5;
ssl_prefer_server_ciphers on;
ssl_session_cache   shared:SSL:10m;
ssl_session_timeout 10m;
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
```

Also uncomment the HTTP → HTTPS redirect block near the top of the file.

Restart Nginx:

```bash
docker compose restart nginx
```

Set up auto-renewal so your certificate doesn't expire:

```bash
crontab -e
```

Add:

```
0 */12 * * * certbot renew --quiet --pre-hook "cd /gamehost && docker compose stop nginx" --post-hook "cd /gamehost && docker compose start nginx"
```

### Option B — Cloudflare (Easiest, recommended)

Cloudflare gives you **free SSL, CDN, and DDoS protection** with zero commands. No certificates to manage.

**Step 1 — Add your domain to Cloudflare:**

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com/) → **Add a Site**
2. Enter your domain name → Select the **Free** plan
3. Cloudflare will scan your existing DNS records

**Step 2 — Create an A record:**

| Type | Name | Content | Proxy |
|------|------|---------|-------|
| A | `@` (or `yourdomain.com`) | `YOUR_VPS_IP` | ☁️ **ON** (orange cloud) |

> With proxy ON (orange cloud), Cloudflare handles SSL, hides your real IP, and provides CDN caching.

**Step 3 — Set SSL mode:**

1. Go to **SSL/TLS** in Cloudflare dashboard
2. Set encryption mode to **Full** (not "Full Strict")
3. This works because your Nginx listens on port 80, and Cloudflare handles HTTPS for visitors

```
Visitor ──HTTPS──► Cloudflare ──HTTP──► Your VPS (port 80) ──► Nginx
```

**Step 4 — Update your nameservers:**

1. Cloudflare will give you 2 nameservers (e.g. `ada.ns.cloudflare.com`)
2. Go to your domain registrar (where you bought the domain)
3. Replace the current nameservers with Cloudflare's
4. Wait 5-30 minutes for DNS to propagate

**Step 5 — Update your `.env`:**

```bash
nano /gamehost/.env
```

```env
APP_URL=https://yourdomain.com
GOOGLE_CALLBACK_URL=https://yourdomain.com/api/auth/google/callback
DISCORD_CALLBACK_URL=https://yourdomain.com/api/auth/discord/callback
```

**Step 6 — Rebuild:**

```bash
cd /gamehost
docker compose down && docker compose up -d --build
```

**Step 7 — Update Google Console redirect URI:**

Go to [Google Cloud Console → Credentials](https://console.cloud.google.com/apis/credentials) → your OAuth client → add `https://yourdomain.com/api/auth/google/callback` to **Authorized redirect URIs**.

✅ Done! Your site now has HTTPS with zero certificates to manage.

---

## ⚙️ All Configuration Options

Edit `.env` to configure. After any changes:

```bash
cd /gamehost
docker compose down
docker compose up -d
```

### Required Settings

| Variable | What It Is | Where to Get It |
|----------|-----------|----------------|
| `APP_URL` | Your website URL | Your domain, e.g. `https://yourdomain.com` |
| `NEXT_PUBLIC_API_URL` | Leave **empty** (Nginx handles it) | Don't set this unless your backend runs on a different host |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID | [Google Cloud Console](https://console.cloud.google.com/apis/credentials) |
| `GOOGLE_CLIENT_SECRET` | Google OAuth secret | Same as above |
| `GOOGLE_CALLBACK_URL` | Google redirect URL | `https://yourdomain.com/api/auth/google/callback` |
| `DISCORD_CLIENT_ID` | Discord OAuth client ID | [Discord Developer Portal](https://discord.com/developers/applications) |
| `DISCORD_CLIENT_SECRET` | Discord OAuth secret | Same as above |
| `DISCORD_CALLBACK_URL` | Discord redirect URL | `https://yourdomain.com/api/auth/discord/callback` |
| `PTERODACTYL_URL` | Your Pterodactyl panel URL | Your panel URL, e.g. `https://panel.yourdomain.com` |
| `PTERODACTYL_APP_KEY` | Pterodactyl Application API key | Panel → Admin → Application API |
| `PTERODACTYL_CLIENT_KEY` | Pterodactyl Client API key | Panel → Account → API Credentials |

### Optional Settings

<details>
<summary><b>💳 Razorpay Payments</b></summary>

```env
RAZORPAY_ENABLED=true
RAZORPAY_KEY_ID=rzp_live_xxxxxxxxxx
RAZORPAY_KEY_SECRET=your-secret
RAZORPAY_WEBHOOK_SECRET=your-webhook-secret
```
Get keys: [Razorpay Dashboard](https://dashboard.razorpay.com/app/keys)  
Set webhook URL in Razorpay dashboard: `https://yourdomain.com/api/billing/razorpay/webhook`
</details>

<details>
<summary><b>💳 Cashfree Payments</b></summary>

```env
CASHFREE_ENABLED=true
CASHFREE_APP_ID=your-app-id
CASHFREE_SECRET_KEY=your-secret
CASHFREE_ENV=production
```
Get keys: [Cashfree Dashboard](https://merchant.cashfree.com/)  
Set webhook URL in Cashfree dashboard: `https://yourdomain.com/api/billing/cashfree/webhook`
</details>

<details>
<summary><b>💳 UPI Manual Payments</b></summary>

Users pay via UPI and submit the UTR number. You approve/reject from the admin panel.

```env
UPI_ENABLED=true
UPI_ID=yourname@upi
UPI_QR_URL=https://example.com/your-qr-code.png
```
</details>

<details>
<summary><b>☁️ Datalix VPS Reselling</b></summary>

Resell Datalix VPS with custom pricing.  
**How it works:** You sync plans from Datalix (which have a cost price), then set your own sell price per plan via Admin → VPS Plans. The difference is your profit margin. Users pay from their wallet balance; billing runs daily at midnight.

```env
DATALIX_ENABLED=true
DATALIX_API_KEY=your-key
DATALIX_API_URL=https://api.datalix.de/v1
```

**After enabling:**
1. Go to Admin → VPS Plans → **Sync from Datalix**
2. Set sell prices for each plan (must be ≥ cost price)
3. Toggle plans visible/hidden
4. Users can now provision VPS from your dashboard

**Revenue model:**
- Cost price = what you pay Datalix per day
- Sell price = what you charge users per day
- Profit = sell price − cost price (shown in Admin → VPS Stats)
- Auto-suspend if user balance is insufficient
- Auto-terminate after 7 days suspended
</details>

<details>
<summary><b>🤖 Discord Bot Notifications</b></summary>

The bot automatically logs: new users, payments, server creation, UTR requests, and errors.

1. Create a bot at [Discord Developer Portal](https://discord.com/developers/applications)
2. Enable the **Guilds** intent
3. Invite the bot to your server
4. Right-click your log channel → Copy ID

```env
DISCORD_BOT_TOKEN=your-bot-token
DISCORD_LOG_CHANNEL_ID=123456789012345678
```
</details>

<details>
<summary><b>🌐 Cloudflare Auto-Subdomains (for game servers)</b></summary>

Automatically creates subdomains for each game server your users create (e.g. `myserver.play.gamehost.com`) with A + SRV records for Minecraft.

> **This is optional.** Only set this up if you want users' game servers to get custom subdomains.

```env
CLOUDFLARE_ENABLED=true
CLOUDFLARE_API_TOKEN=your-api-token
CLOUDFLARE_ZONE_ID=your-zone-id
CLOUDFLARE_BASE_DOMAIN=play.yourdomain.com
```

**How to get `CLOUDFLARE_API_TOKEN`:**

1. Go to [dash.cloudflare.com/profile/api-tokens](https://dash.cloudflare.com/profile/api-tokens)
2. Click **Create Token**
3. Find **"Edit zone DNS"** template → click **Use template**
4. Under **Zone Resources** → select **Include** → **Specific zone** → pick your domain
5. Click **Continue to summary** → **Create Token**
6. Copy the token immediately — **you can only see it once!**

**How to get `CLOUDFLARE_ZONE_ID`:**

1. Go to [dash.cloudflare.com](https://dash.cloudflare.com/)
2. Click on **your domain name**
3. You're now on the **Overview** page
4. Look at the **right sidebar**, scroll down
5. You'll see a section called **API** with a **Zone ID** field
6. Click to copy it

**How to choose `CLOUDFLARE_BASE_DOMAIN`:**

This is whatever subdomain you want game servers to live under. Pick one:

| If you set it to... | Game server subdomains look like... |
|---------------------|--------------------------------------|
| `play.yourdomain.com` | `myserver.play.yourdomain.com` |
| `servers.yourdomain.com` | `myserver.servers.yourdomain.com` |
| `mc.yourdomain.com` | `myserver.mc.yourdomain.com` |

**How to create the base domain in Cloudflare:**

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com/) → click your domain
2. Go to **DNS** → **Records** → **Add record**
3. Create an A record for your base domain:

| Type | Name | Content | Proxy |
|------|------|---------|-------|
| A | `play` | `YOUR_VPS_IP` | ⬜ **OFF** (gray cloud — DNS only) |

> **Important:** Use proxy **OFF** (gray cloud) for game server subdomains. Cloudflare proxy doesn't support Minecraft game traffic — it only works for HTTP/HTTPS websites. Game servers need direct IP connections.

4. That's it! Now the system will automatically create records like `myserver.play.yourdomain.com` under this base domain when users create servers.

**What it does:**

When a user creates a game server named "myserver":
- Creates an **A record**: `myserver.play.yourdomain.com` → node IP
- Creates an **SRV record**: `_minecraft._tcp.myserver.play.yourdomain.com` → node IP + port
- Players can connect using `myserver.play.yourdomain.com` instead of an IP address

When the server is deleted, the DNS records are automatically removed.
</details>

<details>
<summary><b>🪙 Credits / Ads System</b></summary>

Users earn free credits by watching ads. Anti-adblock detection ensures ads are actually displayed — users with ad blockers cannot earn credits.

**Supports multiple ad networks simultaneously** for maximum revenue:

```env
FREE_CREDITS_TIMER_SECONDS=60     # seconds between earns
FREE_CREDITS_REWARD=10             # credits per earn  
FREE_SERVER_DELETE_DAYS=7          # delete suspended free servers after X days
ADSENSE_PUBLISHER_ID=ca-pub-xxxxxxxxxx

# Multiple Adsterra scripts (comma-separated) — each renders a separate ad zone
ADSTERRA_SCRIPT_URLS=https://pl12345.youradexchange.com/sdk.js,https://pl67890.youradexchange.com/sdk.js
# Legacy single URL (still works if you only have one)
ADSTERRA_SCRIPT_URL=https://...
```

**How to get Adsterra script URLs:**
1. Sign up at [Adsterra](https://adsterra.com/) (publisher account)
2. Create ad units (Banner 300×250, Native Banner, Social Bar, etc.)
3. Copy each unit's `<script src="...">` URL
4. Paste them comma-separated into `ADSTERRA_SCRIPT_URLS`
5. More ad zones = more revenue per credit earn

**Features:**
- ✅ Multiple simultaneous Adsterra ad zones for higher RPM
- ✅ AdSense + Adsterra can run side by side
- ✅ Anti-adblock detection (blocks earning if ads are hidden)
- ✅ Countdown timer with circular progress animation
- ✅ Server-side rate limiting (2 earns per minute max)
- ✅ Auto-suspend free servers when credits hit 0
- ✅ Auto-delete suspended free servers after configurable days
</details>

<details>
<summary><b>🧾 Paymenter Integration</b></summary>

```env
PAYMENTER_ENABLED=true
PAYMENTER_URL=https://billing.yourdomain.com
PAYMENTER_API_KEY=your-key
```
</details>

<details>
<summary><b>📧 SMTP / Email Login</b></summary>

Required for email signup/login, verification emails, and password reset.  
If not configured, emails are logged to console (dev mode) — OAuth still works without SMTP.

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM=noreply@gamehost.com
```

**Gmail App Password:** Go to [Google Account → Security → App Passwords](https://myaccount.google.com/apppasswords) and generate one for "Mail".
</details>

---

## 🛠️ Managing Your Server (Stop, Start, Restart, Rebuild)

> **All commands below must be run from your project directory.**  
> Always start with: `cd /gamehost`

### 🛑 Stop the Entire Website

```bash
cd /gamehost
docker compose down
```

This stops and removes all 5 containers (backend, frontend, nginx, postgres, redis).  
Your database data and `.env` file are **NOT deleted**.

### ▶️ Start the Website

```bash
cd /gamehost
docker compose up -d
```

The `-d` flag runs everything in the background. All 5 containers will start.

### 🔄 Restart Everything

```bash
cd /gamehost
bash restart.sh
```

This does a **graceful restart**: stops services in safe dependency order, preserves volumes, starts fresh, and runs health checks. Use `--force` to skip the confirmation prompt.

### 🔄 Restart a Single Service

```bash
cd /gamehost
bash restart.sh --service backend    # restart only the backend
docker compose restart frontend     # restart only the frontend
docker compose restart nginx        # restart only nginx
docker compose restart postgres     # restart only database
docker compose restart redis        # restart only redis
```

### 🔨 Rebuild After Code Changes

If you changed any code and need to rebuild the containers:

```bash
cd /gamehost
docker compose build --no-cache
docker compose down && docker compose up -d
```

Or rebuild and restart in one command:

```bash
cd /gamehost
docker compose down && docker compose up -d --build
```

### 🔨 Rebuild Only One Service

```bash
cd /gamehost
docker compose build --no-cache backend     # rebuild backend only
docker compose build --no-cache frontend    # rebuild frontend only
docker compose up -d                        # restart with new build
```

### 📊 Check What's Running

```bash
cd /gamehost
docker compose ps                   # show all containers and their status
docker stats                        # live CPU and memory usage (Ctrl+C to exit)
```

### 📋 View Logs

```bash
cd /gamehost
docker compose logs -f                       # all logs, live (Ctrl+C to exit)
docker compose logs -f backend               # backend logs only
docker compose logs -f frontend              # frontend logs only
docker compose logs --tail=100 backend       # last 100 lines of backend
docker compose logs --tail=50 nginx          # last 50 lines of nginx

# Or use npm shortcuts from the project root:
npm run logs                                  # all logs
npm run logs:backend                          # backend only
npm run logs:frontend                         # frontend only
npm run status                                # container status
```

### 🏥 Health Check

```bash
# Check if the backend API is responding
curl http://localhost:4000/api/health

# Check if the website is reachable via nginx
curl -I http://localhost
```

### 🗃️ Database Commands

```bash
cd /gamehost

# Open the database shell
docker compose exec postgres psql -U gamehost -d gamehost

# Run database migrations (after code updates)
docker compose exec backend npx prisma migrate deploy

# Check migration status
docker compose exec backend npx prisma migrate status
```

### 🐚 Shell Access (Advanced)

```bash
cd /gamehost
docker compose exec backend sh      # open shell inside backend container
docker compose exec frontend sh     # open shell inside frontend container
docker compose exec postgres sh     # open shell inside database container
```

### 🧹 Clean Up Disk Space

```bash
# Check how much space Docker is using
docker system df

# Remove unused images and containers (safe)
docker system prune -f

# Remove everything unused including volumes (⚠️ deletes database data!)
docker system prune -a --volumes
```

> ⚠️ **Never run `docker system prune -a --volumes`** unless you want to delete ALL your data including the database.

---

## 🖥️ Frontend Pages

| Route | Page | Login Required |
|-------|------|:-:|
| `/` | Landing page (3D Three.js scene) | No |
| `/login` | Email login/signup + Google & Discord OAuth | No |
| `/dashboard` | User dashboard | Yes |
| `/dashboard/servers` | Your servers list | Yes |
| `/dashboard/servers/create` | Create new server | Yes |
| `/dashboard/servers/[id]` | Server detail — console, files, plugins, players, backups | Yes |
| `/dashboard/plans` | Browse hosting plans | Yes |
| `/dashboard/billing` | Payment history | Yes |
| `/dashboard/balance` | Wallet top-up | Yes |
| `/dashboard/credits` | Earn credits via ads | Yes |
| `/dashboard/profile` | Profile settings | Yes |
| `/dashboard/vps` | VPS management | Yes |
| `/dashboard/support` | Support page | Yes |
| `/admin` | Admin dashboard | Yes (Admin only) |

---

## 🔌 API Reference

All routes prefixed with `/api`. Auth = JWT via cookie or `Authorization: Bearer` header.

<details>
<summary><b>Auth</b> — 12 routes</summary>

| Method | Route | Auth | Description |
|--------|-------|:----:|-------------|
| POST | `/auth/register` | — | Email signup (sends verification) |
| POST | `/auth/login` | — | Email login |
| GET | `/auth/verify-email` | — | Verify email token |
| POST | `/auth/forgot-password` | — | Request password reset |
| POST | `/auth/reset-password` | — | Reset password with token |
| POST | `/auth/resend-verification` | — | Resend verification email |
| GET | `/auth/google` | — | Redirect to Google OAuth |
| GET | `/auth/google/callback` | — | Google callback |
| GET | `/auth/discord` | — | Redirect to Discord OAuth |
| GET | `/auth/discord/callback` | — | Discord callback |
| GET | `/auth/me` | ✅ | Get current user |
| GET | `/auth/logout` | — | Clear session |
</details>

<details>
<summary><b>Servers</b> — 25 routes</summary>

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/servers` | List your servers (with live status) |
| GET | `/servers/:id` | Server details |
| POST | `/servers` | Create server |
| DELETE | `/servers/:id` | Delete server |
| POST | `/servers/:id/power` | Power (start/stop/restart/kill) |
| GET | `/servers/:id/console` | WebSocket credentials |
| POST | `/servers/:id/command` | Send console command |
| GET | `/servers/:id/files?dir=/` | List files |
| GET | `/servers/:id/files/contents?file=` | Read file |
| POST | `/servers/:id/files/write` | Write file |
| POST | `/servers/:id/files/delete` | Delete files |
| PUT | `/servers/:id/files/rename` | Rename file/folder |
| POST | `/servers/:id/files/folder` | Create folder |
| GET | `/servers/:id/files/upload` | Upload URL |
| GET | `/servers/:id/backups` | List backups |
| POST | `/servers/:id/backups` | Create backup |
| DELETE | `/servers/:id/backups/:backupId` | Delete backup |
| GET | `/servers/:id/backups/:backupId/download` | Download backup |
| GET | `/servers/:id/databases` | List databases |
| POST | `/servers/:id/databases` | Create database |
| DELETE | `/servers/:id/databases/:dbId` | Delete database |
| GET | `/servers/:id/network` | Network allocations |
| GET | `/servers/:id/startup` | Startup variables |
| POST | `/servers/:id/startup` | Update startup var |
| POST | `/servers/:id/reinstall` | Reinstall server |

All routes require auth ✅
</details>

<details>
<summary><b>Plans</b> — 5 routes</summary>

| Method | Route | Auth | Description |
|--------|-------|:----:|-------------|
| GET | `/plans` | — | List plans |
| GET | `/plans/eggs` | ✅ | Pterodactyl eggs |
| GET | `/plans/nodes` | ✅ | Pterodactyl nodes |
| GET | `/plans/:id` | — | Plan details |
| POST | `/plans/calculate` | ✅ | Custom price calc |
</details>

<details>
<summary><b>Billing</b> — 12 routes</summary>

| Method | Route | Auth | Description |
|--------|-------|:----:|-------------|
| GET | `/billing/gateways` | — | Enabled gateways |
| GET | `/billing/balance` | ✅ | Wallet balance |
| POST | `/billing/balance/add` | ✅ | Add balance |
| POST | `/billing/balance/pay` | ✅ | Pay with balance |
| GET | `/billing/payments` | ✅ | Payment history |
| POST | `/billing/razorpay/create` | ✅ | Create Razorpay order |
| POST | `/billing/razorpay/verify` | — | Verify Razorpay |
| POST | `/billing/razorpay/webhook` | — | Razorpay webhook |
| POST | `/billing/cashfree/create` | ✅ | Create Cashfree order |
| POST | `/billing/cashfree/verify` | — | Verify Cashfree |
| POST | `/billing/cashfree/webhook` | — | Cashfree webhook |
| POST | `/billing/upi/submit` | ✅ | Submit UPI (UTR) |
</details>

<details>
<summary><b>Credits</b> — 3 routes</summary>

| Method | Route | Auth | Description |
|--------|-------|:----:|-------------|
| GET | `/credits` | ✅ | Credit balance |
| GET | `/credits/config` | — | Earn config |
| POST | `/credits/earn` | ✅ | Earn credits (2/min limit) |
</details>

<details>
<summary><b>Plugins</b> — 11 routes</summary>

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/plugins/:uuid/detect` | Detect server software |
| GET | `/plugins/:uuid/installed` | Installed plugins |
| DELETE | `/plugins/:uuid/remove/:file` | Remove plugin |
| GET | `/plugins/modrinth/search` | Search Modrinth |
| GET | `/plugins/modrinth/project/:id` | Modrinth project |
| GET | `/plugins/modrinth/project/:id/versions` | Modrinth versions |
| POST | `/plugins/:uuid/modrinth/install` | Install from Modrinth |
| GET | `/plugins/spiget/search` | Search SpigotMC |
| GET | `/plugins/spiget/resource/:id` | Spiget resource |
| GET | `/plugins/spiget/resource/:id/versions` | Spiget version history |
| POST | `/plugins/:uuid/spiget/install` | Install from SpigotMC |

All routes require auth ✅
</details>

<details>
<summary><b>Players</b> — 12 routes</summary>

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/players/:uuid/detect` | Is Minecraft? |
| GET | `/players/:uuid/online` | Online players |
| GET | `/players/:uuid/whitelist` | Whitelist |
| POST | `/players/:uuid/whitelist` | Add to whitelist |
| DELETE | `/players/:uuid/whitelist/:player` | Remove from whitelist |
| GET | `/players/:uuid/banned` | Banned players |
| POST | `/players/:uuid/ban` | Ban |
| POST | `/players/:uuid/unban` | Unban |
| GET | `/players/:uuid/ops` | Operators |
| POST | `/players/:uuid/op` | Op |
| POST | `/players/:uuid/deop` | Deop |
| POST | `/players/:uuid/kick` | Kick |

All routes require auth ✅
</details>

<details>
<summary><b>VPS</b> — 7 routes</summary>

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/vps/plans` | List VPS plans (with sell prices) |
| GET | `/vps` | Your VPS instances |
| POST | `/vps` | Provision VPS (deducts balance) |
| GET | `/vps/:id` | VPS status |
| POST | `/vps/:id/control` | Control (start/stop/restart) |
| POST | `/vps/:id/renew` | Renew VPS (extend billing) |
| DELETE | `/vps/:id` | Terminate (auto-refund on failure) |

All routes require auth ✅
</details>

<details>
<summary><b>Admin</b> — 28 routes 🔒</summary>

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/admin/dashboard` | Dashboard stats |
| GET | `/admin/users` | List users (paginated) |
| GET | `/admin/users/:id` | User details |
| PATCH | `/admin/users/:id/role` | Set role (USER/ADMIN) |
| DELETE | `/admin/users/:id` | Delete user |
| GET | `/admin/servers` | All servers (paginated) |
| POST | `/admin/servers/:id/suspend` | Suspend server |
| POST | `/admin/servers/:id/unsuspend` | Unsuspend server |
| POST | `/admin/plans` | Create plan |
| PATCH | `/admin/plans/:id` | Update plan |
| DELETE | `/admin/plans/:id` | Delete plan |
| GET | `/admin/upi/pending` | Pending UPI payments |
| POST | `/admin/upi/:id/approve` | Approve UPI |
| POST | `/admin/upi/:id/reject` | Reject UPI |
| GET | `/admin/settings` | Platform settings |
| PATCH | `/admin/settings` | Update settings |
| GET | `/admin/audit` | Audit logs (paginated) |
| GET | `/admin/nodes` | Pterodactyl nodes |
| GET | `/admin/eggs` | Pterodactyl eggs |
| GET | `/admin/alts` | All detected alt accounts |
| GET | `/admin/users/:id/alts` | Alt accounts for user |
| GET | `/admin/users/:id/linked-accounts` | Linked OAuth accounts |
| POST | `/admin/alts/delete` | Remove alt record |
| GET | `/admin/vps/plans` | List VPS plans (cost/sell) |
| POST | `/admin/vps/plans/sync` | Sync plans from Datalix |
| PATCH | `/admin/vps/plans/:id` | Update VPS plan pricing |
| DELETE | `/admin/vps/plans/:id` | Delete VPS plan |
| GET | `/admin/vps/stats` | VPS profit stats |

Requires ADMIN role
</details>

<details>
<summary><b>Users</b> — 3 routes</summary>

| Method | Route | Auth | Description |
|--------|-------|:----:|-------------|
| GET | `/users/profile` | ✅ | Get current user profile |
| PATCH | `/users/profile` | ✅ | Update profile (name, etc.) |
| POST | `/users/change-password` | ✅ | Change password (requires current password) |
</details>

<details>
<summary><b>Health</b> — 1 route</summary>

```bash
curl http://localhost:4000/api/health
```
Returns: status, DB/Redis connectivity, uptime, memory, Node version. No auth needed.
</details>

<details>
<summary><b>Settings</b> — 1 route</summary>

| Method | Route | Auth | Description |
|--------|-------|:----:|-------------|
| GET | `/settings/public` | — | Public platform settings (support URL, app name, etc.) |
</details>

---

## ⏰ Background Jobs (Automatic)

No setup needed — these run automatically when the backend starts.

| Every | What Happens |
|-------|-------------|
| 1 hour | Suspends expired servers |
| 1 hour | Deletes servers suspended for 48+ hours |
| 1 hour | Flags servers expiring within 7 days for renewal notification |
| 1 hour | Auto-syncs Pterodactyl eggs (keeps game templates up to date) |
| 30 min | Suspends free servers when user has 0 credits |
| 30 min | Deletes free servers suspended longer than `FREE_SERVER_DELETE_DAYS` |
| Daily (midnight) | VPS billing — deducts daily cost from balance, suspends if insufficient, terminates after 7 days suspended |

---

## 🗂️ Project Structure

```
gamehost/
├── backend/                 NestJS 10 + Prisma 5
│   ├── src/modules/         14 feature modules (auth, servers, plans, billing, etc.)
│   ├── src/common/          Guards, decorators, filters, health check, settings
│   ├── prisma/schema.prisma Database schema (15 models, 9 enums)
│   └── Dockerfile           Multi-stage build (Node 20 Alpine, non-root, dumb-init)
├── frontend/                Next.js 14 + Tailwind + Three.js + Framer Motion
│   ├── src/app/             14 pages
│   └── Dockerfile           Multi-stage build (Node 20 Alpine, non-root, dumb-init)
├── nginx/nginx.conf         Reverse proxy, rate limiting, WebSocket, security headers, SSL-ready
├── docker-compose.yml       5 services with memory limits, log rotation, localhost binding
├── .devcontainer/           GitHub Codespaces config (Docker-in-Docker, port forwarding)
├── install.sh               First-time setup (smart .env, secrets, OAuth sync, build)
├── update.sh                Safe update (backup, pull, rebuild, migrate, health check)
├── restart.sh               Graceful restart (single service or full, health checks)
├── backup.sh                Backup (DB dump, .env, full volumes, encrypt, remote, rotate)
└── .env.example             Configuration template with all variables
```

---

## 🔧 Troubleshooting

<details>
<summary><b>Container won't start</b></summary>

```bash
docker compose ps                    # see which failed
docker compose logs backend          # check error
docker compose logs postgres         # check database
```
</details>

<details>
<summary><b>Port already in use</b></summary>

```bash
sudo lsof -i :3000                   # find what's using it
sudo kill -9 <PID>                   # kill it
# Or change port in .env: FRONTEND_PORT=3001
```
</details>

<details>
<summary><b>Database won't connect</b></summary>

```bash
docker compose exec postgres pg_isready -U gamehost    # check if DB is up
docker compose restart postgres                        # restart it
sleep 5
docker compose restart backend                         # restart backend
```
</details>

<details>
<summary><b>Migrations failed</b></summary>

```bash
docker compose exec backend npx prisma migrate status   # check status
docker compose exec backend npx prisma migrate deploy    # retry

# Last resort — resets ALL data:
docker compose exec backend npx prisma migrate reset --force
```
</details>

<details>
<summary><b>OAuth login keeps failing</b></summary>

1. Make sure callback URLs in `.env` match **exactly** what you set in Google/Discord
2. Make sure `APP_URL` is your actual domain (with https if using SSL)
3. Check logs: `docker compose logs -f backend`
</details>

<details>
<summary><b>Can't access admin panel</b></summary>

You need ADMIN role. Run this:

```bash
docker compose exec postgres psql -U gamehost -d gamehost
UPDATE "User" SET role = 'ADMIN' WHERE email = 'your-email@gmail.com';
\q
```

Refresh the website.
</details>

<details>
<summary><b>Full reset (⚠️ deletes everything)</b></summary>

```bash
docker compose down -v               # remove containers + database volumes
bash install.sh                      # fresh install
```
</details>

---

## 🔒 Security

| Layer | Protection |
|-------|-----------|
| Auth | OAuth (Google + Discord) + Email login with bcrypt-hashed passwords, email verification |
| Tokens | httpOnly + secure + SameSite cookies (7-day expiry) |
| Backend | Helmet, CORS (single origin), class-validator (whitelist mode) |
| Rate Limiting | NestJS: 100 req/60s global · Nginx: 30 req/s API, 5 req/min auth |
| Access Control | Role-based guards (USER / ADMIN) |
| Alt Detection | Admin can detect alt accounts via linked OAuth providers, IP, fingerprint |
| Headers | X-Frame-Options, X-Content-Type-Options, X-XSS-Protection, Referrer-Policy |
| Proxy | Nginx with gzip, WebSocket support, SSL-ready with HSTS |

---

## 📄 License

MIT
]]>
