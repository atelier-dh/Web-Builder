/* Moza Studio V14.8.4 — First Look arrangement & lighter workspace startup.
   Additive only. Saved projects, document layouts and exported websites are untouched.
*/
(()=>{
 'use strict';
 if(window.__mzFirstLookBootV1484)return;
 window.__mzFirstLookBootV1484=true;
 const KEY='moza:first-look:workspace:v1';
 const defaults={start:'home',sort:'newest',layout:'grid',count:6,show:true,heading:'Featured Templates',subheading:'Start with your favorite design, or choose a recent template.',accent:'#5764df',pins:[],manual:[]};
 const load=()=>{try{const j=JSON.parse(localStorage.getItem(KEY)||'{}');return {...defaults,...j,pins:Array.isArray(j.pins)?j.pins:[],manual:Array.isArray(j.manual)?j.manual:[]}}catch(_){return {...defaults,pins:[],manual:[]}}};
 let cfg=load(), observer=null, renderSeq=0, busy=0;
 const queue=[];
 const escText=v=>String(v==null?'':v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const getId=(t,i)=>{if(!t.mzflId)t.mzflId='mzfl-'+Date.now().toString(36)+'-'+i.toString(36)+'-'+Math.random().toString(36).slice(2,8);return t.mzflId};
 const ids=()=>S.userTpl.map((t,i)=>({t,i,key:getId(t,i)}));
 const sorted=()=>{
  const all=ids(),pos=new Map(cfg.manual.map((k,i)=>[k,i]));
  all.sort((a,b)=>{
   const ap=cfg.pins.includes(a.key)?1:0,bp=cfg.pins.includes(b.key)?1:0;
   if(ap!==bp)return bp-ap;
   if(cfg.sort==='az')return String(a.t.name||'').localeCompare(String(b.t.name||''));
   if(cfg.sort==='oldest')return a.i-b.i;
   if(cfg.sort==='manual')return (pos.has(a.key)?pos.get(a.key):1e6+a.i)-(pos.has(b.key)?pos.get(b.key):1e6+b.i);
   return b.i-a.i; // Newly saved templates first (default)
  });
  return all;
 };
 const shell=()=>document.querySelector('#st28-shell');
 function persist(){try{localStorage.setItem(KEY,JSON.stringify(cfg));}catch(e){console.warn('[Moza First Look] Preferences could not be saved',e)}}
 async function persistTemplateIds(){try{if(typeof saveTpl==='function')await saveTpl()}catch(e){console.warn('[Moza First Look] Template IDs not persisted',e)}}
 function templateCard(entry){return st28TemplateCard(entry.t,entry.i).replace('class="st-design-card"','class="st-design-card" data-mzfl-index="'+entry.i+'"')}
 function decorateTemplateCard(card,i,hasMove){
  if(card.querySelector('.mzfl-pin'))return;
  const row=card.querySelector('.st-card-actions');if(!row)return;
  const entry=ids().find(x=>x.i===i);if(!entry)return;
  card.dataset.mzflIndex=String(i);
  const pinned=cfg.pins.includes(entry.key);
  row.insertAdjacentHTML('afterbegin',`<button type="button" class="mzfl-pin ${pinned?'on':''}" data-mzfl="pin" data-index="${i}" title="${pinned?'Unpin':'Pin'} template" aria-label="${pinned?'Unpin':'Pin'} template">${pinned?'★ Featured':'☆ Feature'}</button>${hasMove&&cfg.sort==='manual'?`<button type="button" class="mzfl-move" data-mzfl="move" data-dir="-1" data-index="${i}" aria-label="Move template up">↑</button><button type="button" class="mzfl-move" data-mzfl="move" data-dir="1" data-index="${i}" aria-label="Move template down">↓</button>`:''}`);
 }
 function toolbar(){
  return `<div class="mzfl-toolbar"><div><b>First Look</b><small>Choose which templates visitors see at the top of your workspace.</small></div><button type="button" data-mzfl="settings">⚙ Customize First Look</button></div>`;
 }
 function decorate(){
  const host=document.querySelector('#st28-content');if(!host||!['home','templates'].includes(ST28.screen))return;
  host.style.setProperty('--mzfl-accent',cfg.accent);
  host.dataset.mzflLayout=cfg.layout;
  const group=host.querySelector('.st-card-grid');
  if(ST28.screen==='templates'){
   const title=host.querySelector('.st-section-title');if(title&&!host.querySelector('.mzfl-toolbar'))title.insertAdjacentHTML('afterend',toolbar());
   if(!group)return;
   const nodes=[...group.querySelectorAll('.st-design-card')];const lookup=new Map(nodes.map(n=>[Number(n.querySelector('[data-st="template-use"]')?.dataset.i),n]));
   for(const entry of sorted()){
    const node=lookup.get(entry.i);if(!node)continue;
    group.append(node);decorateTemplateCard(node,entry.i,true);
   }
  }else{
   const hero=host.querySelector('.st-hero');if(!hero||host.querySelector('#mzfl-featured'))return;
   const featured=sorted().filter(e=>!ST28.query||String(e.t.name||'').toLowerCase().includes(ST28.query.toLowerCase())).slice(0,Math.max(1,Math.min(12,Number(cfg.count)||6)));
   const html=`<section id="mzfl-featured" class="mzfl-featured" ${cfg.show?'':'hidden'}><div class="mzfl-featured-head"><div><h2>${escText(cfg.heading)}</h2><p>${escText(cfg.subheading)}</p></div><button type="button" data-mzfl="settings">⚙ First Look settings</button></div><div class="st-card-grid mzfl-featured-grid">${featured.map(templateCard).join('')||'<div class="st-empty">Save a reusable template to show it here.</div>'}</div><div class="mzfl-featured-foot"><button type="button" data-st="screen" data-screen="templates">Browse all templates →</button></div></section>`;
   hero.insertAdjacentHTML('afterend',html);
   host.querySelectorAll('#mzfl-featured .st-design-card').forEach(card=>decorateTemplateCard(card,Number(card.dataset.mzflIndex),false));
  }
 }
 function modal(){
  if(!shell())return;
  shell().querySelector('.mzfl-mask')?.remove();
  const safe=escText;
  shell().insertAdjacentHTML('beforeend',`<div class="mzfl-mask"><div class="mzfl-dialog" role="dialog" aria-modal="true" aria-label="First Look settings"><div class="mzfl-dialog-head"><h2>Customize First Look</h2><button type="button" data-mzfl="cancel" aria-label="Close settings">✕</button></div><p>Atur tampilan awal, template unggulan, dan urutannya. Template baru akan berada di atas secara default.</p><form id="mzfl-form"><label>Open workspace at<select name="start"><option value="home" ${cfg.start==='home'?'selected':''}>Home dashboard</option><option value="templates" ${cfg.start==='templates'?'selected':''}>My Templates first</option><option value="projects" ${cfg.start==='projects'?'selected':''}>My Projects first</option></select></label><label>Template order<select name="sort"><option value="newest" ${cfg.sort==='newest'?'selected':''}>Newest first (recommended)</option><option value="oldest" ${cfg.sort==='oldest'?'selected':''}>Oldest first</option><option value="az" ${cfg.sort==='az'?'selected':''}>Name A–Z</option><option value="manual" ${cfg.sort==='manual'?'selected':''}>Custom order (↑ ↓ on Templates)</option></select></label><label>Cards layout<select name="layout"><option value="grid" ${cfg.layout==='grid'?'selected':''}>Grid</option><option value="compact" ${cfg.layout==='compact'?'selected':''}>Compact</option><option value="list" ${cfg.layout==='list'?'selected':''}>List</option></select></label><label>Featured templates on Home<div class="mzfl-check"><input type="checkbox" name="show" ${cfg.show?'checked':''}/><span>Show Featured Templates before project cards</span></div></label><label>Templates to show<input type="number" name="count" min="1" max="12" value="${Number(cfg.count)||6}" /></label><label>Section heading<input name="heading" maxlength="90" value="${safe(cfg.heading)}" /></label><label>Subtitle<input name="subheading" maxlength="180" value="${safe(cfg.subheading)}" /></label><label>Accent color<input name="accent" type="color" value="${/^#[0-9a-f]{6}$/i.test(cfg.accent)?cfg.accent:'#5764df'}" /></label><p class="mzfl-hint">Pin templates using ☆ Feature on any card. With custom order selected, move templates using ↑ / ↓ in My Templates. These are workspace settings, not published-site settings.</p><div class="mzfl-dialog-actions"><button type="button" data-mzfl="cancel">Cancel</button><button type="submit">Save First Look</button></div></form></div></div>`);
 }
 async function applyForm(form){
  const data=new FormData(form);
  cfg={...cfg,start:['home','projects','templates'].includes(data.get('start'))?data.get('start'):'home',sort:['newest','oldest','az','manual'].includes(data.get('sort'))?data.get('sort'):'newest',layout:['grid','compact','list'].includes(data.get('layout'))?data.get('layout'):'grid',show:data.has('show'),count:Math.max(1,Math.min(12,Number(data.get('count'))||6)),heading:String(data.get('heading')||'Featured Templates').slice(0,90),subheading:String(data.get('subheading')||'').slice(0,180),accent:/^#[0-9a-f]{6}$/i.test(data.get('accent')||'')?data.get('accent'):'#5764df'};
  if(cfg.sort==='manual'&&!cfg.manual.length)cfg.manual=sorted().map(x=>x.key);
  persist();await persistTemplateIds();shell()?.querySelector('.mzfl-mask')?.remove();await st28Render();
 }
 function lightCard(p){const id=escText(p.id),name=escText(p.name||'Untitled');return `<article class="st-design-card" data-mzfl-project="${id}"><div class="st-open-preview" data-st="open" data-id="${id}"><div class="mzfl-cover-placeholder"><span>✦</span><strong>${name}</strong><small>Preview loads when visible</small></div></div><div class="st-design-meta"><div><h3>${name}</h3><small>Edited ${st28Date(p.updated)} · Open to edit</small></div>${st28Actions(p.id)}</div></article>`}
 // Avoid JSON-parsing EVERY project (some contain thousands of layers and media)
 // before the dashboard opens. Build lightweight cards from the index metadata.
 st28ProjectCard=async p=>lightCard(p);
 function runQueue(){while(busy<2&&queue.length){const job=queue.shift();if(!job.node.isConnected||job.seq!==renderSeq)continue;busy++;loadCover(job.node,job.seq).finally(()=>{busy--;runQueue()})}}
 async function loadCover(node,seq){
  if(!node.isConnected||seq!==renderSeq)return;
  try{
   const id=node.dataset.mzflProject,raw=await store.get('atelier:p:'+id);
   if(!raw||!node.isConnected||seq!==renderSeq)return;
   const obj=JSON.parse(raw),doc=obj?.doc; if(!doc)return;
   const p=doc.pages?.[0],s=p?.sections?.[0];
   const lite=s?{...doc,pages:[{...p,sections:[{...s,elements:(s.elements||[]).slice(0,window.innerWidth<900?24:48)}]}]}:doc;
   const box=node.querySelector('.st-open-preview');
   if(!box)return;
   box.innerHTML=st32Thumb(lite,id);
   const info=node.querySelector('.st-design-meta small');if(info)info.textContent=`Edited ${st28Date(obj.updated||Date.now())} · ${doc.pages?.length||0} page(s)`;
   const thumb=node.querySelector('.st32-thumb'),scene=node.querySelector('.st32-scene');
   if(thumb&&scene){const resize=()=>{if(!thumb.isConnected)return;scene.style.transform=`scale(${thumb.clientWidth/1200})`};resize();}
   if(s&&typeof ST32!=='undefined'){
    const used=st32AssetIds(s),manifest=new Map();
    for(const a of obj.assets||[])if(used.has(a.id))manifest.set(a.id,a.data||'');
    ST32.manifests.set(id,manifest);
    node.dataset.st32Project=id;
    await st32ResolveCard(node);
   }
  }catch(err){console.warn('[Moza First Look] Project cover preview was skipped',err)}
 }
 function attachLazy(){
  observer?.disconnect();renderSeq++;
  const seq=renderSeq,root=document.querySelector('#st28-content');
  const nodes=[...(root?.querySelectorAll('[data-mzfl-project]')||[])];
  if(!nodes.length)return;
  if(!('IntersectionObserver'in window)) {nodes.slice(0,4).forEach(n=>queue.push({node:n,seq}));runQueue();return}
  observer=new IntersectionObserver(entries=>{for(const en of entries)if(en.isIntersecting){observer.unobserve(en.target);queue.push({node:en.target,seq});}runQueue();},{rootMargin:'100px'});
  nodes.forEach(n=>observer.observe(n));
 }
 const oldRender=st28Render;
 st28Render=async function(...args){const r=await oldRender(...args);if(['home','templates','projects'].includes(ST28.screen)){decorate();attachLazy()}return r};
 const oldStart=st28Start;
 st28Start=async function(...args){
  // Only override after the original welcome has been seen and dismissed.
  try{if(sessionStorage.getItem('atelier:st28-visited')==='1'&&['home','projects','templates'].includes(cfg.start)){ST28.screen=cfg.start;ST28.open=true;return st28Render()}}catch(_){}
  return oldStart(...args)
 };
 document.addEventListener('click',async e=>{
  const b=e.target.closest?.('[data-mzfl]');if(!b)return;
  e.preventDefault();e.stopImmediatePropagation();
  const act=b.dataset.mzfl;
  if(act==='settings')return modal();
  if(act==='cancel'){shell()?.querySelector('.mzfl-mask')?.remove();return}
  const i=Number(b.dataset.index),t=S.userTpl[i];if(!t)return;
  const id=getId(t,i);
  if(act==='pin'){
   if(cfg.pins.includes(id))cfg.pins=cfg.pins.filter(x=>x!==id);else cfg.pins=[...cfg.pins,id];persist();await persistTemplateIds();await st28Render();return;
  }
  if(act==='move'){
   const list=sorted().map(x=>x.key),from=list.indexOf(id),to=from+Number(b.dataset.dir);
   if(from<0||to<0||to>=list.length)return;
   [list[from],list[to]]=[list[to],list[from]];cfg.manual=list;cfg.sort='manual';persist();await persistTemplateIds();await st28Render();return;
  }
 },true);
 document.addEventListener('submit',e=>{
  if(e.target?.id!=='mzfl-form')return;
  e.preventDefault();e.stopImmediatePropagation();applyForm(e.target);
 },true);
 document.addEventListener('keydown',e=>{if(e.key==='Escape')shell()?.querySelector('.mzfl-mask')?.remove()});
})();
