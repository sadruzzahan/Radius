<?php
require_once dirname(__DIR__).'/includes/auth.php';require_once dirname(__DIR__).'/includes/functions.php';require_admin();$pdo=db();
$stats=[
 'Total Users'=>(int)$pdo->query('SELECT COUNT(*) FROM users')->fetchColumn(),
 'Public Listings'=>(int)$pdo->query("SELECT COUNT(*) FROM listings WHERE status='approved'")->fetchColumn(),
 'Awaiting Moderation'=>(int)$pdo->query("SELECT COUNT(*) FROM listings WHERE status IN ('pending','flagged')")->fetchColumn(),
 'Admin Reviewed'=>(int)$pdo->query("SELECT COUNT(*) FROM listings WHERE status='approved' AND trust_status IN ('suspicious','high_risk')")->fetchColumn(),
 'Open Reports'=>(int)$pdo->query("SELECT COUNT(*) FROM reports WHERE status='open'")->fetchColumn(),
 'Completed Trades'=>(int)$pdo->query("SELECT COUNT(*) FROM trade_requests WHERE status='completed'")->fetchColumn()
];
$queue=$pdo->query("SELECT l.id,l.title,l.fraud_score,l.trust_status,l.status,l.created_at,u.name seller FROM listings l JOIN users u ON u.id=l.user_id WHERE l.status IN ('pending','flagged') ORDER BY COALESCE(l.fraud_score,-1) DESC,l.created_at DESC LIMIT 8")->fetchAll();
$pageTitle='Admin Dashboard';include dirname(__DIR__).'/includes/header.php';?>
<div class="section-head"><div><div class="eyebrow">Private moderation</div><h2>Admin dashboard</h2><p>Unchecked and AI-flagged listings stay here until an administrator approves or removes them.</p></div><div class="actions"><a class="btn btn-sm" href="/admin/fraud_queue.php">Fraud Queue</a><a class="btn btn-sm btn-light" href="/admin/reports.php">Reports</a><a class="btn btn-sm btn-light" href="/admin/users.php">Users</a><a class="btn btn-sm btn-light" href="/admin/listings.php">Listings</a></div></div>
<div class="stats"><?php foreach($stats as $k=>$v):?><div class="stat"><span class="muted"><?=e($k)?></span><strong><?=$v?></strong></div><?php endforeach;?></div>
<div class="section-head"><div><h2>Awaiting moderation</h2><p>These listings are not visible to ordinary marketplace users.</p></div><a href="/admin/fraud_queue.php">Open full queue →</a></div>
<?php if($queue):?><div class="table-wrap"><table class="table"><tr><th>Product</th><th>Seller</th><th>Score</th><th>Trust</th><th>State</th><th>Date</th></tr><?php foreach($queue as $l):?><tr><td><a href="/listing.php?id=<?=$l['id']?>"><?=e($l['title'])?></a></td><td><?=e($l['seller'])?></td><td><?=e((string)($l['fraud_score']??'—'))?></td><td><?=e(trust_label((string)($l['trust_status']??'')))?></td><td><?=e(ucfirst($l['status']))?></td><td><?=e($l['created_at'])?></td></tr><?php endforeach;?></table></div><?php else:?><div class="empty">No listings are waiting for moderation.</div><?php endif;?>
<?php include dirname(__DIR__).'/includes/footer.php';?>