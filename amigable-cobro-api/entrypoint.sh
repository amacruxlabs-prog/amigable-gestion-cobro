#!/bin/bash
set -e

if [ ! -d "vendor" ]; then
    echo "Instalando dependencias de Composer..."
    composer install --no-interaction --no-progress
fi

if ! grep -q '^APP_KEY=[^ ]' .env 2>/dev/null; then
    echo "Generando APP_KEY..."
    php artisan key:generate --force
fi

exec "$@"
