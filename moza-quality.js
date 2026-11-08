/* Moza Studio Advanced V8 — project integrity audit, offline JSON export and safe repair.
 * Additive: never intercept login, cloud transport, RSVP, renderer, or save.
 * Repairs are explicit, undoable and limited to Moza metadata or embed HTML
 * already generated from a Moza widget's own configuration.
 */
(function(){
'use strict';
if(window.MozaQuality)return;
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const ready=()=>typeof S!=='undefined'&&Array.isArray(S?.doc?.pages);
const safeArray=v=>Array.isArray(v)?v:[];
const report=()=>{
 const stats={pages:0,sections:0,elements:0,components:0,variants:0,styles:0,variables:0,widgets:0,filters:0};
 const issues=[];
 if(!ready())return{ready:false,stats,issues};
 const d=S.doc.mozaDesignSystem||{};
 const components=safeArray(d.components),styles=safeArray(d.styles),variables=safeArray(d.variables),sets=safeArray(d.variantSets);
 const componentIds=new Set(components.map(c=>c.id)),styleIds=new Set(styles.map(s=>s.id)),variableIds=new Set(variables.map(v=>v.id));
 stats.components=components.length;stats.variants=sets.reduce((n,s)=>n+safeArray(s.variants).length,0);
 stats.styles=styles.length;stats.variables=variables.length;
 const seen=new Set(),seenPages=new Set(),seenSections=new Set();
 const problem=(code,label,repairable=false)=>issues.push({code,label,repairable});
 const duplicated=(list,kind)=>{const ids=new Set();for(const x of list){if(!x?.id)continue;if(ids.has(x.id))problem('duplicate-library-id',`ID ${kind} ganda: ${x.name||x.id}`);else ids.add(x.id)}};
 duplicated(components,'Component');duplicated(styles,'Shared Style');duplicated(variables,'Variable');duplicated(sets,'Variant Set');

 const visit=(list,where)=>{
  for(const el of safeArray(list)){
   stats.elements++;
   const tag=`${where} / ${el.name||el.type||'Elemen'}`;
   if(el.id){if(seen.has(el.id))problem('duplicate-id',`ID elemen ganda: ${tag}`);else seen.add(el.id)}
   if(el.mozaComponentId&&!componentIds.has(el.mozaComponentId))problem('component',`Master component hilang: ${tag}`,true);
   for(const [kind,id] of Object.entries(el.mozaStyleRef||{}))if(!styleIds.has(id))problem('style',`Shared Style ${kind} tidak ditemukan: ${tag}`,true);
   for(const [field,id] of Object.entries(el.mozaVariableBindings||{}))if(!variableIds.has(id))problem('binding',`Variable ${field} tidak ditemukan: ${tag}`,true);
   if(el.mozaAutoLayout&&el.mozaGrid)problem('layout',`Auto Layout dan Grid aktif bersamaan: ${tag}`);
   if(el.mozaWidget){
    stats.widgets++;if(el.type!=='embed')problem('widget',`Widget bukan elemen embed: ${tag}`);
    else if(window.MozaInteractive?.buildWidget&&el.embedCode!==window.MozaInteractive.buildWidget(el.mozaWidget))problem('widget-sync',`Accordion/Tabs perlu sinkronisasi: ${tag}`);
   }
   if(el.mozaSmartFilter){
    stats.filters++;if(el.type!=='embed')problem('widget',`Smart Filter bukan elemen embed: ${tag}`);
    else if(window.MozaSmartFilter?.buildWidget&&el.embedCode!==window.MozaSmartFilter.buildWidget(el.mozaSmartFilter))problem('widget-sync',`Smart Filter perlu upgrade HTML: ${tag}`);
   }
   visit(el.children,tag);
  }
 };
 for(const [pi,page] of S.doc.pages.entries()){
  stats.pages++;
  if(page.id){if(seenPages.has(page.id))problem('duplicate-page-id',`ID halaman ganda: ${page.name||page.id}`);else seenPages.add(page.id)}
  for(const [si,section] of safeArray(page.sections).entries()){
   stats.sections++;
   if(section.id){if(seenSections.has(section.id))problem('duplicate-section-id',`ID section ganda: ${section.id}`);else seenSections.add(section.id)}
   visit(section.elements,`${page.name||page.title||'Halaman '+(pi+1)} / Section ${si+1}`);
  }
 }
 for(const set of sets){
  for(const v of safeArray(set.variants))if(!componentIds.has(v.componentId))problem('variant',`Variant ${set.name||set.id||'Tanpa nama'} / ${v.label||'?'} kehilangan component`,true);
 }
 // Alias graph: detect invalid cycles (including self-aliases) without mutating values.
 for(const m of ['default','alternate']){
  const done=new Set(),stack=new Set(),warned=new Set();
  const dfs=(id)=>{
   if(stack.has(id)){if(!warned.has(id)){warned.add(id);problem('alias-cycle',`Siklus alias Variable pada mode ${m}: ${variables.find(v=>v.id===id)?.name||id}`)}return}
   if(done.has(id))return;
   const value=variables.find(v=>v.id===id)?.values?.[m];
   stack.add(id);
   if(value&&typeof value==='object'&&value.ref&&variableIds.has(value.ref))dfs(value.ref);
   stack.delete(id);done.add(id);
  };
  for(const token of variables)if(token.id)dfs(token.id);
 }
 for(const token of variables){
  for(const [mode,value] of Object.entries(token.values||{}))if(value&&typeof value==='object'&&value.ref&&!variableIds.has(value.ref)){
   const other=token.values?.[mode==='default'?'alternate':'default'];
   problem('alias',`Alias ${token.name||token.id} (${mode}) kehilangan variable`,other!==undefined&&other!==null&&typeof other!=='object');
  }
 }
 return{ready:true,stats,issues};
};
function repair(){
 if(!ready())return false;
 const before=report();if(!before.issues.some(x=>x.repairable))return false;
 if(!window.confirm('Rapikan tautan metadata Moza yang kehilangan master/style/variable? Konten visual tetap ada, dan perubahan bisa di-Undo.'))return false;
 const doc=S.doc,d=doc.mozaDesignSystem||{};
 const comp=new Set(safeArray(d.components).map(x=>x.id)),style=new Set(safeArray(d.styles).map(x=>x.id)),variable=new Set(safeArray(d.variables).map(x=>x.id));
 if(typeof commit==='function'&&typeof discrete==='function')commit(discrete());
 let changes=0;
 const walk=arr=>{for(const e of safeArray(arr)){
  if(e.mozaComponentId&&!comp.has(e.mozaComponentId)){delete e.mozaComponentId;delete e.mozaComponentName;changes++}
  if(e.mozaStyleRef){for(const [kind,id] of Object.entries(e.mozaStyleRef))if(!style.has(id)){delete e.mozaStyleRef[kind];changes++}
   if(!Object.keys(e.mozaStyleRef).length)delete e.mozaStyleRef;}
  if(e.mozaVariableBindings){for(const [field,id] of Object.entries(e.mozaVariableBindings))if(!variable.has(id)){delete e.mozaVariableBindings[field];changes++}
   if(!Object.keys(e.mozaVariableBindings).length)delete e.mozaVariableBindings;}
  walk(e.children);
 }};
 for(const page of doc.pages)for(const sec of safeArray(page.sections))walk(sec.elements);
 if(Array.isArray(d.variantSets))for(const set of d.variantSets){const n=set.variants?.length||0;set.variants=safeArray(set.variants).filter(x=>comp.has(x.componentId));changes+=n-set.variants.length}
 if(Array.isArray(d.variantSets))d.variantSets=d.variantSets.filter(x=>x.variants.length);
 for(const token of safeArray(d.variables))for(const [mode,value] of Object.entries(token.values||{})){
  if(value&&typeof value==='object'&&value.ref&&!variable.has(value.ref)){
   // Only repair an invalid alias with an existing fallback; no invented color.
   const fallback=token.values?.[mode==='default'?'alternate':'default'];
   if(fallback!==null&&typeof fallback!=='object'&&fallback!==undefined){token.values[mode]=fallback;changes++}
  }
 }
 if(changes){if(typeof afterEdit==='function')afterEdit();if(typeof renderRight==='function')renderRight();}
 paint();if(typeof toast==='function')toast(`Audit Moza: ${changes} referensi diperbaiki.`);
 return changes;
}
function syncWidgets(){
 if(!ready())return false;
 const stale=[];
 const walk=list=>{for(const e of safeArray(list)){
  if(e.type==='embed'){
   const build=e.mozaSmartFilter?window.MozaSmartFilter?.buildWidget:e.mozaWidget?window.MozaInteractive?.buildWidget:null;
   const config=e.mozaSmartFilter||e.mozaWidget;
   if(typeof build==='function'&&config){const fresh=build(config);if(e.embedCode!==fresh)stale.push({e,fresh})}
  }
  walk(e.children);
 }};
 for(const page of S.doc.pages)for(const sec of safeArray(page.sections))walk(sec.elements);
 if(!stale.length)return 0;
 if(!window.confirm(`Sinkronkan ${stale.length} widget Moza dari pengaturan Properties? Perubahan manual pada kode embed widget akan tertimpa. Perubahan bisa di-Undo.`))return false;
 if(typeof commit==='function'&&typeof discrete==='function')commit(discrete());
 for(const {e,fresh} of stale)e.embedCode=fresh;
 if(typeof afterEdit==='function')afterEdit();
 paint();if(typeof toast==='function')toast(stale.length+' widget diperbarui dari pengaturan Properties.');
 return stale.length;
}
function buildExport(){
 const r=report();if(!r.ready)return null;
 return {format:'moza-project-audit',version:8,generatedAt:new Date().toISOString(),projectName:String(S.doc?.name||'Project'),stats:r.stats,issues:r.issues,limitations:'Audit metadata lokal; tidak memeriksa login, cloud, RSVP atau hosting.'};
}
function exportReport(){
 const data=buildExport();if(!data)return false;
 const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json;charset=utf-8'});
 const url=URL.createObjectURL(blob),a=document.createElement('a');
 const safeName=(data.projectName.normalize('NFKD').replace(/[^a-z0-9-]+/gi,'-').replace(/^-+|-+$/g,'').slice(0,48)||'project');
 a.href=url;a.download=`moza-audit-v8-${safeName}.json`;
 document.body.append(a);a.click();a.remove();
 // Revoke after the browser has handled the download interaction.
 setTimeout(()=>URL.revokeObjectURL(url),1000);
 if(typeof toast==='function')toast('Laporan audit JSON disiapkan (tanpa upload server).');
 return true;
}
function modal(){return document.getElementById('moza7-modal')}
function paint(){
 const node=modal();if(!node)return;
 const data=report(),{stats,issues}=data;
 const breakdown=[['Halaman',stats.pages],['Section',stats.sections],['Elemen',stats.elements],['Components',stats.components],['Variants',stats.variants],['Shared Styles',stats.styles],['Variables',stats.variables],['Widgets',stats.widgets],['Smart Filters',stats.filters]];
 node.querySelector('.moza7-report').innerHTML=!data.ready?'<p>Buka sebuah project Design Editor dahulu.</p>':
 `<div class="moza7-metrics">${breakdown.map(([k,v])=>`<div><span>${esc(k)}</span><b>${v}</b></div>`).join('')}</div><h3>${issues.length?`${issues.length} hal perlu diperiksa`:'Tidak ada referensi Moza yang terputus'}</h3>`+
 (issues.length?`<ul class="moza7-issues">${issues.slice(0,40).map(x=>`<li><span>${esc(x.label)}</span><small>${x.repairable?'Dapat dirapikan':'Periksa manual'}</small></li>`).join('')}</ul>${issues.length>40?`<p>Menampilkan 40 dari ${issues.length} isu.</p>`:''}`:'<p>Audit metadata lulus. Ini tidak menggantikan tes Preview, cloud, RSVP, atau deploy.</p>')+
 `<div class="moza7-controls"><button type="button" class="btn" data-moza7="refresh">Periksa ulang</button><button type="button" class="btn" data-moza7="export">↓ Ekspor Audit JSON</button>${issues.some(x=>x.repairable)?'<button type="button" class="btn pri" data-moza7="repair">Rapikan referensi aman</button>':''}${issues.some(x=>x.code==='widget-sync')?'<button type="button" class="btn" data-moza7="sync">Upgrade HTML widget</button>':''}</div>`;
}
function close(){const node=modal();if(!node)return;node.remove();document.querySelector('#top [data-a="mz7-audit"]')?.focus()}
function open(){
 if(!ready()){if(typeof toast==='function')toast('Buka project Design Editor dahulu.');return false}
 if(modal()){paint();return true}
 const node=document.createElement('div');node.id='moza7-modal';node.className='moza7-overlay';
 node.innerHTML='<div class="moza7-dialog" role="dialog" aria-modal="true" aria-label="Audit proyek Moza Studio"><header><div><b>✦ Moza Advanced V8 · Project Audit</b><p>Periksa konsistensi metadata desain tanpa mengakses cloud.</p></div><button type="button" class="btn sm" data-moza7="close" aria-label="Tutup audit">✕</button></header><div class="moza7-report"></div><footer>Perbaikan metadata tersedia hanya bila ditemukan tautan yang rusak. Selalu simpan backup sebelum deploy.</footer></div>';
 document.body.append(node);
 node.addEventListener('click',ev=>{const button=ev.target.closest('[data-moza7]');if(button){const action=button.dataset.moza7;if(action==='close')close();if(action==='refresh')paint();if(action==='export')exportReport();if(action==='repair')repair();if(action==='sync')syncWidgets();}else if(ev.target===node)close()});
 paint();node.querySelector('[data-moza7="close"]').focus();return true;
}
document.addEventListener('keydown',ev=>{
 const node=modal();if(!node)return;
 if(ev.key==='Escape'){ev.preventDefault();ev.stopImmediatePropagation();close();return}
 if(ev.key==='Tab'){
  const focusable=[...node.querySelectorAll('button:not(:disabled),a[href],input:not(:disabled),select:not(:disabled),textarea:not(:disabled),[tabindex]:not([tabindex="-1"])')].filter(el=>el.getClientRects().length);
  if(!focusable.length)return;
  const first=focusable[0],last=focusable[focusable.length-1];
  if(ev.shiftKey&&(document.activeElement===first||!node.contains(document.activeElement))){ev.preventDefault();last.focus()}
  else if(!ev.shiftKey&&(document.activeElement===last||!node.contains(document.activeElement))){ev.preventDefault();first.focus()}
 }
},true);
if(typeof renderTop==='function'){
 const oldTop=renderTop;
 renderTop=function(){oldTop();const top=document.querySelector('#top');if(!ready()||S.mode!=='design'||!top||top.querySelector('[data-a="mz7-audit"]'))return;
 const near=top.querySelector('[data-a="mz6-insert"]')||top.querySelector('[data-a="preview"]');if(near)near.insertAdjacentHTML('beforebegin','<button type="button" class="btn" data-a="mz7-audit" title="Periksa referensi dan kesehatan project">✦ Audit</button>');
 };
}
if(typeof ACT!=='undefined')ACT['mz7-audit']=open;
window.MozaQuality={version:'8.0.0',report,repair,syncWidgets,buildExport,exportReport,open,close,status:()=>({ready:ready(),issues:report().issues.length})};
try{if(ready()&&S.mode==='design'&&document.querySelector('#top'))renderTop()}catch(err){console.warn('[Moza V7] Audit toolbar deferred',err)}
console.info('[Moza V7] Project Audit ready. Original Atelier project and cloud layer untouched.');
})();
