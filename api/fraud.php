<?php
require_once dirname(__DIR__).'/includes/auth.php';
require_once dirname(__DIR__).'/includes/functions.php';
require_once dirname(__DIR__).'/includes/csrf.php';
require_admin();
verify_csrf();

$id=(int)($_POST['listing_id']??0);
$action=$_POST['action']??'';

if($action==='retry'){
    $r=run_fraud_analysis($id);
    flash($r?'success':'error',$r?'Fraud analysis refreshed.':'Fraud analysis temporarily unavailable.');
    redirect('/listing.php?id='.$id);
}

if($action==='approve'){
    db()->prepare("UPDATE listings SET status='approved',updated_at=NOW() WHERE id=?")->execute([$id]);
    flash('success','Listing approved by admin. Any original AI risk score is preserved in the moderation record.');
    redirect('/admin/fraud_queue.php');
}

if($action==='remove'){
    db()->prepare("UPDATE listings SET status='removed',updated_at=NOW() WHERE id=?")->execute([$id]);
    flash('success','Listing removed.');
    redirect('/admin/fraud_queue.php');
}

http_response_code(400);
