/* Moza Studio Advanced V14.8 — merge multiple authoring ZIP backups into current project.
   Additive, explicitly confirmed. It NEVER interprets a website/deploy ZIP as an editable project.
   No cloud writes; save uses the original local project storage mechanism. */
(function(){
'use strict';
const FILE='project.atelier.json';
let pending=null,busy=false;
const escapeHtml=v=>esc(String(v??''));
const isObj=o=>o&&typeof o==='object';
const fresh=(prefix='m48')=>typeof uid==='function'?uid(prefix):prefix+Math.random().toString(36).slice(2);
function eachNode(obj,fn,depth=0){
 if(!isObj(obj)||depth>48)return;
 if(Array.isArray(obj)){for(const v of obj)eachNode(v,fn,depth+1);return}
 fn(obj);for(const [k,v] of Object.entries(obj))if(k!=='data'&&k!=='html'&&k!=='embedCode')eachNode(v,fn,depth+1);
}
function usedIds(doc,assets,videos,fonts){const set=new Set();
 eachNode(doc,x=>{if(typeof x.id==='string'&&x.id)set.add(x.id)});
 for(const list of [assets,videos,fonts])for(const x of list||[])if(typeof x?.id==='string'&&x.id)set.add(x.id);
 return set;
}
function candidateIds(src){
 const counts=new Map();
 const add=x=>{if(typeof x==='string'&&x)counts.set(x,(counts.get(x)||0)+1)};
 for(const p of src.doc.pages||[])eachNode(p,x=>add(x.id));
 for(const key of ['assets','videos','fonts'])for(const x of src[key]||[])add(x?.id);
 const ds=src.doc.mozaDesignSystem;
 if(ds)eachNode(ds,x=>add(x.id));
 for(const [id,n] of counts)if(n>1)throw Error(`ZIP ${src.name}: duplicate object ID ${id.slice(0,40)}. Fix duplicate IDs in source project before merging.`);
 return counts;
}
function uniqueSlug(value,used){
 let root=String(value||'imported-page').replace(/[^a-z0-9-]/gi,'-').replace(/-+/g,'-').replace(/^-|-$/g,'').toLowerCase().slice(0,65)||'imported-page';
 let next=root,k=2;while(used.has(next))next=(root.slice(0,55)+'-'+k++);
 used.add(next);return next;
}
function mapObjects(obj, ids, slugs, fonts){
 if(Array.isArray(obj))return obj.map(x=>mapObjects(x,ids,slugs,fonts));
 if(!isObj(obj))return obj;
 const out={};
 for(const [k,v] of Object.entries(obj)){
  if(typeof v==='string'){
   if(ids.has(v))out[k]=ids.get(v);
   else if(fonts.has(v))out[k]=fonts.get(v);
   else if(v.startsWith('asset:')&&ids.has(v.slice(6)))out[k]='asset:'+ids.get(v.slice(6));
   else if(k==='slug'&&slugs.has(v))out[k]=slugs.get(v);
   else if((k==='url'||k==='href'||k==='link')&&v.startsWith('#/')){
    const seg=v.slice(2).split('/');
    out[k]=slugs.has(seg[0])?'#/'+[slugs.get(seg[0]),...seg.slice(1)].join('/'):v;
   } else out[k]=v;
  }else out[k]=mapObjects(v,ids,slugs,fonts);
 }
 return out;
}
function planMerge(inputs,current){
 const existingIds=usedIds(current.doc,current.assets,current.videos,current.fonts);
 const slugs=new Set((current.doc.pages||[]).map(p=>p.slug));
 const fontNames=new Map((current.fonts||[]).map(f=>[f.family,f.data]));
 const additions={pages:[],assets:[],videos:[],fonts:[],components:[],variantSets:[],styles:[],variables:[]};
 const details=[];let totalRenamedIds=0,totalRenamedSlugs=0;
 for(const src of inputs){
  const counts=candidateIds(src),idMap=new Map(),slugMap=new Map(),fontMap=new Map();
  for(const id of counts.keys()){
   if(existingIds.has(id)){
    let candidate;do{candidate=fresh('mz48-')}while(existingIds.has(candidate));
    idMap.set(id,candidate);existingIds.add(candidate);totalRenamedIds++;
   }else existingIds.add(id);
  }
  const sourceSlugs=new Set();for(const pg of src.doc.pages){
   if(pg.slug&&sourceSlugs.has(pg.slug))throw Error('ZIP '+src.name+': duplicate page slug '+pg.slug+'; fix source slugs before merging.');
   sourceSlugs.add(pg.slug);
   const newSlug=uniqueSlug(pg.slug||pg.name,slugs);
   if(newSlug!==pg.slug){slugMap.set(pg.slug,newSlug);totalRenamedSlugs++}
  }
  for(const font of src.fonts){
   if(!font?.family)continue;
   if(fontNames.has(font.family)){
    if(fontNames.get(font.family)===font.data)continue;
    let n=2,base=String(font.family).slice(0,70),name;
    do{name=base+' (import '+n+++')'}while(fontNames.has(name));
    fontMap.set(font.family,name);fontNames.set(name,font.data);
   } else fontNames.set(font.family,font.data);
  }
  const copy=v=>mapObjects(v,idMap,slugMap,fontMap);
  additions.pages.push(...src.doc.pages.map(pg=>{
   const result=copy(pg);result.slug=slugMap.get(pg.slug)||pg.slug||uniqueSlug(pg.name,slugs);return result;
  }));
  for(const key of ['assets','videos','fonts']){
   additions[key].push(...(src[key]||[]).map(copy).filter(x=>key!=='fonts'||!current.fonts.some(f=>f.family===x.family&&f.data===x.data)));
  }
  const ds=src.doc.mozaDesignSystem||{};
  for(const key of ['components','variantSets','styles','variables'])additions[key].push(...(ds[key]||[]).map(copy));
  details.push({name:src.name,pages:src.doc.pages.length,assets:src.assets.length,videos:src.videos.length,fonts:src.fonts.length});
 }
 return {additions,details,totalRenamedIds,totalRenamedSlugs};
}
async function readFiles(files){
 const out=[];let total=0;
 for(const file of files){
  total+=file.size;
  if(file.size>140*1024*1024||total>230*1024*1024)throw Error('ZIP terlalu besar untuk merge di browser (maksimum 140 MB/file, 230 MB total). Gunakan komputer dan optimalkan media dulu.');
  const content=await a328ReadZipEntry(file,FILE);
  if(!content)throw Error(file.name+' bukan ZIP editable Moza (project.atelier.json tidak ada). ZIP website deploy tidak dapat di-merge.');
  const data=JSON.parse(content);
  if(data.format!=='atelier-editable-project'||!Array.isArray(data.doc?.pages)||!data.doc.pages.length)throw Error('Struktur ZIP editable tidak valid: '+file.name);
  if(data.doc.pages.length>350)throw Error('Terlalu banyak halaman dalam '+file.name+'.');
  const src={name:file.name,doc:data.doc,assets:Array.isArray(data.assets)?data.assets:[],videos:Array.isArray(data.videos)?data.videos:[],fonts:Array.isArray(data.fonts)?data.fonts:[],music:data.music||null};
  if(src.assets.length>3000||src.videos.length>1500)throw Error('Terlalu banyak aset dalam '+file.name);
  out.push(src);
 }
 return out;
}
const msg=(text,bad=false)=>{const node=document.getElementById('mz48-merge-status');if(node){node.textContent=text;node.style.color=bad?'#a82828':'#356a4b'}};
function showPicker(){
 if(busy)return;
 let input=document.getElementById('mz48-filepicker');
 if(!input){input=document.createElement('input');input.type='file';input.multiple=true;input.accept='.zip,application/zip';input.id='mz48-filepicker';input.hidden=true;document.body.appendChild(input);
  input.addEventListener('change',async()=>{
   const files=[...(input.files||[])];input.value='';if(!files.length)return;
   try{
    msg('Membaca '+files.length+' ZIP editable…');
    const incoming=await readFiles(files);
    pending=planMerge(incoming,{doc:S.doc,assets:S.assets,videos:S.videos,fonts:S.fonts});
    const p=document.getElementById('mz48-merge-results');if(p){
     p.innerHTML=`<b>${pending.details.reduce((n,d)=>n+d.pages,0)} halaman baru siap digabung</b><div class="hint">${pending.details.map(d=>escapeHtml(d.name)+' · '+d.pages+' pages · '+d.assets+' images · '+d.videos+' videos').join('<br>')}</div><p>${pending.totalRenamedIds} ID bentrok dan ${pending.totalRenamedSlugs} slug halaman bentrok telah direncanakan untuk diganti tanpa menimpa data lama.</p>`;
    }
    const ok=document.getElementById('mz48-merge-confirm');if(ok)ok.disabled=false;
    msg('Periksa ringkasan, unduh backup project aktif, lalu konfirmasi merge.');
   }catch(err){pending=null;const p=document.getElementById('mz48-merge-results');if(p)p.textContent='';const ok=document.getElementById('mz48-merge-confirm');if(ok)ok.disabled=true;msg(err.message||String(err),true)}
  });
 }
 input.click();
}
function showDialog(){
 pending=null;
 showModal(mbox('Merge Editable ZIPs into Current Project',`<p>Gabungkan satu atau beberapa <b>ZIP Proyek Editable</b> ke <b>${escapeHtml(S.doc.name)}</b>. Semua halaman baru akan tetap editable. Project yang sedang dibuka tidak akan diganti.</p>
 <div class="a33-export-choice" style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn pri" data-a="mz48-merge-select">Select editable ZIP files…</button><button class="btn" data-a="mz48-merge-backup">Download current-project backup</button></div>
 <div id="mz48-merge-results" style="padding:9px;background:#f6f8fc;border:1px solid #e0e6f0;border-radius:9px;min-height:30px"></div>
 <p class="hint">Halaman, section, layer, media, custom fonts, serta reusable design tokens/components akan digabung. Theme utama, default navigation, RSVP settings, dan cloud connection dari project aktif tetap dipertahankan. Global floating items dari ZIP lain tidak otomatis digabung.</p>
 <p class="hint">Rekomendasi: jalankan di desktop. File sangat besar bisa melebihi kapasitas browser. Simpan backup sebelum menekan Merge.</p>
 <label style="display:flex;align-items:center;gap:8px"><input type="checkbox" id="mz48-backed-up"> Saya sudah menyimpan backup project yang sekarang.</label>
 <p id="mz48-merge-status" style="font-size:12px;min-height:18px"></p>`,
 `<button class="btn" data-a="mclose">Cancel</button><button class="btn pri" data-a="mz48-merge-confirm" id="mz48-merge-confirm" disabled>Merge into Current Project</button>`));
}
async function apply(){
 if(busy||!pending||!document.getElementById('mz48-backed-up')?.checked)return msg('Backup dan centang konfirmasi dulu sebelum merge.',true);
 busy=true;const button=document.getElementById('mz48-merge-confirm');if(button)button.disabled=true;
 const orig={doc:S.doc,assets:S.assets,videos:S.videos,fonts:S.fonts,pageId:S.pageId,sel:S.sel};
 try{
  msg('Menyimpan versi awal dan menyiapkan merge…');
  const saved=await saveNow();if(!saved)throw Error('Project saat ini gagal disimpan. Merge dibatalkan.');
  const a=pending.additions;
  const doc=clone(orig.doc);
  doc.pages.push(...a.pages);
  if(a.components.length||a.styles.length||a.variables.length||a.variantSets.length){
   doc.mozaDesignSystem=doc.mozaDesignSystem||{version:4,components:[],variantSets:[],styles:[],variables:[]};
   for(const key of ['components','variantSets','styles','variables']){
    if(!Array.isArray(doc.mozaDesignSystem[key]))doc.mozaDesignSystem[key]=[];
    doc.mozaDesignSystem[key].push(...a[key]);
   }
  }
  S.doc=doc;S.assets=[...orig.assets,...a.assets];S.videos=[...orig.videos,...a.videos];S.fonts=[...orig.fonts,...a.fonts];
  S.sel=null;S.undo=[];S.redo=[];
  msg('Menyimpan '+a.pages.length+' halaman baru…');
  if(!await saveNow())throw Error('Local storage penuh atau tidak bisa menyimpan hasil merge. Tidak ada perubahan cloud.');
  pending=null;closeModal();renderAll();fitZoom();
  toast('Merge selesai: '+a.pages.length+' halaman ditambahkan. Project aktif tetap sama.',7000);
 }catch(err){
  Object.assign(S,orig);
  try{renderAll()}catch(_){/* preserve original state */}
  msg('Merge dibatalkan: '+(err.message||err),true);
  console.error('[Moza Editable Merge]',err);
 }finally{busy=false;if(button)button.disabled=false}
}
ACT['mz48-merge-open']=showDialog;
ACT['mz48-merge-select']=showPicker;
ACT['mz48-merge-backup']=()=>a328SaveProjectZip();
ACT['mz48-merge-confirm']=()=>void apply();
const oldProjects=openProjects;
openProjects=function(...args){const ret=oldProjects.apply(this,args);const target=document.querySelector('#modal [data-a="a328-upload-zip"]');
 if(target&&!document.querySelector('#modal [data-a="mz48-merge-open"]'))target.insertAdjacentHTML('afterend','<button class="btn" data-a="mz48-merge-open">Merge Editable ZIPs…</button>');return ret;};
const oldMenu=ACT.tmenu;
ACT.tmenu=function(...args){const r=oldMenu.apply(this,args);const target=document.querySelector('#tmenu [data-a="a328-upload-zip"]');
 if(target&&!document.querySelector('#tmenu [data-a="mz48-merge-open"]'))target.insertAdjacentHTML('afterend','<button data-a="mz48-merge-open"><span class="ck">▧</span>Merge Editable ZIPs into Current Project</button>');return r;};
window.MozaEditableMerge={version:'14.8',preview:()=>pending?{newPages:pending.additions.pages.length,remappedIds:pending.totalRenamedIds}:null};
})();
