/* Moza Studio V14.2 — Product Image Carousel + stable properties + faster preview.
   The existing Carousel and data model are not modified. */
(()=>{'use strict';
 const initial={name:'Product Image Carousel',w:520,h:350,st:{bg:'#ffffff',br:12},pg:{slides:[],active:0,title:'Our Product',price:'',font:'$body',titleSize:17,priceSize:15,accent:'#344e83',background:'#ffffff',radius:12,fit:'contain',arrows:true,thumbs:true,dots:false,loop:true}};
 TDEF.productgallery=initial;
 TILEICO.productgallery='<rect x="4" y="3" width="16" height="14" rx="2"/><circle cx="9" cy="8" r="1"/><path d="m5 14 5-4 4 3 2-2 3 3M7 21h10"/>';
 const oldElements=tabElements;
 tabElements=function(...args){const html=oldElements(...args);return html.replace('<h3>Elements</h3>',`<h3>Elements</h3><div style="margin:0 0 9px;padding:10px;background:var(--acc2);border-radius:10px"><b style="font-size:12px">Product Image Carousel</b><p class="hint" style="margin:4px 0">One product, multiple photos. Swipe like a shopping gallery.</p><button class="btn sm pri" type="button" style="width:100%" data-add="productgallery">＋ Add product photo gallery</button></div>`) };
 const getSlides=el=>(el.pg?.slides||[]).filter(x=>x&&typeof x==='object');
 const safeInt=(v,min,max,fallback)=>{v=Number(v);return Number.isFinite(v)?Math.round(Math.max(min,Math.min(max,v))):fallback};
 function htmlGallery(el,edit){
  const o=el.pg||initial.pg,images=getSlides(el),chosen=Math.max(0,Math.min(images.length-1,safeInt(o.active,0,999,0))),current=images[chosen],src=current?.asset&&assetSrc(current.asset)||'';
  const css=`--mzpg-radius:${safeInt(o.radius,0,48,12)}px;--mzpg-fit:${o.fit==='cover'?'cover':'contain'};--mzpg-accent:${esc(o.accent||'#344e83')};--mzpg-font:${fam(o.font||'$body')};--mzpg-title-size:${safeInt(o.titleSize,8,90,17)}px;--mzpg-price-size:${safeInt(o.priceSize,8,70,15)}px;background:${esc(o.background||'#ffffff')};padding:6px;box-sizing:border-box;`;
  const thumbs=images.map((sl,i)=>`<button class="mzpg-thumb" type="button" data-mzpg-index="${i}" aria-current="${i===chosen}" aria-label="Show image ${i+1}">${assetSrc(sl.asset)?`<img draggable="false" src="${assetSrc(sl.asset)}" alt="">`:'<span>＋</span>'}</button>`).join('');
  const dots=images.map((_,i)=>`<button type="button" class="mzpg-dot" data-mzpg-index="${i}" aria-current="${i===chosen}" aria-label="Photo ${i+1}"></button>`).join('');
  return `<div class="mzpg" data-mzpg="1" data-mzpg-loop="${o.loop!==false?'1':'0'}" style="${css}" role="region" aria-roledescription="carousel" aria-label="${esc(o.title||'Product photos')}" tabindex="0"><div class="mzpg-main"><img class="mzpg-photo" src="${src}" alt="${esc(current?.alt||o.title||'Product photo')}" draggable="false" ${src?'':'hidden'}>${src?'':'<div class="mzpg-placeholder">Upload product photos in Properties</div>'}${o.arrows!==false&&images.length>1?'<button type="button" class="mzpg-arrow prev" aria-label="Previous product image">‹</button><button type="button" class="mzpg-arrow next" aria-label="Next product image">›</button>':''}</div>${o.thumbs!==false&&images.length>1?`<div class="mzpg-thumbs">${thumbs}</div>`:''}${o.dots&&images.length>1?`<div class="mzpg-dots">${dots}</div>`:''}${o.title||o.price?`<div class="mzpg-details">${o.title?`<div class="mzpg-title">${esc(o.title)}</div>`:''}${o.price?`<div class="mzpg-price">${esc(o.price)}</div>`:''}</div>`:''}<script type="application/json" class="mzpg-data">${JSON.stringify(images.map(s=>({src:assetSrc(s.asset),alt:s.alt||''}))).replace(/</g,'\\u003c')}</script></div>`;
 }
 // Public runtime runs only in generated Preview/published HTML, never in the editor.
 function galleryRuntime(){
  function boot(root){
   if(root.dataset.mzpgBoot)return;root.dataset.mzpgBoot='1';var data=[];
   try{data=JSON.parse(root.querySelector('.mzpg-data')?.textContent||'[]')}catch(e){}
   var idx=0,photo=root.querySelector('.mzpg-photo');if(!photo)return;
   var thumbs=[].slice.call(root.querySelectorAll('.mzpg-thumb')),dots=[].slice.call(root.querySelectorAll('.mzpg-dot'));
   function go(n){if(!data.length)return;idx=(n+data.length)%data.length;
    if(root.dataset.mzpgLoop!=='1'&&(n<0||n>=data.length))return;
    photo.src=data[idx].src||'';photo.alt=data[idx].alt||root.getAttribute('aria-label')||'Product image';photo.hidden=!data[idx].src;
    thumbs.forEach(function(t,i){t.setAttribute('aria-current',i===idx?'true':'false')});
    dots.forEach(function(t,i){t.setAttribute('aria-current',i===idx?'true':'false')});
    var prev=root.querySelector('.mzpg-arrow.prev'),next=root.querySelector('.mzpg-arrow.next');
    if(prev)prev.disabled=root.dataset.mzpgLoop!=='1'&&idx===0;
    if(next)next.disabled=root.dataset.mzpgLoop!=='1'&&idx===data.length-1;
   }
   root.addEventListener('click',function(e){var b=e.target.closest('button');if(!b)return;
    if(b.classList.contains('prev'))go(idx-1);
    else if(b.classList.contains('next'))go(idx+1);
    else if(b.hasAttribute('data-mzpg-index'))go(+b.getAttribute('data-mzpg-index'));
   });
   root.addEventListener('keydown',function(e){if(e.key==='ArrowLeft'||e.key==='ArrowRight'){e.preventDefault();go(idx+(e.key==='ArrowRight'?1:-1))}});
   var start=0,dy=0;root.addEventListener('touchstart',function(e){if(e.touches.length===1){start=e.touches[0].clientX;dy=e.touches[0].clientY}},{passive:true});
   root.addEventListener('touchend',function(e){if(!start||!e.changedTouches.length)return;var dx=e.changedTouches[0].clientX-start,vertical=e.changedTouches[0].clientY-dy;start=0;if(Math.abs(dx)>35&&Math.abs(dx)>Math.abs(vertical)*1.3)go(idx+(dx<0?1:-1))},{passive:true});
   go(0);
  }
  function run(){[].slice.call(document.querySelectorAll('[data-mzpg="1"]')).forEach(boot)}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',run);else run();
 }
 const originalFonts=usedFonts;
 usedFonts=function(doc){const names=new Set(originalFonts(doc));for(const pg of doc.pages||[])for(const sec of pg.sections||[])for(const el of sec.elements||[])if(el.type==='productgallery'&&el.pg?.font)names.add(el.pg.font==='$head'?doc.theme.headFont:el.pg.font==='$body'?doc.theme.bodyFont:el.pg.font);return [...names]};
 const baseEl=elHTML;
 elHTML=function(el,ctx,pg){if(el.type!=='productgallery')return baseEl(el,ctx,pg);
  if(el.hidden)return '';
  const edit=!!ctx.edit,selected=edit&&S.sel?.k==='el'&&S.sel.id===el.id,single=selected&&S.multi.length<2;
  const handles=single&&!el.locked&&!S.editing&&S.mode!=='proto'&&S.tool!=='pen'?['nw','n','ne','e','se','s','sw','w'].map(d=>`<i class="h ${d}" data-h="${d}"></i>`).join('')+'<i class="h rot" data-h="rot"></i>':'';
  return `<div class="el e-${el.id}${selected?' selected':''}${el.locked?' lock':''}" data-id="${el.id}" style="${elStyle(el)}">${htmlGallery(el,edit)}${handles}</div>`;
 };
 function productPanel(el){const o=el.pg||initial.pg,slides=getSlides(el),fonts=[['$head','Theme Headings'],['$body','Theme Body'],...GOOGLE.map(a=>[a[0],a[0]]),...S.fonts.map(a=>[a.family,a.family])];
  return GRP('mzpg-options','Product Image Carousel · Editing',`<div class="hint">Choose one product photo at a time. Drag or use arrows in Preview; editing is separate from the existing Carousel widget.</div>
   ${X('Product title','el','pg.title')}${X('Price / caption','el','pg.price')}
   ${SEL('Font family','el','pg.font',fonts)}${N('Title font size (px)','el','pg.titleSize',{min:8,max:90})}${N('Price font size (px)','el','pg.priceSize',{min:8,max:70})}
   ${CL('Accent color','el','pg.accent')}${CL('Background color','el','pg.background')}${N('Corner radius (px)','el','pg.radius',{min:0,max:48})}${SEL('Image fitting','el','pg.fit',[['contain','Show complete photo'],['cover','Fill and crop']])}
   ${CB('Show thumbnails','el','pg.thumbs')}${CB('Show arrows','el','pg.arrows')}${CB('Show dots','el','pg.dots')}${CB('Loop slides','el','pg.loop')}
   <div class="row" style="gap:5px;margin:10px 0"><button class="btn sm pri" type="button" data-a="mzpg-upload">⬆ Upload product photos</button><button class="btn sm" type="button" data-a="mzpg-empty">＋ Empty slide</button></div>
   <div class="lbl">Photos (${slides.length})</div>${slides.map((sl,i)=>`<div class="prow" style="display:flex;gap:6px;align-items:center;margin:5px 0"><button type="button" class="btn sm" data-a="mzpg-set-active" data-i="${i}" title="Select image">${i+1}</button>${sl.asset&&assetSrc(sl.asset)?`<img src="${assetSrc(sl.asset)}" alt="" style="width:37px;height:33px;object-fit:cover;border-radius:5px">`:'<span class="hint">Empty</span>'}<input type="text" aria-label="Alternative text for photo ${i+1}" data-mzpg-alt="${i}" value="${esc(sl.alt||'')}" style="min-width:0;flex:1;width:85px" placeholder="Alt text"><button type="button" class="btn sm" data-a="mzpg-up" data-i="${i}" ${i===0?'disabled':''} title="Move photo up">↑</button><button type="button" class="btn sm" data-a="mzpg-down" data-i="${i}" ${i===slides.length-1?'disabled':''} title="Move photo down">↓</button><button type="button" class="btn sm" data-a="mzpg-remove" data-i="${i}" title="Remove photo">×</button></div>`).join('')}
   <div class="hint">Already uploaded images:</div><div class="palrow" style="gap:6px;max-height:180px;overflow-y:auto">${S.assets.map(a=>`<button class="sw" type="button" data-a="mzpg-choose" data-aid="${esc(a.id)}" title="Add ${esc(a.name)}" style="width:48px;height:44px;padding:0;overflow:hidden"><img src="${a.data}" alt="${esc(a.name)}" style="width:100%;height:100%;object-fit:cover"></button>`).join('')||'<div class="hint">No images yet — choose Upload</div>'}</div>`);
 }
 const basePanel=elPanel;
 elPanel=function(...args){let h=basePanel(...args),el=T('el');if(el?.type==='productgallery')h+=productPanel(el);return h};
 const galleryInput=document.createElement('input');galleryInput.type='file';galleryInput.accept='image/png,image/jpeg,image/webp,image/gif';galleryInput.multiple=true;galleryInput.hidden=true;document.body.appendChild(galleryInput);
 galleryInput.addEventListener('change',async()=>{const files=[...galleryInput.files];galleryInput.value='';const id=T('el')?.id;
  if(!files.length||!id)return;const list=await processImages(files);const el=findEl(id)?.el;
  if(!el||el.type!=='productgallery'||!list.length)return;commit(discrete());el.pg=el.pg||clone(initial.pg);el.pg.slides.push(...list.map(a=>({asset:a.id,alt:a.name})));el.pg.active=el.pg.slides.length-list.length;renderCanvas();renderRight();scheduleSave();toast(list.length+' product photos added');
 });
 function mutate(fn){const el=T('el');if(!el||el.type!=='productgallery')return;commit(discrete());el.pg=el.pg||clone(initial.pg);fn(el.pg);renderCanvas();renderRight();scheduleSave()}
 Object.assign(ACT,{
  'mzpg-upload':()=>galleryInput.click(),
  'mzpg-empty':()=>mutate(c=>{c.slides.push({asset:'',alt:''});c.active=c.slides.length-1}),
  'mzpg-choose':b=>mutate(c=>{c.slides.push({asset:b.dataset.aid,alt:asset(b.dataset.aid)?.name||''});c.active=c.slides.length-1}),
  'mzpg-remove':b=>mutate(c=>{c.slides.splice(+b.dataset.i,1);c.active=Math.min(c.active,Math.max(0,c.slides.length-1))}),
  'mzpg-up':b=>mutate(c=>{const i=+b.dataset.i;if(i<1)return;[c.slides[i],c.slides[i-1]]=[c.slides[i-1],c.slides[i]];c.active=i-1}),
  'mzpg-down':b=>mutate(c=>{const i=+b.dataset.i;if(i>=c.slides.length-1)return;[c.slides[i],c.slides[i+1]]=[c.slides[i+1],c.slides[i]];c.active=i+1}),
  'mzpg-set-active':b=>mutate(c=>{c.active=+b.dataset.i})
 });
 document.addEventListener('change',e=>{const i=e.target.closest('[data-mzpg-alt]');if(!i)return;const idx=+i.dataset.mzpgAlt;mutate(c=>{if(c.slides[idx])c.slides[idx].alt=i.value})});
 // Keep the preview on the destination page without rebuilding all images, JS and CSS.
 // This remains isolated inside the existing sandboxed iframe.
 function navigationRuntime(){addEventListener('message',function(e){if(e.source!==parent||!e.data||e.data.mozaProductPreviewNavigate!==1)return;var s=String(e.data.slug||'');if(!/^[a-z0-9-]{1,80}$/i.test(s))return;location.hash='#/'+s})}
 const baseSite=siteHTML;
 siteHTML=function(...args){let h=baseSite(...args);return h.replace('</head>',`<style>${document.querySelector('link[href="./moza-product-gallery.css"]')?'' : ''}${document.getElementById('mz-gallery-site-css')?.textContent||''}</style><style id="mz-preview-initial-page">.pg:not([data-start]){display:none}</style></head>`).replace('</body>',`<script>try{(${galleryRuntime.toString()})()}catch(e){console.warn('Product gallery',e)};try{(${navigationRuntime.toString()})()}catch(e){};document.getElementById('mz-preview-initial-page')?.remove();<\/script></body>`)};
 // Exported HTML needs the style independently of editor's external stylesheets.
 const styles=document.createElement('style');styles.id='mz-gallery-site-css';
 // Filled synchronously from same-origin stylesheet after it loads, with a safe inline fallback.
 styles.textContent='.mzpg{display:flex;flex-direction:column;width:100%;height:100%;gap:8px;overflow:hidden;min-width:0;font-family:var(--mzpg-font,Inter,sans-serif)}.mzpg-main{position:relative;flex:1;min-height:0;display:grid;place-items:center;overflow:hidden;border-radius:var(--mzpg-radius,12px);background:#f3f4f6}.mzpg-main img{width:100%;height:100%;object-fit:var(--mzpg-fit,contain)}.mzpg-main img[hidden]{display:none!important}.mzpg-arrow{position:absolute;top:50%;transform:translateY(-50%);border:0;border-radius:50%;width:32px;height:32px;background:#fffe;cursor:pointer;color:#293142;font-size:22px}.mzpg-arrow.prev{left:8px}.mzpg-arrow.next{right:8px}.mzpg-thumbs{display:flex;gap:6px;justify-content:center;overflow:auto}.mzpg-thumb{height:42px;width:47px;flex:0 0 47px;border:2px solid transparent;border-radius:6px;padding:1px;overflow:hidden}.mzpg-thumb img{width:100%;height:100%;object-fit:cover}.mzpg-thumb[aria-current="true"]{border-color:var(--mzpg-accent,#344e83)}.mzpg-details{display:flex;flex-direction:column;flex-shrink:0}.mzpg-title{font-size:var(--mzpg-title-size,16px);font-weight:700}.mzpg-price{color:var(--mzpg-accent,#344e83);font-size:var(--mzpg-price-size,14px)}.mzpg-dots{display:flex;gap:5px;justify-content:center}.mzpg-dot{width:6px;height:6px;border:0;border-radius:100px;background:#bac4d8}.mzpg-dot[aria-current="true"]{width:16px;background:var(--mzpg-accent,#344e83)}.mzpg-placeholder{color:#64748b;text-align:center;font:13px system-ui;padding:20px}@media(prefers-reduced-motion:reduce){.mzpg *{transition:none!important}}';
 document.head.appendChild(styles);
 // Keep the canvas scroll anchored while changing Properties values. The
 // actual element x/y coordinates still update when X/Y fields are changed.
 const originalCanvasRender=renderCanvas;
 renderCanvas=function(...args){
  const vp=document.getElementById('viewport');
  const editingProperties=!!document.activeElement?.closest?.('#right');
  const left=editingProperties?vp?.scrollLeft:undefined;
  const top=editingProperties?vp?.scrollTop:undefined;
  const result=originalCanvasRender(...args);
  if(editingProperties&&vp&&Number.isFinite(left)&&Number.isFinite(top)){
   vp.scrollLeft=left;vp.scrollTop=top;
  }
  return result;
 };
 // Source of layout confusion: constant full re-render restarts animations while typing.
 // Temporarily freeze only editor motion while a Properties control has keyboard focus.
 const fr=document.getElementById('frame');
 document.addEventListener('focusin',e=>{if(e.target.closest('#right'))fr?.classList.add('mz-properties-active')});
 document.addEventListener('focusout',()=>{setTimeout(()=>{if(!document.activeElement?.closest?.('#right'))fr?.classList.remove('mz-properties-active')},30)});
 // Prevent the selected page from flashing as another one during iframe init.
 const previewRefresh=refreshPreviewFrame;
 let previousPreview=null;
 refreshPreviewFrame=function(){const f=document.querySelector('#pv.show #prevframe');
  const pageId=document.getElementById('pvStart')?.value||document.getElementById('pv13Page')?.value||S.pageId||S.doc.start;
  const guest=document.getElementById('pvGuest')?.value||'';const pg=S.doc.pages.find(p=>p.id===pageId);
  if(f&&f.hasAttribute('srcdoc')&&previousPreview&&previousPreview.guest===guest&&previousPreview.bp===S.bp&&previousPreview.proto===!!S._previewProto&&pg&&previousPreview.pageId!==pageId){
   try{f.contentWindow.postMessage({mozaProductPreviewNavigate:1,slug:pg.slug},'*');previousPreview.pageId=pageId;return}catch(e){}
  }
  previewRefresh();previousPreview={pageId,guest,bp:S.bp,proto:!!S._previewProto};
 };
 // Preserve existing carousel by design: no handlers, CSS or data are overwritten.
 window.__mozaProductGallery='V14.2';
})();
