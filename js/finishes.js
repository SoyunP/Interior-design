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
// two 60 x 120 polished tiles per texture, each with its own soft diagonal veining
function whiteMarbleTexture(){
  return canvasTex(1024,1024,(g,s)=>{
    const tw=s/2;
    g.lineJoin=g.lineCap='round';
    for(let t=0;t<2;t++){
      const x0=t*tw,a0=-.95+rnd()*.5;
      g.save();g.beginPath();g.rect(x0,0,tw,s);g.clip();
      g.fillStyle=`hsl(40,${8+rnd()*6}%,${94+rnd()*2}%)`;g.fillRect(x0,0,tw,s);
      const veins=(n,w0,w1,alpha,blur,rgb)=>{
        g.filter=`blur(${blur}px)`;
        for(let i=0;i<n;i++){
          let x=x0+rnd()*tw*1.4-tw*.2,y=rnd()*s*1.2-s*.1,a=a0+(rnd()-.5)*.4;
          g.strokeStyle=`rgba(${rgb},${alpha*(.5+rnd())})`;g.lineWidth=w0+rnd()*(w1-w0);
          g.beginPath();g.moveTo(x,y);
          for(let k=0;k<10;k++){a+=(rnd()-.5)*.5;x+=Math.cos(a)*60;y+=Math.sin(a)*60;g.lineTo(x,y);}
          g.stroke();
        }
      };
      veins(14,40,120,.05,30,'150,148,144');
      veins(22,6,20,.08,8,'135,133,130');
      veins(30,.8,2.4,.25,1,'120,118,115');
      g.filter='none';g.restore();
    }
    g.strokeStyle='rgba(150,150,148,0.75)';g.lineWidth=1.5;
    for(let t=0;t<2;t++)g.strokeRect(t*tw+.75,.75,tw-1.5,s-1.5);
  },true);
}
// 12 rows of 20 x 120 planks with soft cathedral grain; each row is drawn
// into a strip and placed twice so the staggered joints wrap seamlessly
// o: h/s/l base colour, hv hue spread, ink grain rgb, k grain contrast,
//    lines straight-grain count, wave grain waviness (px), fig share of planks with cathedral figure
function plankTexture(o){
  o=Object.assign({hv:10,ink:'70,60,52',k:1,lines:16,wave:2.5,fig:.65},o);
  return canvasTex(1024,1024,(g,s)=>{
    const rows=12,h=s/rows,len=s/2;
    const strip=document.createElement('canvas');strip.width=s;strip.height=h;
    const q=strip.getContext('2d');q.lineCap='round';
    const plank=x=>{
      q.save();q.beginPath();q.rect(x,0,len,h);q.clip();
      q.fillStyle=`hsl(${o.h+rnd()*o.hv},${o.s+rnd()*4}%,${o.l+rnd()*8}%)`;q.fillRect(x,0,len,h);
      q.filter='blur(4px)';
      for(let k=0;k<7;k++){q.fillStyle=`rgba(${rnd()<.5?'255,252,248':o.ink},${(.04+rnd()*.07)*o.k})`;q.fillRect(x,rnd()*h,len,3+rnd()*12);}
      q.filter='blur(.6px)';
      for(let k=0;k<o.lines;k++){
        const y=rnd()*h,w=o.wave;q.strokeStyle=`rgba(${o.ink},${(.05+rnd()*.1)*o.k})`;q.lineWidth=.8+rnd();
        q.beginPath();q.moveTo(x,y);q.bezierCurveTo(x+len*.33,y+(rnd()*2-1)*w,x+len*.66,y+(rnd()*2-1)*w,x+len,y+(rnd()*2-1)*w*.8);q.stroke();
      }
      if(rnd()<o.fig){
        const cx=x+len*(.25+rnd()*.6),cy=h*(.3+rnd()*.4),dir=rnd()<.5?1:-1,n=5+(rnd()*4|0);
        for(let j=0;j<n;j++){
          const ry=3+j*h*.075,rx=ry*(2.6+rnd()*.8)+j*8;
          q.strokeStyle=`rgba(${j%2?'252,249,244':o.ink},${(.1+rnd()*.14)*o.k})`;q.lineWidth=1+rnd()*1.6;
          q.beginPath();q.moveTo(cx-dir*len,cy-ry);q.lineTo(cx,cy-ry);
          q.ellipse(cx,cy,rx,ry,0,-Math.PI/2,Math.PI/2,dir<0);q.lineTo(cx-dir*len,cy+ry);q.stroke();
        }
      }
      q.filter='none';q.restore();
      q.fillStyle='rgba(45,38,32,.5)';q.fillRect(x,0,1.5,h);
    };
    for(let r=0;r<rows;r++){
      q.clearRect(0,0,s,h);plank(0);plank(len);
      const x0=-rnd()*s;g.drawImage(strip,x0,r*h);g.drawImage(strip,x0+s,r*h);
      g.fillStyle='rgba(45,38,32,.45)';g.fillRect(0,r*h,s,1.5);
    }
  },true);
}
// near-white silk wallpaper: soft mottling plus fine crossing fibres, tinted by the wall colour
function wallpaperTexture(){
  return canvasTex(512,512,(g,s)=>{
    g.fillStyle='#f2f2f2';g.fillRect(0,0,s,s);
    g.filter='blur(14px)';
    for(let i=0;i<60;i++){
      const x=rnd()*s,y=rnd()*s,r=20+rnd()*60;g.fillStyle=rnd()<.5?`rgba(255,255,255,${.1+rnd()*.15})`:`rgba(90,80,70,${.03+rnd()*.05})`;
      wrapDraw(s,x,y,r+30,(X,Y)=>{g.beginPath();g.arc(X,Y,r,0,Math.PI*2);g.fill();});
    }
    g.filter='none';
    for(let y=0;y<s;y++){g.fillStyle=`rgba(${rnd()<.5?'255,255,255':'80,72,64'},${rnd()*.07})`;g.fillRect(0,y,s,1);}
    for(let x=0;x<s;x+=2){g.fillStyle=`rgba(80,72,64,${rnd()*.04})`;g.fillRect(x,0,1,s);}
    for(let i=0;i<9000;i++){g.fillStyle=rnd()<.5?`rgba(255,255,255,${rnd()*.18})`:`rgba(70,62,55,${rnd()*.1})`;g.fillRect(rnd()*s,rnd()*s,1+rnd()*4,1);}
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

/* ---------- rug weaves (tinted ones are drawn near-white and multiplied by the rug colour) ---------- */
function kilimTexture(){
  return canvasTex(512,128,(g,w,h)=>{
    const cols=['#3f4954','#e8e0cc','#c7b48c','#b9c4b0','#c46f58','#8a4636','#6b5a3f','#9ba579','#d8c9a5','#7d8b93'];
    for(let x=0;x<w;){
      const sw=4+rnd()*rnd()*40;
      g.fillStyle=cols[Math.floor(rnd()*cols.length)];g.fillRect(x,0,Math.min(sw,w-x),h);
      if(rnd()<.35){g.fillStyle=cols[Math.floor(rnd()*cols.length)];g.fillRect(x+sw*.45,0,1.5,h);}
      x+=sw;
    }
    for(let y=0;y<h;y+=2){g.fillStyle=`rgba(0,0,0,${.05+rnd()*.05})`;g.fillRect(0,y,w,1);}
    for(let i=0;i<3000;i++){g.fillStyle=`rgba(255,255,255,${rnd()*.08})`;g.fillRect(rnd()*w,rnd()*h,1+rnd()*2,1);}
  },true);
}
// shirting-style blue stripes (one 256px repeat drawn twice) over a fine twill weave
function blueStripeTexture(){
  const seq=[['#f3f6fb',10],['#9dbde8',14],['#ffffff',3],['#9dbde8',6],['#6a8fd6',8],['#f3f6fb',6],['#2d3e9b',7],
    ['#a8c4ea',16],['#ffffff',2],['#a8c4ea',10],['#7f97b8',12],['#f3f6fb',8],['#5b84d0',10],['#ffffff',3],['#5b84d0',5],
    ['#b7cfee',22],['#2d3e9b',4],['#b7cfee',8],['#f3f6fb',14],['#8aaee2',18],['#ffffff',2],['#8aaee2',8],['#6d84ad',10],
    ['#f3f6fb',5],['#9dbde8',20],['#a8c4ea',25]];
  return canvasTex(512,128,(g,w,h)=>{
    for(let x=0;x<w;)for(const [c,sw] of seq){g.fillStyle=c;g.fillRect(x,0,sw,h);x+=sw;}
    for(let x=0;x<w;x+=2){g.fillStyle=`rgba(255,255,255,${.03+rnd()*.06})`;g.fillRect(x,0,1,h);}
    g.strokeStyle='rgba(20,30,70,.07)';g.lineWidth=1;
    for(let i=-h;i<w+h;i+=4){g.beginPath();g.moveTo(i,0);g.lineTo(i+h,h);g.stroke();}
    for(let i=0;i<2500;i++){g.fillStyle=rnd()<.5?`rgba(255,255,255,${rnd()*.1})`:`rgba(20,30,80,${rnd()*.06})`;g.fillRect(rnd()*w,rnd()*h,1+rnd()*3,1);}
  },true);
}
function linenTexture(){
  return canvasTex(256,256,(g,s)=>{
    g.fillStyle='#ececec';g.fillRect(0,0,s,s);
    for(let y=0;y<s;y+=2){g.fillStyle=`rgba(0,0,0,${.04+rnd()*.06})`;g.fillRect(0,y,s,1);}
    for(let x=0;x<s;x+=2){g.fillStyle=`rgba(255,255,255,${.04+rnd()*.06})`;g.fillRect(x,0,1,s);}
    g.lineWidth=1;
    for(let i=0;i<500;i++){
      const x=rnd()*s,y=rnd()*s,l=6+rnd()*18;
      g.strokeStyle=rnd()<.5?`rgba(40,30,20,${.06+rnd()*.1})`:`rgba(255,255,255,${.08+rnd()*.12})`;
      wrapDraw(s,x,y,l,(X,Y)=>{g.beginPath();g.moveTo(X,Y);g.lineTo(X+l*.35,Y+l);g.stroke();});
    }
  },true);
}
function floralTexture(){
  return canvasTex(256,256,(g,s)=>{
    g.fillStyle='#e9e3d4';g.fillRect(0,0,s,s);
    for(let i=0;i<70;i++){
      const x=rnd()*s,y=rnd()*s,a=rnd()*Math.PI*2,col=rnd()<.6?'#7a6650':'#8d8b73';
      wrapDraw(s,x,y,14,(X,Y)=>{
        g.save();g.translate(X,Y);g.rotate(a);g.strokeStyle=g.fillStyle=col;g.lineWidth=1;
        g.beginPath();g.moveTo(-10,0);g.quadraticCurveTo(0,-4,10,0);g.stroke();
        for(const t of [-6,-1,4])for(const sd of [-1,1]){g.beginPath();g.ellipse(t,sd*3,3,1.3,sd*.6,0,Math.PI*2);g.fill();}
        g.beginPath();g.arc(11,0,2.2,0,Math.PI*2);g.fill();
        g.restore();
      });
    }
  },true);
}
function boucleTexture(){
  return canvasTex(256,256,(g,s)=>{
    g.fillStyle='#e9e9e9';g.fillRect(0,0,s,s);
    for(let i=0;i<5000;i++){
      const x=rnd()*s,y=rnd()*s,r=.8+rnd()*2.4;
      g.fillStyle=rnd()<.5?`rgba(255,255,255,${.15+rnd()*.25})`:`rgba(60,50,40,${.08+rnd()*.14})`;
      wrapDraw(s,x,y,r,(X,Y)=>{g.beginPath();g.arc(X,Y,r,0,Math.PI*2);g.fill();});
    }
  },true);
}
// 8 vertical ribs per tile, light enough to tint with the fabric colour
function corduroyTexture(){
  return canvasTex(64,64,(g,s)=>{
    for(let x=0;x<s;x++){const v=Math.round(190+65*Math.sin((x%8)/8*Math.PI));g.fillStyle=`rgb(${v},${v},${v})`;g.fillRect(x,0,1,s);}
  },true);
}
/* ---------- bedding ---------- */
// seersucker: rows of soft puckers, near white so it takes the bedding colour
function seersuckerTexture(){
  return canvasTex(128,128,(g,s)=>{
    g.fillStyle='#f2f2f2';g.fillRect(0,0,s,s);
    const c=8;
    for(let y=0;y<s;y+=c)for(let x=0;x<s;x+=c){
      const gr=g.createRadialGradient(x+c/2,y+c/2,0,x+c/2,y+c/2,c*.7);
      gr.addColorStop(0,`rgba(255,255,255,${.5+rnd()*.3})`);gr.addColorStop(1,`rgba(120,120,120,${.18+rnd()*.1})`);
      g.fillStyle=gr;g.fillRect(x,y,c,c);
    }
    for(let y=0;y<s;y+=c*2){g.fillStyle='rgba(110,110,110,.12)';g.fillRect(0,y,s,1);}
  },true);
}
// white cotton with thin dotted blue-grey lines and a red-brown zigzag, four bands per tile
function duvetStripeTexture(){
  return canvasTex(256,256,(g,s)=>{
    g.fillStyle='#f6f4ef';g.fillRect(0,0,s,s);
    for(let b=0;b<4;b++){
      const y=b*64;
      g.fillStyle='rgba(120,138,155,.55)';for(let x=0;x<s;x+=4){g.fillRect(x,y+10,2.5,2);g.fillRect(x+2,y+15,2.5,2);}
      g.strokeStyle='rgba(138,75,62,.75)';g.lineWidth=1.6;g.beginPath();
      for(let x=0;x<=s;x+=4)g.lineTo(x,y+30+(x%8?2.5:-2.5));g.stroke();
      g.fillStyle='rgba(120,138,155,.45)';g.fillRect(0,y+44,s,1.5);
      g.fillStyle='rgba(176,168,150,.35)';g.fillRect(0,y+50,s,4);
    }
    for(let i=0;i<1500;i++){g.fillStyle=`rgba(0,0,0,${rnd()*.03})`;g.fillRect(rnd()*s,rnd()*s,2,1);}
  },true);
}
const BEDDING={
  seer:{name:'시어서커',tint:true,bump:.01,make:seersuckerTexture,rep:[14,10]},
  stripe:{name:'스트라이프',make:duvetStripeTexture,rep:[1,3]},
  plain:{name:'무지 코튼',tint:true},
};
const _bedTex={},_bedMat=new Map();
function beddingMat(k,c){
  const P=BEDDING[k]||BEDDING.plain,key=k+'|'+(P.tint?c:'');
  let m=_bedMat.get(key);
  if(!m){
    let t=null;
    if(P.make){t=_bedTex[k]||(_bedTex[k]=P.make());t.repeat.set(...P.rep);}
    m=new THREE.MeshStandardMaterial({map:t,color:lin(P.tint?c:'#ffffff'),roughness:1});
    if(P.bump){m.bumpMap=t;m.bumpScale=P.bump;}
    _bedMat.set(key,m);
  }
  return m;
}
// period: metres covered by one tile; border: outer band and inner band colours framing the field
const RUG_PATTERNS={
  kilim:{name:'킬림 스트라이프',period:1.0,make:kilimTexture},
  blueStripe:{name:'블루 스트라이프',period:1.2,make:blueStripeTexture},
  linen:{name:'린넨 위브',period:.3,tint:true,make:linenTexture},
  floral:{name:'플로럴 프린트',period:.35,border:['#a7b4a5','#e4dccb'],make:floralTexture},
  boucle:{name:'부클 텍스처',period:.25,tint:true,bump:.05,make:boucleTexture},
};
const _rugTex={},_rugMat=new Map();
function rugTex(k){return _rugTex[k]||(_rugTex[k]=RUG_PATTERNS[k].make());}
function rugMat(k,c){
  const P=RUG_PATTERNS[k],key=k+'|'+(P.tint?c:'');
  let m=_rugMat.get(key);
  if(!m){
    const t=rugTex(k);
    m=new THREE.MeshStandardMaterial({map:t,color:lin(P.tint?c:'#ffffff'),roughness:1});
    if(P.bump){m.bumpMap=t;m.bumpScale=P.bump;}
    _rugMat.set(key,m);
  }
  return m;
}
function rugPreview(k){const P=RUG_PATTERNS[k];return P.preview||(P.preview=rugTex(k).image.toDataURL());}

const marbleT=marbleTexture();
// one book-matched greige stone slab for the kitchen backsplash: soft cloudy bands with long, nearly level dark veins
const backsplashT=canvasTex(1536,512,(g,w,h)=>{
  g.fillStyle='#cfcac2';g.fillRect(0,0,w,h);
  g.lineCap=g.lineJoin='round';
  const band=(n,w0,w1,alpha,blur,rgb)=>{
    g.filter=`blur(${blur}px)`;
    for(let i=0;i<n;i++){
      let x=-60,y=rnd()*h,a=(rnd()-.5)*.12;
      g.strokeStyle=`rgba(${rgb},${alpha*(.5+rnd())})`;g.lineWidth=w0+rnd()*(w1-w0);
      g.beginPath();g.moveTo(x,y);
      while(x<w+60){a+=(rnd()-.5)*.08;a=Math.max(-.14,Math.min(.14,a));x+=40;y+=Math.sin(a)*40;g.lineTo(x,y);}
      g.stroke();
    }
  };
  band(10,40,110,.10,28,'235,232,226');
  band(8,30,80,.08,24,'150,141,130');
  band(12,4,14,.14,5,'120,110,100');
  band(16,.8,2.6,.45,.6,'78,70,62');
  g.filter='none';
},false);
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
  smokeOak:{name:'스모크 그레이 오크',sw:'#a89e95',period:2.4,rough:.6,make:()=>plankTexture({h:24,s:7,l:57,hv:6,ink:'84,76,72',k:1.4,lines:26,wave:5,fig:.85})},
  greigeOak:{name:'그레이지 오크',sw:'#b9ab9c',period:2.4,rough:.6,make:()=>plankTexture({h:24,s:12,l:63,hv:5,ink:'98,80,66',k:1.6,lines:28,wave:6,fig:.9})},
  marble:{name:'화이트 마블 (60×120)',sw:'#eeedea',period:1.2,rough:.25,make:whiteMarbleTexture},
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
  ['#f3f2ef','화이트'],['#efe8dc','웜 화이트'],['#e9e1cf','크림 베이지'],['#d8ceb0','샌드 베이지'],['#e2dbcf','라이트 그레이지'],['#cfc6b8','그레이지'],
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
