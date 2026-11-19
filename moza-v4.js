/* Moza Studio V4 — incremental editor-only features for Atelier v30.68.
 * Design variables are explicitly assigned to safe visual fields. They are
 * materialised into the original Atelier element model, so original rendering,
 * export, and cloud persistence remain in control of Atelier.
 * Neither Auth/RSVP state nor public-site output are intercepted.
 */
(function(){
'use strict';
if(window.MozaV4)return;
const MODES=['default','alternate'];
const FIELDS={
 fill:{type:'color',label:'Fill (bentuk)',set:(e,v)=>{e.fill={...(typeof e.fill==='object'&&e.fill?e.fill:{}),t:'solid',c:v}}},
 stroke:{type:'color',label:'Stroke',set:(e,v)=>{e.sc=v}},
 text:{type:'color',label:'Warna teks',set:(e,v)=>{e.st||={};e.st.color=v}},
 background:{type:'color',label:'Background',set:(e,v)=>{e.st||={};e.st.bg=v}},
 fontSize:{type:'number',label:'Ukuran font',set:(e,v)=>{e.st||={};e.st.fs=v}},
 radius:{type:'number',label:'Sudut radius',set:(e,v)=>{e.st||={};e.st.br=v}},
 opacity:{type:'number',label:'Opacity (0–1)',set:(e,v)=>{e.st||={};e.st.op=v}}
};
const COLOR=/^#(?:[\da-f]{3}|[\da-f]{6}|[\da-f]{8})$/i;
const html=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const ready=()=>typeof S!=='undefined'&&S.doc&&Array.isArray(S.doc.pages);
const notify=msg=>typeof toast==='function'?toast(msg):console.info('[Moza V4]',msg);
const system=(create=false)=>{
 if(!ready())return null;
 if(!S.doc.mozaDesignSystem&&create)S.doc.mozaDesignSystem={version:4,components:[],variantSets:[],styles:[],variables:[],variableMode:'default'};
 const d=S.doc.mozaDesignSystem;
 if(create){d.version=Math.max(4,+d.version||0);d.variables||=[];d.variableMode||='default'}
 return d;
};
const variables=()=>system()?.variables||[];
const mode=()=>MODES.includes(system()?.variableMode)?system().variableMode:'default';
const chosen=()=>ready()&&S.sel?.k==='el'?T('el'):null;
const chosenIds=()=>{if(!ready())return[];return typeof selIds==='function'?selIds():[]};
const editable=e=>e&&!e.locked&&!['form','embed'].includes(e.type);
const uid4=()=>typeof uid==='function'?uid('mv-'):'mv-'+Math.random().toString(36).slice(2);
const mark=()=>{if(typeof afterEdit==='function')afterEdit();if(typeof renderLeft==='function'&&S.tab==='moza-components')renderLeft()};
const validValue=(type,value,field)=>{
 if(type==='color')return typeof value==='string'&&COLOR.test(value)?value.toLowerCase():null;
 const n=Number(value);
 if(value===''||value===null||!Number.isFinite(n))return null;
 if(field==='opacity')return n>=0&&n<=1?n:null;
 return n>=0&&n<=3000?n:null;
};
const byId=id=>variables().find(v=>v.id===id);
function resolveValue(id,m=mode(),seen=new Set()){
 const v=byId(id);if(!v||seen.has(id))return null;
 const val=v.values?.[m]??v.values?.default;
 if(val&&typeof val==='object'&&typeof val.ref==='string'){
  const other=byId(val.ref);if(!other||other.type!==v.type)return null;
  const next=new Set(seen);next.add(id);return resolveValue(other.id,m,next);
 }
 return validValue(v.type,val);
}
function refs(){const result=[];
 if(!ready())return result;
 const walk=items=>{for(const e of items||[]){if(e.mozaVariableBindings&&typeof e.mozaVariableBindings==='object')result.push(e);
  if(Array.isArray(e.children))walk(e.children)}};
 for(const p of S.doc.pages)for(const s of p.sections)walk(s.elements);
 return result;
}
function propagate(){let count=0;
 for(const e of refs())for(const [field,id] of Object.entries(e.mozaVariableBindings||{})){
  if(!FIELDS[field]||!editable(e))continue;
  const v=byId(id);if(!v||v.type!==FIELDS[field].type)continue;
  const value=validValue(v.type,resolveValue(id,mode()),field);if(value===null)continue;
  FIELDS[field].set(e,value);count++;
 }
 return count;
}
function createVariable(name,type,defaultVal,alternateVal){
 if(!ready()||!['color','number'].includes(type))return false;
 name=String(name||'').trim().slice(0,64);
 const a=validValue(type,defaultVal),b=validValue(type,alternateVal);
 if(!name||a===null||b===null){notify('Nama dan nilai tidak valid. Warna gunakan #RRGGBB.');return false}
 if(variables().some(v=>v.name.toLowerCase()===name.toLowerCase())){notify('Nama variabel harus unik.');return false}
 commit(discrete());const entry={id:uid4(),name,type,values:{default:a,alternate:b}};
 system(true).variables.push(entry);mark();notify('Variabel baru: '+name);return entry.id;
}
function setValue(id,m,value){
 if(!MODES.includes(m))return false;
 const v=byId(id);if(!v)return false;
 const val=validValue(v.type,value);if(val===null)return false;
 commit(discrete());v.values[m]=val;propagate();mark();return true;
}
function setAlias(id,m,targetId){
 if(!MODES.includes(m)||id===targetId)return false;
 const v=byId(id),target=byId(targetId);
 if(!v||!target||v.type!==target.type)return false;
 const original=v.values[m];v.values[m]={ref:targetId};
 if(resolveValue(id,m)===null){v.values[m]=original;notify('Alias membentuk siklus / nilai tidak valid.');return false}
 v.values[m]=original;commit(discrete());v.values[m]={ref:targetId};propagate();mark();return true;
}
function clearAlias(id,m){
 const v=byId(id);if(!v||!MODES.includes(m)||!v.values?.[m]?.ref)return false;
 const current=resolveValue(id,m);if(current===null)return false;
 commit(discrete());v.values[m]=current;propagate();mark();return true;
}
function setMode(next){
 if(!MODES.includes(next)||!ready())return false;
 if(mode()===next)return true;
 commit(discrete());system(true).variableMode=next;
 const updated=propagate();mark();notify('Mode '+next+' aktif: '+updated+' properti diperbarui.');return true;
}
function bind(id,field,ids=chosenIds()){
 const v=byId(id),f=FIELDS[field];if(!v||!f||v.type!==f.type)return false;
 const value=validValue(v.type,resolveValue(id),field);if(value===null)return false;
 const unique=[...new Set(ids||[])];const targets=unique.map(x=>findEl(x)?.el).filter(editable);
 if(!targets.length)return false;
 commit(discrete());for(const e of targets){e.mozaVariableBindings||={};e.mozaVariableBindings[field]=id;f.set(e,value)}
 mark();notify('Variabel '+v.name+' diterapkan ke '+targets.length+' elemen.');return true;
}
function unbind(field,ids=chosenIds()){
 if(!FIELDS[field])return false;
 const targets=[...new Set(ids||[])].map(x=>findEl(x)?.el).filter(e=>e?.mozaVariableBindings?.[field]);
 if(!targets.length)return false;
 commit(discrete());for(const e of targets){delete e.mozaVariableBindings[field];if(!Object.keys(e.mozaVariableBindings).length)delete e.mozaVariableBindings}
 mark();notify('Binding dilepaskan; warna/ukuran terakhir tetap.');return true;
}
function removeVariable(id){
 if(!byId(id))return false;
 const dependents=[];
 for(const other of variables())if(other.id!==id)for(const m of MODES){
  if(other.values?.[m]?.ref===id){const concrete=resolveValue(other.id,m);if(concrete!==null)dependents.push({other,m,concrete})}
 }
 commit(discrete());for(const x of dependents)x.other.values[x.m]=x.concrete;
 system(true).variables=variables().filter(v=>v.id!==id);
 for(const e of refs()){
  for(const [field,vid] of Object.entries(e.mozaVariableBindings||{})){
   if(vid===id)delete e.mozaVariableBindings[field];
  }
  if(e.mozaVariableBindings&&!Object.keys(e.mozaVariableBindings).length)delete e.mozaVariableBindings;
 }
 mark();notify('Variabel dihapus, tampilan objek tetap.');return true;
}
function hasSafeShape(e){return !!e&&typeof findEl==='function'&&findEl(e.id)}
function inspectData(el=chosen(),b=(typeof S!=='undefined'?S.bp:'d')){
 if(!el||!hasSafeShape(el))return null;
 const f=findEl(el.id),bp=['d','t','m'].includes(b)?b:'d';
 const get=k=>Math.round((typeof effG==='function'?effG(el,bp,k):el[k])||0);
 const g={x:get('x'),y:get('y'),width:get('w'),height:get('h'),rotation:Math.round((el.rot||0)*100)/100};
 const color=el.fill?.c||el.st?.bg||null;
 let css=`position: absolute;\nleft: ${g.x}px;\ntop: ${g.y}px;\nwidth: ${g.width}px;\nheight: ${g.height}px;`;
 if(g.rotation)css+=`\ntransform: rotate(${g.rotation}deg);`;
 if(typeof color==='string'&&COLOR.test(color))css+=`\nbackground-color: ${color};`;
 if(typeof el.st?.color==='string'&&COLOR.test(el.st.color))css+=`\ncolor: ${el.st.color};`;
 if(Number.isFinite(+el.st?.fs))css+=`\nfont-size: ${el.st.fs}px;`;
 if(Number.isFinite(+el.st?.br))css+=`\nborder-radius: ${el.st.br}px;`;
 return {id:el.id,name:el.name||el.type||'Element',type:el.type,sectionId:f?.sec?.id,bp,geometry:g,css};
}
let paletteOpen=false,query='',active=0;
const actions=()=>[
 {id:'moza-v4-variable-open',name:'Buka Variables / Design Tokens',desc:'Warna dan angka dengan 2 mode'},
 {id:'moza-v4-inspect-open',name:'Buka Inspect CSS',desc:'Ukur elemen dan salin CSS'},
 {id:'moza-layout-start',name:'Responsive Auto Layout',desc:'Buat alur elemen fleksibel'},
 {id:'moza-tidy',name:'Tidy Grid',desc:'Rapikan beberapa elemen'},
 {id:'moza-component-create',name:'Create Component',desc:'Simpan elemen sebagai komponen'},
 {id:'moza3-grid-create',name:'Responsive Grid',desc:'Susun kolom responsif'},
 {id:'moza3-constraints-save',name:'Capture Constraints',desc:'Simpan anchor pada elemen'},
 {id:'moza3-constraints-apply',name:'Reflow Constraints',desc:'Hitung ulang desktop / tablet / HP'},
 {id:'moza3-new-set',name:'Create Variant Set',desc:'Kumpulan varian komponen'},
 {id:'moza3-new-variant',name:'Add Component Variant',desc:'Buat varian baru'}
 ];
function filtered(){const q=query.toLocaleLowerCase().trim();return actions().filter(a=>!q||(a.name+' '+a.desc).toLocaleLowerCase().includes(q))}
function paletteNode(){return document.querySelector('#moza-v4-dialog')}
function closePalette(){const root=paletteNode();if(root)root.remove();paletteOpen=false;}
function paletteList(){const el=document.querySelector('#moza-v4-results');if(!el)return;
 const list=filtered();active=Math.min(active,Math.max(0,list.length-1));
 el.innerHTML=list.length?list.map((a,i)=>`<button type="button" class="moza-v4-result ${i===active?'active':''}" data-v4-run="${html(a.id)}" role="option" aria-selected="${i===active}"><strong>${html(a.name)}</strong><small>${html(a.desc)}</small></button>`).join(''):'<p class="moza-v4-empty">Perintah tidak ditemukan.</p>';
}
function openPalette(){if(!ready()||S.mode!=='design')return false;
 if(paletteOpen){document.querySelector('#moza-v4-search')?.focus();return true}
 paletteOpen=true;query='';active=0;
 const node=document.createElement('div');node.id='moza-v4-dialog';node.className='moza-v4-overlay';
 node.innerHTML='<div class="moza-v4-command" role="dialog" aria-modal="true" aria-label="Cari perintah Moza Studio"><div class="moza-v4-searchrow"><span>⌘</span><input id="moza-v4-search" type="search" autocomplete="off" placeholder="Cari perintah editor…" aria-label="Cari perintah"/><button type="button" data-v4-close="1" aria-label="Tutup">✕</button></div><div id="moza-v4-results" class="moza-v4-results" role="listbox"></div><footer>↑ ↓ pilih • Enter jalankan • Esc tutup</footer></div>';
 document.body.append(node);paletteList();node.querySelector('input').focus();return true;
}
function runCommand(id){const action=actions().find(a=>a.id===id);if(!action)return false;
 closePalette();const cb=typeof ACT!=='undefined'?ACT[id]:null;
 if(typeof cb!=='function')return false;
 try{cb({dataset:{}});return true}catch(err){console.warn('[Moza V4] perintah gagal',id,err);notify('Perintah gagal; lihat konsol editor.');return false}
}
let section='variables';
function panel(){if(!ready()||S.mode!=='design')return '';
 const d=system(),vs=variables(),current=chosen();
 const val=(v,m)=>{const p=v.values?.[m];return p&&typeof p==='object'?'↪ '+(byId(p.ref)?.name||'Alias hilang'):p??''};
 let h='<section class="moza-v4"><header><b>⌘ Moza Tools</b><button type="button" class="btn sm" data-a="moza-v4-palette">Cari ⌘K</button></header>';
 h+=`<div class="moza-v4-tabs"><button type="button" data-a="moza-v4-variable-open" class="${section==='variables'?'on':''}">Variables</button><button type="button" data-a="moza-v4-inspect-open" class="${section==='inspect'?'on':''}">Inspect</button></div>`;
 if(section==='inspect'){
  const info=inspectData(current);
  h+='<div class="moza-v4-card"><b>Inspect / handoff</b>';
  if(info){const g=info.geometry;
   h+=`<p>${html(info.name)} • ${html(info.bp.toUpperCase())}</p><div class="moza-v4-metrics"><span>X <b>${g.x}</b></span><span>Y <b>${g.y}</b></span><span>W <b>${g.width}</b></span><span>H <b>${g.height}</b></span></div><pre class="moza-v4-css" id="moza-v4-css-preview">${html(info.css)}</pre><button type="button" class="btn" data-a="moza-v4-copy">Salin CSS</button>`;
  }else h+='<p class="hint">Pilih satu objek di canvas untuk memeriksa ukuran dan CSS.</p>';
  h+='</div>';
 }else{
  h+=`<div class="moza-v4-card"><b>Project Variables</b><p class="hint">Disimpan bersama dokumen. Ganti mode untuk menerapkan nilai ke seluruh elemen yang terhubung.</p>
   <label class="moza-v4-label">Mode desain<select data-moza-v4-mode="1"><option value="default" ${mode()==='default'?'selected':''}>Default</option><option value="alternate" ${mode()==='alternate'?'selected':''}>Alternate</option></select></label>
   <div class="moza-v4-new"><input id="moza-v4-new-name" placeholder="Nama token" maxlength="64" aria-label="Nama token"/><select id="moza-v4-new-type" aria-label="Jenis token"><option value="color">Warna</option><option value="number">Angka</option></select><input id="moza-v4-new-a" placeholder="#b76e79" aria-label="Default"/><input id="moza-v4-new-b" placeholder="#ffffff" aria-label="Alternate"/></div>
   <button type="button" class="btn" data-a="moza-v4-new">+ Buat variable</button></div>`;
  if(vs.length){
   h+='<div class="moza-v4-card"><b>Library Variables</b>';
   for(const v of vs){h+=`<div class="moza-v4-token"><strong>${html(v.name)} <small>${v.type==='color'?'●':'#'}</small></strong><div class="moza-v4-pair"><label>Default<input type="text" data-moza-v4-value="${html(v.id)}" data-m="default" value="${html(val(v,'default'))}" title="Ubah nilai Default" ${typeof v.values?.default==='object'?'disabled':''}/></label><label>Alternate<input type="text" data-moza-v4-value="${html(v.id)}" data-m="alternate" value="${html(val(v,'alternate'))}" title="Ubah nilai Alternate" ${typeof v.values?.alternate==='object'?'disabled':''}/></label></div><label class="moza-v4-label">Alias mode aktif (${mode()})<select data-moza-v4-alias="${html(v.id)}"><option value="">Nilai sendiri (tanpa alias)</option>${vs.filter(x=>x.id!==v.id&&x.type===v.type).map(x=>`<option value="${html(x.id)}" ${v.values?.[mode()]?.ref===x.id?'selected':''}>↪ ${html(x.name)}</option>`).join('')}</select></label><div class="moza-v4-actions">${current?Object.entries(FIELDS).filter(([,x])=>x.type===v.type).map(([field,obj])=>`<button type="button" class="btn sm" data-a="moza-v4-bind" data-id="${html(v.id)}" data-f="${field}">${html(obj.label)}</button>`).join(''):''}<button type="button" class="btn sm" data-a="moza-v4-del" data-id="${html(v.id)}">Hapus</button></div></div>`}
   h+='</div>';
   if(current&&current.mozaVariableBindings&&Object.keys(current.mozaVariableBindings).length){h+='<div class="moza-v4-card"><b>Bindings elemen</b>';
    for(const [field,id] of Object.entries(current.mozaVariableBindings)){h+=`<div class="moza-v4-binding"><span>${html(FIELDS[field]?.label||field)}: ${html(byId(id)?.name||'Hilang')}</span><button type="button" class="btn sm" data-a="moza-v4-unbind" data-f="${html(field)}">Lepas</button></div>`}
    h+='</div>';
   }
  }else h+='<p class="hint">Belum ada design variables.</p>';
 }
 return h+'</section>';
}
// Register delegated actions with Atelier so clicks are not swallowed by its own global handler.
ACT['moza-v4-palette']=()=>openPalette();
ACT['moza-v4-variable-open']=()=>{section='variables';renderRight()};
ACT['moza-v4-inspect-open']=()=>{section='inspect';renderRight()};
ACT['moza-v4-new']=()=>{
 const get=id=>document.getElementById(id)?.value;
 const result=createVariable(get('moza-v4-new-name'),get('moza-v4-new-type'),get('moza-v4-new-a'),get('moza-v4-new-b'));
 if(result)renderRight();
};
ACT['moza-v4-bind']=btn=>bind(btn.dataset.id,btn.dataset.f);
ACT['moza-v4-unbind']=btn=>unbind(btn.dataset.f);
ACT['moza-v4-scroll']=()=>{document.querySelector('.moza-v4')?.scrollIntoView({block:'start',behavior:'smooth'})};
ACT['moza-v4-del']=btn=>{if(window.confirm('Hapus variable dan lepaskan binding?'))removeVariable(btn.dataset.id)};
ACT['moza-v4-copy']=async()=>{
 const info=inspectData();if(!info)return;
 try{await navigator.clipboard.writeText(info.css);notify('CSS disalin.')}catch(e){notify('Clipboard tidak tersedia; salin dari kotak CSS.');}
};
const previousRight=renderRight;
renderRight=function(){previousRight();const r=document.querySelector('#right');if(!r||S.mode!=='design')return;
 r.insertAdjacentHTML('beforeend',panel());
 const header=r.querySelector('.m-rgrip')||r.querySelector('.rhead');
 if(header&&!r.querySelector('.moza-v4-jump'))header.insertAdjacentHTML('afterend','<div class="moza-v4-jump"><button type="button" class="btn sm" data-a="moza-v4-scroll">✦ Moza Tools · Variables & Inspect ↓</button></div>');
};
const previousTop=renderTop;
renderTop=function(){previousTop();const t=document.querySelector('#top');if(!t||t.querySelector('[data-a="moza-v4-palette"]'))return;
 const anchor=t.querySelector('[data-a="moza-components-open"]')||t.querySelector('[data-a="preview"]')||t.lastElementChild;if(anchor)anchor.insertAdjacentHTML('beforebegin','<button class="btn moza-v4-top-btn" data-a="moza-v4-palette" title="Cari perintah (Ctrl+K)">⌘ Cari</button>');
};
document.addEventListener('change',e=>{
 if(e.target.matches('[data-moza-v4-mode]'))setMode(e.target.value);
 const alias=e.target.closest('[data-moza-v4-alias]');if(alias){
  const id=alias.dataset.mozaV4Alias;
  const ok=alias.value?setAlias(id,mode(),alias.value):clearAlias(id,mode());
  if(!ok){notify('Alias tidak bisa dipakai.');renderRight()}
  return;
 }
 const v=e.target.closest('[data-moza-v4-value]');if(v){
  const result=setValue(v.dataset.mozaV4Value,v.dataset.m,v.value);
  if(!result){notify('Nilai tidak valid. Gunakan warna HEX atau angka.');renderRight();}
 }
});
document.addEventListener('input',e=>{
 if(e.target?.id==='moza-v4-search'){query=e.target.value;active=0;paletteList()}
});
document.addEventListener('click',e=>{
 if(!paletteOpen)return;
 if(e.target?.id==='moza-v4-dialog'||e.target.closest('[data-v4-close]')){closePalette();return}
 const b=e.target.closest('[data-v4-run]');if(b)runCommand(b.dataset.v4Run);
});
document.addEventListener('keydown',e=>{
 if(e.key==='Escape'&&paletteOpen){e.preventDefault();e.stopImmediatePropagation();closePalette();return}
 if((e.metaKey||e.ctrlKey)&&e.key.toLowerCase()==='k'&&!e.altKey&&!e.isComposing&&S.mode==='design'){
  e.preventDefault();e.stopImmediatePropagation();openPalette();return;
 }
 if(!paletteOpen)return;
 if(e.key==='ArrowDown'||e.key==='ArrowUp'){
  e.preventDefault();e.stopImmediatePropagation();const list=filtered();active=Math.min(Math.max(0,active+(e.key==='ArrowDown'?1:-1)),Math.max(0,list.length-1));paletteList();return;
 }
 if(e.key==='Enter'&&document.activeElement?.id==='moza-v4-search'){
  e.preventDefault();e.stopImmediatePropagation();const item=filtered()[active];if(item)runCommand(item.id);
 }
},true);
window.MozaV4={version:'4.0.0',createVariable,setValue,setAlias,clearAlias,resolveValue,setMode,bind,unbind,removeVariable,propagate,inspectData,openPalette,closePalette,runCommand,status:()=>({ready:ready(),mode:mode(),variables:variables().length,boundElements:refs().length,paletteOpen})};
// The Atelier home overlay can leave the already-rendered editor beneath it.
// Refresh the inherited inspector once now, in addition to wrapping future redraws.
try{if(ready()&&document.querySelector('#right'))renderRight();if(ready()&&document.querySelector('#top'))renderTop();}catch(e){console.warn('[Moza V4] initial editor refresh skipped',e)}
console.info('[Moza V4] Variables, Inspect and Command Palette active; Atelier backend unchanged.');
})();
