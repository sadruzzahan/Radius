<?php
declare(strict_types=1);

function env_value(string $key, ?string $default = null): ?string {
    $value = getenv($key);
    return ($value === false || $value === '') ? $default : $value;
}

define('APP_ENV', env_value('APP_ENV', 'development'));
define('APP_URL', rtrim((string) env_value('APP_URL', ''), '/'));
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
