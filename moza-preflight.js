/* Moza Studio Advanced V10 — read-only preflight review.
 * Local content/metadata checks; no publish claims or cloud/RSPV access.
 */
(function(){
'use strict';
if(window.MozaPreflight)return;
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const safeArray=x=>Array.isArray(x)?x:[];
const ready=()=>typeof S!=='undefined'&&Array.isArray(S?.doc?.pages)&&S?.mode==='design';
const hasText=x=>typeof x==='string'&&x.trim().length>0;
const problems=[];
const URI_RE=/^(?:(?:https?:)?\/\/|\.\/?|\.\.\/|\/|#|mailto:|tel:)/i;
const mediaExt=/\.(?:mp4|webm|ogg)(?:[?#].*)?$/i;
function linkStatus(value){
 if(!value)return 'empty';const v=String(value).trim();if(!v)return 'empty';
 if(/[\u0000-\u001f<>"']/.test(v))return 'unsafe';
 if(/^(?:javascript|data|vbscript|file|blob):/i.test(v))return 'unsafe';
 if(/^[a-z][\w+.-]*:/i.test(v)&&!(/^(?:https?|mailto|tel):/i.test(v)))return 'unsafe';
 if(/^(?:https?):/i.test(v)){try{const u=new URL(v);return ['https:','http:'].includes(u.protocol)?'ok':'unsafe'}catch{return 'invalid'}}
 return URI_RE.test(v)?'ok':'relative';
}
const report=()=>{
 const items=[],counts={error:0,warning:0,info:0},stats={pages:0,sections:0,elements:0,smartFilters:0,interactiveWidgets:0,images:0,linksChecked:0};
 if(!ready())return{ready:false,items,counts,stats};
 const add=(severity,code,where,message,fix)=>{items.push({severity,code,where,message,fix});counts[severity]++};
 const names=new Map();
 const docs=S.doc.pages, pageIds=new Set(docs.map(p=>p.id));
 const checkLink=(value,where,label)=>{if(!hasText(value))return;stats.linksChecked++;const st=linkStatus(value);
  if(st==='unsafe'||st==='invalid')add('error','unsafe-link',where,`${label}: URL tidak aman atau tidak valid`, 'Gunakan HTTPS, mailto, tel, atau tautan internal yang valid.');
  if(st==='relative')add('info','unqualified-link',where,`${label}: alamat relatif tanpa awalan`, 'Pastikan tautan bekerja setelah publish, atau gunakan URL lengkap.');
 };
 const visit=(nodes,path)=>{
  for(const e of safeArray(nodes)){
   stats.elements++;const where=path+' / '+(e.name||e.type||'Elemen');
   if(e.type==='image'){
    stats.images++;if(!hasText(e.alt))add('warning','image-alt',where,'Gambar belum memiliki alt text.', 'Isi deskripsi gambar pada Properties untuk pembaca layar.');
    if(!e.asset)add('info','image-placeholder',where,'Gambar belum memakai aset.', 'Pilih foto yang benar atau pastikan placeholder disengaja.');
   }
   if(e.type==='video'&&!e.url&&!e.asset&&!e.videoAsset)add('info','video-placeholder',where,'Video belum memiliki media sumber.', 'Tambahkan sumber video atau biarkan sebagai placeholder jika disengaja.');
   if(e.link?.t==='url')checkLink(e.link.v,where,'Link elemen');
   for(const ix of safeArray(e.ix)){
    if(ix?.a==='url'||ix?.t==='url'||ix?.type==='url')checkLink(ix.url||ix.v,where,'Interaksi tautan');
    if(ix?.a==='page'||ix?.t==='page'){const id=ix.v||ix.page;if(id&&!pageIds.has(id))add('warning','missing-page',where,'Interaksi mengarah ke halaman yang tidak ditemukan.', 'Pilih ulang halaman tujuan pada Properties.');}
   }
   if(e.mozaSmartFilter){
    stats.smartFilters++;
    const config=e.mozaSmartFilter,content=safeArray(config.items),seen=new Set();
    if(!content.length)add('error','empty-filter',where,'Smart Filter tidak memiliki konten.', 'Tambahkan minimal satu item.');
    content.forEach((it,j)=>{
     const loc=where+` / Item ${j+1}`;
     if(!hasText(it?.title))add('error','filter-title',loc,'Judul konten kosong.', 'Isi judul agar item mudah dikenali.');
     if(!hasText(it?.category))add('warning','filter-category',loc,'Kategori konten kosong.', 'Isi kategori agar filter bekerja sesuai harapan.');
     const key=String(it?.title||'').trim().toLocaleLowerCase();
     if(key&&seen.has(key))add('info','duplicate-title',loc,'Judul konten sama dengan item lain dalam widget.', 'Pastikan duplikasi memang disengaja.');
     if(key)seen.add(key);
     checkLink(it?.link,loc,'Tautan konten');
     const kind=it?.type||'card',source=String(it?.image||'').trim();
     if(kind==='image'&&!source)add('warning','missing-media',loc,'Konten gambar tanpa URL gambar.', 'Isi URL gambar pada Properties.');
     if(kind==='video'){
      if(!source)add('warning','missing-media',loc,'Konten video tanpa URL sumber.', 'Isi URL video .mp4, .webm atau .ogg.');
      else if(!mediaExt.test(source))add('warning','video-format',loc,'URL video tidak berakhiran format native yang didukung.', 'Gunakan tautan langsung ke .mp4, .webm atau .ogg (bukan halaman YouTube).');
      if(source)checkLink(source,loc,'Sumber video');
     }else if(source)checkLink(source,loc,'Sumber gambar');
    });
   }
   if(e.mozaWidget){stats.interactiveWidgets++;const w=e.mozaWidget;if(!safeArray(w.items).length)add('error','empty-widget',where,'Widget interaktif tidak mempunyai item.', 'Tambahkan minimal satu panel.');
    safeArray(w.items).forEach((it,j)=>{if(!hasText(it?.title))add('warning','widget-title',where+` / Item ${j+1}`,'Judul panel kosong.', 'Isi judul tab/accordion pada Properties.');});
   }
   visit(e.children,where);
  }
 };
 for(const [pi,p] of docs.entries()){
  stats.pages++;const pageName=p.name||'Halaman '+(pi+1),path=pageName;
  if(!hasText(p.name))add('warning','page-name',path,'Nama halaman kosong.', 'Beri nama halaman yang jelas.');
  const key=pageName.trim().toLocaleLowerCase();if(names.has(key))add('info','duplicate-page-name',path,'Nama halaman sama dengan halaman lain.', 'Pertimbangkan nama unik untuk navigasi yang jelas.');else names.set(key,true);
  for(const [si,sec] of safeArray(p.sections).entries()){
   stats.sections++;visit(sec.elements,`${path} / ${sec.name||'Section '+(si+1)}`);
  }
 }
 if(window.MozaQuality?.report){const base=MozaQuality.report();for(const it of safeArray(base.issues)){
  const severity=/^duplicate|alias-cycle|widget$/.test(it.code)?'error':'warning';
  add(severity,'metadata-'+it.code,'Project Audit',it.label,it.repairable?'Buka ✦ Audit → Rapikan referensi aman (dengan Undo).':'Buka ✦ Audit untuk detail dan periksa manual.');
 }}
 return{ready:true,stats,counts,items};
};
let selectedSeverity='all';
function payload(){const r=report();return{format:'moza-preflight',version:10,generatedAt:new Date().toISOString(),projectName:String(S?.doc?.name||'Project'),...r,limitations:'Pemeriksaan statis dan lokal. Tidak memverifikasi login, koneksi cloud, RSVP, URL yang benar-benar aktif, maupun hasil publish.'}}
function download(text,name,mime){const url=URL.createObjectURL(new Blob([text],{type:mime})),a=document.createElement('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1300);return true}
function filename(){return String(S?.doc?.name||'project').normalize('NFKD').replace(/[^a-z0-9-]/gi,'-').replace(/^-+|-+$/g,'').slice(0,45)||'project'}
function csvCell(v){let s=String(v??'');if(/^[\s]*[=+\-@\t\r]/.test(s))s="'"+s;return '"'+s.replace(/"/g,'""')+'"'}
function toCsv(p){const cols=['severity','code','where','message','fix'];return '\ufeff'+[cols.join(','),...p.items.map(i=>cols.map(k=>csvCell(i[k])).join(','))].join('\r\n')+'\r\n'}
const exportCsv=()=>ready()&&download(toCsv(payload()),`moza-preflight-v10-${filename()}.csv`,'text/csv;charset=utf-8');
const exportJson=()=>ready()&&download(JSON.stringify(payload(),null,2),`moza-preflight-v10-${filename()}.json`,'application/json;charset=utf-8');
const modal=()=>document.querySelector('#moza10-overlay');
function paint(){const root=modal();if(!root)return;
 const r=report();const filtered=r.items.filter(i=>selectedSeverity==='all'||i.severity===selectedSeverity);
 const badges=[['error','Error'],['warning','Perlu dicek'],['info','Informasi']].map(([k,label])=>`<div class="mz10-stat"><b>${r.counts[k]}</b><span>${label}</span></div>`).join('');
 root.querySelector('.mz10-results').innerHTML=`<div class="mz10-counts">${badges}</div><div class="mz10-filter"><label for="mz10-severity">Tampilkan</label><select id="mz10-severity"><option value="all" ${selectedSeverity==='all'?'selected':''}>Semua temuan (${r.items.length})</option><option value="error" ${selectedSeverity==='error'?'selected':''}>Error</option><option value="warning" ${selectedSeverity==='warning'?'selected':''}>Perlu dicek</option><option value="info" ${selectedSeverity==='info'?'selected':''}>Informasi</option></select></div>`+
 (filtered.length?`<ul class="mz10-list">${filtered.slice(0,100).map(it=>`<li><span class="mz10-level mz10-${it.severity}">${esc(it.severity)}</span><div><b>${esc(it.message)}</b><small>${esc(it.where)}</small><p>${esc(it.fix)}</p></div></li>`).join('')}</ul>${filtered.length>100?`<p>Menampilkan 100 dari ${filtered.length} temuan. Ekspor untuk melihat seluruhnya.</p>`:''}`:'<div class="mz10-empty">Tidak ada temuan pada kategori ini.</div>')+`<p class="mz10-footnote">Hasil ini hanya pemeriksaan statis lokal. Tetap uji Preview desktop/HP serta integrasi cloud sebelum publish.</p>`;
}
function close(){const root=modal();if(!root)return;root.remove();document.querySelector('#top [data-a="mz10-open"]')?.focus()}
function open(){if(!ready()){typeof toast==='function'&&toast('Buka Design Editor dahulu.');return false}if(modal()){paint();return true}
 const root=document.createElement('div');root.id='moza10-overlay';root.className='mz10-overlay';
 root.innerHTML=`<div class="mz10-dialog" role="dialog" aria-modal="true" aria-label="Moza V10 Preflight Review"><header><div><b>✓ Advanced V10 · Preflight Review</b><p>Pemeriksaan konten dan metadata sebelum publish — tanpa koneksi server.</p></div><button class="btn sm" data-mz10="close" aria-label="Tutup Preflight">✕</button></header><div class="mz10-results"></div><footer><button class="btn sm" data-mz10="refresh">↻ Cek ulang</button><button class="btn sm" data-mz10="csv">↓ CSV</button><button class="btn sm" data-mz10="json">↓ JSON</button></footer></div>`;
 document.body.appendChild(root);root.addEventListener('click',ev=>{const b=ev.target.closest?.('[data-mz10]');if(!b){if(ev.target===root)close();return}const cmd=b.dataset.mz10;if(cmd==='close')close();if(cmd==='refresh')paint();if(cmd==='csv')exportCsv();if(cmd==='json')exportJson()});
 root.addEventListener('change',ev=>{if(ev.target.id==='mz10-severity'){selectedSeverity=ev.target.value;paint();root.querySelector('#mz10-severity')?.focus()}});
 paint();root.querySelector('[data-mz10="close"]').focus();return true;
}
document.addEventListener('keydown',ev=>{
 const root=modal();if(!root)return;
 if(ev.key==='Escape'){ev.preventDefault();ev.stopImmediatePropagation();close();return}
 if(ev.key!=='Tab')return;
 const all=[...root.querySelectorAll('button:not(:disabled),select:not(:disabled)')].filter(el=>el.getClientRects().length);if(!all.length)return;
 const first=all[0],last=all[all.length-1];
 if(ev.shiftKey&&(document.activeElement===first||!root.contains(document.activeElement))){ev.preventDefault();last.focus()}
 else if(!ev.shiftKey&&(document.activeElement===last||!root.contains(document.activeElement))){ev.preventDefault();first.focus()}
},true);
if(typeof renderTop==='function'){const original=renderTop;renderTop=function(...args){const out=original(...args);const top=document.querySelector('#top');if(ready()&&top&&!top.querySelector('[data-a="mz10-open"]')){
 const near=top.querySelector('[data-a="mz7-audit"]')||top.querySelector('[data-a="preview"]');if(near)near.insertAdjacentHTML('beforebegin','<button type="button" class="btn" data-a="mz10-open" title="Periksa konten sebelum publish">✓ Preflight</button>');
 }return out}}
if(typeof ACT!=='undefined')ACT['mz10-open']=open;
window.MozaPreflight={version:'10.0.0',linkStatus,report,payload,toCsv,exportCsv,exportJson,open,close,status:()=>({ready:ready(),issues:ready()?report().items.length:0})};
try{if(ready()&&S.mode==='design')renderTop()}catch(err){console.warn('[Moza V10] toolbar deferred',err)}
console.info('[Moza V10] Preflight Review installed (read-only).');
})();
