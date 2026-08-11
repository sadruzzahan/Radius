<?php
declare(strict_types=1);
require_once dirname(__DIR__) . '/config/database.php';

function e(?string $value): string { return htmlspecialchars((string)$value, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8'); }
function redirect(string $path): never { header('Location: ' . $path); exit; }
function flash(string $type, string $message): void { $_SESSION['flash_' . $type] = $message; }
function pull_flash(string $type): ?string { $key='flash_'.$type; $v=$_SESSION[$key] ?? null; unset($_SESSION[$key]); return $v; }
function money(float|int|string $value): string { return '৳' . number_format((float)$value, 0); }
function trust_label(string $status): string { return ['safe'=>'Trusted','low_risk'=>'Low Risk','suspicious'=>'Suspicious','high_risk'=>'High Risk'][$status] ?? 'Unchecked'; }
function trust_class(string $status): string { return 'trust-' . preg_replace('/[^a-z_]/', '', $status); }

function ai_json(string $path, array $payload, int $timeout = 12): ?array {
    if (!function_exists('curl_init')) return null;
    $ch = curl_init(AI_SERVICE_URL . $path);
    curl_setopt_array($ch, [CURLOPT_RETURNTRANSFER=>true,CURLOPT_POST=>true,CURLOPT_HTTPHEADER=>['Content-Type: application/json'],CURLOPT_POSTFIELDS=>json_encode($payload),CURLOPT_CONNECTTIMEOUT=>3,CURLOPT_TIMEOUT=>$timeout]);
    $body = curl_exec($ch); $code=(int)curl_getinfo($ch,CURLINFO_HTTP_CODE); $err=curl_error($ch); curl_close($ch);
    if ($body === false || $code < 200 || $code >= 300) { error_log('AI request failed: '.$err.' HTTP '.$code); return null; }
    $data=json_decode($body,true); return is_array($data)?$data:null;
}

function ai_hash_image(string $absolutePath): ?string {
    if (!function_exists('curl_init') || !is_file($absolutePath)) return null;
    $mime = mime_content_type($absolutePath) ?: 'image/jpeg';
    $ch=curl_init(AI_SERVICE_URL.'/hash-image');
    curl_setopt_array($ch,[CURLOPT_RETURNTRANSFER=>true,CURLOPT_POST=>true,CURLOPT_POSTFIELDS=>['image'=>new CURLFile($absolutePath,$mime,basename($absolutePath))],CURLOPT_CONNECTTIMEOUT=>3,CURLOPT_TIMEOUT=>12]);
    $body=curl_exec($ch); $code=(int)curl_getinfo($ch,CURLINFO_HTTP_CODE); curl_close($ch);
    if ($body===false || $code<200 || $code>=300) return null;
    $data=json_decode($body,true); return is_array($data) ? ($data['image_hash'] ?? null) : null;
}

function validate_listing_upload(array $file): array {
    if (($file['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_OK) throw new RuntimeException('Please upload a product image.');
    if (($file['size'] ?? 0) <= 0 || $file['size'] > MAX_UPLOAD_BYTES) throw new RuntimeException('Image exceeds the upload size limit.');
    $tmp=$file['tmp_name']; $finfo=new finfo(FILEINFO_MIME_TYPE); $mime=$finfo->file($tmp);
    $allowed=['image/jpeg'=>'jpg','image/png'=>'png','image/webp'=>'webp'];
    if (!isset($allowed[$mime]) || @getimagesize($tmp)===false) throw new RuntimeException('Only valid JPG, PNG, or WEBP images are allowed.');
    $originalExt=strtolower(pathinfo((string)$file['name'], PATHINFO_EXTENSION));
    if (!in_array($originalExt,['jpg','jpeg','png','webp'],true)) throw new RuntimeException('Invalid image extension.');
    return [$mime,$allowed[$mime]];
}

function save_listing_upload(array $file): array {
    [$mime,$ext]=validate_listing_upload($file);
    if (!is_dir(UPLOAD_LISTING_DIR)) mkdir(UPLOAD_LISTING_DIR,0755,true);
    $name=bin2hex(random_bytes(18)).'.'.$ext; $dest=UPLOAD_LISTING_DIR.'/'.$name;
    if (!move_uploaded_file($file['tmp_name'],$dest)) throw new RuntimeException('Could not save uploaded image.');
    return ['/uploads/listings/'.$name,$dest,$mime];
}

function seller_risk_context(int $sellerId): array {
    $pdo=db();
    $stmt=$pdo->prepare("SELECT DATEDIFF(NOW(),created_at) account_age_days FROM users WHERE id=?"); $stmt->execute([$sellerId]);
    $age=(int)($stmt->fetchColumn() ?: 0);
    $q=$pdo->prepare("SELECT COUNT(*) FROM listings WHERE user_id=?"); $q->execute([$sellerId]); $listings=(int)$q->fetchColumn();
    $q=$pdo->prepare("SELECT COUNT(*) FROM reports r JOIN listings l ON l.id=r.listing_id WHERE l.user_id=?"); $q->execute([$sellerId]); $reports=(int)$q->fetchColumn();
    $q=$pdo->prepare("SELECT COUNT(*) FROM trade_requests WHERE seller_id=? AND status='completed'"); $q->execute([$sellerId]); $completed=(int)$q->fetchColumn();
    $q=$pdo->prepare("SELECT COUNT(*) FROM listings WHERE user_id=? AND status='removed'"); $q->execute([$sellerId]); $removed=(int)$q->fetchColumn();
    $q=$pdo->prepare("SELECT COUNT(*) FROM listings WHERE user_id=? AND trust_status IN ('suspicious','high_risk')"); $q->execute([$sellerId]); $suspicious=(int)$q->fetchColumn();
    $q=$pdo->prepare("SELECT COALESCE(AVG(rating),0) FROM reviews WHERE reviewed_user_id=?"); $q->execute([$sellerId]); $rating=(float)$q->fetchColumn();
    return ['account_age_days'=>$age,'previous_listings'=>$listings,'report_count'=>$reports,'completed_trades'=>$completed,'removed_listings'=>$removed,'suspicious_listings'=>$suspicious,'rating_average'=>$rating];
}

function run_fraud_analysis(int $listingId): ?array {
    $pdo=db();
    $stmt=$pdo->prepare('SELECT * FROM listings WHERE id=?'); $stmt->execute([$listingId]); $listing=$stmt->fetch(); if(!$listing) return null;
    $h=$pdo->prepare('SELECT image_hash FROM listing_images WHERE listing_id=? AND image_hash IS NOT NULL'); $h->execute([$listingId]); $own=$h->fetchAll(PDO::FETCH_COLUMN);
    $all=$pdo->prepare('SELECT li.image_hash FROM listing_images li WHERE li.listing_id<>? AND li.image_hash IS NOT NULL'); $all->execute([$listingId]); $existingHashes=$all->fetchAll(PDO::FETCH_COLUMN);
    $d=$pdo->prepare('SELECT description FROM listings WHERE id<>? LIMIT 200'); $d->execute([$listingId]); $existingDescriptions=$d->fetchAll(PDO::FETCH_COLUMN);
    $payload=['title'=>$listing['title'],'description'=>$listing['description'],'category'=>$listing['category'],'brand'=>$listing['brand'],'condition'=>$listing['item_condition'],'price'=>(float)$listing['price'],'seller_information'=>seller_risk_context((int)$listing['user_id']),'image_hashes'=>$own,'existing_image_hashes'=>$existingHashes,'existing_descriptions'=>$existingDescriptions];
    $result=ai_json('/analyze-listing',$payload,20); if(!$result) return null;
    $pdo->beginTransaction();
    try {
        $status=$result['trust_status']; $moderation=in_array($status,['suspicious','high_risk'],true)?'flagged':'approved';
        $u=$pdo->prepare('UPDATE listings SET fraud_score=?,trust_status=?,fraud_checked=1,status=?,updated_at=NOW() WHERE id=?');
        $u->execute([(float)$result['fraud_score'],$status,$moderation,$listingId]);
        $ins=$pdo->prepare('INSERT INTO fraud_predictions (listing_id,fraud_score,image_score,price_score,seller_score,text_score,policy_score,model_name,model_version,explanation,feature_snapshot) VALUES (?,?,?,?,?,?,?,?,?,?,?)');
        $ins->execute([$listingId,$result['fraud_score'],$result['image_score'],$result['price_score'],$result['seller_score'],$result['text_score'],$result['policy_score'],$result['model_name'] ?? 'radius_explainable_ensemble',$result['model_version'] ?? '1.0',$result['explanation'],json_encode($result['feature_snapshot'] ?? $payload)]);
        $pdo->commit();
    } catch(Throwable $e){$pdo->rollBack(); throw $e;}
    return $result;
}

function haversine_sql(string $lat='l.latitude', string $lng='l.longitude'): string {
    return "(6371 * ACOS(LEAST(1, COS(RADIANS(:ulat)) * COS(RADIANS($lat)) * COS(RADIANS($lng)-RADIANS(:ulng)) + SIN(RADIANS(:ulat)) * SIN(RADIANS($lat)))))";
}
