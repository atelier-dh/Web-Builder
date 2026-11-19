/* Moza Studio V14.7.3 — Etsy/Shopee Product Gallery + stable properties + faster preview.
   The existing Carousel and data model are not modified. */
(()=>{'use strict';
 const initial={name:'Product Image Carousel',w:520,h:350,st:{bg:'#ffffff',br:12},pg:{slides:[],active:0,title:'Our Product',price:'',font:'$body',titleSize:17,priceSize:15,accent:'#344e83',background:'#ffffff',radius:12,fit:'contain',arrows:true,thumbs:true,dots:false,loop:true,layout:'shopee',zoom:true,counter:true,thumbSize:57}};
 TDEF.productgallery=initial;
 TILEICO.productgallery='<rect x="4" y="3" width="16" height="14" rx="2"/><circle cx="9" cy="8" r="1"/><path d="m5 14 5-4 4 3 2-2 3 3M7 21h10"/>';
 const oldElements=tabElements;
 tabElements=function(...args){
  const html=oldElements(...args);
  const launch=`<section class="mzpg-insert-card" aria-label="Etsy and Shopee product photo gallery"><div class="mzpg-insert-head"><span>🛍️</span><div><b>Product Photo Gallery</b><small>Etsy / Shopee style · multiple photos of one product</small></div></div><p>One large photo, selectable thumbnails, swipe on mobile, arrows and image zoom. Editable from Properties.</p><button class="btn pri" type="button" style="width:100%" data-add="productgallery">＋ Add Etsy / Shopee Gallery</button></section>`;
  return html.includes('<h3>Elements</h3>')?html.replace('<h3>Elements</h3>','<h3>Elements</h3>'+launch):launch+html;
 };
 // V14.8.1: Make the existing Etsy/Shopee carousel discoverable next to Smart Filter.
 // The widget already exists; this merely restores its entry point without
 // modifying the legacy Carousel, project model or export runtime.
 const mozaGalleryRenderLeft=renderLeft;
 renderLeft=function(...args){
  const out=mozaGalleryRenderLeft.apply(this,args);
  if(S.tab==='elements'){
   const library=document.querySelector('#left .mz6-library');
   if(library && !library.querySelector('[data-add="productgallery"]')){
    const button=document.createElement('button');
    button.type='button';
    button.className='btn sm mzpg-dynamic-launch';
    button.dataset.add='productgallery';
    button.textContent='＋ Product Photo Carousel · Etsy / Shopee';
    button.title='Add a swipeable product photo carousel. Pick Shopee or Etsy layout in Properties.';
    button.setAttribute('aria-label','Add Etsy or Shopee product photo carousel');
    button.style.cssText='display:block;width:100%;margin-top:8px;white-space:normal;line-height:1.45;min-height:40px;';
    const catalog=library.querySelector('[data-a="mz13-catalog-insert"]');
    if(catalog)catalog.insertAdjacentElement('afterend',button);
    else library.appendChild(button);
   }
  }
  return out;
 };
 const getSlides=el=>(el.pg?.slides||[]).filter(x=>x&&typeof x==='object');
 const safeInt=(v,min,max,fallback)=>{v=Number(v);return Number.isFinite(v)?Math.round(Math.max(min,Math.min(max,v))):fallback};
 function htmlGallery(el,edit){
  const o=el.pg||initial.pg,images=getSlides(el),chosen=Math.max(0,Math.min(images.length-1,safeInt(o.active,0,999,0))),current=images[chosen],src=current?.asset&&assetSrc(current.asset)||'';
  const layout=['shopee','etsy','minimal'].includes(o.layout)?o.layout:'shopee';
  const css=`--mzpg-radius:${safeInt(o.radius,0,48,12)}px;--mzpg-fit:${o.fit==='cover'?'cover':'contain'};--mzpg-accent:${esc(o.accent||'#344e83')};--mzpg-font:${fam(o.font||'$body')};--mzpg-title-size:${safeInt(o.titleSize,8,90,17)}px;--mzpg-price-size:${safeInt(o.priceSize,8,70,15)}px;--mzpg-thumb-size:${safeInt(o.thumbSize,36,110,57)}px;background:${esc(o.background||'#ffffff')};`;
  const thumbs=images.map((sl,i)=>`<button class="mzpg-thumb" type="button" data-mzpg-index="${i}" aria-current="${i===chosen}" aria-label="Show product photo ${i+1}">${assetSrc(sl.asset)?`<img draggable="false" src="${assetSrc(sl.asset)}" alt="">`:'<span>＋</span>'}</button>`).join('');
  const dots=images.map((_,i)=>`<button type="button" class="mzpg-dot" data-mzpg-index="${i}" aria-current="${i===chosen}" aria-label="Photo ${i+1}"></button>`).join('');
  const main=`<div class="mzpg-main"><img class="mzpg-photo" src="${src}" alt="${esc(current?.alt||o.title||'Product photo')}" draggable="false" ${src?'':'hidden'}>${src?'':'<div class="mzpg-placeholder">Select gallery → Properties → Upload product photos</div>'}${o.arrows!==false&&images.length>1?'<button type="button" class="mzpg-arrow prev" aria-label="Previous product photo">‹</button><button type="button" class="mzpg-arrow next" aria-label="Next product photo">›</button>':''}${o.counter!==false&&images.length>1?`<span class="mzpg-counter" aria-live="polite">${chosen+1} / ${images.length}</span>`:''}${o.zoom!==false&&images.length?'<button type="button" class="mzpg-zoom" aria-label="View larger photo" title="View larger photo">⤢</button>':''}</div>`;
  const rail=o.thumbs!==false&&images.length>1?`<div class="mzpg-thumbs" aria-label="Product photo thumbnails">${thumbs}</div>`:'';
  return `<div class="mzpg mzpg-layout-${layout}" data-mzpg="1" data-mzpg-start="${chosen}" data-mzpg-loop="${o.loop!==false?'1':'0'}" style="${css}" role="region" aria-roledescription="carousel" aria-label="${esc(o.title||'Product photos')}" tabindex="0"><div class="mzpg-stage">${main}${rail}</div>${o.dots&&images.length>1?`<div class="mzpg-dots">${dots}</div>`:''}${o.title||o.price?`<div class="mzpg-details">${o.title?`<div class="mzpg-title">${esc(o.title)}</div>`:''}${o.price?`<div class="mzpg-price">${esc(o.price)}</div>`:''}</div>`:''}<script type="application/json" class="mzpg-data">${JSON.stringify(images.map(s=>({src:assetSrc(s.asset),alt:s.alt||''}))).replace(/</g,'\\u003c')}</script></div>`;
 }
 function galleryRuntime(){
  function boot(root){
   if(root.dataset.mzpgBoot)return;root.dataset.mzpgBoot='1';var data=[];
   try{data=JSON.parse(root.querySelector('.mzpg-data')?.textContent||'[]')}catch(e){}
   var idx=Number(root.dataset.mzpgStart)||0,photo=root.querySelector('.mzpg-photo');if(!photo)return;
   var thumbs=[].slice.call(root.querySelectorAll('.mzpg-thumb')),dots=[].slice.call(root.querySelectorAll('.mzpg-dot')),lightbox=null;
   function go(n){
    if(!data.length)return;
    if(root.dataset.mzpgLoop!=='1'&&(n<0||n>=data.length))return;
    idx=(n+data.length)%data.length;
    photo.src=data[idx].src||'';photo.alt=data[idx].alt||root.getAttribute('aria-label')||'Product photo';photo.hidden=!data[idx].src;
    thumbs.forEach(function(t,i){t.setAttribute('aria-current',i===idx?'true':'false')});
    dots.forEach(function(t,i){t.setAttribute('aria-current',i===idx?'true':'false')});
    var count=root.querySelector('.mzpg-counter');if(count)count.textContent=(idx+1)+' / '+data.length;
    var prev=root.querySelector('.mzpg-arrow.prev'),next=root.querySelector('.mzpg-arrow.next');
    if(prev)prev.disabled=root.dataset.mzpgLoop!=='1'&&idx===0;
    if(next)next.disabled=root.dataset.mzpgLoop!=='1'&&idx===data.length-1;
    if(lightbox){var big=lightbox.querySelector('.mzpg-lightbox-img');if(big){big.src=data[idx].src||'';big.alt=data[idx].alt||'Product photo'}var cn=lightbox.querySelector('.mzpg-lightbox-count');if(cn)cn.textContent=(idx+1)+' / '+data.length}
   }
   function closeZoom(){if(!lightbox)return;lightbox.remove();lightbox=null;root.focus()}
   function openZoom(){if(!data.length||!data[idx].src)return;
    lightbox=document.createElement('div');lightbox.className='mzpg-lightbox';lightbox.setAttribute('role','dialog');lightbox.setAttribute('aria-modal','true');lightbox.setAttribute('aria-label','Product photo viewer');
    lightbox.innerHTML='<button class="mzpg-lightbox-close" type="button" aria-label="Close image viewer">×</button><button class="mzpg-lightbox-prev" type="button" aria-label="Previous photo">‹</button><img class="mzpg-lightbox-img" alt=""><button class="mzpg-lightbox-next" type="button" aria-label="Next photo">›</button><span class="mzpg-lightbox-count"></span>';
    document.body.appendChild(lightbox);
    lightbox.querySelector('.mzpg-lightbox-close').addEventListener('click',closeZoom);
    lightbox.querySelector('.mzpg-lightbox-prev').addEventListener('click',function(){go(idx-1)});
    lightbox.querySelector('.mzpg-lightbox-next').addEventListener('click',function(){go(idx+1)});
    lightbox.addEventListener('click',function(e){if(e.target===lightbox)closeZoom()});
    var big=lightbox.querySelector('.mzpg-lightbox-img');big.src=data[idx].src;big.alt=data[idx].alt||'Product photo';
    lightbox.querySelector('.mzpg-lightbox-count').textContent=(idx+1)+' / '+data.length;
    lightbox.querySelector('.mzpg-lightbox-close').focus();
   }
   root.addEventListener('click',function(e){var b=e.target.closest('button');if(!b)return;
    if(b.classList.contains('prev'))go(idx-1);
    else if(b.classList.contains('next'))go(idx+1);
    else if(b.classList.contains('mzpg-zoom'))openZoom();
    else if(b.hasAttribute('data-mzpg-index'))go(+b.getAttribute('data-mzpg-index'));
   });
   function key(e){if(lightbox){if(e.key==='Escape'){e.preventDefault();closeZoom()}else if(e.key==='ArrowLeft'||e.key==='ArrowRight'){e.preventDefault();go(idx+(e.key==='ArrowRight'?1:-1))}}else if((e.key==='ArrowLeft'||e.key==='ArrowRight')&&root.contains(document.activeElement)){e.preventDefault();go(idx+(e.key==='ArrowRight'?1:-1))}}
   document.addEventListener('keydown',key);
   var start=null;function touchStart(e){if(e.touches.length===1)start={x:e.touches[0].clientX,y:e.touches[0].clientY}}
   function touchEnd(e){if(!start||!e.changedTouches.length)return;var dx=e.changedTouches[0].clientX-start.x,vertical=e.changedTouches[0].clientY-start.y;start=null;if(Math.abs(dx)>35&&Math.abs(dx)>Math.abs(vertical)*1.3)go(idx+(dx<0?1:-1))}
   root.addEventListener('touchstart',touchStart,{passive:true});root.addEventListener('touchend',touchEnd,{passive:true});
   go(idx);
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
 function productPanel(el){const o=el.pg||initial.pg,slides=getSlides(el),fonts=[['$head','Theme Headings'],['$body','Theme Body'],...GOOGLE.map(a=>[a[0],a[0]]),...S.fonts.map(a=>[a.family,a.family])],compact=innerWidth<=760||(innerWidth<=1400&&(matchMedia('(pointer:coarse)').matches||matchMedia('(any-pointer:coarse)').matches)),pickerLimit=compact?Math.max(24,S._mzPgPickerLimit||24):S.assets.length,visibleAssets=S.assets.slice(0,pickerLimit);
  return GRP('mzpg-options','Etsy / Shopee Product Gallery · Design & Photos',`<div class="hint">Upload multiple photos for ONE product. Preview allows swiping, clicking thumbnails and zoom. Your original Carousel remains unchanged.</div>
   ${X('Product title','el','pg.title')}${X('Price / caption','el','pg.price')}
   ${SEL('Font family','el','pg.font',fonts)}${N('Title font size (px)','el','pg.titleSize',{min:8,max:90})}${N('Price font size (px)','el','pg.priceSize',{min:8,max:70})}
   ${CL('Accent color','el','pg.accent')}${CL('Background color','el','pg.background')}${N('Corner radius (px)','el','pg.radius',{min:0,max:48})}${SEL('Image fitting','el','pg.fit',[['contain','Show complete photo'],['cover','Fill and crop']])}
   ${SEL('Gallery style','el','pg.layout',[['shopee','Shopee · thumbnails below'],['etsy','Etsy · thumbnails beside image'],['minimal','Minimal · clean large photo']])}${N('Thumbnail size (px)','el','pg.thumbSize',{min:36,max:110})}${CB('Click to zoom image','el','pg.zoom')}${CB('Show photo count','el','pg.counter')}${CB('Show thumbnails','el','pg.thumbs')}${CB('Show arrows','el','pg.arrows')}${CB('Show dots','el','pg.dots')}${CB('Loop slides','el','pg.loop')}
   <div class="row" style="gap:5px;margin:10px 0"><button class="btn sm pri" type="button" data-a="mzpg-upload">⬆ Upload product photos</button><button class="btn sm" type="button" data-a="mzpg-empty">＋ Empty slide</button></div>
   <div class="lbl">Photos (${slides.length})</div>${slides.map((sl,i)=>`<div class="prow" style="display:flex;gap:6px;align-items:center;margin:5px 0"><button type="button" class="btn sm" data-a="mzpg-set-active" data-i="${i}" title="Select image">${i+1}</button>${sl.asset&&assetSrc(sl.asset)?`<img src="${assetSrc(sl.asset)}" alt="" style="width:37px;height:33px;object-fit:cover;border-radius:5px">`:'<span class="hint">Empty</span>'}<input type="text" aria-label="Alternative text for photo ${i+1}" data-mzpg-alt="${i}" value="${esc(sl.alt||'')}" style="min-width:0;flex:1;width:85px" placeholder="Alt text"><button type="button" class="btn sm" data-a="mzpg-up" data-i="${i}" ${i===0?'disabled':''} title="Move photo up">↑</button><button type="button" class="btn sm" data-a="mzpg-down" data-i="${i}" ${i===slides.length-1?'disabled':''} title="Move photo down">↓</button><button type="button" class="btn sm" data-a="mzpg-remove" data-i="${i}" title="Remove photo">×</button></div>`).join('')}
   <div class="hint">Already uploaded images:</div><div class="palrow" style="gap:6px;max-height:180px;overflow-y:auto">${visibleAssets.map(a=>`<button class="sw" type="button" data-a="mzpg-choose" data-aid="${esc(a.id)}" title="Add ${esc(a.name)}" style="width:48px;height:44px;padding:0;overflow:hidden"><img src="${a.data}" alt="${esc(a.name)}" loading="lazy" decoding="async" style="width:100%;height:100%;object-fit:cover"></button>`).join('')||'<div class="hint">No images yet — choose Upload</div>'}</div>${visibleAssets.length<S.assets.length?`<button type="button" class="btn mzperf-more" data-a="mzpg-more-uploads">Show more images (${S.assets.length-visibleAssets.length} remaining)</button>`:''}`);
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
  'mzpg-more-uploads':()=>{S._mzPgPickerLimit=(S._mzPgPickerLimit||24)+24;renderRight()},
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
 styles.textContent="/* Moza Studio V14.7.3: Etsy / Shopee photo gallery, separate from legacy Carousel. */\n.mzpg{display:flex;flex-direction:column;gap:8px;width:100%;height:100%;min-width:0;padding:6px;box-sizing:border-box;overflow:hidden;font-family:var(--mzpg-font,Inter,sans-serif)}\n.mzpg-stage{display:flex;flex-direction:column;gap:8px;flex:1 1 auto;min-height:0;min-width:0}\n.mzpg-main{position:relative;display:grid;place-items:center;flex:1 1 auto;min-width:0;min-height:0;overflow:hidden;border-radius:var(--mzpg-radius,12px);background:#f5f5f6}\n.mzpg-main>img{display:block;width:100%;height:100%;object-fit:var(--mzpg-fit,contain);-webkit-user-drag:none;user-select:none}\n.mzpg-main>img[hidden]{display:none!important}\n.mzpg-placeholder{color:#64748b;text-align:center;font:600 13px/1.5 system-ui;padding:16px}\n.mzpg-arrow,.mzpg-zoom{position:absolute;z-index:2;cursor:pointer;display:grid;place-items:center;border:0;color:#242833;background:#ffffffea;box-shadow:0 2px 10px #0003}\n.mzpg-arrow{top:50%;transform:translateY(-50%);width:35px;height:35px;border-radius:50%;font:24px system-ui}\n.mzpg-arrow.prev{left:9px}.mzpg-arrow.next{right:9px}.mzpg-arrow:disabled{opacity:.3;cursor:default}\n.mzpg-zoom{right:10px;top:10px;width:30px;height:30px;border-radius:8px;font:18px system-ui}\n.mzpg-counter{position:absolute;right:10px;bottom:10px;background:#111827bf;color:white;padding:4px 9px;border-radius:40px;font:12px system-ui;pointer-events:none}\n.mzpg-thumbs{display:flex;gap:6px;overflow:auto;flex:0 0 auto;min-height:0;scrollbar-width:thin;justify-content:flex-start;max-width:100%;padding:2px}\n.mzpg-thumb{width:var(--mzpg-thumb-size,57px);height:var(--mzpg-thumb-size,57px);flex:0 0 var(--mzpg-thumb-size,57px);border:2px solid transparent;border-radius:7px;padding:2px;background:#f1f3f7;cursor:pointer;overflow:hidden}\n.mzpg-thumb[aria-current=\"true\"]{border-color:var(--mzpg-accent,#344e83)}\n.mzpg-thumb img{width:100%;height:100%;object-fit:cover;border-radius:3px}.mzpg-thumb span{color:#93a0b6}\n.mzpg-layout-etsy .mzpg-stage{flex-direction:row-reverse}\n.mzpg-layout-etsy .mzpg-thumbs{flex-direction:column;width:calc(var(--mzpg-thumb-size,57px) + 8px);max-height:100%;overflow-y:auto;overflow-x:hidden;align-items:center;justify-content:flex-start}\n.mzpg-layout-minimal .mzpg-thumbs{display:none}\n.mzpg-dots{display:flex;justify-content:center;gap:5px}\n.mzpg-dot{border:0;border-radius:99px;width:7px;height:7px;padding:0;background:#bac4d8;cursor:pointer}\n.mzpg-dot[aria-current=\"true\"]{width:17px;background:var(--mzpg-accent,#344e83)}\n.mzpg-details{display:flex;flex-direction:column;flex:0 0 auto;gap:3px;min-width:0}\n.mzpg-title{font-size:var(--mzpg-title-size,16px);font-weight:700;line-height:1.25;overflow-wrap:anywhere}\n.mzpg-price{font-size:var(--mzpg-price-size,14px);font-weight:600;color:var(--mzpg-accent,#344e83)}\n.mzpg-insert-card{background:#f4f0ff;border:1px solid #d9c8ff;border-radius:12px;margin:10px 0 14px;padding:12px;display:grid;gap:8px;color:#263248}\n.mzpg-insert-head{display:flex;gap:8px;align-items:center}.mzpg-insert-head span{font-size:23px}\n.mzpg-insert-head b{display:block;font-size:13px}.mzpg-insert-head small{display:block;font-size:11px;color:#59637b}\n.mzpg-insert-card p{margin:0;font-size:11px;line-height:1.5;color:#5f6682}\n.mzpg-lightbox{position:fixed;inset:0;z-index:2147483630;background:#111827ed;display:flex;align-items:center;justify-content:center;gap:10px;padding:40px 54px;box-sizing:border-box}\n.mzpg-lightbox-img{display:block;max-width:100%;max-height:100%;width:auto;height:auto;object-fit:contain;border-radius:6px;box-shadow:0 10px 50px #0004}\n.mzpg-lightbox button{border:0;cursor:pointer;display:grid;place-items:center;background:#ffffffed;color:#152033}\n.mzpg-lightbox-close{position:absolute;right:18px;top:15px;width:38px;height:38px;border-radius:50%;font:28px system-ui}\n.mzpg-lightbox-prev,.mzpg-lightbox-next{position:absolute;top:50%;transform:translateY(-50%);height:44px;width:44px;border-radius:50%;font:32px system-ui}\n.mzpg-lightbox-prev{left:12px}.mzpg-lightbox-next{right:12px}\n.mzpg-lightbox-count{position:absolute;bottom:12px;color:white;font:13px system-ui}\n#frame .mzpg button{pointer-events:none!important}#frame .mzpg,#frame .mzpg *{user-select:none}\n#frame.mz-properties-active .el,#frame.mz-properties-active .el *{animation-play-state:paused!important;transition:none!important}\n#frame,#zoomwrap{overflow-anchor:none}\n@media(max-width:640px){.mzpg-layout-etsy .mzpg-stage{flex-direction:column}.mzpg-layout-etsy .mzpg-thumbs{width:100%;max-height:unset;flex-direction:row;overflow-x:auto;overflow-y:hidden}.mzpg-arrow{width:30px;height:30px;font-size:20px}.mzpg-lightbox{padding:46px 30px}.mzpg-lightbox-prev,.mzpg-lightbox-next{width:27px;height:35px;font-size:22px}.mzpg-lightbox-prev{left:2px}.mzpg-lightbox-next{right:2px}}\n@media(prefers-reduced-motion:reduce){.mzpg *, .mzpg-lightbox *{transition:none!important;animation:none!important}}\n";
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
 window.__mozaProductGallery='V14.8.1';
})();
