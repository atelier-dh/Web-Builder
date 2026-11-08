/* Moza Studio v14.8.13 — batched tablet/mobile canvas optimization.
   Editor only. Section lookup is O(n), and optimization is scheduled once
   per animation frame instead of running synchronously on every render. */
(function(){
 'use strict';
 if(window.MozaMobilePerformanceV1483 || typeof renderCanvas !== 'function' || typeof renderRight !== 'function')return;
 const previousCanvas=renderCanvas;
 const previousRight=renderRight;
 const supportsContain=typeof CSS!=='undefined' && CSS.supports?.('content-visibility','auto');
 const frame=()=>document.getElementById('frame');
 const isFast=()=>!!window.MozaTouchPerformance?.enabled?.();
 let measured=0,pending=0;
 function optimizeSections(){
  const host=frame();if(!host)return;
  const nodes=host.querySelectorAll('.pg > .sec');
  if(!isFast()||!supportsContain){
   nodes.forEach(node=>{node.style.removeProperty('content-visibility');node.style.removeProperty('contain-intrinsic-size')});
   measured=0;return;
  }
  const p=typeof curPage==='function'?curPage():null;
  const sections=new Map((p?.sections||[]).map(sec=>[sec.id,sec]));
  const selectedSection=S.sel?.k==='sec'?S.sel.id:
   S.sel?.k==='el' && typeof findEl==='function'?findEl(S.sel.id)?.sec?.id:null;
  for(const node of nodes){
   const sec=sections.get(node.dataset.sec);
   if(!sec || sec.kind==='overlay' || sec.id===selectedSection){
    node.style.contentVisibility='visible';node.style.removeProperty('contain-intrinsic-size');
    continue;
   }
   const inner=typeof secH==='function'?secH(sec,S.bp):500;
   const height=Math.max(100,Math.ceil(inner+(Number(sec.padT)||0)+(Number(sec.padB)||0)));
   node.style.containIntrinsicSize='auto '+height+'px';
   node.style.contentVisibility='auto';
  }
  measured=nodes.length;
 }
 function scheduleSections(){
  if(pending)return;
  pending=requestAnimationFrame(()=>{pending=0;optimizeSections()});
 }
 renderCanvas=function(...args){const value=previousCanvas.apply(this,args);scheduleSections();return value;};
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
 renderRight=function(...args){const value=previousRight.apply(this,args);appendPickerMore();return value;};
 ACT['mzperf-more-properties']=()=>{S._mzPerfPropertiesLimit=Math.max(24,S._mzPerfPropertiesLimit||24)+24;renderRight();};
 document.addEventListener('visibilitychange',()=>{if(!document.hidden&&isFast())scheduleSections()},{passive:true});
 window.addEventListener('resize',()=>scheduleSections(),{passive:true});
 const oldToggle=ACT['mzperf-toggle'];
 if(typeof oldToggle==='function')ACT['mzperf-toggle']=function(...args){
  const value=oldToggle.apply(this,args);
  scheduleSections();renderRight();return value;
 };
 window.MozaMobilePerformanceV1483={version:'14.8.13',enabled:isFast,getMeasuredSections:()=>measured,schedule:scheduleSections};
 scheduleSections();
})();
