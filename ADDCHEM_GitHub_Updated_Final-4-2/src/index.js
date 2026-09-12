const SESSION_COOKIE = 'addchem_staff_session';
const SESSION_HOURS = 8;
const UNIT_OPTIONS = ['Bottle','Packet','Box','Vial','Tube','Ampoule','Can','Bag','Drum','Piece','Set','Other'];

function json(data, status=200, extra={}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {'content-type':'application/json; charset=utf-8', 'cache-control':'no-store', ...extra}
  });
}
function bad(message, status=400){ return json({error: message}, status); }
function nowIso(){ return new Date().toISOString(); }
function addHours(date, h){ return new Date(date.getTime()+h*3600*1000); }
function cookie(name,value,maxAge){
  return `${name}=${value}; Path=/; Max-Age=${maxAge}; HttpOnly; Secure; SameSite=Lax`;
}
function clearCookie(name){ return `${name}=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Lax`; }
function parseCookies(header=''){
  const out={};
  for(const part of header.split(';')){
    const i=part.indexOf('=');
    if(i>0) out[part.slice(0,i).trim()] = decodeURIComponent(part.slice(i+1).trim());
  }
  return out;
}
function bytesToB64(bytes){ return btoa(String.fromCharCode(...new Uint8Array(bytes))); }
function b64ToBytes(str){ return Uint8Array.from(atob(str), c=>c.charCodeAt(0)); }
async function sha256Base64(text){
  const buf=await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return bytesToB64(buf);
}
async function pbkdf2(password, saltB64, iterations){
  const key=await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits=await crypto.subtle.deriveBits({name:'PBKDF2',salt:b64ToBytes(saltB64),iterations,hash:'SHA-256'}, key, 256);
  return bytesToB64(bits);
}
function timingSafeEqual(a,b){
  if(typeof a!=='string'||typeof b!=='string'||a.length!==b.length) return false;
  let x=0; for(let i=0;i<a.length;i++) x |= a.charCodeAt(i)^b.charCodeAt(i); return x===0;
}
async function bodyJson(request){
  try { return await request.json(); } catch { throw new Error('Invalid JSON body'); }
}
function requireSameOrigin(request){
  const origin=request.headers.get('Origin');
  if(!origin) return true;
  const u=new URL(request.url);
  return origin===u.origin;
}
async function getStaff(request, env){
  const token=parseCookies(request.headers.get('Cookie')||'')[SESSION_COOKIE];
  if(!token) return null;
  const tokenHash=await sha256Base64(token);
  const row=await env.DB.prepare(`SELECT s.staff_id as id, s.expires_at, u.email, u.role, u.active FROM sessions s JOIN staff_users u ON u.id=s.staff_id WHERE s.token_hash=? LIMIT 1`).bind(tokenHash).first();
  if(!row || !row.active || new Date(row.expires_at)<=new Date()){
    if(row) await env.DB.prepare('DELETE FROM sessions WHERE token_hash=?').bind(tokenHash).run();
    return null;
  }
  await env.DB.prepare('UPDATE sessions SET last_seen_at=datetime(\'now\') WHERE token_hash=?').bind(tokenHash).run();
  return row;
}
function unitOk(unit){ return UNIT_OPTIONS.includes(unit); }
function safeInt(n){ const x=Number(n); return Number.isInteger(x)&&x>=0?x:null; }

async function login(request, env){
  const body=await bodyJson(request);
  const email=String(body.email||'').trim().toLowerCase();
  const password=String(body.password||'');
  if(!email||!password) return bad('Email and password are required.');
  const user=await env.DB.prepare('SELECT * FROM staff_users WHERE email=? LIMIT 1').bind(email).first();
  if(!user || !user.active) return bad('Invalid staff login.', 401);
  const m=String(user.password_hash||'').match(/^pbkdf2-sha256:(\d+):(.+)$/);
  if(!m) return bad('Staff account needs to be reset by an administrator.', 500);
  const candidate=await pbkdf2(password,user.password_salt,Number(m[1]));
  if(!timingSafeEqual(candidate,m[2])) return bad('Invalid staff login.', 401);
  const token=bytesToB64(crypto.getRandomValues(new Uint8Array(32))).replaceAll('+','-').replaceAll('/','_').replaceAll('=','');
  const tokenHash=await sha256Base64(token);
  const expires=addHours(new Date(),SESSION_HOURS).toISOString();
  await env.DB.batch([
    env.DB.prepare('DELETE FROM sessions WHERE expires_at <= datetime(\'now\')'),
    env.DB.prepare('INSERT INTO sessions(token_hash,staff_id,expires_at) VALUES(?,?,?)').bind(tokenHash,user.id,expires),
    env.DB.prepare('UPDATE staff_users SET last_login_at=datetime(\'now\') WHERE id=?').bind(user.id)
  ]);
  return json({staff:{id:user.id,email:user.email,role:user.role}},200,{ 'set-cookie': cookie(SESSION_COOKIE,token,SESSION_HOURS*3600) });
}

async function logout(request, env){
  const token=parseCookies(request.headers.get('Cookie')||'')[SESSION_COOKIE];
  if(token){ const h=await sha256Base64(token); await env.DB.prepare('DELETE FROM sessions WHERE token_hash=?').bind(h).run(); }
  return json({ok:true},200,{'set-cookie':clearCookie(SESSION_COOKIE)});
}

async function inventoryList(env, request){
  const url=new URL(request.url); const q=(url.searchParams.get('q')||'').trim();
  let sql='SELECT * FROM inventory_items'; const params=[];
  if(q){ sql+=' WHERE lower(product_name) LIKE ? OR lower(sku) LIKE ? OR lower(cas_number) LIKE ? OR lower(grade) LIKE ?'; const like=`%${q.toLowerCase()}%`; params.push(like,like,like,like); }
  sql+=' ORDER BY product_name COLLATE NOCASE, grade COLLATE NOCASE, sku COLLATE NOCASE';
  const r=await env.DB.prepare(sql).bind(...params).all();
  return json({items:r.results||[]});
}

async function summary(env){
  const skus=await env.DB.prepare('SELECT COUNT(*) AS n FROM inventory_items').first();
  const total=await env.DB.prepare('SELECT COALESCE(SUM(quantity),0) AS n FROM inventory_items').first();
  const units=await env.DB.prepare('SELECT unit, COALESCE(SUM(quantity),0) AS quantity FROM inventory_items GROUP BY unit ORDER BY unit').all();
  const grades=await env.DB.prepare('SELECT COUNT(DISTINCT grade) AS n FROM inventory_items WHERE grade IS NOT NULL AND trim(grade)<>\'\'').first();
  return json({summary:{skus:Number(skus?.n||0),totalUnits:Number(total?.n||0),grades:Number(grades?.n||0),byUnit:units.results||[]}});
}

async function upsertInventory(request, env, staff){
  const b=await bodyJson(request);
  const sku=String(b.sku||'').trim(); const productName=String(b.product_name||'').trim(); const unit=String(b.unit||'').trim();
  const grade=String(b.grade||'').trim(); const quantity=safeInt(b.quantity);
  if(!sku||!productName||!unit||quantity===null) return bad('SKU, product name, unit and a non-negative whole quantity are required.');
  if(!unitOk(unit)) return bad('Invalid unit.');
  const existing=await env.DB.prepare('SELECT * FROM inventory_items WHERE sku=? LIMIT 1').bind(sku).first();
  const now=nowIso();
  if(existing){
    const oldQty=Number(existing.quantity||0);
    const delta=quantity-oldQty;
    await env.DB.batch([
      env.DB.prepare(`UPDATE inventory_items SET product_key=?,product_name=?,cas_number=?,grade=?,quantity=?,unit=?,batch_no=?,expiry_date=?,internal_notes=?,updated_by=?,updated_at=? WHERE id=?`).bind(b.product_key||null,productName,b.cas_number||null,grade||null,quantity,unit,b.batch_no||null,b.expiry_date||null,b.internal_notes||null,staff.id,now,existing.id),
      delta!==0 ? env.DB.prepare(`INSERT INTO inventory_movements(inventory_id,delta_quantity,movement_type,reason,staff_id) VALUES(?,?,?,?,?)`).bind(existing.id,delta,'adjustment',String(b.reason||'Manual quantity correction'),staff.id) : env.DB.prepare('SELECT 1')
    ]);
    return json({ok:true});
  }
  const r=await env.DB.prepare(`INSERT INTO inventory_items(sku,product_key,product_name,cas_number,grade,quantity,unit,batch_no,expiry_date,internal_notes,updated_by) VALUES(?,?,?,?,?,?,?,?,?,?,?)`).bind(sku,b.product_key||null,productName,b.cas_number||null,grade||null,quantity,unit,b.batch_no||null,b.expiry_date||null,b.internal_notes||null,staff.id).run();
  const id=r.meta.last_row_id;
  await env.DB.prepare(`INSERT INTO inventory_movements(inventory_id,delta_quantity,movement_type,reason,staff_id) VALUES(?,?,?,?,?)`).bind(id,quantity,'opening',String(b.reason||'Opening inventory'),staff.id).run();
  return json({ok:true,id});
}

async function deleteInventory(request, env, staff){
  const b=await bodyJson(request); const id=Number(b.id);
  if(!Number.isInteger(id)) return bad('Invalid inventory id.');
  await env.DB.prepare('DELETE FROM inventory_items WHERE id=?').bind(id).run();
  return json({ok:true});
}

function makeInvoiceNo(){
  const d=new Date(); const y=d.getUTCFullYear(); const m=String(d.getUTCMonth()+1).padStart(2,'0'); const day=String(d.getUTCDate()).padStart(2,'0'); const r=crypto.randomUUID().slice(0,8).toUpperCase(); return `ADDCHEM-${y}${m}${day}-${r}`;
}

async function createBill(request, env, staff){
  const b=await bodyJson(request);
  const raw=Array.isArray(b.items)?b.items:[];
  if(!raw.length) return bad('Add at least one item to the bill.');
  const grouped=new Map();
  for(const x of raw){
    const id=Number(x.inventory_id), qty=safeInt(x.quantity);
    if(!Number.isInteger(id)||!qty||qty<1) return bad('Every bill line needs a valid inventory item and quantity.');
    grouped.set(id,(grouped.get(id)||0)+qty);
  }
  const ids=[...grouped.keys()];
  const placeholders=ids.map(()=>'?').join(',');
  const found=(await env.DB.prepare(`SELECT id,sku,product_name,cas_number,grade,quantity,unit FROM inventory_items WHERE id IN (${placeholders})`).bind(...ids).all()).results||[];
  if(found.length!==ids.length) return bad('One or more inventory items no longer exist. Refresh and try again.');
  const invoiceNo=makeInvoiceNo();
  const statements=[];
  statements.push(env.DB.prepare('INSERT INTO bills(invoice_no,customer_name,customer_reference,notes,staff_id) VALUES(?,?,?,?,?)').bind(invoiceNo,b.customer_name||null,b.customer_reference||null,b.notes||null,staff.id));
  for(const row of found){
    const qty=grouped.get(Number(row.id));
    statements.push(env.DB.prepare('UPDATE inventory_items SET quantity=quantity-?,updated_by=?,updated_at=? WHERE id=?').bind(qty,staff.id,nowIso(),row.id));
    statements.push(env.DB.prepare("INSERT INTO inventory_movements(inventory_id,delta_quantity,movement_type,reference,staff_id) VALUES(?,?,?,?,?)").bind(row.id,-qty,'sale',invoiceNo,staff.id));
    statements.push(env.DB.prepare("INSERT INTO bill_items(bill_id,inventory_id,sku,product_name,cas_number,grade,quantity,unit) SELECT last_insert_rowid(),?,?,?,?,?,?,? WHERE last_insert_rowid()>0").bind(invoiceNo,row.sku,row.product_name,row.cas_number,row.grade,qty,row.unit));
  }
  try {
    await env.DB.batch(statements);
  } catch(e){
    const message=String(e?.message||e);
    if(message.includes('Insufficient inventory')) return bad('Not enough inventory for one of the selected items. The bill was not saved.',409);
    return bad('Could not save the bill. No inventory was changed.',500);
  }
  return json({ok:true,invoice_no:invoiceNo});
}

async function recentBills(env){
  const rows=await env.DB.prepare(`SELECT b.id,b.invoice_no,b.customer_name,b.customer_reference,b.created_at,u.email as staff_email,COALESCE(SUM(bi.quantity),0) as total_units FROM bills b JOIN staff_users u ON u.id=b.staff_id LEFT JOIN bill_items bi ON bi.invoice_no=b.invoice_no GROUP BY b.id ORDER BY b.created_at DESC LIMIT 30`).all();
  return json({bills:rows.results||[]});
}

async function api(request, env){
  const path=new URL(request.url).pathname;
  if(path==='/api/auth/login' && request.method==='POST') return login(request,env);
  if(path==='/api/auth/logout' && request.method==='POST') return logout(request,env);
  if(!requireSameOrigin(request) && request.method!=='GET') return bad('Cross-origin request blocked.',403);
  const staff=await getStaff(request,env);
  if(path==='/api/auth/me' && request.method==='GET') return staff?json({staff:{id:staff.id,email:staff.email,role:staff.role}}):bad('Not signed in.',401);
  if(!staff) return bad('Staff login required.',401);
  if(path==='/api/inventory' && request.method==='GET') return inventoryList(env,request);
  if(path==='/api/inventory' && request.method==='POST') return upsertInventory(request,env,staff);
  if(path==='/api/inventory/delete' && request.method==='POST') return deleteInventory(request,env,staff);
  if(path==='/api/summary' && request.method==='GET') return summary(env);
  if(path==='/api/bills' && request.method==='POST') return createBill(request,env,staff);
  if(path==='/api/bills/recent' && request.method==='GET') return recentBills(env);
  return bad('Not found.',404);
}

export default {
  async fetch(request, env){
    const url=new URL(request.url);
    if(url.pathname.startsWith('/api/')) return api(request,env);
    return env.ASSETS.fetch(request);
  }
};
