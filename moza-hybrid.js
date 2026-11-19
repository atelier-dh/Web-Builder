/* Moza Hybrid v0.1 — progressive enhancement: do not modify Atelier auth/storage. */
(function(){
  'use strict';
  const state={engine:'JavaScript fallback',loaded:false,error:null};
  let wasm=null;
  const safe=(n)=>typeof n==='number'&&Number.isFinite(n);
  const jsSnap=(v,grid)=>Math.round(v/grid)*grid;
  const jsAlign=(mode,span,size)=>mode===0?0:mode===1?(span-size)/2:span-size;
  const which={l:[0,'x'],c:[1,'x'],r:[2,'x'],t:[0,'y'],m:[1,'y'],b:[2,'y']};
  const api={
    status:()=>({...state}),
    snap:(value,grid=8)=>{
      if(!safe(value)||!safe(grid)||grid<=0)return value;
      if(wasm)try{const n=wasm.snap_grid(value,grid);if(safe(n))return n}catch(e){state.error=String(e)}
      return jsSnap(value,grid);
    },
    alignBox:(kind,W,H,w,h)=>{
      const spec=which[kind];if(!spec)return null;
      const [mode,axis]=spec,span=axis==='x'?W:H,size=axis==='x'?w:h;
      if(!safe(span)||!safe(size))return null;
      let n=jsAlign(mode,span,size);
      if(wasm)try{const computed=wasm.align_coordinate(mode,span,size);if(safe(computed))n=computed}catch(e){state.error=String(e)}
      return {[axis]:n};
    }
  };
  window.MozaHybrid=api;
  const script=document.currentScript;
  const uri=new URL('./assets/moza_geometry.wasm', script?.src||location.href);
  fetch(uri).then(async response=>{
    if(!response.ok)throw Error('Rust WASM belum dibuild (HTTP '+response.status+')');
    const bytes=await response.arrayBuffer();
    const result=await WebAssembly.instantiate(bytes,{});
    const exports=result.instance.exports;
    if(typeof exports.snap_grid!=='function'||typeof exports.align_coordinate!=='function')throw Error('Export WASM tidak cocok');
    wasm=exports;state.engine='Rust / WebAssembly';state.loaded=true;state.error=null;
    console.info('[Moza Hybrid] Rust WASM aktif');
  }).catch(e=>{state.error=String(e.message||e);console.info('[Moza Hybrid] Mode JS fallback; build Rust jika diperlukan.');});
})();
