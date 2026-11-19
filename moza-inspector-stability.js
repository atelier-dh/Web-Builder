/* Moza Studio — Inspector continuity hotfix.
   Preserves expanded property groups, scroll position and active input after
   the original editor refresh. Does not change project data or HTML export.
*/
(function(){
 'use strict';
 if(window.MozaInspectorStability || typeof renderRight !== 'function') return;
 const old=renderRight;
 const identity=()=>{
  try {
   if(typeof S==='undefined') return '';
   if(S.sel?.k==='el' && typeof T==='function'){const e=T('el');return 'el:'+String(e?.id||'')+':'+(e?.mozaSmartFilter?'filter':e?.mozaWidget?'interactive-'+String(e.mozaWidget.kind||''):e?.type||'general')}
   if(S.sel?.k==='sec')return 'sec:'+String(S.sel.id||S.sel.sid||'');
   return String(S.sel?.k||'none')+':'+String(S.pageId||'');
  }catch(_){return ''}
 };
 const scopes=['#right']; // Include native Properties and all add-on inspectors.
 const summary=d=>String(d.querySelector(':scope > summary')?.textContent||'').trim().replace(/\s*\(\d+\)/g,'').replace(/\s+/g,' ');
 function snapshot(){
  const panel=document.getElementById('right');if(!panel||panel.dataset.mozaInspectorOwner!==identity())return null;
  const keys=new Map(),groups=[];
  for(const scope of scopes){
   const root=scope==='#right'?panel:panel.querySelector(scope);if(!root)continue;
   const counts=new Map();
   root.querySelectorAll('details').forEach(d=>{
    let name=summary(d);if(d.classList.contains('mz13-item'))name='card';
    const n=counts.get(name)||0;counts.set(name,n+1);
    const key=scope+'|'+name+'|'+n;
    keys.set(d,key);groups.push([key,d.open]);
   });
  }
  const focus=document.activeElement;
  let focusKey='',selectionStart=null,selectionEnd=null;
  for(const scope of scopes){
   const root=scope==='#right'?panel:panel.querySelector(scope);
   if(root && root.contains(focus)){
    const controls=Array.from(root.querySelectorAll('input,select,textarea'));
    const i=controls.indexOf(focus);
    if(i!==-1){focusKey=scope+'|'+i;try{selectionStart=focus.selectionStart;selectionEnd=focus.selectionEnd}catch(_){}}
    break;
   }
  }
  return {identity:identity(),groups,scrollTop:panel.scrollTop,focusKey,selectionStart,selectionEnd};
 }
 function restore(state){
  const panel=document.getElementById('right');if(!panel||!state||state.identity!==identity())return;
  const saved=new Map(state.groups);
  for(const scope of scopes){
   const root=scope==='#right'?panel:panel.querySelector(scope);if(!root)continue;
   const counts=new Map();
   root.querySelectorAll('details').forEach(d=>{
    let name=summary(d);if(d.classList.contains('mz13-item'))name='card';
    const n=counts.get(name)||0;counts.set(name,n+1);
    const k=scope+'|'+name+'|'+n;
    if(saved.has(k))d.open=saved.get(k);
   });
  }
  if(state.focusKey){
   const index=state.focusKey.lastIndexOf('|');
   const scope=state.focusKey.slice(0,index);
   const i=Number(state.focusKey.slice(index+1));
   const controls=Array.from(panel.querySelectorAll(scope+' input,'+scope+' select,'+scope+' textarea'));
   const target=controls[i];
   // Only restore focus when it belonged to the property editor before redraw.
   if(target){
    try{target.focus({preventScroll:true});if(state.selectionStart!==null && typeof target.setSelectionRange==='function')target.setSelectionRange(state.selectionStart,state.selectionEnd)}catch(_){}
   }
  }
  panel.scrollTop=state.scrollTop;
 }
 const wrapped=function(...args){
  const state=snapshot();
  const out=old.apply(this,args);
  try{restore(state)}catch(err){console.warn('[Moza Inspector Stability] Could not restore panel state',err)}
  const panel=document.getElementById('right');if(panel)panel.dataset.mozaInspectorOwner=identity();
  return out;
 };
 wrapped.__mozaInspectorStability=true;
 renderRight=wrapped;
 window.MozaInspectorStability={version:'14.8.2',enabled:true};
})();
