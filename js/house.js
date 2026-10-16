'use strict';
/* The apartment shell: floors, walls, kitchen, stairs, loft and lighting. */
const colliders=[], cutList=[], planWalls=[], planFixed=[], loftList=[], ceilList=[], paintable=[];
// loft floor: 248 room over the bedroom, the landing south of the stairs, the 289 nook (ceiling 113) and the strip by the rail
const LOFT=[[0,0,249,298],[249,190,325,298],[325,190,345,250],[345,42,646,250],[646,232,740,250]];
// walled-off spaces at loft level: over the office, the north strip, the rooms over the bath/storage
const CLOSED=[[345,0,646,42],[646,0,740,232]];
// nothing is built over the office: its slab is only the office ceiling, so the loft view looks down into the room
const OFFICE_TOP=[0,298,325,720];
const LOW_CEIL=[345,42,646,232],LOW_H=1.13;
const RAILS=[[323,250,327,298],[325,248,740,252],[343,42,347,190],[303,188,345,192]];
// U-shaped stair: up the east lane (x 303-345) from the hall, winders at the north end, up the west lane to the loft at z 190
const STAIR={x1:261,xm:303,x2:345,bottom:200,wind:62,top:190};
const ROOMS=[
  {id:'bed',name:'침실',x1:0,z1:0,x2:249,z2:298},
  {id:'office',name:'홈오피스',x1:0,z1:310,x2:310,z2:720},
  {id:'living',name:'거실',x1:325,z1:485,x2:740,z2:720},
];
const ZONES=[{id:'living',name:'거실'},{id:'common',name:'주방·현관'},{id:'bed',name:'침실'},{id:'office',name:'오피스'},{id:'loft',name:'다락'}];
const zoneWallMat={},zoneFloorMat={};
ZONES.forEach(z=>{zoneWallMat[z.id]=M('#f3f2ef',{roughness:.95});zoneFloorMat[z.id]=new THREE.MeshStandardMaterial({roughness:.7});});
const tvMat=new THREE.MeshStandardMaterial({roughness:.3});
const bathMat=new THREE.MeshStandardMaterial({map:marbleT,color:lin('#c3c7c8'),roughness:.5});

const inR=(x,z,r)=>x>=r[0]&&x<=r[2]&&z>=r[1]&&z<=r[3];
const inLoft=(x,z)=>LOFT.some(r=>inR(x,z,r));
function zoneAt(x,z,y){
  if(x<0||x>740||z<0||z>720)return 'out';
  if(y>H1+.01)return x>=325&&z>=250?'living':'loft';
  if(inR(x,z,[0,0,249,298])||inR(x,z,[249,200,303,298]))return 'bed';
  if(inR(x,z,[0,310,310,720]))return 'office';
  if(inR(x,z,[450,0,740,178]))return 'bath';
  if(inR(x,z,[325,485,740,720]))return 'living';
  return 'common';
}

/* ---------- build helpers ---------- */
function box(x1,z1,x2,z2,y0,y1,mat,parent){
  const m=new THREE.Mesh(new THREE.BoxGeometry(cm(x2-x1),y1-y0,cm(z2-z1)),mat);
  m.position.set((x1+x2)/200,(y0+y1)/2,(z1+z2)/200);
  m.castShadow=m.receiveShadow=true;(parent||scene).add(m);return m;
}
// BoxGeometry UVs run 0..1 per face; rescale them to metres so wall textures tile at real size
function meterUV(geo){
  const p=geo.parameters,uv=geo.attributes.uv;
  const size=[[p.depth,p.height],[p.depth,p.height],[p.width,p.depth],[p.width,p.depth],[p.width,p.height],[p.width,p.height]];
  for(let f=0;f<6;f++)for(let i=0;i<4;i++){const k=f*4+i;uv.setXY(k,uv.getX(k)*size[f][0],uv.getY(k)*size[f][1]);}
}
// walls built without an explicit material get per-face paint from the room each face looks into
function wall(x1,z1,x2,z2,y0,y1,mat,o){
  o=o||{};const m=box(x1,z1,x2,z2,y0,y1,mat||wallMat);
  if(!mat||o.over){paintable.push({m,x1,z1,x2,z2,y0,y1,over:o.over||null});meterUV(m.geometry);}
  if(o.collide!==false)colliders.push({x1,z1,x2,z2,y0,y1});
  if(o.cut!==false)cutList.push({m,y0,y1});
  if(o.plan!==false&&y0<1)planWalls.push({x1,z1,x2,z2});
  if(o.shadow===false)m.castShadow=false;
  return m;
}
function plane(x1,z1,x2,z2,y,mat,period){
  const w=cm(x2-x1),d=cm(z2-z1),g=new THREE.PlaneGeometry(w,d);g.rotateX(-Math.PI/2);
  if(period){const uv=g.attributes.uv;for(let i=0;i<uv.count;i++)uv.setXY(i,uv.getX(i)*w/period,uv.getY(i)*d/period);}
  const m=new THREE.Mesh(g,mat);m.position.set(cm(x1)+w/2,y,cm(z1)+d/2);m.receiveShadow=true;scene.add(m);return m;
}
function frame(axis,fixed1,fixed2,d1,d2){
  const t=4,o={collide:false,plan:false};
  if(axis==='x'){wall(d1-t,fixed1-1,d1,fixed2+1,0,2.1,darkMat,o);wall(d2,fixed1-1,d2+t,fixed2+1,0,2.1,darkMat,o);wall(d1-t,fixed1-1,d2+t,fixed2+1,2.1,2.14,darkMat,o);}
  else{wall(fixed1-1,d1-t,fixed2+1,d1,0,2.1,darkMat,o);wall(fixed1-1,d2,fixed2+1,d2+t,0,2.1,darkMat,o);wall(fixed1-1,d1-t,fixed2+1,d2+t,2.1,2.14,darkMat,o);}
}
function wallX(z1,z2,x1,x2,doors){
  let a=x1;doors.forEach(([d1,d2])=>{if(d1>a)wall(a,z1,d1,z2,0,H1);wall(d1,z1,d2,z2,2.14,H1,null,{collide:false,plan:false});frame('x',z1,z2,d1,d2);a=d2;});
  if(a<x2)wall(a,z1,x2,z2,0,H1);
}
function wallZ(x1,x2,z1,z2,doors){
  let a=z1;doors.forEach(([d1,d2])=>{if(d1>a)wall(x1,a,x2,d1,0,H1);wall(x1,d1,x2,d2,2.14,H1,null,{collide:false,plan:false});frame('z',x1,x2,d1,d2);a=d2;});
  if(a<z2)wall(x1,a,x2,z2,0,H1);
}
function fixed(x1,z1,x2,z2,y0,y1,mat,label){const m=box(x1,z1,x2,z2,y0,y1,mat);colliders.push({x1,z1,x2,z2,y0,y1});cutList.push({m,y0,y1});if(label)planFixed.push({x1,z1,x2,z2,label});return m;}
function cutOnly(m,y0,y1){cutList.push({m,y0,y1});return m;}
// parts tied to the roof slab; a height is a plain number (from the floor) or {c} (offset from the ceiling)
let ceilH=H2;
const ceilParts=[];
const ceilY=v=>typeof v==='number'?v:ceilH+v.c;
function onCeil(m,lo,hi){ceilParts.push({m,lo,hi});return m;}
function setCeiling(h){
  ceilH=h;
  ceilParts.forEach(({m,lo,hi})=>{
    const y0=ceilY(lo);
    if(hi==null){m.position.y=y0;return;}
    const y1=ceilY(hi),p=m.geometry.parameters;
    m.geometry.dispose();m.geometry=new THREE.BoxGeometry(p.width,y1-y0,p.depth);meterUV(m.geometry);
    m.position.y=(y0+y1)/2;
    const c=cutList.find(e=>e.m===m);if(c){c.y0=y0;c.y1=y1;}
  });
}
function downlight(x,z,y,list){const m=new THREE.Mesh(new THREE.CylinderGeometry(.045,.045,.012,18),glowMat);m.position.set(cm(x),y,cm(z));scene.add(m);list.push(m);}

/* ---------- floors ---------- */
box(-20,-20,760,738,-.25,0,slabMat);
plane(0,0,740,720,.001,zoneFloorMat.common,1);
plane(0,0,249,298,.003,zoneFloorMat.bed,1);       // 실2 bedroom
plane(249,200,303,298,.003,zoneFloorMat.bed,1);   // 실2 entry nook
plane(0,310,310,720,.003,zoneFloorMat.office,1);  // 실1 office
plane(325,485,740,720,.003,zoneFloorMat.living,1); // living room
plane(462,0,660,178,.003,bathMat,.6);             // bathroom
plane(357,0,450,110,.004,entryMat);               // entrance

/* ---------- exterior shell (split where rooms change so each face can take its room's paint) ---------- */
wall(-20,0,0,304,0,H1);wall(-20,304,0,720,0,H1);
onCeil(wall(-20,0,0,720,H1,H2),H1,{c:0});
wall(-20,-20,255,0,0,H1);wall(255,-20,456,0,0,H1);wall(456,-20,760,0,0,H1);
onCeil(wall(-20,-20,760,0,H1,H2),H1,{c:0});
wall(740,0,760,178,0,H1);wall(740,178,760,485,0,H1);wall(740,485,760,720,0,H1);
onCeil(wall(740,0,760,250,H1,H2),H1,{c:0});onCeil(wall(740,250,760,720,H1,H2),H1,{c:0});
cutOnly(box(370,-2.5,440,.4,0,2.12,doorMat),0,2.12);   // front door
// south glazing, its top 20cm under the ceiling
wall(-20,720,760,738,0,.3,wallMat,{plan:false});
onCeil(wall(-20,720,760,738,5.0,H2,wallMat,{plan:false,collide:false}),{c:-.2},{c:0});
{const g=box(0,724,740,727,.3,5.0,glassMat);g.castShadow=false;cutList.push({m:g,y0:.3,y1:5});onCeil(g,.3,{c:-.2});colliders.push({x1:0,z1:718,x2:740,z2:738,y0:0,y1:H2});}
[0,104,207,310,325,430,535,637,740].forEach(x=>onCeil(wall(x-3,721,x+3,731,.3,5.0,darkMat,{collide:false,plan:false}),.3,{c:-.2}));
[[0,740,.3],[0,740,1.0],[0,740,2.66],[0,740,3.9]].forEach(([a,b,y])=>wall(a,721,b,731,y,y+.05,darkMat,{collide:false,plan:false}));
onCeil(wall(0,721,740,731,4.95,5.0,darkMat,{collide:false,plan:false}),{c:-.25},{c:-.2});

/* ---------- interior walls (ground floor, up to loft slab) ---------- */
// 실2 opens into a small entry nook under the top of the stairs; the door to the hall is at the nook's east end
wall(249,0,261,200,0,H1);                        // 실2 east: 200cm solid run along the stairs
wall(261,190,303,200,0,H1);                      // nook north, under the top of the stairs
wallZ(303,315,200,362,[[205,290]]);              // 실2 door to the hall, hinged at the stair end
wall(0,298,199,310,0,H1);                        // 실2 south = 실1 north (shared)
wall(315,298,325,310,0,H1);                      // hall corner by the office
// 실2 wardrobe on the nook's south side: two full-height light grey doors, recessed into the office's corner
{
  const x0=211,x1=303,top=2.32,doorM=M('#d9d8d4',{roughness:.45}),gapM=M('#2a2826',{roughness:.7}),xm=(x0+x1)/2;
  fixed(x0,300,x1,350,0,top,doorM,'옷장');
  [[x0+1,xm-.4],[xm+.4,x1-1]].forEach(([a,b])=>cutOnly(box(a,298,b,300,.015,top-.01,doorM),.015,top-.01));
  cutOnly(box(xm-.4,298.6,xm+.4,300,.015,top-.01,gapM),.015,top-.01);
  wall(x0,298,x1,350,top,H1,null,{collide:false,plan:false});
  wall(199,298,x0,362,0,H1);
  wall(199,350,315,362,0,H1);
}
wall(310,310,325,392,0,H1);                      // 실1 east + door above the 239cm TV wall
wall(310,392,325,478,2.14,H1,null,{collide:false,plan:false});frame('z',310,325,392,478);
wall(310,478,325,720,0,H1,null,{over:{0:tvMat}}); // TV wall face toward living room
wall(345,0,357,230,0,H1);                        // stair east
wallZ(450,462,0,178,[[100,170]]);                // bath west + door
wall(450,178,740,190,0,H1);                      // bath south
wall(660,0,740,178,0,H1);                        // storage block

// BoxGeometry face order: +x, -x, +y, -y, +z, -z
paintable.forEach(p=>{
  const xm=(p.x1+p.x2)/2,zm=(p.z1+p.z2)/2,ym=(p.y0+p.y1)/2,e=3;
  const pts=[[p.x2+e,zm],[p.x1-e,zm],null,null,[xm,p.z2+e],[xm,p.z1-e]];
  p.m.material=pts.map((pt,i)=>{
    if(p.over&&p.over[i])return p.over[i];
    if(!pt)return wallMat;
    return zoneWallMat[zoneAt(pt[0],pt[1],ym)]||wallMat;
  });
});

/* ---------- bathroom & kitchen ---------- */
fixed(600,4,658,52,0,.85,counterMat);
fixed(480,6,525,70,0,.42,whiteMat);
// U-shaped kitchen: tall units on the bath wall, the sink/hob run on the east wall, the island closing the south side
const seamMat=M('#8c867e',{roughness:.8}),grooveMat=M('#6f6a64',{roughness:.7}),kickMat=M('#7c766f',{roughness:.8});
const pullMat=M('#1d1d1f',{roughness:.4,metalness:.2}),nicheMat=M('#2b2622',{roughness:.6});
// tall units floor to loft slab: two-tier flat doors with long black pulls, a dark open shelf bay second from the hall
{
  const z1=190,z2=250,T=2.6,split=.92,niche=[525,554];
  fixed(462,z1,niche[0],z2,0,T,cabMat,'키큰장');
  fixed(niche[1],z1,680,z2,0,T,cabMat,'키큰장');
  const [a,b]=niche;
  colliders.push({x1:a,z1,x2:b,z2,y0:0,y1:T});planFixed.push({x1:a,z1,x2:b,z2,label:'키큰장'});
  cutOnly(box(a,z1,b,z1+2,0,T,nicheMat),0,T);
  cutOnly(box(a,z1,a+1.8,z2,0,T,nicheMat),0,T);cutOnly(box(b-1.8,z1,b,z2,0,T,nicheMat),0,T);
  cutOnly(box(a,z1,b,z2,0,.08,nicheMat),0,.08);
  [.42,split,1.5,2.05,T-.025].forEach(y=>cutOnly(box(a+1.8,z1+2,b-1.8,z2-.5,y,y+.025,nicheMat),y,y+.025));
  [600,640].forEach(x=>cutOnly(box(x-.15,z2,x+.15,z2+.3,0,T,seamMat),0,T));
  [[462,a],[b,680]].forEach(([x1,x2])=>cutOnly(box(x1,z2,x2,z2+.3,split,split+.005,seamMat),split,split+.005));
  const pull=(x,y0,y1)=>cutOnly(box(x-.7,z2,x+.7,z2+2.4,y0,y1,pullMat),y0,y1);
  [a-3,b+3,637,643].forEach(x=>{pull(x,split+.08,split+1.0);pull(x,.32,split-.07);});
}
// east-wall run: hob on the left, sink under the window-side end, wall units with a slim hood strip
{
  const x1=680,x2=740,z1=190,z2=381;
  fixed(x1,z1,x2,z2,0,.86,[cabMat,cabMat,quartzMat,cabMat,cabMat,cabMat],'주방');
  cutOnly(box(x1-2,z1,x2,z2,.86,.9,quartzMat),.86,.9);
  cutOnly(box(738.5,z1,x2,z2,.9,1.6,new THREE.MeshStandardMaterial({map:backsplashT,roughness:.3})),.9,1.6);
  cutOnly(box(705,z1,x2,365,1.6,2.45,cabMat),1.6,2.45);
  cutOnly(box(703,365,x2,367,.9,2.45,cabMat),.9,2.45);
  cutOnly(box(705,z1,738.5,365,1.59,1.6,glowMat),1.59,1.6);
  cutOnly(box(700,210,738.5,272,1.55,1.6,M('#4a4b4d',{roughness:.4,metalness:.4})),1.55,1.6);
  [250,295,330].forEach(z=>cutOnly(box(704.7,z-.15,705,z+.15,1.6,2.45,seamMat),1.6,2.45));
  cutOnly(box(704.7,z1,705,365,2.05,2.055,seamMat),2.05,2.055);
  cutOnly(box(687,212,733,270,.9,.906,screenMat),.9,.906);
  cutOnly(box(690,298,728,346,.896,.902,M('#9a9c9c',{roughness:.3,metalness:.6})),.896,.902);
  const steel=M('#c9cbcc',{roughness:.25,metalness:.7});
  {const f=new THREE.Mesh(new THREE.CylinderGeometry(.014,.016,.36,12),steel);f.position.set(7.32,1.08,3.22);scene.add(f);cutList.push({m:f,y0:.9,y1:1.26});
   const s=box(712,321,732,323,1.24,1.26,steel);cutList.push({m:s,y0:1.24,y1:1.26});}
  [250,292,340].forEach(z=>cutOnly(box(x1-.3,z-.15,x1,z+.15,.1,.8,seamMat),.1,.8));
  [.32,.56].forEach(y=>cutOnly(box(x1-.3,250,x1,292,y,y+.005,seamMat),y,y+.005));
  cutOnly(box(x1-.2,250,x1,z2,.8,.84,grooveMat),.8,.84);
  cutOnly(box(x1-.2,250,x1+10,z2,0,.1,kickMat),0,.1);
}
// island runs 320cm from the east wall with a 129cm aisle behind it; white quartz top and waterfall end.
// Its west 196cm is open for stools on both sides: a 48cm knee recess toward the living room and another toward
// the kitchen, split by a thin pale grey panel. Then a full-depth block to the wall with the washer on the kitchen side.
const ISLAND_RECESS={x1:424,x2:620,z1:437,z2:485},ISLAND_RECESS_K={x1:424,x2:620,z1:381,z2:429};
fixed(424,ISLAND_RECESS_K.z2,ISLAND_RECESS.x2,ISLAND_RECESS.z1,0,.88,[quartzMat,quartzMat,quartzMat,quartzMat,islandBackMat,islandBackMat],'아일랜드');
fixed(ISLAND_RECESS.x2,381,740,485,0,.88,[quartzMat,quartzMat,quartzMat,quartzMat,quartzMat,cabMat],'아일랜드');
{
  cutOnly(box(424,ISLAND_RECESS_K.z2-1.5,ISLAND_RECESS.x2,ISLAND_RECESS_K.z2,0,.03,quartzMat),0,.03);
  cutOnly(box(620,379.5,680,381,.02,.85,whiteMat),.02,.85);
  cutOnly(box(622,379.3,678,379.5,.74,.82,M('#dfe1e2',{roughness:.3})),.74,.82);
  const ring=new THREE.Mesh(new THREE.CylinderGeometry(.2,.2,.02,32),M('#b9bcbe',{roughness:.3,metalness:.5}));
  ring.rotation.x=Math.PI/2;ring.position.set(6.5,.42,3.785);scene.add(ring);cutList.push({m:ring,y0:.22,y1:.62});
  const glass=new THREE.Mesh(new THREE.CylinderGeometry(.155,.155,.02,32),screenMat);
  glass.rotation.x=Math.PI/2;glass.position.set(6.5,.42,3.78);scene.add(glass);cutList.push({m:glass,y0:.265,y1:.575});
}
cutOnly(box(420,381,424,485,0,.88,quartzMat),0,.88);
colliders.push({x1:420,z1:381,x2:424,z2:485,y0:0,y1:.88});planFixed.push({x1:420,z1:381,x2:424,z2:485,label:'아일랜드'});
cutOnly(box(420,381,740,485,.88,.92,quartzMat),.88,.92);
cutOnly(box(424,437,ISLAND_RECESS.x2,438.5,0,.03,quartzMat),0,.03);
colliders.push({x1:420,z1:381,x2:740,z2:485,y0:.88,y1:.92});
cutOnly(box(660,390,712,428,.919,.926,screenMat),.919,.926);
{const f=new THREE.Mesh(new THREE.CylinderGeometry(.012,.012,.32,10),metalMat);f.position.set(6.86,1.08,3.86);scene.add(f);cutList.push({m:f,y0:.92,y1:1.24});}

/* ---------- stairs: 15 risers; 7 up the east lane, 2 winders, 6 up the west lane ---------- */
{
  const {x1,xm,x2,bottom,wind,top}=STAIR,rh=H1/15,east=(bottom-wind)/7,west=(top-wind)/6;
  for(let i=0;i<7;i++)box(xm,bottom-east*(i+1),x2,bottom-east*i,0,(i+1)*rh,oakMat);
  box(xm,0,x2,wind,0,8*rh,oakMat);box(x1,0,xm,wind,0,9*rh,oakMat);
  for(let j=0;j<6;j++){
    const z0=wind+west*j,z1=z0+west,h=(10+j)*rh;
    box(x1,z0,xm,z1,0,h,oakMat);
    const g=box(xm-2,z0,xm+2,z1,h,h+.9,railGlass);g.castShadow=false;
  }
}

/* ---------- loft ---------- */
LOFT.forEach(([a,b,c,d])=>{loftList.push(box(a,b,c,d,2.6,H1,slabMat));loftList.push(plane(a,b,c,d,H1+.002,zoneFloorMat.loft,1));});
const closedMat=M('#c9c6c0',{roughness:1});
CLOSED.forEach(([a,b,c,d])=>{loftList.push(box(a,b,c,d,2.6,H1,slabMat));loftList.push(plane(a,b,c,d,H1+.002,closedMat));});
{const [a,b,c,d]=OFFICE_TOP;ceilList.push(box(a,b,c,d,2.6,H1,slabMat));}
// loft walls run from the loft floor to the roof
const LOFT_WALLS=[[249,0,261,200],[0,298,325,310],[310,310,325,720],[345,0,357,42],[357,32,646,42],[646,42,658,232],[646,222,740,232]];
LOFT_WALLS.forEach(([a,b,c,d])=>onCeil(wall(a,b,c,d,H1,H2),H1,{c:0}));
// the 289 nook: ceiling 113cm above the loft floor, boxed in up to the roof on its open sides
{
  const [a,b,c,d]=LOW_CEIL,y=H1+LOW_H;
  ceilList.push(box(a+12,b,c,d-10,y,y+.05,wallMat));colliders.push({x1:a+12,z1:b,x2:c,z2:d-10,y0:y,y1:y+.05});
  ceilList.push(onCeil(wall(a,b,a+12,d,y,H2,null,{cut:false}),y,{c:0}));
  ceilList.push(onCeil(wall(a+12,d-10,c,d,y,H2,null,{cut:false}),y,{c:0}));
  downlight(500,130,y-.006,ceilList);
}
function rail(x1,z1,x2,z2){
  const g=box(x1,z1,x2,z2,H1,H1+1.0,railGlass);g.castShadow=false;loftList.push(g);
  const ex=(x2-x1)>(z2-z1);
  loftList.push(box(ex?x1:x1-1,ex?z1-1:z1,ex?x2:x2+1,ex?z2+1:z2,H1+.96,H1+1.05,darkMat));
  loftList.push(box(ex?x1:x1-1,ex?z1-1:z1,ex?x2:x2+1,ex?z2+1:z2,H1,H1+.05,darkMat));
  const a=ex?x1:z1,len=ex?x2-x1:z2-z1,n=Math.max(1,Math.round(len/125));
  for(let i=0;i<=n;i++){const t=a+len*i/n;loftList.push(ex?box(t-2,z1-1,t+2,z2+1,H1,H1+1.0,darkMat):box(x1-1,t-2,x2+1,t+2,H1,H1+1.0,darkMat));}
  colliders.push({x1,z1,x2,z2,y0:H1,y1:H1+1.05});
}
RAILS.forEach(r=>rail(...r));

/* ---------- ceilings & lights ---------- */
ceilList.push(onCeil(box(-20,-20,760,738,H2,H2+.1,slabMat),{c:0},{c:.1}));
const LOW_LIGHTS=[[125,150],[155,555],[400,60],[290,340],[560,90]];
const HIGH_LIGHTS=[[440,470],[600,470],[440,640],[600,640],[700,560],[560,315]];
LOW_LIGHTS.forEach(([x,z])=>downlight(x,z,2.594,inR(x,z,OFFICE_TOP)?ceilList:loftList));
HIGH_LIGHTS.forEach(([x,z])=>{downlight(x,z,H2-.006,ceilList);onCeil(ceilList[ceilList.length-1],{c:-.006});});
const nightLights=[];
LOW_LIGHTS.forEach(([x,z])=>{const l=new THREE.PointLight(lin('#ffd9a8'),0,6,2);l.position.set(cm(x),2.45,cm(z));scene.add(l);nightLights.push(l);});
HIGH_LIGHTS.forEach(([x,z])=>{const l=new THREE.PointLight(lin('#ffd9a8'),0,9,1.6);l.position.set(cm(x),H2-.2,cm(z));scene.add(l);nightLights.push(l);onCeil(l,{c:-.2});});
// loft lights hang under the high ceiling
[[125,150],[290,245]].forEach(([x,z])=>{const l=new THREE.PointLight(lin('#ffd9a8'),0,6,2);l.position.set(cm(x),H2-.3,cm(z));scene.add(l);nightLights.push(l);onCeil(l,{c:-.3});});
{const l=new THREE.PointLight(lin('#ffd9a8'),0,4,2);l.position.set(5.0,H1+LOW_H-.15,1.3);scene.add(l);nightLights.push(l);}

/* ---------- outside view ---------- */
const viewMat=new THREE.MeshBasicMaterial({map:viewT,fog:false,toneMapped:false});
const groundMat=new THREE.MeshBasicMaterial({color:lin('#93a189')});
{const m=new THREE.Mesh(new THREE.PlaneGeometry(66,31),viewMat);m.rotation.y=Math.PI;m.position.set(3.7,3.5,24);scene.add(m);
 const gnd=new THREE.Mesh(new THREE.PlaneGeometry(200,200),groundMat);gnd.rotation.x=-Math.PI/2;gnd.position.set(3.7,-24,10);scene.add(gnd);}

/* ---------- sun & sky ---------- */
const hemi=new THREE.HemisphereLight(lin('#f4f7f9'),lin('#c7bdad'),.95);scene.add(hemi);
const amb=new THREE.AmbientLight(0xffffff,.12);scene.add(amb);
const sun=new THREE.DirectionalLight(lin('#fff3e2'),1.35);
sun.position.set(6.5,9.5,16);sun.target.position.set(3.7,0,3.6);
sun.castShadow=true;sun.shadow.mapSize.set(1536,1536);
Object.assign(sun.shadow.camera,{left:-8,right:8,top:8,bottom:-8,near:1,far:40});
sun.shadow.bias=-.0006;scene.add(sun);scene.add(sun.target);

// outer shell: anything reaching past the 740 x 720 footprint (exterior walls, glazing, front door)
cutList.forEach(e=>{
  const p=e.m.geometry.parameters,b=e.m.position;if(p.width==null)return;
  e.outer=b.x-p.width/2<-.001||b.z-p.depth/2<-.001||b.x+p.width/2>7.401||b.z+p.depth/2>7.201;
});

// the south glazing, split where the office/living wall meets it
const WINDOW_SPANS=[{x1:0,z1:718,x2:310,z2:738},{x1:325,z1:718,x2:740,z2:738}];
// hard obstacles per level, for placement checks
const EXT_WALLS=planWalls.filter(w=>w.x1<0||w.z1<0||w.x2>740||w.z2>720);
function hardList(lv){
  if(lv===1)return[...EXT_WALLS.map(w=>({...w,label:'벽'})),...LOFT_WALLS.map(([x1,z1,x2,z2])=>({x1,z1,x2,z2,label:'벽'})),...RAILS.map(([x1,z1,x2,z2])=>({x1,z1,x2,z2,label:'난간'}))];
  return[...planWalls.map(w=>({...w,label:'벽'})),...planFixed,{x1:261,z1:0,x2:345,z2:STAIR.bottom,label:'계단'},{x1:-20,z1:718,x2:760,z2:740,label:'창'}];
}
