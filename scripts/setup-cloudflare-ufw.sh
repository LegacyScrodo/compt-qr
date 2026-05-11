#!/usr/bin/env bash
#
# Restricts UFW to only allow HTTP/HTTPS traffic from Cloudflare IPs.
# Run this AFTER:
#   1. Cloudflare is proxying compt-qr.ch (orange cloud)
#   2. Cloudflare SSL/TLS is set to "Full (strict)"
#   3. docker compose is running and reachable via Cloudflare
#
# If you skip this, attackers can bypass Cloudflare by hitting the VPS IP directly.
#
# Usage: sudo ./setup-cloudflare-ufw.sh

set -euo pipefail

if [[ $EUID -ne 0 ]]; then
  echo "ERROR: must be run as root (sudo)"
  exit 1
fi

CF_IPS_V4_URL="https://www.cloudflare.com/ips-v4"
CF_IPS_V6_URL="https://www.cloudflare.com/ips-v6"

echo "Fetching current Cloudflare IP ranges…"
mapfile -t V4 < <(curl -fsSL "$CF_IPS_V4_URL")
mapfile -t V6 < <(curl -fsSL "$CF_IPS_V6_URL")

if [[ ${#V4[@]} -eq 0 ]]; then
  echo "ERROR: failed to fetch Cloudflare IPv4 list"
  exit 1
fi

echo "Got ${#V4[@]} IPv4 ranges and ${#V6[@]} IPv6 ranges."
echo

echo "Removing existing 80/tcp and 443/tcp blanket rules…"
# Repeat 'delete' since rules may exist for both v4 and v6
ufw --force delete allow 80/tcp 2>/dev/null || true
ufw --force delete allow 443/tcp 2>/dev/null || true
ufw --force delete allow http 2>/dev/null || true
ufw --force delete allow https 2>/dev/null || true

echo "Adding Cloudflare-only allow rules…"
for cidr in "${V4[@]}" "${V6[@]}"; do
  [[ -z "$cidr" ]] && continue
  ufw allow from "$cidr" to any port 80 proto tcp comment 'Cloudflare HTTP' >/dev/null
  ufw allow from "$cidr" to any port 443 proto tcp comment 'Cloudflare HTTPS' >/dev/null
  echo "  + $cidr"
done

echo
echo "Reloading UFW…"
ufw reload

echo
echo "Done. Current rules for 80/443:"
ufw status numbered | grep -E '(80|443)' || true

echo
echo "⚠️  Verify from outside that:"
echo "    https://compt-qr.ch         → still works (via Cloudflare)"
echo "    curl http://<VPS_IP>:80     → times out / connection refused"
