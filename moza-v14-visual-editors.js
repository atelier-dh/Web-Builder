/* Moza Studio V14.4 — expanded Visual Effects + live Table Editor preview.
   Integrates with the editor's existing el.fx model and table bridge. */
(function(){
'use strict';
if(window.__MOZA_V144_VISUAL_EDITORS__)return;window.__MOZA_V144_VISUAL_EDITORS__=true;
const mzQ=(s,r=document)=>r.querySelector(s);
const mzClamp=(v,min,max)=>Math.max(min,Math.min(max,Number(v)||0));
const mzEsc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const mzSelected=()=>{try{return typeof T==='function'?T('el'):null}catch(_){return null}};
const mzTextTypes=['heading','subtitle','paragraph','caption','button','link'];
const mzIsText=el=>!!el&&(typeof TEXTY!=='undefined'&&Array.isArray(TEXTY)?TEXTY.includes(el.type):mzTextTypes.includes(el.type));
const mzNeutralFilter=()=>({blur:0,bright:100,contrast:100,sat:100,gray:0,sepia:0,hue:0,invert:0});
const mzShadowEffects=[
 ['drop','Drop'],['lift','Lift'],['glow','Glow'],['neon','Neon'],['echo','Echo'],
 ['long-shadow','Long shadow'],['hard-shadow','Hard shadow'],['outline','Outline'],['glitch','Glitch'],['emboss','Emboss']
];
const mzArtEffects=[
 ['soft-focus','Soft focus'],['duotone','Duotone'],['chromatic','Chromatic'],['blur','Blur'],['frost','Frost'],['poster','Poster']
];
const mzPhotoPresets={
 original:{},
 bw:{gray:100},
 sepia:{sepia:88},
 vintage:{sepia:34,contrast:112,bright:104,sat:78},
 vivid:{sat:165,contrast:116,bright:103},
 faded:{contrast:82,bright:113,sat:82},
 dramatic:{contrast:142,bright:91,sat:112},
 cool:{hue:-22,sat:112,contrast:106},
 warm:{sepia:24,sat:128,hue:7,bright:104},
 dreamy:{blur:1.1,bright:112,sat:112},
 cinematic:{contrast:128,bright:92,sat:88,hue:-4},
 pastel:{contrast:88,bright:116,sat:78},
 noir:{gray:100,contrast:150,bright:88},
 pop:{sat:190,contrast:125},
 matte:{contrast:84,bright:108,sat:90},
 golden:{sepia:38,sat:135,hue:12,bright:105},
 frost:{hue:175,sat:70,bright:112,contrast:108},
 soft:{blur:.45,contrast:92,bright:108,sat:94}
};
const mzPhotoLabels={original:'Original',bw:'B&W',sepia:'Sepia',vintage:'Vintage',vivid:'Vivid',faded:'Faded',dramatic:'Dramatic',cool:'Cool',warm:'Warm',dreamy:'Dreamy',cinematic:'Cinematic',pastel:'Pastel',noir:'Noir',pop:'Pop',matte:'Matte',golden:'Golden',frost:'Frost',soft:'Soft'};
let mzActiveCategory='shadow';
let mzEffectUndoFocus=null;

function mzVisualState(el){
 if(!el.fx){if(typeof fxOf==='function')fxOf(el);else el.fx={};}
 if(!el.fx.visual)el.fx.visual={type:'none',intensity:58,color:'#7653f5',x:6,y:8,blur:18,spread:0};
 const v=el.fx.visual;
 if(!v.type)v.type='none';if(v.intensity==null)v.intensity=58;if(!v.color)v.color='#7653f5';
 if(v.x==null)v.x=6;if(v.y==null)v.y=8;if(v.blur==null)v.blur=18;if(v.spread==null)v.spread=0;
 return v;
}
function mzHexParts(hex){
 const h=/^#([0-9a-f]{6})$/i.exec(String(hex||''));if(!h)return[118,83,245];
 return[parseInt(h[1].slice(0,2),16),parseInt(h[1].slice(2,4),16),parseInt(h[1].slice(4,6),16)];
}
function mzRgba(hex,a){const p=mzHexParts(hex);return `rgba(${p[0]},${p[1]},${p[2]},${mzClamp(a,0,1).toFixed(2)})`;}
function mzVisualFilter(el){
 const v=el?.fx?.visual;if(!v||!v.type||v.type==='none'||v.type.startsWith('photo:'))return '';
 const n=mzClamp(v.intensity??58,0,100)/100,x=mzClamp(v.x??6,-80,80),y=mzClamp(v.y??8,-80,80),b=mzClamp(v.blur??18,0,100),sp=mzClamp(v.spread??0,-40,80),effectiveBlur=Math.max(0,b+sp),c=v.color||'#7653f5';
 const soft=mzRgba(c,.28+.55*n),strong=mzRgba(c,.42+.5*n),light=mzRgba(c,.55);
 const text=mzIsText(el);
 if(text&&['neon','glitch','chromatic','emboss','long-shadow'].includes(v.type))return '';
 switch(v.type){
  case'drop':return `drop-shadow(${x}px ${y}px ${Math.max(1,effectiveBlur*.55)}px ${soft})`;
  case'lift':return `drop-shadow(0 ${Math.max(4,y+8*n)}px ${Math.max(8,effectiveBlur+12*n)}px ${soft})`;
  case'glow':return `drop-shadow(0 0 ${Math.max(4,effectiveBlur*.55)}px ${strong}) drop-shadow(0 0 ${Math.max(8,effectiveBlur*1.35)}px ${soft})`;
  case'neon':return `drop-shadow(0 0 ${Math.max(2,effectiveBlur*.3)}px ${c}) drop-shadow(0 0 ${Math.max(5,effectiveBlur*.85)}px ${strong}) drop-shadow(0 0 ${Math.max(10,effectiveBlur*1.7)}px ${soft})`;
  case'echo':return `drop-shadow(${x}px ${y}px 0 ${strong}) drop-shadow(${x*2}px ${y*2}px 0 ${soft})`;
  case'long-shadow':return Array.from({length:Math.max(3,Math.round(3+n*8))},(_,i)=>`drop-shadow(${((x||4)+sp/5)*(i+1)}px ${((y||4)+sp/5)*(i+1)}px 0 ${mzRgba(c,.10+.045*n)})`).join(' ');
  case'hard-shadow':return `drop-shadow(${x}px ${y}px 0 ${strong})`;
  case'outline':return `drop-shadow(1px 0 0 ${c}) drop-shadow(-1px 0 0 ${c}) drop-shadow(0 1px 0 ${c}) drop-shadow(0 -1px 0 ${c})`;
  case'glitch':return `drop-shadow(${Math.max(1,x||3)}px 0 0 rgba(0,229,255,${.35+.55*n})) drop-shadow(${-Math.max(1,x||3)}px 0 0 rgba(255,35,145,${.35+.55*n}))`;
  case'emboss':return `drop-shadow(-1px -1px 0 rgba(255,255,255,${.35+.4*n})) drop-shadow(2px 2px ${Math.max(1,effectiveBlur*.12)}px rgba(0,0,0,${.25+.35*n}))`;
  case'soft-focus':return `blur(${(b/16*n).toFixed(2)}px) brightness(${(1+.1*n).toFixed(2)})`;
  case'duotone':return `grayscale(${Math.round(35+65*n)}%) sepia(${Math.round(25+45*n)}%) saturate(${Math.round(120+90*n)}%) hue-rotate(${Math.round(210*n)}deg)`;
  case'chromatic':return `drop-shadow(${Math.max(1,x||3)}px 0 0 rgba(0,220,255,${.35+.55*n})) drop-shadow(${-Math.max(1,x||3)}px 0 0 rgba(255,0,110,${.35+.55*n}))`;
  case'blur':return `blur(${(b/10*n).toFixed(2)}px)`;
  case'frost':return `saturate(${Math.round(65+35*n)}%) brightness(${(1+.12*n).toFixed(2)}) blur(${(b/28*n).toFixed(2)}px)`;
  case'poster':return `contrast(${Math.round(110+65*n)}%) saturate(${Math.round(110+90*n)}%)`;
  default:return '';
 }
}
function mzVisualTextCSS(el){
 const v=el?.fx?.visual;if(!v||!mzIsText(el))return '';
 const n=mzClamp(v.intensity??58,0,100)/100,c=v.color||'#7653f5',b=mzClamp(v.blur??18,0,100)+mzClamp(v.spread??0,-40,80);
 switch(v.type){
  case'neon':case'text-neon':return `0 0 ${Math.max(2,b*.25)}px ${c},0 0 ${Math.max(5,b*.7)}px ${c},0 0 ${Math.max(10,b*1.4)}px ${mzRgba(c,.65)}`;
  case'glitch':case'chromatic':case'text-glitch':return `${Math.max(1,v.x||3)}px 0 rgba(0,220,255,${.4+.5*n}),${-Math.max(1,v.x||3)}px 0 rgba(255,0,110,${.4+.5*n})`;
  case'emboss':case'text-emboss':return `-1px -1px 0 rgba(255,255,255,.75),2px 2px ${Math.max(1,b*.12)}px rgba(0,0,0,${.25+.4*n})`;
  case'long-shadow':return Array.from({length:Math.max(3,Math.round(4+n*7))},(_,i)=>`${(v.x??2)*(i+1)}px ${(v.y??2)*(i+1)}px 0 ${mzRgba(c,.12+.04*n)}`).join(',');
  default:return '';
 }
}
function mzVisualStroke(el){
 const v=el?.fx?.visual;if(!v||!mzIsText(el)||!['outline','text-outline'].includes(v.type))return '';
 return `${Math.max(1,Math.round((v.intensity||58)/22+mzClamp(v.spread??0,-40,80)/8))}px ${v.color||'#7653f5'}`;
}
function mzMergeStyle(style,prop,value){
 if(!value)return style;
 const re=new RegExp('(?:^|;)\\s*'+prop+'\\s*:\\s*([^;]*);?','i');
 const m=re.exec(style);
 if(m){const old=String(m[1]||'').trim();const combined=prop==='filter'&&old&&old!=='none'?old+' '+value:value;return style.replace(m[0],(m[0][0]===';'?';':'')+prop+':'+combined+';');}
 return style+(style.endsWith(';')?'':'')+prop+':'+value+';';
}
function mzWrapElStyle(){
 if(typeof elStyle!=='function'||elStyle.__mz144)return;
 const base=elStyle;
 const wrapped=function(el,...args){
  let css=base.call(this,el,...args);const filter=mzVisualFilter(el);
  if(filter)css=mzMergeStyle(css,'filter',filter);
  const ts=mzVisualTextCSS(el);if(ts)css=mzMergeStyle(css,'text-shadow',ts);
  const stroke=mzVisualStroke(el);if(stroke)css=mzMergeStyle(css,'-webkit-text-stroke',stroke);
  return css;
 };
 wrapped.__mz144=true;elStyle=wrapped;
}

function mzTile(id,label,kind,active){const sample=kind==='photo'?'mz144-photo-'+id:'mz144-'+id.replace(/[^a-z0-9-]/gi,'');return `<button type="button" class="mz144-tile ${active?'active':''}" data-mz144-effect="${id}" data-mz144-kind="${kind}" aria-pressed="${active?'true':'false'}"><span class="mz144-sample ${sample}"></span><b>${label}</b></button>`;}
function mzPanelHTML(el){
 const v=mzVisualState(el),type=v.type||'none';
 const cats=[['shadow','Shadows'],['photo','Photo'],['art','Artistic']];if(mzIsText(el))cats.push(['text','Text']);if(!cats.some(([id])=>id===mzActiveCategory))mzActiveCategory='shadow';
 let tiles='';
 if(mzActiveCategory==='shadow')tiles=mzShadowEffects.map(([id,l])=>mzTile(id,l,'shadow',type===id)).join('');
 else if(mzActiveCategory==='photo')tiles=Object.entries(mzPhotoLabels).map(([id,l])=>mzTile(id,l,'photo',type==='photo:'+id)).join('');
 else if(mzActiveCategory==='art')tiles=mzArtEffects.map(([id,l])=>mzTile(id,l,'art',type===id)).join('');
 else if(mzActiveCategory==='text')tiles=[['text-neon','Neon'],['text-outline','Outline'],['text-glitch','Glitch'],['text-emboss','Emboss'],['text-gradient','Gradient'],['text-shimmer','Shimmer']].map(([id,l])=>mzTile(id,l,'text',type===id)).join('');
 const photo=type.startsWith('photo:'),gradient=['text-gradient','text-shimmer'].includes(type);
 const showControls=type!=='none';
 return `<section class="mz144-effects" aria-label="Visual effects editor">
  <div class="mz144-head"><div><b>✦ Visual Effects</b><small>Efek visual langsung pada objek terpilih</small></div><span class="mz144-live">LIVE</span></div>
  <div class="mz144-tabs">${cats.map(([id,l])=>`<button type="button" data-mz144-category="${id}" class="${mzActiveCategory===id?'active':''}">${l}</button>`).join('')}</div>
  <div class="mz144-grid">${tiles}</div>
  <div class="mz144-controls" ${showControls?'':'hidden'}>
   <label class="mz144-range-label"><span>${gradient?'Gradient angle':'Intensity'}</span><output data-mz144-output>${gradient?Math.round(el.fx?.ta??90):Math.round(v.intensity)}</output></label>
   <input class="mz144-range" type="range" min="${gradient?0:0}" max="${gradient?360:100}" value="${gradient?Math.round(el.fx?.ta??90):Math.round(v.intensity)}" data-mz144-intensity>
   ${photo?'':'<label class="mz144-color-label">Effect colour <input type="color" value="'+(v.color||'#7653f5')+'" data-mz144-color></label>'}
   ${photo?'':'<details class="mz144-advanced"><summary>Advanced settings</summary><div class="mz144-advanced-grid"><label>Offset X<input type="number" min="-80" max="80" value="'+v.x+'" data-mz144-prop="x"></label><label>Offset Y<input type="number" min="-80" max="80" value="'+v.y+'" data-mz144-prop="y"></label><label>Blur<input type="number" min="0" max="100" value="'+v.blur+'" data-mz144-prop="blur"></label><label>Spread<input type="number" min="-40" max="80" value="'+v.spread+'" data-mz144-prop="spread"></label></div></details>'}
  </div>
  <div class="mz144-footer"><small>Entrance, hover, looping, scroll, and animation controls remain in the existing Effects section.</small><button type="button" data-mz144-clear ${showControls?'':'disabled'}>Remove visual effect</button></div>
 </section>`;
}
function mzRenderPanel(){
 const pane=mzQ('#right');if(!pane)return;
 pane.querySelector('.mz144-effects')?.remove();const el=mzSelected();if(!el)return;
 const holder=document.createElement('div');holder.innerHTML=mzPanelHTML(el);if(holder.firstElementChild)pane.appendChild(holder.firstElementChild);
}
function mzAttachEffects(){
 if(typeof renderRight!=='function'||renderRight.__mz144)return;
 const old=renderRight;
 const wrapped=function(...args){const result=old.apply(this,args);mzRenderPanel();return result};
 wrapped.__mz144=true;renderRight=wrapped;
}
function mzApplyPhoto(el,id,intensity){
 const fx=typeof fxOf==='function'?fxOf(el):(el.fx||(el.fx={}));
 const target=mzPhotoPresets[id]||{};const t=mzClamp(intensity,0,100)/100,base=mzNeutralFilter(),out={...base};
 Object.keys(target).forEach(k=>{out[k]=base[k]+(target[k]-base[k])*t});
 fx.f=out;
}
function mzApplyVisual(el,type){
 const fx=typeof fxOf==='function'?fxOf(el):(el.fx||(el.fx={}));const v=mzVisualState(el),previous=v.type||'none';
 if(previous.startsWith('photo:')&&!type.startsWith('photo:'))fx.f=mzNeutralFilter();
 if(['text-gradient','text-shimmer'].includes(previous)&&!['text-gradient','text-shimmer'].includes(type))fx.txt='none';
 v.type=type;v.enabled=type!=='none';
 if(type.startsWith('photo:'))mzApplyPhoto(el,type.slice(6),v.intensity);
 else if(type==='text-gradient'||type==='text-shimmer'){
  fx.txt=type==='text-gradient'?'gradient':'shimmer';fx.t1=v.color||fx.t1||'#ff5a36';fx.t2=fx.t2||'#3a5bf0';
 }else if(type.startsWith('text-')){
  fx.txt='none';
 }else if(type==='none'){
  if(String(v.previousType||'').startsWith('photo:'))fx.f=mzNeutralFilter();
  if(['text-gradient','text-shimmer'].includes(v.previousType))fx.txt='none';
 }
 v.previousType=type;
 if(typeof renderCanvas==='function')renderCanvas();
}
function mzCommitEffect(el){if(typeof commit==='function')commit('mz144-effect-'+(el?.id||'selected'));}
function mzApplyCurrent(el){
 const fx=typeof fxOf==='function'?fxOf(el):(el.fx||(el.fx={}));const v=mzVisualState(el),type=v.type||'none';
 if(type.startsWith('photo:'))mzApplyPhoto(el,type.slice(6),v.intensity);
 if(type==='text-gradient'||type==='text-shimmer')fx.t1=v.color||fx.t1;
 if(typeof renderCanvas==='function')renderCanvas();
}
function mzClearVisual(el){
 const fx=typeof fxOf==='function'?fxOf(el):(el.fx||(el.fx={}));const v=mzVisualState(el),old=v.type||'none';
 if(old.startsWith('photo:'))fx.f=mzNeutralFilter();
 if(['text-gradient','text-shimmer'].includes(old))fx.txt='none';
 v.type='none';v.enabled=false;v.previousType='none';
 if(typeof renderCanvas==='function')renderCanvas();
 if(typeof scheduleSave==='function')scheduleSave();
}

const mzCss=document.createElement('style');mzCss.id='moza-v144-visual-editors-css';mzCss.textContent=`
.mz144-effects{margin:12px 0;padding:14px;border:1px solid #dce4f2;border-radius:14px;background:#fff;color:#293650;box-shadow:0 5px 18px rgba(29,43,74,.06)}
.mz144-head{display:flex;justify-content:space-between;align-items:center;gap:10px}.mz144-head b{display:block;font-size:14px}.mz144-head small{display:block;margin-top:4px;color:#8390a8;font-size:11px;line-height:1.4}.mz144-live{font-size:9px;font-weight:800;letter-spacing:.7px;color:#5b65e8;background:#eff0ff;border-radius:20px;padding:5px 8px}
.mz144-tabs{display:flex;gap:5px;margin:13px 0 10px;flex-wrap:wrap}.mz144-tabs button{border:1px solid #e0e6f1;background:#fff;color:#64718a;border-radius:8px;padding:7px 10px;font-size:11px;font-weight:650;cursor:pointer}.mz144-tabs button.active{background:#f1efff;border-color:#8a6bff;color:#5b3cdb}
.mz144-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}.mz144-tile{min-width:0;display:grid;justify-items:center;align-content:start;gap:7px;padding:9px 4px;border:1px solid #e2e7f0;border-radius:10px;background:#fff;color:#59647a;cursor:pointer}.mz144-tile b{font-size:10px;font-weight:650;text-align:center;line-height:1.2}.mz144-tile.active{border:2px solid #7548ff;padding:8px 3px;background:#fbfaff;box-shadow:0 0 0 2px rgba(117,72,255,.08)}
.mz144-sample{display:block;width:43px;height:38px;border-radius:9px;background:linear-gradient(145deg,#8b45f5,#bc8bff);box-shadow:0 3px 8px rgba(30,35,65,.15)}
.mz144-drop{box-shadow:6px 7px 10px rgba(22,29,55,.45)}.mz144-lift{box-shadow:0 12px 18px rgba(25,34,64,.35)}.mz144-glow{box-shadow:0 0 8px 4px #9b68ff,0 0 18px 8px #9b68ff88}.mz144-neon{box-shadow:0 0 4px #fff,0 0 9px #00e5ff,0 0 19px #00e5ff}.mz144-echo{box-shadow:6px 6px 0 -1px #c7b3ff,12px 12px 0 -2px #e4dcff}.mz144-long-shadow{box-shadow:4px 4px 0 #b8a5f2,8px 8px 0 #cbbdf5,12px 12px 0 #e1dafa}.mz144-hard-shadow{box-shadow:7px 7px 0 #4b4565}.mz144-outline{outline:2px solid #7653f5;outline-offset:2px}.mz144-glitch{box-shadow:4px 0 #00dfff,-4px 0 #ff238e}.mz144-emboss{box-shadow:-2px -2px 2px #fff,3px 3px 4px #6a6484}
.mz144-soft-focus{filter:blur(1.2px) brightness(1.08)}.mz144-duotone{filter:grayscale(.5) sepia(.7) hue-rotate(185deg) saturate(1.7)}.mz144-chromatic{box-shadow:4px 0 #00dfff,-4px 0 #ff238e}.mz144-blur{filter:blur(2px)}.mz144-frost{filter:blur(.5px) saturate(.7) brightness(1.15)}.mz144-poster{filter:contrast(1.6) saturate(1.7)}.mz144-text-neon{box-shadow:0 0 5px #00e5ff,0 0 14px #00e5ff}.mz144-text-outline{background:#7653f5;outline:2px solid #fff;outline-offset:2px}.mz144-text-glitch{box-shadow:4px 0 #00dfff,-4px 0 #ff238e}.mz144-text-emboss{box-shadow:-2px -2px 2px #fff,3px 3px 4px #6a6484}.mz144-text-gradient{background:linear-gradient(120deg,#ff5a36,#3a5bf0)}.mz144-text-shimmer{background:linear-gradient(90deg,#7653f5,#fff,#7653f5);background-size:200% 100%}.mz144-photo-bw{filter:grayscale(1)}.mz144-photo-sepia{filter:sepia(1)}.mz144-photo-vintage{filter:sepia(.4) contrast(1.1) saturate(.8)}.mz144-photo-vivid{filter:saturate(1.7) contrast(1.15)}.mz144-photo-dramatic{filter:contrast(1.4)}.mz144-photo-cool{filter:hue-rotate(-22deg)}.mz144-photo-warm{filter:sepia(.25) saturate(1.3)}.mz144-photo-noir{filter:grayscale(1) contrast(1.5)}
.mz144-controls{margin-top:13px}.mz144-controls[hidden]{display:none}.mz144-range-label{display:flex;justify-content:space-between;margin:6px 0;font-size:11px;color:#56627a}.mz144-range{width:100%;accent-color:#7548ff}.mz144-color-label{display:flex;align-items:center;justify-content:space-between;margin:12px 0;font-size:11px;color:#56627a}.mz144-color-label input{width:38px;height:30px;border:0;background:transparent}.mz144-advanced{border-top:1px solid #edf0f6;padding-top:9px;margin-top:10px}.mz144-advanced summary{font-size:11px;font-weight:700;cursor:pointer}.mz144-advanced-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:9px}.mz144-advanced-grid label{display:grid;gap:4px;font-size:10px;color:#78849a}.mz144-advanced-grid input{width:100%;box-sizing:border-box;padding:7px;border:1px solid #dce3ef;border-radius:7px}.mz144-footer{display:grid;gap:9px;margin-top:12px}.mz144-footer small{font-size:10px;line-height:1.4;color:#8a95aa}.mz144-footer button{padding:9px;border:0;border-radius:9px;background:linear-gradient(90deg,#8b45f5,#6040e8);color:white;font-size:11px;font-weight:750;cursor:pointer}.mz144-footer button:disabled{opacity:.45;cursor:not-allowed}.mz144-effects button:focus-visible,.mz144-effects input:focus-visible{outline:2px solid #9abaff;outline-offset:2px}
.mz143-table-layout{display:grid;grid-template-columns:minmax(0,1.08fr) minmax(280px,.92fr);gap:14px;align-items:start}.mz143-table-controls{min-width:0;display:grid;gap:10px}.mz143-table-preview{min-width:0;position:sticky;top:0;border:1px solid #dce5fa;border-radius:12px;padding:12px;background:#f8faff}.mz143-preview-heading{display:flex;align-items:flex-start;justify-content:space-between;gap:10px}.mz143-preview-heading b{display:block;font-size:13px}.mz143-preview-heading small{display:block;margin-top:4px;color:#8290aa;font-size:11px;line-height:1.4}.mz143-preview-heading span{font-size:9px;font-weight:800;letter-spacing:.7px;color:#5b65e8;background:#eff0ff;border-radius:20px;padding:5px 8px}.mz143-preview-stage{height:300px;background:#fff;border:1px solid #e1e7f1;border-radius:9px;overflow:hidden;margin-top:10px}.mz143-table-preview-frame{display:block;width:100%;height:100%;border:0;background:#fff}.mz143-table-actions{display:flex;gap:6px;flex-wrap:wrap;padding:9px;border:1px solid #e2e7f0;border-radius:9px;background:#f8faff}.mz143-table-actions button{font-size:10px!important;padding:6px 8px!important}.mz143-table-actions label{display:flex;align-items:center;gap:4px;font-size:10px;color:#65728a}.mz143-table-actions input{width:48px;min-width:0;padding:5px;border:1px solid #dce3ef;border-radius:6px;font-size:10px}.mz143-extra-table-fields{display:contents}.mz143-extra-table-fields label{min-width:0}.mz143-table-actions button:disabled{opacity:.4;cursor:not-allowed}.mz143-cell-selected{outline:2px solid #6c56ed!important;outline-offset:-2px;background:#f1efff!important}.mz143-merged-cell{background:#f7f5ff!important}
@media(max-width:900px){.mz143-table-layout{grid-template-columns:1fr}.mz143-table-preview{position:static}.mz143-preview-stage{height:240px}}
@media(max-width:600px){.mz144-grid{grid-template-columns:repeat(3,minmax(0,1fr))}.mz143-preview-stage{height:190px}.mz143-table-actions button{flex:1 1 auto}}
`;
document.head.appendChild(mzCss);

// Keep the new panel separate from the existing entrance/hover/loop animation editor.
mzWrapElStyle();mzAttachEffects();
const mzInitialRefresh=()=>{if(typeof S==='undefined'||!S)return;try{if(typeof renderCanvas==='function')renderCanvas();}catch(err){console.warn('Moza V14.4 initial canvas refresh:',err);}try{if(typeof renderRight==='function')renderRight();}catch(err){console.warn('Moza V14.4 initial Properties refresh:',err);}};
if(document.readyState==='complete')mzInitialRefresh();else window.addEventListener('load',mzInitialRefresh,{once:true});

// Commit one undo snapshot when the user begins editing the visual effect controls.
document.addEventListener('focusin',e=>{
 const pane=e.target.closest('.mz144-effects');if(!pane)return;const el=mzSelected();if(!el)return;
 if(mzEffectUndoFocus!==el.id){mzCommitEffect(el);mzEffectUndoFocus=el.id;}
},true);
document.addEventListener('focusout',e=>{if(e.target.closest('.mz144-effects'))mzEffectUndoFocus=null},true);

document.addEventListener('click',e=>{
 const cat=e.target.closest('[data-mz144-category]');
 if(cat){mzActiveCategory=cat.dataset.mz144Category;mzRenderPanel();return;}
 const tile=e.target.closest('[data-mz144-effect]');
 if(tile){const el=mzSelected();if(!el)return;mzCommitEffect(el);const id=tile.dataset.mz144Effect;const type=tile.dataset.mz144Kind==='photo'?'photo:'+id:id;mzVisualState(el).previousType=mzVisualState(el).type||'none';mzApplyVisual(el,type);mzRenderPanel();return;}
 const clear=e.target.closest('[data-mz144-clear]');
 if(clear){const el=mzSelected();if(!el)return;mzCommitEffect(el);mzClearVisual(el);mzRenderPanel();return;}
 const action=e.target.closest('[data-mz143-table-action]');
 if(action){mzTableAction(action.dataset.mz143TableAction);return;}
},true);

document.addEventListener('input',e=>{
 const pane=e.target.closest('.mz144-effects');if(!pane)return;const el=mzSelected();if(!el)return;const v=mzVisualState(el);
 if(e.target.matches('[data-mz144-intensity]')){if(['text-gradient','text-shimmer'].includes(v.type)){if(typeof fxOf==='function')fxOf(el);el.fx.ta=Number(e.target.value);}else v.intensity=Number(e.target.value);const out=pane.querySelector('[data-mz144-output]');if(out)out.textContent=e.target.value;mzApplyCurrent(el);}
 else if(e.target.matches('[data-mz144-color]')){v.color=e.target.value;mzApplyCurrent(el);}
 else if(e.target.matches('[data-mz144-prop]')){const k=e.target.dataset.mz144Prop;v[k]=Number(e.target.value);mzApplyCurrent(el);}
},true);

document.addEventListener('input',e=>{const modal=e.target.closest('#at321-table-modal');if(modal)mzUpdateTablePreview(modal);},true);
document.addEventListener('change',e=>{
 const pane=e.target.closest('.mz144-effects');if(pane){const el=mzSelected();if(el&&e.target.matches('[data-mz144-intensity],[data-mz144-color],[data-mz144-prop]')){if(typeof scheduleSave==='function')scheduleSave();}}
 const modal=e.target.closest('#at321-table-modal');if(modal)mzUpdateTablePreview(modal);
},true);

// ---------------- Table editor: split layout + working live preview ----------------
let mzTableSelection={anchor:null,cells:[]};
let mzLastTableDims='';
let mzLastDraftRef=null;
function mzReadTableDraft(modal){
 const d=window.__at321TableDraft;if(!d)return;
 modal.querySelectorAll('[data-at321-cell]').forEach(x=>{const [r,c]=x.dataset.at321Cell.split(',').map(Number);if(d.cells?.[r])d.cells[r][c]=x.value});
 modal.querySelectorAll('[data-at321-prop]').forEach(x=>{d[x.dataset.at321Prop]=x.type==='checkbox'?x.checked:x.type==='number'?Number(x.value):x.value});
}
function mzTableDoc(d){
 const rows=Array.isArray(d.cells)?d.cells:[],merges=Array.isArray(d.merges)?d.merges:[],anchors=new Map(),covered=new Set();
 merges.forEach(m=>{const r=mzClamp(m.r,0,Math.max(0,rows.length-1)),c=mzClamp(m.c,0,Math.max(0,(rows[r]||[]).length-1));const rs=mzClamp(m.rowspan||1,1,Math.max(1,rows.length-r)),cs=mzClamp(m.colspan||1,1,Math.max(1,(rows[r]||[]).length-c));if(rs<2&&cs<2)return;anchors.set(`${r},${c}`,{rowspan:rs,colspan:cs});for(let rr=r;rr<r+rs;rr++)for(let cc=c;cc<c+cs;cc++)if(rr!==r||cc!==c)covered.add(`${rr},${cc}`)});
 const cells=rows.map((row,r)=>'<tr>'+row.map((value,c)=>{
  if(covered.has(`${r},${c}`))return '';
  const m=anchors.get(`${r},${c}`)||{},head=!!d.header&&r===0,tag=head?'th':'td';
  return `<${tag}${m.colspan>1?` colspan="${m.colspan}"`:''}${m.rowspan>1?` rowspan="${m.rowspan}"`:''}>${mzEsc(value)}</${tag}>`;
 }).join('')+'</tr>').join('');
 const fonts=['Arial','Inter','Georgia','Times New Roman','Verdana','Tahoma','Courier New','Trebuchet MS','system-ui'];const font=fonts.includes(d.font)?d.font:'Arial';
 const fontSize=mzClamp(d.fontSize??14,8,48),padding=mzClamp(d.cellPadding??10,0,40),borderWidth=mzClamp(d.borderWidth??1,0,8),minRowHeight=mzClamp(d.minRowHeight??0,0,300);
 const color=(v,f)=>/^#[0-9a-f]{6}$/i.test(String(v||''))?v:f;
 const borderStyle=['solid','dashed','dotted','double','none'].includes(d.borderStyle)?d.borderStyle:'solid';
 const verticalAlign=['top','middle','bottom'].includes(d.verticalAlign)?d.verticalAlign:'middle';
 const layout=d.tableLayout==='auto'?'auto':'fixed';
 return `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>*{box-sizing:border-box}html,body{margin:0;width:100%;height:100%;font-family:${mzEsc(font)},sans-serif;color:${color(d.textColor,'#30394b')};background:transparent}body{padding:2px}.wrap{width:100%;height:100%;overflow:auto}table{width:100%;height:100%;border-collapse:collapse;table-layout:${layout};font-size:${fontSize}px}tr{height:${minRowHeight?minRowHeight+'px':'auto'}}td,th{border:${borderWidth}px ${borderStyle} ${color(d.border,'#d9deea')};padding:${padding}px;text-align:${['left','center','right'].includes(d.align)?d.align:'left'};overflow-wrap:anywhere;vertical-align:${verticalAlign};background:${color(d.cellBg,'#ffffff')};color:${color(d.textColor,'#30394b')}}th{background:${color(d.headerBg,'#f1f4fb')};color:${color(d.headerColor,'#26334d')};font-weight:700}</style></head><body><div class="wrap"><table>${cells}</table></div></body></html>`;
}
function mzApplyMergedCells(modal){
 const d=window.__at321TableDraft,grid=modal?.querySelector('.at321-grid');if(!d||!grid)return;
 (d.merges||[]).forEach(m=>{
  const anchor=grid.querySelector(`[data-at321-cell="${m.r},${m.c}"]`)?.closest('td');if(!anchor)return;
  anchor.colSpan=Math.max(1,Number(m.colspan)||1);anchor.rowSpan=Math.max(1,Number(m.rowspan)||1);anchor.classList.add('mz143-merged-cell');
  for(let r=m.r;r<m.r+m.rowspan;r++)for(let c=m.c;c<m.c+m.colspan;c++)if(r!==m.r||c!==m.c){const cell=grid.querySelector(`[data-at321-cell="${r},${c}"]`)?.closest('td');cell?.remove();}
 });
}
function mzTableActionsHTML(){return `<div class="mz143-table-actions"><label>Baris<input type="number" min="1" value="1" data-mz143-row-input></label><label>Kolom<input type="number" min="1" value="1" data-mz143-col-input></label><button type="button" data-mz143-table-action="select-cell">Select cell</button><span data-mz143-selection-label style="align-self:center;font-size:10px;color:#63718b;margin-right:auto">Selected: A1</span><button type="button" data-mz143-table-action="insert-row">＋ Insert row</button><button type="button" data-mz143-table-action="insert-col">＋ Insert column</button><button type="button" data-mz143-table-action="delete-row">− Delete row</button><button type="button" data-mz143-table-action="delete-col">− Delete column</button><button type="button" data-mz143-table-action="move-row-up">↑ Move row</button><button type="button" data-mz143-table-action="move-row-down">↓ Move row</button><button type="button" data-mz143-table-action="merge">Merge cells</button><button type="button" data-mz143-table-action="split">Split cells</button><button type="button" data-mz143-table-action="equal">Equal widths</button><button type="button" data-mz143-table-action="fit">Fit content</button></div>`;}

function mzAddTableExtraFields(modal){
 const fields=modal?.querySelector('.at321-style .at321-fields');if(!fields||fields.querySelector('.mz143-extra-table-fields'))return;
 const d=window.__at321TableDraft||{};
 const fonts=['Arial','Inter','Georgia','Times New Roman','Verdana','Tahoma','Courier New','Trebuchet MS','system-ui'];
 const fontOpts=fonts.map(f=>`<option value="${f}" ${d.font===f?'selected':''}>${f}</option>`).join('');
 const borderOpts=[['solid','Solid'],['dashed','Putus-putus'],['dotted','Titik-titik'],['double','Double'],['none','Tanpa garis']].map(([v,l])=>`<option value="${v}" ${(d.borderStyle||'solid')===v?'selected':''}>${l}</option>`).join('');
 const verticalOpts=[['top','Atas'],['middle','Tengah'],['bottom','Bawah']].map(([v,l])=>`<option value="${v}" ${(d.verticalAlign||'middle')===v?'selected':''}>${l}</option>`).join('');
 fields.insertAdjacentHTML('beforeend',`<div class="mz143-extra-table-fields"><label>Font<select data-at321-prop="font">${fontOpts}</select></label><label>Border style<select data-at321-prop="borderStyle">${borderOpts}</select></label><label>Vertical align<select data-at321-prop="verticalAlign">${verticalOpts}</select></label><label>Minimum row height (px)<input type="number" min="0" max="300" data-at321-prop="minRowHeight" value="${mzClamp(d.minRowHeight??0,0,300)}"></label><label>Header text color<input type="color" data-at321-prop="headerColor" value="${/^#[0-9a-f]{6}$/i.test(d.headerColor||'')?d.headerColor:'#26334d'}"></label></div>`);
}

function mzAddTablePreview(modal){
 if(!modal)return;const dialog=modal.querySelector('.at321-dialog');if(!dialog)return;
 let layout=dialog.querySelector('.mz143-table-layout');
 if(!layout){
  const toolbar=dialog.querySelector('.at321-toolbar'),grid=dialog.querySelector('.at321-grid-wrap'),style=dialog.querySelector('.at321-style'),footer=dialog.querySelector('footer');
  if(!toolbar||!grid||!style||!footer)return;
  layout=document.createElement('div');layout.className='mz143-table-layout';
  const controls=document.createElement('div');controls.className='mz143-table-controls';
  [toolbar,grid,style].forEach(node=>controls.appendChild(node));
  controls.insertAdjacentHTML('afterbegin',mzTableActionsHTML());
  const preview=document.createElement('section');preview.className='mz143-table-preview';preview.innerHTML='<div class="mz143-preview-heading"><div><b>Live table preview</b><small>Pratinjau mengikuti isi sel dan pengaturan tampilan.</small></div><span>LIVE</span></div><div class="mz143-preview-stage"><iframe class="mz143-table-preview-frame" title="Live table preview" sandbox=""></iframe></div>';
  layout.append(controls,preview);footer.before(layout);
 }
 const d=window.__at321TableDraft;if(d){
  if(!d.font)d.font='Arial';if(!d.borderStyle)d.borderStyle='solid';if(!d.verticalAlign)d.verticalAlign='middle';if(d.minRowHeight==null)d.minRowHeight=0;if(!d.headerColor)d.headerColor='#26334d';
  const dims=`${d.cells?.length||0}:${d.cells?.[0]?.length||0}`;
  if(d!==mzLastDraftRef){mzLastDraftRef=d;mzLastTableDims=dims;mzTableSelection={anchor:{r:0,c:0},cells:[{r:0,c:0}]};}
  else{if(mzLastTableDims&&mzLastTableDims!==dims&&Array.isArray(d.merges)&&d.merges.length){d.merges=[];}mzLastTableDims=dims;}
 }
 mzAddTableExtraFields(modal);mzApplyMergedCells(modal);if(!mzTableSelection.cells.length&&d?.cells?.length&&d.cells[0]?.length){mzTableSelection={anchor:{r:0,c:0},cells:[{r:0,c:0}]};}mzUpdateSelectionUI(modal);mzUpdateTablePreview(modal);
}
let mzPreviewQueued=false;
function mzUpdateTablePreview(modal){
 if(!modal||mzPreviewQueued)return;mzPreviewQueued=true;
 requestAnimationFrame(()=>{
  mzPreviewQueued=false;const d=window.__at321TableDraft,frame=modal.querySelector('.mz143-table-preview-frame');if(!d||!frame)return;
  mzReadTableDraft(modal);const html=mzTableDoc(d);frame.srcdoc=html;
 });
}
function mzInstallTableBridge(){
 const bridge=window.__mz13TableBridge;if(!bridge||bridge.__mz144)return;
 bridge.setDoc(mzTableDoc);
 const original=bridge.getRender?.();
 if(typeof original==='function'){
  const wrapped=function(...args){const result=original.apply(this,args);const modal=mzQ('#at321-table-modal');if(modal)mzAddTablePreview(modal);return result};
  wrapped.__mz144=true;bridge.setRender(wrapped);
 }
 bridge.__mz144=true;
}
function mzCellCoords(el){const raw=el?.dataset?.at321Cell;if(!raw)return null;const [r,c]=raw.split(',').map(Number);return Number.isFinite(r)&&Number.isFinite(c)?{r,c}:null;}
function mzCellName(r,c){let n=c+1,s='';while(n){const x=(n-1)%26;s=String.fromCharCode(65+x)+s;n=Math.floor((n-1)/26)}return s+(r+1);}
function mzUpdateSelectionUI(modal){
 const grid=modal?.querySelector('.at321-grid');if(!grid)return;const d=window.__at321TableDraft;if(d&&mzTableSelection.cells.length){const maxR=Math.max(0,(d.cells?.length||1)-1),maxC=Math.max(0,(d.cells?.[0]?.length||1)-1);if(mzTableSelection.cells.some(x=>x.r>maxR||x.c>maxC)){mzTableSelection={anchor:{r:0,c:0},cells:[{r:0,c:0}]};}}
 grid.querySelectorAll('.mz143-cell-selected').forEach(td=>td.classList.remove('mz143-cell-selected'));
 mzTableSelection.cells.forEach(({r,c})=>grid.querySelector(`[data-at321-cell="${r},${c}"]`)?.closest('td')?.classList.add('mz143-cell-selected'));
 const label=modal.querySelector('[data-mz143-selection-label]');if(label&&mzTableSelection.cells.length){const names=mzTableSelection.cells.map(x=>mzCellName(x.r,x.c));label.textContent='Selected: '+(names.length===1?names[0]:names[0]+'–'+names[names.length-1]);}const first=mzTableSelection.cells[0];if(first){const ri=modal.querySelector('[data-mz143-row-input]'),ci=modal.querySelector('[data-mz143-col-input]');if(ri)ri.value=first.r+1;if(ci)ci.value=first.c+1;}
 const merge=modal.querySelector('[data-mz143-table-action="merge"]'),split=modal.querySelector('[data-mz143-table-action="split"]');
 if(merge)merge.disabled=mzTableSelection.cells.length<2;
 if(split)split.disabled=!mzFindMerge(window.__at321TableDraft,mzTableSelection.cells[0]);
}
function mzFindMerge(d,cell){if(!d||!cell)return null;return(d.merges||[]).find(m=>cell.r>=m.r&&cell.r<m.r+m.rowspan&&cell.c>=m.c&&cell.c<m.c+m.colspan)||null;}
function mzSelectCell(textarea,shift){
 const cell=mzCellCoords(textarea);if(!cell)return;
 if(shift&&mzTableSelection.anchor){const a=mzTableSelection.anchor,r1=Math.min(a.r,cell.r),r2=Math.max(a.r,cell.r),c1=Math.min(a.c,cell.c),c2=Math.max(a.c,cell.c),cells=[];for(let r=r1;r<=r2;r++)for(let c=c1;c<=c2;c++)cells.push({r,c});mzTableSelection.cells=cells;}
 else{mzTableSelection.anchor=cell;mzTableSelection.cells=[cell];}
 mzUpdateSelectionUI(textarea.closest('#at321-table-modal'));
}
function mzRectSelection(cells){if(!cells||cells.length<2)return null;const rs=cells.map(x=>x.r),cs=cells.map(x=>x.c),r1=Math.min(...rs),r2=Math.max(...rs),c1=Math.min(...cs),c2=Math.max(...cs);if((r2-r1+1)*(c2-c1+1)!==cells.length)return null;return{r:r1,c:c1,rowspan:r2-r1+1,colspan:c2-c1+1};}
function mzClearSelection(){mzTableSelection={anchor:null,cells:[]};}
function mzTableAction(action){
 const modal=mzQ('#at321-table-modal'),d=window.__at321TableDraft;if(!modal||!d)return;mzReadTableDraft(modal);
 const selected=mzTableSelection.cells[0]||{r:Math.max(0,d.cells.length-1),c:0},rows=d.cells.length,cols=d.cells[0]?.length||0;
 if(!Array.isArray(d.merges))d.merges=[];
 if(action==='select-cell'){const rr=mzClamp((Number(modal.querySelector('[data-mz143-row-input]')?.value)||1)-1,0,rows-1),cc=mzClamp((Number(modal.querySelector('[data-mz143-col-input]')?.value)||1)-1,0,cols-1);mzTableSelection={anchor:{r:rr,c:cc},cells:[{r:rr,c:cc}]};mzUpdateSelectionUI(modal);return;}
 if(action==='merge'){
  const m=mzRectSelection(mzTableSelection.cells);if(!m){if(typeof toast==='function')toast('Pilih beberapa sel yang membentuk persegi panjang.');return;}
  if(d.merges.some(x=>!(m.r+m.rowspan<=x.r||x.r+x.rowspan<=m.r||m.c+m.colspan<=x.c||x.c+x.colspan<=m.c))){if(typeof toast==='function')toast('Area pilihan bertumpuk dengan sel gabungan lain.');return;}
  const values=[];for(let r=m.r;r<m.r+m.rowspan;r++)for(let c=m.c;c<m.c+m.colspan;c++){const val=String(d.cells[r]?.[c]??'').trim();if(val)values.push(val)}
  d.cells[m.r][m.c]=values.join(' / ');for(let r=m.r;r<m.r+m.rowspan;r++)for(let c=m.c;c<m.c+m.colspan;c++)if(r!==m.r||c!==m.c)d.cells[r][c]='';
  d.merges.push(m);mzClearSelection();if(typeof window.__mz13TableBridge?.getRender==='function')window.__mz13TableBridge.getRender()();return;
 }
 if(action==='split'){
  const m=mzFindMerge(d,selected);if(!m)return;d.merges=d.merges.filter(x=>x!==m);if(typeof window.__mz13TableBridge?.getRender==='function')window.__mz13TableBridge.getRender()();return;
 }
 if(action==='equal'){d.tableLayout='fixed';mzUpdateTablePreview(modal);if(typeof toast==='function')toast('Lebar kolom disamakan.');return;}
 if(action==='fit'){d.tableLayout='auto';mzUpdateTablePreview(modal);if(typeof toast==='function')toast('Lebar kolom mengikuti isi.');return;}
 let structureChanged=false,nextSelection=null;
 if(action==='insert-row'){d.cells.splice(selected.r+1,0,Array.from({length:cols},()=>''));structureChanged=true;nextSelection={anchor:{r:selected.r+1,c:selected.c},cells:[{r:selected.r+1,c:selected.c}]};}
 else if(action==='insert-col'){d.cells.forEach(row=>row.splice(selected.c+1,0,''));structureChanged=true;nextSelection={anchor:{r:selected.r,c:selected.c+1},cells:[{r:selected.r,c:selected.c+1}]};}
 else if(action==='delete-row'){if(rows<=1)return;d.cells.splice(selected.r,1);structureChanged=true;const r=Math.min(selected.r,d.cells.length-1);nextSelection={anchor:{r,c:Math.min(selected.c,d.cells[0].length-1)},cells:[{r,c:Math.min(selected.c,d.cells[0].length-1)}]};}
 else if(action==='delete-col'){if(cols<=1)return;d.cells.forEach(row=>row.splice(selected.c,1));structureChanged=true;const c=Math.min(selected.c,d.cells[0].length-1);nextSelection={anchor:{r:Math.min(selected.r,d.cells.length-1),c},cells:[{r:Math.min(selected.r,d.cells.length-1),c}]};}
 else if(action==='move-row-up'){if(selected.r<=0)return;[d.cells[selected.r-1],d.cells[selected.r]]=[d.cells[selected.r],d.cells[selected.r-1]];structureChanged=true;nextSelection={anchor:{r:selected.r-1,c:selected.c},cells:[{r:selected.r-1,c:selected.c}]};}
 else if(action==='move-row-down'){if(selected.r>=rows-1)return;[d.cells[selected.r+1],d.cells[selected.r]]=[d.cells[selected.r],d.cells[selected.r+1]];structureChanged=true;nextSelection={anchor:{r:selected.r+1,c:selected.c},cells:[{r:selected.r+1,c:selected.c}]};}
 if(!structureChanged)return;
 d.rows=d.cells.length;d.cols=d.cells[0]?.length||0;d.merges=[];mzTableSelection=nextSelection||{anchor:{r:0,c:0},cells:[{r:0,c:0}]};
 if(typeof window.__mz13TableBridge?.getRender==='function')window.__mz13TableBridge.getRender()();
}

// Install after the main editor has exposed its table adapter. The table
// renderer bridge handles every modal rebuild; avoid a whole-body observer
// because iframe srcdoc updates can create noisy mutation cycles on Safari.
mzInstallTableBridge();

// Table cell selection and action toolbar.
document.addEventListener('click',e=>{
 const cell=e.target.closest('#at321-table-modal [data-at321-cell]');if(cell){mzSelectCell(cell,e.shiftKey);return;}
},true);
})();
