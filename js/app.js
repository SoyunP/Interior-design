'use strict';
/* State, interaction, plan view, panels and persistence. */

/* ---------- state ---------- */
const DEFAULT_FINISH=()=>({
  walls:{living:'marble',common:'#f3f2ef',bed:'#d8ceb0',office:'#cfc6b8',loft:'#f3f2ef'},
  paper:{living:false,common:false,bed:false,office:true,loft:false},
  floors:{living:'marble',common:'marble',bed:'smokeOak',office:'smokeOak',loft:'oak'},
  tv:'marble',mood:'day',ceil:H2,
});
const CEIL_MIN=4.8,CEIL_MAX=6.5;
const DEFAULT_ITEMS=[
  {id:'bed',type:'bed',label:'킹 침대',cx:95,cz:110,rot:0,size:160},
  {id:'ns',type:'nightstand',label:'협탁',cx:212,cz:25,rot:0},
  {id:'deskA',type:'desk',label:'데스크 A',cx:225,cz:675,rot:180,h:74},
  {id:'deskB',type:'desk',label:'데스크 B',cx:42,cz:495,rot:90,h:110},
  {id:'builtin',type:'builtIn',label:'붙박이장',cx:120,cz:340,rot:0,width:240},
  {id:'sofa',type:'sofa',label:'소파',cx:692,cz:602,rot:270,L:215,C:0,D:95,side:1},
  {id:'tv',type:'tv',label:'TV장',cx:348,cz:600,rot:90,w:'#8b7155'},
  {id:'coffee',type:'coffee',label:'커피 테이블',cx:555,cz:600,rot:90},
  {id:'rug',type:'rug',label:'러그',cx:540,cz:600,rot:90},
  {id:'plant',type:'plant',label:'화분',cx:605,cz:690,rot:0,size:'m'},
  // four counter stools tucked under the island, seats in the recess and backs just past the worktop edge
  ...[0,1,2,3].map(i=>({id:'barStool'+(i+1),type:'barStool',label:i?`아일랜드 의자 ${i+1}`:'아일랜드 의자',
    cx:ISLAND_RECESS.x1+(ISLAND_RECESS.x2-ISLAND_RECESS.x1)*(2*i+1)/8,cz:ISLAND_RECESS.z2-24,rot:180})),
  {id:'comicShelf',type:'comicShelf',label:'만화책 책장',cx:60,cz:25,rot:0,lv:1},
];
const freshState=()=>({v:13,items:DEFAULT_ITEMS.map(i=>withDefaults(Object.assign({lv:0},i))),finish:DEFAULT_FINISH()});
function normalize(s){
  const f=DEFAULT_FINISH(),g=s.finish||{};
  s.finish={walls:Object.assign(f.walls,g.walls),paper:Object.assign(f.paper,g.paper),floors:Object.assign(f.floors,g.floors),tv:g.tv||f.tv,mood:g.mood||f.mood,
    ceil:Math.min(CEIL_MAX,Math.max(CEIL_MIN,+g.ceil||f.ceil))};
  Object.keys(s.finish.floors).forEach(k=>{if(!FLOORS[s.finish.floors[k]])s.finish.floors[k]=f.floors[k];});
  if(!MOODS[s.finish.mood])s.finish.mood='day';
  const v=s.v||1,fl=s.finish.floors,wl=s.finish.walls;
  if(v<2&&fl.office==='oak')fl.office='smokeOak';
  if(v<3&&fl.bed==='oak')fl.bed='greigeOak';
  if(v<3&&wl.bed==='#f3f2ef')wl.bed='#e9e1cf';
  if(v<4&&wl.office==='#f3f2ef')wl.office='#cfc6b8';
  s.items=(s.items||[]).filter(i=>i&&TYPES[i.type]&&i.id).map(withDefaults);
  if(v<5&&!s.items.some(i=>i.type==='builtIn'))s.items.push(withDefaults(Object.assign({lv:0},DEFAULT_ITEMS.find(i=>i.type==='builtIn'))));
  if(v<7){fl.bed='smokeOak';fl.office='smokeOak';}
  if(v<8)wl.bed='#d8ceb0';
  if(v<9)s.finish.paper.bed=false;
  if(v<10)s.items.forEach(i=>{if(i.type!=='bed')return;if(i.c==='#b8c3c5')i.c='#f5f3ee';if(i.w==='#c4a47c')i.w='#8b5a3c';});
  if(v<12){
    s.items=s.items.filter(i=>i.type!=='barStool');
    DEFAULT_ITEMS.filter(i=>i.type==='barStool').forEach(i=>s.items.push(withDefaults(Object.assign({lv:0},i))));
  }
  if(v<13&&!s.items.some(i=>i.type==='comicShelf'))s.items.push(withDefaults(Object.assign({lv:0},DEFAULT_ITEMS.find(i=>i.type==='comicShelf'))));
  s.v=13;return s;
}
const LS_CUR='duplex-deco:current',LS_SAVES='duplex-deco:saves';
function loadCurrent(){try{const s=JSON.parse(localStorage.getItem(LS_CUR)||'null');if(s&&Array.isArray(s.items))return normalize(s);}catch(e){}return null;}
let S=loadCurrent()||freshState();

let sel=null, mode='orbit', level=0;
const byId=id=>S.items.find(i=>i.id===id);
const firstOf=(type,lv)=>S.items.find(i=>i.type===type&&(lv==null||i.lv===lv));
function newId(type){let n=1;while(byId(type+n))n++;return type+n;}
function newLabel(type){const base=TYPES[type].label,n=S.items.filter(i=>i.type===type).length;return n?`${base} ${n+1}`:base;}

/* ---------- geometry ---------- */
const dims=it=>TYPES[it.type].dims(it);
const SOFA_TYPES=['sofa','pinnacle','cloud','hsCorner'];
const sofaLeg=it=>it.type==='sofa'&&it.C>it.D;
function localRects(it){
  if(sofaLeg(it)){
    const L=it.L,D=it.D,C=it.C,z0=-C/2,s=it.side;
    const lx1=s>0?L/2-D:-L/2,lx2=s>0?L/2:-L/2+D;
    return[[-L/2,z0,L/2,z0+D],[lx1,z0+D,lx2,z0+C]];
  }
  const [w,d]=dims(it);return[[-w/2,-d/2,w/2,d/2]];
}
function rotCS(it){const t=it.rot*Math.PI/180;return[Math.round(Math.cos(t)),Math.round(Math.sin(t))];}
function worldRects(it){
  const [c,s]=rotCS(it);
  return localRects(it).map(([a,b,e,f])=>{
    const pts=[[a,b],[e,b],[a,f],[e,f]].map(([x,z])=>[it.cx+x*c+z*s,it.cz-x*s+z*c]);
    const xs=pts.map(p=>p[0]),zs=pts.map(p=>p[1]);
    return[Math.min(...xs),Math.min(...zs),Math.max(...xs),Math.max(...zs)];
  });
}
const bbox=rs=>[Math.min(...rs.map(r=>r[0])),Math.min(...rs.map(r=>r[1])),Math.max(...rs.map(r=>r[2])),Math.max(...rs.map(r=>r[3]))];function roomOf(r,lv){if(lv===1)return null;const cx=(r[0]+r[2])/2,cz=(r[1]+r[3])/2;return ROOMS.find(R=>cx>=R.x1&&cx<=R.x2&&cz>=R.z1&&cz<=R.z2)||null;}
const overlap=(a,b)=>a[0]<b[2]-1&&a[2]>b[0]+1&&a[1]<b[3]-1&&a[3]>b[1]+1;
const hitsRect=(it,h)=>worldRects(it).some(r=>overlap(r,[h.x1,h.z1,h.x2,h.z2]));
function outsideLoft(it){
  return worldRects(it).some(([a,b,c,d])=>{
    const xs=[a+2,(a+c)/2,c-2],zs=[b+2,(b+d)/2,d-2];
    return xs.some(x=>zs.some(z=>!inLoft(x,z)));
  });
}
const isSoft=it=>!!TYPES[it.type].soft;
// apply a size change while the item's back edge stays where it was
function resizeKeepBack(it,changes){
  const d0=dims(it)[1];Object.assign(it,changes);const d1=dims(it)[1];
  const [c,s]=rotCS(it);it.cx+=-s*(d0-d1)/2;it.cz+=-c*(d0-d1)/2;
}

/* ---------- 3D items ---------- */
const groups={};
// the orbit view trims walls at CUT; fullWalls keeps that for the outer shell but stands the room walls at full height
let fullWalls=false;
const loftShown=()=>mode==='walk'||level===1;
const nearOuter=it=>it.cx<15||it.cx>725||it.cz<15||it.cz>705;
function disposeGroup(g){scene.remove(g);g.traverse(o=>{if(o.geometry)o.geometry.dispose();});}
function syncItem(it,full){
  let g=groups[it.id];
  if(full||!g){
    if(g)disposeGroup(g);
    g=new THREE.Group();TYPES[it.type].build(it,g);
    g.traverse(o=>{o.userData.itemId=it.id;});
    groups[it.id]=g;scene.add(g);
  }
  g.position.set(cm(it.cx),it.lv*H1,cm(it.cz));
  g.rotation.y=it.rot*Math.PI/180;
  fitView(it,g);
}
// in the cut-away view, wall decor follows the cut walls instead of floating above them
function fitView(it,g){
  const cut=mode==='orbit'&&!(fullWalls&&!nearOuter(it));
  g.visible=it.lv===0||loftShown();
  if(it.type==='curtain')g.scale.y=cut?Math.min(1,CUT/curtainH(it)):1;
  if(it.type==='builtIn')g.scale.y=cut?CUT/H1:1;
  if(it.type==='art')g.position.y=it.lv*H1-(cut?.7:0);
}
function removeGroup(id){if(groups[id]){disposeGroup(groups[id]);delete groups[id];}}
function rebuildAll(){Object.keys(groups).forEach(removeGroup);S.items.forEach(it=>syncItem(it,true));}
function updateVis(){S.items.forEach(it=>{const g=groups[it.id];if(g)fitView(it,g);});}

const selLines=new THREE.Group();scene.add(selLines);
const selMat=new THREE.LineBasicMaterial({color:lin('#3f8a63'),depthTest:false,transparent:true});
function updateSelOutline(){
  selLines.children.slice().forEach(c=>{selLines.remove(c);c.geometry.dispose();});
  const it=sel&&byId(sel);if(!it)return;
  worldRects(it).forEach(([a,b,c,d])=>{
    const y=it.lv*H1+.025,p=[[a,b],[c,b],[c,d],[a,d],[a,b]].map(([x,z])=>new THREE.Vector3(cm(x),y,cm(z)));
    const l=new THREE.Line(new THREE.BufferGeometry().setFromPoints(p),selMat);l.renderOrder=10;l.raycast=()=>{};selLines.add(l);
  });
}

/* ---------- finishes ---------- */
const _slat={};
function slatTex(hex){if(!_slat[hex]){const t=slatTexture(hex);t.repeat.set(1/.6,1/2.7);_slat[hex]=t;}return _slat[hex];}
let _paperTex=null;
const paperTex=()=>{if(!_paperTex){_paperTex=wallpaperTexture();_paperTex.repeat.set(1/.6,1/.6);}return _paperTex;};
// a wall finish is a paint colour or 'marble' (the same large tiles as the marble floor);
// paper lays a silk wallpaper texture under the paint colour
function paintWall(mat,v,paper){
  mat.bumpMap=null;
  if(v==='marble'){mat.map=floorTex('marble');mat.color.set(0xffffff);mat.roughness=.3;}
  else if(paper){mat.map=mat.bumpMap=paperTex();mat.bumpScale=.002;mat.color.copy(lin(v));mat.roughness=.9;}
  else{mat.map=null;mat.color.copy(lin(v));mat.roughness=.95;}
  mat.needsUpdate=true;
}
function setFloorMat(mat,k){const o=FLOORS[k]||FLOORS.oak;mat.map=floorTex(k);mat.roughness=o.rough;mat.color.set(0xffffff);mat.needsUpdate=true;}
function applyTv(){
  const k=S.finish.tv;tvMat.bumpMap=null;
  if(k==='marble'){paintWall(tvMat,'marble');return;}
  if(k==='oakSlat'||k==='walnutSlat'){tvMat.map=slatTex(k==='oakSlat'?'#c9a77d':'#6a4c36');tvMat.color.set(0xffffff);tvMat.roughness=.7;}
  else if(k==='charcoal'){tvMat.map=null;tvMat.color.copy(lin('#45474b'));tvMat.roughness=.8;}
  else{paintWall(tvMat,S.finish.walls.living,S.finish.paper.living);return;}
  tvMat.needsUpdate=true;
}
function applyWalls(){
  const f=S.finish;
  ZONES.forEach(z=>paintWall(zoneWallMat[z.id],f.walls[z.id],f.paper[z.id]));
  if(f.tv==='paint')paintWall(tvMat,f.walls.living,f.paper.living);
}
function applyFinish(){
  const f=S.finish;
  applyWalls();
  ZONES.forEach(z=>setFloorMat(zoneFloorMat[z.id],f.floors[z.id]));
  applyCeiling();
  applyTv();setMood(f.mood);
}
function applyCeiling(){
  if(S.finish.ceil===ceilH)return;
  setCeiling(S.finish.ceil);applyCut();
  S.items.forEach(it=>{if(it.type==='curtain'&&it.ht>4)syncItem(it,true);});
}
function setMood(k){
  const m=MOODS[k]||MOODS.day;S.finish.mood=k;
  sun.intensity=m.sun;sun.color.copy(lin(m.sunCol));sun.position.set(...m.sunPos);sun.castShadow=m.sun>0;
  hemi.intensity=m.hemi;hemi.color.copy(lin(m.sky));hemi.groundColor.copy(lin(m.ground));
  amb.intensity=m.amb;amb.color.copy(lin(m.ambCol));
  renderer.toneMappingExposure=m.exp;
  scene.background.copy(lin(m.bg));scene.fog.color.copy(lin(m.fog));
  nightLights.forEach(l=>l.intensity=m.point);
  lampGlow=m.lamp;emissiveMats.forEach(mt=>mt.emissiveIntensity=m.lamp);
  glowMat.color.copy(lin(m.glow));viewMat.color.copy(lin(m.view));groundMat.color.copy(lin(m.out));
  stage.style.background=m.bg;
  document.querySelectorAll('[data-mood]').forEach(b=>b.classList.toggle('on',b.dataset.mood===k));
}

/* ---------- history & persistence ---------- */
const hist=[],fut=[];
const snapshot=()=>JSON.stringify(S);
function commit(pre){hist.push(pre||snapshot());if(hist.length>100)hist.shift();fut.length=0;updUndo();}
function restore(str){
  S=normalize(JSON.parse(str));
  rebuildAll();applyFinish();
  if(sel&&!byId(sel))sel=null;
  refresh(true);renderDeco();
}
function undo(){if(!hist.length)return;fut.push(snapshot());restore(hist.pop());updUndo();}
function redo(){if(!fut.length)return;hist.push(snapshot());restore(fut.pop());updUndo();}
const undoBtn=document.getElementById('undoBtn'),redoBtn=document.getElementById('redoBtn');
function updUndo(){undoBtn.disabled=!hist.length;redoBtn.disabled=!fut.length;}
undoBtn.onclick=undo;redoBtn.onclick=redo;
let saveT=0;const saveState=document.getElementById('saveState');
function save(){
  clearTimeout(saveT);saveState.textContent='저장 중…';
  saveT=setTimeout(()=>{try{localStorage.setItem(LS_CUR,snapshot());saveState.textContent='자동 저장됨';}catch(e){saveState.textContent='저장 실패 (브라우저 저장소)';}},300);
}

/* ---------- camera modes ---------- */
const orbit={theta:.32,phi:.92,r:12.5,target:new THREE.Vector3(3.7,.5,3.6),goal:new THREE.Vector3(3.7,.5,3.6)};
const player={x:403,z:60,y:0,yaw:Math.PI,pitch:-.06};
const VIEWS={
  entry:{x:403,z:60,y:0,look:[403,600]},
  living:{x:400,z:510,y:0,look:[700,650]},
  bed:{x:200,z:282,y:0,look:[80,90]},
  office:{x:265,z:425,y:0,look:[110,640]},
  loft:{x:290,z:262,y:H1,look:[620,560]},
};
function applyCut(){
  const cut=mode==='orbit',cy=CUT+(level===1?H1:0);
  cutList.forEach(({m,y0,y1,outer})=>{
    if(!cut||(fullWalls&&!outer&&(level===1||y0<H1))){m.visible=true;m.scale.y=1;m.position.y=(y0+y1)/2;return;}
    if(y0>=cy){m.visible=false;return;}
    const top=Math.min(y1,cy);m.visible=true;m.scale.y=(top-y0)/(y1-y0);m.position.y=(y0+top)/2;
  });
  loftList.forEach(m=>m.visible=!cut||level===1);
  ceilList.forEach(m=>m.visible=mode!=='orbit');
  updateVis();
}
function setFullWalls(on){
  fullWalls=on;
  document.querySelectorAll('[data-walls]').forEach(b=>b.classList.toggle('on',+b.dataset.walls===+on));
  applyCut();
}
const hintEl=document.getElementById('hint');
function setMode(m){
  mode=m;
  document.getElementById('mOrbit').classList.toggle('on',m==='orbit');
  document.getElementById('mWalk').classList.toggle('on',m==='walk');
  document.getElementById('pad').hidden=m!=='walk';
  document.getElementById('levelSeg3d').hidden=m!=='orbit';
  document.getElementById('wallSeg').hidden=m!=='orbit';
  hintEl.textContent=m==='walk'
    ?'드래그로 둘러보기 · W A S D / 방향키로 이동 · Shift는 빠르게 · 가구를 누르면 선택'
    :'가구를 끌어 옮기기 · 빈 곳 드래그로 회전 · 우클릭·Shift 드래그로 이동 · 휠로 확대 · 더블클릭으로 초점';
  applyCut();renderPlayer();
}
function setLevel(l){
  if(level===l)return;
  level=l;
  document.querySelectorAll('[data-level]').forEach(b=>b.classList.toggle('on',+b.dataset.level===l));
  document.getElementById('pStatic0').style.display=l?'none':'';
  document.getElementById('pStatic1').style.display=l?'':'none';
  orbit.goal.y=l?H1+.5:.5;
  if(sel&&byId(sel)&&byId(sel).lv!==l)sel=null;
  applyCut();refresh(true);
}
function goView(k){
  const v=VIEWS[k];Object.assign(player,{x:v.x,z:v.z,y:v.y,pitch:-.08});
  player.yaw=Math.atan2(-(v.look[0]-v.x),-(v.look[1]-v.z));
  setMode('walk');
}
document.getElementById('mOrbit').onclick=()=>setMode('orbit');
document.getElementById('mWalk').onclick=()=>setMode('walk');
document.getElementById('views').addEventListener('click',e=>{const b=e.target.closest('[data-v]');if(b)goView(b.dataset.v);});
document.querySelectorAll('[data-level]').forEach(b=>b.addEventListener('click',()=>setLevel(+b.dataset.level)));
document.getElementById('wallSeg').addEventListener('click',e=>{const b=e.target.closest('[data-walls]');if(b)setFullWalls(b.dataset.walls==='1');});
document.getElementById('moodSeg').addEventListener('click',e=>{const b=e.target.closest('[data-mood]');if(b)changeMood(b.dataset.mood);});
function changeMood(k){if(S.finish.mood===k)return;commit();setMood(k);save();renderDeco();}

/* ---------- walking & collision ---------- */
const R=20;
const inStair=(x,z)=>x>STAIR.x1&&x<STAIR.x2&&z>0&&z<(x>STAIR.xm?STAIR.bottom:STAIR.top);
const clamp01=v=>Math.min(1,Math.max(0,v));
// heights follow the U stair: east lane 0..7 risers, winders 7..10, west lane 10..15
function stairH(x,z){
  const {x1,xm,x2,bottom,wind,top}=STAIR,rh=H1/15;
  if(z<wind)return(7+3*clamp01((x2-x)/(x2-x1)))*rh;
  return x>xm?7*rh*clamp01((bottom-z)/(bottom-wind)):(10+5*clamp01((z-wind)/(top-wind)))*rh;
}
function circRect(x,z,r,c){const nx=Math.max(c.x1,Math.min(x,c.x2)),nz=Math.max(c.z1,Math.min(z,c.z2));return (x-nx)**2+(z-nz)**2<r*r;}
function floorAt(x,z,curY){return inStair(x,z)?stairH(x,z):(curY>1.3?H1:0);}
function blocked(x,z,curY){
  if(x<R||x>740-R||z<R||z>720-R)return true;
  const y=floorAt(x,z,curY);
  if(Math.abs(y-curY)>.45)return true;
  if(y>1.3&&!inStair(x,z)&&!inLoft(x,z))return true;
  for(const c of colliders){if(y+.35<c.y1&&y+1.75>c.y0&&circRect(x,z,R,c))return true;}
  const lv=y>2.2?1:y<.5?0:-1;
  if(lv>=0){for(const it of S.items){if(it.lv!==lv||isSoft(it))continue;for(const r of worldRects(it)){if(circRect(x,z,R*.8,{x1:r[0],z1:r[1],x2:r[2],z2:r[3]}))return true;}}}
  return false;
}
function tryMove(dx,dz){
  const p=player;
  if(!blocked(p.x+dx,p.z+dz,p.y)){p.x+=dx;p.z+=dz;}
  else if(dx&&!blocked(p.x+dx,p.z,p.y)){p.x+=dx;}
  else if(dz&&!blocked(p.x,p.z+dz,p.y)){p.z+=dz;}
  else return;
  p.y=floorAt(p.x,p.z,p.y);
}
const keys=new Set();
addEventListener('keydown',e=>{
  if(e.target.closest&&e.target.closest('input,textarea,select'))return;
  const k=e.key.toLowerCase(),mod=e.metaKey||e.ctrlKey;
  if(mod&&k==='z'){e.preventDefault();e.shiftKey?redo():undo();return;}
  if(mod&&k==='y'){e.preventDefault();redo();return;}
  if(mod&&k==='d'){if(sel){e.preventDefault();duplicateSel();}return;}
  if(mod)return;
  if(sel&&(k==='delete'||k==='backspace')){e.preventDefault();removeSel();return;}
  if(k==='escape'){select(null);return;}
  if(sel&&k==='r'){rotateSel();return;}
  if(sel&&mode==='orbit'&&k.startsWith('arrow')){
    e.preventDefault();const st=e.shiftKey?20:5;
    nudgeSel(k==='arrowleft'?-st:k==='arrowright'?st:0,k==='arrowup'?-st:k==='arrowdown'?st:0);return;
  }
  if(mode==='walk'&&['arrowup','arrowdown','arrowleft','arrowright',' '].includes(k))e.preventDefault();
  keys.add(k);
});
addEventListener('keyup',e=>keys.delete(e.key.toLowerCase()));
addEventListener('blur',()=>keys.clear());
const pad={f:0,t:0};
document.getElementById('pad').querySelectorAll('button').forEach(b=>{
  const k=b.dataset.p;
  const on=e=>{e.preventDefault();if(k==='f')pad.f=1;if(k==='b')pad.f=-1;if(k==='l')pad.t=1;if(k==='r')pad.t=-1;};
  const off=()=>{if(k==='f'||k==='b')pad.f=0;else pad.t=0;};
  b.addEventListener('pointerdown',on);['pointerup','pointerleave','pointercancel'].forEach(ev=>b.addEventListener(ev,off));
});

/* ---------- pointer on 3D ---------- */
const ray=new THREE.Raycaster();
const floorPlane=new THREE.Plane(new THREE.Vector3(0,1,0),0),tmpV=new THREE.Vector3();
const occluders=[...cutList.map(c=>c.m),...loftList,...ceilList].filter(m=>!(m.material&&m.material.transparent));
function setRay(e){const r=canvas.getBoundingClientRect();ray.setFromCamera({x:((e.clientX-r.left)/r.width)*2-1,y:-((e.clientY-r.top)/r.height)*2+1},camera);}
function floorHit(e,y){setRay(e);floorPlane.constant=-y;return ray.ray.intersectPlane(floorPlane,tmpV)?{x:tmpV.x*100,z:tmpV.z*100}:null;}
function shown(o){while(o){if(!o.visible)return false;o=o.parent;}return true;}
function pickItem(e){
  setRay(e);
  const hits=ray.intersectObjects([...Object.values(groups),...occluders],true);
  for(const h of hits){if(!shown(h.object))continue;return h.object.userData.itemId||null;}
  return null;
}
const ptrs=new Map();let drag=null,pinch=null,moveIt=null;
canvas.addEventListener('contextmenu',e=>e.preventDefault());
canvas.addEventListener('pointerdown',e=>{
  canvas.setPointerCapture(e.pointerId);ptrs.set(e.pointerId,{x:e.clientX,y:e.clientY});
  drag={x:e.clientX,y:e.clientY,moved:0,pan:e.button===2||e.shiftKey};
  if(ptrs.size===2){const [a,b]=[...ptrs.values()];pinch={d:Math.hypot(a.x-b.x,a.y-b.y),mx:(a.x+b.x)/2,my:(a.y+b.y)/2};moveIt=null;return;}
  if(mode==='orbit'&&e.button===0&&!e.shiftKey){
    const id=pickItem(e);
    if(id){
      const it=byId(id),p=floorHit(e,it.lv*H1);
      if(p){moveIt={it,ox:p.x-it.cx,oz:p.z-it.cz,pre:snapshot(),moved:false};if(sel!==id)select(id);}
    }
  }
});
function panBy(dx,dy){
  const k=orbit.r*.0016,c=Math.cos(orbit.theta),s=Math.sin(orbit.theta);
  orbit.goal.x+=(-dx*c-dy*s)*k;orbit.goal.z+=(dx*s-dy*c)*k;
  orbit.goal.x=Math.max(-1,Math.min(8.4,orbit.goal.x));orbit.goal.z=Math.max(-1,Math.min(8.2,orbit.goal.z));
}
canvas.addEventListener('pointermove',e=>{
  if(!ptrs.has(e.pointerId)){
    if(mode==='orbit'&&!e.buttons&&e.pointerType==='mouse'){hoverQueue=e;}
    return;
  }
  const prev=ptrs.get(e.pointerId);const dx=e.clientX-prev.x,dy=e.clientY-prev.y;ptrs.set(e.pointerId,{x:e.clientX,y:e.clientY});
  if(ptrs.size===2){
    const [a,b]=[...ptrs.values()],d=Math.hypot(a.x-b.x,a.y-b.y),mx=(a.x+b.x)/2,my=(a.y+b.y)/2;
    if(pinch&&mode==='orbit'){orbit.r=Math.min(26,Math.max(3.5,orbit.r*pinch.d/d));panBy(mx-pinch.mx,my-pinch.my);}
    pinch={d,mx,my};if(drag)drag.moved+=99;return;
  }
  if(!drag)return;drag.moved+=Math.abs(dx)+Math.abs(dy);
  if(moveIt){
    const it=moveIt.it,p=floorHit(e,it.lv*H1);if(!p)return;
    const nx=Math.round((p.x-moveIt.ox)/5)*5,nz=Math.round((p.z-moveIt.oz)/5)*5;
    if(nx===it.cx&&nz===it.cz)return;
    if(!moveIt.moved){commit(moveIt.pre);moveIt.moved=true;}
    it.cx=Math.max(-20,Math.min(760,nx));it.cz=Math.max(-20,Math.min(740,nz));
    if(TYPES[it.type].wall)snapToWall(it,35);
    syncItem(it,false);refresh(false);return;
  }
  if(mode==='walk'){player.yaw+=dx*.0045;player.pitch=Math.max(-1.2,Math.min(1.2,player.pitch+dy*.0045));}
  else if(drag.pan)panBy(dx,dy);
  else{orbit.theta-=dx*.006;orbit.phi=Math.max(.12,Math.min(1.45,orbit.phi-dy*.006));}
});
function endPtr(e){
  if(moveIt){const m=moveIt.moved;moveIt=null;if(m)refresh(true);}
  else if(drag&&drag.moved<6&&ptrs.size===1&&!drag.pan)select(pickItem(e));
  ptrs.delete(e.pointerId);if(ptrs.size<2)pinch=null;if(!ptrs.size)drag=null;
}
canvas.addEventListener('pointerup',endPtr);
canvas.addEventListener('pointercancel',e=>{ptrs.delete(e.pointerId);drag=null;pinch=null;if(moveIt&&moveIt.moved)refresh(true);moveIt=null;});
canvas.addEventListener('wheel',e=>{if(mode!=='orbit')return;e.preventDefault();orbit.r=Math.min(26,Math.max(3.5,orbit.r*(1+e.deltaY*.0012)));},{passive:false});
canvas.addEventListener('dblclick',e=>{
  if(mode!=='orbit')return;const p=floorHit(e,level*H1);if(!p)return;
  orbit.goal.set(Math.max(0,Math.min(7.4,p.x/100)),orbit.goal.y,Math.max(0,Math.min(7.2,p.z/100)));
  orbit.r=Math.min(orbit.r,8);
});
let hoverQueue=null;
function processHover(){
  if(!hoverQueue)return;const e=hoverQueue;hoverQueue=null;
  canvas.classList.toggle('over-item',!!pickItem(e));
}

/* ---------- placement ---------- */
function fits(it){
  const bb=bbox(worldRects(it));
  if(bb[0]<0||bb[1]<0||bb[2]>740||bb[3]>720)return false;
  if(it.lv===1&&outsideLoft(it))return false;
  if(hardList(it.lv).some(h=>hitsRect(it,h)))return false;
  if(isSoft(it))return true;
  const mine=worldRects(it);
  return !S.items.some(o=>o!==it&&o.lv===it.lv&&!isSoft(o)&&worldRects(o).some(r=>mine.some(m=>overlap(m,r))));
}
function preferredPoint(){
  if(mode==='walk')return{x:player.x-Math.sin(player.yaw)*150,z:player.z-Math.cos(player.yaw)*150,lv:player.y>1.3?1:0};
  return{x:orbit.goal.x*100,z:orbit.goal.z*100,lv:level};
}
function placeFree(it,from){
  const p=from||preferredPoint();
  it.cx=Math.round(p.x/5)*5;it.cz=Math.round(p.z/5)*5;
  if(TYPES[it.type].wall){snapToWall(it,600);return;}
  const cands=[];
  for(let dx=-450;dx<=450;dx+=10)for(let dz=-450;dz<=450;dz+=10)cands.push([dx*dx+dz*dz,dx,dz]);
  cands.sort((a,b)=>a[0]-b[0]);
  const x0=it.cx,z0=it.cz,r0=it.rot;
  for(const rot of [r0,(r0+90)%360]){
    it.rot=rot;
    for(const [,dx,dz] of cands){it.cx=x0+dx;it.cz=z0+dz;if(fits(it))return;}
  }
  it.cx=x0;it.cz=z0;it.rot=r0;
}
// put a wall-mounted item flush against the nearest wall face, facing into the room
function snapToWall(it,maxDist){
  const [w,d]=dims(it);
  const rects=it.lv===1?[...EXT_WALLS]:[...planWalls];
  if(TYPES[it.type].onWindow)rects.push(...WINDOW_SPANS);
  let best=null;
  rects.forEach(r=>{
    [[r.x1,0,-1,0],[r.x2,0,1,0],[r.z1,1,0,-1],[r.z2,1,0,1]].forEach(([pos,axisZ,nx,nz])=>{
      const along=axisZ?it.cx:it.cz,lo=axisZ?r.x1:r.z1,hi=axisZ?r.x2:r.z2;
      if(hi-lo<w*.5)return;
      if(along<lo-10||along>hi+10)return;
      const s=axisZ?(it.cz-pos)*nz:(it.cx-pos)*nx;
      if(s<-15||s>maxDist)return;
      const fx=axisZ?Math.max(lo+w/2,Math.min(hi-w/2,it.cx)):pos+nx*d/2;
      const fz=axisZ?pos+nz*d/2:Math.max(lo+w/2,Math.min(hi-w/2,it.cz));
      if(fx<0||fx>740||fz<0||fz>720)return;
      if(it.lv===1&&!inLoft(fx,fz))return;
      if(!best||s<best.s)best={s,fx,fz,rot:(Math.round(Math.atan2(nx,nz)*180/Math.PI)+360)%360};
    });
  });
  if(best){it.cx=Math.round(best.fx);it.cz=Math.round(best.fz);it.rot=best.rot;}
}

/* ---------- item actions ---------- */
// where new furniture goes when looking at the whole ground floor
const CAT_HOME={living:[530,600],bedroom:[125,150],work:[155,555],dining:[530,600],deco:[530,600]};
function addItem(type){
  commit();
  const p=preferredPoint(),home=CAT_HOME[TYPES[type].cat];
  if(mode==='orbit'&&p.lv===0&&orbit.r>9&&home){p.x=home[0];p.z=home[1];}
  const it=withDefaults({id:newId(type),type,label:newLabel(type),cx:0,cz:0,rot:0,lv:p.lv});
  if(type==='curtain'&&p.lv===0&&mode==='orbit')p.z=700;
  placeFree(it,p);
  S.items.push(it);syncItem(it,true);
  if(it.lv!==level)setLevel(it.lv);
  select(it.id);
}
function rotateSel(){const it=byId(sel);if(!it)return;commit();it.rot=(it.rot+90)%360;if(TYPES[it.type].wall)snapToWall(it,60);syncItem(it,false);refresh(true);}
function nudgeSel(dx,dz){const it=byId(sel);if(!it)return;commit();it.cx+=dx;it.cz+=dz;syncItem(it,false);refresh(true);}
function removeSel(){const it=byId(sel);if(!it)return;commit();S.items=S.items.filter(i=>i!==it);removeGroup(it.id);select(null);}
function duplicateSel(){
  const it=byId(sel);if(!it)return;commit();
  const c=Object.assign(JSON.parse(JSON.stringify(it)),{id:newId(it.type),label:newLabel(it.type)});
  placeFree(c,{x:it.cx+30,z:it.cz+30,lv:it.lv});
  S.items.push(c);syncItem(c,true);select(c.id);
}

/* ---------- plan (SVG) ---------- */
const svg=document.getElementById('plan');
const pItems=document.getElementById('pItems'),pPlayer=document.getElementById('pPlayer');
const rectS=(cls,a,b,c,d,extra)=>`<rect class="${cls}" x="${a}" y="${b}" width="${c-a}" height="${d-b}" ${extra||''}/>`;
(function planStatic(){
  let s='';
  s+=rectS('p-tile',0,0,740,720);
  s+=rectS('p-wood',0,0,249,298)+rectS('p-wood',0,310,310,720)+rectS('p-bath',462,0,660,178)+rectS('p-entry',357,0,450,110);
  s+=rectS('p-stair',261,0,345,230);
  {const {x1,xm,x2,bottom,wind,top}=STAIR,east=(bottom-wind)/7,west=(top-wind)/6;
   for(let i=1;i<7;i++)s+=`<line class="p-stair" x1="${xm}" y1="${bottom-i*east}" x2="${x2}" y2="${bottom-i*east}"/>`;
   for(let j=1;j<6;j++)s+=`<line class="p-stair" x1="${x1}" y1="${wind+j*west}" x2="${xm}" y2="${wind+j*west}"/>`;
   s+=`<line class="p-stair" x1="${x1}" y1="${wind}" x2="${x2}" y2="${wind}"/><line class="p-stair" x1="${xm}" y1="${wind}" x2="${xm}" y2="${bottom}"/><line class="p-stair" x1="${xm}" y1="${wind}" x2="${xm}" y2="0"/>`;
   s+=`<path class="p-stair" d="M324 222 L324 31 L282 31 L282 178 M274 164 L282 180 L290 164"/>`;}
  planFixed.forEach(f=>s+=rectS('p-fixed',f.x1,f.z1,f.x2,f.z2));
  s+=rectS('p-fixed',600,4,658,52)+rectS('p-fixed',480,6,525,70)+rectS('p-fixed',705,190,740,365,'style="fill:none;stroke-dasharray:4 4"')+rectS('p-fixed',424,437,620,485,'style="fill:none;stroke-dasharray:4 4"');
  s+=`<path class="p-door" d="M249 200 A96 96 0 0 0 153 296 L249 296"/><path class="p-door" d="M310 392 A86 86 0 0 0 224 478 L310 478"/><path class="p-door" d="M450 170 A70 70 0 0 1 380 100"/>`;
  planWalls.forEach(w=>s+=rectS('p-wall',w.x1,w.z1,w.x2,w.z2));
  s+=rectS('p-wall',-20,720,0,738)+rectS('p-wall',740,720,760,738);
  s+=`<line class="p-win" x1="0" y1="728" x2="740" y2="728"/>`;
  s+=rectS('p-entry',370,-20,440,0,'style="fill:var(--accent)"');
  s+=`<polyline class="p-rail" points="325,720 325,250 740,250"/>`;
  s+=`<text class="p-label" x="125" y="256" text-anchor="middle">침실 · 실2</text><text class="p-dim" x="125" y="280" text-anchor="middle">249 × 298</text>`;
  s+=`<text class="p-label" x="200" y="455" text-anchor="middle">오피스 · 실1</text><text class="p-dim" x="200" y="478" text-anchor="middle">310 × 410</text>`;
  s+=`<text class="p-label" x="430" y="690" text-anchor="middle">거실</text><text class="p-dim" x="430" y="710" text-anchor="middle">415 × 235</text>`;
  s+=`<text class="p-small" x="560" y="296" text-anchor="middle">주방</text><text class="p-small" x="571" y="224" text-anchor="middle">키큰장</text><text class="p-small" x="650" y="374" text-anchor="middle">세탁기</text><text class="p-small" x="560" y="120" text-anchor="middle">욕실</text>`;
  s+=`<text class="p-small" x="403" y="62" text-anchor="middle">현관</text><text class="p-small" x="303" y="250" text-anchor="middle">계단↑</text>`;
  s+=`<text class="p-small" x="740" y="242" text-anchor="end">다락 난간</text><text class="p-small" x="370" y="756" text-anchor="middle">창 (남향 전면창)</text>`;
  document.getElementById('pStatic0').innerHTML=s;

  let t=rectS('p-tile',0,0,740,720)+rectS('p-void',325,250,740,720)+rectS('p-void',STAIR.x1,0,STAIR.x2,STAIR.top);
  LOFT.forEach(([a,b,c,d])=>t+=rectS('p-wood',a,b,c,d));
  CLOSED.forEach(([a,b,c,d])=>t+=rectS('p-fixed',a,b,c,d));
  {const [a,b,c,d]=LOW_CEIL;t+=rectS('p-fixed',a+12,b,c,d-10,'style="fill:none;stroke-dasharray:4 4"');}
  EXT_WALLS.forEach(w=>t+=rectS('p-wall',w.x1,w.z1,w.x2,w.z2));
  LOFT_WALLS.forEach(([a,b,c,d])=>t+=rectS('p-wall',a,b,c,d));
  t+=rectS('p-wall',-20,720,0,738)+rectS('p-wall',740,720,760,738);
  t+=`<line class="p-win" x1="0" y1="728" x2="740" y2="728"/>`;
  t+=`<polyline class="p-railS" points="325,298 325,250 740,250"/><polyline class="p-railS" points="303,190 345,190 345,42"/>`;
  t+=`<text class="p-label" x="125" y="140" text-anchor="middle">다락</text><text class="p-dim" x="125" y="164" text-anchor="middle">침실 위 248 × 298</text>`;
  t+=`<text class="p-label" x="500" y="128" text-anchor="middle">다락 · 천장 113cm</text><text class="p-dim" x="500" y="152" text-anchor="middle">289 × 190</text>`;
  t+=`<text class="p-small" x="160" y="510" text-anchor="middle">막힌 공간 (오피스 위)</text>`;
  t+=`<text class="p-small" x="532" y="480" text-anchor="middle">거실 위 오픈 공간</text><text class="p-small" x="532" y="502" text-anchor="middle">(아래층 거실이 보여요)</text>`;
  t+=`<text class="p-small" x="282" y="214" text-anchor="middle">계단↓</text><text class="p-small" x="370" y="756" text-anchor="middle">창 (남향 전면창)</text>`;
  const p1=document.getElementById('pStatic1');p1.innerHTML=t;p1.style.display='none';
})();

let problemSet=new Set();
function shapeSVG(it){
  const [w,d]=dims(it);
  if(sofaLeg(it)){
    const L=it.L,D=it.D,C=it.C,z0=-C/2,s=it.side;
    const pts=[[-L/2,z0],[L/2,z0],[L/2,z0+C],[L/2-D,z0+C],[L/2-D,z0+D],[-L/2,z0+D]].map(([x,z])=>`${x*s},${z}`).join(' ');
    return `<polygon class="shape" points="${pts}"/>`;
  }
  if(isRound(it))return `<ellipse class="shape" cx="0" cy="0" rx="${w/2}" ry="${d/2}"/>`;
  return `<rect class="shape" x="${-w/2}" y="${-d/2}" width="${w}" height="${d}" rx="3"/>`;
}
function itemSVG(it){
  const [w,d]=dims(it),T=TYPES[it.type];
  let extra='';
  if(!T.soft&&!isRound(it))extra+=`<line class="back" x1="${-w/2+4}" y1="${-d/2}" x2="${w/2-4}" y2="${-d/2}"/>`;
  if(T.wall)extra+=`<line class="back" x1="${-w/2+2}" y1="${-d/2}" x2="${w/2-2}" y2="${-d/2}"/>`;
  if(it.type==='pinnacle'&&it.recl)extra+=`<line class="back" style="stroke-dasharray:4 4" x1="${-w/2+4}" y1="${-d/2+97}" x2="${w/2-4}" y2="${-d/2+97}"/>`;
  if(it.type==='desk')extra+=`<circle class="chair" cx="0" cy="${d/2+38}" r="26"/>`;
  if(it.type==='dining'){const [l,dt]=DINING[it.seats];extra+=`<rect class="detail" x="${-l*50}" y="${-dt*50}" width="${l*100}" height="${dt*100}" rx="2"/>`;}
  const cls=`it t-${it.type}${T.soft?' soft':''}${T.wall?' wallitem':''}${sel===it.id?' sel':''}${problemSet.has(it.id)?' bad':''}`;
  return `<g class="${cls}" data-id="${it.id}" transform="translate(${it.cx} ${it.cz}) rotate(${-it.rot})"><title>${esc(it.label)}</title>${shapeSVG(it)}${extra}</g>`;
}
function renderPlanItems(){
  const vis=S.items.filter(i=>i.lv===level);
  const rank=i=>i.type==='rug'?0:TYPES[i.type].wall?2:1;
  const order=[...vis].sort((a,b)=>rank(a)-rank(b)||(a.id===sel)-(b.id===sel));
  let s=order.map(itemSVG).join('');
  order.forEach(it=>{
    if(it.type==='rug'||TYPES[it.type].wall)return;const [w,d]=dims(it);if(Math.min(w,d)<45&&it.id!==sel)return;
    const m=worldRects(it)[0];s+=`<text class="ilabel" x="${(m[0]+m[2])/2}" y="${(m[1]+m[3])/2}">${esc(it.label)}</text>`;
  });
  pItems.innerHTML=s;
}
function renderPlayer(){
  if(mode!=='walk'){pPlayer.innerHTML='';return;}
  if((player.y>1.3?1:0)!==level){pPlayer.innerHTML='';return;}
  const deg=-player.yaw*180/Math.PI;
  pPlayer.innerHTML=`<g class="player" transform="translate(${player.x.toFixed(1)} ${player.z.toFixed(1)}) rotate(${deg.toFixed(1)})"><path d="M0 0 L-38 -80 A88 88 0 0 1 38 -80 Z"/><circle r="12"/></g>`;
}
function svgPt(e){const p=svg.createSVGPoint();p.x=e.clientX;p.y=e.clientY;return p.matrixTransform(svg.getScreenCTM().inverse());}
let dragIt=null;
svg.addEventListener('pointerdown',e=>{
  const g=e.target.closest('.it');if(!g)return;
  const it=byId(g.dataset.id);const pre=snapshot();select(it.id);
  const p=svgPt(e);dragIt={it,ox:p.x-it.cx,oz:p.y-it.cz,pre,moved:false};
  svg.setPointerCapture(e.pointerId);e.preventDefault();
});
svg.addEventListener('pointermove',e=>{
  if(!dragIt)return;const p=svgPt(e),it=dragIt.it;
  const nx=Math.round((p.x-dragIt.ox)/5)*5,nz=Math.round((p.y-dragIt.oz)/5)*5;
  if(nx===it.cx&&nz===it.cz)return;
  if(!dragIt.moved){commit(dragIt.pre);dragIt.moved=true;}
  it.cx=Math.max(-20,Math.min(760,nx));it.cz=Math.max(-20,Math.min(740,nz));
  if(TYPES[it.type].wall)snapToWall(it,35);
  syncItem(it,false);refresh(false);
});
const endDrag=()=>{if(dragIt){const m=dragIt.moved;dragIt=null;if(m)refresh(true);}};
svg.addEventListener('pointerup',endDrag);svg.addEventListener('pointercancel',endDrag);
svg.addEventListener('dblclick',e=>{
  if(e.target.closest('.it'))return;const p=svgPt(e);
  const y=level?H1:0;if(blocked(p.x,p.y,y))return;
  Object.assign(player,{x:p.x,z:p.y,y});setMode('walk');
});

/* ---------- analysis ---------- */
function problems(){
  const list=[];problemSet=new Set();
  const flag=(msg,...ids)=>{list.push({msg,id:ids[0]});ids.forEach(i=>problemSet.add(i));};
  [0,1].forEach(lv=>{
    const pre=lv?'다락: ':'';
    const solid=S.items.filter(i=>i.lv===lv&&!isSoft(i));
    for(let i=0;i<solid.length;i++)for(let j=i+1;j<solid.length;j++){
      const A=worldRects(solid[i]),B=worldRects(solid[j]);
      if(A.some(a=>B.some(b=>overlap(a,b))))flag(`${pre}${solid[i].label}와(과) ${solid[j].label}이(가) 겹쳐요`,solid[i].id,solid[j].id);
    }
    const hard=hardList(lv);
    S.items.filter(i=>i.lv===lv&&!TYPES[i.type].wall).forEach(it=>{
      if(lv===1&&outsideLoft(it)){flag(`${pre}${it.label}이(가) 다락 바닥 밖으로 나가요`,it.id);return;}
      const hit=hard.find(h=>hitsRect(it,h));
      if(hit)flag(isSoft(it)?`${pre}${it.label}가 ${hit.label} 밑으로 들어가요`:`${pre}${it.label}이(가) ${hit.label}에 걸려요`,it.id);
    });
  });
  return list;
}
function frontInfo(it){
  const t=it.rot*Math.PI/180,fx=Math.round(Math.sin(t)),fz=Math.round(Math.cos(t));
  const m=worldRects(it)[0],room=roomOf(m,it.lv);
  const edge=fx>0?m[2]:fx<0?m[0]:fz>0?m[3]:m[1];
  const perp=fx!==0?[m[1],m[3]]:[m[0],m[2]];
  let best=Infinity,what='';
  if(room){best=fx>0?room.x2-edge:fx<0?edge-room.x1:fz>0?room.z2-edge:edge-room.z1;what=room.id==='living'&&fz<0?'주방 쪽':'벽';}
  const obs=[];
  S.items.forEach(o=>{if(o.id===it.id||isSoft(o)||o.lv!==it.lv)return;worldRects(o).forEach(r=>obs.push({r,label:o.label}));});
  if(it.lv===0)planFixed.forEach(f=>obs.push({r:[f.x1,f.z1,f.x2,f.z2],label:f.label}));
  else{RAILS.forEach(r=>obs.push({r,label:'난간'}));LOFT_WALLS.forEach(r=>obs.push({r,label:'벽'}));}
  obs.forEach(({r,label})=>{
    const rp=fx!==0?[r[1],r[3]]:[r[0],r[2]];if(rp[1]<=perp[0]+1||rp[0]>=perp[1]-1)return;
    const d=fx>0?r[0]-edge:fx<0?edge-r[2]:fz>0?r[1]-edge:edge-r[3];
    if(d>=-1&&d<best){best=d;what=label;}
  });
  return{d:best,what,fx,fz,edge,perp};
}
function metricsHTML(it){
  const rs=worldRects(it),bb=bbox(rs),room=roomOf(bb,it.lv),T=TYPES[it.type];
  const cell=(k,v,cls,wide)=>`<div class="${cls||''}${wide?' wide':''}"><span>${k}</span><b>${v}</b></div>`;
  const fmt=v=>`${Math.round(v)}cm`;
  let h='';
  if(room){
    [['위쪽',bb[1]-room.z1],['아래쪽',room.z2-bb[3]],['왼쪽',bb[0]-room.x1],['오른쪽',room.x2-bb[2]]].forEach(([k,v])=>h+=cell(`${k} 벽까지`,fmt(v),v<-1?'neg':''));
  }else h+=cell('위치',it.lv?'다락':'방 밖 (주방·복도)','',true);
  if(!T.soft&&T.need){
    const f=frontInfo(it);
    if(isFinite(f.d))h+=cell(`${it.type==='desk'?'의자 쪽 여유':'앞쪽 여유'} (${f.what})`,fmt(f.d),f.d<T.need?'neg':'good',true);
  }
  if(SOFA_TYPES.includes(it.type)){
    const tv=firstOf('tv',it.lv)||firstOf('idanas',it.lv)||firstOf('besta',it.lv),f=frontInfo(it);
    if(tv){const r=worldRects(tv)[0];const d=f.fx>0?r[0]-f.edge:f.fx<0?f.edge-r[2]:f.fz>0?r[1]-f.edge:f.edge-r[3];
      if(d>0){const inch=Math.round(d/2.54/1.3/5)*5;h+=cell('소파 앞 ↔ TV장',`${Math.round(d)}cm · 약 ${inch}인치까지`,'',true);}}
  }
  if(it.type==='desk')h+=cell('상판 높이',`${it.h}cm`,'',true);
  return h;
}

/* ---------- panel: furniture ---------- */
const selEl=document.getElementById('sel');
function sliderHTML(s,val){
  return `<label class="slider"><span>${s.label}</span><input type="range" data-range="${s.k}" min="${s.min}" max="${s.max}" step="${s.step}" value="${val}"><output id="out-${s.k}">${val}cm</output></label>`;
}
const sliderList=it=>{const s=TYPES[it.type].sliders;return(typeof s==='function'?s(it):s)||[];};
const sameColor=(a,b)=>String(a).toLowerCase()===String(b).toLowerCase();
function swatchesHTML(pal,cur,attrs){
  return pal.map(([c,n])=>`<button type="button" class="sw${sameColor(cur,c)?' on':''}" style="--c:${c}" ${attrs(c)} title="${n}" aria-label="${n}"></button>`).join('');
}
function renderSel(){
  const lvItems=S.items.filter(i=>i.lv===level);
  let h=`<h2 style="margin:0">배치된 가구 · ${level?'다락':'1층'} ${lvItems.length}개</h2>`;
  h+=lvItems.length?`<div class="chips">${lvItems.map(it=>`<button type="button" class="chip${sel===it.id?' on':''}${problemSet.has(it.id)?' bad':''}" data-sel="${it.id}">${esc(it.label)}</button>`).join('')}</div>`
    :`<p class="foot">아직 이 층에 놓인 가구가 없어요. 아래에서 골라 추가해 보세요.</p>`;
  const it=sel&&byId(sel);
  if(it){
    const T=TYPES[it.type],[w,d]=dims(it);
    h+=`<div class="editor">
      <div class="selhead"><input class="namein" id="nameIn" value="${esc(it.label)}" aria-label="가구 이름" maxlength="24"><span class="dim" id="selDim">${w} × ${d}cm</span></div>
      <div class="row">
        <button type="button" class="btn" data-act="rot">90° 회전</button>
        <button type="button" class="btn" data-act="nudge" data-dx="-5" data-dz="0" aria-label="왼쪽으로 5cm">←</button>
        <button type="button" class="btn" data-act="nudge" data-dx="5" data-dz="0" aria-label="오른쪽으로 5cm">→</button>
        <button type="button" class="btn" data-act="nudge" data-dx="0" data-dz="-5" aria-label="위로 5cm">↑</button>
        <button type="button" class="btn" data-act="nudge" data-dx="0" data-dz="5" aria-label="아래로 5cm">↓</button>
        <button type="button" class="btn" data-act="dup">복제</button>
        <button type="button" class="btn del" data-act="del">삭제</button>
      </div>`;
    (T.opts||[]).forEach(o=>{
      if(o.hide&&o.hide(it))return;
      const btns=o.bg
        ?`<div class="swatches">${o.choices.map(([v,n])=>`<button type="button" class="sw${it[o.k]===v?' on':''}" style="${o.bg(v,it)}" data-act="opt" data-k="${o.k}" data-v="${v}" title="${n}" aria-label="${n}"></button>`).join('')}</div>`
        :`<div class="row">${o.choices.map(([v,n])=>`<button type="button" class="btn${it[o.k]===v?' on':''}" data-act="opt" data-k="${o.k}" data-v="${v}">${n}</button>`).join('')}</div>`;
      h+=`<div class="optrow"><span class="optlabel">${o.label}</span>${btns}</div>`;
    });
    sliderList(it).forEach(s=>h+=sliderHTML(s,it[s.k]));
    if(it.type==='sofa')h+=`<p class="foot">코너 쪽을 깊이보다 작게(0 포함) 두면 일자형이 돼요.</p>`;
    (T.slots||[]).forEach(s=>{
      if(s.hide&&s.hide(it))return;
      h+=`<div class="optrow"><span class="optlabel">${s.label}</span><div class="swatches">${swatchesHTML(PAL[s.role],it[s.k],c=>`data-act="color" data-k="${s.k}" data-v="${c}"`)}<label class="sw sw-custom" title="직접 고르기"><input type="color" data-color="${s.k}" value="${it[s.k]}" aria-label="${s.label} 직접 고르기"></label></div></div>`;
    });
    h+=`<div class="optrow"><span class="optlabel">층</span><div class="row"><button type="button" class="btn${it.lv===0?' on':''}" data-act="lv" data-v="0">1층</button><button type="button" class="btn${it.lv===1?' on':''}" data-act="lv" data-v="1">다락</button></div></div>`;
    h+=`<div class="metrics" id="metrics">${metricsHTML(it)}</div></div>`;
  }else{
    h+=`<p class="foot">평면도나 3D에서 가구를 누르면 크기, 색, 벽까지 남는 거리가 나와요.</p>`;
  }
  selEl.innerHTML=h;
}
let liveCommitted=false;
selEl.addEventListener('click',e=>{
  const s=e.target.closest('[data-sel]');if(s){select(s.dataset.sel);return;}
  const b=e.target.closest('[data-act]');if(!b)return;const it=byId(sel);const a=b.dataset.act;
  if(!it)return;
  if(a==='rot')return rotateSel();
  if(a==='nudge')return nudgeSel(+b.dataset.dx,+b.dataset.dz);
  if(a==='dup')return duplicateSel();
  if(a==='del')return removeSel();
  commit();
  if(a==='opt'){const o=TYPES[it.type].opts.find(o=>o.k===b.dataset.k);const ch=o.choices.find(([v])=>String(v)===b.dataset.v);if(it.type==='rug'&&ch[0]==='custom'&&it.size!=='custom'){const [w,d]=rugSize(it);it.rw=w;it.rd=d;}if(TYPES[it.type].soft)it[o.k]=ch[0];else resizeKeepBack(it,{[o.k]:ch[0]});if(TYPES[it.type].wall)snapToWall(it,60);syncItem(it,true);}
  if(a==='color'){it[b.dataset.k]=b.dataset.v;syncItem(it,true);}
  if(a==='lv'){const lv=+b.dataset.v;if(lv===it.lv){hist.pop();updUndo();return;}it.lv=lv;placeFree(it,{x:it.cx,z:it.cz,lv});syncItem(it,true);setLevel(lv);}
  refresh(true);
});
selEl.addEventListener('input',e=>{
  const it=byId(sel);if(!it)return;
  const k=e.target.dataset.range,ck=e.target.dataset.color;
  if(!k&&!ck)return;
  if(!liveCommitted){commit();liveCommitted=true;}
  if(k){const v=+e.target.value;if(isSoft(it))it[k]=v;else resizeKeepBack(it,{[k]:v});document.getElementById('out-'+k).textContent=v+'cm';const [w,d]=dims(it);document.getElementById('selDim').textContent=`${w} × ${d}cm`;}
  else{it[ck]=e.target.value;}
  syncItem(it,true);refresh(false);
});
selEl.addEventListener('change',e=>{
  if(e.target.id==='nameIn'){const it=byId(sel);const v=e.target.value.trim();if(it&&v&&v!==it.label){commit();it.label=v;}refresh(true);return;}
  if(e.target.dataset.range||e.target.dataset.color){liveCommitted=false;refresh(true);}
});
selEl.addEventListener('keydown',e=>{if(e.target.id==='nameIn'&&e.key==='Enter')e.target.blur();});

let catCat='living';
const catEl=document.getElementById('catalog');
function iconSVG(type){
  const it=withDefaults({type,id:'_icon',cx:0,cz:0});const [w,d]=dims(it);const m=Math.max(w,d)*1.12;
  return `<svg viewBox="${-m/2} ${-m/2} ${m} ${m}" aria-hidden="true" style="--sw:${(m/16).toFixed(1)}">${shapeSVG(it)}</svg>`;
}
function renderCatalog(){
  const list=Object.entries(TYPES).filter(([,T])=>T.cat===catCat&&!T.hidden);
  catEl.innerHTML=`<h2 style="margin:0">가구 추가</h2>
    <div class="chips">${CATS.map(([k,n])=>`<button type="button" class="chip${catCat===k?' on':''}" data-cat="${k}">${n}</button>`).join('')}</div>
    <div class="catgrid">${list.map(([k,T])=>{const [w,d]=dims(withDefaults({type:k,id:'_'}));return `<button type="button" class="catitem" data-add="${k}"><span class="catico">${iconSVG(k)}</span><span><b>${T.label}</b><small>${T.desc||`${w} × ${d}cm`}</small></span></button>`;}).join('')}</div>
    <p class="foot">누르면 지금 보고 있는 곳 근처 빈자리에 놓여요. 크기와 색은 놓은 뒤에 바꿀 수 있어요.</p>`;
}
catEl.addEventListener('click',e=>{
  const c=e.target.closest('[data-cat]');if(c){catCat=c.dataset.cat;renderCatalog();return;}
  const a=e.target.closest('[data-add]');if(a)addItem(a.dataset.add);
});

/* ---------- panel: decorate ---------- */
let decoZone='living',paintLive=false,_marbleSw=null;
const decoEl=document.getElementById('tab-deco');
function marbleSwatch(){
  if(!_marbleSw){const c=document.createElement('canvas');c.width=c.height=64;c.getContext('2d').drawImage(floorTex('marble').image,0,0,320,320,0,0,64,64);_marbleSw=c.toDataURL();}
  return _marbleSw;
}
function renderDeco(){
  const f=S.finish,zc=f.walls[decoZone];
  decoEl.innerHTML=`
  <section class="note">
    <h2 style="margin:0">스타일 한 번에 바꾸기</h2>
    <p class="foot">벽 색, TV벽, 가구·러그·침구·커튼 색을 한 세트로 바꿔요. 바닥과 배치는 그대로예요.</p>
    <div class="stylegrid">${STYLES.map(st=>`<button type="button" class="stylebtn" data-style="${st.k}"><span class="stylesw">${[st.walls,st.fabric,st.wood,st.rug,st.bedding].map(c=>`<i style="background:${c}"></i>`).join('')}</span><b>${st.name}</b><small>${st.desc}</small></button>`).join('')}</div>
  </section>
  <section class="note">
    <h2 style="margin:0">공간별 벽과 바닥</h2>
    <div class="chips">${ZONES.map(z=>`<button type="button" class="chip${decoZone===z.id?' on':''}" data-zone="${z.id}">${z.name}</button>`).join('')}</div>
    <div class="optrow"><span class="optlabel">벽 색</span><div class="swatches">${swatchesHTML(PAINTS,zc,c=>`data-paint="${c}"`)}<button type="button" class="sw${zc==='marble'?' on':''}" style="background:url(${marbleSwatch()}) center/cover" data-paint="marble" title="화이트 마블" aria-label="화이트 마블"></button><label class="sw sw-custom" title="직접 고르기"><input type="color" data-paintcustom value="${zc==='marble'?'#ffffff':zc}" aria-label="벽 색 직접 고르기"></label></div></div>
    ${zc==='marble'?'':`<div class="optrow"><span class="optlabel">벽 질감</span><div class="row"><button type="button" class="btn${f.paper[decoZone]?'':' on'}" data-paper="0">매끈한 페인트</button><button type="button" class="btn${f.paper[decoZone]?' on':''}" data-paper="1">실크 벽지</button></div></div>`}
    <div class="row"><button type="button" class="btn" data-paintall>이 벽 색을 모든 공간에</button></div>
    <div class="optrow"><span class="optlabel">바닥</span><div class="floorgrid">${Object.entries(FLOORS).map(([k,o])=>`<button type="button" class="floorbtn${f.floors[decoZone]===k?' on':''}" data-floor="${k}"><i style="background:${o.sw}"></i>${o.name}</button>`).join('')}</div></div>
  </section>
  <section class="note">
    <h2 style="margin:0">층고</h2>
    <label class="slider"><span>천장 높이</span><input type="range" data-ceil min="${CEIL_MIN}" max="${CEIL_MAX}" step="0.1" value="${f.ceil}"><output id="ceilOut">${f.ceil.toFixed(1)}m</output></label>
    <p class="foot">거실과 다락 위 천장까지의 높이예요. 1층 천장(다락 바닥)은 2.7m 그대로이고, 남향 통창과 복층 커튼이 같이 높아져요. 위에서 보기에서는 바깥벽과 통창을 잘라서 보여주니, 층고는 걸어보기에서 거실에 서서 위를 보면 잘 보여요.</p>
  </section>
  <section class="note">
    <h2 style="margin:0">거실 TV벽 마감</h2>
    <div class="row">${TV_FINISHES.map(([k,n])=>`<button type="button" class="btn${f.tv===k?' on':''}" data-tv="${k}">${n}</button>`).join('')}</div>
  </section>
  <section class="note">
    <h2 style="margin:0">조명 분위기</h2>
    <div class="row">${Object.entries(MOODS).map(([k,m])=>`<button type="button" class="btn${f.mood===k?' on':''}" data-mood="${k}">${m.name}</button>`).join('')}</div>
    <p class="foot">저녁과 밤에는 천장 조명과 램프가 켜져요. 플로어 램프나 협탁 램프를 놓으면 분위기가 더 살아나요.</p>
  </section>`;
}
decoEl.addEventListener('click',e=>{
  const t=e.target.closest('[data-style],[data-zone],[data-paint],[data-paper],[data-paintall],[data-floor],[data-tv],[data-mood]');if(!t)return;
  const f=S.finish,d=t.dataset;
  if(d.zone){decoZone=d.zone;renderDeco();return;}
  if(d.mood){changeMood(d.mood);return;}
  commit();
  if(d.style)applyStyle(STYLES.find(s=>s.k===d.style));
  if(d.paint)f.walls[decoZone]=d.paint;
  if(d.paper)f.paper[decoZone]=d.paper==='1';
  if(t.hasAttribute('data-paintall'))ZONES.forEach(z=>{f.walls[z.id]=f.walls[decoZone];f.paper[z.id]=f.paper[decoZone];});
  if(d.floor)f.floors[decoZone]=d.floor;
  if(d.tv)f.tv=d.tv;
  applyFinish();renderDeco();save();
});
decoEl.addEventListener('input',e=>{
  const ceil=e.target.hasAttribute('data-ceil');
  if(!ceil&&!e.target.hasAttribute('data-paintcustom'))return;
  if(!paintLive){commit();paintLive=true;}
  if(ceil){
    S.finish.ceil=+e.target.value;document.getElementById('ceilOut').textContent=S.finish.ceil.toFixed(1)+'m';applyCeiling();return;
  }
  S.finish.walls[decoZone]=e.target.value;applyWalls();
});
decoEl.addEventListener('change',e=>{if(e.target.hasAttribute('data-paintcustom')||e.target.hasAttribute('data-ceil')){paintLive=false;renderDeco();save();}});
function applyStyle(st){
  ZONES.forEach(z=>S.finish.walls[z.id]=st.walls);
  S.finish.tv=st.tv;
  S.items.forEach(it=>{
    let changed=false;
    (TYPES[it.type].slots||[]).forEach(s=>{if(st[s.role]){it[s.k]=st[s.role];changed=true;}});
    if(changed)syncItem(it,true);
  });
  refresh(true);
}

/* ---------- panel: check ---------- */
const SOFA_PRESETS=[
  {k:'rec',name:'추천 일자 215',pieces:[{type:'sofa',p:{L:215,C:0,D:95}}]},
  {k:'s200',name:'일자 200',pieces:[{type:'sofa',p:{L:200,C:0,D:95}}]},
  {k:'corner',name:'코너 215×160',pieces:[{type:'sofa',p:{L:215,C:160,D:95}}]},
  {k:'big',name:'사진 속 307×210',pieces:[{type:'sofa',p:{L:307,C:210,D:103}}]},
  {k:'pin',name:'라즈보이 피나클 207',pieces:[{type:'pinnacle',p:{recl:0}}]},
  // modules either side of a 36cm slot; the table runs front-to-back, 20cm in from the back
  {k:'cloud',name:'모듈 소파 2개 + 협탁',pieces:[{type:'cloud',x:-69.5,p:{arm:-1}},{type:'cloud',x:69.5,p:{arm:1}},{type:'sofaTable',z:65,turn:90}]},
  {k:'hsL',name:'한샘몰 소파 일체형',pieces:[{type:'hsCorner',x:-52,p:{arm:-1}},{type:'hsCorner',x:52,p:{arm:1}},{type:'hsStool',x:-52,z:155.5}]},
  {k:'hsRow',name:'한샘몰 소파 분리형 311',pieces:[{type:'hsCorner',x:-103.5,p:{arm:-1}},{type:'hsStool'},{type:'hsCorner',x:103.5,p:{arm:1}}]},
];
// seating a sofa preset replaces; pieces are laid out from the back-centre of what was there
const SEAT_TYPES=['sofa','pinnacle','cloud','hsCorner','hsStool'];
function sofaAnchor(seats){
  if(!seats.length)return{rot:270,bx:740,bz:602};
  const rot=seats[0].rot,bb=bbox(seats.flatMap(worldRects)),[c,s]=rotCS(seats[0]);
  return{rot,bx:s?(s>0?bb[0]:bb[2]):(bb[0]+bb[2])/2,bz:c?(c>0?bb[1]:bb[3]):(bb[1]+bb[3])/2};
}
const OFFICE_PRESETS={
  L:{name:'L자',a:{cx:225,cz:675,rot:180},b:{cx:42,cz:495,rot:90}},
  face:{name:'마주보기',a:{cx:155,cz:590,rot:0},b:{cx:155,cz:510,rot:180}},
  walls:{name:'양쪽 벽',a:{cx:42,cz:555,rot:90},b:{cx:268,cz:555,rot:270}},
};
document.getElementById('sofaPresets').innerHTML=SOFA_PRESETS.map(p=>`<button type="button" class="btn" data-k="${p.k}">${p.name}</button>`).join('');
document.getElementById('sofaPresets').addEventListener('click',e=>{
  const b=e.target.closest('[data-k]');if(!b)return;const p=SOFA_PRESETS.find(p=>p.k===b.dataset.k);
  commit();
  const types=p.pieces.map(q=>q.type);
  const inLiving=i=>i.lv===0&&(roomOf(bbox(worldRects(i)),0)||{}).id==='living';
  const pool=S.items.filter(i=>(SEAT_TYPES.includes(i.type)||types.includes(i.type))&&inLiving(i));
  const {rot,bx,bz}=sofaAnchor(pool.filter(i=>SEAT_TYPES.includes(i.type)));
  const [c,s]=rotCS({rot});
  const reuse=p.pieces.map(q=>{const n=pool.findIndex(o=>o.type===q.type);return n<0?null:pool.splice(n,1)[0];});
  pool.filter(o=>SEAT_TYPES.includes(o.type)).forEach(o=>{S.items=S.items.filter(i=>i!==o);removeGroup(o.id);});
  const made=[];
  p.pieces.forEach((q,n)=>{
    let it=reuse[n];
    if(!it){
      const twin=made.find(o=>o.type===q.type);
      it=withDefaults({id:newId(q.type),type:q.type,label:newLabel(q.type),lv:0});
      if(twin&&twin.c)it.c=twin.c;
      S.items.push(it);
    }
    Object.assign(it,q.p||{},{rot:(rot+(q.turn||0))%360,lv:0});
    const x=q.x||0,z=q.z!=null?q.z:dims(it)[1]/2;
    it.cx=bx+x*c+z*s;it.cz=bz-x*s+z*c;
    syncItem(it,true);made.push(it);
  });
  setLevel(0);select(made[0].id);
});
document.getElementById('officePresets').innerHTML=Object.entries(OFFICE_PRESETS).map(([k,p])=>`<button type="button" class="btn" data-k="${k}">${p.name}</button>`).join('');
document.getElementById('officePresets').addEventListener('click',e=>{
  const b=e.target.closest('[data-k]');if(!b)return;const p=OFFICE_PRESETS[b.dataset.k];
  commit();
  const desks=S.items.filter(i=>i.type==='desk'&&i.lv===0);
  while(desks.length<2){const it=withDefaults({id:newId('desk'),type:'desk',label:newLabel('desk'),cx:0,cz:0,lv:0});S.items.push(it);desks.push(it);}
  Object.assign(desks[0],p.a);Object.assign(desks[1],p.b);
  syncItem(desks[0],true);syncItem(desks[1],true);setLevel(0);select(desks[0].id);
});
const warnsEl=document.getElementById('warns'),badge=document.getElementById('warnBadge');
function renderWarns(list){
  warnsEl.innerHTML=list.length?list.map(p=>`<li data-sel="${p.id}">${esc(p.msg)}</li>`).join(''):'<li class="ok">겹치거나 벽에 걸리는 가구가 없어요</li>';
  badge.hidden=!list.length;badge.textContent=list.length;
}
warnsEl.addEventListener('click',e=>{const l=e.target.closest('[data-sel]');if(l){select(l.dataset.sel);showTab('furn');}});

/* ---------- panel: save ---------- */
function getSaves(){try{return JSON.parse(localStorage.getItem(LS_SAVES)||'[]');}catch(e){return[];}}
function putSaves(a){try{localStorage.setItem(LS_SAVES,JSON.stringify(a));}catch(e){alert('브라우저 저장 공간이 부족해요. JSON 내보내기를 이용해 주세요.');}}
const saveList=document.getElementById('saveList');
function renderSaves(){
  const a=getSaves();
  saveList.innerHTML=a.length?a.map((s,i)=>`<li><span>${esc(s.name)}<small>${new Date(s.t).toLocaleDateString('ko-KR',{month:'numeric',day:'numeric'})} ${new Date(s.t).toLocaleTimeString('ko-KR',{hour:'2-digit',minute:'2-digit'})}</small></span><button type="button" class="btn" data-load="${i}">불러오기</button><button type="button" class="btn del" data-delsave="${i}" aria-label="${esc(s.name)} 삭제">삭제</button></li>`).join('')
    :'<li class="empty">저장된 배치안이 없어요</li>';
}
document.getElementById('saveForm').addEventListener('submit',e=>{
  e.preventDefault();const inp=document.getElementById('saveName');
  const a=getSaves();const name=inp.value.trim()||`배치안 ${a.length+1}`;
  a.unshift({name,t:Date.now(),data:snapshot()});putSaves(a.slice(0,30));inp.value='';renderSaves();
});
saveList.addEventListener('click',e=>{
  const a=getSaves();const l=e.target.closest('[data-load]'),d=e.target.closest('[data-delsave]');
  if(l){commit();restore(a[+l.dataset.load].data);}
  if(d&&confirm(`'${a[+d.dataset.delsave].name}'을(를) 삭제할까요?`)){a.splice(+d.dataset.delsave,1);putSaves(a);renderSaves();}
});
function download(name,url){const a=document.createElement('a');a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();}
const today=()=>new Date().toISOString().slice(0,10);
document.getElementById('exportBtn').onclick=()=>{
  const url=URL.createObjectURL(new Blob([JSON.stringify(S,null,1)],{type:'application/json'}));
  download(`우리집-배치-${today()}.json`,url);setTimeout(()=>URL.revokeObjectURL(url),2000);
};
document.getElementById('importIn').addEventListener('change',e=>{
  const f=e.target.files[0];if(!f)return;
  f.text().then(t=>{const s=JSON.parse(t);if(!s||!Array.isArray(s.items))throw 0;commit();restore(JSON.stringify(s));})
   .catch(()=>alert('이 파일은 불러올 수 없어요. 이 앱에서 내보낸 JSON인지 확인해 주세요.'));
  e.target.value='';
});
document.getElementById('resetBtn').onclick=()=>{if(confirm('기본 배치와 마감으로 되돌릴까요?')){commit();restore(JSON.stringify(freshState()));}};
function screenshot(){
  const v=selLines.visible;selLines.visible=false;renderer.render(scene,camera);
  download(`우리집-${today()}.png`,canvas.toDataURL('image/png'));selLines.visible=v;
}
document.getElementById('shotBtn').onclick=screenshot;
document.getElementById('shotBtn2').onclick=screenshot;

/* ---------- tabs ---------- */
function showTab(k){
  document.querySelectorAll('[data-tab]').forEach(b=>{b.classList.toggle('on',b.dataset.tab===k);b.setAttribute('aria-selected',b.dataset.tab===k);});
  document.querySelectorAll('.tabpane').forEach(p=>p.hidden=p.id!=='tab-'+k);
  if(k==='save')renderSaves();
}
document.querySelector('.tabs').addEventListener('click',e=>{const b=e.target.closest('[data-tab]');if(b)showTab(b.dataset.tab);});

/* ---------- refresh ---------- */
function refresh(full){
  const list=problems();renderWarns(list);renderPlanItems();updateSelOutline();
  if(full)renderSel();
  else{const m=document.getElementById('metrics');if(m&&sel&&byId(sel))m.innerHTML=metricsHTML(byId(sel));}
  save();
}
function select(id){
  sel=id||null;
  const it=sel&&byId(sel);
  if(it&&it.lv!==level){setLevel(it.lv);sel=id;}
  refresh(true);
}

/* ---------- loop ---------- */
function resize(){const w=stage.clientWidth,h=stage.clientHeight;if(!w||!h)return;renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();}
new ResizeObserver(resize).observe(stage);resize();
let last=performance.now(),plTick=0;
function loop(now){
  const dt=Math.min(.05,(now-last)/1000);last=now;
  if(mode==='walk'){
    const K=k=>keys.has(k);
    const fwd=(K('w')||K('arrowup')?1:0)-(K('s')||K('arrowdown')?1:0)+pad.f;
    const str=(K('d')?1:0)-(K('a')?1:0);
    const turn=(K('arrowleft')||K('q')?1:0)-(K('arrowright')||K('e')?1:0)+pad.t;
    player.yaw+=turn*1.7*dt;
    const sp=150*dt*(K('shift')?1.8:1);
    const fx=-Math.sin(player.yaw),fz=-Math.cos(player.yaw),rx=Math.cos(player.yaw),rz=-Math.sin(player.yaw);
    const dx=(fx*fwd+rx*str)*sp,dz=(fz*fwd+rz*str)*sp;
    if(dx||dz)tryMove(dx,dz);
    if(camera.fov!==72){camera.fov=72;camera.updateProjectionMatrix();}
    camera.position.set(cm(player.x),player.y+1.55,cm(player.z));
    camera.rotation.set(player.pitch,player.yaw,0);
    if(++plTick%3===0){const lv=player.y>1.3?1:0;if(lv!==level)setLevel(lv);renderPlayer();}
  }else{
    if(camera.fov!==50){camera.fov=50;camera.updateProjectionMatrix();}
    const o=orbit,t=o.target;
    t.lerp(o.goal,1-Math.exp(-dt*9));
    camera.position.set(t.x+o.r*Math.sin(o.phi)*Math.sin(o.theta),t.y+o.r*Math.cos(o.phi),t.z+o.r*Math.sin(o.phi)*Math.cos(o.theta));
    camera.lookAt(t);
    processHover();
  }
  renderer.render(scene,camera);
  requestAnimationFrame(loop);
}

/* ---------- boot ---------- */
S.items.forEach(it=>syncItem(it,true));
applyFinish();
setMode('orbit');
renderCatalog();renderDeco();refresh(true);updUndo();
requestAnimationFrame(loop);
