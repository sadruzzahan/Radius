<?php
declare(strict_types=1);
require_once dirname(__DIR__).'/includes/auth.php'; require_once dirname(__DIR__).'/includes/functions.php'; require_once dirname(__DIR__).'/includes/csrf.php';
$u=require_login(); $pdo=db();
if($_SERVER['REQUEST_METHOD']==='GET'){
 $id=(int)($_GET['conversation_id']??0); $after=max(0,(int)($_GET['after_id']??0)); $c=$pdo->prepare('SELECT id FROM conversations WHERE id=? AND (buyer_id=? OR seller_id=?) LIMIT 1'); $c->execute([$id,$u['id'],$u['id']]); if(!$c->fetch()){http_response_code(403);exit;}
 $s=$pdo->prepare('SELECT m.*,usr.name sender_name FROM messages m JOIN users usr ON usr.id=m.sender_id WHERE m.conversation_id=? AND m.id>? ORDER BY m.id ASC LIMIT 200'); $s->execute([$id,$after]); $items=$s->fetchAll();
 $pdo->prepare('UPDATE messages SET is_read=1 WHERE conversation_id=? AND sender_id<>? AND is_read=0')->execute([$id,$u['id']]);
 foreach($items as &$m)$m['mine']=(int)$m['sender_id']===(int)$u['id']; unset($m); header('Content-Type: application/json; charset=utf-8'); echo json_encode(['items'=>$items,'last_id'=>$items?(int)end($items)['id']:$after],JSON_UNESCAPED_UNICODE); exit;
}
if($_SERVER['REQUEST_METHOD']!=='POST'){http_response_code(405);exit('Method Not Allowed.');} verify_csrf(); $action=(string)($_POST['action']??'');
if($action==='start'){
 $listing=(int)($_POST['listing_id']??0); $s=$pdo->prepare("SELECT l.id,l.user_id FROM listings l JOIN users seller ON seller.id=l.user_id WHERE l.id=? AND l.status='approved' AND l.availability_status='available' AND seller.is_active=1 LIMIT 1"); $s->execute([$listing]); $l=$s->fetch(); if(!$l||(int)$l['user_id']===(int)$u['id']){flash('error','Chat is unavailable for this listing.');redirect('/listing.php?id='.$listing);}
 $pdo->prepare('INSERT IGNORE INTO conversations(listing_id,buyer_id,seller_id) VALUES(?,?,?)')->execute([$listing,$u['id'],$l['user_id']]); $q=$pdo->prepare('SELECT id FROM conversations WHERE listing_id=? AND buyer_id=? AND seller_id=? LIMIT 1'); $q->execute([$listing,$u['id'],$l['user_id']]); redirect('/chat.php?conversation_id='.(int)$q->fetchColumn());
}
if($action==='send'){
 $id=(int)($_POST['conversation_id']??0); $msg=trim((string)($_POST['message']??'')); if($msg===''||mb_strlen($msg)>2000){flash('error','Message must be between 1 and 2000 characters.');redirect('/chat.php?conversation_id='.$id);}
 $c=$pdo->prepare('SELECT id FROM conversations WHERE id=? AND (buyer_id=? OR seller_id=?) LIMIT 1'); $c->execute([$id,$u['id'],$u['id']]); if(!$c->fetch()){http_response_code(403);exit('You cannot send messages in this conversation.');}
 $pdo->prepare('INSERT INTO messages(conversation_id,sender_id,message) VALUES(?,?,?)')->execute([$id,$u['id'],$msg]); redirect('/chat.php?conversation_id='.$id);
}
http_response_code(400); exit('Invalid chat action.');
