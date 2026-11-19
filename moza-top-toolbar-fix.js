/* Moza Studio V14.8.23 - top toolbar: wraps "glyph label" buttons into icon + label spans so the
   label can be hidden on narrow widths (CSS) while the full name stays in title/aria-label.
   Idempotent, no behaviour change: data-a actions and click handlers are untouched. */
(function(){
 'use strict';
 var SEL='#top [data-a="toggle-right"],#top [data-a="ac13-toggle"],#top .mz13-overflow>summary,#top .st30-paste-top,#top .m-preview';
  function tidy(){
  var top=document.getElementById('top');if(!top)return;
  var nodes=top.querySelectorAll(SEL);
  for(var i=0;i<nodes.length;i++){
   var b=nodes[i];if(b.dataset.tbSplit)continue;
   var tn=null;for(var k=0;k<b.childNodes.length;k++){var c=b.childNodes[k];if(c.nodeType===3&&c.nodeValue.trim()){tn=c;break}}
   if(!tn)continue;
   var m=tn.nodeValue.trim().match(/^(\S+)\s+(.+)$/);if(!m)continue;
   b.dataset.tbSplit='1';
   var name=m[2].replace(/\s*[\u25be\u25bc]\s*$/,'');
   if(!b.getAttribute('aria-label'))b.setAttribute('aria-label',name);
   if(!b.title)b.title=name;
   var f=document.createDocumentFragment(),ic=document.createElement('span'),lb=document.createElement('span');
   ic.className='tb-i';ic.setAttribute('aria-hidden','true');ic.textContent=m[1];
   lb.className='tb-l';lb.textContent=' '+m[2];
   f.appendChild(ic);f.appendChild(lb);b.replaceChild(f,tn);
  }
 }
 var queued=false;
 function queue(){if(queued)return;queued=true;requestAnimationFrame(function(){queued=false;try{tidy()}catch(e){console.warn('[Moza V14.8.23] toolbar tidy skipped',e)}})}
 function start(){
  var top=document.getElementById('top');if(!top){setTimeout(start,200);return}
  tidy();
  new MutationObserver(queue).observe(top,{childList:true,subtree:true});
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else start();
})();
