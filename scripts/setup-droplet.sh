#!/usr/bin/env bash
set -euo pipefail

# ── AI(r)Drop — DigitalOcean Droplet Setup ───────────────────────────────────
# Run this once on a fresh Ubuntu 22.04+ droplet:
#   curl -sSL <raw-github-url>/scripts/setup-droplet.sh | bash
# Or after cloning:
#   chmod +x scripts/setup-droplet.sh && sudo ./scripts/setup-droplet.sh

echo "══════════════════════════════════════════════════════════"
echo "  AI(r)Drop — Droplet Setup"
echo "══════════════════════════════════════════════════════════"

# 1. System updates + Docker
echo "[1/5] Installing Docker..."
apt-get update -qq
apt-get install -y -qq ca-certificates curl gnupg lsb-release ufw

if ! command -v docker &> /dev/null; then
  curl -fsSL https://get.docker.com | sh
  systemctl enable docker
  systemctl start docker
fi

if ! docker compose version &> /dev/null; then
  apt-get install -y -qq docker-compose-plugin
fi

echo "  ✓ Docker $(docker --version | cut -d' ' -f3)"

# 2. Firewall
echo "[2/5] Configuring firewall..."
ufw allow OpenSSH
ufw allow 80/tcp
ufw allow 443/tcp
ufw allow 8000/tcp   # Django API (direct access for debugging)
ufw --force enable
echo "  ✓ UFW enabled (SSH, HTTP, HTTPS, 8000)"

# 3. Create app directory
echo "[3/5] Setting up app directory..."
APP_DIR="/opt/airdrop-works"
if [ ! -d "$APP_DIR" ]; then
  mkdir -p "$APP_DIR"
  echo "  Created $APP_DIR"
else
  echo "  $APP_DIR already exists"
fi

# 4. Create swap (small droplets need it for Docker builds)
echo "[4/5] Ensuring swap space..."
if [ ! -f /swapfile ]; then
  fallocate -l 2G /swapfile
  chmod 600 /swapfile
  mkswap /swapfile
  swapon /swapfile
  echo '/swapfile none swap sw 0 0' >> /etc/fstab
  echo "  ✓ 2GB swap created"
else
  echo "  ✓ Swap already exists"
fi

# 5. Print next steps
echo ""
echo "══════════════════════════════════════════════════════════"
echo "  Setup complete! Next steps:"
echo ""
echo "  1. Clone your repo:"
echo "     cd /opt/airdrop-works"
echo "     git clone <your-repo-url> ."
echo ""
echo "  2. Create backend env:"
echo "     cp backend/.env.example backend/.env"
echo "     nano backend/.env    # fill in API keys"
echo ""
echo "  3. Deploy:"
echo "     chmod +x scripts/deploy.sh"
echo "     ./scripts/deploy.sh"
echo "══════════════════════════════════════════════════════════"
