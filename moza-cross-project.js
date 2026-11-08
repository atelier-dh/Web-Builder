/* Moza Studio V14.7 — cross-project navigation and optional multi-project deploy.
   Additive only: no cloud writes, no project re-ID, no editable project JSON in deploy ZIP. */
(function(){
'use strict';
let projectIndex=[];
let exportContext=null;
let refreshing=null;
const mz48DocCache=new Map(),mz48DocPending=new Map();
const enc=new TextEncoder();
const escText=s=>esc(String(s??''));
const safeId=s=>String(s||'').slice(0,150);
const myId=()=>String(S.pid||'');
function normalizeIndex(rows){return (Array.isArray(rows)?rows:[]).filter(p=>p&&typeof p.id==='string').map(p=>({id:p.id,name:String(p.name||'Untitled project'),updated:p.updated||0}));}
function updateProjectIndex(rows){
 const next=normalizeIndex(rows),older=new Map(projectIndex.map(x=>[x.id,x.updated]));
 for(const p of next)if(older.has(p.id)&&older.get(p.id)!==p.updated)mz48DocCache.delete(p.id);
 projectIndex=next;
}
const oldLoadIdx=loadIdx;
loadIdx=async function(...args){const rows=await oldLoadIdx.apply(this,args);updateProjectIndex(rows);return rows;};
const oldSaveIdx=saveIdx;
saveIdx=async function(rows){updateProjectIndex(rows);return oldSaveIdx(rows);};
async function refresh(){if(refreshing)return refreshing;refreshing=loadIdx().finally(()=>{refreshing=null});return refreshing;}
function projectOptions(current){
 const opts=projectIndex.filter(p=>p.id!==myId()||p.id===current);
 if(!opts.length)return '<option value="" disabled selected>No other local projects — open/import the destination first</option>';
 return opts.map(p=>`<option value="${escText(p.id)}" ${p.id===current?'selected':''}>${escText(p.name)}${p.id===myId()?' (current project)':''}</option>`).join('');
}
window.mozaCrossProjectChoices=function(selected){return projectOptions(selected)};
// Pages/sections are fetched from LOCAL editable project data, never from the network.
async function mz48LoadDoc(id){
 id=safeId(id);if(!id)return null;
 if(id===myId()){mz48DocCache.set(id,S.doc);return S.doc}
 if(mz48DocCache.has(id))return mz48DocCache.get(id);
 if(mz48DocPending.has(id))return mz48DocPending.get(id);
 const task=(async()=>{
  const raw=await store.get('atelier:p:'+id);if(!raw)return null;
  const data=JSON.parse(raw);const doc=data.doc;
  if(!Array.isArray(doc?.pages))return null;
  mz48DocCache.set(id,doc);return doc;
 })().finally(()=>mz48DocPending.delete(id));
 mz48DocPending.set(id,task);return task;
}
function mz48Options(rows,value){return rows.map(([id,label])=>`<option value="${escText(id)}" ${id===value?'selected':''}>${escText(label)}</option>`).join('')}
function mz48PageRows(id){const doc=id===myId()?S.doc:mz48DocCache.get(safeId(id));if(!doc){void mz48LoadDoc(id).then(()=>{if(S.sel)renderRight()}).catch(console.warn);return []}return doc.pages.map(p=>[p.id,p.name||p.slug||'Page'])}
function mz48SectionRows(id,pageId){const doc=id===myId()?S.doc:mz48DocCache.get(safeId(id));if(!doc){void mz48LoadDoc(id).then(()=>{if(S.sel)renderRight()}).catch(console.warn);return []}
 const pages=pageId?doc.pages.filter(p=>p.id===pageId):doc.pages;
 return pages.flatMap(p=>(p.sections||[]).filter(x=>x.kind!=='overlay').map(sec=>[sec.id,`${p.name||p.slug} / ${sec.name||'Section'}`]));
}
window.mozaCrossProjectOptionRows=current=>projectIndex.filter(p=>p.id!==myId()||p.id===current).map(p=>[p.id,p.name]);
window.mozaCrossProjectPageRows=mz48PageRows;
window.mozaCrossProjectSectionRows=mz48SectionRows;
window.mozaCrossProjectPageOptions=(id,v)=>mz48Options(mz48PageRows(id),v);
window.mozaCrossProjectSectionOptions=(id,page,v)=>mz48Options(mz48SectionRows(id,page),v);
function mz48SlugFor(id,pageId){const d=id===myId()?S.doc:mz48DocCache.get(safeId(id));return d?.pages.find(p=>p.id===pageId)?.slug||''}
function mz48Href(id,pageId,sectionId){
 const base=hrefFor(id);if(!base)return '';
 // Always prefer the project page slug; the section can be used without a page selection.
 const doc=id===myId()?S.doc:mz48DocCache.get(safeId(id));
 let pg=pageId?doc?.pages.find(p=>p.id===pageId):null;
 if(!pg&&sectionId)pg=doc?.pages.find(p=>p.sections?.some(sec=>sec.id===sectionId));
 if(!pg&&pageId)return ''; // stale reference must not silently open the cover
 if(sectionId&&!pg?.sections?.some(sec=>sec.id===sectionId))return '';
 return pg?base+'#/'+encodeURIComponent(pg.slug)+(sectionId?'/'+encodeURIComponent(sectionId):''):base;
}
function relPath(from,to){
 const a=String(from).split('/').slice(0,-1),b=String(to).split('/');
 while(a.length&&b.length&&a[0]===b[0]){a.shift();b.shift()}
 return [...a.map(()=> '..'),...b].join('/')||'index.html';
}
function hrefFor(id,pageId,sectionId){
 if((pageId||sectionId))return mz48Href(id,pageId,sectionId);
 if(!exportContext||!Object.prototype.hasOwnProperty.call(exportContext.paths,safeId(id)))return '';
 return relPath(exportContext.paths[exportContext.current],exportContext.paths[safeId(id)]);
}
window.mozaCrossProjectHref=hrefFor;
// Link-to property is shared by buttons, linked images, and navigation items.
// The existing LINK helper in index.html now renders this fourth link type.
// Floating Assets use a separate visual inspector; keep it compatible too.
const originalFloatingLink=v14Link;
v14Link=function(item,doc){if(item?.linkType==='project')return hrefFor(item.linkProject,item.linkPage||'',item.linkSection||'');return originalFloatingLink(item,doc)};
function linkedIds(doc){
 const ids=new Set(),seen=new WeakSet();
 function scan(x){
  if(!x||typeof x!=='object'||seen.has(x))return;
  seen.add(x);
  if(x.link&&x.link.t==='project'&&x.link.v)ids.add(String(x.link.v));
  if(x.linkType==='project'&&(x.target||x.linkProject))ids.add(String(x.linkProject||x.target));
  if(x.act==='project'&&x.projectId)ids.add(String(x.projectId));
  if(Array.isArray(x)){for(const v of x)scan(v);return}
  for(const [k,v] of Object.entries(x))if(k!=='assets'&&k!=='videos'&&k!=='fonts'&&k!=='media'&&k!=='data'&&k!=='embedCode'&&k!=='html')scan(v);
 }
 scan(doc);return ids;
}
// Confirm that each deep destination actually exists before packaging public URLs.
function mz48DeepReferences(doc){
 const refs=[],seen=new WeakSet();
 function scan(x){
  if(!x||typeof x!=='object'||seen.has(x))return;seen.add(x);
  if(Array.isArray(x)){x.forEach(scan);return}
  if(x.link?.t==='project'&&x.link.v)refs.push({id:x.link.v,page:x.link.pg||'',section:x.link.sec||''});
  if(x.linkType==='project'&&(x.linkProject||x.target))refs.push({id:x.linkProject||x.target,page:x.linkPage||x.targetPage||'',section:x.linkSection||x.targetSection||''});
  if(x.act==='project'&&x.projectId)refs.push({id:x.projectId,page:x.projectPage||'',section:x.projectSection||''});
  for(const [k,v] of Object.entries(x))if(!['assets','videos','fonts','media','data','html','embedCode'].includes(k))scan(v);
 }
 scan(doc);return refs;
}
function mz48CheckDeepLinks(loaded){
 for(const [source,record] of loaded){
  for(const ref of mz48DeepReferences(record.doc)){
   const target=loaded.get(ref.id);
   if(!target)throw Error(`"${record.doc.name}" links to a project outside this Combined ZIP. Include the target project.`);
   let page=ref.page?target.doc.pages.find(p=>p.id===ref.page):null;
   if(ref.page&&!page)throw Error(`"${record.doc.name}" has a link to a deleted page in "${target.doc.name}". Update Link to before exporting.`);
   if(ref.section){
    if(!page)page=target.doc.pages.find(p=>p.sections?.some(s=>s.id===ref.section));
    if(!page?.sections?.some(s=>s.id===ref.section))throw Error(`"${record.doc.name}" has a link to a deleted section in "${target.doc.name}".`);
   }
  }
 }
}
function niceSlug(name){let s=slugify(String(name||'project')).replace(/[^a-z0-9-]/g,'-').replace(/-+/g,'-').replace(/^-|-$/g,'').slice(0,50);return s||'project'}
function describeReferences(){
 const ids=linkedIds(S.doc);const known=new Map(projectIndex.map(p=>[p.id,p.name]));
 return [...ids].map(id=>({id,name:known.get(id)||'Missing project ('+id.slice(0,14)+')',found:known.has(id)}));
}
function showExportPanel(){
 const modal=document.querySelector('#modal');if(!modal)return;
 const zipButton=modal.querySelector('[data-a="a33-export-zip"]');if(!zipButton)return;
 const after=zipButton.closest('.a33-export-choice');if(!after||modal.querySelector('#mz47-export-panel'))return;
 const panel=document.createElement('div');panel.id='mz47-export-panel';panel.className='a33-export-choice mz47-export';
 panel.innerHTML=`<div style="width:100%"><b>3. Combined Website ZIP · Multiple Projects</b>
 <p>Choose projects to publish together. The current project becomes <code>index.html</code>; other websites are placed in <code>projects/</code>. Links to Another Project work between the included websites.</p>
 <div id="mz47-selection" role="group" aria-label="Select projects to include">Loading projects…</div>
 <p id="mz47-warning" class="mz47-warning"></p>
 <button type="button" class="btn pri" data-a="mz47-export-combined" style="margin-top:9px">Download Combined Website ZIP</button></div>`;
 after.insertAdjacentElement('afterend',panel);
 const draw=()=>{
  const list=panel.querySelector('#mz47-selection');if(!list||!list.isConnected)return;
  const linked=describeReferences(),selected=new Set(linked.filter(x=>x.found).map(x=>x.id));
  const others=projectIndex.filter(p=>p.id!==myId());
  list.innerHTML=`<label class="mz47-pick"><input type="checkbox" checked disabled> <strong>${escText(S.doc.name)} (main website)</strong></label>`+
   (others.length?others.map(p=>`<label class="mz47-pick"><input type="checkbox" data-mz47-include="${escText(p.id)}" ${selected.has(p.id)?'checked':''}><span>${escText(p.name)}${selected.has(p.id)?' · linked from this project':''}</span></label>`).join(''):'<p class="hint">No other local projects yet. Create or open another project in this browser first.</p>');
  const missing=linked.filter(x=>!x.found);panel.querySelector('#mz47-warning').textContent=missing.length?'Missing linked projects: '+missing.map(x=>x.name).join(', ')+'. Open/import those projects locally before exporting.':'Keep every folder in the ZIP together when deploying. Cloud-only projects must be opened/saved locally before inclusion.';
 };
 refresh().then(draw).catch(e=>{panel.querySelector('#mz47-warning').textContent='Could not list local projects: '+e.message});
}
const previousOpenExport=a33OpenExport;
a33OpenExport=function(...args){const value=previousOpenExport.apply(this,args);showExportPanel();return value;};
const oldExport=a33Export;
a33Export=async function(format){
 if(linkedIds(S.doc).size){a33SetStatus('This project links to other projects. Use Combined Website ZIP and include the linked projects, or switch those links to absolute URLs.',true);return;}
 return oldExport(format);
};
function mediaFiles(html,prefix){
 const re=/data:([a-z0-9.+-]+\/[a-z0-9.+-]+)(?:;charset=[^;,\s"']+)?;base64,([A-Za-z0-9+/=]+)/gi;
 const output=[],files=[],dedup=new Map();let offset=0,n=0,bytesTotal=0;
 for(const m of html.matchAll(re)){
  output.push(html.slice(offset,m.index));offset=m.index+m[0].length;
  const mime=a33Mime(m[1]),bytes=a33Base64Bytes(m[2]);const key=mime+':'+bytes.length+':'+a33Crc(bytes);
  const dup=(dedup.get(key)||[]).find(v=>v.bytes.length===bytes.length&&v.bytes.every((b,i)=>b===bytes[i]));
  let name=dup?.name;
  if(!name){
   name='assets/media-'+String(++n).padStart(4,'0')+'.'+a33Extension(mime);
   files.push({name:prefix+name,bytes});
   (dedup.get(key)||dedup.set(key,[]).get(key)).push({name,bytes});bytesTotal+=bytes.length;
  }
  output.push(name);
 }
 output.push(html.slice(offset));
 const result=output.join('');a33VerifyExport(result);
 return {files:[{name:prefix+'index.html',bytes:enc.encode(result)},...files],bytes:bytesTotal};
}
function selectedIds(){
 const ids=[myId()];document.querySelectorAll('#mz47-export-panel [data-mz47-include]:checked').forEach(x=>ids.push(x.dataset.mz47Include));return [...new Set(ids)];
}
const oldProjectState=()=>({pid:S.pid,doc:S.doc,assets:S.assets,videos:S.videos,fonts:S.fonts,music:S.music});
function restoreProjectState(state){Object.assign(S,state)}
let busy=false;
async function exportCombined(){
 if(busy)return;busy=true;
 const status=()=>document.getElementById('a33-export-status');
 const button=document.querySelector('[data-a="mz47-export-combined"]');if(button)button.disabled=true;
 const setStatus=(message,error)=>{const x=status();if(x){x.textContent=message;x.style.color=error?'#b42318':'#176b3d'}};
 const prior=oldProjectState();
 try{
  finishEdit();
  setStatus('Saving current project and preparing linked projects…');
  const ok=await saveNow();if(!ok && !await store.get('atelier:p:'+myId()))throw Error('Current project could not be saved. Back up your work before exporting.');
  const ids=selectedIds();await refresh();
  const known=new Set(projectIndex.map(p=>p.id));
  for(const id of ids)if(!known.has(id))throw Error('Project is no longer available locally: '+id);
  const loaded=new Map();
  for(const id of ids){
   if(id===myId())loaded.set(id,oldProjectState());
   else{
    const raw=await store.get('atelier:p:'+id);
    if(!raw)throw Error('Project unavailable in local storage: '+(projectIndex.find(x=>x.id===id)?.name||id));
    const saved=JSON.parse(raw);if(!saved?.doc?.pages?.length)throw Error('Project data invalid: '+id);
    await a29HydrateLocal(saved);loaded.set(id,{pid:id,doc:saved.doc,assets:saved.assets||[],videos:saved.videos||[],fonts:saved.fonts||[],music:saved.music||null});
   }
  }
  const files=[],paths=Object.create(null),used=new Set();
  for(const id of ids){
   if(id===myId()){paths[id]='index.html';continue}
   let base=niceSlug(loaded.get(id).doc.name),folder=base,count=2;
   while(used.has(folder)){folder=base+'-'+(count++)}used.add(folder);
   paths[id]='projects/'+folder+'/index.html';
  }
  for(const [id,record] of loaded){
   const missing=[...linkedIds(record.doc)].filter(target=>!paths[target]);
   if(missing.length)throw Error('"'+record.doc.name+'" links to projects not included in the ZIP: '+missing.map(target=>projectIndex.find(p=>p.id===target)?.name||target).join(', ')+'. Select every linked project first.');
  }
  for(const id of ids) mz48DocCache.set(id,loaded.get(id).doc);
  mz48CheckDeepLinks(loaded);
  let totalMedia=0,totalHtml=0;
  for(const [id,data] of loaded){
   Object.assign(S,data);exportContext={paths,current:id};
   setStatus('Building website: '+data.doc.name+'…');
   const html=siteHTML(data.doc);
   a33VerifyExport(html);
   const prefix=paths[id].slice(0,-'index.html'.length);
   const result=mediaFiles(html,prefix);totalMedia+=result.bytes;
   totalHtml+=result.files[0].bytes.byteLength;
   if(totalHtml>80*1024*1024)throw Error('Combined HTML after media separation exceeds 80 MB. Reduce embedded code or split the website into more pages.');
   if(totalMedia>350*1024*1024)throw Error('Combined media exceed 350 MB. Compress images/videos or export fewer projects.');
   files.push(...result.files);
  }
  files.unshift({name:'.nojekyll',bytes:enc.encode('')});
  const readme=`MOZA STUDIO — COMBINED WEBSITE DEPLOY\n\nMain website: index.html\nOther projects: projects/<project-slug>/index.html\n\nUpload ALL files and folders together to a single site root (GitHub Pages, Netlify, or static hosting). Do not flatten or rename folders, because cross-project links use relative URLs.\n\n${ids.map(id=>`${loaded.get(id).doc.name}: ${paths[id]}`).join('\n')}\n\nThis is a PUBLIC WEBSITE ZIP, not an editable project backup. External services (RSVP, external embeds, fonts) still require their own setup.\n`;
  files.push({name:'README_DEPLOY.txt',bytes:enc.encode(readme)});
  const zip=a33Zip(files);
  if(zip.size>450*1024*1024)throw Error('Combined ZIP too large for reliable browser export.');
  a33SaveBlob(zip,niceSlug(prior.doc.name)+'-combined-websites.zip');
  setStatus('Combined ZIP ready: '+ids.length+' projects, '+files.length+' files ('+a31Fmt(zip.size)+'). Deploy all files and folders together.');
 }catch(e){console.error('[Moza Cross Project] Export failed',e);setStatus('Combined export failed: '+(e.message||e),true);toast('Multi-project export failed; original projects are unchanged',4500)}
 finally{exportContext=null;restoreProjectState(prior);busy=false;if(button)button.disabled=false}
}
ACT['mz47-export-combined']=()=>exportCombined();
// The bridge is included only in the generated public website. It accepts navigation
// messages from sandboxed Visual Smart Filter cards and never grants data access.
const previousSite=siteHTML;
siteHTML=function(...args){let html=previousSite.apply(this,args);if(!exportContext)return html;
 const routes=Object.create(null);
 for(const id of Object.keys(exportContext.paths))routes[id]=hrefFor(id);
 const pages=Object.create(null);for(const id of Object.keys(routes)){const d=mz48DocCache.get(id);pages[id]=(d?.pages||[]).map(p=>({id:p.id,slug:p.slug,sections:(p.sections||[]).map(sec=>sec.id)}))}
 const encoded=JSON.stringify(routes).replace(/</g,'\\u003c');
 const encodedPages=JSON.stringify(pages).replace(/</g,'\\u003c');
 const script=`<script>(function(){var routes=${encoded},pages=${encodedPages};window.addEventListener('message',function(e){if(!e.data||e.data.type!=='moza:visual-filter:navigate'||e.data.kind!=='project')return;var list=document.querySelectorAll('iframe.a319-safe-iframe'),valid=false;for(var i=0;i<list.length;i++){if(list[i].contentWindow===e.source&&list[i].closest('.el')){valid=true;break}}if(!valid)return;var id=String(e.data.target||''),pageId=String(e.data.pageId||''),sectionId=String(e.data.sectionId||'');if(!Object.prototype.hasOwnProperty.call(routes,id)||!routes[id])return;var dest=routes[id],p=(pages[id]||[]).find(function(x){return x.id===pageId});if(!p&&sectionId)p=(pages[id]||[]).find(function(x){return x.sections.includes(sectionId)});if(pageId&&!p)return;if(sectionId&&(!p||!p.sections.includes(sectionId)))return;if(p)dest+='#/'+encodeURIComponent(p.slug)+(sectionId?'/'+encodeURIComponent(sectionId):'');location.href=dest});})();<\/script>`;
 return html.replace('</body>',script+'</body>');
};
const css=document.createElement('style');css.textContent=`.mz47-export{display:block!important}.mz47-pick{display:flex;align-items:center;gap:9px;padding:9px 10px;border:1px solid #e1e6f0;border-radius:8px;margin:6px 0;cursor:pointer;background:#fafbfe;overflow-wrap:anywhere}.mz47-pick input{flex-shrink:0;accent-color:#4565d7}.mz47-warning{color:#8a5717!important;font-size:12px!important;line-height:1.5}.mz47-export code{font-size:11px;background:#eef2f8;padding:2px 4px;border-radius:4px}`;document.head.appendChild(css);
refresh().then(()=>{try{if(S.sel?.k==='el'||S.sel?.k==='nav')renderRight()}catch(_){}}).catch(e=>console.warn('[Moza Cross Project] Project list',e));
/* V14.7.1 — In-editor Cross-Project Preview (read-only).
   Uses the same local project records as Combined Website ZIP. Never changes
   the selected editor project, project IDs, or published navigation behavior. */
const mz47PreviousOpenPreview=openPreview;
const mz47PreviousClosePreview=closePreview;
const mz47PreviousRefreshPreview=refreshPreviewFrame;
let mz47PreviewSession=null;
const mz47PreviewState=()=>({pid:S.pid,doc:S.doc,assets:S.assets,videos:S.videos,fonts:S.fonts,music:S.music,pageId:S.pageId});
function mz47PreviewIsVisible(session){return mz47PreviewSession===session && !!document.querySelector('#pv.show #prevframe')}
function mz47PreviewNotice(message,error=false){
 const area=document.querySelector('#mz47-preview-notice');if(area){area.textContent=message||'';area.style.color=error?'#ffd0cc':'#cbd4e5';area.title=message||''}
}
function mz47PreviewChoices(session){
 const all=new Map(projectIndex.map(x=>[x.id,x.name]));
 all.set(session.root,session.rootName);
 const rows=[...all].map(([id,name])=>`<option value="${escText(id)}" ${id===session.current?'selected':''}>${escText(name)}${id===session.root?' · editing':''}</option>`).join('');
 return rows+(all.size<=1?'<option value="" disabled>No other local projects — open/import one first</option>':'');
}
function mz47PreviewHeader(session,doc){
 if(!mz47PreviewIsVisible(session))return;
 const p=document.querySelector('#pv .pvh');if(!p)return;
 let toolbar=p.querySelector('#mz47-preview-controls');
 if(!toolbar){
  toolbar=document.createElement('div');toolbar.id='mz47-preview-controls';toolbar.className='mz47-preview-controls';
  toolbar.innerHTML='<label>Project <select id="mz47-preview-project" aria-label="Preview another project"></select></label><button type="button" class="btn sm" data-mz47-preview-back="1" title="Return to the previous project">← Back</button><span id="mz47-preview-notice" aria-live="polite"></span>';
  const page=document.querySelector('#pv13Page');
  (page?.closest('label')||p.querySelector('.rd')||p.firstElementChild)?.insertAdjacentElement('afterend',toolbar);
 }
 const select=toolbar.querySelector('select');if(select){select.innerHTML=mz47PreviewChoices(session);select.value=session.current}
 const back=toolbar.querySelector('button');if(back)back.disabled=!session.history.length;
 const name=doc?.name||projectIndex.find(p=>p.id===session.current)?.name||'Project';
 const title=p.querySelector(':scope > b');if(title)title.textContent=(S._previewProto?'▶ Prototype':'Preview')+' · '+name;
 const pages=Array.isArray(doc?.pages)?doc.pages:[];
 const pgSelect=document.querySelector('#pv13Page');
 if(pgSelect){
  let desired=session.pages[session.current];
  if(!pages.some(pg=>pg.id===desired))desired=doc?.start&&pages.some(pg=>pg.id===doc.start)?doc.start:pages[0]?.id||'';
  session.pages[session.current]=desired;
  pgSelect.innerHTML=pages.map(pg=>`<option value="${escText(pg.id)}">${escText(pg.name||'Untitled page')}</option>`).join('');
  pgSelect.value=desired;
 }
 const prototypePage=document.querySelector('#pvStart');
 if(prototypePage){prototypePage.innerHTML=pages.map(pg=>`<option value="${escText(pg.id)}">${escText(pg.name||'Untitled page')}</option>`).join('');prototypePage.value=session.pages[session.current]||''}
}
async function mz47LoadPreviewProject(session,id){
 if(id===session.root)return mz47PreviewState(); // Preview current unsaved edits without saving.
 if(session.records.has(id))return session.records.get(id);
 const row=projectIndex.find(p=>p.id===id);if(!row)throw Error('Project not found in this browser. Open or import it into Moza first.');
 const json=await store.get('atelier:p:'+id);
 if(!json)throw Error('Project "'+row.name+'" has no local data. Open it and save before previewing.');
 let record;
 try{record=JSON.parse(json)}catch(_){throw Error('Local project data cannot be read: '+row.name)}
 if(!record?.doc?.pages?.length)throw Error('Invalid project pages: '+row.name);
 await a29HydrateLocal(record);
 const result={pid:id,doc:record.doc,assets:record.assets||[],videos:record.videos||[],fonts:record.fonts||[],music:record.music||null};
 session.records.set(id,result);return result;
}
function mz47PreviewRuntime(routes,current,pages,host,basePath,canonicalPaths){
 'use strict';
 const pairs=Object.entries(routes),canonical=canonicalPaths||{};
 const baseUrl=String(basePath||location.href);
 let appPath='';try{appPath=new URL(baseUrl).pathname}catch(_){}
 function safeDecode(value){try{return decodeURIComponent(value)}catch(_){return value}}
 function normalizePath(value){
  let path=String(value||'').replace(/\\/g,'/').replace(/^\.\//,'').replace(/^\/+/, '').replace(/[?#].*$/,'');
  path=path.replace(/\/{2,}/g,'/');
  if(path&&!path.endsWith('.html')&&!path.endsWith('.htm'))path=path.replace(/\/$/,'')+'/index.html';
  return path;
 }
 function linkProject(href){
  const raw=String(href||'').trim();
  if(!raw||/^(?:mailto:|tel:|sms:|javascript:|data:|blob:)/i.test(raw))return null;
  let clean=raw.split(/[?#]/)[0],absolute=false;
  if(/^\/\//.test(raw)||/^https?:\/\//i.test(raw)){
   try{const u=new URL(raw,baseUrl);if(u.hostname!==host)return null;clean=u.pathname;absolute=true}catch(_){return null}
  }
  const fragment=raw.includes('#/')?raw.slice(raw.indexOf('#/')):'';
  let found=null;
  if(!absolute){
   found=pairs.find(([,path])=>normalizePath(path)===normalizePath(clean))||null;
  }
  if(!found){
   let candidate=normalizePath(clean);
   const basePrefix=appPath.replace(/^\/+|\/+$/g,'');
   if(basePrefix&&candidate.startsWith(basePrefix+'/'))candidate=candidate.slice(basePrefix.length+1);
   if(candidate===basePrefix)candidate='index.html';
   for(const [id,path] of Object.entries(canonical).sort((a,b)=>String(b[1]).length-String(a[1]).length)){
    const target=normalizePath(path);
    if(candidate===target||candidate.endsWith('/'+target)){found=[id,path];break}
   }
  }
  if(!found)return null;
  const bits=fragment.replace(/^#\//,'').split('/').filter(Boolean);
  return {id:found[0],pageSlug:bits[0]?safeDecode(bits[0]):'',sectionId:bits[1]?safeDecode(bits[1]):''};
 }
 function go(id,pageSlug='',sectionId=''){if(id)parent.postMessage({moza47Preview:'navigate',projectId:id,pageSlug,sectionId},'*')}
 function findPage(href){
  var raw=String(href||'').trim();if(!raw||/^(?:mailto:|tel:|sms:|javascript:|data:|blob:)/i.test(raw))return null;
  var path=raw;
  if(/^https?:\/\//i.test(raw)){
   try{var u=new URL(raw);if(u.hostname!==host)return null;path=u.pathname+u.hash;}catch(e){return null}
  }
  if(/^#[^/]/.test(path))return null;
  var value=path.includes('#/')?path.split('#/')[1]:path.split(/[?#]/)[0];
  value=String(value||'').split('?')[0];
  var seg=value.split('/').filter(Boolean);
  var key=path.includes('#/')?(seg[0]||''):(seg[seg.length-1]||'');
  if(!key)return null;
  function normalize(value){return String(value||'').normalize('NFKD').toLowerCase().replace(/\.html?$/i,'').replace(/[^a-z0-9]+/g,'')}
  var target=normalize(key);
  var matches=(pages||[]).filter(page=>page.aliases?.some(alias=>normalize(alias)===target)||normalize(page.slug)===target);
  if(matches.length!==1)return null;
  return {id:matches[0].id,section:path.includes('#/')?seg[1]||'':''};
 }
 // Capture first, before imported-HTML navigation interceptors or built-in router.
 window.addEventListener('click',function(ev){
  const anchor=ev.target?.closest?.('a[href]');if(!anchor||anchor.hasAttribute('download')||ev.ctrlKey||ev.metaKey||ev.shiftKey||ev.altKey)return;
  const id=linkProject(anchor.getAttribute('href'));
  if(id){ev.preventDefault();ev.stopImmediatePropagation();go(id.id,id.pageSlug,id.sectionId);return}
  // In a single-page Preview, unknown links would otherwise fall through to
  // the built-in router, which redirects to the cover/first page.
  const page=findPage(anchor.getAttribute('href'));
  if(page){ev.preventDefault();ev.stopImmediatePropagation();parent.postMessage({moza47Preview:'page',pageId:page.id,sectionId:page.section},'*');return}
  // Never silently fall back to cover when a #/page route is stale.
  const href=anchor.getAttribute('href')||'';
  if(/^#\/[^/]+/.test(href)){
   ev.preventDefault();ev.stopImmediatePropagation();
   parent.postMessage({moza47Preview:'missing-route',href:href.slice(0,180)},'*');
  }
 },true);
 // Scroll-to-section runs only after the destination page is loaded.
 window.addEventListener('message',function(ev){
  if(ev.source!==parent||ev.data?.moza47Preview!=='scroll-section')return;
  const sectionId=String(ev.data.sectionId||'');
  if(!/^[A-Za-z0-9_-]{2,120}$/.test(sectionId))return;
  const el=document.getElementById('s-'+sectionId);
  if(el)requestAnimationFrame(()=>{el.style.scrollMarginTop='90px';el.scrollIntoView({behavior:'instant',block:'start'})});
 },false);
 // Visual Smart Filter cards run in a separate sandbox and communicate by message.
 // Route project, page, and section destinations through the editor Preview controller.
 window.addEventListener('message',function(ev){
  const data=ev.data;if(data?.type!=='moza:visual-filter:navigate')return;
  const frames=document.querySelectorAll('iframe.a319-safe-iframe');let valid=false;
  for(const frame of frames){if(frame.contentWindow===ev.source&&frame.closest('.el')){valid=true;break}}
  if(!valid)return;
  ev.stopImmediatePropagation();
  const kind=data.kind,target=String(data.target||'');
  if(kind==='project'){
   if(!target){parent.postMessage({moza47Preview:'missing-project',reason:'empty-destination'},'*');return;}
   parent.postMessage({moza47Preview:'navigate',projectId:target,pageId:String(data.pageId||''),sectionId:String(data.sectionId||'')},'*');return;
  }
  if(kind==='page'){
   const page=(pages||[]).find(p=>p.id===target||p.slug===target||(p.aliases||[]).includes(target));
   if(page)parent.postMessage({moza47Preview:'page',pageId:page.id},'*');return;
  }
  if(kind==='section'){
   const page=(pages||[]).find(p=>(p.sections||[]).includes(target));
   if(page)parent.postMessage({moza47Preview:'page',pageId:page.id,sectionId:target},'*');
  }
 },true);
}
/* V14.7.4 — Memory-safe preview for large multi-page and media-rich projects.
   This intentionally affects only the Preview iframe. Published site/ZIP are unchanged. */
function mz47CompactPreviewMedia(session,record){
 const media=new Map(),prefix='moza-preview-media://';
 function compact(items,kind){
  return (items||[]).map((item,i)=>{
   if(!item||typeof item.data!=='string'||!item.data.startsWith('data:')||item.data.length<32768)return item;
   const key=prefix+kind+'/'+i;media.set(key,item.data);
   return {...item,data:key};
  });
 }
 const assets=compact(record.assets,'a'),videos=compact(record.videos,'v'),fonts=compact(record.fonts,'f');
 let music=record.music;
 if(music&&typeof music.data==='string'&&music.data.startsWith('data:')&&music.data.length>=32768){
  const key=prefix+'m/0';media.set(key,music.data);music={...music,data:key};
 }
 session.media=media;
 return {assets,videos,fonts,music};
}
function mz47PreviewMediaRuntime(){
 'use strict';
 const pattern=/moza-preview-media:\/\/[avfm]\/\d+/g;
 const pending=new Set(),ready=new Map(),waiters=new Map(),inflight=new Map();
 const queue=[];let active=0,scanning=false,observer=null;
 const MAX_IN_FLIGHT=4;
 function request(id,node,attr){
  if(ready.has(id)){applyOne(node,attr,id,ready.get(id));return}
  let list=waiters.get(id);if(!list){list=[];waiters.set(id,list)}
  if(node&&attr&&!list.some(x=>x.node===node&&x.attr===attr))list.push({node,attr});
  if(pending.has(id))return;
  pending.add(id);queue.push(id);pump();
 }
 function pump(){
  while(active<MAX_IN_FLIGHT&&queue.length){
   const id=queue.shift();active++;
   const timer=setTimeout(()=>{
    if(!pending.has(id))return;
    pending.delete(id);inflight.delete(id);waiters.delete(id);active=Math.max(0,active-1);pump();
   },15000);
   inflight.set(id,timer);
   try{parent.postMessage({moza47Preview:'media-request',assetId:id},'*')}
   catch(_){clearTimeout(timer);inflight.delete(id);pending.delete(id);waiters.delete(id);active=Math.max(0,active-1)}
  }
 }
 function applyOne(node,attr,id,data){
  if(!node||!node.isConnected)return;
  if(attr==='data-mz47-pending-src'||attr==='data-mz47-pending-poster'){
   const real=attr==='data-mz47-pending-src'?'src':'poster';
   if(node.getAttribute(attr)===id){node.setAttribute(real,data);node.removeAttribute(attr)}
   return;
  }
  if(attr==='textContent'){
   const before=node.textContent||'';if(before.includes(id))node.textContent=before.split(id).join(data);
   return;
  }
  const before=node.getAttribute(attr);if(before&&before.includes(id))node.setAttribute(attr,before.split(id).join(data));
 }
 function patchAttr(node,attr){
  const value=node.getAttribute(attr);if(!value||value.indexOf('moza-preview-media://')<0)return;
  const ids=value.match(pattern)||[];for(const id of new Set(ids))request(id,node,attr);
  let next=value;for(const id of new Set(ids))if(ready.has(id))next=next.split(id).join(ready.get(id));
  if(next!==value)node.setAttribute(attr,next);
 }
 function patchNode(node){
  if(!node||!node.isConnected)return;
  if(node.tagName==='STYLE'){
   const before=node.textContent||'',ids=before.match(pattern)||[];
   for(const id of new Set(ids))request(id,node,'textContent');
   let after=before;for(const id of new Set(ids))if(ready.has(id))after=after.split(id).join(ready.get(id));
   if(after!==before)node.textContent=after;
   return;
  }
  for(const [pendingAttr,realAttr] of [['data-mz47-pending-src','src'],['data-mz47-pending-poster','poster']]){
   const id=node.getAttribute(pendingAttr);if(id&&/^moza-preview-media:\/\/[avfm]\/\d+$/.test(id))request(id,node,pendingAttr);
  }
  for(const attr of ['src','poster','href','srcset','style','data-src'])patchAttr(node,attr);
 }
 function hasToken(node){
  if(node.tagName==='STYLE')return (node.textContent||'').indexOf('moza-preview-media://')>=0;
  for(const attr of ['data-mz47-pending-src','data-mz47-pending-poster','src','poster','href','srcset','style','data-src']){
   const value=node.getAttribute?.(attr);if(value&&value.indexOf('moza-preview-media://')>=0)return true;
  }
  return false;
 }
 function defer(node){
  if(!observer||node.tagName==='STYLE')return false;
  const rect=node.getBoundingClientRect?.();if(!rect||(!rect.width&&!rect.height))return false;
  const margin=500;
  return rect.bottom < -margin || rect.top > innerHeight+margin || rect.right < -margin || rect.left > innerWidth+margin;
 }
 function scan(){
  if(scanning)return;scanning=true;
  try{
   document.querySelectorAll('[src],[poster],[href],[srcset],[style],[data-src],[data-mz47-pending-src],[data-mz47-pending-poster],style').forEach(node=>{
    if(!hasToken(node))return;
    if(defer(node)){observer.observe(node);return;}
    if(observer)observer.unobserve(node);
    patchNode(node);
   });
  }finally{scanning=false}
 }
 if(typeof IntersectionObserver!=='undefined')observer=new IntersectionObserver(entries=>{
  for(const item of entries)if(item.isIntersecting){observer.unobserve(item.target);patchNode(item.target)}
 },{rootMargin:'500px 0px 500px 0px',threshold:0});
 window.addEventListener('message',ev=>{
  if(ev.source!==parent)return;
  const msg=ev.data;if(!msg||msg.moza47Preview!=='media-response'||typeof msg.assetId!=='string'||!pending.has(msg.assetId))return;
  const id=msg.assetId;pending.delete(id);const timer=inflight.get(id);if(timer)clearTimeout(timer);inflight.delete(id);active=Math.max(0,active-1);
  if(typeof msg.data==='string'&&msg.data.startsWith('data:')){
   ready.set(id,msg.data);
   const list=waiters.get(id)||[];waiters.delete(id);
   for(const item of list)applyOne(item.node,item.attr,id,msg.data);
  }else waiters.delete(id);
  pump();
 },false);
 document.addEventListener('DOMContentLoaded',()=>{
  scan();let queued=false;
  const mutation=new MutationObserver(changes=>{
   const relevant=changes.some(m=>m.type==='childList'?m.addedNodes.length>0:
    (m.target?.getAttribute?.(m.attributeName)||'').includes('moza-preview-media://'));
   if(!relevant||queued)return;
   queued=true;requestAnimationFrame(()=>{queued=false;scan()});
  });
  mutation.observe(document.documentElement,{subtree:true,childList:true,attributes:true,attributeFilter:['src','poster','href','srcset','style','data-src','data-mz47-pending-src','data-mz47-pending-poster']});
 },{once:true});
 if(document.readyState!=='loading')scan();
}
async function mz47RenderPreview(){
 const session=mz47PreviewSession;
 if(!session||!mz47PreviewIsVisible(session))return;
 const token=++session.token,id=session.current;
 const f=document.querySelector('#pv #prevframe');if(!f)return;
 mz47PreviewNotice('Loading project preview…');
 try{
  await session.idxReady;
  if(!mz47PreviewIsVisible(session)||token!==session.token)return;
  const record=await mz47LoadPreviewProject(session,id);
  if(!mz47PreviewIsVisible(session)||token!==session.token)return;
  mz47PreviewHeader(session,record.doc);
  const paths=Object.create(null),used=new Set();paths[session.root]='index.html';
  for(const p of projectIndex){if(p.id===session.root)continue;let base=niceSlug(p.name),part=base,n=2;while(used.has(part))part=base+'-'+(n++);used.add(part);paths[p.id]='projects/'+part+'/index.html'}
  if(!paths[id])paths[id]='index.html';
  const prior=mz47PreviewState(),previousExport=exportContext;
  mz48DocCache.set(id,record.doc);
  let html,routeMap;
  try{
   const guest=document.querySelector('#pvGuest')?.value||'';
   const pageId=session.pages[id]||record.doc.start||record.doc.pages[0]?.id;
   const page=record.doc.pages.find(p=>p.id===pageId)||record.doc.pages[0];
   // Compile only the active page, not every large page in the project.
   const pageDoc={...record.doc,pages:[page],start:page.id};
   const compact=mz47CompactPreviewMedia(session,record);
   Object.assign(S,record,compact,{pageId:page.id});
   exportContext={current:id,paths};
   html=siteHTML(pageDoc,{hot:!!(S._previewProto&&S.protoHot),start:page.id,guest});
   routeMap=Object.fromEntries(Object.keys(paths).map(project=>[project,hrefFor(project)]));
   const pages=record.doc.pages.map(pg=>({id:pg.id,slug:pg.slug,aliases:st36Aliases(pg),sections:(pg.sections||[]).map(sec=>sec.id)}));
   const runtime='<scr'+'ipt>('+mz47PreviewRuntime.toString()+')('+JSON.stringify(routeMap).replace(/</g,'\\u003c')+','+JSON.stringify(id)+','+JSON.stringify(pages).replace(/</g,'\\u003c')+','+JSON.stringify(location.hostname)+','+JSON.stringify(location.href)+','+JSON.stringify(paths).replace(/</g,'\\u003c')+');('+mz47PreviewMediaRuntime.toString()+')();<\/script>';
   // Do not let temporary media tokens reach <img src> before the bridge
   // resolves them: the old carousel immediately showed a false error.
   const tiny='data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=';
   html=html.replace(/\b(src|poster)=(['\"])(moza-preview-media:\/\/[avfm]\/\d+)\2/gi,(raw,attr,q,key)=>`${attr}=${q}${tiny}${q} data-mz47-pending-${attr}=${q}${key}${q}`);
   // Use the full project for page aliases and navigation while the iframe
   // contains only the selected page.
   html=st36PreviewHtml(html.replace('</head>',runtime+'</head>'));
  }finally{exportContext=previousExport;Object.assign(S,prior)}
  if(!mz47PreviewIsVisible(session)||token!==session.token)return;
  // Preserve the opaque sandbox. Avoid blob:/file: navigation leaking into editor.
  f.setAttribute('sandbox','allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox allow-downloads');
  f.removeAttribute('src');
  const section=session.pendingSection?.[id]||'';
  if(section){
   delete session.pendingSection[id];
   f.addEventListener('load',()=>{
    if(!mz47PreviewIsVisible(session)||session.token!==token||session.current!==id)return;
    f.contentWindow?.postMessage({moza47Preview:'scroll-section',sectionId:section},'*');
   },{once:true});
  }
  f.addEventListener('load',()=>{
   if(!mz47PreviewIsVisible(session)||session.token!==token||session.current!==id)return;
   session.renderedToken=token;
   mz47PreviewNotice(id===session.root?'Preview siap · project lokal':'Preview siap · linked project');
  },{once:true});
  f.srcdoc=html;
  mz47PreviewNotice('Preview dibuat · memuat halaman…');
 }catch(err){
  if(!mz47PreviewIsVisible(session)||token!==session.token)return;
  console.warn('[Moza Preview] Could not load linked project',err);
  // If the cross-project bridge fails for the project currently being edited,
  // fall back to the original single-project srcdoc renderer rather than leave
  // the user with a blank preview. Cross-project links are unavailable in this
  // fallback, but the current website remains inspectable.
  if(id===session.root){
   try{
    mz47PreviousRefreshPreview();
    mz47PreviewNotice('Preview dasar aktif · navigasi antarproyek sementara nonaktif');
    return;
   }catch(fallbackError){console.warn('[Moza Preview] Basic fallback also failed',fallbackError)}
  }
  mz47PreviewNotice('Preview error: '+(err.message||err),true);
 }
}
async function mz47PreviewGo(id,back=false,opts={}){
 const session=mz47PreviewSession;if(!session||!mz47PreviewIsVisible(session)||!id)return;
 if(session.going){mz47PreviewNotice('Please finish loading the current project first.');return;}
 session.going=true;
 mz47PreviewNotice('Opening linked project…');
 const previous={id:session.current,page:session.pages[session.current]};
 try{
  await session.idxReady;
  const data=await mz47LoadPreviewProject(session,id);
  if(!mz47PreviewIsVisible(session))return;
  if(!data.doc?.pages?.length)throw Error('The target project has no pages.');
  if(!back&&(id!==session.current||opts.pageId||opts.pageSlug))session.history.push(previous);
  session.current=id;
  if(opts.pageId||opts.pageSlug){const pg=data.doc.pages.find(p=>p.id===opts.pageId||p.slug===opts.pageSlug);if(!pg)throw Error('Destination page not found in '+data.doc.name);if(opts.sectionId&&!pg.sections?.some(sec=>sec.id===opts.sectionId))throw Error('Destination section not found in '+pg.name);session.pages[id]=pg.id;if(opts.sectionId)session.pendingSection[id]=opts.sectionId;}
  if(!session.pages[id]||!data.doc.pages.some(p=>p.id===session.pages[id]))session.pages[id]=data.doc.start||data.doc.pages[0].id;
  mz47PreviewHeader(session,data.doc);
  await mz47RenderPreview();
 }catch(err){
  mz47PreviewNotice('Cannot open linked project: '+(err.message||err),true);
  const picker=document.querySelector('#mz47-preview-project');if(picker)picker.value=session.current;
 }finally{session.going=false}
}
refreshPreviewFrame=function(...args){
 if(!mz47PreviewSession)return mz47PreviousRefreshPreview.apply(this,args);
 const session=mz47PreviewSession;
 const current=document.querySelector('#pv13Page');if(current?.value)session.pages[session.current]=current.value;
 session.renderPromise=mz47RenderPreview();
 return session.renderPromise;
};
openPreview=function(...args){
 const id=myId();
 const session={root:id,rootName:S.doc.name,current:id,pages:{[id]:S.pageId},pendingSection:{},history:[],records:new Map(),token:0,going:false,idxReady:null};
 mz47PreviewSession=session;
 session.idxReady=refresh().catch(e=>{console.warn('[Moza Preview] Project index unavailable',e)});
 const result=mz47PreviousOpenPreview.apply(this,args);
 mz47PreviewHeader(session,S.doc);
 // Let callers wait for the same render started by the original Preview action.
 return session.renderPromise||result;
};
closePreview=function(...args){if(mz47PreviewSession)++mz47PreviewSession.token;mz47PreviewSession=null;return mz47PreviousClosePreview.apply(this,args)};
document.addEventListener('change',function(ev){
 const session=mz47PreviewSession;if(!session||!mz47PreviewIsVisible(session))return;
 if(ev.target.id==='mz47-preview-project'){
  ev.stopImmediatePropagation();void mz47PreviewGo(ev.target.value);return;
 }
 if(ev.target.id==='pv13Page'||ev.target.id==='pvStart'){
  session.pages[session.current]=ev.target.value;
  // Existing prototype code sets editor-only S.protoStart: avoid cross-project IDs.
  if(session.current!==session.root&&ev.target.id==='pvStart'){
   ev.stopImmediatePropagation();void mz47RenderPreview();
  }
 }
},true);
document.addEventListener('click',function(ev){
 const btn=ev.target.closest?.('[data-mz47-preview-back]');if(!btn)return;
 ev.preventDefault();ev.stopImmediatePropagation();
 const session=mz47PreviewSession;if(!session||!session.history.length)return;
 if(session.going)return;
 const prev=session.history.pop();session.pages[prev.id]=prev.page;
 void mz47PreviewGo(prev.id,true);
},true);
window.addEventListener('message',function(event){
 const session=mz47PreviewSession;if(!session||!mz47PreviewIsVisible(session))return;
 const f=document.querySelector('#pv #prevframe');if(!f||event.source!==f.contentWindow)return;
 const msg=event.data;if(!msg||typeof msg!=='object')return;
 if(msg.moza47Preview==='media-request'){
  if(typeof msg.assetId!=='string'||msg.assetId.length>80)return;
  const data=session.media?.get(msg.assetId);
  if(typeof data==='string'&&data.startsWith('data:')){
   try{f.contentWindow?.postMessage({moza47Preview:'media-response',assetId:msg.assetId,data},'*')}catch(e){console.warn('[Moza Preview] Asset transport failed',e)}
  }
  return;
 }
 if(msg.moza47Preview==='missing-route'){
  event.stopImmediatePropagation();
  mz47PreviewNotice('Link tujuan tidak ditemukan di project ini. Periksa Link to → Page / Section.',true);
  return;
 }
 if(msg.moza47Preview==='missing-project'){
  event.stopImmediatePropagation();
  mz47PreviewNotice('Link Another Project belum memiliki tujuan. Pilih project tujuan dan pastikan project tersebut sudah dibuka/disimpan di browser ini.',true);
  return;
 }
 if(msg.moza47Preview==='navigate'){
  event.stopImmediatePropagation();
  if(typeof msg.projectId!=='string'||msg.projectId.length>150)return;
  // The target must be in the user's LOCAL project index, not an arbitrary URL.
  void mz47PreviewGo(msg.projectId,false,{pageId:String(msg.pageId||''),pageSlug:String(msg.pageSlug||''),sectionId:String(msg.sectionId||'')});return;
 }
 const doc=session.current===session.root?S.doc:session.records.get(session.current)?.doc;
 if(msg.moza47Preview==='page' || msg.atelier36==='go'){
  event.stopImmediatePropagation();
  let page;
  if(msg.moza47Preview==='page'&&typeof msg.pageId==='string')page=doc?.pages?.find(p=>p.id===msg.pageId);
  else if(typeof msg.slug==='string'&&msg.slug.length<=120)page=doc?.pages?.find(p=>p.slug===msg.slug);
  if(page){
   session.pages[session.current]=page.id;
   if(msg.moza47Preview==='page'&&msg.sectionId)session.pendingSection[session.current]=msg.sectionId;
   const sel=document.querySelector('#pv13Page');if(sel)sel.value=page.id;
   // The iframe contains only one page: always rebuild the requested page.
   void mz47RenderPreview();
  }else mz47PreviewNotice('Preview cannot find the selected page. Check Link to → Page / Section.',true);
  return;
 }
 if(typeof msg.atelierPreviewPage==='string'){
  event.stopImmediatePropagation();
  const page=doc?.pages?.find(p=>p.slug===msg.atelierPreviewPage);
  if(page&&session.pages[session.current]!==page.id){session.pages[session.current]=page.id;const sel=document.querySelector('#pv13Page');if(sel)sel.value=page.id;void mz47RenderPreview()}
 }
},true);
const mz47PreviewStyle=document.createElement('style');
mz47PreviewStyle.textContent=`
#pv.show{z-index:20000!important;isolation:isolate}
#pv .mz47-preview-controls{display:flex;align-items:center;flex-wrap:wrap;gap:6px;max-width:100%;min-width:0;font:12px system-ui,sans-serif}
#pv .mz47-preview-controls label{display:flex;align-items:center;gap:6px;white-space:nowrap;min-width:0}
#pv .mz47-preview-controls select{min-width:125px;max-width:190px;padding:6px 8px;color:#fff;background:#262f43;border:1px solid #586478;border-radius:7px}
#pv #mz47-preview-notice{font-size:11px;max-width:225px;white-space:normal;line-height:1.25;color:#cbd4e5}
#pv .mz47-preview-controls button:disabled{opacity:.38;cursor:not-allowed}
@media(max-width:820px){#pv .mz47-preview-controls select{max-width:115px}#pv #mz47-preview-notice{display:none}}
@media(max-width:760px){
 #pv .pvh{box-sizing:border-box;width:100%;max-width:100vw;gap:5px;padding:7px 8px;align-content:flex-start;max-height:154px;overflow-y:auto;overflow-x:hidden}
 #pv .pvh .devs{display:none!important}
 #pv .pvh .rd{display:none!important}
 #pv .pvh>b{flex:1 1 100%;max-width:100%;font-size:12px;line-height:1.2;margin:0}
 #pv .pvh .v13-page-label{display:flex;align-items:center;gap:4px;flex:0 1 auto;min-width:0;font-size:11px;white-space:nowrap}
 #pv .pvh .v13-page-label select{min-width:0;max-width:116px;width:116px;padding:5px 6px}
 #pv .pvh .mz47-preview-controls{flex:1 1 180px;gap:4px;min-width:0}
 #pv .pvh .mz47-preview-controls label{flex:1 1 115px;min-width:0;gap:4px}
 #pv .pvh .mz47-preview-controls select{width:100%;min-width:0;max-width:100%;padding:5px 6px}
 #pv .pvh .mz47-preview-controls button{flex:none}
 #pv .pvh label{min-width:0;gap:4px}
 #pv .pvh input{width:clamp(68px,22vw,94px);min-width:0;padding:5px 6px}
 #pv .pvh .btn{min-height:31px;padding:5px 7px;font-size:11px;line-height:1.1}
 #pv .pvh [data-v13-nav]{display:none!important}
 #pv .pvh [data-a="pv-close"]{margin-left:auto}
 #pv .pvw{width:100%;min-width:0}
 #pv iframe{max-width:100vw}
}
`;
document.head.appendChild(mz47PreviewStyle);

window.MozaCrossProject={version:'14.8.13',refresh,linkedIds,relPath,exportCombined,hrefFor,preview:()=>mz47PreviewSession&&{projectId:mz47PreviewSession.current,historyCount:mz47PreviewSession.history.length}};
})();
