<?php

return [
    "paths" => ["api/*", "sanctum/csrf-cookie"],
    "allowed_methods" => ["*"],
    "allowed_origins" => env('APP_ENV') === 'local'
        ? ['*']
        : explode(',', env('CORS_ALLOWED_ORIGINS', 'https://amigablecobro.amacruxlab.com')),
    "allowed_origins_patterns" => [],
    "allowed_headers" => ["*"],
    "exposed_headers" => [],
    "max_age" => 0,
    "supports_credentials" => env('APP_ENV') === 'local' ? false : true,
];
