const state={all:[],filtered:[],page:1,pageSize:24};
const els={
  search:document.getElementById('search'),section:document.getElementById('section'),grade:document.getElementById('grade'),
  reset:document.getElementById('reset'),grid:document.getElementById('catalogue'),empty:document.getElementById('empty'),
  result:document.getElementById('result-count'),prev:document.getElementById('prev'),next:document.getElementById('next'),pageInfo:document.getElementById('page-info'),
  modal:document.getElementById('modal'),modalTitle:document.getElementById('modal-title'),modalBody:document.getElementById('modal-body')
};
Promise.all([fetch('data/products.json').then(r=>r.json()),fetch('data/summary.json').then(r=>r.json())]).then(([products,summary])=>{
  state.all=products.map((p,i)=>({...p,_i:i}));
  const sections=[...new Set(products.map(p=>p.Section).filter(Boolean))].sort();
  const grades=[...new Set(products.map(p=>p['Grade / Traceability']).filter(Boolean))].sort();
  sections.forEach(x=>els.section.insertAdjacentHTML('beforeend',`<option>${escapeHtml(x)}</option>`));
  grades.forEach(x=>els.grade.insertAdjacentHTML('beforeend',`<option>${escapeHtml(x)}</option>`));
  const qs=new URLSearchParams(location.search);
  if(qs.get('section')) els.section.value=qs.get('section');
  if(qs.get('q')) els.search.value=qs.get('q');
  [els.search,els.section,els.grade].forEach(e=>e.addEventListener('input',apply));
  els.reset.addEventListener('click',()=>{els.search.value='';els.section.value='';els.grade.value='';apply();});
  els.prev.onclick=()=>{if(state.page>1){state.page--;render();}};
  els.next.onclick=()=>{if(state.page<Math.ceil(state.filtered.length/state.pageSize)){state.page++;render();}};
  apply();
});
function waUrl(p){
  const name=p['Product Name']||'this product';
  const code=p['Product Code']||'';
  const cas=p['CAS Number']||'';
  const pack=p['Pack Size']||'';
  const msg=`Hello ADDCHEM, I am enquiring about ${name}${code?` (Product Code: ${code})`:''}${cas?` | CAS: ${cas}`:''}${pack?` | Pack Size: ${pack}`:''}. Please share availability and details.`;
  return `https://wa.me/918919580575?text=${encodeURIComponent(msg)}`;
}
function apply(){
  const q=els.search.value.trim().toLowerCase(), s=els.section.value, g=els.grade.value;
  state.filtered=state.all.filter(p=>{
    const hay=[p['Product Name'],p['Chemical Name / Description'],p['CAS Number'],p['Product Code'],p['HSN Code'],p['Grade / Traceability'],p['Other / Notes']].join(' ').toLowerCase();
    return (!q||hay.includes(q))&&(!s||p.Section===s)&&(!g||p['Grade / Traceability']===g);
  }).sort((a,b)=>a['Product Name'].localeCompare(b['Product Name'],undefined,{sensitivity:'base'}));
  state.page=1;render();
}
function render(){
  const start=(state.page-1)*state.pageSize, rows=state.filtered.slice(start,start+state.pageSize);
  els.result.textContent=`${state.filtered.length.toLocaleString('en-IN')} result${state.filtered.length===1?'':'s'}`;
  els.empty.hidden=rows.length!==0;
  els.grid.innerHTML=rows.map(p=>`
    <article class="product-card" tabindex="0" data-id="${p._i}">
      <div class="product-top"><span class="code">${escapeHtml(p['Product Code']||'No code')}</span><span class="pill">${escapeHtml(p.Section||'Unclassified')}</span></div>
      <h3>${escapeHtml(p['Product Name']||'Unnamed product')}</h3>
      <div class="meta"><div><small>CAS</small><strong>${escapeHtml(p['CAS Number']||'—')}</strong></div><div><small>Grade</small><strong>${escapeHtml(p['Grade / Traceability']||'—')}</strong></div></div>
      <div class="meta"><div><small>Pack size</small><strong>${escapeHtml(p['Pack Size']||'—')}</strong></div><div><small>HSN</small><strong>${escapeHtml(p['HSN Code']||'—')}</strong></div></div>
      <button class="text-btn">View details →</button>
    </article>`).join('');
  document.querySelectorAll('.product-card').forEach(c=>c.addEventListener('click',()=>open(Number(c.dataset.id))));
  const pages=Math.max(1,Math.ceil(state.filtered.length/state.pageSize));
  els.pageInfo.textContent=`Page ${state.page} of ${pages}`;
  els.prev.disabled=state.page<=1;els.next.disabled=state.page>=pages;
}
function open(id){
  const p=state.all.find(x=>x._i===id);if(!p)return;
  els.modalTitle.textContent=p['Product Name']||'Unnamed product';
  const fields=[
    ['Section',p.Section],['Chemical Name / Description',p['Chemical Name / Description']],
    ['CAS Number',p['CAS Number']],['Grade / Traceability',p['Grade / Traceability']],
    ['Product Code',p['Product Code']],['Pack Size',p['Pack Size']],
    ['HSN Code',p['HSN Code']],['GST %',p['GST %']?`${p['GST %']}%`:'' ],['Other / Notes',p['Other / Notes']]
  ];
  els.modalBody.innerHTML=fields.filter(x=>x[1]).map(([k,v])=>`<div><small>${escapeHtml(k)}</small><strong>${escapeHtml(v)}</strong></div>`).join('') +
    `<div class="detail-wa"><a class="wa-btn wa-large" href="${waUrl(p)}" target="_blank" rel="noopener noreferrer">Enquire on WhatsApp</a></div>`;
  els.modal.setAttribute('aria-hidden','false');document.body.classList.add('no-scroll');
}
document.querySelectorAll('[data-close]').forEach(x=>x.addEventListener('click',()=>{els.modal.setAttribute('aria-hidden','true');document.body.classList.remove('no-scroll');}));
document.addEventListener('keydown',e=>{if(e.key==='Escape'){els.modal.setAttribute('aria-hidden','true');document.body.classList.remove('no-scroll');}});
function escapeHtml(s){return String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));}
