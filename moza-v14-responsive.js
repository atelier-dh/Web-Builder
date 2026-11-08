/* Moza Studio V14 — opt-in responsive diagnostics and repair.
 * Never overwrites Desktop geometry or changes RSVP/auth/storage internals.
 */
(function(){'use strict';
if(window.MozaV14Responsive)return;
const valid=()=>typeof S!=='undefined'&&S.mode==='design'&&S.doc?.pages;
const active=()=>valid()&&S.sel?.k==='el'?T('el'):null;
const escapeHtml=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const page=()=>valid()?curPage():null;
const wh={t:768,m:375};
const margin={t:28,m:14};
const hasWidget=e=>!!(e?.mozaSmartFilter||e?.mozaWidget);
function geometry(e,b){return {x:effG(e,b,'x'),y:effG(e,b,'y'),w:effG(e,b,'w'),h:effG(e,b,'h')}}
function suggestedHeight(el,b,width){
 if(el.mozaWidget)return el.mozaWidget.kind==='tabs'?Math.max(310,geometry(el,b).h):Math.max(340,(el.mozaWidget.items?.length||3)*76+80);
 if(el.mozaSmartFilter){
  const cfg=el.mozaSmartFilter,items=(cfg.items||[]).length;
  const cols=b==='m'?(cfg.columnsMobile||1):(cfg.columnsTablet||2);
  const gap=Number(cfg.gap)||12,rows=Math.ceil(Math.min(items,cfg.pagination?(cfg.pageSize||6):items)/Math.max(1,cols));
  const ratio=String(cfg.imageRatio||'3/4').split('/').map(Number),imgRatio=ratio.length===2&&ratio[0]>0?ratio[1]/ratio[0]:1.33;
  const cardW=(width-(Math.max(1,cols)-1)*gap)/Math.max(1,cols);
  const media=cfg.showImages===false?0:cardW*imgRatio;
  const rowH=clamp(media+185,195,770);
  return Math.round(clamp(160+rows*(rowH+gap)+(cfg.pagination?65:0),220,5200));
 }
 return Math.max(180,geometry(el,b).h);
}
function proposed(el,b){
 const g=geometry(el,b),W=wh[b],pad=margin[b];
 const w=hasWidget(el)?W-pad*2:Math.min(Math.max(1,g.w),W-pad*2);
 const x=hasWidget(el)?pad:clamp(g.x,pad,W-pad-w);
 const y=Math.max(pad,g.y),h=hasWidget(el)?suggestedHeight(el,b,w):g.h;
 return {x:Math.round(x),y:Math.round(y),w:Math.round(w),h:Math.round(h)};
}
function fitSelected({silent=false}={}){
 const el=active();if(!el||el.locked)return false;
 const f=findEl(el.id);if(!f)return false;
 const changes=['t','m'].map(b=>[b,proposed(el,b)]);
 if(!changes.some(([b,p])=>Object.keys(p).some(k=>effG(el,b,k)!==p[k])))return true;
 commit(discrete());
 changes.forEach(([b,g])=>{
  const h=secH(f.sec,b);setGeom(el,b,g);
  if(hasWidget(el)&&g.y+g.h+24>h){f.sec.hb=f.sec.hb||{};f.sec.hb[b]=Math.min(8500,Math.max(h,g.y+g.h+24));}
 });
 afterEdit();if(!silent)toast('Tablet and mobile overrides updated. Check Preview before publishing.');
 return true;
}
function audit(){
 if(!valid())return [];
 const issues=[],pg=page();
 for(const b of ['t','m']){
  const W=wh[b];
  for(const sec of pg.sections||[]){if(sec.kind==='overlay')continue;
   const H=secH(sec,b);
   for(const e of sec.elements||[]){if(e.hideOn?.[b])continue;
    const g=geometry(e,b);
    if(g.x<-1||g.x+g.w>W+1)issues.push({b,sec:sec.name||sec.id,name:e.name||e.type,reason:'Horizontal overflow',id:e.id});
    if(g.y<-1||g.y+g.h>H+1)issues.push({b,sec:sec.name||sec.id,name:e.name||e.type,reason:'Outside section height',id:e.id});
    if(e.type==='text'&&effG(e,b,'fs')<12)issues.push({b,sec:sec.name||sec.id,name:e.name||e.type,reason:'Small text',id:e.id});
    if(hasWidget(e)&&(g.w<W*.47||g.h<180))issues.push({b,sec:sec.name||sec.id,name:e.name||e.type,reason:'Widget may be too small',id:e.id});
   }
  }
 }
 return issues;
}
function reportModal(){
 if(!valid())return;
 const issues=audit(),rows=issues.slice(0,70).map(x=>`<tr><td>${x.b==='m'?'Mobile':'Tablet'}</td><td>${escapeHtml(x.sec)}</td><td>${escapeHtml(x.name)}</td><td>${escapeHtml(x.reason)}</td></tr>`).join('');
 showModal(`<div class="mz14-audit"><h2>Responsive Audit</h2><p>This is a layout diagnostic, not a guarantee of a pixel-perfect website. Mobile & Tablet are separate 375px/768px layouts.</p><p><b>${issues.length} potential issue(s)</b> in the current page.</p><div class="mz14-audit-table"><table><thead><tr><th>Device</th><th>Section</th><th>Element</th><th>Finding</th></tr></thead><tbody>${rows||'<tr><td colspan="4">No obvious bounds issues detected.</td></tr>'}</tbody></table></div>${issues.length>70?'<p>Showing first 70 findings.</p>':''}<div class="mz14-actions"><button data-a="mz14-fix-page">Fit overflowing elements</button><button data-a="mz14-modal-close">Close</button></div><p class="hint">Changes are explicit, undoable, and affect only Tablet/Mobile geometry. Verify every layout in Preview.</p></div>`);
}
function fixPage(){
 const pg=page();if(!pg)return;
 const updates=[];
 for(const b of ['t','m']){
  const W=wh[b],pad=margin[b];
  for(const sec of pg.sections||[]){if(sec.kind==='overlay')continue;
   for(const el of sec.elements||[]){if(el.locked||el.hideOn?.[b])continue;
    const g=geometry(el,b);
    if(!(g.x<0||g.x+g.w>W||g.w>W-2*pad||g.y<0))continue;
    const w=clamp(g.w,1,W-pad*2);
    updates.push({el,b,geometry:{x:clamp(g.x,pad,W-pad-w),y:Math.max(pad,g.y),w}});
   }
  }
 }
 if(!updates.length){toast('No overflowing elements to fit.');return;}
 if(!confirm('Adjust '+updates.length+' Mobile/Tablet geometry override(s)? Desktop stays unchanged, Undo is available.'))return;
 commit(discrete());updates.forEach(({el,b,geometry:g})=>setGeom(el,b,g));afterEdit();closeModal();toast('Fit '+updates.length+' elements. Review Mobile and Tablet in Preview.');
}
function fitMobileSelected({silent=false}={}){
 const el=active();if(!el||el.locked)return false;
 const found=findEl(el.id);if(!found)return false;
 const bp='m',W=wh.m,pad=margin.m,w=W-pad*2,g=geometry(el,bp);
 commit(discrete());
 let h=g.h;
 // Responsive widgets need an internal reflow as well as a narrower outer box.
 // Visual Smart Filter defaults to a single column on narrow phones.
 if(el.mozaSmartFilter&&window.MozaVisualFilter?.normalize&&window.MozaVisualFilter?.buildWidget){
  const cfg=window.MozaVisualFilter.normalize(el.mozaSmartFilter);
  cfg.columnsMobile=1;
  cfg.mobileCardMaxWidth=0;
  el.mozaSmartFilter=window.MozaVisualFilter.normalize(cfg);
  el.embedCode=window.MozaVisualFilter.buildWidget(el.mozaSmartFilter);
  el.embedKind='widget';el.embedLive=true;
  h=suggestedHeight(el,bp,w);
 }else if(el.mozaWidget){
  h=suggestedHeight(el,bp,w);
 }else if(['image','video'].includes(String(el.type||'').toLowerCase())&&g.w>0){
  h=Math.max(60,Math.round(g.h*w/g.w));
 }
 const next={x:pad,y:Math.max(pad,g.y),w,h:Math.round(h)};
 setGeom(el,bp,next);
 const sectionHeight=secH(found.sec,bp);
 if(next.y+next.h+24>sectionHeight){found.sec.hb=found.sec.hb||{};found.sec.hb[bp]=Math.min(8500,Math.max(sectionHeight,next.y+next.h+24));}
 afterEdit();
 if(!silent)toast(el.mozaSmartFilter?'Mobile fit applied: one-column cards and full-width widget.':'Mobile width fitted. Review text and spacing in Preview.');
 return true;
}
const previousRight=renderRight;
renderRight=function(...args){const result=previousRight.apply(this,args);const el=active(),panel=document.querySelector('#right');if(el&&panel&&!panel.querySelector('.mz14-responsive-panel'))panel.insertAdjacentHTML('beforeend',`<section class="mz14-responsive-panel"><h4>▤ Tablet & Mobile Fit</h4><p>Fit one selected element, or reapply Responsive Sync to every page. Project-wide Auto Fit clears Mobile-only geometry overrides; Desktop and Tablet stay unchanged.</p><div class="mz14-actions"><button type="button" data-a="mz14-fit-mobile">Fit selected Mobile</button><button type="button" data-a="mz14-fit-widget">Fit selected Tablet + Mobile</button><button type="button" data-a="rs-refit-mobile">Auto Sync all Mobile pages</button><button type="button" data-a="mz14-responsive-check">Audit page</button></div></section>`);return result};
ACT['mz14-fit-mobile']=()=>fitMobileSelected();
ACT['mz14-fit-widget']=()=>fitSelected();
ACT['mz14-responsive-check']=reportModal;
ACT['mz14-fix-page']=fixPage;
ACT['mz14-modal-close']=()=>closeModal();
window.MozaV14Responsive={version:'14.8.13',fitSelected,fitMobileSelected,audit,proposed};
try{if(valid())renderRight()}catch(e){console.warn('Responsive panel not ready',e)}
})();
