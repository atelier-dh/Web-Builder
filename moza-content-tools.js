/* Moza Studio Advanced V9 — Smart Filter content tools.
 * Additive import/export. Never reads, writes or replaces cloud/RSVP data.
 * Imports are validated and committed only after an explicit confirmation.
 */
(function(){
'use strict';
if(window.MozaContentTools)return;
const VERSION=9, LIMIT=30, MAX_FILE=1024*1024;
const FIELDS=['type','category','title','body','image','link','date','popularity','customOrder'];
const LIMITS={type:16,category:70,title:150,body:2200,image:1000,link:1000,date:10,popularity:12,customOrder:12};
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const ready=()=>typeof S!=='undefined'&&S?.mode==='design'&&Array.isArray(S?.doc?.pages)&&!!window.MozaSmartFilter;
const selected=()=>ready()&&S.sel?.k==='el'&&typeof T==='function'?T('el'):null;
const current=()=>{const e=selected();return e?.mozaSmartFilter?e:null};
const notify=s=>typeof toast==='function'?toast(s):console.info('[Moza Content Tools]',s);
let draft=null;
const namePart=()=>String(S?.doc?.name||'project').normalize('NFKD').replace(/[^a-z0-9-]/gi,'-').replace(/^-+|-+$/g,'').slice(0,45)||'project';
function download(text,filename,type){
 const url=URL.createObjectURL(new Blob([text],{type})),a=document.createElement('a');
 a.href=url;a.download=filename;document.body.appendChild(a);a.click();a.remove();
 setTimeout(()=>URL.revokeObjectURL(url),1500);return true;
}
function quoteCsv(value){
 let s=String(value??'');
 // Escape formula-like text for spreadsheet applications. Do not change model values.
 if(/^[\s]*[=+\-@\t\r]/.test(s))s="'"+s;
 return '"'+s.replace(/"/g,'""')+'"';
}
function toCsv(items){return '\ufeff'+[FIELDS.join(','),...items.map(item=>FIELDS.map(f=>quoteCsv(item[f])).join(','))].join('\r\n')+'\r\n'}
function exportCsv(){const e=current();if(!e)return false;
 const cfg=MozaSmartFilter.normalize(e.mozaSmartFilter);
 return download(toCsv(cfg.items),`moza-content-v9-${namePart()}.csv`,'text/csv;charset=utf-8');
}
function exportJson(){const e=current();if(!e)return false;
 const cfg=MozaSmartFilter.normalize(e.mozaSmartFilter);
 const backup={format:'moza-smart-filter-content',version:VERSION,exportedAt:new Date().toISOString(),items:cfg.items};
 return download(JSON.stringify(backup,null,2),`moza-content-v9-${namePart()}.json`,'application/json;charset=utf-8');
}
function parseCsv(text){
 text=String(text??'').replace(/^\ufeff/,'');
 if(!text.trim())throw Error('CSV kosong.');
 const rows=[],row=[];let field='',quoted=false,afterQuote=false;
 for(let i=0;i<text.length;i++){
  const c=text[i];
  if(quoted){if(c==='"'&&text[i+1]==='"'){field+='"';i++}else if(c==='"'){quoted=false;afterQuote=true}else field+=c;continue}
  if(afterQuote){if(c===' '||c==='\t')continue;afterQuote=false;if(c!==','&&c!=='\r'&&c!=='\n')throw Error('Kutip CSV tidak valid di dekat baris '+(rows.length+1));}
  if(c==='"'&&!field){quoted=true;continue}
  if(c===','){row.push(field);field='';continue}
  if(c==='\n'||c==='\r'){
   row.push(field);if(row.some(x=>x.trim()!==''))rows.push(row.slice());row.length=0;field='';
   if(c==='\r'&&text[i+1]==='\n')i++;continue;
  }
  if(c==='"')throw Error('Tanda kutip di tengah kolom harus ditulis dua kali.');
  field+=c;
 }
 if(quoted)throw Error('CSV memiliki tanda kutip yang belum ditutup.');
 if(field||row.length){row.push(field);if(row.some(x=>x.trim()!==''))rows.push(row.slice())}
 if(!rows.length)throw Error('CSV kosong.');
 const headers=rows.shift().map(x=>x.trim().replace(/^\ufeff/,''));
 if(new Set(headers).size!==headers.length)throw Error('Header CSV duplikat.');
 if(!headers.includes('title'))throw Error('Kolom title wajib ada.');
 const unknown=headers.filter(h=>!FIELDS.includes(h));if(unknown.length)throw Error('Kolom tidak dikenal: '+unknown.slice(0,3).join(', '));
 if(rows.length>LIMIT)throw Error(`Maksimal ${LIMIT} baris konten per impor.`);
 return rows.map((cols,i)=>{if(cols.length!==headers.length)throw Error('Jumlah kolom tidak sesuai pada baris '+(i+2));return Object.fromEntries(headers.map((key,j)=>[key,cols[j]]))});
}
function validDate(s){if(!/^\d{4}-\d{2}-\d{2}$/.test(s))return false;const [y,m,d]=s.split('-').map(Number);const dt=new Date(Date.UTC(y,m-1,d));return dt.getUTCFullYear()===y&&dt.getUTCMonth()===m-1&&dt.getUTCDate()===d;}
function validateItems(items){
 if(!Array.isArray(items)||!items.length)throw Error('File tidak berisi daftar konten.');
 if(items.length>LIMIT)throw Error(`Maksimal ${LIMIT} konten untuk satu Smart Filter.`);
 return items.map((x,i)=>{
  if(!x||typeof x!=='object'||Array.isArray(x))throw Error(`Konten ${i+1} bukan objek valid.`);
  const it={};
  for(const key of FIELDS){const value=x[key]??'';
   if(typeof value==='object'||typeof value==='boolean')throw Error(`Kolom ${key} pada konten ${i+1} tidak valid.`);
   const s=String(value);if(s.length>LIMITS[key])throw Error(`Kolom ${key} konten ${i+1} terlalu panjang.`);
   it[key]=s;
  }
  if(!it.title.trim())throw Error(`Judul konten ${i+1} wajib diisi.`);
  if(it.type&&!['text','image','card','video'].includes(it.type))throw Error(`Jenis konten ${i+1} tidak dikenal.`);
  if(it.date&&!validDate(it.date))throw Error(`Tanggal konten ${i+1} tidak valid.`);
  for(const key of ['popularity','customOrder'])if(it[key]!==''&&(!/^\d+(?:\.\d+)?$/.test(it[key])||Number(it[key])>999999))throw Error(`Nilai ${key} konten ${i+1} harus 0–999999.`);
  // Prefix added by our own CSV export prevents spreadsheet formula execution.
  // Do NOT blindly strip it: it may be part of a real user's title.
  it.type=it.type||'card';it.category=it.category||'Umum';
  it.popularity=it.popularity===''?0:Number(it.popularity);
  it.customOrder=it.customOrder===''?i:Number(it.customOrder);
  return it;
 });
}
function decodeFile(text,type){
 let data;if(type==='json'){try{data=JSON.parse(text.replace(/^\ufeff/,''))}catch{throw Error('Berkas JSON tidak valid.')}if(!Array.isArray(data)&&!(data&&data.format==='moza-smart-filter-content'&&Array.isArray(data.items)))throw Error('Format JSON tidak dikenali. Gunakan ekspor Moza V9 atau array konten.');}
 else if(type==='csv')data=parseCsv(text);else throw Error('Hanya .csv dan .json yang didukung.');
 return validateItems(Array.isArray(data)?data:data.items);
}
function selection(){const e=current();return e?.id||null}
function setDraft(items,filename){const id=selection();if(!id)throw Error('Pilih Smart Filter di canvas dahulu.');draft={id,doc:S.doc,items:validateItems(items),filename:filename||'data'};paint();return {count:draft.items.length,filename:draft.filename};}
function previewInfo(){return draft&&draft.doc===S.doc&&draft.id===selection()?{filename:draft.filename,count:draft.items.length,titles:draft.items.slice(0,3).map(x=>x.title)}:null}
function applyImport(mode='replace'){
 const e=current();if(!e||e.locked||!draft||draft.doc!==S.doc||draft.id!==e.id)return false;
 if(!['replace','append'].includes(mode))return false;
 const before=MozaSmartFilter.normalize(e.mozaSmartFilter).items;
 const count=(mode==='append'?before.length:0)+draft.items.length;
 if(count>LIMIT){notify(`Jumlah ${count} melewati batas ${LIMIT} konten. Gunakan Ganti Semua atau kurangi item.`);return false}
 const message=mode==='replace'?`Ganti seluruh ${before.length} konten pada Smart Filter dengan ${draft.items.length} item dari ${draft.filename}?`:`Tambahkan ${draft.items.length} konten ke ${before.length} konten yang sudah ada?`;
 if(!window.confirm(message+'\nPerubahan dapat di-Undo dari editor.'))return false;
 const combined=mode==='append'?[...before,...draft.items]:draft.items;
 if(typeof commit==='function'&&typeof discrete==='function')commit(discrete());
 e.mozaSmartFilter=MozaSmartFilter.normalize({...e.mozaSmartFilter,items:combined});
 e.embedCode=MozaSmartFilter.buildWidget(e.mozaSmartFilter);e.embedKind='widget';e.embedLive=true;
 draft=null;if(typeof afterEdit==='function')afterEdit();notify(`Impor selesai: ${combined.length} konten. Cek hasil di Preview.`);return true;
}
function panel(){
 const e=current();if(!e)return '';
 const info=previewInfo();return `<section class="mz9-tools" aria-label="Smart Filter Content Manager"><div class="mz9-heading"><b>↕ Content Manager</b><small>Advanced V9</small></div><p class="hint">Impor CSV/JSON untuk mengganti atau menambah konten (maks. ${LIMIT}). Tinjau hasil sebelum mengubah project.</p><div class="mz9-actions"><button type="button" class="btn sm" data-mz9="export-csv">↓ CSV</button><button type="button" class="btn sm" data-mz9="export-json">↓ JSON</button></div><label class="mz9-upload">Pilih data CSV atau JSON<input type="file" data-mz9-file accept=".csv,.json,text/csv,application/json"></label>${info?`<div class="mz9-preview" role="status"><b>${info.count} item siap diimpor</b><div>${esc(info.filename)}</div><small>${info.titles.map(esc).join(' · ')}</small></div><label>Metode impor<select data-mz9-mode><option value="replace">Ganti semua konten</option><option value="append">Tambahkan ke konten saat ini</option></select></label><button type="button" class="btn pri sm" data-mz9="apply">Terapkan Impor (dengan konfirmasi)</button>`:'<p class="hint">Kolom CSV: type, category, title, body, image, link, date, popularity, customOrder. Minimal kolom title.</p>'}</section>`;
}
function paint(){const right=document.getElementById('right');if(!right)return;right.querySelector('.mz9-tools')?.remove();const html=panel();if(html)right.insertAdjacentHTML('beforeend',html);}
if(typeof renderRight==='function'){const original=renderRight;renderRight=function(...args){const out=original(...args);paint();return out}}
document.addEventListener('click',ev=>{
 const button=ev.target.closest?.('[data-mz9]');if(!button||!button.closest('.mz9-tools'))return;
 const op=button.dataset.mz9;if(op==='export-csv')exportCsv();if(op==='export-json')exportJson();
 if(op==='apply')applyImport(document.querySelector('.mz9-tools [data-mz9-mode]')?.value||'replace');
});
document.addEventListener('change',async ev=>{
 const input=ev.target;if(!input.matches?.('[data-mz9-file]'))return;
 const file=input.files?.[0];if(!file)return;const owner=selection();
 try{if(file.size>MAX_FILE)throw Error('File terlalu besar (maks. 1 MB).');const ext=/\.([a-z]+)$/i.exec(file.name)?.[1]?.toLowerCase();
  const items=decodeFile(await file.text(),ext);if(!current()||selection()!==owner){notify('Pemilihan elemen berubah. Silakan pilih file lagi.');return;}
  setDraft(items,file.name);paint();notify(`${items.length} konten dibaca. Belum ada perubahan sampai tombol Terapkan dipilih.`);
 }catch(err){draft=null;paint();notify('Impor ditolak: '+err.message);}
});
window.MozaContentTools={version:'9.0.0',parseCsv,validateItems,decodeFile,toCsv,exportCsv,exportJson,setDraft,previewInfo,applyImport,panel,status:()=>({ready:ready(),selected:!!current(),pending:!!previewInfo()})};
try{paint()}catch(err){console.warn('[Moza V9] panel deferred',err)}
console.info('[Moza V9] Smart Filter content manager installed (local only).');
})();
