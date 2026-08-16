<?php
declare(strict_types=1);
require_once dirname(__DIR__) . '/config/database.php';

function e(?string $value): string { return htmlspecialchars((string)$value, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8'); }
function redirect(string $path): never { header('Location: '.$path); exit; }
function flash(string $type,string $message): void { $_SESSION['flash_'.$type]=$message; }
function pull_flash(string $type): ?string { $k='flash_'.$type; $v=$_SESSION[$k]??null; unset($_SESSION[$k]); return $v; }
function money(float|int|string $value): string { return '৳'.number_format((float)$value,0); }

function is_admin_reviewed(string $trustStatus, ?string $listingStatus=null): bool {
    return $listingStatus==='approved' && in_array($trustStatus,['suspicious','high_risk'],true);
}
function trust_label(string $status, ?string $listingStatus=null): string {
    if(is_admin_reviewed($status,$listingStatus)) return 'Admin Reviewed';
    return ['safe'=>'Verified','low_risk'=>'Low Risk','suspicious'=>'Suspicious','high_risk'=>'High Risk'][$status]??'Unchecked';
}
function trust_class(string $status, ?string $listingStatus=null): string {
    if(is_admin_reviewed($status,$listingStatus)) return 'trust-safe';
    return 'trust-'.preg_replace('/[^a-z_]/','',$status);
}
function trust_state(string $status, ?string $listingStatus=null): string {
    if(is_admin_reviewed($status,$listingStatus)) return 'verified';
    return match($status){'safe'=>'verified','low_risk'=>'review','suspicious','high_risk'=>'danger',default=>'review'};
}
function availability_label(string $status): string {
    return ['available'=>'Available','reserved'=>'Reserved','sold'=>'Sold','withdrawn'=>'Withdrawn'][$status]??'Unknown';
}
function listing_public(array $listing): bool {
    return ($listing['status']??'')==='approved'
        && ($listing['availability_status']??'available')==='available'
        && (int)($listing['seller_active']??1)===1;
}

function radius_visuals(): array {
    return [
      'phone'=>['https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&w=900&q=82','https://images.unsplash.com/photo-1598327105666-5b89351aff97?auto=format&fit=crop&w=900&q=82','https://images.unsplash.com/photo-1592899677977-9c10ca588bbd?auto=format&fit=crop&w=900&q=82','https://images.unsplash.com/photo-1601784551446-20c9e07cdbdb?auto=format&fit=crop&w=900&q=82'],
      'laptop'=>['https://images.unsplash.com/photo-1496181133206-80ce9b88a853?auto=format&fit=crop&w=900&q=82','https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=900&q=82'],
      'camera'=>['https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&w=900&q=82','https://images.unsplash.com/photo-1502920917128-1aa500764cbd?auto=format&fit=crop&w=900&q=82'],
      'furniture'=>['https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=900&q=82','https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?auto=format&fit=crop&w=900&q=82'],
      'bicycle'=>['https://images.unsplash.com/photo-1485965120184-e220f721d03e?auto=format&fit=crop&w=900&q=82','https://images.unsplash.com/photo-1507035895480-2b3156c31fc8?auto=format&fit=crop&w=900&q=82'],
      'appliance'=>['https://images.unsplash.com/photo-1585659722983-3a675dabf23d?auto=format&fit=crop&w=900&q=82','https://images.unsplash.com/photo-1556911220-bff31c812dba?auto=format&fit=crop&w=900&q=82'],
      'fashion'=>['https://images.unsplash.com/photo-1529139574466-a303027c1d8b?auto=format&fit=crop&w=900&q=82','https://images.unsplash.com/photo-1496747611176-843222e1e57c?auto=format&fit=crop&w=900&q=82'],
      'books'=>['https://images.unsplash.com/photo-1495446815901-a7297e633e8d?auto=format&fit=crop&w=900&q=82','https://images.unsplash.com/photo-1512820790803-83ca734da794?auto=format&fit=crop&w=900&q=82'],
      'gaming'=>['https://images.unsplash.com/photo-1606144042614-b2417e99c4e3?auto=format&fit=crop&w=900&q=82','https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=900&q=82'],
      'accessories'=>['https://images.unsplash.com/photo-1583394838336-acd977736f90?auto=format&fit=crop&w=900&q=82','https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=900&q=82']
    ];
}
function stable_visual_index(string $seed,int $count): int { return $count<1?0:abs((int)crc32(strtolower($seed)))%$count; }
function listing_visual(array $listing): string {
    $uploaded=str_replace('\\','/',trim((string)($listing['image_path']??'')));
    if($uploaded!==''){
        $uploaded='/'.ltrim($uploaded,'/');
        if(str_starts_with($uploaded,'/uploads/listings/')) return $uploaded;
    }
    $all=radius_visuals(); $category=strtolower(trim((string)($listing['category']??'accessories')));
    $category=str_replace(['-','_'],' ',$category); $images=$all[$category]??$all['accessories'];
    $seed=strtolower(trim((string)($listing['title']??$listing['id']??$category))); $index=stable_visual_index($seed,count($images));
    if($category==='phone'){
        if(str_contains($seed,'samsung')) $index=min(3,count($images)-1);
        elseif(str_contains($seed,'urgent')||str_contains($seed,'pro')) $index=min(2,count($images)-1);
        elseif(str_contains($seed,'iphone')) $index=0;
    }
    return $images[$index];
}

function ai_json(string $path,array $payload,int $timeout=12): ?array {
    if(!function_exists('curl_init')) return null;
    $url=rtrim(AI_SERVICE_URL,'/').'/'.ltrim($path,'/');
    $bodyJson=json_encode($payload,JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES); if($bodyJson===false) return null;
    $ch=curl_init($url); curl_setopt_array($ch,[CURLOPT_RETURNTRANSFER=>true,CURLOPT_POST=>true,CURLOPT_HTTPHEADER=>['Content-Type: application/json','Accept: application/json'],CURLOPT_POSTFIELDS=>$bodyJson,CURLOPT_CONNECTTIMEOUT=>3,CURLOPT_TIMEOUT=>$timeout]);
    $body=curl_exec($ch); $code=(int)curl_getinfo($ch,CURLINFO_HTTP_CODE); $err=curl_error($ch); curl_close($ch);
    if($body===false||$code<200||$code>=300){ error_log('AI request failed: '.$err.' HTTP '.$code); return null; }
    $data=json_decode($body,true); return is_array($data)?$data:null;
}
function ai_hash_image(string $absolutePath): ?string {
    if(!function_exists('curl_init')||!is_file($absolutePath)) return null;
    $mime=mime_content_type($absolutePath)?:'image/jpeg'; $ch=curl_init(rtrim(AI_SERVICE_URL,'/').'/hash-image');
    curl_setopt_array($ch,[CURLOPT_RETURNTRANSFER=>true,CURLOPT_POST=>true,CURLOPT_POSTFIELDS=>['image'=>new CURLFile($absolutePath,$mime,basename($absolutePath))],CURLOPT_CONNECTTIMEOUT=>3,CURLOPT_TIMEOUT=>12]);
    $body=curl_exec($ch); $code=(int)curl_getinfo($ch,CURLINFO_HTTP_CODE); $err=curl_error($ch); curl_close($ch);
    if($body===false||$code<200||$code>=300){ error_log('AI image hash failed: '.$err.' HTTP '.$code); return null; }
    $data=json_decode($body,true); return is_array($data)&&is_string($data['image_hash']??null)?$data['image_hash']:null;
}

function validate_listing_upload(array $file): array {
    if(($file['error']??UPLOAD_ERR_NO_FILE)!==UPLOAD_ERR_OK) throw new RuntimeException('Please upload a product image.');
    $size=(int)($file['size']??0); if($size<=0||$size>MAX_UPLOAD_BYTES) throw new RuntimeException('Image exceeds the upload size limit.');
    $tmp=(string)($file['tmp_name']??''); if($tmp===''||!is_uploaded_file($tmp)) throw new RuntimeException('Invalid uploaded image.');
    $finfo=new finfo(FILEINFO_MIME_TYPE); $mime=$finfo->file($tmp); $allowed=['image/jpeg'=>'jpg','image/png'=>'png','image/webp'=>'webp'];
    if(!is_string($mime)||!isset($allowed[$mime])||@getimagesize($tmp)===false) throw new RuntimeException('Only valid JPG, PNG, or WEBP images are allowed.');
    $originalExt=strtolower(pathinfo((string)($file['name']??''),PATHINFO_EXTENSION));
    if(!in_array($originalExt,['jpg','jpeg','png','webp'],true)) throw new RuntimeException('Invalid image extension.');
    return [$mime,$allowed[$mime]];
}
function save_listing_upload(array $file): array {
    [$mime,$ext]=validate_listing_upload($file);
    if(!is_dir(UPLOAD_LISTING_DIR) && !mkdir(UPLOAD_LISTING_DIR,0755,true) && !is_dir(UPLOAD_LISTING_DIR)) throw new RuntimeException('Could not create upload directory.');
    $name=bin2hex(random_bytes(18)).'.'.$ext; $dest=rtrim(UPLOAD_LISTING_DIR,'/\\').DIRECTORY_SEPARATOR.$name;
    if(!move_uploaded_file($file['tmp_name'],$dest)||!is_file($dest)) throw new RuntimeException('Could not save uploaded image.');
    return ['/uploads/listings/'.$name,$dest,$mime];
}

function seller_risk_context(int $sellerId, ?int $excludeListingId=null): array {
    $pdo=db();
    $q=$pdo->prepare('SELECT DATEDIFF(NOW(),created_at) FROM users WHERE id=?'); $q->execute([$sellerId]); $age=(int)($q->fetchColumn()?:0);
    $exclude=$excludeListingId!==null?' AND id<>?':''; $params=$excludeListingId!==null?[$sellerId,$excludeListingId]:[$sellerId];
    $q=$pdo->prepare('SELECT COUNT(*) FROM listings WHERE user_id=?'.$exclude); $q->execute($params); $listings=(int)$q->fetchColumn();
    $sql='SELECT COUNT(*) FROM reports r JOIN listings l ON l.id=r.listing_id WHERE l.user_id=?'.($excludeListingId!==null?' AND l.id<>?':'');
    $q=$pdo->prepare($sql); $q->execute($params); $reports=(int)$q->fetchColumn();
    $sql="SELECT COUNT(*) FROM listings WHERE user_id=? AND status='removed'".($excludeListingId!==null?' AND id<>?':'');
    $q=$pdo->prepare($sql); $q->execute($params); $removed=(int)$q->fetchColumn();
    $sql="SELECT COUNT(*) FROM listings WHERE user_id=? AND trust_status IN ('suspicious','high_risk')".($excludeListingId!==null?' AND id<>?':'');
    $q=$pdo->prepare($sql); $q->execute($params); $suspicious=(int)$q->fetchColumn();
    $q=$pdo->prepare("SELECT COUNT(*) FROM trade_requests WHERE seller_id=? AND status='completed'"); $q->execute([$sellerId]); $completed=(int)$q->fetchColumn();
    $q=$pdo->prepare('SELECT COALESCE(AVG(rating),0) FROM reviews WHERE reviewed_user_id=?'); $q->execute([$sellerId]); $rating=(float)$q->fetchColumn();
    return ['account_age_days'=>$age,'previous_listings'=>$listings,'report_count'=>$reports,'completed_trades'=>$completed,'removed_listings'=>$removed,'suspicious_listings'=>$suspicious,'rating_average'=>$rating];
}

function run_fraud_analysis(int $listingId): ?array {
    $pdo=db(); $stmt=$pdo->prepare('SELECT * FROM listings WHERE id=?'); $stmt->execute([$listingId]); $listing=$stmt->fetch(); if(!$listing) return null;
    $originalPrice=(float)$listing['price'];
    $h=$pdo->prepare("SELECT image_hash FROM listing_images WHERE listing_id=? AND image_hash IS NOT NULL AND image_hash<>''"); $h->execute([$listingId]); $own=$h->fetchAll(PDO::FETCH_COLUMN);
    $all=$pdo->prepare("SELECT image_hash FROM listing_images WHERE listing_id<>? AND image_hash IS NOT NULL AND image_hash<>'' ORDER BY id DESC LIMIT 1000"); $all->execute([$listingId]); $existingHashes=$all->fetchAll(PDO::FETCH_COLUMN);
    $d=$pdo->prepare("SELECT description FROM listings WHERE id<>? AND description IS NOT NULL AND description<>'' ORDER BY id DESC LIMIT 200"); $d->execute([$listingId]); $existingDescriptions=$d->fetchAll(PDO::FETCH_COLUMN);
    $payload=['title'=>(string)$listing['title'],'description'=>(string)$listing['description'],'category'=>(string)$listing['category'],'brand'=>(string)$listing['brand'],'condition'=>(string)$listing['item_condition'],'price'=>$originalPrice,'seller_information'=>seller_risk_context((int)$listing['user_id'],$listingId),'image_hashes'=>$own,'existing_image_hashes'=>$existingHashes,'existing_descriptions'=>$existingDescriptions];
    $result=ai_json('/analyze-listing',$payload,20); if(!$result) return null;
    $trust=strtolower(trim((string)($result['trust_status']??'low_risk'))); if(!in_array($trust,['safe','low_risk','suspicious','high_risk'],true)) $trust='low_risk';
    $score=(float)($result['fraud_score']??0); if(!is_finite($score)) $score=0; $score=max(0,min(100,$score));
    foreach(['image_score','price_score','seller_score','text_score','policy_score'] as $k){ $v=(float)($result[$k]??0); $result[$k]=max(0,min(100,is_finite($v)?$v:0)); }
    $currentStatus=(string)($listing['status']??'pending');
    $moderation=$currentStatus;
    if(in_array($currentStatus,['pending','flagged'],true)) $moderation=in_array($trust,['suspicious','high_risk'],true)?'flagged':'approved';
    $snapshot=$result['feature_snapshot']??$payload; if(!is_array($snapshot)) $snapshot=$payload;
    $snapshot['original_listing_price']=$originalPrice; $snapshot['price_was_modified_by_ai']=false; $snapshot['current_listing_excluded_from_seller_history']=true;
    $snapshotJson=json_encode($snapshot,JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES); if($snapshotJson===false) $snapshotJson=null;
    $modelName=(string)($result['model_name']??'RADIUS Explainable Ensemble'); $modelVersion=(string)($result['model_version']??'1.0'); $explanation=(string)($result['explanation']??'No explanation provided.');
    $pdo->beginTransaction();
    try{
        $u=$pdo->prepare('UPDATE listings SET fraud_score=?,trust_status=?,fraud_checked=1,status=?,updated_at=NOW() WHERE id=?'); $u->execute([$score,$trust,$moderation,$listingId]);
        $ins=$pdo->prepare('INSERT INTO fraud_predictions(listing_id,fraud_score,image_score,price_score,seller_score,text_score,policy_score,model_name,model_version,explanation,feature_snapshot) VALUES(?,?,?,?,?,?,?,?,?,?,?)');
        $ins->execute([$listingId,$score,$result['image_score'],$result['price_score'],$result['seller_score'],$result['text_score'],$result['policy_score'],$modelName,$modelVersion,$explanation,$snapshotJson]);
        $check=$pdo->prepare('SELECT price FROM listings WHERE id=?'); $check->execute([$listingId]); if(abs((float)$check->fetchColumn()-$originalPrice)>0.00001) throw new RuntimeException('Safety check failed: listing price changed during analysis.');
        $pdo->commit();
    }catch(Throwable $e){ if($pdo->inTransaction()) $pdo->rollBack(); throw $e; }
    return ['trust_status'=>$trust,'fraud_score'=>$score,'image_score'=>$result['image_score'],'price_score'=>$result['price_score'],'seller_score'=>$result['seller_score'],'text_score'=>$result['text_score'],'policy_score'=>$result['policy_score'],'model_name'=>$modelName,'model_version'=>$modelVersion,'explanation'=>$explanation,'feature_snapshot'=>$snapshot,'original_price'=>$originalPrice,'price_modified'=>false,'listing_status'=>$moderation];
}

function haversine_sql(string $lat='l.latitude',string $lng='l.longitude'): string {
    return "(6371 * ACOS(LEAST(1, COS(RADIANS(:ulat1)) * COS(RADIANS($lat)) * COS(RADIANS($lng)-RADIANS(:ulng)) + SIN(RADIANS(:ulat2)) * SIN(RADIANS($lat)))))";
}
