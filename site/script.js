
const state={products:[],loaded:false};
const $=s=>document.querySelector(s);
const $$=s=>Array.from(document.querySelectorAll(s));
function esc(s){return String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));}
function productCard(p){return `<a class="product-card" href="/products/${encodeURIComponent(p.slug)}/"><span class="card-label">ADD CHEM / CATALOGUE</span><h3>${esc(p.name)}</h3><span class="cas">CAS ${esc(p.cas)}</span>${p.details?`<p>${esc(p.details)}</p>`:''}<span class="arrow">View record →</span></a>`}
function render(list,query=''){
 const results=$('#product-results'),status=$('#search-status'),clear=$('#clear-search'); if(!results||!status)return;
 const limited=list.slice(0,12);
 status.textContent=query?`${list.length.toLocaleString()} matching record${list.length===1?'':'s'}${list.length>12?' · showing first 12':''}`:`Showing ${limited.length} featured catalogue records`;
 results.innerHTML=limited.length?limited.map(productCard).join(''):`<div class="empty-state">No matching catalogue records found. Try another product name or CAS number.</div>`;
 if(clear)clear.hidden=!query;
}
async function loadProducts(){
 try{const r=await fetch('/products.json',{cache:'no-store'});state.products=await r.json();state.loaded=true;render(state.products.slice(0,60));const input=$('#product-search');if(input){input.addEventListener('input',()=>{const q=input.value.trim().toLowerCase();if(!q)return render(state.products.slice(0,60));render(state.products.filter(p=>(`${p.name} ${p.cas} ${p.details||''}`).toLowerCase().includes(q)),q);});}const clear=$('#clear-search');clear?.addEventListener('click',()=>{input.value='';render(state.products.slice(0,60));input.focus();});
 }catch(e){const s=$('#search-status');if(s)s.textContent='The catalogue could not be loaded right now.';}
}
$$('.chip').forEach(b=>b.addEventListener('click',()=>{const input=$('#product-search');if(input){input.value=b.dataset.query;input.dispatchEvent(new Event('input'));input.focus();}}));
$('#mobile-menu')?.addEventListener('click',()=>$('#mobile-nav')?.classList.toggle('open'));
$$('.mobile-nav a').forEach(a=>a.addEventListener('click',()=>$('#mobile-nav')?.classList.remove('open')));
$('#whatsapp-enquiry')?.addEventListener('click',()=>{const p=$('#enquiry-product')?.value.trim()||'Not specified';const q=$('#enquiry-qty')?.value.trim()||'Not specified';const m=$('#enquiry-message')?.value.trim()||'No additional message';const text=`Hello Addchem Enterprises, I would like to make an enquiry.%0A%0AProduct / CAS: ${encodeURIComponent(p)}%0AQuantity / requirement: ${encodeURIComponent(q)}%0AMessage: ${encodeURIComponent(m)}`;window.open(`https://wa.me/918919580575?text=${text}`,'_blank','noopener');});
// Cursor-responsive ambient particle field.
(()=>{const c=document.getElementById('particle-canvas');if(!c)return;const ctx=c.getContext('2d');
const reduceMotion=matchMedia('(prefers-reduced-motion: reduce)').matches;
const finePointer=matchMedia('(pointer: fine)').matches; // only mouse/trackpad "chases" the cursor — touch just scrolls
if(reduceMotion){c.remove();return;}
let w=innerWidth,h=innerHeight,dpr=Math.min(devicePixelRatio||1,2);let mouse={x:w*.5,y:h*.5,active:false};let pts=[];let raf=null;let running=true;
const count=Math.min(64,Math.max(32,Math.floor(w*h/26000)));
const REPEL_RADIUS=170,REPEL_FORCE=.05,FRICTION=.95,MAX_SPEED=1;
function resize(){w=innerWidth;h=innerHeight;dpr=Math.min(devicePixelRatio||1,2);c.width=w*dpr;c.height=h*dpr;c.style.width=w+'px';c.style.height=h+'px';ctx.setTransform(dpr,0,0,dpr,0,0);pts=Array.from({length:count},()=>({x:Math.random()*w,y:Math.random()*h,vx:(Math.random()-.5)*.22,vy:(Math.random()-.5)*.22,r:1+Math.random()*1.8}));}
function tick(){
 ctx.clearRect(0,0,w,h);
 for(let i=0;i<pts.length;i++){
  const p=pts[i];
  if(finePointer&&mouse.active){
   const dx=p.x-mouse.x,dy=p.y-mouse.y,dist=Math.hypot(dx,dy)||1;
   if(dist<REPEL_RADIUS){const force=(1-dist/REPEL_RADIUS)*REPEL_FORCE;p.vx+=(dx/dist)*force;p.vy+=(dy/dist)*force;}
  }
  p.vx*=FRICTION;p.vy*=FRICTION;
  const speed=Math.hypot(p.vx,p.vy);
  if(speed>MAX_SPEED){p.vx=p.vx/speed*MAX_SPEED;p.vy=p.vy/speed*MAX_SPEED;}
  p.x+=p.vx;p.y+=p.vy;
  if(p.x<-10)p.x=w+10;if(p.x>w+10)p.x=-10;if(p.y<-10)p.y=h+10;if(p.y>h+10)p.y=-10;
  ctx.beginPath();ctx.arc(p.x,p.y,p.r,0,Math.PI*2);ctx.fillStyle='rgba(46,143,255,.34)';ctx.fill();
  for(let j=i+1;j<pts.length;j++){const q=pts[j];const d=Math.hypot(p.x-q.x,p.y-q.y);if(d<115){ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.lineTo(q.x,q.y);ctx.strokeStyle=`rgba(46,143,255,${(1-d/115)*.09})`;ctx.lineWidth=1;ctx.stroke();}}
 }
 if(running)raf=requestAnimationFrame(tick);
}
resize();addEventListener('resize',resize);
if(finePointer){
 addEventListener('pointermove',e=>{mouse.x=e.clientX;mouse.y=e.clientY;mouse.active=true;const g=document.querySelector('.cursor-glow');if(g){g.style.left=e.clientX+'px';g.style.top=e.clientY+'px';}});
 addEventListener('pointerleave',()=>mouse.active=false);
}else{
 const g=document.querySelector('.cursor-glow');if(g)g.remove(); // avoid a glow that "sticks" under a finger while scrolling
}
document.addEventListener('visibilitychange',()=>{ // pause off-screen tabs instead of letting frames queue up
 running=!document.hidden;
 if(running&&!raf)tick();
});
tick();
})();
loadProducts();
