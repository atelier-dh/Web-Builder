/* Moza Studio Advanced V11 — Version Compare (read only)
 * Compare an Atelier project export with the project currently opened.
 * This add-on never imports, restores, saves, uploads, or modifies project data.
 */
(function(){
'use strict';
if(window.MozaVersionCompare)return;
const VERSION='11.0.0';
const MAX_FILE_BYTES=80*1024*1024;
const MAX_NODES=40000, MAX_DEPTH=35, VISIBLE=120;
const TYPES=['all','added','removed','modified','moved'];
const TYPE_LABEL={all:'Semua perubahan',added:'Ditambahkan',removed:'Dihapus',modified:'Diubah',moved:'Dipindahkan'};
const KIND_LABEL={project:'Proyek',page:'Halaman',section:'Section',element:'Elemen'};
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const arr=a=>Array.isArray(a)?a:[];
const canUse=()=>typeof S!=='undefined'&&S?.mode==='design'&&!!S.doc&&Array.isArray(S.doc.pages);
const name=()=>String(S?.doc?.name||'project').normalize('NFKD').replace(/[^a-z0-9-]/gi,'-').replace(/^-+|-+$/g,'').slice(0,48)||'project';
const notify=s=>typeof toast==='function'?toast(s):console.info('[Moza V11]',s);
const modal=()=>document.querySelector('#mz11-overlay');
let saved=null, selectedType='all', search='', focusBefore=null, loadSerial=0;

function validSnapshot(data){
 if(!data||typeof data!=='object'||Array.isArray(data)||!data.doc||typeof data.doc!=='object'||!Array.isArray(data.doc.pages)||!data.doc.pages.length)
  throw Error('Ini bukan backup project Atelier (.atelier.json).');
 if(data.doc.pages.length>2000)throw Error('Jumlah halaman melampaui batas pemeriksaan.');
 for(const p of data.doc.pages){
  if(!p||typeof p!=='object'||!Array.isArray(p.sections))throw Error('Struktur halaman pada backup tidak valid.');
  for(const s of p.sections){if(!s||typeof s!=='object'||!Array.isArray(s.elements))throw Error('Struktur section pada backup tidak valid.');}
 }
 return data;
}
function parseSnapshot(text){
 if(typeof text!=='string'||!text.length)throw Error('File kosong.');
 if(text.length>MAX_FILE_BYTES)throw Error('Backup terlalu besar untuk perbandingan lokal (maks. 80 MB).');
 let data;try{data=JSON.parse(text.replace(/^\ufeff/,''));}catch(e){throw Error('JSON tidak dapat dibaca. Periksa file backup.');}
 return validSnapshot(data);
}
// Stable JSON for comparison only; recursive properties are sorted to avoid false changes
// caused by different object key insertion orders.
function canonical(value,depth=0){
 if(depth>MAX_DEPTH+10)throw Error('Data memiliki struktur terlalu dalam.');
 if(value===undefined)return 'null';
 if(value===null||typeof value!=='object')return JSON.stringify(value)??'null';
 if(Array.isArray(value))return '['+value.map(v=>canonical(v,depth+1)).join(',')+']';
 return '{'+Object.keys(value).sort().map(k=>JSON.stringify(k)+':'+canonical(value[k],depth+1)).join(',')+'}';
}
function contentOnly(obj,skip){const out={};for(const k of Object.keys(obj||{}))if(!skip.includes(k))out[k]=obj[k];return out;}
function createIndex(snapshot){
 validSnapshot(snapshot);
 const maps={page:new Map(),section:new Map(),element:new Map()},warnings=[],groups=new Map();
 const stats={pages:0,sections:0,elements:0};let total=0;
 const add=(kind,obj,path,parent,position,skip)=>{
  if(++total>MAX_NODES)throw Error('Project terlalu besar untuk dibandingkan pada satu sesi.');
  const id=(typeof obj.id==='string'||typeof obj.id==='number')?String(obj.id):'';
  const key=id||`[tanpa-id]${path}`;
  if(!id)warnings.push(`${KIND_LABEL[kind]} tanpa ID pada ${path}; perbandingan mungkin kurang akurat.`);
  if(maps[kind].has(key)){warnings.push(`ID ${KIND_LABEL[kind]} duplikat: ${key.slice(0,90)}. Duplikat berikutnya diabaikan.`);return null;}
  const data=contentOnly(obj,skip);
  const rec={kind,id:key,name:String(obj.name||obj.title||obj.type||KIND_LABEL[kind]),path,parent,position,signature:canonical(data),data};
  maps[kind].set(key,rec);
  const group=`${kind}/${parent}`;
  if(!groups.has(group))groups.set(group,[]);
  groups.get(group).push(rec);
  stats[kind==='page'?'pages':kind==='section'?'sections':'elements']++;
  return rec;
 };
 const visit=(els,pageId,sectionId,parent,path,depth)=>{
  if(depth>MAX_DEPTH)throw Error('Susunan elemen terlalu dalam untuk dibandingkan.');
  for(const [i,e] of arr(els).entries()){
   if(!e||typeof e!=='object'||Array.isArray(e)){warnings.push('Elemen tidak valid pada '+path);continue;}
   const label=String(e.name||e.type||`Elemen ${i+1}`),epath=path+' / '+label;
   const rec=add('element',e,epath,parent,i,['children']);
   visit(e.children,pageId,sectionId,rec?.id||parent,epath,depth+1);
  }
 };
 for(const [pi,p] of snapshot.doc.pages.entries()){
  const pp=String(p.name||`Halaman ${pi+1}`),pageRec=add('page',p,pp,'project',pi,['sections']);
  for(const [si,sec] of arr(p.sections).entries()){
   const sp=pp+' / '+String(sec.name||`Section ${si+1}`);
   const sectionRec=add('section',sec,sp,pageRec?.id||`page-${pi}`,si,['elements']);
   visit(sec.elements,pageRec?.id,sectionRec?.id,sectionRec?.id||`section-${si}`,sp,0);
  }
 }
 return {maps,groups,warnings,stats,project:contentOnly(snapshot.doc,['pages'])};
}
function groupRanks(index,other){
 const ranks=new Map();
 for(const [group,nodes] of index.groups){
  const [kind]=group.split('/');const remote=other.maps[kind];
  const common=nodes.filter(r=>remote.has(r.id)&&remote.get(r.id).parent===r.parent);
  common.sort((a,b)=>a.position-b.position);
  common.forEach((r,i)=>ranks.set(`${kind}:${r.id}`,i));
 }
 return ranks;
}
function changedFields(a,b){
 const names=new Set([...Object.keys(a.data),...Object.keys(b.data)]);
 return [...names].filter(k=>canonical(a.data[k])!==canonical(b.data[k])).sort().slice(0,25);
}
function compareSnapshots(before,after){
 const old=createIndex(before),now=createIndex(after),oldRanks=groupRanks(old,now),newRanks=groupRanks(now,old);
 const items=[],counts={added:0,removed:0,modified:0,moved:0},byKind={page:0,section:0,element:0,project:0};
 const add=(type,kind,a,b,fields=[])=>{
  items.push({type,kind,id:b?.id||a?.id||'',name:b?.name||a?.name||'',before:a?.path||'',after:b?.path||'',fields});counts[type]++;byKind[kind]++;
 };
 if(canonical(old.project)!==canonical(now.project)){
  const a={id:'project',name:'Pengaturan proyek',path:String(before.doc.name||'Project'),data:old.project};
  const b={id:'project',name:'Pengaturan proyek',path:String(after.doc.name||'Project'),data:now.project};
  add('modified','project',a,b,changedFields(a,b));
 }
 for(const kind of ['page','section','element']){
  for(const [id,a] of old.maps[kind]){
   const b=now.maps[kind].get(id);
   if(!b){add('removed',kind,a,null);continue;}
   if(a.signature!==b.signature)add('modified',kind,a,b,changedFields(a,b));
   if(a.parent!==b.parent||oldRanks.get(`${kind}:${id}`)!==newRanks.get(`${kind}:${id}`))add('moved',kind,a,b);
  }
  for(const [id,b] of now.maps[kind])if(!old.maps[kind].has(id))add('added',kind,null,b);
 }
 const typeOrder={removed:0,added:1,modified:2,moved:3};
 items.sort((a,b)=>typeOrder[a.type]-typeOrder[b.type]||a.kind.localeCompare(b.kind)||a.name.localeCompare(b.name));
 return {format:'moza-version-compare',version:11,createdAt:new Date().toISOString(),beforeName:String(before.doc.name||'Backup'),afterName:String(after.doc.name||'Project aktif'),counts,byKind,items,warnings:[...old.warnings.map(x=>'Backup: '+x),...now.warnings.map(x=>'Sekarang: '+x)],beforeStats:old.stats,afterStats:now.stats,limitations:'Perbandingan struktur dan properti dokumen lokal berdasarkan ID; tidak memverifikasi payload media, data cloud, akses URL, isi RSVP terkirim, atau hasil publish. Tidak ada perubahan otomatis.'};
}
function activeSnapshot(){if(!canUse())throw Error('Buka Design Editor lebih dulu.');return{doc:S.doc,assets:S.assets,videos:S.videos,fonts:S.fonts,music:S.music};}
function compareCurrent(){if(!saved)throw Error('Pilih file backup dahulu.');return compareSnapshots(saved.data,activeSnapshot());}
function filteredItems(r){const s=search.trim().toLocaleLowerCase();return r.items.filter(i=>(selectedType==='all'||i.type===selectedType)&&(!s||[i.name,i.before,i.after,i.kind,i.type,...i.fields].join(' ').toLocaleLowerCase().includes(s)));}
function countsMarkup(r){return `<div class="mz11-stats">${['added','removed','modified','moved'].map(t=>`<div class="mz11-stat mz11-${t}"><strong>${r.counts[t]}</strong><span>${TYPE_LABEL[t]}</span></div>`).join('')}</div>`;}
function comparisonMarkup(){
 if(!saved)return '<div class="mz11-placeholder">Pilih backup .atelier.json untuk melihat perbandingan dengan desain aktif. File hanya diproses di browser ini.</div>';
 let r;try{r=compareCurrent();}catch(err){return `<p class="mz11-error" role="alert">${esc(err.message)}</p>`;}
 const rows=filteredItems(r),visible=rows.slice(0,VISIBLE);
 const location=i=>i.type==='removed'?i.before:i.after;
 return `<div class="mz11-summary"><b>${esc(saved.filename)}</b><span>Backup: ${r.beforeStats.pages} halaman · ${r.beforeStats.sections} section · ${r.beforeStats.elements} elemen</span><span>Aktif: ${r.afterStats.pages} halaman · ${r.afterStats.sections} section · ${r.afterStats.elements} elemen</span></div>`+
 countsMarkup(r)+`<div class="mz11-tools"><label>Jenis<select id="mz11-filter">${TYPES.map(t=>`<option value="${t}" ${selectedType===t?'selected':''}>${TYPE_LABEL[t]}</option>`).join('')}</select></label><label>Cari perubahan<input id="mz11-search" type="search" placeholder="Nama elemen / properti" value="${esc(search)}"></label></div>`+
 (visible.length?`<ul class="mz11-list">${visible.map(i=>`<li><span class="mz11-pill mz11-${i.type}">${TYPE_LABEL[i.type]}</span><div><b>${esc(KIND_LABEL[i.kind])}: ${esc(i.name)}</b><small>${esc(location(i))}</small>${i.fields.length?`<p>Properti: ${esc(i.fields.join(', '))}</p>`:''}${i.type==='moved'?`<p>Dari: ${esc(i.before)}</p>`:''}</div></li>`).join('')}</ul>`:`<div class="mz11-placeholder">${r.items.length?'Tidak ada hasil sesuai filter.':'Tidak ada perbedaan struktur/properti yang terdeteksi.'}</div>`)+
 (rows.length>VISIBLE?`<p class="mz11-note">Ditampilkan ${VISIBLE} dari ${rows.length} perubahan; ekspor untuk melihat semuanya.</p>`:'')+
 (r.warnings.length?`<details class="mz11-warnings"><summary>${r.warnings.length} peringatan ID / struktur</summary><ul>${r.warnings.slice(0,30).map(x=>`<li>${esc(x)}</li>`).join('')}</ul></details>`:'')+
 '<p class="mz11-note">Perbandingan ini read-only. Media biner, respons RSVP, cloud, dan hasil publish tidak diverifikasi. Berkas backup bisa memuat data pribadi: simpan secara privat.</p>';
}
function paint(){const el=modal()?.querySelector('.mz11-results');if(el)el.innerHTML=comparisonMarkup();}
function close(){const root=modal();if(!root)return;loadSerial++;root.remove();saved=null;selectedType='all';search='';focusBefore?.focus?.();focusBefore=null;}
function open(){if(!canUse()){notify('Masuk ke Design Editor terlebih dahulu.');return false}
 if(modal()){paint();return true;}
 focusBefore=document.activeElement;
 const root=document.createElement('div');root.id='mz11-overlay';root.className='mz11-overlay';
 root.innerHTML=`<div class="mz11-dialog" role="dialog" aria-modal="true" aria-labelledby="mz11-heading"><header><div><h2 id="mz11-heading">◇ Advanced V11 · Version Compare</h2><p>Bandingkan backup lama dan desain aktif, tanpa mengganti atau menyimpan data.</p></div><button type="button" class="btn sm" data-mz11="close" aria-label="Tutup Version Compare">✕</button></header><div class="mz11-actions"><label class="mz11-upload">Pilih backup Atelier (.atelier.json / .json)<input id="mz11-file" type="file" accept=".json,.atelier.json,application/json"></label><button type="button" class="btn sm" data-mz11="backup">↓ Backup desain aktif</button><button type="button" class="btn sm" data-mz11="refresh">↻ Bandingkan ulang</button></div><div class="mz11-status" role="status" aria-live="polite"></div><section class="mz11-results"></section><footer><button type="button" class="btn sm" data-mz11="csv">↓ Laporan CSV</button><button type="button" class="btn sm" data-mz11="json">↓ Laporan JSON</button><button type="button" class="btn" data-mz11="close">Tutup</button></footer></div>`;
 document.body.appendChild(root);
 root.addEventListener('click',ev=>{
  const b=ev.target.closest?.('[data-mz11]');if(!b){if(ev.target===root)close();return;}
  const cmd=b.dataset.mz11;
  if(cmd==='close')close();
  else if(cmd==='refresh')paint();
  else if(cmd==='backup'){if(typeof ACT!=='undefined'&&typeof ACT['pr-export']==='function')ACT['pr-export']();else notify('Ekspor backup bawaan Atelier tidak tersedia.');}
  else if(cmd==='csv'||cmd==='json'){
   try{const p=compareCurrent();download(cmd==='csv'?toCsv(p):JSON.stringify(p,null,2),`moza-v11-compare-${name()}.${cmd}` ,cmd==='csv'?'text/csv;charset=utf-8':'application/json;charset=utf-8');}
   catch(err){status(err.message,true);}
  }
 });
 root.addEventListener('change',async ev=>{
  const target=ev.target;
  if(target.id==='mz11-filter'){selectedType=TYPES.includes(target.value)?target.value:'all';paint();root.querySelector('#mz11-filter')?.focus();return;}
  if(target.id!=='mz11-file')return;
  const file=target.files?.[0];if(!file)return;
  const ownerDoc=S.doc,ownerPid=S.pid,token=++loadSerial;
  try{
   if(file.size>MAX_FILE_BYTES)throw Error('File terlalu besar (maks. 80 MB).');
   if(!/\.json$/i.test(file.name))throw Error('Pilih file .atelier.json atau .json.');
   status('Membaca backup di browser…');
   const parsed=parseSnapshot(await file.text());
   if(token!==loadSerial||!modal())return;
   if(S.doc!==ownerDoc||S.pid!==ownerPid||!canUse())throw Error('Project aktif berubah saat membaca file. Pilih ulang backup.');
   // Validate size/depth of both documents before exposing comparison.
   compareSnapshots(parsed,activeSnapshot());
   saved={data:parsed,filename:file.name};selectedType='all';search='';status('Backup berhasil dibaca. Tidak ada data yang diimpor atau diubah.');paint();
  }catch(err){if(token===loadSerial){status(err.message,true);}}
  finally{target.value='';}
 });
 root.addEventListener('input',ev=>{if(ev.target.id==='mz11-search'){const cursor=ev.target.selectionStart;search=ev.target.value;paint();const field=root.querySelector('#mz11-search');field?.focus();field?.setSelectionRange(cursor,cursor);}});
 paint();root.querySelector('[data-mz11="close"]')?.focus();return true;
}
function status(message,error=false){const el=modal()?.querySelector('.mz11-status');if(!el)return;el.textContent=message;el.classList.toggle('mz11-error',!!error);}
function download(text,file,type){const url=URL.createObjectURL(new Blob([text],{type})),a=document.createElement('a');a.href=url;a.download=file;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1800);}
function csvCell(v){let s=String(v??'');if(/^[\s]*[=+\-@\t\r]/.test(s))s="'"+s;return '"'+s.replace(/"/g,'""')+'"';}
function toCsv(report){const cols=['type','kind','name','before','after','fields'];return '\ufeff'+[cols.join(','),...report.items.map(item=>cols.map(c=>csvCell(c==='fields'?item.fields.join('; '):item[c])).join(','))].join('\r\n')+'\r\n';}
document.addEventListener('keydown',ev=>{
 const root=modal();if(!root)return;
 if(ev.key==='Escape'){ev.preventDefault();ev.stopImmediatePropagation();close();return;}
 if(ev.key!=='Tab')return;
 const focusable=[...root.querySelectorAll('button:not([disabled]),input:not([disabled]),select:not([disabled]),summary')].filter(el=>el.getClientRects().length);
 if(!focusable.length)return;
 const first=focusable[0],last=focusable[focusable.length-1];
 if(ev.shiftKey&&(document.activeElement===first||!root.contains(document.activeElement))){ev.preventDefault();last.focus();}
 else if(!ev.shiftKey&&(document.activeElement===last||!root.contains(document.activeElement))){ev.preventDefault();first.focus();}
},true);
if(typeof renderTop==='function'){
 const previous=renderTop;
 renderTop=function(...args){const result=previous(...args);const top=document.getElementById('top');if(canUse()&&top&&!top.querySelector('[data-a="mz11-open"]')){
  const near=top.querySelector('[data-a="mz10-open"]')||top.querySelector('[data-a="mz7-audit"]')||top.querySelector('[data-a="preview"]');
  if(near)near.insertAdjacentHTML('beforebegin','<button type="button" class="btn" data-a="mz11-open" title="Bandingkan dengan backup project">◇ Compare</button>');
 }return result;};
}
if(typeof ACT!=='undefined')ACT['mz11-open']=open;
window.MozaVersionCompare={version:VERSION,validSnapshot,parseSnapshot,createIndex,compareSnapshots,toCsv,open,close,compareCurrent,statusInfo:()=>({ready:canUse(),loaded:!!saved,filename:saved?.filename||null})};
try{if(canUse())renderTop();}catch(err){console.warn('[Moza V11] toolbar deferred',err);}
console.info('[Moza V11] Version Compare installed (read-only).');
})();
