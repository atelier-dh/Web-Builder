/* Moza Studio 14.8.13 · Tablet/Mobile performance mode.
   Editor-only. Project data, original media, Preview, publish and cloud storage
   are unchanged. DOM optimization is batched once per animation frame. */
(function(){
'use strict';
if(window.MozaTouchPerformance?.installed)return;
let override=null;
let sectionObserver=null;
let observedSections=new Set();
let optimizeFrame=0;
const $one=s=>document.querySelector(s);
const compactDevice=()=>innerWidth<=760||(innerWidth<=1400&&(matchMedia('(pointer:coarse)').matches||matchMedia('(any-pointer:coarse)').matches))||(innerWidth<=1150&&(navigator.deviceMemory||8)<=4);
const enabled=()=>override===null?compactDevice():override;
function updateMode(){
 const on=enabled();
 document.body.classList.toggle('mzperf-touch',on);
 document.body.classList.toggle('mzperf-inactive',document.hidden);
 const b=$one('[data-a="mzperf-toggle"]');
 if(b){b.textContent=on?'⚡ Light mode: On':'⚡ Light mode: Off';b.title='Toggle editor-only performance optimizations (does not affect published website)';b.setAttribute('aria-pressed',String(on));}
 if(!on){
  if(sectionObserver){sectionObserver.disconnect();sectionObserver=null;}
  observedSections.clear();
  $one('#frame')?.querySelectorAll('.mzperf-offscreen').forEach(n=>n.classList.remove('mzperf-offscreen'));
 }
}
function optimizeCanvas(){
 updateMode();
 if(!enabled())return;
 const frame=$one('#frame'),viewport=$one('#viewport');
 if(!frame||!viewport)return;
 // One combined pass avoids repeatedly walking the same canvas for each media type.
 frame.querySelectorAll('img,iframe,video').forEach(node=>{
  if(node.tagName==='IMG'){
   if(node.loading!=='lazy')node.loading='lazy';
   if(node.decoding!=='async')node.decoding='async';
  }else if(node.tagName==='IFRAME'){
   if(node.loading!=='lazy')node.loading='lazy';
  }else{
   if(node.preload!=='none')node.preload='none';
   try{if(!node.paused)node.pause()}catch(_){}
  }
 });
 if(typeof IntersectionObserver==='undefined')return;
 if(!sectionObserver){
  sectionObserver=new IntersectionObserver(entries=>{
   for(const item of entries){
    item.target.classList.toggle('mzperf-offscreen',!item.isIntersecting);
    if(!item.isIntersecting)item.target.querySelectorAll('video').forEach(v=>{try{v.pause()}catch(_){}});
   }
  },{root:viewport,rootMargin:'250px 0px 250px 0px',threshold:0});
 }
 const current=new Set(frame.querySelectorAll('.pg > .sec'));
 for(const old of observedSections){
  if(!current.has(old)){sectionObserver.unobserve(old);observedSections.delete(old);}
 }
 for(const sec of current){
  if(!observedSections.has(sec)){sectionObserver.observe(sec);observedSections.add(sec);}
 }
}
function scheduleOptimize(){
 if(optimizeFrame)return;
 optimizeFrame=requestAnimationFrame(()=>{optimizeFrame=0;optimizeCanvas()});
}
const oldCanvas=renderCanvas;
renderCanvas=function(...args){const value=oldCanvas.apply(this,args);scheduleOptimize();return value;};
const oldStatus=renderStatus;
renderStatus=function(...args){const value=oldStatus.apply(this,args);const bar=$one('#statusbar');
 if(bar&&!bar.querySelector('[data-a="mzperf-toggle"]')&&(compactDevice()||override!==null)){
  const btn=document.createElement('button');btn.className='btn sm mzperf-toggle';btn.type='button';btn.dataset.a='mzperf-toggle';
  const fit=bar.querySelector('[data-a="zoomfit"]');if(fit)fit.insertAdjacentElement('afterend',btn);else bar.appendChild(btn);
 }
 updateMode();return value;
};
ACT['mzperf-toggle']=()=>{override=!enabled();updateMode();renderCanvas();renderStatus();toast(enabled()?'Light mode enabled for tablet/mobile editor':'Light mode disabled (full editor effects)');};
ACT['mzperf-more-uploads']=()=>{S._mzPerfUploadLimit=(S._mzPerfUploadLimit||24)+24;renderLeft()};
// Search the entire local library, including assets outside the initial 24-card batch.
let assetSearchTimer;
document.addEventListener('input',event=>{
 if(!enabled()||event.target?.id!=='st28-asset-search'||S.tab!=='uploads')return;
 const input=event.target;clearTimeout(assetSearchTimer);
 assetSearchTimer=setTimeout(()=>{if(!input.isConnected)return;const value=input.value;ST28.assetQuery=value;S._mzPerfUploadLimit=24;const pos=input.selectionStart;renderLeft();const replacement=$one('#st28-asset-search');if(replacement){replacement.focus({preventScroll:true});try{replacement.setSelectionRange(pos,pos)}catch(_){}}},130);
},false);
window.addEventListener('resize',()=>{updateMode();scheduleOptimize()},{passive:true});
document.addEventListener('visibilitychange',()=>{updateMode();if(!document.hidden)scheduleOptimize()});
window.MozaTouchPerformance={installed:true,version:'14.8.13',enabled,compactDevice,refresh:()=>{updateMode();scheduleOptimize()},schedule:scheduleOptimize};
updateMode();scheduleOptimize();
})();
