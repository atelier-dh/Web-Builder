/* Moza Studio V14.8.24 - Continuous Scroll (marquee) for Group / Gallery / Image / Shape.
 * Additive module: adds optional el.marquee, an inspector section, and a runtime injected into
 * Preview + published HTML. Old projects (no el.marquee) are untouched. Editor canvas stays static
 * (a small badge marks enabled elements); the movement is visible in Preview and on the website. */
(function(){
'use strict';
if(window.MozaMarquee||typeof elHTML!=='function'||typeof siteHTML!=='function')return;
var TYPES=['group','gallery','image','shape'];
var BPN={d:'Desktop',t:'Tablet',m:'Mobile'};
function num(v,min,max,def){v=Number(v);return isFinite(v)?Math.min(max,Math.max(min,v)):def}
function norm(m){
 m=m&&typeof m==='object'?m:{};var sp=m.speed&&typeof m.speed==='object'?m.speed:{};
 return {enabled:!!m.enabled,dir:m.dir==='right'?'right':'left',
  speed:{d:num(sp.d,5,400,40),t:num(sp.t,5,400,sp.d!=null?num(sp.d,5,400,40):40),m:num(sp.m,5,400,sp.d!=null?num(sp.d,5,400,40):30)},
  gap:num(m.gap,0,600,24),drag:m.drag!==false,pauseHover:m.pauseHover!==false,resume:num(m.resume,0,10000,1500),
  clip:m.clip==='frame'?'frame':'section'};
}
/* ---------- runtime (stringified into Preview/published HTML; must stay self-contained) ---------- */
function marqueeRuntime(){
 var R=document.documentElement,nodes=[].slice.call(document.querySelectorAll('[data-marquee]'));
 if(!nodes.length)return;
 if(window.matchMedia&&matchMedia('(prefers-reduced-motion:reduce)').matches)return;
 var M=[],raf=0,last=0;
 function bp(){return R.getAttribute('data-bp')||'d'}
 function speedOf(m){var s=m.c.speed||{};var v=s[bp()];return +(v!=null?v:(s.d!=null?s.d:40))||0}
 function wrap(m){var P=m.P;if(!(P>0))return;while(m.off<=-P)m.off+=P;while(m.off>0)m.off-=P}
 function apply(m){var t='translate:'+m.off.toFixed(2)+'px 0';
  for(var i=0;i<m.orig.length;i++)if(m.orig[i].style)m.orig[i].style.translate=m.off.toFixed(2)+'px 0';
  for(var j=0;j<m.tiles.length;j++)m.tiles[j].el.style.translate=m.off.toFixed(2)+'px 0'}
 function clear(m){m.tiles.forEach(function(t){if(t.el.parentNode)t.el.parentNode.removeChild(t.el)});m.tiles=[]}
 function build(m){
  clear(m);var el=m.el,w=el.offsetWidth,gap=Math.max(0,+m.c.gap||0);m.w=w;
  if(!(w>0)){m.P=0;return}
  m.P=w+gap;var a,b;
  if(m.c.clip==='frame'){el.classList.add('mzmq-frame');a=0;b=w}
  else{el.classList.remove('mzmq-frame');var sec=el.closest('.sec')||el.parentNode;var x0=0,n=el;
   var er=el.getBoundingClientRect(),sr=sec.getBoundingClientRect(),sc=er.width&&w?er.width/w:1;
   x0=(er.left-sr.left)/(sc||1);a=-x0;b=(sr.width/(sc||1))-x0}
  var P=m.P,kmin=Math.floor((a-w)/P)+1,kmax=Math.ceil(b/P);
  if(kmax-kmin>11){kmin=Math.max(kmin,-5);kmax=Math.min(kmax,kmin+11)}
  for(var k=kmin;k<=kmax;k++){if(k===0)continue;
   var h=document.createElement('div');h.className='mzmq-clone';h.setAttribute('aria-hidden','true');
   h.style.left=(k*P)+'px';h.style.width=w+'px';
   m.orig.forEach(function(n){var c=n.cloneNode(true);if(c.nodeType===1){
     [].slice.call(c.querySelectorAll('[id]')).forEach(function(x){x.removeAttribute('id')});
     [].slice.call(c.querySelectorAll('a,button,input,select,textarea,video,audio')).forEach(function(x){x.setAttribute('tabindex','-1');if(x.pause)try{x.pause()}catch(e){}});
     c.style.translate=''}h.appendChild(c)});
   el.appendChild(h);m.tiles.push({el:h,k:k})}
  wrap(m);apply(m)}
 function tick(ts){
  var dt=last?Math.min(64,ts-last)/1000:0;last=ts;var now=performance.now();
  for(var i=0;i<M.length;i++){var m=M[i];
   if(!m.vis||!(m.P>0)||m.drag)continue;
   if(m.hover&&m.c.pauseHover)continue;
   if(m.vel&&Math.abs(m.vel)>8){m.off+=m.vel*dt;m.vel*=Math.pow(.02,dt);wrap(m);apply(m);continue}
   m.vel=0;if(now<m.resumeAt)continue;
   var sp=speedOf(m);if(!sp)continue;
   m.off+=(m.c.dir==='right'?1:-1)*sp*dt;wrap(m);apply(m)}
  raf=requestAnimationFrame(tick)}
 function bind(m){
  var el=m.el,c=m.c;
  if(c.pauseHover){el.addEventListener('pointerenter',function(e){if(e.pointerType==='mouse')m.hover=true});el.addEventListener('pointerleave',function(e){if(e.pointerType==='mouse')m.hover=false})}
  if(c.drag===false)return;
  var sx=0,so=0,down=false,moved=false,lx=0,lt=0,v=0,pid=null;
  el.addEventListener('pointerdown',function(e){
   if(e.button!==undefined&&e.button!==0)return;
   down=true;moved=false;sx=lx=e.clientX;so=m.off;lt=performance.now();v=0;pid=e.pointerId;m.vel=0});
  el.addEventListener('pointermove',function(e){
   if(!down||e.pointerId!==pid)return;
   var dx=e.clientX-sx;
   if(!moved){if(Math.abs(dx)<6)return;moved=true;m.drag=true;el.classList.add('mzmq-drag');try{el.setPointerCapture(pid)}catch(x){}}
   var nowt=performance.now(),dtm=Math.max(1,nowt-lt);v=.8*v+.2*((e.clientX-lx)/dtm*1000);lx=e.clientX;lt=nowt;
   m.off=so+dx;wrap(m);apply(m);e.preventDefault()});
  function end(e){
   if(!down||(e&&e.pointerId!==pid))return;down=false;
   if(moved){m.drag=false;el.classList.remove('mzmq-drag');m.vel=Math.max(-1500,Math.min(1500,v));m.resumeAt=performance.now()+(+c.resume||0);m.justDragged=true;setTimeout(function(){m.justDragged=false},60)}}
  el.addEventListener('pointerup',end);el.addEventListener('pointercancel',end);
  el.addEventListener('click',function(e){if(m.justDragged){e.preventDefault();e.stopPropagation()}},true);
  el.addEventListener('dragstart',function(e){e.preventDefault()})}
 nodes.forEach(function(el){
  var c;try{c=JSON.parse(el.getAttribute('data-marquee'))}catch(e){return}
  if(!c||!c.enabled)return;
  var m={el:el,c:c,orig:[].slice.call(el.childNodes),tiles:[],off:0,P:0,w:0,vis:true,vel:0,resumeAt:0,drag:false,hover:false};
  M.push(m);bind(m);build(m)});
 if(!M.length)return;
 if('IntersectionObserver' in window){
  var io=new IntersectionObserver(function(es){es.forEach(function(en){
   M.forEach(function(m){var host=m.el.closest('.sec')||m.el;if(host===en.target){m.vis=en.isIntersecting;if(en.isIntersecting&&m.el.offsetWidth!==m.w)build(m)}})})},{rootMargin:'120px'});
  var seen=[];M.forEach(function(m){var host=m.el.closest('.sec')||m.el;if(seen.indexOf(host)<0){seen.push(host);io.observe(host)}})}
 var rt=0,lastBp=bp();
 function rebuildAll(){M.forEach(function(m){if(m.el.offsetWidth>0)build(m)})}
 window.addEventListener('resize',function(){clearTimeout(rt);rt=setTimeout(function(){lastBp=bp();rebuildAll()},160)});
 window.addEventListener('load',function(){setTimeout(rebuildAll,60)});
 if(document.fonts&&document.fonts.ready)document.fonts.ready.then(function(){setTimeout(rebuildAll,60)});
 document.addEventListener('visibilitychange',function(){last=0});
 raf=requestAnimationFrame(tick)}
/* ---------- CSS (sitecss = editor + Preview + published) ---------- */
var CSS='\n/* MOZA_MARQUEE_V14824 */\n.el[data-marquee]{touch-action:pan-y;cursor:grab}\n.el[data-marquee].mzmq-frame{overflow:hidden}\n.el[data-marquee].mzmq-drag{cursor:grabbing;user-select:none;-webkit-user-select:none}\n.el[data-marquee] img{-webkit-user-drag:none;user-select:none}\n.mzmq-clone{position:absolute;top:0;height:100%;pointer-events:auto}\n.mzmq-clone>.gcl{position:absolute;inset:0}\n.mzmq-badge{position:absolute;left:4px;top:4px;z-index:6;background:#5268f5;color:#fff;font:600 10px/1 system-ui,sans-serif;padding:3px 7px;border-radius:99px;pointer-events:none;white-space:nowrap}\n';
var st=document.getElementById('sitecss');
if(st&&!st.textContent.includes('MOZA_MARQUEE_V14824'))st.textContent+=CSS;
/* ---------- renderer hooks ---------- */
var prevEl=elHTML;
elHTML=function(el,ctx){
 var html=prevEl.apply(this,arguments);
 if(!el||!el.marquee||!el.marquee.enabled||TYPES.indexOf(el.type)<0||!html)return html;
 var cfg=norm(el.marquee);
 if(ctx&&ctx.edit)return html.replace(/<\/div>\s*$/,function(){return '<i class="mzmq-badge" title="Continuous Scroll aktif - lihat geraknya di Preview">\u2194 Marquee '+(cfg.dir==='right'?'\u2192':'\u2190')+'</i></div>'});
 var attr=" data-marquee='"+String(JSON.stringify(cfg)).replace(/&/g,'&amp;').replace(/'/g,'&#39;')+"'";
 var key='data-id="'+el.id+'"';var i=html.indexOf(key);
 return i<0?html:html.slice(0,i+key.length)+attr+html.slice(i+key.length);
};
var prevSite=siteHTML;
siteHTML=function(){
 var html=prevSite.apply(this,arguments);
 if(typeof html!=='string'||html.indexOf('data-marquee=')<0||html.indexOf('MOZA_MARQUEE_RT')>=0)return html;
 var js='<script>/*MOZA_MARQUEE_RT*/try{('+marqueeRuntime.toString()+')()}catch(e){console.error("[Moza] Marquee runtime failed",e)}<\/script>';
 var k=html.lastIndexOf('</body>');
 return k<0?html+js:html.slice(0,k)+js+html.slice(k);
};
/* ---------- inspector ---------- */
function sel(){try{if(!S||S.mode!=='design'||!S.sel||S.sel.k!=='el'||S.multi.length>1)return null;var e=T('el');return e&&TYPES.indexOf(e.type)>=0?e:null}catch(_){return null}}
function section(e){
 var m=norm(e.marquee),bp=BPN[S.bp]?S.bp:'d',bpn=BPN[bp];
 var body='<label class="f" style="gap:6px"><input type="checkbox" data-mzmq="enabled" '+(m.enabled?'checked':'')+'> <b>Aktifkan Continuous Scroll</b></label>'
 +'<div class="f" style="margin-top:6px"><span>Arah</span><button type="button" class="btn sm '+(m.dir==='left'?'on':'')+'" data-a="mzmq-dir" data-v="left">\u2190 Kiri</button><button type="button" class="btn sm '+(m.dir==='right'?'on':'')+'" data-a="mzmq-dir" data-v="right">Kanan \u2192</button></div>'
 +'<div class="f"><span>Kecepatan '+bpn+'</span><input type="range" min="5" max="300" step="5" value="'+m.speed[bp]+'" data-mzmq="speed" style="flex:1"><output>'+m.speed[bp]+' px/dtk</output></div>'
 +'<div class="f"><span>Jarak antar putaran (px)</span><input type="number" min="0" max="600" value="'+m.gap+'" data-mzmq="gap" style="width:80px;border:1px solid var(--line);border-radius:7px;padding:4px 6px"></div>'
 +'<div class="f"><span>Jendela</span><select data-mzmq="clip" style="flex:1;border:1px solid var(--line);border-radius:7px;padding:4px 6px"><option value="section" '+(m.clip==='section'?'selected':'')+'>Lebar penuh section</option><option value="frame" '+(m.clip==='frame'?'selected':'')+'>Dalam kotak elemen</option></select></div>'
 +'<label class="f" style="gap:6px"><input type="checkbox" data-mzmq="drag" '+(m.drag?'checked':'')+'> Bisa ditahan &amp; digeser</label>'
 +'<label class="f" style="gap:6px"><input type="checkbox" data-mzmq="pauseHover" '+(m.pauseHover?'checked':'')+'> Berhenti saat hover (desktop)</label>'
 +'<div class="f"><span>Jalan lagi setelah (ms)</span><input type="number" min="0" max="10000" step="100" value="'+m.resume+'" data-mzmq="resume" style="width:80px;border:1px solid var(--line);border-radius:7px;padding:4px 6px"></div>'
 +'<div class="hint" style="margin-top:6px">Isi elemen digandakan otomatis agar putarannya mulus; samakan jarak putaran dengan jarak antar kartu. Di canvas tetap diam supaya mudah diedit; lihat geraknya lewat Preview. Kecepatan diatur per perangkat ('+bpn+' sedang aktif).</div>';
 return GRP('mzmq','\u2194 Continuous Scroll',body,true)}
function mutate(fn){var e=sel();if(!e||e.locked)return false;commit(discrete());e.marquee=norm(e.marquee);fn(e.marquee);if(typeof afterEdit==='function')afterEdit();return true}
if(typeof renderRight==='function'){
 var prevRight=renderRight;
 renderRight=function(){prevRight.apply(this,arguments);try{var e=sel(),r=document.querySelector('#right');if(e&&r&&!r.querySelector('[data-g="mzmq"]')){var an=r.querySelector('[data-g="grp"]')||r.querySelector('[data-g="scl"]');if(an)an.insertAdjacentHTML('afterend',section(e));else r.insertAdjacentHTML('beforeend',section(e))}}catch(err){console.warn('[Moza marquee] inspector skipped',err)}};
}
ACT['mzmq-dir']=function(b){mutate(function(m){m.dir=b.dataset.v==='right'?'right':'left'})};
document.addEventListener('input',function(ev){var t=ev.target;if(t&&t.matches&&t.matches('[data-mzmq="speed"]')){var o=t.parentNode.querySelector('output');if(o)o.textContent=t.value+' px/dtk'}});
document.addEventListener('change',function(ev){
 var t=ev.target;if(!t||!t.matches||!t.matches('[data-mzmq]'))return;var k=t.dataset.mzmq;
 mutate(function(m){
  if(k==='enabled'||k==='drag'||k==='pauseHover')m[k]=!!t.checked;
  else if(k==='speed'){var bp=BPN[S.bp]?S.bp:'d';m.speed[bp]=num(t.value,5,400,40)}
  else if(k==='gap')m.gap=num(t.value,0,600,24);
  else if(k==='resume')m.resume=num(t.value,0,10000,1500);
  else if(k==='clip')m.clip=t.value==='frame'?'frame':'section'})});
window.MozaMarquee={version:'14.8.24',norm:norm,types:TYPES.slice()};
try{renderRight()}catch(_){}
console.info('[Moza V14.8.24] Continuous Scroll installed');
})();
