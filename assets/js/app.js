document.querySelectorAll('[data-confirm]').forEach(el=>el.addEventListener('click',e=>{if(!confirm(el.dataset.confirm))e.preventDefault()}));

const lat=document.querySelector('[name=latitude]'),lng=document.querySelector('[name=longitude]'),loc=document.querySelector('[data-use-location]');
if(loc&&navigator.geolocation){loc.addEventListener('click',()=>navigator.geolocation.getCurrentPosition(p=>{if(lat)lat.value=p.coords.latitude.toFixed(7);if(lng)lng.value=p.coords.longitude.toFixed(7);loc.textContent='Location added';},()=>alert('Location permission was not available. Enter it manually.')))}

function escapeHtml(v){const d=document.createElement('div');d.textContent=v??'';return d.innerHTML}
async function pollChat(){const log=document.querySelector('[data-chat-log]');if(!log)return;const id=log.dataset.conversation;try{const r=await fetch('/api/chat.php?conversation_id='+encodeURIComponent(id));const data=await r.json();if(!data.items)return;log.innerHTML=data.items.map(m=>`<div class="bubble ${m.mine?'me':''}"><strong>${escapeHtml(m.sender_name)}</strong><br>${escapeHtml(m.message)}<div class="muted">${escapeHtml(m.created_at)}</div></div>`).join('');log.scrollTop=log.scrollHeight}catch{}}
if(document.querySelector('[data-chat-log]')){pollChat();setInterval(pollChat,3000)}

/* Legacy Trust Radar interaction, ported from React to vanilla JS. */
document.querySelectorAll('[data-radar]').forEach(shell=>{
  const panel=shell.querySelector('.trust-radar-panel');
  const nodes=[...shell.querySelectorAll('[data-radar-node]')];
  const card=shell.querySelector('[data-radar-card]');
  if(!panel)return;

  const selectNode=node=>{
    nodes.forEach(n=>n.classList.toggle('selected',n===node));
    if(!card||!node)return;
    card.classList.remove('verified','review','danger');
    card.classList.add(node.dataset.state||'review');
    const img=card.querySelector('[data-radar-card-image]');
    const title=card.querySelector('[data-radar-card-title]');
    const price=card.querySelector('[data-radar-card-price]');
    const distance=card.querySelector('[data-radar-card-distance]');
    const trust=card.querySelector('[data-radar-card-trust]');
    const link=card.querySelector('[data-radar-card-link]');
    if(img)img.src=node.dataset.image||'';
    if(title)title.textContent=node.dataset.title||'';
    if(price)price.textContent=node.dataset.price||'';
    if(distance)distance.textContent=(node.dataset.distance||'')+' away';
    if(trust)trust.textContent=node.dataset.trust||'';
    if(link)link.href=node.dataset.href||'#';
  };

  nodes.forEach(node=>{
    node.addEventListener('mouseenter',()=>selectNode(node));
    node.addEventListener('focus',()=>selectNode(node));
    node.addEventListener('click',()=>selectNode(node));
    node.addEventListener('dblclick',()=>{if(node.dataset.href)location.href=node.dataset.href});
  });

  shell.addEventListener('pointermove',event=>{
    const rect=shell.getBoundingClientRect();
    const px=(event.clientX-rect.left)/rect.width-.5;
    const py=(event.clientY-rect.top)/rect.height-.5;
    shell.style.setProperty('--tilt-x',`${(-py*5).toFixed(2)}deg`);
    shell.style.setProperty('--tilt-y',`${(px*6).toFixed(2)}deg`);
  });
  shell.addEventListener('pointerleave',()=>{
    shell.style.setProperty('--tilt-x','0deg');
    shell.style.setProperty('--tilt-y','0deg');
  });
});
