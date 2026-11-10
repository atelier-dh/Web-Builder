/* Moza Studio V5 — interactive content elements.
 * Non-invasive integration: original Atelier application, data schema, RSVP,
 * auth, cloud configuration and renderer remain untouched.
 * Widgets use Atelier's existing sandboxed HTML embed implementation.
 */
(function(){
'use strict';
if(window.MozaInteractive)return;
const MAX_ITEMS=8;
const safe=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const safeColor=(s,def)=>/^#[0-9a-fA-F]{6}$/.test(String(s))?String(s):def;
const validState=()=>typeof S!=='undefined'&&S?.mode==='design'&&S.doc&&Array.isArray(S.doc.pages);
const target=()=>validState()&&S.sel?.k==='el'?T('el'):null;
const imgURL=v=>/^https?:\/\/[^\s<>\"']+$/i.test(String(v||''))?String(v):'';
const itemDefaults=kind=>kind==='accordion'?[{title:'Where is the wedding?',body:'Find venue and location details here.'},{title:'What time does it start?',body:'Add the ceremony and reception schedule here.'},{title:'How do I RSVP?',body:'Use the RSVP form on our invitation.'}]:[{title:'Our Story',body:'Discover more about our journey.'},{title:'The Celebration',body:'Ceremony and reception details.'},{title:'Location',body:'Discover the venue and travel information.'}];
function defaultConfig(kind){return{version:1,kind,items:itemDefaults(kind),accent:'#b76e79',paper:'#ffffff',text:'#302c32',exclusive:true,font:'Arial',titleSize:16,bodySize:14,radius:12,borderWidth:1,labels:{accordionTitle:'Frequently Asked Questions',tabsTitle:'Information',previous:'Previous',next:'Next',toggleSymbol:'+'}};}
function itemMarkup(items,kind,labelsUI){
 if(kind==='accordion')return items.map((it,i)=>`<details class="mza-item" ${i===0?'open':''}><summary><span>${safe(it.title)}</span><span class="mza-plus" aria-hidden="true">${safe(labelsUI.toggleSymbol)}</span></summary><div class="mza-answer">${safe(it.body).replace(/\n/g,'<br>')}${imgURL(it.image)?`<img class="mza-item-photo" loading="lazy" alt="" src="${safe(imgURL(it.image))}">`:''}</div></details>`).join('');
 return items.map((it,i)=>`<section class="mza-slide" role="tabpanel" id="slide-${i}" aria-labelledby="tab-${i}" tabindex="0"><h3>${safe(it.title)}</h3><p>${safe(it.body).replace(/\n/g,'<br>')}</p>${imgURL(it.image)?`<img class="mza-item-photo" loading="lazy" alt="" src="${safe(imgURL(it.image))}">`:''}</section>`).join('');
}
function buildWidget(config){
 const kind=config.kind==='tabs'?'tabs':'accordion';
 const labelsUI={accordionTitle:'Frequently Asked Questions',tabsTitle:'Information',previous:'Previous',next:'Next',toggleSymbol:'+',...(config.labels||{})};Object.keys(labelsUI).forEach(k=>labelsUI[k]=String(labelsUI[k]).slice(0,90));
 const items=(Array.isArray(config.items)?config.items:[]).slice(0,MAX_ITEMS).map(x=>({title:String(x.title||'Title').slice(0,160),body:String(x.body||'').slice(0,1600),image:String(x.image||'').slice(0,1000)}));
 const accent=safeColor(config.accent,'#b76e79'),paper=safeColor(config.paper,'#ffffff'),text=safeColor(config.text,'#302c32');
 const ff=['Arial','Georgia','Verdana','Tahoma','Trebuchet MS','Times New Roman','system-ui'].includes(config.font)?config.font:'Arial',ts=Math.max(9,Math.min(64,Number(config.titleSize)||16)),bs=Math.max(9,Math.min(48,Number(config.bodySize)||14)),radius=Math.max(0,Math.min(45,Number(config.radius)||12)),borderWidth=Math.max(0,Math.min(8,Number(config.borderWidth)||1));
 const common=`:root{color-scheme:light}*{box-sizing:border-box}html,body{margin:0;width:100%;min-height:100%;font:${bs}px/1.55 ${ff},system-ui,sans-serif;color:${text};background:transparent}body{display:block;padding:8px}button,summary{-webkit-tap-highlight-color:transparent}button:focus-visible,summary:focus-visible,.mza-slide:focus-visible{outline:3px solid ${accent};outline-offset:3px}`;
 const base=`<style>${common}.mza-item-photo{display:block;max-width:100%;width:100%;max-height:230px;object-fit:cover;border-radius:${radius}px;margin-top:12px}`;
 if(kind==='accordion'){
  return `${base}.mza-wrap{width:100%;margin:0 auto}.mza-item{background:${paper};border:${borderWidth}px solid ${accent}44;border-radius:${radius}px;margin:0 0 9px;overflow:hidden}.mza-item[open]{border-color:${accent}77}.mza-item summary{cursor:pointer;min-height:52px;padding:14px 16px;display:flex;gap:12px;align-items:center;justify-content:space-between;list-style:none;font-weight:650;touch-action:manipulation}.mza-item summary::-webkit-details-marker{display:none}.mza-item summary span:first-child{font-size:${ts}px}.mza-plus{font-size:22px;font-weight:400;color:${accent};transition:transform .2s}.mza-item[open] .mza-plus{transform:rotate(45deg)}.mza-answer{font-size:${bs}px;padding:0 16px 18px;white-space:normal;overflow-wrap:anywhere;color:${text};opacity:.87}@media(max-width:420px){body{padding:3px}.mza-item summary{min-height:48px;padding:12px}.mza-item summary span:first-child{font-size:${ts}px}.mza-answer{padding:0 12px 16px;font-size:${bs}px}}@media(prefers-reduced-motion:reduce){*{transition:none!important}}</style><div class="mza-wrap" aria-label="${safe(labelsUI.accordionTitle)}">${itemMarkup(items,kind,labelsUI)}</div>${config.exclusive?'<script>document.querySelectorAll(".mza-item").forEach(d=>d.addEventListener("toggle",()=>{if(d.open)document.querySelectorAll(".mza-item").forEach(x=>{if(x!==d)x.open=false})}));</script>':''}`;
 }
 const labels=items.map((x,i)=>`<button type="button" role="tab" class="mza-tab" id="tab-${i}" aria-selected="${i===0?'true':'false'}" aria-controls="slide-${i}" tabindex="${i===0?'0':'-1'}" data-tab="${i}">${safe(x.title)}</button>`).join('');
 return `${base}.mza-root{background:${paper};border:${borderWidth}px solid ${accent}44;border-radius:${radius}px;overflow:hidden;width:100%;height:100%;display:flex;flex-direction:column}.mza-tabs{display:flex;gap:4px;padding:10px 10px 6px;overflow-x:auto;overscroll-behavior-x:contain;scrollbar-width:thin;flex:0 0 auto}.mza-tab{flex:0 0 auto;white-space:nowrap;border:0;background:transparent;color:${text};padding:10px 14px;font:600 ${ts}px ${ff},sans-serif;cursor:pointer;border-bottom:2px solid transparent;touch-action:manipulation}.mza-tab[aria-selected=true]{color:${accent};border-color:${accent};background:${accent}10}.mza-viewport{overflow:hidden;flex:1 1 auto;min-height:0;touch-action:pan-y}.mza-track{display:flex;height:100%;transition:transform .32s ease;will-change:transform}.mza-slide{min-width:100%;height:100%;padding:14px 22px;overflow-y:auto;overflow-wrap:anywhere}.mza-slide h3{font-size:${ts}px;margin:0 0 11px;color:${accent}}.mza-slide p{margin:0;white-space:normal}.mza-slide p{font-size:${bs}px}.mza-nav{display:flex;justify-content:space-between;align-items:center;padding:7px 12px;border-top:1px solid ${accent}33}.mza-arrow{border:1px solid ${accent}55;background:${paper};color:${accent};border-radius:8px;min-height:34px;min-width:45px;cursor:pointer;font-size:19px}.mza-count{font-size:12px;color:${text};opacity:.7}@media(max-width:420px){body{padding:2px}.mza-tab{font-size:${ts}px;padding:9px 11px}.mza-slide{padding:12px 14px}.mza-slide h3{font-size:${ts}px}}@media(prefers-reduced-motion:reduce){.mza-track{transition:none}}</style><div class="mza-root"><div class="mza-tabs" role="tablist" aria-label="${safe(labelsUI.tabsTitle)}">${labels}</div><div class="mza-viewport"><div class="mza-track">${itemMarkup(items,kind,labelsUI)}</div></div><div class="mza-nav"><button class="mza-arrow" type="button" data-step="-1" aria-label="${safe(labelsUI.previous)}">‹</button><span class="mza-count" aria-live="polite">1 / ${items.length}</span><button class="mza-arrow" type="button" data-step="1" aria-label="${safe(labelsUI.next)}">›</button></div></div><script>(function(){const r=document.querySelector('.mza-root'),tabs=[...r.querySelectorAll('[role=tab]')],track=r.querySelector('.mza-track'),count=r.querySelector('.mza-count'),viewport=r.querySelector('.mza-viewport');let index=0,start=null;const go=(n,focus)=>{index=Math.max(0,Math.min(tabs.length-1,n));track.style.transform='translateX(-'+(index*100)+'%)';tabs.forEach((t,i)=>{t.setAttribute('aria-selected',i===index?'true':'false');t.tabIndex=i===index?0:-1});count.textContent=(index+1)+' / '+tabs.length;tabs[index].scrollIntoView({block:'nearest',inline:'nearest'});if(focus)tabs[index].focus()};tabs.forEach((t,i)=>{t.addEventListener('click',()=>go(i,false));t.addEventListener('keydown',e=>{if(e.key==='ArrowRight'||e.key==='ArrowLeft'||e.key==='Home'||e.key==='End'){e.preventDefault();go(e.key==='Home'?0:e.key==='End'?tabs.length-1:index+(e.key==='ArrowRight'?1:-1),true)}})});r.querySelectorAll('[data-step]').forEach(b=>b.addEventListener('click',()=>go(index+Number(b.dataset.step),false)));viewport.addEventListener('touchstart',e=>{start=e.changedTouches[0].clientX},{passive:true});viewport.addEventListener('touchend',e=>{if(start===null)return;const delta=e.changedTouches[0].clientX-start;if(Math.abs(delta)>45)go(index+(delta<0?1:-1),false);start=null},{passive:true});})();</script>`;
}
function add(kind){
 if(!validState()){typeof toast==='function'&&toast('Buka proyek di Design Editor dulu.');return false}
 const config=defaultConfig(kind);
 const el=newEl('embed',{name:kind==='accordion'?'Accordion FAQ':'Sliding Tabs',w:kind==='accordion'?580:650,h:kind==='accordion'?305:290,embedKind:'widget',embedLive:true,embedCode:buildWidget(config),mozaWidget:config});
 addEl(el,selSecId());
 // Atelier's default geometry is proportional to a 1200px canvas. Embedded
 // accordions need larger phone-specific tap/reading areas, so make explicit
 // breakpoint overrides without changing any inherited responsive engine.
 if(typeof setGeom==='function'){
  const d=el.y;
  setGeom(el,'t',{x:44,w:680,h:kind==='accordion'?345:310,y:Math.max(12,Math.round(d*768/1200))});
  setGeom(el,'m',{x:15,w:345,h:kind==='accordion'?355:290,y:Math.max(12,Math.round(d*375/1200))});
  if(typeof afterEdit==='function')afterEdit();
 }
 if(typeof toast==='function')toast((kind==='accordion'?'Accordion':'Sliding Tabs')+' ditambahkan. Edit judul dan isi dari panel Properties, lalu coba Preview.');
 return true;
}
function mutate(fn){
 const e=target();if(!e?.mozaWidget||e.locked)return false;
 commit(discrete());fn(e.mozaWidget);
 e.embedCode=buildWidget(e.mozaWidget);
 e.embedKind='widget';e.embedLive=true;
 afterEdit();return true;
}
function makeInspector(){
 const e=target(),w=e?.mozaWidget;
 if(!w)return '';
 const title=w.kind==='accordion'?'Accordion / FAQ':'Sliding Tabs';
 const rows=w.items.map((it,i)=>`<div class="mz5-row"><div class="mz5-rowhead"><b>Item ${i+1}</b><div><button type="button" class="btn sm" data-a="mz5-up" data-i="${i}" ${i?'':'disabled'} aria-label="Geser ke atas">↑</button><button type="button" class="btn sm" data-a="mz5-down" data-i="${i}" ${i<w.items.length-1?'':'disabled'} aria-label="Geser ke bawah">↓</button><button type="button" class="btn sm" data-a="mz5-remove" data-i="${i}" ${w.items.length>1?'':'disabled'} aria-label="Hapus item">✕</button></div></div><label>Judul / pertanyaan<input maxlength="160" data-mz5-title="${i}" value="${safe(it.title)}"></label><label>Penjelasan<textarea rows="3" maxlength="1600" data-mz5-body="${i}">${safe(it.body)}</textarea></label><label>Gambar URL opsional<input data-mz5-image="${i}" value="${safe(it.image||'')}" placeholder="https://..."></label></div>`).join('');
 const richer=`<details class="mz5-style-advanced"><summary>🎨 Design Editor · font & tampilan</summary><label>Font<select data-mz5-style="font">${['Arial','Georgia','Verdana','Tahoma','Trebuchet MS','Times New Roman','system-ui'].map(x=>`<option value="${x}" ${(w.font||'Arial')===x?'selected':''}>${x}</option>`).join('')}</select></label><label>Ukuran judul / tab (px)<input type="number" min="9" max="64" data-mz5-style="titleSize" value="${Number(w.titleSize)||16}"></label><label>Ukuran isi (px)<input type="number" min="9" max="48" data-mz5-style="bodySize" value="${Number(w.bodySize)||14}"></label><label>Radius (px)<input type="number" min="0" max="45" data-mz5-style="radius" value="${Number(w.radius)||12}"></label><label>Tebal border (px)<input type="number" min="0" max="8" data-mz5-style="borderWidth" value="${Number(w.borderWidth)||1}"></label><label>Warna teks<input type="color" data-mz5-color="text" value="${safeColor(w.text,'#302c32')}"></label></details>`;
 return `<section class="mz5-panel" aria-label="Moza interaktif"><div class="mz5-head"><b>▣ Konten Interaktif</b><small>V5</small></div><p class="hint"><strong>${title}</strong> · Klik untuk membuka, atau geser ke samping. Aktif di Preview dan website publik.</p><label>Tipe<select data-mz5-kind><option value="accordion" ${w.kind==='accordion'?'selected':''}>Accordion (buka-tutup)</option><option value="tabs" ${w.kind==='tabs'?'selected':''}>Sliding Tabs (geser samping)</option></select></label>${rows}<button type="button" class="btn sm pri mz5-add" data-a="mz5-add" ${w.items.length>=MAX_ITEMS?'disabled':''}>+ Tambah Item</button><div class="mz5-options"><label>Warna aksen<input type="color" data-mz5-color="accent" value="${safeColor(w.accent,'#b76e79')}"></label><label>Warna latar<input type="color" data-mz5-color="paper" value="${safeColor(w.paper,'#ffffff')}"></label>${w.kind==='accordion'?`<label class="mz5-check"><input type="checkbox" data-mz5-exclusive ${w.exclusive?'checked':''}> Hanya satu terbuka</label>`:''}</div><details class="mz5-style-advanced"><summary>✎ Custom Labels & Language</summary><p class="hint">Edit navigation and accessibility labels. Questions and answers remain fully editable above.</p>${Object.entries({accordionTitle:'Accordion title',tabsTitle:'Tabs heading',previous:'Previous button',next:'Next button',toggleSymbol:'Expand icon'}).map(([k,n])=>`<label>${n}<input data-mz14-widget-label="${k}" value="${safe(w.labels?.[k]??defaultConfig(w.kind).labels[k])}" maxlength="90"></label>`).join('')}</details>${richer}<p class="hint">Di canvas widget bisa dipindah dan diubah ukuran. Klik <b>Preview</b> untuk mencoba interaksinya. Tidak mengubah fitur RSVP.</p></section>`;
}
function addUI(){
 if(!validState())return;
 const left=document.querySelector('#left');
 if(left&&S.tab==='elements'&&!left.querySelector('.mz5-library')){
  const holder=document.createElement('div');holder.className='mz5-library';
  holder.innerHTML='<h4>▣ Elemen Interaktif</h4><p class="hint">Klik judul untuk membuka penjelasan, atau geser antar informasi.</p><div class="mz5-tiles"><button type="button" class="btn sm" data-a="mz5-insert-accordion">▾ Accordion / FAQ</button><button type="button" class="btn sm" data-a="mz5-insert-tabs">⇄ Sliding Tabs</button></div>';
  left.prepend(holder);
 }
}
const oldLeft=renderLeft;
renderLeft=function(){oldLeft();addUI()};
const oldRight=renderRight;
renderRight=function(){oldRight();const r=document.querySelector('#right');if(r&&validState()){const h=makeInspector();if(h)r.insertAdjacentHTML('beforeend',h)}};
const oldTop=renderTop;
renderTop=function(){oldTop();if(!validState())return;const t=document.querySelector('#top');if(t&&!t.querySelector('[data-a="mz5-insert-accordion"]')){
  const a=t.querySelector('[data-a="moza-v4-palette"]')||t.querySelector('[data-a="preview"]');
  if(a)a.insertAdjacentHTML('beforebegin','<button class="btn" type="button" data-a="mz5-insert-accordion" title="Tambahkan elemen FAQ yang bisa dibuka dan ditutup">▾ FAQ</button><button class="btn" type="button" data-a="mz5-insert-tabs" title="Tambahkan tab geser horizontal">⇄ Tabs</button>');
 }};
ACT['mz5-insert-accordion']=()=>add('accordion');
ACT['mz5-insert-tabs']=()=>add('tabs');
ACT['mz5-add']=()=>mutate(w=>{if(w.items.length<MAX_ITEMS)w.items.push({title:'Judul baru',body:'Tulis penjelasan di sini.'})});
ACT['mz5-remove']=b=>mutate(w=>{if(w.items.length>1)w.items.splice(Number(b.dataset.i),1)});
ACT['mz5-up']=b=>mutate(w=>{const i=Number(b.dataset.i);if(i>0)[w.items[i-1],w.items[i]]=[w.items[i],w.items[i-1]]});
ACT['mz5-down']=b=>mutate(w=>{const i=Number(b.dataset.i);if(i<w.items.length-1)[w.items[i],w.items[i+1]]=[w.items[i+1],w.items[i]]});
document.addEventListener('change',event=>{
 const el=event.target;
 const t=el.closest('[data-mz5-title]');if(t){mutate(w=>{const i=Number(t.dataset.mz5Title);if(w.items[i])w.items[i].title=t.value.slice(0,160)});return}
 const b=el.closest('[data-mz5-body]');if(b){mutate(w=>{const i=Number(b.dataset.mz5Body);if(w.items[i])w.items[i].body=b.value.slice(0,1600)});return}
 if(el.matches('[data-mz14-widget-label]')){mutate(w=>{w.labels=w.labels||{};w.labels[el.dataset.mz14WidgetLabel]=el.value.slice(0,90)});return}
 if(el.matches('[data-mz5-kind]')){mutate(w=>{w.kind=el.value==='tabs'?'tabs':'accordion'});return}
 if(el.matches('[data-mz5-exclusive]')){mutate(w=>{w.exclusive=el.checked});return}
 if(el.matches('[data-mz5-color]')){mutate(w=>{w[el.dataset.mz5Color]=safeColor(el.value,'#ffffff')});return}
 if(el.matches('[data-mz5-style]')){mutate(w=>{const k=el.dataset.mz5Style;w[k]=el.type==='number'?Number(el.value):el.value});return}
 if(el.matches('[data-mz5-image]')){mutate(w=>{const i=Number(el.dataset.mz5Image);if(w.items[i])w.items[i].image=imgURL(el.value)});return}
});
const v13Styles=document.createElement('style');v13Styles.textContent='.mz5-style-advanced{margin-top:10px;padding:10px;border:1px solid #dde5f3;border-radius:9px}.mz5-style-advanced summary{font-weight:750;cursor:pointer}.mz5-style-advanced label{display:grid;gap:5px;margin:9px 0;font-size:11px}.mz5-style-advanced input,.mz5-style-advanced select{width:100%;min-height:30px;padding:5px;border:1px solid #dfe5f1;border-radius:7px}';document.head.appendChild(v13Styles);
window.MozaInteractive={version:'14.0.0',add,buildWidget,defaultConfig,status:()=>({ready:validState(),selectedWidget:!!target()?.mozaWidget})};
try{if(validState()){renderLeft();renderRight();renderTop()}}catch(e){console.warn('[Moza V5] initial UI refresh skipped',e)}
console.info('[Moza V5] Accordion & Sliding Tabs installed; existing Atelier core unchanged.');
})();
