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

## 🚀 Quick Start

```bash
git clone https://github.com/your-org/gamehost.git
cd gamehost
bash install.sh
```

That's it. The installer auto-generates secrets, builds containers, runs migrations, and starts everything.

| Service | URL |
|---------|-----|
| Website | `http://your-ip` (Nginx on port 80) |
| API | `http://your-ip:4000/api` |
| Health | `http://your-ip:4000/api/health` |

> **Next step →** Edit `.env` to add your OAuth & Pterodactyl keys. See [Configuration](#%EF%B8%8F-configuration).

---

## ✨ Features

<table>
<tr><td>🔐</td><td><b>Auth</b></td><td>Google + Discord OAuth, JWT sessions, Pterodactyl account auto-heal</td></tr>
<tr><td>🖥️</td><td><b>Servers</b></td><td>Provision, power control, live console (WebSocket), file manager, backups, databases, network, startup vars</td></tr>
<tr><td>📋</td><td><b>Plans</b></td><td>Free / Premium / Custom builder with slider pricing, dynamic node assignment</td></tr>
<tr><td>💳</td><td><b>Billing</b></td><td>Razorpay, Cashfree, UPI manual (admin approval), wallet balance, auto-renewal lifecycle</td></tr>
<tr><td>🪙</td><td><b>Credits</b></td><td>Ad-based earning (AdSense + Adsterra), auto-suspend at 0 credits, auto-delete after inactivity</td></tr>
<tr><td>🧩</td><td><b>Plugins</b></td><td>Search Modrinth + SpigotMC, one-click install, server software detection</td></tr>
<tr><td>👥</td><td><b>Players</b></td><td>Whitelist, ban/unban, op/deop, kick — Minecraft auto-detection</td></tr>
<tr><td>☁️</td><td><b>VPS</b></td><td>Datalix reseller — provision, control, terminate</td></tr>
<tr><td>⚡</td><td><b>Admin</b></td><td>Dashboard stats, user/server management, plan CRUD, UPI queue, settings, audit logs</td></tr>
<tr><td>🤖</td><td><b>Discord</b></td><td>Bot logs payments, signups, server creation, errors as rich embeds</td></tr>
<tr><td>🌐</td><td><b>Cloudflare</b></td><td>Auto-subdomain creation (A + SRV records for Minecraft)</td></tr>
<tr><td>🧾</td><td><b>Paymenter</b></td><td>External billing panel integration — products, orders, invoices, coupons</td></tr>
</table>

---

## 📦 Requirements

- **Docker** 20.10+ — [install guide](https://docs.docker.com/engine/install/)
- **Docker Compose** 2.0+ — [install guide](https://docs.docker.com/compose/install/)
- **Git** — `sudo apt install git`

```bash
# Verify
docker --version && docker compose version && git --version
```

---

## ⚙️ Configuration

After install, edit `.env` and restart:

```bash
nano .env
docker compose down && docker compose up -d
```

### Required

<table>
<tr>
<th>Section</th>
<th>Variables</th>
<th>How to Get</th>
</tr>
<tr>
<td><b>App URLs</b></td>
<td><code>APP_URL</code>, <code>BACKEND_URL</code>, <code>NEXT_PUBLIC_API_URL</code></td>
<td>Set to your domain</td>
</tr>
<tr>
<td><b>Google OAuth</b></td>
<td><code>GOOGLE_CLIENT_ID</code>, <code>GOOGLE_CLIENT_SECRET</code>, <code>GOOGLE_CALLBACK_URL</code></td>
<td><a href="https://console.cloud.google.com/apis/credentials">Google Cloud Console</a></td>
</tr>
<tr>
<td><b>Discord OAuth</b></td>
<td><code>DISCORD_CLIENT_ID</code>, <code>DISCORD_CLIENT_SECRET</code>, <code>DISCORD_CALLBACK_URL</code></td>
<td><a href="https://discord.com/developers/applications">Discord Developer Portal</a></td>
</tr>
<tr>
<td><b>Pterodactyl</b></td>
<td><code>PTERODACTYL_URL</code>, <code>PTERODACTYL_APP_KEY</code>, <code>PTERODACTYL_CLIENT_KEY</code></td>
<td>Panel → Application API + Account API</td>
</tr>
</table>

> **Callback URLs format:**  
> Google: `https://yourdomain.com/api/auth/google/callback`  
> Discord: `https://yourdomain.com/api/auth/discord/callback`

### Optional

<details>
<summary><b>💳 Razorpay</b></summary>

```env
RAZORPAY_ENABLED=true
RAZORPAY_KEY_ID=rzp_live_xxxxxxxxxx
RAZORPAY_KEY_SECRET=your-secret
RAZORPAY_WEBHOOK_SECRET=your-webhook-secret
```
Webhook URL: `https://yourdomain.com/api/billing/razorpay/webhook`  
Get keys: [Razorpay Dashboard](https://dashboard.razorpay.com/app/keys)
</details>

<details>
<summary><b>💳 Cashfree</b></summary>

```env
CASHFREE_ENABLED=true
CASHFREE_APP_ID=your-app-id
CASHFREE_SECRET_KEY=your-secret
CASHFREE_ENV=production
```
Webhook URL: `https://yourdomain.com/api/billing/cashfree/webhook`  
Get keys: [Cashfree Dashboard](https://merchant.cashfree.com/)
</details>

<details>
<summary><b>💳 UPI Manual</b></summary>

```env
UPI_ENABLED=true
UPI_ID=yourname@upi
UPI_QR_URL=https://example.com/qr.png
```
Users submit UTR → admin approves/rejects from the admin panel.
</details>

<details>
<summary><b>☁️ Datalix VPS</b></summary>

```env
DATALIX_ENABLED=true
DATALIX_API_KEY=your-key
DATALIX_API_URL=https://api.datalix.de/v1
```
</details>

<details>
<summary><b>🤖 Discord Bot</b></summary>

```env
DISCORD_BOT_TOKEN=your-bot-token
DISCORD_LOG_CHANNEL_ID=123456789012345678
```
Create bot at [Discord Developer Portal](https://discord.com/developers/applications). Needs `Guilds` intent.
</details>

<details>
<summary><b>🌐 Cloudflare DNS</b></summary>

```env
CLOUDFLARE_ENABLED=true
CLOUDFLARE_API_TOKEN=your-token
CLOUDFLARE_ZONE_ID=your-zone-id
CLOUDFLARE_BASE_DOMAIN=play.gamehost.com
```
Creates `servername.play.gamehost.com` with A + SRV records automatically.
</details>

<details>
<summary><b>🪙 Ads / Credits</b></summary>

```env
FREE_CREDITS_TIMER_SECONDS=60
FREE_CREDITS_REWARD=10
FREE_SERVER_DELETE_DAYS=7
ADSENSE_PUBLISHER_ID=ca-pub-xxxxxxxxxx
ADSTERRA_SCRIPT_URL=https://...
```
</details>

<details>
<summary><b>🧾 Paymenter</b></summary>

```env
PAYMENTER_ENABLED=true
PAYMENTER_URL=https://billing.yourdomain.com
PAYMENTER_API_KEY=your-key
```
</details>

---

## 🗂️ Project Structure

```
gamehost/
├── backend/                 NestJS 10 + Prisma 5 + PostgreSQL
│   ├── src/modules/         14 feature modules
│   ├── prisma/schema.prisma 12 models, 8 enums
│   └── Dockerfile           Multi-stage (Node 20 Alpine)
├── frontend/                Next.js 14 + Tailwind + Three.js
│   ├── src/app/             14 pages (landing, dashboard, admin)
│   └── Dockerfile           Multi-stage (Node 20 Alpine)
├── nginx/nginx.conf         Reverse proxy + rate limiting + security headers
├── docker-compose.yml       5 services (postgres, redis, backend, frontend, nginx)
├── install.sh               One-command setup
├── update.sh                Safe updates (pulls, rebuilds, migrates)
└── backup.sh                Database backup with auto-rotation
```

---

## 🖥️ Frontend Pages

| Route | Page |
|-------|------|
| `/` | Landing page (Three.js 3D scene) |
| `/login` | Google + Discord OAuth |
| `/dashboard` | User dashboard |
| `/dashboard/servers` | Server list |
| `/dashboard/servers/create` | Create server |
| `/dashboard/servers/[id]` | Server detail (console, files, plugins, players, backups) |
| `/dashboard/plans` | Browse plans |
| `/dashboard/billing` | Payment history |
| `/dashboard/balance` | Wallet top-up |
| `/dashboard/credits` | Earn credits via ads |
| `/dashboard/profile` | Profile settings |
| `/dashboard/vps` | VPS management |
| `/dashboard/support` | Support |
| `/admin` | Admin dashboard 🔒 |

---

## 🔌 API Reference

All endpoints are prefixed with `/api`. Protected routes require JWT (cookie or `Authorization: Bearer` header).

<details>
<summary><b>Auth</b> — <code>/api/auth</code></summary>

| Method | Route | Auth | Description |
|--------|-------|:----:|-------------|
| GET | `/auth/google` | — | Redirect to Google OAuth |
| GET | `/auth/google/callback` | — | Google callback |
| GET | `/auth/discord` | — | Redirect to Discord OAuth |
| GET | `/auth/discord/callback` | — | Discord callback |
| GET | `/auth/me` | ✅ | Current user info |
| GET | `/auth/logout` | — | Clear session |
</details>

<details>
<summary><b>Servers</b> — <code>/api/servers</code> — 18 endpoints</summary>

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/servers` | List user's servers (with live status) |
| GET | `/servers/:id` | Server details + resources |
| POST | `/servers` | Provision new server |
| POST | `/servers/:id/power` | Power action (start/stop/restart/kill) |
| GET | `/servers/:id/console` | WebSocket credentials |
| POST | `/servers/:id/command` | Send console command |
| GET | `/servers/:id/files?dir=/` | List files |
| GET | `/servers/:id/files/contents?file=` | Read file |
| POST | `/servers/:id/files/write` | Write file |
| POST | `/servers/:id/files/delete` | Delete files |
| GET | `/servers/:id/files/upload` | Get upload URL |
| GET | `/servers/:id/backups` | List backups |
| POST | `/servers/:id/backups` | Create backup |
| GET | `/servers/:id/databases` | List databases |
| POST | `/servers/:id/databases` | Create database |
| GET | `/servers/:id/network` | Network allocations |
| GET | `/servers/:id/startup` | Startup variables |
| POST | `/servers/:id/startup` | Update startup variable |
</details>

<details>
<summary><b>Plans</b> — <code>/api/plans</code></summary>

| Method | Route | Auth | Description |
|--------|-------|:----:|-------------|
| GET | `/plans` | — | List active plans |
| GET | `/plans/eggs` | ✅ | Available eggs |
| GET | `/plans/nodes` | ✅ | Available nodes |
| GET | `/plans/:id` | — | Plan details |
| POST | `/plans/calculate` | ✅ | Calculate custom price |
</details>

<details>
<summary><b>Billing</b> — <code>/api/billing</code> — 11 endpoints</summary>

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
| POST | `/billing/upi/submit` | ✅ | Submit UPI payment |
</details>

<details>
<summary><b>Credits</b> — <code>/api/credits</code></summary>

| Method | Route | Auth | Description |
|--------|-------|:----:|-------------|
| GET | `/credits` | ✅ | Credit balance |
| GET | `/credits/config` | — | Earn config (timer, reward) |
| POST | `/credits/earn` | ✅ | Earn credits (2/min rate limit) |
</details>

<details>
<summary><b>Plugins</b> — <code>/api/plugins</code> — 10 endpoints</summary>

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/plugins/:uuid/detect` | Detect server software |
| GET | `/plugins/:uuid/installed` | List installed plugins |
| DELETE | `/plugins/:uuid/remove/:file` | Remove plugin |
| GET | `/plugins/modrinth/search` | Search Modrinth |
| GET | `/plugins/modrinth/project/:id` | Modrinth project |
| GET | `/plugins/modrinth/project/:id/versions` | Modrinth versions |
| POST | `/plugins/:uuid/modrinth/install` | Install from Modrinth |
| GET | `/plugins/spiget/search` | Search SpigotMC |
| GET | `/plugins/spiget/resource/:id` | Spiget resource |
| POST | `/plugins/:uuid/spiget/install` | Install from SpigotMC |
</details>

<details>
<summary><b>Players</b> — <code>/api/players</code> — 12 endpoints</summary>

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/players/:uuid/detect` | Is Minecraft server? |
| GET | `/players/:uuid/online` | Online players |
| GET | `/players/:uuid/whitelist` | Whitelist |
| POST | `/players/:uuid/whitelist` | Add to whitelist |
| DELETE | `/players/:uuid/whitelist/:player` | Remove from whitelist |
| GET | `/players/:uuid/banned` | Banned players |
| POST | `/players/:uuid/ban` | Ban player |
| POST | `/players/:uuid/unban` | Unban player |
| GET | `/players/:uuid/ops` | Operators |
| POST | `/players/:uuid/op` | Op player |
| POST | `/players/:uuid/deop` | Deop player |
| POST | `/players/:uuid/kick` | Kick player |
</details>

<details>
<summary><b>VPS</b> — <code>/api/vps</code></summary>

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/vps/plans` | List VPS plans |
| GET | `/vps` | User's VPS instances |
| POST | `/vps` | Provision VPS |
| GET | `/vps/:id` | VPS status |
| POST | `/vps/:id/control` | Control (start/stop/restart) |
| DELETE | `/vps/:id` | Terminate |
</details>

<details>
<summary><b>Admin</b> — <code>/api/admin</code> 🔒 — 19 endpoints</summary>

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/admin/dashboard` | Dashboard stats |
| GET | `/admin/users` | List users (paginated) |
| GET | `/admin/users/:id` | User details |
| PATCH | `/admin/users/:id/role` | Set role (USER/ADMIN) |
| DELETE | `/admin/users/:id` | Delete user |
| GET | `/admin/servers` | List all servers |
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
</details>

<details>
<summary><b>Health</b> — <code>/api/health</code></summary>

```bash
curl http://localhost:4000/api/health
```
Returns: status (`ok` / `degraded`), database + Redis connectivity, uptime, memory usage, Node.js version.
</details>

---

## 🛠️ Commands

```bash
# Start / Stop / Restart
docker compose up -d
docker compose down
docker compose down && docker compose up -d

# Logs
docker compose logs -f              # all services
docker compose logs -f backend      # specific service
docker compose logs --tail=100 backend

# Status
docker compose ps
docker stats

# Database
docker compose exec postgres psql -U gamehost -d gamehost
docker compose exec backend npx prisma migrate deploy
docker compose exec backend npx prisma migrate status

# Shell access
docker compose exec backend sh

# Rebuild
docker compose build --no-cache
docker compose down && docker compose up -d
```

---

## 🔄 Update

```bash
bash update.sh
```

Pulls latest code → rebuilds containers → restarts services → runs migrations. **Safe** — never touches `.env`, database, or backups.

<details>
<summary>Manual update steps</summary>

```bash
git pull
docker compose build --no-cache
docker compose down && docker compose up -d
docker compose exec backend npx prisma migrate deploy
```
</details>

---

## 💾 Backups

```bash
bash backup.sh                        # backup now
ls -lh ./backups/                      # list backups
```

Auto-rotates backups older than 7 days. Output: `./backups/gamehost_YYYYMMDD_HHMMSS.sql.gz`

<details>
<summary>Automatic daily backups (cron)</summary>

```bash
crontab -e
# Add:
0 3 * * * cd /path/to/gamehost && bash backup.sh >> /var/log/gamehost-backup.log 2>&1
```
</details>

<details>
<summary>Restore from backup</summary>

```bash
gunzip -k ./backups/gamehost_20260301_030000.sql.gz
cat ./backups/gamehost_20260301_030000.sql | docker compose exec -T postgres psql -U gamehost -d gamehost
docker compose restart backend
```
</details>

---

## 🔒 SSL Setup

<details>
<summary><b>Option A — Let's Encrypt (Certbot)</b></summary>

```bash
sudo apt install certbot -y
docker compose stop nginx
sudo certbot certonly --standalone -d yourdomain.com
sudo cp /etc/letsencrypt/live/yourdomain.com/fullchain.pem ./nginx/ssl/
sudo cp /etc/letsencrypt/live/yourdomain.com/privkey.pem ./nginx/ssl/
docker compose start nginx
```

Then uncomment the SSL lines in `nginx/nginx.conf` and restart:

```bash
docker compose restart nginx
```

Auto-renew:
```bash
crontab -e
# Add:
0 */12 * * * certbot renew --quiet --pre-hook "cd /path/to/gamehost && docker compose stop nginx" --post-hook "cd /path/to/gamehost && docker compose start nginx"
```
</details>

<details>
<summary><b>Option B — Cloudflare (easiest)</b></summary>

1. Point DNS to your server IP in Cloudflare
2. Set SSL mode to **Full** or **Full (Strict)**
3. Done — no certificates needed on your server
</details>

---

## ⏰ Background Jobs

These run automatically — no setup needed.

| Schedule | Action |
|----------|--------|
| Every hour | Suspend expired servers |
| Every hour | Delete servers suspended 48h+ |
| Every hour | Flag servers expiring within 7 days |
| Every 30 min | Suspend free servers at 0 credits |
| Every 30 min | Delete free servers suspended > `FREE_SERVER_DELETE_DAYS` |

---

## 🗄️ Database

PostgreSQL 16 with Prisma ORM — 12 models, 8 enums.

<details>
<summary>View schema details</summary>

**Models:** User, PterodactylAccount, Server, Plan, Payment, Balance, Credit, CreditEarn, UpiPayment, Vps, AdminSetting, AuditLog

**Enums:** Role (USER/ADMIN), AuthProvider (GOOGLE/DISCORD), ServerStatus (ACTIVE/SUSPENDED/EXPIRED/DELETED/INSTALLING), PlanType (FREE/PREMIUM/CUSTOM), NodeAssignMode (ADMIN_LOCKED/USER_SELECTABLE/DYNAMIC), PaymentGateway (RAZORPAY/CASHFREE/UPI/BALANCE), PaymentStatus (PENDING/COMPLETED/FAILED/REFUNDED), UpiStatus (PENDING/APPROVED/REJECTED), VpsStatus (ACTIVE/SUSPENDED/TERMINATED/PROVISIONING)

Full schema: [`backend/prisma/schema.prisma`](backend/prisma/schema.prisma)
</details>

---

## 🔧 Troubleshooting

<details>
<summary><b>Container won't start</b></summary>

```bash
docker compose ps
docker compose logs backend
```
</details>

<details>
<summary><b>Port already in use</b></summary>

```bash
sudo lsof -i :3000
sudo kill -9 <PID>
# Or change in .env: FRONTEND_PORT=3001
```
</details>

<details>
<summary><b>Database connection errors</b></summary>

```bash
docker compose exec postgres pg_isready -U gamehost
docker compose restart postgres && sleep 5 && docker compose restart backend
```
</details>

<details>
<summary><b>Migration failed</b></summary>

```bash
docker compose exec backend npx prisma migrate status
docker compose exec backend npx prisma migrate deploy
# Nuclear: docker compose exec backend npx prisma migrate reset --force
```
</details>

<details>
<summary><b>OAuth login fails</b></summary>

1. Verify callback URLs in `.env` match Google/Discord settings exactly
2. Ensure `APP_URL` matches your domain  
3. Check logs: `docker compose logs -f backend`
</details>

<details>
<summary><b>Full reset (⚠️ deletes all data)</b></summary>

```bash
docker compose down -v
bash install.sh
```
</details>

---

## 🔒 Security

| Layer | Protection |
|-------|-----------|
| Auth | OAuth-only (zero passwords stored) |
| Tokens | httpOnly + secure + SameSite cookies, 7-day expiry |
| Backend | Helmet, CORS (single origin), class-validator (whitelist mode) |
| Rate Limiting | NestJS: 100 req/60s · Nginx: 30 req/s API, 5 req/min auth |
| Access Control | Role-based guards (USER / ADMIN) |
| Headers | X-Frame-Options, X-Content-Type-Options, X-XSS-Protection, Referrer-Policy |
| Proxy | Nginx with gzip, WebSocket support, SSL-ready with HSTS |

---

## 📄 License

MIT
]]>
