# GameHost Platform

A complete production-grade game hosting platform built on the **Pterodactyl Panel API** with automated billing, plugin management, and VPS reselling.

## 🚀 Quick Start

### One-command Install

```bash
git clone https://github.com/your-org/gamehost.git
cd gamehost
bash install.sh
```

This will:
- Generate `.env` with random secrets
- Build Docker containers
- Run database migrations
- Start all services

### Access
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:4000

## ⚙️ Configuration

Edit `.env` to configure:

| Category | Variables |
|----------|----------|
| **OAuth** | `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `DISCORD_CLIENT_ID`, `DISCORD_CLIENT_SECRET` |
| **Pterodactyl** | `PTERODACTYL_URL`, `PTERODACTYL_APP_KEY`, `PTERODACTYL_CLIENT_KEY` |
| **Payments** | `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `CASHFREE_APP_ID`, `CASHFREE_SECRET_KEY` |
| **VPS** | `DATALIX_API_KEY`, `DATALIX_API_URL` |
| **Discord Bot** | `DISCORD_BOT_TOKEN`, `DISCORD_LOG_CHANNEL_ID` |

## 🏗️ Architecture

```
backend/     NestJS + Prisma + PostgreSQL
frontend/    Next.js 14 + TailwindCSS + Three.js
postgres     PostgreSQL 16
redis        Redis 7
```

### Backend Modules
- **Auth** — Google + Discord OAuth, JWT sessions, Pterodactyl auto-heal
- **Servers** — Provisioning, power, console, files, backups, databases
- **Plans** — Free + premium + custom builder with slider pricing
- **Billing** — Razorpay, Cashfree, UPI manual, balance, renewal lifecycle
- **Credits** — Ad-based earning system with timer, auto-suspend free servers
- **Plugins** — Modrinth + SpigotMC search, one-click install
- **Players** — Whitelist, ban, op, kick (Aternos-style)
- **VPS** — Datalix reseller integration
- **Admin** — Full dashboard, user/server management, settings, audit logs
- **Discord** — Optional notification bot

## 📦 Update

```bash
bash update.sh
```

Safe update: pulls code, rebuilds, migrates, restarts. No data loss.

## 🔒 Security

- OAuth-only authentication (zero password storage)
- JWT with httpOnly secure cookies
- Helmet + CORS + rate limiting
- Server-side validation (class-validator)
- Role-based access control
- API keys stored in `.env` only

## 📄 License

MIT
