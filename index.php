<?php
require_once __DIR__.'/includes/functions.php';
$pdo=db();
$distanceSql="(6371 * ACOS(LEAST(1, COS(RADIANS(23.7465)) * COS(RADIANS(l.latitude)) * COS(RADIANS(l.longitude)-RADIANS(90.376)) + SIN(RADIANS(23.7465)) * SIN(RADIANS(l.latitude)))))";
$items=$pdo->query("SELECT l.*,u.name seller_name,(SELECT image_path FROM listing_images WHERE listing_id=l.id ORDER BY id LIMIT 1) image_path,$distanceSql distance_km FROM listings l JOIN users u ON u.id=l.user_id WHERE l.status='approved' ORDER BY l.created_at DESC LIMIT 20")->fetchAll();
$radarItems=array_slice($items,0,8);
$reviewCount=count(array_filter($items,fn($x)=>($x['trust_status']??'safe')!=='safe'));
$verifiedSellers=count(array_unique(array_map(fn($x)=>$x['user_id'],array_filter($items,fn($x)=>($x['trust_status']??'')==='safe'))));
$pageTitle='Nearby. Trusted. Secondhand.';include __DIR__.'/includes/header.php';
?>
<div class="browse-page">
<section class="trust-hero">
  <div class="trust-hero-copy">
    <div class="eyebrow">Trust Radar</div>
    <h1>Buy and sell safely with people nearby</h1>
    <p>Nearby secondhand listings, scanned for suspicious prices, duplicate photos, and risky seller signals.</p>
    <form class="hero-search" action="/listings.php" method="get">
      <span class="hero-search-icon" aria-hidden="true"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg></span>
      <input name="q" placeholder="Search nearby phones, laptops, cameras...">
      <button class="hero-search-btn">Search</button>
    </form>
    <div class="hero-actions"><a class="btn btn-primary" href="/listings.php">Browse Nearby Listings</a><a class="btn btn-secondary" href="/create-listing.php">Sell an Item</a></div>
    <div class="trust-radar-stats"><span><strong><?=count($items)?></strong> nearby listings</span><span><strong><?=$reviewCount?></strong> under AI review</span><span><strong><?=$verifiedSellers?></strong> verified sellers</span></div>
  </div>
  <div class="trust-radar-shell" data-radar>
    <div class="trust-radar-panel">
      <div class="trust-radar-depth trust-radar-depth-a"></div><div class="trust-radar-depth trust-radar-depth-b"></div><div class="trust-radar-sweep"></div>
      <div class="trust-radar-ring trust-radar-ring-1"><span>500m</span></div><div class="trust-radar-ring trust-radar-ring-2"><span>2km</span></div><div class="trust-radar-ring trust-radar-ring-3"><span>5km</span></div>
      <div class="trust-radar-center" title="You"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 11 12 4l9 7"/><path d="M5 10v10h14V10"/><path d="M9 20v-6h6v6"/></svg></div>
      <?php $n=max(count($radarItems),1);foreach($radarItems as $i=>$l):$angle=($i/$n)*M_PI*2-M_PI/2;$distance=(float)($l['distance_km']??2.2);$radius=20+min($distance/5,1)*30;$x=50+$radius*cos($angle);$y=50+$radius*sin($angle);$state=trust_state($l['trust_status']??'');?>
      <button type="button" class="trust-radar-node <?=$state?><?=$i===0?' selected':''?>" style="left:<?=number_format($x,2,'.','')?>%;top:<?=number_format($y,2,'.','')?>%" data-radar-node data-id="<?=$l['id']?>" data-title="<?=e($l['title'])?>" data-price="<?=e(money($l['price']))?>" data-distance="<?=number_format($distance,1)?> km" data-state="<?=$state?>" data-trust="<?=e(trust_label($l['trust_status']??''))?>" data-image="<?=e(listing_visual($l))?>" data-href="/listing.php?id=<?=$l['id']?>"><img src="<?=e(listing_visual($l))?>" alt=""><span class="trust-radar-node-distance"><?=number_format($distance,1)?>km</span></button>
      <?php endforeach;?>
      <?php if($radarItems):$first=$radarItems[0];?><div class="trust-radar-card <?=trust_state($first['trust_status']??'')?>" data-radar-card><img src="<?=e(listing_visual($first))?>" alt="" data-radar-card-image><div class="trust-radar-card-body"><strong data-radar-card-title><?=e($first['title'])?></strong><span class="trust-radar-price" data-radar-card-price><?=money($first['price'])?></span><span data-radar-card-distance><?=number_format((float)($first['distance_km']??0),1)?> km away</span><span data-radar-card-trust><?=e(trust_label($first['trust_status']??''))?></span><a class="btn btn-primary btn-sm" data-radar-card-link href="/listing.php?id=<?=$first['id']?>">View Listing</a></div></div><?php endif;?>
    </div>
  </div>
</section>

<div class="section-head"><div><h2>Nearby listings</h2><p>Fresh products around Dhaka with explainable trust signals.</p></div><a href="/listings.php">View all →</a></div>
<div class="filters" style="margin-bottom:20px"><a class="btn btn-secondary btn-sm" href="/listings.php">All</a><?php foreach(['phone','laptop','camera','furniture','bicycle','appliance','fashion','books','gaming','accessories'] as $cat):?><a class="btn btn-ghost btn-sm" href="/listings.php?category=<?=urlencode($cat)?>"><?=e(ucfirst($cat))?></a><?php endforeach;?></div>
<div class="listing-grid">
<?php foreach(array_slice($items,0,12) as $l):?><a class="listing-card" href="/listing.php?id=<?=$l['id']?>"><div class="card-image-wrap"><img class="card-image" src="<?=e(listing_visual($l))?>" alt="<?=e($l['title'])?>"></div><div class="card-content"><div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px"><h3 class="card-title"><?=e($l['title'])?></h3><div class="card-price"><?=money($l['price'])?></div></div><p class="card-desc"><?=e($l['description'])?></p><div class="card-meta"><span class="meta-pill"><?=e($l['category'])?></span><span class="meta-pill"><?=e($l['item_condition'])?></span><span><?=number_format((float)($l['distance_km']??0),1)?>km</span><span class="badge <?=e(trust_class($l['trust_status']??''))?>"><?=e(trust_label($l['trust_status']??''))?></span></div></div></a><?php endforeach;?>
</div>
</div>
<?php include __DIR__.'/includes/footer.php';?>