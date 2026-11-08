from pathlib import Path
p=Path('/mnt/data/moza_v14_8_3_work/index.html')
s=p.read_text()
# All of the following are Properties-panel image-pickers, not the canvas, library, published HTML, or project data.
changes={
"S.assets.map(a=>`<div class=\"sw\" style=\"width:46px;height:36px;${a.id===b.asset?": "mzPerfPropertyAssets(S.assets,b.asset).map(a=>`<div class=\"sw\" style=\"width:46px;height:36px;${a.id===b.asset?",
"S.assets.map(a=>`<div class=\"sw\" style=\"width:44px;height:34px;${a.id===el.asset?": "mzPerfPropertyAssets(S.assets,el.asset).map(a=>`<div class=\"sw\" style=\"width:44px;height:34px;${a.id===el.asset?",
"S.assets.map(a=>`<div class=\"sw\" style=\"width:44px;height:34px;${(el.imgs||[]).includes(a.id)?": "mzPerfPropertyAssets(S.assets,el.imgs||[]).map(a=>`<div class=\"sw\" style=\"width:44px;height:34px;${(el.imgs||[]).includes(a.id)?",
"S.assets.map(a=>`<div class=\"sw\" style=\"width:44px;height:34px;${a.id===n.logo.asset?": "mzPerfPropertyAssets(S.assets,n.logo.asset).map(a=>`<div class=\"sw\" style=\"width:44px;height:34px;${a.id===n.logo.asset?",
"S.assets.map(a=>`<div class=\"sw\" style=\"width:44px;height:34px;${a.id===cu.asset?": "mzPerfPropertyAssets(S.assets,cu.asset).map(a=>`<div class=\"sw\" style=\"width:44px;height:34px;${a.id===cu.asset?",
"S.assets.map(a=>`<div class=\"sw\" style=\"width:40px;height:34px;${a.id===m.iconAsset?": "mzPerfPropertyAssets(S.assets,m.iconAsset).map(a=>`<div class=\"sw\" style=\"width:40px;height:34px;${a.id===m.iconAsset?",
"S.assets.map(a=>`<div class=\"sw\" style=\"width:34px;height:34px;${a.id===it.iconImg?": "mzPerfPropertyAssets(S.assets,it.iconImg).map(a=>`<div class=\"sw\" style=\"width:34px;height:34px;${a.id===it.iconImg?",
"S.assets.map(a=>`<div class=\"sw\" style=\"width:38px;height:38px;${a.id===el.poster?": "mzPerfPropertyAssets(S.assets,el.poster).map(a=>`<div class=\"sw\" style=\"width:38px;height:38px;${a.id===el.poster?",
}
for old,new in changes.items():
 ct=s.count(old)
 if ct!=1: raise Exception(f'expected one matching picker got {ct}: {old[:85]}')
 s=s.replace(old,new)
# Helper for heavy properties thumbnail listings: never remove the existing chosen images.
anchor='/* ---------- render everything ---------- */'
helper='''/* Moza V14.8.3 — bounded thumbnail rendering in editor Properties (no saved-data mutation). */
function mzPerfPropertyAssets(list, selected){
 const perf=window.MozaTouchPerformance;
 if(!perf||!perf.enabled())return list;
 const cap=Math.max(24,Number(S._mzPerfPropertiesLimit)||24);
 if(list.length<=cap)return list;
 const out=list.slice(0,cap), seen=new Set(out.map(a=>a.id));
 const ids=Array.isArray(selected)?selected:[selected];
 for(const id of ids){
  if(!id||seen.has(id))continue;
  const item=list.find(a=>a.id===id);
  if(item){out.push(item);seen.add(id)}
 }
 return out;
}
'''
assert s.count(anchor)==1
s=s.replace(anchor,helper+anchor)
# Editor only external bundle (deliberately not in site export)
end='<script src="./moza-inspector-stability.js"></script>'
assert s.count(end)==1
s=s.replace(end,end+'\n<link rel="stylesheet" href="./moza-v14.8.3-performance.css">\n<script src="./moza-v14.8.3-performance.js"></script>')
p.write_text(s)
print('Updated index: 8 pickers, helper, 2 resource refs.')
