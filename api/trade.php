<?php
declare(strict_types=1);
require_once dirname(__DIR__).'/includes/auth.php'; require_once dirname(__DIR__).'/includes/functions.php'; require_once dirname(__DIR__).'/includes/csrf.php';
$u=require_login(); if($_SERVER['REQUEST_METHOD']!=='POST'){http_response_code(405);exit('Method Not Allowed.');} verify_csrf(); $pdo=db(); $action=(string)($_POST['action']??'');

if($action==='request'){
 $listing=(int)($_POST['listing_id']??0); $s=$pdo->prepare("SELECT l.id,l.user_id FROM listings l JOIN users seller ON seller.id=l.user_id WHERE l.id=? AND l.status='approved' AND l.availability_status='available' AND seller.is_active=1 LIMIT 1"); $s->execute([$listing]); $l=$s->fetch();
 if(!$l||(int)$l['user_id']===(int)$u['id']){flash('error','Trade request unavailable.');redirect('/listing.php?id='.$listing);} $q=$pdo->prepare("SELECT COUNT(*) FROM trade_requests WHERE listing_id=? AND buyer_id=? AND status IN ('requested','accepted')"); $q->execute([$listing,$u['id']]); if((int)$q->fetchColumn()>0){flash('error','You already have an active request for this listing.');redirect('/listing.php?id='.$listing);}
 $pdo->prepare('INSERT INTO trade_requests(listing_id,buyer_id,seller_id) VALUES(?,?,?)')->execute([$listing,$u['id'],$l['user_id']]); flash('success','Trade request sent.');redirect('/trade-requests.php');
}
$id=(int)($_POST['trade_id']??0); $s=$pdo->prepare('SELECT * FROM trade_requests WHERE id=? AND (buyer_id=? OR seller_id=?) LIMIT 1'); $s->execute([$id,$u['id'],$u['id']]); $t=$s->fetch(); if(!$t){http_response_code(403);exit('Trade not available.');}
$buyer=(int)$t['buyer_id']===(int)$u['id']; $seller=(int)$t['seller_id']===(int)$u['id'];
$pdo->beginTransaction(); try{
 if($action==='accept'&&$seller&&$t['status']==='requested'){
  $lock=$pdo->prepare("SELECT availability_status,status FROM listings WHERE id=? FOR UPDATE");$lock->execute([$t['listing_id']]);$listing=$lock->fetch();if(!$listing||$listing['status']!=='approved'||$listing['availability_status']!=='available')throw new RuntimeException('Listing is no longer available.');
  $pdo->prepare("UPDATE trade_requests SET status='accepted',updated_at=NOW() WHERE id=?")->execute([$id]);
  $pdo->prepare("UPDATE trade_requests SET status='rejected',updated_at=NOW() WHERE listing_id=? AND id<>? AND status='requested'")->execute([$t['listing_id'],$id]);
  $pdo->prepare("UPDATE listings SET availability_status='reserved',updated_at=NOW() WHERE id=?")->execute([$t['listing_id']]); $message='Trade accepted and item reserved.';
 }elseif($action==='reject'&&$seller&&$t['status']==='requested'){
  $pdo->prepare("UPDATE trade_requests SET status='rejected',updated_at=NOW() WHERE id=?")->execute([$id]); $message='Trade request rejected.';
 }elseif($action==='cancel'&&(($buyer&&in_array($t['status'],['requested','accepted'],true))||($seller&&$t['status']==='accepted'))){
  $wasAccepted=$t['status']==='accepted'; $pdo->prepare("UPDATE trade_requests SET status='cancelled',updated_at=NOW() WHERE id=?")->execute([$id]); if($wasAccepted)$pdo->prepare("UPDATE listings SET availability_status='available',updated_at=NOW() WHERE id=? AND availability_status='reserved'")->execute([$t['listing_id']]); $message='Trade cancelled.';
 }elseif($action==='complete'&&$t['status']==='accepted'){
  $pdo->prepare("UPDATE trade_requests SET status='completed',updated_at=NOW() WHERE id=?")->execute([$id]); $pdo->prepare("UPDATE listings SET availability_status='sold',updated_at=NOW() WHERE id=?")->execute([$t['listing_id']]); $message='Trade completed. The listing is marked sold without changing its moderation history.';
 }else throw new RuntimeException('That trade transition is not allowed.');
 $pdo->commit(); flash('success',$message); redirect('/trade-requests.php');
}catch(RuntimeException $e){if($pdo->inTransaction())$pdo->rollBack();flash('error',$e->getMessage());redirect('/trade-requests.php');}catch(Throwable $e){if($pdo->inTransaction())$pdo->rollBack();throw $e;}
