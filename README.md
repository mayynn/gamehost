<![CDATA[# 🎮 GameHost Platform

A production-grade **game server hosting platform** built on the [Pterodactyl Panel](https://pterodactyl.io/) API.  
Automated billing, one-click plugin install, VPS reselling, and a full admin dashboard — all in one.

---

## 📋 Table of Contents

- [Features](#-features)
- [Requirements](#-requirements)
- [Quick Start (Fresh Install)](#-quick-start-fresh-install)
- [Configuration](#%EF%B8%8F-configuration)
  - [Required Variables](#required--must-set-before-going-live)
  - [Optional Variables](#optional--enable-as-needed)
- [Project Structure](#-project-structure)
- [Frontend Pages](#-frontend-pages)
- [API Routes Reference](#-api-routes-reference)
- [Everyday Commands](#-everyday-commands)
- [Updating](#-updating)
- [Backups](#-backups)
- [SSL / HTTPS Setup](#-ssl--https-setup)
- [Automated Cron Jobs](#-automated-cron-jobs)
- [Health Check](#-health-check)
- [Database Schema](#-database-schema)
- [Troubleshooting](#-troubleshooting)
- [Security](#-security)
- [License](#-license)

---

## ✨ Features

| Module | What It Does |
|--------|-------------|
| **Auth** | Google + Discord OAuth login, JWT sessions (7-day httpOnly cookies), Pterodactyl account auto-heal |
| **Servers** | Provision, power control (start/stop/restart/kill), live console via WebSocket, file manager (browse/read/write/delete/upload), server backups, databases, network allocations, startup variables |
| **Plans** | Free + Premium + Custom builder plans, slider-based pricing, node assignment modes (Admin Locked / User Selectable / Dynamic) |
| **Billing** | Razorpay, Cashfree, UPI manual payments (with admin approval queue), wallet balance system, server renewal lifecycle with auto-suspend & auto-delete, webhook verification |
| **Credits** | Ad-based earning system (AdSense + Adsterra), configurable timer & reward, auto-suspend free servers when credits reach 0, auto-delete after configurable days |
| **Plugins** | Search Modrinth + SpigotMC (Spiget API), one-click install to any server, server software auto-detection, installed plugin listing, plugin removal |
| **Players** | Online player list, whitelist add/remove, ban/unban with reason, op/deop, kick — Minecraft server detection built in |
| **VPS** | Datalix reseller integration — list plans, provision, status check, power control (start/stop/restart/reinstall), terminate |
| **Admin** | Dashboard stats, paginated user management (view/role/delete), server suspend/unsuspend, plan CRUD, UPI approval queue, global settings, audit logs, Pterodactyl nodes & eggs browser |
| **Discord Bot** | Optional bot that logs: payments (₹ amount + gateway), new users, server creation, UTR payment requests, errors — all as rich embeds to a configured channel |
| **Cloudflare DNS** | Automated subdomain creation (A + SRV records), e.g. `servername.play.gamehost.com` — auto-cleanup on server deletion |
| **Paymenter** | External billing panel integration — products, orders, clients, invoices, coupon validation, webhook handler |
| **Health** | Built-in health endpoint — checks PostgreSQL + Redis connectivity, reports uptime, memory usage, Node.js version |

---

## 📦 Requirements

You need a **Linux VPS** (Ubuntu 20.04+ recommended) with:

| Software | Minimum Version | Install Guide |
|----------|----------------|---------------|
| **Docker** | 20.10+ | [docs.docker.com/engine/install](https://docs.docker.com/engine/install/) |
| **Docker Compose** | 2.0+ | Included with Docker Desktop; on Linux see [docs.docker.com/compose/install](https://docs.docker.com/compose/install/) |
| **Git** | any | `sudo apt install git` |

### Check if you have them

```bash
docker --version
docker compose version
git --version
```

> **💡 Tip:** If `docker compose` doesn't work, try `docker-compose` (with a hyphen). Both are supported by all scripts.

---

## 🚀 Quick Start (Fresh Install)

Run these commands **one by one** on your VPS:

### Step 1 — Clone the repository

```bash
git clone https://github.com/your-org/gamehost.git
cd gamehost
```

### Step 2 — Run the installer

```bash
bash install.sh
```

**What `install.sh` does automatically:**

1. ✅ Checks that Docker & Docker Compose are installed
2. ✅ Creates `nginx/ssl` and `backups` directories
3. ✅ Copies `.env.example` → `.env`
4. ✅ Generates random secrets for JWT, sessions, database password, and Redis password
5. ✅ Fixes `DATABASE_URL` and `REDIS_URL` with the generated passwords
6. ✅ Builds all Docker containers from scratch (`--no-cache`)
7. ✅ Starts PostgreSQL 16, Redis 7, Backend (NestJS), Frontend (Next.js), and Nginx
8. ✅ Waits for PostgreSQL to be ready (up to 60 seconds)
9. ✅ Runs Prisma database migrations

### Step 3 — Verify everything is running

```bash
docker compose ps
```

You should see **5 containers** all showing `Up`:

```
gamehost-db        postgres:16-alpine   Up (healthy)
gamehost-redis     redis:7-alpine       Up (healthy)
gamehost-backend   ...                  Up
gamehost-frontend  ...                  Up
gamehost-nginx     nginx:alpine         Up
```

### Step 4 — Open in your browser

| Service | URL | Notes |
|---------|-----|-------|
| **Website** (via Nginx) | `http://your-server-ip` | Port 80, recommended |
| **Frontend** (direct) | `http://your-server-ip:3000` | Bypasses Nginx |
| **Backend API** (direct) | `http://your-server-ip:4000` | All routes prefixed with `/api` |

### Step 5 — Check health

```bash
curl http://localhost:4000/api/health
```

You should see:
```json
{
  "status": "ok",
  "checks": { "database": "connected", "redis": "connected" },
  "uptime": 42,
  "version": "1.0.0"
}
```

> **⚠️ Important:** The platform will load but **OAuth login won't work** until you configure Google/Discord OAuth in `.env`. See [Configuration](#%EF%B8%8F-configuration) below.

---

## ⚙️ Configuration

All settings live in the `.env` file in the project root. Open it with:

```bash
nano .env
```

> **📝 Note:** After editing `.env`, you **must restart** for changes to take effect:
> ```bash
> docker compose down
> docker compose up -d
> ```

---

### Required — Must Set Before Going Live

#### 🌐 App URLs

Update these to your actual domain or server IP:

```env
APP_URL=https://yourdomain.com
BACKEND_URL=https://yourdomain.com/api
NEXT_PUBLIC_API_URL=https://yourdomain.com
NEXT_PUBLIC_APP_NAME=YourBrandName
```

#### 🔑 Google OAuth

1. Go to [Google Cloud Console → Credentials](https://console.cloud.google.com/apis/credentials)
2. Create a new **OAuth 2.0 Client ID** (Web application)
3. Add `https://yourdomain.com/api/auth/google/callback` as an **Authorized redirect URI**
4. Copy the Client ID and Secret into `.env`:

```env
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_CALLBACK_URL=https://yourdomain.com/api/auth/google/callback
```

#### 🔑 Discord OAuth

1. Go to [Discord Developer Portal → Applications](https://discord.com/developers/applications)
2. Create a new Application → go to **OAuth2** tab
3. Add `https://yourdomain.com/api/auth/discord/callback` as a **Redirect URI**
4. Copy the Client ID and Secret into `.env`:

```env
DISCORD_CLIENT_ID=your-discord-client-id
DISCORD_CLIENT_SECRET=your-discord-client-secret
DISCORD_CALLBACK_URL=https://yourdomain.com/api/auth/discord/callback
```

#### 🦎 Pterodactyl Panel

You **must** have a working [Pterodactyl Panel](https://pterodactyl.io/) installation with at least one node configured.

1. Log in to your Pterodactyl Panel as admin
2. Go to **Application API** → Create a new key with **full read & write permissions**
3. Go to **Account** → **API Credentials** → Create a client API key
4. Fill in `.env`:

```env
PTERODACTYL_URL=https://panel.yourdomain.com
PTERODACTYL_APP_KEY=ptla_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
PTERODACTYL_CLIENT_KEY=ptlc_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

> **⚠️ Important:** The application API key (`ptla_`) is used for admin operations (creating users, provisioning servers). The client API key (`ptlc_`) is used for server power/console/file operations. You need **both**.

---

### Optional — Enable As Needed

<details>
<summary><strong>💳 Razorpay Payments</strong></summary>

```env
RAZORPAY_ENABLED=true
RAZORPAY_KEY_ID=rzp_live_xxxxxxxxxx
RAZORPAY_KEY_SECRET=your-razorpay-secret
RAZORPAY_WEBHOOK_SECRET=your-webhook-secret
```

Get keys from [Razorpay Dashboard](https://dashboard.razorpay.com/app/keys).

**Webhook URL** (set in Razorpay dashboard): `https://yourdomain.com/api/billing/razorpay/webhook`

Handles events: `payment.captured`, `payment.failed`
</details>

<details>
<summary><strong>💳 Cashfree Payments</strong></summary>

```env
CASHFREE_ENABLED=true
CASHFREE_APP_ID=your-app-id
CASHFREE_SECRET_KEY=your-secret-key
CASHFREE_ENV=production       # use "sandbox" for testing
```

Get keys from [Cashfree Dashboard](https://merchant.cashfree.com/).

**Webhook URL** (set in Cashfree dashboard): `https://yourdomain.com/api/billing/cashfree/webhook`

Handles events: `PAYMENT_SUCCESS_WEBHOOK`
</details>

<details>
<summary><strong>💳 UPI Manual Payment</strong></summary>

Users submit UTR (transaction reference) numbers. An admin manually approves or rejects them from the admin panel.

```env
UPI_ENABLED=true
UPI_ID=yourname@upi
UPI_QR_URL=https://example.com/your-upi-qr.png
```
</details>

<details>
<summary><strong>🖥️ Datalix VPS Reselling</strong></summary>

```env
DATALIX_ENABLED=true
DATALIX_API_KEY=your-datalix-api-key
DATALIX_API_URL=https://api.datalix.de/v1
```

Supported VPS actions: list plans, provision, check status, control (start/stop/restart/reinstall), terminate.
</details>

<details>
<summary><strong>🤖 Discord Bot Notifications</strong></summary>

1. Create a bot at [Discord Developer Portal](https://discord.com/developers/applications)
2. Enable the **Guilds** intent
3. Invite the bot to your server
4. Get the channel ID where you want logs sent (right-click channel → Copy ID)

```env
DISCORD_BOT_TOKEN=your-bot-token
DISCORD_LOG_CHANNEL_ID=123456789012345678
```

**Events logged automatically:** new user registration, payment received, server created, UTR payment request, errors.
</details>

<details>
<summary><strong>🌩️ Cloudflare DNS (Auto-Subdomains)</strong></summary>

Creates automatic subdomains for game servers, e.g. `myserver.play.gamehost.com`.

Creates both **A records** and **SRV records** (for Minecraft) automatically.

```env
CLOUDFLARE_ENABLED=true
CLOUDFLARE_API_TOKEN=your-cloudflare-api-token
CLOUDFLARE_ZONE_ID=your-zone-id
CLOUDFLARE_BASE_DOMAIN=play.gamehost.com
```

Get your API token from [Cloudflare Dashboard → API Tokens](https://dash.cloudflare.com/profile/api-tokens) (needs DNS Edit permission).
</details>

<details>
<summary><strong>📺 Ads / Credits System</strong></summary>

Free users watch ads to earn credits. Credits keep free servers running — when credits reach 0, the server is auto-suspended.

```env
FREE_CREDITS_TIMER_SECONDS=60     # cooldown between earns (seconds)
FREE_CREDITS_REWARD=10             # credits per earn
FREE_SERVER_DELETE_DAYS=7          # auto-delete suspended free servers after X days
ADSENSE_PUBLISHER_ID=ca-pub-xxxxxxxxxx
ADSTERRA_SCRIPT_URL=https://...
```
</details>

<details>
<summary><strong>🧾 Paymenter Billing Integration</strong></summary>

Integrate with an external [Paymenter](https://paymenter.org/) billing panel for product/order/invoice management.

```env
PAYMENTER_ENABLED=true
PAYMENTER_URL=https://billing.yourdomain.com
PAYMENTER_API_KEY=your-paymenter-api-key
```

Supports: products listing, order creation/cancellation, client management, invoices, coupon validation, webhooks (order.created, order.paid, order.cancelled, invoice.paid).
</details>

---

## 🗂️ Project Structure

```
gamehost/
├── backend/                  # NestJS API server (Node 20)
│   ├── src/
│   │   ├── main.ts               # App bootstrap, CORS, Helmet, global prefix /api
│   │   ├── app.module.ts          # All module imports
│   │   ├── common/
│   │   │   ├── guards/
│   │   │   │   ├── jwt-auth.guard.ts     # JWT auth (cookie + Bearer header)
│   │   │   │   └── roles.guard.ts        # Role-based access (USER / ADMIN)
│   │   │   ├── decorators/
│   │   │   │   ├── current-user.decorator.ts
│   │   │   │   └── roles.decorator.ts
│   │   │   ├── filters/
│   │   │   │   └── http-exception.filter.ts  # Global error handler
│   │   │   └── health/
│   │   │       └── health.controller.ts  # GET /api/health
│   │   ├── prisma/                # PrismaService (database client)
│   │   └── modules/
│   │       ├── auth/              # Google + Discord OAuth
│   │       ├── servers/           # 15 endpoints (power, console, files, backups, etc.)
│   │       ├── plans/             # Plan listing, eggs, nodes, price calculator
│   │       ├── billing/           # Razorpay, Cashfree, UPI, balance, webhooks
│   │       ├── credits/           # Earn system + cron auto-suspend
│   │       ├── plugins/           # Modrinth + Spiget search & install
│   │       ├── players/           # Whitelist, ban, op, kick
│   │       ├── vps/               # Datalix VPS reselling
│   │       ├── admin/             # Admin dashboard API
│   │       ├── users/             # User management
│   │       ├── discord/           # Discord bot service
│   │       ├── cloudflare/        # DNS record management
│   │       ├── paymenter/         # Paymenter billing integration
│   │       └── pterodactyl/       # Pterodactyl Application + Client API wrappers
│   ├── prisma/
│   │   └── schema.prisma          # 12 models, 8 enums
│   └── Dockerfile                 # Multi-stage build (Node 20 Alpine)
├── frontend/                 # Next.js 14 web app
│   ├── src/app/
│   │   ├── page.tsx               # Landing page (Three.js 3D scene)
│   │   ├── login/                 # Login page
│   │   ├── dashboard/             # User dashboard
│   │   │   ├── servers/           # Server list, details, create
│   │   │   ├── plans/             # Plan browser
│   │   │   ├── billing/           # Payment history
│   │   │   ├── balance/           # Wallet management
│   │   │   ├── credits/           # Credit earning
│   │   │   ├── profile/           # User profile
│   │   │   ├── vps/               # VPS management
│   │   │   └── support/           # Support page
│   │   └── admin/                 # Admin dashboard
│   └── Dockerfile                 # Multi-stage build (Node 20 Alpine)
├── nginx/
│   └── nginx.conf                 # Reverse proxy, rate limiting, security headers
├── docker-compose.yml             # 5 services: postgres, redis, backend, frontend, nginx
├── .env.example                   # Template (95 lines, all variables documented)
├── .env                           # Your actual config (auto-generated by install.sh)
├── install.sh                     # First-time setup script
├── update.sh                      # Safe update script
└── backup.sh                      # Database backup script
```

### Tech Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| **Backend** | NestJS + Prisma ORM | NestJS 10, Prisma 5 |
| **Frontend** | Next.js + TailwindCSS + Three.js + Framer Motion | Next.js 14 |
| **Database** | PostgreSQL (Alpine) | 16 |
| **Cache** | Redis (Alpine) | 7 |
| **Proxy** | Nginx (Alpine) + rate limiting + security headers | latest |
| **Runtime** | Node.js (Alpine) | 20 |
| **Container** | Docker + Docker Compose | — |

**Frontend libraries:** Lucide React (icons), react-hot-toast (notifications), Three.js / React Three Fiber (3D landing page), Framer Motion (animations)

---

## 🖥️ Frontend Pages

| Route | Page | Auth Required |
|-------|------|:------------:|
| `/` | Landing page with 3D Three.js scene | ❌ |
| `/login` | Google + Discord OAuth login | ❌ |
| `/dashboard` | User dashboard overview | ✅ |
| `/dashboard/servers` | List all your servers | ✅ |
| `/dashboard/servers/create` | Create a new server | ✅ |
| `/dashboard/servers/[id]` | Server detail — console, files, power, backups, databases, network, startup, plugins, players | ✅ |
| `/dashboard/plans` | Browse hosting plans | ✅ |
| `/dashboard/billing` | Payment history | ✅ |
| `/dashboard/balance` | Wallet top-up | ✅ |
| `/dashboard/credits` | Earn credits via ads | ✅ |
| `/dashboard/profile` | User profile | ✅ |
| `/dashboard/vps` | VPS management | ✅ |
| `/dashboard/support` | Support page | ✅ |
| `/admin` | Admin dashboard (ADMIN role only) | ✅ 🔒 |

---

## 🔌 API Routes Reference

All routes are prefixed with `/api`. Auth-protected routes require a JWT token (sent as `token` cookie or `Authorization: Bearer <token>` header).

### Auth (`/api/auth`)
| Method | Route | Auth | Description |
|--------|-------|:----:|-------------|
| GET | `/auth/google` | ❌ | Redirect to Google OAuth |
| GET | `/auth/google/callback` | ❌ | Google OAuth callback |
| GET | `/auth/discord` | ❌ | Redirect to Discord OAuth |
| GET | `/auth/discord/callback` | ❌ | Discord OAuth callback |
| GET | `/auth/me` | ✅ | Get current user info |
| GET | `/auth/logout` | ❌ | Clear token cookie |

### Servers (`/api/servers`)
| Method | Route | Auth | Description |
|--------|-------|:----:|-------------|
| GET | `/servers` | ✅ | List user's servers (with live Pterodactyl status) |
| GET | `/servers/:id` | ✅ | Get server details + resources |
| POST | `/servers` | ✅ | Provision a new server |
| POST | `/servers/:id/power` | ✅ | Send power signal (start/stop/restart/kill) |
| GET | `/servers/:id/console` | ✅ | Get WebSocket credentials for live console |
| POST | `/servers/:id/command` | ✅ | Send console command |
| GET | `/servers/:id/files` | ✅ | List files (query: `?dir=/`) |
| GET | `/servers/:id/files/contents` | ✅ | Read file content (query: `?file=path`) |
| POST | `/servers/:id/files/write` | ✅ | Write file content |
| POST | `/servers/:id/files/delete` | ✅ | Delete files |
| GET | `/servers/:id/files/upload` | ✅ | Get upload URL |
| GET | `/servers/:id/backups` | ✅ | List backups |
| POST | `/servers/:id/backups` | ✅ | Create backup |
| GET | `/servers/:id/databases` | ✅ | List databases |
| POST | `/servers/:id/databases` | ✅ | Create database |
| GET | `/servers/:id/network` | ✅ | Get network allocations |
| GET | `/servers/:id/startup` | ✅ | Get startup variables |
| POST | `/servers/:id/startup` | ✅ | Update a startup variable |

### Plans (`/api/plans`)
| Method | Route | Auth | Description |
|--------|-------|:----:|-------------|
| GET | `/plans` | ❌ | List active plans |
| GET | `/plans/eggs` | ✅ | Get available eggs from Pterodactyl |
| GET | `/plans/nodes` | ✅ | Get available nodes from Pterodactyl |
| GET | `/plans/:id` | ❌ | Get plan details |
| POST | `/plans/calculate` | ✅ | Calculate custom plan price |

### Billing (`/api/billing`)
| Method | Route | Auth | Description |
|--------|-------|:----:|-------------|
| GET | `/billing/gateways` | ❌ | Get enabled payment gateways |
| GET | `/billing/balance` | ✅ | Get wallet balance |
| POST | `/billing/balance/add` | ✅ | Add to balance |
| POST | `/billing/balance/pay` | ✅ | Pay with wallet balance |
| GET | `/billing/payments` | ✅ | Get payment history |
| POST | `/billing/razorpay/create` | ✅ | Create Razorpay order |
| POST | `/billing/razorpay/verify` | ❌ | Verify Razorpay payment |
| POST | `/billing/razorpay/webhook` | ❌ | Razorpay webhook endpoint |
| POST | `/billing/cashfree/create` | ✅ | Create Cashfree order |
| POST | `/billing/cashfree/verify` | ❌ | Verify Cashfree payment |
| POST | `/billing/cashfree/webhook` | ❌ | Cashfree webhook endpoint |
| POST | `/billing/upi/submit` | ✅ | Submit UPI payment (UTR number) |

### Credits (`/api/credits`)
| Method | Route | Auth | Description |
|--------|-------|:----:|-------------|
| GET | `/credits` | ✅ | Get credit balance |
| GET | `/credits/config` | ❌ | Get earn config (timer, reward, ad IDs) |
| POST | `/credits/earn` | ✅ | Earn credits (rate limited: 2 per minute) |

### Plugins (`/api/plugins`)
| Method | Route | Auth | Description |
|--------|-------|:----:|-------------|
| GET | `/plugins/:serverUuid/detect` | ✅ | Detect server software type |
| GET | `/plugins/:serverUuid/installed` | ✅ | List installed plugins |
| DELETE | `/plugins/:serverUuid/remove/:fileName` | ✅ | Remove a plugin |
| GET | `/plugins/modrinth/search` | ✅ | Search Modrinth |
| GET | `/plugins/modrinth/project/:id` | ✅ | Get Modrinth project details |
| GET | `/plugins/modrinth/project/:id/versions` | ✅ | Get Modrinth versions (filter by loader/game version) |
| POST | `/plugins/:serverUuid/modrinth/install` | ✅ | Install from Modrinth |
| GET | `/plugins/spiget/search` | ✅ | Search SpigotMC |
| GET | `/plugins/spiget/resource/:id` | ✅ | Get Spiget resource details |
| POST | `/plugins/:serverUuid/spiget/install` | ✅ | Install from SpigotMC |

### Players (`/api/players`)
| Method | Route | Auth | Description |
|--------|-------|:----:|-------------|
| GET | `/players/:uuid/detect` | ✅ | Check if server is Minecraft |
| GET | `/players/:uuid/online` | ✅ | Get online player list |
| GET | `/players/:uuid/whitelist` | ✅ | Get whitelist |
| POST | `/players/:uuid/whitelist` | ✅ | Add player to whitelist |
| DELETE | `/players/:uuid/whitelist/:player` | ✅ | Remove player from whitelist |
| GET | `/players/:uuid/banned` | ✅ | Get banned players |
| POST | `/players/:uuid/ban` | ✅ | Ban a player |
| POST | `/players/:uuid/unban` | ✅ | Unban a player |
| GET | `/players/:uuid/ops` | ✅ | Get op'd players |
| POST | `/players/:uuid/op` | ✅ | Op a player |
| POST | `/players/:uuid/deop` | ✅ | Deop a player |
| POST | `/players/:uuid/kick` | ✅ | Kick a player |

### VPS (`/api/vps`)
| Method | Route | Auth | Description |
|--------|-------|:----:|-------------|
| GET | `/vps/plans` | ✅ | List VPS plans |
| GET | `/vps` | ✅ | List user's VPS instances |
| POST | `/vps` | ✅ | Provision a VPS |
| GET | `/vps/:id` | ✅ | Get VPS status |
| POST | `/vps/:id/control` | ✅ | VPS control (start/stop/restart/reinstall) |
| DELETE | `/vps/:id` | ✅ | Terminate VPS |

### Admin (`/api/admin`) — ADMIN role only 🔒
| Method | Route | Description |
|--------|-------|-------------|
| GET | `/admin/dashboard` | Dashboard stats (users, servers, revenue) |
| GET | `/admin/users?page=N` | List all users (paginated) |
| GET | `/admin/users/:id` | User details |
| PATCH | `/admin/users/:id/role` | Set user role (USER / ADMIN) |
| DELETE | `/admin/users/:id` | Delete user |
| GET | `/admin/servers?page=N` | List all servers (paginated) |
| POST | `/admin/servers/:id/suspend` | Suspend server |
| POST | `/admin/servers/:id/unsuspend` | Unsuspend server |
| POST | `/admin/plans` | Create plan |
| PATCH | `/admin/plans/:id` | Update plan |
| DELETE | `/admin/plans/:id` | Delete plan |
| GET | `/admin/upi/pending` | Get pending UPI payments |
| POST | `/admin/upi/:id/approve` | Approve UPI payment |
| POST | `/admin/upi/:id/reject` | Reject UPI payment |
| GET | `/admin/settings` | Get platform settings |
| PATCH | `/admin/settings` | Bulk update settings |
| GET | `/admin/audit?page=N` | Get audit logs (paginated) |
| GET | `/admin/nodes` | List Pterodactyl nodes |
| GET | `/admin/eggs` | List Pterodactyl eggs |

### Health (`/api/health`)
| Method | Route | Auth | Description |
|--------|-------|:----:|-------------|
| GET | `/health` | ❌ | System health check (DB, Redis, uptime, memory) |

---

## 🛠️ Everyday Commands

All commands should be run from the project root directory (`cd gamehost`).

### Start / Stop / Restart

```bash
# Start all services
docker compose up -d

# Stop all services
docker compose down

# Restart all services
docker compose down && docker compose up -d

# Restart a single service
docker compose restart backend
```

### View Status

```bash
# Container status
docker compose ps

# Resource usage (CPU, memory, network)
docker stats
```

### View Logs

```bash
# All services (live follow)
docker compose logs -f

# Specific service logs
docker compose logs -f backend
docker compose logs -f frontend
docker compose logs -f postgres
docker compose logs -f nginx
docker compose logs -f redis

# Last 100 lines only
docker compose logs --tail=100 backend
```

### Rebuild After Code Changes

```bash
# Rebuild and restart a specific service
docker compose build backend --no-cache
docker compose up -d backend

# Rebuild everything
docker compose build --no-cache
docker compose down && docker compose up -d
```

### Database Operations

```bash
# Check database is reachable
docker compose exec postgres pg_isready -U gamehost

# Open PostgreSQL shell
docker compose exec postgres psql -U gamehost -d gamehost

# Run pending migrations
docker compose exec backend npx prisma migrate deploy

# Check migration status
docker compose exec backend npx prisma migrate status

# Reset database (⚠️ DELETES ALL DATA)
docker compose exec backend npx prisma migrate reset --force
```

### Shell Access

```bash
# Backend container shell
docker compose exec backend sh

# Frontend container shell
docker compose exec frontend sh
```

---

## 🔄 Updating

When a new version is available, update with one command:

```bash
bash update.sh
```

**What `update.sh` does automatically:**

1. ✅ Checks Docker & Docker Compose are installed
2. ✅ Verifies `.env` exists (tells you to run `install.sh` first if missing)
3. ✅ Pulls latest code from Git (`git pull --rebase`)
4. ✅ Rebuilds all containers from scratch (`--no-cache`)
5. ✅ Stops old containers (`docker compose down`)
6. ✅ Starts fresh containers (`docker compose up -d`)
7. ✅ Waits for PostgreSQL to be ready
8. ✅ Runs any new database migrations (`prisma migrate deploy`)

> **📝 Note:** `update.sh` is **safe** — it never deletes your `.env`, database data, or backups.  
> Your data is stored in Docker volumes (`pgdata`, `redisdata`) and persists across updates.

### Manual Update Alternative

If you prefer step-by-step:

```bash
# 1. Pull latest code
git pull

# 2. Rebuild containers
docker compose build --no-cache

# 3. Restart everything
docker compose down
docker compose up -d

# 4. Run new migrations
docker compose exec backend npx prisma migrate deploy
```

---

## 💾 Backups

### Create a Backup Now

```bash
bash backup.sh
```

This creates a compressed database dump at `./backups/gamehost_YYYYMMDD_HHMMSS.sql.gz`.

**What `backup.sh` does:**

1. ✅ Dumps the entire PostgreSQL database (`pg_dump` with `--clean --if-exists`)
2. ✅ Compresses with gzip
3. ✅ Automatically deletes backups older than **7 days**
4. ✅ Shows a summary: backup count + total size

### Set Up Automatic Daily Backups (Cron)

```bash
# Open crontab editor
crontab -e

# Add this line (runs at 3 AM every day)
0 3 * * * cd /path/to/gamehost && bash backup.sh >> /var/log/gamehost-backup.log 2>&1
```

> **💡 Tip:** Replace `/path/to/gamehost` with your actual project path (e.g., `/opt/gamehost`).

### List Existing Backups

```bash
ls -lh ./backups/
```

### Restore From a Backup

```bash
# 1. Decompress the backup
gunzip -k ./backups/gamehost_20260301_030000.sql.gz

# 2. Restore into the database
cat ./backups/gamehost_20260301_030000.sql | docker compose exec -T postgres psql -U gamehost -d gamehost

# 3. Restart the backend
docker compose restart backend
```

---

## 🔒 SSL / HTTPS Setup

### Option A — Certbot (Let's Encrypt) — Free

```bash
# 1. Install Certbot
sudo apt install certbot -y

# 2. Stop Nginx temporarily (Certbot needs port 80)
docker compose stop nginx

# 3. Get a certificate
sudo certbot certonly --standalone -d yourdomain.com

# 4. Copy certificate files
sudo cp /etc/letsencrypt/live/yourdomain.com/fullchain.pem ./nginx/ssl/fullchain.pem
sudo cp /etc/letsencrypt/live/yourdomain.com/privkey.pem ./nginx/ssl/privkey.pem

# 5. Start Nginx again
docker compose start nginx
```

### Enable SSL in Nginx

Edit `nginx/nginx.conf` and uncomment these lines:

```nginx
# In the server block, uncomment:
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

Also uncomment the **HTTP → HTTPS redirect** block at the top of the file:

```nginx
server {
    listen 80;
    server_name _;
    return 301 https://$host$request_uri;
}
```

Then restart:

```bash
docker compose restart nginx
```

### Auto-Renew Certificate

```bash
# Add to crontab
crontab -e

# Runs twice daily, auto-renews when needed
0 */12 * * * certbot renew --quiet --pre-hook "cd /path/to/gamehost && docker compose stop nginx" --post-hook "cd /path/to/gamehost && docker compose start nginx"
```

### Option B — Cloudflare (Easiest)

1. Point your domain's DNS to your server IP in [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. Set SSL mode to **Full** or **Full (Strict)**
3. Cloudflare handles SSL — no certificate files needed on your server

---

## ⏰ Automated Cron Jobs

The backend runs these scheduled tasks automatically. No setup needed — they start with the server.

| Schedule | Module | What It Does |
|----------|--------|-------------|
| **Every hour** | Billing | Marks servers expiring within 7 days for renewal notification |
| **Every hour** | Billing | **Suspends** expired servers |
| **Every hour** | Billing | **Deletes** servers suspended for 48+ hours (removes from Pterodactyl too) |
| **Every 30 minutes** | Credits | **Suspends** free servers where user has 0 credits |
| **Every 30 minutes** | Credits | **Deletes** free servers that have been suspended for more than `FREE_SERVER_DELETE_DAYS` (default: 7 days) |

---

## 🏥 Health Check

```bash
curl http://localhost:4000/api/health
```

**Response:**

```json
{
  "status": "ok",
  "timestamp": "2026-03-02T14:00:00.000Z",
  "uptime": 3600,
  "version": "1.0.0",
  "node": "v20.11.0",
  "memory": {
    "rss": "85MB",
    "heap": "42MB"
  },
  "checks": {
    "database": "connected",
    "redis": "connected"
  }
}
```

| Status | Meaning |
|--------|---------|
| `ok` | All services healthy |
| `degraded` | One or more services unavailable |

---

## 🗄️ Database Schema

The platform uses PostgreSQL 16 with Prisma ORM. The schema contains **12 models** and **8 enums**.

### Models

| Model | Purpose |
|-------|---------|
| `User` | User account (email, name, avatar, OAuth provider, role, Pterodactyl link) |
| `PterodactylAccount` | Linked Pterodactyl panel account (auto-created on first login) |
| `Server` | Game server (linked to Pterodactyl, plan, status, resource limits, expiry) |
| `Plan` | Hosting plan (Free/Premium/Custom, resource limits, pricing, node assignment mode) |
| `Payment` | Payment record (gateway, amount, status, linked to server/user) |
| `Balance` | User wallet balance (INR) |
| `Credit` | User ad-earned credits |
| `CreditEarn` | Credit earning history (timestamps for cooldown enforcement) |
| `UpiPayment` | UPI manual payment (UTR, approval status) |
| `Vps` | VPS instance (Datalix ID, specs, status) |
| `AdminSetting` | Key-value platform settings |
| `AuditLog` | Admin action audit trail (action, details, IP, user) |

### Enums

| Enum | Values |
|------|--------|
| `Role` | USER, ADMIN |
| `AuthProvider` | GOOGLE, DISCORD |
| `ServerStatus` | ACTIVE, SUSPENDED, EXPIRED, DELETED, INSTALLING |
| `PlanType` | FREE, PREMIUM, CUSTOM |
| `NodeAssignMode` | ADMIN_LOCKED, USER_SELECTABLE, DYNAMIC |
| `PaymentGateway` | RAZORPAY, CASHFREE, UPI, BALANCE |
| `PaymentStatus` | PENDING, COMPLETED, FAILED, REFUNDED |
| `UpiStatus` | PENDING, APPROVED, REJECTED |
| `VpsStatus` | ACTIVE, SUSPENDED, TERMINATED, PROVISIONING |

---

## 🔧 Troubleshooting

### Container won't start

```bash
# Check which container failed
docker compose ps

# View its logs for errors
docker compose logs backend
docker compose logs --tail=50 postgres
```

### "Port already in use" error

```bash
# Find what's using the port (example: port 3000)
sudo lsof -i :3000

# Kill the process
sudo kill -9 <PID>

# Or change the port in .env
FRONTEND_PORT=3001
```

### Database connection errors

```bash
# Check PostgreSQL is running
docker compose exec postgres pg_isready -U gamehost

# Restart database and backend
docker compose restart postgres
sleep 5
docker compose restart backend
```

### "Migration failed" error

```bash
# Check migration status
docker compose exec backend npx prisma migrate status

# Force deploy (retry without changes)
docker compose exec backend npx prisma migrate deploy

# Full reset (⚠️ DELETES ALL DATA)
docker compose exec backend npx prisma migrate reset --force
```

### Redis connection errors

```bash
# Check Redis is running
docker compose exec redis redis-cli -a $(grep REDIS_PASSWORD .env | cut -d= -f2) ping

# Should respond: PONG
```

### OAuth login fails / redirects to error page

1. Check callback URLs in `.env` match exactly what's configured in Google/Discord
2. Ensure `APP_URL` matches your actual domain
3. Check backend logs: `docker compose logs -f backend`

### Rebuild everything from scratch

```bash
# Stop and remove containers + all data volumes (⚠️ DELETES DATABASE)
docker compose down -v

# Reinstall from fresh
bash install.sh
```

### Check disk space

```bash
# Server disk usage
df -h

# Docker disk usage
docker system df

# Clean unused Docker data
docker system prune -f
```

---

## 🔒 Security

| Feature | Implementation |
|---------|---------------|
| **Authentication** | OAuth-only (Google + Discord) — zero password storage |
| **JWT Tokens** | Stored in httpOnly, secure, SameSite=lax cookies (7-day expiry) |
| **Token Extraction** | Supports both cookie and `Authorization: Bearer` header |
| **Backend Middleware** | Helmet (CSP, XSS), CORS (single origin), cookie-parser |
| **Rate Limiting** | NestJS ThrottlerModule: 100 req/60s global; Nginx: 30 req/s API, 5 req/min auth |
| **Input Validation** | class-validator with `whitelist` + `forbidNonWhitelisted` (strips unknown fields) |
| **Role-Based Access** | `@Roles(Role.ADMIN)` decorator + RolesGuard (403 for unauthorized) |
| **Error Handling** | Global exception filter — sanitized error responses |
| **Security Headers** | X-Frame-Options, X-Content-Type-Options, X-XSS-Protection, Referrer-Policy |
| **Graceful Shutdown** | Shutdown hooks enabled for clean container stops |
| **API Key Storage** | `.env` only — never committed to Git (`.gitignore` configured) |
| **Nginx Proxy** | Gzip compression, WebSocket support. SSL-ready with HSTS |

---

## 📄 License

MIT
]]>
