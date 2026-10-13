#!/usr/bin/env bash
#
# Install and run the UFQ website on a fresh AWS EC2 server
# (Ubuntu 22.04/24.04, Debian 12, or Amazon Linux 2023).
#
# First time:
#   git clone https://github.com/Mahmoudkamal448/ufq.git
#   cd ufq
#   sudo bash scripts/deploy-aws.sh
#
# The site is served over HTTPS with a free certificate: on your own domain if you
# give one, otherwise on https://<ip-with-dashes>.sslip.io.
#
# To update the site later (pulls the latest code and rebuilds), run the same command again.
# Uploads, admin edits and settings are kept.
#
set -euo pipefail

say()  { printf '\n\033[1;34m==> %s\033[0m\n' "$*"; }
warn() { printf '\033[1;33m!!  %s\033[0m\n' "$*"; }
die()  { printf '\033[1;31mError: %s\033[0m\n' "$*" >&2; exit 1; }

[ "$(id -u)" -eq 0 ] || die "run it with sudo:  sudo bash scripts/deploy-aws.sh"

APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
[ -f "$APP_DIR/docker-compose.yml" ] || die "run this from inside the ufq folder (scripts/deploy-aws.sh)"
cd "$APP_DIR"
APP_USER="${SUDO_USER:-root}"

# ---------------------------------------------------------------------------
# 1. Docker
# ---------------------------------------------------------------------------
. /etc/os-release
ARCH="$(uname -m)"   # x86_64 or aarch64

install_compose_plugins() {
  # Amazon Linux's docker package has no compose/buildx: install the official binaries.
  local dir=/usr/local/lib/docker/cli-plugins
  mkdir -p "$dir"
  if ! docker compose version >/dev/null 2>&1; then
    say "Installing Docker Compose"
    curl -fsSL -o "$dir/docker-compose" \
      "https://github.com/docker/compose/releases/latest/download/docker-compose-linux-${ARCH}"
    chmod +x "$dir/docker-compose"
  fi
  if ! docker buildx version >/dev/null 2>&1; then
    say "Installing Docker Buildx"
    local barch=amd64; [ "$ARCH" = "aarch64" ] && barch=arm64
    local ver
    ver="$(curl -fsSL https://api.github.com/repos/docker/buildx/releases/latest | grep -m1 '"tag_name"' | cut -d'"' -f4)"
    [ -n "$ver" ] || die "couldn't find the latest Docker Buildx version"
    curl -fsSL -o "$dir/docker-buildx" \
      "https://github.com/docker/buildx/releases/download/${ver}/buildx-${ver}.linux-${barch}"
    chmod +x "$dir/docker-buildx"
  fi
}

if ! command -v docker >/dev/null 2>&1 || ! docker compose version >/dev/null 2>&1; then
  case "${ID:-}" in
    ubuntu|debian)
      say "Installing Docker (this takes a minute)"
      apt-get update -qq
      apt-get install -y -qq ca-certificates curl git >/dev/null
      curl -fsSL https://get.docker.com | sh
      ;;
    amzn)
      say "Installing Docker (this takes a minute)"
      dnf install -y -q docker git
      install_compose_plugins
      ;;
    *)
      die "unsupported system '${PRETTY_NAME:-unknown}'. Use Ubuntu 22.04/24.04 or Amazon Linux 2023."
      ;;
  esac
fi
if [ "${ID:-}" = "amzn" ]; then install_compose_plugins; fi

systemctl enable --now docker >/dev/null 2>&1
# Let the login user run docker without sudo (takes effect after logging in again)
if [ "$APP_USER" != "root" ] && ! id -nG "$APP_USER" | grep -qw docker; then
  usermod -aG docker "$APP_USER"
fi
docker compose version >/dev/null || die "Docker Compose is not working"

# ---------------------------------------------------------------------------
# 2. Swap (small instances like t2.micro / t3.micro run out of memory while building)
# ---------------------------------------------------------------------------
MEM_MB="$(awk '/MemTotal/ {print int($2/1024)}' /proc/meminfo)"
if [ "$MEM_MB" -lt 2000 ] && ! swapon --show | grep -q .; then
  say "Adding 2 GB of swap (this server has only ${MEM_MB} MB of memory)"
  if [ ! -f /swapfile ]; then
    fallocate -l 2G /swapfile 2>/dev/null || dd if=/dev/zero of=/swapfile bs=1M count=2048 status=none
    chmod 600 /swapfile
    mkswap /swapfile >/dev/null
  fi
  swapon /swapfile
  grep -q '^/swapfile ' /etc/fstab || echo '/swapfile none swap sw 0 0' >> /etc/fstab
fi

# ---------------------------------------------------------------------------
# 3. Latest code
# ---------------------------------------------------------------------------
if [ -d .git ]; then
  say "Getting the latest code"
  if ! sudo -u "$APP_USER" git pull --ff-only; then
    warn "couldn't update the code (local changes or no access) – continuing with the current version"
  fi
fi

# ---------------------------------------------------------------------------
# 4. Settings (.env) – password and domain are asked only the first time
# ---------------------------------------------------------------------------
TOKEN="$(curl -fsS -m 2 -X PUT http://169.254.169.254/latest/api/token \
  -H 'X-aws-ec2-metadata-token-ttl-seconds: 60' 2>/dev/null || true)"
PUBLIC_IP="$(curl -fsS -m 2 -H "X-aws-ec2-metadata-token: $TOKEN" \
  http://169.254.169.254/latest/meta-data/public-ipv4 2>/dev/null || true)"
[ -n "$PUBLIC_IP" ] || PUBLIC_IP="$(curl -fsS -m 3 https://checkip.amazonaws.com 2>/dev/null || true)"
[[ "$PUBLIC_IP" =~ ^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$ ]] \
  || die "couldn't find this server's public IP. Does the instance have a public IP / Elastic IP?"

# Write KEY=value into .env, replacing any old value
set_env() {
  local key="$1" value="$2" tmp
  tmp="$(mktemp)"
  grep -v "^${key}=" .env > "$tmp" || true
  printf '%s=%s\n' "$key" "$value" >> "$tmp"
  mv "$tmp" .env
}

if [ ! -f .env ]; then
  say "First-time setup"
  cp .env.example .env

  while :; do
    read -r -s -p "Choose the admin password (at least 8 characters): " PASS; echo
    [ "${#PASS}" -ge 8 ] || { warn "too short, try again"; continue; }
    case "$PASS" in *"'"*) warn "please don't use the ' character, try again"; continue ;; esac
    read -r -s -p "Type it again: " PASS2; echo
    [ "$PASS" = "$PASS2" ] && break
    warn "the two passwords are different, try again"
  done
  # Single quotes: Docker Compose then takes the password literally (e.g. a "$" in it)
  set_env ADMIN_PASSWORD "'$PASS'"

  echo
  echo "Do you have your own domain name for the site (e.g. ufq-eg.com)?"
  echo "  - Yes: point its DNS 'A record' to $PUBLIC_IP first, then type it here."
  echo "  - No:  just press Enter. The site gets a free HTTPS address based on the IP:"
  echo "         https://${PUBLIC_IP//./-}.sslip.io"
  read -r -p "Domain (or Enter to skip): " DOMAIN
  DOMAIN="$(echo "$DOMAIN" | tr -d '[:space:]' | sed -E 's#^https?://##; s#/.*$##')"
  if [ -n "$DOMAIN" ]; then set_env DOMAIN "$DOMAIN"; fi
else
  say "Using the existing settings in .env (delete .env and run again to start over)"
fi

# HTTPS is always on. Without your own domain, use <ip-with-dashes>.sslip.io: a free
# public name that points to this IP, so a real (trusted) certificate can be issued.
DOMAIN="$(grep -E '^DOMAIN=' .env | cut -d= -f2- || true)"
if [ -z "$DOMAIN" ] || [[ "$DOMAIN" == *.sslip.io ]]; then
  DOMAIN="${PUBLIC_IP//./-}.sslip.io"   # recalculated in case the IP changed
fi
set_env DOMAIN "$DOMAIN"
set_env PUBLIC_IP "$PUBLIC_IP"
# The app is only reachable through Caddy, which listens on ports 80 and 443.
set_env WEB_PORT "127.0.0.1:3000"
set_env COMPOSE_FILE "docker-compose.yml:docker-compose.https.yml"
chmod 600 .env
chown "$APP_USER" .env 2>/dev/null || true

# ---------------------------------------------------------------------------
# 5. Build and start
# ---------------------------------------------------------------------------
say "Building and starting the website (first time: a few minutes)"
docker compose up -d --build --remove-orphans

say "Waiting for the website to start"
ok=""
for _ in $(seq 1 30); do
  if docker compose exec -T web wget -q -O /dev/null http://127.0.0.1:3000/healthz 2>/dev/null; then ok=1; break; fi
  sleep 2
done
[ -n "$ok" ] || { docker compose logs --tail 40 web; die "the website didn't start – see the log above"; }

# ---------------------------------------------------------------------------
# 6. HTTPS certificate check, then done
# ---------------------------------------------------------------------------
if [[ "$DOMAIN" != *.sslip.io ]]; then
  DNS_IP="$(getent ahostsv4 "$DOMAIN" 2>/dev/null | awk 'NR==1 {print $1}')"
  if [ "$DNS_IP" != "$PUBLIC_IP" ]; then
    warn "$DOMAIN points to '${DNS_IP:-nothing}', not to this server ($PUBLIC_IP)."
    warn "Fix the domain's DNS A record; HTTPS starts working a few minutes after it's correct."
  fi
fi

say "Getting the HTTPS certificate (up to a minute or two)"
cert=""
for _ in $(seq 1 30); do
  if curl -fsS -o /dev/null -m 5 --resolve "$DOMAIN:443:127.0.0.1" "https://$DOMAIN/healthz" 2>/dev/null; then cert=1; break; fi
  sleep 3
done
if [ -z "$cert" ]; then
  warn "The certificate isn't ready yet. Most often ports 80/443 are not open in the AWS Security Group."
  warn "Latest HTTPS log lines:"
  docker compose logs --tail 15 caddy || true
fi

URL="https://$DOMAIN"
cat <<DONE

============================================================
  UFQ website is running ✔

  Site:   $URL
  Admin:  $URL/admin/
  (http://$PUBLIC_IP also works and redirects to the address above)

  In the AWS console, the instance's Security Group must allow
  inbound HTTP (port 80) and HTTPS (port 443) from anywhere (0.0.0.0/0).

  Update to the latest code:   sudo bash scripts/deploy-aws.sh
  See the logs:                sudo docker compose logs -f
  Change the admin password:   sudo nano .env   then   sudo docker compose up -d
============================================================
DONE
