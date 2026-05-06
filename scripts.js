

// ALL_DATA moved to survey_data.js
const SITE_COLORS = {'PB_SAS_SWN_01':'#E84545','PB_SAS_SWN_02':'#F39C12','PB_SAS_SWN_03':'#F1C40F','PB_SAS_SWN_04':'#27AE60','PB_SAS_SWN_05':'#2980B9'};
const SS = n => n.replace('PB_SAS_','');
const GEOJSON_URLS = {diff:'https://raw.githubusercontent.com/DEVANSHNEGI04/elevation_dashboard/refs/heads/main/DIFFERENCE%20_FeaturesToJSON.geojson',study:'https://raw.githubusercontent.com/DEVANSHNEGI04/elevation_dashboard/refs/heads/main/STUDY_AREA%20(FI_FeaturesToJSO.geojson',post:'https://raw.githubusercontent.com/DEVANSHNEGI04/elevation_dashboard/refs/heads/main/post_points_FeaturesToJSON.geojson',pre:'https://raw.githubusercontent.com/DEVANSHNEGI04/elevation_dashboard/refs/heads/main/pre_points_FeaturesToJSON.geojson'};

// Stars
(()=>{const c=document.getElementById('stars');if(!c)return;for(let i=0;i<100;i++){const s=document.createElement('div');s.className='star';const sz=Math.random()*2.5+0.5;s.style.cssText=`width:${sz}px;height:${sz}px;left:${Math.random()*100}%;top:${Math.random()*100}%;--dur:${2+Math.random()*4}s;animation-delay:${Math.random()*4}s`;c.appendChild(s);}})();

function injectAssets() {
  if (typeof DASHBOARD_ASSETS === 'undefined') return;
  document.querySelectorAll('img').forEach(img => {
    const src = img.getAttribute('src');
    if (src && src.includes('IMG_ASSET_')) {
      const parts = src.split(',');
      const key = parts[parts.length - 1];
      if (DASHBOARD_ASSETS[key]) {
        img.src = "data:image/jpeg;base64," + DASHBOARD_ASSETS[key];
      }
    }
  });
  // Also update download link
  const dlb = document.querySelector('.dlb');
  if (dlb && DASHBOARD_ASSETS['IMG_ASSET_2']) {
    dlb.href = "data:image/jpeg;base64," + DASHBOARD_ASSETS['IMG_ASSET_2'];
  }
}

// Initial Injection
injectAssets();

setTimeout(()=>{
  const landing = document.getElementById('landing');
  if(landing && !landing.classList.contains('fade-out')) enterDash();
},7000);

function enterDash(){
  const l=document.getElementById('landing');
  if(!l) return;
  l.classList.add('fade-out');
  setTimeout(()=>{
    l.style.display='none';
    const app = document.getElementById('app');
    if(app) app.style.display='flex';
    
    // Ensure data is loaded
    if(typeof ALL_DATA !== 'undefined') {
      initHomeCharts(); 
      renderTable(ALL_DATA);
    } else {
      console.error("ALL_DATA not loaded");
    }
    
    initAI();
    handleHash(); 
  },1100);
}


function notify(msg){
  const n=document.getElementById('notif');
  n.textContent=msg;n.classList.add('show');
  setTimeout(()=>n.classList.remove('show'),3200);
}

let currentSite='ALL',mapReady=false,analyticsReady=false;

function showPage(p, el) {
  // Update page display
  document.querySelectorAll('.page').forEach(x => x.classList.remove('active'));
  const targetPage = document.getElementById('page-' + p);
  if (targetPage) targetPage.classList.add('active');

  // Update desktop sidebar nav
  document.querySelectorAll('.ni[data-page]').forEach(x => x.classList.remove('active'));
  const navItem = document.querySelector(`.ni[data-page="${p}"]`);
  if (navItem) navItem.classList.add('active');

  // Update mobile bottom nav by data-page attribute
  document.querySelectorAll('.mobile-nav-item[data-page]').forEach(x => x.classList.remove('active'));
  const mobNavItem = document.querySelector(`.mobile-nav-item[data-page="${p}"]`);
  if (mobNavItem) mobNavItem.classList.add('active');

  // Set hash
  if (window.location.hash !== '#' + p) {
    window.location.hash = p;
  }

  // Load specific page data
  if (p === 'map') initMap();
  if (p === 'analytics' && !analyticsReady) { analyticsReady = true; initAnalytics(); }

  // Close mobile sidebar & overlay
  document.querySelector('.sidebar').classList.remove('mobile-open');
  const ov = document.getElementById('sidebar-overlay');
  if (ov) ov.classList.remove('visible');
}

// Handle Hash Navigation
function handleHash() {
  const h = window.location.hash.replace('#', '') || 'home';
  showPage(h);
}
window.onhashchange = handleHash;

function toggleSidebar() {
  const sb = document.querySelector('.sidebar');
  const ov = document.getElementById('sidebar-overlay');
  const isOpen = sb.classList.toggle('mobile-open');
  if (ov) ov.classList.toggle('visible', isOpen);
}


function filterSite(s,el){
  currentSite=s;
  filterTable();
  notify('Filter: '+(s==='ALL'?'All Sites':SS(s)));
}

function mapFilterSite(s,el){
  currentSite=s;
  document.querySelectorAll('[id^="msf-"]').forEach(b=>{b.classList.remove('active');});
  if(el) el.classList.add('active');
  if(mapReady) loadMapPoints();
  notify('🗺️ Map: '+(s==='ALL'?'All Sites':SS(s)));
}

let tableFilter='ALL';
function setTF(f,el){tableFilter=f;document.querySelectorAll('.filter-btn').forEach(b=>b.classList.remove('active'));if(el)el.classList.add('active');filterTable();}
function filterTable(){
  const q=document.getElementById('tblSearch').value.toLowerCase();
  let d=ALL_DATA;
  if(tableFilter!=='ALL'&&tableFilter!=='POS'&&tableFilter!=='NEG')d=d.filter(r=>r.Name===tableFilter);
  else if(tableFilter==='POS')d=d.filter(r=>r['Difference']>0);
  else if(tableFilter==='NEG')d=d.filter(r=>r['Difference']<0);
  if(currentSite!=='ALL')d=d.filter(r=>r.Name===currentSite);
  if(q)d=d.filter(r=>r.Name.toLowerCase().includes(q)||r.Latitude.toString().includes(q)||r.Longitude.toString().includes(q)||r['Difference'].toString().includes(q));
  renderTable(d);
}
function renderTable(data){
  const b=document.getElementById('data-tbody');
  document.getElementById('rowCount').textContent=data.length;
  const rows=data.slice(0,300);
  b.innerHTML=rows.map((r,i)=>{
    const d=r['Difference'],cls=d>=0?'diff-pos':'diff-neg',sg=d>=0?'+':'';
    return `<tr><td style="color:var(--muted);font-size:11px;">${i+1}</td>
    <td><span class="site-pill" style="background:${SITE_COLORS[r.Name]}">${SS(r.Name)}</span></td>
    <td style="font-weight:600;">${r['Pre monsoon 2025'].toFixed(4)}</td>
    <td style="font-weight:600;">${r['Post monsoon 2025'].toFixed(4)}</td>
    <td><span class="diff-badge ${cls}">${sg}${d.toFixed(4)}</span></td>
    <td style="font-size:11px;color:var(--muted);">${r.Latitude.toFixed(6)}</td>
    <td style="font-size:11px;color:var(--muted);">${r.Longitude.toFixed(6)}</td>
    <td style="font-size:11px;">${d>0?'📈 Accretion':'📉 Erosion'}</td></tr>`;
  }).join('');
  if(data.length>300)b.innerHTML+=`<tr><td colspan="8" style="text-align:center;color:var(--muted);font-size:12px;padding:10px;">... and ${data.length-300} more records</td></tr>`;
}

function getSiteStats(){
  const sd={};
  ALL_DATA.forEach(r=>{if(!sd[r.Name])sd[r.Name]={pre:[],post:[],diff:[]};sd[r.Name].pre.push(r['Pre monsoon 2025']);sd[r.Name].post.push(r['Post monsoon 2025']);sd[r.Name].diff.push(r['Difference']);});
  return sd;
}
function avg(a){return a.reduce((s,x)=>s+x,0)/a.length;}

function initHomeCharts(){
  const sd=getSiteStats(),sn=Object.keys(sd);
  const tb=document.getElementById('site-tbl-body');
  tb.innerHTML=sn.map(n=>{const v=sd[n],d=avg(v.diff);return `<tr><td style="padding:9px 13px;"><span class="site-pill" style="background:${SITE_COLORS[n]}">${SS(n)}</span></td><td style="text-align:center;padding:9px;">${v.pre.length}</td><td style="text-align:center;padding:9px;font-weight:600;">${avg(v.pre).toFixed(3)}</td><td style="text-align:center;padding:9px;font-weight:600;">${avg(v.post).toFixed(3)}</td><td style="text-align:center;padding:9px;"><span class="diff-badge ${d>=0?'diff-pos':'diff-neg'}">${d>=0?'+':''}${d.toFixed(3)}</span></td></tr>`;}).join('');

  const bins=[[-1,0,'Erosion'],[0,0.5,'0–0.5m'],[0.5,1,'0.5–1m'],[1,1.5,'1–1.5m'],[1.5,2,'1.5–2m'],[2,200,'>2m']];
  new Chart(document.getElementById('diffDistChart'),{type:'bar',data:{labels:bins.map(b=>b[2]),datasets:[{label:'Points',data:bins.map(([lo,hi])=>ALL_DATA.filter(r=>r['Difference']>=lo&&r['Difference']<hi).length),backgroundColor:['#E84545','#F39C12','#F1C40F','#27AE60','#1A6B8C','#2980B9'],borderRadius:7}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},scales:{y:{beginAtZero:true,grid:{color:'#EEF0F8'}},x:{grid:{display:false}}}}});

  new Chart(document.getElementById('prePostChart'),{type:'bar',data:{labels:sn.map(SS),datasets:[{label:'Pre-Monsoon (m)',data:sn.map(n=>avg(sd[n].pre)),backgroundColor:'rgba(26,107,140,0.75)',borderRadius:5},{label:'Post-Monsoon (m)',data:sn.map(n=>avg(sd[n].post)),backgroundColor:'rgba(39,174,96,0.75)',borderRadius:5}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{position:'top'}},scales:{y:{min:257,grid:{color:'#EEF0F8'}},x:{grid:{display:false}}}}});

  const acc=ALL_DATA.filter(r=>r['Difference']>0).length;
  new Chart(document.getElementById('pieChart'),{type:'doughnut',data:{labels:[`Accretion (${acc})`,`Erosion (${835-acc})`],datasets:[{data:[acc,835-acc],backgroundColor:['#27AE60','#E84545'],borderWidth:0,hoverOffset:8}]},options:{responsive:true,maintainAspectRatio:false,cutout:'65%',plugins:{legend:{position:'bottom'},tooltip:{callbacks:{label:c=>`${c.label}: ${c.raw} (${(c.raw/835*100).toFixed(1)}%)`}}}}});
}

function initAnalytics(){
  const sd=getSiteStats(),sn=Object.keys(sd);
  new Chart(document.getElementById('cntChart'),{type:'bar',data:{labels:sn.map(SS),datasets:[{label:'Points',data:sn.map(n=>sd[n].pre.length),backgroundColor:sn.map(n=>SITE_COLORS[n]),borderRadius:7}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},scales:{y:{beginAtZero:true,grid:{color:'#EEF0F8'}},x:{grid:{display:false}}}}});
  const diffs=ALL_DATA.map(r=>r['Difference']).filter(d=>d<5);
  const hb=Array.from({length:18},(_,i)=>-0.8+i*0.32);
  new Chart(document.getElementById('histChart'),{type:'bar',data:{labels:hb.slice(0,-1).map((b,i)=>`${b.toFixed(1)}`),datasets:[{label:'Points',data:hb.slice(0,-1).map((b,i)=>diffs.filter(d=>d>=b&&d<hb[i+1]).length),backgroundColor:'rgba(26,107,140,0.72)',borderRadius:3}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},scales:{y:{beginAtZero:true,grid:{color:'#EEF0F8'}},x:{display:false}}}});
  const s=ALL_DATA.filter((_,i)=>i%5===0);
  new Chart(document.getElementById('profileChart'),{type:'line',data:{labels:s.map((_,i)=>i),datasets:[{label:'Pre-Monsoon',data:s.map(r=>r['Pre monsoon 2025']),borderColor:'#1A6B8C',backgroundColor:'rgba(26,107,140,0.08)',tension:0.4,pointRadius:0,fill:true},{label:'Post-Monsoon',data:s.map(r=>r['Post monsoon 2025']),borderColor:'#27AE60',backgroundColor:'rgba(39,174,96,0.08)',tension:0.4,pointRadius:0,fill:true}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{position:'top'}},scales:{y:{min:256,max:266,grid:{color:'#EEF0F8'},title:{display:true,text:'Elevation (m)'}},x:{display:false}}}});
  const pc=document.getElementById('prog-content');
  pc.innerHTML=sn.map(n=>{const v=sd[n],acc=v.diff.filter(d=>d>0).length,total=v.diff.length,pct=(acc/total*100).toFixed(0),a=avg(v.diff).toFixed(3);return `<div style="margin-bottom:14px;"><div style="display:flex;justify-content:space-between;margin-bottom:5px;"><div><span class="site-pill" style="background:${SITE_COLORS[n]}">${SS(n)}</span> <span style="font-size:12.5px;margin-left:8px;">Accretion: ${acc}/${total} (${pct}%)</span></div><div style="font-size:13px;font-weight:700;color:var(--navy);">Avg Δ +${a}m</div></div><div class="prog-bar"><div class="prog-fill" style="width:${pct}%;background:${SITE_COLORS[n]};"></div></div></div>`;}).join('');
}

// MAP
let lMap=null,lGroups={},lBases={};
async function initMap(){
  if(lMap){setTimeout(()=>lMap.invalidateSize(),200);return;}
  const el=document.getElementById('leaflet-map');
  lMap=L.map('leaflet-map',{center:[30.8165,76.629],zoom:15});
  lBases.streets=L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{attribution:'© OpenStreetMap',maxZoom:19});
  lBases.satellite=L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',{attribution:'© Esri'});
  lBases.topo=L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',{attribution:'© OpenTopoMap',maxZoom:17});
  lBases.dark=L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',{attribution:'© CartoDB'});
  lBases.streets.addTo(lMap);
  lGroups.study={layer:L.layerGroup().addTo(lMap),on:true};
  lGroups.pre={layer:L.layerGroup().addTo(lMap),on:true};
  lGroups.post={layer:L.layerGroup().addTo(lMap),on:true};
  lGroups.diff={layer:L.layerGroup().addTo(lMap),on:true};
  setTimeout(()=>lMap.invalidateSize(),400);
  mapReady=true;
  loadMapPoints();
  const st=document.getElementById('map-status');
  st.style.display='block';st.textContent='⏳ Loading study area from GitHub...';
  try{
    const res=await fetch(GEOJSON_URLS.study,{mode:'cors'});
    if(!res.ok)throw new Error('HTTP '+res.status);
    const gj=await res.json();
    L.geoJSON(gj,{style:{color:'#C8A951',weight:1.5,fillColor:'rgba(200,169,81,0.2)',fillOpacity:0.2,dashArray:'5,4'}}).addTo(lGroups.study.layer);
    st.textContent='✅ All layers loaded!';setTimeout(()=>st.style.display='none',2500);
  }catch(e){
    console.warn('Study GeoJSON fetch error:',e.message);
    st.textContent='ℹ️ Study area from fallback bounds';setTimeout(()=>st.style.display='none',3000);
    L.rectangle([[30.8141,76.6215],[30.8189,76.6364]],{color:'#C8A951',weight:2,fill:true,fillColor:'rgba(200,169,81,0.1)',fillOpacity:0.15,dashArray:'6,4'}).addTo(lGroups.study.layer);
  }
}
function loadMapPoints(){
  const data=currentSite==='ALL'?ALL_DATA:ALL_DATA.filter(r=>r.Name===currentSite);
  lGroups.pre.layer.clearLayers();lGroups.post.layer.clearLayers();lGroups.diff.layer.clearLayers();
  data.forEach(r=>{
    const d=r['Difference'],dc=d<0?'#E74C3C':d<1?'#F39C12':'#27AE60',sc=SITE_COLORS[r.Name]||'#666';
    const pop=`<div style="font-family:'Nunito',sans-serif;min-width:200px;"><div style="background:${sc};color:#fff;padding:8px 12px;border-radius:8px 8px 0 0;font-weight:800;font-size:13px;">${SS(r.Name)}</div><div style="padding:10px 12px;background:#fff;border:1px solid #eee;border-top:none;border-radius:0 0 8px 8px;"><div style="margin:3px 0;font-size:12px;">📍 Lat: ${r.Latitude.toFixed(6)}°</div><div style="margin:3px 0;font-size:12px;">📍 Lon: ${r.Longitude.toFixed(6)}°</div><div style="margin:3px 0;font-size:12px;">🔵 Pre: ${r['Pre monsoon 2025'].toFixed(4)} m</div><div style="margin:3px 0;font-size:12px;">🟢 Post: ${r['Post monsoon 2025'].toFixed(4)} m</div><div style="margin-top:6px;"><span style="background:${dc};color:#fff;padding:2px 9px;border-radius:10px;font-weight:700;font-size:12px;">Δ ${d>=0?'+':''}${d.toFixed(4)} m</span></div></div></div>`;
    const o={radius:5,weight:1.2,opacity:0.9,fillOpacity:0.85};
    L.circleMarker([r.Latitude,r.Longitude],{...o,color:sc,fillColor:sc}).bindPopup(pop).addTo(lGroups.pre.layer);
    L.circleMarker([r.Latitude,r.Longitude],{...o,color:'#27AE60',fillColor:'#27AE60'}).bindPopup(pop).addTo(lGroups.post.layer);
    L.circleMarker([r.Latitude,r.Longitude],{...o,color:dc,fillColor:dc}).bindPopup(pop).addTo(lGroups.diff.layer);
  });
}
function toggleLyr(name,el){const lg=lGroups[name];if(!lg||!lMap)return;lg.on=!lg.on;el.classList.toggle('on',lg.on);if(lg.on)lg.layer.addTo(lMap);else lMap.removeLayer(lg.layer);}
function setBM(type,el){document.querySelectorAll('.bm-btn').forEach(b=>b.classList.remove('active'));if(el)el.classList.add('active');Object.values(lBases).forEach(l=>{try{lMap.removeLayer(l);}catch(e){}});lBases[type].addTo(lMap);lBases[type].bringToBack();}

// ===== OFFLINE AI ASSISTANT (No API needed) =====
let currentLang='en';

// Quick questions per language
const QUICK={
  en:['What is the average elevation change?','Which site has highest accretion?','How many survey points are there?','What is pre-monsoon average elevation?','What is accretion vs erosion?','Tell me about Swan River','What are the 5 survey sites?','How to use this dashboard?','What is the difference value?','Tell me about Rupnagar district'],
  hi:['औसत ऊंचाई परिवर्तन क्या है?','किस स्थल पर सर्वाधिक जमाव है?','कुल सर्वे बिंदु कितने हैं?','प्री-मानसून औसत क्या है?','स्वान नदी के बारे में बताएं','5 साइटें कौन सी हैं?','जमाव और अपरदन क्या है?','इस डैशबोर्ड का उपयोग कैसे करें?']
};

// ===== COMPREHENSIVE KNOWLEDGE BASE =====
const KB = {
  en: {
    greeting: `👋 **Hello! नमस्ते!**\n\nI am **Jal Mitra (जल मित्र)**, your assistant for the Swan River Pre & Post Monsoon Survey 2025.\n\nI can answer questions about:\n• All **835 survey points** across 5 river sites\n• **Pre & Post Monsoon elevation** data\n• **Accretion & erosion** analysis\n• **Site-wise statistics** (SWN-01 to SWN-05)\n• How to use this dashboard\n\nAsk me anything in **English or Hindi**! 🌊`,

    about: `🌊 **About This Dashboard**\n\nThis is the **Swan River Survey Intelligence Dashboard** developed for the **CoE SEnSRS, IIT Ropar, Government of Punjab**.\n\n📋 **What it shows:**\nPre & Post Monsoon 2025 GPS elevation survey data from 835 measurement points across 5 sites on the **Swan River (Swanghat)** in **Rupnagar District, Punjab**.\n\n🗂️ **Pages available:**\n• **Overview** — Summary stats & charts\n• **Data Explorer** — Full 835-row searchable table\n• **Map Interface** — Interactive map with layer toggles\n• **Analytics** — Charts, profiles & progress bars\n• **Downloads** — Official layout map JPEG\n• **AI Assistant** — This chatbot (you're here!)\n\n📅 Survey Year: 2025 | 🏛️ Govt. of Punjab`,

    average: `📊 **Average Elevation Change (Post − Pre Monsoon)**\n\nOverall average: **+1.218 meters** (net accretion)\n\n📍 **Site-wise breakdown:**\n• **SWN-01:** +1.511 m avg (402 points)\n• **SWN-02:** +1.162 m avg (144 points)\n• **SWN-03:** +0.928 m avg (73 points)\n• **SWN-04:** +0.903 m avg (112 points)\n• **SWN-05:** +0.706 m avg (104 points)\n\n📈 Pre-Monsoon avg elevation: **259.06 m AMSL**\n📉 Post-Monsoon avg elevation: **260.28 m AMSL**\n\n✅ The positive average indicates **net sediment deposition** (accretion) in the Swan River channel following the 2025 monsoon season.`,

    total: `📍 **Total Survey Points: 835**\n\nDistributed across **5 sites** in Rupnagar District, Punjab:\n\n| Site | Code | Points |\n|------|------|--------|\n| Site 1 | PB_SAS_SWN_01 | 402 pts |\n| Site 2 | PB_SAS_SWN_02 | 144 pts |\n| Site 3 | PB_SAS_SWN_03 | 73 pts |\n| Site 4 | PB_SAS_SWN_04 | 112 pts |\n| Site 5 | PB_SAS_SWN_05 | 104 pts |\n\n🗺️ **Geographic extent:**\nLongitude: 76.621°E – 76.637°E\nLatitude: 30.814°N – 30.819°N\n\n📅 Survey: Pre & Post Monsoon 2025`,

    sites: `🏞️ **5 Survey Sites on Swan River**\n\n**SWN-01** (PB_SAS_SWN_01)\n• 402 survey points | Avg diff: **+1.511m** | Highest accretion\n• Lon: 76.621°–76.628°E | Lat: 30.814°–30.819°N\n\n**SWN-02** (PB_SAS_SWN_02)\n• 144 survey points | Avg diff: **+1.162m**\n• Lon: 76.627°–76.631°E | Lat: 30.814°–30.815°N\n\n**SWN-03** (PB_SAS_SWN_03)\n• 73 survey points | Avg diff: **+0.928m**\n• Lon: 76.633°–76.635°E | Lat: 30.817°–30.819°N\n\n**SWN-04** (PB_SAS_SWN_04)\n• 112 survey points | Avg diff: **+0.903m**\n• Lon: 76.635°–76.636°E | Lat: 30.816°–30.819°N\n\n**SWN-05** (PB_SAS_SWN_05)\n• 104 survey points | Avg diff: **+0.706m** | Lowest change\n• Lon: 76.635°–76.636°E | Lat: 30.815°–30.817°N`,

    accretion: `📈 **Accretion vs Erosion Analysis**\n\n✅ **Accretion zones (elevation increase):**\n**784 points = 93.9%** of all survey points\n→ Sediment deposition occurred after 2025 monsoon\n\n⚠️ **Erosion zones (elevation decrease):**\n**51 points = 6.1%** of all survey points\n→ Net sediment loss in these areas\n\n📊 **What this means:**\nAccretion = the river bed rose after monsoon (sediment deposited by flood water). Erosion = the river bed lowered (sediment carried away). The **93.9% accretion rate** confirms the Swan River is predominantly in a **sediment deposition regime** in 2025.\n\n🔍 **Highest change:** +173m (outlier at SWN-01 Point 267 — likely instrument anomaly)\n**Most stable erosion:** −0.677m minimum`,

    premonsoon: `🔵 **Pre-Monsoon 2025 Elevation Data**\n\nPre-monsoon measurements were taken **before the monsoon season** at all 835 GPS grid points.\n\n📊 **Statistics:**\n• Average: **259.06 m AMSL**\n• Minimum: **85.167 m** (likely outlier at SWN-01 Pt.267)\n• Maximum: **263.351 m**\n• Typical range: **257–263 m** AMSL\n\n📍 **Site-wise pre-monsoon averages:**\n• SWN-01: 258.542 m | SWN-02: 258.099 m\n• SWN-03: 259.713 m | SWN-04: 260.561 m\n• SWN-05: 260.320 m`,

    postmonsoon: `🟢 **Post-Monsoon 2025 Elevation Data**\n\nPost-monsoon measurements recorded **after the 2025 monsoon season** at all 835 points.\n\n📊 **Statistics:**\n• Average: **260.28 m AMSL**\n• Minimum: **257.261 m**\n• Maximum: **264.074 m**\n• Typical range: **257–264 m** AMSL\n\n📍 **Site-wise post-monsoon averages:**\n• SWN-01: 260.053 m | SWN-02: 259.261 m\n• SWN-03: 260.641 m | SWN-04: 261.464 m\n• SWN-05: 261.026 m\n\n📈 On average, elevations **increased by +1.218m** after monsoon.`,

    swanriver: `🌊 **About Swan River (ਸਵਾਨ ਦਰਿਆ)**\n\nThe **Swan River** (also called Suwan or Swanghat River) is a seasonal river and a tributary of the **Sutlej River** in Punjab, India.\n\n📍 **Location:** Rupnagar (Ropar) District, Punjab\n🗺️ **Survey Area:** Swanghat region\n\n🌧️ **Hydrological Character:**\nThe Swan River is a rain-fed river highly susceptible to **monsoon flooding**. It originates in the Shivalik Hills and carries significant sediment load during monsoon.\n\n📊 **2025 Survey Findings:**\nThe 2025 Pre & Post Monsoon survey shows the river deposited significant sediment (+1.218m avg) at all 5 surveyed sites, with 93.9% of points showing accretion — a sign of **active sedimentation** from monsoon runoff.\n\n🏛️ **Managed by:** CoE SEnSRS, IIT Ropar, Govt. of Punjab`,

    highest: `🏆 **Site with Highest Accretion**\n\n**SWN-01 (PB_SAS_SWN_01)** has the highest average elevation change.\n\n📊 **SWN-01 Statistics:**\n• Survey points: **402** (largest site)\n• Average difference: **+1.511 m**\n• Pre-monsoon avg: 258.542 m\n• Post-monsoon avg: 260.053 m\n• Location: Lon 76.621°–76.628°E\n\n✅ SWN-01 shows the maximum sediment deposition, likely due to its position in a wider, slower-moving section of the Swan River channel where sediment settles more readily.\n\n📉 **Lowest accretion:** SWN-05 at +0.706m avg.`,

    lowest: `📉 **Site with Lowest Elevation Change**\n\n**SWN-05 (PB_SAS_SWN_05)** has the lowest average change.\n\n📊 **SWN-05 Statistics:**\n• Survey points: **104**\n• Average difference: **+0.706 m** (still positive = accretion)\n• Pre-monsoon avg: 260.320 m\n• Post-monsoon avg: 261.026 m\n• Location: Lon 76.635°–76.636°E\n\nEven the lowest-change site shows net accretion (+0.706m), confirming that **all 5 sites experienced sediment deposition** during the 2025 monsoon.`,

    method: `🔬 **Survey Methodology**\n\n📡 **GPS-Based Elevation Measurement**\nThe survey uses Real-Time Kinematic (RTK) GPS or Total Station instruments to measure ground elevation at precise grid points.\n\n📋 **Process:**\n1. Grid points established at regular intervals across river channel\n2. Pre-monsoon survey conducted (before June 2025)\n3. Same grid points resurveyed post-monsoon (after Sept 2025)\n4. Difference = Post elevation − Pre elevation\n5. Positive difference = Accretion (sediment gained)\n6. Negative difference = Erosion (sediment lost)\n\n📏 **Elevation datum:** Above Mean Sea Level (AMSL) in meters\n🗺️ **Coverage:** ~1.5 km river reach across 5 sites\n📍 **Total points:** 835 GPS measurement locations`,

    difference: `📐 **What is the "Difference" Value?**\n\nThe **Difference = Post-Monsoon Elevation − Pre-Monsoon Elevation**\n\n📊 **Interpretation:**\n• **Positive (+)** = Elevation increased → Sediment was **deposited** (accretion)\n• **Negative (−)** = Elevation decreased → Sediment was **eroded** (erosion)\n• **Zero (0)** = No change\n\n📈 **2025 Swan River Results:**\n• Overall average difference: **+1.218 m**\n• Range: −0.677 m to +173 m\n• 93.9% positive (accretion) | 6.1% negative (erosion)\n\n⚠️ **Outlier note:** One point (SWN-01, Pt.267) shows +173m which is almost certainly an instrument error, as the pre-monsoon reading of 85.167m is anomalously low compared to other readings (257–263m).`,

    district: `📍 **Rupnagar District, Punjab**\n\nThe Swan River survey was conducted in **Rupnagar District** (also known as Ropar District), one of the 23 districts of Punjab, India.\n\n🏛️ **District highlights:**\n• Former name: Ropar\n• Located in northern Punjab\n• Bounded by Shivalik Hills to the northeast\n• Major river: Sutlej (Swan is a tributary)\n• District HQ: Rupnagar city\n\n🌊 **Swan River in Rupnagar:**\nThe Swan River flows through Rupnagar before joining the Sutlej. The Swanghat area (survey location) is known for its dynamic river morphology due to heavy monsoon flows from Shivalik catchment.`,

    howto: `📖 **How to Use This Dashboard**\n\n🏠 **Overview** — Summary of all survey findings, stat cards, and charts.\n\n📊 **Data Explorer** — Browse all 835 data points. Filter by site, search by coordinates or values.\n\n🗺️ **Map Interface** — Interactive map with all 835 points. Use the **Layer toggles** (Pre/Post/Difference/Study Area), **Base Map** switcher (Satellite, Streets, Topo, Dark), and **Site Filter** to zoom into specific sites. Click any point for a popup with full data.\n\n📈 **Analytics** — Elevation profiles, histograms, site comparisons, accretion progress bars.\n\n📥 **Downloads** — Download the official survey layout map as a JPEG.\n\n🤖 **AI Assistant** — That's me! Ask anything about the survey data in English or Hindi.\n\n🔍 **Tip:** On the **Map Interface**, use the Site Filter in the bottom-left panel to focus on SWN-01 through SWN-05.`,

    fallback: `🤔 I'm not sure I understood your question fully.\n\nHere are things I can help you with:\n• **Average elevation change** — ask "what is the average change?"\n• **Survey points** — ask "how many total points?"\n• **Sites** — ask "tell me about the 5 sites"\n• **Accretion/Erosion** — ask "what is accretion vs erosion?"\n• **Pre/Post monsoon data** — ask "pre monsoon average?"\n• **Swan River** — ask "about Swan River"\n• **Survey method** — ask "how was the survey done?"\n• **Dashboard guide** — ask "how to use this dashboard?"\n• **District** — ask "about Rupnagar district"\n\nTry clicking a **Quick Question** button on the left, or ask in your preferred language!`
  },

  hi: {
    greeting: `🙏 **नमस्ते! Sat Sri Akal!**\n\nमैं **जल मित्र** हूं — स्वान नदी प्री एवं पोस्ट मानसून सर्वेक्षण 2025, CoE SEnSRS, IIT Ropar का AI सहायक।\n\n✅ मैं पूरी तरह **ऑफलाइन** काम करता हूं — कोई इंटरनेट, API या पैसे की जरूरत नहीं!\n\nकृपया कोई भी प्रश्न पूछें! 🌊`,
    average: `📊 **औसत ऊंचाई परिवर्तन (पोस्ट − प्री मानसून)**\n\nसमग्र औसत: **+1.218 मीटर** (कुल जमाव)\n\n📍 **साइटवार विवरण:**\n• SWN-01: +1.511 मी (402 बिंदु)\n• SWN-02: +1.162 मी (144 बिंदु)\n• SWN-03: +0.928 मी (73 बिंदु)\n• SWN-04: +0.903 मी (112 बिंदु)\n• SWN-05: +0.706 मी (104 बिंदु)\n\n📈 प्री-मानसून औसत: **259.06 मी**\n📉 पोस्ट-मानसून औसत: **260.28 मी**\n\n✅ सकारात्मक औसत का अर्थ है स्वान नदी में **गाद जमाव** हुआ है।`,
    total: `📍 **कुल सर्वे बिंदु: 835**\n\nरूपनगर जिले, पंजाब में **5 साइटों** पर:\n• PB_SAS_SWN_01: 402 बिंदु\n• PB_SAS_SWN_02: 144 बिंदु\n• PB_SAS_SWN_03: 73 बिंदु\n• PB_SAS_SWN_04: 112 बिंदु\n• PB_SAS_SWN_05: 104 बिंदु\n\n📅 सर्वेक्षण: प्री एवं पोस्ट मानसून 2025`,
    sites: `🏞️ **5 सर्वे साइटें — स्वान नदी**\n\n• **SWN-01:** 402 बिंदु | औसत +1.511 मी (सर्वाधिक जमाव)\n• **SWN-02:** 144 बिंदु | औसत +1.162 मी\n• **SWN-03:** 73 बिंदु | औसत +0.928 मी\n• **SWN-04:** 112 बिंदु | औसत +0.903 मी\n• **SWN-05:** 104 बिंदु | औसत +0.706 मी (न्यूनतम)`,
    swanriver: `🌊 **स्वान नदी के बारे में**\n\nस्वान नदी पंजाब में सतलुज नदी की एक सहायक नदी है। यह शिवालिक पहाड़ियों से निकलती है और मानसून के दौरान अत्यधिक गाद लाती है।\n\n📍 स्थान: रूपनगर (रोपड़) जिला, पंजाब\n\n2025 के सर्वेक्षण में 93.9% बिंदुओं पर जमाव पाया गया — मानसून से भारी गाद जमाव का संकेत।`,
    accretion: `📈 **जमाव बनाम अपरदन**\n\n✅ **जमाव (ऊंचाई वृद्धि):** **784 बिंदु = 93.9%**\n⚠️ **अपरदन (ऊंचाई कमी):** **51 बिंदु = 6.1%**\n\nकुल मिलाकर, 2025 मानसून के बाद स्वान नदी में **गाद जमाव प्रमुख** रहा।`,
    fallback: `🤔 मुझे आपका प्रश्न पूरी तरह समझ नहीं आया। कृपया इनमें से कुछ पूछें:\n• औसत ऊंचाई परिवर्तन\n• कुल सर्वे बिंदु\n• 5 साइटों के बारे में\n• जमाव बनाम अपरदन\n• स्वान नदी के बारे में\n\nया बाईं ओर **Quick Questions** बटन दबाएं!`
  },

  pa: {
    greeting: `🙏 **ਸਤ ਸ੍ਰੀ ਅਕਾਲ! ਜੀ ਆਇਆਂ ਨੂੰ!**\n\nਮੈਂ **ਜਲ ਮਿੱਤਰ** ਹਾਂ — ਸਵਾਨ ਦਰਿਆ ਪ੍ਰੀ ਅਤੇ ਪੋਸਟ ਮਾਨਸੂਨ ਸਰਵੇਖਣ 2025 ਦਾ AI ਸਹਾਇਕ।\n\n✅ ਮੈਂ ਪੂਰੀ ਤਰ੍ਹਾਂ **ਆਫਲਾਈਨ** ਕੰਮ ਕਰਦਾ ਹਾਂ — ਕੋਈ ਇੰਟਰਨੈਟ ਜਾਂ ਪੈਸੇ ਦੀ ਲੋੜ ਨਹੀਂ!\n\nਕੋਈ ਵੀ ਸਵਾਲ ਪੁੱਛੋ! 🌊`,
    average: `📊 **ਔਸਤ ਉਚਾਈ ਬਦਲਾਅ (ਪੋਸਟ − ਪ੍ਰੀ ਮਾਨਸੂਨ)**\n\nਕੁੱਲ ਔਸਤ: **+1.218 ਮੀਟਰ** (ਜਮ੍ਹਾਂ)\n\n📍 **ਸਾਈਟ ਵਾਰ:**\n• SWN-01: +1.511 ਮੀ (402 ਬਿੰਦੂ)\n• SWN-02: +1.162 ਮੀ (144 ਬਿੰਦੂ)\n• SWN-03: +0.928 ਮੀ (73 ਬਿੰਦੂ)\n• SWN-04: +0.903 ਮੀ (112 ਬਿੰਦੂ)\n• SWN-05: +0.706 ਮੀ (104 ਬਿੰਦੂ)\n\n📈 ਪ੍ਰੀ-ਮਾਨਸੂਨ ਔਸਤ: 259.06 ਮੀ\n📉 ਪੋਸਟ-ਮਾਨਸੂਨ ਔਸਤ: 260.28 ਮੀ`,
    total: `📍 **ਕੁੱਲ ਸਰਵੇਖਣ ਬਿੰਦੂ: 835**\n\nਰੂਪਨਗਰ ਜ਼ਿਲ੍ਹੇ, ਪੰਜਾਬ ਵਿੱਚ **5 ਸਾਈਟਾਂ** ਤੇ:\n• SWN-01: 402 ਬਿੰਦੂ\n• SWN-02: 144 ਬਿੰਦੂ\n• SWN-03: 73 ਬਿੰਦੂ\n• SWN-04: 112 ਬਿੰਦੂ\n• SWN-05: 104 ਬਿੰਦੂ`,
    sites: `🏞️ **5 ਸਰਵੇਖਣ ਸਾਈਟਾਂ — ਸਵਾਨ ਦਰਿਆ**\n\n• **SWN-01:** 402 ਬਿੰਦੂ | ਔਸਤ +1.511 ਮੀ (ਸਭ ਤੋਂ ਵੱਧ ਜਮ੍ਹਾਂ)\n• **SWN-02:** 144 ਬਿੰਦੂ | ਔਸਤ +1.162 ਮੀ\n• **SWN-03:** 73 ਬਿੰਦੂ | ਔਸਤ +0.928 ਮੀ\n• **SWN-04:** 112 ਬਿੰਦੂ | ਔਸਤ +0.903 ਮੀ\n• **SWN-05:** 104 ਬਿੰਦੂ | ਔਸਤ +0.706 ਮੀ`,
    swanriver: `🌊 **ਸਵਾਨ ਦਰਿਆ ਬਾਰੇ**\n\nਸਵਾਨ ਦਰਿਆ ਪੰਜਾਬ ਵਿੱਚ ਸਤਲੁਜ ਦੀ ਇੱਕ ਸਹਾਇਕ ਨਦੀ ਹੈ। ਇਹ ਸ਼ਿਵਾਲਿਕ ਪਹਾੜਾਂ ਤੋਂ ਨਿਕਲਦੀ ਹੈ।\n\n📍 ਟਿਕਾਣਾ: ਰੂਪਨਗਰ ਜ਼ਿਲ੍ਹਾ, ਪੰਜਾਬ\n\n2025 ਸਰਵੇਖਣ ਵਿੱਚ 93.9% ਬਿੰਦੂਆਂ ਤੇ ਜਮ੍ਹਾਂ ਦੇਖਿਆ ਗਿਆ।`,
    accretion: `📈 **ਜਮ੍ਹਾਂ ਬਨਾਮ ਖੋਰਾ**\n\n✅ **ਜਮ੍ਹਾਂ (ਉਚਾਈ ਵਧੀ):** **784 ਬਿੰਦੂ = 93.9%**\n⚠️ **ਖੋਰਾ (ਉਚਾਈ ਘਟੀ):** **51 ਬਿੰਦੂ = 6.1%**\n\n2025 ਮਾਨਸੂਨ ਤੋਂ ਬਾਅਦ ਸਵਾਨ ਦਰਿਆ ਵਿੱਚ ਜ਼ਿਆਦਾਤਰ ਜਮ੍ਹਾਂ ਹੋਈ।`,
    fallback: `🤔 ਮੈਨੂੰ ਤੁਹਾਡਾ ਸਵਾਲ ਪੂਰੀ ਤਰ੍ਹਾਂ ਸਮਝ ਨਹੀਂ ਆਇਆ। ਕਿਰਪਾ ਕਰਕੇ ਇਹਨਾਂ ਵਿੱਚੋਂ ਕੋਈ ਪੁੱਛੋ:\n• ਔਸਤ ਉਚਾਈ ਬਦਲਾਅ\n• ਕੁੱਲ ਸਰਵੇਖਣ ਬਿੰਦੂ\n• 5 ਸਾਈਟਾਂ ਬਾਰੇ\n• ਸਵਾਨ ਦਰਿਆ ਬਾਰੇ\n\nਜਾਂ ਖੱਬੇ ਪਾਸੇ **Quick Questions** ਦਬਾਓ!`
  },

  mr: {
    greeting: `🙏 **नमस्कार!**\n\nमी **जल मित्र** आहे — स्वान नदी प्री आणि पोस्ट मान्सून सर्वेक्षण 2025 चा AI सहाय्यक.\n\n✅ मी पूर्णपणे **ऑफलाईन** काम करतो!\n\nकोणताही प्रश्न विचारा! 🌊`,
    average: `📊 **सरासरी उंची बदल: +1.218 मीटर**\n\nसाइट-निहाय:\n• SWN-01: +1.511 मी | SWN-02: +1.162 मी\n• SWN-03: +0.928 मी | SWN-04: +0.903 मी | SWN-05: +0.706 मी\n\nप्री-मान्सून सरासरी: 259.06 मी | पोस्ट-मान्सून: 260.28 मी`,
    total: `📍 **एकूण 835 सर्वेक्षण बिंदू** — रूपनगर जिला, पंजाबमधील 5 साइटवर.\n• SWN-01: 402 | SWN-02: 144 | SWN-03: 73 | SWN-04: 112 | SWN-05: 104`,
    sites: `🏞️ **5 सर्वेक्षण साइट:**\n• SWN-01: 402 बिंदू | +1.511 मी (सर्वाधिक)\n• SWN-02: 144 बिंदू | +1.162 मी\n• SWN-03: 73 बिंदू | +0.928 मी\n• SWN-04: 112 बिंदू | +0.903 मी\n• SWN-05: 104 बिंदू | +0.706 मी`,
    swanriver: `🌊 **स्वान नदी** पंजाबमधील सतलज नदीची उपनदी आहे. ती शिवालिक टेकड्यांमधून उगम पावते. 2025 सर्वेक्षणात 93.9% बिंदूंवर संचय आढळला.`,
    accretion: `📈 **संचय विरुद्ध धूप**\n\n✅ संचय: **784 बिंदू (93.9%)**\n⚠️ धूप: **51 बिंदू (6.1%)**`,
    fallback: `🤔 मला तुमचा प्रश्न नीट समजला नाही. कृपया विचारा:\n• सरासरी उंची बदल\n• एकूण सर्वेक्षण बिंदू\n• स्वान नदीबद्दल\n\nकिंवा डाव्या बाजूचे Quick Questions वापरा!`
  },

  ur: {
    greeting: `🙏 **خوش آمدید!**\n\nمیں **جل مترا** ہوں — سوان ندی پری اور پوسٹ مانسون سروے 2025 کا AI معاون۔\n\n✅ میں مکمل طور پر **آف لائن** کام کرتا ہوں!\n\nکوئی بھی سوال پوچھیں! 🌊`,
    average: `📊 **اوسط اونچائی تبدیلی: +1.218 میٹر**\n\nسائٹ وار:\n• SWN-01: +1.511 م | SWN-02: +1.162 م\n• SWN-03: +0.928 م | SWN-04: +0.903 م | SWN-05: +0.706 م`,
    total: `📍 **کل 835 سروے پوائنٹس** — رپنگر ضلع، پنجاب میں 5 سائٹس پر۔`,
    sites: `🏞️ **5 سروے سائٹس:**\n• SWN-01: 402 پوائنٹس | +1.511 م\n• SWN-02: 144 پوائنٹس | +1.162 م\n• SWN-03: 73 پوائنٹس | +0.928 م\n• SWN-04: 112 پوائنٹس | +0.903 م\n• SWN-05: 104 پوائنٹس | +0.706 م`,
    swanriver: `🌊 **سوان ندی** پنجاب میں ستلج کی ایک معاون ندی ہے۔ 2025 سروے میں 93.9% پوائنٹس پر جمع پایا گیا۔`,
    accretion: `📈 **جمع بمقابلہ کٹاؤ**\n\n✅ جمع: **784 پوائنٹس (93.9%)**\n⚠️ کٹاؤ: **51 پوائنٹس (6.1%)**`,
    fallback: `🤔 براہ کرم یہ پوچھیں:\n• اوسط اونچائی تبدیلی\n• کل سروے پوائنٹس\n• سوان ندی کے بارے میں\n\nیا بائیں طرف Quick Questions استعمال کریں!`
  },

  te: {
    greeting: `🙏 **స్వాగతం!**\n\nనేను **జల్ మిత్ర** — స్వాన్ నది సర్వే 2025 AI సహాయకుడిని.\n\n✅ పూర్తిగా **ఆఫ్‌లైన్**లో పని చేస్తాను!\n\nఏదైనా అడగండి! 🌊`,
    average: `📊 **సగటు ఎత్తు మార్పు: +1.218 మీ**\n\nసైట్‌వారీగా:\n• SWN-01: +1.511 మీ | SWN-02: +1.162 మీ\n• SWN-03: +0.928 మీ | SWN-04: +0.903 మీ | SWN-05: +0.706 మీ`,
    total: `📍 **మొత్తం 835 సర్వే పాయింట్లు** — రూప్‌నగర్ జిల్లా, పంజాబ్‌లో 5 సైట్లలో.`,
    sites: `🏞️ **5 సర్వే సైట్లు:**\n• SWN-01: 402 పాయింట్లు | +1.511 మీ\n• SWN-02: 144 పాయింట్లు | +1.162 మీ\n• SWN-03: 73 పాయింట్లు | +0.928 మీ\n• SWN-04: 112 పాయింట్లు | +0.903 మీ\n• SWN-05: 104 పాయింట్లు | +0.706 మీ`,
    swanriver: `🌊 **స్వాన్ నది** పంజాబ్‌లో సట్లెజ్ నదికి ఉపనది. 2025 సర్వేలో 93.9% పాయింట్లలో సంచయం కనుగొనబడింది.`,
    accretion: `📈 **సంచయం vs కోత**\n\n✅ సంచయం: **784 పాయింట్లు (93.9%)**\n⚠️ కోత: **51 పాయింట్లు (6.1%)**`,
    fallback: `🤔 దయచేసి అడగండి:\n• సగటు ఎత్తు మార్పు\n• మొత్తం పాయింట్లు\n• స్వాన్ నది గురించి\n\nలేదా Quick Questions వాడండి!`
  },

  ta: {
    greeting: `🙏 **வணக்கம்!**\n\nநான் **ஜல் மித்ரா** — ஸ்வான் நதி கணக்கெடுப்பு 2025 AI உதவியாளர்.\n\n✅ முழுவதும் **ஆஃப்லைன்**! இணையம் தேவையில்லை!\n\nகேள்விகள் கேளுங்கள்! 🌊`,
    average: `📊 **சராசரி உயர மாற்றம்: +1.218 மீ**\n\nதளம் வாரியாக:\n• SWN-01: +1.511 மீ | SWN-02: +1.162 மீ\n• SWN-03: +0.928 மீ | SWN-04: +0.903 மீ | SWN-05: +0.706 மீ`,
    total: `📍 **மொத்தம் 835 கணக்கெடுப்பு புள்ளிகள்** — ரூப்நகர் மாவட்டம், பஞ்சாப்.`,
    sites: `🏞️ **5 ஆய்வு தளங்கள்:**\n• SWN-01: 402 புள்ளிகள் | +1.511 மீ\n• SWN-02: 144 புள்ளிகள் | +1.162 மீ\n• SWN-03: 73 புள்ளிகள் | +0.928 மீ\n• SWN-04: 112 புள்ளிகள் | +0.903 மீ\n• SWN-05: 104 புள்ளிகள் | +0.706 மீ`,
    swanriver: `🌊 **ஸ்வான் நதி** பஞ்சாப்பில் சட்லெஜின் துணை நதி. 2025 கணக்கெடுப்பில் 93.9% புள்ளிகளில் படிவு காணப்பட்டது.`,
    accretion: `📈 **படிவு vs அரிப்பு**\n\n✅ படிவு: **784 புள்ளிகள் (93.9%)**\n⚠️ அரிப்பு: **51 புள்ளிகள் (6.1%)**`,
    fallback: `🤔 தயவுசெய்து கேளுங்கள்:\n• சராசரி உயர மாற்றம்\n• மொத்த புள்ளிகள்\n• ஸ்வான் நதி பற்றி\n\nஅல்லது Quick Questions பயன்படுத்தவும்!`
  }
};

function getLangKB(){ return KB[currentLang] || KB.en; }

function detectIntent(q){
  const ql = q.toLowerCase().trim();
  const kw = {
    greeting:   ['hello','hi','hey','namaste','नमस्ते','नमस्कार','start','begin','helo','good morning','good afternoon'],
    about:      ['about','dashboard','what is this','overview','introduction','explain dashboard','purpose','डैशबोर्ड','बारे में','क्या है यह'],
    average:    ['average','avg','mean','औसत','elevation change','ऊंचाई परिवर्तन','mean change','1.218'],
    total:      ['total','count','how many','number of','कुल','कितने','835','points','survey point','total point'],
    sites:      ['site','sites','swn','5 site','five site','साइट','साइटें','all site','सभी साइट'],
    accretion:  ['accretion','erosion','deposit','sediment','जमाव','अपरदन','93','784','51','deposition','sedimentation'],
    premonsoon: ['pre','before monsoon','pre-monsoon','pre monsoon','प्री','पूर्व मानसून','259'],
    postmonsoon:['post','after monsoon','post-monsoon','post monsoon','पोस्ट','मानसून के बाद','260'],
    swanriver:  ['swan','river','swanghat','नदी','स्वान','swan river','सवान','morphology'],
    highest:    ['highest','maximum','max','most accretion','greatest','सर्वाधिक','अधिकतम','highest site','best site'],
    lowest:     ['lowest','minimum','min','least','least change','सबसे कम','न्यूनतम'],
    method:     ['method','how survey','methodology','gps','technique','measure','surveyed','कैसे मापा','सर्वेक्षण विधि','instrument'],
    difference: ['what is difference','explain difference','diff value','difference value','how calc','अंतर क्या','explain diff'],
    district:   ['district','rupnagar','ropar','punjab','रूपनगर','जिला','where is','geographic','location of survey'],
    howto:      ['how to use','how use','guide','help','navigate','instruction','feature','use dashboard','कैसे उपयोग','dashboard use']
  };
  for(const [intent,words] of Object.entries(kw)){
    if(words.some(w=>ql.includes(w))) return intent;
  }
  if(/[ऀ-ॿ]/.test(q)){
    if(q.includes('औसत')||q.includes('परिवर्तन')) return 'average';
    if(q.includes('कुल')||q.includes('बिंदु')) return 'total';
    if(q.includes('साइट')) return 'sites';
    if(q.includes('जमाव')||q.includes('अपरदन')) return 'accretion';
    if(q.includes('नदी')||q.includes('स्वान')) return 'swanriver';
    if(q.includes('डैशबोर्ड')) return 'about';
    if(q.includes('प्री')) return 'premonsoon';
    if(q.includes('पोस्ट')) return 'postmonsoon';
    if(q.includes('रूपनगर')||q.includes('जिला')) return 'district';
  }
  return 'fallback';
}

function getResponse(q){
  const intent = detectIntent(q);
  const langKB = getLangKB();
  return langKB[intent] || KB.en[intent] || KB.en.fallback;
}

function initAI(){
  renderQQ();
  addBot(getLangKB().greeting || KB.en.greeting);
}

function setLang(code, el){
  currentLang = code;
  document.querySelectorAll('.lnb').forEach(b => b.classList.remove('active'));
  if(el) el.classList.add('active');
  renderQQ();
  addBot(code === 'hi'
    ? '✅ **भाषा बदल दी गई — हिंदी**\n\nअब मैं आपके सभी सवालों का जवाब **हिंदी** में दूंगा। पूछिए! 🌊'
    : '✅ **Language set to English**\n\nI will now respond in English. Ask me anything! 🌊'
  );
}

function renderQQ(){
  const qs = QUICK[currentLang] || QUICK.en;
  document.getElementById('qq-container').innerHTML = qs.map(q =>
    `<button class="qqb" onclick="askQ(this.dataset.q)" data-q="${q.replace(/"/g,'&quot;')}">${q}</button>`
  ).join('');
}
function askQ(q){ document.getElementById('chat-in').value=q; sendMsg(); }

function addBot(txt, format=true){
  const m = document.getElementById('chat-msgs');
  const d = document.createElement('div');
  d.className = 'msg bot';
  const html = format
    ? txt.replace(/\*\*(.*?)\*\*/g,'<b>$1</b>').replace(/\n/g,'<br>').replace(/• /g,'&bull; ')
    : txt.replace(/\*\*(.*?)\*\*/g,'<b>$1</b>').replace(/\n/g,'<br>');
  d.innerHTML = html;
  m.appendChild(d);
  m.scrollTop = m.scrollHeight;
}
function addUser(txt){
  const m = document.getElementById('chat-msgs');
  const d = document.createElement('div');
  d.className = 'msg user'; d.textContent = txt;
  m.appendChild(d); m.scrollTop = m.scrollHeight;
}
function addTyping(){
  const m = document.getElementById('chat-msgs');
  const d = document.createElement('div');
  d.className = 'msg bot'; d.id = 'typing';
  d.innerHTML = '<div class="td"><span></span><span></span><span></span></div>';
  m.appendChild(d); m.scrollTop = m.scrollHeight;
}
function rmTyping(){ const t=document.getElementById('typing'); if(t)t.remove(); }

let chatHistory = [];

async function sendMsg(){
  const inp = document.getElementById('chat-in');
  const txt = inp.value.trim();
  if(!txt) return;
  addUser(txt);
  inp.value = ''; inp.style.height = 'auto';
  addTyping();
  
  try {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: txt, history: chatHistory })
    });
    const data = await response.json();
    rmTyping();
    if (data.reply) {
      addBot(data.reply);
      chatHistory.push({ role: 'user', text: txt });
      chatHistory.push({ role: 'bot', text: data.reply });
    } else if (data.error) {
      addBot("Error: " + data.error);
    }
  } catch(err) {
    rmTyping();
    addBot("Error connecting to the AI assistant backend.");
    console.error(err);
  }
}

function chatKey(e){ if(e.key==='Enter'&&!e.shiftKey){ e.preventDefault(); sendMsg(); } }
function autoSz(el){ el.style.height='auto'; el.style.height=Math.min(el.scrollHeight,90)+'px'; }
