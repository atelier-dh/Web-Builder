/* Moza Studio V14.8.31 - Password Gate (proteksi password untuk website hasil publish).
 *
 * Konsep: halaman yang berisi elemen "Password Gate" = LAYAR KUNCI (didesain bebas seperti halaman biasa).
 * Saat Publish/Export dengan proteksi aktif:
 *   - layar kunci diterbitkan apa adanya (publik, sengaja: nama pasangan, pesan, dll),
 *   - SELURUH website lain (semua halaman, gambar, media, RSVP, dst) DIENKRIPSI (AES-256-GCM, kunci dari password
 *     lewat PBKDF2-SHA256 600.000 iterasi) dan hanya bisa dibuka di browser setelah password benar.
 * Tanpa backend: berlaku di hosting statis mana pun (GitHub Pages, Netlify, Cloudflare, cPanel, dst; butuh https).
 * Password TIDAK pernah ada di file hasil publish. Tersimpan hanya di project editor (bukan di output).
 * Tidak ada perubahan pada output bila fitur tidak dipakai (halaman kunci dikeluarkan dari output normal). */
(function(){
'use strict';
if(window.MozaPassgate||typeof elHTML!=='function'||typeof siteHTML!=='function'||typeof TDEF==='undefined')return;

var IT=600000;                       // iterasi PBKDF2
var SESSIONS={tab:0,'1h':36e5,'12h':432e5,'1d':864e5,'7d':6048e5,'30d':2592e6,forever:-1};   // -1 = tidak kedaluwarsa (localStorage tanpa batas waktu)
var PGD={on:true,password:'',session:'7d',placeholder:'Masukkan password',btn:'Masuk',err:'Password salah. Silakan coba lagi.',busy:'Memeriksa…',
 secure:'Halaman ini membutuhkan koneksi aman (https).',wait:'Terlalu banyak percobaan. Coba lagi sebentar lagi.',showToggle:true,layout:'inline',previewErr:false,
 fs:16,radius:12,gap:10,cIn:'#ffffff',cInBd:'#d6dae3',cInTx:'#1c2027',cPh:'#8a92a6',cBtn:'tok:primary',cBtnTx:'#ffffff',cErr:'#b42318',salt:'',saltPw:''};

function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
function cfgOf(el){var c=el&&el.pw&&typeof el.pw==='object'?el.pw:{},o={};for(var k in PGD)o[k]=c[k]===undefined?PGD[k]:c[k];
 o.fs=Math.min(30,Math.max(10,Number(o.fs)||16));o.radius=Math.min(40,Math.max(0,Number(o.radius)||0));o.gap=Math.min(30,Math.max(0,Number(o.gap)||0));
 o.layout=o.layout==='stack'?'stack':'inline';if(!(o.session in SESSIONS))o.session='7d';return o}

/* ---------- menemukan layar kunci ---------- */
function gateIn(page){var f=null;(page.sections||[]).forEach(function(s){walkEls(s.elements||[],function(e){if(!f&&e&&e.type==='passgate')f=e})});return f}
function isLockPage(p){return !!(p&&(p.isLock||gateIn(p)))}
function lockInfo(doc){var ps=(doc&&doc.pages)||[];for(var i=0;i<ps.length;i++){var g=gateIn(ps[i]);if(g||ps[i].isLock)return{page:ps[i],el:g}}return null}

/* ---------- siteHTML: layar kunci dikeluarkan dari output normal (tidak ikut terbit tanpa enkripsi) ---------- */
var RT={building:false};
function withDoc(d,fn){var saved=S.doc;S.doc=d;try{return fn()}finally{S.doc=saved}}   // siteHTML membaca nav/floating/dll dari S.doc global
var prevSite=siteHTML;
siteHTML=function(doc){
 var a=arguments,out;
 if(!RT.building&&doc&&doc.pages&&doc.pages.some(isLockPage)){
  var opt=a[1]||{},startLock=opt.start&&doc.pages.some(function(p){return p.id===opt.start&&isLockPage(p)});
  if(!startLock){var rest=doc.pages.filter(function(p){return !isLockPage(p)});
   if(rest.length){var d2=Object.assign({},doc,{pages:rest});if(doc.start&&!rest.some(function(p){return p.id===doc.start}))d2.start=rest[0].id;
    var args=Array.prototype.slice.call(a),self=this;args[0]=d2;out=(doc===S.doc)?withDoc(d2,function(){return prevSite.apply(self,args)}):prevSite.apply(self,args)}}}
 if(out===undefined)out=prevSite.apply(this,a);
 if(typeof out==='string'&&out.indexOf('class="mzpw')>=0&&out.indexOf('id="mzpw-css"')<0)out=out.replace('</head>','<style id="mzpw-css">'+CSS+'</style></head>');
 return out};

/* ---------- elemen ---------- */
function vars(c){return '--pw-fs:'+c.fs+'px;--pw-r:'+c.radius+'px;--pw-gap:'+c.gap+'px;--pw-in-bg:'+col(c.cIn)+';--pw-in-bd:'+col(c.cInBd)+';--pw-in-tx:'+col(c.cInTx)+';--pw-ph:'+col(c.cPh)+';--pw-btn:'+col(c.cBtn)+';--pw-btn-tx:'+col(c.cBtnTx)+';--pw-err:'+col(c.cErr)}
var EYE='<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>';
function shell(el,edit){
 var c=cfgOf(el),attr=edit?' data-mzpw-edit="1"':' data-mzpw="1" data-err="'+esc(c.err)+'" data-busy="'+esc(c.busy)+'" data-secure="'+esc(c.secure)+'" data-wait="'+esc(c.wait)+'"';
 return '<form class="mzpw'+(c.layout==='stack'?' mzpw-stack':'')+'" style="'+vars(c)+'" novalidate autocomplete="off"'+attr+'><div class="mzpw-row"><div class="mzpw-field"><input type="password" name="pw" autocomplete="current-password" placeholder="'+esc(c.placeholder)+'" aria-label="Password"'+(edit?' tabindex="-1"':'')+(c.showToggle?'':' style="padding-right:1em"')+'>'
  +(c.showToggle?'<button type="button" class="mzpw-eye" aria-label="Tampilkan password" aria-pressed="false"'+(edit?' tabindex="-1"':'')+'>'+EYE+'</button>':'')+'</div><button type="submit" class="mzpw-go"'+(edit?' tabindex="-1"':'')+'>'+esc(c.btn)+'</button></div>'
  +'<div class="mzpw-err" role="alert"'+((edit&&c.previewErr)?'':' hidden')+'>'+esc(c.err)+'</div></form>'}
var CSS='\n/* MOZA_PASSGATE_V14831 */\n'
+'.mzpw{box-sizing:border-box;width:100%;height:100%;display:flex;flex-direction:column;justify-content:center;gap:8px;font-size:var(--pw-fs,16px);line-height:1.3;text-align:left}\n'
+'.mzpw *{box-sizing:border-box;font-family:inherit}\n'
+'.mzpw{container-type:inline-size}\n'
+'.mzpw-row{display:flex;gap:var(--pw-gap,10px);align-items:stretch}.mzpw-stack .mzpw-row{flex-direction:column}\n'
+'@container (max-width:380px){.mzpw-row{flex-direction:column}}\n@media(max-width:640px){.mzpw-row{flex-direction:column}}\n'
+'.mzpw-field{position:relative;flex:1 1 auto;min-width:0;display:flex}\n'
+'.mzpw input{width:100%;font:inherit;font-size:1em;color:var(--pw-in-tx);background:var(--pw-in-bg);border:1px solid var(--pw-in-bd);border-radius:var(--pw-r,12px);padding:.8em 2.9em .8em 1em;outline:0;min-width:0}\n'
+'.mzpw input::placeholder{color:var(--pw-ph);opacity:1}.mzpw input:focus{border-color:var(--pw-btn);box-shadow:0 0 0 3px color-mix(in srgb,var(--pw-btn) 22%,transparent)}\n'
+'.mzpw-eye{position:absolute;right:.3em;top:50%;transform:translateY(-50%);display:grid;place-items:center;width:2.3em;height:2.3em;border:0;background:transparent;color:var(--pw-ph);cursor:pointer;border-radius:50%;padding:0}.mzpw-eye:hover{color:var(--pw-in-tx)}\n'
+'.mzpw-go{flex:none;cursor:pointer;border:0;border-radius:var(--pw-r,12px);padding:.8em 1.7em;font:inherit;font-size:1em;font-weight:700;color:var(--pw-btn-tx);background:var(--pw-btn);white-space:nowrap}.mzpw-go:hover:not(:disabled){filter:brightness(1.07)}.mzpw-go:disabled{opacity:.6;cursor:progress}\n'
+'.mzpw-err{color:var(--pw-err);font-size:.88em}.mzpw-err[hidden]{display:none}\n'
+'.mzpw.is-shake .mzpw-field{animation:mzpwshake .36s}@keyframes mzpwshake{20%,60%{transform:translateX(-6px)}40%,80%{transform:translateX(6px)}}\n'
+'[data-mzpw-edit],[data-mzpw-edit] *{pointer-events:none!important}\n'
+'@media(prefers-reduced-motion:reduce){.mzpw.is-shake .mzpw-field{animation:none}}\n';
(function(){var h=document.getElementById('mzpw-edit-css');if(!h){h=document.createElement('style');h.id='mzpw-edit-css';h.textContent=CSS;document.head.appendChild(h)}})();

TDEF.passgate={name:'Password Gate',w:540,h:64,pw:JSON.parse(JSON.stringify(PGD)),st:{fs:16,ff:'$body',color:'tok:ink',pad:0,br:0,bw:0,bg:'transparent'}};
TILEICO.passgate='<rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>';
var prevEl=elHTML;
elHTML=function(el,ctx){
 var html=prevEl.apply(this,arguments);
 if(!el||el.type!=='passgate'||el.hidden||typeof html!=='string')return html;
 var key='data-id="'+el.id+'"',i=html.indexOf(key);if(i<0)return html;var j=html.indexOf('>',i);if(j<0)return html;
 return html.slice(0,j+1)+shell(el,!!(ctx&&ctx.edit))+html.slice(j+1)};

/* ---------- pipeline proteksi ---------- */
function b64e(u){var s='',n=0x8000;for(var i=0;i<u.length;i+=n)s+=String.fromCharCode.apply(null,u.subarray(i,i+n));return btoa(s)}
function b64d(s){var b=atob(s),u=new Uint8Array(b.length);for(var i=0;i<b.length;i++)u[i]=b.charCodeAt(i);return u}
function withTokensOff(fn){var m=window.MZX,was=m&&m.on;if(m)m.on=false;try{return fn()}finally{if(m)m.on=was}}
function lockDocOf(doc,page){
 var d=JSON.parse(JSON.stringify(Object.assign({},doc,{pages:[page]})));
 d.start=page.id;d.floating=[];if(d.nav)d.nav.on=false;if(d.music)d.music.on=false;if(d.cinema)d.cinema.on=false;
 d.pages.forEach(function(p){p.isLock=false});return d}
/* Bagian sinkron: membangun HTML layar kunci + HTML isi website (belum terenkripsi). Return null bila proteksi tidak aktif. */
function prepare(doc,o){
 o=o||{};var li=lockInfo(doc);if(!li||!li.el)return null;var c=cfgOf(li.el);
 if(!c.on)return null;if(!String(c.password||'').length)return{error:'Password Gate aktif tetapi password masih kosong.'};
 var rest=doc.pages.filter(function(p){return !isLockPage(p)});if(!rest.length)return{error:'Tidak ada halaman selain layar kunci untuk dilindungi.'};
 if(!li.el.pw)li.el.pw={};var pw=li.el.pw;
 if(!pw.salt||pw.saltPw!==pw.password){var s=new Uint8Array(16);crypto.getRandomValues(s);pw.salt=b64e(s);pw.saltPw=pw.password;try{scheduleSave()}catch(_){}}
 var sb=li.page.sections&&li.page.sections[0]&&li.page.sections[0].bg,out={bg:(sb&&sb.type==='color'&&sb.color)?col(sb.color):'',password:String(c.password),salt:pw.salt,id:pw.salt.replace(/[^A-Za-z0-9]/g,'').slice(0,12),sessionMs:SESSIONS[c.session],preview:!!o.preview};
 RT.building=true;
 try{
  var siteDoc=Object.assign({},doc,{pages:rest});if(doc.start&&!rest.some(function(p){return p.id===doc.start}))siteDoc.start=rest[0].id;
  out.payloadHTML=withDoc(siteDoc,function(){return withTokensOff(function(){return siteHTML(siteDoc)})});
  var lockDoc=lockDocOf(doc,li.page);out.lockHTML=withDoc(lockDoc,function(){return siteHTML(lockDoc,{start:li.page.id})});
 }finally{RT.building=false}
 return out}
/* Bagian async: enkripsi + susun file akhir (layar kunci + payload terenkripsi + runtime) */
async function finish(pre){
 if(pre&&pre.error)throw Error(pre.error);
 if(!window.crypto||!crypto.subtle)throw Error('Browser ini tidak mendukung enkripsi (butuh https atau localhost).');
 var pw=String(pre.password).normalize('NFKC');if(pw.length<6)throw Error('Password minimal 6 karakter (disarankan 10 atau lebih).');
 var enc=new TextEncoder(),salt=b64d(pre.salt),iv=crypto.getRandomValues(new Uint8Array(12));
 var km=await crypto.subtle.importKey('raw',enc.encode(pw),'PBKDF2',false,['deriveBits']);
 var raw=new Uint8Array(await crypto.subtle.deriveBits({name:'PBKDF2',salt:salt,iterations:IT,hash:'SHA-256'},km,256));
 var key=await crypto.subtle.importKey('raw',raw,'AES-GCM',false,['encrypt']);
 var ct=new Uint8Array(await crypto.subtle.encrypt({name:'AES-GCM',iv:iv},key,enc.encode(pre.payloadHTML)));
 var payload={v:1,id:pre.id,it:IT,s:pre.salt,iv:b64e(iv),c:b64e(ct),ss:pre.sessionMs};
 var html=pre.lockHTML,hi=html.indexOf('</head>'),bi=html.lastIndexOf('</body>');if(hi<0||bi<0)throw Error('Struktur HTML layar kunci tidak dikenali.');
 var head='<script>document.documentElement.classList.add("mzpw-boot")<\/script><style id="mzpw-boot">html.mzpw-boot body{visibility:hidden}'+(pre.bg?'html,body{background:'+pre.bg+'}':'')+'</style>';
 var tail='<script id="mzpw-payload" type="application/json">'+JSON.stringify(payload)+'<\/script><script>('+runtime.toString()+')()<\/script>';
 html=html.slice(0,hi)+head+html.slice(hi,bi)+tail+html.slice(bi);
 return html}
window.mzPgSite=async function(doc){var pre=prepare(doc);return pre?finish(pre):siteHTML(doc)};

/* ---------- runtime di browser pengunjung (self-contained) ---------- */
function runtime(){
 var P;try{P=JSON.parse(document.getElementById('mzpw-payload').textContent)}catch(e){return}
 var enc=new TextEncoder(),dec=new TextDecoder(),KEY='mzpw:'+P.id,fails=0,lockedUntil=0;
 function b64d(s){var b=atob(s),u=new Uint8Array(b.length);for(var i=0;i<b.length;i++)u[i]=b.charCodeAt(i);return u}
 function b64e(u){var s='',n=0x8000;for(var i=0;i<u.length;i+=n)s+=String.fromCharCode.apply(null,u.subarray(i,i+n));return btoa(s)}
 function st(){try{return P.ss!==0?localStorage:sessionStorage}catch(e){return null}}
 function getS(){var r=null;try{r=localStorage.getItem(KEY)}catch(e){}if(!r){try{r=sessionStorage.getItem(KEY)}catch(e){}}return r}
 function clr(){try{localStorage.removeItem(KEY)}catch(e){}try{sessionStorage.removeItem(KEY)}catch(e){}}
 function dec2(raw){return crypto.subtle.importKey('raw',raw,'AES-GCM',false,['decrypt']).then(function(k){return crypto.subtle.decrypt({name:'AES-GCM',iv:b64d(P.iv)},k,b64d(P.c))}).then(function(pt){return dec.decode(pt)})}
 function derive(pw){return crypto.subtle.importKey('raw',enc.encode(String(pw).normalize('NFKC')),'PBKDF2',false,['deriveBits']).then(function(km){return crypto.subtle.deriveBits({name:'PBKDF2',salt:b64d(P.s),iterations:P.it,hash:'SHA-256'},km,256)}).then(function(b){return new Uint8Array(b)})}
 function openSite(html,raw,remember){if(remember){var s=st();if(s){try{s.setItem(KEY,JSON.stringify({k:b64e(raw),e:P.ss>0?Date.now()+P.ss:0}))}catch(e){}}}document.open();document.write(html);document.close()}
 function ready(fn){if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',fn);else fn()}
 function show(){document.documentElement.classList.remove('mzpw-boot')}
 function bind(){
  var form=document.querySelector('form[data-mzpw]');if(!form){show();return}
  var inp=form.querySelector('input[name=pw]'),go=form.querySelector('.mzpw-go'),err=form.querySelector('.mzpw-err'),eye=form.querySelector('.mzpw-eye'),lab=go.textContent;
  function say(t){if(err){err.textContent=t;err.hidden=!t}}
  if(!(window.crypto&&crypto.subtle)){say(form.dataset.secure||'Butuh koneksi aman (https).');go.disabled=true;return}
  if(eye)eye.addEventListener('click',function(){var on=inp.type==='password';inp.type=on?'text':'password';eye.setAttribute('aria-pressed',on?'true':'false');eye.setAttribute('aria-label',on?'Sembunyikan password':'Tampilkan password');inp.focus()});
  form.addEventListener('submit',function(e){e.preventDefault();var pw=inp.value;if(!pw||go.disabled)return;
   if(Date.now()<lockedUntil){say(form.dataset.wait||'Coba lagi sebentar lagi.');return}
   go.disabled=true;go.textContent=form.dataset.busy||'…';say('');
   derive(pw).then(function(raw){return dec2(raw).then(function(html){openSite(html,raw,true)})}).catch(function(){
    fails++;if(fails>=5)lockedUntil=Date.now()+Math.min(60000,1000*Math.pow(2,fails-4));
    say(form.dataset.err||'Password salah.');form.classList.remove('is-shake');void form.offsetWidth;form.classList.add('is-shake');go.disabled=false;go.textContent=lab;inp.focus();inp.select&&inp.select()})});
  show();if(inp&&!('ontouchstart' in window))try{inp.focus()}catch(e){}}
 /* sesi tersimpan? buka langsung tanpa meminta password */
 ready(function boot(){
  var raw=getS(),s=null;if(raw){try{s=JSON.parse(raw)}catch(e){s=null}}
  if(s&&s.k&&(!s.e||s.e>Date.now())&&window.crypto&&crypto.subtle){var kb=b64d(s.k);dec2(kb).then(function(html){openSite(html,kb,false)}).catch(function(){clr();bind()});return}
  if(s)clr();bind()});
}

/* ---------- layar kunci bawaan (bisa diedit bebas seperti halaman biasa) ---------- */
ACT['mzpw-add']=function(){
 var existing=null;(S.doc.pages||[]).forEach(function(p){if(!existing&&isLockPage(p))existing=p});
 if(existing){S.pageId=existing.id;var g=gateIn(existing);S.sel=g?{k:'el',id:g.id}:null;renderAll();toast('Layar kunci sudah ada. Pilih elemen Password Gate untuk mengatur password.',4500);return}
 commit(discrete());
 var page=JSON.parse(JSON.stringify(S.doc.pages[0]));page.id=uid('pw');page.name='\ud83d\udd12 Layar Kunci';page.slug='layar-kunci';page.isLock=true;
 var sec=JSON.parse(JSON.stringify(page.sections[0]));sec.id=uid('sec');sec.h=720;delete sec.hb;sec.bg={type:'color',color:'tok:soft'};sec.elements=[];if(sec.name)sec.name='Layar Kunci';
 sec.hb={m:660};
 function add(type,geo,patch,m){var e=newEl(type,geo);if(patch)patch(e);if(m){e.bp=e.bp||{};e.bp.m=m}sec.elements.push(e);return e}
 add('caption',{x:300,y:176,w:600,h:30},function(e){e.text='WE ARE GETTING MARRIED';e.st.fs=13;e.st.ls=4;e.st.align='center';e.st.color='tok:muted'},{x:20,y:150,w:335,h:24,fs:11});
 add('heading',{x:150,y:216,w:900,h:120},function(e){e.text='Anna & Tom';e.st.fs=76;e.st.align='center';e.st.ff='$head'},{x:20,y:186,w:335,h:90,fs:48});
 add('caption',{x:300,y:346,w:600,h:30},function(e){e.text='14 Juni 2027';e.st.fs=17;e.st.align='center'},{x:20,y:288,w:335,h:26,fs:15});
 add('paragraph',{x:320,y:402,w:560,h:64},function(e){e.text='Website ini dilindungi. Masukkan password yang tertera di undangan untuk melanjutkan.';e.st.fs=16;e.st.align='center';e.st.lh=1.6},{x:30,y:338,w:315,h:88,fs:15});
 var gate=add('passgate',{x:330,y:500,w:540,h:60},null,{x:20,y:456,w:335,h:128});
 page.sections=[sec];S.doc.pages.push(page);S.pageId=page.id;S.sel={k:'el',id:gate.id};
 renderAll();try{scheduleSave()}catch(_){}toast('Layar kunci dibuat. Edit tampilannya bebas, lalu isi password di panel kanan.',5500)};

/* ---------- preview alur kunci (enkripsi sungguhan, isi = website saat ini) ---------- */
ACT['mzpw-preview']=async function(){
 try{
  var li=lockInfo(S.doc);if(!li||!li.el){toast('Belum ada layar kunci.');return}
  var c=cfgOf(li.el);if(!c.on){toast('Aktifkan proteksi dulu.');return}
  var pre=prepare(S.doc,{preview:true});toast('Membuat preview terenkripsi…',2500);var html=await finish(pre);
  previewModal('Preview layar kunci \u00b7 coba masukkan password',html,'<button class="btn" data-a="mclose">Tutup</button>')
 }catch(e){toast('Preview gagal: '+(e&&e.message||e),6000)}};
ACT['mzpw-gen']=function(){var el=T('el');if(!el||el.type!=='passgate')return;var A='ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789',b=new Uint8Array(12);crypto.getRandomValues(b);
 var s='';for(var i=0;i<12;i++){s+=A[b[i]%A.length];if(i%4===3&&i<11)s+='-'}
 commit(discrete());el.pw=el.pw||{};el.pw.password=s;renderCanvas();renderRight();toast('Password acak dibuat. Catat dan bagikan ke tamu.',4500)};

/* ---------- panel pengaturan ---------- */
function strength(pw){pw=String(pw||'');if(!pw)return{t:'Belum diisi',c:'#b42318'};var cs=0;if(/[a-z]/.test(pw))cs+=26;if(/[A-Z]/.test(pw))cs+=26;if(/\d/.test(pw))cs+=10;if(/[^A-Za-z0-9]/.test(pw))cs+=20;
 var bits=Math.round(pw.length*Math.log2(Math.max(2,cs)));return bits<36?{t:'Lemah ('+bits+' bit) \u2013 mudah ditebak',c:'#b42318'}:bits<56?{t:'Sedang ('+bits+' bit)',c:'#b45309'}:{t:'Kuat ('+bits+' bit)',c:'#166534'}}
function panel(el){
 var c=cfgOf(el),p='pw.',sg=strength(c.password);
 var A=GRP('mzpw-main','\ud83d\udd12 Password Gate \u00b7 Proteksi',
  '<div class="hint">Halaman yang berisi Password Gate = <b>layar kunci</b>. Saat Publish/Export, seluruh website lain <b>dienkripsi</b> dan hanya terbuka dengan password. Berlaku di hosting mana pun (butuh https). Password tersimpan di project ini, <b>bukan</b> di file hasil publish.</div>'
  +CB('Aktifkan proteksi password','el',p+'on',{rp:1})
  +X('Password','el',p+'password',{ph:'minimal 6 karakter'})
  +'<div class="hint" style="color:'+sg.c+'">'+esc(sg.t)+'</div>'
  +'<div class="row" style="margin:4px 0 6px"><button type="button" class="btn sm" data-a="mzpw-gen">Buat password acak</button><button type="button" class="btn sm" data-a="mzpw-preview">Preview layar kunci</button></div>'
  +SEL('Sesi login pengunjung','el',p+'session',[['tab','Sampai tab ditutup'],['1h','1 jam'],['12h','12 jam'],['1d','1 hari'],['7d','7 hari'],['30d','30 hari'],['forever','Selamanya (sampai data browser dihapus)']])
  +'<div class="hint">Sesi = berapa lama pengunjung TETAP MASUK di perangkatnya setelah memasukkan password. Ini bukan umur website: password tetap berlaku selamanya. Setelah sesi habis, pengunjung diminta password lagi. Password kuat (10+ karakter, campur huruf &amp; angka) sangat disarankan: tanpa server, file terenkripsi bisa dicoba ditebak offline.</div>');
 var B=GRP('mzpw-txt','\ud83d\udcdd Password Gate \u00b7 Teks',
  X('Placeholder','el',p+'placeholder')+X('Teks tombol','el',p+'btn')+X('Pesan password salah','el',p+'err')+X('Teks saat memeriksa','el',p+'busy')
  +X('Pesan terlalu banyak percobaan','el',p+'wait')+X('Pesan butuh https','el',p+'secure')+CB('Tombol tampil/sembunyikan password','el',p+'showToggle',{rp:1}),false);
 var C=GRP('mzpw-look','\ud83c\udfa8 Password Gate \u00b7 Tampilan',
  SEL('Susunan','el',p+'layout',[['inline','Kolom + tombol sebaris'],['stack','Kolom di atas tombol']],{rp:1})+CB('Tampilkan contoh pesan error di canvas','el',p+'previewErr',{rp:1})
  +N('Ukuran huruf (px)','el',p+'fs',{min:10,max:30})+N('Sudut (px)','el',p+'radius',{min:0,max:40})+N('Jarak kolom-tombol (px)','el',p+'gap',{min:0,max:30})
  +CL('Latar kolom','el',p+'cIn')+CL('Garis kolom','el',p+'cInBd')+CL('Teks isian','el',p+'cInTx')+CL('Warna placeholder &amp; ikon','el',p+'cPh')
  +CL('Warna tombol','el',p+'cBtn')+CL('Teks tombol','el',p+'cBtnTx')+CL('Warna pesan error','el',p+'cErr')
  +'<div class="hint">Latar, judul, nama pasangan, tanggal, dan pesan sambutan: edit langsung di halaman Layar Kunci seperti halaman biasa (hapus elemen tanggal bila tidak ingin menampilkannya).</div>',false);
 return A+B+C}
if(typeof tabElements==='function'){var oldTab=tabElements;tabElements=function(){var h=oldTab.apply(this,arguments);
 return h.replace('<h3>Elements</h3>','<h3>Elements</h3><div class="at-v14-launch"><b>\ud83d\udd12 Password Gate</b><span>Kunci website dengan password. Layar kunci bisa kamu desain sendiri.</span><div class="at-v14-tiles"><button type="button" class="btn sm pri" data-a="mzpw-add">+ Buat layar kunci</button></div></div>')}}
if(typeof elPanel==='function'){var oldPanel=elPanel;elPanel=function(){var el=T('el'),h=oldPanel.apply(this,arguments);if(!el||el.type!=='passgate')return h;
 return h.replace(/^(<div class="rhead">[\s\S]*?<\/div>)/,function(m){return m+panel(el)})}}
if(typeof renderRight==='function'){var prevRight=renderRight;renderRight=function(){var r=prevRight.apply(this,arguments);
 try{var root=document.getElementById('right'),a=root&&root.querySelector('.d-prop-actions');
  if(a){var ref=a;[].slice.call(root.querySelectorAll('[data-g^="mzpw"]')).forEach(function(x){ref.insertAdjacentElement('afterend',x);ref=x})}}catch(_){}
 return r}}

window.MozaPassgate={version:'14.8.31',prepare:prepare,finish:finish,isLockPage:isLockPage,lockInfo:lockInfo,cfgOf:cfgOf,iterations:IT};
console.info('[Moza V14.8.31] Password Gate installed');
})();
