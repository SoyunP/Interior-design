'use strict';
/* Furniture catalog. Each builder works in metres around the item centre; local -z is the back, +z the front. */
const PAL={
  fabric:[['#e6dfd1','아이보리'],['#d2c8b7','베이지'],['#aaa49b','웜 그레이'],['#73777c','그레이'],['#7b7772','피나클 그레이'],['#a9a396','그레이지'],['#3d4045','차콜'],
    ['#8d9c86','세이지'],['#5d7186','블루'],['#b5806a','테라코타'],['#c9a663','머스타드'],['#8a644b','코냑 레더'],['#7a4631','브라운 레더'],['#cf8f93','더스티 핑크'],['#e0786c','코랄']],
  wood:[['#e2d0b2','화이트 오크'],['#c4a47c','오크'],['#a37a52','내추럴'],['#6c4e37','월넛'],['#2f2c2a','블랙'],['#f1efea','화이트']],
  top:[['#e2ddd4','라이트 그레이'],['#f1efea','화이트'],['#e2d0b2','화이트 오크'],['#c4a47c','오크'],['#6c4e37','월넛'],['#2f2c2a','블랙']],
  chair:[['#3f4347','차콜'],['#e6dfd1','아이보리'],['#aaa49b','웜 그레이'],['#8d9c86','세이지'],['#5d7186','블루'],['#b5806a','테라코타'],['#8a644b','코냑 레더']],
  bedding:[['#f5f3ee','화이트'],['#d8cfc0','린넨'],['#b8c3c5','블루 그레이'],['#9aa58f','세이지'],['#73777c','그레이'],['#c9a99a','로즈'],['#d9b26f','머스타드']],
  rug:[['#bdb4a6','오트밀'],['#8f7d66','토프'],['#dcd5c8','크림'],['#8f8a82','그레이'],['#5b6670','슬레이트'],['#b48a6e','테라코타'],['#7f8a6c','올리브'],['#3d4045','차콜']],
  pot:[['#e9e6df','화이트'],['#b98b6a','테라코타'],['#4a4a4a','블랙'],['#a8a196','스톤'],['#c4a47c','라탄']],
  art:[['#d9a77f','선셋'],['#8fa3a8','오션'],['#a7b08e','포레스트'],['#2f3237','모노'],['#e3c66f','옐로'],['#c98f8f','로즈']],
  curtain:[['#efe9de','린넨 화이트'],['#d8cfc0','베이지'],['#aaa49b','웜 그레이'],['#73777c','그레이'],['#8d9c86','세이지'],['#5d7186','블루']],
  shade:[['#f3e6cc','린넨'],['#ffffff','화이트'],['#e8cfa6','앰버'],['#cfd6d0','민트 그레이']],
};
const CATS=[['living','거실'],['bedroom','침실'],['work','오피스·수납'],['dining','다이닝'],['deco','데코 / 다락']];
const STYLES=[
  {k:'natural',name:'내추럴 우드',desc:'따뜻한 오크와 베이지',walls:'#efe8dc',tv:'oakSlat',fabric:'#d2c8b7',wood:'#c4a47c',top:'#c4a47c',chair:'#e6dfd1',rug:'#bdb4a6',bedding:'#d8cfc0',pot:'#b98b6a',curtain:'#efe9de',art:'#a7b08e',shade:'#f3e6cc'},
  {k:'japandi',name:'재팬디',desc:'밝은 나무와 아이보리',walls:'#e2dbcf',tv:'oakSlat',fabric:'#e6dfd1',wood:'#e2d0b2',top:'#e2d0b2',chair:'#aaa49b',rug:'#dcd5c8',bedding:'#f5f3ee',pot:'#a8a196',curtain:'#efe9de',art:'#8fa3a8',shade:'#ffffff'},
  {k:'mono',name:'모던 모노',desc:'블랙, 차콜, 화이트',walls:'#f3f2ef',tv:'charcoal',fabric:'#3d4045',wood:'#2f2c2a',top:'#f1efea',chair:'#3f4347',rug:'#8f8a82',bedding:'#73777c',pot:'#4a4a4a',curtain:'#aaa49b',art:'#2f3237',shade:'#ffffff'},
  {k:'mid',name:'미드센추리',desc:'월넛과 머스타드',walls:'#efe8dc',tv:'walnutSlat',fabric:'#c9a663',wood:'#6c4e37',top:'#6c4e37',chair:'#b5806a',rug:'#b48a6e',bedding:'#9aa58f',pot:'#b98b6a',curtain:'#d8cfc0',art:'#d9a77f',shade:'#e8cfa6'},
];

/* ---------- mesh helpers ---------- */
function add(g,w,h,d,mat,x,y0,z){const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat);m.position.set(x,y0+h/2,z);m.castShadow=m.receiveShadow=true;g.add(m);return m;}
function cyl(g,rt,rb,h,mat,x,y0,z,seg){const m=new THREE.Mesh(new THREE.CylinderGeometry(rt,rb,h,seg||28),mat);m.position.set(x,y0+h/2,z);m.castShadow=m.receiveShadow=true;g.add(m);return m;}
// box with edges rounded to radius r; puff bulges the face centres outward like a stuffed cushion
function softGeo(w,h,d,r,puff){
  const k=4,n=2*k+1,g=new THREE.BoxGeometry(1,1,1,n,n,n),p=g.attributes.position,hs=[w/2,h/2,d/2];
  r=Math.min(r,...hs);
  const c=[0,0,0],q=[0,0,0];
  for(let i=0;i<p.count;i++){
    const u0=[p.getX(i),p.getY(i),p.getZ(i)];
    for(let a=0;a<3;a++){
      const j=Math.round((u0[a]+.5)*n),H=hs[a];
      c[a]=j<=k?-H+r*j/k:H-r*(n-j)/k;
      q[a]=Math.max(r-H,Math.min(H-r,c[a]));
    }
    const dx=c[0]-q[0],dy=c[1]-q[1],dz=c[2]-q[2],l=Math.hypot(dx,dy,dz)||1;
    let x=q[0]+dx/l*r,y=q[1]+dy/l*r,z=q[2]+dz/l*r;
    if(puff){
      const u=x/hs[0],v=y/hs[1],t=z/hs[2];
      x+=Math.sign(x)*puff*.5*(1-v*v)*(1-t*t);
      y+=Math.sign(y)*puff*(1-u*u)*(1-t*t);
      z+=Math.sign(z)*puff*.7*(1-u*u)*(1-v*v);
    }
    p.setXYZ(i,x,y,z);
  }
  g.computeVertexNormals();return g;
}
function tileUV(m,sx,sy){const uv=m.geometry.attributes.uv;for(let i=0;i<uv.count;i++)uv.setXY(i,uv.getX(i)*sx,uv.getY(i)*sy);return m;}
function soft(g,w,h,d,mat,x,y0,z,r,puff){const m=new THREE.Mesh(softGeo(w,h,d,r,puff),mat);m.position.set(x,y0+h/2,z);m.castShadow=m.receiveShadow=true;g.add(m);return m;}
// soft box whose ends curve forward by bend (+z) and rise by lift, like a folded cushion roll
function bentSoft(g,w,h,d,mat,x,y0,z,r,puff,bend,lift){
  const m=soft(g,w,h,d,mat,x,y0,z,r,puff),p=m.geometry.attributes.position;
  for(let i=0;i<p.count;i++){const u=p.getX(i)/(w/2),u2=u*u;p.setZ(i,p.getZ(i)+bend*u2);p.setY(i,p.getY(i)+lift*u2*u2);}
  m.geometry.computeVertexNormals();return m;
}
// lumpy fabric: displaces the upper and side surfaces with a few seeded waves
function wrinkle(m,amp,r){
  const p=m.geometry.attributes.position,a=r()*6,b=r()*6,c=r()*6;
  for(let i=0;i<p.count;i++){
    const x=p.getX(i),y=p.getY(i),z=p.getZ(i);if(y<0)continue;
    const n=Math.sin(x*7+a)*Math.sin(z*4.3+b)+.6*Math.sin(x*17+z*9+c);
    p.setY(i,y+amp*n);p.setX(i,x+amp*.5*n*Math.sign(x));
  }
  m.geometry.computeVertexNormals();return m;
}
// duvet thrown over a mattress of width mw, from zHead to the foot edge zFoot: a puffy top that rolls over
// the side and foot edges and hangs down past the frame by hang, with loose folds on the drop and a lower corner
function duvetGeo(mw,zHead,zFoot,top,hang,r){
  const rr=.07,arc=Math.PI*rr/2,ax=mw/2,az=zFoot-zHead,sx=ax+arc+hang,sz=az+arc+hang;
  const geo=new THREE.PlaneGeometry(1,1,96,72),p=geo.attributes.position,uv=geo.attributes.uv;
  // arc length t from the flat start -> [horizontal offset, drop below the top]
  const prof=(t,a)=>{
    if(t<=a)return[t,0];
    if(t<=a+arc){const th=(t-a)/rr;return[a+rr*Math.sin(th),rr-rr*Math.cos(th)];}
    const h=t-a-arc;return[a+rr+.18*h*h,rr+h];
  };
  const ph=[0,1,2,3,4].map(()=>r()*6);
  for(let i=0;i<p.count;i++){
    const u=p.getX(i)+.5,v=.5-p.getY(i),tx=(2*u-1)*sx,tz=v*sz,sg=Math.sign(tx)||1;
    const [ox,dx]=prof(Math.abs(tx),ax),[oz,dz]=prof(tz,az);
    let x=sg*ox,z=zHead+oz;
    const hx=Math.max(0,dx-rr)/hang,hz=Math.max(0,dz-rr)/hang;
    x+=sg*.03*hx*Math.sin(z*8+ph[0]);z+=.03*hz*Math.sin(x*8+ph[1]);
    const fx=Math.min(1,Math.abs(tx)/ax),fz=Math.min(1,tz/az);
    let y=top-Math.max(dx,dz)-.45*Math.min(dx,dz);
    y+=.03*(1-fx*fx)*Math.min(1,tz/.2)*(1-fz*fz*fz);
    y+=.007*(Math.sin(x*7+ph[2])*Math.sin(z*4.3+ph[3])+.6*Math.sin(x*17+z*9+ph[4]))*(1-.6*Math.max(hx,hz));
    p.setXYZ(i,x,Math.max(.02,y),z);uv.setXY(i,u,1-v);
  }
  geo.computeVertexNormals();return geo;
}
const _cordMat={};let _cordTex=null;
function cordMat(c){
  if(!_cordMat[c]){
    if(!_cordTex){_cordTex=corduroyTexture();_cordTex.repeat.set(16,6);}
    _cordMat[c]=new THREE.MeshStandardMaterial({color:lin(c),map:_cordTex,bumpMap:_cordTex,bumpScale:.015,roughness:.95});
  }
  return _cordMat[c];
}
const emissiveMats=new Set();
let lampGlow=.6;
function shadeMat(c){
  const k='lamp|'+c;let m=MAT_CACHE.get(k);
  if(!m){m=new THREE.MeshStandardMaterial({color:lin(c),emissive:lin('#ffdca0'),emissiveIntensity:lampGlow,roughness:1});MAT_CACHE.set(k,m);emissiveMats.add(m);}
  return m;
}
// washi lantern: fine horizontal ribs and a few vertical seams, glowing with the lamp mood
let _paperMat=null;
function paperLanternMat(){
  if(!_paperMat){
    const t=canvasTex(256,256,(g,s)=>{
      g.fillStyle='#ffffff';g.fillRect(0,0,s,s);
      for(let y=0;y<s;y+=5){g.fillStyle=`rgba(170,150,120,${.18+rnd()*.1})`;g.fillRect(0,y,s,1);}
      for(let x=0;x<s;x+=s/6){g.fillStyle='rgba(150,128,100,.35)';g.fillRect(x,0,2,s);}
    },true);
    _paperMat=new THREE.MeshStandardMaterial({color:lin('#f6efe2'),map:t,emissive:lin('#ffd9a0'),emissiveMap:t,emissiveIntensity:lampGlow,roughness:1,side:THREE.DoubleSide});
    emissiveMats.add(_paperMat);
  }
  return _paperMat;
}
// rattan cane: woven strands with round see-through holes
let _caneMat=null;
function caneMat(){
  if(!_caneMat){
    const t=canvasTex(128,128,(g,s)=>{
      g.fillStyle='#dcc392';g.fillRect(0,0,s,s);
      g.strokeStyle='rgba(150,115,60,.35)';g.lineWidth=1;
      for(let i=-s;i<s*2;i+=8){g.beginPath();g.moveTo(i,0);g.lineTo(i+s,s);g.stroke();g.beginPath();g.moveTo(i,0);g.lineTo(i-s,s);g.stroke();}
      g.globalCompositeOperation='destination-out';
      for(let y=8;y<s;y+=16)for(let x=8;x<s;x+=16){g.beginPath();g.arc(x,y,4.5,0,Math.PI*2);g.fill();}
      g.globalCompositeOperation='source-over';
    },true);
    t.repeat.set(4.5,1.7);
    _caneMat=new THREE.MeshStandardMaterial({map:t,alphaTest:.5,side:THREE.DoubleSide,roughness:.8});
  }
  return _caneMat;
}
const BESTA_COLORS=[['#2f2a26','블랙브라운'],['#f2f1ee','화이트'],['#4b4e50','다크 그레이'],['#5e6e65','그레이그린'],
  ['#d7ccb4','베이지'],['#cdc4b6','그레이지'],['#6b4a33','월넛'],['#3f3a2c','다크 올리브']];
// oak veneer laid in a chevron: strips lean one way on the left half and the other way on the right
let _chevronMat=null;
function chevronMat(){
  if(!_chevronMat){
    const t=canvasTex(256,160,(g,w,h)=>{
      for(const side of [0,1]){
        g.save();g.beginPath();g.rect(side*w/2,0,w/2,h);g.clip();
        g.translate(w/2,h/2);g.rotate(side?Math.PI/4:-Math.PI/4);
        for(let i=-200;i<200;i+=14){
          g.fillStyle=`hsl(${28+rnd()*6},${42+rnd()*10}%,${52+rnd()*10}%)`;g.fillRect(i,-200,14,400);
          g.fillStyle='rgba(80,50,25,.25)';g.fillRect(i,-200,1,400);
          for(let k=0;k<4;k++){g.fillStyle=`rgba(90,58,30,${.05+rnd()*.08})`;g.fillRect(i+2+rnd()*10,-200,1,400);}
        }
        g.restore();
      }
      g.fillStyle='rgba(60,40,20,.35)';g.fillRect(w/2-.5,0,1,h);
    });
    _chevronMat=new THREE.MeshStandardMaterial({map:t,roughness:.55});
  }
  return _chevronMat;
}
// thin cylinder between two points
function rod(g,a,b,r,mat){
  const d=new THREE.Vector3().subVectors(b,a),m=new THREE.Mesh(new THREE.CylinderGeometry(r,r,d.length(),8),mat);
  m.position.copy(a).addScaledVector(d,.5);m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),d.normalize());
  m.castShadow=true;g.add(m);return m;
}
const mirrorMat=MC('#d9e2e6',.08,{metalness:.6});
const BOOKS=['#8a644b','#5d7186','#c9a663','#b5806a','#e6dfd1','#3d4045','#8d9c86','#a9806a','#d8cfc0','#6f7378'];
const GREENS=['#5e7d4c','#6f8f58','#4f6d42','#7c9a62','#587a46'];
const PLANT={s:{d:35,h:.75,pot:.28},m:{d:50,h:1.2,pot:.38},l:{d:70,h:1.8,pot:.48}};
function rugSize(it){if(it.size==='custom')return[it.rw,it.rd];if(it.size[0]==='r'){const d=+it.size.slice(1);return[d,d];}const [w,d]=it.size.split('x').map(Number);return[w,d];}
const DINING={4:[1.4,.8],6:[1.8,.9]};
// the full-height curtain hangs from just under the double-height ceiling
const curtainH=it=>it.ht>4?ceilH-.3:it.ht;

function chairAt(g,x,z,face,seat,leg){
  // face: +1 sits looking toward -z (table at -z), -1 the other way
  add(g,.44,.04,.42,seat,x,.44,z);
  add(g,.44,.42,.035,seat,x,.48,z+face*.2);
  [[-.19,-.18],[.19,-.18],[-.19,.18],[.19,.18]].forEach(([a,b])=>add(g,.03,.44,.03,leg,x+a,0,z+b));
}

const TYPES={
  /* ----- 거실 ----- */
  sofa:{label:'소파',cat:'living',hidden:true,desc:'코너형 · 일자형',need:40,
    defaults:{L:270,C:180,D:95,side:1,c:'#e6dfd1'},
    dims:it=>[it.L,it.C>it.D?it.C:it.D],
    slots:[{k:'c',role:'fabric',label:'패브릭'}],
    sliders:[{k:'L',label:'긴 쪽',min:180,max:320,step:5},{k:'C',label:'코너 쪽',min:0,max:240,step:5},{k:'D',label:'깊이',min:80,max:110,step:1}],
    opts:[{k:'side',label:'코너 방향',choices:[[1,'기본'],[-1,'반대쪽']]}],
    build(it,g){
      const fabMat=MC(it.c,1),fabLight=MC(shade(it.c,.15),1);
      const L=cm(it.L),D=cm(it.D),leg=it.C>it.D,C=leg?cm(it.C):D,s=it.side,z0=-C/2,B=.2,A=.18;
      const X=x=>x*s;
      add(g,L,.24,D,fabMat,0,.05,z0+D/2);
      add(g,L,.82,B,fabMat,0,.05,z0+B/2);
      add(g,A,.6,D,fabMat,X(-L/2+A/2),.05,z0+D/2);
      let seatEnd=L/2-A;
      if(leg){
        add(g,D,.24,C-D,fabMat,X(L/2-D/2),.05,z0+D+(C-D)/2);
        add(g,B,.82,C,fabMat,X(L/2-B/2),.05,z0+C/2);
        add(g,D-B,.6,A,fabMat,X(L/2-B-(D-B)/2),.05,z0+C-A/2);
        seatEnd=L/2-B;
        add(g,D-B-.02,.13,C-D-A-.01,fabLight,X(L/2-B-(D-B)/2),.29,z0+D+(C-D-A)/2);
        const nb=Math.max(1,Math.round((C-A)/0.85)),segL=(C-A-B)/nb;
        for(let i=0;i<nb;i++)add(g,.16,.44,segL-.03,fabLight,X(L/2-B-.08),.42,z0+B+segL*(i+.5));
      }else{
        add(g,A,.6,D,fabMat,X(L/2-A/2),.05,z0+D/2);
      }
      const x1=-L/2+A,x2=seatEnd,len=x2-x1,n=Math.max(2,Math.round(len/.85)),seg=len/n;
      for(let i=0;i<n;i++){
        add(g,seg-.02,.13,D-B-.02,fabLight,X(x1+seg*(i+.5)),.29,z0+B+(D-B)/2);
        add(g,seg-.03,.44,.16,fabLight,X(x1+seg*(i+.5)),.42,z0+B+.08);
      }
      [[-L/2+.06,z0+.06],[L/2-.06,z0+.06],[-L/2+.06,z0+D-.06],[L/2-.06,z0+(leg?C:D)-.06]].forEach(([x,z])=>add(g,.05,.05,.05,metalMat,X(x),0,z));
    }},
  pinnacle:{label:'피나클 리클라이너',cat:'living',hidden:true,desc:'라즈보이 · 207 × 97 · 3인',need:40,
    defaults:{recl:0,c:'#7b7772'},
    dims:it=>[207,it.recl?169:97],
    slots:[{k:'c',role:'fabric',label:'가죽'}],
    opts:[{k:'recl',label:'리클라이너',choices:[[0,'접힘'],[1,'펼침 (깊이 169)']]}],
    build(it,g){
      // La-Z-Boy Pinnacle wall reclining sofa: 81.5"W x 38"D x 41"H, 66.5" deep with both end legrests up
      const f=MC(it.c,.6),fl=MC(shade(it.c,.1),.6),fd=MC(shade(it.c,-.2),.7),btn=MC('#3b3a38',.4);
      const W=2.07,BD=.97,A=.22,z0=-(it.recl?1.69:BD)/2,zf=z0+BD,SW=W-2*A,seg=SW/3;
      add(g,W-.06,.06,BD-.08,fd,0,0,z0+BD/2);
      add(g,SW+.02,.78,.2,f,0,.06,z0+.1);
      for(const sx of [-1,1]){
        const xa=sx*(W/2-A/2);
        add(g,A,.46,BD-.04,f,xa,.06,z0+.02+(BD-.04)/2);
        const roll=cyl(g,.1,.1,BD-.12,f,0,0,0,20);roll.rotation.x=Math.PI/2;roll.position.set(xa+sx*.01,.52,z0+.06+(BD-.12)/2);
        const cap=cyl(g,.075,.075,.02,fl,0,0,0,20);cap.rotation.x=Math.PI/2;cap.position.set(xa+sx*.01,.52,zf-.05);
        add(g,.01,.07,.13,btn,sx*(W/2+.003),.3,zf-.26);
      }
      for(let i=0;i<3;i++){
        const x=-SW/2+seg*(i+.5);
        add(g,seg-.015,.32,BD-.22,f,x,.06,z0+.2+(BD-.22)/2);
        add(g,seg-.05,.008,.006,fd,x,.22,zf-.017);
        add(g,seg-.03,.12,BD-.28,fl,x,.38,z0+.26+(BD-.28)/2);
        add(g,seg-.03,.3,.18,fl,x,.5,z0+.28);
        add(g,seg-.03,.15,.2,fl,x,.8,z0+.2);
        const top=cyl(g,.09,.09,seg-.04,fl,0,0,0,20);top.rotation.z=Math.PI/2;top.position.set(x,.95,z0+.2);
        if(it.recl&&i!==1){
          add(g,seg-.05,.08,.18,fd,x,.3,zf+.07);
          add(g,seg-.05,.1,.5,fl,x,.34,zf+.4);
          for(const s of [-1,1])add(g,.02,.02,.6,metalMat,x+s*(seg/2-.08),.26,zf+.3);
        }
      }
    }},
  cloud:{label:'모듈 소파',cat:'living',hidden:true,desc:'1인 모듈 · 103 × 114',need:40,
    defaults:{arm:-1,c:'#a9a396'},
    dims:()=>[103,114],
    slots:[{k:'c',role:'fabric',label:'패브릭'}],
    opts:[{k:'arm',label:'팔걸이',choices:[[-1,'왼쪽'],[1,'오른쪽']]}],
    build(it,g){
      // one-arm module, 103 x 114 x 92; arm side is as seen from the front
      const f=MC(it.c,1),fl=MC(shade(it.c,.08),1),foot=MC('#2a2826',.8);
      const MW=1.03,D=1.14,AW=.2,s=it.arm,z0=-D/2,zf=D/2;
      const xa=s*(MW/2-AW/2),xs=-s*AW/2,sw=MW-AW-.01;
      add(g,MW-.08,.02,D-.1,foot,0,0,0);
      add(g,MW,.32,D-.06,f,0,.02,z0+.03+(D-.06)/2);
      add(g,MW,.36,.2,f,0,.34,z0+.1);
      add(g,AW,.22,D-.22,f,xa,.34,z0+.2+(D-.22)/2);
      const arm=cyl(g,.1,.1,D-.24,fl,0,0,0,20);arm.rotation.x=Math.PI/2;arm.position.set(xa,.56,z0+.21+(D-.24)/2);
      add(g,sw,.15,D-.18,fl,xs,.34,z0+.2+(D-.18)/2);
      add(g,sw-.06,.03,D-.26,fl,xs,.49,z0+.24+(D-.26)/2);
      const lip=cyl(g,.085,.085,sw,fl,0,0,0,20);lip.rotation.z=Math.PI/2;lip.position.set(xs,.43,zf-.06);
      const back=new THREE.Group();back.position.set(0,.42,z0+.17);back.rotation.x=-.12;g.add(back);
      add(back,MW-.08,.38,.24,fl,0,0,0);
      const roll=cyl(back,.12,.12,MW-.08,fl,0,0,0,20);roll.rotation.z=Math.PI/2;roll.position.set(0,.38,0);
      const lum=new THREE.Group();lum.position.set(xs,.52,z0+.37);lum.rotation.x=-.2;g.add(lum);
      add(lum,.5,.3,.13,f,0,0,0);
      const lr=cyl(lum,.065,.065,.5,f,0,0,0,16);lr.rotation.z=Math.PI/2;lr.position.set(0,.3,0);
    }},
  hsCorner:{label:'한샘몰 소파',cat:'living',desc:'데일리 1인 코너형 · 104 × 104',need:40,
    defaults:{arm:-1,c:'#e6dfd1'},
    dims:()=>[104,104],
    slots:[{k:'c',role:'fabric',label:'패브릭'}],
    opts:[{k:'arm',label:'팔걸이',choices:[[-1,'왼쪽 (좌)'],[1,'오른쪽 (우)'],[0,'양쪽']]}],
    build(it,g){
      // Hanssem Daily one-seat corner module, 1040 x 1040 x 740; arm side is as seen from the front, 0 = both
      const f=MC(it.c,1),fl=MC(shade(it.c,.08),1),foot=MC('#2a2826',.8);
      const W=1.04,D=1.04,AW=.2,BD=.18,z0=-D/2,arms=it.arm?[it.arm]:[-1,1];
      const x1=arms.includes(-1)?-W/2+AW:-W/2,x2=arms.includes(1)?W/2-AW:W/2,xs=(x1+x2)/2,sw=x2-x1-.01;
      [[-1,-1],[1,-1],[-1,1],[1,1]].forEach(([a,b])=>add(g,.04,.03,.04,foot,a*(W/2-.07),0,b*(D/2-.07)));
      soft(g,W,.27,D,f,0,.03,0,.03);
      soft(g,W,.47,BD,f,0,.03,z0+BD/2,.05);
      arms.forEach(s=>soft(g,AW,.57,D,f,s*(W/2-AW/2),.03,0,.07,.01));
      soft(g,sw,.15,D-BD,fl,xs,.29,z0+BD+(D-BD)/2+.005,.065,.02);
      const back=new THREE.Group();back.position.set(xs,.4,z0+BD+.11);back.rotation.x=-.16;g.add(back);
      soft(back,sw-.02,.35,.24,fl,0,0,0,.1,.03);
      const lum=new THREE.Group();lum.position.set(xs-(it.arm||0)*.12,.45,z0+BD+.2);lum.rotation.x=-.28;g.add(lum);
      soft(lum,.5,.3,.12,f,0,0,0,.055,.03);
      if(it.arm){
        const sq=new THREE.Group();sq.position.set(it.arm*(W/2-AW-.19),.45,z0+BD+.3);sq.rotation.set(-.25,-it.arm*.4,0);g.add(sq);
        soft(sq,.42,.42,.13,f,0,0,0,.06,.035);
      }
    }},
  hsStool:{label:'한샘몰 소파 스툴',cat:'living',desc:'데일리 스툴 · 103 × 103',
    defaults:{c:'#e6dfd1'},dims:()=>[103,103],
    slots:[{k:'c',role:'fabric',label:'패브릭'}],
    build(it,g){
      const f=MC(it.c,1),fl=MC(shade(it.c,.08),1),foot=MC('#2a2826',.8),W=1.03;
      [[-1,-1],[1,-1],[-1,1],[1,1]].forEach(([a,b])=>add(g,.04,.03,.04,foot,a*(W/2-.07),0,b*(W/2-.07)));
      soft(g,W-.02,.24,W-.02,f,0,.03,0,.03);
      soft(g,W,.17,W,fl,0,.26,0,.08,.03);
    }},
  sofaTable:{label:'소파 협탁',cat:'living',desc:'90 × 36 · 높이 45',
    defaults:{w:'#2f2c2a',deco:1},dims:()=>[90,36],
    slots:[{k:'w',role:'wood',label:'나무'}],
    opts:[{k:'deco',label:'소품',choices:[[1,'램프·책'],[0,'없음']]}],
    build(it,g){
      const W=.9,D=.36,H=.45,L=.045,w=MC(it.w,.6);
      add(g,W,.03,D,w,0,H-.03,0);
      [[-1,-1],[1,-1],[-1,1],[1,1]].forEach(([a,b])=>add(g,L,H-.03,L,w,a*(W/2-L/2),0,b*(D/2-L/2)));
      add(g,W-2*L,.02,D-.04,w,0,.1,0);
      if(it.deco){
        cyl(g,.03,.04,.1,MC('#f1efea',.4),-.24,H,0,16);
        cyl(g,.035,.075,.05,shadeMat('#f6c98f'),-.24,H+.1,0,20);
        add(g,.2,.03,.15,MC('#e6dfd1',.9),.08,H,.01);
        add(g,.18,.025,.13,MC('#6c4e37',.9),.08,H+.03,.01);
      }
    }},
  barStool:{label:'아일랜드 의자',cat:'living',desc:'가스 리프트 회전 스툴 · 46 × 46',need:30,round:true,
    defaults:{sh:65,c:'#ece5d8',w:'#7d5034'},dims:()=>[46,46],
    slots:[{k:'c',role:'fabric',label:'가죽'},{k:'w',role:'wood',label:'우드 암'}],
    opts:[{k:'sh',label:'좌석 높이',choices:[[65,'카운터 65'],[75,'바 75']]}],
    build(it,g){
      // chrome trumpet base and gas column, round leather seat on a bentwood plate whose arms sweep up into a low wraparound back
      // (at counter height the back stays under the 88cm worktop so the stool tucks in fully)
      const sy=it.sh/100,V=(x,y,z)=>new THREE.Vector3(x,y,z),DS={side:THREE.DoubleSide};
      const chrome=MC('#e9ebed',.12,{metalness:.95}),chromeDS=MC('#e9ebed',.12,{metalness:.95,...DS});
      const leather=MC(it.c,.45),leatherDS=MC(it.c,.45,DS),wood=MC(it.w,.5);
      const put=(geo,mat,x,y,z)=>{const m=new THREE.Mesh(geo,mat);m.position.set(x,y,z);m.castShadow=m.receiveShadow=true;g.add(m);return m;};
      const lathe=pts=>new THREE.LatheGeometry(pts.map(([r,y])=>new THREE.Vector2(r,y)),40);
      put(lathe([[0,0],[.215,0],[.222,.005],[.214,.012],[.13,.028],[.06,.06],[.038,.1],[0,.1]]),chromeDS,0,0,0);
      cyl(g,.034,.034,.022,chrome,0,.13,0,24);
      cyl(g,.024,.024,sy-.2,chrome,0,.1,0,20);
      cyl(g,.032,.032,.07,chrome,0,sy-.16,0,20);
      const fy=sy-.36,ring=put(new THREE.TorusGeometry(.165,.009,10,48),chrome,0,fy,0);ring.rotation.x=Math.PI/2;
      for(const s of [-1,1])rod(g,V(s*.024,fy,0),V(s*.158,fy,0),.008,chrome);
      put(lathe([[0,0],[.19,0],[.2,.012],[.203,.035],[.196,.052],[.18,.058],[0,.06]]),leatherDS,0,sy-.06,0);
      cyl(g,.205,.205,.016,wood,0,sy-.078,0,40);
      // back wraps the rear 200 degrees: walnut shell outside, leather pad inside
      const band=(r0,r1,h,mat,y)=>{
        const a0=-.18,a1=Math.PI+.18,s=new THREE.Shape();
        s.absarc(0,0,r1,a0,a1,false);s.absarc(0,0,r0,a1,a0,true);
        const geo=new THREE.ExtrudeGeometry(s,{depth:h,bevelEnabled:true,bevelThickness:.006,bevelSize:.005,bevelSegments:3,curveSegments:40});
        geo.rotateX(-Math.PI/2);return put(geo,mat,0,y,0);
      };
      const by=sy+.045,bh=.15;
      band(.213,.226,bh,wood,by);
      band(.19,.213,bh-.01,leather,by+.005);
      for(const s of [-1,1]){
        const curve=new THREE.CatmullRomCurve3([V(s*.212,by+.06,.04),V(s*.217,by+.005,.05),V(s*.205,sy-.04,.06),V(s*.17,sy-.08,.06)]);
        put(new THREE.TubeGeometry(curve,20,.011,8,false),wood,0,0,0);
      }
      rod(g,V(.03,sy-.12,0),V(.17,sy-.2,.06),.006,MC('#1d1d1f',.5));
    }},
  armchair:{label:'라운지 체어',cat:'living',hidden:true,need:40,
    defaults:{c:'#d2c8b7',w:'#c4a47c'},dims:()=>[80,82],
    slots:[{k:'c',role:'fabric',label:'패브릭'},{k:'w',role:'wood',label:'다리'}],
    build(it,g){
      const f=MC(it.c,1),fl=MC(shade(it.c,.15),1),w=MC(it.w,.7);
      [[-.33,-.33],[.33,-.33],[-.33,.33],[.33,.33]].forEach(([x,z])=>cyl(g,.02,.015,.14,w,x,0,z,12));
      add(g,.8,.2,.82,f,0,.14,0);
      add(g,.8,.56,.16,f,0,.14,-.33);
      add(g,.13,.34,.82,f,-.335,.14,0);add(g,.13,.34,.82,f,.335,.14,0);
      add(g,.52,.12,.62,fl,0,.34,.07);
      add(g,.52,.34,.12,fl,0,.42,-.2);
    }},
  togo:{label:'토고 체어',cat:'work',desc:'1인 라운지 · 87 × 102 · 높이 75',need:40,
    defaults:{c:'#7a4631',mat:'leather'},dims:()=>[87,102],
    slots:[{k:'c',role:'fabric',label:'커버'}],
    opts:[{k:'mat',label:'소재',choices:[['leather','가죽'],['cord','코듀로이'],['suede','스웨이드']]}],
    build(it,g){
      // frameless pleated lounge chair, 870 x 1020 x 750, seat about 400
      const r=it.mat==='leather'?.42:1;
      const f=it.mat==='cord'?cordMat(it.c):MC(it.c,r),f2=it.mat==='cord'?f:MC(shade(it.c,.05),r);
      const W=.87,D=1.02;
      soft(g,W-.02,.2,D-.08,f,0,0,0,.1,.02);
      soft(g,W-.02,.34,.26,f,0,0,-.37,.1,.02);
      soft(g,W-.04,.16,.56,f2,0,.19,.02,.075,.045);
      // front roll: full height bolster whose nose and corners tip up
      const nose=bentSoft(g,W,.34,.3,f,0,.02,.35,.1,.035,.02,.03);nose.rotation.x=-.12;
      // back: six stacked pleats leaning back; lower ones wrap forward into side wings, top one has ears
      const back=new THREE.Group();back.position.set(0,.26,-.2);back.rotation.x=-.38;g.add(back);
      for(let i=0;i<6;i++){
        const t=i/5;
        bentSoft(back,W-.02,.12,.3,i%2?f:f2,0,i*.082-.06,.03*(1-t)*(1-t),.058,.015,.05+.11*(1-t),i===5?.05:-.02*(1-t));
      }
    }},
  pouf:{label:'푸프',cat:'living',round:true,
    defaults:{c:'#bdb4a6'},dims:()=>[50,50],
    slots:[{k:'c',role:'fabric',label:'패브릭'}],
    build(it,g){cyl(g,.25,.25,.38,MC(it.c,1),0,0,0);cyl(g,.24,.25,.04,MC(shade(it.c,.12),1),0,.38,0);}},
  coffee:{label:'커피 테이블',cat:'living',
    defaults:{w:'#c4a47c'},dims:()=>[100,55],
    slots:[{k:'w',role:'wood',label:'나무'}],
    build(it,g){add(g,.86,.32,.4,MC(shade(it.w,-.3),.7),0,0,0);add(g,1.0,.05,.55,MC(it.w,.6),0,.32,0);}},
  coffeeRound:{label:'원형 커피 테이블',cat:'living',round:true,
    defaults:{w:'#c4a47c'},dims:()=>[80,80],
    slots:[{k:'w',role:'wood',label:'나무'}],
    build(it,g){cyl(g,.24,.28,.33,MC(shade(it.w,-.25),.7),0,0,0);cyl(g,.4,.4,.04,MC(it.w,.6),0,.33,0,40);}},
  sideTable:{label:'사이드 테이블',cat:'living',round:true,
    defaults:{w:'#6c4e37'},dims:()=>[45,45],
    slots:[{k:'w',role:'wood',label:'상판'}],
    build(it,g){cyl(g,.16,.16,.015,metalMat,0,0,0);cyl(g,.015,.015,.5,metalMat,0,.015,0,10);cyl(g,.225,.225,.03,MC(it.w,.6),0,.5,0);}},
  tv:{label:'TV장',cat:'living',need:60,
    defaults:{width:180,inch:65,w:'#8b7155'},dims:it=>[it.width,45],
    slots:[{k:'w',role:'wood',label:'나무'}],
    opts:[{k:'width',label:'장 너비',choices:[[160,'160'],[180,'180'],[200,'200'],[240,'240']]},
      {k:'inch',label:'TV',choices:[[55,'55"'],[65,'65"'],[75,'75"'],[85,'85"']]}],
    build(it,g){
      const W=cm(it.width),sw=it.inch*.02214,sh=sw*.5625,b=MC(it.w,.7),seam=MC(shade(it.w,-.4),.8);
      add(g,W,.42,.45,b,0,0,0);
      const n=Math.max(2,Math.round(W/.6));for(let i=1;i<n;i++)add(g,.006,.38,.006,seam,-W/2+W*i/n,.02,.226);
      add(g,.3,.2,.05,metalMat,0,.42,-.14);add(g,.06,.06,.05,metalMat,0,.6,-.14);
      add(g,sw,sh+.02,.045,screenMat,0,.62,-.12);
    }},
  idanas:{label:'IDANÄS TV장',cat:'living',desc:'IKEA · 162 × 40 · 높이 63',need:60,
    defaults:{inch:65,w:'#f1efea'},dims:()=>[162,40],
    slots:[{k:'w',role:'wood',label:'색'}],
    opts:[{k:'inch',label:'TV',choices:[[0,'없음'],[55,'55"'],[65,'65"'],[75,'75"']]}],
    build(it,g){
      // IKEA IDANÄS TV bench 162 x 40 x 63: two open shelves over two drawers, tapered legs
      const W=1.62,D=.4,b=MC(it.w,.5),inner=MC(shade(it.w,-.06),.6),knob=MC('#3a3532',.4);
      const BW=W-.04,BD=D-.02,zf=BD/2,t=.02;
      for(const a of [-1,1])for(const c of [-1,1]){const l=cyl(g,.035,.024,.16,b,a*(W/2-.05),0,c*(D/2-.05),4);l.rotation.y=Math.PI/4;}
      add(g,BW,.25,BD,b,0,.15,0);
      add(g,BW,.2,t,inner,0,.4,-zf+t/2);
      for(const x of [-BW/2+t/2,0,BW/2-t/2])add(g,t,.2,BD,b,x,.4,0);
      add(g,W,.03,D,b,0,.6,0);
      const dw=BW/2-.03;
      for(const s of [-1,1]){
        const x=s*BW/4;
        add(g,dw,.2,.016,b,x,.175,zf+.008);
        for(const k of [-1,1]){const n=cyl(g,.013,.013,.022,knob,0,0,0,14);n.rotation.x=Math.PI/2;n.position.set(x+k*dw*.3,.275,zf+.027);}
      }
      if(it.inch){
        const sw=it.inch*.02214,sh=sw*.5625;
        add(g,.32,.015,.2,metalMat,0,.63,-.05);add(g,.06,.1,.04,metalMat,0,.645,-.08);
        add(g,sw,sh+.02,.045,screenMat,0,.72,-.07);
      }
    }},
  besta:{label:'BESTÅ TV장',cat:'living',desc:'IKEA · 180 × 42 · 높이 38 · 도어 3',need:60,
    defaults:{body:'#2f2a26',door:'slatOak',dc:'#2f2a26',mount:'wall',inch:65},dims:()=>[180,42],
    opts:[{k:'door',label:'도어',choices:[['slatOak','비외르쾨비켄 오크'],['slatLight','비외르쾨비켄 화이트오크'],['slatBrown','비외르쾨비켄 브라운'],['chevron','헤데비켄 오크'],['flat','라프비켄 단색'],['glass','글라스비크 유리']]},
      {k:'dc',label:'도어 색',hide:it=>it.door!=='flat',choices:BESTA_COLORS,bg:v=>`background:${v}`},
      {k:'body',label:'본체 색',choices:BESTA_COLORS.slice(0,4),bg:v=>`background:${v}`},
      {k:'mount',label:'설치',choices:[['wall','벽걸이'],['legs','다리'],['floor','바닥']]},
      {k:'inch',label:'TV',choices:[[0,'없음'],[55,'55"'],[65,'65"'],[75,'75"']]}],
    build(it,g){
      // IKEA BESTÅ 180 x 42 x 38: carcass with three 60cm doors, floating, on legs or on the floor
      const W=1.8,D=.42,H=.38,y0=it.mount==='wall'?.3:it.mount==='legs'?.12:0,body=MC(it.body,.55);
      if(it.mount==='legs')for(const a of [-1,1])for(const c of [-1,1])cyl(g,.012,.012,y0,metalMat,a*(W/2-.06),0,c*(D/2-.06),10);
      add(g,W,H,D-.02,body,0,y0,-.01);
      add(g,.08,.002,.03,MC('#151515',.6),0,y0+H,-.12);
      const dw=W/3-.004,dh=H-.004,zf=D/2-.02;
      const slat={slatOak:'#c9a272',slatLight:'#e6d6b8',slatBrown:'#6b4a33'}[it.door];
      for(let i=0;i<3;i++){
        const x=-W/2+W/3*(i+.5),y=y0+.002;
        if(slat){
          add(g,dw,dh,.008,MC('#2b2622',.7),x,y,zf+.004);
          const sm=MC(slat,.6),n=Math.floor(dw/.02);
          for(let k=0;k<n;k++)add(g,.013,dh,.012,sm,x-dw/2+dw/n*(k+.5),y,zf+.014);
        }else if(it.door==='chevron')add(g,dw,dh,.018,chevronMat(),x,y,zf+.009);
        else if(it.door==='glass'){
          if(i===0)add(g,W-.04,.016,D-.08,body,0,y0+H/2,-.02);
          add(g,dw,dh,.008,MC('#1b1d1f',.08,{transparent:true,opacity:.7}),x,y,zf+.004);
        }else add(g,dw,dh,.018,MC(it.dc,.5),x,y,zf+.009);
      }
      if(it.inch){
        const sw=it.inch*.02214,sh=sw*.5625,top=y0+H;
        add(g,.32,.015,.2,metalMat,0,top,-.05);add(g,.06,.1,.04,metalMat,0,top+.015,-.08);
        add(g,sw,sh+.02,.045,screenMat,0,top+.09,-.07);
      }
    }},
  sideboard:{label:'수납장',cat:'living',need:60,
    defaults:{width:160,w:'#c4a47c'},dims:it=>[it.width,40],
    slots:[{k:'w',role:'wood',label:'나무'}],
    opts:[{k:'width',label:'너비',choices:[[120,'120'],[160,'160'],[200,'200']]}],
    build(it,g){
      const W=cm(it.width),b=MC(it.w,.65),seam=MC(shade(it.w,-.4),.8);
      [[-1,-1],[1,-1],[-1,1],[1,1]].forEach(([a,c])=>add(g,.025,.14,.025,metalMat,a*(W/2-.05),0,c*.15));
      add(g,W,.58,.4,b,0,.14,0);
      const n=Math.max(2,Math.round(W/.4));
      for(let i=1;i<n;i++)add(g,.006,.54,.006,seam,-W/2+W*i/n,.16,.202);
      for(let i=0;i<n;i++)add(g,.012,.1,.015,metalMat,-W/2+W*(i+.5)/n+(i%2?-.06:.06)*(W/n/.4),.42,.208);
    }},
  rug:{label:'러그',cat:'living',soft:true,
    defaults:{size:'230x170',rw:230,rd:170,pat:'plain',c:'#bdb4a6'},dims:rugSize,round:it=>it.size[0]==='r',
    // fixed-colour patterns ignore the colour swatches
    slots:[{k:'c',role:'rug',label:'색',hide:it=>it.pat in RUG_PATTERNS&&!RUG_PATTERNS[it.pat].tint}],
    opts:[{k:'size',label:'크기',choices:[['230x170','230×170'],['300x200','300×200'],['200x140','200×140'],['r200','원형 200'],['custom','직접 입력']]},
      {k:'pat',label:'무늬',choices:[['plain','무지'],...Object.entries(RUG_PATTERNS).map(([k,p])=>[k,p.name])],
        bg:(v,it)=>v==='plain'?`background:${it.c}`:`background:url(${rugPreview(v)}) center/cover${RUG_PATTERNS[v].tint?','+it.c+';background-blend-mode:multiply':''}`}],
    sliders:it=>it.size==='custom'?[{k:'rw',label:'가로',min:60,max:400,step:5},{k:'rd',label:'세로',min:40,max:400,step:5}]:[],
    build(it,g){
      const [w,d]=rugSize(it).map(cm),round=it.size[0]==='r',P=RUG_PATTERNS[it.pat];
      const slab=(sw,sd,h,mat,y)=>round?cyl(g,sw/2,sw/2,h,mat,0,y,0,48):add(g,sw,h,sd,mat,0,y,0);
      const tiled=(sw,sd,h,y)=>tileUV(slab(sw,sd,h,rugMat(it.pat,it.c),y),sw/P.period,sd/P.period);
      let parts;
      if(!P)parts=[slab(w,d,.012,MC(it.c,1),.004),slab(w-.16,d-.16,.003,MC(shade(it.c,.12),1),.014)];
      else if(P.border)parts=[slab(w,d,.012,MC(P.border[0],1),.004),slab(w-.1,d-.1,.003,MC(P.border[1],1),.014),tiled(w-.16,d-.16,.003,.0145)];
      else parts=[tiled(w,d,.012,.004)];
      parts.forEach(m=>m.castShadow=false);
    }},

  /* ----- 침실 ----- */
  bed:{label:'침대',cat:'bedroom',need:60,
    defaults:{size:160,c:'#f5f3ee',w:'#8b5a3c',pat:'seer'},dims:it=>[it.size+10,215],
    slots:[{k:'c',role:'bedding',label:'이불',hide:it=>it.pat==='stripe'},{k:'w',role:'wood',label:'프레임'}],
    opts:[{k:'size',label:'매트리스',choices:[[110,'슈퍼싱글'],[150,'퀸'],[160,'킹'],[180,'라지킹']]},
      {k:'pat',label:'이불',choices:Object.entries(BEDDING).map(([k,p])=>[k,p.name])}],
    build(it,g){
      // low platform without a headboard: dark recessed plinth, thin wood frame, puffy duvet and flat pillows
      const mw=cm(it.size),W=mw+.1,L=2.1,fr=MC(it.w,.6),duv=beddingMat(it.pat,it.c),r=seeded(hashStr(it.id));
      const sheet=it.pat==='stripe'?MC('#c9c7c4',1):MC(shade(it.c,-.04),1);
      add(g,W-.16,.07,L-.16,MC(shade(it.w,-.45),.8),0,0,0);
      soft(g,W,.09,L,fr,0,.07,0,.015);
      soft(g,mw,.2,2.0,sheet,0,.16,0,.04,.01);
      if(duv.side!==THREE.DoubleSide){duv.side=THREE.DoubleSide;duv.needsUpdate=true;}
      const d=new THREE.Mesh(duvetGeo(mw,-.5,1.0,.4,.25,r),duv);
      d.castShadow=d.receiveShadow=true;d.rotation.y=(r()-.5)*.02;g.add(d);
      wrinkle(soft(g,mw+.12,.09,.26,duv,0,.38,-.43,.05,.03),.008,r);
      const np=mw>1.3?2:1;
      for(let k=0;k<np;k++){
        const p=soft(g,mw/np-.1,.15,.5,duv,np===1?0:(k?1:-1)*mw/4,.36,-.75,.07,.05);
        p.rotation.set(.1,(r()-.5)*.1,(r()-.5)*.04);
      }
    }},
  nightstand:{label:'협탁',cat:'bedroom',
    defaults:{w:'#c4a47c',lamp:1},dims:()=>[45,40],
    slots:[{k:'w',role:'wood',label:'나무'}],
    opts:[{k:'lamp',label:'램프',choices:[[1,'있음'],[0,'없음']]}],
    build(it,g){
      add(g,.45,.5,.4,MC(it.w,.7),0,0,0);
      add(g,.43,.006,.006,MC(shade(it.w,-.4),.8),0,.3,.202);
      if(it.lamp){cyl(g,.05,.07,.28,metalMat,0,.5,0);cyl(g,.11,.15,.2,shadeMat('#f3e6cc'),0,.74,0);}
    }},
  wardrobe:{label:'옷장',cat:'bedroom',need:70,
    defaults:{width:120,c:'#f1efea'},dims:it=>[it.width,60],
    slots:[{k:'c',role:'wood',label:'도어'}],
    opts:[{k:'width',label:'너비',choices:[[80,'80'],[120,'120'],[160,'160'],[200,'200']]}],
    build(it,g){
      const W=cm(it.width),H=2.1,D=.6,body=MC(it.c,.6),seam=MC(shade(it.c,-.35),.8);
      add(g,W-.02,.08,D-.06,MC('#3a3532',.7),0,0,-.02);
      add(g,W,H-.08,D,body,0,.08,0);
      const n=Math.max(2,Math.round(W/.5)),dw=W/n;
      for(let i=1;i<n;i++)add(g,.006,H-.14,.006,seam,-W/2+dw*i,.11,D/2+.002);
      for(let i=0;i<n;i++){const x=i%2===0?-W/2+dw*(i+1)-.04:-W/2+dw*i+.04;add(g,.012,.32,.02,metalMat,x,.95,D/2+.012);}
    }},
  builtIn:{label:'붙박이장',cat:'work',desc:'천장까지 · 깊이 60 · 핸들리스',need:70,
    defaults:{width:240,c:'#e4e4e2'},dims:it=>[it.width,60],
    slots:[{k:'c',role:'wood',label:'도어'}],
    opts:[{k:'width',label:'너비',choices:[[180,'180'],[200,'200'],[240,'240'],[280,'280'],[310,'310']]}],
    build(it,g){
      // flat doors in a frame of side fillers and a top header; every other joint is a dark handle groove
      const W=cm(it.width),H=H1,D=.6,f=.03,top=.12,base=.015,c=MC(it.c,.55);
      const n=Math.max(2,Math.round(W/.6)),dw=(W-2*f)/n,dh=H-top-base-.004;
      add(g,W,H,D-.04,c,0,0,-.02);
      add(g,W-2*f,H-top,.004,MC(shade(it.c,-.3),.8),0,0,D/2-.038);
      add(g,f,H,.04,c,-W/2+f/2,0,D/2-.02);add(g,f,H,.04,c,W/2-f/2,0,D/2-.02);
      add(g,W,top,.04,c,0,H-top,D/2-.02);
      const gr=k=>k>0&&k<n&&k%2===1;
      for(let i=0;i<n;i++){
        const x0=-W/2+f+i*dw,l=gr(i)?.011:.002,r=gr(i+1)?.011:.002;
        add(g,dw-l-r,dh,.02,c,x0+l+(dw-l-r)/2,base,D/2-.01);
      }
      for(let k=1;k<n;k++)if(gr(k))add(g,.022,dh,.012,MC('#3b3d40',.6),-W/2+f+k*dw,base,D/2-.026);
    }},
  purifier:{label:'공기청정기',cat:'bedroom',desc:'33 × 33 · 원통형 / 사각형',need:20,
    defaults:{shape:'tower',c:'#f4f4f2'},dims:()=>[33,33],round:it=>it.shape==='tower',
    opts:[{k:'shape',label:'형태',choices:[['tower','원통형 · 높이 60'],['cube','사각형 · 높이 75']]},
      {k:'c',label:'색',choices:[['#f4f4f2','화이트'],['#e6dccb','베이지'],['#8f9296','그레이']],bg:v=>`background:${v}`}],
    build(it,g){
      // white body, perforated intake grille, dark outlet on top with a soft blue status light
      const body=MC(it.c,.4),grille=MC(shade(it.c,-.45),.8),top=MC('#3a3d40',.7);
      const led=MC('#9fd4ff',.3,{emissive:lin('#7cc4ff'),emissiveIntensity:.8});
      if(it.shape==='cube'){
        soft(g,.33,.74,.33,body,0,0,0,.03);
        for(let i=0;i<12;i++)add(g,.25,.012,.004,grille,0,.08+i*.035,.166);
        add(g,.27,.006,.27,top,0,.737,0);
        add(g,.06,.004,.012,led,0,.741,.12);
      }else{
        cyl(g,.16,.16,.02,top,0,0,0,40);
        cyl(g,.165,.165,.36,grille,0,.02,0,40);
        for(let i=0;i<14;i++)cyl(g,.1665,.1665,.006,body,0,.035+i*.024,0,40);
        cyl(g,.165,.165,.2,body,0,.38,0,40);
        cyl(g,.13,.13,.006,top,0,.58,0,40);
        cyl(g,.135,.135,.004,led,0,.578,0,40);
      }
    }},
  dresser:{label:'서랍장',cat:'bedroom',need:60,
    defaults:{w:'#c4a47c'},dims:()=>[100,45],
    slots:[{k:'w',role:'wood',label:'나무'}],
    build(it,g){
      const W=1.0,H=.8,D=.45,b=MC(it.w,.65),s=MC(shade(it.w,-.4),.8);
      [[-1,-1],[1,-1],[-1,1],[1,1]].forEach(([a,c])=>add(g,.04,.08,.04,b,a*(W/2-.05),0,c*(D/2-.05)));
      add(g,W,H-.08,D,b,0,.08,0);
      for(let r=1;r<3;r++)add(g,W-.02,.006,.006,s,0,.08+(H-.08)*r/3,D/2+.002);
      add(g,.006,H-.1,.006,s,0,.09,D/2+.002);
      for(let r=0;r<3;r++)for(const x of [-.25,.25])add(g,.08,.012,.015,metalMat,x,.08+(H-.08)*(r+.5)/3,D/2+.008);
    }},
  mirror:{label:'전신 거울',cat:'bedroom',
    defaults:{w:'#2f2c2a'},dims:()=>[55,35],
    slots:[{k:'w',role:'wood',label:'프레임'}],
    build(it,g){
      const sub=new THREE.Group();sub.position.z=.1;sub.rotation.x=-.13;g.add(sub);
      add(sub,.55,1.7,.03,MC(it.w,.6),0,0,0);
      add(sub,.49,1.64,.01,mirrorMat,0,.03,.016);
    }},

  /* ----- 오피스·수납 ----- */
  desk:{label:'데스크',cat:'work',desc:'160×80 · 의자 포함',need:75,
    defaults:{h:74,w:'#e2ddd4',c:'#3f4347'},dims:()=>[160,80],
    slots:[{k:'w',role:'top',label:'상판'},{k:'c',role:'chair',label:'의자'}],
    sliders:[{k:'h',label:'높이',min:60,max:124,step:1}],
    build(it,g){
      const h=it.h/100,top=MC(it.w,.6),chair=MC(it.c,.9);
      add(g,1.6,.03,.8,top,0,h-.03,0);
      [-.62,.62].forEach(x=>{add(g,.07,h-.06,.07,metalMat,x,.03,0);add(g,.07,.03,.72,metalMat,x,0,0);});
      add(g,1.24,.04,.04,metalMat,0,h-.08,-.2);
      add(g,.05,.12,.05,metalMat,0,h,-.25);add(g,.22,.01,.16,metalMat,0,h,-.25);
      add(g,.62,.37,.025,screenMat,0,h+.1,-.22);
      add(g,.42,.015,.13,MC('#dcdcd8'),0,h,.12);
      cyl(g,.03,.03,.38,metalMat,0,.06,.17,12);
      add(g,.6,.03,.06,metalMat,0,.03,.17);add(g,.06,.03,.6,metalMat,0,.03,.17);
      add(g,.5,.08,.48,chair,0,.44,.17);
      add(g,.48,.58,.06,chair,0,.5,.44);
    }},
  bookshelf:{label:'책장',cat:'work',need:60,
    defaults:{width:80,w:'#f1efea'},dims:it=>[it.width,30],
    slots:[{k:'w',role:'wood',label:'나무'}],
    opts:[{k:'width',label:'너비',choices:[[60,'60'],[80,'80'],[120,'120']]}],
    build(it,g){
      const W=cm(it.width),H=1.8,D=.3,t=.02,m=MC(it.w,.7),r=seeded(hashStr(it.id));
      add(g,t,H,D,m,-W/2+t/2,0,0);add(g,t,H,D,m,W/2-t/2,0,0);
      add(g,W,H,.01,MC(shade(it.w,-.08),.8),0,0,-D/2+.005);
      for(let i=0;i<=5;i++)add(g,W-2*t,t,D,m,0,i*(H-t)/5,0);
      for(let i=0;i<5;i++){
        const y0=i*(H-t)/5+t;let x=-W/2+t+.01;
        while(x<W/2-t-.04){
          if(r()<.12){x+=.05+r()*.1;continue;}
          const bw=.02+r()*.03,bh=.18+r()*.12,bd=.17+r()*.07;
          add(g,bw,bh,bd,MC(BOOKS[Math.floor(r()*BOOKS.length)],.9),x+bw/2,y0,-.02);
          x+=bw+.003;
        }
      }
    }},
  bookTower:{label:'북타워',cat:'work',desc:'30 × 30 · 스파인 책장',need:40,
    defaults:{ht:160,c:'#f1efea',deco:1},dims:()=>[30,30],
    slots:[{k:'c',role:'wood',label:'색'}],
    opts:[{k:'ht',label:'높이',choices:[[130,'130'],[160,'160'],[190,'190']]},
      {k:'deco',label:'소품',choices:[[1,'책·화분'],[0,'비우기']]}],
    build(it,g){
      // square spine with thin cantilevered shelves; books lie flat in front of the spine
      const H=it.ht/100,m=MC(it.c,.5),r=seeded(hashStr(it.id)),sp=.145,n=Math.floor((H-.15)/sp)+1;
      add(g,.3,.012,.3,m,0,0,0);
      add(g,.07,H-.012,.07,m,0,.012,-.06);
      for(let i=0;i<n;i++){
        const y=H-.005-(n-1-i)*sp;
        add(g,.26,.005,.2,m,0,y,0);
        add(g,.012,.05,.006,m,0,y+.005,-.022);
        if(!it.deco)continue;
        const y0=y+.005,k=r();
        if(i===n-1){
          cyl(g,.04,.034,.09,MC('#f1efea',.6),0,y0,.02,20);
          for(let j=0;j<7;j++){const a=j/7*Math.PI*2,l=cyl(g,0,.005,.13,MC('#7f9a6a',.8),Math.cos(a)*.012,y0+.07,.02+Math.sin(a)*.012,6);l.rotation.set(Math.sin(a)*.4,0,-Math.cos(a)*.4);}
        }else if(i===n-2)add(g,.2,.05,.12,MC('#d7bf98',.7),0,y0,.02);
        else if(k<.45){
          let yy=y0;const nb=1+Math.floor(r()*2.5);
          for(let b=0;b<nb;b++){const bh=.025+r()*.015;add(g,.22+r()*.04,bh,.15+r()*.03,MC(BOOKS[Math.floor(r()*BOOKS.length)],.9),(r()-.5)*.02,yy,.03);yy+=bh;}
        }else if(k<.55&&y0+.12<H-sp)cyl(g,.03,.03,.07,MC('#e9e6df',.3,{transparent:true,opacity:.6}),0,y0,.03,16);
      }
    }},

  /* ----- 다이닝 ----- */
  dining:{label:'식탁',cat:'dining',desc:'의자 포함',
    defaults:{seats:4,w:'#c4a47c',c:'#e6dfd1'},dims:it=>{const [l,d]=DINING[it.seats];return[l*100,d*100+90];},
    slots:[{k:'w',role:'wood',label:'테이블'},{k:'c',role:'chair',label:'의자'}],
    opts:[{k:'seats',label:'인원',choices:[[4,'4인 140×80'],[6,'6인 180×90']]}],
    build(it,g){
      const [Lt,Dt]=DINING[it.seats],w=MC(it.w,.6),c=MC(it.c,.9);
      add(g,Lt,.04,Dt,w,0,.71,0);
      [[-1,-1],[1,-1],[-1,1],[1,1]].forEach(([a,b])=>add(g,.06,.71,.06,w,a*(Lt/2-.08),0,b*(Dt/2-.08)));
      const n=it.seats/2;
      for(const s of [-1,1])for(let i=0;i<n;i++)chairAt(g,-Lt/2+Lt*(i+.5)/n,s*(Dt/2+.17),s,c,w);
    }},
  stool:{label:'바 스툴',cat:'dining',round:true,desc:'아일랜드용',
    defaults:{w:'#c4a47c'},dims:()=>[40,40],
    slots:[{k:'w',role:'wood',label:'좌석'}],
    build(it,g){cyl(g,.2,.2,.02,metalMat,0,0,0);cyl(g,.022,.022,.7,metalMat,0,.02,0,10);cyl(g,.16,.16,.015,metalMat,0,.28,0);cyl(g,.19,.19,.05,MC(it.w,.6),0,.7,0);}},

  /* ----- 데코 ----- */
  plant:{label:'화분',cat:'deco',round:true,
    defaults:{size:'m',c:'#e9e6df'},dims:it=>[PLANT[it.size].d,PLANT[it.size].d],
    slots:[{k:'c',role:'pot',label:'화분'}],
    opts:[{k:'size',label:'크기',choices:[['s','소형'],['m','중형'],['l','대형']]}],
    build(it,g){
      const P=PLANT[it.size],r=P.d/200*.8,rr=seeded(hashStr(it.id+it.size));
      cyl(g,r,r*.78,P.pot,MC(it.c,.8),0,0,0);
      cyl(g,r*.92,r*.92,.01,MC('#4a3b2e'),0,P.pot-.02,0);
      if(it.size==='l')cyl(g,.025,.035,P.h*.5,MC('#6b5240'),0,P.pot,0,8);
      const n={s:6,m:9,l:13}[it.size],spread=P.d/100;
      for(let i=0;i<n;i++){
        const rad=spread*(.16+rr()*.12),a=rr()*Math.PI*2,d=rr()*spread*.32;
        const y=P.pot+.05+(P.h-P.pot-rad)*(it.size==='l'?.45+rr()*.55:.15+rr()*.85);
        const m=new THREE.Mesh(new THREE.IcosahedronGeometry(rad,0),MC(GREENS[Math.floor(rr()*GREENS.length)],.9,{flatShading:true}));
        m.position.set(Math.cos(a)*d,y,Math.sin(a)*d);m.scale.y=1.25;m.rotation.set(rr()*3,rr()*3,0);m.castShadow=true;g.add(m);
      }
    }},
  comicShelf:{label:'만화책 책장',cat:'deco',desc:'슬라이딩 3열 · 57 × 48 · 높이 100',need:50,
    defaults:{c:'#f3f3f1',pull:0},dims:()=>[57,48],
    slots:[{k:'c',role:'wood',label:'색'}],
    opts:[{k:'pull',label:'슬라이딩',choices:[[0,'닫힘'],[1,'1열 꺼내기'],[2,'2열 꺼내기'],[3,'3열 꺼내기']]}],
    build(it,g){
      // white carcass open at the bottom; three 17.5cm pull-out towers on casters, each a front with a D pull,
      // a back and four 21cm shelves of comics standing spine-out to the open sides
      const W=.57,D=.48,H=1.0,body=MC(it.c,.55),pullM=MC(shade(it.c,-.06),.3),wheelM=MC('#2a2a2c',.5),r=seeded(hashStr(it.id));
      add(g,.015,H,D,body,-W/2+.0075,0,0);add(g,.015,H,D,body,W/2-.0075,0,0);
      add(g,W,.018,D,body,0,H-.018,0);
      add(g,W-.03,H-.03,.008,body,0,.012,-D/2+.004);
      const cw=(W-.03)/3,y0=.065,fh=.905,ud=.41,zf=D/2-.008;
      const spines=['#c8372d','#2d5fa8','#f0c419','#2f8f5b','#e8e4da','#1f2733','#e07b39','#7a4fa0','#d9d2c3','#4a7fb5'];
      for(let i=0;i<3;i++){
        const x=-W/2+.015+cw*(i+.5),dz=it.pull===i+1?.36:0,zb=zf-.008-ud;
        add(g,cw-.003,fh,.016,body,x,y0,zf+dz);
        const hx=x+.035;
        add(g,.012,.13,.012,pullM,hx,.6,zf+.024+dz);
        for(const y of [.6,.718])add(g,.012,.012,.018,pullM,hx,y,zf+.012+dz);
        add(g,cw-.006,fh,.016,body,x,y0,zb+dz);
        const zc=(zf-.008+zb+.008)/2+dz,dd=ud;
        add(g,cw-.006,.016,dd,body,x,y0,zc);add(g,cw-.006,.016,dd,body,x,y0+fh-.016,zc);
        for(let k=1;k<4;k++)add(g,cw-.006,.017,dd,body,x,y0+.016+k*.222,zc);
        for(const [wx,wz] of [[-.05,zf-.05],[.05,zf-.05],[-.05,zb+.05],[.05,zb+.05]]){
          const w=new THREE.Mesh(new THREE.CylinderGeometry(.025,.025,.016,16),wheelM);
          w.rotation.z=Math.PI/2;w.position.set(x+wx,.025,wz+dz);w.castShadow=true;g.add(w);
          add(g,.022,.02,.03,wheelM,x+wx,.04,wz+dz);
        }
        if(!dz)continue;
        for(let k=0;k<4;k++){
          const by=y0+.016+k*.222+(k?.017:0);let z=zf-.012;
          while(z>zb+.02){
            const t=.012+r()*.005,h=.17+r()*.015;
            add(g,.128,h,t,MC(spines[Math.floor(r()*spines.length)],.7),x,by,z-t/2+dz);z-=t+.0015;
          }
        }
      }
    }},
  lpCabinet:{label:'LP장',cat:'deco',desc:'80 × 42 · 턴테이블 포함',need:50,
    defaults:{w:'#b98a5a',tt:1},dims:()=>[80,42],
    slots:[{k:'w',role:'wood',label:'나무'}],
    opts:[{k:'tt',label:'위',choices:[[1,'턴테이블'],[0,'비우기']]}],
    build(it,g){
      // tapered legs, slanted side panels, glass-topped drawer, LPs standing between acrylic dividers
      const W=.8,D=.42,y0=.16,y1=.76,t=.025,wood=MC(it.w,.6),dark=MC(shade(it.w,-.25),.7),r=seeded(hashStr(it.id));
      for(const x of [-1,1])for(const z of [-1,1])cyl(g,.014,.019,y0+.02,wood,x*(W/2-.05),0,z*(D/2-.06),12);
      const sh=new THREE.Shape();
      // profile in (-z, y): back edge upright, front edge leaning back toward the top
      sh.moveTo(D/2,0);sh.lineTo(D/2,y1-y0);sh.lineTo(-D/2+.06,y1-y0);sh.lineTo(-D/2,0);sh.lineTo(D/2,0);
      const sg=new THREE.ExtrudeGeometry(sh,{depth:t,bevelEnabled:false});sg.rotateY(Math.PI/2);
      for(const s of [-1,1]){const m=new THREE.Mesh(sg,wood);m.position.set(s>0?W/2-t:-W/2,y0,0);m.castShadow=m.receiveShadow=true;g.add(m);}
      add(g,W-2*t,.025,D-.04,wood,0,y0+.02,0);
      add(g,W-2*t,.5,.012,dark,0,y0+.045,-D/2+.026);
      add(g,W-2*t,.13,D-.14,wood,0,y1-.15,-.05);
      add(g,W-2*t-.01,.12,.02,MC(shade(it.w,.08),.6),0,y1-.145,.15);
      add(g,W-2*t,.012,D-.1,MC('#1e2124',.08,{transparent:true,opacity:.75}),0,y1-.02,-.04);
      const acr=MC('#e8f1f4',.05,{transparent:true,opacity:.25});
      for(const x of [-.13,.13])add(g,.006,.33,D-.12,acr,x,y0+.045,-.01);
      // records: 31cm sleeves standing with spines to the front, a few leaning
      for(const [a,b] of [[-W/2+t+.01,-.14],[-.12,.12],[.14,W/2-t-.01]]){
        let x=a+.005;const n=6+Math.floor(r()*6);
        for(let i=0;i<n&&x<b-.01;i++){
          const m=add(g,.006,.31,.31,MC(BOOKS[Math.floor(r()*BOOKS.length)],.8),x,y0+.045,-.01);
          if(i===n-1||r()<.15)m.rotation.z=(r()<.5?-1:1)*(.08+r()*.12);
          x+=.009+r()*.01;
        }
      }
      if(!it.tt)return;
      const blk=MC('#1d1f22',.4),ty=y1-.008;
      add(g,.43,.09,.34,blk,.08,ty,-.02);
      cyl(g,.15,.15,.018,MC('#2a2c2f',.35,{metalness:.4}),.03,ty+.09,-.02,40);
      cyl(g,.148,.148,.004,MC('#0d0d0e',.25),.03,ty+.108,-.02,40);
      cyl(g,.045,.045,.005,MC('#c9a663',.6),.03,ty+.108,-.02,24);
      add(g,.012,.012,.2,metalMat,.22,ty+.11,-.04).rotation.y=.35;
      for(let i=0;i<3;i++)cyl(g,.012,.012,.012,metalMat,.2+i*.035,ty+.035,.155,12).rotation.x=Math.PI/2;
      const lid=new THREE.Group();lid.position.set(.08,ty+.09,-.19);lid.rotation.x=-1.75;g.add(lid);
      add(lid,.43,.07,.34,MC('#d8e2e6',.05,{transparent:true,opacity:.18}),0,0,.17);
      const spk=add(g,.14,.08,.08,MC(shade(it.w,.12),.6),-.27,ty,.02);spk.rotation.y=.2;
      for(const dx of [-.035,.035]){const h=cyl(g,.022,.022,.012,MC('#3a2f26',.8),-.27+dx,ty+.04,.062,16);h.rotation.x=Math.PI/2;}
      cyl(g,.022,.022,.08,MC('#f3efe6',.9),-.34,ty,-.12,16);
    }},
  lamp:{label:'플로어 램프',cat:'deco',round:true,
    defaults:{c:'#f3e6cc'},dims:()=>[40,40],
    slots:[{k:'c',role:'shade',label:'갓'}],
    build(it,g){cyl(g,.16,.17,.03,metalMat,0,0,0);cyl(g,.012,.012,1.36,metalMat,0,.03,0,8);cyl(g,.15,.21,.32,shadeMat(it.c),0,1.34,0);}},
  akari:{label:'아카리 플로어 램프',cat:'deco',round:true,desc:'한지 등 · 삼각 다리',
    defaults:{sz:'m',leg:'#2b2b2b'},dims:it=>it.sz==='l'?[60,60]:[50,50],
    opts:[{k:'sz',label:'크기',choices:[['m','높이 120'],['l','높이 150']]},
      {k:'leg',label:'다리',choices:[['#2b2b2b','블랙'],['#b9a27a','브라스']]}],
    build(it,g){
      // oblate washi lantern on a thin tripod, wooden ring on top, rod rising through the centre
      const k=it.sz==='l'?1.25:1,leg=MC(it.leg,.4,{metalness:.5}),V=(x,y,z)=>new THREE.Vector3(x,y,z);
      const y0=.72*k,R=.25*k,hh=R*.78;
      for(let i=0;i<3;i++){const a=i/3*Math.PI*2+.4;rod(g,V(Math.cos(a)*.22*k,0,Math.sin(a)*.22*k),V(Math.cos(a)*.025,y0,Math.sin(a)*.025),.005,leg);}
      cyl(g,.03,.03,.012,MC('#c9a271',.6),0,y0-.006,0,20);
      const ball=new THREE.Mesh(new THREE.SphereGeometry(R,40,24),paperLanternMat());
      ball.scale.y=.78;ball.position.y=y0+hh;g.add(ball);
      cyl(g,R*.32,R*.32,.022,MC('#c9a271',.6),0,y0+2*hh-.012,0,32);
      cyl(g,.004,.004,2*hh+.22*k,leg,0,y0,0,6);
    }},
  art:{label:'액자',cat:'deco',soft:true,wall:true,desc:'가까운 벽에 붙어요',
    defaults:{width:90,c:'#d9a77f',w:'#2f2c2a'},dims:it=>[it.width,4],
    slots:[{k:'c',role:'art',label:'그림'},{k:'w',role:'wood',label:'프레임'}],
    opts:[{k:'width',label:'너비',choices:[[60,'60'],[90,'90'],[120,'120'],[160,'160']]}],
    build(it,g){
      const W=cm(it.width),Hh=Math.min(1.0,W*.7),yb=1.45-Hh/2,r=seeded(hashStr(it.id));
      add(g,W,Hh,.035,MC(it.w,.6),0,yb,-.0025);
      add(g,W-.06,Hh-.06,.01,MC('#f4f1ea',.9),0,yb+.03,.012);
      const iw=W-.14,ih=Hh-.14,cx=(r()-.5)*iw*.2;
      add(g,iw*.62,ih*.55,.004,MC(it.c,.9),cx-iw*.12,yb+.07,.019);
      const disc=cyl(g,ih*.2,ih*.2,.004,MC(shade(it.c,-.3),.9),cx+iw*.2,0,0,32);
      disc.rotation.x=Math.PI/2;disc.position.set(cx+iw*.2,yb+.07+ih*.68,.021);
      add(g,iw*.5,.006,.004,MC('#2f3237',.9),cx,yb+.07+ih*.4,.022);
    }},
  curtain:{label:'커튼',cat:'deco',soft:true,wall:true,onWindow:true,desc:'창이나 벽에 붙어요',
    defaults:{width:200,ht:2.6,c:'#efe9de'},dims:it=>[it.width,14],
    slots:[{k:'c',role:'curtain',label:'원단'}],
    opts:[{k:'width',label:'너비',choices:[[150,'150'],[200,'200'],[300,'300'],[400,'400']]},
      {k:'ht',label:'길이',choices:[[2.3,'2.3m'],[2.6,'2.6m'],[4.9,'복층 창 끝까지']]}],
    build(it,g){
      const W=cm(it.width),ht=curtainH(it),mat=MC(it.c,1),n=Math.max(4,Math.round(W/.1)),pw=W/n;
      for(let i=0;i<n;i++){const m=add(g,pw*1.1,ht-.05,.025,mat,-W/2+pw*(i+.5),.015,i%2?.025:-.02);if(i%2)m.castShadow=false;}
      add(g,W+.1,.025,.025,metalMat,0,ht-.04,0);
    }},
};

function withDefaults(it){
  const T=TYPES[it.type];
  return Object.assign({rot:0,lv:0,label:T.label},JSON.parse(JSON.stringify(T.defaults||{})),it);
}
const isRound=it=>{const r=TYPES[it.type].round;return typeof r==='function'?r(it):!!r;};
