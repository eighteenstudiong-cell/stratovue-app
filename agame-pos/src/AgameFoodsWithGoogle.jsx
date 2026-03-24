import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer, Legend
} from "recharts";

// ═══════════════════════════════════════════════════════════════════════════════
//  GOOGLE WORKSPACE CONFIGURATION
//  Replace SCRIPT_URL with your deployed Apps Script Web App URL
// ═══════════════════════════════════════════════════════════════════════════════
const GOOGLE_CONFIG = {
  // Paste your Web App URL here after deploying the Apps Script:
  // e.g. "https://script.google.com/macros/s/AKfyc.../exec"
  SCRIPT_URL: 'https://script.google.com/macros/s/AKfycbwRSR39Y9rUUBWCCygjq_B7Gy4zQ5Rm1IdAensk_G9neKDTxW8_DEqJQhZp18oEu0al/exec',

  // How often to sync with Google Sheets (milliseconds)
  SYNC_INTERVAL: 30000, // 30 seconds

  // Enable/disable Google integration (set false to use localStorage only)
  ENABLED: false, // automatically set to true when SCRIPT_URL is provided
};
// Auto-enable if URL is provided
if (GOOGLE_CONFIG.SCRIPT_URL && GOOGLE_CONFIG.SCRIPT_URL.includes('script.google.com')) {
  GOOGLE_CONFIG.ENABLED = true;
}

// ═══════════════════════════════════════════════════════════════════════════════
//  GOOGLE SHEETS API SERVICE
// ═══════════════════════════════════════════════════════════════════════════════
class GoogleSheetsAPI {
  constructor(scriptUrl) {
    this.url = scriptUrl;
    this.queue = []; // offline write queue
    this.online = navigator.onLine;
    window.addEventListener('online',  () => { this.online = true;  this.flushQueue(); });
    window.addEventListener('offline', () => { this.online = false; });
  }

  // All calls go through GET to avoid CORS preflight issues with Apps Script
  async call(action, payload = null) {
    if (!this.url) throw new Error('No Apps Script URL configured');
    const url = new URL(this.url);
    url.searchParams.set('action', action);
    if (payload) {
      // base64-encode payload to avoid URL encoding issues
      const b64 = btoa(unescape(encodeURIComponent(JSON.stringify(payload))));
      url.searchParams.set('payload', b64);
    }
    const res = await fetch(url.toString(), { method: 'GET' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    if (!json.ok && json.error) throw new Error(json.error);
    return json;
  }

  // Reads
  async getAll() {
    const [menu, orders, inventory, staff, recipes, suppliers, purchases] = await Promise.all([
      this.call('getMenu'),
      this.call('getOrders'),
      this.call('getInventory'),
      this.call('getStaff'),
      this.call('getRecipes'),
      this.call('getSuppliers'),
      this.call('getPurchases'),
    ]);
    return {
      menu:      (menu.data      || []).map(normalizeMenuItem),
      orders:    (orders.data    || []).map(normalizeOrder),
      inventory: inventory.data  || [],
      staff:     staff.data      || [],
      recipes:   (recipes.data   || []).map(normalizeRecipe),
      suppliers: suppliers.data  || [],
      purchases: purchases.data  || [],
    };
  }

  // Writes — queue if offline
  async write(action, payload) {
    if (!this.online || !this.url) {
      this.queue.push({ action, payload, ts: Date.now() });
      LS.set('_write_queue', this.queue);
      return { ok:true, queued:true };
    }
    return this.call(action, payload);
  }

  async flushQueue() {
    if (!this.queue.length) return;
    const items = [...this.queue];
    this.queue = [];
    LS.set('_write_queue', []);
    for (const item of items) {
      try { await this.call(item.action, item.payload); }
      catch(e) { this.queue.push(item); } // re-queue on failure
    }
  }

  async ping() {
    try { const r = await this.call('ping'); return r.ok; }
    catch(e) { return false; }
  }
}

// Data normalizers (Apps Script returns flat rows; re-shape for the POS)
function normalizeMenuItem(m) {
  return { ...m, id: Number(m.id), price: Number(m.price),
    available: m.available === true || m.available === 'TRUE' || m.available === 1 };
}
function normalizeOrder(o) {
  let items = o.items_json || o.items || [];
  if (typeof items === 'string') { try { items = JSON.parse(items); } catch(e) { items = []; } }
  return {
    ...o, id: Number(o.id), subtotal: Number(o.subtotal), discount: Number(o.discount),
    deliveryFee: Number(o.deliveryFee), total: Number(o.total),
    items,
    customer: { name: o.customerName || '', phone: o.customerPhone || '', address: o.deliveryAddress || '' },
  };
}
function normalizeRecipe(r) {
  let ings = r.ingredients_json || r.ingredients || [];
  if (typeof ings === 'string') { try { ings = JSON.parse(ings); } catch(e) { ings = []; } }
  return { ...r, menuItemId: Number(r.menuItemId), ingredients: ings };
}

// ─── LOCAL STORAGE FALLBACK ────────────────────────────────────────────────────
const LS = {
  get:(k,def)=>{ try{const v=localStorage.getItem('agf_'+k); return v?JSON.parse(v):def;}catch{return def;} },
  set:(k,v)=>{ try{localStorage.setItem('agf_'+k,JSON.stringify(v));}catch{} },
};

// ─── DESIGN TOKENS ─────────────────────────────────────────────────────────────
const C = {
  bg:'#0C0C0F', s1:'#13131A', s2:'#1A1A24', s3:'#22222F', s4:'#2A2A3A', border:'#2E2E3E',
  accent:'#FF6B2B', accentL:'#FF8A52', accentD:'#E05520', gold:'#F5B942', goldL:'#F7CD6B',
  text:'#F0EFE8', textMid:'#9D9DAA', textDim:'#5A5A6E',
  success:'#2ECC71', warning:'#F0B429', danger:'#E74C3C', info:'#3498DB', green:'#27AE60', purple:'#9B59B6',
};
const FONT_DISPLAY='\'Syne\', sans-serif', FONT_BODY='\'DM Sans\', sans-serif', FONT_MONO='\'DM Mono\', monospace';

// ─── INITIAL / SEED DATA ───────────────────────────────────────────────────────
const INIT_MENU = [
  {id:1,name:'Jollof Rice',category:'Food',price:1500,available:true},
  {id:2,name:'Fried Rice',category:'Food',price:1500,available:true},
  {id:3,name:'Egusi Soup + Swallow',category:'Food',price:1800,available:true},
  {id:4,name:'Pepper Soup',category:'Food',price:2000,available:true},
  {id:5,name:'Amala & Ewedu',category:'Food',price:1500,available:true},
  {id:6,name:'Eba & Soup',category:'Food',price:1200,available:true},
  {id:7,name:'Pounded Yam',category:'Food',price:2000,available:true},
  {id:8,name:'Moi Moi (2 wraps)',category:'Food',price:600,available:true},
  {id:9,name:'Fried Plantain',category:'Food',price:700,available:true},
  {id:10,name:'Beans & Plantain',category:'Food',price:1000,available:true},
  {id:11,name:'Akara (5 pcs)',category:'Food',price:500,available:true},
  {id:12,name:'Indomie Special',category:'Food',price:1200,available:true},
  {id:13,name:'Grilled Chicken',category:'Food',price:2500,available:true},
  {id:14,name:'Fried Fish',category:'Food',price:2200,available:true},
  {id:15,name:'Small Chops',category:'Food',price:1800,available:true},
  {id:16,name:'Ofada Rice & Sauce',category:'Food',price:1800,available:true},
  {id:17,name:'Yam & Egg Sauce',category:'Food',price:1000,available:true},
  {id:18,name:'Rice & Stew',category:'Food',price:1300,available:true},
  {id:19,name:'Coca-Cola (50cl)',category:'Drinks',price:350,available:true},
  {id:20,name:'Fanta (50cl)',category:'Drinks',price:350,available:true},
  {id:21,name:'Sprite (50cl)',category:'Drinks',price:350,available:true},
  {id:22,name:'Zobo (50cl)',category:'Drinks',price:400,available:true},
  {id:23,name:'Chapman (glass)',category:'Drinks',price:800,available:true},
  {id:24,name:'Table Water (75cl)',category:'Drinks',price:150,available:true},
  {id:25,name:'Lacasera',category:'Drinks',price:350,available:true},
  {id:26,name:'Energy Drink',category:'Drinks',price:700,available:true},
  {id:27,name:'Malt (33cl)',category:'Drinks',price:400,available:true},
  {id:28,name:'Hollandia Juice',category:'Drinks',price:600,available:true},
  {id:29,name:'Cold Milk',category:'Drinks',price:500,available:true},
  {id:30,name:'Smoothie (fresh)',category:'Drinks',price:900,available:true},
];
const INIT_INVENTORY = [
  {id:1,name:'Long Grain Rice',unit:'kg',stock:50,reorderLevel:10},
  {id:2,name:'Tomato Mix',unit:'kg',stock:20,reorderLevel:5},
  {id:3,name:'Vegetable Oil',unit:'L',stock:15,reorderLevel:3},
  {id:4,name:'Egusi (Ground)',unit:'kg',stock:10,reorderLevel:3},
  {id:5,name:'Beef (Cubed)',unit:'kg',stock:25,reorderLevel:5},
  {id:6,name:'Chicken',unit:'kg',stock:30,reorderLevel:8},
  {id:7,name:'Catfish',unit:'kg',stock:20,reorderLevel:5},
  {id:8,name:'Yam (Tubers)',unit:'kg',stock:40,reorderLevel:10},
  {id:9,name:'Beans (Brown)',unit:'kg',stock:15,reorderLevel:5},
  {id:10,name:'Palm Oil',unit:'L',stock:10,reorderLevel:2},
  {id:11,name:'Onions',unit:'kg',stock:8,reorderLevel:3},
  {id:12,name:'Plantain (fingers)',unit:'pcs',stock:60,reorderLevel:20},
  {id:13,name:'Garri (White)',unit:'kg',stock:20,reorderLevel:5},
  {id:14,name:'Indomie Noodles',unit:'pcs',stock:48,reorderLevel:12},
  {id:15,name:'Seasoning Cubes',unit:'pcs',stock:100,reorderLevel:20},
  {id:16,name:'Curry/Thyme Mix',unit:'g',stock:500,reorderLevel:100},
  {id:17,name:'Amala Flour',unit:'kg',stock:12,reorderLevel:4},
  {id:18,name:'Ewedu Leaves',unit:'kg',stock:5,reorderLevel:2},
  {id:19,name:'Ground Crayfish',unit:'kg',stock:3,reorderLevel:1},
  {id:20,name:'Salt',unit:'kg',stock:10,reorderLevel:2},
];
const INIT_RECIPES = [
  {id:1,menuItemId:1,ingredients:[{iid:1,qty:0.25},{iid:2,qty:0.15},{iid:3,qty:0.03},{iid:15,qty:1}]},
  {id:2,menuItemId:2,ingredients:[{iid:1,qty:0.25},{iid:3,qty:0.04},{iid:5,qty:0.1},{iid:15,qty:1}]},
  {id:3,menuItemId:3,ingredients:[{iid:4,qty:0.2},{iid:10,qty:0.05},{iid:5,qty:0.15},{iid:15,qty:1}]},
  {id:4,menuItemId:5,ingredients:[{iid:17,qty:0.15},{iid:18,qty:0.1},{iid:10,qty:0.03},{iid:15,qty:1}]},
  {id:5,menuItemId:13,ingredients:[{iid:6,qty:0.35},{iid:15,qty:2},{iid:11,qty:0.05}]},
  {id:6,menuItemId:14,ingredients:[{iid:7,qty:0.3},{iid:3,qty:0.05},{iid:15,qty:1}]},
  {id:7,menuItemId:9,ingredients:[{iid:12,qty:3},{iid:3,qty:0.04}]},
  {id:8,menuItemId:12,ingredients:[{iid:14,qty:2},{iid:5,qty:0.1},{iid:3,qty:0.02}]},
];
const INIT_SUPPLIERS = [
  {id:1,name:'PH Fresh Farm Supplies',contact:'08012345678',email:'pffs@mail.com',items:'Rice, Beans, Yam, Garri',address:'Mile 1 Market, PH',balance:0},
  {id:2,name:'Rumuola Meat & Fish Hub',contact:'08023456789',email:'rmf@mail.com',items:'Chicken, Beef, Catfish',address:'Rumuola Road, PH',balance:0},
  {id:3,name:'Trans-Amadi Beverages',contact:'08034567890',email:'tab@mail.com',items:'All Drinks & Water',address:'Trans-Amadi, PH',balance:0},
  {id:4,name:'Rumuigbo Spice Market',contact:'08045678901',email:'rsm@mail.com',items:'Spices, Palm Oil, Crayfish',address:'Rumuigbo, PH',balance:0},
];
const INIT_STAFF = [
  {id:1,name:'Chidi Okonkwo',role:'Cashier',pin:'1234',active:true,ordersHandled:0,revenueGenerated:0},
  {id:2,name:'Ngozi Eze',role:'Kitchen',pin:'2345',active:true,ordersHandled:0,revenueGenerated:0},
  {id:3,name:'Emeka Nwosu',role:'Manager',pin:'0000',active:true,ordersHandled:0,revenueGenerated:0},
  {id:4,name:'Amaka Dike',role:'Cashier',pin:'3456',active:true,ordersHandled:0,revenueGenerated:0},
  {id:5,name:'Bayo Adeyemi',role:'Waiter',pin:'4567',active:true,ordersHandled:0,revenueGenerated:0},
  {id:6,name:'Peace Nwabuisi',role:'Cashier',pin:'0001',active:true,ordersHandled:0,revenueGenerated:0},
];
const TABLES = ['Table 1','Table 2','Table 3','Table 4','Table 5','Table 6','Table 7','Table 8','VIP 1','VIP 2'];

const seedDemoOrders = () => {
  const types=['Eat-in','Takeaway','Delivery']; const names=['Tunde','Chioma','Bello','Adaeze','Emeka'];
  const statuses=['Paid','Paid','Paid','Delivered','Preparing']; const orders=[];
  const now=Date.now();
  for(let i=0;i<12;i++){
    const itemCount=Math.floor(Math.random()*3)+1; const items=[];
    for(let j=0;j<itemCount;j++){
      const m=INIT_MENU[Math.floor(Math.random()*INIT_MENU.length)];
      items.push({...m,qty:Math.floor(Math.random()*2)+1});
    }
    const subtotal=items.reduce((s,it)=>s+it.price*it.qty,0);
    const type=types[Math.floor(Math.random()*types.length)];
    const dlv=type==='Delivery'?500:0; const total=subtotal+dlv;
    const daysAgo=Math.floor(Math.random()*7);
    orders.push({id:i+1,orderId:`AGF-${String(i+1).padStart(4,'0')}`,
      datetime:new Date(now-daysAgo*86400000-Math.random()*43200000).toISOString(),
      type,table:type==='Eat-in'?TABLES[Math.floor(Math.random()*5)]:null,
      customer:{name:names[i%names.length],phone:'080'+String(Math.floor(Math.random()*90000000)+10000000),address:''},
      staffId:Math.floor(Math.random()*3)+1,
      staffName:INIT_STAFF[Math.floor(Math.random()*3)].name,
      items,subtotal,discount:0,deliveryFee:dlv,total,
      status:statuses[Math.floor(Math.random()*statuses.length)]});
  }
  return orders.sort((a,b)=>new Date(b.datetime)-new Date(a.datetime));
};

// ─── UTILITIES ────────────────────────────────────────────────────────────────
const ngn=(n)=>`₦${Number(n||0).toLocaleString('en-NG')}`;
const fmtD=(d)=>new Date(d).toLocaleDateString('en-NG',{day:'2-digit',month:'short',year:'numeric'});
const fmtT=(d)=>new Date(d).toLocaleTimeString('en-NG',{hour:'2-digit',minute:'2-digit'});
const fmtDT=(d)=>`${fmtD(d)} ${fmtT(d)}`;
const uid=()=>Date.now()+Math.floor(Math.random()*9999);

// ─── SYNC STATUS BADGE ────────────────────────────────────────────────────────
function SyncBadge({ state }) {
  const cfg = {
    synced:   { color:C.success, dot:'#2ECC71', label:'Synced to Sheets' },
    syncing:  { color:C.info,    dot:C.info,    label:'Syncing...' },
    offline:  { color:C.warning, dot:C.warning, label:'Offline (queued)' },
    local:    { color:C.textDim, dot:C.textDim, label:'Local only' },
    error:    { color:C.danger,  dot:C.danger,  label:'Sync error' },
  }[state] || { color:C.textDim, dot:C.textDim, label:'—' };

  return (
    <div style={{ display:'flex', alignItems:'center', gap:5, fontSize:11, color:cfg.color }}>
      <div style={{ width:7, height:7, borderRadius:'50%', background:cfg.dot,
        boxShadow: state==='syncing'?`0 0 6px ${cfg.dot}`:'none',
        animation: state==='syncing'?'pulse 1s infinite':'none' }}/>
      {cfg.label}
    </div>
  );
}

// ─── GOOGLE SETUP PANEL ───────────────────────────────────────────────────────
function GoogleSetupPanel({ scriptUrl, setScriptUrl, onConnect, syncState, onMigrate }) {
  const [url, setUrl] = useState(scriptUrl || '');
  const isConnected = GOOGLE_CONFIG.ENABLED;

  return (
    <div style={{ background:C.s1, border:`1px solid ${C.border}`, borderRadius:10,
      padding:20, maxWidth:640, margin:'0 auto' }}>
      <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:16 }}>
        <div style={{ width:36, height:36, borderRadius:8,
          background:'linear-gradient(135deg, #4285F4, #34A853)', display:'flex', alignItems:'center', justifyContent:'center' }}>
          <svg viewBox="0 0 24 24" width="20" height="20" fill="white">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
          </svg>
        </div>
        <div>
          <div style={{ fontFamily:FONT_DISPLAY, fontWeight:700, fontSize:15, color:C.text }}>Google Workspace Integration</div>
          <SyncBadge state={isConnected ? syncState : 'local'}/>
        </div>
        {isConnected && <div style={{ marginLeft:'auto', fontSize:11, color:C.success, fontWeight:600 }}>● Connected</div>}
      </div>

      {!isConnected ? (
        <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
          <div style={{ background:C.s2, borderRadius:8, padding:14, fontSize:12, color:C.textMid,
            borderLeft:`3px solid ${C.accent}` }}>
            <div style={{ fontWeight:700, color:C.text, marginBottom:6 }}>Connect to Google Sheets to unlock:</div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:4 }}>
              {['Live data sync across devices','Gmail order & stock alerts',
                'Daily/weekly email reports','Google Drive report archive',
                'Manager dashboard on any device','Offline queue with auto-sync'].map(f=>(
                <div key={f} style={{ display:'flex', gap:5 }}><span style={{ color:C.success }}>✓</span>{f}</div>
              ))}
            </div>
          </div>
          <div>
            <label style={{ fontSize:11, color:C.textMid, fontWeight:600, letterSpacing:'0.06em',
              textTransform:'uppercase', display:'block', marginBottom:6 }}>Apps Script Web App URL</label>
            <input value={url} onChange={e=>setUrl(e.target.value)}
              placeholder="https://script.google.com/macros/s/.../exec"
              style={{ width:'100%', background:C.s2, border:`1px solid ${C.border}`, borderRadius:6,
                padding:'9px 12px', color:C.text, fontSize:13, fontFamily:FONT_BODY }} />
          </div>
          <div style={{ display:'flex', gap:8 }}>
            <button onClick={()=>{ GOOGLE_CONFIG.SCRIPT_URL=url; GOOGLE_CONFIG.ENABLED=true; onConnect(url); }}
              disabled={!url.includes('script.google.com')}
              style={{ flex:2, padding:'10px', borderRadius:7,
                background:url.includes('script.google.com')?`linear-gradient(135deg, #4285F4, #34A853)`:'#333',
                color:'white', cursor:url.includes('script.google.com')?'pointer':'not-allowed',
                fontFamily:FONT_DISPLAY, fontWeight:700, fontSize:14, border:'none' }}>
              Connect to Google Workspace
            </button>
            <button onClick={()=>window.open('/AgameAppsScript.gs')}
              style={{ flex:1, padding:'10px', borderRadius:7, background:'transparent',
                border:`1px solid ${C.border}`, color:C.textMid, cursor:'pointer',
                fontFamily:FONT_BODY, fontWeight:600, fontSize:13 }}>
              View Setup Guide
            </button>
          </div>
          <div style={{ fontSize:11, color:C.textDim, textAlign:'center' }}>
            Running in local-only mode. All data is saved to this browser.
          </div>
        </div>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
            {[
              {label:'Data Storage', value:'Google Sheets', icon:'📊'},
              {label:'Notifications', value:'Gmail Active', icon:'✉️'},
              {label:'Reports',       value:'Daily 11pm',   icon:'📈'},
              {label:'Drive Archive', value:'Auto-saving',  icon:'💾'},
            ].map(s=>(
              <div key={s.label} style={{ background:C.s2, borderRadius:6, padding:'10px 12px' }}>
                <div style={{ fontSize:12, marginBottom:3 }}>{s.icon} {s.label}</div>
                <div style={{ fontSize:13, fontWeight:700, color:C.success }}>{s.value}</div>
              </div>
            ))}
          </div>
          <button onClick={onMigrate}
            style={{ padding:'9px', borderRadius:7, background:'rgba(52,152,219,0.15)',
              border:`1px solid rgba(52,152,219,0.3)`, color:C.info, cursor:'pointer',
              fontFamily:FONT_BODY, fontWeight:600, fontSize:13 }}>
            Push Local Data to Sheets (One-time Migration)
          </button>
        </div>
      )}
    </div>
  );
}

// ─── SHARED UI COMPONENTS ────────────────────────────────────────────────────
const STATUS_COLORS = {
  Pending:   {bg:'#1a1a0a',text:C.warning, border:'#3a3a10'},
  Preparing: {bg:'#0d1a2e',text:C.info,    border:'#0d2a50'},
  Ready:     {bg:'#0a2010',text:C.success, border:'#0d3018'},
  Paid:      {bg:'#0a1f0a',text:C.green,   border:'#0d3010'},
  Delivered: {bg:'#1a0a2e',text:C.purple,  border:'#2a0a50'},
  Cancelled: {bg:'#1f0a0a',text:C.danger,  border:'#3f0a0a'},
};
function StatusBadge({status}){
  const sc=STATUS_COLORS[status]||{bg:C.s3,text:C.textMid,border:C.border};
  return <span style={{background:sc.bg,color:sc.text,border:`1px solid ${sc.border}`,borderRadius:4,padding:'2px 8px',fontSize:11,fontWeight:600,fontFamily:FONT_MONO,letterSpacing:'0.05em',whiteSpace:'nowrap'}}>{status}</span>;
}
const Icon=({d,size=16,color='currentColor',style:s={}})=>(
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={s}><path d={d}/></svg>
);
const ICONS={
  pos:'M3 3h18v18H3V3zm0 9h18M9 3v18',orders:'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2',
  kitchen:'M17 8h1a4 4 0 010 8h-1M3 8h14v9a4 4 0 01-4 4H7a4 4 0 01-4-4V8zM6 1v3M10 1v3M14 1v3',
  menu:'M4 6h16M4 12h16M4 18h16',inventory:'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4',
  recipes:'M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z',
  suppliers:'M1 3h15v13H1zM16 8l4 2v5h-4M1 18h18M5 21v-3M11 21v-3',
  staff:'M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8zM23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75',
  analytics:'M18 20V10M12 20V4M6 20v-6',setup:'M12 1a11 11 0 100 22A11 11 0 0012 1zM4.22 4.22l15.56 15.56',
  plus:'M12 5v14M5 12h14',edit:'M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z',
  trash:'M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6',x:'M18 6L6 18M6 6l12 12',check:'M20 6L9 17l-5-5',
  cart:'M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4zM3 6h18M16 10a4 4 0 01-8 0',
  printer:'M6 9V2h12v7M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2M6 14h12v8H6v-8z',
  alert:'M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0zM12 9v4M12 17h.01',
  search:'M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0',refresh:'M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15',
  trending:'M23 6l-9.5 9.5-5-5L1 18',clock:'M12 22a10 10 0 100-20 10 10 0 000 20zM12 6v6l4 2',
};
function Btn({children,onClick,variant='primary',size='md',disabled=false,fullWidth=false,style:s={}}){
  const base={display:'inline-flex',alignItems:'center',justifyContent:'center',gap:6,fontFamily:FONT_BODY,fontWeight:600,borderRadius:6,cursor:disabled?'not-allowed':'pointer',transition:'all 0.15s',border:'none',opacity:disabled?0.5:1,width:fullWidth?'100%':undefined,lineHeight:1};
  const sizes={sm:{padding:'6px 12px',fontSize:12},md:{padding:'10px 18px',fontSize:14},lg:{padding:'14px 24px',fontSize:15}};
  const variants={primary:{background:C.accent,color:'white'},ghost:{background:'transparent',color:C.textMid,border:`1px solid ${C.border}`},success:{background:C.success,color:'white'},danger:{background:C.danger,color:'white'},dark:{background:C.s3,color:C.text,border:`1px solid ${C.border}`},gold:{background:C.gold,color:'#000'}};
  return <button disabled={disabled} onClick={onClick} style={{...base,...sizes[size],...variants[variant],...s}}>{children}</button>;
}
function Input({label,value,onChange,type='text',placeholder='',small=false,style:s={}}){
  return <div style={{display:'flex',flexDirection:'column',gap:4,...s}}>{label&&<label style={{fontSize:11,color:C.textMid,fontWeight:600,letterSpacing:'0.06em',textTransform:'uppercase'}}>{label}</label>}<input type={type} value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder} style={{background:C.s2,border:`1px solid ${C.border}`,borderRadius:6,padding:small?'6px 10px':'9px 12px',color:C.text,fontSize:small?12:14,fontFamily:FONT_BODY,width:'100%'}}/></div>;
}
function Select({label,value,onChange,options,style:s={}}){
  return <div style={{display:'flex',flexDirection:'column',gap:4,...s}}>{label&&<label style={{fontSize:11,color:C.textMid,fontWeight:600,letterSpacing:'0.06em',textTransform:'uppercase'}}>{label}</label>}<select value={value} onChange={e=>onChange(e.target.value)} style={{background:C.s2,border:`1px solid ${C.border}`,borderRadius:6,padding:'9px 12px',color:C.text,fontSize:14,fontFamily:FONT_BODY,width:'100%'}}>{options.map(o=>typeof o==='string'?<option key={o} value={o}>{o}</option>:<option key={o.value} value={o.value}>{o.label}</option>)}</select></div>;
}
function Card({children,style:s={},onClick}){return <div onClick={onClick} style={{background:C.s1,border:`1px solid ${C.border}`,borderRadius:10,...s}}>{children}</div>;}
function Modal({title,children,onClose,width=480}){
  return <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.75)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:1000,padding:16}} onClick={e=>{if(e.target===e.currentTarget)onClose();}}>
    <div style={{background:C.s1,border:`1px solid ${C.border}`,borderRadius:12,width:'100%',maxWidth:width,maxHeight:'90vh',overflowY:'auto'}}>
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'16px 20px',borderBottom:`1px solid ${C.border}`}}>
        <h3 style={{fontFamily:FONT_DISPLAY,fontSize:16,fontWeight:700,color:C.text}}>{title}</h3>
        <button onClick={onClose} style={{background:'none',border:'none',color:C.textMid,cursor:'pointer',padding:4}}><Icon d={ICONS.x} size={18}/></button>
      </div>
      <div style={{padding:20}}>{children}</div>
    </div>
  </div>;
}
function Notification({msg,type}){
  const bg=type==='error'?C.danger:type==='warning'?C.warning:C.success;
  return <div style={{position:'fixed',top:20,right:20,zIndex:9999,background:bg,color:type==='warning'?'#000':'white',padding:'12px 18px',borderRadius:8,fontWeight:600,fontSize:13,fontFamily:FONT_BODY,boxShadow:'0 8px 30px rgba(0,0,0,0.5)',display:'flex',alignItems:'center',gap:8,maxWidth:320}}>
    <Icon d={type==='error'?ICONS.x:ICONS.check} size={15}/>{msg}
  </div>;
}
function InfoRow({label,value}){return <div><div style={{fontSize:10,color:C.textDim,textTransform:'uppercase',letterSpacing:'0.08em',marginBottom:3,fontWeight:600}}>{label}</div><div style={{fontSize:13,color:C.text}}>{value}</div></div>;}

// ─── LOGIN SCREEN ─────────────────────────────────────────────────────────────
function LoginScreen({staff,onLogin,notify}){
  const [form,setForm]=useState({name:'',pin:''});
  const [error,setError]=useState('');
  const handleLogin=()=>{
    if(!form.name.trim()||!form.pin.trim()){setError('Enter your name and PIN');return;}
    const user=staff.find(s=>s.active&&s.name.toLowerCase()===form.name.toLowerCase()&&s.pin===form.pin);
    if(!user){setError('Invalid name or PIN');setForm({name:'',pin:''});return;}
    setError('');
    onLogin(user);
    notify(`Welcome, ${user.name}!`);
  };
  const handleKeyPress=(e)=>{if(e.key==='Enter')handleLogin();};
  return <div style={{background:C.bg,minHeight:'100vh',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',padding:20}}>
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600&family=DM+Mono:wght@400;500&display=swap');
      input,select,textarea{color-scheme:dark;}
    `}</style>
    <div style={{width:'100%',maxWidth:360}}>
      <div style={{background:C.s1,border:`1px solid ${C.border}`,borderRadius:12,padding:40}}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'center',marginBottom:24}}>
          <div style={{width:60,height:60,background:`linear-gradient(135deg, ${C.accent}, ${C.gold})`,borderRadius:12,display:'flex',alignItems:'center',justifyContent:'center',fontFamily:FONT_DISPLAY,fontWeight:800,fontSize:28,color:'white'}}>AG</div>
        </div>
        <h1 style={{fontFamily:FONT_DISPLAY,fontSize:26,fontWeight:800,color:C.text,textAlign:'center',marginBottom:8,letterSpacing:'-0.02em'}}>A-Game Foods</h1>
        <p style={{fontSize:13,color:C.textMid,textAlign:'center',marginBottom:28}}>Staff Login</p>
        <div style={{display:'flex',flexDirection:'column',gap:14}}>
          <div>
            <label style={{fontSize:12,color:C.textDim,fontWeight:600,display:'block',marginBottom:6,textTransform:'uppercase',letterSpacing:'0.06em'}}>Staff Name *</label>
            <input value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} onKeyPress={handleKeyPress} placeholder="Enter your full name" style={{width:'100%',background:C.s2,border:`1px solid ${C.border}`,borderRadius:8,padding:'11px 14px',color:C.text,fontSize:13,fontFamily:FONT_BODY}}/>
          </div>
          <div>
            <label style={{fontSize:12,color:C.textDim,fontWeight:600,display:'block',marginBottom:6,textTransform:'uppercase',letterSpacing:'0.06em'}}>PIN *</label>
            <input value={form.pin} onChange={e=>setForm(f=>({...f,pin:e.target.value}))} onKeyPress={handleKeyPress} type="password" placeholder="Enter your 4-digit PIN" style={{width:'100%',background:C.s2,border:`1px solid ${C.border}`,borderRadius:8,padding:'11px 14px',color:C.text,fontSize:13,fontFamily:FONT_BODY}}/>
          </div>
          {error&&<div style={{padding:10,background:'rgba(231,76,60,0.15)',border:`1px solid rgba(231,76,60,0.3)`,borderRadius:6,fontSize:12,color:C.danger}}>{error}</div>}
          <button onClick={handleLogin} style={{width:'100%',padding:12,background:`linear-gradient(135deg, ${C.accent}, ${C.accentD})`,border:'none',borderRadius:8,color:'white',fontFamily:FONT_DISPLAY,fontWeight:700,fontSize:14,cursor:'pointer',marginTop:8}}>Login</button>
        </div>
        <div style={{marginTop:24,padding:14,background:C.s2,borderRadius:8,border:`1px solid ${C.border}`}}>
          <p style={{fontSize:11,color:C.textDim,marginBottom:8,fontWeight:600}}>📋 Demo Credentials:</p>
          <div style={{fontSize:11,color:C.textMid,lineHeight:'1.6',fontFamily:FONT_MONO}}>
            <div>Emeka Nwosu / 0000</div>
            <div>Peace Nwabuisi / 0001</div>
            <div>Chidi Okonkwo / 1234</div>
            <div>Ngozi Eze / 2345</div>
          </div>
        </div>
      </div>
    </div>
  </div>;
}

// ─── TOP BAR ────────────────────────────────────────────────────────────────
function TopBar({currentStaff,staff,setCurrentStaff,lowStockCount,preparingCount,syncState,onSyncNow,onLogout}){
  const [showStaffMenu,setShowStaffMenu]=useState(false);
  const now=new Date();
  return <div style={{background:C.s1,borderBottom:`1px solid ${C.border}`,padding:'0 20px',display:'flex',alignItems:'center',justifyContent:'space-between',height:54,flexShrink:0,gap:12}}>
    <div style={{display:'flex',alignItems:'center',gap:10,flexShrink:0}}>
      <div style={{width:32,height:32,background:`linear-gradient(135deg, ${C.accent}, ${C.gold})`,borderRadius:8,display:'flex',alignItems:'center',justifyContent:'center',fontFamily:FONT_DISPLAY,fontWeight:800,fontSize:14,color:'white'}}>AG</div>
      <div><div style={{fontFamily:FONT_DISPLAY,fontWeight:800,fontSize:15,color:C.text,letterSpacing:'-0.02em'}}>A-Game Foods</div><div style={{fontSize:9,color:C.textDim,letterSpacing:'0.1em',textTransform:'uppercase'}}>Port Harcourt</div></div>
    </div>
    <div style={{display:'flex',alignItems:'center',gap:14,flex:1,justifyContent:'center'}}>
      <span style={{fontSize:11,color:C.textMid,fontFamily:FONT_MONO}}>{now.toLocaleDateString('en-NG',{weekday:'short',day:'2-digit',month:'short'})}</span>
      <span style={{fontSize:12,color:C.accent,fontFamily:FONT_MONO,fontWeight:700}}>{fmtT(now)}</span>
      <SyncBadge state={syncState}/>
      {GOOGLE_CONFIG.ENABLED && <button onClick={onSyncNow} style={{background:'none',border:'none',color:C.textDim,cursor:'pointer',padding:2}}><Icon d={ICONS.refresh} size={13} color={C.textDim}/></button>}
    </div>
    <div style={{display:'flex',alignItems:'center',gap:10,flexShrink:0}}>
      {lowStockCount>0&&<div style={{background:'rgba(239,68,68,0.15)',border:'1px solid rgba(239,68,68,0.3)',borderRadius:6,padding:'4px 10px',display:'flex',alignItems:'center',gap:5}}><Icon d={ICONS.alert} size={13} color={C.danger}/><span style={{fontSize:11,color:C.danger,fontWeight:600}}>{lowStockCount} low</span></div>}
      {preparingCount>0&&<div style={{background:'rgba(52,152,219,0.15)',border:'1px solid rgba(52,152,219,0.3)',borderRadius:6,padding:'4px 10px',display:'flex',alignItems:'center',gap:5}}><Icon d={ICONS.kitchen} size={13} color={C.info}/><span style={{fontSize:11,color:C.info,fontWeight:600}}>{preparingCount} cooking</span></div>}
      <div style={{position:'relative'}}>
        <button onClick={()=>setShowStaffMenu(v=>!v)} style={{background:C.s3,border:`1px solid ${C.border}`,borderRadius:8,padding:'5px 12px',color:C.text,cursor:'pointer',display:'flex',alignItems:'center',gap:7,fontSize:12,fontFamily:FONT_BODY}}>
          <div style={{width:22,height:22,borderRadius:'50%',background:C.accent,display:'flex',alignItems:'center',justifyContent:'center',fontSize:10,fontWeight:700,color:'white'}}>{currentStaff.name[0]}</div>
          <span style={{fontWeight:600}}>{currentStaff.name.split(' ')[0]}</span>
          <span style={{fontSize:10,color:C.textMid,background:C.s4,borderRadius:4,padding:'1px 5px'}}>{currentStaff.role}</span>
        </button>
        {showStaffMenu&&<div style={{position:'absolute',right:0,top:'calc(100% + 6px)',background:C.s2,border:`1px solid ${C.border}`,borderRadius:8,minWidth:200,zIndex:100,overflow:'hidden'}}>
          {staff.filter(s=>s.active).map(s=><button key={s.id} onClick={()=>{setCurrentStaff(s);setShowStaffMenu(false);}} style={{width:'100%',padding:'10px 14px',background:s.id===currentStaff.id?C.s3:'transparent',border:'none',color:s.id===currentStaff.id?C.accent:C.text,cursor:'pointer',display:'flex',alignItems:'center',gap:8,fontSize:13,fontFamily:FONT_BODY,textAlign:'left'}}>
            <div style={{width:20,height:20,borderRadius:'50%',background:C.accent,display:'flex',alignItems:'center',justifyContent:'center',fontSize:9,fontWeight:700,color:'white',flexShrink:0}}>{s.name[0]}</div>
            <div><div style={{fontWeight:600}}>{s.name}</div><div style={{fontSize:10,color:C.textMid}}>{s.role}</div></div>
          </button>)}
          <div style={{borderTop:`1px solid ${C.border}`,padding:'8px 10px'}}>
            <button onClick={onLogout} style={{width:'100%',padding:'8px 10px',borderRadius:6,background:'rgba(231,76,60,0.15)',border:`1px solid rgba(231,76,60,0.3)`,color:C.danger,cursor:'pointer',fontFamily:FONT_BODY,fontWeight:600,fontSize:12}}>🚪 Logout</button>
          </div>
        </div>}
      </div>
    </div>
  </div>;
}

// ─── NAV BAR ─────────────────────────────────────────────────────────────────
const NAV_ITEMS=[
  {id:'pos',label:'POS',icon:ICONS.pos},{id:'orders',label:'Orders',icon:ICONS.orders},
  {id:'kitchen',label:'Kitchen',icon:ICONS.kitchen},{id:'menu',label:'Menu',icon:ICONS.menu},
  {id:'inventory',label:'Inventory',icon:ICONS.inventory},{id:'recipes',label:'Recipes',icon:ICONS.recipes},
  {id:'suppliers',label:'Suppliers',icon:ICONS.suppliers},{id:'staff',label:'Staff',icon:ICONS.staff},
  {id:'analytics',label:'Analytics',icon:ICONS.analytics},{id:'setup',label:'Google Setup',icon:ICONS.setup},
];
function NavBar({active,setActive,lowStockCount}){
  return <nav style={{background:C.s1,borderBottom:`1px solid ${C.border}`,display:'flex',overflowX:'auto',flexShrink:0,scrollbarWidth:'none'}}>
    {NAV_ITEMS.map(item=>{
      const isActive=active===item.id;
      return <button key={item.id} onClick={()=>setActive(item.id)} style={{position:'relative',padding:'0 16px',height:46,display:'flex',alignItems:'center',gap:7,border:'none',background:'transparent',cursor:'pointer',whiteSpace:'nowrap',color:isActive?C.accent:C.textMid,fontFamily:FONT_BODY,fontWeight:isActive?600:400,fontSize:13,borderBottom:isActive?`2px solid ${C.accent}`:'2px solid transparent',transition:'all 0.15s',flexShrink:0}}>
        <Icon d={item.icon} size={15} color={isActive?C.accent:C.textMid}/>{item.label}
        {item.id==='inventory'&&lowStockCount>0&&<span style={{position:'absolute',top:8,right:6,background:C.danger,color:'white',borderRadius:'50%',width:14,height:14,display:'flex',alignItems:'center',justifyContent:'center',fontSize:9,fontWeight:700}}>{lowStockCount}</span>}
        {item.id==='setup'&&GOOGLE_CONFIG.ENABLED&&<span style={{position:'absolute',top:8,right:6,width:7,height:7,background:C.success,borderRadius:'50%'}}/>}
      </button>;
    })}
  </nav>;
}

// ─── POS MODULE ───────────────────────────────────────────────────────────────
function POSModule({menu,cart,orderType,setOrderType,selectedTable,setSelectedTable,customerName,setCustomerName,customerPhone,setCustomerPhone,deliveryAddress,setDeliveryAddress,discount,setDiscount,addToCart,removeFromCart,updateCartQty,cartSubtotal,deliveryFee,discountAmount,cartTotal,completeOrder,clearCart}){
  const [catFilter,setCatFilter]=useState('All');
  const [search,setSearch]=useState('');
  const filtered=menu.filter(m=>m.available&&(catFilter==='All'||m.category===catFilter)&&m.name.toLowerCase().includes(search.toLowerCase()));
  const ORDER_TYPES=['Eat-in','Takeaway','Delivery','Online'];
  return <div style={{display:'flex',height:'calc(100vh - 100px)',overflow:'hidden'}}>
    <div style={{flex:1,display:'flex',flexDirection:'column',borderRight:`1px solid ${C.border}`,overflow:'hidden'}}>
      <div style={{padding:'12px 16px',borderBottom:`1px solid ${C.border}`,background:C.s1,display:'flex',gap:10,alignItems:'center',flexWrap:'wrap'}}>
        <div style={{flex:1,position:'relative',minWidth:160}}>
          <Icon d={ICONS.search} size={14} color={C.textDim} style={{position:'absolute',left:10,top:'50%',transform:'translateY(-50%)'}}/>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search menu..." style={{width:'100%',background:C.s2,border:`1px solid ${C.border}`,borderRadius:6,padding:'7px 10px 7px 32px',color:C.text,fontSize:13,fontFamily:FONT_BODY}}/>
        </div>
        {['All','Food','Drinks'].map(cat=><button key={cat} onClick={()=>setCatFilter(cat)} style={{padding:'7px 14px',borderRadius:6,fontSize:13,fontWeight:600,fontFamily:FONT_BODY,border:`1px solid ${catFilter===cat?C.accent:C.border}`,background:catFilter===cat?`rgba(255,107,43,0.15)`:'transparent',color:catFilter===cat?C.accent:C.textMid,cursor:'pointer'}}>{cat}</button>)}
      </div>
      <div style={{flex:1,overflowY:'auto',padding:16,display:'grid',gridTemplateColumns:'repeat(auto-fill, minmax(148px, 1fr))',gap:10,alignContent:'start'}}>
        {filtered.map(item=>{
          const inCart=cart.find(c=>c.id===item.id);
          return <button key={item.id} onClick={()=>addToCart(item)} style={{background:inCart?`rgba(255,107,43,0.12)`:C.s2,border:`1px solid ${inCart?C.accent:C.border}`,borderRadius:10,padding:'14px 12px',cursor:'pointer',textAlign:'left',transition:'all 0.15s',display:'flex',flexDirection:'column',gap:6}}>
            <div style={{fontSize:10,color:item.category==='Drinks'?C.info:C.gold,fontWeight:600,letterSpacing:'0.06em',textTransform:'uppercase',fontFamily:FONT_MONO}}>{item.category}</div>
            <div style={{fontSize:13,fontWeight:600,color:C.text,lineHeight:1.3}}>{item.name}</div>
            <div style={{fontSize:15,fontWeight:700,color:inCart?C.accent:C.accentL,fontFamily:FONT_MONO}}>{ngn(item.price)}</div>
            {inCart&&<div style={{fontSize:11,color:C.accent,fontWeight:600}}>✓ ×{inCart.qty}</div>}
          </button>;
        })}
      </div>
    </div>
    <div style={{width:350,display:'flex',flexDirection:'column',background:C.s1,overflow:'hidden',flexShrink:0}}>
      <div style={{padding:'12px 14px',borderBottom:`1px solid ${C.border}`}}>
        <div style={{fontSize:11,color:C.textMid,marginBottom:8,fontWeight:600,letterSpacing:'0.06em',textTransform:'uppercase'}}>Order Type</div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:6}}>
          {ORDER_TYPES.map(t=><button key={t} onClick={()=>setOrderType(t)} style={{padding:'7px 6px',borderRadius:6,fontSize:12,fontWeight:600,fontFamily:FONT_BODY,border:`1px solid ${orderType===t?C.accent:C.border}`,background:orderType===t?`rgba(255,107,43,0.15)`:'transparent',color:orderType===t?C.accent:C.textMid,cursor:'pointer'}}>{t}</button>)}
        </div>
        {orderType==='Eat-in'&&<div style={{marginTop:8}}><Select value={selectedTable} onChange={setSelectedTable} options={TABLES}/></div>}
        {(orderType==='Delivery'||orderType==='Online')&&<div style={{marginTop:8,display:'flex',flexDirection:'column',gap:6}}>
          <Input value={customerName} onChange={setCustomerName} placeholder="Customer name" small/>
          <Input value={customerPhone} onChange={setCustomerPhone} placeholder="Phone number" small/>
          <Input value={deliveryAddress} onChange={setDeliveryAddress} placeholder="Delivery address" small/>
        </div>}
        {orderType==='Takeaway'&&<div style={{marginTop:8,display:'flex',flexDirection:'column',gap:6}}>
          <Input value={customerName} onChange={setCustomerName} placeholder="Customer name (optional)" small/>
        </div>}
      </div>
      <div style={{flex:1,overflowY:'auto',padding:'8px 14px'}}>
        {cart.length===0?<div style={{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',height:140,gap:8,color:C.textDim}}><Icon d={ICONS.cart} size={30} color={C.textDim}/><span style={{fontSize:13}}>Cart is empty</span></div>:
        cart.map(item=><div key={item.id} style={{display:'flex',alignItems:'center',gap:8,padding:'8px 0',borderBottom:`1px solid ${C.border}`}}>
          <div style={{flex:1}}><div style={{fontSize:13,fontWeight:600,color:C.text}}>{item.name}</div><div style={{fontSize:11,color:C.textMid,fontFamily:FONT_MONO}}>{ngn(item.price)}</div></div>
          <div style={{display:'flex',alignItems:'center',gap:4}}>
            <button onClick={()=>updateCartQty(item.id,-1)} style={{width:22,height:22,borderRadius:4,background:C.s3,border:`1px solid ${C.border}`,color:C.text,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',fontSize:14}}>−</button>
            <span style={{width:20,textAlign:'center',fontSize:14,fontWeight:700,color:C.text,fontFamily:FONT_MONO}}>{item.qty}</span>
            <button onClick={()=>updateCartQty(item.id,1)} style={{width:22,height:22,borderRadius:4,background:C.s3,border:`1px solid ${C.border}`,color:C.accent,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',fontSize:14}}>+</button>
          </div>
          <div style={{minWidth:60,textAlign:'right',fontSize:13,fontWeight:700,color:C.text,fontFamily:FONT_MONO}}>{ngn(item.price*item.qty)}</div>
          <button onClick={()=>removeFromCart(item.id)} style={{background:'none',border:'none',color:C.textDim,cursor:'pointer',padding:2}}><Icon d={ICONS.x} size={13}/></button>
        </div>)}
      </div>
      <div style={{padding:'12px 14px',borderTop:`1px solid ${C.border}`,background:C.s2}}>
        <div style={{display:'flex',flexDirection:'column',gap:5,marginBottom:10}}>
          <div style={{display:'flex',justifyContent:'space-between',fontSize:13,color:C.textMid}}><span>Subtotal</span><span style={{fontFamily:FONT_MONO}}>{ngn(cartSubtotal)}</span></div>
          <div style={{display:'flex',alignItems:'center',gap:8}}>
            <span style={{fontSize:13,color:C.textMid,flex:1}}>Discount</span>
            <input type="number" value={discount} onChange={e=>setDiscount(Math.min(100,Math.max(0,Number(e.target.value))))} style={{width:40,background:C.s3,border:`1px solid ${C.border}`,borderRadius:4,padding:'3px 5px',color:C.text,fontSize:12,fontFamily:FONT_MONO,textAlign:'center'}} min={0} max={100}/>
            <span style={{fontSize:11,color:C.textMid}}>%</span>
            {discountAmount>0&&<span style={{fontSize:12,color:C.success,fontFamily:FONT_MONO}}>-{ngn(discountAmount)}</span>}
          </div>
          {deliveryFee>0&&<div style={{display:'flex',justifyContent:'space-between',fontSize:13,color:C.warning}}><span>Delivery</span><span style={{fontFamily:FONT_MONO}}>+{ngn(deliveryFee)}</span></div>}
          <div style={{display:'flex',justifyContent:'space-between',fontSize:17,fontWeight:800,color:C.text,paddingTop:6,borderTop:`1px solid ${C.border}`,fontFamily:FONT_DISPLAY}}><span>TOTAL</span><span style={{color:C.accent}}>{ngn(cartTotal)}</span></div>
        </div>
        <div style={{display:'flex',gap:8}}>
          <button onClick={clearCart} style={{flex:1,padding:'10px',borderRadius:7,background:'transparent',border:`1px solid ${C.border}`,color:C.textMid,cursor:'pointer',fontFamily:FONT_BODY,fontWeight:600,fontSize:12}}>Clear</button>
          <button onClick={completeOrder} disabled={cart.length===0} style={{flex:3,padding:'10px',borderRadius:7,background:cart.length>0?`linear-gradient(135deg, ${C.accent}, ${C.accentD})`:'#333',color:'white',cursor:cart.length>0?'pointer':'not-allowed',fontFamily:FONT_DISPLAY,fontWeight:700,fontSize:13,border:'none'}}>
            {cart.length>0?`Place Order • ${ngn(cartTotal)}`:'Place Order'}
          </button>
        </div>
      </div>
    </div>
  </div>;
}

// ─── ORDERS MODULE ────────────────────────────────────────────────────────────
function OrdersModule({orders,updateOrderStatus,setReceiptOrder,setShowReceipt,deleteOrder,bulkDeleteOrders}){
  const [filter,setFilter]=useState('All');
  const [search,setSearch]=useState('');
  const [selectedOrder,setSelectedOrder]=useState(null);
  const STATUSES=['All','Pending','Preparing','Ready','Paid','Delivered','Cancelled'];
  const filtered=orders.filter(o=>(filter==='All'||o.status===filter)&&(o.orderId?.toLowerCase().includes(search.toLowerCase())||o.customer?.name?.toLowerCase().includes(search.toLowerCase())||o.staffName?.toLowerCase().includes(search.toLowerCase())));
  const nextStatus={Pending:'Preparing',Preparing:'Ready',Ready:'Paid',Paid:'Delivered'};
  return <div style={{padding:20,maxWidth:1200,margin:'0 auto'}}>
    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20}}>
      <h2 style={{fontFamily:FONT_DISPLAY,fontSize:22,fontWeight:800,color:C.text}}>Order Management</h2>
      <div style={{fontSize:13,color:C.textMid}}>{orders.length} total orders</div>
    </div>
    <div style={{display:'flex',gap:10,marginBottom:16,flexWrap:'wrap'}}>
      <div style={{flex:1,position:'relative',minWidth:200}}>
        <Icon d={ICONS.search} size={14} color={C.textDim} style={{position:'absolute',left:10,top:'50%',transform:'translateY(-50%)'}}/>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search by order ID, customer..." style={{width:'100%',background:C.s2,border:`1px solid ${C.border}`,borderRadius:6,padding:'8px 10px 8px 32px',color:C.text,fontSize:13,fontFamily:FONT_BODY}}/>
      </div>
      <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
        {STATUSES.map(s=><button key={s} onClick={()=>setFilter(s)} style={{padding:'7px 12px',borderRadius:6,fontSize:12,fontWeight:600,fontFamily:FONT_BODY,border:`1px solid ${filter===s?C.accent:C.border}`,background:filter===s?`rgba(255,107,43,0.15)`:'transparent',color:filter===s?C.accent:C.textMid,cursor:'pointer'}}>{s}</button>)}
      </div>
      <Btn variant="danger" onClick={()=>bulkDeleteOrders(filter==='All'?null:filter)} size="sm"><Icon d={ICONS.trash} size={13}/> Delete {filter==='All'?'All':filter}</Btn>
    </div>
    <Card>
      <div style={{overflowX:'auto'}}>
        <table style={{width:'100%',borderCollapse:'collapse'}}>
          <thead><tr style={{borderBottom:`1px solid ${C.border}`}}>
            {['Order ID','Date/Time','Type','Customer/Table','Staff','Items','Total','Status','Actions'].map(h=><th key={h} style={{padding:'10px 14px',fontSize:11,color:C.textDim,fontWeight:600,textAlign:'left',letterSpacing:'0.06em',textTransform:'uppercase',whiteSpace:'nowrap'}}>{h}</th>)}
          </tr></thead>
          <tbody>
            {filtered.map((o,i)=><tr key={o.id} style={{borderBottom:`1px solid ${C.border}`,background:i%2===0?'transparent':C.s1}}>
              <td style={{padding:'10px 14px',fontFamily:FONT_MONO,fontSize:12,color:C.accent,fontWeight:600}}>{o.orderId}</td>
              <td style={{padding:'10px 14px',fontSize:12,color:C.textMid,whiteSpace:'nowrap'}}>{fmtDT(o.datetime)}</td>
              <td style={{padding:'10px 14px'}}><span style={{fontSize:11,fontWeight:600,color:o.type==='Delivery'?C.warning:o.type==='Eat-in'?C.success:C.info}}>{o.type}</span></td>
              <td style={{padding:'10px 14px',fontSize:12,color:C.textMid}}>{o.table||o.customer?.name||'—'}</td>
              <td style={{padding:'10px 14px',fontSize:12,color:C.text}}>{o.staffName}</td>
              <td style={{padding:'10px 14px',fontSize:12,color:C.textMid}}>{(o.items||[]).reduce((s,i)=>s+i.qty,0)} items</td>
              <td style={{padding:'10px 14px',fontFamily:FONT_MONO,fontSize:13,fontWeight:700,color:C.text,whiteSpace:'nowrap'}}>{ngn(o.total)}</td>
              <td style={{padding:'10px 14px'}}><StatusBadge status={o.status}/></td>
              <td style={{padding:'10px 14px'}}>
                <div style={{display:'flex',gap:5}}>
                  <button onClick={()=>setSelectedOrder(o)} style={{padding:'4px 8px',borderRadius:4,background:C.s3,border:`1px solid ${C.border}`,color:C.textMid,cursor:'pointer',fontSize:11,fontFamily:FONT_BODY}}>View</button>
                  {nextStatus[o.status]&&<button onClick={()=>updateOrderStatus(o.id,nextStatus[o.status])} style={{padding:'4px 8px',borderRadius:4,background:`rgba(255,107,43,0.15)`,border:`1px solid rgba(255,107,43,0.3)`,color:C.accent,cursor:'pointer',fontSize:11,fontFamily:FONT_BODY,fontWeight:600}}>→ {nextStatus[o.status]}</button>}
                  <button onClick={()=>deleteOrder(o.id)} style={{padding:'4px 8px',borderRadius:4,background:'rgba(231,76,60,0.15)',border:`1px solid rgba(231,76,60,0.3)`,color:C.danger,cursor:'pointer',fontSize:11,fontFamily:FONT_BODY}}><Icon d={ICONS.trash} size={10}/></button>
                </div>
              </td>
            </tr>)}
          </tbody>
        </table>
        {filtered.length===0&&<div style={{padding:40,textAlign:'center',color:C.textDim,fontSize:14}}>No orders found</div>}
      </div>
    </Card>
    {selectedOrder&&<Modal title={`Order ${selectedOrder.orderId}`} onClose={()=>setSelectedOrder(null)} width={520}>
      <div style={{display:'flex',flexDirection:'column',gap:14}}>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
          <InfoRow label="Date/Time" value={fmtDT(selectedOrder.datetime)}/>
          <InfoRow label="Type" value={selectedOrder.type}/>
          <InfoRow label="Staff" value={selectedOrder.staffName}/>
          <InfoRow label="Status" value={<StatusBadge status={selectedOrder.status}/>}/>
          {selectedOrder.table&&<InfoRow label="Table" value={selectedOrder.table}/>}
          {selectedOrder.customer?.name&&<InfoRow label="Customer" value={selectedOrder.customer.name}/>}
        </div>
        <div style={{background:C.s2,borderRadius:8,overflow:'hidden'}}>
          {(selectedOrder.items||[]).map((it,i)=><div key={i} style={{display:'flex',justifyContent:'space-between',padding:'8px 12px',borderBottom:i<selectedOrder.items.length-1?`1px solid ${C.border}`:'none'}}>
            <span style={{fontSize:13,color:C.text}}>{it.name} × {it.qty}</span>
            <span style={{fontFamily:FONT_MONO,fontSize:13,color:C.textMid}}>{ngn(it.price*it.qty)}</span>
          </div>)}
        </div>
        <div style={{display:'flex',flexDirection:'column',gap:4}}>
          <div style={{display:'flex',justifyContent:'space-between',fontSize:13,color:C.textMid}}><span>Subtotal</span><span style={{fontFamily:FONT_MONO}}>{ngn(selectedOrder.subtotal)}</span></div>
          {selectedOrder.discount>0&&<div style={{display:'flex',justifyContent:'space-between',fontSize:13,color:C.success}}><span>Discount</span><span style={{fontFamily:FONT_MONO}}>-{ngn(selectedOrder.discount)}</span></div>}
          {selectedOrder.deliveryFee>0&&<div style={{display:'flex',justifyContent:'space-between',fontSize:13,color:C.warning}}><span>Delivery</span><span style={{fontFamily:FONT_MONO}}>+{ngn(selectedOrder.deliveryFee)}</span></div>}
          <div style={{display:'flex',justifyContent:'space-between',fontSize:16,fontWeight:800,color:C.text,paddingTop:6,borderTop:`1px solid ${C.border}`}}><span>Total</span><span style={{color:C.accent,fontFamily:FONT_MONO}}>{ngn(selectedOrder.total)}</span></div>
        </div>
        <div style={{display:'flex',gap:8}}>
          <Btn variant="dark" onClick={()=>{setReceiptOrder(selectedOrder);setShowReceipt(true);setSelectedOrder(null);}} style={{flex:1}}><Icon d={ICONS.printer} size={14}/> Receipt</Btn>
          {nextStatus[selectedOrder.status]&&<Btn variant="primary" onClick={()=>{updateOrderStatus(selectedOrder.id,nextStatus[selectedOrder.status]);setSelectedOrder(null);}} style={{flex:1}}><Icon d={ICONS.check} size={14}/> → {nextStatus[selectedOrder.status]}</Btn>}
        </div>
      </div>
    </Modal>}
  </div>;
}

// ─── KITCHEN MODULE ───────────────────────────────────────────────────────────
function KitchenModule({orders,updateOrderStatus}){
  const preparing=orders.filter(o=>o.status==='Preparing');
  const ready=orders.filter(o=>o.status==='Ready');
  const now=Date.now();
  const elapsed=(dt)=>{const m=Math.floor((now-new Date(dt).getTime())/60000);return m<60?`${m}m`:`${Math.floor(m/60)}h ${m%60}m`;};
  return <div style={{padding:20,background:C.bg,minHeight:'calc(100vh - 100px)'}}>
    <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:20}}>
      <div style={{width:10,height:10,borderRadius:'50%',background:C.success,boxShadow:`0 0 8px ${C.success}`,animation:'pulse 2s infinite'}}/>
      <h2 style={{fontFamily:FONT_DISPLAY,fontSize:22,fontWeight:800,color:C.text}}>Kitchen Display System</h2>
      <div style={{marginLeft:'auto',display:'flex',gap:10}}>
        <div style={{background:'rgba(52,152,219,0.1)',border:`1px solid rgba(52,152,219,0.3)`,borderRadius:6,padding:'4px 12px',fontSize:13,color:C.info,fontWeight:600}}>{preparing.length} Preparing</div>
        <div style={{background:'rgba(39,174,96,0.1)',border:`1px solid rgba(39,174,96,0.3)`,borderRadius:6,padding:'4px 12px',fontSize:13,color:C.success,fontWeight:600}}>{ready.length} Ready</div>
      </div>
    </div>
    {preparing.length===0&&ready.length===0?<div style={{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',height:280,gap:10,color:C.textDim}}><Icon d={ICONS.kitchen} size={44} color={C.textDim}/><span style={{fontSize:16,fontFamily:FONT_DISPLAY}}>No active kitchen orders</span></div>:
    <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill, minmax(290px, 1fr))',gap:14}}>
      {[...preparing,...ready].sort((a,b)=>new Date(a.datetime)-new Date(b.datetime)).map(order=>{
        const mins=Math.floor((now-new Date(order.datetime).getTime())/60000);
        const isUrgent=mins>20; const isDone=order.status==='Ready';
        return <div key={order.id} style={{background:isDone?'rgba(39,174,96,0.05)':isUrgent?'rgba(231,76,60,0.08)':C.s1,border:`2px solid ${isDone?C.success:isUrgent?C.danger:C.info}`,borderRadius:12,overflow:'hidden'}}>
          <div style={{background:isDone?C.success:isUrgent?C.danger:C.info,padding:'10px 14px',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
            <div style={{fontFamily:FONT_DISPLAY,fontSize:15,fontWeight:800,color:'white'}}>{order.orderId}</div>
            <div style={{display:'flex',gap:6,alignItems:'center'}}>
              <div style={{background:'rgba(255,255,255,0.2)',borderRadius:4,padding:'2px 7px',fontSize:11,color:'white',fontWeight:600}}>{order.type}{order.table?` · ${order.table}`:''}</div>
              <div style={{background:'rgba(255,255,255,0.2)',borderRadius:4,padding:'2px 7px',fontSize:11,color:'white'}}>⏱ {elapsed(order.datetime)}</div>
            </div>
          </div>
          <div style={{padding:14}}>
            {(order.items||[]).map((it,i)=><div key={i} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'7px 0',borderBottom:i<order.items.length-1?`1px solid ${C.border}`:'none'}}>
              <span style={{fontSize:14,fontWeight:600,color:C.text}}>{it.name}</span>
              <span style={{fontFamily:FONT_MONO,fontSize:18,fontWeight:800,color:isDone?C.success:isUrgent?C.danger:C.info}}>×{it.qty}</span>
            </div>)}
          </div>
          <div style={{padding:'10px 14px',borderTop:`1px solid ${C.border}`,display:'flex',justifyContent:'space-between',alignItems:'center'}}>
            <span style={{fontSize:11,color:C.textMid}}>{fmtT(order.datetime)}</span>
            {!isDone?<button onClick={()=>updateOrderStatus(order.id,'Ready')} style={{padding:'7px 14px',borderRadius:6,background:C.success,border:'none',color:'white',cursor:'pointer',fontWeight:700,fontSize:13,fontFamily:FONT_BODY}}>✓ Mark Ready</button>:
            <button onClick={()=>updateOrderStatus(order.id,'Paid')} style={{padding:'7px 14px',borderRadius:6,background:C.purple,border:'none',color:'white',cursor:'pointer',fontWeight:700,fontSize:13,fontFamily:FONT_BODY}}>Picked Up</button>}
          </div>
        </div>;
      })}
    </div>}
  </div>;
}

// ─── MENU MODULE ──────────────────────────────────────────────────────────────
function MenuModule({menu,addMenuItem,updateMenuItem,deleteMenuItem}){
  const [showAdd,setShowAdd]=useState(false);
  const [editItem,setEditItem]=useState(null);
  const [form,setForm]=useState({name:'',category:'Food',price:''});
  const [filter,setFilter]=useState('All');
  const handleSubmit=()=>{
    if(!form.name.trim()||!form.price)return;
    if(editItem)updateMenuItem(editItem.id,{name:form.name,category:form.category,price:Number(form.price)});
    else addMenuItem({name:form.name,category:form.category,price:Number(form.price)});
    setForm({name:'',category:'Food',price:''});setShowAdd(false);setEditItem(null);
  };
  const filtered=menu.filter(m=>filter==='All'||m.category===filter);
  return <div style={{padding:20,maxWidth:1100,margin:'0 auto'}}>
    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20}}>
      <h2 style={{fontFamily:FONT_DISPLAY,fontSize:22,fontWeight:800,color:C.text}}>Menu Management</h2>
      <div style={{display:'flex',gap:8}}>
        {['All','Food','Drinks'].map(f=><button key={f} onClick={()=>setFilter(f)} style={{padding:'7px 14px',borderRadius:6,fontSize:13,fontWeight:600,fontFamily:FONT_BODY,border:`1px solid ${filter===f?C.accent:C.border}`,background:filter===f?`rgba(255,107,43,0.15)`:'transparent',color:filter===f?C.accent:C.textMid,cursor:'pointer'}}>{f}</button>)}
        <Btn onClick={()=>{setEditItem(null);setForm({name:'',category:'Food',price:''});setShowAdd(true);}}><Icon d={ICONS.plus} size={14}/> Add Item</Btn>
      </div>
    </div>
    <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill, minmax(240px, 1fr))',gap:12}}>
      {filtered.map(item=><Card key={item.id} style={{padding:16}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'start',marginBottom:8}}>
          <div>
            <div style={{fontSize:10,color:item.category==='Drinks'?C.info:C.gold,fontWeight:600,letterSpacing:'0.06em',textTransform:'uppercase',marginBottom:4,fontFamily:FONT_MONO}}>{item.category}</div>
            <div style={{fontSize:14,fontWeight:700,color:C.text}}>{item.name}</div>
          </div>
          <button onClick={()=>updateMenuItem(item.id,{available:!item.available})} style={{width:32,height:18,borderRadius:9,border:'none',cursor:'pointer',background:item.available?C.success:'#333',transition:'background 0.2s',position:'relative',flexShrink:0}}>
            <div style={{width:12,height:12,borderRadius:'50%',background:'white',position:'absolute',top:3,transition:'left 0.2s',left:item.available?'calc(100% - 15px)':3}}/>
          </button>
        </div>
        <div style={{fontSize:20,fontWeight:800,color:C.accent,fontFamily:FONT_MONO,marginBottom:10}}>{ngn(item.price)}</div>
        <div style={{display:'flex',gap:6,alignItems:'center'}}>
          <Btn size="sm" variant="dark" onClick={()=>{setEditItem(item);setForm({name:item.name,category:item.category,price:String(item.price)});setShowAdd(true);}}><Icon d={ICONS.edit} size={12}/> Edit</Btn>
          <Btn size="sm" variant="danger" onClick={()=>deleteMenuItem(item.id)}><Icon d={ICONS.trash} size={12}/></Btn>
          <span style={{marginLeft:'auto',fontSize:10,padding:'3px 7px',borderRadius:4,background:item.available?'rgba(39,174,96,0.1)':'rgba(231,76,60,0.1)',color:item.available?C.success:C.danger,fontWeight:600}}>{item.available?'Active':'Off'}</span>
        </div>
      </Card>)}
    </div>
    {(showAdd||editItem)&&<Modal title={editItem?'Edit Item':'Add Menu Item'} onClose={()=>{setShowAdd(false);setEditItem(null);}}>
      <div style={{display:'flex',flexDirection:'column',gap:14}}>
        <Input label="Item Name" value={form.name} onChange={v=>setForm(f=>({...f,name:v}))} placeholder="e.g. Jollof Rice"/>
        <Select label="Category" value={form.category} onChange={v=>setForm(f=>({...f,category:v}))} options={['Food','Drinks']}/>
        <Input label="Price (NGN)" value={form.price} onChange={v=>setForm(f=>({...f,price:v}))} type="number" placeholder="1500"/>
        <div style={{display:'flex',gap:8}}><Btn variant="ghost" onClick={()=>{setShowAdd(false);setEditItem(null);}} style={{flex:1}}>Cancel</Btn><Btn onClick={handleSubmit} style={{flex:2}}>{editItem?'Save Changes':'Add to Menu'}</Btn></div>
      </div>
    </Modal>}
  </div>;
}

// ─── INVENTORY MODULE ─────────────────────────────────────────────────────────
function InventoryModule({inventory,updateInventory,addInventoryItem}){
  const [showAdd,setShowAdd]=useState(false);
  const [form,setForm]=useState({name:'',unit:'kg',stock:'',reorderLevel:''});
  const [editId,setEditId]=useState(null);
  const handleSubmit=()=>{
    if(!form.name.trim())return;
    if(editId)updateInventory(editId,{stock:Number(form.stock),reorderLevel:Number(form.reorderLevel)});
    else addInventoryItem({name:form.name,unit:form.unit,stock:Number(form.stock),reorderLevel:Number(form.reorderLevel)});
    setForm({name:'',unit:'kg',stock:'',reorderLevel:''});setShowAdd(false);setEditId(null);
  };
  const lowStock=inventory.filter(i=>i.stock<=i.reorderLevel);
  return <div style={{padding:20,maxWidth:1100,margin:'0 auto'}}>
    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20}}>
      <div><h2 style={{fontFamily:FONT_DISPLAY,fontSize:22,fontWeight:800,color:C.text}}>Inventory</h2>
        {lowStock.length>0&&<div style={{fontSize:12,color:C.danger,marginTop:2,display:'flex',alignItems:'center',gap:4}}><Icon d={ICONS.alert} size={12} color={C.danger}/>{lowStock.length} item{lowStock.length>1?'s':''} below reorder level</div>}
      </div>
      <Btn onClick={()=>{setEditId(null);setForm({name:'',unit:'kg',stock:'',reorderLevel:''});setShowAdd(true);}}><Icon d={ICONS.plus} size={14}/> Add Ingredient</Btn>
    </div>
    <Card><div style={{overflowX:'auto'}}>
      <table style={{width:'100%',borderCollapse:'collapse'}}>
        <thead><tr style={{borderBottom:`1px solid ${C.border}`}}>
          {['Ingredient','Unit','Current Stock','Reorder Level','Status','Actions'].map(h=><th key={h} style={{padding:'10px 14px',fontSize:11,color:C.textDim,fontWeight:600,textAlign:'left',letterSpacing:'0.06em',textTransform:'uppercase'}}>{h}</th>)}
        </tr></thead>
        <tbody>
          {inventory.map((item,i)=>{
            const pct=Math.min(100,(item.stock/Math.max(item.reorderLevel*3,1))*100);
            const isLow=item.stock<=item.reorderLevel;const isCritical=item.stock<=item.reorderLevel*0.5;
            return <tr key={item.id} style={{borderBottom:`1px solid ${C.border}`,background:isCritical?'rgba(231,76,60,0.05)':isLow?'rgba(240,180,41,0.05)':'transparent'}}>
              <td style={{padding:'12px 14px',fontWeight:600,color:C.text,fontSize:13}}>{item.name}</td>
              <td style={{padding:'12px 14px',fontSize:12,color:C.textMid,fontFamily:FONT_MONO}}>{item.unit}</td>
              <td style={{padding:'12px 14px'}}>
                <div style={{display:'flex',alignItems:'center',gap:10}}>
                  <div style={{flex:1,height:5,background:C.s3,borderRadius:3,overflow:'hidden',maxWidth:70}}><div style={{height:'100%',width:`${pct}%`,background:isCritical?C.danger:isLow?C.warning:C.success,borderRadius:3}}/></div>
                  <span style={{fontFamily:FONT_MONO,fontWeight:700,fontSize:13,color:isCritical?C.danger:isLow?C.warning:C.text}}>{item.stock} {item.unit}</span>
                </div>
              </td>
              <td style={{padding:'12px 14px',fontSize:12,color:C.textMid,fontFamily:FONT_MONO}}>{item.reorderLevel} {item.unit}</td>
              <td style={{padding:'12px 14px'}}><span style={{fontSize:11,fontWeight:600,padding:'3px 7px',borderRadius:4,background:isCritical?'rgba(231,76,60,0.15)':isLow?'rgba(240,180,41,0.15)':'rgba(39,174,96,0.1)',color:isCritical?C.danger:isLow?C.warning:C.success}}>{isCritical?'⚠ CRITICAL':isLow?'⚠ Low':'In Stock'}</span></td>
              <td style={{padding:'12px 14px'}}><Btn size="sm" variant="dark" onClick={()=>{setEditId(item.id);setForm({name:item.name,unit:item.unit,stock:String(item.stock),reorderLevel:String(item.reorderLevel)});setShowAdd(true);}}><Icon d={ICONS.edit} size={12}/> Edit</Btn></td>
            </tr>;
          })}
        </tbody>
      </table>
    </div></Card>
    {showAdd&&<Modal title={editId?'Edit Stock':'Add Ingredient'} onClose={()=>{setShowAdd(false);setEditId(null);}}>
      <div style={{display:'flex',flexDirection:'column',gap:14}}>
        {!editId&&<Input label="Ingredient Name" value={form.name} onChange={v=>setForm(f=>({...f,name:v}))}/>}
        {!editId&&<Select label="Unit" value={form.unit} onChange={v=>setForm(f=>({...f,unit:v}))} options={['kg','g','L','ml','pcs']}/>}
        <Input label="Current Stock" value={form.stock} onChange={v=>setForm(f=>({...f,stock:v}))} type="number" placeholder="50"/>
        <Input label="Reorder Level" value={form.reorderLevel} onChange={v=>setForm(f=>({...f,reorderLevel:v}))} type="number" placeholder="10"/>
        <div style={{display:'flex',gap:8}}><Btn variant="ghost" onClick={()=>{setShowAdd(false);setEditId(null);}} style={{flex:1}}>Cancel</Btn><Btn onClick={handleSubmit} style={{flex:2}}>{editId?'Save Changes':'Add'}</Btn></div>
      </div>
    </Modal>}
  </div>;
}

// ─── ANALYTICS MODULE ─────────────────────────────────────────────────────────
function AnalyticsModule({analytics,orders,inventory}){
  const {totalRevenue,totalOrders,avgOrderValue,revenueByType,topItems,lowStock,last7Days}=analytics;
  const PIE_COLORS=[C.accent,C.info,C.success,C.gold,C.purple];
  const typeData=Object.entries(revenueByType).map(([name,value])=>({name,value}));
  const staffPerf={};
  orders.forEach(o=>{staffPerf[o.staffName]=(staffPerf[o.staffName]||0)+o.total;});
  const staffData=Object.entries(staffPerf).sort((a,b)=>b[1]-a[1]).map(([name,revenue])=>({name:name.split(' ')[0],revenue}));
  const todayOrders=orders.filter(o=>new Date(o.datetime).toDateString()===new Date().toDateString());
  const todayRevenue=todayOrders.reduce((s,o)=>s+o.total,0);
  const tt=({active,payload,label})=>{
    if(!active||!payload?.length)return null;
    return <div style={{background:C.s2,border:`1px solid ${C.border}`,borderRadius:8,padding:'8px 12px'}}>
      <div style={{fontSize:11,color:C.textMid,marginBottom:3}}>{label}</div>
      {payload.map((p,i)=><div key={i} style={{fontSize:13,fontWeight:700,color:p.color||C.accent,fontFamily:FONT_MONO}}>{p.name==='revenue'?ngn(p.value):p.value}</div>)}
    </div>;
  };
  const StatCard=({label,value,sub,color=C.text,icon})=><Card style={{padding:18}}><div style={{display:'flex',justifyContent:'space-between',alignItems:'start',marginBottom:8}}><div style={{fontSize:11,color:C.textDim,fontWeight:600,textTransform:'uppercase',letterSpacing:'0.08em'}}>{label}</div>{icon&&<Icon d={icon} size={16} color={color}/>}</div><div style={{fontFamily:FONT_MONO,fontSize:24,fontWeight:800,color}}>{value}</div>{sub&&<div style={{fontSize:12,color:C.textMid,marginTop:4}}>{sub}</div>}</Card>;
  return <div style={{padding:20,maxWidth:1200,margin:'0 auto'}}>
    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20}}>
      <h2 style={{fontFamily:FONT_DISPLAY,fontSize:22,fontWeight:800,color:C.text}}>Analytics & Insights</h2>
      <div style={{fontSize:12,color:C.textMid,fontFamily:FONT_MONO}}>{orders.length} total orders</div>
    </div>
    <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:14,marginBottom:20}}>
      <StatCard label="Total Revenue" value={ngn(totalRevenue)} sub="All time" color={C.accent} icon={ICONS.trending}/>
      <StatCard label="Today's Revenue" value={ngn(todayRevenue)} sub={`${todayOrders.length} orders today`} color={C.gold} icon={ICONS.clock}/>
      <StatCard label="Total Orders" value={totalOrders} sub={`Avg ${ngn(avgOrderValue)}/order`} color={C.info} icon={ICONS.orders}/>
      <StatCard label="Low Stock Alerts" value={lowStock.length} sub={lowStock.length>0?lowStock.slice(0,2).map(l=>l.name).join(', '):'All stocked'} color={lowStock.length>0?C.danger:C.success} icon={ICONS.alert}/>
    </div>
    <div style={{display:'grid',gridTemplateColumns:'2fr 1fr',gap:16,marginBottom:16}}>
      <Card style={{padding:16}}>
        <div style={{fontSize:13,fontWeight:700,color:C.text,marginBottom:14}}>Revenue — Last 7 Days</div>
        <ResponsiveContainer width="100%" height={190}><AreaChart data={last7Days}>
          <defs><linearGradient id="rv" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={C.accent} stopOpacity={0.3}/><stop offset="100%" stopColor={C.accent} stopOpacity={0}/></linearGradient></defs>
          <XAxis dataKey="date" tick={{fontSize:10,fill:C.textDim}} axisLine={false} tickLine={false}/>
          <YAxis tick={{fontSize:10,fill:C.textDim}} axisLine={false} tickLine={false} tickFormatter={v=>`₦${(v/1000).toFixed(0)}k`}/>
          <Tooltip content={tt}/>
          <Area type="monotone" dataKey="revenue" stroke={C.accent} strokeWidth={2} fill="url(#rv)"/>
        </AreaChart></ResponsiveContainer>
      </Card>
      <Card style={{padding:16}}>
        <div style={{fontSize:13,fontWeight:700,color:C.text,marginBottom:14}}>Revenue by Order Type</div>
        <ResponsiveContainer width="100%" height={190}><PieChart>
          <Pie data={typeData} cx="50%" cy="50%" innerRadius={48} outerRadius={74} dataKey="value" paddingAngle={3}>
            {typeData.map((_,i)=><Cell key={i} fill={PIE_COLORS[i%PIE_COLORS.length]}/>)}
          </Pie>
          <Tooltip formatter={v=>ngn(v)} contentStyle={{background:C.s2,border:`1px solid ${C.border}`,borderRadius:6}} labelStyle={{color:C.text}}/>
          <Legend wrapperStyle={{fontSize:10,color:C.textMid}}/>
        </PieChart></ResponsiveContainer>
      </Card>
    </div>
    <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16,marginBottom:16}}>
      <Card style={{padding:16}}>
        <div style={{fontSize:13,fontWeight:700,color:C.text,marginBottom:14}}>Top Selling Items</div>
        {topItems.length===0?<div style={{fontSize:13,color:C.textDim}}>No data yet</div>:
        <div style={{display:'flex',flexDirection:'column',gap:8}}>{topItems.map(([name,count])=>{
          const max=topItems[0][1];
          return <div key={name}><div style={{display:'flex',justifyContent:'space-between',marginBottom:3}}><span style={{fontSize:12,color:C.text,fontWeight:600}}>{name}</span><span style={{fontFamily:FONT_MONO,fontSize:12,color:C.accent,fontWeight:700}}>{count} sold</span></div><div style={{height:4,background:C.s3,borderRadius:3}}><div style={{height:'100%',width:`${(count/max)*100}%`,background:`linear-gradient(90deg, ${C.accent}, ${C.gold})`,borderRadius:3}}/></div></div>;
        })}</div>}
      </Card>
      <Card style={{padding:16}}>
        <div style={{fontSize:13,fontWeight:700,color:C.text,marginBottom:14}}>Staff Performance</div>
        <ResponsiveContainer width="100%" height={170}><BarChart data={staffData} barSize={18}>
          <XAxis dataKey="name" tick={{fontSize:10,fill:C.textDim}} axisLine={false} tickLine={false}/>
          <YAxis tick={{fontSize:10,fill:C.textDim}} axisLine={false} tickLine={false} tickFormatter={v=>`₦${(v/1000).toFixed(0)}k`}/>
          <Tooltip content={tt}/>
          <Bar dataKey="revenue" fill={C.accent} radius={[4,4,0,0]}/>
        </BarChart></ResponsiveContainer>
      </Card>
    </div>
    {lowStock.length>0&&<Card style={{padding:16}}>
      <div style={{fontSize:13,fontWeight:700,color:C.danger,marginBottom:12,display:'flex',alignItems:'center',gap:6}}><Icon d={ICONS.alert} size={14} color={C.danger}/> Low Stock Alerts</div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill, minmax(180px, 1fr))',gap:8}}>
        {lowStock.map(item=><div key={item.id} style={{background:'rgba(231,76,60,0.08)',border:'1px solid rgba(231,76,60,0.2)',borderRadius:6,padding:'10px 12px'}}>
          <div style={{fontSize:12,fontWeight:700,color:C.text}}>{item.name}</div>
          <div style={{fontFamily:FONT_MONO,fontSize:17,fontWeight:800,color:C.danger,margin:'3px 0'}}>{item.stock} {item.unit}</div>
          <div style={{fontSize:10,color:C.textDim}}>Reorder at {item.reorderLevel} {item.unit}</div>
        </div>)}
      </div>
    </Card>}
  </div>;
}

// ─── RECEIPT MODAL ────────────────────────────────────────────────────────────
function ReceiptModal({order,onClose}){
  const printReceipt=()=>{
    const w=window.open('','_blank','width=400,height=600');
    w.document.write(`<html><head><title>Receipt ${order.orderId}</title><style>body{font-family:'Courier New',monospace;font-size:12px;width:300px;margin:0 auto;padding:10px}h2{text-align:center;margin:0;font-size:16px}.center{text-align:center}.line{border-top:1px dashed #000;margin:6px 0}.row{display:flex;justify-content:space-between}.bold{font-weight:bold}.large{font-size:14px}</style></head><body>
      <h2>A-GAME FOODS</h2><div class="center">Port Harcourt, Nigeria</div><div class="center">+234-800-AGAME-00</div>
      <div class="line"></div>
      <div class="row"><span>Order:</span><span class="bold">${order.orderId}</span></div>
      <div class="row"><span>Date:</span><span>${fmtDT(order.datetime)}</span></div>
      <div class="row"><span>Type:</span><span>${order.type}${order.table?' · '+order.table:''}</span></div>
      <div class="row"><span>Staff:</span><span>${order.staffName}</span></div>
      ${order.customer?.name?`<div class="row"><span>Customer:</span><span>${order.customer.name}</span></div>`:''}
      <div class="line"></div>
      ${(order.items||[]).map(i=>`<div class="row"><span>${i.name} x${i.qty}</span><span>₦${(i.price*i.qty).toLocaleString()}</span></div>`).join('')}
      <div class="line"></div>
      <div class="row"><span>Subtotal</span><span>₦${order.subtotal.toLocaleString()}</span></div>
      ${order.discount>0?`<div class="row"><span>Discount</span><span>-₦${order.discount.toLocaleString()}</span></div>`:''}
      ${order.deliveryFee>0?`<div class="row"><span>Delivery</span><span>+₦${order.deliveryFee.toLocaleString()}</span></div>`:''}
      <div class="line"></div>
      <div class="row large bold"><span>TOTAL</span><span>₦${order.total.toLocaleString()}</span></div>
      <div class="line"></div>
      <div class="center" style="margin-top:10px">Thank you for choosing A-Game Foods!</div>
      <div class="center" style="font-size:10px;margin-top:6px">Powered by A-Game POS</div>
    </body></html>`);
    w.document.close();setTimeout(()=>w.print(),500);
  };
  return <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.8)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:2000,padding:16}} onClick={e=>{if(e.target===e.currentTarget)onClose();}}>
    <div style={{background:C.s1,border:`1px solid ${C.border}`,borderRadius:12,width:'100%',maxWidth:370,overflow:'hidden'}}>
      <div style={{background:`linear-gradient(135deg, ${C.accent}, ${C.accentD})`,padding:'18px 22px',textAlign:'center'}}>
        <div style={{fontFamily:FONT_DISPLAY,fontSize:20,fontWeight:800,color:'white'}}>A-GAME FOODS</div>
        <div style={{fontSize:11,color:'rgba(255,255,255,0.7)',marginTop:2}}>Port Harcourt, Nigeria</div>
        <div style={{background:'rgba(255,255,255,0.15)',borderRadius:6,padding:'5px 14px',display:'inline-block',marginTop:8}}><span style={{fontFamily:FONT_MONO,fontSize:15,fontWeight:700,color:'white'}}>{order.orderId}</span></div>
      </div>
      <div style={{padding:'14px 18px',fontFamily:FONT_MONO,fontSize:12}}>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:3,marginBottom:10}}>
          <span style={{color:C.textDim}}>Date</span><span style={{color:C.text}}>{fmtD(order.datetime)}</span>
          <span style={{color:C.textDim}}>Time</span><span style={{color:C.text}}>{fmtT(order.datetime)}</span>
          <span style={{color:C.textDim}}>Type</span><span style={{color:C.text}}>{order.type}</span>
          <span style={{color:C.textDim}}>Staff</span><span style={{color:C.text}}>{order.staffName}</span>
          {order.customer?.name&&<><span style={{color:C.textDim}}>Customer</span><span style={{color:C.text}}>{order.customer.name}</span></>}
        </div>
        <div style={{borderTop:`1px dashed ${C.border}`,borderBottom:`1px dashed ${C.border}`,padding:'8px 0',marginBottom:8}}>
          {(order.items||[]).map((it,i)=><div key={i} style={{display:'flex',justifyContent:'space-between',padding:'2px 0'}}><span style={{color:C.text}}>{it.name} ×{it.qty}</span><span style={{color:C.text}}>₦{(it.price*it.qty).toLocaleString()}</span></div>)}
        </div>
        <div style={{display:'flex',flexDirection:'column',gap:3,marginBottom:10}}>
          <div style={{display:'flex',justifyContent:'space-between',color:C.textMid}}><span>Subtotal</span><span>₦{order.subtotal.toLocaleString()}</span></div>
          {order.discount>0&&<div style={{display:'flex',justifyContent:'space-between',color:C.success}}><span>Discount</span><span>-₦{order.discount.toLocaleString()}</span></div>}
          {order.deliveryFee>0&&<div style={{display:'flex',justifyContent:'space-between',color:C.warning}}><span>Delivery</span><span>+₦{order.deliveryFee.toLocaleString()}</span></div>}
          <div style={{display:'flex',justifyContent:'space-between',fontSize:17,fontWeight:800,color:C.accent,borderTop:`1px solid ${C.border}`,paddingTop:5,marginTop:3}}><span>TOTAL</span><span>₦{order.total.toLocaleString()}</span></div>
        </div>
        <div style={{textAlign:'center',color:C.textDim,fontSize:11,paddingTop:8,borderTop:`1px dashed ${C.border}`}}>Thank you for choosing A-Game Foods!</div>
      </div>
      <div style={{padding:'10px 18px',borderTop:`1px solid ${C.border}`,display:'flex',gap:8}}>
        <Btn variant="ghost" onClick={onClose} style={{flex:1}}>Close</Btn>
        <Btn onClick={printReceipt} style={{flex:2}}><Icon d={ICONS.printer} size={14}/> Print Receipt</Btn>
      </div>
    </div>
  </div>;
}

// ─── SUPPLIERS MODULE ─────────────────────────────────────────────────────────
function SuppliersModule({suppliers,setSuppliers,purchases,addPurchase,inventory,notify,deleteSupplier,editSupplier}){
  const [tab,setTab]=useState('suppliers');
  const [showPurchaseForm,setShowPurchaseForm]=useState(false);
  const [showSupplierForm,setShowSupplierForm]=useState(false);
  const [editingSupplier,setEditingSupplier]=useState(null);
  const [pf,setPf]=useState({supplierId:'',ingredientId:'',quantity:'',cost:'',notes:''});
  const [sf,setSf]=useState({name:'',contact:'',email:'',items:'',address:''});
  const handlePurchase=()=>{
    if(!pf.supplierId||!pf.ingredientId||!pf.quantity){notify('Fill required fields','error');return;}
    addPurchase({...pf,supplierId:Number(pf.supplierId),ingredientId:Number(pf.ingredientId),quantity:Number(pf.quantity),cost:Number(pf.cost)});
    setPf({supplierId:'',ingredientId:'',quantity:'',cost:'',notes:''});setShowPurchaseForm(false);
  };
  const handleAddSupplier=()=>{
    if(!sf.name.trim())return;
    if(editingSupplier){editSupplier(editingSupplier.id,{name:sf.name,contact:sf.contact,email:sf.email,items:sf.items,address:sf.address});setEditingSupplier(null);}
    else setSuppliers(p=>[...p,{...sf,id:uid(),balance:0}]);
    setSf({name:'',contact:'',email:'',items:'',address:''});setShowSupplierForm(false);
  };
  return <div style={{padding:20,maxWidth:1100,margin:'0 auto'}}>
    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20}}>
      <h2 style={{fontFamily:FONT_DISPLAY,fontSize:22,fontWeight:800,color:C.text}}>Suppliers & Purchases</h2>
      <div style={{display:'flex',gap:8}}>
        {['suppliers','purchases'].map(t=><button key={t} onClick={()=>setTab(t)} style={{padding:'7px 14px',borderRadius:6,fontSize:13,fontWeight:600,fontFamily:FONT_BODY,border:`1px solid ${tab===t?C.accent:C.border}`,background:tab===t?`rgba(255,107,43,0.15)`:'transparent',color:tab===t?C.accent:C.textMid,cursor:'pointer',textTransform:'capitalize'}}>{t}</button>)}
        <Btn onClick={tab==='suppliers'?()=>setShowSupplierForm(true):()=>setShowPurchaseForm(true)}><Icon d={ICONS.plus} size={14}/> {tab==='suppliers'?'Add Supplier':'Record Purchase'}</Btn>
      </div>
    </div>
    {tab==='suppliers'&&<div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill, minmax(290px, 1fr))',gap:14}}>
      {suppliers.map(s=><Card key={s.id} style={{padding:16}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'start',marginBottom:10}}>
          <div style={{fontFamily:FONT_DISPLAY,fontSize:15,fontWeight:700,color:C.text}}>{s.name}</div>
          <div style={{display:'flex',gap:4}}>
            <button onClick={()=>{setEditingSupplier(s);setSf({name:s.name,contact:s.contact,email:s.email,items:s.items,address:s.address});setShowSupplierForm(true);}} style={{padding:'3px 6px',borderRadius:3,background:'rgba(52,152,219,0.15)',border:`1px solid rgba(52,152,219,0.3)`,color:C.info,cursor:'pointer',fontSize:10}}><Icon d={ICONS.edit} size={9}/></button>
            <button onClick={()=>deleteSupplier(s.id)} style={{padding:'3px 6px',borderRadius:3,background:'rgba(231,76,60,0.15)',border:`1px solid rgba(231,76,60,0.3)`,color:C.danger,cursor:'pointer',fontSize:10}}><Icon d={ICONS.trash} size={9}/></button>
          </div>
        </div>
        <div style={{display:'flex',flexDirection:'column',gap:4}}>
          <div style={{fontSize:12,color:C.textMid}}>📞 {s.contact}</div>
          {s.email&&<div style={{fontSize:12,color:C.textMid}}>✉ {s.email}</div>}
          <div style={{fontSize:12,color:C.textMid}}>📍 {s.address}</div>
          <div style={{fontSize:12,color:C.gold,marginTop:4}}>Supplies: {s.items}</div>
        </div>
        <div style={{marginTop:10,paddingTop:10,borderTop:`1px solid ${C.border}`,display:'flex',justifyContent:'space-between',alignItems:'center'}}>
          <span style={{fontSize:11,color:C.textDim}}>{purchases.filter(p=>p.supplierId===s.id).length} purchases</span>
          <span style={{fontFamily:FONT_MONO,fontSize:13,fontWeight:700,color:C.accent}}>{ngn(purchases.filter(p=>p.supplierId===s.id).reduce((sum,p)=>sum+p.cost,0))} spent</span>
        </div>
      </Card>)}
    </div>}
    {tab==='purchases'&&<Card><div style={{overflowX:'auto'}}>
      <table style={{width:'100%',borderCollapse:'collapse'}}>
        <thead><tr style={{borderBottom:`1px solid ${C.border}`}}>
          {['Date','Supplier','Ingredient','Qty','Cost','Notes'].map(h=><th key={h} style={{padding:'10px 14px',fontSize:11,color:C.textDim,fontWeight:600,textAlign:'left',letterSpacing:'0.06em',textTransform:'uppercase'}}>{h}</th>)}
        </tr></thead>
        <tbody>
          {purchases.length===0?<tr><td colSpan={6} style={{padding:40,textAlign:'center',color:C.textDim}}>No purchases recorded yet</td></tr>:
          purchases.map((p,i)=>{
            const sup=suppliers.find(s=>s.id===p.supplierId);const ing=inventory.find(inv=>inv.id===p.ingredientId);
            return <tr key={p.id||i} style={{borderBottom:`1px solid ${C.border}`}}>
              <td style={{padding:'10px 14px',fontSize:12,color:C.textMid}}>{fmtDT(p.date)}</td>
              <td style={{padding:'10px 14px',fontSize:13,color:C.text,fontWeight:600}}>{sup?.name||'—'}</td>
              <td style={{padding:'10px 14px',fontSize:13,color:C.text}}>{ing?.name||'—'}</td>
              <td style={{padding:'10px 14px',fontFamily:FONT_MONO,fontSize:13}}>{p.quantity} {ing?.unit||''}</td>
              <td style={{padding:'10px 14px',fontFamily:FONT_MONO,fontSize:13,fontWeight:700,color:C.accent}}>{ngn(p.cost)}</td>
              <td style={{padding:'10px 14px',fontSize:12,color:C.textMid}}>{p.notes||'—'}</td>
            </tr>;
          })}
        </tbody>
      </table>
    </div></Card>}
    {showPurchaseForm&&<Modal title="Record Purchase" onClose={()=>setShowPurchaseForm(false)}>
      <div style={{display:'flex',flexDirection:'column',gap:14}}>
        <Select label="Supplier *" value={pf.supplierId} onChange={v=>setPf(f=>({...f,supplierId:v}))} options={[{value:'',label:'Select supplier...'}, ...suppliers.map(s=>({value:String(s.id),label:s.name}))]}/>
        <Select label="Ingredient *" value={pf.ingredientId} onChange={v=>setPf(f=>({...f,ingredientId:v}))} options={[{value:'',label:'Select ingredient...'}, ...inventory.map(i=>({value:String(i.id),label:`${i.name} (${i.unit})`}))]}/>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
          <Input label="Quantity *" value={pf.quantity} onChange={v=>setPf(f=>({...f,quantity:v}))} type="number"/>
          <Input label="Total Cost (₦) *" value={pf.cost} onChange={v=>setPf(f=>({...f,cost:v}))} type="number"/>
        </div>
        <Input label="Notes" value={pf.notes} onChange={v=>setPf(f=>({...f,notes:v}))}/>
        <div style={{display:'flex',gap:8}}><Btn variant="ghost" onClick={()=>setShowPurchaseForm(false)} style={{flex:1}}>Cancel</Btn><Btn onClick={handlePurchase} style={{flex:2}}>Record & Update Stock</Btn></div>
      </div>
    </Modal>}
    {showSupplierForm&&<Modal title={editingSupplier?"Edit Supplier":"Add Supplier"} onClose={()=>{setShowSupplierForm(false);setEditingSupplier(null)}}>
      <div style={{display:'flex',flexDirection:'column',gap:14}}>
        <Input label="Business Name *" value={sf.name} onChange={v=>setSf(f=>({...f,name:v}))}/>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}><Input label="Phone" value={sf.contact} onChange={v=>setSf(f=>({...f,contact:v}))}/><Input label="Email" value={sf.email} onChange={v=>setSf(f=>({...f,email:v}))}/></div>
        <Input label="Address" value={sf.address} onChange={v=>setSf(f=>({...f,address:v}))}/>
        <Input label="Supplies (comma-separated)" value={sf.items} onChange={v=>setSf(f=>({...f,items:v}))} placeholder="Rice, Chicken, Oil"/>
        <div style={{display:'flex',gap:8}}><Btn variant="ghost" onClick={()=>{setShowSupplierForm(false);setEditingSupplier(null);}} style={{flex:1}}>Cancel</Btn><Btn onClick={handleAddSupplier} style={{flex:2}}>{editingSupplier?"Save Changes":"Add Supplier"}</Btn></div>
      </div>
    </Modal>}
  </div>;
}

// ─── STAFF MODULE ─────────────────────────────────────────────────────────────
function StaffModule({staff,setStaff,orders,notify,deleteStaff}){
  const [showAdd,setShowAdd]=useState(false);
  const [form,setForm]=useState({name:'',role:'Cashier',pin:''});
  const handleAdd=()=>{
    if(!form.name.trim()||!form.pin){notify('Name and PIN required','error');return;}
    setStaff(p=>[...p,{...form,id:uid(),active:true,ordersHandled:0,revenueGenerated:0}]);
    setForm({name:'',role:'Cashier',pin:''});setShowAdd(false);notify('Staff member added!');
  };
  const ROLE_COLORS={Manager:C.gold,Cashier:C.info,Kitchen:C.success,Waiter:C.purple};
  return <div style={{padding:20,maxWidth:1100,margin:'0 auto'}}>
    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20}}>
      <h2 style={{fontFamily:FONT_DISPLAY,fontSize:22,fontWeight:800,color:C.text}}>Staff Management</h2>
      <Btn onClick={()=>setShowAdd(true)}><Icon d={ICONS.plus} size={14}/> Add Staff</Btn>
    </div>
    <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill, minmax(260px, 1fr))',gap:14}}>
      {staff.map(s=>{
        const staffOrders=orders.filter(o=>o.staffId===s.id);
        const totalRevenue=staffOrders.reduce((sum,o)=>sum+o.total,0);
        const rc=ROLE_COLORS[s.role]||C.textMid;
        return <Card key={s.id} style={{padding:18}}>
          <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:14}}>
            <div style={{width:42,height:42,borderRadius:'50%',background:`${rc}22`,border:`2px solid ${rc}44`,display:'flex',alignItems:'center',justifyContent:'center',fontFamily:FONT_DISPLAY,fontWeight:800,fontSize:17,color:rc}}>{s.name[0]}</div>
            <div><div style={{fontWeight:700,fontSize:14,color:C.text}}>{s.name}</div><span style={{fontSize:11,fontWeight:700,padding:'2px 7px',borderRadius:4,background:`${rc}15`,color:rc}}>{s.role}</span></div>
            <button onClick={()=>setStaff(p=>p.map(st=>st.id===s.id?{...st,active:!st.active}:st))} style={{marginLeft:'auto',width:32,height:18,borderRadius:9,border:'none',cursor:'pointer',background:s.active?C.success:'#333',transition:'background 0.2s',position:'relative'}}>
              <div style={{width:14,height:14,borderRadius:'50%',background:'white',position:'absolute',top:2,transition:'left 0.2s',left:s.active?'calc(100% - 16px)':2}}/>
            </button>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginBottom:10}}>
            <div style={{background:C.s2,borderRadius:6,padding:'9px 11px'}}><div style={{fontSize:10,color:C.textDim,textTransform:'uppercase',letterSpacing:'0.08em',marginBottom:3}}>Orders</div><div style={{fontFamily:FONT_MONO,fontSize:20,fontWeight:800,color:C.text}}>{staffOrders.length||s.ordersHandled||0}</div></div>
            <div style={{background:C.s2,borderRadius:6,padding:'9px 11px'}}><div style={{fontSize:10,color:C.textDim,textTransform:'uppercase',letterSpacing:'0.08em',marginBottom:3}}>Revenue</div><div style={{fontFamily:FONT_MONO,fontSize:13,fontWeight:800,color:C.accent}}>{ngn(totalRevenue||s.revenueGenerated||0)}</div></div>
          </div>
          <div style={{borderTop:`1px solid ${C.border}`,paddingTop:8,display:'flex',justifyContent:'space-between',alignItems:'center'}}>
            <span style={{fontSize:11,color:C.textDim}}>PIN: ••••</span>
            <div style={{display:'flex',gap:6,alignItems:'center'}}>
              <span style={{fontSize:11,fontWeight:600,color:s.active?C.success:C.danger}}>{s.active?'Active':'Inactive'}</span>
              <button onClick={()=>deleteStaff(s.id)} style={{padding:'3px 6px',borderRadius:3,background:'rgba(231,76,60,0.15)',border:`1px solid rgba(231,76,60,0.3)`,color:C.danger,cursor:'pointer',fontSize:10}}><Icon d={ICONS.trash} size={9}/></button>
            </div>
          </div>
        </Card>;
      })}
    </div>
    {showAdd&&<Modal title="Add Staff Member" onClose={()=>setShowAdd(false)}>
      <div style={{display:'flex',flexDirection:'column',gap:14}}>
        <Input label="Full Name *" value={form.name} onChange={v=>setForm(f=>({...f,name:v}))} placeholder="e.g. Emeka Obi"/>
        <Select label="Role *" value={form.role} onChange={v=>setForm(f=>({...f,role:v}))} options={['Cashier','Kitchen','Manager','Waiter','Supervisor']}/>
        <Input label="PIN (4 digits) *" value={form.pin} onChange={v=>setForm(f=>({...f,pin:v}))} type="password" placeholder="••••"/>
        <div style={{display:'flex',gap:8}}><Btn variant="ghost" onClick={()=>setShowAdd(false)} style={{flex:1}}>Cancel</Btn><Btn onClick={handleAdd} style={{flex:2}}>Add Staff Member</Btn></div>
      </div>
    </Modal>}
  </div>;
}

// ─── RECIPES MODULE ───────────────────────────────────────────────────────────
function RecipesModule({recipes,setRecipes,menu,inventory,notify,api}){
  const [selected,setSelected]=useState(null);
  const [newIngLine,setNewIngLine]=useState({iid:'',qty:''});
  const foodItems=menu.filter(m=>m.category==='Food');
  const getRecipe=(menuItemId)=>recipes.find(r=>String(r.menuItemId)===String(menuItemId));
  const addIngredient=async()=>{
    if(!newIngLine.iid||!newIngLine.qty)return;
    const existing=getRecipe(selected);
    const updatedIngs=existing?[...existing.ingredients.filter(i=>i.iid!==Number(newIngLine.iid)),{iid:Number(newIngLine.iid),qty:Number(newIngLine.qty)}]:[{iid:Number(newIngLine.iid),qty:Number(newIngLine.qty)}];
    setRecipes(prev=>existing?prev.map(r=>String(r.menuItemId)===String(selected)?{...r,ingredients:updatedIngs}:r):[...prev,{id:uid(),menuItemId:selected,ingredients:updatedIngs}]);
    if(api&&GOOGLE_CONFIG.ENABLED)await api.write('saveRecipe',{menuItemId:selected,ingredients:updatedIngs});
    setNewIngLine({iid:'',qty:''});
    notify('Ingredient saved!');
  };
  const removeIngredient=(iid)=>{
    setRecipes(prev=>prev.map(r=>String(r.menuItemId)===String(selected)?{...r,ingredients:r.ingredients.filter(i=>i.iid!==iid)}:r));
  };
  const selectedItem=menu.find(m=>String(m.id)===String(selected));
  const selectedRecipe=selected?getRecipe(selected):null;
  return <div style={{padding:20,maxWidth:1100,margin:'0 auto',display:'flex',gap:20}}>
    <div style={{width:260,flexShrink:0}}>
      <h2 style={{fontFamily:FONT_DISPLAY,fontSize:22,fontWeight:800,color:C.text,marginBottom:14}}>Recipes</h2>
      <div style={{display:'flex',flexDirection:'column',gap:5}}>
        {foodItems.map(item=>{
          const hasRecipe=!!getRecipe(item.id);
          return <button key={item.id} onClick={()=>setSelected(item.id)} style={{padding:'9px 12px',borderRadius:7,textAlign:'left',cursor:'pointer',background:String(selected)===String(item.id)?`rgba(255,107,43,0.15)`:C.s1,border:`1px solid ${String(selected)===String(item.id)?C.accent:C.border}`,color:C.text,fontFamily:FONT_BODY,fontSize:13,fontWeight:600,display:'flex',justifyContent:'space-between',alignItems:'center'}}>
            {item.name}
            <span style={{fontSize:10,fontWeight:600,padding:'2px 6px',borderRadius:3,background:hasRecipe?'rgba(39,174,96,0.15)':'rgba(90,90,110,0.2)',color:hasRecipe?C.success:C.textDim}}>{hasRecipe?'✓':'—'}</span>
          </button>;
        })}
      </div>
    </div>
    <div style={{flex:1}}>
      {!selected?<div style={{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',height:280,gap:10,color:C.textDim}}><Icon d={ICONS.recipes} size={38} color={C.textDim}/><span style={{fontSize:14}}>Select a menu item to manage its recipe</span></div>:
      <Card style={{padding:20}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'start',marginBottom:16}}>
          <div><h3 style={{fontFamily:FONT_DISPLAY,fontSize:18,fontWeight:800,color:C.text}}>{selectedItem?.name}</h3><div style={{fontSize:13,color:C.textMid,marginTop:2}}>Selling price: {ngn(selectedItem?.price)}</div></div>
          <StatusBadge status={selectedRecipe?'Ready':'Pending'}/>
        </div>
        <div style={{marginBottom:16}}>
          <div style={{fontSize:11,color:C.textDim,fontWeight:600,letterSpacing:'0.06em',textTransform:'uppercase',marginBottom:8}}>Ingredients</div>
          {(!selectedRecipe||selectedRecipe.ingredients.length===0)?<div style={{fontSize:13,color:C.textDim,padding:'10px 0'}}>No ingredients yet</div>:
          <div style={{display:'flex',flexDirection:'column',gap:6}}>
            {selectedRecipe.ingredients.map(ing=>{
              const inv=inventory.find(i=>i.id===ing.iid||String(i.id)===String(ing.iid));
              return inv?<div key={ing.iid} style={{display:'flex',alignItems:'center',gap:10,background:C.s2,padding:'8px 12px',borderRadius:6,border:`1px solid ${C.border}`}}>
                <span style={{flex:1,fontSize:13,color:C.text,fontWeight:600}}>{inv.name}</span>
                <span style={{fontFamily:FONT_MONO,fontSize:13,color:C.accent}}>{ing.qty} {inv.unit}</span>
                <button onClick={()=>removeIngredient(ing.iid)} style={{background:'none',border:'none',color:C.danger,cursor:'pointer',padding:2}}><Icon d={ICONS.x} size={13}/></button>
              </div>:null;
            })}
          </div>}
        </div>
        <div style={{background:C.s2,padding:14,borderRadius:8,border:`1px solid ${C.border}`}}>
          <div style={{fontSize:12,color:C.textMid,marginBottom:8,fontWeight:600}}>Add / Update Ingredient</div>
          <div style={{display:'flex',gap:8,alignItems:'flex-end'}}>
            <div style={{flex:2}}><Select label="Ingredient" value={newIngLine.iid} onChange={v=>setNewIngLine(f=>({...f,iid:v}))} options={[{value:'',label:'Select...'}, ...inventory.map(i=>({value:String(i.id),label:`${i.name} (${i.unit})`}))]}/></div>
            <div style={{flex:1}}><Input label="Qty" value={newIngLine.qty} onChange={v=>setNewIngLine(f=>({...f,qty:v}))} type="number" placeholder="0.25"/></div>
            <Btn onClick={addIngredient} disabled={!newIngLine.iid||!newIngLine.qty}><Icon d={ICONS.plus} size={14}/> Add</Btn>
          </div>
        </div>
      </Card>}
    </div>
  </div>;
}

// ═══════════════════════════════════════════════════════════════════════════════
//  ROOT APP — with Google Workspace integration
// ═══════════════════════════════════════════════════════════════════════════════
export default function App() {
  // ── State ──────────────────────────────────────────────────────────────────
  const [menu,       setMenu]       = useState(()=>LS.get('menu',       INIT_MENU));
  const [orders,     setOrders]     = useState(()=>LS.get('orders',     seedDemoOrders()));
  const [inventory,  setInventory]  = useState(()=>LS.get('inventory',  INIT_INVENTORY));
  const [recipes,    setRecipes]    = useState(()=>LS.get('recipes',    INIT_RECIPES));
  const [suppliers,  setSuppliers]  = useState(()=>LS.get('suppliers',  INIT_SUPPLIERS));
  const [purchases,  setPurchases]  = useState(()=>LS.get('purchases',  []));
  const [staff,      setStaff]      = useState(()=>LS.get('staff',      INIT_STAFF));
  const [currentStaff, setCurrentStaff] = useState(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  // POS state
  const [cart,            setCart]            = useState([]);
  const [orderType,       setOrderType]       = useState('Eat-in');
  const [selectedTable,   setSelectedTable]   = useState('Table 1');
  const [customerName,    setCustomerName]    = useState('');
  const [customerPhone,   setCustomerPhone]   = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [discount,        setDiscount]        = useState(0);

  // UI state
  const [activeModule, setActiveModule] = useState('pos');
  const [receiptOrder, setReceiptOrder] = useState(null);
  const [showReceipt,  setShowReceipt]  = useState(false);
  const [notification, setNotification] = useState(null);

  // Google integration state
  const [syncState,   setSyncState]   = useState(GOOGLE_CONFIG.ENABLED ? 'syncing' : 'local');
  const [scriptUrl,   setScriptUrl]   = useState(GOOGLE_CONFIG.SCRIPT_URL || '');
  const apiRef = useRef(null);

  // ── Google API Init ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!GOOGLE_CONFIG.ENABLED || !GOOGLE_CONFIG.SCRIPT_URL) {
      setSyncState('local'); return;
    }
    apiRef.current = new GoogleSheetsAPI(GOOGLE_CONFIG.SCRIPT_URL);
    // Load offline queue
    const saved = LS.get('_write_queue', []);
    if (saved.length) apiRef.current.queue = saved;
    syncFromSheets();
  }, []);

  const syncFromSheets = async () => {
    if (!apiRef.current) return;
    setSyncState('syncing');
    try {
      const data = await apiRef.current.getAll();
      if (data.menu?.length)      setMenu(data.menu);
      if (data.orders?.length)    setOrders(data.orders);
      if (data.inventory?.length) setInventory(data.inventory);
      if (data.staff?.length)     setStaff(data.staff);
      if (data.recipes?.length)   setRecipes(data.recipes);
      if (data.suppliers?.length) setSuppliers(data.suppliers);
      if (data.purchases?.length) setPurchases(data.purchases);
      setSyncState('synced');
    } catch(e) {
      console.warn('Sync failed, using local data:', e.message);
      setSyncState(navigator.onLine ? 'error' : 'offline');
    }
  };

  // Auto-sync every 30s when connected
  useEffect(() => {
    if (!GOOGLE_CONFIG.ENABLED) return;
    const interval = setInterval(syncFromSheets, GOOGLE_CONFIG.SYNC_INTERVAL);
    return () => clearInterval(interval);
  }, []);

  // ── Persist to localStorage (always, as backup) ────────────────────────────
  useEffect(()=>LS.set('menu',      menu),      [menu]);
  useEffect(()=>LS.set('orders',    orders),    [orders]);
  useEffect(()=>LS.set('inventory', inventory), [inventory]);
  useEffect(()=>LS.set('recipes',   recipes),   [recipes]);
  useEffect(()=>LS.set('suppliers', suppliers), [suppliers]);
  useEffect(()=>LS.set('purchases', purchases), [purchases]);
  useEffect(()=>LS.set('staff',     staff),     [staff]);

  const notify = useCallback((msg, type='success') => {
    setNotification({ msg, type });
    setTimeout(()=>setNotification(null), 3000);
  }, []);

  const api = () => apiRef.current;

  // ── Authentication ─────────────────────────────────────────────────────────
  const handleLogin = (user) => {
    setCurrentStaff(user);
    setIsLoggedIn(true);
  };
  const handleLogout = () => {
    setCurrentStaff(null);
    setIsLoggedIn(false);
    notify('Logged out successfully', 'info');
  };

  // ── One-time migration: push localStorage data to Sheets ──────────────────
  const migrateToSheets = async () => {
    if (!api()) { notify('Connect to Google first','error'); return; }
    notify('Migrating data to Google Sheets...', 'info');
    const sheets = {
      Menu: menu, Inventory: inventory, Staff: staff,
      Suppliers: suppliers, Purchases: purchases, Orders: orders,
    };
    for (const [sheet, rows] of Object.entries(sheets)) {
      if (rows.length) {
        try { await api().call('bulkLoad', { sheet, rows }); }
        catch(e) { console.warn('Migration error for', sheet, e.message); }
      }
    }
    notify('Migration complete! All data is now in Google Sheets.');
  };

  // ── Connect handler ────────────────────────────────────────────────────────
  const handleConnect = async (url) => {
    apiRef.current = new GoogleSheetsAPI(url);
    setSyncState('syncing');
    const ok = await apiRef.current.ping();
    if (ok) {
      notify('Connected to Google Workspace!');
      setSyncState('synced');
      await syncFromSheets();
    } else {
      notify('Could not connect. Check the URL and try again.', 'error');
      setSyncState('error');
    }
  };

  // ── POS helpers ────────────────────────────────────────────────────────────
  const addToCart    = (item) => setCart(p=>{const e=p.find(c=>c.id===item.id);return e?p.map(c=>c.id===item.id?{...c,qty:c.qty+1}:c):[...p,{...item,qty:1}];});
  const removeFromCart = (id) => setCart(p=>p.filter(c=>c.id!==id));
  const updateCartQty  = (id,d) => setCart(p=>p.map(c=>c.id===id?{...c,qty:Math.max(0,c.qty+d)}:c).filter(c=>c.qty>0));
  const cartSubtotal   = useMemo(()=>cart.reduce((s,i)=>s+i.price*i.qty,0),[cart]);
  const deliveryFee    = orderType==='Delivery'||orderType==='Online'?500:0;
  const discountAmount = (cartSubtotal*discount)/100;
  const cartTotal      = cartSubtotal-discountAmount+deliveryFee;

  const completeOrder = async () => {
    if (cart.length===0) { notify('Cart is empty!','error'); return; }
    const newOrder = {
      id:        orders.length+1,
      orderId:   `AGF-${String(orders.length+1).padStart(4,'0')}`,
      datetime:  new Date().toISOString(),
      type:      orderType,
      table:     orderType==='Eat-in'?selectedTable:null,
      customer:  {name:customerName,phone:customerPhone,address:deliveryAddress},
      staffId:   currentStaff.id, staffName:currentStaff.name,
      items:     [...cart], subtotal:cartSubtotal,
      discount:  discountAmount, deliveryFee, total:cartTotal, status:'Preparing',
    };

    // Update local state immediately (optimistic)
    setOrders(p=>[newOrder,...p]);

    // Deduct inventory locally
    const deductions = {};
    cart.forEach(item=>{
      const recipe=recipes.find(r=>String(r.menuItemId)===String(item.id));
      if(recipe) recipe.ingredients.forEach(ing=>{deductions[ing.iid]=(deductions[ing.iid]||0)+ing.qty*item.qty;});
    });
    setInventory(p=>p.map(inv=>({...inv,stock:Math.max(0,inv.stock-(deductions[inv.id]||0))})));

    // Write to Google Sheets (with recipes for server-side inventory deduction)
    if (api()) {
      setSyncState('syncing');
      try {
        await api().write('addOrder', { ...newOrder, recipes });
        setSyncState('synced');
      } catch(e) {
        setSyncState('offline');
        notify('Order saved locally. Will sync when online.', 'warning');
      }
    }

    setReceiptOrder(newOrder); setShowReceipt(true);
    setCart([]); setDiscount(0); setCustomerName(''); setCustomerPhone(''); setDeliveryAddress('');
    notify(`Order ${newOrder.orderId} placed!`);
  };

  const clearCart = () => {setCart([]);setDiscount(0);setCustomerName('');setCustomerPhone('');setDeliveryAddress('');};

  // ── CRUD with Google sync ──────────────────────────────────────────────────
  const addMenuItem = async (item) => {
    const newItem = {...item, id:uid(), available:true};
    setMenu(p=>[...p, newItem]);
    if (api()) await api().write('addMenuItem', newItem);
    notify('Item added!');
  };
  const updateMenuItem = async (id, updates) => {
    setMenu(p=>p.map(m=>m.id===id?{...m,...updates}:m));
    if (api()) await api().write('updateMenuItem', {id, updates});
  };
  const deleteMenuItem = async (id) => {
    setMenu(p=>p.filter(m=>m.id!==id));
    if (api()) await api().write('deleteMenuItem', {id});
    notify('Item removed!');
  };
  const updateInventory = async (id, u) => {
    setInventory(p=>p.map(i=>i.id===id?{...i,...u}:i));
    if (api()) await api().write('updateInventory', {id, updates:u});
  };
  const addInventoryItem = async (item) => {
    const newItem = {...item, id:uid()};
    setInventory(p=>[...p, newItem]);
    if (api()) await api().write('addInventoryItem', newItem);
    notify('Ingredient added!');
  };
  const addPurchase = async (purchase) => {
    const np = {...purchase, id:uid(), date:new Date().toISOString()};
    setPurchases(p=>[np,...p]);
    setInventory(p=>p.map(i=>i.id===purchase.ingredientId?{...i,stock:i.stock+Number(purchase.quantity)}:i));
    if (api()) await api().write('addPurchase', np);
    notify('Purchase recorded & stock updated!');
  };
  const updateOrderStatus = async (id, status) => {
    const order = orders.find(o=>o.id===id);
    setOrders(p=>p.map(o=>o.id===id?{...o,status}:o));
    if (api() && order) await api().write('updateOrderStatus', {orderId:order.orderId, status});
    notify(`Order → ${status}`);
  };
  
  // ── Delete operations ──────────────────────────────────────────────────────
  const deleteStaff = async (id) => {
    if (!window.confirm('Delete this staff member? This cannot be undone.')) return;
    setStaff(p=>p.filter(s=>s.id!==id));
    if (api()) await api().write('deleteStaff', {id});
    notify('Staff member deleted!');
  };
  const deleteOrder = async (id) => {
    if (!window.confirm('Delete this order? This cannot be undone.')) return;
    setOrders(p=>p.filter(o=>o.id!==id));
    if (api()) await api().write('deleteOrder', {id});
    notify('Order deleted!');
  };
  const bulkDeleteOrders = async (statusFilter) => {
    const count = orders.filter(o=>!statusFilter || o.status===statusFilter).length;
    if (count===0) { notify('No orders to delete','warning'); return; }
    if (!window.confirm(`Delete ${count} ${statusFilter||'all'} order(s)? This cannot be undone.`)) return;
    setOrders(p=>p.filter(o=>statusFilter ? o.status!==statusFilter : false));
    if (api()) await api().write('bulkDeleteOrders', {statusFilter});
    notify(`${count} order(s) deleted!`);
  };
  const deleteSupplier = async (id) => {
    if (!window.confirm('Delete this supplier? This cannot be undone.')) return;
    setSuppliers(p=>p.filter(s=>s.id!==id));
    if (api()) await api().write('deleteSupplier', {id});
    notify('Supplier deleted!');
  };
  const editSupplier = async (id, updates) => {
    setSuppliers(p=>p.map(s=>s.id===id?{...s,...updates}:s));
    if (api()) await api().write('editSupplier', {id, updates});
    notify('Supplier updated!');
  };

  // ── Analytics ──────────────────────────────────────────────────────────────
  const analytics = useMemo(()=>{
    const totalRevenue=orders.reduce((s,o)=>s+o.total,0);
    const totalOrders=orders.length;
    const avgOrderValue=totalOrders>0?totalRevenue/totalOrders:0;
    const revenueByType={};
    orders.forEach(o=>{revenueByType[o.type]=(revenueByType[o.type]||0)+o.total;});
    const itemCounts={};
    orders.forEach(o=>(o.items||[]).forEach(i=>{itemCounts[i.name]=(itemCounts[i.name]||0)+i.qty;}));
    const topItems=Object.entries(itemCounts).sort((a,b)=>b[1]-a[1]).slice(0,8);
    const lowStock=inventory.filter(i=>i.stock<=i.reorderLevel);
    const last7Days=Array.from({length:7},(_,k)=>{
      const d=new Date();d.setDate(d.getDate()-k);
      const ds=d.toDateString();
      const dayO=orders.filter(o=>new Date(o.datetime).toDateString()===ds);
      return{date:d.toLocaleDateString('en-NG',{weekday:'short',day:'numeric'}),revenue:dayO.reduce((s,o)=>s+o.total,0),count:dayO.length};
    }).reverse();
    return{totalRevenue,totalOrders,avgOrderValue,revenueByType,topItems,lowStock,last7Days};
  },[orders,inventory]);

  const lowStockCount  = analytics.lowStock.length;
  const preparingCount = orders.filter(o=>o.status==='Preparing').length;

  // Show login screen if not authenticated
  if (!isLoggedIn || !currentStaff) {
    return <LoginScreen staff={staff} onLogin={handleLogin} notify={notify}/>;
  }

  return (
    <div style={{fontFamily:FONT_BODY,background:C.bg,color:C.text,minHeight:'100vh',display:'flex',flexDirection:'column'}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600&family=DM+Mono:wght@400;500&display=swap');
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
        ::-webkit-scrollbar{width:4px;height:4px;}::-webkit-scrollbar-track{background:${C.s1};}::-webkit-scrollbar-thumb{background:${C.s4};border-radius:2px;}
        input,select,textarea{color-scheme:dark;}
        input[type=number]::-webkit-inner-spin-button{-webkit-appearance:none;}
        button:focus{outline:none;}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}}
        @keyframes fadeIn{from{opacity:0;transform:translateY(-6px)}to{opacity:1;transform:translateY(0)}}
      `}</style>

      {notification && <Notification msg={notification.msg} type={notification.type}/>}
      {showReceipt && receiptOrder && <ReceiptModal order={receiptOrder} onClose={()=>setShowReceipt(false)}/>}

      <TopBar currentStaff={currentStaff} staff={staff} setCurrentStaff={setCurrentStaff}
        lowStockCount={lowStockCount} preparingCount={preparingCount}
        syncState={syncState} onSyncNow={syncFromSheets} onLogout={handleLogout}/>
      <NavBar active={activeModule} setActive={setActiveModule} lowStockCount={lowStockCount}/>

      <main style={{flex:1,overflow:'auto'}}>
        {activeModule==='pos' && <POSModule menu={menu} cart={cart} orderType={orderType} setOrderType={setOrderType} selectedTable={selectedTable} setSelectedTable={setSelectedTable} customerName={customerName} setCustomerName={setCustomerName} customerPhone={customerPhone} setCustomerPhone={setCustomerPhone} deliveryAddress={deliveryAddress} setDeliveryAddress={setDeliveryAddress} discount={discount} setDiscount={setDiscount} addToCart={addToCart} removeFromCart={removeFromCart} updateCartQty={updateCartQty} cartSubtotal={cartSubtotal} deliveryFee={deliveryFee} discountAmount={discountAmount} cartTotal={cartTotal} completeOrder={completeOrder} clearCart={clearCart}/>}
        {activeModule==='orders'    && <OrdersModule orders={orders} updateOrderStatus={updateOrderStatus} setReceiptOrder={setReceiptOrder} setShowReceipt={setShowReceipt} deleteOrder={deleteOrder} bulkDeleteOrders={bulkDeleteOrders}/>}
        {activeModule==='kitchen'   && <KitchenModule orders={orders} updateOrderStatus={updateOrderStatus}/>}
        {activeModule==='menu'      && <MenuModule menu={menu} addMenuItem={addMenuItem} updateMenuItem={updateMenuItem} deleteMenuItem={deleteMenuItem}/>}
        {activeModule==='inventory' && <InventoryModule inventory={inventory} updateInventory={updateInventory} addInventoryItem={addInventoryItem}/>}
        {activeModule==='recipes'   && <RecipesModule recipes={recipes} setRecipes={setRecipes} menu={menu} inventory={inventory} notify={notify} api={apiRef.current}/>}
        {activeModule==='suppliers' && <SuppliersModule suppliers={suppliers} setSuppliers={setSuppliers} purchases={purchases} addPurchase={addPurchase} inventory={inventory} notify={notify} deleteSupplier={deleteSupplier} editSupplier={editSupplier}/>}
        {activeModule==='staff'     && <StaffModule staff={staff} setStaff={setStaff} orders={orders} notify={notify} deleteStaff={deleteStaff}/>}
        {activeModule==='analytics' && <AnalyticsModule analytics={analytics} orders={orders} inventory={inventory}/>}
        {activeModule==='setup'     && (
          <div style={{padding:20,maxWidth:760,margin:'0 auto'}}>
            <h2 style={{fontFamily:FONT_DISPLAY,fontSize:22,fontWeight:800,color:C.text,marginBottom:20}}>Google Workspace Setup</h2>
            <GoogleSetupPanel scriptUrl={scriptUrl} setScriptUrl={setScriptUrl}
              onConnect={handleConnect} syncState={syncState} onMigrate={migrateToSheets}/>
            <div style={{marginTop:20,background:C.s1,border:`1px solid ${C.border}`,borderRadius:10,padding:20}}>
              <div style={{fontFamily:FONT_DISPLAY,fontSize:15,fontWeight:700,color:C.text,marginBottom:14}}>What gets automated</div>
              {[
                {icon:'📊',title:'Google Sheets Database',desc:'Every order, menu change, stock update, and purchase writes to your spreadsheet in real time. Your manager can open it on any phone.'},
                {icon:'✉️',title:'Gmail Order Notifications',desc:'Each new order triggers an email to the manager with full details — items, total, staff name, table or delivery address.'},
                {icon:'⚠️',title:'Low Stock Alerts',desc:'When any ingredient drops to its reorder level, the system emails your team. Maximum one alert per 4 hours — no spam.'},
                {icon:'📈',title:'Daily Sales Report',desc:'Every night at 11pm, a full day summary is emailed and saved to Google Drive: revenue, top items, staff performance.'},
                {icon:'📅',title:'Weekly Summary',desc:'Every Monday morning, a 7-day overview lands in your inbox. Revenue, order count, average value.'},
                {icon:'💾',title:'Google Drive Archive',desc:'All daily reports are auto-saved as text files in an "A-Game Foods Reports" folder in your Drive.'},
              ].map(f=>(
                <div key={f.title} style={{display:'flex',gap:12,padding:'12px 0',borderBottom:`1px solid ${C.border}`}}>
                  <span style={{fontSize:20,flexShrink:0}}>{f.icon}</span>
                  <div><div style={{fontSize:13,fontWeight:700,color:C.text,marginBottom:3}}>{f.title}</div><div style={{fontSize:12,color:C.textMid,lineHeight:1.5}}>{f.desc}</div></div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}