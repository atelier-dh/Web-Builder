/* Moza Studio v14.8.3 — Tablet/Mobile Fast Canvas and bounded Properties pickers.
   Editor only. Does not modify projects, original assets, export HTML, Preview, B2, RSVP, or cloud. */
(function(){
 'use strict';
 if(window.MozaMobilePerformanceV1483 || typeof renderCanvas !== 'function' || typeof renderRight !== 'function')return;
 const previousCanvas=renderCanvas;
 const previousRight=renderRight;
 const supportsContain=typeof CSS!=='undefined' && CSS.supports?.('content-visibility','auto');
 const frame=()=>document.getElementById('frame');
 const isFast=()=>!!window.MozaTouchPerformance?.enabled?.();
 let measured=0;
 function optimizeSections(){
  const host=frame();
  if(!host)return;
  if(!isFast()||!supportsContain){return;}
  // The section's intrinsic height mirrors the responsive engine (not a guessed value).
  // This lets the browser skip offscreen paint/layout without collapsing page height.
  const p=typeof curPage==='function'?curPage():null;
  const sections=p?.sections||[];
  const elements=host.querySelectorAll('.pg > .sec');
  const selectedSection=S.sel?.k==='sec'?S.sel.id:
    S.sel?.k==='el' && typeof findEl==='function'?findEl(S.sel.id)?.sec?.id:null;
  for(const node of elements){
   const sec=sections.find(s=>s.id===node.dataset.sec);
   if(!sec || sec.kind==='overlay' || sec.id===selectedSection){
    node.style.contentVisibility='visible';node.style.removeProperty('contain-intrinsic-size');
    continue;
   }
   const inner=typeof secH==='function'?secH(sec,S.bp):500;
   const height=Math.max(100,Math.ceil(inner+(Number(sec.padT)||0)+(Number(sec.padB)||0)));
   node.style.containIntrinsicSize='auto '+height+'px';
   node.style.contentVisibility='auto';
  }
  measured=elements.length;
 }
 renderCanvas=function(...args){
  const value=previousCanvas.apply(this,args);
  optimizeSections();
  return value;
 };
 function appendPickerMore(){
  const right=document.getElementById('right');
  if(!right||!isFast()||!Array.isArray(S.assets))return;
  const total=S.assets.length,cap=Math.max(24,S._mzPerfPropertiesLimit||24);
  if(total<=cap||!right.querySelector('.palrow img')||right.querySelector('[data-a="mzperf-more-properties"]'))return;
  const footer=document.createElement('div');footer.className='mzperf-properties-more';
  const more=document.createElement('button');more.type='button';more.className='btn sm';
  more.dataset.a='mzperf-more-properties';
  more.textContent=`Show more photos in Properties (${total-cap} remaining)`;
  more.title='Load more Uploads thumbnails in Properties without changing project data';
  footer.append(more);right.append(footer);
 }
 renderRight=function(...args){
  const value=previousRight.apply(this,args);
  appendPickerMore();
  return value;
 };
 ACT['mzperf-more-properties']=()=>{
  S._mzPerfPropertiesLimit=Math.max(24,S._mzPerfPropertiesLimit||24)+24;
  renderRight();
 };
 // A tabbed editor can remain open for hours. Avoid lingering section observer state
 // while the page is hidden, but reapply the mode when the editor becomes visible.
 document.addEventListener('visibilitychange',()=>{
  if(!document.hidden && isFast())requestAnimationFrame(()=>{
   if(frame()?.querySelector('.pg > .sec'))optimizeSections();
  });
 },{passive:true});
 window.addEventListener('resize',()=>{
  requestAnimationFrame(()=>{
   const nodes=frame()?.querySelectorAll('.pg > .sec');
   if(!nodes)return;
   if(isFast())optimizeSections();
   else nodes.forEach(n=>{n.style.removeProperty('content-visibility');n.style.removeProperty('contain-intrinsic-size')});
  });
 },{passive:true});
 // Fast Canvas remains opt-out via the existing Light Mode toggle.
 const oldToggle=ACT['mzperf-toggle'];
 if(typeof oldToggle==='function')ACT['mzperf-toggle']=function(...args){
  const v=oldToggle.apply(this,args);
  if(!isFast())frame()?.querySelectorAll('.pg > .sec').forEach(n=>{n.style.removeProperty('content-visibility');n.style.removeProperty('contain-intrinsic-size')});
  else optimizeSections();
  // Refresh the photo picker too: turning Light Mode off restores the full library.
  renderRight();
  return v;
 };
 window.MozaMobilePerformanceV1483={version:'14.8.3',enabled:isFast,getMeasuredSections:()=>measured};
})();
