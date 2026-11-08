/* Moza Studio Advanced V12 — Release Center
 * Read-only local workflow. No cloud calls, save interception, data repair or publish gating.
 * Manual verification lives in this tab only; its marks reset if the project document changes.
 */
(function(){
'use strict';
if(window.MozaReleaseCenter)return;
const VERSION='12.0.0';
const TASKS=[
 {id:'desktop',label:'Preview desktop diperiksa',detail:'Cek tipografi, posisi elemen, gambar, dan setiap halaman.'},
 {id:'mobile',label:'Preview mobile diperiksa',detail:'Cek HP: menu, scroll, tap target, dan tata letak responsif.'},
 {id:'links',label:'Tautan dan widget dicoba',detail:'Coba navigasi, tombol, Accordion, Tabs, Smart Filter, dan media yang dipakai.'},
 {id:'rsvp',label:'RSVP/form diuji di staging',detail:'Jika digunakan, kirim percobaan lalu verifikasi penerimaan dan dashboard. Pilih N/A bila tidak memakai form.'},
 {id:'cloud',label:'Penyimpanan dan buka ulang diuji',detail:'Simpan, reload, buka ulang project di staging, dan periksa apakah perubahan tetap ada.'},
 {id:'publish',label:'Publish staging diuji',detail:'Pastikan URL dan konten publik benar sebelum mengganti produksi.'}
];
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const ready=()=>typeof S!=='undefined'&&S?.mode==='design'&&S?.doc&&Array.isArray(S.doc.pages);
const modal=()=>document.getElementById('mz12-overlay');
const manualByProject=new Map();
let focusBefore=null,notice='',noticeIsError=false;
const projectId=()=>String(S?.pid||'no-id')+'::'+String(S?.doc?.id||'');
const projectName=()=>String(S?.doc?.name||'Project');
function docSignature(){
 if(!ready())return null;
 // A fast non-cryptographic change sentinel; NOT proof of file integrity.
 const data=JSON.stringify(S.doc);
 let hash=2166136261;
 for(let i=0;i<data.length;i++){hash^=data.charCodeAt(i);hash=Math.imul(hash,16777619);}
 return data.length.toString(16)+'-'+(hash>>>0).toString(16);
}
function state(){
 if(!ready())return null;
 const key=projectId(),sig=docSignature();
 let s=manualByProject.get(key);
 if(!s||s.signature!==sig){s={signature:sig,checks:{},reset:!!s};manualByProject.set(key,s);}
 return s;
}
function setManual(id,value){
 if(!TASKS.some(t=>t.id===id)||!['pending','done','na'].includes(value))return false;
 const s=state();if(!s)return false;s.checks[id]=value;return true;
}
function collect(){
 if(!ready())return{ready:false,reason:'Buka project dalam Design Editor terlebih dahulu.'};
 const s=state(),missing=[];
 let audit=null,preflight=null;
 try{if(typeof window.MozaQuality?.report==='function')audit=window.MozaQuality.report();else missing.push('Project Audit V8 tidak tersedia.');}
 catch(e){missing.push('Project Audit gagal dijalankan: '+String(e.message||e).slice(0,150));}
 try{if(typeof window.MozaPreflight?.report==='function')preflight=window.MozaPreflight.report();else missing.push('Preflight V10 tidak tersedia.');}
 catch(e){missing.push('Preflight gagal dijalankan: '+String(e.message||e).slice(0,150));}
 if(audit&&!audit.ready)missing.push('Project Audit belum siap.');
 if(preflight&&!preflight.ready)missing.push('Preflight belum siap.');
 const checks=Object.fromEntries(TASKS.map(t=>[t.id,s.checks[t.id]||'pending']));
 const done=Object.values(checks).filter(x=>x==='done').length;
 const na=Object.values(checks).filter(x=>x==='na').length;
 const pending=TASKS.length-done-na;
 const auditCount=Array.isArray(audit?.issues)?audit.issues.length:0;
 const counts={error:Number(preflight?.counts?.error)||0,warning:Number(preflight?.counts?.warning)||0,info:Number(preflight?.counts?.info)||0};
 const blockers=counts.error+auditCount;
 const status=missing.length?'unavailable':blockers?'needs-fix':counts.warning||pending?'needs-review':'ready-for-staging';
 return {ready:true,projectName:projectName(),projectId:projectId(),revision:s.signature,manualReset:s.reset,counts, auditCount,
  auditStats:audit?.stats||{},preflightStats:preflight?.stats||{},missing,manual:checks,progress:{done,na,pending,total:TASKS.length},status,
  caveat:'Status adalah rangkuman pemeriksaan lokal dan konfirmasi manual pengguna, bukan verifikasi hasil publish, cloud, RSVP, atau kesiapan produksi.'};
}
function statusLabel(r){return{unavailable:'Pemeriksaan belum lengkap','needs-fix':'Ada temuan yang harus diperbaiki','needs-review':'Masih perlu pemeriksaan','ready-for-staging':'Checklist lokal lengkap — lanjut evaluasi staging'}[r.status]||'Belum tersedia';}
function snapshotReport(){
 const r=collect();if(!r.ready)throw Error(r.reason||'Editor belum siap.');
 return{format:'moza-release-review',schemaVersion:1,appVersion:VERSION,generatedAt:new Date().toISOString(),projectName:r.projectName,
  documentRevisionSentinel:r.revision,status:r.status,statusLabel:statusLabel(r),
  projectAudit:{findings:r.auditCount,stats:r.auditStats},preflight:{counts:r.counts,stats:r.preflightStats},
  manualChecklist:TASKS.map(t=>({id:t.id,label:t.label,status:r.manual[t.id]})),missingChecks:r.missing,
  caveat:r.caveat,privacy:'Laporan ringkas; tidak memuat isi elemen, daftar tamu, respons RSVP, atau media project. Simpan tetap sebagai dokumen internal.'};
}
function downloadReport(){
 const report=snapshotReport(),slug=report.projectName.normalize('NFKD').replace(/[^a-z0-9-]+/gi,'-').replace(/^-+|-+$/g,'').slice(0,48)||'project';
 const url=URL.createObjectURL(new Blob([JSON.stringify(report,null,2)],{type:'application/json;charset=utf-8'}));
 const a=document.createElement('a');a.href=url;a.download=`moza-v12-release-${slug}.json`;document.body.appendChild(a);a.click();a.remove();
 setTimeout(()=>URL.revokeObjectURL(url),1500);return true;
}
function summaryMarkup(r){
 const statRows=[['Audit metadata',r.auditCount,'masalah referensi'],['Preflight error',r.counts.error,'error'],['Preflight warning',r.counts.warning,'perlu dicek'],['Tes manual',r.progress.done+r.progress.na,`dari ${r.progress.total} ditandai`]];
 return `<div class="mz12-status mz12-${esc(r.status)}" role="status"><b>${esc(statusLabel(r))}</b><span>Ini hanya kesiapan review lokal, bukan persetujuan publish produksi.</span></div>`+
 `<div class="mz12-stats">${statRows.map(([label,num,unit])=>`<div class="mz12-stat"><span>${esc(label)}</span><b>${num}</b><small>${esc(unit)}</small></div>`).join('')}</div>`+
 (r.missing.length?`<div class="mz12-alert" role="alert">${r.missing.map(x=>`<p>${esc(x)}</p>`).join('')}</div>`:'')+
 (r.manualReset?'<p class="mz12-note">Checklist manual direset karena isi dokumen berubah sejak pemeriksaan sebelumnya.</p>':'');
}
function checksMarkup(r){return '<div class="mz12-checks">'+TASKS.map(t=>{
 const value=r.manual[t.id];
 return `<div class="mz12-check"><div><b>${esc(t.label)}</b><small>${esc(t.detail)}</small></div><label class="mz12-select-label"><span class="mz12-sr">Status: ${esc(t.label)}</span><select data-mz12-check="${t.id}" aria-label="Status ${esc(t.label)}"><option value="pending" ${value==='pending'?'selected':''}>Belum dicek</option><option value="done" ${value==='done'?'selected':''}>Sudah diuji</option><option value="na" ${value==='na'?'selected':''}>Tidak berlaku</option></select></label></div>`;}).join('')+'</div>';}
function paint(){
 const root=modal();if(!root)return;
 const r=collect(),target=root.querySelector('.mz12-results');
 if(!r.ready){target.innerHTML='<p class="mz12-alert">'+esc(r.reason)+'</p>';return;}
 root.querySelector('.mz12-project').textContent=r.projectName;
 target.innerHTML=summaryMarkup(r)+`<h3>Checklist sebelum publish</h3><p class="mz12-note">Pilih “Sudah diuji” hanya setelah tes nyata. “Tidak berlaku” untuk fitur yang tidak dipakai. Checklist disimpan sementara pada tab ini dan direset saat dokumen diubah.</p>`+checksMarkup(r);
 const msg=root.querySelector('.mz12-message');msg.textContent=notice;msg.classList.toggle('mz12-error',noticeIsError);
}
function reportNotice(msg,error=false){notice=String(msg);noticeIsError=error;const node=modal()?.querySelector('.mz12-message');if(node){node.textContent=notice;node.classList.toggle('mz12-error',error);}}
function close(restore=true){const root=modal();if(!root)return;root.remove();if(restore)focusBefore?.focus?.();focusBefore=null;notice='';}
function launch(name){
 const opens={audit:window.MozaQuality?.open,preflight:window.MozaPreflight?.open,compare:window.MozaVersionCompare?.open};
 if(!opens[name]){reportNotice('Fitur yang dipilih tidak tersedia pada build ini.',true);return false;}
 close(false);return opens[name]();
}
function backup(){
 if(!ready()||typeof ACT==='undefined'||typeof ACT['pr-export']!=='function'){reportNotice('Ekspor backup bawaan Atelier tidak tersedia.',true);return false;}
 ACT['pr-export']();reportNotice('Perintah ekspor backup Atelier dijalankan. Periksa file hasil unduhan.');return true;
}
function preview(){
 if(!ready()||typeof ACT==='undefined'||typeof ACT.preview!=='function'){reportNotice('Preview bawaan Atelier tidak tersedia.',true);return false;}
 close(false);ACT.preview();return true;
}
function open(){
 if(!ready()){if(typeof toast==='function')toast('Buka Design Editor dahulu.');return false;}
 if(modal()){paint();return true;}
 focusBefore=document.activeElement;
 const root=document.createElement('div');root.id='mz12-overlay';root.className='mz12-overlay';
 root.innerHTML=`<div class="mz12-dialog" role="dialog" aria-modal="true" aria-labelledby="mz12-title"><header><div><h2 id="mz12-title">🚀 Advanced V12 · Release Center</h2><p>Review project sebelum publish. <strong class="mz12-project"></strong></p></div><button type="button" class="btn sm" data-mz12="close" aria-label="Tutup Release Center">✕</button></header><div class="mz12-results"></div><section class="mz12-quick"><h3>Alat pemeriksaan &amp; backup</h3><div class="mz12-actions"><button type="button" class="btn sm" data-mz12="refresh">↻ Periksa ulang</button><button type="button" class="btn sm" data-mz12="audit">✦ Project Audit</button><button type="button" class="btn sm" data-mz12="preflight">✓ Preflight detail</button><button type="button" class="btn sm" data-mz12="compare">◇ Version Compare</button><button type="button" class="btn sm" data-mz12="backup">↓ Backup Atelier</button><button type="button" class="btn sm" data-mz12="preview">◉ Preview</button></div></section><p class="mz12-message" role="status" aria-live="polite"></p><footer><button type="button" class="btn" data-mz12="export">↓ Laporan rilis JSON</button><button type="button" class="btn" data-mz12="close">Tutup</button></footer><p class="mz12-footnote">Tidak melakukan publish, menyimpan project, memperbaiki metadata, atau mengirim data ke server. Tes cloud/RSVP/publish hanya bisa diverifikasi di staging sebenarnya.</p></div>`;
 document.body.appendChild(root);
 root.addEventListener('click',ev=>{
  const btn=ev.target.closest?.('[data-mz12]');if(!btn){if(ev.target===root)close();return;}
  const cmd=btn.dataset.mz12;
  try{
   if(cmd==='close')close();else if(cmd==='refresh'){reportNotice('Pemeriksaan lokal diperbarui.');paint();}
   else if(['audit','preflight','compare'].includes(cmd))launch(cmd);
   else if(cmd==='backup')backup();else if(cmd==='preview')preview();
   else if(cmd==='export'){downloadReport();reportNotice('Laporan ringkas JSON disiapkan untuk diunduh.');}
  }catch(err){reportNotice(err.message||String(err),true);}
 });
 root.addEventListener('change',ev=>{
  const field=ev.target.closest?.('[data-mz12-check]');if(!field)return;
  const id=field.dataset.mz12Check;
  if(setManual(id,field.value)){reportNotice('Checklist diperbarui untuk versi dokumen saat ini.');paint();root.querySelector(`[data-mz12-check="${id}"]`)?.focus();}
 });
 paint();root.querySelector('[data-mz12="close"]')?.focus();return true;
}
document.addEventListener('keydown',ev=>{
 const root=modal();if(!root)return;
 if(ev.key==='Escape'){ev.preventDefault();ev.stopImmediatePropagation();close();return;}
 if(ev.key!=='Tab')return;
 const focusable=[...root.querySelectorAll('button:not(:disabled),select:not(:disabled)')].filter(e=>e.getClientRects().length);
 if(!focusable.length)return;
 const first=focusable[0],last=focusable[focusable.length-1];
 if(ev.shiftKey&&(document.activeElement===first||!root.contains(document.activeElement))){ev.preventDefault();last.focus();}
 else if(!ev.shiftKey&&(document.activeElement===last||!root.contains(document.activeElement))){ev.preventDefault();first.focus();}
},true);
if(typeof renderTop==='function'){
 const prev=renderTop;
 renderTop=function(...args){const result=prev.apply(this,args),top=document.querySelector('#top');
  if(ready()&&top&&!top.querySelector('[data-a="mz12-open"]')){
   const near=top.querySelector('[data-a="mz11-open"]')||top.querySelector('[data-a="preview"]');
   if(near)near.insertAdjacentHTML('beforebegin','<button type="button" class="btn" data-a="mz12-open" title="Checklist release dan pemeriksaan sebelum publish">🚀 Release</button>');
  }
  return result;
 };
}
if(typeof ACT!=='undefined')ACT['mz12-open']=open;
window.MozaReleaseCenter={version:VERSION,TASKS,collect,setManual,snapshotReport,downloadReport,open,close,docSignature,statusLabel};
try{if(typeof renderTop==='function'&&ready())renderTop();}catch(e){console.warn('[Moza V12] toolbar deferred',e);}
console.info('[Moza V12] Release Center installed (no server calls or publish interception).');
})();
