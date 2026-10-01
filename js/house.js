'use strict';
/* The apartment shell: floors, walls, kitchen, stairs, loft and lighting. */
const colliders=[], cutList=[], planWalls=[], planFixed=[], loftList=[], ceilList=[], paintable=[];
const LOFT=[[0,0,261,720],[261,230,325,720],[345,0,740,250],[325,230,345,250],[261,0,345,20]];
const RAILS=[[323,250,327,720],[325,248,740,252],[343,20,347,230],[257,20,261,230],[261,228,345,232]];
const ROOMS=[
  {id:'bed',name:'침실',x1:0,z1:0,x2:249,z2:298},
  {id:'office',name:'홈오피스',x1:0,z1:310,x2:310,z2:720},
  {id:'living',name:'거실',x1:325,z1:485,x2:740,z2:720},
];
const ZONES=[{id:'common',name:'거실·주방'},{id:'bed',name:'침실'},{id:'office',name:'오피스'},{id:'loft',name:'다락'}];
const zoneWallMat={},zoneFloorMat={};
ZONES.forEach(z=>{zoneWallMat[z.id]=M('#f3f2ef',{roughness:.95});zoneFloorMat[z.id]=new THREE.MeshStandardMaterial({roughness:.7});});
const tvMat=new THREE.MeshStandardMaterial({roughness:.3});
const bathMat=new THREE.MeshStandardMaterial({map:marbleT,color:lin('#c3c7c8'),roughness:.5});

const inR=(x,z,r)=>x>=r[0]&&x<=r[2]&&z>=r[1]&&z<=r[3];
const inLoft=(x,z)=>LOFT.some(r=>inR(x,z,r));
function zoneAt(x,z,y){
  if(x<0||x>740||z<0||z>720)return 'out';
  if(y>H1+.01)return inLoft(x,z)?'loft':'common';
  if(inR(x,z,[0,0,249,298]))return 'bed';
  if(inR(x,z,[0,310,310,720]))return 'office';
  if(inR(x,z,[450,0,740,178]))return 'bath';
  return 'common';
}

/* ---------- build helpers ---------- */
function box(x1,z1,x2,z2,y0,y1,mat,parent){
  const m=new THREE.Mesh(new THREE.BoxGeometry(cm(x2-x1),y1-y0,cm(z2-z1)),mat);
  m.position.set((x1+x2)/200,(y0+y1)/2,(z1+z2)/200);
  m.castShadow=m.receiveShadow=true;(parent||scene).add(m);return m;
}
// walls built without an explicit material get per-face paint from the room each face looks into
function wall(x1,z1,x2,z2,y0,y1,mat,o){
  o=o||{};const m=box(x1,z1,x2,z2,y0,y1,mat||wallMat);
  if(!mat||o.over)paintable.push({m,x1,z1,x2,z2,y0,y1,over:o.over||null});
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
function downlight(x,z,y,list){const m=new THREE.Mesh(new THREE.CylinderGeometry(.045,.045,.012,18),glowMat);m.position.set(cm(x),y,cm(z));scene.add(m);list.push(m);}

/* ---------- floors ---------- */
box(-20,-20,760,738,-.25,0,slabMat);
plane(0,0,740,720,.001,zoneFloorMat.common,1);
plane(0,0,249,298,.003,zoneFloorMat.bed,1);       // 실2 bedroom
plane(0,310,310,720,.003,zoneFloorMat.office,1);  // 실1 office
plane(462,0,660,178,.003,bathMat,.6);             // bathroom
plane(357,0,450,110,.004,entryMat);               // entrance

/* ---------- exterior shell (split where rooms change so each face can take its room's paint) ---------- */
wall(-20,0,0,304,0,H1);wall(-20,304,0,720,0,H1);
wall(-20,0,0,720,H1,H2);
wall(-20,-20,255,0,0,H1);wall(255,-20,456,0,0,H1);wall(456,-20,760,0,0,H1);
wall(-20,-20,760,0,H1,H2);
wall(740,0,760,178,0,H1);wall(740,178,760,720,0,H1);
wall(740,0,760,250,H1,H2);wall(740,250,760,720,H1,H2);
cutOnly(box(370,-2.5,440,.4,0,2.12,doorMat),0,2.12);   // front door
// south glazing
wall(-20,720,760,738,0,.3,wallMat,{plan:false});
wall(-20,720,760,738,5.0,H2,wallMat,{plan:false,collide:false});
{const g=box(0,724,740,727,.3,5.0,glassMat);g.castShadow=false;cutList.push({m:g,y0:.3,y1:5});colliders.push({x1:0,z1:718,x2:740,z2:738,y0:0,y1:H2});}
[0,104,207,310,325,430,535,637,740].forEach(x=>wall(x-3,721,x+3,731,.3,5.0,darkMat,{collide:false,plan:false}));
[[0,740,.3],[0,740,1.0],[0,740,2.66],[0,740,3.9],[0,740,4.95]].forEach(([a,b,y])=>wall(a,721,b,731,y,y+.05,darkMat,{collide:false,plan:false}));

/* ---------- interior walls (ground floor, up to loft slab) ---------- */
wallZ(249,261,0,298,[[218,296]]);                // 실2 east + door (below the 200cm wall run)
wall(0,298,261,310,0,H1);                        // 실2 south = 실1 north (shared)
wall(261,298,325,310,0,H1);                      // 실1 north, under the stairs hall
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
fixed(462,190,680,250,0,.86,cabMat,'주방');
cutOnly(box(462,190,680,252,.86,.9,counterMat),.86,.9);
cutOnly(box(462,190,680,191.5,.9,1.5,new THREE.MeshStandardMaterial({map:marbleT,roughness:.3})),.9,1.5);
cutOnly(box(462,190,680,225,1.6,2.45,cabMat),1.6,2.45);
fixed(680,190,740,260,0,2.3,cabMat,'냉장고');
cutOnly(box(492,200,552,244,.9,.906,screenMat),.9,.906);
cutOnly(box(600,250,658,253,.08,.84,whiteMat),.08,.84);
{const drum=new THREE.Mesh(new THREE.CylinderGeometry(.19,.19,.02,32),screenMat);drum.rotation.x=Math.PI/2;drum.position.set(6.29,.5,2.535);scene.add(drum);cutList.push({m:drum,y0:.31,y1:.69});}
// island runs 320cm from the east wall; 129cm aisle behind it, the counter overhangs 40cm toward the living room
fixed(424,381,740,445,0,.88,cabMat,'아일랜드');
cutOnly(box(420,381,424,485,0,.88,counterMat),0,.88);
colliders.push({x1:420,z1:381,x2:424,z2:485,y0:0,y1:.88});planFixed.push({x1:420,z1:381,x2:424,z2:485,label:'아일랜드'});
cutOnly(box(420,381,740,485,.88,.92,counterMat),.88,.92);
colliders.push({x1:420,z1:381,x2:740,z2:485,y0:.88,y1:.92});
cutOnly(box(660,390,712,428,.919,.926,screenMat),.919,.926);
{const f=new THREE.Mesh(new THREE.CylinderGeometry(.012,.012,.32,10),metalMat);f.position.set(6.86,1.08,3.86);scene.add(f);cutList.push({m:f,y0:.92,y1:1.24});}

/* ---------- stairs: 14 risers from the hall (z 230) up to the loft (z 20) ---------- */
for(let i=0;i<14;i++){box(261,230-(i+1)*15,345,230-i*15,0,(i+1)*H1/14,oakMat);}

/* ---------- loft ---------- */
LOFT.forEach(([a,b,c,d])=>{loftList.push(box(a,b,c,d,2.6,H1,slabMat));loftList.push(plane(a,b,c,d,H1+.002,zoneFloorMat.loft,1));});
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
ceilList.push(box(-20,-20,760,738,H2,H2+.1,slabMat));
const LOW_LIGHTS=[[125,150],[155,555],[400,60],[560,215],[290,340],[560,90]];
const HIGH_LIGHTS=[[440,470],[600,470],[440,640],[600,640],[700,560]];
LOW_LIGHTS.forEach(([x,z])=>downlight(x,z,2.594,loftList));
HIGH_LIGHTS.forEach(([x,z])=>downlight(x,z,H2-.006,ceilList));
const nightLights=[];
LOW_LIGHTS.forEach(([x,z])=>{const l=new THREE.PointLight(lin('#ffd9a8'),0,6,2);l.position.set(cm(x),2.45,cm(z));scene.add(l);nightLights.push(l);});
HIGH_LIGHTS.forEach(([x,z])=>{const l=new THREE.PointLight(lin('#ffd9a8'),0,9,1.6);l.position.set(cm(x),H2-.2,cm(z));scene.add(l);nightLights.push(l);});
// loft lights hang under the high ceiling
[[130,200],[130,560],[540,120]].forEach(([x,z])=>{const l=new THREE.PointLight(lin('#ffd9a8'),0,6,2);l.position.set(cm(x),H2-.3,cm(z));scene.add(l);nightLights.push(l);});

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

// the south glazing, split where the office/living wall meets it
const WINDOW_SPANS=[{x1:0,z1:718,x2:310,z2:738},{x1:325,z1:718,x2:740,z2:738}];
// hard obstacles per level, for placement checks
const EXT_WALLS=planWalls.filter(w=>w.x1<0||w.z1<0||w.x2>740||w.z2>720);
function hardList(lv){
  if(lv===1)return[...EXT_WALLS.map(w=>({...w,label:'벽'})),...RAILS.map(([x1,z1,x2,z2])=>({x1,z1,x2,z2,label:'난간'}))];
  return[...planWalls.map(w=>({...w,label:'벽'})),...planFixed,{x1:261,z1:20,x2:345,z2:230,label:'계단'},{x1:-20,z1:718,x2:760,z2:740,label:'창'}];
}
