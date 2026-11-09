/* Moza Studio Advanced V13 — accessible toolbar overflow + robust table editing.
   Additive adapters; does not replace Atelier's storage, RSVP, or cloud systems. */
(function(){'use strict';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
// Move add-on shortcuts INSIDE one overflow menu, preserving data-a handlers.
const extras=new Set(['moza-components-open','moza-v4-palette','mz5-insert-accordion','mz5-insert-tabs','mz6-insert','mz7-audit','mz10-open','mz11-open','mz12-open']);
function tidyToolbar(){
 const bar=document.getElementById('top');if(!bar||!bar.querySelector('[data-a="preview"]'))return;
 let menu=bar.querySelector('.mz13-overflow');if(!menu){menu=document.createElement('details');menu.className='mz13-overflow';menu.innerHTML='<summary role="button" aria-label="Menu Advanced">✦ Advanced <span aria-hidden="true">▾</span></summary><div class="mz13-overflow-list" role="group" aria-label="Advanced tools"></div>';const anchor=bar.querySelector('[data-a="preview"]');anchor.parentNode.insertBefore(menu,anchor)}
 const list=menu.querySelector('.mz13-overflow-list');
 [...bar.querySelectorAll('button[data-a]')].filter(n=>extras.has(n.dataset.a)&&!n.closest('.mz13-overflow')).forEach(n=>{n.classList.add('mz13-menu-action');list.appendChild(n)});
 const aliases={'moza-components-open':'Components','moza-v4-palette':'Cari perintah','mz5-insert-accordion':'Accordion / FAQ','mz5-insert-tabs':'Sliding Tabs','mz6-insert':'Smart Filter','mz7-audit':'Project Audit','mz10-open':'Preflight','mz11-open':'Version Compare','mz12-open':'Release Center'};
 for(const b of list.querySelectorAll('button[data-a]'))b.textContent=aliases[b.dataset.a]||b.textContent;
 list.querySelectorAll('button').forEach(b=>{if(!b.dataset.mz13Bound){b.dataset.mz13Bound='1';b.addEventListener('click',()=>menu.open=false)}});
}
const prevTop=renderTop;renderTop=function(...args){const result=prevTop.apply(this,args);tidyToolbar();return result};
const style=document.createElement('style');style.textContent=`
#top{min-width:0!important;max-width:100vw;box-sizing:border-box;display:flex;gap:5px!important;flex-wrap:nowrap!important;overflow:visible!important}
#top>*{flex-shrink:0}#top .pname{min-width:70px;max-width:clamp(100px,12vw,200px)}
#top .mz13-overflow{position:relative!important;flex:0 0 auto;align-self:center;z-index:300}#top .mz13-overflow summary{list-style:none;border:1px solid #d9e0ee;border-radius:10px;padding:8px 12px;background:#f7f8fe;color:#304573;cursor:pointer;font-size:12px;font-weight:750;white-space:nowrap}#top .mz13-overflow summary::-webkit-details-marker{display:none}
#top .mz13-overflow[open] summary{border-color:#8094ed;background:#eef2ff}
#top .mz13-overflow-list{position:absolute;z-index:200000;right:0;top:calc(100% + 5px);width:min(260px,90vw);max-height:min(65vh,520px);overflow:auto;background:white;border:1px solid #dee4f0;border-radius:12px;box-shadow:0 16px 40px #1d25402a;display:grid;gap:3px;padding:7px}
#top .mz13-overflow-list button.mz13-menu-action{display:block;position:static;transform:none;min-height:36px;width:100%;text-align:left;font:600 12px/1.2 system-ui;white-space:normal;border:0;background:transparent!important;border-radius:7px;color:#304068!important;padding:10px 12px;box-shadow:none}#top .mz13-overflow-list button:hover{background:#eef2ff!important}
@media(max-width:1000px){#top .pname{max-width:100px}#top [data-a=grid],#top .v24-version,#top .saved{display:none!important}}
@media(max-width:720px){#top{gap:3px!important;padding-inline:6px!important}#top .pname{max-width:70px}#top .mz13-overflow summary{padding:8px;font-size:11px}#top>.seg[aria-label="Mode"]{display:none!important}}
.mz13-table-opbar{display:flex;flex-wrap:wrap;align-items:center;gap:6px;background:#f6f8fe;border-radius:8px;padding:9px}.mz13-table-opbar label{font-size:11px;display:flex;gap:4px;align-items:center}.mz13-table-opbar select,.mz13-table-opbar input{padding:5px;border:1px solid #d3ddec;border-radius:6px;width:63px}.mz13-table-opbar button{font-size:11px;padding:7px 9px}.mz13-table-options{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;margin:8px 0}.mz13-table-options label{font-size:11px;display:grid;gap:4px}.mz13-table-options select,.mz13-table-options input{padding:6px;border:1px solid #dce2ed;border-radius:7px;min-width:0;max-width:100%}
@media(max-width:600px){.mz13-table-options{grid-template-columns:repeat(2,minmax(0,1fr))}}
`;document.head.appendChild(style);
// Table: allow 1x1 through 24x12, multiple tables independently identified by element ID.
function healthy(d){
 if(!d||typeof d!=='object')return d;
 d.cells=Array.isArray(d.cells)?d.cells:[];
 if(!d.cells.length)d.cells=[['']];
 d.cells=d.cells.slice(0,24).map(row=>Array.isArray(row)?row.map(v=>String(v??'')).slice(0,12):[]);
 const colCount=Math.max(1,...d.cells.map(r=>r.length));d.cols=colCount;d.cells=d.cells.map(r=>[...r,...Array.from({length:colCount-r.length},()=>'')]);d.rows=d.cells.length;
 d.merges=(Array.isArray(d.merges)?d.merges:[]).filter(m=>Number.isInteger(m?.r)&&Number.isInteger(m?.c)&&Number.isInteger(m?.rs)&&Number.isInteger(m?.cs)&&m.r>=0&&m.c>=0&&m.rs>=1&&m.cs>=1&&m.r+m.rs<=d.rows&&m.c+m.cs<=d.cols&&m.rs*m.cs>1);
 d.equalColumns=d.equalColumns!==false;d.verticalAlign=['top','middle','bottom'].includes(d.verticalAlign)?d.verticalAlign:'middle';
 d.font=['Arial','Georgia','Verdana','Tahoma','Times New Roman','Courier New'].includes(d.font)?d.font:'Arial';
 d.borderStyle=['solid','dashed','dotted','none'].includes(d.borderStyle)?d.borderStyle:'solid';
 d.minRowHeight=Math.max(0,Math.min(140,Number(d.minRowHeight)||0));
 return d;
}
const bridge=window.__mz13TableBridge;
if(!bridge)throw Error("Moza table bridge missing — check index.html");
const origDoc=bridge.getDoc();
const renderTableHTML=function(data){const d=healthy(JSON.parse(JSON.stringify(data||{}))),cover=new Set(),mergeAt=new Map();
 for(const m of d.merges){let overlap=false;for(let r=m.r;r<m.r+m.rs;r++)for(let c=m.c;c<m.c+m.cs;c++)if(cover.has(r+','+c))overlap=true;if(overlap)continue;mergeAt.set(m.r+','+m.c,m);for(let r=m.r;r<m.r+m.rs;r++)for(let c=m.c;c<m.c+m.cs;c++)if(r!==m.r||c!==m.c)cover.add(r+','+c)}
 const trs=d.cells.map((row,r)=>'<tr>'+row.map((v,c)=>{if(cover.has(r+','+c))return '';const m=mergeAt.get(r+','+c),head=d.header&&r===0;return `<${head?'th':'td'}${m?` rowspan="${m.rs}" colspan="${m.cs}"`:''}>${esc(v).replace(/\n/g,'<br>')}</${head?'th':'td'}>`}).join('')+'</tr>').join('');
 const border=d.borderStyle==='none'?'none':`${Math.max(0,Math.min(8,Number(d.borderWidth)||0))}px ${d.borderStyle} ${/^#[\da-f]{6}$/i.test(d.border)?d.border:'#d9deea'}`;
 const color=(v,f)=>/^#[\da-f]{6}$/i.test(String(v))?v:f;
 const sty=`*{box-sizing:border-box}html,body{margin:0;width:100%;height:100%;font-family:${d.font},sans-serif;background:transparent}body{padding:1px}.wrap{width:100%;height:100%;overflow:auto}table{width:100%;${d.equalColumns?'table-layout:fixed;':'table-layout:auto;'}border-collapse:collapse;font-size:${Math.max(8,Math.min(48,+d.fontSize||14))}px}td,th{border:${border};padding:${Math.max(0,Math.min(40,+d.cellPadding||0))}px;text-align:${['left','center','right'].includes(d.align)?d.align:'left'};height:${d.minRowHeight}px;vertical-align:${d.verticalAlign};background:${color(d.cellBg,'#fff')};color:${color(d.textColor,'#30394b')};overflow-wrap:anywhere}th{background:${color(d.headerBg,'#f1f4fb')};color:${color(d.headerColor||d.textColor,'#26334d')};font-weight:700}`;
 return `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>${sty}</style></head><body><div class="wrap"><table>${trs}</table></div></body></html>`;
};
bridge.setDoc(renderTableHTML);
const prevModal=bridge.getRender();
const renderTableModal=function(){const d=healthy(window.__at321TableDraft);if(!d)return;prevModal();const box=document.getElementById('at321-table-modal'),toolbar=box?.querySelector('.at321-toolbar'),styleArea=box?.querySelector('.at321-style');if(!toolbar||!styleArea)return;
 const field=(key,items)=>`<label>${key}<select data-mz13-table-setting="${key}">${items.map(([id,t])=>`<option value="${id}" ${String(d[key])===id?'selected':''}>${esc(t)}</option>`).join('')}</select></label>`;
 toolbar.insertAdjacentHTML('afterend',`<div class="mz13-table-opbar"><label>Baris<input type="number" min="1" max="${d.rows}" value="1" data-mz13-table-row></label><label>Kolom<input type="number" min="1" max="${d.cols}" value="1" data-mz13-table-col></label><button data-mz13-table-op="insert-row">＋ Sisip baris</button><button data-mz13-table-op="insert-col">＋ Sisip kolom</button><button data-mz13-table-op="delete-row">Hapus baris</button><button data-mz13-table-op="delete-col">Hapus kolom</button><button data-mz13-table-op="up-row">↑ Naik</button><button data-mz13-table-op="down-row">↓ Turun</button><button data-mz13-table-op="equal">Samakan lebar kolom</button><button data-mz13-table-op="fit">Ukuran sesuai isi</button></div><div class="mz13-table-opbar"><span style="font-size:11px">Gabung sel:</span><label>Baris akhir<input type="number" min="1" max="${d.rows}" value="${d.rows}" data-mz13-table-endrow></label><label>Kolom akhir<input type="number" min="1" max="${d.cols}" value="${d.cols}" data-mz13-table-endcol></label><button data-mz13-table-op="merge">Merge cells</button><button data-mz13-table-op="split">Split cells</button><small>Mulai dari baris dan kolom yang dipilih di atas.</small></div>`);
 styleArea.insertAdjacentHTML('beforeend',`<div class="mz13-table-options">${field('font',[['Arial','Arial'],['Georgia','Georgia'],['Verdana','Verdana'],['Tahoma','Tahoma'],['Times New Roman','Times New Roman'],['Courier New','Courier New']])}${field('borderStyle',[['solid','Garis solid'],['dashed','Putus-putus'],['dotted','Titik'],['none','Tanpa garis']])}${field('verticalAlign',[['top','Atas'],['middle','Tengah'],['bottom','Bawah']])}<label>Tinggi baris minimal (px)<input data-mz13-table-setting="minRowHeight" type="number" min="0" max="140" value="${d.minRowHeight}"></label><label>Warna teks header<input data-mz13-table-setting="headerColor" type="color" value="${/^#[\da-f]{6}$/i.test(d.headerColor)?d.headerColor:'#26334d'}"></label></div>`);
};
bridge.setRender(renderTableModal);
function tablePicker(){const overlay=document.createElement('div');overlay.id='mz13-table-pick';overlay.className='at321-modal';overlay.innerHTML=`<div class="at321-dialog" style="max-width:430px"><header><b>▦ Buat tabel baru</b><button data-mz13-table-cancel>×</button></header><p style="font-size:12px;margin:0">Ukuran kecil 1×1, 1×2, 2×1, atau lebih besar sekarang didukung.</p><div class="mz13-table-options"><label>Baris<input id="mz13-numrows" type="number" min="1" max="24" value="2"></label><label>Kolom<input id="mz13-numcols" type="number" min="1" max="12" value="2"></label></div><footer><button data-mz13-table-cancel>Cancel</button><button class="primary" data-mz13-table-create>Buat tabel</button></footer></div>`;document.body.appendChild(overlay)}
ACT['at321-add-table']=tablePicker;
document.addEventListener('click',function(e){const t=e.target, pick=t.closest('#mz13-table-pick');if(pick){if(t.closest('[data-mz13-table-cancel]'))pick.remove();else if(t.closest('[data-mz13-table-create]')){const r=Math.max(1,Math.min(24,Number(pick.querySelector('#mz13-numrows').value)||2)),c=Math.max(1,Math.min(12,Number(pick.querySelector('#mz13-numcols').value)||2));pick.remove();const d=healthy(bridge.defaultTable(r,c));const el=newEl('embed',{name:'Table',w:Math.max(180,c*135),h:Math.max(70,r*58),embedKind:'widget',embedCode:renderTableHTML(d),embedLive:true,tableData:d,provider:'Atelier Table'});addEl(el,selSecId());const found=findEl(el.id);if(found?.el)bridge.editTable(found.el);toast('Tabel '+r+'×'+c+' ditambahkan.');}return;}
 const button=t.closest('#at321-table-modal [data-mz13-table-op]');if(!button)return;const d=healthy(window.__at321TableDraft);if(!d)return;
 const modal=button.closest('#at321-table-modal');modal.querySelectorAll('[data-at321-cell]').forEach(x=>{const [r,c]=x.dataset.at321Cell.split(',').map(Number);if(d.cells[r])d.cells[r][c]=x.value});
 modal.querySelectorAll('[data-at321-prop]').forEach(x=>{d[x.dataset.at321Prop]=x.type==='checkbox'?x.checked:x.type==='number'?Number(x.value):x.value});
 modal.querySelectorAll('[data-mz13-table-setting]').forEach(x=>{d[x.dataset.mz13TableSetting]=x.type==='number'?Number(x.value):x.value});
 const r=Math.max(0,Math.min(d.rows-1,Number(modal.querySelector('[data-mz13-table-row]').value)-1||0)),c=Math.max(0,Math.min(d.cols-1,Number(modal.querySelector('[data-mz13-table-col]').value)-1||0));const op=button.dataset.mz13TableOp;
 if(op==='insert-row'&&d.rows<24){d.cells.splice(r,0,Array.from({length:d.cols},()=>''));d.merges=[]}
 if(op==='insert-col'&&d.cols<12){d.cells.forEach(row=>row.splice(c,0,''));d.merges=[]}
 if(op==='delete-row'&&d.rows>1){d.cells.splice(r,1);d.merges=[]}
 if(op==='delete-col'&&d.cols>1){d.cells.forEach(row=>row.splice(c,1));d.merges=[]}
 if(op==='up-row'&&r>0){[d.cells[r-1],d.cells[r]]=[d.cells[r],d.cells[r-1]];d.merges=[]}
 if(op==='down-row'&&r<d.rows-1){[d.cells[r+1],d.cells[r]]=[d.cells[r],d.cells[r+1]];d.merges=[]}
 if(op==='equal')d.equalColumns=true;
 if(op==='fit')d.equalColumns=false;
 if(op==='merge'){const re=Math.max(r,Math.min(d.rows-1,Number(modal.querySelector('[data-mz13-table-endrow]').value)-1||r)),ce=Math.max(c,Math.min(d.cols-1,Number(modal.querySelector('[data-mz13-table-endcol]').value)-1||c));if(re>r||ce>c){if(d.merges.some(m=>!(re<m.r||r>=m.r+m.rs||ce<m.c||c>=m.c+m.cs))){toast('Pisahkan merge lama terlebih dahulu.');return;}const combined=[];for(let ri=r;ri<=re;ri++)for(let ci=c;ci<=ce;ci++){if(ri===r&&ci===c)continue;if(d.cells[ri][ci].trim())combined.push(d.cells[ri][ci]);d.cells[ri][ci]='';}if(combined.length)d.cells[r][c]+=(d.cells[r][c]?'\n':'')+combined.join('\n');d.merges.push({r,c,rs:re-r+1,cs:ce-c+1});}}
 if(op==='split')d.merges=d.merges.filter(m=>!(r>=m.r&&r<m.r+m.rs&&c>=m.c&&c<m.c+m.cs));
 healthy(d);renderTableModal();
},true);
document.addEventListener('change',e=>{const el=e.target;if(!el.matches('#at321-table-modal [data-mz13-table-setting]'))return;const d=window.__at321TableDraft;if(d)d[el.dataset.mz13TableSetting]=el.type==='number'?Number(el.value):el.value});
// Original Save button persists tableData and regenerates embedCode via our updated at321TableDoc.
try{tidyToolbar()}catch(e){console.warn('[Moza V13 toolbar]',e)}
window.MozaTableV13={healthy,tableHTML:renderTableHTML,toolbar:tidyToolbar};
})();
