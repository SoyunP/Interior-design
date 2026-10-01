'use strict';
/* Procedural textures and the finish options offered in the 꾸미기 tab. */
function canvasTex(w,h,draw,repeat){
  const c=document.createElement('canvas');c.width=w;c.height=h;
  const g=c.getContext('2d');draw(g,w,h);
  const t=new THREE.CanvasTexture(c);
  if(repeat){t.wrapS=t.wrapT=THREE.RepeatWrapping;}
  t.encoding=THREE.sRGBEncoding;t.anisotropy=renderer.capabilities.getMaxAnisotropy?Math.min(8,renderer.capabilities.getMaxAnisotropy()):4;
  return t;
}
// draws fn at (x,y) and at its wrapped copies so blobs near an edge tile seamlessly
function wrapDraw(s,x,y,r,fn){
  for(const ox of [-s,0,s])for(const oy of [-s,0,s]){
    const X=x+ox,Y=y+oy;if(X+r<0||X-r>s||Y+r<0||Y-r>s)continue;fn(X,Y);
  }
}
// 8 rows of planks per texture
function woodTexture(o){
  return canvasTex(512,512,(g,s)=>{
    const rows=8,h=s/rows;
    for(let r=0;r<rows;r++){
      let x=-rnd()*s*0.6;
      while(x<s){
        const len=s*(0.5+rnd()*0.45);
        g.fillStyle=`hsl(${o.h+rnd()*4},${o.s+rnd()*8}%,${o.l+rnd()*(o.v||9)}%)`;
        g.fillRect(x,r*h,len,h);
        g.strokeStyle=o.grain||'rgba(95,62,30,0.10)';g.lineWidth=1;
        for(let k=0;k<7;k++){const y=r*h+rnd()*h;g.beginPath();g.moveTo(x,y);
          g.bezierCurveTo(x+len*.3,y+rnd()*6-3,x+len*.6,y+rnd()*6-3,x+len,y+rnd()*4-2);g.stroke();}
        g.fillStyle=o.seam||'rgba(60,40,20,0.28)';g.fillRect(x,r*h,1.5,h);
        x+=len;
      }
      g.fillStyle=o.seam||'rgba(60,40,20,0.25)';g.fillRect(0,r*h,s,1.5);
    }
  },true);
}
// 2 × 2 tiles per texture
function marbleTexture(o){
  o=o||{};
  return canvasTex(512,512,(g,s)=>{
    g.fillStyle=o.base||'#eeedea';g.fillRect(0,0,s,s);
    for(let i=0;i<(o.veins||18);i++){
      g.strokeStyle=`rgba(${o.vein||'115,118,124'},${(o.va||.06)+rnd()*(o.vb||.16)})`;g.lineWidth=0.6+rnd()*1.8;
      g.beginPath();let x=rnd()*s,y=rnd()*s;g.moveTo(x,y);
      for(let k=0;k<7;k++){x+=rnd()*110-25;y+=rnd()*90-45;g.lineTo(x,y);}g.stroke();
    }
    g.strokeStyle=o.grout||'rgba(150,150,150,0.55)';g.lineWidth=2;
    [[0,0],[s/2,0],[0,s/2],[s/2,s/2]].forEach(([a,b])=>g.strokeRect(a+1,b+1,s/2-2,s/2-2));
  },true);
}
function terrazzoTexture(){
  return canvasTex(512,512,(g,s)=>{
    g.fillStyle='#e9e5dd';g.fillRect(0,0,s,s);
    const cols=['#b9b2a6','#8e8a84','#d6ccbc','#b07f66','#6f7378','#f6f3ec','#c9b48f'];
    for(let i=0;i<900;i++){
      const x=rnd()*s,y=rnd()*s,r=2+rnd()*rnd()*12,col=cols[Math.floor(rnd()*cols.length)],n=4+Math.floor(rnd()*3),a0=rnd()*6;
      g.fillStyle=col;
      wrapDraw(s,x,y,r,(X,Y)=>{g.beginPath();for(let k=0;k<n;k++){const a=a0+k/n*Math.PI*2,rr=r*(.6+rnd()*.4);g.lineTo(X+Math.cos(a)*rr,Y+Math.sin(a)*rr);}g.closePath();g.fill();});
    }
  },true);
}
function concreteTexture(){
  return canvasTex(512,512,(g,s)=>{
    g.fillStyle='#bdbcb8';g.fillRect(0,0,s,s);
    for(let i=0;i<1600;i++){
      const x=rnd()*s,y=rnd()*s,r=3+rnd()*34,l=rnd()>.5;
      g.fillStyle=l?`rgba(235,234,230,${rnd()*.06})`:`rgba(80,80,78,${rnd()*.05})`;
      wrapDraw(s,x,y,r,(X,Y)=>{g.beginPath();g.arc(X,Y,r,0,Math.PI*2);g.fill();});
    }
    for(let i=0;i<500;i++){g.fillStyle=`rgba(70,70,68,${.2+rnd()*.3})`;g.fillRect(rnd()*s,rnd()*s,1+rnd(),1+rnd());}
  },true);
}
// vertical slats, 12 per texture (one texture ≈ 60cm of wall)
function slatTexture(hex){
  return canvasTex(512,64,(g,w,h)=>{
    const n=12,sw=w/n;
    for(let i=0;i<n;i++){
      g.fillStyle=shade(hex,(rnd()-.5)*.14);g.fillRect(i*sw,0,sw,h);
      g.fillStyle='rgba(20,15,10,0.55)';g.fillRect(i*sw,0,3,h);
    }
  },true);
}

const marbleT=marbleTexture();
const viewT=canvasTex(1024,480,(g,w,h)=>{
  const sky=g.createLinearGradient(0,0,0,h*.6);sky.addColorStop(0,'#b9cfdb');sky.addColorStop(1,'#eef1ee');
  g.fillStyle=sky;g.fillRect(0,0,w,h);
  const ridge=(base,col,amp,f,ph)=>{g.fillStyle=col;g.beginPath();g.moveTo(0,h);
    for(let x=0;x<=w;x+=6){const y=h*base-amp*(Math.sin(x*f+ph)*.6+Math.sin(x*f*2.7+ph*1.7)*.3)-rnd()*amp*.08;g.lineTo(x,y);}
    g.lineTo(w,h);g.closePath();g.fill();};
  ridge(.50,'#aebdb4',34,.006,1.2);
  ridge(.56,'#88a281',30,.009,2.4);
  for(let i=0;i<9;i++){const bx=rnd()*w,bw=30+rnd()*70,bh=14+rnd()*40;g.fillStyle=rnd()>.5?'#e8e9e6':'#cfd3d2';g.fillRect(bx,h*.62-bh,bw,bh);}
  ridge(.66,'#5f8455',18,.02,.4);
  for(let i=0;i<900;i++){g.fillStyle=`rgba(${40+rnd()*30},${70+rnd()*40},${40+rnd()*20},.55)`;g.beginPath();g.arc(rnd()*w,h*.64+rnd()*h*.36,3+rnd()*7,0,Math.PI*2);g.fill();}
},false);

/* ---------- finish options ---------- */
// period: metres covered by one texture tile (floor UVs are in metres)
const FLOORS={
  oak:{name:'밝은 오크',sw:'#dcc6a6',period:1.6,rough:.7,make:()=>woodTexture({h:33,s:28,l:70})},
  natural:{name:'내추럴 오크',sw:'#c29a6c',period:1.6,rough:.7,make:()=>woodTexture({h:30,s:38,l:55})},
  ash:{name:'화이트 애쉬',sw:'#ebe3d5',period:1.6,rough:.7,make:()=>woodTexture({h:38,s:22,l:83,v:6,grain:'rgba(120,95,60,0.08)',seam:'rgba(90,70,40,0.18)'})},
  walnut:{name:'월넛',sw:'#6f5240',period:1.6,rough:.65,make:()=>woodTexture({h:24,s:30,l:30,v:7,grain:'rgba(30,18,8,0.18)',seam:'rgba(20,12,6,0.45)'})},
  grey:{name:'그레이 우드',sw:'#b8b5ae',period:1.6,rough:.7,make:()=>woodTexture({h:40,s:4,l:64,v:8,grain:'rgba(60,60,60,0.10)',seam:'rgba(40,40,40,0.25)'})},
  marble:{name:'화이트 마블 타일',sw:'#eeedea',period:1.2,rough:.32,make:()=>marbleTexture()},
  porcelain:{name:'그레이 포세린',sw:'#c8c7c3',period:1.2,rough:.45,make:()=>marbleTexture({base:'#cac9c5',veins:6,va:.04,vb:.08,grout:'rgba(120,120,120,0.5)'})},
  terrazzo:{name:'테라조',sw:'#e3ddd2',period:1.0,rough:.5,make:terrazzoTexture},
  concrete:{name:'콘크리트',sw:'#b9b8b4',period:2.0,rough:.8,make:concreteTexture},
};
const _floorTex={};
function floorTex(k){
  if(!_floorTex[k]){const o=FLOORS[k];const t=o.make();t.repeat.set(1/o.period,1/o.period);_floorTex[k]=t;}
  return _floorTex[k];
}
const PAINTS=[
  ['#f3f2ef','화이트'],['#efe8dc','웜 화이트'],['#e2dbcf','라이트 그레이지'],['#cfc6b8','그레이지'],
  ['#d5dccf','세이지'],['#c6d0d6','더스티 블루'],['#e6cfc4','핑크 베이지'],['#d8b49c','테라코타'],
  ['#a9ab95','올리브'],['#5d6063','차콜'],
];
const TV_FINISHES=[
  ['marble','마블'],['paint','벽과 같은 페인트'],['oakSlat','오크 템바보드'],['walnutSlat','월넛 템바보드'],['charcoal','차콜'],
];
const MOODS={
  day:{name:'낮',sun:1.35,sunCol:'#fff3e2',sunPos:[6.5,9.5,16],hemi:.95,sky:'#f4f7f9',ground:'#c7bdad',amb:.12,ambCol:'#ffffff',exp:1.05,
    bg:'#dfe8ee',fog:'#e4ebef',point:0,lamp:.6,glow:'#fff3da',view:'#ffffff',out:'#93a189'},
  evening:{name:'저녁',sun:1.0,sunCol:'#ffb070',sunPos:[13,3.6,16],hemi:.6,sky:'#f3dcc8',ground:'#a89580',amb:.1,ambCol:'#ffe6cc',exp:1.0,
    bg:'#e8c9b0',fog:'#e8cdb6',point:.5,lamp:1.4,glow:'#ffe2b0',view:'#f0b890',out:'#7d7a62'},
  night:{name:'밤',sun:0,sunCol:'#ffffff',sunPos:[6.5,9.5,16],hemi:.22,sky:'#7f8fae',ground:'#3a3530',amb:.08,ambCol:'#ffd9b0',exp:1.15,
    bg:'#1b2130',fog:'#1b2130',point:1.15,lamp:2.4,glow:'#fff0d0',view:'#2a3247',out:'#20261f'},
};
