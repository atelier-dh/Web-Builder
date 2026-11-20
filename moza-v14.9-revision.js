/*
 * Moza Studio V14.9 — Core Interaction + Modular Envelope/Cinematic patch
 * Additive patch for V14.8.31. Keeps legacy project data and features intact.
 */
(function () {
  'use strict';
  if (window.__MOZA_V149_REVISION__) return;
  window.__MOZA_V149_REVISION__ = true;

  const MZ149 = window.MZ149 = { version: '14.9', build: 'mobile-core-envelope-onepage-1' };
  const $149 = (sel, root=document) => root.querySelector(sel);
  const clamp149 = (v, min, max) => Math.min(max, Math.max(min, Number(v) || 0));

  /* ---------- Mobile canvas navigation: one-finger pan + two-finger pinch ---------- */
  function zoomAt149(nextZoom, clientX, clientY) {
    const vp = $149('#viewport'), frame = $149('#frame');
    if (!vp || !frame) { setZoom(nextZoom); return; }
    const oldZoom = Number(S.zoom) || 1;
    const oldRect = frame.getBoundingClientRect();
    const anchorX = (clientX - oldRect.left) / oldZoom;
    const anchorY = (clientY - oldRect.top) / oldZoom;
    const next = clamp149(nextZoom, .25, 2);
    if (Math.abs(next - oldZoom) < .001) return;
    S.zoom = next;
    renderCanvas();
    renderStatus();
    requestAnimationFrame(() => {
      const newFrame = $149('#frame');
      if (!newFrame) return;
      const r = newFrame.getBoundingClientRect();
      vp.scrollLeft += r.left + anchorX * next - clientX;
      vp.scrollTop += r.top + anchorY * next - clientY;
    });
  }
  MZ149.zoomAt = zoomAt149;

  function installMobileCanvasGestures149() {
    const vp = $149('#viewport');
    if (!vp || vp.dataset.mz149Gestures === '1') return;
    vp.dataset.mz149Gestures = '1';
    let gesture = null, pinchRaf = 0, pendingPinch = null;
    MZ149.pinchActive = false;
    const midpoint = ts => ({ x: (ts[0].clientX + ts[1].clientX) / 2, y: (ts[0].clientY + ts[1].clientY) / 2 });
    const distance = ts => Math.hypot(ts[0].clientX - ts[1].clientX, ts[0].clientY - ts[1].clientY);
    const isControl = node => !!(node && node.closest && node.closest('button,input,select,textarea,[data-a],.h,.pathpt,.pa,.sechead,.tools,#dock'));
    vp.addEventListener('touchstart', e => {
      if (e.touches.length >= 2) {
        const mid = midpoint(e.touches);
        gesture = { type: 'pinch', distance: Math.max(1, distance(e.touches)), zoom: S.zoom, x: mid.x, y: mid.y };
        MZ149.pinchActive = true;
        e.preventDefault(); e.stopImmediatePropagation();
        return;
      }
      if (e.touches.length === 1) {
        const target = e.target;
        const locked = target && target.closest && target.closest('.el.lock');
        const element = target && target.closest && target.closest('.el');
        if (!isControl(target) && (!element || locked)) {
          const t = e.touches[0];
          gesture = { type: 'pan', x: t.clientX, y: t.clientY, left: vp.scrollLeft, top: vp.scrollTop };
          e.preventDefault(); e.stopImmediatePropagation();
        } else gesture = null;
      }
    }, { capture: true, passive: false });

    vp.addEventListener('touchmove', e => {
      if (!gesture) return;
      if (gesture.type === 'pinch' && e.touches.length >= 2) {
        e.preventDefault(); e.stopImmediatePropagation();
        const mid = midpoint(e.touches);
        pendingPinch = { zoom: gesture.zoom * distance(e.touches) / gesture.distance, x: mid.x, y: mid.y };
        if (!pinchRaf) pinchRaf = requestAnimationFrame(() => {
          pinchRaf = 0;
          const p = pendingPinch; pendingPinch = null;
          if (p) zoomAt149(p.zoom, p.x, p.y);
        });
      } else if (gesture.type === 'pan' && e.touches.length === 1) {
        e.preventDefault(); e.stopImmediatePropagation();
        const t = e.touches[0];
        vp.scrollLeft = gesture.left - (t.clientX - gesture.x);
        vp.scrollTop = gesture.top - (t.clientY - gesture.y);
      }
    }, { capture: true, passive: false });

    const end = e => {
      if (e.touches.length < 2 && gesture && gesture.type === 'pinch') gesture = null;
      if (e.touches.length === 0) { gesture = null; MZ149.pinchActive = false; }
      if (gesture && gesture.type === 'pan' && e.touches.length === 0) gesture = null;
    };
    vp.addEventListener('touchend', end, { capture: true, passive: true });
    vp.addEventListener('touchcancel', end, { capture: true, passive: true });
    window.addEventListener('pointermove', ev => { if (MZ149.pinchActive && ev.pointerType==='touch') { ev.preventDefault(); ev.stopImmediatePropagation(); } }, true);
  }

  function installMobileZoomControls149() {
    const stage = $149('#stage');
    if (!stage || $149('#mz149-zoom-controls')) return;
    const box = document.createElement('div');
    box.id = 'mz149-zoom-controls';
    box.setAttribute('aria-label', 'Canvas zoom controls');
    box.innerHTML = '<button type="button" data-a="mz149-zoom-out" aria-label="Zoom out">−</button><output id="mz149-zoom-value">100%</output><button type="button" data-a="mz149-zoom-in" aria-label="Zoom in">＋</button><button type="button" data-a="mz149-zoom-fit">Fit</button>';
    stage.appendChild(box);
    const sync = () => { const out = $149('#mz149-zoom-value'); if (out) out.textContent = Math.round((Number(S.zoom)||1)*100) + '%'; };
    const originalStatus = renderStatus;
    renderStatus = function () { originalStatus.apply(this, arguments); sync(); };
    sync();
  }
  ACT['mz149-zoom-in'] = () => { const vp=$149('#viewport'),r=vp?.getBoundingClientRect(); zoomAt149((Number(S.zoom)||1)+.1,r?r.left+r.width/2:innerWidth/2,r?r.top+r.height/2:innerHeight/2); };
  ACT['mz149-zoom-out'] = () => { const vp=$149('#viewport'),r=vp?.getBoundingClientRect(); zoomAt149((Number(S.zoom)||1)-.1,r?r.left+r.width/2:innerWidth/2,r?r.top+r.height/2:innerHeight/2); };
  ACT['mz149-zoom-fit'] = () => { fitZoom(); const out=$149('#mz149-zoom-value'); if(out)out.textContent=Math.round(S.zoom*100)+'%'; };

  function ensureEnvelopeSectionHeight149(el) {
    const found=el&&findEl(el.id);if(!found||found.sec.kind==='overlay'||!el.env?.onePageSequence)return false;
    let changed=false;
    for(const bp of ['d','t','m']){
      const bottom=Math.ceil(effG(el,bp,'y')+effG(el,bp,'h')+(Number(found.sec.padB)||0)+24);
      const current=secH(found.sec,bp);
      if(bottom>current+2){
        if(bp==='d')found.sec.h=bottom;
        else {found.sec.hb=found.sec.hb||{};found.sec.hb[bp]=bottom;}
        changed=true;
      }
    }
    return changed;
  }

  const originalCommit149=commit;
  commit=function(){MZ149.hiddenCardSourceDirty=true;return originalCommit149.apply(this,arguments);};
  const originalDelEl149=delEl;
  delEl=function(id){const f=findEl(id),wasEnvelope=!!(f&&f.el.type==='envelope');const result=originalDelEl149.apply(this,arguments);if(wasEnvelope)MZ149.hiddenCardSourceDirty=true;return result;};
  const originalSetField149=setField;
  setField=function(tag,path,value){
    const result=originalSetField149.apply(this,arguments);
    if(tag==='el'&&String(path).startsWith('env.'))MZ149.hiddenCardSourceDirty=true;
    if(tag==='el'&&path==='env.onePageSequence'&&value===true){
      const el=T('el');if(el&&el.type==='envelope'&&ensureEnvelopeSectionHeight149(el)){renderCanvas();scheduleSave();toast('Section diperluas agar cinematic opening tidak terpotong.');}
    }
    return result;
  };

  /* ---------- Proportional resize for image/video assets ---------- */
  const originalStartResize149 = startResize;
  startResize = function (e, id, dir) {
    const found = findEl(id), el = found && found.el;
    if(el&&el.type==='envelope'&&el.env?.onePageSequence){
      const result=originalStartResize149.apply(this,arguments),pointerId=e.pointerId;
      const syncSection=ev=>{if(ev.pointerId!==pointerId)return;window.removeEventListener('pointerup',syncSection);window.removeEventListener('pointercancel',syncSection);setTimeout(()=>{if(ensureEnvelopeSectionHeight149(el)){renderCanvas();scheduleSave();}},0);};
      window.addEventListener('pointerup',syncSection);window.addEventListener('pointercancel',syncSection);return result;
    }
    if (!el || !['image', 'video'].includes(el.type) || el.locked || S.mode !== 'design' || S.tool === 'scale') {
      return originalStartResize149.apply(this, arguments);
    }
    if (e.pointerId === undefined) return originalStartResize149.apply(this, arguments);
    e.preventDefault();
    const b = S.bp, parent = found.parent;
    const baseParent = parent ? (parent._responsiveGroup ? (parent._groupBase?.[b] || {w:parent.gw,h:parent.gh}) : {w:parent.gw,h:parent.gh}) : null;
    const kx = parent ? baseParent.w / Math.max(1, effG(parent,b,'w')) : 1;
    const ky = parent ? baseParent.h / Math.max(1, effG(parent,b,'h')) : 1;
    const st = { x:effG(el,b,'x'), y:effG(el,b,'y'), w:effG(el,b,'w'), h:effG(el,b,'h') };
    const ratio = Math.max(.05, Math.min(20, Number(el.type==='video' && el.videoAspect) || st.w / Math.max(1,st.h)));
    const sx=e.clientX, sy=e.clientY, rot=(Number(el.rot)||0)*Math.PI/180, node=nodeOf(id);
    let changed=false, queued=null, raf=0;
    const snapshot=clone(el);
    const draw=()=>{
      raf=0; const ev=queued; queued=null; if(!ev || S.bp!==b)return;
      const dx=(ev.clientX-sx)/Math.max(.2,S.zoom), dy=(ev.clientY-sy)/Math.max(.2,S.zoom);
      const ldx=(dx*Math.cos(rot)+dy*Math.sin(rot))*kx;
      const ldy=(-dx*Math.sin(rot)+dy*Math.cos(rot))*ky;
      let w=st.w,h=st.h,x=st.x,y=st.y;
      if(dir.includes('e'))w=st.w+ldx;
      if(dir.includes('w'))w=st.w-ldx;
      if(dir.includes('s'))h=st.h+ldy;
      if(dir.includes('n'))h=st.h-ldy;
      const proportional=!ev.shiftKey;
      if(proportional){
        if(dir.length===2){
          const dw=Math.abs(w-st.w)/Math.max(1,st.w), dh=Math.abs(h-st.h)/Math.max(1,st.h);
          if(dw>=dh)h=w/ratio; else w=h*ratio;
        } else if(dir.includes('e')||dir.includes('w')) h=w/ratio;
        else w=h*ratio;
        if(w<8){w=8;h=w/ratio;}
        if(h<4){h=4;w=h*ratio;}
      } else { w=Math.max(8,w); h=Math.max(4,h); }
      // Keep the opposite edge fixed; centre the dimension that was not dragged.
      if(dir.includes('w'))x=st.x+(st.w-w);
      if(dir.includes('n'))y=st.y+(st.h-h);
      if(proportional&&dir.length===1){
        if(dir==='e'||dir==='w')y=st.y+(st.h-h)/2;
        if(dir==='n'||dir==='s')x=st.x+(st.w-w)/2;
      }
      if(!changed && Math.abs(w-st.w)<.5 && Math.abs(h-st.h)<.5)return;
      if(!changed){changed=true;commit(discrete());S.lastDown=null;}
      setGeom(el,b,{x:Math.round(x),y:Math.round(y),w:Math.round(w),h:Math.round(h)});
      applyGeomNode(node,el);
    };
    const move=ev=>{if(ev.pointerId!==e.pointerId)return;ev.preventDefault();queued={clientX:ev.clientX,clientY:ev.clientY,shiftKey:ev.shiftKey};if(!raf)raf=requestAnimationFrame(draw);};
    const detach=()=>{window.removeEventListener('pointermove',move);window.removeEventListener('pointerup',done);window.removeEventListener('pointercancel',cancel);if(raf)cancelAnimationFrame(raf);raf=0;};
    const done=ev=>{if(ev.pointerId!==e.pointerId)return;if(queued){if(raf)cancelAnimationFrame(raf);draw()}detach();if(changed){afterEdit();scheduleSave()}};
    const cancel=ev=>{if(ev.pointerId!==e.pointerId)return;detach();if(changed){for(const key of Object.keys(el))delete el[key];Object.assign(el,clone(snapshot));renderCanvas();renderRight()}};
    window.addEventListener('pointermove',move,{passive:false});
    window.addEventListener('pointerup',done);
    window.addEventListener('pointercancel',cancel);
  };

  /* ---------- Video: preserve source ratio on import + non-cropping default ---------- */
  const originalVideoHTML149 = videoHTML;
  videoHTML = function (el) {
    const html = originalVideoHTML149.apply(this, arguments);
    return html.replace(/<video\b/, `<video data-mz149-video-el="${esc(el.id)}" data-mz149-bp="${S.bp}" style="object-fit:${el.videoFit==='cover'?'cover':'contain'}"`);
  };
  const originalVideoExtra149 = videoExtra;
  videoExtra = function (el) {
    return originalVideoExtra149.apply(this, arguments) + SEL('Video fit','el','videoFit', [['contain','Contain · show full video'],['cover','Cover · crop edges']], {rp:1});
  };
  function probeVideoRatio149(videoId, elementId, bpAtStart=S.bp) {
    const item = videoAsset(videoId); if (!item || !item.data) return;
    const probe = document.createElement('video'); probe.preload='metadata'; probe.muted=true;
    probe.onloadedmetadata = () => {
      const w=probe.videoWidth, h=probe.videoHeight, ratio=w>0&&h>0?w/h:0;
      probe.removeAttribute('src'); probe.load();
      if (!ratio || ratio<.15 || ratio>7) return;
      const f=findEl(elementId); if (!f || f.el.type!=='video' || f.el.videoAsset!==videoId) return;
      const el=f.el, bp=bpAtStart, oldW=effG(el,bp,'w');
      if(el.videoAspect && Math.abs(el.videoAspect-ratio)<.015) return;
      commit(discrete()); el.videoAspect=ratio;
      setGeom(el,bp,{h:Math.max(60,Math.round(oldW/ratio))});
      el.videoFit=el.videoFit||'contain'; renderCanvas(); renderRight(); scheduleSave();
      toast('Rasio video disesuaikan dengan sumber ('+w+' × '+h+')',3500);
    };
    probe.onerror=()=>{try{probe.removeAttribute('src');probe.load()}catch(_){}};
    probe.src=item.data;
  }
  const originalAcImportVideo149 = acImportVideo;
  acImportVideo = async function (file, context='el') {
    const result = await originalAcImportVideo.apply(this, arguments);
    if (context==='el') {
      const selected=T('el'); if (selected && selected.type==='video' && selected.videoAsset===result.id) probeVideoRatio149(result.id, selected.id, S.bp);
    }
    return result;
  };
  const originalVideoPick149 = ACT['video-el-pick'];
  if (originalVideoPick149) ACT['video-el-pick'] = function (button) {
    originalVideoPick149.apply(this, arguments);
    const selected=T('el'); if (selected && selected.type==='video') probeVideoRatio149(selected.videoAsset, selected.id, S.bp);
  };

  /* ---------- Modular Envelope + optional Card + one-page cinematic reveal ---------- */
  function assetOptions149() { return [['','— None —'], ...(S.assets||[]).map(a=>[a.id,a.name||'Image asset'])]; }
  function videoOptions149() { return [['','— No cinematic video —'], ...(S.videos||[]).map(v=>[v.id,v.name||'Video'])]; }
  function groupOptions149() {
    const out=[['','— Select an existing group —']];
    (S.doc.pages||[]).forEach(pg=>(pg.sections||[]).forEach(sec=>walkEls(sec.elements||[],g=>{if(g.type==='group')out.push([g.id,(g.name||'Group')+' · '+(pg.name||'Page')+' / '+(sec.name||'Section')]);})));
    return out;
  }
  function elementOptions149() {
    const out=[['','— Select an existing element —']],allowed=new Set(['image','heading','subtitle','paragraph','caption','shape','icon','divider','button','link']);
    (S.doc.pages||[]).forEach(pg=>(pg.sections||[]).forEach(sec=>walkEls(sec.elements||[],el=>{if(allowed.has(el.type))out.push([el.id,(el.name||el.type)+' · '+(pg.name||'Page')+' / '+(sec.name||'Section')]);})));
    return out;
  }
  function hiddenCardSources149() {
    if(!MZ149.hiddenCardSources||MZ149.hiddenCardSourceDoc!==S.doc||MZ149.hiddenCardSourceDirty){
      const ids=new Set();
      (S.doc.pages||[]).forEach(pg=>(pg.sections||[]).forEach(sec=>walkEls(sec.elements||[],e=>{
        if(e.type!=='envelope'||!e.env)return;
        if(e.env.showCard!==false&&e.env.cardSource==='group'&&e.env.cardGroupId&&e.env.cardGroupHideSource!==false)ids.add(e.env.cardGroupId);
        if(e.env.showCard!==false&&e.env.cardSource==='element'&&e.env.cardElementId&&e.env.cardElementHideSource!==false)ids.add(e.env.cardElementId);
      })));
      MZ149.hiddenCardSources=ids;MZ149.hiddenCardSourceDoc=S.doc;MZ149.hiddenCardSourceDirty=false;
    }
    return MZ149.hiddenCardSources;
  }
  function hideCardSource149(id) { return hiddenCardSources149().has(id); }
  const originalElHTML149=elHTML;
  elHTML=function(el,ctx){if(!MZ149.renderingCardSource&&!ctx?.edit&&el&&hideCardSource149(el.id))return '';return originalElHTML149.apply(this,arguments);};
  const originalEnvelopePanel149 = envelopePanel;
  envelopePanel = function (el) {
    const E=el.env||(el.env=clone(TDEF.envelope.env));
    if(E.showCard===undefined)E.showCard=true;
    if(E.showSkip===undefined)E.showSkip=true;
    if(E.cardSource===undefined)E.cardSource=E.cardAsset?'asset':'text';
    if(E.cardGroupHideSource===undefined)E.cardGroupHideSource=true;
    if(E.cardElementHideSource===undefined)E.cardElementHideSource=true;
    if(!E.assetMode)E.assetMode='layered';
    if(E.cardFit===undefined)E.cardFit='contain';
    if(E.cardWidth===undefined)E.cardWidth=70;
    if(E.cardHeight===undefined)E.cardHeight=63;
    if(E.cinematicLoop===undefined)E.cinematicLoop=false;
    if(E.onePageSequence===undefined)E.onePageSequence=false;
    if(E.cinematicFit===undefined)E.cinematicFit='contain';
    const assetOpts=assetOptions149(),videoOpts=videoOptions149();
    const modular=`<details class="grp mz149-envelope-module" open>
      <summary>Replaceable Envelope & Card · V14.9</summary>
      <p class="hint">Amplop, flap, segel, dan kartu dapat diganti secara independen dari Asset Library. Upload aset melalui Uploads, lalu pilih di sini.</p>
      <button type="button" class="btn sm" data-a="mz149-open-assets" style="width:100%;margin:4px 0 9px">▧ Open Asset Library / Upload assets</button>
      ${SEL('Envelope asset mode','el','env.assetMode',[['layered','Layered · editable flap'],['single','Single artwork · static envelope']],{rp:1})}
      ${E.assetMode==='single'?`${SEL('Full envelope artwork','el','env.modelAsset',assetOpts,{rp:1})}<button type="button" class="btn sm" data-a="mz149-env-upload" data-v="modelAsset" style="width:100%;margin:2px 0 7px">＋ Upload / replace envelope artwork</button>`:`${SEL('Envelope body asset','el','env.bodyAsset',assetOpts,{rp:1})}<button type="button" class="btn sm" data-a="mz149-env-upload" data-v="bodyAsset" style="width:100%;margin:2px 0 7px">＋ Upload / replace body</button>${SEL('Flap asset','el','env.flapAsset',assetOpts,{rp:1})}<button type="button" class="btn sm" data-a="mz149-env-upload" data-v="flapAsset" style="width:100%;margin:2px 0 7px">＋ Upload / replace flap</button>${SEL('Wax seal artwork','el','env.sealAsset',assetOpts,{rp:1})}<button type="button" class="btn sm" data-a="mz149-env-upload" data-v="sealAsset" style="width:100%;margin:2px 0 7px">＋ Upload / replace wax seal</button>`}
      ${CB('Show invitation card','el','env.showCard',{rp:1})}${CB('Show Skip Animation','el','env.showSkip',{rp:1})}
      ${E.showCard?`${SEL('Card content source','el','env.cardSource',[['text','Editable text card'],['asset','Image from Asset Library'],['element','Existing Canvas Element'],['group','Existing Canvas Group']],{rp:1})}${E.cardSource==='asset'?`${SEL('Card artwork','el','env.cardAsset',assetOpts,{rp:1})}<button type="button" class="btn sm" data-a="mz149-env-upload" data-v="cardAsset" style="width:100%;margin:2px 0 7px">＋ Upload / replace card artwork</button>${SEL('Card image fit','el','env.cardFit',[['contain','Contain · show all'],['cover','Cover · crop']],{rp:1})}`:E.cardSource==='group'?`${SEL('Existing Canvas Group','el','env.cardGroupId',groupOptions149(),{rp:1})}${CB('Hide source group on published page','el','env.cardGroupHideSource',{rp:1})}<div class="hint">The group stays editable in the canvas. It is rendered inside the card; hide the source group on the published page to avoid showing it twice.</div>`:E.cardSource==='element'?`${SEL('Existing Canvas Element','el','env.cardElementId',elementOptions149(),{rp:1})}${CB('Hide source element on published page','el','env.cardElementHideSource',{rp:1})}<div class="hint">The element stays editable in the canvas and is rendered as the card content. Its source is hidden on the published page by default.</div>`:'<div class="hint">The card uses the editable title and message fields in Envelope Builder.</div>'}<div class="f2">${N('Card width (%)','el','env.cardWidth',{min:30,max:95})}${N('Card height (%)','el','env.cardHeight',{min:30,max:95})}</div>`:'<p class="hint">Card OFF: amplop tetap terbuka tanpa menampilkan kartu. Animasi amplop tidak berubah.</p>'}
      <hr style="border:0;border-top:1px solid var(--line);margin:10px 0">
      ${CB('Enable one-page cinematic sequence','el','env.onePageSequence',{rp:1})}
      ${SEL('Cinematic reveal video','el','env.cinematicVideo',videoOpts,{rp:1})}
      ${E.cinematicVideo?'<button type="button" class="btn sm" data-a="mz149-env-fit-video" style="width:100%;margin:2px 0 7px">↔ Fit element to video ratio</button>':''}
      <div class="row" style="gap:6px;margin:4px 0 8px"><button type="button" class="btn sm" data-a="mz149-envelope-upload-video">＋ Upload MP4/WebM to Video Library</button></div>
      ${SEL('Cinematic video fit','el','env.cinematicFit',[['contain','Contain · show full video'],['cover','Cover · fill frame']],{rp:1})}
      ${CB('Loop cinematic video','el','env.cinematicLoop',{rp:1})}
      <p class="hint">One-page mode keeps the envelope, reveal video, and invitation sections in the same page. After the envelope opens, the video plays in this element. When it ends, its final frame remains visible. Place your other invitation sections below this element.</p>
    </details>`;
    const legacy=originalEnvelopePanel149.apply(this,arguments).replace('Envelope texture','Shared envelope texture (fallback)').replace('Paper texture','Card paper texture');
    return modular + legacy;
  };

  const originalEnvelopeHTML149 = envelopeHTML;
  envelopeHTML = function (el, edit) {
    const E=el.env||{};
    const bodyId=E.bodyAsset||E.coverAsset||'';
    const flapId=E.flapAsset||E.coverAsset||'';
    const modelId=E.modelAsset||bodyId;
    const bodySrc=assetSrc(bodyId), flapSrc=assetSrc(flapId), modelSrc=assetSrc(modelId), paperSrc=assetSrc(E.paperAsset), sealSrc=assetSrc(E.sealAsset), cardSrc=assetSrc(E.cardAsset);
    const body=esc(E.body||'#711e37'), flap=esc(E.flap||'#8c304a'), pc=esc(E.paper||'#fff8ec'), ink=esc(E.ink||'#634735'), seal=esc(E.seal||'#b88a51');
    const single=E.assetMode==='single'&&!!modelSrc;
    const showCard=E.showCard!==false;
    const paperStyle=paperSrc?`background-image:url('${esc(paperSrc)}');background-size:cover;background-position:center;`:'';
    const bodyStyle=bodySrc?`background-image:url('${esc(bodySrc)}');background-size:cover;background-position:center;`:'';
    const flapStyle=flapSrc?`background-image:url('${esc(flapSrc)}');background-size:cover;background-position:center;`:'';
    const modelStyle=single?`background-image:url('${esc(modelSrc)}');background-size:contain;background-repeat:no-repeat;background-position:center;`:'';
    const cardSource=E.cardSource||(E.cardAsset?'asset':'text');
    const cardGroupFound=cardSource==='group'&&E.cardGroupId?findEl(E.cardGroupId):null;
    const cardGroup=cardGroupFound&&cardGroupFound.el?.type==='group'?cardGroupFound.el:null;
    let cardGroupMarkup='';
    if(cardGroup){
      const gw=Math.max(1,Number(cardGroup.gw)||1),gh=Math.max(1,Number(cardGroup.gh)||1);
      const envW=Math.max(1,Number(effG(el,S.bp,'w'))||Number(el.w)||500),envH=Math.max(1,Number(effG(el,S.bp,'h'))||Number(el.h)||360);
      const cardW=envW*clamp149(E.cardWidth??70,30,95)/100,cardH=envH*clamp149(E.cardHeight??63,30,95)/100;
      const scale=Math.min(cardW/gw,cardH/gh),left=(cardW-gw*scale)/2,top=(cardH-gh*scale)/2;
      const groupStyle=`--mz-card-src-w:${gw}px;--mz-card-src-h:${gh}px;--mz-card-src-scale:${scale};--mz-card-src-left:${left}px;--mz-card-src-top:${top}px`;
      MZ149.renderingCardSource=true;try{cardGroupMarkup=`<div class="env-card-group el group" style="${groupStyle}" aria-hidden="true">${groupHTML(cardGroup,{edit:false})}</div>`;}finally{MZ149.renderingCardSource=false;}
    }
    const cardElementFound=cardSource==='element'&&E.cardElementId?findEl(E.cardElementId):null;
    const cardElement=cardElementFound&&cardElementFound.el&&!['group','envelope','video','form','embed','container','gallery','carousel'].includes(cardElementFound.el.type)?cardElementFound.el:null;
    let cardElementMarkup='';
    if(cardElement){
      const source=clone(cardElement),gw=Math.max(1,Number(source.w)||1),gh=Math.max(1,Number(source.h)||1);
      source.x=0;source.y=0;source.w=gw;source.h=gh;source.rot=0;source.locked=false;source.ix=[];source.link=null;
      const pseudo={id:'mz149-card-source',gw,gh,children:[source],mask:false};
      const envW=Math.max(1,Number(effG(el,S.bp,'w'))||Number(el.w)||500),envH=Math.max(1,Number(effG(el,S.bp,'h'))||Number(el.h)||360);
      const cardW=envW*clamp149(E.cardWidth??70,30,95)/100,cardH=envH*clamp149(E.cardHeight??63,30,95)/100;
      const scale=Math.min(cardW/gw,cardH/gh),left=(cardW-gw*scale)/2,top=(cardH-gh*scale)/2;
      const groupStyle=`--mz-card-src-w:${gw}px;--mz-card-src-h:${gh}px;--mz-card-src-scale:${scale};--mz-card-src-left:${left}px;--mz-card-src-top:${top}px`;
      MZ149.renderingCardSource=true;try{cardElementMarkup=`<div class="env-card-group el group" style="${groupStyle}" aria-hidden="true">${groupHTML(pseudo,{edit:false})}</div>`;}finally{MZ149.renderingCardSource=false;}
    }
    const cardMarkup=showCard?(cardSource==='group'&&cardGroupMarkup?cardGroupMarkup:cardSource==='element'&&cardElementMarkup?cardElementMarkup:cardSource==='asset'&&cardSrc?`<img class="env-card-art" src="${esc(cardSrc)}" alt="Invitation card" draggable="false">`:`<div class="env-letter-top">${esc(E.title||'You are invited')}</div><div class="env-letter-body">${esc(E.message||'Open our invitation')}</div>`):'';
    const letterClass=(cardSource==='group'&&cardGroupMarkup)||(cardSource==='element'&&cardElementMarkup)?'env-letter env-letter-group':'env-letter';
    const videoSrc149=E.cinematicVideo?vidSrc(E.cinematicVideo):'';
    const onePage=!!E.onePageSequence;
    const advance=onePage?'none':(E.advance||'none');
    const videoStage=onePage&&videoSrc149?`<div class="env-cinema-stage" aria-hidden="true"><video playsinline muted preload="metadata" ${E.cinematicLoop?'loop':''} style="object-fit:${E.cinematicFit==='cover'?'cover':'contain'}"><source src="${esc(videoSrc149)}"></video><button type="button" class="env-cinema-play">Tap to play cinematic</button></div>`:'';
    const cls=`env-widget env-${esc(E.style||'classic')} seal-${esc(E.sealShape||'circle')}${single?' env-single':''}`;
    const duration=Math.max(350,Number(E.openMs)||1100);
    const style=`--env-body:${body};--env-flap:${flap};--env-paper:${pc};--env-ink:${ink};--env-seal:${seal};--env-paper-radius:${Math.max(0,Number(E.paperCorners)||0)}px;--env-font:${E.font==='sans'?'Arial,sans-serif':E.font==='script'?'cursive':'Georgia,serif'};--env-card-w:${clamp149(E.cardWidth??70,30,95)}%;--env-card-h:${clamp149(E.cardHeight??63,30,95)}%;--env-card-fit:${E.cardFit==='cover'?'cover':'contain'};--env-cinema-fit:${E.cinematicFit==='cover'?'cover':'contain'};${modelStyle}`;
    return `<div class="${cls}" data-envelope="1" data-env-next="${esc((S.doc.pages.find(p=>p.id===E.nextPage)||{}).slug||'')}" data-env-advance="${advance}" data-env-ms="${duration}" data-env-cinematic="${videoStage?'1':'0'}" data-env-loop="${E.cinematicLoop?'1':'0'}" ${!edit?'role="button" tabindex="0" aria-label="Open invitation envelope"':''} style="${style}">
      ${showCard?`<div class="${letterClass}" style="${paperStyle}">${cardMarkup}</div>`:''}
      ${single?'':`<div class="env-back" style="${bodyStyle}"></div><div class="env-pocket" style="${bodyStyle}"></div><div class="env-flap" style="${flapStyle}"></div><div class="env-seal">${sealSrc?`<img src="${esc(sealSrc)}" alt="Wax seal" draggable="false">`:esc(E.sealText||'♥')}</div>`}
      ${videoStage}
      ${!edit&&E.showSkip!==false?'<button type="button" class="env-skip" aria-label="Skip envelope animation">Skip animation</button>':''}
      ${edit?'<span class="env-edit-label">✉ Select to edit · Preview to test opening</span>':''}
    </div>`;
  };

  /* Keep the old preview button, but make Reset clear the video state as well. */
  const originalEnvelopeReset149=ACT['envelope-reset'];
  ACT['envelope-reset']=function () {
    const el=T('el'); if(el&&el.type==='envelope'){
      const n=$(`#frame .e-${el.id} .env-widget`);
      if(n){if(n._mz149CinemaTimer)clearTimeout(n._mz149CinemaTimer);n._mz149CinemaTimer=null;n.classList.remove('opened','env-cinema-playing');const v=n.querySelector('.env-cinema-stage video');if(v){v.pause();try{v.currentTime=0}catch(_){}}delete n.dataset.mz149CinemaStarted;const stage=n.querySelector('.env-cinema-stage');stage?.classList.remove('needs-play');}
      return;
    }
    return originalEnvelopeReset149?.apply(this,arguments);
  };
  ACT['mz149-open-assets']=()=>{S.tab='uploads';S.leftOpen=true;S.sheet='left';renderRail();renderLeft();layoutPanels();toast('Pilih atau upload aset di Asset Library, lalu kembali ke Envelope properties.');};
  ACT['mz149-env-upload']=b=>{const key=String(b?.dataset?.v||'');if(!['modelAsset','bodyAsset','flapAsset','sealAsset','cardAsset'].includes(key))return;pickFile('mz149-env:'+key);};
  ACT['mz149-envelope-upload-video']=()=>{S.uploadVideoCtx='library';pickVideo('library');};
  ACT['mz149-env-fit-video']=()=>{
    const el=T('el');if(!el||el.type!=='envelope'||!el.env?.cinematicVideo){toast('Pilih video cinematic terlebih dahulu');return;}
    const item=videoAsset(el.env.cinematicVideo);if(!item?.data){toast('Video tidak tersedia di Video Library');return;}
    const bp=S.bp,elementId=el.id,probe=document.createElement('video');probe.preload='metadata';probe.muted=true;
    probe.onloadedmetadata=()=>{const ratio=(probe.videoWidth||0)/Math.max(1,probe.videoHeight||0);probe.removeAttribute('src');probe.load();const found=findEl(elementId);if(!found||found.el.type!=='envelope'||!ratio||ratio<.15||ratio>7)return;const width=effG(found.el,bp,'w');commit(discrete());found.el.env.cinematicAspect=ratio;setGeom(found.el,bp,{h:Math.max(100,Math.round(width/ratio))});ensureEnvelopeSectionHeight149(found.el);renderCanvas();renderRight();scheduleSave();toast('Ukuran opening dan section disesuaikan dengan rasio video.');};
    probe.onerror=()=>toast('Metadata video tidak dapat dibaca.');probe.src=item.data;
  };

  function startEnvelopeVideo149(env) {
    if(!env || env.dataset.mz149CinemaStarted==='1') return;
    const stage=env.querySelector('.env-cinema-stage'), video=stage&&stage.querySelector('video');
    if(!stage||!video)return;
    env.dataset.mz149CinemaStarted='1';
    const delay=env.classList.contains('env-skip-now')?0:Math.max(0,Math.round((Number(env.dataset.envMs)||1100)*1.4));
    env._mz149CinemaTimer=setTimeout(()=>{
      env._mz149CinemaTimer=null;
      if(!env.isConnected||!env.classList.contains('opened'))return;
      env.classList.add('env-cinema-playing');
      video.muted=true;video.loop=env.dataset.envLoop==='1';
      const play=video.play();
      if(play&&typeof play.catch==='function')play.catch(()=>stage.classList.add('needs-play'));
    },delay);
  }
  function installEnvelopeRuntime149(root=document) {
    const scan=()=>root.querySelectorAll('.env-widget.opened[data-env-cinematic="1"]').forEach(startEnvelopeVideo149);
    scan();
    if(root.__mz149EnvelopeObserver)return;
    if('MutationObserver' in window){
      const observer=new MutationObserver(mutations=>{
        for(const m of mutations){if(m.type==='attributes'&&m.target.matches?.('.env-widget')){scan();break;}}
      });
      observer.observe(root===document?document.documentElement:root,{subtree:true,attributes:true,attributeFilter:['class']});
      root.__mz149EnvelopeObserver=observer;
    }
    root.addEventListener('click',e=>{
      const skip=e.target.closest&&e.target.closest('.env-skip');if(skip){const env=skip.closest('.env-widget');if(env){e.preventDefault();e.stopImmediatePropagation();env.classList.add('env-skip-now','opened');env.setAttribute('aria-label','Invitation opened');}return;}
      const button=e.target.closest&&e.target.closest('.env-cinema-play');if(!button)return;
      const stage=button.closest('.env-cinema-stage'),video=stage&&stage.querySelector('video');if(!video)return;
      video.play().then(()=>stage.classList.remove('needs-play')).catch(()=>stage.classList.add('needs-play'));
    },true);
  }
  document.addEventListener('loadedmetadata', e => {
    const video=e.target;
    if(!video || !video.matches || !video.matches('video[data-mz149-video-el]')) return;
    const ratio=(video.videoWidth||0)/Math.max(1,video.videoHeight||0);
    if(!ratio || ratio<.15 || ratio>7 || video.dataset.mz149RatioApplied==='1') return;
    const id=video.dataset.mz149VideoEl, found=findEl(id);
    if(!found || found.el.type!=='video') return;
    const el=found.el;
    if(el.videoAspect && Math.abs(el.videoAspect-ratio)<.015){video.dataset.mz149RatioApplied='1';return;}
    video.dataset.mz149RatioApplied='1';
    const bp=video.dataset.mz149Bp||S.bp, width=effG(el,bp,'w');
    commit(discrete());el.videoAspect=ratio;setGeom(el,bp,{h:Math.max(60,Math.round(width/ratio))});
    renderCanvas();renderRight();scheduleSave();
  }, true);
  installEnvelopeRuntime149(document);

  /* Add the same envelope runtime/styles to every generated website and preview. */
  function mozaV149PublicRuntime(){
    (function(){
      function start(env){
        if(!env||env.getAttribute('data-mz149-started')==='1')return;
        var stage=env.querySelector('.env-cinema-stage'),video=stage&&stage.querySelector('video');if(!stage||!video)return;
        env.setAttribute('data-mz149-started','1');
        var delay=env.classList.contains('env-skip-now')?0:Math.max(0,Math.round((parseInt(env.getAttribute('data-env-ms'),10)||1100)*1.4));
        setTimeout(function(){
          if(!document.documentElement.contains(env))return;
          env.classList.add('env-cinema-playing');video.muted=true;video.loop=env.getAttribute('data-env-loop')==='1';
          var p=video.play();if(p&&p.catch)p.catch(function(){stage.classList.add('needs-play')});
        },delay);
      }
      function scan(){var nodes=document.querySelectorAll('.env-widget.opened[data-env-cinematic="1"]');for(var i=0;i<nodes.length;i++)start(nodes[i]);}
      if(window.MutationObserver){var ob=new MutationObserver(function(ms){for(var j=0;j<ms.length;j++){if(ms[j].type==='attributes'&&ms[j].target.matches&&ms[j].target.matches('.env-widget')){scan();break;}}});ob.observe(document.documentElement,{subtree:true,attributes:true,attributeFilter:['class']});}
      scan();
      document.addEventListener('click',function(e){var skip=e.target&&e.target.closest&&e.target.closest('.env-skip');if(skip){var env=skip.closest('.env-widget');if(env){e.preventDefault();e.stopImmediatePropagation();env.classList.add('env-skip-now','opened');env.setAttribute('aria-label','Invitation opened');var stage=env.querySelector('.env-cinema-stage'),video=stage&&stage.querySelector('video');if(stage&&video){env.setAttribute('data-mz149-started','1');env.classList.add('env-cinema-playing');video.muted=true;video.loop=env.getAttribute('data-env-loop')==='1';var started=video.play();if(started&&started.catch)started.catch(function(){stage.classList.add('needs-play')});}}return;}var b=e.target&&e.target.closest&&e.target.closest('.env-cinema-play');if(!b)return;var s=b.closest('.env-cinema-stage'),v=s&&s.querySelector('video');if(!v)return;var p=v.play();if(p&&p.then)p.then(function(){s.classList.remove('needs-play')}).catch(function(){s.classList.add('needs-play')})},true);
    })();
  }
  const originalSiteHTML149=siteHTML;
  siteHTML=function () {
    let html=originalSiteHTML149.apply(this,arguments);
    const css=window.MOZA_V149_CSS||'';
    if(css && !html.includes('moza-v149-envelope-styles'))html=html.replace('</head>',`<style id="moza-v149-envelope-styles">${css}</style></head>`);
    html=html.replace("var env=e.target.closest&&e.target.closest('.env-widget');if(env&&readable(env)){","if(e.target.closest&&e.target.closest('.env-cinema-play'))return;if(e.target.closest&&e.target.closest('.env-skip'))return;var env=e.target.closest&&e.target.closest('.env-widget');if(env&&readable(env)){");
    if(!html.includes('mozaV149PublicRuntime'))html=html.replace('</body>',`<script>(${mozaV149PublicRuntime.toString()})();<\/script></body>`);
    return html;
  };

  /* ---------- Permanent section delete (hide remains a separate responsive setting) ---------- */
  const originalSecPanel149=secPanel;
  secPanel=function(){return originalSecPanel149.apply(this,arguments).replace('<div class="hint" style="margin-top:6px">Hide section on:', '<div class="hint" style="margin:8px 0;padding:8px;border-radius:8px;background:#fff7ed;color:#8a4b12">Delete permanently removes this section from the project. Use the device checkboxes below only when you want to hide it on selected screen sizes.</div><div class="hint" style="margin-top:6px">Hide section on:').replace('title="Delete">✕</button>', 'title="Delete section permanently">✕</button>')};
  const originalSecHTML149=secHTML;
  secHTML=function(){return originalSecHTML149.apply(this,arguments).replace(/title="Delete section"/g,'title="Delete section permanently"').replace(/aria-label="Delete section"/g,'aria-label="Delete section permanently"')};
  ACT['sec-del']=function (button) {
    if(S.editing)finishEdit();
    const id=button?.dataset?.sid || (S.sel?.k==='sec'?S.sel.id:null);
    const info=secInfo(id); if(!info)return;
    if(info.page.sections.length<2){toast('A page needs at least one section');return;}
    const name=info.sec.name||'Section';
    if(!confirm(`Hapus section "${name}" secara permanen?\n\nSemua elemen di dalamnya ikut dihapus dari struktur project. Aksi dapat dipulihkan dengan Undo.`))return;
    const removedElementIds=new Set();
    walkEls(info.sec.elements||[],element=>removedElementIds.add(element.id));
    commit(discrete());
    info.page.sections.splice(info.i,1);
    MZ149.hiddenCardSourceDirty=true;
    const targetPage=info.page.id;
    const clearLink=link=>{if(link&&link.t==='section'&&link.v===id){link.t='page';link.v=targetPage;link.nt=false;}};
    const walkNav=nav=>{if(!nav)return;const walk=items=>(items||[]).forEach(item=>{clearLink(item.link);walk(item.children)});walk(nav.items)};
    walkNav(S.doc.nav);(S.doc.pages||[]).forEach(pg=>{walkNav(pg.nav);(pg.sections||[]).forEach(sec=>walkEls(sec.elements,e=>{
      clearLink(e.link);
      if(e.type==='envelope'&&e.env){
        if(e.env.cardSource==='group'&&removedElementIds.has(e.env.cardGroupId)){e.env.cardGroupId='';e.env.cardSource='text';}
        if(e.env.cardSource==='element'&&removedElementIds.has(e.env.cardElementId)){e.env.cardElementId='';e.env.cardSource='text';}
      }
    }))});
    S.sel=null;S.multi=[];S.inGroup=null;S.pathEdit=null;S.pathSel=null;
    renderCanvas();renderRight();if(['layers','pages'].includes(S.tab))renderLeft();renderStatus();scheduleSave();
    toast('Section "'+name+'" benar-benar dihapus. Undo tersedia.',4200);
  };

  /* ---------- Export/runtime CSS and UI boot ---------- */
  const styleText=`
  /* V14.9 mobile canvas navigation */
  @media(max-width:760px){
    #viewport{touch-action:none!important;overscroll-behavior:contain!important;-webkit-overflow-scrolling:touch;}
    #frame .el.lock,#frame .el.lock *{touch-action:none!important;cursor:grab!important;}
    body.m-sheet-open #mz149-zoom-controls{display:none!important}
    #mz149-zoom-controls{position:absolute;right:10px;bottom:78px;z-index:42;display:flex;align-items:center;gap:3px;padding:4px;background:rgba(255,255,255,.96);border:1px solid #d9dfeb;border-radius:999px;box-shadow:0 5px 18px rgba(24,35,60,.16);backdrop-filter:blur(10px)}
    #mz149-zoom-controls button{height:34px;min-width:34px;border:0;border-radius:999px;background:#f1f4fb;color:#24314b;font-weight:800;font-size:17px;padding:0 9px;touch-action:manipulation}
    #mz149-zoom-controls button[data-a="mz149-zoom-fit"]{font-size:11px;min-width:38px}
    #mz149-zoom-controls output{min-width:39px;text-align:center;font-size:10px;font-weight:800;color:#53617a;font-variant-numeric:tabular-nums}
  }
  @media(min-width:761px){#mz149-zoom-controls{display:none!important}}
  /* Image/video resize is aspect-locked by default; Shift temporarily unlocks it. */
  #frame.edit .el.selected:not(.lock)>.h{touch-action:none}
  .env-widget.env-single{background-repeat:no-repeat;background-position:center;background-size:contain;}
  .env-skip{position:absolute;right:10px;bottom:10px;z-index:20;border:1px solid #ffffff88;border-radius:999px;background:#ffffffdf;color:#252a33;padding:7px 12px;font:600 11px system-ui;box-shadow:0 3px 12px #0003;cursor:pointer;}
  .env-widget.opened .env-skip{display:none;}
  .env-widget.env-skip-now .env-flap,.env-widget.env-skip-now .env-letter,.env-widget.env-skip-now .env-seal{transition-duration:.01ms!important;}
  .env-widget.env-single .env-letter{opacity:0;transition:opacity .35s ease,translate var(--env-duration,1.1s) cubic-bezier(.19,.8,.3,1),scale var(--env-duration,1.1s) ease;}
  .env-widget.env-single.opened .env-letter{opacity:1;}
  .env-widget.env-single .env-back,.env-widget.env-single .env-pocket,.env-widget.env-single .env-flap,.env-widget.env-single .env-seal{display:none!important}
  .env-widget .env-letter{width:var(--env-card-w,70%);height:var(--env-card-h,63%);left:calc((100% - var(--env-card-w,70%))/2);}
  .env-widget .env-letter-group{display:block;padding:0;overflow:hidden;}
  .env-widget .env-letter-group .env-card-group{position:absolute;inset:0;width:100%;height:100%;overflow:hidden;pointer-events:none;}
  .env-widget .env-letter-group .env-card-group .gcl{position:absolute;left:var(--mz-card-src-left,0px);top:var(--mz-card-src-top,0px);width:var(--mz-card-src-w,100%);height:var(--mz-card-src-h,100%);transform:scale(var(--mz-card-src-scale,1));transform-origin:top left;}
  .env-widget .env-letter-group .env-card-group .el{pointer-events:none!important;}
  .env-widget .env-card-art{display:block;width:100%;height:100%;object-fit:var(--env-card-fit,contain);object-position:center;border:0;pointer-events:none;}
  .env-widget .env-seal img{display:block;width:100%;height:100%;object-fit:contain;border-radius:inherit;}
  .env-cinema-stage{position:absolute;inset:0;z-index:12;overflow:hidden;background:#08090d;opacity:0;visibility:hidden;pointer-events:none;transition:opacity .55s ease,visibility 0s linear .55s;}
  .env-widget.env-cinema-playing .env-cinema-stage{opacity:1;visibility:visible;transition:opacity .55s ease;}
  .env-cinema-stage video{display:block;width:100%;height:100%;object-fit:var(--env-cinema-fit,contain);background:#08090d;}
  .env-cinema-play{display:none;position:absolute;left:50%;bottom:max(14px,env(safe-area-inset-bottom));transform:translateX(-50%);border:1px solid #ffffff88;border-radius:999px;background:#fff;color:#222;padding:10px 16px;font:600 13px system-ui;box-shadow:0 4px 18px #0005;pointer-events:auto;}
  .env-cinema-stage.needs-play .env-cinema-play{display:block;}
  @media(prefers-reduced-motion:reduce){.env-cinema-stage,.env-widget .env-letter,.env-widget .env-flap{transition-duration:.01ms!important}}
  `;
  window.MOZA_V149_CSS=styleText;
  const style=document.createElement('style');style.id='moza-v149-revision-styles';style.textContent=styleText;document.head.appendChild(style);

  function boot149(){
    installMobileCanvasGestures149();installMobileZoomControls149();
    const frame=$149('#frame');if(frame&&!frame.dataset.mz149Ready)frame.dataset.mz149Ready='1';
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot149,{once:true});else boot149();
  window.addEventListener('resize',()=>{installMobileCanvasGestures149();installMobileZoomControls149()},{passive:true});
  window.__MOZA_V149_STATUS__={version:'14.9.1',features:['mobile-scroll-locked-elements','custom-pinch-zoom','mobile-zoom-controls','proportional-image-video-resize','video-source-aspect-detection','permanent-section-delete','modular-envelope-assets','optional-card','one-page-cinematic-video','persistent-final-frame','carousel-vertical-continuous','digital-haus-frame-shape','continuous-motion-linear-loops','faq-custom-content-blocks','faq-copy-to-clipboard','faq-uploaded-and-github-fonts','countdown-github-fonts']};
})();
