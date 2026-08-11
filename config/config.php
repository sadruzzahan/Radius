<?php
declare(strict_types=1);

/**
 * Load project environment variables without requiring Composer or phpdotenv.
 *
 * Priority:
 *   1. Existing OS/server environment variables
 *   2. .env (private local overrides, if present)
 *   3. .env.example (safe zero-config local defaults)
 *
 * This lets a fresh clone run locally with the checked-in development defaults,
 * while production/deployment environments can override every value normally.
 */
function load_environment(): void {
    $root = dirname(__DIR__);
    $envFile = is_file($root . '/.env') ? $root . '/.env' : $root . '/.env.example';

    if (!is_file($envFile)) {
        return;
    }

    $lines = file($envFile, FILE_IGNORE_NEW_LINES);
    if ($lines === false) {
        return;
    }

    foreach ($lines as $line) {
        $line = trim($line);

        if ($line === '' || str_starts_with($line, '#')) {
            continue;
        }

        if (str_starts_with($line, 'export ')) {
            $line = trim(substr($line, 7));
        }

        if (!str_contains($line, '=')) {
            continue;
        }

        [$key, $value] = explode('=', $line, 2);
        $key = trim($key);
        $value = trim($value);

        if ($key === '' || !preg_match('/^[A-Z_][A-Z0-9_]*$/i', $key)) {
            continue;
        }

        // Keep values such as URLs intact while allowing normal quoted .env values.
        if (strlen($value) >= 2) {
            $first = $value[0];
            $last = $value[strlen($value) - 1];
            if (($first === '"' && $last === '"') || ($first === "'" && $last === "'")) {
                $value = substr($value, 1, -1);
            }
        }

        // Real OS/server variables always win over file defaults.
        if (getenv($key) === false) {
            putenv($key . '=' . $value);
            $_ENV[$key] = $value;
            $_SERVER[$key] = $value;
        }
    }
}

load_environment();

function env_value(string $key, ?string $default = null): ?string {
    $value = getenv($key);
    return ($value === false || $value === '') ? $default : $value;
}

define('APP_ENV', env_value('APP_ENV', 'development'));
define('APP_URL', rtrim((string) env_value('APP_URL', 'http://localhost:3000'), '/'));
define('AI_SERVICE_URL', rtrim((string) env_value('AI_SERVICE_URL', 'http://127.0.0.1:8001'), '/'));
define('DEFAULT_RADIUS_KM', (float) env_value('DEFAULT_RADIUS_KM', '5'));
define('MAX_UPLOAD_BYTES', max(1, (int) env_value('MAX_UPLOAD_MB', '5')) * 1024 * 1024);
define('UPLOAD_LISTING_DIR', dirname(__DIR__) . '/uploads/listings');
define('UPLOAD_PROFILE_DIR', dirname(__DIR__) . '/uploads/profiles');

if (session_status() !== PHP_SESSION_ACTIVE) {
    session_set_cookie_params([
        'httponly' => true,
        'samesite' => 'Lax',
        'secure' => (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off'),
    ]);
    session_start();
}

if (APP_ENV === 'production') {
    ini_set('display_errors', '0');
} else {
    ini_set('display_errors', '1');
}
error_reporting(E_ALL);
