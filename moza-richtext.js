/* Moza Studio V14.8.28 - Rich text inside ONE text box.
 * Blok sebagian teks saat mengedit lalu ubah bold / miring / garis bawah / warna / ukuran / font hanya untuk bagian itu.
 * Data: el.text tetap teks polos (dipakai fitur lain); el.rich = HTML span yang sudah dibersihkan (hanya bila ada format per-kata).
 * Aman: HTML selalu dibersihkan (whitelist) saat disimpan DAN saat dirender, sehingga tidak bisa menyisipkan skrip. */
(function(){
'use strict';
if(window.MozaRich||typeof elHTML!=='function'||typeof beginEdit!=='function'||typeof finishEdit!=='function'||typeof v283EditText!=='function')return;

var TOK='\uE000MZRICH\uE001';
var PROPS=['color','font-family','font-size','font-weight','font-style','text-decoration','letter-spacing','background-color'];

/* ---------- sanitasi nilai CSS ---------- */
function cleanVal(prop,v){
 v=String(v==null?'':v).trim();if(!v||/url\(|expression|javascript|[<>{}\\]|\/\*/i.test(v))return '';
 switch(prop){
  case 'color':case 'background-color':
   return /^(#[0-9a-f]{3,8}|rgba?\([\d\s.,%\/]+\)|hsla?\([\d\s.,%a-z\/]+\)|[a-z]{3,20})$/i.test(v)&&v!=='inherit'&&v!=='initial'?v.toLowerCase():'';
  case 'font-family':
   v=v.replace(/"/g,"'");return /^[\w\s'",.\-]+$/.test(v)&&v.length<=120?v:'';
  case 'font-size':{var m=/^([\d.]+)(px|em|rem|pt|%)$/i.exec(v);if(!m)return '';var n=parseFloat(m[1]),u=m[2].toLowerCase();
   if(!isFinite(n)||n<=0)return '';
   if(u==='pt'){n=n*4/3;u='px'}else if(u==='rem')u='em';else if(u==='%'){n=n/100;u='em'}
   if(u==='px')n=Math.max(6,Math.min(600,n));else n=Math.max(.2,Math.min(8,n));
   return (Math.round(n*1000)/1000)+u}
  case 'font-weight':{var w=v.toLowerCase();if(w==='bold'||w==='bolder')return '700';if(w==='normal'||w==='lighter')return '400';
   var k=parseInt(w,10);return k>=100&&k<=900?String(Math.round(k/100)*100):''}
  case 'font-style':{var f=v.toLowerCase();return f==='italic'||f==='oblique'?'italic':f==='normal'?'normal':''}
  case 'text-decoration':{var d=v.toLowerCase(),out=[];if(/underline/.test(d))out.push('underline');if(/line-through/.test(d))out.push('line-through');
   return out.length?out.join(' '):(/\bnone\b/.test(d)?'none':'')}
  case 'letter-spacing':return /^-?[\d.]+(px|em)$/i.test(v)?v.toLowerCase():'';
 }
 return ''}

function readStyle(node,into){
 var st=node.style;if(!st)return into;
 PROPS.forEach(function(p){
  var v=st.getPropertyValue(p);
  if(!v&&p==='text-decoration')v=st.getPropertyValue('text-decoration-line');
  v=cleanVal(p,v);if(v)into[p]=v});
 return into}

/* ---------- DOM -> runs [{t,s}] ---------- */
function collect(root){
 var runs=[],last='';
 function push(t,s){if(!t)return;last=t.charAt(t.length-1);var key=JSON.stringify(s),r=runs[runs.length-1];
  if(r&&r.k===key)r.t+=t;else runs.push({t:t,s:s,k:key})}
 function walk(node,inh){
  for(var c=node.firstChild;c;c=c.nextSibling){
   if(c.nodeType===3){push(String(c.nodeValue).replace(/[\u200b\r]/g,''),inh);continue}
   if(c.nodeType!==1)continue;
   var tag=c.tagName.toLowerCase();
   if(tag==='br'){push('\n',inh);continue}
   if(/^(script|style|meta|link|head|iframe|object|embed|svg|math|template|noscript)$/.test(tag))continue;
   var block=/^(div|p|li|ul|ol|h[1-6]|blockquote|pre|tr|section|article)$/.test(tag);
   var s=Object.assign({},inh);
   if(tag==='b'||tag==='strong')s['font-weight']='700';
   else if(tag==='i'||tag==='em')s['font-style']='italic';
   else if(tag==='u')s['text-decoration']=(/line-through/.test(s['text-decoration']||'')?'underline line-through':'underline');
   else if(tag==='s'||tag==='strike'||tag==='del')s['text-decoration']=(/underline/.test(s['text-decoration']||'')?'underline line-through':'line-through');
   else if(tag==='font'){var fc=cleanVal('color',c.getAttribute('color'));if(fc)s.color=fc;var ff=cleanVal('font-family',c.getAttribute('face'));if(ff)s['font-family']=ff}
   readStyle(c,s);
   if(block&&runs.length&&last!=='\n')push('\n',inh);
   walk(c,s)}}
 walk(root,{});
 /* buang SATU baris baru di akhir (perilaku lama: innerText.replace(/\n$/,'')) */
 var lr=runs[runs.length-1];if(lr&&lr.t.slice(-1)==='\n'){lr.t=lr.t.slice(0,-1);if(!lr.t)runs.pop()}
 return runs}

function esc2(s){return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')}
function toHtml(runs){
 return runs.map(function(r){
  var decl=PROPS.filter(function(p){return r.s[p]}).map(function(p){return p+':'+r.s[p]}).join(';');
  return decl?'<span style="'+decl+'">'+esc2(r.t)+'</span>':esc2(r.t)}).join('')}
function plainOf(runs){return runs.map(function(r){return r.t}).join('')}
function hasFormat(runs){return runs.some(function(r){return Object.keys(r.s).length>0})}

/* node (contenteditable) -> {text, html} ; html kosong bila tidak ada format per-kata */
function extract(node){var runs=collect(node);return{text:plainOf(runs),html:hasFormat(runs)?toHtml(runs):''}}

var cache=new Map();
/* string html (tersimpan) -> runs, selalu lewat parser inert + whitelist */
function parseRich(html){
 html=String(html||'');if(!html)return null;
 if(cache.has(html))return cache.get(html);
 var runs=null;
 try{var doc=new DOMParser().parseFromString('<body>'+html+'</body>','text/html');runs=collect(doc.body)}catch(e){runs=null}
 if(cache.size>400)cache.clear();cache.set(html,runs);return runs}
/* runs valid untuk elemen ini? (el.text dan teks rich harus sama; kalau tidak, rich dianggap basi dan diabaikan) */
function runsFor(el){
 if(!el||!el.rich||el.guestDynamic)return null;
 var runs=parseRich(el.rich);if(!runs||!hasFormat(runs))return null;
 return plainOf(runs)===String(el.text==null?'':el.text)?runs:null}

/* ---------- render: sisipkan rich ke dalam .tx ---------- */
var prevEl=elHTML;
elHTML=function(el,ctx){
 var runs=null;
 try{runs=(el&&!el.hidden&&TEXTY.indexOf(el.type)>=0)?runsFor(el):null}catch(e){runs=null}
 if(!runs)return prevEl.apply(this,arguments);
 var t=el.text,html;el.text=TOK;
 try{html=prevEl.apply(this,arguments)}finally{el.text=t}
 if(typeof html!=='string'||html.indexOf(TOK)<0||!/class="tx"/.test(html))return prevEl.apply(this,arguments);
 return html.split(TOK).join(toHtml(runs))};

/* ---------- editing ---------- */
var lastRange=null,keepUntil=0,hintShown=false;
function editNode(){return document.querySelector('#frame [contenteditable="true"]')}
function inside(n,r){return !!(n&&r&&n.contains(r.startContainer)&&n.contains(r.endContainer))}
document.addEventListener('selectionchange',function(){
 var n=editNode();if(!n)return;var s=getSelection();if(!s||!s.rangeCount)return;
 var r=s.getRangeAt(0);if(inside(n,r))lastRange=r.cloneRange()});
/* klik di toolbar tidak boleh mengakhiri mode edit; tombol tidak boleh mencuri fokus/seleksi */
document.addEventListener('pointerdown',function(e){
 var bar=e.target&&e.target.closest&&e.target.closest('#v283-textbar');
 if(bar&&S.editing){keepUntil=Date.now()+1200;e.stopPropagation()}},true);
document.addEventListener('mousedown',function(e){
 var b=e.target&&e.target.closest&&e.target.closest('#v283-textbar button');
 if(b&&S.editing)e.preventDefault()},true);

beginEdit=function(id){
 var f=findEl(id);if(!f||f.el.locked||!TEXTY.includes(f.el.type))return;
 S.sel={k:'el',id:id};S.editing=false;renderCanvas();
 var n=$('#frame .el[data-id="'+id+'"] [data-tx]');if(!n)return;
 S.editing=true;n.contentEditable='true';n.style.cursor='text';n.__dirty=false;lastRange=null;
 $('#frame .el[data-id="'+id+'"]').querySelectorAll('.h').forEach(function(h){h.remove()});
 n.addEventListener('input',function(){n.__dirty=true});
 n.addEventListener('paste',function(e){   /* tempel selalu sebagai teks polos (tidak membawa font/warna dari luar) */
  e.preventDefault();var t=((e.clipboardData||window.clipboardData).getData('text/plain')||'').replace(/\r/g,'');
  document.execCommand('insertText',false,t);n.__dirty=true});
 setTimeout(function(){
  if(!S.editing||!n.isConnected)return;
  n.focus();var r=document.createRange();r.selectNodeContents(n);var s=getSelection();s.removeAllRanges();s.addRange(r);
  n.addEventListener('blur',function(){
   if(!S.editing)return;
   setTimeout(function(){
    if(!S.editing||!n.isConnected)return;
    var a=document.activeElement;
    if(Date.now()<keepUntil||(a&&a.closest&&a.closest('#v283-textbar')))return;   /* fokus pindah ke toolbar: tetap mengedit */
    finishEdit()},0)});
  if(!hintShown&&typeof toast==='function'){hintShown=true;toast('Tip: blok sebagian teks lalu ubah font, ukuran, warna, B atau I - hanya bagian itu yang berubah (Ctrl+B / I / U juga bisa).',5200)}
 },0);
 n.addEventListener('keydown',function(ev){if(ev.key==='Escape'){ev.preventDefault();finishEdit()}})};

finishEdit=function(){
 var n=editNode();
 if(n){
  var host=n.closest('.el'),id=host&&host.dataset.id,f=id&&findEl(id);
  if(f){
   if(f.el.guestDynamic){   /* teks tamu dinamis: perilaku lama (polos) */
    var txt=n.innerText.replace(/\n$/,'');if(txt!==guestPattern(f.el)){commit('txt'+id);f.el.guestTemplate=txt}
   }else if(n.__dirty){
    var r=extract(n),before=f.el.rich||'';
    if(r.text!==f.el.text||r.html!==before){commit('txt'+id);f.el.text=r.text;if(r.html)f.el.rich=r.html;else delete f.el.rich}
   }}
  n.contentEditable='false'}
 if(S.editing){S.editing=false;renderCanvas();renderRight()}};

/* ---------- format per-kata ---------- */
function coversAll(n,r){return r.toString().replace(/\s+$/,'')===n.textContent.replace(/\s+$/,'')}
function currentRange(n){
 var s=getSelection(),r=(s&&s.rangeCount)?s.getRangeAt(0):null;
 if(inside(n,r)&&!r.collapsed)return r.cloneRange();
 return (lastRange&&inside(n,lastRange)&&!lastRange.collapsed)?lastRange.cloneRange():null}
function splitAndCollect(n,range){
 var sc=range.startContainer,so=range.startOffset,ec=range.endContainer,eo=range.endOffset;
 if(ec.nodeType===3&&eo>0&&eo<ec.nodeValue.length)ec.splitText(eo);
 if(sc.nodeType===3&&so>0&&so<sc.nodeValue.length){
  var mid=sc.splitText(so);range.setStart(mid,0);if(sc===ec)range.setEnd(mid,mid.nodeValue.length)}
 var w=document.createTreeWalker(n,NodeFilter.SHOW_TEXT),out=[],t;
 while((t=w.nextNode())){if(t.nodeValue&&range.intersectsNode(t))out.push(t)}
 return out}
function setSpanStyle(t,prop,val,n){
 var p=t.parentElement;
 if(p&&p!==n&&p.tagName==='SPAN'&&p.childNodes.length===1){p.style.setProperty(prop,val)}
 else{var sp=document.createElement('span');sp.style.setProperty(prop,val);t.parentNode.insertBefore(sp,t);sp.appendChild(t)}}
function baseFs(el){return Number(effG(el,S.bp,'fs'))||Number(el.st&&el.st.fs)||16}
function applyInline(n,range,key,value,el){
 var nodes=splitAndCollect(n,range);if(!nodes.length)return false;
 var prop,val;
 if(key==='fw'){var allB=nodes.every(function(t){return (parseInt(getComputedStyle(t.parentElement).fontWeight,10)||400)>=600});prop='font-weight';val=allB?'400':'700'}
 else if(key==='italic'){var allI=nodes.every(function(t){return getComputedStyle(t.parentElement).fontStyle==='italic'});prop='font-style';val=allI?'normal':'italic'}
 else if(key==='underline'){var allU=nodes.every(function(t){return /underline/.test(getComputedStyle(t.parentElement).textDecorationLine||'')});prop='text-decoration';val=allU?'none':'underline'}
 else if(key==='ff'){prop='font-family';val=cleanVal('font-family',fam(value))}
 else if(key==='fs'){prop='font-size';val=cleanVal('font-size',(Math.max(8,Math.min(300,Number(value)||16))/baseFs(el)).toFixed(3)+'em')}
 else if(key==='color'){prop='color';val=cleanVal('color',value)}
 if(!prop||!val)return false;
 nodes.forEach(function(t){setSpanStyle(t,prop,val,n)});
 var s=getSelection(),r2=document.createRange();r2.setStartBefore(nodes[0]);r2.setEndAfter(nodes[nodes.length-1]);
 n.focus();s.removeAllRanges();s.addRange(r2);lastRange=r2.cloneRange();n.__dirty=true;return true}
var PROPMAP={ff:'font-family',fs:'font-size',fw:'font-weight',italic:'font-style',color:'color'};
function stripRichProp(el,css){   /* format satu kotak penuh: hapus override per-kata untuk properti itu */
 var runs=el&&el.rich?parseRich(el.rich):null;if(!runs)return;
 var copy=runs.map(function(r){var s=Object.assign({},r.s);delete s[css];return{t:r.t,s:s,k:''}});
 if(hasFormat(copy))el.rich=toHtml(copy);else delete el.rich}

var oldEditText=v283EditText;
v283EditText=function(key,value){
 if(S.editing&&PROPMAP[key]){
  var n=editNode(),host=n&&n.closest('.el'),f=host&&findEl(host.dataset.id);
  if(n&&f&&!f.el.guestDynamic){
   var r=currentRange(n);
   if(r&&!coversAll(n,r)){applyInline(n,r,key,value,f.el);return}
   finishEdit();    /* seluruh teks / tanpa blok: ubah format kotak seperti sebelumnya */
   var el=T('el');if(el&&el.rich){commit(discrete());stripRichProp(el,PROPMAP[key])}
  }}
 else if(!S.editing&&PROPMAP[key]){var e2=T('el');if(e2&&e2.rich){commit(discrete());stripRichProp(e2,PROPMAP[key])}}
 return oldEditText.apply(this,arguments)};

/* Ctrl+U & tombol garis bawah memakai jalur yang sama (Ctrl+B/I sudah bawaan browser) */
ACT['mz-tx-underline']=function(){
 if(!S.editing){if(typeof toast==='function')toast('Klik dua kali teks, blok bagian yang diinginkan, lalu pilih garis bawah (atau Ctrl+U).');return}
 var n=editNode(),host=n&&n.closest('.el'),f=host&&findEl(host.dataset.id),r=n&&currentRange(n);
 if(n&&f&&r)applyInline(n,r,'underline','',f.el)};

/* tombol U (garis bawah) di toolbar teks, di samping I */
if(typeof v283TextToolbar==='function'){var oldBar=v283TextToolbar;v283TextToolbar=function(){oldBar.apply(this,arguments);
 var it=document.querySelector('#v283-textbar [data-a="v283-tx-italic"]');
 if(it&&!document.querySelector('#v283-textbar [data-a="mz-tx-underline"]'))it.insertAdjacentHTML('afterend','<button data-a="mz-tx-underline" title="Garis bawah (blok sebagian teks dulu, atau Ctrl+U)" aria-label="Underline"><u>U</u></button>')}}
window.MozaRich={version:'14.8.28',sanitize:function(html){var r=parseRich(html);return r&&hasFormat(r)?toHtml(r):''},runs:runsFor,extract:extract,cleanVal:cleanVal};
console.info('[Moza V14.8.28] Rich text installed');
})();
