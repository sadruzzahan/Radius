<?php
declare(strict_types=1);
require_once dirname(__DIR__) . '/config/database.php';

function current_user(): ?array {
    static $cached = false;
    static $user = null;
    if ($cached) return $user;
    $cached = true;
    if (empty($_SESSION['user_id'])) return null;
    $stmt = db()->prepare('SELECT id,name,email,role,phone,location,latitude,longitude,profile_image,is_active,created_at FROM users WHERE id=? LIMIT 1');
    $stmt->execute([(int) $_SESSION['user_id']]);
    $row = $stmt->fetch();
    if (!$row || !(bool)$row['is_active']) {
        unset($_SESSION['user_id']);
        return null;
    }
    $user = $row;
    return $user;
}

function require_login(): array {
    $user = current_user();
    if (!$user) {
        $_SESSION['flash_error'] = 'Please log in to continue.';
        header('Location: /login.php');
        exit;
    }
    return $user;
}

function require_admin(): array {
    $user = require_login();
    if (($user['role'] ?? '') !== 'admin') {
        http_response_code(403);
        exit('Admin access required.');
    }
    return $user;
}
