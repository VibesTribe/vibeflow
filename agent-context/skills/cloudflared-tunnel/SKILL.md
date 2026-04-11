---
name: cloudflared-tunnel
description: Set up a persistent Cloudflare Tunnel to expose local services to the internet with HTTPS, custom domain, and no port forwarding.
tags: [cloudflare, tunnel, cloudflared, expose, https, domain, ngrok-alternative]
version: 0.1
---

# Cloudflared Named Tunnel

Expose local services (APIs, web servers, agents) to the internet via a persistent HTTPS URL on your own domain. No port forwarding, no dynamic DNS, Cloudflare handles TLS.

## When to Use

- Exposing a local dev server or agent to the internet
- Replacing ngrok with a persistent URL
- Phone/remote access to home server services
- Webhook endpoints that need a stable public URL

## Quick Tunnel (Testing Only)

```bash
# Random URL, no account needed, changes every restart
cloudflared tunnel --url http://localhost:8080
```
Only for quick tests. URL is random and changes on restart.

## Named Tunnel (Production)

### Prerequisites
- A Cloudflare account (free tier works)
- A domain with nameservers pointed at Cloudflare
- cloudflared installed: download .deb from GitHub releases or use package manager

### Step 1: Authenticate

```bash
cloudflared tunnel login
```
Opens browser to Cloudflare. Select the domain to authorize. Creates `~/.cloudflared/cert.pem`.

### Step 2: Create Tunnel

```bash
cloudflared tunnel create <name>
```
Outputs tunnel ID and creates credentials file at `~/.cloudflared/<tunnel-id>.json`. Keep this file secret.

### Step 3: Route DNS

```bash
cloudflared tunnel route dns <name> <subdomain.yourdomain.com>
```
Automatically creates a CNAME record in Cloudflare DNS pointing to the tunnel. No manual DNS editing needed.

### Step 4: Create Config

Write `~/.cloudflared/config.yml`:

```yaml
tunnel: <name>
credentials-file: /home/user/.cloudflared/<tunnel-id>.json

ingress:
  - hostname: <subdomain.yourdomain.com>
    service: http://localhost:8080
  - service: http_status:404
```

The catch-all `http_status:404` at the end is required — any request not matching a hostname returns 404.

### Step 5: Run

```bash
cloudflared tunnel run <name>
```
Register 4 connections to Cloudflare edge. Service is now live at `https://<subdomain.yourdomain.com>`.

### Verify

```bash
curl -s -o /dev/null -w "%{http_code}" https://<subdomain.yourdomain.com>
```
Any response (even 404 from your app) means the tunnel is working.

## Multi-Service Routing

Route different subdomains to different local services:

```yaml
ingress:
  - hostname: api.example.com
    service: http://localhost:8080
  - hostname: ws.example.com
    service: ws://localhost:9090
  - hostname: app.example.com
    service: http://localhost:3000
  - service: http_status:404
```

## Run as systemd Service

```bash
echo "PASSWORD" | sudo -S cloudflared service install
```
Creates systemd service that starts on boot. Runs as root with config from `/etc/cloudflared/`.

## Domain Setup (if not on Cloudflare yet)

If domain is at another registrar (Namecheap, GoDaddy, etc.):
1. Add domain to Cloudflare dashboard (free plan)
2. Cloudflare gives you two nameservers
3. At your registrar, change nameservers to Cloudflare's
4. Wait for propagation (usually minutes, up to 48 hours)
5. Cloudflare imports existing DNS records automatically — nothing breaks

No domain transfer needed. Just nameserver change. Fully reversible.

## Pitfalls

1. **sudo with curl pipe** — Download .deb separately, then `dpkg -i`. Piping curl into sudo sh fails.
2. **catch-all route required** — Config must end with a default route (usually `http_status:404`) or cloudflared won't start.
3. **credentials file path** — Must be absolute path in config.yml, not relative.
4. **ICMP proxy warnings** — Harmless. Just means ping won't proxy through the tunnel.
5. **UDP buffer warning** — Harmless performance note, can be ignored.
6. **Quick tunnel URL changes** — Don't rely on quick tunnel URLs for anything persistent. Use named tunnels.
7. **Multiple tunnels** — Each tunnel needs its own config or separate ingress rules. Don't run two tunnels for the same hostname.
