/* Moza Studio Advanced V8 — Smart Filter with optional pagination and category counts.
 * Add-on to Atelier's existing sandboxed embed element. Does not replace
 * Atelier renderers, RSVP, authentication, Supabase, or saved project schema.
 */
(function(){
'use strict';
if(window.MozaSmartFilter)return;
const MAX_ITEMS=30;
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const color=(s,f)=>/^#[0-9a-f]{6}$/i.test(String(s))?String(s):f;
const limit=(s,n)=>String(s??'').slice(0,n);
const valid=()=>typeof S!=='undefined'&&S?.mode==='design'&&S.doc&&Array.isArray(S.doc.pages);
const selected=()=>valid()&&S.sel?.k==='el'?T('el'):null;
const TYPES=['text','image','card','video'];
const SORTS=['manual','newest','oldest','popular','az','custom'];
const SORT_LABELS={manual:'Urutan Asli',newest:'Terbaru',oldest:'Terlama',popular:'Terpopuler',az:'A–Z',custom:'Pilihan Saya'};
const defaults=()=>({version:1,kind:'smart-filter',showSorting:false,sortDefault:'manual',sortLabels:{...SORT_LABELS},allLabel:'Semua',columns:2,columnsMobile:1,showImages:true,showSearch:true,searchPlaceholder:'Cari konten…',pagination:false,pageSize:6,showCategoryCounts:false,accent:'#B76E79',paper:'#ffffff',items:[
 {type:'card',category:'Wedding',title:'Undangan Aulia & Raka',body:'Contoh konten yang bisa disaring berdasarkan kategori.',image:'',link:'',date:'2026-11-05',popularity:42,customOrder:2},
 {type:'text',category:'Cerita',title:'Kisah Kami',body:'Teks panjang juga bisa menjadi item filter.',image:'',link:'',date:'2026-10-21',popularity:12,customOrder:1},
 {type:'card',category:'Wedding',title:'Informasi Acara',body:'Kombinasikan gambar, judul, deskripsi dan link dalam satu kartu.',image:'',link:'',date:'2026-09-10',popularity:75,customOrder:3}
 ]});
function safeURL(s,allowImage=false){
 const v=String(s||'').trim(); if(!v)return '';
 try {const u=new URL(v,location.href);if(['https:','http:'].includes(u.protocol))return v;}
 catch(e){/* ignore */}
 // Relative local files are allowed for projects that deploy assets together.
 if(allowImage&&/^(?:\.\/)?[\w\-./%]+\.(?:png|jpe?g|gif|webp|svg)(?:\?[^<>"']*)?$/i.test(v)&&!v.includes('..'))return v;
 return '';
}
function normalize(c){
 const d=defaults(); const raw=Object.assign({},d,c||{});
 raw.items=(Array.isArray(raw.items)?raw.items:d.items).slice(0,MAX_ITEMS).map((x,i)=>({
  type:TYPES.includes(x?.type)?x.type:'card',category:limit(x?.category||'Umum',70),
  title:limit(x?.title||'Tanpa Judul',150),body:limit(x?.body||'',2200),
  image:limit(x?.image||'',1000),link:limit(x?.link||'',1000),
  date:/^\d{4}-\d{2}-\d{2}$/.test(x?.date||'')?x.date:'',
  popularity:Math.max(0,Math.min(999999,Number(x?.popularity)||0)),
  customOrder:Math.max(0,Math.min(999999,Number.isFinite(Number(x?.customOrder))?Number(x?.customOrder):i))
 }));
 if(!raw.items.length)raw.items=[d.items[0]];
 raw.showSorting=!!raw.showSorting;
 raw.showImages=raw.showImages!==false;
 raw.showSearch=raw.showSearch!==false;
 raw.pagination=raw.pagination===true;
 raw.showCategoryCounts=raw.showCategoryCounts===true;
 raw.pageSize=[3,6,9,12].includes(Number(raw.pageSize))?Number(raw.pageSize):6;
 raw.searchPlaceholder=limit(raw.searchPlaceholder||'Cari konten…',70);
 raw.sortDefault=SORTS.includes(raw.sortDefault)?raw.sortDefault:'manual';
 raw.sortLabels=Object.fromEntries(SORTS.map(k=>[k,limit(raw.sortLabels?.[k]||SORT_LABELS[k],42)]));
 raw.allLabel=limit(raw.allLabel||'Semua',42);
 raw.columns=Math.max(1,Math.min(4,Math.round(Number(raw.columns)||2)));
 raw.columnsMobile=Math.max(1,Math.min(2,Math.round(Number(raw.columnsMobile)||1)));
 raw.accent=color(raw.accent,d.accent);raw.paper=color(raw.paper,d.paper);
 return raw;
}
function cardMarkup(it,i,showImages=true){
 const type=it.type,src=showImages?safeURL(it.image,true):'',link=safeURL(it.link);
 const media=src&&type!=='text'?`<div class="mz6-img"><img loading="lazy" src="${esc(src)}" alt="${esc(it.title)}"></div>`:'';
 const textBlock=`<div class="mz6-body"><h3>${esc(it.title)}</h3>${it.body?`<p>${esc(it.body).replace(/\n/g,'<br>')}</p>`:''}${link?`<a class="mz6-link" href="${esc(link)}" target="_blank" rel="noopener noreferrer">Lihat selengkapnya →</a>`:''}</div>`;
 let content=media+textBlock;
 if(type==='image')content=!showImages?textBlock:src?media+textBlock:`<div class="mz6-placeholder">Tambahkan URL gambar pada Properties</div>`+textBlock;
 if(type==='video'){
   // Native mp4/webm URLs only; no arbitrary scripts or iframe embeds.
   const vid=safeURL(it.image);const playable=/\.(?:mp4|webm|ogg)(?:[?#].*)?$/i.test(vid);
   content=(playable?`<video controls playsinline preload="metadata" src="${esc(vid)}"></video>`:`<div class="mz6-placeholder">Tambahkan URL video .mp4 / .webm</div>`)+textBlock;
 }
 return `<article class="mz6-item" data-original="${i}" data-category="${esc(it.category.toLowerCase().trim())}" data-title="${esc(it.title.toLowerCase())}" data-date="${esc(it.date)}" data-popularity="${it.popularity}" data-custom="${it.customOrder}" data-type="${type}">${content}</article>`;
}
function buildWidget(raw){
 const cfg=normalize(raw),categories=[...new Map(cfg.items.map(x=>x.category.trim()).filter(Boolean).map(x=>[x.toLocaleLowerCase(),x])).values()];
 const cats=categories.map(cat=>{const count=cfg.items.filter(it=>it.category.trim().toLocaleLowerCase()===cat.toLocaleLowerCase()).length;return `<button type="button" class="mz6-filter" data-category="${esc(cat.toLocaleLowerCase())}" aria-pressed="false">${esc(cat)}${cfg.showCategoryCounts?` <span class="mz6-cat-count" aria-label="${count} konten">${count}</span>`:''}</button>`}).join('');
 const opts=SORTS.map(k=>`<option value="${k}" ${cfg.sortDefault===k?'selected':''}>${esc(cfg.sortLabels[k])}</option>`).join('');
 const items=cfg.items.map((it,i)=>cardMarkup(it,i,cfg.showImages)).join('');
 const css=`<style>:root{color-scheme:light}*{box-sizing:border-box}html,body{margin:0;padding:0;background:transparent;font:14px/1.5 system-ui,-apple-system,Segoe UI,sans-serif;color:#303036}body{padding:8px}button,select,a{font:inherit}button{cursor:pointer;touch-action:manipulation}.mz6-root{--acc:${cfg.accent};--paper:${cfg.paper};width:100%;max-width:100%;min-height:100%;background:var(--paper);border:1px solid #e9e5e7;border-radius:14px;padding:12px}.mz6-bar{display:flex;flex-wrap:wrap;align-items:center;gap:10px;justify-content:space-between;margin:0 0 14px}.mz6-filters{display:flex;flex-wrap:wrap;gap:6px;min-width:0}.mz6-filter{min-height:38px;padding:8px 13px;background:#fff;border:1px solid #e4dbdf;border-radius:999px;color:#39343a}.mz6-filter[aria-pressed=true]{background:var(--acc);color:white;border-color:var(--acc)}.mz6-search{flex:1 1 160px;min-width:130px;max-width:270px;min-height:38px;padding:8px 10px;border:1px solid #d6cbd0;border-radius:9px;background:#fff;color:#303036}.mz6-summary{font-size:12px;color:#666;min-height:18px;margin:0 0 9px}.mz6-sort{display:flex;align-items:center;gap:7px;white-space:nowrap;font-size:12px}.mz6-sort select{min-height:38px;padding:7px 22px 7px 9px;border:1px solid #d6cbd0;border-radius:8px;background:#fff;max-width:155px}.mz6-grid{display:grid;grid-template-columns:repeat(${cfg.columns},minmax(0,1fr));gap:12px}.mz6-item{min-width:0;border:1px solid #eee5e9;border-radius:12px;overflow:hidden;background:#fff;box-shadow:0 2px 9px #23101608}.mz6-item[hidden]{display:none}.mz6-cat-count{font-size:11px;opacity:.85}.mz6-pagination{display:flex;align-items:center;justify-content:center;gap:12px;flex-wrap:wrap;margin:16px 0 2px}.mz6-pagination[hidden]{display:none}.mz6-page-btn{min-width:90px;min-height:38px;padding:7px 12px;background:#fff;border:1px solid #d6cbd0;border-radius:9px}.mz6-page-btn:disabled{opacity:.45;cursor:default}.mz6-page-label{font-size:12px;color:#5d5760;min-width:105px;text-align:center}.mz6-img{aspect-ratio:4/3;background:#f7f4f5;overflow:hidden}.mz6-img img{width:100%;height:100%;object-fit:cover}.mz6-body{padding:12px}.mz6-body h3{font-size:15px;margin:0 0 7px;color:#29272d;overflow-wrap:anywhere}.mz6-body p{margin:0;font-size:13px;color:#686269;overflow-wrap:anywhere}.mz6-link{display:inline-block;margin-top:11px;color:var(--acc);text-decoration:underline}.mz6-placeholder{min-height:115px;display:grid;place-items:center;padding:15px;background:#f7f4f5;color:#777;text-align:center;font-size:12px}.mz6-item video{width:100%;max-height:280px;background:#121212}.mz6-empty{padding:22px;text-align:center;color:#777}.mz6-root button:focus-visible,.mz6-root select:focus-visible,.mz6-root a:focus-visible,.mz6-root input:focus-visible{outline:2px solid var(--acc);outline-offset:2px}@media(max-width:560px){body{padding:3px}.mz6-root{padding:9px}.mz6-bar{align-items:stretch}.mz6-filters{width:100%;flex-wrap:nowrap;overflow-x:auto}.mz6-filter{white-space:nowrap;flex-shrink:0;min-height:44px}.mz6-sort select{min-height:44px}.mz6-search{max-width:100%;flex-basis:100%;min-height:44px}.mz6-grid{grid-template-columns:repeat(${cfg.columnsMobile},minmax(0,1fr));gap:9px}.mz6-body{padding:9px}.mz6-body h3{font-size:14px}.mz6-body p{font-size:12px}}</style>`;
 // Rendered content contains no user supplied javascript. The HTML remains
 // inside Atelier's existing sandboxed iframe; it does not reach parent data.
 const script=`<script>(function(){
'use strict';
const root=document.querySelector('.mz6-root'),grid=root.querySelector('.mz6-grid');
if(!root||!grid)return;
const items=[...grid.querySelectorAll('.mz6-item')],filterButtons=[...root.querySelectorAll('.mz6-filter')];
const select=root.querySelector('.mz6-sort select'),search=root.querySelector('.mz6-search');
const countLabel=root.querySelector('.mz6-summary'),empty=root.querySelector('.mz6-empty');
const pager=root.querySelector('.mz6-pagination'),prev=pager?.querySelector('[data-page="prev"]'),next=pager?.querySelector('[data-page="next"]'),pageLabel=pager?.querySelector('.mz6-page-label');
const pageSize=${cfg.pageSize};
let active='all',page=1;
const fold=v=>String(v||'').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase().trim();
function render(){
 const data=items.slice(),sort=select?select.value:'manual';
 if(sort!=='manual')data.sort((a,b)=>{const A=a.dataset,B=b.dataset;let v=0;
  if(sort==='newest')v=B.date.localeCompare(A.date);
  if(sort==='oldest')v=A.date.localeCompare(B.date);
  if(sort==='popular')v=Number(B.popularity)-Number(A.popularity);
  if(sort==='az')v=A.title.localeCompare(B.title);
  if(sort==='custom')v=Number(A.custom)-Number(B.custom);
  return v||Number(A.original)-Number(B.original)});
 else data.sort((a,b)=>Number(a.dataset.original)-Number(b.dataset.original));
 const searchTerm=search?fold(search.value):'';
 const filtered=data.filter(el=>(active==='all'||fold(el.dataset.category)===fold(active))&&(!searchTerm||fold(el.textContent+' '+el.dataset.category).includes(searchTerm)));
 const total=filtered.length,pages=pager?Math.max(1,Math.ceil(total/pageSize)):1;
 page=Math.min(Math.max(1,page),pages);
 const visible=pager?new Set(filtered.slice((page-1)*pageSize,page*pageSize)):new Set(filtered);
 for(const el of data){grid.append(el);el.hidden=!visible.has(el)}
 empty.hidden=!!total;
 if(countLabel)countLabel.textContent=pager?(total?'Menampilkan '+((page-1)*pageSize+1)+'–'+Math.min(page*pageSize,total)+' dari '+total+' hasil ('+items.length+' konten total)':'0 dari '+items.length+' konten ditampilkan'):total+' dari '+items.length+' konten ditampilkan';
 if(pager){pager.hidden=!total||pages<=1;prev.disabled=page<=1;next.disabled=page>=pages;pageLabel.textContent='Halaman '+page+' dari '+pages;}
}
filterButtons.forEach(btn=>btn.addEventListener('click',()=>{active=btn.dataset.category;page=1;filterButtons.forEach(b=>b.setAttribute('aria-pressed',String(b===btn)));render()}));
if(select)select.addEventListener('change',()=>{page=1;render()});
if(search)search.addEventListener('input',()=>{page=1;render()});
if(prev)prev.addEventListener('click',()=>{page=Math.max(1,page-1);render()});
if(next)next.addEventListener('click',()=>{page++;render()});
render();
})();</script>`;
 return `${css}<section class="mz6-root" aria-label="Konten interaktif dengan filter"><div class="mz6-bar"><div class="mz6-filters" role="group" aria-label="Filter kategori"><button type="button" class="mz6-filter" data-category="all" aria-pressed="true">${esc(cfg.allLabel)}${cfg.showCategoryCounts?` <span class="mz6-cat-count" aria-label="${cfg.items.length} konten">${cfg.items.length}</span>`:''}</button>${cats}</div>${cfg.showSearch?`<input class="mz6-search" type="search" aria-label="Cari konten" placeholder="${esc(cfg.searchPlaceholder)}" maxlength="140">`:''}${cfg.showSorting?`<label class="mz6-sort">Urutkan <select aria-label="Urutkan konten">${opts}</select></label>`:''}</div><p class="mz6-summary" role="status" aria-live="polite"></p><div class="mz6-grid">${items}</div>${cfg.pagination?`<nav class="mz6-pagination" aria-label="Navigasi halaman konten"><button type="button" class="mz6-page-btn" data-page="prev">← Sebelumnya</button><span class="mz6-page-label" role="status" aria-live="polite"></span><button type="button" class="mz6-page-btn" data-page="next">Berikutnya →</button></nav>`:''}<div class="mz6-empty" hidden>Tidak ada konten untuk kategori ini.</div></section>${script}`;
}
function add(){
 if(!valid()){typeof toast==='function'&&toast('Buka proyek di Design Editor dulu.');return false}
 const config=defaults();
 const el=newEl('embed',{name:'Smart Filter Container',w:780,h:430,embedKind:'widget',embedLive:true,embedCode:buildWidget(config),mozaSmartFilter:config});
 addEl(el,selSecId());
 if(typeof setGeom==='function'){
  const y=el.y;
  setGeom(el,'t',{x:22,w:724,h:470,y:Math.max(8,Math.round(y*768/1200))});
  setGeom(el,'m',{x:12,w:351,h:540,y:Math.max(8,Math.round(y*375/1200))});
  if(typeof afterEdit==='function')afterEdit();
 }
 if(typeof toast==='function')toast('Smart Filter ditambahkan. Pengurutan awalnya NONAKTIF. Edit dari Properties dan coba Preview.');
 return true;
}
function mutate(fn){
 const e=selected();if(!e?.mozaSmartFilter||e.locked)return false;
 commit(discrete());fn(e.mozaSmartFilter);e.mozaSmartFilter=normalize(e.mozaSmartFilter);
 e.embedCode=buildWidget(e.mozaSmartFilter);e.embedKind='widget';e.embedLive=true;
 afterEdit();return true;
}
function inspector(){
 const e=selected(),c=e?.mozaSmartFilter;
 if(!c)return '';
 const d=normalize(c);
 const rows=d.items.map((it,i)=>`<div class="mz6-editor-item"><div class="mz6-title"><b>Konten ${i+1}</b><div><button type="button" class="btn sm" data-a="mz6-up" data-i="${i}" ${i?'':'disabled'} title="Naik">↑</button><button type="button" class="btn sm" data-a="mz6-down" data-i="${i}" ${i<d.items.length-1?'':'disabled'} title="Turun">↓</button><button type="button" class="btn sm" data-a="mz6-del" data-i="${i}" ${d.items.length>1?'':'disabled'} title="Hapus">✕</button></div></div><label>Jenis konten<select data-mz6-item="${i}" data-field="type">${TYPES.map(t=>`<option value="${t}" ${it.type===t?'selected':''}>${{text:'Teks',image:'Gambar',card:'Card campuran',video:'Video'}[t]}</option>`).join('')}</select></label><label>Kategori<input data-mz6-item="${i}" data-field="category" maxlength="70" value="${esc(it.category)}"></label><label>Judul<input data-mz6-item="${i}" data-field="title" maxlength="150" value="${esc(it.title)}"></label><label>Isi / keterangan<textarea data-mz6-item="${i}" data-field="body" maxlength="2200" rows="2">${esc(it.body)}</textarea></label>${it.type!=='text'?`<label>URL gambar / video<input data-mz6-item="${i}" data-field="image" maxlength="1000" placeholder="https://..." value="${esc(it.image)}"></label>`:''}<label>Link tombol (opsional)<input data-mz6-item="${i}" data-field="link" maxlength="1000" placeholder="https://..." value="${esc(it.link)}"></label><div class="mz6-pair"><label>Tanggal (untuk Baru/Lama)<input type="date" data-mz6-item="${i}" data-field="date" value="${esc(it.date)}"></label><label>Skor populer (manual)<input type="number" min="0" max="999999" data-mz6-item="${i}" data-field="popularity" value="${it.popularity}"></label></div><label>Angka pengurutan custom<input type="number" min="0" max="999999" data-mz6-item="${i}" data-field="customOrder" value="${it.customOrder}"></label></div>`).join('');
 const opts=SORTS.map(k=>`<option value="${k}" ${d.sortDefault===k?'selected':''}>${esc(d.sortLabels[k])}</option>`).join('');
 return `<section class="mz6-editor" aria-label="Smart Filter Properties"><div class="mz6-title"><b>▦ Smart Filter Container</b><small>V8</small></div><p class="hint">Filter kategori tetap aktif. Pengurutan boleh ditampilkan atau disembunyikan.</p><label class="mz6-check"><input type="checkbox" data-mz6-config="showSorting" ${d.showSorting?'checked':''}> Tampilkan pilihan Urutkan</label><label class="mz6-check"><input type="checkbox" data-mz6-config="showImages" ${d.showImages?'checked':''}> Tampilkan gambar konten</label><label class="mz6-check"><input type="checkbox" data-mz6-config="showSearch" ${d.showSearch?'checked':''}> Aktifkan pencarian konten</label><label class="mz6-check"><input type="checkbox" data-mz6-config="showCategoryCounts" ${d.showCategoryCounts?'checked':''}> Tampilkan jumlah konten per kategori</label><label class="mz6-check"><input type="checkbox" data-mz6-config="pagination" ${d.pagination?'checked':''}> Aktifkan pagination</label>${d.pagination?`<label>Konten per halaman<select data-mz6-config="pageSize">${[3,6,9,12].map(n=>`<option value="${n}" ${d.pageSize===n?'selected':''}>${n} konten</option>`).join('')}</select></label>`:''}${d.showSearch?`<label>Teks placeholder pencarian<input maxlength="70" data-mz6-config="searchPlaceholder" value="${esc(d.searchPlaceholder)}"></label>`:''}<p class="hint">${d.showSorting?'Dropdown pengurutan AKTIF.':'Dropdown pengurutan NONAKTIF — konten mengikuti urutan manual di bawah.'}</p><label>Label kategori semua<input maxlength="42" data-mz6-config="allLabel" value="${esc(d.allLabel)}"></label>${d.showSorting?`<label>Urutan awal<select data-mz6-config="sortDefault">${opts}</select></label><details class="mz6-labels"><summary>Ubah nama opsi urut</summary>${SORTS.map(k=>`<label>${esc(SORT_LABELS[k])}<input maxlength="42" data-mz6-sort-label="${k}" value="${esc(d.sortLabels[k])}"></label>`).join('')}</details>`:''}<div class="mz6-pair"><label>Kolom Desktop<input type="number" min="1" max="4" data-mz6-config="columns" value="${d.columns}"></label><label>Kolom HP<input type="number" min="1" max="2" data-mz6-config="columnsMobile" value="${d.columnsMobile}"></label></div><label>Warna aksen<input type="color" data-mz6-config="accent" value="${d.accent}"></label><button type="button" class="btn sm" data-a="mz6-refresh" title="Regenerate HTML widget dari pengaturan yang tersimpan">↻ Update HTML Widget</button><div class="mz6-title"><b>Item (${d.items.length}/${MAX_ITEMS})</b><button type="button" class="btn sm pri" data-a="mz6-add" ${d.items.length>=MAX_ITEMS?'disabled':''}>+ Tambah Konten</button></div>${rows}<p class="hint">Kategori otomatis dibuat dari nama kategori tiap item. Tombol atas/bawah mengubah urutan asli. Skor populer diisi manual (bukan statistik pengunjung otomatis). Gunakan Preview untuk mencoba filter.</p></section>`;
}
function addUI(){
 if(!valid())return;
 const left=document.querySelector('#left');
 if(left&&S.tab==='elements'&&!left.querySelector('.mz6-library')){
  const h=document.createElement('div');h.className='mz6-library';h.innerHTML='<h4>▦ Konten Dinamis</h4><p class="hint">Filter teks, gambar, video, dan card. Urutkan opsional.</p><button type="button" class="btn sm" data-a="mz6-insert">+ Smart Filter Container</button>';
  left.prepend(h);
 }
}
if(typeof renderLeft==='function'){
 const old=renderLeft;renderLeft=function(){old();addUI()};
}
if(typeof renderRight==='function'){
 const old=renderRight;renderRight=function(){old();const r=document.querySelector('#right');if(r&&valid()&&!window.MozaVisualFilter){const html=inspector();if(html)r.insertAdjacentHTML('beforeend',html)}};
}
if(typeof renderTop==='function'){
 const old=renderTop;renderTop=function(){old();if(!valid())return;const t=document.querySelector('#top');if(t&&!t.querySelector('[data-a="mz6-insert"]')){
  const anchor=t.querySelector('[data-a="mz5-insert-accordion"]')||t.querySelector('[data-a="preview"]');
  if(anchor)anchor.insertAdjacentHTML('beforebegin','<button type="button" class="btn" data-a="mz6-insert" title="Tambah container filter dinamis">▦ Filter</button>');
 }};
}
ACT['mz6-insert']=add;
ACT['mz6-refresh']=()=>mutate(()=>{});
ACT['mz6-add']=()=>mutate(c=>{if(c.items.length<MAX_ITEMS)c.items.push({type:'card',category:'Umum',title:'Konten Baru',body:'Tulis konten di sini.',image:'',link:'',date:'',popularity:0,customOrder:c.items.length+1})});
ACT['mz6-del']=b=>mutate(c=>{if(c.items.length>1)c.items.splice(Number(b.dataset.i),1)});
ACT['mz6-up']=b=>mutate(c=>{const i=Number(b.dataset.i);if(i>0)[c.items[i-1],c.items[i]]=[c.items[i],c.items[i-1]]});
ACT['mz6-down']=b=>mutate(c=>{const i=Number(b.dataset.i);if(i<c.items.length-1)[c.items[i],c.items[i+1]]=[c.items[i+1],c.items[i]]});
document.addEventListener('change',ev=>{
 const el=ev.target;
 if(el.matches('[data-mz6-config]')){mutate(c=>{const k=el.dataset.mz6Config;if(k==='showSorting'||k==='showImages'||k==='showSearch'||k==='pagination'||k==='showCategoryCounts')c[k]=el.checked;else c[k]=el.value});return}
 if(el.matches('[data-mz6-sort-label]')){mutate(c=>{c.sortLabels=c.sortLabels||{};c.sortLabels[el.dataset.mz6SortLabel]=el.value});return}
 if(el.matches('[data-mz6-item]')){mutate(c=>{const it=c.items[Number(el.dataset.mz6Item)];if(!it)return;it[el.dataset.field]=el.value});}
});
window.MozaSmartFilter={version:'8.0.0',add,buildWidget,defaults,normalize,status:()=>({ready:valid(),selected:!!selected()?.mozaSmartFilter})};
try{if(valid()){renderLeft();renderRight();renderTop()}}catch(err){console.warn('[Moza V6] initial panel deferred',err)}
console.info('[Moza V6] Smart Filter installed — sorting is OFF by default. Atelier core unchanged.');
})();
