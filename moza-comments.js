/* Moza Studio V14.8.26 - Comments / Ucapan & Doa element.
 * Elemen baru "Ucapan & Doa": form + daftar komentar yang LANGSUNG tampil di website.
 * Penyimpanan: Google Sheets lewat Apps Script (Code.gs) - sama seperti RSVP manual.
 *  - kirim  : POST (no-cors) action "comment_add"
 *  - tampil : GET JSONP action "comments" (tanpa CORS, aman untuk situs statis)
 * Additive: proyek lama tidak berubah. Editor menampilkan contoh komentar agar mudah didesain;
 * komentar asli muncul di Preview / HTML yang di-export. */
(function(){
'use strict';
if(window.MozaComments||typeof elHTML!=='function'||typeof siteHTML!=='function'||typeof TDEF==='undefined')return;

/* ---------------- defaults ---------------- */
var DEF={
 link:'rsvp',rsvpForm:'auto',withRsvp:false,sbUrl:'',sbKey:'',endpoint:'',tab:'Comments',moderation:'auto',pageSize:6,maxMsg:300,refresh:60,
 title:'Ucapan & Doa',subtitle:'Kirimkan ucapan dan doa terbaik untuk kami',
 nameLabel:'Nama',namePh:'Nama kamu',msgLabel:'Ucapan',msgPh:'Tulis ucapan & doa…',
 attendOn:false,attendLabel:'Kehadiran',attendOpts:'Hadir, Tidak hadir, Masih ragu',
 btn:'Kirim Ucapan',sending:'Mengirim…',
 ok:'Terima kasih! Ucapanmu sudah terkirim.',okPending:'Terima kasih! Ucapanmu akan tampil setelah disetujui.',
 err:'Gagal mengirim. Periksa koneksi lalu coba lagi.',reqName:'Nama wajib diisi.',reqMsg:'Ucapan wajib diisi.',wait:'Tunggu sebentar sebelum mengirim lagi.',
 empty:'Belum ada ucapan. Jadilah yang pertama!',loading:'Memuat ucapan…',loadErr:'Ucapan belum bisa dimuat.',notConfigured:'Ucapan belum dihubungkan ke Google Sheets.',loadMore:'Muat lebih banyak',
 showForm:true,formPos:'top',showAvatar:true,showTime:true,
 fs:15,radius:14,gap:12,
 cCard:'#ffffff',cBorder:'#e6e8ee',cText:'#2b3142',cName:'#1c2027',cMuted:'#8a92a6',cAccent:'tok:primary',cBtnText:'#ffffff',cInBg:'#ffffff',cInBorder:'#d6dae3'
};
function num(v,min,max,d){v=Number(v);return isFinite(v)?Math.min(max,Math.max(min,v)):d}
function cfgOf(el){var c=el&&el.cm&&typeof el.cm==='object'?el.cm:{};var o={};for(var k in DEF)o[k]=c[k]===undefined?DEF[k]:c[k];
 o.pageSize=num(o.pageSize,1,50,6);o.maxMsg=num(o.maxMsg,40,1000,300);o.refresh=num(o.refresh,0,3600,60);o.fs=num(o.fs,10,28,15);o.radius=num(o.radius,0,40,14);o.gap=num(o.gap,0,40,12);
 if(c.link===undefined&&c.endpoint)o.link='custom';o.link=['rsvp','custom','supabase','supabase_sheet'].indexOf(o.link)>=0?o.link:'rsvp';o.moderation=o.moderation==='manual'?'manual':'auto';o.formPos=o.formPos==='bottom'?'bottom':'top';return o}

/* ---------------- pure helpers (also stringified into the published runtime) ---------------- */
function cmEsc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
function cmAgo(t){var d=new Date(Number(t)||t);var ms=Date.now()-d.getTime();if(!isFinite(ms))return '';if(ms<0)ms=0;var s=Math.floor(ms/1000);
 if(s<45)return 'baru saja';var m=Math.floor(s/60);if(m<60)return m+' menit lalu';var h=Math.floor(m/60);if(h<24)return h+' jam lalu';var dd=Math.floor(h/24);if(dd<7)return dd+' hari lalu';
 var mon=['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'];return d.getDate()+' '+mon[d.getMonth()]+' '+d.getFullYear()}
function cmCard(c,o){var ini=String(c.n||'?').trim().charAt(0).toUpperCase()||'?';
 return '<article class="mzcm-card" role="listitem"><div class="mzcm-av"'+(o.avatar?'':' hidden')+' aria-hidden="true">'+o.esc(ini)+'</div><div class="mzcm-body"><div class="mzcm-top"><b class="mzcm-name">'+o.esc(c.n)+'</b>'+(c.a?'<span class="mzcm-badge">'+o.esc(c.a)+'</span>':'')+(o.time&&c.t?'<time class="mzcm-time">'+o.esc(o.ago(c.t))+'</time>':'')+'</div><p class="mzcm-msg">'+o.esc(c.m)+'</p></div></article>'}

/* ---------------- runtime (published + Preview). Self-contained. ---------------- */
function cmRuntime(esc,ago,card){
 var roots=[].slice.call(document.querySelectorAll('[data-mzcm]'));if(!roots.length)return;
 function store(k,v){try{if(v===undefined)return localStorage.getItem(k);localStorage.setItem(k,v)}catch(e){return null}}
 function jsonp(url,params,cb){
  var name='__mzcm'+Date.now().toString(36)+Math.floor(Math.random()*1e6).toString(36),s=document.createElement('script'),done=false;
  function end(){if(done)return false;done=true;clearTimeout(timer);try{delete window[name]}catch(e){window[name]=undefined}if(s.parentNode)s.parentNode.removeChild(s);return true}
  var timer=setTimeout(function(){if(end())cb(new Error('timeout'))},14000);
  window[name]=function(d){if(end())cb(null,d)};s.onerror=function(){if(end())cb(new Error('network'))};
  var q=[];for(var k in params)q.push(encodeURIComponent(k)+'='+encodeURIComponent(params[k]));q.push('callback='+name);
  s.src=url+(url.indexOf('?')<0?'?':'&')+q.join('&');document.head.appendChild(s)}
 roots.forEach(function(root){
  var cfg;try{cfg=JSON.parse(root.getAttribute('data-mzcm'))}catch(e){return}
  var list=root.querySelector('.mzcm-list'),form=root.querySelector('.mzcm-form'),more=root.querySelector('.mzcm-more');
  var items=[],total=0,busy=false,sending=false,loaded=false,opt={esc:esc,ago:ago,avatar:cfg.showAvatar,time:cfg.showTime},SB=cfg.sb||null;
  function note(t,cls){list.innerHTML='<div class="mzcm-note'+(cls?' '+cls:'')+'">'+esc(t)+'</div>';if(more)more.hidden=true}
  function render(){
   if(!items.length){note(loaded?cfg.empty:cfg.loading);return}
   list.innerHTML=items.map(function(c){return card(c,opt)}).join('');
   if(more)more.hidden=!(total>items.length)}
  function ids(){var m={};items.forEach(function(c){m[c.id]=1});return m}
  function sbHead(extra){var h={apikey:SB.key,Authorization:'Bearer '+SB.key};for(var k in extra)h[k]=extra[k];return h}
  /* satu halaman data: Supabase (REST/RLS) atau Google Apps Script (JSONP) */
  function fetchPage(offset,cb){
   if(SB){
    var q='select=client_id,id,name,message,attendance,created_at&site_key=eq.'+encodeURIComponent(SB.site||'')+'&channel=eq.'+encodeURIComponent(cfg.tab)+'&status=eq.approved&order=created_at.desc&limit='+(cfg.pageSize+1)+'&offset='+offset;
    fetch(SB.url+'/rest/v1/wsp_comments?'+q,{headers:sbHead(),cache:'no-store'})
     .then(function(r){if(!r.ok){var e=new Error('http '+r.status);e.status=r.status;throw e}return r.json()})
     .then(function(rows){rows=Array.isArray(rows)?rows:[];var more=rows.length>cfg.pageSize;rows=rows.slice(0,cfg.pageSize);
      cb(null,{ok:true,total:offset+rows.length+(more?1:0),items:rows.map(function(r){return{id:String(r.client_id||r.id),n:r.name,m:r.message,a:r.attendance||'',t:Date.parse(r.created_at)||0}})})})
     .catch(function(e){cb(e)});return}
   var qp={action:'comments',tab:cfg.tab,limit:cfg.pageSize,offset:offset};if(cfg.rsvpTab)qp.rsvp_tab=cfg.rsvpTab;
   jsonp(cfg.endpoint,qp,cb)}
  function load(offset,append){
   if(!cfg.endpoint&&!SB){loaded=true;note(cfg.notConfigured,'mzcm-warn');return}
   if(busy)return;busy=true;
   fetchPage(offset||0,function(err,d){
    busy=false;
    if(err&&SB&&(err.status===404||err.status===401)&&!items.length){root.style.display='none';return}   /* tabel belum dibuat => tidak tampil */
    if(err||!d||d.ok===false){if(!items.length){loaded=true;note(cfg.loadErr,'mzcm-warn')}return}
    loaded=true;var got=Array.isArray(d.items)?d.items:[];total=Number(d.total)||got.length;
    if(append){var have=ids();got.forEach(function(c){if(!have[c.id])items.push(c)})}
    else{var seen={};got.forEach(function(c){seen[c.id]=1});
     var local=items.filter(function(c){return c.local&&!seen[c.id]});
     var olderLoaded=items.filter(function(c){return !c.local&&!seen[c.id]&&items.indexOf(c)>=cfg.pageSize});
     items=local.concat(got,olderLoaded);if(local.length)total+=local.length}
    render()})}
  if(more)more.addEventListener('click',function(){load(items.filter(function(c){return !c.local}).length,true)});
  note(cfg.loading);load(0,false);
  if(cfg.refresh>0)setInterval(function(){if(!document.hidden&&!sending)load(0,false)},cfg.refresh*1000);
  if(!form)return;
  var nameI=form.querySelector('[name=name]'),msgI=form.querySelector('[name=message]'),attI=form.querySelector('[name=attendance]'),hp=form.querySelector('[name=contact_website]'),
   btn=form.querySelector('.mzcm-send'),st=form.querySelector('.mzcm-status'),cnt=form.querySelector('.mzcm-count');
  var saved=store('mzcm_name');if(saved&&nameI&&!nameI.value)nameI.value=saved;
  function status(t,kind){if(st){st.textContent=t||'';st.className='mzcm-status'+(kind?' is-'+kind:'')}}
  function count(){if(cnt&&msgI)cnt.textContent=msgI.value.length+'/'+cfg.maxMsg}
  if(msgI){msgI.addEventListener('input',count);count()}
  function gasPost(payload){return fetch(cfg.endpoint||cfg.mirror,{method:'POST',mode:'no-cors',headers:{'Content-Type':'text/plain;charset=UTF-8'},body:JSON.stringify(payload),credentials:'omit',redirect:'follow'})}
  function send(payload){
   if(!SB)return gasPost(payload);
   return fetch(SB.url+'/rest/v1/wsp_comments',{method:'POST',headers:sbHead({'Content-Type':'application/json',Prefer:'return=minimal'}),
     body:JSON.stringify({client_id:payload.request_id,site_key:SB.site||'',channel:cfg.tab,name:payload.name,message:payload.message,attendance:payload.attendance||''})})
    .then(function(r){if(!r.ok&&r.status!==409)throw new Error('http '+r.status)})
    .then(function(){if(cfg.mirror){try{gasPost(payload).catch(function(){})}catch(e){}}})}   /* Supabase + Google Sheets: salinan ke Sheet */
  form.addEventListener('submit',function(e){
   e.preventDefault();if(sending)return;
   var n=(nameI.value||'').trim(),m=(msgI.value||'').trim();
   if(!n){status(cfg.reqName,'err');nameI.focus();return}
   if(!m){status(cfg.reqMsg,'err');msgI.focus();return}
   if(hp&&hp.value){status(cfg.ok,'ok');form.reset();return}
   var last=Number(store('mzcm_last'))||0;if(Date.now()-last<20000){status(cfg.wait,'err');return}
   if(!cfg.endpoint&&!SB){status(cfg.notConfigured,'err');return}
   var id='c'+Date.now().toString(36)+Math.random().toString(36).slice(2,10),att=attI?attI.value:'';
   var payload={action:'comment_add',request_id:id,tab_name:cfg.tab,name:n.slice(0,60),message:m.slice(0,cfg.maxMsg),attendance:att,project_id:cfg.pid||'',submitted_at:new Date().toISOString(),contact_website:''};
   sending=true;if(btn)btn.disabled=true;status(cfg.sending,'');
   send(payload)
   .then(function(){
    store('mzcm_last',String(Date.now()));store('mzcm_name',n);
    if(cfg.moderation==='manual'){status(cfg.okPending,'ok')}
    else{status(cfg.ok,'ok');items.unshift({id:id,n:n,m:m,a:att,t:Date.now(),local:true});total++;loaded=true;render()}
    msgI.value='';count();setTimeout(function(){load(0,false)},2800)})
   .catch(function(){status(cfg.err,'err')})
   .then(function(){sending=false;if(btn)btn.disabled=false})});
 })}

/* ---------------- koneksi: ikut RSVP (otomatis) ---------------- */
function rsvpForms(){var out=[];
 try{(S.doc.pages||[]).forEach(function(p){(p.sections||[]).forEach(function(s){walkEls(s.elements||[],function(e){
  if(!e||e.type!=='form')return;
  var url=String((e.rsvp&&e.rsvp.manualUrl)||(e.at322&&e.at322.manualUrl)||'').trim();if(!url)return;
  var tab=String((e.rsvp&&e.rsvp.manualTab)||(e.at322&&(e.at322.manualTab||e.at322.tab))||'RSVP').trim()||'RSVP';
  out.push({id:e.id,name:String(e.name||(e.at322&&e.at322.name)||'RSVP'),url:url,tab:tab})})})})}catch(_){}
 return out}
function sbBase(c){var d=(typeof ATWSP!=='undefined'&&ATWSP)||{};return{url:String(c.sbUrl||d.url||'').trim().replace(/\/+$/,''),key:String(c.sbKey||d.key||'').trim()}}
function resolve(c){
 if(c.link==='supabase'||c.link==='supabase_sheet'){
  var b=sbBase(c),mirror='',f=rsvpForms();
  if(c.link==='supabase_sheet'){mirror=String(c.endpoint||'').trim()||(f[0]?f[0].url:'')}
  var ok=!!(b.url&&b.key);return{mode:'sb',ok:ok,url:'',sb:ok?b:null,mirror:mirror,rsvpTab:'',forms:f}}
 if(c.link==='custom'){var u=String(c.endpoint||'').trim();return{mode:'gas',ok:!!u,url:u,rsvpTab:'',forms:rsvpForms()}}
 var fs=rsvpForms(),pick=null;
 if(c.rsvpForm&&c.rsvpForm!=='auto')pick=fs.filter(function(x){return x.id===c.rsvpForm})[0]||null;
 pick=pick||fs[0];
 return pick?{mode:'gas',ok:true,url:pick.url,rsvpTab:c.withRsvp?pick.tab:'',name:pick.name,tab:pick.tab,forms:fs}:{mode:'gas',ok:false,url:'',rsvpTab:'',forms:fs}}

/* ---------------- markup ---------------- */
function vars(c){
 return '--cm-card:'+col(c.cCard)+';--cm-border:'+col(c.cBorder)+';--cm-text:'+col(c.cText)+';--cm-name:'+col(c.cName)+';--cm-muted:'+col(c.cMuted)+';--cm-accent:'+col(c.cAccent)+';--cm-btntext:'+col(c.cBtnText)+';--cm-inbg:'+col(c.cInBg)+';--cm-inborder:'+col(c.cInBorder)+';--cm-radius:'+c.radius+'px;--cm-gap:'+c.gap+'px;--cm-fs:'+c.fs+'px'}
function demo(){var n=Date.now();return[
 {n:'Rina & Dimas',m:'Selamat menempuh hidup baru! Semoga sakinah, mawaddah, warahmah.',a:'Hadir',t:n-4*60000},
 {n:'Keluarga Pak Hendra',m:'Barakallahu lakuma wa baraka alaikuma. Bahagia selalu ya!',a:'Hadir',t:n-3*3600000},
 {n:'Sinta',m:'Maaf belum bisa hadir, doa terbaik untuk kalian berdua.',a:'Tidak hadir',t:n-26*3600000}]}
function shell(el,edit){
 var c=cfgOf(el),rs=resolve(c);if(!edit&&!rs.ok)return '';
 var site=(typeof S!=='undefined'&&S.pid)?String(S.pid):'';
 var pub={endpoint:rs.url,mirror:rs.mirror||'',sb:rs.sb?{url:rs.sb.url,key:rs.sb.key,site:site}:null,rsvpTab:rs.rsvpTab||'',tab:c.tab,pageSize:c.pageSize,maxMsg:c.maxMsg,refresh:c.refresh,moderation:c.moderation,showAvatar:!!c.showAvatar,showTime:!!c.showTime,
  ok:c.ok,okPending:c.okPending,err:c.err,reqName:c.reqName,reqMsg:c.reqMsg,wait:c.wait,empty:c.empty,loading:c.loading,loadErr:c.loadErr,notConfigured:c.notConfigured,pid:(typeof S!=='undefined'&&S.pid)?String(S.pid):''};
 var attr=edit?' data-mzcm-edit="1"':" data-mzcm='"+String(JSON.stringify(pub)).replace(/&/g,'&amp;').replace(/'/g,'&#39;')+"'";
 var opts=String(c.attendOpts||'').split(',').map(function(x){return x.trim()}).filter(Boolean);
 var head=(c.title||c.subtitle)?'<div class="mzcm-head">'+(c.title?'<h3 class="mzcm-title">'+cmEsc(c.title)+'</h3>':'')+(c.subtitle?'<p class="mzcm-sub">'+cmEsc(c.subtitle)+'</p>':'')+'</div>':'';
 var form=c.showForm?'<form class="mzcm-form" novalidate autocomplete="off"><label class="mzcm-lb"><span>'+cmEsc(c.nameLabel)+'</span><input type="text" name="name" maxlength="60" placeholder="'+cmEsc(c.namePh)+'"'+(edit?' tabindex="-1"':'')+'></label>'
  +(c.attendOn&&opts.length?'<label class="mzcm-lb"><span>'+cmEsc(c.attendLabel)+'</span><select name="attendance"'+(edit?' tabindex="-1"':'')+'>'+opts.map(function(o){return '<option>'+cmEsc(o)+'</option>'}).join('')+'</select></label>':'')
  +'<label class="mzcm-lb"><span>'+cmEsc(c.msgLabel)+'</span><textarea name="message" rows="3" maxlength="'+c.maxMsg+'" placeholder="'+cmEsc(c.msgPh)+'"'+(edit?' tabindex="-1"':'')+'></textarea></label>'
  +'<input type="text" name="contact_website" class="mzcm-hp" tabindex="-1" autocomplete="off" aria-hidden="true">'
  +'<div class="mzcm-row"><button type="submit" class="mzcm-send"'+(edit?' tabindex="-1"':'')+'>'+cmEsc(c.btn)+'</button><span class="mzcm-count">0/'+c.maxMsg+'</span></div><div class="mzcm-status" role="status" aria-live="polite"></div></form>':'';
 var o={esc:cmEsc,ago:cmAgo,avatar:!!c.showAvatar,time:!!c.showTime};
 var list='<div class="mzcm-list" role="list" aria-live="polite">'+(edit?demo().map(function(x){return cmCard(x,o)}).join('')+'<div class="mzcm-note mzcm-demo">'+(rs.ok?'Contoh tampilan. Ucapan asli muncul di Preview &amp; website.':'Belum terhubung \u2192 kolom ini tidak tampil di website.')+'</div>':'')+'</div>';
 return '<div class="mzcm" data-fp="'+c.formPos+'" style="'+vars(c)+'"'+attr+'>'+head+form+list+(edit?'':'<button type="button" class="mzcm-more" hidden>'+cmEsc(c.loadMore)+'</button>')+'</div>'}

/* ---------------- CSS (sitecss = editor + Preview + published) ---------------- */
var CSS='\n/* MOZA_COMMENTS_V14826 */\n'
+'.mzcm{box-sizing:border-box;width:100%;height:100%;display:flex;flex-direction:column;gap:var(--cm-gap,12px);color:var(--cm-text,#2b3142);font-size:var(--cm-fs,15px);line-height:1.45;overflow:hidden;text-align:left}\n'
+'.mzcm *{box-sizing:border-box;font-family:inherit}\n'
+'.mzcm-head{flex:none;order:0}.mzcm-title{margin:0 0 4px;font-size:1.4em;line-height:1.2;font-weight:700;color:var(--cm-name)}.mzcm-sub{margin:0;color:var(--cm-muted);font-size:.92em}\n'
+'.mzcm-form{flex:none;order:1;display:flex;flex-direction:column;gap:8px;padding:12px;background:var(--cm-card);border:1px solid var(--cm-border);border-radius:var(--cm-radius)}\n'
+'.mzcm[data-fp="bottom"] .mzcm-form{order:3}\n'
+'.mzcm-lb{display:flex;flex-direction:column;gap:4px;font-size:.82em;font-weight:600;color:var(--cm-muted)}\n'
+'.mzcm input[type=text],.mzcm select,.mzcm textarea{width:100%;font:inherit;font-size:1em;font-weight:400;color:var(--cm-text);background:var(--cm-inbg);border:1px solid var(--cm-inborder);border-radius:calc(var(--cm-radius)*.65);padding:9px 11px;outline:0}\n'
+'.mzcm textarea{resize:none;min-height:70px}.mzcm input:focus,.mzcm select:focus,.mzcm textarea:focus{border-color:var(--cm-accent);box-shadow:0 0 0 3px color-mix(in srgb,var(--cm-accent) 22%,transparent)}\n'
+'.mzcm .mzcm-hp{position:absolute!important;left:-9999px!important;width:1px!important;height:1px!important;opacity:0!important;pointer-events:none!important}\n'
+'.mzcm-row{display:flex;align-items:center;gap:10px}.mzcm-count{margin-left:auto;font-size:.78em;color:var(--cm-muted)}\n'
+'.mzcm-send{cursor:pointer;border:0;border-radius:calc(var(--cm-radius)*.65);padding:10px 18px;font:inherit;font-weight:700;color:var(--cm-btntext);background:var(--cm-accent)}\n'
+'.mzcm-send:disabled{opacity:.6;cursor:progress}.mzcm-send:hover:not(:disabled){filter:brightness(1.07)}\n'
+'.mzcm-status{min-height:1.2em;font-size:.84em}.mzcm-status.is-ok{color:#166534}.mzcm-status.is-err{color:#b42318}\n'
+'.mzcm-list{flex:1 1 auto;min-height:0;order:2;overflow-y:auto;display:flex;flex-direction:column;gap:var(--cm-gap);padding-right:2px;scrollbar-width:thin;overscroll-behavior:contain}\n'
+'.mzcm-card{flex:none;display:flex;gap:11px;padding:12px;background:var(--cm-card);border:1px solid var(--cm-border);border-radius:var(--cm-radius)}\n'
+'.mzcm-av{flex:none;width:38px;height:38px;border-radius:50%;display:grid;place-items:center;font-weight:700;color:var(--cm-btntext);background:var(--cm-accent)}.mzcm-av[hidden]{display:none}\n'
+'.mzcm-body{min-width:0;flex:1}.mzcm-top{display:flex;flex-wrap:wrap;align-items:center;gap:4px 8px}\n'
+'.mzcm-name{color:var(--cm-name);font-weight:700;overflow-wrap:anywhere}.mzcm-badge{font-size:.72em;font-weight:700;padding:2px 8px;border-radius:999px;color:var(--cm-accent);background:color-mix(in srgb,var(--cm-accent) 14%,transparent)}\n'
+'.mzcm-time{margin-left:auto;font-size:.76em;color:var(--cm-muted)}.mzcm-msg{margin:4px 0 0;white-space:pre-wrap;overflow-wrap:anywhere;color:var(--cm-text)}\n'
+'.mzcm-note{flex:none;text-align:center;padding:14px;color:var(--cm-muted);font-size:.9em}.mzcm-warn{color:#b45309}\n'
+'.mzcm-more{flex:none;order:2;align-self:center;cursor:pointer;border:1px solid var(--cm-border);background:var(--cm-card);color:var(--cm-name);border-radius:999px;padding:8px 18px;font:inherit;font-weight:600}.mzcm-more[hidden]{display:none}\n'
+'[data-mzcm-edit],[data-mzcm-edit] *{pointer-events:none!important;user-select:none}\n';
var st=document.getElementById('sitecss');
if(st&&!st.textContent.includes('MOZA_COMMENTS_V14826'))st.textContent+=CSS;

/* ---------------- element registration ---------------- */
TDEF.comments={name:'Ucapan & Doa',w:520,h:640,cm:JSON.parse(JSON.stringify(DEF)),st:{fs:15,ff:'$body',color:'tok:ink',pad:0,br:0,bw:0,bg:'transparent'}};
TILEICO.comments='<path d="M4 5h16v11H9l-5 4z"/><path d="M8 9h8M8 12h5"/>';
var prevEl=elHTML;
elHTML=function(el,ctx){
 var html=prevEl.apply(this,arguments);
 if(!el||el.type!=='comments'||el.hidden||typeof html!=='string')return html;
 var key='data-id="'+el.id+'"',i=html.indexOf(key);if(i<0)return html;
 var j=html.indexOf('>',i);if(j<0)return html;
 return html.slice(0,j+1)+shell(el,!!(ctx&&ctx.edit))+html.slice(j+1)};
var prevSite=siteHTML;
siteHTML=function(){
 var html=prevSite.apply(this,arguments);
 if(typeof html!=='string'||html.indexOf('data-mzcm=')<0||html.indexOf('MOZA_COMMENTS_RT')>=0)return html;
 var js='<script>/*MOZA_COMMENTS_RT*/try{('+cmRuntime.toString()+')('+cmEsc.toString()+','+cmAgo.toString()+','+cmCard.toString()+')}catch(e){console.error("[Moza] Comments runtime failed",e)}<\/script>';
 var k=html.lastIndexOf('</body>');return k<0?html+js:html.slice(0,k)+js+html.slice(k)};

/* ---------------- editor: tile + inspector ---------------- */
if(typeof tabElements==='function'){var oldTab=tabElements;tabElements=function(){var h=oldTab.apply(this,arguments);
 return h.replace('<h3>Elements</h3>','<h3>Elements</h3><div class="at-v14-launch"><b>\ud83d\udcac Ucapan &amp; Doa</b><span>Kolom komentar yang tampil langsung di website.</span><div class="at-v14-tiles">'+tile('comments','Ucapan & Doa')+'</div></div>')}}
function panel(el){
 var c=cfgOf(el),p='cm.';
 var rs=resolve(c),forms=rs.forms||rsvpForms(),L=c.link,isSb=(L==='supabase'||L==='supabase_sheet');
 var stat;
 if(L==='rsvp')stat=rs.ok?'<div class="hint">\u2713 Terhubung ke RSVP <b>'+esc(rs.name)+'</b> (Google Sheets manual). Ucapan disimpan di spreadsheet yang sama, tab <b>'+esc(c.tab)+'</b>.</div>'
  :'<div class="hint">\u26a0 RSVP manual (Apps Script) belum diisi. Selama belum, kolom ini <b>tidak tampil</b> di website. Untuk RSVP Supabase/Wedding Space pilih sumber <b>Supabase</b> atau <b>Supabase + Google Sheets</b>.</div>';
 else if(L==='custom')stat=rs.ok?'<div class="hint">\u2713 Memakai URL Apps Script sendiri.</div>':'<div class="hint">\u26a0 URL belum diisi \u2192 kolom ini tidak tampil di website.</div>';
 else stat='<div class="hint">\u2713 Ucapan disimpan di tabel <code>wsp_comments</code> Supabase'+(L==='supabase_sheet'?(rs.mirror?' <b>dan</b> disalin ke Google Sheets (tab <b>'+esc(c.tab)+'</b>).':'. \u26a0 URL Apps Script belum ada, jadi salinan ke Sheets belum jalan.'):'.')
   +' Jalankan <b>SUPABASE_KOMENTAR_V14_8_26.sql</b> sekali di Supabase (SQL Editor). Tabel belum ada \u2192 kolom ini otomatis tidak tampil.</div>';
 var A=GRP('mzcm-conn','\ud83d\udcac Ucapan &amp; Doa \u00b7 Koneksi',
  SEL('Simpan ucapan di','el',p+'link',[['rsvp','Ikut RSVP (Google Sheets manual)'],['custom','Google Sheets \u2013 URL sendiri'],['supabase','Supabase'],['supabase_sheet','Supabase + Google Sheets']],{rp:1})+stat
  +(L==='rsvp'&&forms.length>1?SEL('Pakai RSVP','el',p+'rsvpForm',[['auto','Otomatis (yang pertama)']].concat(forms.map(function(f){return[f.id,f.name+' \u00b7 tab '+f.tab]})),{rp:1}):'')
  +((L==='custom'||L==='supabase_sheet')?X(L==='custom'?'URL Web App (/exec)':'URL Apps Script untuk salinan Sheets','el',p+'endpoint',{ph:L==='supabase_sheet'?'kosong = pakai URL RSVP manual':'https://script.google.com/macros/s/.../exec'}):'')
  +(isSb?X('Supabase URL','el',p+'sbUrl',{ph:'kosong = Wedding Space bawaan'})+X('Supabase anon / publishable key','el',p+'sbKey',{ph:'kosong = Wedding Space bawaan'}):'')
  +X('Nama tab / channel ucapan','el',p+'tab',{ph:'Comments'})
  +(L==='rsvp'?CB('Tampilkan juga pesan dari form RSVP','el',p+'withRsvp',{rp:1})+'<div class="hint">'+(c.withRsvp?'\u26a0 Kolom Message di sheet RSVP ikut tampil <b>publik</b> sebagai ucapan. Pastikan tamu tahu pesannya akan terlihat.':'Aktifkan agar pesan yang tamu tulis saat RSVP ikut jadi ucapan.')+'</div>':'')
  +SEL('Persetujuan komentar','el',p+'moderation',[['auto','Langsung tampil'],['manual','Disetujui dulu']],{rp:1})
  +'<div class="hint">Samakan dengan pengaturan server: <code>REQUIRE_APPROVAL</code> di Code.gs'+(isSb?' / tabel <code>wsp_comment_settings</code> di Supabase':'')+'. Pengaturan server yang berlaku; ini hanya mengatur pesan ke pengunjung.</div>'
  +N('Komentar per muat','el',p+'pageSize',{min:1,max:50})+N('Maks. huruf ucapan','el',p+'maxMsg',{min:40,max:1000,step:10})+N('Perbarui otomatis (detik, 0=mati)','el',p+'refresh',{min:0,max:3600,step:10}));
 var B=GRP('mzcm-txt','\ud83d\udcdd Ucapan &amp; Doa \u00b7 Teks',
  X('Judul','el',p+'title')+X('Sub-judul','el',p+'subtitle')+X('Label nama','el',p+'nameLabel')+X('Placeholder nama','el',p+'namePh')
  +X('Label ucapan','el',p+'msgLabel')+X('Placeholder ucapan','el',p+'msgPh')
  +CB('Pilihan kehadiran','el',p+'attendOn',{rp:1})+(c.attendOn?X('Label kehadiran','el',p+'attendLabel')+X('Pilihan (pisah koma)','el',p+'attendOpts'):'')
  +X('Teks tombol','el',p+'btn')+X('Pesan sukses','el',p+'ok')+X('Pesan menunggu persetujuan','el',p+'okPending')+X('Pesan gagal kirim','el',p+'err')+X('Pesan kosong','el',p+'empty')+X('Tombol muat lagi','el',p+'loadMore'),false);
 var C=GRP('mzcm-look','\ud83c\udfa8 Ucapan &amp; Doa \u00b7 Tampilan',
  CB('Tampilkan form kirim','el',p+'showForm',{rp:1})+SEL('Posisi form','el',p+'formPos',[['top','Di atas daftar'],['bottom','Di bawah daftar']])
  +CB('Avatar inisial','el',p+'showAvatar')+CB('Waktu (mis. 2 jam lalu)','el',p+'showTime')
  +N('Ukuran huruf (px)','el',p+'fs',{min:10,max:28})+N('Sudut kartu (px)','el',p+'radius',{min:0,max:40})+N('Jarak antar kartu (px)','el',p+'gap',{min:0,max:40})
  +CL('Warna kartu','el',p+'cCard')+CL('Garis kartu','el',p+'cBorder')+CL('Warna teks','el',p+'cText')+CL('Warna nama &amp; judul','el',p+'cName')+CL('Warna teks pudar','el',p+'cMuted')
  +CL('Warna aksen (tombol/avatar)','el',p+'cAccent')+CL('Teks tombol/avatar','el',p+'cBtnText')+CL('Latar kolom isian','el',p+'cInBg')+CL('Garis kolom isian','el',p+'cInBorder')
  +'<div class="hint">Tinggi elemen = bingkai; daftar ucapan bisa di-scroll di dalamnya. Ukuran/posisi per perangkat diatur seperti elemen lain.</div>',false);
 return A+B+C}
if(typeof elPanel==='function'){var oldPanel=elPanel;elPanel=function(){var el=T('el'),h=oldPanel.apply(this,arguments);
 if(!el||el.type!=='comments')return h;
 return h.replace(/^(<div class="rhead">[\s\S]*?<\/div>)/,function(m){return m+panel(el)})}}
if(typeof renderRight==='function'){var prevRight=renderRight;renderRight=function(){var r=prevRight.apply(this,arguments);
 try{var root=document.getElementById('right'),a=root&&root.querySelector('.d-prop-actions');
  if(a){var ref=a;[].slice.call(root.querySelectorAll('[data-g^="mzcm"]')).forEach(function(x){ref.insertAdjacentElement('afterend',x);ref=x})}}catch(_){}
 return r}}
window.MozaComments={version:'14.8.26',cfgOf:cfgOf,esc:cmEsc,ago:cmAgo,card:cmCard};
console.info('[Moza V14.8.26] Comments (Ucapan & Doa) installed');
})();
