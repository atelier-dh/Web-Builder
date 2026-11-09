/* Moza Studio Advanced V13 — editable Visual Smart Filter.
   Extends existing V8 widget and V9 import hooks without changing stored projects. */
(function(){
'use strict';
if(!window.MozaSmartFilter||window.MozaVisualFilter)return;
const api=window.MozaSmartFilter, baseNormalize=api.normalize,baseDefaults=api.defaults;
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fontList=['Arial','Georgia','Times New Roman','Cormorant Garamond','The Seasons','Verdana','Trebuchet MS','Tahoma','Palatino Linotype','Courier New','system-ui'];
// Custom fonts remain project-owned: this module never distributes commercial font binaries.
function uploadedFonts(){try{return Array.isArray(S.fonts)?S.fonts.filter(f=>f&&f.family):[]}catch(_){return []}}
function fontChoices(){return [...new Set([...fontList,...uploadedFonts().map(f=>String(f.family))])]}
const safeFontName=f=>String(f||'Arial').replace(/[\\'"<>;{}\r\n]/g,'').trim().slice(0,100)||'Arial';
function fontResources(name){
 const family=safeFontName(name);
 const google=family==='Cormorant Garamond'?`@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500;600;700&display=swap');`:'';
 const local=uploadedFonts().find(f=>String(f.family).toLowerCase()===family.toLowerCase()||(family==='The Seasons'&&/^the seasons(?:[\s-]|$)/i.test(f.family)));
 const data=String(local?.data||'');
 const valid=/^data:(?:font\/[a-z0-9.+-]+|application\/(?:font-[a-z0-9.+-]+|x-font-[a-z0-9.+-]+|octet-stream));base64,[a-z0-9+/=]+$/i.test(data);
 const fmt=String(local?.format||'').replace(/[^a-z0-9-]/gi,'').slice(0,20)||'woff2';
 const face=valid?`@font-face{font-family:"${family}";src:url("${data}") format("${fmt}");font-display:swap;}`:'';
 return {css:google+face,family:JSON.stringify(family)+(family==='Cormorant Garamond'||family==='The Seasons'?', Georgia, serif':', sans-serif'),installed:!!(valid||family==='Cormorant Garamond'||fontList.includes(family)&&family!=='The Seasons')};
}

const cssColor=(c,f)=>/^#[0-9a-fA-F]{6}$/.test(String(c))?String(c):f;
const safeLink=(u,img=false)=>{const v=String(u||'').trim();if(!v)return '';if(/^https?:\/\/[^\s<>"']+$/i.test(v))return v;if(img&&/^(?:\.\/)?[\w.\-/%]+\.(?:jpg|jpeg|png|gif|webp|svg)$/i.test(v)&&!v.includes('..'))return v;return '';};
const bounded=(v,min,max,def)=>{const n=Number(v);return Number.isFinite(n)?Math.min(max,Math.max(min,Math.round(n))):def};
const presetColors={catalog:{accent:'#9b4c91',paper:'#ffffff',card:'#fbf7fa',text:'#201b27',muted:'#756b80',price:'#9b4c91',border:'#f1e8ef',button:'#9b4c91',buttonText:'#ffffff',categoryBg:'#f8eff6'},minimal:{accent:'#252535',paper:'#ffffff',card:'#ffffff',text:'#242433',muted:'#777777',price:'#242433',border:'#e8e8eb',button:'#242433',buttonText:'#ffffff',categoryBg:'#f5f5f7'},elegant:{accent:'#294377',paper:'#faf9f7',card:'#ffffff',text:'#253047',muted:'#7b8090',price:'#294377',border:'#e6e7ea',button:'#294377',buttonText:'#ffffff',categoryBg:'#edf1f8'}};
const morePalettes={
 portfolio:{accent:'#8e6148',paper:'#faf8f4',card:'#fffdf9',text:'#2f2925',muted:'#776b64',price:'#8e6148',border:'#ebe2d9',button:'#8e6148',buttonText:'#ffffff',categoryBg:'#f2eae0'},
 gallery:{accent:'#5a657a',paper:'#f5f6f8',card:'#ffffff',text:'#252a36',muted:'#646f82',price:'#5a657a',border:'#e3e7ee',button:'#5a657a',buttonText:'#ffffff',categoryBg:'#e9edf5'},
 services:{accent:'#34765e',paper:'#f6faf7',card:'#ffffff',text:'#233b31',muted:'#65776f',price:'#34765e',border:'#dce9e1',button:'#34765e',buttonText:'#ffffff',categoryBg:'#e6f1e9'},
 editorial:{accent:'#ae806c',paper:'#fdf8f3',card:'#fffefc',text:'#372a28',muted:'#877875',price:'#ae806c',border:'#eee0d8',button:'#ae806c',buttonText:'#ffffff',categoryBg:'#f6e9e3'},
 events:{accent:'#6757a7',paper:'#fbfaff',card:'#ffffff',text:'#302a4a',muted:'#78718f',price:'#6757a7',border:'#e6e1f2',button:'#6757a7',buttonText:'#ffffff',categoryBg:'#f1edfa'},
 products:{accent:'#244b64',paper:'#f8fbfd',card:'#ffffff',text:'#1c3344',muted:'#627a87',price:'#244b64',border:'#dbe6ed',button:'#244b64',buttonText:'#ffffff',categoryBg:'#e6eff4'}
};Object.assign(presetColors,morePalettes);
const templateNames={catalog:'Wedding Catalog',portfolio:'Portfolio',gallery:'Photo Gallery',services:'Services & Pricing',editorial:'Editorial Lookbook',events:'Event Schedule',products:'Product Collection',elegant:'Elegant',minimal:'Minimal',classic:'Classic'};
const sampleCards={
 portfolio:[['The Garden Affair','An elegant botanical celebration.','','Weddings'],['Romantic Stories','Warm portraits, natural light.','','Photography'],['The Grand Reception','Beautifully styled reception details.','','Weddings'],['Modern Florals','Modern floral installations.','','Design']],
 gallery:[['Ceremony Details','Memories from the ceremony.','','Ceremony'],['Wedding Portraits','Captured intimate moments.','','Portraits'],['Evening Reception','A night worth remembering.','','Reception'],['Bridal Details','Finishing touches.','','Details']],
 services:[['Wedding Website','Interactive wedding invitation website.','£90','Digital'],['RSVP Management','Keep guest responses organized.','£45','Planning'],['Guestbook','Guest messages and memories.','£30','Digital'],['Design Consultation','Wedding design and styling advice.','£60','Consultation']],
 editorial:[['Whispers of Spring','Ivory florals and delicate textures.','','Spring'],['Velvet & Gold','Warm gold with deep velvet tones.','','Classic'],['Blue Reverie','Soft blue romantic details.','','Modern'],['The Meadow','Fresh and natural design.','','Nature']],
 events:[['Wedding Ceremony','The start of a wonderful day.','10:00 AM','Ceremony'],['Cocktail Hour','Light bites and conversations.','12:00 PM','Reception'],['Dinner & Toasts','Share stories and dinner.','06:00 PM','Reception'],['After Party','Music, dancing, and celebrations.','09:00 PM','Party']],
 products:[['The Olive & Crimson','Wedding invitation collection.','£80','Wedding Websites'],['The Blue Reverie','Cinematic wedding invitation.','£90','Wedding Websites'],['Save the Date','Personalized digital announcement.','£35','Invitations'],['Digital Guestbook','Messages to treasure.','£45','Add-ons']]
};
const labelDefaults={summaryTemplate:'{count} designs found',emptyLabel:'No designs found. Try another search.',pageTemplate:'Page {page} of {pages}',prevLabel:'← Previous',nextLabel:'Next →',searchAriaLabel:'Search designs',sortAriaLabel:'Sort designs',filterAriaLabel:'Filter categories'};
const jsLiteral=v=>JSON.stringify(String(v)).replace(/</g,'\\u003c').replace(/>/g,'\\u003e').replace(/\u2028/g,'\\u2028').replace(/\u2029/g,'\\u2029');
function sampleFor(name){if(name==='catalog')return catalogItems.map(x=>({...x}));return (sampleCards[name]||[]).map((v,i)=>({type:'card',title:v[0],body:v[1],price:v[2],category:v[3],label:v[3],image:'',link:'',linkType:'url',target:'',buttonText:'View details',date:'',popularity:0,customOrder:i}));}
// V14.8.16: card images are downscaled once at UPLOAD time (max 960px wide) so the
// generated widget stays small. Originals in Uploads are never modified.
const mzThumbCache=new Map();
const mzThumbKey=a=>a.id+':'+String(a.data||'').length;
async function mzMakeThumb(a){
 if(window.MZI&&MZI.ensureThumb){await MZI.ensureThumb(a);return}
 const src=String(a?.data||''),key=mzThumbKey(a);
 if(mzThumbCache.has(key)||!/^data:image\/(?:png|jpeg|webp);base64,/i.test(src))return;
 if(src.length<150000){mzThumbCache.set(key,src);return}
 try{
  const img=new Image();img.decoding='async';img.src=src;await img.decode();
  const MAX=960,sc=Math.min(1,MAX/(img.naturalWidth||MAX));
  const w=Math.max(1,Math.round(img.naturalWidth*sc)),h=Math.max(1,Math.round(img.naturalHeight*sc));
  const c=document.createElement('canvas');c.width=w;c.height=h;c.getContext('2d').drawImage(img,0,0,w,h);
  let out=c.toDataURL('image/webp',0.82);if(!/^data:image\/webp/.test(out))out=c.toDataURL('image/jpeg',0.85);
  mzThumbCache.set(key,out.length<src.length?out:src);
 }catch(_){mzThumbCache.set(key,src)}
}
function widgetImageSource(value){const v=String(value||'');if(window.MZI&&/^asset:[a-zA-Z0-9_-]+$/.test(v)){const a=S.assets?.find(x=>x.id===v.slice(6));if(a&&/^data:image\/(?:png|jpeg|webp|gif);base64,/i.test(String(a.data||'')))return 'moza-thumb://'+a.id}return imageSource(v)}
function imageSource(value){const v=String(value||'');if(/^asset:[a-zA-Z0-9_-]+$/.test(v)){const a=typeof S!=='undefined'&&S.assets?.find(x=>x.id===v.slice(6));const cached=(a&&window.MZI&&MZI.thumbValid(a)&&a.thumb.data)||(a&&mzThumbCache.get(mzThumbKey(a)));if(cached)return cached;const src=String(a?.data||'');return /^data:image\/(?:png|jpeg|webp|gif);base64,[a-zA-Z0-9+/=]+$/i.test(src)?src:'';}return safeLink(v,true)}
const catalogItems=[
 ['The Olive & Crimson','Scrapbook charm, antique photo frames, and romantic olive-and-crimson accents.','£80','Wedding Website'],
 ['The Emerald Memory','An earthy memory board with film strips, vinyl records, and intimate details.','£90','Wedding Website'],
 ['The Crimson Lace','Deep maroon, delicate lace, and a richly romantic vintage mood.','£90','Wedding Website'],
 ['The Velvet Affair','A cinematic velvet envelope, a wax seal, and a refined love-letter reveal.','£90','Wedding Website'],
 ['The Blue Reverie','Scrapbook charm, antique photo frames, and romantic blue-and-crimson accents.','£90','Wedding Website'],
 ['The Golden Meadow','Scrapbook charm, antique photo frames, and romantic olive-and-crimson accents.','£90','Wedding Website']
].map((v,i)=>({type:'card',category:v[3],title:v[0],body:v[1],price:v[2],label:v[3],image:'',link:'',linkType:'url',target:'',buttonText:'Full details ↗',date:'',popularity:0,customOrder:i}));
const LS_TT=['none','uppercase','lowercase','capitalize'];
const LS_BP=['d','t','m'];
function normLabelStyles(src){
 const out={card:{d:{},t:{},m:{}},filter:{d:{},t:{},m:{}}};
 for(const g of ['card','filter'])for(const bp of LS_BP){
  const s0=src&&src[g]&&src[g][bp];if(!s0||typeof s0!=='object')continue;
  const o=out[g][bp];
  if(typeof s0.ff==='string'&&s0.ff.trim())o.ff=safeFontName(s0.ff);
  if(s0.fw!==undefined&&s0.fw!==''&&Number.isFinite(Number(s0.fw)))o.fw=Math.min(900,Math.max(100,Math.round(Number(s0.fw)/100)*100));
  if(/^#[0-9a-fA-F]{6}$/.test(String(s0.color||'')))o.color=String(s0.color);
  if(LS_TT.includes(s0.tt))o.tt=s0.tt;
  if(s0.ls!==undefined&&s0.ls!==''&&Number.isFinite(Number(s0.ls)))o.ls=Math.min(1,Math.max(-0.1,Math.round(Number(s0.ls)*100)/100));
  if(g==='filter'){
   if(/^#[0-9a-fA-F]{6}$/.test(String(s0.aColor||'')))o.aColor=String(s0.aColor);
   if(/^#[0-9a-fA-F]{6}$/.test(String(s0.aBg||'')))o.aBg=String(s0.aBg);
   if(s0.aFw!==undefined&&s0.aFw!==''&&Number.isFinite(Number(s0.aFw)))o.aFw=Math.min(900,Math.max(100,Math.round(Number(s0.aFw)/100)*100));
  }
 }
 return out;
}
function labelStyleCss(c){
 const rule=(g,o)=>{
  const base=g==='card'?'.mz13-root .mz13-label':'.mz13-root .mz13-cat';
  let d='',col='';
  if(o.ff)d+=`font-family:${fontResources(o.ff).family};`;
  if(o.fw)d+=`font-weight:${o.fw};`;
  if(o.tt)d+=`text-transform:${o.tt};`;
  if(o.ls!==undefined)d+=`letter-spacing:${o.ls}em;`;
  // The active filter button keeps its own colour (white on accent) unless "active colour" is set.
  if(o.color)col=g==='filter'?`.mz13-root .mz13-cat:not([aria-pressed=true]){color:${o.color}}`:`${base}{color:${o.color}}`;
  let out=(d?`${base}{${d}}`:'')+col;
  if(g==='filter'){
   let a='';
   if(o.aColor)a+=`color:${o.aColor};`;
   if(o.aBg)a+=`background:${o.aBg};border-color:${o.aBg};`;
   if(o.aFw)a+=`font-weight:${o.aFw};`;
   if(a)out+=`.mz13-root .mz13-cat[aria-pressed=true]{${a}}`;
  }
  return out;
 };
 const wrap={d:x=>x,t:x=>x?`@media(min-width:601px) and (max-width:900px){${x}}`:'',m:x=>x?`@media(max-width:600px){${x}}`:''};
 const css=LS_BP.map(bp=>wrap[bp](['card','filter'].map(g=>rule(g,c.labelStyles[g][bp])).join(''))).join('');
 return css?`<style>${css}</style>`:'';
}
function normalize(c){
 const old=baseNormalize(c),saved=c||{},catalog=old.preset==='catalog';
 old.preset=Object.hasOwn(templateNames,saved.preset)?saved.preset:'classic';
 const pc=presetColors[old.preset]||presetColors.elegant;
 const cc=saved.colors||{};
 old.colors=Object.fromEntries(Object.entries(pc).map(([k,v])=>[k,cssColor(cc[k],v)]));
 old.font=saved.font?safeFontName(saved.font):'Arial';
 old.fontFamilies={};
 for(const role of ['filterCategory','cardCategory','search','sort','summary']){
  old.fontFamilies[role]=safeFontName(saved.fontFamilies?.[role]||old.font);
 }
 old.filterLayout=['inline','search-below','filters-below','stacked'].includes(saved.filterLayout)?saved.filterLayout:'inline';
 old.filterAlignment=['start','center','end'].includes(saved.filterAlignment)?saved.filterAlignment:'start';
 old.filterGap=bounded(saved.filterGap,0,32,9);
 old.filterPadding=bounded(saved.filterPadding,0,24,8);
 old.filterCorner=bounded(saved.filterCorner,0,40,20);
 old.controlHeight=bounded(saved.controlHeight,28,80,36);
 old.searchWidth=bounded(saved.searchWidth,120,600,240);
 old.sortWidth=bounded(saved.sortWidth,100,400,150);
 old.fontSizes={
  title:bounded(saved.fontSizes?.title,8,56,16),body:bounded(saved.fontSizes?.body,8,42,12),
  price:bounded(saved.fontSizes?.price,8,50,16),
  // Migrate safely: existing card labels keep their previous size, while filter tabs
  // inherit the old button size until the user explicitly edits their new control.
  cardCategory:bounded(saved.fontSizes?.cardCategory,8,48,bounded(saved.fontSizes?.label,8,35,10)),
  filterCategory:bounded(saved.fontSizes?.filterCategory,8,48,bounded(saved.fontSizes?.button,8,42,11)),
  label:bounded(saved.fontSizes?.label,8,35,10),button:bounded(saved.fontSizes?.button,8,42,11),
  search:bounded(saved.fontSizes?.search,8,48,12),sort:bounded(saved.fontSizes?.sort,8,48,12),summary:bounded(saved.fontSizes?.summary,8,48,11)
 };
 // Independent typography overrides for Tablet and Mobile. Existing projects
 // keep their desktop values until a device-specific field is changed.
 old.deviceSizes={t:{},m:{}};
 for(const bp of ['t','m'])for(const key of Object.keys(old.fontSizes)){
  if(saved.deviceSizes?.[bp]?.[key]!==undefined)
   old.deviceSizes[bp][key]=bounded(saved.deviceSizes[bp][key],8,56,old.fontSizes[key]);
 }
 // V14.8.17: independent styling for the card "Small label" and the "Categories / filter" buttons.
 // Stored sparsely per device: a missing key means "keep today's look", so old projects render identically.
 old.labelStyles=normLabelStyles(saved.labelStyles);
 // V14.8.17 per-device manual scale (null = Automatic from the real widget width).
 for(const k of ['scaleD','scaleT','scaleM']){const v=Number(saved[k]);old[k]=(saved[k]!==null&&saved[k]!==undefined&&saved[k]!==''&&Number.isFinite(v)&&v>0)?Math.min(1.5,Math.max(0.2,Math.round(v*100)/100)):null}
 old.scaleFitBox=saved.scaleFitBox!==false;
 old.readableLimit=saved.readableLimit!==false;
 old.debugBadge=saved.debugBadge===true;
 old.mobileCardMaxWidth=bounded(saved.mobileCardMaxWidth,0,375,0);
 old.radius=bounded(saved.radius,0,42,old.preset==='catalog'?16:12);
 old.gap=bounded(saved.gap,0,50,12);
 old.columnsTablet=bounded(saved.columnsTablet,1,4,Math.min(2,old.columns));
 old.uiLabels=Object.fromEntries(Object.entries(labelDefaults).map(([k,def])=>[k,String(saved.uiLabels?.[k]??def).slice(0,180)]));
 old.showResultsCount=saved.showResultsCount!==false;
 old.allLabel=saved.allLabel===undefined?'All':old.allLabel;
 old.searchPlaceholder=saved.searchPlaceholder===undefined?'Search designs...':old.searchPlaceholder;
 old.sortLabels={manual:'Original order',newest:'Newest date',oldest:'Oldest date',popular:'Most Popular',az:'A–Z',custom:'Custom Order',latest:'Recently added first',...(saved.sortLabels||{})};
 old.sortDefault=saved.sortDefault==='latest'?'latest':old.sortDefault;
 old.imageRatio=['1/1','4/3','3/4','16/9'].includes(saved.imageRatio)?saved.imageRatio:'3/4';
 const sourceCategories=Array.isArray(saved.categories)?saved.categories:old.items.flatMap(it=>String(it.category||'').split(/[,|]/));
 old.categories=[...new Map(sourceCategories.map(v=>String(v||'').trim().slice(0,70)).filter(Boolean).map(v=>[v.toLowerCase(),v])).values()].slice(0,35);
 old.items=old.items.map((it,i)=>({...it,
  category:String((saved.items||[])[i]?.category||it.category||'General').slice(0,240),
  label:String((saved.items||[])[i]?.label||'').slice(0,90),
  price:String((saved.items||[])[i]?.price||'').slice(0,70),
  buttonText:String((saved.items||[])[i]?.buttonText===undefined?'Full details ↗':(saved.items||[])[i].buttonText).slice(0,60),
  linkType:['url','page','section','project'].includes((saved.items||[])[i]?.linkType)?(saved.items||[])[i].linkType:'url',
  target:String((saved.items||[])[i]?.target||'').slice(0,180),
  targetPage:String((saved.items||[])[i]?.targetPage||'').slice(0,160),
  targetSection:String((saved.items||[])[i]?.targetSection||'').slice(0,160)
 }));
 return old;
}
function widget(cfg0){
 const c=normalize(cfg0), co=c.colors, typography=fontResources(c.font);
  const roleFonts=Object.fromEntries(Object.entries(c.fontFamilies).map(([key,name])=>[key,fontResources(name)]));
  // A custom uploaded font can be large; include each face only once per widget.
  const lsFonts=['card','filter'].flatMap(g=>LS_BP.map(bp=>c.labelStyles[g][bp].ff).filter(Boolean));
  const faces=[...new Set([c.font,...Object.values(c.fontFamilies),...lsFonts])].map(fontResources);
  const fontCss=[...new Set(faces.map(f=>f.css).filter(Boolean))].join('');
 const deviceSize=(bp,key)=>c.deviceSizes?.[bp]?.[key]??c.fontSizes[key];
 const responsiveSizes=bp=>`.mz13-cat{font-size:${deviceSize(bp,'filterCategory')}px}.mz13-search{font-size:${deviceSize(bp,'search')}px}.mz13-sort{font-size:${deviceSize(bp,'sort')}px}.mz13-summary{font-size:${deviceSize(bp,'summary')}px}.mz13-label{font-size:${deviceSize(bp,'cardCategory')}px}.mz13-content h3{font-size:${deviceSize(bp,'title')}px}.mz13-content p{font-size:${deviceSize(bp,'body')}px}.mz13-price{font-size:${deviceSize(bp,'price')}px}.mz13-action{font-size:${deviceSize(bp,'button')}px}`;
 const cats=c.categories.length?c.categories:[...new Set(c.items.flatMap(it=>it.category.split(',').map(x=>x.trim())).filter(Boolean))];
 const has=(it,cat)=>it.category.split(/[,|]/).map(x=>x.trim().toLowerCase()).includes(cat.toLowerCase());
 const categories=cats.map(cat=>`<button type="button" class="mz13-cat" data-cat="${esc(cat.toLowerCase())}" aria-pressed="false">${esc(cat)}${c.showCategoryCounts?' ('+c.items.filter(it=>has(it,cat)).length+')':''}</button>`).join('');
 const pages=Array.isArray(c.items)?c.items:[];
 const media=it=>{
  const src=c.showImages?widgetImageSource(it.image):'';
  if(it.type==='video')return /\.(mp4|webm)(\?|$)/i.test(src)?`<video controls playsinline preload="metadata" src="${esc(src)}"></video>`:'<div class="mz13-placeholder">Add a video URL</div>';
  if(it.type==='text'||!c.showImages)return '';
  return src?`<div class="mz13-media"><img loading="lazy" src="${esc(src)}" alt="${esc(it.title)}"></div>`:`<div class="mz13-media mz13-placeholder" aria-label="Image not provided"><span>＋ Add image</span></div>`;
 };
 const card=(it,i)=>{
  const label=it.label||it.category.split(',')[0]||'';
  const target=it.linkType==='url'?safeLink(it.link):'';
  const hasAction=it.linkType==='url'?!!target:!!it.target;
  const text=String(it.buttonText||'').trim();const link=!text?'':hasAction?(it.linkType==='url'?`<a class="mz13-action" href="${esc(target)}" target="_blank" rel="noopener noreferrer">${esc(text)}</a>`:`<button type="button" class="mz13-action" data-go="${esc(it.linkType)}" data-target="${esc(it.target)}" data-pg="${esc(it.targetPage||'')}" data-sec="${esc(it.targetSection||'')}">${esc(text)}</button>`):`<span class="mz13-action mz13-unlinked" title="Link not configured">${esc(text)}</span>`;
  const cats=it.category.split(/[,|]/).map(x=>x.trim().toLowerCase()).filter(Boolean).join('|');
  return `<article class="mz13-card" data-original="${i}" data-categories="${esc('|'+cats+'|')}" data-title="${esc(it.title.toLowerCase())}" data-body="${esc(it.body.toLowerCase())}" data-date="${esc(it.date)}" data-popularity="${it.popularity}" data-custom="${it.customOrder}" data-type="${esc(it.type)}">${media(it)}<div class="mz13-content">${label?`<div class="mz13-label">${esc(label)}</div>`:''}<h3>${esc(it.title)}</h3>${it.body?`<p>${esc(it.body).replace(/\n/g,'<br>')}</p>`:''}<div class="mz13-footer">${it.price?`<strong class="mz13-price">${esc(it.price)}</strong>`:''}${link}</div></div></article>`;
 };
 const opts=Object.entries(c.sortLabels).map(([k,v])=>`<option value="${esc(k)}" ${k===c.sortDefault?'selected':''}>${esc(v)}</option>`).join('');
 const css=`<style>${fontCss}*{box-sizing:border-box}html,body{width:100%;min-height:100%;margin:0;background:transparent;color:${co.text};font-family:${typography.family}}button,input,select{font:inherit}body{padding:3px}.mz13-root{background:${co.paper};padding:13px;border-radius:${c.radius}px;--mz13-accent:${co.accent}}.mz13-bar{display:flex;flex-wrap:wrap;align-items:center;gap:${c.filterGap}px;margin:0 0 12px}.mz13-layout-search-below .mz13-cats{flex-basis:100%}.mz13-layout-filters-below .mz13-cats{order:3;flex-basis:100%}.mz13-layout-stacked .mz13-cats,.mz13-layout-stacked .mz13-search,.mz13-layout-stacked .mz13-sort{flex:1 1 100%;max-width:100%;width:100%}.mz13-align-center .mz13-cats{justify-content:center}.mz13-align-end .mz13-cats{justify-content:flex-end}.mz13-cats{display:flex;gap:5px;flex-wrap:wrap;flex:1 1 auto}.mz13-cat{cursor:pointer;background:${co.categoryBg};border:1px solid ${co.border};border-radius:${c.filterCorner}px;padding:${c.filterPadding}px ${c.filterPadding+5}px;font-family:${roleFonts.filterCategory.family};font-size:${c.fontSizes.filterCategory}px;color:${co.text};min-height:${c.controlHeight}px}.mz13-cat[aria-pressed=true]{background:${co.accent};border-color:${co.accent};color:white}.mz13-search{padding:7px 11px;min-width:120px;max-width:${c.searchWidth}px;flex:1 1 130px;border-radius:9px;border:1px solid ${co.border};color:${co.text};background:#fff;font-family:${roleFonts.search.family};font-size:${c.fontSizes.search}px;min-height:${c.controlHeight}px}.mz13-sort{padding:7px 8px;border:1px solid ${co.border};border-radius:9px;background:white;min-width:100px;max-width:${c.sortWidth}px;flex:0 1 ${c.sortWidth}px;font-family:${roleFonts.sort.family};font-size:${c.fontSizes.sort}px;min-height:${c.controlHeight}px}.mz13-summary{color:${co.muted};font-family:${roleFonts.summary.family};font-size:${c.fontSizes.summary}px;min-height:16px;margin:4px 0 11px}.mz13-grid{display:grid;grid-template-columns:repeat(${c.columns},minmax(0,1fr));gap:${c.gap}px}.mz13-card{border:1px solid ${co.border};border-radius:${c.radius}px;background:${co.card};min-width:0;overflow:hidden;display:flex;flex-direction:column}.mz13-card[hidden]{display:none}.mz13-media{margin:${c.preset==='catalog'?'15px 15px 0':'0'};aspect-ratio:${c.imageRatio};overflow:hidden;background:linear-gradient(135deg,#ded6d7,#f3e9ee)}.mz13-media img{width:100%;height:100%;object-fit:cover;display:block}.mz13-placeholder{display:grid;place-items:center;color:#8f8295;font-size:12px;text-align:center;padding:15px}.mz13-content{padding:${c.preset==='catalog'?'16px 13px 13px':'13px'};display:flex;flex-direction:column;flex:1}.mz13-label{font-family:${roleFonts.cardCategory.family};font-size:${c.fontSizes.cardCategory}px;text-transform:uppercase;letter-spacing:.1em;color:${co.accent};margin-bottom:5px}.mz13-content h3{font-size:${c.fontSizes.title}px;color:${co.text};line-height:1.25;margin:0 0 8px;overflow-wrap:anywhere}.mz13-content p{font-size:${c.fontSizes.body}px;color:${co.muted};margin:0 0 14px;line-height:1.5;overflow-wrap:anywhere}.mz13-footer{display:flex;align-items:flex-end;justify-content:space-between;gap:5px;margin-top:auto}.mz13-price{font-size:${c.fontSizes.price}px;color:${co.price};font-weight:700}.mz13-action{font-size:${c.fontSizes.button}px;background:${c.preset==='catalog'?'transparent':co.button};color:${c.preset==='catalog'?co.accent:co.buttonText};border:0;border-radius:8px;padding:7px 8px;cursor:pointer;min-height:32px;text-decoration:none;white-space:normal;text-align:right}.mz13-action:hover{text-decoration:underline}.mz13-unlinked{display:inline-block;opacity:.94;cursor:default}.mz13-card .mz13-footer:empty{display:none}.mz13-page{display:flex;align-items:center;justify-content:center;gap:11px;margin:17px 0 4px}.mz13-page button{border:1px solid ${co.border};background:${co.card};color:${co.text};padding:8px;border-radius:8px;cursor:pointer}.mz13-page button:disabled{opacity:.45}.mz13-page span{font-size:11px}.mz13-empty{text-align:center;padding:24px;color:${co.muted}}.mz13-card video{width:100%;max-height:280px}.mz13-root :focus-visible{outline:2px solid ${co.accent};outline-offset:2px}@media(min-width:601px) and (max-width:900px){.mz13-grid{grid-template-columns:repeat(${c.columnsTablet},minmax(0,1fr))}.mz13-content{padding:12px}.mz13-footer{flex-wrap:wrap}.mz13-search{max-width:100%}}@media(max-width:600px){.mz13-root{padding:8px}.mz13-cats{flex-wrap:nowrap;overflow-x:auto;flex-basis:100%}.mz13-cat{white-space:nowrap;flex-shrink:0;min-height:${Math.max(42,c.controlHeight)}px}.mz13-grid{grid-template-columns:repeat(${c.columnsMobile},minmax(0,1fr));gap:${Math.min(12,c.gap)}px}.mz13-media{margin:8px 8px 0}.mz13-content{padding:9px}.mz13-search{max-width:100%;width:100%;flex-basis:100%}.mz13-sort{flex:1 1 100%;max-width:100%}.mz13-footer{flex-wrap:wrap}.mz13-action{max-width:100%}.mz13-bar{gap:8px}.mz13-card{min-width:0}}@media(max-width:340px){.mz13-root{padding:5px}}@media(max-width:250px){.mz13-grid{grid-template-columns:1fr}}@media(min-width:601px) and (max-width:900px){${responsiveSizes('t')}}@media(max-width:600px){${responsiveSizes('m')}.mz13-grid{justify-items:center}.mz13-card{width:100%;max-width:${c.mobileCardMaxWidth?c.mobileCardMaxWidth+'px':'none'}}}@media(prefers-reduced-motion:reduce){*{animation-duration:0.01ms!important;transition:none!important}}</style>`;
 const scaleCssRaw=`<style>
.mz13-root{--mz13-scale:1; padding:calc(13px * var(--mz13-scale));border-radius:calc(${c.radius}px * var(--mz13-scale));}
.mz13-bar{gap:calc(${c.filterGap}px * var(--mz13-scale));margin-bottom:calc(12px * var(--mz13-scale));}
.mz13-grid{gap:calc(${c.gap}px * var(--mz13-scale));}
.mz13-card{border-radius:calc(${c.radius}px * var(--mz13-scale));}
.mz13-cats{gap:calc(5px * var(--mz13-scale));}
.mz13-cat{font-size:calc(${c.fontSizes.filterCategory}px * var(--mz13-scale));padding:calc(${c.filterPadding}px * var(--mz13-scale)) calc(${c.filterPadding+5}px * var(--mz13-scale));min-height:calc(${c.controlHeight}px * var(--mz13-scale));border-radius:calc(${c.filterCorner}px * var(--mz13-scale));}
.mz13-search{font-size:calc(${c.fontSizes.search}px * var(--mz13-scale));padding:calc(7px * var(--mz13-scale)) calc(11px * var(--mz13-scale));min-height:calc(${c.controlHeight}px * var(--mz13-scale));}
.mz13-sort{font-size:calc(${c.fontSizes.sort}px * var(--mz13-scale));padding:calc(7px * var(--mz13-scale)) calc(8px * var(--mz13-scale));min-height:calc(${c.controlHeight}px * var(--mz13-scale));}
.mz13-summary{font-size:calc(${c.fontSizes.summary}px * var(--mz13-scale));margin:calc(4px * var(--mz13-scale)) 0 calc(11px * var(--mz13-scale));}
.mz13-media{margin:calc(${c.preset==='catalog'?15:0}px * var(--mz13-scale)) calc(${c.preset==='catalog'?15:0}px * var(--mz13-scale)) 0;}
.mz13-placeholder{font-size:calc(12px * var(--mz13-scale));padding:calc(15px * var(--mz13-scale));}
.mz13-content{padding:calc(${c.preset==='catalog'?16:13}px * var(--mz13-scale)) calc(13px * var(--mz13-scale));}
.mz13-label{font-size:calc(${c.fontSizes.cardCategory}px * var(--mz13-scale));margin-bottom:calc(5px * var(--mz13-scale));}
.mz13-content h3{font-size:calc(${c.fontSizes.title}px * var(--mz13-scale));margin-bottom:calc(8px * var(--mz13-scale));}
.mz13-content p{font-size:calc(${c.fontSizes.body}px * var(--mz13-scale));margin-bottom:calc(14px * var(--mz13-scale));}
.mz13-footer{gap:calc(5px * var(--mz13-scale));}
.mz13-price{font-size:calc(${c.fontSizes.price}px * var(--mz13-scale));}
.mz13-action{font-size:calc(${c.fontSizes.button}px * var(--mz13-scale));min-height:calc(32px * var(--mz13-scale));padding:calc(7px * var(--mz13-scale)) calc(8px * var(--mz13-scale));border-radius:calc(8px * var(--mz13-scale));}
.mz13-page{gap:calc(11px * var(--mz13-scale));margin:calc(17px * var(--mz13-scale)) 0 calc(4px * var(--mz13-scale));}
.mz13-page button{padding:calc(8px * var(--mz13-scale));}.mz13-page span{font-size:calc(11px * var(--mz13-scale));}
@media(min-width:601px) and (max-width:900px){${responsiveSizes('t').replace(/font-size:/g,'font-size:calc(').replace(/px}/g,'px * var(--mz13-scale))}')}}
@media(max-width:600px){
.mz13-root{padding:calc(8px * var(--mz13-scale))}.mz13-content{padding:calc(9px * var(--mz13-scale))}.mz13-media{margin:calc(8px * var(--mz13-scale)) calc(8px * var(--mz13-scale)) 0}.mz13-bar{gap:calc(8px * var(--mz13-scale))}
${responsiveSizes('m').replace(/font-size:/g,'font-size:calc(').replace(/px}/g,'px * var(--mz13-scale))}')}
}
</style>`;
 // V14.8.17: readability floor + overflow guards. The floor never RAISES a size above what the user set
 // (min(floor, N)), so scale 1 and legacy projects render exactly as before.
 const mzMin=c.readableLimit?10:1,mzMinTitle=c.readableLimit?12:1;
 let scaleCssBody=scaleCssRaw.replace(/font-size:calc\(([^;{}]*?) \* var\(--mz13-scale\)\)/g,'font-size:max(min(var(--mz13-min),$1),calc($1 * var(--mz13-scale)))')
  .replace(/(\.mz13-content h3\{font-size:max\(min\()var\(--mz13-min\)/g,'$1var(--mz13-min-title)');
 const scaleCss=scaleCssBody.replace('</style>','')+`.mz13-root{--mz13-min:${mzMin}px;--mz13-min-title:${mzMinTitle}px;box-sizing:border-box;max-width:100%;min-width:0}
.mz13-root *,.mz13-root *::before,.mz13-root *::after{box-sizing:border-box}
.mz13-root img{max-width:100%}.mz13-card,.mz13-grid>*,.mz13-content,.mz13-bar>*{min-width:0}
.mz13-label,.mz13-price,.mz13-content h3,.mz13-content p,.mz13-summary{overflow-wrap:anywhere}
.mz13-search{min-width:0;max-width:100%}
.mz13-card,.mz13-cat,.mz13-search,.mz13-sort,.mz13-action{border-width:max(1px,calc(1px * var(--mz13-scale)))}
html,body{max-width:100%;overflow-x:hidden}
</style>`;
 const script=`<script>(function(){'use strict';const root=document.querySelector('.mz13-root');if(!root)return;const baseWidths=${JSON.stringify({d:Math.max(120,Math.round(Number(c.renderBaseWidths?.d||c.renderBaseWidth)||900)),t:Math.max(120,Math.round(Number(c.renderBaseWidths?.t)||((Number(c.renderBaseWidth)||900)*.64))),m:Math.max(120,Math.round(Number(c.renderBaseWidths?.m)||((Number(c.renderBaseWidth)||900)*.3125)))})};let dbgEl=null;const dbgStart=${c.debugBadge?'true':'false'};function mkDbg(){dbgEl=document.createElement('div');dbgEl.style.cssText='position:fixed;left:4px;top:4px;z-index:99999;font:11px/1.3 monospace;background:rgba(0,0,0,.85);color:#7CFC00;padding:3px 6px;border-radius:4px;pointer-events:none;max-width:96%';document.body.appendChild(dbgEl);dbg()}function dbg(){if(!dbgEl)return;const w=window.innerWidth,b=w<=600?'MOBILE':w<=900?'TABLET':'DESKTOP';const cs=gridEl?getComputedStyle(gridEl).gridTemplateColumns.split(' ').length:0;dbgEl.textContent='w='+w+' sb='+Math.max(0,w-document.documentElement.clientWidth)+' '+b+' scale='+root.style.getPropertyValue('--mz13-scale')+' cols='+cs+'/'+((confCols[b[0]==='M'?'m':b[0]==='T'?'t':'d'])||'?')+' content='+Math.round(root.getBoundingClientRect().height)+' box='+window.innerHeight+' v14.8.22'}window.addEventListener('keydown',function(e){if(e.shiftKey&&(e.key==='D'||e.key==='d')){if(dbgEl){dbgEl.remove();dbgEl=null}else{mkDbg()}}});const manualScale=${JSON.stringify({d:c.scaleD,t:c.scaleT,m:c.scaleM})};const confCols=${JSON.stringify({d:c.columns,t:c.columnsTablet,m:c.columnsMobile})};const gridEl=root.querySelector('.mz13-grid');let scaleQueued=false,lastW=-1;function sbw(){return Math.max(0,(window.innerWidth||0)-document.documentElement.clientWidth)}function fitCols(w,r){if(!gridEl)return;const b=w<=600?'m':w<=900?'t':'d';const conf=Math.max(1,Number(confCols[b])||1);const gap=parseFloat(getComputedStyle(gridEl).columnGap)||0;const inner=(gridEl.clientWidth||w)+sbw();const minCard=Math.max(120,150*r);const fit=Math.max(1,Math.floor((inner+gap)/(minCard+gap)));const use=Math.min(conf,fit);if(use<conf)gridEl.style.gridTemplateColumns='repeat('+use+',minmax(0,1fr))';else gridEl.style.removeProperty('grid-template-columns')}function applyScale(){scaleQueued=false;const w=Math.max(1,window.innerWidth||document.documentElement.clientWidth);lastW=w;const b=w<=600?'m':w<=900?'t':'d';const man=manualScale[b];const ratio=(man!==null&&man!==undefined)?man:Math.min(1,Math.max(0.55,w/baseWidths.d));root.style.setProperty('--mz13-scale',String(Math.round(ratio*100)/100));fitCols(w,Math.round(ratio*100)/100);dbg()}function scheduleScale(){if(scaleQueued)return;scaleQueued=true;requestAnimationFrame(applyScale)}window.addEventListener('resize',scheduleScale,{passive:true});window.addEventListener('scroll',function(){if(dbgEl)dbg()},{passive:true});if(window.ResizeObserver){new ResizeObserver(()=>{const w=window.innerWidth;if(w!==lastW)scheduleScale()}).observe(document.documentElement)}applyScale();if(dbgStart)mkDbg();const all=Array.from(root.querySelectorAll('.mz13-card'));const cats=Array.from(root.querySelectorAll('[data-cat]'));const inp=root.querySelector('.mz13-search');const sorter=root.querySelector('.mz13-sort');const count=root.querySelector('.mz13-summary');const empty=root.querySelector('.mz13-empty');const pages=root.querySelector('.mz13-page');const prev=root.querySelector('[data-prev]');const next=root.querySelector('[data-next]');let active='all',p=1;const size=${c.pagination?c.pageSize:999};let matched=[];function render(){const query=(inp?.value||'').trim().toLowerCase();let list=all.filter(x=>(active==='all'||(x.dataset.categories||'').includes('|'+active+'|'))&&(!query||(x.dataset.title+' '+x.dataset.body).includes(query)));const ord=sorter?.value||'${c.sortDefault}';if(ord==='az')list.sort((a,b)=>a.dataset.title.localeCompare(b.dataset.title));else if(ord==='newest'||ord==='oldest')list.sort((a,b)=>(a.dataset.date||'').localeCompare(b.dataset.date||'')*(ord==='newest'?-1:1));else if(ord==='latest')list.sort((a,b)=>Number(b.dataset.original)-Number(a.dataset.original));else if(ord==='popular')list.sort((a,b)=>Number(b.dataset.popularity)-Number(a.dataset.popularity));else if(ord==='custom')list.sort((a,b)=>Number(a.dataset.custom)-Number(b.dataset.custom));else list.sort((a,b)=>Number(a.dataset.original)-Number(b.dataset.original));matched=list;const max=Math.max(1,Math.ceil(list.length/size));p=Math.min(p,max);const grid=root.querySelector('.mz13-grid');if(grid)list.forEach(x=>grid.appendChild(x));all.forEach(x=>x.hidden=true);list.slice((p-1)*size,p*size).forEach(x=>x.hidden=false);if(count)count.textContent=${jsLiteral(c.uiLabels.summaryTemplate)}.replace(/\{count\}/g,String(list.length));if(empty)empty.hidden=!!list.length;if(pages){pages.hidden=max<=1;pages.querySelector('span').textContent=${jsLiteral(c.uiLabels.pageTemplate)}.replace(/\{page\}/g,String(p)).replace(/\{pages\}/g,String(max));prev.disabled=p<=1;next.disabled=p>=max;}}cats.forEach(b=>b.addEventListener('click',()=>{active=b.dataset.cat;p=1;cats.forEach(x=>x.setAttribute('aria-pressed',String(x===b)));render()}));inp?.addEventListener('input',()=>{p=1;render()});sorter?.addEventListener('change',()=>{p=1;render()});prev?.addEventListener('click',()=>{p=Math.max(1,p-1);render()});next?.addEventListener('click',()=>{p++;render()});root.querySelectorAll('[data-go]').forEach(b=>b.addEventListener('click',()=>{parent.postMessage({type:'moza:visual-filter:navigate',kind:b.dataset.go,target:b.dataset.target,pageId:b.dataset.pg||'',sectionId:b.dataset.sec||''},'*')}));render();})();</script>`;
 return `${css}${scaleCss}${labelStyleCss(c)}<section class="mz13-root mz13-layout-${c.filterLayout} mz13-align-${c.filterAlignment}" aria-label="Visual Smart Filter"><div class="mz13-bar"><div class="mz13-cats" role="group" aria-label="${esc(c.uiLabels.filterAriaLabel)}"><button type="button" class="mz13-cat" data-cat="all" aria-pressed="true">${esc(c.allLabel)}${c.showCategoryCounts?' ('+c.items.length+')':''}</button>${categories}</div>${c.showSearch?`<input class="mz13-search" type="search" placeholder="${esc(c.searchPlaceholder)}" aria-label="${esc(c.uiLabels.searchAriaLabel)}">`:''}${c.showSorting?`<select class="mz13-sort" aria-label="${esc(c.uiLabels.sortAriaLabel)}">${opts}</select>`:''}</div>${c.showResultsCount?'<p class="mz13-summary" role="status" aria-live="polite"></p>':''}<div class="mz13-grid">${pages.map(card).join('')}</div>${c.pagination?`<div class="mz13-page"><button data-prev type="button">${esc(c.uiLabels.prevLabel)}</button><span></span><button data-next type="button">${esc(c.uiLabels.nextLabel)}</button></div>`:''}<div class="mz13-empty" hidden>${esc(c.uiLabels.emptyLabel)}</div></section>${script}`;
}
api.normalize=normalize;api.buildWidget=widget;api.defaults=()=>normalize(baseDefaults());
const isReady=()=>typeof S!=='undefined'&&S.doc&&S.mode==='design';
const selected=()=>isReady()&&S.sel?.k==='el'?T('el'):null;
// V14.8.7: A Smart Filter change must not remount the entire 2,000+ layer canvas.
// Only its sandbox iframe is refreshed, after a short idle delay, while Undo and
// the native Save queue continue to operate through commit().
function mz1487RefreshSelected(elId){
 const hit=Array.from(document.querySelectorAll('#frame .el[data-id]')).find(node=>node.dataset.id===elId);
 const frame=hit?.querySelector('iframe.a319-safe-iframe');
 const match=typeof findEl==='function'?findEl(elId)?.el:null;
 if(match?.mozaSmartFilter && frame){
  // The widget runs in a sandbox; changing srcdoc is sufficient to update it.
  frame.srcdoc=a319WidgetDocument(match.embedCode||'');
 }else if(match?.mozaSmartFilter){
  // Fallback for a virtualized/hidden widget. Do not rebuild the entire canvas
  // when the selected element has already moved to another page.
  if(hit && typeof renderCanvas==='function')renderCanvas();
 }
}
function mz1487RenderInspector(){
 const panel=document.querySelector('#right');
 const openStates=panel?[...panel.querySelectorAll('.mz13-editor details')].map(node=>node.open):[];
 const scrollTop=panel?.scrollTop||0;
 renderRight();
 if(!panel)return;
 [...panel.querySelectorAll('.mz13-editor details')].forEach((node,index)=>{
  if(index<openStates.length)node.open=openStates[index];
 });
 panel.scrollTop=scrollTop;
}
function save(fn){
 const e=selected();if(!e?.mozaSmartFilter||e.locked)return;
 const id=e.id;
 // Keep Undo/autosave semantics, but do not remount the full canvas for a
 // content-only widget edit. Rebuild only the inspector and this widget iframe.
 commit(discrete());
 const c=normalize(e.mozaSmartFilter);
 fn(c);
 e.mozaSmartFilter=normalize(c);
 // Draft changes are persistent and undoable; the last uploaded embedCode remains
 // the only version rendered in canvas, Preview and published HTML.
 e.mozaSmartFilterPending=true;
 mz1487RenderInspector();
}

const opt=(items,v)=>items.map(([key,label])=>`<option value="${esc(key)}" ${String(key)===String(v)?'selected':''}>${esc(label)}</option>`).join('');
const LS_DEFAULTS={card:{tt:'uppercase',ls:0.1,fw:400},filter:{tt:'none',ls:0,fw:400}};
function lsEffective(c,g,bp,k){const L=c.labelStyles[g];return (bp!=='d'&&L[bp][k]!==undefined)?L[bp][k]:L.d[k]}
function lsGroupsHtml(c,bp,currentSize){
 const bpName=({d:'Desktop',t:'Tablet',m:'Mobile'})[bp];
 const fonts=k=>[...new Set([...fontChoices(),c.fontFamilies[k]])].map(f=>[f,f]);
 const weights=[['','Default'],...[300,400,500,600,700,800].map(w=>[String(w),String(w)])];
 const tts=[['','Default'],['none','Normal'],['uppercase','UPPERCASE'],['lowercase','lowercase'],['capitalize','Capitalize']];
 const mk=(g,role,title,hint,extra)=>{
  const ov=c.labelStyles[g][bp]||{};
  const eff=k=>lsEffective(c,g,bp,k);
  const ffVal=(bp==='d')?c.fontFamilies[role]:(ov.ff||c.labelStyles[g].d.ff||c.fontFamilies[role]);
  const colorVal=eff('color')||(g==='card'?c.colors.accent:c.colors.text);
  return `<fieldset class="mz13-lsgroup" data-mz13-lsgroup="${g}" style="grid-column:1/-1;border:1px solid #dfe5ef;border-radius:10px;padding:9px;margin:6px 0"><legend><b>${title}</b> · ${bpName}</legend><p class="hint">${hint}</p><div class="mz13-fields">
  <label>Font<select data-mz13-ls="${g}" data-mz13-lk="ff">${opt(fonts(role),ffVal)}</select></label>
  <label>Size (px)<input type="number" min="8" max="48" data-mz13-size="${role}" value="${currentSize(role)}"></label>
  <label>Weight<select data-mz13-ls="${g}" data-mz13-lk="fw">${opt(weights,ov.fw!==undefined?String(ov.fw):'')}</select></label>
  <label>Colour<input type="color" data-mz13-ls="${g}" data-mz13-lk="color" value="${colorVal}"></label>
  <label>Letter case<select data-mz13-ls="${g}" data-mz13-lk="tt">${opt(tts,ov.tt||'')}</select></label>
  <label>Letter spacing (em)<input type="number" step="0.01" min="-0.1" max="1" placeholder="${LS_DEFAULTS[g].ls}" data-mz13-ls="${g}" data-mz13-lk="ls" value="${ov.ls!==undefined?ov.ls:''}"></label>
  ${extra||''}</div><div class="mz13-ops"><button type="button" data-a="mz13-ls-reset" data-g="${g}">Reset ${esc(title)} · ${bpName} to default look</button></div></fieldset>`;
 };
 const activeFields=(()=>{const ov=c.labelStyles.filter[bp]||{};return `<label>Active button · Colour<input type="color" data-mz13-ls="filter" data-mz13-lk="aColor" value="${ov.aColor||'#ffffff'}"></label><label>Active button · Background<input type="color" data-mz13-ls="filter" data-mz13-lk="aBg" value="${ov.aBg||c.colors.accent}"></label><label>Active button · Weight<select data-mz13-ls="filter" data-mz13-lk="aFw">${opt(weights,ov.aFw!==undefined?String(ov.aFw):'')}</select></label>`})();
 return mk('card','cardCategory','Small label (card)','The small text above each card title. If a card\u2019s Small label field is empty, the card\u2019s FIRST category is shown here. Changes are drafts until UPLOAD.')+
  mk('filter','filterCategory','Categories / filter buttons','The top filter buttons, including the active (selected) button. Changes are drafts until UPLOAD.',activeFields);
}
const SC_KEY={d:'scaleD',t:'scaleT',m:'scaleM'};
function scaleHtml(c,bp,e){
 const bpName=({d:'Desktop',t:'Tablet',m:'Mobile'})[bp],cur=c[SC_KEY[bp]];
 const btn=v=>`<button type="button" class="${cur===v?'pri':''}" data-a="mz13-scale-set" data-v="${v}">${v}x</button>`;
 const mins=Object.values(c.fontSizes).filter(n=>Number.isFinite(n));
 const f=cur!==null?cur:Math.min(1,Math.max(0.55,effG(e,bp,'w')/Math.max(120,Number(c.renderBaseWidths?.d||c.renderBaseWidth)||900)));
 const warn=(!c.readableLimit&&mins.length&&Math.min(...mins)*f<10)?`<p class="hint" style="color:#b3261e">\u26a0 Some text will be smaller than 10px at this scale.</p>`:'';
 return `<fieldset class="mz13-scalebox" style="grid-column:1/-1;border:1px solid #dfe5ef;border-radius:10px;padding:9px;margin:6px 0"><legend><b>Scale</b> \u00b7 ${bpName} \u00b7 ${cur===null?'Automatic':cur+'x'}</legend><p class="hint">Scales ALL internal sizes (font, gap, padding, border, buttons, controls) for ${bpName} only. Automatic follows the real widget width. Draft until UPLOAD.</p><div class="mz13-ops">${[0.9,0.8,0.75,0.6,0.5,0.3].map(btn).join('')}${btn(1)}<button type="button" class="${cur===null?'pri':''}" data-a="mz13-scale-set" data-v="auto">Automatic</button><label style="display:inline-flex;gap:4px;align-items:center">Custom<input type="number" step="0.05" min="0.2" max="1.5" style="width:70px" data-mz13-scale-input value="${cur===null?'':cur}" placeholder="${(Math.round(f*100)/100)}"></label></div>
 <label><input type="checkbox" data-mz13-scale-opt="scaleFitBox" ${c.scaleFitBox?'checked':''}> Scale the widget box height too (no empty space)</label>
 <label><input type="checkbox" data-mz13-scale-opt="readableLimit" ${c.readableLimit?'checked':''}> Readability limit (body \u2265 10px, titles \u2265 12px)</label>
 <label><input type="checkbox" data-mz13-scale-opt="debugBadge" ${c.debugBadge?'checked':''}> Show diagnostic badge in widget (temporary, UPLOAD to apply)</label>${warn}</fieldset>`;
}
function mzApplyScale(v){
 const e=selected();if(!e?.mozaSmartFilter||e.locked)return;
 const bp=['d','t','m'].includes(S.bp)?S.bp:'d',k=SC_KEY[bp];
 const prev=normalize(e.mozaSmartFilter)[k];
 const next=(v==='auto'||v===''||v==null)?null:Math.min(1.5,Math.max(0.2,Number(v)));
 if(next!==null&&!Number.isFinite(next))return;
 const norm=x=>x===null?1:x;
 save(c=>{c[k]=next});
 const fit=normalize(e.mozaSmartFilter).scaleFitBox;
 if(fit&&norm(prev)!==norm(next)){
  const ratio=norm(next)/norm(prev),canvas=(typeof BP!=='undefined'&&BP[bp])||1200;
  const w=Math.min(Math.round(effG(e,bp,'w')),canvas),h=Math.max(80,Math.round(effG(e,bp,'h')*ratio));
  setGeom(e,bp,{w,h});
  if(typeof mz1487RenderInspector==='function')mz1487RenderInspector();
 }
}
function editor(){const e=selected();if(!e?.mozaSmartFilter)return '';const c=normalize(e.mozaSmartFilter);const pageOpts=(S.doc.pages||[]).map(p=>[p.slug,p.name||p.slug]);const secOpts=(S.doc.pages||[]).flatMap(p=>(p.sections||[]).filter(s=>s.kind!=='overlay').map(s=>[s.id,`${p.name||p.slug} → ${s.name||s.id}`]));
 const cfield=(field,label)=>`<label>${label}<input type="color" data-mz13-color="${field}" value="${c.colors[field]}"></label>`;
 const editingBp=['d','t','m'].includes(S.bp)?S.bp:'d';
 const currentSize=key=>(editingBp==='d'?c.fontSizes[key]:c.deviceSizes?.[editingBp]?.[key]??c.fontSizes[key]);
 const sizefield=(key,label)=>`<label>${label}<input type="number" min="8" max="56" data-mz13-size="${key}" value="${currentSize(key)}"></label>`;
 const boxWidth=Math.round(effG(e,editingBp,'w')),boxHeight=Math.round(effG(e,editingBp,'h'));
 const boxControls=`<details open class="mz1485-device"><summary>📱 Device-specific layout · ${esc(({d:'Desktop',t:'Tablet',m:'Mobile'})[editingBp])}</summary><p class="hint">The box size and font sizes below apply to the <b>selected device only</b>. Switch to Tablet or Mobile in the top toolbar before editing. Your other device layouts are preserved.</p><div class="mz13-fields"><label>Widget width (px)<input type="number" id="mz1485-width" min="100" max="1200" value="${boxWidth}"></label><label>Widget height (px)<input type="number" id="mz1485-height" min="120" max="16000" value="${boxHeight}"></label><label>Mobile card max width (px) · 0 = full width<input type="number" data-mz13-key="mobileCardMaxWidth" min="0" max="375" value="${c.mobileCardMaxWidth}"></label></div><div class="mz13-ops"><button type="button" data-a="mz1485-apply-size">Apply size for ${esc(({d:'Desktop',t:'Tablet',m:'Mobile'})[editingBp])}</button>${editingBp==='d'?'':`<button type="button" class="pri" data-a="mz1485-fit-width">Fit widget to ${esc(({t:'Tablet',m:'Mobile'})[editingBp])} width</button>`}</div><p class="hint">Font sizes in Design & Typography and Filter/Search below are also independent for this device. Other colors/content remain shared.</p></details>`;
 const itemRows=c.items.map((it,i)=>`<details class="mz13-item" ${i===0?'open':''}><summary><b>${i+1}. ${esc(it.title)}</b><span>${esc(it.price||it.type)}</span></summary><div class="mz13-fields"><label>Title<input data-mz13-item="${i}" data-field="title" value="${esc(it.title)}" maxlength="150"></label><label>Description<textarea data-mz13-item="${i}" data-field="body" rows="2">${esc(it.body)}</textarea></label><label>Small label<input data-mz13-item="${i}" data-field="label" value="${esc(it.label)}"></label><label>Price / nominal<input data-mz13-item="${i}" data-field="price" value="${esc(it.price)}"></label><label>Categories (comma-separated)<input data-mz13-item="${i}" data-field="category" value="${esc(it.category)}"></label><label>Image URL / asset reference<input data-mz13-item="${i}" data-field="image" value="${esc(it.image)}" placeholder="https://... or upload below"></label><div class="mz14-image-picker"><button type="button" data-a="mz14-image-upload" data-i="${i}">⬆ Upload image</button><label>Choose from Uploads<select data-mz14-image-library="${i}"><option value="">Select an image…</option>${it.image.startsWith('asset:')?`<option value="${esc(it.image.slice(6))}" selected>${esc((S.assets||[]).find(a=>a.id===it.image.slice(6))?.name||'Current image')}</option>`:''}</select></label>${it.image?`<img class="mz14-image-preview" data-mz14-preview-ref="${esc(it.image)}" loading="lazy" alt="Image preview">`:''}</div><label>Link type<select data-mz13-item="${i}" data-field="linkType">${opt([['url','External URL'],['page','Project page'],['section','Project section'],['project','Another Project']],it.linkType)}</select></label>${it.linkType==='url'?`<label>Destination URL<input data-mz13-item="${i}" data-field="link" value="${esc(it.link)}" placeholder="https://..."></label>`:`<label>Destination ${it.linkType}<select data-mz13-item="${i}" data-field="target"><option value="">Select destination…</option>${it.linkType==='project'?((window.mozaCrossProjectChoices&&window.mozaCrossProjectChoices(it.target))||''):opt(it.linkType==='page'?pageOpts:secOpts,it.target)}</select></label>`}${it.linkType==='project'&&it.target?`<label>Destination page<select data-mz13-item="${i}" data-field="targetPage"><option value="">Home / first page</option>${window.mozaCrossProjectPageOptions?.(it.target,it.targetPage||'')||''}</select></label><label>Destination section<select data-mz13-item="${i}" data-field="targetSection"><option value="">Top of page</option>${window.mozaCrossProjectSectionOptions?.(it.target,it.targetPage||'',it.targetSection||'')||''}</select></label>`:''}<label>Button text<input data-mz13-item="${i}" data-field="buttonText" value="${esc(it.buttonText)}"></label></div><div class="mz13-ops"><button data-a="mz13-item-up" data-i="${i}" ${i?'':'disabled'}>↑</button><button data-a="mz13-item-down" data-i="${i}" ${i===c.items.length-1?'disabled':''}>↓</button><button data-a="mz13-item-clone" data-i="${i}" ${c.items.length>=30?'disabled':''}>Duplicate</button><button data-a="mz13-item-delete" data-i="${i}" ${c.items.length<=1?'disabled':''}>Delete</button></div></details>`).join('');
 return `<section class="mz13-editor"><h3>✦ Visual Smart Filter V14</h3><p class="hint">Configure everything first. The widget is not rendered again until you press UPLOAD. Draft edits are autosaved, but Preview and export use the last uploaded version.</p><div class="mz14814-render-controls"><button type="button" class="pri" data-a="mz13-upload-render">⬆ UPLOAD · Render Smart Filter</button><span role="status" class="mz14814-render-status ${e.mozaSmartFilterPending?'is-pending':'is-ready'}">${e.mozaSmartFilterPending?'● Changes not uploaded — Preview shows previous version':'✓ Rendered version up to date'}</span></div>${boxControls}<div class="mz13-ops"><label>Starter template<select id="mz14-template-select">${opt(Object.entries(templateNames).map(([k,n])=>[k,n]),c.preset)}</select></label><button type="button" data-a="mz14-template-apply" class="pri">Apply template & sample cards</button></div><p class="hint">Applying a template replaces this widget's cards (Undo available). Upload images for each card below; buttons appear even before links are set.</p><details open><summary>🎨 Design & Typography</summary><div class="mz13-fields"><label>Template<select data-mz13-key="preset">${opt(Object.entries(templateNames).map(([k,v])=>[k,v]),c.preset)}</select></label><label>Font family<select data-mz13-key="font">${opt([...new Set([...fontChoices(),c.font])].map(f=>[f,f==='The Seasons'?'The Seasons (upload licensed font)':f]),c.font)}</select></label>${sizefield('title','Title size (px)')}${sizefield('body','Description size (px)')}${sizefield('price','Price size (px)')}${sizefield('button','Card button size (px)')}${c.font==='The Seasons'&&!fontResources(c.font).installed?'<p class="mz13-font-note">The Seasons requires your licensed font file. Upload it in Fonts → Upload Font first, then return to this widget. Until then a serif fallback is shown.</p>':''}${Object.entries({accent:'Accent / active category',paper:'Widget background',card:'Card background',text:'Title text',muted:'Description',price:'Price',border:'Card border',button:'Button background',buttonText:'Button text',categoryBg:'Inactive category'}).map(([k,v])=>cfield(k,v)).join('')}<label>Card radius<input type="number" min="0" max="42" data-mz13-key="radius" value="${c.radius}"></label><label>Card spacing<input type="number" min="0" max="50" data-mz13-key="gap" value="${c.gap}"></label><label>Image aspect ratio<select data-mz13-key="imageRatio">${opt([['3/4','Portrait 3:4'],['4/3','Landscape 4:3'],['1/1','Square'],['16/9','Wide 16:9']],c.imageRatio)}</select></label></div></details><details><summary>▤ Categories (${c.categories.length})</summary><p class="hint">Add or rename categories. Each card can have multiple comma-separated categories.</p>${c.categories.map((v,i)=>`<div class="mz13-cat-row"><input aria-label="Kategori ${i+1}" data-mz13-category="${i}" value="${esc(v)}"><button data-a="mz13-category-del" data-i="${i}" ${c.categories.length<=1?'disabled':''}>×</button></div>`).join('')}<button data-a="mz13-category-add">＋ Add category</button></details><details open><summary>⌕ Filter, Search & Sorting — Font / Layout</summary><p class="hint">Each part has its own font and size. Uploaded fonts from Fonts → Upload Font are available here too. The card category label stays independent from the filter buttons above.</p><div class="mz13-fields">
${scaleHtml(c,editingBp,e)}${lsGroupsHtml(c,editingBp,currentSize)}${[['search','Search field'],['sort','Sorting dropdown'],['summary','Result count']].map(([k,label])=>`<label>${label} · Font<select data-mz13-fontrole="${k}">${opt([...new Set([...fontChoices(),c.fontFamilies[k]])].map(f=>[f,f]),c.fontFamilies[k])}</select></label><label>${label} · Size (px)<input type="number" min="8" max="48" data-mz13-size="${k}" value="${currentSize(k)}"></label>`).join('')}
${[...new Set(Object.values(c.fontFamilies))].filter(f=>!fontResources(f).installed).length?`<p class="mz13-font-note">Custom fonts selected here need to be uploaded in Fonts → Upload Font. Missing font(s): ${esc([...new Set(Object.values(c.fontFamilies))].filter(f=>!fontResources(f).installed).join(', '))}. You can select any other font you uploaded.</p>`:''}<label>Filter / search arrangement<select data-mz13-key="filterLayout">${opt([['inline','Same row — filter left, search right'],['search-below','Categories above, search below'],['filters-below','Search above, categories below'],['stacked','Stack all controls vertically']],c.filterLayout)}</select></label><label>Category buttons alignment<select data-mz13-key="filterAlignment">${opt([['start','Left'],['center','Center'],['end','Right']],c.filterAlignment)}</select></label><label>Search width (px)<input type="number" min="120" max="600" data-mz13-key="searchWidth" value="${c.searchWidth}"></label><label>Sort width (px)<input type="number" min="100" max="400" data-mz13-key="sortWidth" value="${c.sortWidth}"></label><label>Controls height (px)<input type="number" min="28" max="80" data-mz13-key="controlHeight" value="${c.controlHeight}"></label><label>Category button padding (px)<input type="number" min="0" max="24" data-mz13-key="filterPadding" value="${c.filterPadding}"></label><label>Category corner radius (px)<input type="number" min="0" max="40" data-mz13-key="filterCorner" value="${c.filterCorner}"></label><label>Filter/search spacing (px)<input type="number" min="0" max="32" data-mz13-key="filterGap" value="${c.filterGap}"></label>
</div></details><details><summary>▦ Layout & Filter</summary><div class="mz13-fields"><label>First Look · Default card order<select data-mz13-key="sortDefault">${opt(Object.entries(c.sortLabels).map(([k,v])=>[k,v]),c.sortDefault)}</select></label><label>Desktop columns<input type="number" min="1" max="4" data-mz13-key="columns" value="${c.columns}"></label><label>Tablet columns<input type="number" min="1" max="4" data-mz13-key="columnsTablet" value="${c.columnsTablet}"></label><label>Mobile columns<input type="number" min="1" max="2" data-mz13-key="columnsMobile" value="${c.columnsMobile}"></label>${[['showImages','Show images'],['showSearch','Search'],['showSorting','Sorting'],['pagination','Pagination'],['showCategoryCounts','Category counts']].map(([key,label])=>`<label class="mz13-check"><input type="checkbox" data-mz13-key="${key}" ${c[key]?'checked':''}>${label}</label>`).join('')}</div><label class="mz13-check"><input type="checkbox" data-mz13-key="showResultsCount" ${c.showResultsCount?'checked':''}>Show result count</label></details><details><summary>✎ Custom Labels & Language</summary><p class="hint">Edit every label; {count}, {page} and {pages} are automatic placeholders.</p><div class="mz13-fields"><label>All categories<input data-mz13-key="allLabel" value="${esc(c.allLabel)}"></label><label>Search placeholder<input data-mz13-key="searchPlaceholder" value="${esc(c.searchPlaceholder)}"></label>${Object.entries(labelDefaults).map(([k])=>`<label>${esc(k.replace(/([A-Z])/g,' $1'))}<input data-mz14-label="${k}" value="${esc(c.uiLabels[k])}" maxlength="180"></label>`).join('')}${Object.entries(c.sortLabels).map(([k,v])=>`<label>Sort · ${esc(k)}<input data-mz14-sort="${esc(k)}" value="${esc(v)}" maxlength="70"></label>`).join('')}</div></details><div class="mz13-ops"><button type="button" data-a="mz14-fit-widget">↔ Fit selected widget</button><button type="button" data-a="mz14-responsive-check">⌕ Responsive audit</button></div><h4>Contents (${c.items.length}/30)</h4><button data-a="mz13-item-add" ${c.items.length>=30?'disabled':''}>＋ Add card</button>${itemRows}</section>`;
}
// Populate the current card's large image and Uploads list only on demand.
function mz1487ImagePreview(card){
 if(!card?.open)return;
 const img=card.querySelector('img[data-mz14-preview-ref]');
 if(img&&!img.getAttribute('src')){
  const source=imageSource(img.dataset.mz14PreviewRef||'');if(source)img.src=source;
 }
}
document.addEventListener('toggle',event=>{
 const card=event.target;
 if(!card?.matches?.('.mz13-item'))return;
 if(card.open)mz1487ImagePreview(card);
 else {const img=card.querySelector('img[data-mz14-preview-ref]');if(img)img.removeAttribute('src')}
},true);
document.addEventListener('focusin',event=>{
 const sel=event.target;if(!sel?.matches?.('select[data-mz14-image-library]')||sel.dataset.mz1487Loaded)return;
 sel.dataset.mz1487Loaded='1';
 const current=sel.value,items=(S.assets||[]).filter(a=>/^data:image\/(?:png|jpeg|webp|gif);base64,/.test(a?.data||''));
 const frag=document.createDocumentFragment();
 for(const asset of items){if(asset.id===current)continue;const op=document.createElement('option');op.value=asset.id;op.textContent=asset.name||'Image';frag.appendChild(op)}
 sel.appendChild(frag);
},true);
// Use the V14 Visual inspector as the single editing surface. The legacy V8
// editor may still be injected by older cached scripts; replace that copy in
// its original position rather than stacking two heavy inspectors.
const originalRenderRight=renderRight;renderRight=function(...a){
 const out=originalRenderRight.apply(this,a);
 const panel=document.querySelector('#right');
 if(!panel)return out;
 panel.querySelectorAll('.mz13-editor').forEach(el=>el.remove());
 const view=editor();
 if(view){
  const legacy=panel.querySelector('.mz6-editor');
  if(legacy){legacy.insertAdjacentHTML('beforebegin',view);legacy.remove();}
  else panel.insertAdjacentHTML('beforeend',view);
  // Also handle cached/third-party wrappers that inserted an extra old panel.
  panel.querySelectorAll('.mz6-editor').forEach(el=>el.remove());
  const open=panel.querySelector('.mz13-item[open]');
  if(open)requestAnimationFrame(()=>{if(open.isConnected)mz1487ImagePreview(open)});
 }
 return out;
};
const originalRenderLeft=renderLeft;renderLeft=function(...a){const out=originalRenderLeft.apply(this,a);const left=document.querySelector('#left');if(left&&S.tab==='elements'&&!left.querySelector('[data-a="mz13-catalog-insert"]')){const b=document.createElement('button');b.type='button';b.className='btn sm mz13-launch';b.dataset.a='mz13-catalog-insert';b.textContent='✦ Katalog Wedding — Visual Smart Filter';left.querySelector('.mz6-library')?.appendChild(b)}return out};
function insertCatalog(){if(!isReady())return;const cfg=normalize({...baseDefaults(),preset:'catalog',items:catalogItems,categories:['Wedding Website','Invitation','Portfolio'],allLabel:'All',searchPlaceholder:'Search designs...',sortLabels:null,columns:3,columnsTablet:2,columnsMobile:1,showImages:true,showSorting:true,showSearch:true,imageRatio:'3/4'});const el=newEl('embed',{name:'Visual Smart Filter · Katalog Wedding',w:900,h:740,embedKind:'widget',embedLive:true,embedCode:widget(cfg),mozaSmartFilter:cfg});addEl(el,selSecId());if(typeof window.MozaV14Responsive?.fitSelected==='function')window.MozaV14Responsive.fitSelected({silent:true});toast('Catalog added — upload images and edit cards in Properties.');}
ACT['mz13-catalog-insert']=insertCatalog;
// Generate exactly once on explicit UPLOAD. No network upload or project switch.
let mz1416Busy=false;
ACT['mz13-upload-render']=async()=>{
 const el0=selected();if(!el0?.mozaSmartFilter||el0.locked||mz1416Busy)return;
 mz1416Busy=true;const id=el0.id;
 const btn=document.querySelector('[data-a="mz13-upload-render"]');
 if(btn){btn.disabled=true;btn.dataset.label=btn.textContent;btn.textContent='⏳ Memproses…'}
 try{
  const cfg=normalize(el0.mozaSmartFilter);
  // Downscale each distinct card image once (async, yields to the UI between images).
  const refs=[...new Set(cfg.items.map(it=>it.image).filter(v=>/^asset:[a-zA-Z0-9_-]+$/.test(String(v||''))))];
  for(const v of refs){const a=S.assets?.find(x=>x.id===v.slice(6));if(a)await mzMakeThumb(a)}
  const el=findEl(id)?.el;if(!el?.mozaSmartFilter)return;
  cfg.renderBaseWidth=Math.max(120,Math.round(Number(el.w)||900));
  // Mirror Transfer Sync's effective geometry at each breakpoint. A phone uses
  // its mobile design baseline, not its 900px desktop frame (illegible 8px text).
  if(typeof BP!=='undefined'){for(const b of ['t','m']){const w=effG(el,b,'w');if(BP[b]&&w>BP[b])setGeom(el,b,{w:BP[b]})}}
  cfg.renderBaseWidths={d:cfg.renderBaseWidth,t:Math.max(120,Math.round(effG(el,'t','w'))),m:Math.max(120,Math.round(effG(el,'m','w')))};
  const html=widget(cfg); // Build first; leave the last valid render intact if it fails.
  commit(discrete());
  el.mozaSmartFilter=cfg;el.embedCode=html;el.embedKind='widget';el.embedLive=true;
  delete el.mozaSmartFilterPending;
  mz1487RefreshSelected(el.id);
  if(selected()?.id===id)mz1487RenderInspector();
  scheduleSave();
  toast('Smart Filter rendered ('+Math.round(html.length/1024).toLocaleString()+' KB). Preview and exported project use this version.');
 }catch(err){console.error('[Moza Smart Filter Upload]',err);toast('UPLOAD failed: '+(err?.message||err));}
 finally{mz1416Busy=false;const b=document.querySelector('[data-a="mz13-upload-render"]');if(b&&b.disabled){b.disabled=false;if(b.dataset.label)b.textContent=b.dataset.label}}
};
ACT['mz13-scale-set']=b=>mzApplyScale(b.dataset.v);
ACT['mz13-ls-reset']=b=>{const g=b.dataset.g,bp=['d','t','m'].includes(S.bp)?S.bp:'d';if(!['card','filter'].includes(g))return;save(c=>{c.labelStyles[g][bp]={};if(bp==='d')c.fontFamilies[g==='card'?'cardCategory':'filterCategory']=c.font;else if(c.deviceSizes?.[bp])delete c.deviceSizes[bp][g==='card'?'cardCategory':'filterCategory']})};
ACT['mz14-template-apply']=()=>{const v=document.getElementById('mz14-template-select')?.value||'catalog';if(!Object.hasOwn(templateNames,v))return;if(!confirm('Replace the current cards with sample content from '+templateNames[v]+'? You can Undo this change.'))return;save(c=>{c.preset=v;c.colors={...(presetColors[v]||presetColors.elegant)};c.imageRatio=['gallery','portfolio'].includes(v)?'4/3':v==='events'?'16/9':'3/4';c.columns=['gallery','portfolio'].includes(v)?3:2;c.columnsTablet=2;c.columnsMobile=1;c.items=sampleFor(v).length?sampleFor(v):catalogItems.map(x=>({...x}));c.categories=[...new Set(c.items.map(x=>x.category))];c.showSearch=true;c.showSorting=true;});};
ACT['mz14-image-upload']=b=>{const id=selected()?.id,index=Number(b.dataset.i);if(!id||!Number.isInteger(index))return;let input=document.getElementById('mz14-card-image-file');if(!input){input=document.createElement('input');input.id='mz14-card-image-file';input.type='file';input.accept='image/jpeg,image/png,image/webp';input.hidden=true;document.body.appendChild(input)}input.value='';input.onchange=async()=>{const f=input.files?.[0];input.value='';if(!f)return;if(!/^image\/(jpeg|png|webp)$/.test(f.type)||f.size>12*1024*1024){toast('Choose a JPG, PNG, or WebP under 12 MB.');return;}try{if(selected()?.id!==id)return toast('Selection changed; choose the card again.');const list=await processImages([f]);if(!list.length)return;if(selected()?.id!==id)return toast('Image saved to Uploads. Re-select this widget to attach it.');save(c=>{if(c.items[index])c.items[index].image='asset:'+list[0].id});toast('Card image saved to Uploads.');}catch(err){toast(err.message||'Image upload failed')}};input.click()};
ACT['mz13-catalog-preset']=()=>save(c=>{c.preset='catalog';c.colors={...presetColors.catalog};c.font='Arial';c.radius=16;c.imageRatio='3/4';c.columns=3;c.columnsMobile=1;c.items=JSON.parse(JSON.stringify(catalogItems));c.categories=['Wedding Website','Invitation','Portfolio'];});
ACT['mz13-item-add']=()=>save(c=>{if(c.items.length<30)c.items.push({type:'card',category:c.categories[0]||'General',title:'New card',body:'Description konten',label:'',price:'',buttonText:'Full details ↗',image:'',link:'',linkType:'url',target:'',date:'',popularity:0,customOrder:c.items.length})});
ACT['mz13-item-delete']=b=>save(c=>{if(c.items.length>1)c.items.splice(+b.dataset.i,1)});
ACT['mz13-item-clone']=b=>save(c=>{if(c.items.length<30)c.items.splice(+b.dataset.i+1,0,{...c.items[+b.dataset.i],title:c.items[+b.dataset.i].title+' (copy)'})});
ACT['mz13-item-up']=b=>save(c=>{const i=+b.dataset.i;if(i>0)[c.items[i-1],c.items[i]]=[c.items[i],c.items[i-1]]});
ACT['mz13-item-down']=b=>save(c=>{const i=+b.dataset.i;if(i<c.items.length-1)[c.items[i+1],c.items[i]]=[c.items[i],c.items[i+1]]});
ACT['mz13-category-add']=()=>save(c=>{if(c.categories.length<35)c.categories.push('Kategori '+(c.categories.length+1))});
ACT['mz13-category-del']=b=>save(c=>{const i=+b.dataset.i;if(c.categories.length>1){const gone=c.categories.splice(i,1)[0];c.items.forEach(it=>{it.category=it.category.split(',').map(x=>x.trim()).filter(x=>x.toLowerCase()!==gone.toLowerCase()).join(', ')||c.categories[0]})}});
// Fit and size only this breakpoint's widget geometry; never retransfer the
// source device or change linked Desktop/Tablet/Mobile styles unexpectedly.
function mz1485Resize(fit){
 const el=selected();if(!el?.mozaSmartFilter||el.locked)return;
 const bp=S.bp,widthInput=document.getElementById('mz1485-width'),heightInput=document.getElementById('mz1485-height');
 const max=BP[bp]||1200;
 const width=fit?max-16:Math.min(max,Math.max(100,Number(widthInput?.value)||effG(el,bp,'w')));
 const height=Math.max(120,Math.min(16000,Number(heightInput?.value)||effG(el,bp,'h')));
 const patch={w:Math.round(width),h:Math.round(height)};
 if(fit)patch.x=8;
 commit(discrete());setGeom(el,bp,patch);afterEdit();scheduleSave();
 toast((fit?'Fit width':'Widget size')+' saved for '+(BPN[bp]||bp)+' only');
}
ACT['mz1485-fit-width']=()=>mz1485Resize(true);
ACT['mz1485-apply-size']=()=>mz1485Resize(false);

document.addEventListener('change',e=>{const t=e.target;const key=t.dataset.mz13Key,color=t.dataset.mz13Color,size=t.dataset.mz13Size,fontRole=t.dataset.mz13Fontrole,item=t.dataset.mz13Item,cat=t.dataset.mz13Category;if(key)save(c=>{c[key]=t.type==='checkbox'?t.checked:t.type==='number'?Number(t.value):t.value;if(key==='preset'&&presetColors[t.value])c.colors={...presetColors[t.value]}});else if(color)save(c=>{c.colors[color]=t.value});else if(size)save(c=>{const bp=['d','t','m'].includes(S.bp)?S.bp:'d';const num=bounded(t.value,8,56,c.fontSizes[size]);if(bp==='d')c.fontSizes[size]=num;else{c.deviceSizes=c.deviceSizes||{t:{},m:{}};c.deviceSizes[bp]=c.deviceSizes[bp]||{};c.deviceSizes[bp][size]=num;}});else if(t.hasAttribute('data-mz13-scale-input')){mzApplyScale(t.value);return}else if(t.dataset.mz13ScaleOpt){const ok=t.dataset.mz13ScaleOpt,val=t.checked;save(c=>{c[ok]=val});return}else if(t.dataset.mz13Ls)save(c=>{const g=t.dataset.mz13Ls,k=t.dataset.mz13Lk,bp=['d','t','m'].includes(S.bp)?S.bp:'d';if(!c.labelStyles[g]||!k)return;const o=c.labelStyles[g][bp];const v=t.value;if(k==='ff'&&bp==='d'){c.fontFamilies[g==='card'?'cardCategory':'filterCategory']=v;delete o.ff}else if(v===''||v==null)delete o[k];else o[k]=v});else if(fontRole)save(c=>{c.fontFamilies[fontRole]=t.value});else if(item!==undefined)save(c=>{const x=c.items[Number(item)];if(x){x[t.dataset.field]=t.value;if(t.dataset.field==='target'||t.dataset.field==='linkType'){x.targetPage='';x.targetSection='';}if(t.dataset.field==='targetPage')x.targetSection='';}});else if(t.dataset.mz14Label)save(c=>{c.uiLabels[t.dataset.mz14Label]=t.value});else if(t.dataset.mz14Sort)save(c=>{c.sortLabels[t.dataset.mz14Sort]=t.value});else if(t.dataset.mz14ImageLibrary!==undefined){if(t.value)save(c=>{if(c.items[Number(t.dataset.mz14ImageLibrary)])c.items[Number(t.dataset.mz14ImageLibrary)].image='asset:'+t.value})}else if(cat!==undefined)save(c=>{const old=c.categories[Number(cat)],v=String(t.value).trim().slice(0,70);if(!v)return;c.categories[Number(cat)]=v;c.items.forEach(it=>{it.category=it.category.split(',').map(x=>x.trim()===old?v:x.trim()).join(', ')})})});
// Prevent the original V8 inspector from competing with the clearer V13 editor.
const style=document.createElement('style');style.textContent='.mz6-editor{display:none!important}.mz13-editor{padding:12px;border:1px solid #dfe5ef;border-radius:14px;margin:12px 0;background:#fcfdff;color:#243249;font-size:12px}.mz13-editor h3{font-size:15px;margin:2px 0 8px}.mz14814-render-controls{display:flex;align-items:center;flex-wrap:wrap;gap:9px;background:#edf3fc;border:1px solid #d2dff6;border-radius:10px;padding:10px;margin:9px 0}.mz14814-render-controls button{font-weight:700;min-height:38px}.mz14814-render-status{font-size:11px;color:#387058}.mz14814-render-status.is-pending{color:#925824}.mz13-editor h4{margin:15px 0 6px}.mz13-editor details{margin:10px 0;border:1px solid #e1e6f3;border-radius:9px;background:white;padding:9px}.mz13-editor summary{cursor:pointer;font-weight:700}.mz13-fields{display:grid;gap:8px;margin-top:10px;grid-template-columns:repeat(2,minmax(0,1fr))}.mz13-fields label{font-size:11px;display:flex;flex-direction:column;gap:5px}.mz13-editor input,.mz13-editor select,.mz13-editor textarea{width:100%;min-width:0;padding:7px;border:1px solid #d8deea;border-radius:7px;background:white;color:#26334a;font:12px system-ui;box-sizing:border-box}.mz13-editor input[type=color]{height:34px;padding:2px;cursor:pointer}.mz13-editor button{background:#fff;border:1px solid #d6ddea;color:#30406b;border-radius:8px;padding:7px 10px;cursor:pointer}.mz13-editor button.pri{background:#3c5ae0;color:white}.mz13-editor button:disabled{opacity:.4}.mz13-font-note{grid-column:1/-1;color:#815528;background:#fff8e8;border:1px solid #f4deac;border-radius:8px;padding:10px;margin:0}.mz13-editor .mz13-item{padding:10px;margin:8px 0}.mz13-editor .mz13-item summary{display:flex;justify-content:space-between;gap:5px}.mz13-editor .mz13-item summary span{font-weight:400;color:#737c91}.mz13-ops,.mz13-cat-row{display:flex;gap:6px;flex-wrap:wrap;margin:9px 0}.mz13-cat-row input{flex:1}.mz13-check{display:flex!important;flex-direction:row!important;align-items:center}.mz13-check input{width:auto}.mz13-launch{width:100%;margin-top:8px!important;white-space:normal}.mz14-image-picker{grid-column:1/-1;border:1px dashed #cad5eb;padding:8px;border-radius:9px;display:flex;align-items:center;gap:8px;flex-wrap:wrap}.mz14-image-picker label{flex:1 1 140px}.mz14-image-picker select{min-width:130px}.mz14-image-preview{max-width:130px;max-height:105px;object-fit:contain;border-radius:8px}@media(max-width:550px){.mz13-fields{grid-template-columns:1fr}}';document.head.appendChild(style);
// Internal navigation is restricted to actual published pages / sections and to our own sandboxed widget frames.
const origSite=siteHTML;siteHTML=function(...args){let html=origSite.apply(this,args);if(!String(html).includes('mz13-root'))return html;const bridge=`<script>(function(){window.addEventListener('message',function(e){if(!e.data||e.data.type!=='moza:visual-filter:navigate')return;var fr=Array.from(document.querySelectorAll('iframe.a319-safe-iframe')).find(f=>f.contentWindow===e.source);if(!fr||!fr.closest('.el'))return;var target=String(e.data.target||'');var kind=e.data.kind;var hash='';if(kind==='page'){var pg=Array.from(document.querySelectorAll('.pg[data-slug]')).find(p=>p.dataset.slug===target);if(pg)hash='#/'+pg.dataset.slug}else if(kind==='section'){var sec=document.getElementById('s-'+target);var pg=sec?.closest('.pg[data-slug]');if(pg)hash='#/'+pg.dataset.slug+'/'+target}if(hash)location.hash=hash;});})();<\/script>`;return html.replace('</body>',bridge+'</body>')};
window.MozaVisualFilter={version:'14.8.22',normalize,buildWidget:widget,insertCatalog,templateNames};
try{if(isReady()){renderLeft();renderRight()}}catch(e){console.warn('[Moza V13 Visual Filter]',e)}
})();
