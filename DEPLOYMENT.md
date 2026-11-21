# CollabArch — Production Deployment Guide & Readiness Verification

This guide outlines the production deployment architecture, containerization mechanics, environment configuration audit, and step-by-step instructions for hosting CollabArch across various cloud and self-hosted environments.

---

## 1. System Architecture & Topology

CollabArch is a real-time collaborative architecture design platform built on a Turborepo + pnpm monorepo. In production, four primary services operate together:

```mermaid
flowchart TD
    subgraph Clients["Clients (Browsers)"]
        User["Collaborator Browser"]
    end

    subgraph Edge["Reverse Proxy / Edge Layer"]
        Proxy["Caddy / Nginx / Cloudflare / Vercel Edge"]
    end

    subgraph DockerServices["Internal Network (collabarch_prod_network)"]
        Web["Web Frontend (Next.js Standalone SSR)<br/>Port 3000"]
        Server["Backend Server (NestJS REST & WS)<br/>Port 4000"]
        PG[("PostgreSQL 16<br/>Port 5432")]
        RD[("Redis 7 (Pub/Sub Mesh)<br/>Port 6379")]
    end

    subgraph External["External Cloud Services"]
        Clerk["Clerk Authentication"]
        Gemini["Google Gemini AI"]
    end

    User -->|HTTPS| Proxy
    User -->|WSS (WebSockets)| Proxy
    Proxy -->|HTTP :3000| Web
    Proxy -->|HTTP & WS :4000| Server

    Web -->|User Auth Verification| Clerk
    Server -->|Webhook & Token Validation| Clerk
    Server -->|AI Analysis & Simulation| Gemini
    Server -->|Data Persistence| PG
    Server <-->|Yjs Awareness & Pub/Sub Mesh| RD
```

### Monorepo Containerization Strategy
- **Shared Package Resolution**: `@collabarch/shared-types` is built within Docker builder stages and consumed by both `@collabarch/server` and `@collabarch/web`.
- **Next.js Standalone Output**: Enabled via `output: 'standalone'` in `apps/web/next.config.mjs`, producing a minimized production runtime bundle with selective node modules.
- **Automated Prisma Migrations**: Server container starts up with `prisma migrate deploy && node dist/main.js` to ensure the database schema is automatically updated prior to accepting traffic.
- **Non-Root Execution**: Both production images execute as isolated non-root system users (`nextjs:nodejs` and `nestjs:nodejs`).

---

## 2. Production Environment Variable Audit Matrix

Before deploying to production, verify that all required environment variables are set in your deployment environment. Refer to `.env.production.example` for a clean template.

### Backend (`apps/server`) Environment Variables

| Variable | Required? | Secret? | Description & Example |
| :--- | :---: | :---: | :--- |
| `DATABASE_URL` | **Yes** | Yes | PostgreSQL connection string including connection pooling parameters.<br/>`postgresql://user:pass@host:5432/collabarch?schema=public&connection_limit=25&pool_timeout=15` |
| `REDIS_HOST` | **Yes** | No | Redis host name (e.g. `redis` in Docker Compose or cloud host). |
| `REDIS_PORT` | **Yes** | No | Redis port (e.g. `6379`). |
| `REDIS_PASSWORD` | Optional | Yes | Redis authentication password (leave empty if no password). |
| `REDIS_URL` | Optional | Yes | Alternative full Redis URL (e.g. `rediss://default:pass@host:6379` for TLS). |
| `PORT` | Optional | No | Server listen port. Default: `4000`. |
| `NODE_ENV` | **Yes** | No | Set to `production`. |
| `ALLOWED_ORIGINS` | **Yes** | No | Comma-separated list of allowed frontend origins without trailing slash.<br/>`https://collabarch.com,https://app.collabarch.com` |
| `CLERK_SECRET_KEY` | **Yes** | Yes | Clerk backend secret key from Clerk Dashboard (starts with `sk_live_`). |
| `CLERK_WEBHOOK_SECRET` | Optional | Yes | Svix endpoint signing secret from Clerk Dashboard -> Webhooks (starts with `whsec_`). Required if using user sync webhooks. |
| `ENABLE_DEV_AUTH_BYPASS` | **Yes** | No | **STRICTLY `false` IN PRODUCTION**. Bypasses auth checks if true. |
| `GEMINI_API_KEY` | **Yes** | Yes | Google Gemini API key obtained from [Google AI Studio](https://aistudio.google.com). |
| `GEMINI_MODEL` | Optional | No | Gemini model identifier. Default: `gemini-2.5-flash`. |

### Frontend (`apps/web`) Environment Variables

> [!IMPORTANT]
> Any variable prefixed with `NEXT_PUBLIC_` is inlined into the client-side JavaScript bundle during the build step. Ensure these are defined during `docker build` (via Docker build `args`) or provided in your CI/CD pipeline.

| Variable | Required? | Secret? | Description & Example |
| :--- | :---: | :---: | :--- |
| `NEXT_PUBLIC_SERVER_URL` | **Yes** | No | Public HTTP URL of the backend API.<br/>`https://api.collabarch.com` |
| `NEXT_PUBLIC_WS_URL` | **Yes** | No | Public WebSocket endpoint for real-time collaboration.<br/>`wss://api.collabarch.com/ws` |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | **Yes** | No | Clerk frontend publishable key from Clerk Dashboard (starts with `pk_live_`). |
| `CLERK_SECRET_KEY` | **Yes** | Yes | Clerk secret key used server-side by Next.js middleware (starts with `sk_live_`). |
| `NEXT_PUBLIC_CLERK_SIGN_IN_URL` | Optional | No | Route for sign-in page. Default: `/sign-in`. |
| `NEXT_PUBLIC_CLERK_SIGN_UP_URL` | Optional | No | Route for sign-up page. Default: `/sign-up`. |
| `NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL` | Optional | No | Redirect target post sign-in. Default: `/`. |
| `NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL` | Optional | No | Redirect target post sign-up. Default: `/`. |

---

## 3. Pre-Flight Verification & Health Checks

CollabArch includes built-in unauthenticated health check endpoints for container orchestrators, uptime monitors, and load balancers:

1. **Backend Server**:
   - Endpoint: `GET http://localhost:4000/health`
   - Response: `{"status":"ok","uptime":123.4,"timestamp":"2026-11-20T14:00:00.000Z"}`
   - Status code: `200 OK`
2. **Web Frontend**:
   - Endpoint: `GET http://localhost:3000/api/health`
   - Response: `{"status":"ok","timestamp":"2026-11-20T14:00:00.000Z"}`
   - Status code: `200 OK`

---

## 4. Hosting Options

### Option A: Railway / Render (Full-Stack Managed Platform)

Railway provides native support for monorepos, managed PostgreSQL, and managed Redis.

#### 1. Provision Databases
1. Create a new Railway Project.
2. Add a **PostgreSQL** database service:
   - Copy the provided `DATABASE_URL` (use the internal connection string if deploying services within the same project).
3. Add a **Redis** service:
   - Copy the provided `REDIS_URL`.

#### 2. Deploy Server Service
1. Add a new service from your GitHub repository.
2. In **Settings**:
   - **Root Directory**: Leave blank (monorepo root `/`).
   - **Build**: Select **Dockerfile**.
   - **Dockerfile Path**: `apps/server/Dockerfile`.
3. In **Variables**:
   - `DATABASE_URL`: `${{Postgres.DATABASE_URL}}`
   - `REDIS_URL`: `${{Redis.REDIS_URL}}`
   - `REDIS_HOST`: `${{Redis.REDISHOST}}`
   - `REDIS_PORT`: `${{Redis.REDISPORT}}`
   - `REDIS_PASSWORD`: `${{Redis.REDISPASSWORD}}`
   - `ALLOWED_ORIGINS`: `https://your-web-service.up.railway.app` (or custom domain)
   - `CLERK_SECRET_KEY`: `sk_live_...`
   - `CLERK_WEBHOOK_SECRET`: `whsec_...`
   - `ENABLE_DEV_AUTH_BYPASS`: `false`
   - `GEMINI_API_KEY`: `AIzaSy...`
   - `GEMINI_MODEL`: `gemini-2.5-flash`
   - `PORT`: `4000`
4. In **Networking**:
   - Generate a Public Domain (e.g. `api-production.up.railway.app`).

#### 3. Deploy Web Service
1. Add a second service from the same GitHub repository.
2. In **Settings**:
   - **Root Directory**: Leave blank (monorepo root `/`).
   - **Build**: Select **Dockerfile**.
   - **Dockerfile Path**: `apps/web/Dockerfile`.
3. In **Build Arguments** (and Variables):
   - `NEXT_PUBLIC_SERVER_URL`: `https://api-production.up.railway.app`
   - `NEXT_PUBLIC_WS_URL`: `wss://api-production.up.railway.app/ws`
   - `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`: `pk_live_...`
   - `CLERK_SECRET_KEY`: `sk_live_...`
4. In **Networking**:
   - Set Port to `3000` and generate a Public Domain.

---

### Option B: Vercel (Frontend) + Railway / Render (Backend & Databases)

This hybrid configuration provides global edge routing and CDN caching for Next.js assets on Vercel while keeping stateful WebSocket and Pub/Sub connections on Railway.

#### 1. Backend & Databases on Railway
- Deploy PostgreSQL, Redis, and `apps/server/Dockerfile` on Railway as described in **Option A**.
- Note the public backend domain: `https://api.yourdomain.com` and WebSocket URL: `wss://api.yourdomain.com/ws`.

#### 2. Deploy Frontend on Vercel
1. In the Vercel Dashboard, import the Git repository.
2. In **Project Settings**:
   - **Framework Preset**: `Next.js`
   - **Root Directory**: `apps/web`
3. In **Build and Output Settings**:
   - Vercel automatically detects Next.js. Turborepo build caching is supported out of the box.
4. In **Environment Variables**:
   - `NEXT_PUBLIC_SERVER_URL`: `https://api.yourdomain.com`
   - `NEXT_PUBLIC_WS_URL`: `wss://api.yourdomain.com/ws`
   - `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`: `pk_live_...`
   - `CLERK_SECRET_KEY`: `sk_live_...`
5. Click **Deploy**.
6. **Update Allowed Origins**: Copy your assigned Vercel domain (e.g. `https://collabarch.vercel.app` or custom domain) and update the `ALLOWED_ORIGINS` variable on your Railway Server service.

---

### Option C: Self-Hosted VPS with Docker Compose & Reverse Proxy

Ideal for running on a dedicated Linux VPS (Ubuntu 22.04 / 24.04 LTS, Debian 12, or AWS EC2).

#### 1. VPS Host Setup & Prerequisites
Install Docker and Docker Compose v2 on your server:

```bash
# Update system packages
sudo apt update && sudo apt upgrade -y

# Install Docker engine & Compose plugin
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker $USER

# Configure firewall (UFW)
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow 22/tcp   # SSH
sudo ufw allow 80/tcp   # HTTP
sudo ufw allow 443/tcp  # HTTPS
sudo ufw enable
```

#### 2. Clone Repository & Setup Environment
```bash
git clone https://github.com/your-org/CollabArch.git /opt/collabarch
cd /opt/collabarch

# Create production environment file from template
cp .env.production.example .env.production
nano .env.production
```
Fill in your secure credentials (`POSTGRES_PASSWORD`, `CLERK_SECRET_KEY`, `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `GEMINI_API_KEY`, etc.).

#### 3. Start Production Containers
```bash
# Build and start services in detached mode
docker compose -f docker-compose.prod.yml --env-file .env.production up -d --build

# Verify all containers are running and healthy
docker compose -f docker-compose.prod.yml ps
```

#### 4. Configure Reverse Proxy & SSL

Choose either **Caddy** (simplest, automatic SSL) or **Nginx** (industry standard).

##### Sub-option C.1: Caddy (Recommended for simplicity)
Install Caddy:
```bash
sudo apt install -y debian-keyring debian-archive-keyring apt-transport-https curl
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list
sudo apt update && sudo apt install -y caddy
```

Create `/etc/caddy/Caddyfile`:
```caddy
# Frontend Web App
collabarch.yourdomain.com {
    reverse_proxy localhost:3000
}

# Backend API & WebSocket Gateway
api.collabarch.yourdomain.com {
    # Automatic WebSocket upgrade header forwarding
    reverse_proxy localhost:4000 {
        header_up Host {host}
        header_up X-Real-IP {remote_host}
    }
}
```
Reload Caddy:
```bash
sudo systemctl reload caddy
```
Caddy automatically provisions and renews Let's Encrypt TLS certificates.

---

##### Sub-option C.2: Nginx with Certbot
Install Nginx and Certbot:
```bash
sudo apt install -y nginx certbot python3-certbot-nginx
```

Create `/etc/nginx/sites-available/collabarch.conf`:
```nginx
# Map connection header for proper WebSocket upgrading
map $http_upgrade $connection_upgrade {
    default upgrade;
    ''      close;
}

# Frontend Web Application
server {
    server_name collabarch.yourdomain.com;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection $connection_upgrade;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

# Backend API & Real-Time WebSocket Gateway
server {
    server_name api.collabarch.yourdomain.com;

    client_max_body_size 50M;

    location / {
        proxy_pass http://127.0.0.1:4000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection $connection_upgrade;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # WebSocket connection timeout tuning (prevents premature timeouts)
        proxy_read_timeout 86400s;
        proxy_send_timeout 86400s;
    }
}
```

Enable site and acquire SSL certificates:
```bash
sudo ln -s /etc/nginx/sites-available/collabarch.conf /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx

# Automatically configure SSL with Let's Encrypt
sudo certbot --nginx -d collabarch.yourdomain.com -d api.collabarch.yourdomain.com
```

---

## 5. Clerk Production Configuration Checklist

1. **Production Instance**: In Clerk Dashboard, switch from **Development** to **Production** instance.
2. **Authorized Domains & Redirects**:
   - Add your production domain: `https://collabarch.yourdomain.com`.
   - Ensure Redirect URLs match:
     - Sign-in: `https://collabarch.yourdomain.com/sign-in`
     - Sign-up: `https://collabarch.yourdomain.com/sign-up`
     - After sign-in/up: `https://collabarch.yourdomain.com/`
3. **Webhooks Setup**:
   - In Clerk Dashboard -> **Webhooks** -> **Add Endpoint**.
   - URL: `https://api.collabarch.yourdomain.com/webhooks/clerk`
   - Events: `user.created`, `user.updated`, `user.deleted`
   - Copy **Signing Secret** and assign to `CLERK_WEBHOOK_SECRET`.

---

## 6. Day-2 Operations & Maintenance

### Zero-Downtime Application Update
```bash
cd /opt/collabarch
git pull origin main

# Rebuild and restart services smoothly
docker compose -f docker-compose.prod.yml --env-file .env.production up -d --build
```

### Inspect Logs
```bash
# Follow combined logs
docker compose -f docker-compose.prod.yml logs -f --tail=100

# View specific service logs
docker compose -f docker-compose.prod.yml logs -f server
docker compose -f docker-compose.prod.yml logs -f web
```

### Manual Database Migrations
Prisma automatically runs migrations on server startup. To execute or verify migrations manually:
```bash
docker compose -f docker-compose.prod.yml exec server prisma migrate status
docker compose -f docker-compose.prod.yml exec server prisma migrate deploy
```

### Automated Database Backups
Create a daily backup script `/opt/collabarch/backup-db.sh`:
```bash
#!/bin/bash
BACKUP_DIR="/var/backups/collabarch"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
mkdir -p "$BACKUP_DIR"

docker exec collabarch-prod-postgres pg_dump -U postgres collabarch | gzip > "$BACKUP_DIR/collabarch_$TIMESTAMP.sql.gz"

# Retain backups for 14 days
find "$BACKUP_DIR" -type f -mtime +14 -name "*.sql.gz" -delete
```
Add to cron (`crontab -e`):
```cron
0 3 * * * /opt/collabarch/backup-db.sh > /dev/null 2>&1
```

