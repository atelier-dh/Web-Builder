/* Moza Studio V14.8.25 — Tahap A + B: ekspor berbasis token, ZIP besar yang aman.
   Saat ekspor, gambar/video/font/musik tidak dibenamkan sebagai data: URI (base64) ke HTML.
   assetSrc() dkk. mengembalikan penanda pendek "moza-asset://<n>". Setelah HTML satu proyek selesai dibangun
   (kecil), tiap aset di-decode SATU kali, di-hash (SHA-256), lalu LANGSUNG ditulis ke penulis ZIP (Blob parts)
   sebagai satu file di assets/ dan datanya dilepas. Penanda diganti path relatif. Preview/editor/ekspor HTML
   tunggal tidak memakai jalur ini. */
(function(){
'use strict';
const TOKEN='moza-asset://';
const DATA_RE=/data:([a-z0-9.+-]+\/[a-z0-9.+-]+)(?:;charset=[^;,\s"']+)?;base64,([A-Za-z0-9+/=]+)/gi;
const THUMB='moza-thumb://',THUMB_RE=/moza-thumb:\/\/([a-zA-Z0-9_-]+)/g;
const BASE64_URI=/^data:[^,;]*(?:;[^,;]*)*;base64,[A-Za-z0-9+\/=\s]*$/i;
const TOKEN_RE=/moza-asset:\/\/(\d+)/g;
const MB=1048576;
/* Batas: yang "keras" hanya yang benar-benar dibatasi mesin (panjang string JS ~512 juta karakter, ZIP klasik 4 GB).
   Sisanya hanya peringatan (WARN_*), tidak memblokir ekspor. */
const LIMITS=window.MZX_LIMITS={
 inlineChars:250*MB,   // satu embed/HTML inline (karakter) — jaga agar replace() tidak melewati batas string JS
 pageChars:400*MB,     // HTML satu proyek setelah media dipisah (batas string JS ~512 juta)
 zipBytes:3800*MB,     // ZIP klasik maks 4 GB
 warnHtml:25*MB,       // HTML proyek besar -> lambat dibuka pengunjung
 warnZip:700*MB,       // ZIP besar -> risiko di browser HP / hosting gratis
 warnAsset:8*MB        // satu aset besar
};
const enc=new TextEncoder();
const tick=()=>new Promise(r=>setTimeout(r,0));
const fmtChars=n=>n>=MB?Math.round(n/MB)+' juta karakter':n.toLocaleString('id-ID')+' karakter';
const fmt=n=>n>=MB?(n/MB).toFixed(n>=10*MB?0:1)+' MB':Math.max(1,Math.round(n/1024))+' KB';
/* Error yang sudah ramah pengguna: tidak dibungkus ulang. */
class MZXError extends Error{constructor(m){super(m);this.name='MZXError';this.mzx=true}}
const MZX=window.MZX={
 on:false,reg:[],byKey:new Map(),byData:new Map(),shared:null,stats:null,
 ctx:{project:'',page:''},LIMITS,fmt,tick,Error:MZXError,
 /* sesi ZIP baru (dedup lintas halaman & proyek) */
 start(){this.shared={byHash:new Map(),names:new Set()};this.stats={assets:0,mediaFiles:0,mediaBytes:0,dups:0,decoded:0,largest:[]};this.reg=[];this.byKey=new Map();this.byData=new Map();this.on=false;this.ctx={project:'',page:''}},
 /* mulai membangun HTML satu proyek: token aktif */
 beginProject(name){this.reg=[];this.byKey=new Map();this.byData=new Map();this.on=true;this.ctx={project:name||'',page:''}},
 stopTokens(){this.on=false},
 abort(){this.on=false;this.reg=[];this.byKey=new Map();this.byData=new Map();this.ctx={project:'',page:''}},
 /* asset/video/font/musik -> token (hanya bila sedang ekspor dan nilainya data: URI) */
 token(kind,id,data){
  if(!this.on||typeof data!=='string'||data.slice(0,5)!=='data:')return data;
  /* Hanya data URI base64 yang valid yang dipisah jadi file. Data URI non-base64 (mis. placeholder SVG utf8) tetap inline seperti di versi lama. */
  if(!BASE64_URI.test(data))return data;
  const k=kind+':'+id;let i=this.byKey.get(k);
  if(i===undefined){i=this.reg.push({data,kind,id,label:k,page:this.ctx.page})-1;this.byKey.set(k,i)}
  return TOKEN+i;
 },
 /* data: URI di dalam teks (embed Smart Filter, HTML mentah, dll.) -> token, per elemen */
 inline(text,label,force){
  if(typeof text==='string'&&text.indexOf(THUMB)>=0)text=this.thumbs(text);
  if((!this.on&&!force)||typeof text!=='string'||text.indexOf('data:')<0)return text;
  const lim=force?LIMITS.pageChars:LIMITS.inlineChars;
  if(text.length>lim){
   const where=(this.ctx.page?' di halaman "'+this.ctx.page+'"':'')+(this.ctx.project?' (proyek "'+this.ctx.project+'")':'');
   if(force)throw new MZXError('HTML '+(label||'halaman')+' terlalu besar ('+fmtChars(text.length)+') sebelum media dipisahkan. Periksa embed/kode inline yang sangat besar, atau kurangi jumlah halaman/elemen pada proyek ini.');
   throw new MZXError('Elemen "'+(label||'tanpa nama')+'"'+where+' terlalu besar ('+fmtChars(text.length)+' berisi gambar yang dibenamkan langsung). Kurangi jumlah gambar di dalamnya, turunkan kualitas thumbnail Smart Filter, atau pecah menjadi beberapa elemen.');
  }
  const page=this.ctx.page;
  return text.replace(DATA_RE,(m)=>{
   let i=this.byData.get(m);
   if(i===undefined){i=this.reg.push({data:m,kind:'inline',id:'',label:label||'inline',page})-1;this.byData.set(m,i)}
   return TOKEN+i;
  });
 },
 /* moza-thumb://<id> (kartu Smart Filter) -> token thumbnail (atau aset penuh bila thumbnail tidak ada) */
 thumbs(text){
  return text.replace(THUMB_RE,(m,id)=>{
   const a=(S.assets||[]).find(x=>x.id===id);if(!a||typeof a.data!=='string')return '';
   const ok=window.MZI&&MZI.thumbValid(a);
   return ok?this.token('t',id,a.thumb.data):this.token('a',id,a.data);
  });
 },
 /* nama manusiawi untuk sebuah entri token (dipakai di pesan error) */
 describe(rec){
  try{
   if(rec.kind==='a'){const a=(S.assets||[]).find(x=>x.id===rec.id);return 'Gambar "'+(a&&a.name||rec.id)+'"'}
   if(rec.kind==='t'){const a=(S.assets||[]).find(x=>x.id===rec.id);return 'Thumbnail "'+(a&&a.name||rec.id)+'"'}
   if(rec.kind==='v'){const a=(S.videos||[]).find(x=>x.id===rec.id);return 'Video "'+(a&&a.name||rec.id)+'"'}
   if(rec.kind==='f'){return 'Font "'+rec.id+'"'}
   if(rec.kind==='m'){return 'Musik "'+((S.music&&S.music.name)||'latar')+'"'}
  }catch(_){}
  return 'Media inline "'+rec.label+'"';
 },
 /* ubah error mentah (mis. RangeError "Invalid string length") menjadi pesan yang bisa ditindaklanjuti */
 explain(e,where){
  if(e&&e.mzx)return e.message;
  const msg=String((e&&e.message)||e||'');
  const proj=(where&&where.project)||this.ctx.project,page=(where&&where.page)||this.ctx.page;
  const at=(proj?'proyek "'+proj+'"':'')+(page?(proj?', ':'')+'sekitar halaman "'+page+'"':'');
  if(e instanceof RangeError||/Invalid string length|Invalid array length|Array buffer allocation|out of memory|allocation failed/i.test(msg)){
   return 'Memori/ukuran string browser terlampaui'+(at?' saat memproses '+at:'')+'. Penyebab umum: embed atau kode inline yang sangat besar, atau terlalu banyak gambar berukuran besar. Saran: (1) buka "Optimasi gambar" lalu kompres gambar terbesar, (2) kurangi gambar di dalam embed Smart Filter, (3) ekspor lebih sedikit proyek per ZIP. Proyek asli tidak diubah.';
  }
  if(e&&(e.name==='QuotaExceededError'||/quota/i.test(msg)))return 'Ruang penyimpanan browser tidak cukup'+(at?' ('+at+')':'')+'. Kosongkan ruang disk atau tutup tab lain, lalu coba lagi. Proyek asli tidak diubah.';
  return (at?'['+at+'] ':'')+msg;
 },
 /* perkiraan ukuran media proyek sebelum membangun (untuk peringatan dini) */
 estimate(state){
  const out={bytes:0,count:0,biggest:[]};const seen=new Set();
  const add=(kind,a)=>{if(!a||typeof a.data!=='string')return;const k=kind+':'+(a.id||a.name);if(seen.has(k))return;seen.add(k);
   const b=Math.floor(Math.max(0,a.data.length-(a.data.indexOf('base64,')+7))*0.75);out.bytes+=b;out.count++;out.biggest.push({name:a.name||a.id,bytes:b})};
  for(const a of (state&&state.assets)||[])add('a',a);
  for(const a of (state&&state.videos)||[])add('v',a);
  for(const a of (state&&state.fonts)||[])add('f',a);
  if(state&&state.music)add('m',{id:'music',name:state.music.name,data:state.music.data});
  out.biggest.sort((x,y)=>y.bytes-x.bytes);out.biggest=out.biggest.slice(0,3);return out;
 },
 async _hash(bytes){
  try{if(crypto&&crypto.subtle){const d=new Uint8Array(await crypto.subtle.digest('SHA-256',bytes));let h='';for(const b of d)h+=b.toString(16).padStart(2,'0');return h}}catch(e){}
  return 'c'+a33Crc(bytes).toString(16).padStart(8,'0')+bytes.length.toString(16);
 },
 /* ganti semua token di html dengan path relatif.
    opt.writer (A33ZipWriter): media BARU langsung ditulis ke ZIP lalu dilepas; index.html juga ditulis.
    tanpa opt.writer: kembalikan semua file di array (perilaku Tahap A, dipakai tes). */
 async pack(html,opt){
  opt=opt||{};const prefix=opt.prefix||'',label=opt.label||'halaman',W=opt.writer||null,prog=opt.onProgress||null;
  const up='../'.repeat(prefix.split('/').filter(Boolean).length);
  if(!this.shared)this.start();
  try{
   if(html.indexOf(THUMB)>=0)html=this.thumbs(html);
   html=this.inline(html,label,true);   // sisa data: URI di HTML -> token juga
   const used=new Set();for(const m of html.matchAll(TOKEN_RE))used.add(+m[1]);
   const names=new Map(),files=[];let bytesNew=0,done=0;const total=used.size;
   for(const i of used){
    const rec=this.reg[i];if(!rec||typeof rec.data!=='string')throw new MZXError('Referensi media internal hilang ('+i+') di '+label+'. Coba ekspor ulang; proyek asli tidak diubah.');
    const who=this.describe(rec)+(rec.page?' (dipakai di halaman "'+rec.page+'")':'');
    const mt=/^data:([^;,]+)/i.exec(rec.data);const mime=a33Mime(mt?mt[1]:'application/octet-stream');
    const b64=rec.data.slice(rec.data.indexOf('base64,')+7);
    let bytes;try{bytes=a33Base64Bytes(b64)}catch(e){throw new MZXError(who+' di '+label+' tidak bisa dibaca (data rusak). Unggah ulang media itu lalu ekspor lagi.')}
    rec.data=null;this.stats.decoded++;
    if(bytes.length>=LIMITS.warnAsset){this.stats.largest.push({name:who,bytes:bytes.length});this.stats.largest.sort((x,y)=>y.bytes-x.bytes);this.stats.largest.length=Math.min(this.stats.largest.length,3)}
    const hash=await this._hash(bytes);let name=this.shared.byHash.get(hash);
    if(name){this.stats.dups++}
    else{
     let n=12,stem=hash.slice(0,n);while(this.shared.names.has(stem)&&n<hash.length)stem=hash.slice(0,++n);
     this.shared.names.add(stem);name='assets/'+stem+'.'+(typeof a33ExtFor==='function'?a33ExtFor(mime,bytes):a33Extension(mime));
     this.shared.byHash.set(hash,name);bytesNew+=bytes.length;
     this.stats.mediaFiles++;this.stats.mediaBytes+=bytes.length;
     if(W){try{W.add(name,bytes)}catch(e){throw new MZXError(e.message+' ('+who+')')}}
     else files.push({name,bytes});
    }
    bytes=null;names.set(i,name);done++;
    if(prog&&(done%4===0||done===total)){prog('Menulis media '+done+'/'+total+' — '+label);await tick()}
   }
   this.stats.assets+=used.size;
   const out=html.replace(TOKEN_RE,(m,i)=>up+names.get(+i));
   if(out.length>LIMITS.pageChars)throw new MZXError('HTML '+label+' masih '+Math.round(out.length/MB)+' juta karakter setelah media dipisahkan. Periksa embed/kode inline yang sangat besar pada proyek ini.');
   if(out.indexOf(THUMB)>=0)throw new MZXError('Penanda thumbnail internal tersisa di '+label+' (bug ekspor). Tidak ada file yang diubah.');
   if(out.indexOf(TOKEN)>=0)throw new MZXError('Penanda media internal tersisa di '+label+' (bug ekspor). Tidak ada file yang diubah.');
   const htmlBytes=enc.encode(out);
   if(W){W.add(prefix+'index.html',htmlBytes);return {html:out,htmlBytes:htmlBytes.byteLength,files:[],mediaFiles:this.stats.mediaFiles,bytes:bytesNew}}
   return {html:out,htmlBytes:htmlBytes.byteLength,files:[{name:prefix+'index.html',bytes:htmlBytes},...files],mediaFiles:files.length,bytes:bytesNew};
  }finally{this.reg=[];this.byKey=new Map();this.byData=new Map()}
 },
 /* ZIP situs tunggal: index.html + assets/ */
 async createZip(html,label,opt){
  opt=opt||{};const w=new A33ZipWriter();
  const r=await this.pack(html,{prefix:'',label:label||'index.html',writer:w,onProgress:opt.onProgress});
  const fileCount=w.count-1;const blob=w.finish();
  return {blob,fileCount,mediaBytes:r.bytes,html:r.html,htmlBytes:r.htmlBytes,stats:this.stats};
 }
};
/* Lacak halaman yang sedang dibangun supaya pesan error bisa menyebut nama halaman. */
if(typeof pageHTML==='function'){
 const prevPageHTML=pageHTML;
 pageHTML=function(page){if(MZX.on&&page)MZX.ctx.page=page.name||page.title||page.slug||'';return prevPageHTML.apply(this,arguments)};
}
})();
