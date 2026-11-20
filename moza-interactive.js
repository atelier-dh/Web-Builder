/* Moza Studio V6 — editable Accordion FAQ + Sliding Tabs.
 * Keeps the existing isolated-widget architecture while adding custom content blocks,
 * copy-to-clipboard controls, per-item box styling and project/GitHub font support.
 */
(function(){
'use strict';
if(window.MozaInteractive&&window.MozaInteractive.version==='14.9.0')return;
const MAX_ITEMS=8,MAX_BLOCKS=12;
const safe=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const safeColor=(s,def)=>/^#[0-9a-fA-F]{6}$/.test(String(s))?String(s):def;
const validState=()=>typeof S!=='undefined'&&S?.mode==='design'&&S.doc&&Array.isArray(S.doc.pages);
const target=()=>validState()&&S.sel?.k==='el'?T('el'):null;
const imgURL=v=>/^https:\/\/[^\s<>"']+$/i.test(String(v||''))||/^http:\/\/[^\s<>"']+$/i.test(String(v||''))?String(v):'';
const safeHref=v=>/^(https?:\/\/|mailto:|tel:|#)/i.test(String(v||''))?String(v):'#';
const itemDefaults=kind=>kind==='accordion'?
 [{title:'Where is the wedding?',body:'Find venue and location details here.',blocks:[]},{title:'What time does it start?',body:'Add the ceremony and reception schedule here.',blocks:[]},{title:'How do I RSVP?',body:'Use the RSVP form on our invitation.',blocks:[]}]:
 [{title:'Our Story',body:'Discover more about our journey.',blocks:[]},{title:'The Celebration',body:'Ceremony and reception details.',blocks:[]},{title:'Location',body:'Discover the venue and travel information.',blocks:[]}];
function defaultConfig(kind){return{version:2,kind,items:itemDefaults(kind),accent:'#b76e79',paper:'#ffffff',text:'#302c32',exclusive:true,font:'$body',titleFont:'$head',bodyFont:'$body',titleSize:16,bodySize:14,radius:12,borderWidth:1,boxShape:'rounded',boxWidth:100,boxMinHeight:0,boxPadding:14,labels:{accordionTitle:'Frequently Asked Questions',tabsTitle:'Information',previous:'Previous',next:'Next',toggleSymbol:'+'}};}
function resolveFont(v,fallback){
 const raw=String(v||fallback||'Arial');
 if(raw==='$head')return String(S?.doc?.theme?.headFont||'Georgia');
 if(raw==='$body')return String(S?.doc?.theme?.bodyFont||'Arial');
 return raw;
}
function cssFamily(v){
 const family=resolveFont(v,'Arial').replace(/[^\p{L}\p{N}_ -]/gu,'').trim()||'Arial';
 return `"${family}",system-ui,sans-serif`;
}
function fontChoices(){
 const out=[['$head','Heading Font'],['$body','Body Font'],['Arial','Arial'],['Georgia','Georgia'],['Verdana','Verdana'],['Tahoma','Tahoma'],['Trebuchet MS','Trebuchet MS'],['Times New Roman','Times New Roman'],['system-ui','System UI']];
 try{(S.fonts||[]).forEach(f=>{if(f?.family)out.push([f.family,f.family+' · Uploaded'])})}catch(_){}
 try{if(typeof A321!=='undefined')(A321.fonts||[]).forEach(f=>{if(f?.family)out.push([f.family,f.family+' · GitHub'])})}catch(_){}
 try{if(typeof GOOGLE!=='undefined')GOOGLE.forEach(f=>out.push([f[0],f[0]+' · Google']))}catch(_){}
 const seen=new Set();return out.filter(([v])=>{if(seen.has(v))return false;seen.add(v);return true});
}
function fontOptionMarkup(selected){
 return fontChoices().map(([v,label])=>`<option value="${safe(v)}" ${selected===v?'selected':''}>${safe(label)}</option>`).join('');
}
function widgetFontAssets(config){
 const selected=[resolveFont(config.titleFont||config.font||'$head','Georgia'),resolveFont(config.bodyFont||config.font||'$body','Arial')];
 const names=new Set(selected);
 let faces='';
 try{
  (S.fonts||[]).filter(f=>f&&names.has(f.family)&&String(f.data||'').startsWith('data:')).forEach(f=>{
   const fmt=({woff2:'woff2',woff:'woff',truetype:'truetype',opentype:'opentype'}[String(f.format||'').toLowerCase()]||'woff2');
   const family=String(f.family).replace(/[^\p{L}\p{N}_ -]/gu,'');
   faces+=`@font-face{font-family:"${family}";src:url("${f.data}") format("${fmt}");font-weight:100 900;font-style:normal;font-display:swap;}`;
  });
 }catch(_){}
 try{
  if(typeof A321!=='undefined'&&typeof a321FontRule==='function'){
   (A321.fonts||[]).filter(f=>f&&names.has(f.family)).forEach(f=>{try{faces+=a321FontRule(f)}catch(_){}});
  }
 }catch(_){}
 let links='';
 try{
  if(typeof GOOGLE!=='undefined'){
   [...names].forEach(name=>{
    const g=GOOGLE.find(x=>x[0]===name);
    if(g)links+=`<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=${encodeURIComponent(name).replace(/%20/g,'+')}&display=swap">`;
   });
  }
 }catch(_){}
 return {faces,links,title:cssFamily(selected[0]),body:cssFamily(selected[1])};
}
function normalizeItem(it,config){
 const style=it.style||{};
 return {
  title:String(it.title||'Title').slice(0,160),
  body:String(it.body||'').slice(0,2400),
  image:String(it.image||'').slice(0,1000),
  blocks:(Array.isArray(it.blocks)?it.blocks:[]).slice(0,MAX_BLOCKS).map(b=>({
   type:['text','button','copy','icon','image'].includes(b.type)?b.type:'text',
   text:String(b.text||'').slice(0,1800),
   label:String(b.label||'').slice(0,120),
   value:String(b.value||'').slice(0,1800),
   url:String(b.url||'').slice(0,1000),
   symbol:String(b.symbol||'✦').slice(0,12),
   showIcon:b.showIcon!==false,
   iconOnly:!!b.iconOnly
  })),
  style:{
   width:Math.max(30,Math.min(100,Number(style.width??config.boxWidth??100))),
   minHeight:Math.max(0,Math.min(500,Number(style.minHeight??config.boxMinHeight??0))),
   shape:['rounded','square','pill','arch','blob'].includes(style.shape||config.boxShape)?(style.shape||config.boxShape):'rounded',
   radius:Math.max(0,Math.min(80,Number(style.radius??config.radius??12))),
   padding:Math.max(0,Math.min(60,Number(style.padding??config.boxPadding??14))),
   background:safeColor(style.background||config.paper,'#ffffff'),
   borderColor:safeColor(style.borderColor||config.accent,'#b76e79'),
   borderWidth:Math.max(0,Math.min(8,Number(style.borderWidth??config.borderWidth??1)))
  }
 };
}
const copyIcon='<svg class="mza-copy-icon" viewBox="0 0 24 24" aria-hidden="true"><rect x="8" y="8" width="12" height="13" rx="2" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M16 5V4a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2h1" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>';
function blockMarkup(b){
 if(b.type==='text')return `<p class="mza-block-text">${safe(b.text).replace(/\n/g,'<br>')}</p>`;
 if(b.type==='button')return `<a class="mza-action-button" href="${safe(safeHref(b.url))}" ${/^https?:\/\//i.test(b.url)?'target="_blank" rel="noopener noreferrer"':''}>${safe(b.label||'Open link')}</a>`;
 if(b.type==='copy')return `<button class="mza-copy${b.iconOnly?' icon-only':''}" type="button" data-mza-copy="${safe(b.value)}" aria-label="${safe(b.label||'Copy to clipboard')}" title="${safe(b.label||'Copy to clipboard')}">${b.showIcon?copyIcon:''}${b.iconOnly?'':`<span class="mza-copy-label">${safe(b.label||'Copy')}</span>`}<span class="mza-copy-state" aria-live="polite"></span></button>`;
 if(b.type==='icon')return `<span class="mza-custom-icon" aria-label="${safe(b.label||'Icon')}">${safe(b.symbol||'✦')}${b.label?`<span>${safe(b.label)}</span>`:''}</span>`;
 if(b.type==='image'&&imgURL(b.url))return `<img class="mza-item-photo" loading="lazy" alt="" src="${safe(imgURL(b.url))}">`;
 return '';
}
function itemBoxStyle(it){
 const s=it.style;
 const radiusRule=s.shape==='rounded'?`border-radius:${s.radius}px;`:s.shape==='square'?'border-radius:0;':'';
 return `width:${s.width}%;min-height:${s.minHeight}px;padding:${s.padding}px;background:${s.background};border:${s.borderWidth}px solid ${s.borderColor};${radiusRule}`;
}
function itemMarkup(items,kind,labelsUI){
 if(kind==='accordion')return items.map((it,i)=>`<details class="mza-item mza-shape-${it.style.shape}" data-shape="${it.style.shape}" style="${itemBoxStyle(it)}" ${i===0?'open':''}><summary><span>${safe(it.title)}</span><span class="mza-plus" aria-hidden="true">${safe(labelsUI.toggleSymbol)}</span></summary><div class="mza-answer"><div class="mza-body-text">${safe(it.body).replace(/\n/g,'<br>')}</div>${imgURL(it.image)?`<img class="mza-item-photo" loading="lazy" alt="" src="${safe(imgURL(it.image))}">`:''}${it.blocks.length?`<div class="mza-blocks">${it.blocks.map(blockMarkup).join('')}</div>`:''}</div></details>`).join('');
 return items.map((it,i)=>`<section class="mza-slide mza-shape-${it.style.shape}" data-shape="${it.style.shape}" style="${itemBoxStyle(it)}" role="tabpanel" id="slide-${i}" aria-labelledby="tab-${i}" tabindex="0"><h3>${safe(it.title)}</h3><div class="mza-body-text">${safe(it.body).replace(/\n/g,'<br>')}</div>${imgURL(it.image)?`<img class="mza-item-photo" loading="lazy" alt="" src="${safe(imgURL(it.image))}">`:''}${it.blocks.length?`<div class="mza-blocks">${it.blocks.map(blockMarkup).join('')}</div>`:''}</section>`).join('');
}
function copyRuntime(){
 return `(function(){function fallbackCopy(text){var t=document.createElement('textarea');t.value=text;t.setAttribute('readonly','');t.style.position='fixed';t.style.opacity='0';t.style.pointerEvents='none';document.body.appendChild(t);t.select();var ok=false;try{ok=document.execCommand('copy')}catch(e){}t.remove();return ok}document.addEventListener('click',async function(e){var b=e.target&&e.target.closest&&e.target.closest('[data-mza-copy]');if(!b)return;e.preventDefault();var value=b.getAttribute('data-mza-copy')||'',ok=false;try{if(navigator.clipboard&&navigator.clipboard.writeText){await navigator.clipboard.writeText(value);ok=true}}catch(e){}if(!ok)ok=fallbackCopy(value);var state=b.querySelector('.mza-copy-state');if(state)state.textContent=ok?'Copied!':'Copy failed';b.classList.toggle('copied',ok);b.setAttribute('aria-label',ok?'Copied to clipboard':(b.getAttribute('title')||'Copy to clipboard'));setTimeout(function(){if(state)state.textContent='';b.classList.remove('copied')},1500)})})();`;
}
function buildWidget(config){
 const kind=config.kind==='tabs'?'tabs':'accordion';
 const labelsUI={accordionTitle:'Frequently Asked Questions',tabsTitle:'Information',previous:'Previous',next:'Next',toggleSymbol:'+',...(config.labels||{})};
 Object.keys(labelsUI).forEach(k=>labelsUI[k]=String(labelsUI[k]).slice(0,90));
 const items=(Array.isArray(config.items)?config.items:[]).slice(0,MAX_ITEMS).map(x=>normalizeItem(x,config));
 const accent=safeColor(config.accent,'#b76e79'),paper=safeColor(config.paper,'#ffffff'),text=safeColor(config.text,'#302c32');
 const titleFont=resolveFont(config.titleFont||config.font||'$head','Georgia'),bodyFont=resolveFont(config.bodyFont||config.font||'$body','Arial');
 const fontPack=widgetFontAssets({...config,titleFont,bodyFont});
 const ts=Math.max(9,Math.min(64,Number(config.titleSize)||16)),bs=Math.max(9,Math.min(48,Number(config.bodySize)||14));
 const radius=Math.max(0,Math.min(45,Number(config.radius)||12)),borderWidth=Math.max(0,Math.min(8,Number(config.borderWidth)||1));
 const common=`:root{color-scheme:light}*{box-sizing:border-box}html,body{margin:0;width:100%;min-height:100%;font:${bs}px/1.55 ${fontPack.body};color:${text};background:transparent}body{display:block;padding:8px}button,summary{-webkit-tap-highlight-color:transparent}button:focus-visible,summary:focus-visible,.mza-slide:focus-visible{outline:3px solid ${accent};outline-offset:3px}`;
 const base=`<style>${fontPack.faces}.mza-item-photo{display:block;max-width:100%;width:100%;max-height:230px;object-fit:cover;border-radius:${radius}px;margin-top:12px}.mza-blocks{display:flex;flex-wrap:wrap;align-items:center;gap:8px;margin-top:12px}.mza-block-text{margin:0;white-space:pre-wrap;overflow-wrap:anywhere}.mza-action-button{display:inline-flex;align-items:center;justify-content:center;min-height:38px;padding:9px 15px;border-radius:9px;background:${accent};color:#fff;text-decoration:none;font:600 ${bs}px ${fontPack.body};max-width:100%;overflow-wrap:anywhere}.mza-copy{display:inline-flex;align-items:center;justify-content:center;gap:7px;min-height:38px;padding:8px 12px;border:1px solid ${accent}88;border-radius:9px;background:${paper};color:${text};font:600 ${bs}px ${fontPack.body};cursor:pointer;max-width:100%}.mza-copy-icon{width:17px;height:17px;flex:none}.mza-copy.icon-only{width:40px;min-width:40px;padding:8px}.mza-copy.copied{border-color:#218653;color:#176b42}.mza-copy-state{font-size:10px}.mza-custom-icon{display:inline-flex;align-items:center;gap:6px;color:${accent};font-size:22px;line-height:1}.mza-custom-icon span{font:500 ${bs}px ${fontPack.body};color:${text}}`;
 const boxShapes=`.mza-item.mza-shape-pill{border-radius:999px}.mza-item.mza-shape-arch{border-radius:999px 999px 12px 12px}.mza-item.mza-shape-blob{border-radius:30% 70% 70% 30%/30% 30% 70% 70%}.mza-slide.mza-shape-pill{border-radius:999px}.mza-slide.mza-shape-arch{border-radius:999px 999px 12px 12px}.mza-slide.mza-shape-blob{border-radius:30% 70% 70% 30%/30% 30% 70% 70%}`;
 if(kind==='accordion'){
  return `${fontPack.links}${base}.mza-wrap{width:100%;margin:0 auto}.mza-item{display:block;max-width:100%;margin:0 auto 9px;overflow:hidden;border-style:solid}.mza-item[open]{border-color:${accent}}.mza-item summary{cursor:pointer;min-height:46px;padding:12px 14px;display:flex;gap:12px;align-items:center;justify-content:space-between;list-style:none;font-weight:650;font-family:${fontPack.title};touch-action:manipulation}.mza-item summary::-webkit-details-marker{display:none}.mza-item summary span:first-child{font-size:${ts}px;overflow-wrap:anywhere}.mza-plus{font-size:22px;font-weight:400;color:${accent};transition:transform .2s;flex:none}.mza-item[open] .mza-plus{transform:rotate(45deg)}.mza-answer{font-size:${bs}px;padding:0 14px 16px;white-space:normal;overflow-wrap:anywhere;color:${text};opacity:.9;font-family:${fontPack.body}}.mza-body-text{white-space:pre-wrap;overflow-wrap:anywhere}.mza-item-photo{margin-top:10px}${boxShapes}@media(max-width:420px){body{padding:3px}.mza-item summary{min-height:44px;padding:10px 11px}.mza-item summary span:first-child{font-size:${ts}px}.mza-answer{padding:0 11px 14px;font-size:${bs}px}}@media(prefers-reduced-motion:reduce){*{transition:none!important}}</style><div class="mza-wrap" aria-label="${safe(labelsUI.accordionTitle)}">${itemMarkup(items,kind,labelsUI)}</div>${config.exclusive?'<script>document.querySelectorAll(".mza-item").forEach(d=>d.addEventListener("toggle",()=>{if(d.open)document.querySelectorAll(".mza-item").forEach(x=>{if(x!==d)x.open=false})}));</script>':''}<script>${copyRuntime()}</script>`;
 }
 const labels=items.map((x,i)=>`<button type="button" role="tab" class="mza-tab" id="tab-${i}" aria-selected="${i===0?'true':'false'}" aria-controls="slide-${i}" tabindex="${i===0?'0':'-1'}" data-tab="${i}">${safe(x.title)}</button>`).join('');
 return `${fontPack.links}${base}.mza-root{background:${paper};border:${borderWidth}px solid ${accent}44;border-radius:${radius}px;overflow:hidden;width:100%;height:100%;display:flex;flex-direction:column}.mza-tabs{display:flex;gap:4px;padding:10px 10px 6px;overflow-x:auto;overscroll-behavior-x:contain;scrollbar-width:thin;flex:0 0 auto}.mza-tab{flex:0 0 auto;white-space:nowrap;border:0;background:transparent;color:${text};padding:10px 14px;font:600 ${ts}px ${fontPack.title};cursor:pointer;border-bottom:2px solid transparent;touch-action:manipulation}.mza-tab[aria-selected=true]{color:${accent};border-color:${accent};background:${accent}10}.mza-viewport{overflow:hidden;flex:1 1 auto;min-height:0;touch-action:pan-y}.mza-track{display:flex;height:100%;transition:transform .32s ease;will-change:transform}.mza-slide{flex:0 0 ${Math.max(30,Math.min(100,Number(config.boxWidth)||100))}%;height:auto;min-height:100%;margin:0 auto;padding:14px 18px;overflow-y:auto;overflow-wrap:anywhere;background:${paper};border:${borderWidth}px solid ${accent}44;border-radius:${radius}px}.mza-slide h3{font:700 ${ts}px ${fontPack.title};margin:0 0 11px;color:${accent}}.mza-slide .mza-body-text{font: ${bs}px/1.55 ${fontPack.body};white-space:pre-wrap}.mza-nav{display:flex;justify-content:space-between;align-items:center;padding:7px 12px;border-top:1px solid ${accent}33}.mza-arrow{border:1px solid ${accent}55;background:${paper};color:${accent};border-radius:8px;min-height:34px;min-width:45px;cursor:pointer;font-size:19px}${boxShapes}@media(max-width:420px){body{padding:2px}.mza-tab{font-size:${ts}px;padding:9px 11px}.mza-slide{padding:12px 14px}.mza-slide h3{font-size:${ts}px}}@media(prefers-reduced-motion:reduce){.mza-track{transition:none}}</style><div class="mza-root"><div class="mza-tabs" role="tablist" aria-label="${safe(labelsUI.tabsTitle)}">${labels}</div><div class="mza-viewport"><div class="mza-track">${itemMarkup(items,kind,labelsUI)}</div></div><div class="mza-nav"><button class="mza-arrow" type="button" data-step="-1" aria-label="${safe(labelsUI.previous)}">‹</button><span class="mza-count" aria-live="polite">1 / ${items.length}</span><button class="mza-arrow" type="button" data-step="1" aria-label="${safe(labelsUI.next)}">›</button></div></div><script>(function(){const r=document.querySelector('.mza-root'),tabs=[...r.querySelectorAll('[role=tab]')],track=r.querySelector('.mza-track'),count=r.querySelector('.mza-count'),viewport=r.querySelector('.mza-viewport');let index=0,start=null;const go=(n,focus)=>{index=Math.max(0,Math.min(tabs.length-1,n));track.style.transform='translateX(-'+(index*100)+'%)';tabs.forEach((t,i)=>{t.setAttribute('aria-selected',i===index?'true':'false');t.tabIndex=i===index?0:-1});count.textContent=(index+1)+' / '+tabs.length;tabs[index].scrollIntoView({block:'nearest',inline:'nearest'});if(focus)tabs[index].focus()};tabs.forEach((t,i)=>{t.addEventListener('click',()=>go(i,false));t.addEventListener('keydown',e=>{if(e.key==='ArrowRight'||e.key==='ArrowLeft'||e.key==='Home'||e.key==='End'){e.preventDefault();go(e.key==='Home'?0:e.key==='End'?tabs.length-1:index+(e.key==='ArrowRight'?1:-1),true)}})});r.querySelectorAll('[data-step]').forEach(b=>b.addEventListener('click',()=>go(index+Number(b.dataset.step),false)));viewport.addEventListener('touchstart',e=>{start=e.changedTouches[0].clientX},{passive:true});viewport.addEventListener('touchend',e=>{if(start===null)return;const delta=e.changedTouches[0].clientX-start;if(Math.abs(delta)>45)go(index+(delta<0?1:-1),false);start=null},{passive:true});})();</script><script>${copyRuntime()}</script>`;
}
function add(kind){
 if(!validState()){typeof toast==='function'&&toast('Buka proyek di Design Editor dulu.');return false}
 const config=defaultConfig(kind);
 const el=newEl('embed',{name:kind==='accordion'?'Accordion FAQ':'Sliding Tabs',w:kind==='accordion'?580:650,h:kind==='accordion'?355:310,embedKind:'widget',embedLive:true,embedCode:buildWidget(config),mozaWidget:config});
 addEl(el,selSecId());
 if(typeof setGeom==='function'){
  const d=el.y;
  setGeom(el,'t',{x:44,w:680,h:kind==='accordion'?390:330,y:Math.max(12,Math.round(d*768/1200))});
  setGeom(el,'m',{x:15,w:345,h:kind==='accordion'?400:300,y:Math.max(12,Math.round(d*375/1200))});
  if(typeof afterEdit==='function')afterEdit();
 }
 if(typeof toast==='function')toast((kind==='accordion'?'Accordion':'Sliding Tabs')+' ditambahkan. Tambahkan blok teks, button, atau Copy to Clipboard di Properties.');
 return true;
}
function mutate(fn){
 const e=target();if(!e?.mozaWidget||e.locked)return false;
 commit(discrete());fn(e.mozaWidget);
 e.embedCode=buildWidget(e.mozaWidget);e.embedKind='widget';e.embedLive=true;
 afterEdit();return true;
}
function itemStyleEditor(i,it){
 const s=it.style||{};
 return `<details class="mz5-style-advanced"><summary>▧ Bentuk & ukuran kotak · Item ${i+1}</summary>
 <div class="mz5-two"><label>Lebar (%)<input type="number" min="30" max="100" data-mz5-item-style="${i}" data-field="width" value="${Number(s.width??100)}"></label><label>Tinggi minimum (px)<input type="number" min="0" max="500" data-mz5-item-style="${i}" data-field="minHeight" value="${Number(s.minHeight??0)}"></label></div>
 <label>Bentuk kotak<select data-mz5-item-style="${i}" data-field="shape"><option value="rounded" ${s.shape==='rounded'?'selected':''}>Rounded</option><option value="square" ${s.shape==='square'?'selected':''}>Square</option><option value="pill" ${s.shape==='pill'?'selected':''}>Pill</option><option value="arch" ${s.shape==='arch'?'selected':''}>Arch</option><option value="blob" ${s.shape==='blob'?'selected':''}>Blob</option></select></label>
 <div class="mz5-two"><label>Radius (px)<input type="number" min="0" max="80" data-mz5-item-style="${i}" data-field="radius" value="${Number(s.radius??12)}"></label><label>Padding (px)<input type="number" min="0" max="60" data-mz5-item-style="${i}" data-field="padding" value="${Number(s.padding??14)}"></label></div>
 <div class="mz5-two"><label>Background<input type="color" data-mz5-item-style="${i}" data-field="background" value="${safeColor(s.background,'#ffffff')}"></label><label>Border color<input type="color" data-mz5-item-style="${i}" data-field="borderColor" value="${safeColor(s.borderColor,'#b76e79')}"></label></div>
 <div class="mz5-two"><label>Border width (px)<input type="number" min="0" max="8" data-mz5-item-style="${i}" data-field="borderWidth" value="${Number(s.borderWidth??1)}"></label></div>
 </details>`;
}
function blockEditor(i,b,j){
 const head=`<div class="mz5-block-head"><b>${({text:'Teks',button:'Button',copy:'Copy to Clipboard',icon:'Ikon',image:'Gambar'}[b.type]||'Konten')}</b><button type="button" class="btn sm dng" data-a="mz5-block-remove" data-i="${i}" data-j="${j}">Hapus</button></div>`;
 if(b.type==='text')return `<div class="mz5-block">${head}<label>Isi teks<textarea rows="2" data-mz5-block-field="${i}" data-j="${j}" data-field="text">${safe(b.text)}</textarea></label></div>`;
 if(b.type==='button')return `<div class="mz5-block">${head}<label>Teks button<input data-mz5-block-field="${i}" data-j="${j}" data-field="label" value="${safe(b.label)}"></label><label>Link tujuan<input data-mz5-block-field="${i}" data-j="${j}" data-field="url" value="${safe(b.url)}" placeholder="https://... atau #section"></label></div>`;
 if(b.type==='copy')return `<div class="mz5-block">${head}<label>Label tombol<input data-mz5-block-field="${i}" data-j="${j}" data-field="label" value="${safe(b.label||'Copy')}"></label><label>Teks yang disalin<textarea rows="2" data-mz5-block-field="${i}" data-j="${j}" data-field="value">${safe(b.value)}</textarea></label><div class="mz5-two"><label class="mz5-inline-check"><input type="checkbox" data-mz5-block-field="${i}" data-j="${j}" data-field="showIcon" ${b.showIcon!==false?'checked':''}> Tampilkan ikon Copy</label><label class="mz5-inline-check"><input type="checkbox" data-mz5-block-field="${i}" data-j="${j}" data-field="iconOnly" ${b.iconOnly?'checked':''}> Ikon saja</label></div></div>`;
 if(b.type==='icon')return `<div class="mz5-block">${head}<label>Simbol / emoji<input data-mz5-block-field="${i}" data-j="${j}" data-field="symbol" value="${safe(b.symbol||'✦')}"></label><label>Label opsional<input data-mz5-block-field="${i}" data-j="${j}" data-field="label" value="${safe(b.label||'')}"></label></div>`;
 if(b.type==='image')return `<div class="mz5-block">${head}<label>URL gambar<input data-mz5-block-field="${i}" data-j="${j}" data-field="url" value="${safe(b.url||'')}" placeholder="https://..."></label></div>`;
 return '';
}
function makeInspector(){
 const e=target(),w=e?.mozaWidget;if(!w)return '';
 const title=w.kind==='accordion'?'Accordion / FAQ':'Sliding Tabs';
 const rows=(w.items||[]).map((it,i)=>`<div class="mz5-row"><div class="mz5-rowhead"><b>Item ${i+1}</b><div><button type="button" class="btn sm" data-a="mz5-up" data-i="${i}" ${i?'':'disabled'} aria-label="Geser ke atas">↑</button><button type="button" class="btn sm" data-a="mz5-down" data-i="${i}" ${i<w.items.length-1?'':'disabled'} aria-label="Geser ke bawah">↓</button><button type="button" class="btn sm" data-a="mz5-remove" data-i="${i}" ${w.items.length>1?'':'disabled'} aria-label="Hapus item">✕</button></div></div>
 <label>Judul / pertanyaan<input maxlength="160" data-mz5-title="${i}" value="${safe(it.title)}"></label>
 <label>Penjelasan<textarea rows="3" maxlength="2400" data-mz5-body="${i}">${safe(it.body)}</textarea></label>
 <label>Gambar URL opsional<input data-mz5-image="${i}" value="${safe(it.image||'')}" placeholder="https://..."></label>
 ${itemStyleEditor(i,it)}
 <div class="mz5-blocks-editor"><b>Konten tambahan</b>${(it.blocks||[]).map((b,j)=>blockEditor(i,b,j)).join('')}
 <div class="mz5-block-add"><button type="button" class="btn sm" data-a="mz5-block-add" data-i="${i}" data-kind="text">＋ Teks</button><button type="button" class="btn sm" data-a="mz5-block-add" data-i="${i}" data-kind="button">＋ Button</button><button type="button" class="btn sm" data-a="mz5-block-add" data-i="${i}" data-kind="copy">＋ Copy</button><button type="button" class="btn sm" data-a="mz5-block-add" data-i="${i}" data-kind="icon">＋ Ikon</button><button type="button" class="btn sm" data-a="mz5-block-add" data-i="${i}" data-kind="image">＋ Gambar</button></div>
 </div></div>`).join('');
 const richer=`<details class="mz5-style-advanced" open><summary>🎨 Typography & tampilan</summary>
 <label>Font judul / pertanyaan<select data-mz5-style="titleFont">${fontOptionMarkup(w.titleFont||w.font||'$head')}</select></label>
 <label>Font isi / jawaban<select data-mz5-style="bodyFont">${fontOptionMarkup(w.bodyFont||w.font||'$body')}</select></label>
 <div class="mz5-two"><label>Ukuran judul (px)<input type="number" min="9" max="64" data-mz5-style="titleSize" value="${Number(w.titleSize)||16}"></label><label>Ukuran isi (px)<input type="number" min="9" max="48" data-mz5-style="bodySize" value="${Number(w.bodySize)||14}"></label></div>
 <div class="mz5-two"><label>Radius default (px)<input type="number" min="0" max="45" data-mz5-style="radius" value="${Number(w.radius)||12}"></label><label>Border default (px)<input type="number" min="0" max="8" data-mz5-style="borderWidth" value="${Number(w.borderWidth)||1}"></label></div>
 <div class="mz5-two"><label>Warna aksen<input type="color" data-mz5-color="accent" value="${safeColor(w.accent,'#b76e79')}"></label><label>Warna latar<input type="color" data-mz5-color="paper" value="${safeColor(w.paper,'#ffffff')}"></label></div>
 <label>Warna teks<input type="color" data-mz5-color="text" value="${safeColor(w.text,'#302c32')}"></label>
 </details>`;
 return `<section class="mz5-panel" aria-label="Moza interaktif"><div class="mz5-head"><b>▣ Konten Interaktif</b><small>V6 · Editable</small></div><p class="hint"><strong>${title}</strong> · Setiap item dapat memiliki teks, gambar, button, ikon, dan Copy to Clipboard. Ukuran dan bentuk kotak bisa diatur per item.</p>
 <label>Tipe<select data-mz5-kind><option value="accordion" ${w.kind==='accordion'?'selected':''}>Accordion (buka-tutup)</option><option value="tabs" ${w.kind==='tabs'?'selected':''}>Sliding Tabs (geser samping)</option></select></label>
 ${rows}
 <button type="button" class="btn sm pri mz5-add" data-a="mz5-add" ${w.items.length>=MAX_ITEMS?'disabled':''}>+ Tambah Item</button>
 <div class="mz5-options"><label class="mz5-check"><input type="checkbox" data-mz5-exclusive ${w.exclusive?'checked':''}> Hanya satu FAQ terbuka</label></div>
 ${richer}
 <details class="mz5-style-advanced"><summary>✎ Custom Labels & Language</summary><p class="hint">Edit navigation and accessibility labels.</p>${Object.entries({accordionTitle:'Accordion title',tabsTitle:'Tabs heading',previous:'Previous button',next:'Next button',toggleSymbol:'Expand icon'}).map(([k,n])=>`<label>${n}<input data-mz14-widget-label="${k}" value="${safe(w.labels?.[k]??defaultConfig(w.kind).labels[k])}" maxlength="90"></label>`).join('')}</details>
 <p class="hint">Font dari Uploads dan GitHub Font Library ikut disematkan pada widget saat Preview / Publish. Copy to Clipboard memakai clipboard API dengan fallback.</p></section>`;
}
function addUI(){
 if(!validState())return;
 const left=document.querySelector('#left');
 if(left&&S.tab==='elements'&&!left.querySelector('.mz5-library')){
  const holder=document.createElement('div');holder.className='mz5-library';
  holder.innerHTML='<h4>▣ Elemen Interaktif</h4><p class="hint">Accordion FAQ fleksibel dan Sliding Tabs. Konten bisa berisi button, ikon, gambar, dan Copy.</p><div class="mz5-tiles"><button type="button" class="btn sm" data-a="mz5-insert-accordion">▾ Accordion / FAQ</button><button type="button" class="btn sm" data-a="mz5-insert-tabs">⇄ Sliding Tabs</button></div>';
  left.prepend(holder);
 }
}
const oldLeft=renderLeft;renderLeft=function(){oldLeft();addUI()};
const oldRight=renderRight;renderRight=function(){oldRight();const r=document.querySelector('#right');if(r&&validState()){const h=makeInspector();if(h)r.insertAdjacentHTML('beforeend',h)}};
const oldTop=renderTop;renderTop=function(){oldTop();if(!validState())return;const t=document.querySelector('#top');if(t&&!t.querySelector('[data-a="mz5-insert-accordion"]')){
  const a=t.querySelector('[data-a="moza-v4-palette"]')||t.querySelector('[data-a="preview"]');
  if(a)a.insertAdjacentHTML('beforebegin','<button class="btn" type="button" data-a="mz5-insert-accordion" title="Tambahkan FAQ yang bisa dikustomisasi">▾ FAQ</button><button class="btn" type="button" data-a="mz5-insert-tabs" title="Tambahkan tab geser horizontal">⇄ Tabs</button>');
 }};
ACT['mz5-insert-accordion']=()=>add('accordion');
ACT['mz5-insert-tabs']=()=>add('tabs');
ACT['mz5-add']=()=>mutate(w=>{if(w.items.length<MAX_ITEMS)w.items.push({title:'Judul baru',body:'Tulis penjelasan di sini.',blocks:[]})});
ACT['mz5-remove']=b=>mutate(w=>{if(w.items.length>1)w.items.splice(Number(b.dataset.i),1)});
ACT['mz5-up']=b=>mutate(w=>{const i=Number(b.dataset.i);if(i>0)[w.items[i-1],w.items[i]]=[w.items[i],w.items[i-1]]});
ACT['mz5-down']=b=>mutate(w=>{const i=Number(b.dataset.i);if(i<w.items.length-1)[w.items[i],w.items[i+1]]=[w.items[i+1],w.items[i]]});
ACT['mz5-block-add']=b=>mutate(w=>{
 const i=Number(b.dataset.i),kind=b.dataset.kind,it=w.items[i];if(!it)return;
 it.blocks=Array.isArray(it.blocks)?it.blocks:[];if(it.blocks.length>=MAX_BLOCKS){toast('Maksimal '+MAX_BLOCKS+' blok per item');return}
 const defaults={text:{type:'text',text:'Tulis teks di sini'},button:{type:'button',label:'Buka tautan',url:'#'},copy:{type:'copy',label:'Copy',value:'Tulis teks yang ingin disalin',showIcon:true,iconOnly:false},icon:{type:'icon',symbol:'✦',label:''},image:{type:'image',url:''}};
 if(defaults[kind])it.blocks.push(defaults[kind]);
});
ACT['mz5-block-remove']=b=>mutate(w=>{const i=Number(b.dataset.i),j=Number(b.dataset.j);if(w.items[i]?.blocks)w.items[i].blocks.splice(j,1)});
document.addEventListener('change',event=>{
 const el=event.target;
 const title=el.closest('[data-mz5-title]');if(title){mutate(w=>{const i=Number(title.dataset.mz5Title);if(w.items[i])w.items[i].title=title.value.slice(0,160)});return}
 const body=el.closest('[data-mz5-body]');if(body){mutate(w=>{const i=Number(body.dataset.mz5Body);if(w.items[i])w.items[i].body=body.value.slice(0,2400)});return}
 const image=el.closest('[data-mz5-image]');if(image){mutate(w=>{const i=Number(image.dataset.mz5Image);if(w.items[i])w.items[i].image=imgURL(image.value)});return}
 const block=el.closest('[data-mz5-block-field]');if(block){mutate(w=>{const i=Number(block.dataset.mz5BlockField),j=Number(block.dataset.j),k=block.dataset.field,b=w.items[i]?.blocks?.[j];if(b){b[k]=block.type==='checkbox'?block.checked:block.value.slice(0,k==='value'||k==='text'?1800:1000)}});return}
 const itemStyle=el.closest('[data-mz5-item-style]');if(itemStyle){mutate(w=>{const i=Number(itemStyle.dataset.mz5ItemStyle),k=itemStyle.dataset.field,it=w.items[i];if(it){it.style=it.style||{};it.style[k]=el.type==='number'?Number(el.value):el.value}});return}
 if(el.matches('[data-mz14-widget-label]')){mutate(w=>{w.labels=w.labels||{};w.labels[el.dataset.mz14WidgetLabel]=el.value.slice(0,90)});return}
 if(el.matches('[data-mz5-kind]')){mutate(w=>{w.kind=el.value==='tabs'?'tabs':'accordion'});return}
 if(el.matches('[data-mz5-exclusive]')){mutate(w=>{w.exclusive=el.checked});return}
 if(el.matches('[data-mz5-color]')){mutate(w=>{w[el.dataset.mz5Color]=safeColor(el.value,'#ffffff')});return}
 if(el.matches('[data-mz5-style]')){mutate(w=>{const k=el.dataset.mz5Style;w[k]=el.type==='number'?Number(el.value):el.value});return}
});
const v6Styles=document.createElement('style');v6Styles.textContent='.mz5-style-advanced{margin-top:10px;padding:10px;border:1px solid #dde5f3;border-radius:9px}.mz5-style-advanced summary{font-weight:750;cursor:pointer}.mz5-style-advanced label{display:grid;gap:5px;margin:9px 0;font-size:11px}.mz5-style-advanced input,.mz5-style-advanced select,.mz5-style-advanced textarea{width:100%;min-width:0;box-sizing:border-box;min-height:30px;padding:6px;border:1px solid #dfe5f1;border-radius:7px;background:#fff}.mz5-two{display:grid;grid-template-columns:1fr 1fr;gap:7px}.mz5-inline-check{display:flex!important;align-items:center;gap:6px}.mz5-inline-check input{width:auto!important;min-height:0!important}.mz5-blocks-editor{display:grid;gap:7px;padding-top:8px;border-top:1px solid #e1e5ee}.mz5-block-head{display:flex;align-items:center;justify-content:space-between;gap:8px}.mz5-block{display:grid;gap:7px;padding:8px;border:1px solid #dfe5f1;border-radius:8px;background:#fff}.mz5-block-add{display:flex;flex-wrap:wrap;gap:5px}.mz5-block-add button{flex:1 1 28%;white-space:normal;min-height:34px}@media(max-width:760px){.mz5-two{grid-template-columns:1fr 1fr}.mz5-block-add button{flex:1 1 42%;min-height:40px}}';document.head.appendChild(v6Styles);

/* Refresh FAQ font selectors after the async GitHub catalog finishes loading. */
try{
 if(typeof a321Load==='function'&&!window.__mz5FontLoadWrapped){
  const prior=a321Load;
  const wrapped=async function(...args){const result=await prior.apply(this,args);const selected=typeof T==='function'?T('el'):null;if(selected&&(selected.mozaWidget||selected.type==='countdown')){try{renderRight()}catch(_){}}return result};
  window.a321Load=wrapped;
  window.__mz5FontLoadWrapped=true;
 }
}catch(_){}
window.MozaInteractive={version:'14.9.0',add,buildWidget,defaultConfig,status:()=>({ready:validState(),selectedWidget:!!target()?.mozaWidget})};
try{if(validState()){renderLeft();renderRight();renderTop()}}catch(e){console.warn('[Moza V6] initial UI refresh skipped',e)}
console.info('[Moza V6] Editable FAQ blocks, Copy to Clipboard and project/GitHub fonts installed.');
})();