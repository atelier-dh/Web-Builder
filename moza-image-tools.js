/* Moza Studio V14.8.25 — Tahap C: optimasi gambar dari sumbernya.
   - Hash isi (SHA-256) + deduplikasi saat upload/import + "Gabungkan aset kembar"
   - Kompresi gambar (alat "Optimasi gambar proyek") dengan opsi Simpan asli / Ganti
   - Smart Filter: kartu menyimpan REFERENSI aset + thumbnail (moza-thumb://<id>), bukan data gambar penuh di embedCode
   - Salin/tempel section & halaman antar proyek hanya membawa REFERENSI aset (data dibaca dari proyek sumber saat tempel)
   Tidak ada perubahan pada data proyek lama: aset tanpa hash tetap berfungsi; embedCode lama tetap berfungsi. */
(function(){
'use strict';
if(typeof S==='undefined'||typeof asset!=='function')return;
const MB=1048576,THUMB='moza-thumb://',THUMB_RE=/moza-thumb:\/\/([a-zA-Z0-9_-]+)/g;
const fmt=n=>n>=MB?(n/MB).toFixed(n>=10*MB?0:1)+' MB':Math.max(1,Math.round(n/1024))+' KB';
const tick=()=>new Promise(r=>setTimeout(r,0));
const esc2=s=>String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const MZI=window.MZI={WARN_BYTES:2*MB,trial:new Map(),enabled:true};
const PRESETS={std:{max:960,q:0.82,label:'Standar (960 px, kualitas 82)'},eco:{max:720,q:0.7,label:'Hemat (720 px, kualitas 70)'},min:{max:560,q:0.6,label:'Sangat hemat (560 px, kualitas 60)'}};
MZI.PRESETS=PRESETS;
MZI.thumbSpec=()=>PRESETS[S.doc&&S.doc.mziThumb]||PRESETS.std;

/* ---------- ukuran & hash ---------- */
const isData=a=>!!a&&typeof a.data==='string'&&a.data.slice(0,5)==='data:';
function bytesOf(data){if(typeof data!=='string')return 0;const i=data.indexOf('base64,');if(i<0)return data.length;let n=Math.floor((data.length-i-7)*0.75);if(data.endsWith('=='))n-=2;else if(data.endsWith('='))n-=1;return Math.max(0,n)}
MZI.bytesOf=bytesOf;
MZI.assetBytes=a=>isData(a)?bytesOf(a.data):0;
async function sha256(bytes){const d=new Uint8Array(await crypto.subtle.digest('SHA-256',bytes));let h='';for(const b of d)h+=b.toString(16).padStart(2,'0');return h}
async function hashData(data){
 const i=data.indexOf('base64,');
 const bytes=i<0?new TextEncoder().encode(data):a33Base64Bytes(data.slice(i+7));
 return sha256(bytes);
}
MZI.hashData=hashData;
MZI.hash=async function(a){
 if(!isData(a))return '';
 if(a.mzHash&&a.mzHashLen===a.data.length)return a.mzHash;
 const h=await hashData(a.data);a.mzHash=h;a.mzHashLen=a.data.length;return h;
};
async function hashAll(list,onProgress){let n=0;for(const a of list){await MZI.hash(a);if(onProgress&&++n%6===0){onProgress(n,list.length);await tick()}}}

/* ---------- ganti referensi aset di struktur apa pun ---------- */
function remapIds(root,map){
 if(!map.size)return 0;let changed=0;
 const fix=s=>{
  if(map.has(s)){changed++;return map.get(s)}
  if(s.length>6&&s.length<80){const m=/^asset:([a-zA-Z0-9_-]+)$/.exec(s);if(m&&map.has(m[1])){changed++;return 'asset:'+map.get(m[1])}}
  if(s.indexOf(THUMB)>=0){return s.replace(THUMB_RE,(x,id)=>{if(map.has(id)){changed++;return THUMB+map.get(id)}return x})}
  return s;
 };
 (function walk(o){
  if(Array.isArray(o)){for(let i=0;i<o.length;i++){const v=o[i];if(typeof v==='string')o[i]=fix(v);else if(v&&typeof v==='object')walk(v)}}
  else if(o&&typeof o==='object'){for(const k of Object.keys(o)){if(k==='data'||k==='mzHash')continue;const v=o[k];if(typeof v==='string')o[k]=fix(v);else if(v&&typeof v==='object')walk(v)}}
 })(root);
 return changed;
}
MZI.remapIds=remapIds;
/* pemakaian: hitung kemunculan id aset di dokumen (+ 'asset:<id>' dan moza-thumb://<id>) */
MZI.usage=function(){
 const ids=new Set(S.assets.map(a=>a.id)),count=new Map();
 const bump=id=>count.set(id,(count.get(id)||0)+1);
 (function walk(o,key){
  if(typeof o==='string'){
   if(ids.has(o))bump(o);
   else if(o.length<80&&o.startsWith('asset:')&&ids.has(o.slice(6)))bump(o.slice(6));
   else if(o.length>13&&o.indexOf(THUMB)>=0){for(const m of o.matchAll(THUMB_RE))if(ids.has(m[1]))bump(m[1])}
   return;
  }
  if(Array.isArray(o)){for(const v of o)walk(v);return}
  if(o&&typeof o==='object')for(const k of Object.keys(o))walk(o[k],k);
 })(S.doc);
 return count;
};

/* ---------- kompresi ---------- */
async function loadImg(src){const im=new Image();im.decoding='async';im.src=src;await im.decode();return im}
const toBlob=(cv,type,q)=>new Promise(r=>cv.toBlob(r,type,q));
const blobData=b=>new Promise((res,rej)=>{const f=new FileReader();f.onload=()=>res(f.result);f.onerror=()=>rej(f.error);f.readAsDataURL(b)});
function hasAlpha(ctx,w,h){
 const step=Math.max(1,Math.floor(h/256));         // baca per potongan baris agar memori kecil
 for(let y=0;y<h;y+=step){const rows=Math.min(step,h-y),d=ctx.getImageData(0,y,w,rows).data;for(let i=3;i<d.length;i+=4)if(d[i]<255)return true}
 return false;
}
MZI.canCompress=a=>isData(a)&&/^data:image\/(?:png|jpeg|webp);base64,/i.test(a.data);
/* kembalikan {data,w,h,bytes,mime,alpha} atau null bila tidak ada penghematan berarti */
MZI.compress=async function(a,opt){
 opt=opt||{};if(!MZI.canCompress(a))return null;
 const before=bytesOf(a.data);if(before<(opt.minBytes==null?20*1024:opt.minBytes))return null;
 const im=await loadImg(a.data),W0=im.naturalWidth,H0=im.naturalHeight;if(!W0||!H0)return null;
 const maxW=opt.maxW||1920,sc=Math.min(1,maxW/W0),w=Math.max(1,Math.round(W0*sc)),h=Math.max(1,Math.round(H0*sc));
 const cv=document.createElement('canvas');cv.width=w;cv.height=h;const ctx=cv.getContext('2d',{willReadFrequently:true});
 const isJpeg=/^data:image\/jpeg/i.test(a.data);
 const alpha=isJpeg?false:hasAlpha((ctx.drawImage(im,0,0,w,h),ctx),w,h);
 if(isJpeg)ctx.drawImage(im,0,0,w,h);
 const q=opt.q||0.82;let blob,mime;
 if(!alpha){blob=await toBlob(cv,'image/jpeg',q);mime='image/jpeg'}
 else{blob=await toBlob(cv,'image/webp',q);mime='image/webp';if(!blob||blob.type!=='image/webp'){blob=await toBlob(cv,'image/png');mime='image/png'}}
 cv.width=cv.height=0;if(!blob)return null;
 // simpan hanya bila sungguh lebih kecil (>=8%) atau ukuran piksel diperkecil
 if(blob.size>=before*0.92&&sc===1)return null;
 if(blob.size>=before)return null;
 return {data:await blobData(blob),w,h,bytes:blob.size,mime,alpha,before};
};
/* ---------- thumbnail Smart Filter (disimpan di aset: a.thumb) ---------- */
MZI.thumbValid=a=>!!(a&&a.thumb&&typeof a.thumb.data==='string'&&isData(a)&&a.thumb.srcLen===a.data.length);
MZI.thumbData=id=>{const a=asset(id);if(!a||!isData(a))return '';return MZI.thumbValid(a)?a.thumb.data:a.data};
MZI.ensureThumb=async function(a,force){
 if(!isData(a)||!/^data:image\/(?:png|jpeg|webp);base64,/i.test(a.data))return;
 const spec=MZI.thumbSpec();
 if(a.data.length<150000){delete a.thumb;return}
 if(!force&&MZI.thumbValid(a)&&a.thumb.max===spec.max&&a.thumb.q===spec.q)return;
 try{
  const im=await loadImg(a.data),sc=Math.min(1,spec.max/(im.naturalWidth||spec.max));
  const w=Math.max(1,Math.round(im.naturalWidth*sc)),h=Math.max(1,Math.round(im.naturalHeight*sc));
  const cv=document.createElement('canvas');cv.width=w;cv.height=h;cv.getContext('2d').drawImage(im,0,0,w,h);
  let out=cv.toDataURL('image/webp',spec.q);if(!/^data:image\/webp/.test(out))out=cv.toDataURL('image/jpeg',Math.min(0.9,spec.q+0.03));
  cv.width=cv.height=0;
  if(out.length<a.data.length)a.thumb={data:out,w,h,q:spec.q,max:spec.max,srcLen:a.data.length};else delete a.thumb;
 }catch(_){delete a.thumb}
};
/* teks dengan penanda moza-thumb:// -> data URI (preview, editor, ekspor HTML tunggal) */
MZI.resolveThumbs=function(text){
 if(typeof text!=='string'||text.indexOf(THUMB)<0)return text;
 return text.replace(THUMB_RE,(m,id)=>MZI.thumbData(id));
};
if(typeof a319WidgetDocument==='function'){
 const prevDoc=a319WidgetDocument;
 a319WidgetDocument=function(code){return prevDoc.call(this,MZI.resolveThumbs(code))};
}
/* Aset yang dipakai sebuah objek, termasuk yang dirujuk lewat 'asset:<id>' (kartu Smart Filter) dan moza-thumb://<id> */
if(typeof usedAssets==='function'){
 const prevUsed=usedAssets;
 usedAssets=function(obj){
  const list=prevUsed.call(this,obj),have=new Set(list.map(a=>a.id)),ids=new Set(S.assets.map(a=>a.id));
  (function walk(o){
   if(typeof o==='string'){
    if(o.length<80&&o.startsWith('asset:')){const id=o.slice(6);if(ids.has(id)&&!have.has(id)){have.add(id);list.push(asset(id))}}
    else if(o.length>13&&o.indexOf(THUMB)>=0){for(const m of o.matchAll(THUMB_RE)){const id=m[1];if(ids.has(id)&&!have.has(id)){have.add(id);list.push(asset(id))}}}
    return;
   }
   if(Array.isArray(o)){for(const v of o)walk(v);return}
   if(o&&typeof o==='object')for(const k of Object.keys(o))walk(o[k]);
  })(obj);
  return list;
 };
}

/* ---------- dedup saat upload / import ---------- */
/* aset baru sudah di S.assets (upload) atau akan dimasukkan (import). Kembalikan daftar akhir (duplikat -> aset lama). */
async function dedupeNew(list,existing){
 const byHash=new Map(),idMap=new Map(),keep=[];
 for(const a of existing){if(a&&a.mzHash&&a.mzHashLen===(a.data||'').length&&!byHash.has(a.mzHash))byHash.set(a.mzHash,a)}
 // hash aset lama yang belum punya (sekali, lalu tersimpan di a.mzHash)
 const needs=existing.filter(a=>isData(a)&&!(a.mzHash&&a.mzHashLen===a.data.length));
 if(needs.length){await hashAll(needs);for(const a of needs)if(a.mzHash&&!byHash.has(a.mzHash))byHash.set(a.mzHash,a)}
 for(const a of list){
  const h=await MZI.hash(a);const hit=h?byHash.get(h):null;
  if(hit&&hit!==a){idMap.set(a.id,hit.id);continue}
  if(h)byHash.set(h,a);keep.push(a);
 }
 return {keep,idMap};
}
MZI.dedupeNew=dedupeNew;

/* ---------- tawaran kompres untuk gambar > 2 MB ---------- */
function ask(title,body,okLabel,noLabel){
 return new Promise(resolve=>{
  const ov=document.createElement('div');ov.className='mzi-overlay';
  ov.innerHTML='<div class="mzi-box" role="dialog" aria-label="'+esc2(title)+'"><b>'+esc2(title)+'</b><div class="mzi-body">'+body+'</div><div class="mzi-foot"><button class="btn" data-no>'+esc2(noLabel)+'</button><button class="btn pri" data-ok>'+esc2(okLabel)+'</button></div></div>';
  const done=v=>{window.removeEventListener('keydown',onKey,true);ov.remove();resolve(v)};
  const onKey=e=>{if(e.key==='Escape'){e.stopPropagation();done(false)}};
  window.addEventListener('keydown',onKey,true);
  ov.addEventListener('click',e=>{if(e.target===ov)done(false)});
  ov.querySelector('[data-no]').onclick=()=>done(false);ov.querySelector('[data-ok]').onclick=()=>done(true);
  document.body.append(ov);ov.querySelector('[data-ok]').focus();
 });
}
async function offerCompress(list){
 const big=list.filter(a=>MZI.canCompress(a)&&bytesOf(a.data)>MZI.WARN_BYTES);
 if(!big.length)return 0;
 const total=big.reduce((s,a)=>s+bytesOf(a.data),0);
 const rows=big.slice(0,5).map(a=>'<li>'+esc2(a.name||a.id)+' — '+fmt(bytesOf(a.data))+'</li>').join('')+(big.length>5?'<li>…dan '+(big.length-5)+' lainnya</li>':'');
 const ok=await ask(big.length+' gambar lebih besar dari 2 MB','<p>Total '+fmt(total)+'. Gambar besar memperlambat penyimpanan, Preview, dan ekspor.</p><ul>'+rows+'</ul><p class="hint">Kompres otomatis: JPEG/WebP kualitas ~82, lebar maks 1920 px. PNG transparan tetap transparan. Gambar asli tidak dikirim ke server mana pun.</p>','Kompres otomatis','Biarkan asli');
 if(!ok)return 0;
 let saved=0,n=0;
 for(const a of big){
  try{const r=await MZI.compress(a);if(r){saved+=r.before-r.bytes;a.data=r.data;a.w=r.w;a.h=r.h;delete a.mzHash;delete a.mzHashLen;n++;await MZI.ensureThumb(a,true)}}catch(e){console.warn('[MZI] compress',e)}
  await tick();
 }
 if(n){scheduleSave();toast(n+' gambar dikompres, hemat '+fmt(saved),3800)}
 return n;
}
/* dipanggil sesudah upload: gabung duplikat, lalu tawarkan kompres. list sudah ada di S.assets. */
MZI.afterUpload=async function(list){
 const existing=S.assets.filter(a=>!list.includes(a));
 const {keep,idMap}=await dedupeNew(list,existing);
 const out=[];
 for(const a of list){
  if(idMap.has(a.id)){const i=S.assets.indexOf(a);if(i>=0)S.assets.splice(i,1);out.push(asset(idMap.get(a.id)))}
  else out.push(a);
 }
 if(idMap.size)toast(idMap.size+' gambar identik dengan yang sudah ada — aset lama dipakai ulang (tidak ada salinan baru).',4200);
 await offerCompress(keep);
 if(out.length){scheduleSave();if(S.tab==='uploads'&&typeof renderLeft==='function')renderLeft()}
 return out;
};
if(typeof processImages==='function'){
 const prevProcess=processImages;
 processImages=async function(files){
  const before=new Set(S.assets);const res=await prevProcess.apply(this,arguments);
  if(!res||!res.length)return res;
  const fresh=res.filter(a=>!before.has(a)&&S.assets.includes(a));
  if(!fresh.length)return res;
  try{const final=await MZI.afterUpload(fresh);const map=new Map(fresh.map((a,i)=>[a,final[i]]));return res.map(a=>map.get(a)||a)}
  catch(e){console.warn('[MZI] afterUpload',e);return res}
 };
}
/* import HTML/halaman: aset baru + halaman yang merujuknya -> hasil sudah dedup */
MZI.absorb=async function(newAssets,roots){
 const {keep,idMap}=await dedupeNew(newAssets,S.assets);
 if(idMap.size)for(const r of roots||[])remapIds(r,idMap);
 for(const a of keep)S.assets.push(a);
 if(idMap.size)toast(idMap.size+' gambar impor identik dengan aset lama — dipakai ulang.',4200);
 await offerCompress(keep);
 return {added:keep.length,reused:idMap.size};
};

/* ---------- gabungkan aset kembar ---------- */
MZI.findDuplicates=async function(onProgress){
 const list=S.assets.filter(isData);await hashAll(list,onProgress);
 const groups=new Map();for(const a of list){if(!a.mzHash)continue;(groups.get(a.mzHash)||groups.set(a.mzHash,[]).get(a.mzHash)).push(a)}
 const use=MZI.usage(),out=[];
 for(const g of groups.values()){if(g.length<2)continue;
  g.sort((x,y)=>(use.get(y.id)||0)-(use.get(x.id)||0)||S.assets.indexOf(x)-S.assets.indexOf(y));
  out.push({keep:g[0],dups:g.slice(1),bytes:bytesOf(g[0].data)*(g.length-1)});
 }
 return out;
};
MZI.mergeDuplicates=async function(onProgress){
 const groups=await MZI.findDuplicates(onProgress);
 if(!groups.length)return {merged:0,saved:0};
 commit(discrete());
 const map=new Map();let saved=0;
 for(const g of groups)for(const d of g.dups){map.set(d.id,g.keep.id);saved+=bytesOf(d.data)}
 remapIds(S.doc,map);
 for(const a of S.assets){if(a&&!map.has(a.id)){for(const k of Object.keys(a)){if(k==='data'||k==='thumb'||k==='mzHash')continue;const v=a[k];if(v&&typeof v==='object')remapIds(v,map);else if(typeof v==='string'&&map.has(v))a[k]=map.get(v)}}}
 S.assets=S.assets.filter(a=>!map.has(a.id));
 S.undo=[];S.redo=[];                              // undo lama merujuk id yang sudah digabung
 scheduleSave();try{renderAll()}catch(_){}
 return {merged:map.size,saved};
};

/* ---------- salin/tempel: hanya referensi aset ---------- */
const lightRef=a=>({id:a.id,name:a.name,w:a.w,h:a.h,folder:a.folder||'',ref:1,hash:(a.mzHash&&a.mzHashLen===(a.data||'').length)?a.mzHash:'',bytes:bytesOf(a.data)});
S._clipLive=new Map();
if(typeof putClip==='function'){
 const prevPut=putClip;
 putClip=function(d){
  if(d&&Array.isArray(d.assets)){
   const live=new Map(),refs=[];
   for(const a of d.assets){
    if(!a)continue;
    if(a.ref&&typeof a.data!=='string'){refs.push(a);continue}
    if(isData(a)){const src=asset(a.id)||a;live.set(a.id,src);refs.push(lightRef(src))}   // referensi saja; data TIDAK ikut clipboard/localStorage
    else refs.push(a);                                                                        // aset URL kecil
   }
   if(live.size)S._clipLive=live;
   d=Object.assign({},d,{assets:refs,srcPid:d.srcPid||S.pid});
  }
  return prevPut.call(this,d);
 };
}
if(typeof mergeAssets==='function'){
 const prevMerge=mergeAssets;
 mergeAssets=function(list){return prevMerge.call(this,(list||[]).filter(a=>a&&!(a.ref&&typeof a.data!=='string')))};
}
async function loadAssetFromProject(pid,id){
 if(!pid||pid===S.pid)return asset(id)||null;
 const raw=await store.get('atelier:p:'+pid);if(!raw)return null;
 let j;try{j=JSON.parse(raw)}catch(_){return null}
 const a=(j.assets||[]).find(x=>x&&x.id===id);if(!a)return null;
 const tmp={assets:[a]};await a29HydrateLocal(tmp);return tmp.assets[0]||null;
}
MZI.loadAssetFromProject=loadAssetFromProject;
function clipNeedsResolve(c){
 return (c.assets||[]).some(r=>r&&r.ref&&!(asset(r.id)&&(!r.hash||!asset(r.id).mzHash||asset(r.id).mzHash===r.hash)));
}
async function resolveClip(c){
 const idMap=new Map(),toAdd=[],missing=[],need=[];
 let hashed=false;
 const findByHash=async h=>{
  if(!h)return null;
  if(!hashed){await hashAll(S.assets.filter(a=>isData(a)&&!(a.mzHash&&a.mzHashLen===a.data.length)));hashed=true}
  return S.assets.find(a=>a.mzHash===h&&a.mzHashLen===(a.data||'').length)||null;
 };
 for(const r of c.assets||[]){
  if(!r)continue;
  if(!r.ref){if(!asset(r.id))toAdd.push(r);continue}                    // clip lama (membawa data) / aset URL
  const ex=asset(r.id);
  if(ex&&(!r.hash||!ex.mzHash||ex.mzHash===r.hash))continue;            // sudah ada di proyek ini
  if(r.hash){const dup=await findByHash(r.hash);if(dup){idMap.set(r.id,dup.id);continue}}
  need.push({r,clash:!!ex});
 }
 for(const {r,clash} of need){
  let src=(S._clipLive&&S._clipLive.get(r.id))||null;
  if(!src||!isData(src))src=await loadAssetFromProject(c.srcPid,r.id);
  if(!src||!isData(src)){missing.push(r.name||r.id);continue}
  const h=await MZI.hash(src),dup=await findByHash(h);
  if(dup){idMap.set(r.id,dup.id);continue}
  const n=Object.assign({},src);                                        // objek baru; string data dipakai bersama, bukan digandakan
  if(clash){n.id=uid('a');idMap.set(r.id,n.id)}
  toAdd.push(n);
 }
 const c2=Object.assign({},c,{items:clone(c.items),assets:toAdd});
 remapIds(c2.items,idMap);
 return {clip:c2,missing,reused:idMap.size};
}
MZI.resolveClip=resolveClip;
for(const [name,kind] of [['pasteSection','sections'],['pastePage','pages']]){
 if(typeof globalThis[name]!=='function')continue;
 const prev=globalThis[name];
 globalThis[name]=function(){
  const args=arguments,c=getClip();
  if(!c||c.k!==kind||!clipNeedsResolve(c))return prev.apply(this,args);
  resolveClip(c).then(({clip,missing,reused})=>{
   if(missing.length)toast('Aset tidak ditemukan di proyek sumber: '+missing.slice(0,3).join(', ')+(missing.length>3?'…':'')+'. Buka proyek sumber lalu salin ulang.',6000);
   else if(reused)toast(reused+' gambar sudah ada di proyek ini — dipakai ulang.',3200);
   const saved=S.secClip;S.secClip=clip;try{prev.apply(null,args)}finally{S.secClip=saved}
  }).catch(e=>{console.error('[MZI] paste',e);toast('Tempel gagal: '+(e&&e.message||e),6000)});
 };
}

/* ---------- Panel "Optimasi gambar proyek" ---------- */
const st=document.createElement('style');st.textContent=`
.mzi-overlay{position:fixed;inset:0;background:rgba(15,20,35,.45);z-index:100000;display:flex;align-items:center;justify-content:center;padding:16px}
.mzi-box{background:#fff;color:#1c2333;border-radius:14px;max-width:460px;width:100%;padding:18px;box-shadow:0 20px 60px rgba(0,0,0,.3);font-size:13px}
.mzi-box ul{margin:6px 0 6px 18px;padding:0}.mzi-foot{display:flex;gap:8px;justify-content:flex-end;margin-top:14px}
.mzi-modal{max-width:880px;width:min(880px,96vw)}.mzi-bar{display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin:8px 0}
.mzi-sum{background:#f2f5fb;border-radius:10px;padding:10px 12px;margin:8px 0;line-height:1.55}
.mzi-tablewrap{max-height:46vh;overflow:auto;border:1px solid #e1e5ee;border-radius:10px}
.mzi-table{width:100%;border-collapse:collapse;font-size:12px}.mzi-table th,.mzi-table td{padding:6px 8px;border-bottom:1px solid #edf0f6;text-align:left;white-space:nowrap}
.mzi-table th{position:sticky;top:0;background:#f7f8fc}.mzi-table td.n{max-width:230px;overflow:hidden;text-overflow:ellipsis}
.mzi-save{color:#176b3d;font-weight:600}.mzi-msg{min-height:18px;color:#176b3d;font-size:12px;margin:6px 0}.mzi-msg.err{color:#b42318}
@media(max-width:640px){.mzi-table th:nth-child(3),.mzi-table td:nth-child(3){display:none}}`;
document.head.append(st);
const U=MZI.ui={sel:new Set(),mode:'replace',msg:'',err:false,busy:false};
function say(m,err){U.msg=m;U.err=!!err;const el=document.getElementById('mzi-msg');if(el){el.textContent=m;el.classList.toggle('err',!!err)}}
function thumbAssets(){const ids=new Set();const els=[];(function walk(o){if(Array.isArray(o)){o.forEach(walk);return}if(o&&typeof o==='object'){if(o.mozaSmartFilter)els.push(o);for(const k of Object.keys(o))if(k!=='mozaSmartFilter')walk(o[k])}})(S.doc.pages);
 for(const e of els)for(const a of usedAssets(e.mozaSmartFilter))ids.add(a.id);return [...ids].map(asset).filter(Boolean)}
function panelHTML(){
 const use=MZI.usage(),list=S.assets.filter(a=>a&&typeof a.data==='string').slice().sort((x,y)=>bytesOf(y.data)-bytesOf(x.data));
 const total=list.reduce((s,a)=>s+bytesOf(a.data),0),big=list.filter(a=>bytesOf(a.data)>MZI.WARN_BYTES).length;
 let est=0,have=0;for(const a of list){const t=MZI.trial.get(a.id);if(t&&t.srcLen===a.data.length){have++;est+=t.before-t.bytes}}
 const rows=list.slice(0,250).map(a=>{const t=MZI.trial.get(a.id),ok=t&&t.srcLen===a.data.length,b=bytesOf(a.data);
  return '<tr><td><input type="checkbox" data-mzi-sel="'+esc2(a.id)+'" '+(U.sel.has(a.id)?'checked':'')+' '+(ok?'':'disabled')+'></td><td class="n" title="'+esc2(a.name||a.id)+'">'+esc2(a.name||a.id)+'</td><td>'+(a.w||'?')+'×'+(a.h||'?')+'</td><td>'+fmt(b)+'</td><td>'+(use.get(a.id)||0)+'×</td><td>'+(ok?fmt(t.bytes)+' <span class="mzi-save">−'+Math.round((1-t.bytes/t.before)*100)+'%</span>':(MZI.canCompress(a)?'—':'tidak dikompres'))+'</td></tr>'}).join('');
 const spec=S.doc.mziThumb||'std';
 return `<div class="mzi-sum"><b>${list.length}</b> aset · total <b>${fmt(total)}</b> · <b>${big}</b> lebih besar dari 2 MB${have?` · perkiraan hemat <b class="mzi-save">${fmt(est)}</b> (${have} sudah dianalisis)`:''}<br><span class="hint">Aset yang dipakai berulang tetap SATU aset (referensi). Ekspor hanya menulis satu file per isi gambar.</span></div>
 <div class="mzi-bar"><button class="btn pri" data-a="mzi-analyze" ${U.busy?'disabled':''}>1. Analisis penghematan</button><button class="btn" data-a="mzi-select-all">Pilih yang hemat</button>
 <label>Mode: <select id="mzi-mode"><option value="replace" ${U.mode==='replace'?'selected':''}>Ganti (hapus asli)</option><option value="keep" ${U.mode==='keep'?'selected':''}>Simpan asli (salinan "asli" di Uploads)</option></select></label>
 <button class="btn pri" data-a="mzi-apply" ${U.busy?'disabled':''}>2. Kompres yang dipilih</button></div>
 <div class="mzi-bar"><button class="btn" data-a="mzi-dedupe" ${U.busy?'disabled':''}>Gabungkan aset kembar</button>
 <label>Thumbnail Smart Filter: <select id="mzi-thumbq">${Object.entries(PRESETS).map(([k,v])=>`<option value="${k}" ${k===spec?'selected':''}>${v.label}</option>`).join('')}</select></label>
 <button class="btn" data-a="mzi-thumb-apply" ${U.busy?'disabled':''}>Terapkan</button><button class="btn" data-a="mzi-convert" ${U.busy?'disabled':''} title="Buat ulang Smart Filter lama agar memakai referensi aset + thumbnail">Ringkas Smart Filter lama</button></div>
 <div class="mzi-msg ${U.err?'err':''}" id="mzi-msg">${esc2(U.msg)}</div>
 <div class="mzi-tablewrap"><table class="mzi-table"><thead><tr><th></th><th>Nama</th><th>Dimensi</th><th>Ukuran</th><th>Dipakai</th><th>Sesudah</th></tr></thead><tbody>${rows||'<tr><td colspan="6">Belum ada gambar di proyek ini.</td></tr>'}</tbody></table></div>${list.length>250?'<p class="hint">Menampilkan 250 aset terbesar.</p>':''}`;
}
function renderPanel(){const el=document.getElementById('mzi-panel');if(el)el.innerHTML=panelHTML()}
function openPanel(){U.msg='';U.err=false;showModal(mbox('Optimasi gambar proyek','<div id="mzi-panel"></div>','<button class="btn" data-a="mclose">Tutup</button>','mzi-modal'));renderPanel()}
const guard=async fn=>{if(U.busy)return;U.busy=true;renderPanel();try{await fn()}catch(e){console.error('[MZI]',e);say('Gagal: '+(e&&e.message||e),true)}finally{U.busy=false;renderPanel()}};
Object.assign(ACT,{
 'mzi-open':openPanel,
 'mzi-analyze':()=>guard(async()=>{
  const list=S.assets.filter(a=>MZI.canCompress(a)),total=list.length;let i=0,hit=0;MZI.trial.clear();U.sel.clear();
  for(const a of list){say('Menganalisis '+(++i)+'/'+total+': '+(a.name||a.id));await tick();
   try{const r=await MZI.compress(a);if(r){r.srcLen=a.data.length;MZI.trial.set(a.id,r);U.sel.add(a.id);hit++}}catch(e){console.warn('[MZI] analyze',a.id,e)}}
  say('Analisis selesai: '+hit+' dari '+total+' gambar bisa dihemat.');
 }),
 'mzi-select-all':()=>{U.sel.clear();for(const a of S.assets){const t=MZI.trial.get(a.id);if(t&&t.srcLen===(a.data||'').length)U.sel.add(a.id)}renderPanel()},
 'mzi-apply':()=>guard(async()=>{
  const targets=S.assets.filter(a=>U.sel.has(a.id)&&MZI.trial.get(a.id)&&MZI.trial.get(a.id).srcLen===a.data.length);
  if(!targets.length){say('Jalankan "Analisis" dahulu lalu pilih gambar.',true);return}
  commit(discrete());let saved=0,keptOrig=0;const originals=[];
  for(const a of targets){
   const t=MZI.trial.get(a.id);
   if(U.mode==='keep'){originals.push(Object.assign({},a,{id:uid('a'),name:(a.name||'gambar')+' (asli)',thumb:undefined,mzHash:a.mzHash,mzHashLen:a.mzHashLen}));keptOrig++}
   saved+=t.before-t.bytes;a.data=t.data;a.w=t.w;a.h=t.h;delete a.mzHash;delete a.mzHashLen;
   if(a.thumb)await MZI.ensureThumb(a,true);
   MZI.trial.delete(a.id);U.sel.delete(a.id);say('Menerapkan… '+a.name);await tick();
  }
  for(const o of originals){delete o.thumb;S.assets.push(o)}
  scheduleSave();try{renderAll()}catch(_){}
  say(targets.length+' gambar dikompres, hemat '+fmt(saved)+(keptOrig?'. Versi asli disimpan di Uploads dengan akhiran "(asli)".':'. Versi asli diganti.'));
 }),
 'mzi-dedupe':()=>guard(async()=>{
  say('Menghitung hash isi gambar…');const g=await MZI.findDuplicates((n,t)=>say('Menghitung hash '+n+'/'+t+'…'));
  if(!g.length){say('Tidak ada aset kembar.');return}
  const dupN=g.reduce((s,x)=>s+x.dups.length,0),mb=g.reduce((s,x)=>s+x.bytes,0);
  const ok=await ask('Gabungkan '+dupN+' aset kembar?','<p>Ditemukan <b>'+g.length+'</b> kelompok gambar identik ('+dupN+' salinan berlebih, sekitar <b>'+fmt(mb)+'</b>). Semua referensi di halaman akan diarahkan ke satu aset.</p><p class="hint">Riwayat Undo akan direset karena ID aset berubah. Disarankan ekspor backup JSON dahulu.</p>','Gabungkan','Batal');
  if(!ok){say('Dibatalkan.');return}
  const r=await MZI.mergeDuplicates();say(r.merged+' aset kembar digabung, hemat '+fmt(r.saved)+'. Riwayat Undo direset.');
 }),
 'mzi-thumb-apply':()=>guard(async()=>{
  const v=document.getElementById('mzi-thumbq')?.value||'std';if(!PRESETS[v])return;S.doc.mziThumb=v;
  const as=thumbAssets();let n=0,bytes=0;for(const a of as){say('Membuat thumbnail '+(++n)+'/'+as.length);await MZI.ensureThumb(a,true);if(a.thumb)bytes+=bytesOf(a.thumb.data);await tick()}
  scheduleSave();say('Kualitas thumbnail: '+PRESETS[v].label+'. '+as.length+' gambar kartu diperbarui'+(bytes?' (total thumbnail '+fmt(bytes)+')':'')+'. Preview dan ekspor langsung memakainya.');
 }),
 'mzi-convert':()=>guard(async()=>{
  const targets=[];(function walk(o,pg){if(Array.isArray(o)){o.forEach(x=>walk(x,pg));return}if(o&&typeof o==='object'){if(o.mozaSmartFilter&&typeof o.embedCode==='string'&&o.embedCode.indexOf('data:image')>=0)targets.push({el:o,pg});for(const k of Object.keys(o))if(k!=='mozaSmartFilter'&&k!=='embedCode')walk(o[k],pg)}})(S.doc.pages.map(p=>p.sections),null);
  S.doc.pages.forEach(p=>{(function walk(o){if(Array.isArray(o)){o.forEach(walk);return}if(o&&typeof o==='object'){const t=targets.find(x=>x.el===o);if(t)t.pg=p;for(const k of Object.keys(o))if(k!=='mozaSmartFilter'&&k!=='embedCode')walk(o[k])}})(p.sections)});
  if(!targets.length){say('Tidak ada Smart Filter lama yang berisi gambar penuh.');return}
  if(typeof ACT['mz13-upload-render']!=='function'){say('Modul Smart Filter tidak tersedia.',true);return}
  const keepPage=S.pageId,keepSel=S.sel;let done=0,before=0,after=0;
  for(const t of targets){
   say('Merender ulang Smart Filter '+(++done)+'/'+targets.length+'…');before+=t.el.embedCode.length;
   if(t.pg)S.pageId=t.pg.id;S.sel={k:'el',id:t.el.id};await ACT['mz13-upload-render']();after+=(t.el.embedCode||'').length;await tick();
  }
  S.pageId=keepPage;S.sel=keepSel;try{renderAll()}catch(_){}
  say(done+' Smart Filter dirender ulang: '+fmt(before)+' → '+fmt(after)+' di data proyek.');
 })
});
document.addEventListener('change',e=>{
 const t=e.target;if(!t||!t.closest||!t.closest('#mzi-panel'))return;
 if(t.id==='mzi-mode'){U.mode=t.value}
 else if(t.dataset&&t.dataset.mziSel){if(t.checked)U.sel.add(t.dataset.mziSel);else U.sel.delete(t.dataset.mziSel)}
});
/* tombol di tab Uploads */
{const prevTab=tabUploads;tabUploads=function(){const h=prevTab.apply(this,arguments);return h+'<button class="btn" data-a="mzi-open" style="width:100%;margin:8px 0">🗜 Optimasi gambar proyek</button>'}}
})();
