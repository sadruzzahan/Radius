<?php
require_once __DIR__.'/functions.php';
require_once __DIR__.'/auth.php';
require_once __DIR__.'/csrf.php';
$user=current_user();
$success=pull_flash('success'); $error=pull_flash('error');
?>
<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title><?=e($pageTitle ?? 'RADIUS')?> · RADIUS</title><link rel="stylesheet" href="/assets/css/style.css"></head><body>
<nav class="nav"><a class="brand" href="/"><span class="brand-mark">R</span><span>RADIUS</span></a><div class="nav-links"><a href="/listings.php">Browse</a><a href="/trust-radar.php">Trust Radar</a><?php if($user):?><a href="/create-listing.php">Sell</a><a href="/messages.php">Messages</a><a href="/trade-requests.php">Trades</a><a href="/profile.php">Profile</a><?php if($user['role']==='admin'):?><a href="/admin/dashboard.php">Admin</a><?php endif;?><a href="/logout.php">Logout</a><?php else:?><a href="/login.php">Login</a><a class="btn btn-sm" href="/register.php">Join RADIUS</a><?php endif;?></div></nav>
<?php if($success):?><div class="toast success"><?=e($success)?></div><?php endif;?><?php if($error):?><div class="toast error"><?=e($error)?></div><?php endif;?>
<main class="container">