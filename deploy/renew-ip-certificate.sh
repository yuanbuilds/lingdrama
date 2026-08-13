#!/bin/sh
set -eu

proxy_root="${LINGDRAMA_PROXY_ROOT:-/home/ailab/apps/lingdrama/public-proxy}"
proxy_container="${LINGDRAMA_PROXY_CONTAINER:-lingdrama-public-proxy}"

docker run --rm \
  -v "$proxy_root/letsencrypt:/etc/letsencrypt" \
  -v "$proxy_root/acme:/var/www/acme" \
  certbot/certbot:latest renew --quiet --no-random-sleep-on-renew

docker exec "$proxy_container" nginx -t
docker exec "$proxy_container" nginx -s reload
