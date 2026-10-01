'use strict';
/* Furniture catalog. Each builder works in metres around the item centre; local -z is the back, +z the front. */
const PAL={
  fabric:[['#e6dfd1','아이보리'],['#d2c8b7','베이지'],['#aaa49b','웜 그레이'],['#73777c','그레이'],['#3d4045','차콜'],
    ['#8d9c86','세이지'],['#5d7186','블루'],['#b5806a','테라코타'],['#c9a663','머스타드'],['#8a644b','코냑 레더']],
  wood:[['#e2d0b2','화이트 오크'],['#c4a47c','오크'],['#a37a52','내추럴'],['#6c4e37','월넛'],['#2f2c2a','블랙'],['#f1efea','화이트']],
  top:[['#e2ddd4','라이트 그레이'],['#f1efea','화이트'],['#e2d0b2','화이트 오크'],['#c4a47c','오크'],['#6c4e37','월넛'],['#2f2c2a','블랙']],
  chair:[['#3f4347','차콜'],['#e6dfd1','아이보리'],['#aaa49b','웜 그레이'],['#8d9c86','세이지'],['#5d7186','블루'],['#b5806a','테라코타'],['#8a644b','코냑 레더']],
  bedding:[['#f5f3ee','화이트'],['#d8cfc0','린넨'],['#b8c3c5','블루 그레이'],['#9aa58f','세이지'],['#73777c','그레이'],['#c9a99a','로즈'],['#d9b26f','머스타드']],
  rug:[['#bdb4a6','오트밀'],['#dcd5c8','크림'],['#8f8a82','그레이'],['#5b6670','슬레이트'],['#b48a6e','테라코타'],['#7f8a6c','올리브'],['#3d4045','차콜']],
  pot:[['#e9e6df','화이트'],['#b98b6a','테라코타'],['#4a4a4a','블랙'],['#a8a196','스톤'],['#c4a47c','라탄']],
  art:[['#d9a77f','선셋'],['#8fa3a8','오션'],['#a7b08e','포레스트'],['#2f3237','모노'],['#e3c66f','옐로'],['#c98f8f','로즈']],
  curtain:[['#efe9de','린넨 화이트'],['#d8cfc0','베이지'],['#aaa49b','웜 그레이'],['#73777c','그레이'],['#8d9c86','세이지'],['#5d7186','블루']],
  shade:[['#f3e6cc','린넨'],['#ffffff','화이트'],['#e8cfa6','앰버'],['#cfd6d0','민트 그레이']],
};
const CATS=[['living','거실'],['bedroom','침실'],['work','오피스·수납'],['dining','다이닝'],['deco','데코']];
const STYLES=[
  {k:'natural',name:'내추럴 우드',desc:'따뜻한 오크와 베이지',walls:'#efe8dc',tv:'oakSlat',fabric:'#d2c8b7',wood:'#c4a47c',top:'#c4a47c',chair:'#e6dfd1',rug:'#bdb4a6',bedding:'#d8cfc0',pot:'#b98b6a',curtain:'#efe9de',art:'#a7b08e',shade:'#f3e6cc'},
  {k:'japandi',name:'재팬디',desc:'밝은 나무와 아이보리',walls:'#e2dbcf',tv:'oakSlat',fabric:'#e6dfd1',wood:'#e2d0b2',top:'#e2d0b2',chair:'#aaa49b',rug:'#dcd5c8',bedding:'#f5f3ee',pot:'#a8a196',curtain:'#efe9de',art:'#8fa3a8',shade:'#ffffff'},
  {k:'mono',name:'모던 모노',desc:'블랙, 차콜, 화이트',walls:'#f3f2ef',tv:'charcoal',fabric:'#3d4045',wood:'#2f2c2a',top:'#f1efea',chair:'#3f4347',rug:'#8f8a82',bedding:'#73777c',pot:'#4a4a4a',curtain:'#aaa49b',art:'#2f3237',shade:'#ffffff'},
  {k:'mid',name:'미드센추리',desc:'월넛과 머스타드',walls:'#efe8dc',tv:'walnutSlat',fabric:'#c9a663',wood:'#6c4e37',top:'#6c4e37',chair:'#b5806a',rug:'#b48a6e',bedding:'#9aa58f',pot:'#b98b6a',curtain:'#d8cfc0',art:'#d9a77f',shade:'#e8cfa6'},
];

/* ---------- mesh helpers ---------- */
function add(g,w,h,d,mat,x,y0,z){const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat);m.position.set(x,y0+h/2,z);m.castShadow=m.receiveShadow=true;g.add(m);return m;}
function cyl(g,rt,rb,h,mat,x,y0,z,seg){const m=new THREE.Mesh(new THREE.CylinderGeometry(rt,rb,h,seg||28),mat);m.position.set(x,y0+h/2,z);m.castShadow=m.receiveShadow=true;g.add(m);return m;}
const emissiveMats=new Set();
let lampGlow=.6;
function shadeMat(c){
  const k='lamp|'+c;let m=MAT_CACHE.get(k);
  if(!m){m=new THREE.MeshStandardMaterial({color:lin(c),emissive:lin('#ffdca0'),emissiveIntensity:lampGlow,roughness:1});MAT_CACHE.set(k,m);emissiveMats.add(m);}
  return m;
}
const mirrorMat=MC('#d9e2e6',.08,{metalness:.6});
const BOOKS=['#8a644b','#5d7186','#c9a663','#b5806a','#e6dfd1','#3d4045','#8d9c86','#a9806a','#d8cfc0','#6f7378'];
const GREENS=['#5e7d4c','#6f8f58','#4f6d42','#7c9a62','#587a46'];
const PLANT={s:{d:35,h:.75,pot:.28},m:{d:50,h:1.2,pot:.38},l:{d:70,h:1.8,pot:.48}};
function rugSize(it){if(it.size[0]==='r'){const d=+it.size.slice(1);return[d,d];}const [w,d]=it.size.split('x').map(Number);return[w,d];}
const DINING={4:[1.4,.8],6:[1.8,.9]};

function chairAt(g,x,z,face,seat,leg){
  // face: +1 sits looking toward -z (table at -z), -1 the other way
  add(g,.44,.04,.42,seat,x,.44,z);
  add(g,.44,.42,.035,seat,x,.48,z+face*.2);
  [[-.19,-.18],[.19,-.18],[-.19,.18],[.19,.18]].forEach(([a,b])=>add(g,.03,.44,.03,leg,x+a,0,z+b));
}

const TYPES={
  /* ----- 거실 ----- */
  sofa:{label:'소파',cat:'living',desc:'코너형 · 일자형',need:40,
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
  armchair:{label:'라운지 체어',cat:'living',need:40,
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
    defaults:{size:'230x170',c:'#bdb4a6'},dims:rugSize,round:it=>it.size[0]==='r',
    slots:[{k:'c',role:'rug',label:'색'}],
    opts:[{k:'size',label:'크기',choices:[['230x170','230×170'],['300x200','300×200'],['200x140','200×140'],['r200','원형 200']]}],
    build(it,g){
      const [w,d]=rugSize(it).map(cm),c=MC(it.c,1),inner=MC(shade(it.c,.12),1);
      let a,b;
      if(it.size[0]==='r'){a=cyl(g,w/2,w/2,.012,c,0,.004,0,48);b=cyl(g,w/2-.08,w/2-.08,.003,inner,0,.014,0,48);}
      else{a=add(g,w,.012,d,c,0,.004,0);b=add(g,w-.16,.003,d-.16,inner,0,.014,0);}
      a.castShadow=b.castShadow=false;
    }},

  /* ----- 침실 ----- */
  bed:{label:'침대',cat:'bedroom',need:60,
    defaults:{size:160,c:'#b8c3c5',w:'#c4a47c'},dims:it=>[it.size+10,215],
    slots:[{k:'c',role:'bedding',label:'이불'},{k:'w',role:'wood',label:'프레임'}],
    opts:[{k:'size',label:'매트리스',choices:[[110,'슈퍼싱글'],[150,'퀸'],[160,'킹'],[180,'라지킹']]}],
    build(it,g){
      const mw=cm(it.size),W=mw+.1,fr=MC(it.w,.7),sheet=MC('#f5f3ee',1);
      add(g,W,.28,2.05,fr,0,0,.05);
      add(g,W,1.05,.1,fr,0,0,-1.025);
      add(g,mw,.24,2.0,sheet,0,.28,.05);
      add(g,mw+.06,.26,1.42,MC(it.c,1),0,.29,.33);
      const np=mw>1.3?2:1;
      for(let k=0;k<np;k++)add(g,mw/np-.08,.13,.42,sheet,np===1?0:(k?1:-1)*mw/4,.52,-.74);
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
      cyl(g,.03,.03,.38,metalMat,0,.06,.78,12);
      add(g,.6,.03,.06,metalMat,0,.03,.78);add(g,.06,.03,.6,metalMat,0,.03,.78);
      add(g,.5,.08,.48,chair,0,.44,.78);
      add(g,.48,.58,.06,chair,0,.5,1.03);
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
  lamp:{label:'플로어 램프',cat:'deco',round:true,
    defaults:{c:'#f3e6cc'},dims:()=>[40,40],
    slots:[{k:'c',role:'shade',label:'갓'}],
    build(it,g){cyl(g,.16,.17,.03,metalMat,0,0,0);cyl(g,.012,.012,1.36,metalMat,0,.03,0,8);cyl(g,.15,.21,.32,shadeMat(it.c),0,1.34,0);}},
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
      {k:'ht',label:'길이',choices:[[2.3,'2.3m'],[2.6,'2.6m'],[4.9,'복층 4.9m']]}],
    build(it,g){
      const W=cm(it.width),ht=it.ht,mat=MC(it.c,1),n=Math.max(4,Math.round(W/.1)),pw=W/n;
      for(let i=0;i<n;i++){const m=add(g,pw*1.1,ht-.05,.025,mat,-W/2+pw*(i+.5),.015,i%2?.025:-.02);if(i%2)m.castShadow=false;}
      add(g,W+.1,.025,.025,metalMat,0,ht-.04,0);
    }},
};

function withDefaults(it){
  const T=TYPES[it.type];
  return Object.assign({rot:0,lv:0,label:T.label},JSON.parse(JSON.stringify(T.defaults||{})),it);
}
const isRound=it=>{const r=TYPES[it.type].round;return typeof r==='function'?r(it):!!r;};
