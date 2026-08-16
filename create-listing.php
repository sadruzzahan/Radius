<?php
declare(strict_types=1);
require_once __DIR__.'/includes/functions.php';
require_once __DIR__.'/includes/auth.php';
require_once __DIR__.'/includes/csrf.php';
$user=require_login(); $pdo=null; $uploadedAbsolutePath=null; $listingCommitted=false;

if($_SERVER['REQUEST_METHOD']==='POST'){
 try{
  verify_csrf();
  $title=trim((string)($_POST['title']??'')); $description=trim((string)($_POST['description']??'')); $category=strtolower(trim((string)($_POST['category']??''))); $brand=trim((string)($_POST['brand']??'')); $condition=strtolower(trim((string)($_POST['condition']??''))); $priceRaw=trim((string)($_POST['price']??'')); $location=trim((string)($_POST['location']??'')); $latRaw=trim((string)($_POST['latitude']??'')); $lngRaw=trim((string)($_POST['longitude']??''));
  if(mb_strlen($title)<3||mb_strlen($title)>180) throw new RuntimeException('Title must be between 3 and 180 characters.');
  if(mb_strlen($description)<10) throw new RuntimeException('Description must contain at least 10 characters.');
  if($category===''||mb_strlen($category)>80) throw new RuntimeException('Please select a valid category.');
  if(mb_strlen($brand)>100) throw new RuntimeException('Brand is too long.');
  if(!in_array($condition,['new','excellent','good','fair','poor'],true)) throw new RuntimeException('Invalid item condition.');
  if($priceRaw===''||!is_numeric($priceRaw)) throw new RuntimeException('Please enter a valid price.'); $price=(float)$priceRaw; if(!is_finite($price)||$price<=0||$price>100000000) throw new RuntimeException('Please enter a valid price.');
  if($location===''||mb_strlen($location)>190) throw new RuntimeException('Please enter a valid item location.');
  $latitude=null; if($latRaw!==''){ if(!is_numeric($latRaw)) throw new RuntimeException('Invalid latitude.'); $latitude=(float)$latRaw; if(!is_finite($latitude)||$latitude<-90||$latitude>90) throw new RuntimeException('Latitude must be between -90 and 90.'); }
  $longitude=null; if($lngRaw!==''){ if(!is_numeric($lngRaw)) throw new RuntimeException('Invalid longitude.'); $longitude=(float)$lngRaw; if(!is_finite($longitude)||$longitude<-180||$longitude>180) throw new RuntimeException('Longitude must be between -180 and 180.'); }
  $image=$_FILES['image']??null; if(!is_array($image)) throw new RuntimeException('Please upload a product image.'); validate_listing_upload($image);
  [$imagePath,$uploadedAbsolutePath]=save_listing_upload($image);
  $pdo=db(); $pdo->beginTransaction();
  $s=$pdo->prepare("INSERT INTO listings(user_id,title,description,category,brand,item_condition,price,location,latitude,longitude,status,availability_status,fraud_checked) VALUES(?,?,?,?,?,?,?,?,?,?,'pending','available',0)");
  $s->execute([(int)$user['id'],$title,$description,$category,$brand,$condition,$price,$location,$latitude,$longitude]); $id=(int)$pdo->lastInsertId(); if($id<=0) throw new RuntimeException('Could not create listing.');
  $hash=null; try{$hash=ai_hash_image($uploadedAbsolutePath);}catch(Throwable $hashError){error_log('Image hash failed for listing '.$id.': '.$hashError->getMessage());}
  $i=$pdo->prepare('INSERT INTO listing_images(listing_id,image_path,image_hash) VALUES(?,?,?)'); $i->execute([$id,$imagePath,$hash]);
  $pdo->commit(); $listingCommitted=true;
  $analysis=null; try{$analysis=run_fraud_analysis($id);}catch(Throwable $aiError){error_log('Fraud analysis failed for listing '.$id.': '.$aiError->getMessage());}
  if(!$analysis) flash('success','Listing created. Fraud analysis is temporarily unavailable, so it remains private and pending review.');
  else flash('success','Listing created. Trust analysis: '.trust_label((string)$analysis['trust_status'],(string)$analysis['listing_status']).' ('.number_format((float)$analysis['fraud_score'],2).'/100).');
  redirect('/listing.php?id='.$id);
 }catch(Throwable $e){
  if($pdo instanceof PDO&&$pdo->inTransaction()) $pdo->rollBack();
  if(!$listingCommitted&&$uploadedAbsolutePath!==null&&is_file($uploadedAbsolutePath)) @unlink($uploadedAbsolutePath);
  if(!($e instanceof RuntimeException)) error_log('Create listing error: '.$e->getMessage());
  flash('error',$e instanceof RuntimeException?$e->getMessage():'Could not create listing. Please try again.');
 }
}
$pageTitle='Sell an Item'; include __DIR__.'/includes/header.php';
?>
<form class="form-card" method="post" enctype="multipart/form-data"><h1>Create listing</h1><p class="muted">RADIUS analyzes the listing after submission. Suspicious/high-risk posts stay private for human moderation.</p><?=csrf_field()?>
<div class="form-grid">
<div class="field full"><label>Title *</label><input name="title" maxlength="180" required value="<?=e((string)($_POST['title']??''))?>"></div>
<div class="field full"><label>Description *</label><textarea name="description" required><?=e((string)($_POST['description']??''))?></textarea></div>
<div class="field"><label>Category *</label><input name="category" maxlength="80" required placeholder="phone, laptop, furniture" value="<?=e((string)($_POST['category']??''))?>"></div>
<div class="field"><label>Brand</label><input name="brand" maxlength="100" value="<?=e((string)($_POST['brand']??''))?>"></div>
<div class="field"><label>Condition *</label><select name="condition" required><?php foreach(['new','excellent','good','fair','poor'] as $v):?><option value="<?=$v?>" <?=($_POST['condition']??'good')===$v?'selected':''?>><?=ucfirst($v)?></option><?php endforeach;?></select></div>
<div class="field"><label>Price (BDT) *</label><input type="number" name="price" min="1" max="100000000" step="0.01" required value="<?=e((string)($_POST['price']??''))?>"></div>
<div class="field full"><label>Location *</label><input name="location" maxlength="190" required value="<?=e((string)($_POST['location']??''))?>"></div>
<div class="field"><label>Latitude</label><input name="latitude" inputmode="decimal" value="<?=e((string)($_POST['latitude']??''))?>"></div><div class="field"><label>Longitude</label><input name="longitude" inputmode="decimal" value="<?=e((string)($_POST['longitude']??''))?>"></div>
<div class="field full"><label>Product image *</label><input type="file" name="image" accept="image/jpeg,image/png,image/webp" required></div></div>
<div class="actions"><button type="button" class="btn btn-light" data-use-location>Use my location</button><button class="btn">Create & Analyze</button></div></form>
<?php include __DIR__.'/includes/footer.php';?>
