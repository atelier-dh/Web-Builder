/* Moza Studio 14.7.6 · Tablet/Mobile performance mode.
   Editor-only: never modifies project JSON, published website HTML, Preview iframe, cloud sync or upload originals. */
(function(){
'use strict';
if(window.MozaTouchPerformance?.installed)return;
let override=null;
let sectionObserver=null;
let observedFrame=null;
const $one=s=>document.querySelector(s);
const compactDevice=()=>innerWidth<=760||(innerWidth<=1400&&(matchMedia('(pointer:coarse)').matches||matchMedia('(any-pointer:coarse)').matches))||(innerWidth<=1150&&(navigator.deviceMemory||8)<=4);
const enabled=()=>override===null?compactDevice():override;
function updateMode(){
 document.body.classList.toggle('mzperf-touch',enabled());
 document.body.classList.toggle('mzperf-inactive',document.hidden);
 const b=$one('[data-a="mzperf-toggle"]');
 if(b){b.textContent=enabled()?'⚡ Light mode: On':'⚡ Light mode: Off';b.title='Toggle editor-only performance optimizations (does not affect published website)';b.setAttribute('aria-pressed',String(enabled()));}
 if(!enabled()&&sectionObserver){sectionObserver.disconnect();sectionObserver=null;observedFrame=null;$one('#frame')?.querySelectorAll('.mzperf-offscreen').forEach(n=>n.classList.remove('mzperf-offscreen'));}
}
function optimizeCanvas(){
 updateMode();
 if(!enabled())return;
 const frame=$one('#frame'),viewport=$one('#viewport');
 if(!frame||!viewport)return;
 // Lazy-decode pictures and embeds. Image bytes are not altered or discarded.
 frame.querySelectorAll('img').forEach(img=>{img.loading='lazy';img.decoding='async'});
 frame.querySelectorAll('iframe').forEach(iframe=>{iframe.loading='lazy'});
 frame.querySelectorAll('video').forEach(v=>{
  v.preload='none';
  // Editing the page never needs to continuously decode every background video.
  try{if(!v.paused)v.pause()}catch(_){}
 });
 // Pause animations in *offscreen* sections. Visible animations still run normally.
 if(typeof IntersectionObserver==='undefined')return;
 if(sectionObserver)sectionObserver.disconnect();
 sectionObserver=new IntersectionObserver(entries=>{
  for(const item of entries){
   item.target.classList.toggle('mzperf-offscreen',!item.isIntersecting);
   if(!item.isIntersecting)item.target.querySelectorAll('video').forEach(v=>{try{v.pause()}catch(_){}});
  }
 },{root:viewport,rootMargin:'250px 0px 250px 0px',threshold:0});
 observedFrame=frame;
 frame.querySelectorAll('.pg > .sec').forEach(sec=>sectionObserver.observe(sec));
}
const oldCanvas=renderCanvas;
renderCanvas=function(...args){const value=oldCanvas.apply(this,args);optimizeCanvas();return value;};
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
window.addEventListener('resize',()=>updateMode(),{passive:true});
document.addEventListener('visibilitychange',()=>updateMode());
window.MozaTouchPerformance={installed:true,version:'14.7.6',enabled,compactDevice,refresh:updateMode};
updateMode();
})();
