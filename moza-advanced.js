/* Moza Studio Advanced V2 — additive Atelier editor enhancement.
   Do not change Auth, Supabase, RSVP, media, preview or Atelier project schema.
   Project-local component definitions and responsive arrange metadata are stored
   only in additional `doc.mozaDesignSystem` and `element.moza*` fields. */
(function(){
'use strict';
if(window.MozaAdvanced) return;
const BPS=['d','t','m'];
const htmlEscape = v => String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fin=(n,min,max,def)=>{const v=Number(n);return Number.isFinite(v)?Math.max(min,Math.min(max,v)):def};
const isReady=()=>typeof S!=='undefined'&&!!S.doc&&Array.isArray(S.doc.pages);
function designSystem(create=false){
 if(!isReady())return null;
 if(!S.doc.mozaDesignSystem&&create)S.doc.mozaDesignSystem={version:2,components:[]};
 const ds=S.doc.mozaDesignSystem;
 if(ds&&create&&!Array.isArray(ds.components))ds.components=[];
 return ds||null;
}
const components=()=>designSystem()?.components||[];
const selected=()=>S.sel?.k==='el'?T('el'):null;
function copiedDefinition(el){
 const copy=clone(el);
 delete copy.mozaComponentId; delete copy.mozaComponentName;
 // master stores its original dimensions; insertion uses a fresh identity.
 return copy;
}
function makeComponent(){
 const el=selected();if(!el){toast('Pilih satu elemen atau group di canvas.');return false}
 const unsafe=(node)=>['form','embed'].includes(node.type)||(node.children||[]).some(unsafe);
 if(unsafe(el)){toast('Form RSVP / HTML Embed tidak dijadikan komponen agar ID dan integrasinya tetap aman.');return false}
 if(el.locked){toast('Buka kunci elemen terlebih dahulu.');return false}
 const proposed=(el.name||'Komponen').replace(/ copy$/,'') || 'Komponen';
 const entry=window.prompt('Nama komponen reusable:',proposed);
 if(entry===null)return false;
 const name=entry.trim().slice(0,80);
 if(!name){toast('Nama komponen tidak boleh kosong.');return false}
 commit(discrete());
 const item={id:uid('moza-comp-'),name,createdAt:Date.now(),updatedAt:Date.now(),root:copiedDefinition(el)};
 const ds=designSystem(true);ds.components.push(item);
 el.mozaComponentId=item.id;el.mozaComponentName=name;
 afterEdit();renderLeft();toast('Komponen tersimpan dalam project: '+name);
 return true;
}
function insertComponent(id){
 const def=components().find(c=>c.id===id),si=secInfo(selSecId());
 if(!def||!si){toast('Pilih section tujuan terlebih dahulu.');return false}
 const obj=clone(def.root);reidEl(obj);
 obj.name=def.name;obj.mozaComponentId=def.id;obj.mozaComponentName=def.name;
 // Keep a group component as one Atelier group; no second canvas is created.
 addEl(obj,si.sec.id);
 renderLeft();toast('Instance '+def.name+' ditambahkan.');return true;
}
function detachComponent(){
 const el=selected();if(!el?.mozaComponentId)return false;
 commit(discrete());delete el.mozaComponentId;delete el.mozaComponentName;
 afterEdit();toast('Instance dilepas; elemen bebas diedit.');return true;
}
function updateComponent(){
 const el=selected();if(!el?.mozaComponentId)return false;
 const def=components().find(c=>c.id===el.mozaComponentId);
 if(!def){toast('Master komponen tidak ditemukan di project.');return false}
 if(el.locked){toast('Buka kunci elemen terlebih dahulu.');return false}
 commit(discrete());
 def.root=copiedDefinition(el);def.updatedAt=Date.now();
 let changes=0;
 const syncList = list => {
  for(let i=0;i<list.length;i++){
   const old=list[i];
   if(old.id!==el.id&&old.mozaComponentId===def.id){
    const item=clone(def.root);reidEl(item);
    item.id=old.id;
    // Preserve each instance's geometry, visibility and responsive overrides.
    for(const key of ['x','y','w','h','rot','bp','hideOn','locked','hidden','_fx','_groupBase','gw','gh']){
     if(old[key]!==undefined)item[key]=clone(old[key]);
    }
    item.mozaComponentId=def.id;item.mozaComponentName=def.name;
    list[i]=item;changes++;
   }else if(old.children)syncList(old.children);
  }
 };
 for(const page of S.doc.pages)for(const section of page.sections)syncList(section.elements);
 afterEdit();renderLeft();toast('Master diperbarui; '+changes+' instance disinkronkan.');return true;
}
function deleteComponent(id){
 const def=components().find(c=>c.id===id);if(!def)return false;
 if(!window.confirm('Hapus komponen “'+def.name+'” dari library? Instance di canvas tetap ada.'))return false;
 commit(discrete());
 const ds=designSystem(true);ds.components=ds.components.filter(c=>c.id!==id);
 // Keep Variant Set metadata valid when a master/variant is deleted.
 // Never remove surviving variants or modify their visible canvas instances.
 if(Array.isArray(ds.variantSets)){
  ds.variantSets=ds.variantSets.map(set=>({
   ...set,variants:(set.variants||[]).filter(v=>v.componentId!==id)
  })).filter(set=>set.variants.length);
 }

 // Previously inserted items remain editable but no longer linked to a master.
 for(const p of S.doc.pages)for(const s of p.sections)walkEls(s.elements,e=>{
  if(e.mozaComponentId===id){delete e.mozaComponentId;delete e.mozaComponentName}
 });
 afterEdit();renderLeft();toast('Komponen dihapus dari library; instance di canvas tetap ada.');return true;
}
function currentGroup(){const el=selected();return el?.type==='group'&&!el.mask?el:null}
function ensureGroup(){
 let g=currentGroup();if(g)return g;
 const ids=selIds();
 if(ids.length<2){toast('Pilih minimal 2 elemen (Shift-click) untuk membuat Auto Layout.');return null}
 const fs=ids.map(findEl);
 if(fs.some(f=>!f||f.el.locked||f.parent)||fs.some(f=>f.list!==fs[0].list)){
  toast('Pilih elemen yang tidak terkunci di section yang sama.');return null;
 }
 makeGroup(ids,false);
 return currentGroup();
}
function defaults(){return {direction:'row',mobile:'column',gap:16,padding:16,align:'start',wrap:true}}
function configOf(g){return {...defaults(),...(g.mozaAutoLayout||{})}}
function applyGroupLayout(group){
 if(!group||group.type!=='group'||group.mask||!group.children?.length)return false;
 const cfg=configOf(group);
 // Reflow once per breakpoint, maintaining Atelier's independent breakpoint overrides.
 for(const b of BPS){
  const dir=b==='m'?cfg.mobile:cfg.direction;
  const vertical=dir==='column';
  const gap=fin(cfg.gap,0,120,16)*(b==='m'?.75:b==='t'?.9:1);
  let pad=fin(cfg.padding,0,120,16)*(b==='m'?.75:b==='t'?.9:1);
  let width=Math.max(70,effG(group,b,'w'));
  // Extremely narrow groups must not place all children past the group edge.
  pad=Math.min(pad,Math.max(0,(width-36)/2));
  const capacity=Math.max(36,width-2*pad);
  let bottom=pad;
  const active=group.children.filter(child=>!child.hidden&&!child.hideOn?.[b]);
  if(vertical){
   let y=pad;
   for(const child of active){
    const w=Math.max(12,Math.min(capacity,effG(child,b,'w')));
    const h=Math.max(8,effG(child,b,'h'));
    const x=pad+(cfg.align==='center'?(capacity-w)/2:cfg.align==='end'?capacity-w:0);
    setGeom(child,b,{x:Math.round(x),y:Math.round(y),w:Math.round(w),h:Math.round(h)});
    bottom=Math.max(bottom,y+h);
    y+=h+gap;
   }
  }else{
   // Compute each row's maximum height before positioning its children, so
   // Center and End also work in the horizontal direction.
   const rows=[];let row=[],used=0,rowHeight=0;
   for(const child of active){
    const w=Math.max(12,Math.min(capacity,effG(child,b,'w')));
    const h=Math.max(8,effG(child,b,'h'));
    if(cfg.wrap!==false&&row.length&&used+gap+w>capacity+0.1){
     rows.push({items:row,height:rowHeight});row=[];used=0;rowHeight=0;
    }
    row.push({child,w,h,x:pad+used+(row.length?gap:0)});
    used+=w+(row.length>1?gap:0);
    rowHeight=Math.max(rowHeight,h);
   }
   if(row.length)rows.push({items:row,height:rowHeight});
   let y=pad;
   for(const r of rows){
    for(const cell of r.items){
     const off=cfg.align==='center'?(r.height-cell.h)/2:cfg.align==='end'?r.height-cell.h:0;
     setGeom(cell.child,b,{x:Math.round(cell.x),y:Math.round(y+off),w:Math.round(cell.w),h:Math.round(cell.h)});
    }
    bottom=Math.max(bottom,y+r.height);
    y+=r.height+gap;
   }
  }
  const height=Math.max(32,Math.ceil(bottom+pad));
  setGeom(group,b,{h:height});
  group._responsiveGroup=true;
  group._groupBase ||= {};
  group._groupBase[b]={w:width,h:height};
  if(b==='d'){group.gw=width;group.gh=height}
  const f=findEl(group.id),sec=f?.sec;
  if(sec&&!sec.kind){
   const required=effG(group,b,'y')+height+Math.max(16,pad);
   if(required>secH(sec,b)){
    if(b==='d')sec.h=Math.ceil(required);
    else {sec.hb||={};sec.hb[b]=Math.ceil(required)}
   }
  }
 }
 return true;
}
function startLayout(){
 // Converting selected elements into a group uses Atelier's existing group semantics.
 const g=ensureGroup();if(!g)return false;
 if(g.locked){toast('Group terkunci.');return false}
 commit(discrete());
 g.mozaAutoLayout=configOf(g);g.name=g.name==='Group'?'Auto Layout':g.name;
 applyGroupLayout(g);afterEdit();toast('Auto Layout aktif di Desktop / Tablet / Mobile.');return true;
}
function reflow(){
 const g=currentGroup();if(!g?.mozaAutoLayout){toast('Pilih Auto Layout group dahulu.');return false}
 commit(discrete());applyGroupLayout(g);afterEdit();toast('Auto Layout diperbarui untuk semua breakpoint.');return true;
}
function removeLayout(){
 const g=currentGroup();if(!g?.mozaAutoLayout)return false;
 commit(discrete());delete g.mozaAutoLayout;afterEdit();toast('Auto Layout dimatikan; posisi terakhir tetap ada.');return true;
}
function updateLayout(field,value){
 const g=currentGroup();if(!g?.mozaAutoLayout)return false;
 if(!['direction','mobile','gap','padding','align','wrap'].includes(field))return false;
 commit(discrete());
 const cfg=g.mozaAutoLayout;
 cfg[field]=field==='gap'||field==='padding'?fin(value,0,120,16):field==='wrap'?(value==='true'):value;
 applyGroupLayout(g);afterEdit();return true;
}
// Fast Figma-style tidy of a selected set; existing Atelier multi-select stays intact.
function tidySelection(){
 const ids=selIds();if(ids.length<2){toast('Pilih dua elemen atau lebih.');return false}
 const fs=ids.map(findEl);
 if(fs.some(f=>!f||f.parent||f.el.locked)||fs.some(f=>f.list!==fs[0].list)){
  toast('Tidy hanya untuk elemen yang tidak terkunci di section yang sama.');return false;
 }
 // Stable visual ordering, using their desktop original geometry.
 const elements=fs.map(f=>f.el).sort((a,b)=>a.y-b.y||a.x-b.x);
 commit(discrete());
 for(const bp of BPS){
  const gap=bp==='m'?12:bp==='t'?15:18;
  const baseX=Math.max(12,Math.min(BP[bp]-90,Math.min(...elements.map(e=>effG(e,bp,'x')))));
  const available=Math.max(90,BP[bp]-baseX-12);
  const desiredCols=bp==='m'?1:bp==='t'?Math.min(2,elements.length):Math.min(4,Math.ceil(Math.sqrt(elements.length)));
  const columns=Math.max(1,Math.min(desiredCols,Math.floor((available+gap)/(60+gap))));
  const baseY=Math.max(12,Math.min(...elements.map(e=>effG(e,bp,'y'))));
  const unit=Math.max(60,(available-(columns-1)*gap)/columns);
  const rowMax=[];
  elements.forEach((e,i)=>{const row=Math.floor(i/columns);rowMax[row]=Math.max(rowMax[row]||0,effG(e,bp,'h'))});
  const ys=[];let current=baseY;
  for(const h of rowMax){ys.push(current);current+=h+gap}
  elements.forEach((e,i)=>{
   const col=i%columns,row=Math.floor(i/columns);
   const naturalW=effG(e,bp,'w');
   const width=Math.max(12,Math.min(naturalW,unit));
   const x=Math.min(BP[bp]-width-8,baseX+col*(unit+gap));
   setGeom(e,bp,{x:Math.round(x),y:Math.round(ys[row]),w:Math.round(width)});
  });
  const sec=fs[0].sec,required=current-gap+24;
  if(sec&&!sec.kind&&required>secH(sec,bp)){
   if(bp==='d')sec.h=Math.ceil(required);
   else {sec.hb||={};sec.hb[bp]=Math.ceil(required)}
  }
 }
 afterEdit();toast('Tidy Grid diterapkan: Desktop, Tablet, Mobile.');return true;
}
function componentsPane(){
 const l=components();
 return `<button class="sheetx" data-a="close-left" aria-label="Tutup panel">✕</button><h3>◇ Components</h3>
 <div class="hint">Komponen tersimpan dalam project Atelier yang sama, bukan di website terpisah.</div>
 <div class="moza-pro-note"><b>Reusable Components</b><p>Buat komponen dari elemen atau group, lalu gunakan berulang pada halaman lain.</p>
 <button class="btn pri" data-a="moza-component-create">+ Jadikan pilihan komponen</button></div>
 ${l.length?l.map(c=>`<div class="moza-comp-item"><b title="${htmlEscape(c.name)}">◇ ${htmlEscape(c.name)}</b>
 <div class="row"><button class="btn sm pri" data-a="moza-component-insert" data-id="${htmlEscape(c.id)}">+ Insert</button>
 <button class="btn sm dng" data-a="moza-component-delete" data-id="${htmlEscape(c.id)}">Hapus</button></div></div>`).join(''):'<div class="hint">Belum ada komponen. Pilih sebuah elemen di canvas untuk memulai.</div>'}
 <p class="hint">Edit instance, lalu klik “Update master” untuk menerapkan perubahan ke instance lain. Undo tetap tersedia.</p>`;
}
function extraPanel(){
 const ids=selIds(),e=selected();
 const group=e?.type==='group'&&!e.mask;
 const cfg=group?configOf(e):null;
 let v='<div class="moza-pro-inspector"><div class="moza-pro-head">◇ Moza Advanced <small>V2</small></div>';
 if(ids.length>1){v+='<p class="hint">'+ids.length+' elemen dipilih.</p><button class="btn pri" data-a="moza-layout-start">↔ Buat Responsive Auto Layout</button><button class="btn" data-a="moza-tidy">▦ Tidy Grid (D/T/M)</button>'}
 else if(group){
  if(e.mozaAutoLayout){
   v+=`<div class="moza-pro-form"><label>Arah desktop/tablet<select data-moza-layout="direction"><option value="row" ${cfg.direction==='row'?'selected':''}>Horizontal</option><option value="column" ${cfg.direction==='column'?'selected':''}>Vertikal</option></select></label>
   <label>Arah HP<select data-moza-layout="mobile"><option value="column" ${cfg.mobile==='column'?'selected':''}>Vertikal</option><option value="row" ${cfg.mobile==='row'?'selected':''}>Horizontal</option></select></label>
   <label>Gap (px)<input data-moza-layout="gap" type="number" min="0" max="120" value="${cfg.gap}"></label>
   <label>Padding (px)<input data-moza-layout="padding" type="number" min="0" max="120" value="${cfg.padding}"></label>
   <label>Align<select data-moza-layout="align"><option value="start" ${cfg.align==='start'?'selected':''}>Start</option><option value="center" ${cfg.align==='center'?'selected':''}>Center</option><option value="end" ${cfg.align==='end'?'selected':''}>End</option></select></label>
   <label class="moza-inline">Bungkus baris<input type="checkbox" data-moza-layout="wrap" ${cfg.wrap?'checked':''}></label></div>
   <div class="row"><button class="btn sm pri" data-a="moza-layout-reflow">↻ Reflow</button><button class="btn sm" data-a="moza-layout-remove">Nonaktifkan</button></div>
   <p class="hint">Penataan dihitung untuk desktop, tablet, dan HP. Gunakan Reflow setelah mengubah ukuran anak group.</p>`;
  }else v+='<button class="btn pri" data-a="moza-layout-start">↔ Aktifkan Auto Layout untuk group</button>';
 }
 if(e&&ids.length<2){
  if(e.mozaComponentId){
   const master=components().find(c=>c.id===e.mozaComponentId);
   v+=`<div class="moza-pro-divider"></div><b>◇ Instance: ${htmlEscape(master?.name||'Master hilang')}</b>
   <div class="row"><button class="btn sm pri" data-a="moza-component-update" ${!master?'disabled':''}>Update master</button><button class="btn sm" data-a="moza-component-detach">Detach</button></div>`;
  }else v+='<div class="moza-pro-divider"></div><button class="btn sm" data-a="moza-component-create">◇ Create Component</button>';
 }else if(!ids.length)v+='<p class="hint">Pilih elemen untuk mengelola Auto Layout dan Component.</p>';
 v+='</div>';
 return v;
}
const existingRight=renderRight;
renderRight=function(){existingRight();const node=document.querySelector('#right');if(node)node.insertAdjacentHTML('beforeend',extraPanel())};
const existingLeft=renderLeft;
renderLeft=function(){if(S.tab==='moza-components'){const node=document.querySelector('#left');node.innerHTML=componentsPane();return}existingLeft()};
const existingRail=renderRail;
renderRail=function(){existingRail();const node=document.querySelector('#rail');if(!node)return;
 node.insertAdjacentHTML('beforeend',`<button type="button" data-a="moza-components-open" class="${S.tab==='moza-components'?'on':''}" title="Moza Components" aria-label="Moza Components"><span style="font-size:23px;line-height:22px">◇</span>Components</button>`)};
const existingStatus=renderStatus;
renderStatus=function(){existingStatus();const node=document.querySelector('#statusbar');if(!node)return;
 const first=node.querySelector('[data-a="moza-snap8"]');if(first)first.insertAdjacentHTML('afterend','<button class="btn sm" data-a="moza-layout-start" title="Auto Layout responsif (Shift+A)">↔ Layout</button>')};
const existingTop=renderTop;
renderTop=function(){existingTop();const btn=document.querySelector('#top [data-a="projects"]');if(btn)btn.insertAdjacentHTML('afterend','<button class="btn" data-a="moza-components-open" title="Reusable Components">◇ Components</button>')};
ACT['moza-components-open']=()=>{S.tab='moza-components';S.leftOpen=true;renderRail();renderLeft();layoutPanels()};
ACT['moza-component-create']=()=>makeComponent();
ACT['moza-component-insert']=b=>insertComponent(b.dataset.id);
ACT['moza-component-update']=()=>updateComponent();
ACT['moza-component-detach']=()=>detachComponent();
ACT['moza-component-delete']=b=>deleteComponent(b.dataset.id);
ACT['moza-layout-start']=()=>startLayout();
ACT['moza-tidy']=()=>tidySelection();
ACT['moza-layout-reflow']=()=>reflow();
ACT['moza-layout-remove']=()=>removeLayout();
document.addEventListener('change',ev=>{
 const target=ev.target.closest('[data-moza-layout]');if(!target)return;
 updateLayout(target.dataset.mozaLayout,target.type==='checkbox'?String(target.checked):target.value);
});
document.addEventListener('keydown',ev=>{
 if(ev.defaultPrevented||S.mode!=='design'||ev.isComposing)return;
 const tag=ev.target?.tagName||'';
 if(/^(INPUT|TEXTAREA|SELECT)$/.test(tag)||ev.target?.isContentEditable)return;
 if(!ev.ctrlKey&&!ev.metaKey&&!ev.altKey&&ev.shiftKey&&ev.key.toLowerCase()==='a'){
  ev.preventDefault();startLayout();
 }
 if((ev.ctrlKey||ev.metaKey)&&ev.altKey&&ev.key.toLowerCase()==='k'){
  ev.preventDefault();makeComponent();
 }
},true);
window.MozaAdvanced={version:'2.0.0',features:['responsive auto layout','project components','instance sync','detach','native undo'],status:()=>({ready:isReady(),components:components().length,engine:window.MozaHybrid?.status?.().engine||'JS'}),createComponent:makeComponent,insertComponent,updateComponent,detachComponent,startLayout,reflow,updateLayout,tidySelection};
console.info('[Moza Advanced V2] Integrated into Atelier editor; Supabase and RSVP untouched.');
})();
