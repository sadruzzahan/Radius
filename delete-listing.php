<?php
declare(strict_types=1);
require_once __DIR__.'/includes/auth.php'; require_once __DIR__.'/includes/functions.php'; require_once __DIR__.'/includes/csrf.php';
$u=require_login(); if($_SERVER['REQUEST_METHOD']!=='POST'){http_response_code(405);exit('Method Not Allowed.');} verify_csrf(); $id=(int)($_POST['id']??0); if($id<=0){flash('error','Invalid listing.');redirect('/profile.php');}
$pdo=db(); $s=$pdo->prepare("SELECT id,availability_status FROM listings WHERE id=? AND user_id=? AND status<>'removed' LIMIT 1"); $s->execute([$id,$u['id']]); $l=$s->fetch(); if(!$l){http_response_code(403);exit('You cannot withdraw this listing.');} if($l['availability_status']==='sold'){flash('error','A completed sale cannot be withdrawn.');redirect('/profile.php');}
$pdo->beginTransaction(); try{
 $pdo->prepare("UPDATE listings SET availability_status='withdrawn',updated_at=NOW() WHERE id=? AND user_id=?")->execute([$id,$u['id']]);
 $pdo->prepare("UPDATE trade_requests SET status='cancelled',updated_at=NOW() WHERE listing_id=? AND status IN ('requested','accepted')")->execute([$id]);
 $pdo->commit();
}catch(Throwable $e){if($pdo->inTransaction())$pdo->rollBack();throw $e;}
flash('success','Listing withdrawn. Its fraud and trade history were preserved.'); redirect('/profile.php');
