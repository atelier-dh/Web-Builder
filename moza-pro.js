/* Moza Studio V3 — progressive, non-destructive Atelier enhancement.
 * Integrates into the SAME Atelier canvas. Does not touch auth, RSVP or the
 * original project serializer; extras live only in mozaDesignSystem/moza*.
 * Browser-compatible JavaScript, optional Rust acceleration is separate.
 */
(function(){
'use strict';
if(window.MozaPro) return;
const cloneLocal=o=>o==null?o:JSON.parse(JSON.stringify(o));
const escapeHtml=s=>String(s??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
const clampV=(n,lo,hi)=>Math.min(hi,Math.max(lo,n));
const ready=()=>typeof S!=='undefined'&&S.doc&&Array.isArray(S.doc.pages);
const system=(create=false)=>{if(!ready())return null;
 if(!S.doc.mozaDesignSystem&&create)S.doc.mozaDesignSystem={version:3,components:[]};
 const d=S.doc.mozaDesignSystem;
 if(create){d.version=Math.max(3,Number(d.version)||0);d.components||=[];d.variantSets||=[];d.styles||=[]}
 return d;
};
const components=()=>system()?.components||[];
const variantSets=()=>system()?.variantSets||[];
const styles=()=>system()?.styles||[];
const selected=()=>S.sel?.k==='el'?T('el'):null;
const selectIds=()=>typeof selIds==='function'?selIds():[];
const notify=s=>typeof toast==='function'?toast(s):console.info('[Moza]',s);
const safeNode=e=>!!e&&!e.locked&&e.type!=='form'&&e.type!=='embed'&&!(e.children||[]).some(c=>!safeNode(c));
const freshId=prefix=>typeof uid==='function'?uid(prefix):prefix+Date.now().toString(36)+Math.random().toString(36).slice(2);
const finish=()=>{afterEdit(); if(S.tab==='moza-components')renderLeft()};
const definition=id=>components().find(c=>c.id===id);
const variantSetByComponent=id=>variantSets().find(v=>v.variants?.some(x=>x.componentId===id));

function createVariantSet(){
 const e=selected(),def=e&&definition(e.mozaComponentId);
 if(!def){notify('Pilih instance Component yang sudah dibuat melalui panel Components.');return false}
 if(variantSetByComponent(def.id)){notify('Komponen ini sudah termasuk Variant Set.');return false}
 const name=window.prompt('Nama Variant Set:',def.name+' Variants');if(name===null)return false;
 if(!name.trim()){notify('Nama wajib diisi.');return false}
 commit(discrete()); const d=system(true);
 const vs={id:freshId('moza-vset-'),name:name.trim().slice(0,72),property:'State',variants:[{label:'Default',componentId:def.id}]};
 d.variantSets.push(vs);def.mozaVariantSetId=vs.id;
 finish();notify('Variant Set dibuat.');return true;
}
function createVariant(){
 const e=selected(),def=e&&definition(e.mozaComponentId),vs=def&&variantSetByComponent(def.id);
 if(!vs){notify('Buat Variant Set dari Component dahulu.');return false}
 if(!safeNode(e)){notify('Komponen terkunci atau membawa formulir/integrasi khusus.');return false}
 const value=window.prompt('Nama varian baru:', 'Hover');if(value===null)return false;
 const label=value.trim().slice(0,64);
 if(!label||vs.variants.some(x=>x.label.toLowerCase()===label.toLowerCase())){notify('Nama varian tidak boleh kosong atau duplikat.');return false}
 commit(discrete());const d=system(true);
 const copy=cloneLocal(e);delete copy.mozaComponentId;delete copy.mozaComponentName;
 const item={id:freshId('moza-comp-'),name:vs.name+' / '+label,createdAt:Date.now(),updatedAt:Date.now(),root:copy,mozaVariantSetId:vs.id};
 d.components.push(item);vs.variants.push({label,componentId:item.id});
 // Change the selected instance's identity to the newly created variant.
 e.mozaComponentId=item.id;e.mozaComponentName=item.name;
 finish();notify('Varian '+label+' berhasil dibuat.');return true;
}
function switchVariant(componentId){
 const e=selected(),f=e&&findEl(e.id),current=definition(e?.mozaComponentId),vs=current&&variantSetByComponent(current.id);
 const next=definition(componentId);
 if(!e||!f||!vs||!next||!vs.variants.some(v=>v.componentId===next.id))return false;
 if(e.locked){notify('Buka kunci instance dahulu.');return false}
 if(e.mozaComponentId===next.id)return true;
 commit(discrete());
 const replacement=cloneLocal(next.root);reidEl(replacement);replacement.id=e.id;
 // Variants retain placement and per-breakpoint geometry of the existing instance.
 for(const k of ['x','y','w','h','rot','bp','hideOn','hidden','locked','_fx','_groupBase','gw','gh','mozaConstraints']){
  if(e[k]!==undefined)replacement[k]=cloneLocal(e[k]);
 }
 replacement.mozaComponentId=next.id;replacement.mozaComponentName=next.name;
 const i=f.list.indexOf(e);if(i<0)return false;f.list[i]=replacement;
 finish();notify('Varian diubah: '+next.name);return true;
}

const STYLE_FIELDS={
 paint:{top:['fill','sc','sw'],st:['bg','color','bc','bw','br']},
 typography:{top:[],st:['fs','fw','ff','color','align','ls','lh','tt','va']},
 effects:{top:[],st:['sh','tsh','op']}
};
function extractStyle(e,kind){
 const spec=STYLE_FIELDS[kind];if(!spec)return null;
 const payload={top:{},st:{}};
 for(const k of spec.top)if(e[k]!==undefined)payload.top[k]=cloneLocal(e[k]);
 for(const k of spec.st)if(e.st?.[k]!==undefined)payload.st[k]=cloneLocal(e.st[k]);
 return payload;
}
function saveStyle(kind){
 const e=selected();if(!safeNode(e)){notify('Pilih elemen visual yang tidak terkunci.');return false}
 if(!STYLE_FIELDS[kind])return false;
 const name=window.prompt('Nama style '+kind+':',e.name+' '+kind);if(name===null)return false;
 if(!name.trim()){notify('Nama style harus diisi.');return false}
 commit(discrete());system(true).styles.push({id:freshId('moza-style-'),name:name.trim().slice(0,80),kind,properties:extractStyle(e,kind),updatedAt:Date.now()});
 finish();notify('Style disimpan dalam proyek.');return true;
}
function applyStyle(id){
 const style=styles().find(s=>s.id===id);if(!style)return false;
 const targets=selectIds().map(findEl).filter(Boolean).map(f=>f.el).filter(safeNode);
 if(!targets.length){notify('Pilih elemen yang akan memakai style.');return false}
 commit(discrete());
 for(const e of targets){e.st||={};for(const [k,v] of Object.entries(style.properties?.top||{}))e[k]=cloneLocal(v);
  for(const [k,v] of Object.entries(style.properties?.st||{}))e.st[k]=cloneLocal(v);
  e.mozaStyleRef=e.mozaStyleRef||{};e.mozaStyleRef[style.kind]=id;
 }
 finish();notify('Style diterapkan ke '+targets.length+' elemen.');return true;
}
// Traverse the project's existing Atelier elements without modifying the
// core renderer or introducing a separate style store.
function eachElement(fn){
 for(const p of S.doc?.pages||[])for(const s of p.sections||[]){
  const visit=list=>{for(const e of list||[]){fn(e);if(Array.isArray(e.children))visit(e.children)}};
  visit(s.elements);
 }
}
function updateStyle(id){
 const e=selected(),style=styles().find(s=>s.id===id);
 if(!safeNode(e)||!style)return false;
 commit(discrete());style.properties=extractStyle(e,style.kind);style.updatedAt=Date.now();
 let synced=0;
 eachElement(target=>{
  if(target.id===e.id||!safeNode(target)||target.mozaStyleRef?.[style.kind]!==id)return;
  target.st||={};
  for(const [k,v] of Object.entries(style.properties.top||{}))target[k]=cloneLocal(v);
  for(const [k,v] of Object.entries(style.properties.st||{}))target.st[k]=cloneLocal(v);
  synced++;
 });
 finish();notify('Style '+style.name+' diperbarui; '+synced+' instance tersinkron.');return true;
}
function deleteStyle(id){
 if(!styles().some(s=>s.id===id))return false;
 if(!window.confirm('Hapus style dari library? Tampilan objek di canvas tetap ada.'))return false;
 commit(discrete());system(true).styles=styles().filter(s=>s.id!==id);
 eachElement(e=>{
  if(!e.mozaStyleRef)return;
  for(const [kind,ref] of Object.entries(e.mozaStyleRef))if(ref===id)delete e.mozaStyleRef[kind];
  if(!Object.keys(e.mozaStyleRef).length)delete e.mozaStyleRef;
 });
 finish();notify('Style dihapus; instance tetap mempertahankan tampilannya.');return true;
}

/* Constraints use explicit captures and reflow, never silently rewrite layouts.
 * Base coordinates are expressed relative to section dimensions. */
function captureConstraints(h='left',v='top'){
 const e=selected(),f=e&&findEl(e.id);if(!e||!f||f.parent||e.locked){notify('Pilih elemen top-level tidak terkunci.');return false}
 if(!['left','right','center','stretch'].includes(h)||!['top','bottom','center','stretch'].includes(v))return false;
 const b=S.bp,ref={bp:b,x:effG(e,b,'x'),y:effG(e,b,'y'),w:effG(e,b,'w'),h:effG(e,b,'h'),containerW:BP[b],containerH:secH(f.sec,b)};
 commit(discrete());e.mozaConstraints={h,v,ref};finish();notify('Constraints tersimpan. Klik Reflow untuk menghitung breakpoint lainnya.');return true;
}
function constrainedGeometry(cfg,b,containerH){
 const r=cfg.ref;if(!r||!Number.isFinite(r.containerW)||!Number.isFinite(r.containerH))return null;
 const newW=BP[b],newH=containerH;
 const right=r.containerW-r.x-r.w, bottom=r.containerH-r.y-r.h;
 let x=r.x,y=r.y,w=r.w,h=r.h;
 switch(cfg.h){case'right':x=newW-right-w;break;case'center':x=(newW-w)/2+(r.x+r.w/2-r.containerW/2);break;case'stretch':w=Math.max(12,newW-r.x-right);break}
 switch(cfg.v){case'bottom':y=newH-bottom-h;break;case'center':y=(newH-h)/2+(r.y+r.h/2-r.containerH/2);break;case'stretch':h=Math.max(12,newH-r.y-bottom);break}
 w=Math.min(w,Math.max(12,newW));h=Math.min(h,Math.max(12,newH));
 x=clampV(x,0,Math.max(0,newW-w));y=clampV(y,0,Math.max(0,newH-h));
 return{x:Math.round(x),y:Math.round(y),w:Math.round(w),h:Math.round(h)};
}
function reflowConstraints(){
 const e=selected(),f=e&&findEl(e.id),c=e?.mozaConstraints;
 if(!e||!c||!f||f.parent||e.locked)return false;
 commit(discrete());for(const bp of ['d','t','m']){
  if(bp===c.ref.bp)continue;
  const g=constrainedGeometry(c,bp,secH(f.sec,bp));if(g)setGeom(e,bp,g);
 }
 finish();notify('Constraints diterapkan pada Desktop, Tablet, dan HP.');return true;
}
function removeConstraints(){const e=selected();if(!e?.mozaConstraints)return false;
 commit(discrete());delete e.mozaConstraints;finish();notify('Constraints dinonaktifkan.');return true;
}

/* Canvas boolean shape flattening: 2 simple vector shapes on same section.
 * Approximate contours sampled on 2–4 px grid into one SVG path with even-odd
 * fill. This is not FigCraft's editable vector-network boolean engine. */
function insideShape(el,x,y){
 const lx=(x-el.x)/el.w,ly=(y-el.y)/el.h;
 if(lx<0||ly<0||lx>1||ly>1)return false;
 switch(el.shape){
  case'rect':case'square':return true;
  case'circle':case'ellipse':return Math.pow((lx-.5)*2,2)+Math.pow((ly-.5)*2,2)<=1;
  case'triangle':return ly>=.04&&ly<=.96&&Math.abs(lx-.5)<=((ly-.04)/.92)*.47;
  case'polygon':case'star':{
   const n=el.shape==='star'?Math.max(3,Math.min(18,Number(el.pts)||5)):Math.max(3,Math.min(18,Number(el.sides)||6));
   const count=el.shape==='star'?2*n:n;
   const pts=Array.from({length:count},(_,i)=>{const a=-Math.PI/2+i*2*Math.PI/count,rad=el.shape==='star'&&i%2?.22:.47;return[.5+Math.cos(a)*rad,.5+Math.sin(a)*rad]});
   let contained=false;for(let i=0,j=pts.length-1;i<pts.length;j=i++){
    const a=pts[i],b=pts[j];if(((a[1]>ly)!==(b[1]>ly))&&(lx<(b[0]-a[0])*(ly-a[1])/(b[1]-a[1])+a[0]))contained=!contained;
   }return contained;
  }
  default:return false;
 }
}
function contourPaths(grid,w,h){
 const active=(x,y)=>x>=0&&y>=0&&x<w&&y<h&&grid[y*w+x]===1;
 const edges=new Map();let edgeCount=0;
 const add=(x1,y1,x2,y2)=>{const k=x1+','+y1;const a=edges.get(k)||[];a.push([x2,y2]);edges.set(k,a);edgeCount++};
 for(let j=0;j<h;j++)for(let i=0;i<w;i++)if(active(i,j)){
  if(!active(i,j-1))add(i,j,i+1,j);
  if(!active(i+1,j))add(i+1,j,i+1,j+1);
  if(!active(i,j+1))add(i+1,j+1,i,j+1);
  if(!active(i-1,j))add(i,j+1,i,j);
 }
 const loops=[];
 while(edgeCount){
  const entry=[...edges.entries()].find(([k,a])=>a.length);
  if(!entry)break;
  const start=entry[0],first=start.split(',').map(Number),loop=[first];let cur=start;
  for(let s=0,limit=edgeCount+1;s<limit;s++){
   const a=edges.get(cur);if(!a?.length)break;
   const next=a.pop();edgeCount--;const key=next.join(',');
   if(key===start)break;loop.push(next);cur=key;
  }
  if(loop.length>2){
   const simple=loop.filter((p,i)=>{const prev=loop[(i+loop.length-1)%loop.length],next=loop[(i+1)%loop.length];return (p[0]-prev[0])*(next[1]-p[1])!==(p[1]-prev[1])*(next[0]-p[0])});
   if(simple.length>=3)loops.push(simple);
  }
 }
 return loops;
}
function booleanGeometry(a,b,op,maxGrid=230){
 const x=Math.min(a.x,b.x),y=Math.min(a.y,b.y),right=Math.max(a.x+a.w,b.x+b.w),bottom=Math.max(a.y+a.h,b.y+b.h);
 const w=right-x,h=bottom-y;if(!(w>0&&h>0))return null;
 const scale=Math.min(1, maxGrid/Math.max(w,h)),cw=Math.max(1,Math.ceil(w*scale)),ch=Math.max(1,Math.ceil(h*scale));
 const grid=new Uint8Array(cw*ch);let count=0;
 for(let j=0;j<ch;j++)for(let i=0;i<cw;i++){
  const px=x+(i+.5)*w/cw,py=y+(j+.5)*h/ch;
  const A=insideShape(a,px,py),B=insideShape(b,px,py);
  const ok=op==='union'?(A||B):op==='intersect'?(A&&B):op==='subtract'?(A&&!B):(A!==B);
  if(ok){grid[j*cw+i]=1;count++}
 }
 if(!count)return null;
 const contours=contourPaths(grid,cw,ch);if(!contours.length)return null;
 const path=contours.map(loop=>loop.map((pt,i)=>(i?'L':'M')+(pt[0]/cw*100).toFixed(3)+' '+(pt[1]/ch*100).toFixed(3)).join(' ')+' Z').join(' ');
 return {x,y,w,h,svgPath:path,contours:contours.length,detail:Math.max(w/cw,h/ch)};
}
function applyBoolean(op){
 if(!['union','intersect','subtract','exclude'].includes(op))return false;
 const ids=selectIds();if(ids.length!==2){notify('Pilih tepat dua Shape dengan Shift-click.');return false}
 const fs=ids.map(findEl);if(fs.some(f=>!f||f.parent||f.el.locked)||fs[0].list!==fs[1].list){notify('Pilih dua Shape top-level di section yang sama.');return false}
 const [a,b]=fs.map(f=>f.el);
 const supported=['rect','square','circle','ellipse','triangle','polygon','star'];
 if(fs.some(f=>f.el.type!=='shape'||!supported.includes(f.el.shape)||Math.abs(f.el.rot||0)>.0001)){
  notify('Boolean V3 mendukung Shape sederhana tanpa rotasi.');return false
 }
 const result=booleanGeometry(a,b,op);if(!result){notify('Operasi menghasilkan bentuk kosong.');return false}
 // Only internally generated SVG markup; no untrusted HTML from sources.
 const color=(typeof col==='function'?col(a.fill?.c||'tok:primary'):(a.fill?.c||'#777777'));
 const safeColor=/^(#[0-9a-f]{3,8}|rgba?\([\d., %]+\)|transparent)$/i.test(color)?color:'#777777';
 const svg=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><path d="${result.svgPath}" fill="${safeColor}" fill-rule="evenodd"/></svg>`;
 commit(discrete());
 const item=newEl('shape',{name:'Boolean '+op,shape:'svg',svg,x:result.x,y:result.y,w:result.w,h:result.h,rot:0,mozaBoolean:{op,sourceIds:[a.id,b.id],sampleStep:result.detail}});
 // Keep originals in the document but hide them; Undo restores both originals.
 a.hidden=true;b.hidden=true;
 const list=fs[0].list;list.splice(Math.max(list.indexOf(a),list.indexOf(b))+1,0,item);
 S.sel={k:'el',id:item.id};S.multi=[];
 finish();renderLeft();notify('Boolean '+op+' dibuat (SVG hasil flatten). Sumber disembunyikan; Undo mengembalikan semuanya.');return true;
}

/* Responsive grid: one actual Atelier group, no second canvas. */
function selectedGridGroup(){const e=selected();return e?.type==='group'&&!e.mask?e:null}
function gridDefaults(){return {desktop:3,tablet:2,mobile:1,gap:14,padding:16,align:'stretch'}}
function applyGrid(group){
 if(!group||group.type!=='group'||!Array.isArray(group.children))return false;
 const cfg={...gridDefaults(),...(group.mozaGrid||{})};
 for(const b of ['d','t','m']){
  const key=b==='d'?'desktop':b==='t'?'tablet':'mobile';
  const requestedCols=clampV(Math.round(Number(cfg[key])||1),1,8);
  const groupW=Math.max(40,effG(group,b,'w'));
  const gap=clampV(Number(cfg.gap)||0,0,160);
  const pad=Math.min(clampV(Number(cfg.padding)||0,0,160),Math.max(0,(groupW-28)/2));
  const contentW=Math.max(28,groupW-2*pad);
  // Fit only columns that can hold a usable 18px cell; otherwise adapt.
  const cols=Math.max(1,Math.min(requestedCols,Math.floor((contentW+gap)/(18+gap))));
  const cellW=Math.max(18,(contentW-gap*(cols-1))/cols);
  let y=pad;
  const active=group.children.filter(el=>!el.hidden&&!el.hideOn?.[b]);
  for(let row=0;row<Math.ceil(active.length/cols);row++){
   const cells=active.slice(row*cols,(row+1)*cols),height=Math.max(8,...cells.map(el=>effG(el,b,'h')));
   cells.forEach((el,i)=>{
    const originalW=Math.max(12,effG(el,b,'w'));
    const childW=cfg.align==='stretch'?cellW:Math.min(originalW,cellW);
    const colX=pad+i*(cellW+gap),offset=cfg.align==='center'?(cellW-childW)/2:cfg.align==='end'?cellW-childW:0;
    setGeom(el,b,{x:Math.round(colX+offset),y:Math.round(y),w:Math.round(childW)});
   });
   y+=height+gap;
  }
  const totalH=Math.round(y-(active.length?gap:0)+pad);
  setGeom(group,b,{h:Math.max(32,totalH)});
  group._responsiveGroup=true;group._groupBase||={};group._groupBase[b]={w:groupW,h:totalH};
  if(b==='d'){group.gw=groupW;group.gh=totalH}
  const f=findEl(group.id),sec=f?.sec;
  if(sec&&!sec.kind){const need=effG(group,b,'y')+totalH+24;
   if(need>secH(sec,b)){if(b==='d')sec.h=Math.ceil(need);else{sec.hb||={};sec.hb[b]=Math.ceil(need)}}}
 }
 return true;
}
function createGridLayout(){
 let e=selectedGridGroup();
 if(!e){const ids=selectIds();if(ids.length<2){notify('Pilih Group atau beberapa elemen dalam section yang sama.');return false}
  const fs=ids.map(findEl);if(fs.some(f=>!f||f.parent||f.el.locked)||fs.some(f=>f.list!==fs[0].list)){notify('Pilih elemen dalam satu section.');return false}
  makeGroup(ids,false);e=selectedGridGroup();if(!e)return false;
 }
 if(!safeNode(e)){notify('Ada elemen yang terkunci atau terkait formulir/HTML Embed.');return false}
 commit(discrete());e.mozaGrid={...gridDefaults(),...(e.mozaGrid||{})};delete e.mozaAutoLayout;
 applyGrid(e);finish();notify('Responsive Grid aktif (Desktop/Tablet/HP).');return true;
}
function updateGrid(field,value){
 const g=selectedGridGroup();if(!g?.mozaGrid||!['desktop','tablet','mobile','gap','padding','align'].includes(field))return false;
 commit(discrete());g.mozaGrid[field]=field==='align'?value:clampV(Math.round(Number(value)||0),field==='gap'||field==='padding'?0:1,field==='gap'||field==='padding'?160:8);
 applyGrid(g);finish();return true;
}
function reflowGrid(){const g=selectedGridGroup();if(!g?.mozaGrid)return false;
 commit(discrete());applyGrid(g);finish();notify('Grid diperbarui untuk semua ukuran.');return true;
}
function removeGrid(){const g=selectedGridGroup();if(!g?.mozaGrid)return false;
 commit(discrete());delete g.mozaGrid;finish();notify('Grid dimatikan. Posisi terakhir tetap disimpan.');return true;
}

function proPanel(){
 if(!ready()||S.mode!=='design')return '';
 const e=selected(),c=e&&definition(e.mozaComponentId),set=c&&variantSetByComponent(c.id),cs=e?.mozaConstraints;
 const buttons=style=>styles().filter(s=>s.kind===style).map(x=>`<div class="moza-v3-row"><span title="${escapeHtml(x.name)}">${escapeHtml(x.name)}</span><button class="btn sm" data-a="moza3-apply-style" data-id="${escapeHtml(x.id)}">Apply</button><button class="btn sm" data-a="moza3-update-style" data-id="${escapeHtml(x.id)}" title="Update dari elemen terpilih">↻</button><button class="btn sm" data-a="moza3-delete-style" data-id="${escapeHtml(x.id)}" title="Hapus style dari library">✕</button></div>`).join('');
 let h='<section class="moza-v3"><header><b>✦ Moza Design Tools</b><small>V3</small></header>';
 if(e){
  if(c){
   h+='<div class="moza-v3-section"><strong>Variants</strong>';
   if(set){h+=`<label>Variant Set: ${escapeHtml(set.name)}<select data-moza3-variant>${set.variants.map(v=>`<option value="${escapeHtml(v.componentId)}" ${c.id===v.componentId?'selected':''}>${escapeHtml(v.label)}</option>`).join('')}</select></label>`;
    h+='<button class="btn sm" data-a="moza3-new-variant">+ Add variant</button>';
   }else h+='<button class="btn sm" data-a="moza3-new-set">+ Create Variant Set</button>';
   h+='</div>';
  }
  if(!findEl(e.id)?.parent){h+='<div class="moza-v3-section"><strong>Responsive Constraints</strong>';
   h+=`<div class="moza-v3-grid"><label>Horizontal<select id="moza3-anch-h"><option value="left" ${cs?.h==='left'?'selected':''}>Left</option><option value="right" ${cs?.h==='right'?'selected':''}>Right</option><option value="center" ${cs?.h==='center'?'selected':''}>Center</option><option value="stretch" ${cs?.h==='stretch'?'selected':''}>Stretch</option></select></label>
    <label>Vertical<select id="moza3-anch-v"><option value="top" ${cs?.v==='top'?'selected':''}>Top</option><option value="bottom" ${cs?.v==='bottom'?'selected':''}>Bottom</option><option value="center" ${cs?.v==='center'?'selected':''}>Center</option><option value="stretch" ${cs?.v==='stretch'?'selected':''}>Stretch</option></select></label></div>`;
   h+='<div class="moza-v3-row"><button class="btn sm" data-a="moza3-constraints-save">Capture</button>'+(cs?'<button class="btn sm" data-a="moza3-constraints-apply">Reflow D/T/M</button><button class="btn sm" data-a="moza3-constraints-remove">✕</button>':'')+'</div></div>';
  }
 }
 if(selectIds().length===2){h+='<div class="moza-v3-section"><strong>Boolean shapes</strong><div class="moza-v3-actions">'+
  ['union','intersect','subtract','exclude'].map(op=>`<button class="btn sm" data-a="moza3-boolean" data-v="${op}">${op}</button>`).join('')+'</div><small>2 Shape tanpa rotasi; hasil SVG flatten, bukan network editable.</small></div>'}
 if(e?.type==='group'&&!e.mask){
  const grid=e.mozaGrid;
  h+='<div class="moza-v3-section"><strong>Responsive Grid (D/T/M)</strong>';
  if(grid){h+='<div class="moza-v3-grid">'+
   ['desktop','tablet','mobile','gap','padding'].map(k=>`<label>${escapeHtml(k)}<input type="number" min="0" max="160" value="${escapeHtml(grid[k])}" data-moza3-grid="${escapeHtml(k)}"></label>`).join('')+
   `<label>Align<select data-moza3-grid="align">${['stretch','start','center','end'].map(v=>`<option value="${v}" ${grid.align===v?'selected':''}>${v}</option>`).join('')}</select></label></div>`+
   '<div class="moza-v3-row"><button class="btn sm" data-a="moza3-grid-reflow">↻ Reflow</button><button class="btn sm" data-a="moza3-grid-remove">Nonaktifkan</button></div>';
  }else h+='<button class="btn sm" data-a="moza3-grid-create">▦ Activate Grid Layout</button>';
  h+='</div>';
 }else if(selectIds().length>1){h+='<div class="moza-v3-section"><button class="btn sm" data-a="moza3-grid-create">▦ Grid dari pilihan</button></div>'}
 if(e){h+='<div class="moza-v3-section"><strong>Shared Styles</strong><div class="moza-v3-actions">'+
  ['paint','typography','effects'].map(kind=>`<button class="btn sm" data-a="moza3-create-style" data-v="${kind}">+ ${kind}</button>`).join('')+'</div>'+
  ['paint','typography','effects'].map(kind=>buttons(kind)).join('')+'</div>'}
 return h+'</section>';
}
const beforeRight=renderRight;
renderRight=function(){beforeRight();const r=document.querySelector('#right');if(r&&S.mode==='design')r.insertAdjacentHTML('beforeend',proPanel())};
ACT['moza3-new-set']=()=>createVariantSet();
ACT['moza3-new-variant']=()=>createVariant();
ACT['moza3-create-style']=b=>saveStyle(b.dataset.v);
ACT['moza3-apply-style']=b=>applyStyle(b.dataset.id);
ACT['moza3-update-style']=b=>updateStyle(b.dataset.id);
ACT['moza3-delete-style']=b=>deleteStyle(b.dataset.id);
ACT['moza3-constraints-save']=()=>captureConstraints(document.querySelector('#moza3-anch-h')?.value,document.querySelector('#moza3-anch-v')?.value);
ACT['moza3-constraints-apply']=()=>reflowConstraints();
ACT['moza3-constraints-remove']=()=>removeConstraints();
ACT['moza3-boolean']=b=>applyBoolean(b.dataset.v);
ACT['moza3-grid-create']=()=>createGridLayout();
ACT['moza3-grid-reflow']=()=>reflowGrid();
ACT['moza3-grid-remove']=()=>removeGrid();
document.addEventListener('change',ev=>{
 const input=ev.target.closest('[data-moza3-variant]');if(input)switchVariant(input.value);
 const g=ev.target.closest('[data-moza3-grid]');if(g)updateGrid(g.dataset.moza3Grid,g.value);
});
window.MozaPro={version:'3.0.0',createVariantSet,createVariant,switchVariant,saveStyle,applyStyle,updateStyle,deleteStyle,captureConstraints,reflowConstraints,removeConstraints,constrainedGeometry,booleanGeometry,applyBoolean,createGridLayout,updateGrid,reflowGrid,removeGrid,status:()=>({ready:ready(),variants:variantSets().length,styles:styles().length,engine:'Atelier JavaScript canvas'})};
console.info('[Moza V3] Variants, style library, constraints and boolean shape flattening loaded; Atelier Auth/RSVP unchanged.');
})();
