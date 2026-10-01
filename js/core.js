'use strict';
/* Shared constants, helpers and the renderer. Plan units are cm (x right, z down / south); heights are metres. */
const H1=2.7, H2=5.2, CUT=1.15;
const cm=v=>v/100;
const lin=c=>new THREE.Color(c).convertSRGBToLinear();
let seed=11; const rnd=()=>{seed=(seed*16807)%2147483647;return seed/2147483647;};
function seeded(n){let s=(Math.abs(n)%2147483646)+1;return()=>{s=(s*16807)%2147483647;return s/2147483647;};}
function hashStr(t){let h=7;for(const ch of String(t))h=(h*31+ch.charCodeAt(0))%2147483647;return h;}
// amt > 0 mixes toward white, amt < 0 toward black
function shade(hex,amt){
  const c=new THREE.Color(hex),t=amt>0?1:0,a=Math.min(1,Math.abs(amt));
  c.r+=(t-c.r)*a;c.g+=(t-c.g)*a;c.b+=(t-c.b)*a;
  return '#'+c.getHexString();
}
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

/* ---------- renderer ---------- */
const stage=document.getElementById('stage');
const renderer=new THREE.WebGLRenderer({antialias:true});
renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,2));
renderer.outputEncoding=THREE.sRGBEncoding;
renderer.toneMapping=THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure=1.05;
renderer.shadowMap.enabled=true;
renderer.shadowMap.type=THREE.PCFSoftShadowMap;
stage.insertBefore(renderer.domElement,stage.firstChild);
const canvas=renderer.domElement;
const scene=new THREE.Scene();
scene.background=lin('#dfe8ee');
scene.fog=new THREE.Fog(lin('#e4ebef'),30,80);
const camera=new THREE.PerspectiveCamera(68,1,0.05,200);
camera.rotation.order='YXZ';

/* ---------- materials ---------- */
const M=(c,o)=>new THREE.MeshStandardMaterial(Object.assign({color:lin(c),roughness:.85},o||{}));
const MAT_CACHE=new Map();
// shared, never disposed: furniture rebuilds reuse these by colour
function MC(c,rough,extra){
  rough=rough==null?.85:rough;
  const k=c+'|'+rough+'|'+(extra?JSON.stringify(extra):'');
  let m=MAT_CACHE.get(k);
  if(!m){m=M(c,Object.assign({roughness:rough},extra||{}));MAT_CACHE.set(k,m);}
  return m;
}
const wallMat=M('#f3f2ef',{roughness:.95});
const darkMat=M('#2c2f33',{roughness:.55});
const doorMat=M('#3a3532',{roughness:.6});
const glassMat=new THREE.MeshStandardMaterial({color:lin('#d3e5ec'),transparent:true,opacity:.14,roughness:.05,depthWrite:false});
const railGlass=new THREE.MeshStandardMaterial({color:lin('#d3e5ec'),transparent:true,opacity:.22,roughness:.05,depthWrite:false});
const slabMat=M('#f6f5f2',{roughness:.95});
const entryMat=M('#86898c',{roughness:.6});
const cabMat=M('#cdc9c1',{roughness:.65});
const counterMat=M('#edece8',{roughness:.35});
const whiteMat=M('#f7f7f5',{roughness:.4});
const glowMat=new THREE.MeshBasicMaterial({color:lin('#fff3da')});
const oakMat=M('#c4a47c',{roughness:.7});
const metalMat=M('#303236',{roughness:.45,metalness:.3});
const screenMat=M('#14171b',{roughness:.25});
