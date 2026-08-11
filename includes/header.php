<?php
require_once __DIR__.'/functions.php';
require_once __DIR__.'/auth.php';
require_once __DIR__.'/csrf.php';
$user=current_user();
$success=pull_flash('success'); $error=pull_flash('error');
$currentPath=parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?: '/';
function nav_active(string $path,string $current): string { return $current===$path || ($path!=='/' && str_starts_with($current,$path)) ? ' active' : ''; }
?>
<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="theme-color" content="#0C0812"><title><?=e($pageTitle ?? 'RADIUS')?> · RADIUS</title><link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,400;12..96,500;12..96,600;12..96,700;12..96,800&display=swap"><link rel="stylesheet" href="https://api.fontshare.com/v2/css?f[]=general-sans@400,500,600,700&display=swap"><link rel="stylesheet" href="/assets/css/style.css"></head><body>
<header class="topnav">
  <a class="topnav-brand" href="/" aria-label="RADIUS home">
    <svg viewBox="0 0 32 32" fill="none" width="22" height="22" aria-hidden="true"><circle cx="16" cy="16" r="14" stroke="currentColor" stroke-width="2.5" stroke-opacity=".8"/><circle cx="16" cy="16" r="9" stroke="currentColor" stroke-width="1.2" stroke-dasharray="3 2" stroke-opacity=".4"/><path d="M12 12C12 10.5 16 9 16 9C16 9 20 10.5 20 12C20 16 16 19 16 19C16 19 12 16 12 12Z" fill="currentColor"/></svg><span>Radius</span>
  </a>
  <nav class="topnav-center" aria-label="Main navigation">
    <a class="topnav-item<?=nav_active('/listings.php',$currentPath)?>" href="/listings.php">Browse</a>
    <?php if($user):?><a class="topnav-item<?=nav_active('/create-listing.php',$currentPath)?>" href="/create-listing.php">Sell</a><a class="topnav-item<?=nav_active('/messages.php',$currentPath)?>" href="/messages.php">Chat</a><?php endif;?>
    <a class="topnav-item<?=nav_active('/trust-radar.php',$currentPath)?>" href="/trust-radar.php">Trust Radar</a>
    <?php if($user && $user['role']==='admin'):?><a class="topnav-item<?=str_starts_with($currentPath,'/admin/')?' active':''?>" href="/admin/dashboard.php">Admin</a><?php endif;?>
  </nav>
  <div class="topnav-right">
    <?php if($user):?><span class="user-info"><?=e($user['name'])?></span><a class="btn btn-secondary btn-sm" href="/profile.php">Profile</a><a class="btn btn-ghost btn-sm" href="/logout.php">Sign Out</a><?php else:?><a class="btn btn-ghost btn-sm" href="/login.php">Login</a><a class="btn btn-primary btn-sm" href="/register.php">Register</a><?php endif;?>
  </div>
</header>
<?php if($success):?><div class="toast-container"><div class="toast toast-success"><?=e($success)?></div></div><?php endif;?><?php if($error):?><div class="toast-container"><div class="toast toast-error"><?=e($error)?></div></div><?php endif;?>
<main class="content">