#!/usr/bin/env bash

echo "==============================================================================="
echo -e " Updating Safex Big Box Store Wallet"
echo "==============================================================================="

docker compose down -v
docker compose -f docker-compose.update.yml down -v

docker compose -f docker-compose.update.yml up \
    --remove-orphans \
    --force-recreate \
    --abort-on-container-exit

status_code=$?

sudo chown -R  $(id -u) $(pwd)

exit $status_code
