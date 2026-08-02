/* ═══════════════════════════════════════════════════════════════════
   AGI RUN — процедурный арт-движок
   Ни одного PNG. Все персонажи, враги, боссы, тайлы и фоны рисуются
   кодом на canvas. Анимация считается математикой, а не покадровкой.

   Система координат персонажа: начало в центре стоп, ось Y вверх = минус.
   Рост = 102 условных единицы, потом масштабируется под нужный размер.
   ═══════════════════════════════════════════════════════════════════ */
"use strict";
const ART = (function () {

/* ───────────────────────── утилиты ───────────────────────── */
function hex2rgb(h){ h=h.replace('#',''); if(h.length===3) h=h.split('').map(c=>c+c).join('');
  return [parseInt(h.slice(0,2),16),parseInt(h.slice(2,4),16),parseInt(h.slice(4,6),16)]; }
function rgb2hex(r,g,b){ return '#'+[r,g,b].map(v=>Math.max(0,Math.min(255,Math.round(v)))
  .toString(16).padStart(2,'0')).join(''); }
function shade(col,k){ const [r,g,b]=hex2rgb(col);
  return k<0 ? rgb2hex(r*(1+k),g*(1+k),b*(1+k))
             : rgb2hex(r+(255-r)*k,g+(255-g)*k,b+(255-b)*k); }
/** контурный цвет = тёмная версия заливки, а не чёрный. Это ключ к «дорогому» виду */
function ink(col){ return shade(col,-0.55); }

let X = null;                                  // текущий контекст
let LW = 3;                                    // толщина контура в единицах персонажа
function setCtx(ctx){ X = ctx; }

function fs(c){ X.fillStyle=c; } function ss(c){ X.strokeStyle=c; }
function stroke(c,w){ X.lineWidth=w||LW; X.lineJoin='round'; X.lineCap='round'; ss(c); X.stroke(); }

function circle(x,y,r){ X.beginPath(); X.arc(x,y,r,0,6.2832); }
function ellipse(x,y,rx,ry,rot){ X.beginPath(); X.ellipse(x,y,rx,ry,rot||0,0,6.2832); }
function rrect(x,y,w,h,r){
  r=Math.min(r,Math.abs(w)/2,Math.abs(h)/2);
  X.beginPath(); X.moveTo(x+r,y);
  X.arcTo(x+w,y,x+w,y+h,r); X.arcTo(x+w,y+h,x,y+h,r);
  X.arcTo(x,y+h,x,y,r);     X.arcTo(x,y,x+w,y,r); X.closePath();
}
function poly(pts,close){ X.beginPath(); X.moveTo(pts[0][0],pts[0][1]);
  for(let i=1;i<pts.length;i++) X.lineTo(pts[i][0],pts[i][1]); if(close!==false) X.closePath(); }
/** капсула — основа всех конечностей */
function capsule(x1,y1,x2,y2,w){
  const a=Math.atan2(y2-y1,x2-x1), r=w/2;
  X.beginPath();
  X.arc(x1,y1,r,a+Math.PI/2,a-Math.PI/2);
  X.arc(x2,y2,r,a-Math.PI/2,a+Math.PI/2);
  X.closePath();
}
function fillStroke(col){ fs(col); X.fill(); stroke(ink(col)); }

/** двухсегментная конечность. Углы от «строго вниз», по часовой. Возвращает координату кисти/стопы */
function limb(ox,oy,a1,l1,a2,l2,w,col){
  const x1=ox+Math.sin(a1)*l1, y1=oy+Math.cos(a1)*l1;
  const x2=x1+Math.sin(a1+a2)*l2, y2=y1+Math.cos(a1+a2)*l2;
  capsule(ox,oy,x1,y1,w);  fillStroke(col);
  capsule(x1,y1,x2,y2,w*0.92); fillStroke(col);
  return {x:x2,y:y2,ex:x1,ey:y1};
}

/* ───────────────────────── персонажи ───────────────────────── */
/* Пропорции: голова r=20, торс -66..-28, бедро -30, плечо -62.
   Голова = 40% роста → чиби. Это делает шарж добрым, а не злым,
   и позволяет читать лицо на спрайте 96 px.                       */

const SKIN = { light:'#F6C9A0', tan:'#E7B183', med:'#D9A273', warm:'#F2C49B' };

const CAST = {
  altman:{ name:'Сэм Альтман', co:'OpenAI', letter:'S', color:'#10A37F',
    skin:SKIN.light, hair:'#6B4A32', hairStyle:'sideSwept', brows:'#5A3D28',
    outfit:'hoodie', pants:'#3B4252', glasses:null, acc:null, mouth:'smirk',
    fw:1.00, hv:1.00 },

  amodei:{ name:'Дарио Амодей', co:'Anthropic', letter:'D', color:'#D97757',
    skin:SKIN.light, hair:'#3A2A22', hairStyle:'curly', brows:'#2E211B',
    outfit:'shirt', pants:'#4A4038', glasses:'round', acc:null, mouth:'think',
    fw:0.96, hv:1.26, stubble:0.18 },

  demis:{ name:'Демис Хассабис', co:'DeepMind', letter:'H', color:'#4285F4',
    skin:SKIN.tan, hair:'#241C18', hairStyle:'buzz', brows:'#1C1512',
    outfit:'polo', pants:'#2B3550', glasses:null, acc:'chess', mouth:'calm',
    fw:1.07, hv:1.00, stubble:0.22 },

  musk:{ name:'Илон Маск', co:'xAI', letter:'E', color:'#34343F',
    skin:SKIN.light, hair:'#4A3B32', hairStyle:'shortWave', brows:'#3A2E27',
    outfit:'tee', pants:'#1E212A', glasses:null, acc:'rocket', mouth:'smirk',
    fw:1.01, hv:1.08 },

  satya:{ name:'Сатья Наделла', co:'Microsoft', letter:'N', color:'#3A6FD8',
    skin:SKIN.med, hair:'#26201C', hairStyle:'receding', brows:'#1E1815',
    outfit:'shirt', pants:'#2E3440', glasses:'rect', acc:'cloud', mouth:'calm',
    fw:0.97, hv:0.94 },

  liang:{ name:'Лян Вэньфэн', co:'DeepSeek', letter:'L', color:'#3A57E8',
    skin:SKIN.warm, hair:'#14100E', hairStyle:'flat', brows:'#0E0B09',
    outfit:'shirt', pants:'#22252E', glasses:'rect', acc:'whale', mouth:'calm',
    fw:1.02, hv:1.00 },

  yang:{ name:'Ян Чжилинь', co:'Moonshot · Kimi', letter:'Y', color:'#7B61FF',
    skin:SKIN.warm, hair:'#181310', hairStyle:'shortWave', brows:'#100C0A',
    outfit:'hoodie', pants:'#2A2438', glasses:null, acc:'crescent', mouth:'smile',
    fw:0.94, hv:0.96 },

  zuck:{ name:'Марк Цукерберг', co:'Meta', letter:'M', color:'#2E6BE8',
    skin:SKIN.light, hair:'#9A7048', hairStyle:'curly', brows:'#7A5836',
    outfit:'tee', pants:'#33384A', glasses:null, acc:null, mouth:'smile',
    fw:1.08, hv:0.98 },

  jensen:{ name:'Дженсен Хуанг', co:'NVIDIA', letter:'J', color:'#2C2C36',
    skin:SKIN.warm, hair:'#D4D4DB', hairStyle:'sideSwept', brows:'#9A9AA2',
    outfit:'jacket', pants:'#1C1E26', glasses:'rect', acc:null, mouth:'smirk',
    fw:1.04, hv:1.02 },

  /* неиграбельные — только боссы и NPC */
  lecun:{ name:'Ян Лекун', co:'скептик', letter:'L', color:'#5B7FC4',
    skin:SKIN.light, hair:'#B9B9C2', hairStyle:'receding', brows:'#8A8A94',
    outfit:'shirt', pants:'#3A4050', glasses:'rect', acc:null, mouth:'think',
    fw:1.05, hv:0.96 },

  wang:{ name:'Ван Сяочуань', co:'Baichuan · врач', letter:'W', color:'#F2F4F8',
    skin:SKIN.warm, hair:'#181310', hairStyle:'flat', brows:'#100C0A',
    outfit:'shirt', pants:'#2A2E38', glasses:'rect', acc:null, mouth:'smile',
    fw:1.00, hv:1.00 },
};
const ORDER = ['altman','amodei','demis','musk','satya','liang','yang','zuck','jensen'];

/* ── позы ───────────────────────────────────────────────────────
   Возвращает углы конечностей. Всё через синусы — покадровка не нужна. */
function poseOf(state, t, opt){
  opt = opt || {};
  const P = { lean:0, bob:0, squash:1, head:0, arm:[0,0], elb:[.3,.3],
              leg:[0,0], knee:[0,0], blink:0, mouthOpen:0, armPose:null };

  if(state==='run'){
    const f=t*11, s=opt.speed||1;
    P.leg=[Math.sin(f)*0.95*s, Math.sin(f+Math.PI)*0.95*s];
    P.knee=[Math.max(0,-Math.sin(f))*0.85, Math.max(0,-Math.sin(f+Math.PI))*0.85];
    P.arm=[Math.sin(f+Math.PI)*0.85, Math.sin(f)*0.85];
    P.elb=[0.55,0.55];
    P.bob=-Math.abs(Math.sin(f))*3.2;
    P.lean=0.13; P.head=-0.05;
  }
  else if(state==='idle'){
    const f=t*2.2;
    P.bob=Math.sin(f)*1.4; P.squash=1+Math.sin(f)*0.012;
    P.arm=[0.13+Math.sin(f)*0.05, -0.13-Math.sin(f)*0.05]; P.elb=[0.2,0.2];
    P.head=Math.sin(f*0.7)*0.05;
    P.blink = (t%3.4)<0.11 ? 1 : 0;
  }
  else if(state==='jump'){
    P.leg=[-0.55,0.3]; P.knee=[0.9,0.35];
    P.arm=[2.35,-2.15]; P.elb=[0.35,-0.35]; P.lean=0.1; P.squash=1.07; P.bob=-2;
  }
  else if(state==='fall'){
    P.leg=[0.45,-0.3]; P.knee=[0.3,0.2];
    P.arm=[1.95,-1.95]; P.elb=[0.25,-0.25]; P.lean=-0.08; P.squash=0.94;
  }
  else if(state==='land'){
    P.leg=[0.25,-0.25]; P.knee=[0.7,0.7]; P.arm=[-0.7,0.7]; P.elb=[0.6,0.6];
    P.squash=0.86; P.bob=6; P.lean=0.05;
  }
  else if(state==='hurt'){
    P.lean=-0.35; P.arm=[-2.4,-2.2]; P.elb=[0.2,0.2];
    P.leg=[-0.35,0.5]; P.knee=[0.5,0.2]; P.blink=2; P.mouthOpen=1; P.bob=-2;
  }
  else if(state==='shoot'){
    const f=t*3; P.arm=[-1.62,0.25]; P.elb=[0.05,0.3];
    P.lean=0.06; P.bob=Math.sin(f)*1; P.armPose='shoot';
  }
  else if(state==='ability'){
    const f=t*6; P.arm=[2.62,-2.62]; P.elb=[0.34,-0.34];
    P.bob=-3+Math.sin(f)*1.6; P.head=0.1; P.mouthOpen=0.7; P.lean=-0.05;
  }
  else if(state==='victory'){
    const f=t*4.5, up=Math.abs(Math.sin(f));
    P.arm=[2.72,-2.72]; P.elb=[0.30,-0.30];
    P.bob=-up*9; P.leg=[-0.25*up,0.25*up]; P.knee=[0.5*up,0.5*up];
    P.mouthOpen=1; P.squash=1+up*0.05;
  }
  return P;
}

/* ── одежда ───────────────────────────────────────────────── */
function torsoShape(kind){
  // общий силуэт корпуса; y от -66 (плечи) до -26 (таз)
  if(kind==='jacket'){ poly([[-19,-64],[19,-64],[17,-26],[-17,-26]]); }
  else if(kind==='hoodie'){ poly([[-18,-65],[18,-65],[16,-25],[-16,-25]]); }
  else { poly([[-16,-64],[16,-64],[15,-26],[-15,-26]]); }
}
function drawOutfit(c){
  const col=c.color;
  torsoShape(c.outfit); fillStroke(col);

  if(c.outfit==='hoodie'){
    // капюшон
    fs(shade(col,-0.18)); X.beginPath();
    X.moveTo(-18,-64); X.quadraticCurveTo(0,-52,18,-64);
    X.quadraticCurveTo(0,-72,-18,-64); X.closePath(); X.fill(); stroke(ink(col),LW*0.8);
    // шнурки
    ss(shade(col,0.5)); X.lineWidth=2;
    X.beginPath(); X.moveTo(-5,-58); X.lineTo(-5,-48); X.moveTo(5,-58); X.lineTo(5,-48); X.stroke();
    // карман-кенгуру
    fs(shade(col,-0.12)); rrect(-11,-42,22,11,4); X.fill();
  }
  if(c.outfit==='polo'){
    fs(shade(col,-0.2));
    poly([[-7,-64],[0,-53],[7,-64]]); X.fill(); stroke(ink(col),LW*0.7);
  }
  if(c.outfit==='shirt'){
    // воротник + планка с пуговицами
    fs('#FFFFFF'); poly([[-8,-64],[0,-54],[8,-64]]); X.fill(); stroke(ink(col),LW*0.7);
    ss(shade(col,-0.25)); X.lineWidth=1.6;
    X.beginPath(); X.moveTo(0,-54); X.lineTo(0,-28); X.stroke();
    fs(shade(col,0.55)); [-46,-38].forEach(y=>{ circle(2,y,1.5); X.fill(); });
  }
  if(c.outfit==='jacket'){
    // кожаная куртка: лацканы + молния + блик
    fs(shade(col,0.14));
    poly([[-19,-64],[-4,-60],[-6,-27],[-17,-26]]); X.fill(); stroke(ink(col),LW*0.8);
    poly([[19,-64],[4,-60],[6,-27],[17,-26]]);     X.fill(); stroke(ink(col),LW*0.8);
    ss('#C8C8D2'); X.lineWidth=2; X.beginPath(); X.moveTo(0,-59); X.lineTo(0,-27); X.stroke();
    fs('rgba(255,255,255,.16)'); rrect(-15,-60,6,28,3); X.fill();
  }
  if(c.outfit==='tee'){
    fs(shade(col,-0.18)); X.beginPath();
    X.moveTo(-7,-64); X.quadraticCurveTo(0,-58,7,-64); X.closePath(); X.fill();
  }
}

/* ── причёски ─────────────────────────────────────────────────
   Причёска — главный опознавательный знак на спрайте 96 px.
   Поэтому она рисуется как «парик» с объёмом ВЫШЕ черепа, а не
   как плоская шапочка: силуэт должен читаться, даже если залить
   персонажа чёрным.                                              */

/** объём за головой — рисуется ДО черепа */
function drawHairBack(c,hx,hy,r){
  const st=c.hairStyle;
  if(st==='curly'){
    fs(shade(c.hair,-0.14));
    for(let i=0;i<7;i++){ const a=Math.PI*0.98+i*(Math.PI*1.04/6);
      circle(hx+Math.cos(a)*r*1.02, hy+Math.sin(a)*r*1.02, r*0.34); X.fill(); }
  } else if(st==='sideSwept'||st==='shortWave'){
    fs(shade(c.hair,-0.12)); ellipse(hx,hy-r*0.16,r*1.10,r*1.02); X.fill();
  } else if(st==='flat'){
    fs(shade(c.hair,-0.12)); ellipse(hx,hy-r*0.08,r*1.09,r*1.04); X.fill();
  }
}

/** передняя часть причёски — рисуется ПОСЛЕ лица.
    Каждый стиль обязан давать РАЗНЫЙ силуэт: это единственное,
    по чему игрок отличает героев на бегу.                        */
function drawHair(c, hx, hy, r){
  const h=c.hair, dk=ink(h), st=c.hairStyle;
  const V=c.hv||1;                       // объём причёски
  const R=r*1.06*V;
  fs(h);

  if(st==='curly'){
    // кудри: два ряда шариков, верхний ряд задаёт «шапку»
    const bumps=[];
    for(let i=0;i<11;i++){ const a=Math.PI*0.94+i*(Math.PI*1.12/10);
      bumps.push([hx+Math.cos(a)*R*0.99, hy+Math.sin(a)*R*0.99, R*0.31]); }
    for(let i=0;i<7;i++){ const a=Math.PI*1.06+i*(Math.PI*0.88/6);
      bumps.push([hx+Math.cos(a)*R*0.66, hy+Math.sin(a)*R*0.80-R*0.18, R*0.30]); }
    bumps.push([hx,hy-R*1.02,R*0.34]);
    bumps.forEach(b=>{ circle(b[0],b[1],b[2]); X.fill(); });
    bumps.forEach(b=>{ circle(b[0],b[1],b[2]); stroke(dk,LW*0.5); });
    fs(h); rrect(hx-R*0.99,hy-r*0.12,R*0.21,r*0.52,3); X.fill();
    rrect(hx+R*0.78,hy-r*0.12,R*0.21,r*0.52,3); X.fill();
    return;
  }

  X.beginPath();
  if(st==='buzz'){                                // ёжик: прилегает к черепу
    const B=r*1.01;
    X.moveTo(hx-B*0.99, hy+r*0.02);
    X.quadraticCurveTo(hx-B*1.0, hy-B*0.78, hx, hy-B*0.90);
    X.quadraticCurveTo(hx+B*1.0, hy-B*0.78, hx+B*0.99, hy+r*0.02);
    X.quadraticCurveTo(hx+B*0.72, hy-B*0.36, hx+B*0.30, hy-B*0.44);
    X.quadraticCurveTo(hx, hy-B*0.50, hx-B*0.30, hy-B*0.44);
    X.quadraticCurveTo(hx-B*0.72, hy-B*0.36, hx-B*0.99, hy+r*0.02);
  }
  else if(st==='receding'){                       // залысины буквой М — виски голые
    X.moveTo(hx-R*0.92, hy+r*0.30);
    X.quadraticCurveTo(hx-R*1.0, hy-R*0.62, hx-R*0.52, hy-R*0.84);
    X.quadraticCurveTo(hx, hy-R*0.98, hx+R*0.52, hy-R*0.84);
    X.quadraticCurveTo(hx+R*1.0, hy-R*0.62, hx+R*0.92, hy+r*0.30);
    X.quadraticCurveTo(hx+R*0.80, hy-R*0.06, hx+R*0.62, hy-R*0.30);
    X.quadraticCurveTo(hx+R*0.38, hy-R*0.66, hx, hy-R*0.40);
    X.quadraticCurveTo(hx-R*0.38, hy-R*0.66, hx-R*0.62, hy-R*0.30);
    X.quadraticCurveTo(hx-R*0.80, hy-R*0.06, hx-R*0.92, hy+r*0.30);
  }
  else if(st==='flat'){                           // тупая прямая чёлка до бровей
    X.moveTo(hx-R*1.02, hy+r*0.30);
    X.quadraticCurveTo(hx-R*1.06, hy-R*0.86, hx, hy-R*0.99);
    X.quadraticCurveTo(hx+R*1.06, hy-R*0.86, hx+R*1.02, hy+r*0.30);
    X.lineTo(hx+R*0.94, hy-R*0.16);
    X.lineTo(hx-R*0.94, hy-R*0.16);
  }
  else if(st==='shortWave'){                      // выраженный кок на макушке
    X.moveTo(hx-R*0.97, hy+r*0.08);
    X.quadraticCurveTo(hx-R*1.06, hy-R*0.74, hx-R*0.42, hy-R*0.98);
    X.quadraticCurveTo(hx-R*0.05, hy-R*1.34, hx+R*0.46, hy-R*1.00);
    X.quadraticCurveTo(hx+R*1.02, hy-R*0.72, hx+R*0.97, hy+r*0.08);
    X.quadraticCurveTo(hx+R*0.66, hy-R*0.38, hx+R*0.08, hy-R*0.34);
    X.quadraticCurveTo(hx-R*0.56, hy-R*0.30, hx-R*0.97, hy+r*0.08);
  }
  else {                                          // sideSwept — резкий косой пробор
    X.moveTo(hx-R*0.98, hy+r*0.16);
    X.quadraticCurveTo(hx-R*1.08, hy-R*0.84, hx-R*0.10, hy-R*1.02);
    X.quadraticCurveTo(hx+R*0.86, hy-R*1.12, hx+R*1.00, hy-R*0.34);
    X.quadraticCurveTo(hx+R*1.02, hy-R*0.02, hx+R*0.96, hy+r*0.16);
    X.quadraticCurveTo(hx+R*0.74, hy-R*0.42, hx+R*0.10, hy-R*0.52);
    X.quadraticCurveTo(hx-R*0.50, hy-R*0.62, hx-R*0.98, hy+r*0.16);
  }
  X.closePath(); X.fill(); stroke(dk,LW*0.72);

  // блик — одна мягкая полоса, добавляет объём почти бесплатно
  fs(shade(h,0.22)); X.beginPath();
  X.ellipse(hx-R*0.40,hy-R*0.66,R*0.28,R*0.13,-0.5,0,6.2832); X.fill();
}

/* ── голова ───────────────────────────────────────────────── */
function drawHead(c, P, dir){
  const hy=-80, r=21;
  X.save(); X.translate(0,hy); X.rotate(P.head||0); X.translate(0,-hy);

  // шея (до головы, чтобы уходила под подбородок)
  fs(shade(c.skin,-0.16)); rrect(-5.5,hy+r*0.62,11,10,3.5); X.fill(); stroke(ink(c.skin),LW*0.7);

  drawHairBack(c,0,hy,r);

  const fw=c.fw||1;
  // уши
  fs(c.skin); circle(-r*0.95*fw,hy+3,r*0.21); X.fill(); stroke(ink(c.skin),LW*0.62);
  circle(r*0.95*fw,hy+3,r*0.21); X.fill(); stroke(ink(c.skin),LW*0.62);
  // череп
  fs(c.skin); ellipse(0,hy,r*fw,r*1.04); X.fill(); stroke(ink(c.skin));
  // щетина
  if(c.stubble){ fs('rgba(40,28,20,'+c.stubble+')'); X.save();
    X.beginPath(); X.ellipse(0,hy,r*fw,r*1.04,0,0,6.2832); X.clip();
    X.beginPath(); X.ellipse(0,hy+r*0.72,r*0.86*fw,r*0.60,0,0,6.2832); X.fill();
    X.restore(); }

  const ex=7.0*fw, ey=hy+3.0;
  // брови
  ss(c.brows); X.lineWidth=2.6; X.lineCap='round';
  X.beginPath(); X.moveTo(-ex-4.6,ey-8.4); X.lineTo(-ex+3.4,ey-9.8); X.stroke();
  X.beginPath(); X.moveTo( ex-3.4,ey-9.8); X.lineTo( ex+4.6,ey-8.4); X.stroke();
  // глаза
  if(P.blink>=2){                       // «крестики» при уроне
    ss('#22222A'); X.lineWidth=2.6;
    [-ex,ex].forEach(x=>{ X.beginPath(); X.moveTo(x-3.4,ey-3.4); X.lineTo(x+3.4,ey+3.4);
      X.moveTo(x+3.4,ey-3.4); X.lineTo(x-3.4,ey+3.4); X.stroke(); });
  } else if(P.blink>0){
    ss('#22222A'); X.lineWidth=2.4;
    [-ex,ex].forEach(x=>{ X.beginPath(); X.arc(x,ey,4,0.15,Math.PI-0.15); X.stroke(); });
  } else {
    fs('#FFFFFF'); ellipse(-ex,ey,4.5,4.9); X.fill(); ellipse(ex,ey,4.5,4.9); X.fill();
    ss(shade(c.skin,-0.45)); X.lineWidth=1.1;
    ellipse(-ex,ey,4.5,4.9); X.stroke(); ellipse(ex,ey,4.5,4.9); X.stroke();
    fs('#22222A'); circle(-ex+1.2,ey+0.5,2.4); X.fill(); circle(ex+1.2,ey+0.5,2.4); X.fill();
    fs('#FFFFFF'); circle(-ex+2.1,ey-0.8,1.0); X.fill(); circle(ex+2.1,ey-0.8,1.0); X.fill();
  }
  // нос
  ss(shade(c.skin,-0.38)); X.lineWidth=1.9;
  X.beginPath(); X.arc(1.6,ey+6,2.8,Math.PI*0.12,Math.PI*0.92); X.stroke();
  // рот
  ss('#8A443A'); X.lineWidth=2.1;
  const my=ey+12;
  if(P.mouthOpen>0.5){ fs('#8A443A'); ellipse(1,my,4.6,3.8*P.mouthOpen); X.fill();
    fs('#FFFFFF'); rrect(-3,my-3.6,8,2,1); X.fill(); }
  else if(c.mouth==='smile'){ X.beginPath(); X.arc(1,my-3,5.6,0.22,Math.PI-0.22); X.stroke(); }
  else if(c.mouth==='smirk'){ X.beginPath(); X.arc(2.4,my-2.4,4.8,0.3,Math.PI*0.86); X.stroke(); }
  else if(c.mouth==='think'){ X.beginPath(); X.moveTo(-2.4,my+0.6); X.lineTo(4.4,my-1.2); X.stroke(); }
  else { X.beginPath(); X.moveTo(-2.8,my); X.lineTo(4.8,my); X.stroke(); }

  drawHair(c,0,hy,r);

  // очки
  if(c.glasses){
    ss('#2A2A34'); X.lineWidth=2.2; fs('rgba(198,226,255,.32)');
    if(c.glasses==='round'){
      circle(-ex,ey,7.0); X.fill(); X.stroke(); circle(ex,ey,7.0); X.fill(); X.stroke();
    } else {
      rrect(-ex-6.6,ey-5.2,13.2,10.4,2.6); X.fill(); X.stroke();
      rrect(ex-6.6,ey-5.2,13.2,10.4,2.6); X.fill(); X.stroke();
    }
    X.lineWidth=1.9;
    X.beginPath(); X.moveTo(-ex+6.8,ey-1.2); X.lineTo(ex-6.8,ey-1.2);
    X.moveTo(-ex-6.8,ey-1.2); X.lineTo(-r*0.98,ey-3.4);
    X.moveTo( ex+6.8,ey-1.2); X.lineTo( r*0.98,ey-3.4); X.stroke();
    fs('rgba(255,255,255,.42)'); X.save(); X.rotate(-0.4);
    rrect(-ex-3,ey-6,3.4,7,1.5); X.fill(); rrect(ex-3,ey-6,3.4,7,1.5); X.fill(); X.restore();
  }
  X.restore();
}

/* ── аксессуары ───────────────────────────────────────────── */
function drawAcc(c,t){
  if(c.acc==='crescent'){                       // луна-спутник (Moonshot / Kimi)
    const mx=-33+Math.sin(t*1.5)*2, my=-104+Math.cos(t*1.2)*3;
    X.save();
    fs('rgba(255,226,122,.22)'); circle(mx,my,17); X.fill();
    fs('#FFE27A'); X.beginPath();
    X.arc(mx,my,11,Math.PI*0.42,Math.PI*1.58);
    X.arc(mx-5,my,10.5,Math.PI*1.58,Math.PI*0.42,true);
    X.closePath(); X.fill(); stroke('#C9A227',2.2);
    fs('#FFF6C8'); for(let i=0;i<3;i++){ const a=t*1.4+i*2.1;
      circle(mx+Math.cos(a)*20, my+Math.sin(a)*13, 1.7); X.fill(); }
    X.restore();
  }
  if(c.acc==='whale'){                          // синий кит-компаньон (DeepSeek)
    const bx=36+Math.sin(t*1.8)*3, by=-100+Math.cos(t*1.5)*4;
    X.save();
    fs('#4E7BF5'); ellipse(bx,by,13,8.4); X.fill(); stroke('#2A46A8',2.4);
    fs('#4E7BF5'); poly([[bx+10,by-1],[bx+21,by-9],[bx+19,by+5]]); X.fill(); stroke('#2A46A8',2.4);
    fs('#9EBAFF'); ellipse(bx-1,by+3.4,8,3.4); X.fill();
    fs('#FFFFFF'); circle(bx-6,by-2,2.4); X.fill();
    fs('#1A2E7A'); circle(bx-5.4,by-1.6,1.3); X.fill();
    ss('#BFD4FF'); X.lineWidth=1.8; X.lineCap='round';
    X.beginPath(); X.moveTo(bx-9,by-7); X.quadraticCurveTo(bx-13,by-15,bx-8,by-19); X.stroke();
    X.restore();
  }
  if(c.acc==='rocket'){                         // значок-ракета на груди
    X.save(); X.translate(-9,-48); X.rotate(-0.38); X.scale(1.25,1.25);
    fs('#F2F2F6'); X.beginPath();
    X.moveTo(0,-8); X.quadraticCurveTo(3.4,-3,3.4,3); X.lineTo(-3.4,3);
    X.quadraticCurveTo(-3.4,-3,0,-8); X.closePath(); X.fill(); stroke('#7A7A88',1.7);
    fs('#FF5B3B'); poly([[3.4,0],[7.4,5],[3.4,5]]); X.fill(); stroke('#A03018',1.4);
    poly([[-3.4,0],[-7.4,5],[-3.4,5]]); X.fill(); stroke('#A03018',1.4);
    fs('#5AC8F5'); circle(0,-2.6,1.9); X.fill();
    fs('#FFB020'); poly([[-2,5],[2,5],[0,10]]); X.fill();
    X.restore();
  }
  if(c.acc==='cloud'){                          // облачко-значок
    X.save(); X.translate(-10,-47); X.scale(1.2,1.2); fs('#FFFFFF');
    X.beginPath();
    X.arc(-3.6,0.4,3.4,0,6.2832); X.arc(0.8,-2,4.3,0,6.2832); X.arc(5,0.6,3.2,0,6.2832);
    X.rect(-4.4,0,9.8,3.4); X.fill(); stroke('#7FA3D0',1.6);
    X.restore();
  }
  if(c.acc==='chess'){                          // шахматная пешка
    X.save(); X.translate(-10,-47); X.scale(1.25,1.25); fs('#F4F4F8');
    X.beginPath(); X.arc(0,-4,2.9,0,6.2832); X.fill(); stroke('#8A8A96',1.5);
    X.beginPath(); X.moveTo(-1.8,-2.2); X.lineTo(1.8,-2.2); X.lineTo(3.4,4.4); X.lineTo(-3.4,4.4);
    X.closePath(); X.fill(); stroke('#8A8A96',1.5);
    X.restore();
  }
}

/* ── персонаж целиком ──────────────────────────────────────
   opts: {state,t,dir,tier,scale,alpha,shadow,flash}                */
function drawChar(ctx, id, opts){
  setCtx(ctx); opts=opts||{};
  const c = typeof id==='string' ? CAST[id] : id;
  const st=opts.state||'idle', t=opts.t||0, dir=opts.dir||1;
  const tier = opts.tier===undefined?1:opts.tier;
  const sc = (opts.scale||1) * (tier===0?0.76:1);
  const P = poseOf(st,t,opts);

  X.save();
  X.translate(opts.x||0, opts.y||0);
  if(opts.alpha!==undefined) X.globalAlpha=opts.alpha;

  // тень
  if(opts.shadow!==false){
    const lift = (st==='jump'||st==='fall')?0.55:1;
    fs('rgba(0,0,0,.20)'); ellipse(0,2*sc,24*sc*lift,5.5*sc*lift); X.fill();
  }

  X.scale(dir*sc, sc);
  LW = 3;

  // шлейф тира 3 — три полупрозрачные копии позади
  if(tier>=3){
    X.save(); X.globalAlpha*=0.22;
    for(let i=1;i<=3;i++){ X.save(); X.translate(-i*7,0); X.scale(1-i*0.03,1-i*0.03);
      fs(c.color); torsoShape(c.outfit); X.fill(); circle(0,-80,20); X.fill(); X.restore(); }
    X.restore();
  }

  X.translate(0, P.bob||0);
  X.save(); X.translate(0,-30); X.rotate(-(P.lean||0)); X.scale(1,P.squash||1); X.translate(0,30);

  const grey = tier===0;
  const body = grey ? '#A8ADB5' : c.color;
  const skin = grey ? '#D6D8DC' : c.skin;
  const cc = Object.assign({},c,{color:body, skin:skin,
             hair: grey?'#8E9298':c.hair, brows: grey?'#7A7E84':c.brows});

  const HIP=-28, SHO=-60, LEGL=15, ARML=13;

  // задняя рука и нога — темнее, а не полупрозрачнее: так читается объём
  limb(-7,HIP, P.leg[1],LEGL, P.knee[1],LEGL, 8.5, shade(cc.pants||'#333',-0.30));
  const bh = limb(-13,SHO, P.arm[1],ARML, P.elb[1],ARML-2, 7, shade(body,-0.26));
  fs(shade(skin,-0.20)); circle(bh.x,bh.y,4.2); X.fill(); stroke(ink(skin),2);

  // передняя нога + ботинок
  const fl = limb(6,HIP, P.leg[0],LEGL, P.knee[0],LEGL, 9, cc.pants||'#333');
  fs('#2C2C34'); X.save(); X.translate(fl.x,fl.y); X.rotate(P.leg[0]*0.25);
  rrect(-4,-2,12,6,3); X.fill(); stroke('#15151A',2); X.restore();
  fs('#2C2C34'); X.save(); X.translate(-7+Math.sin(P.leg[1])*LEGL+Math.sin(P.leg[1]+P.knee[1])*LEGL,
      HIP+Math.cos(P.leg[1])*LEGL+Math.cos(P.leg[1]+P.knee[1])*LEGL);
  rrect(-4,-2,11,5.6,3); X.fill(); X.restore();

  // корпус
  drawOutfit(cc);

  // передняя рука + кисть
  const fh = limb(13,SHO, P.arm[0],ARML, P.elb[0],ARML-2, 7.4, body);
  fs(skin); circle(fh.x,fh.y,4.3); X.fill(); stroke(ink(skin),2);

  drawAcc(cc,t);
  drawHead(cc,P,dir);

  // нимб тира 2+ — вращающееся кольцо из символов
  if(tier>=2){
    X.save(); X.globalAlpha*=0.95;
    ss('#FFD447'); X.lineWidth=2.4;
    ellipse(0,-104,22,6); X.stroke();
    fs('#FFD447');
    for(let i=0;i<5;i++){ const a=t*2.2+i*1.2566;
      circle(Math.cos(a)*22, -104+Math.sin(a)*6, 2.2); X.fill(); }
    X.restore();
  }
  X.restore(); // lean

  // вспышка урона
  if(opts.flash){ X.globalCompositeOperation='source-atop';
    fs('rgba(255,255,255,'+opts.flash+')'); X.fillRect(-40,-115,80,120);
    X.globalCompositeOperation='source-over'; }
  X.restore();
}

/** портрет-аватар для меню и HUD */
function drawPortrait(ctx,id,cx,cy,r,t){
  setCtx(ctx); const c=CAST[id];
  X.save(); X.beginPath(); X.arc(cx,cy,r,0,6.2832); X.clip();
  const g=X.createLinearGradient(0,cy-r,0,cy+r);
  g.addColorStop(0,shade(c.color,0.32)); g.addColorStop(1,shade(c.color,-0.22));
  fs(g); X.fillRect(cx-r,cy-r,r*2,r*2);
  X.translate(cx,cy+r*0.92); X.scale(r/44,r/44);
  drawChar(X,id,{state:'idle',t:t||0,tier:1,shadow:false,scale:1.15,y:0});
  X.restore();
  circle(cx,cy,r); stroke(shade(c.color,-0.45),3);
}

/* ───────────────────────── враги ───────────────────────── */
const FOE = {
  skeptic:{ w:44,h:56, body:'#8A93A3', skin:'#EBBF98', hair:'#5A4C40', label:'Скептик' },
  vc:     { w:46,h:60, body:'#3FA37E', skin:'#F1C6A0', hair:'#3A2A20', label:'Инвестор' },
  miner:  { w:46,h:56, body:'#7A5EC0', skin:'#DCB08C', hair:'#2A2440', label:'Майнер' },
  clerk:  { w:48,h:62, body:'#8892A6', skin:'#E8C0A0', hair:'#8A8A96', label:'Клерк' },
  auditor:{ w:46,h:62, body:'#556087', skin:'#E0B694', hair:'#2A2A38', label:'Налоговая' },
  luddite:{ w:46,h:58, body:'#B87A44', skin:'#EFC29C', hair:'#6A452A', label:'Луддит' },
};
function drawFoe(ctx,type,opts){
  setCtx(ctx); opts=opts||{};
  const f=FOE[type]; const t=opts.t||0, dir=opts.dir||1, sc=opts.scale||1;
  X.save(); X.translate(opts.x||0,opts.y||0);
  fs('rgba(0,0,0,.18)'); ellipse(0,2*sc,f.w*0.42*sc,4.5*sc); X.fill();
  X.scale(dir*sc,sc); LW=2.6;

  const walk=Math.sin(t*7), H=f.h;
  const HIP=-H*0.42, SHO=-H*0.78;

  // ноги
  limb(-5,HIP, walk*0.6, H*0.21, Math.max(0,-walk)*0.5, H*0.21, 7, '#2E3038');
  limb(5,HIP, -walk*0.6, H*0.21, Math.max(0,walk)*0.5, H*0.21, 7.4,'#3A3C46');
  // корпус
  poly([[-f.w*0.32,SHO],[f.w*0.32,SHO],[f.w*0.28,HIP+2],[-f.w*0.28,HIP+2]]);
  fillStroke(f.body);

  // руки + реквизит
  if(type==='clerk'){
    const s=Math.max(0,Math.sin(t*3.4));
    const h=limb(9,SHO+2, -0.5-s*1.6, H*0.17, 0.3, H*0.15, 6, f.body);
    fs('#8A4B2A'); X.save(); X.translate(h.x,h.y); X.rotate(0.3);
    rrect(-6,-4,12,8,2); X.fill(); stroke('#4A2614',2.2);
    fs('#C0392B'); rrect(-4,4,8,3,1); X.fill(); X.restore();
    limb(-9,SHO+2, 0.25, H*0.17, 0.25, H*0.15, 5.6, shade(f.body,-0.14));
  } else if(type==='luddite'){
    const h=limb(8,SHO, -2.5, H*0.19, 0.1, H*0.16, 6, f.body);
    X.save(); X.translate(h.x,h.y); X.rotate(-0.15);
    ss('#8A5A3C'); X.lineWidth=3; X.beginPath(); X.moveTo(0,0); X.lineTo(0,-16); X.stroke();
    fs('#F5EFE0'); rrect(-16,-30,32,15,2); X.fill(); stroke('#B0A38A',2);
    fs('#C0392B'); X.font='bold 8px sans-serif'; X.textAlign='center';
    X.save(); X.scale(dir,1); X.fillText('STOP AI',0,-20); X.restore();
    X.restore();
    limb(-8,SHO, 0.5, H*0.18, 0.3, H*0.15, 5.6, shade(f.body,-0.14));
  } else if(type==='vc'){
    const h=limb(9,SHO+2, -1.35, H*0.18, 0.2, H*0.15, 6, f.body);
    X.save(); X.translate(h.x,h.y); X.rotate(0.35+Math.sin(t*8)*0.15);
    fs('#FFFFFF'); rrect(-2,-9,15,19,1.5); X.fill(); stroke('#B8B8C0',1.8);
    ss('#C9CBD2'); X.lineWidth=1.2;
    for(let i=0;i<4;i++){ X.beginPath(); X.moveTo(1,-6+i*4.4); X.lineTo(10,-6+i*4.4); X.stroke(); }
    X.restore();
    limb(-9,SHO+2, 0.6, H*0.18, 0.35, H*0.15, 5.6, shade(f.body,-0.14));
  } else if(type==='miner'){
    const h=limb(9,SHO+3, -0.9, H*0.17, 0.5, H*0.14, 6, f.body);
    X.save(); X.translate(h.x,h.y);
    fs('#2E7D32'); rrect(-3,-4,17,9,2); X.fill(); stroke('#1B4D1F',2);
    fs('#7ACB7E'); rrect(-1,-2,5,5,1); X.fill(); rrect(6,-2,5,5,1); X.fill(); X.restore();
    limb(-9,SHO+3, 0.5, H*0.17, 0.3, H*0.14, 5.6, shade(f.body,-0.14));
  } else if(type==='auditor'){
    const h=limb(9,SHO+4, 0.35, H*0.19, 0.15, H*0.16, 6, f.body);
    X.save(); X.translate(h.x,h.y);
    fs('#4A3320'); rrect(-7,0,15,12,2); X.fill(); stroke('#2A1C10',2.2);
    fs('#8A6B45'); rrect(-2,-2,5,3,1); X.fill(); X.restore();
    limb(-9,SHO+4, -0.3, H*0.19, 0.2, H*0.16, 5.6, shade(f.body,-0.14));
  } else {
    limb(9,SHO+2, 0.35+walk*0.3, H*0.18, 0.25, H*0.15, 6, f.body);
    limb(-9,SHO+2, -0.35-walk*0.3, H*0.18, 0.25, H*0.15, 5.6, shade(f.body,-0.14));
  }

  // голова — крупная, чтобы враг читался за 0.2 сек
  const hy=-H*0.88, r=H*0.25;
  const tilt = type==='skeptic' ? Math.sin(t*3)*0.28 : 0;
  X.save(); X.translate(0,hy); X.rotate(tilt); X.translate(0,-hy);
  fs(f.skin); ellipse(0,hy,r,r*1.03); X.fill(); stroke(ink(f.skin),2.6);
  // причёска-шапка с объёмом
  fs(f.hair); X.beginPath();
  X.moveTo(-r*1.02,hy+r*0.12);
  X.quadraticCurveTo(-r*1.1,hy-r*0.9, 0,hy-r*1.04);
  X.quadraticCurveTo(r*1.1,hy-r*0.9, r*1.02,hy+r*0.12);
  X.quadraticCurveTo(r*0.5,hy-r*0.32, 0,hy-r*0.34);
  X.quadraticCurveTo(-r*0.5,hy-r*0.32, -r*1.02,hy+r*0.12);
  X.closePath(); X.fill(); stroke(ink(f.hair),2.2);
  // глаза
  fs('#FFF'); ellipse(-r*0.34,hy+r*0.1,r*0.23,r*0.25); X.fill();
  ellipse(r*0.34,hy+r*0.1,r*0.23,r*0.25); X.fill();
  fs('#25252E'); circle(-r*0.28,hy+r*0.13,r*0.12); X.fill();
  circle(r*0.4,hy+r*0.13,r*0.12); X.fill();
  ss(f.brows||ink(f.hair)); X.lineWidth=2;
  X.beginPath(); X.moveTo(-r*0.56,hy-r*0.22); X.lineTo(-r*0.14,hy-r*0.3);
  X.moveTo(r*0.14,hy-r*0.3); X.lineTo(r*0.56,hy-r*0.22); X.stroke();
  // рот
  ss('#8A443A'); X.lineWidth=2;
  if(type==='auditor'||type==='clerk'){ X.beginPath(); X.moveTo(-r*0.26,hy+r*0.6); X.lineTo(r*0.3,hy+r*0.6); X.stroke(); }
  else if(type==='luddite'){ X.beginPath(); X.arc(0,hy+r*0.78,r*0.3,0.2,Math.PI-0.2); X.stroke(); }
  else { X.beginPath(); X.arc(0,hy+r*0.86,r*0.3,Math.PI*1.12,Math.PI*1.88); X.stroke(); }
  // атрибуты голов
  if(type==='clerk'||type==='auditor'){         // очки-«бюрократ»
    ss('#2A2A34'); X.lineWidth=1.9; fs('rgba(205,228,255,.34)');
    rrect(-r*0.66,hy-r*0.1,r*0.58,r*0.42,2); X.fill(); X.stroke();
    rrect(r*0.08,hy-r*0.1,r*0.58,r*0.42,2); X.fill(); X.stroke();
    X.beginPath(); X.moveTo(-r*0.08,hy+r*0.1); X.lineTo(r*0.08,hy+r*0.1); X.stroke();
  }
  if(type==='miner'){                            // капюшон
    fs('#463A70'); X.beginPath(); X.arc(0,hy-r*0.06,r*1.26,Math.PI*0.96,Math.PI*2.04);
    X.closePath(); X.fill(); stroke('#2A2440',2.4);
  }
  X.restore();
  X.restore();
}

/** летающий тролль */
function drawTroll(ctx,x,y,t,dir){
  setCtx(ctx); X.save(); X.translate(x,y); X.scale((dir||1)*1.35,1.35); LW=2.4;
  const fl=Math.sin(t*13);
  // крылья
  fs('#9B7FF0'); ellipse(-12,-3+fl*5,12,7,-0.55-fl*0.55); X.fill(); stroke('#4A38A0',2.2);
  fs('#8B6FE8'); ellipse( 11,-3-fl*5,11,6,0.55+fl*0.55); X.fill(); stroke('#4A38A0',2.2);
  // тело
  fs('#D34A3A'); ellipse(0,0,16,14); X.fill(); stroke('#7A2018',2.8);
  fs('#E87A6A'); ellipse(0,4,10,7); X.fill();
  // глаза злые
  fs('#FFF'); circle(-4.5,-3,5); X.fill(); circle(5,-3,5); X.fill();
  fs('#25252E'); circle(-3.4,-2.2,2.5); X.fill(); circle(6.2,-2.2,2.5); X.fill();
  ss('#7A2018'); X.lineWidth=2.4; X.lineCap='round';
  X.beginPath(); X.moveTo(-9,-8.5); X.lineTo(-1,-6); X.moveTo(10,-8.5); X.lineTo(2,-6); X.stroke();
  // клюв
  fs('#F5A623'); poly([[1,2],[14,5.5],[1,9]]); X.fill(); stroke('#A06810',2);
  X.restore();
}
/** летающий счёт за электричество */
function drawBill(ctx,x,y,t){
  setCtx(ctx); X.save(); X.translate(x,y); X.rotate(Math.sin(t*3)*0.16); LW=2.2;
  const f=Math.sin(t*11)*0.55;
  fs('#E8E4D8'); X.save(); X.transform(1,0,f,1,0,0); rrect(-16,-20,10,40,2); X.fill();
  stroke('#A8A08A',2); X.restore();
  X.save(); X.transform(1,0,-f,1,0,0); rrect(6,-20,10,40,2); X.fill(); stroke('#A8A08A',2); X.restore();
  fs('#FFFFFF'); rrect(-9,-21,18,42,2.5); X.fill(); stroke('#B0A896',2.4);
  ss('#C9C3B2'); X.lineWidth=1.4;
  for(let i=0;i<4;i++){ X.beginPath(); X.moveTo(-5,-13+i*7); X.lineTo(5,-13+i*7); X.stroke(); }
  fs('#C0392B'); X.font='bold 11px ui-monospace,monospace'; X.textAlign='center';
  X.fillText('$$$',0,14);
  X.restore();
}
/** дешёвая open-source модель (мир 4) */
function drawCheap(ctx,x,y,t,hue){
  setCtx(ctx); X.save(); X.translate(x,y); X.rotate(Math.sin(t*4)*0.2); LW=2;
  const c='hsl('+(hue||180)+',90%,60%)';
  fs(c); rrect(-11,-11,22,22,5); X.fill(); stroke(shade('#0A0A18',0.1),2.2);
  fs('#0A0A18'); circle(-4,-2,2.4); X.fill(); circle(4,-2,2.4); X.fill();
  ss('#0A0A18'); X.lineWidth=2; X.beginPath(); X.arc(0,3,4,0.25,Math.PI-0.25); X.stroke();
  X.restore();
}

/* ───────────────────────── боссы ───────────────────────── */
/** CEO на «кибертраке» — босс мира 2 */
function drawVehicleBoss(ctx,id,opts){
  setCtx(ctx); opts=opts||{}; const t=opts.t||0, sc=opts.scale||1, dir=opts.dir||-1;
  X.save(); X.translate(opts.x||0,opts.y||0);
  fs('rgba(0,0,0,.24)'); ellipse(0,4*sc,86*sc,10*sc); X.fill();
  X.scale(dir*sc,sc); LW=3.4;
  const bump=Math.sin(t*9)*1.6;
  X.translate(0,bump);
  // колёса
  fs('#1A1A20'); circle(-46,-16,17); X.fill(); circle(46,-16,17); X.fill();
  fs('#3A3A46'); circle(-46,-16,7.5); X.fill(); circle(46,-16,7.5); X.fill();
  // клиновидный кузов
  fs('#A9AEB8'); poly([[-72,-14],[-58,-40],[6,-62],[72,-30],[72,-14]]); X.fill();
  stroke('#4A4E58',3.6);
  fs('rgba(255,255,255,.18)'); poly([[-52,-38],[2,-56],[46,-36],[-46,-30]]); X.fill();
  fs('#20242C'); poly([[-40,-40],[2,-54],[34,-40]]); X.fill(); stroke('#0E1014',2.6);
  ss('#5A5F6A'); X.lineWidth=2;
  X.beginPath(); X.moveTo(-58,-28); X.lineTo(70,-24); X.stroke();
  // водитель по пояс
  X.save(); X.translate(4,-58); X.scale(0.94,0.94); X.translate(0,86);
  drawChar(X,id,{state:'idle',t:t,tier:1,shadow:false,scale:0.92,y:0});
  X.restore();
  X.restore();
}
/** Трёхглавый Регулятор — босс мира 3 */
function drawRegulator(ctx,opts){
  setCtx(ctx); opts=opts||{}; const t=opts.t||0, sc=opts.scale||1;
  const fed=opts.fed||[false,false,false];
  X.save(); X.translate(opts.x||0,opts.y||0);
  fs('rgba(0,0,0,.26)'); ellipse(0,4*sc,76*sc,11*sc); X.fill();
  X.scale(sc,sc); LW=3.6;
  const br=Math.sin(t*1.7)*2.2;
  X.translate(0,br);
  // ноги-колонны
  fs('#3A4152'); rrect(-40,-70,26,70,6); X.fill(); stroke('#1E2330',3.4);
  rrect(14,-70,26,70,6); X.fill(); stroke('#1E2330',3.4);
  // тройной костюм
  fs('#4A5266'); poly([[-64,-190],[64,-190],[52,-62],[-52,-62]]); X.fill(); stroke('#242A38',3.8);
  fs('#FFFFFF'); poly([[-22,-190],[0,-160],[22,-190]]); X.fill(); stroke('#B8BECB',2.6);
  ss('#39405233'); X.lineWidth=2;
  [-30,0,30].forEach(x=>{ X.beginPath(); X.moveTo(x,-186); X.lineTo(x,-70); X.stroke(); });
  // руки со штампами
  const sw=Math.sin(t*2.3)*0.3;
  [[-66,0.55],[66,-0.55]].forEach(([ax,rot])=>{
    X.save(); X.translate(ax,-168); X.rotate(rot+(ax<0?sw:-sw));
    fs('#4A5266'); rrect(-15,0,30,80,13); X.fill(); stroke('#242A38',3.8);
    fs('#5A6478'); circle(0,40,13); X.fill();                    // локоть
    fs('#E8C0A0'); circle(0,84,12); X.fill(); stroke('#A87A55',3);
    fs('#8A4B2A'); rrect(-19,90,38,22,5); X.fill(); stroke('#4A2614',3.4);
    fs('#C0392B'); rrect(-13,110,26,6,2); X.fill();
    X.restore();
  });

  // три головы — крупные, это главный визуальный акцент босса
  const heads=[{x:-56,y:-236,col:'#4E86D6',hat:'cap',  lbl:'АВИА'},
               {x:  0,y:-262,col:'#E0B33A',hat:'tie',  lbl:'ФИН'},
               {x: 56,y:-236,col:'#D4553F',hat:'helm', lbl:'АТОМ'}];
  // шеи
  heads.forEach(h=>{ fs('#E8C0A0');
    capsule(h.x*0.55,-192,h.x,h.y+26,17); X.fill(); stroke('#A87A55',3.2); });
  heads.forEach((h,i)=>{
    const done=fed[i], nod=Math.sin(t*2.6+i*2)*0.1;
    X.save(); X.translate(h.x,h.y); X.rotate(nod);
    fs('#E8C0A0'); circle(-33,3,7); X.fill(); circle(33,3,7); X.fill();
    fs('#E8C0A0'); ellipse(0,0,34,35); X.fill(); stroke('#A87A55',3.6);
    if(done){ ss('#2E7D32'); X.lineWidth=6; X.lineCap='round';
      X.beginPath(); X.moveTo(-12,1); X.lineTo(-3,11); X.lineTo(14,-11); X.stroke(); }
    else {
      fs('#FFF'); ellipse(-11,-2,8.4,8.8); X.fill(); ellipse(11,-2,8.4,8.8); X.fill();
      fs('#25252E'); circle(-9.5,-1,4.2); X.fill(); circle(12.5,-1,4.2); X.fill();
      ss('#3A3028'); X.lineWidth=3.4; X.lineCap='round';
      X.beginPath(); X.moveTo(-20,-13); X.lineTo(-5,-16); X.moveTo(5,-16); X.lineTo(20,-13); X.stroke();
      ss('#8A443A'); X.lineWidth=3.4;
      X.beginPath(); X.moveTo(-9,16); X.lineTo(10,16); X.stroke();
    }
    fs(h.col);
    if(h.hat==='cap'){ X.beginPath(); X.arc(0,-5,35,Math.PI,0); X.closePath(); X.fill();
      rrect(-40,-8,80,9,4); X.fill(); stroke(ink(h.col),3.4);
      fs(shade(h.col,0.45)); circle(0,-22,7); X.fill(); }
    if(h.hat==='tie'){ X.beginPath(); X.arc(0,-5,35,Math.PI,0); X.closePath(); X.fill();
      stroke(ink(h.col),3.4);
      fs('#FFF'); for(let k=0;k<3;k++){ rrect(-27+k*19,-34,8,26,3); X.fill(); } }
    if(h.hat==='helm'){ X.beginPath(); X.arc(0,-3,36,Math.PI,0); X.closePath(); X.fill();
      rrect(-42,-6,84,8,4); X.fill(); stroke(ink(h.col),3.4);
      fs(shade(h.col,0.35)); rrect(-4,-40,8,34,3); X.fill(); }
    // ярлык
    fs('rgba(10,10,18,.78)'); rrect(-34,40,68,19,5); X.fill();
    fs('#FFF'); X.font='bold 13px sans-serif'; X.textAlign='center'; X.fillText(h.lbl,0,54);
    X.restore();
  });
  X.restore();
}
/** Проблема Выравнивания — финальный босс */
function drawAlignment(ctx,opts){
  setCtx(ctx); opts=opts||{};
  const t=opts.t||0, sc=opts.scale||1, ph=opts.phase||0, hue=opts.hue||265;
  X.save(); X.translate(opts.x||0,opts.y||0); X.scale(sc,sc);
  const pulse=1+Math.sin(t*3)*0.06;

  // ореол
  const g=X.createRadialGradient(0,0,10,0,0,120);
  g.addColorStop(0,'hsla('+hue+',90%,70%,.35)'); g.addColorStop(1,'hsla('+hue+',90%,50%,0)');
  fs(g); circle(0,0,120); X.fill();

  if(ph===0){                                   // фаза 1: пульсирующий многоугольник
    const n=7, R=62*pulse; const pts=[];
    for(let i=0;i<n;i++){ const a=t*0.5+i*6.2832/n, r=R*(1+Math.sin(t*4+i)*0.09);
      pts.push([Math.cos(a)*r,Math.sin(a)*r]); }
    poly(pts); fs('hsla('+hue+',85%,62%,.30)'); X.fill(); stroke('hsl('+hue+',95%,78%)',4);
    poly(pts.map(p=>[p[0]*0.58,p[1]*0.58])); fs('hsla('+hue+',90%,75%,.5)'); X.fill();
  } else if(ph===1){                            // фаза 2: вложенные кольца
    for(let k=0;k<3;k++){ const r=32+k*17, sp=t*(0.7+k*0.5)*(k%2?-1:1);
      X.save(); X.rotate(sp);
      ss('hsl('+(hue+k*22)+',95%,'+(72-k*8)+'%)'); X.lineWidth=5-k;
      X.beginPath(); X.arc(0,0,r*pulse,0.5,5.4); X.stroke();
      fs('hsl('+(hue+k*22)+',95%,80%)'); circle(r*pulse,0,4.5); X.fill();
      X.restore(); }
    fs('hsla('+hue+',95%,82%,.85)'); circle(0,0,13*pulse); X.fill();
  } else {                                      // фаза 3: глючащий силуэт игрока
    X.save(); X.globalAlpha=0.9; X.filter='none';
    for(let k=-1;k<=1;k++){
      X.save(); X.translate(k*Math.sin(t*17)*4, 0); X.globalAlpha= k===0?0.95:0.32;
      X.translate(0,52);
      drawChar(X,opts.mirror||'altman',{state:opts.mirrorState||'idle',t:t,tier:1,
        shadow:false,scale:1.15,y:0,dir:opts.dir||1});
      X.restore();
    }
    X.restore();
    X.globalCompositeOperation='saturation'; fs('#808080');
    circle(0,0,90); X.fill(); X.globalCompositeOperation='source-over';
  }
  // зрачок-наблюдатель
  fs('#0A0A14'); ellipse(0,0,16*pulse,9*pulse); X.fill();
  fs('hsl('+hue+',95%,85%)'); circle(Math.sin(t*1.3)*4,Math.cos(t*1.1)*2,4); X.fill();
  X.restore();
}

/* ───────────────────────── предметы ───────────────────────── */
function drawChip(ctx,x,y,t){
  setCtx(ctx); X.save(); X.translate(x,y);
  const sq=Math.cos(t*3.4); X.scale(Math.abs(sq)*0.75+0.25,1); LW=2.2;
  fs('#FFD447'); rrect(-10,-10,20,20,4); X.fill(); stroke('#9C7A0E',2.6);
  fs('#B58F12'); rrect(-4.5,-4.5,9,9,2); X.fill();
  ss('#B58F12'); X.lineWidth=2;
  for(let i=-1;i<=1;i++){
    X.beginPath(); X.moveTo(i*5,-10); X.lineTo(i*5,-13.5);
    X.moveTo(i*5, 10); X.lineTo(i*5, 13.5);
    X.moveTo(-10,i*5); X.lineTo(-13.5,i*5);
    X.moveTo( 10,i*5); X.lineTo( 13.5,i*5); X.stroke();
  }
  if(sq>0.75){ fs('rgba(255,255,255,.65)'); rrect(-7,-8,4,10,2); X.fill(); }
  X.restore();
}
function drawStar(ctx,x,y,t){                    // TRAINING RUN
  setCtx(ctx); X.save(); X.translate(x,y); X.rotate(t*1.7);
  const p=1+Math.sin(t*7)*0.09;
  const g=X.createRadialGradient(0,0,2,0,0,26*p);
  g.addColorStop(0,'#FFFFFF'); g.addColorStop(.45,'hsl('+((t*90)%360)+',95%,65%)');
  g.addColorStop(1,'hsla('+((t*90)%360)+',95%,55%,0)');
  fs(g); circle(0,0,26*p); X.fill();
  const pts=[]; for(let i=0;i<10;i++){ const a=i*Math.PI/5-Math.PI/2, r=i%2?7:18;
    pts.push([Math.cos(a)*r*p,Math.sin(a)*r*p]); }
  poly(pts); fs('#FFFFFF'); X.fill(); stroke('#FFD447',2.4);
  X.restore();
}
function drawWeights(ctx,x,y,t){                 // пакет открытых весов
  setCtx(ctx); X.save(); X.translate(x,y); X.rotate(Math.sin(t*1.6)*0.3); LW=2.2;
  fs('rgba(120,220,255,.28)'); rrect(-15,-15,30,30,5); X.fill(); stroke('#5AD8FF',2.6);
  ss('rgba(140,235,255,.75)'); X.lineWidth=1.5;
  for(let i=-1;i<=1;i++){ X.beginPath(); X.moveTo(i*7,-14); X.lineTo(i*7,14);
    X.moveTo(-14,i*7); X.lineTo(14,i*7); X.stroke(); }
  fs('#B8F0FF'); circle(0,0,3.5); X.fill();
  X.restore();
}
function drawJacket(ctx,x,y,t){                  // секретка: кожаная куртка
  setCtx(ctx); X.save(); X.translate(x,y+Math.sin(t*2.4)*4); X.scale(1.3,1.3); LW=2.2;
  fs('rgba(118,185,0,.20)'); circle(0,0,22+Math.sin(t*3)*3); X.fill();
  // рукава
  fs('#20202A'); rrect(-21,-13,9,20,4); X.fill(); stroke('#0A0A10',2.4);
  rrect(12,-13,9,20,4); X.fill(); stroke('#0A0A10',2.4);
  // корпус
  fs('#2A2A34'); poly([[-14,-15],[14,-15],[11,16],[-11,16]]); X.fill(); stroke('#0A0A10',2.8);
  // лацканы
  fs('#3E3E4C'); poly([[-14,-15],[-2,-11],[-3,16],[-11,16]]); X.fill(); stroke('#0A0A10',2);
  poly([[14,-15],[2,-11],[3,16],[11,16]]); X.fill(); stroke('#0A0A10',2);
  // молния и блик
  ss('#C8C8D2'); X.lineWidth=2; X.beginPath(); X.moveTo(0,-11); X.lineTo(0,16); X.stroke();
  fs('rgba(255,255,255,.14)'); rrect(-10,-12,4,22,2); X.fill();
  fs('#76B900'); circle(-6,-6,3.2); X.fill(); stroke('#3E6000',1.6);
  X.restore();
}
function drawCheckpoint(ctx,x,y,on,t){
  setCtx(ctx); X.save(); X.translate(x,y); LW=2.6;
  // мачта с флажком — чтобы чекпоинт не путался с предметом
  ss('#3A3F4C'); X.lineWidth=4; X.beginPath(); X.moveTo(0,-70); X.lineTo(0,-116); X.stroke();
  fs(on?'#34C759':'#5A5F6C'); X.save(); X.translate(0,-112);
  const wv=on?Math.sin(t*5)*3:0;
  X.beginPath(); X.moveTo(0,0); X.quadraticCurveTo(16,4+wv,30,0);
  X.quadraticCurveTo(16,10-wv,0,18); X.closePath(); X.fill(); stroke(on?'#1E7A38':'#3A3F4C',2.4);
  X.restore();
  fs('#3A3F4C'); rrect(-20,-72,40,72,5); X.fill(); stroke('#1C202A',3);
  fs(on?'#0E2A18':'#14161E'); rrect(-14,-64,28,40,3); X.fill();
  const c=on?'#34C759':'#4A4E5A';
  fs(c); for(let i=0;i<4;i++){ const w=on?(8+Math.sin(t*4+i)*8):6;
    rrect(-11,-60+i*9,w+6,4,2); X.fill(); }
  fs(on?'#34C759':'#5A5F6C'); circle(0,-14,4.5); X.fill();
  if(on){ fs('rgba(52,199,89,.22)'); circle(0,-44,34+Math.sin(t*3)*4); X.fill(); }
  X.restore();
}

/* ───────────────────────── миры: фон и тайлы ───────────────────────── */
const WORLDS = {
  1:{ name:'Долина стартапов', sky:['#FFE8A3','#FFC46B'], ground:'#7A4E2A', top:'#5FBF5F',
      plat:'#8B5E34', accent:'#F2B45C' },
  2:{ name:'Пустыня дата-центров', sky:['#F0A860','#B33F2E'], ground:'#6B4630', top:'#C08A5A',
      plat:'#7A5240', accent:'#E8804A' },
  3:{ name:'Столица регуляций', sky:['#EDE8DE','#B0A796'], ground:'#6B6456', top:'#C6BCA4',
      plat:'#7C7566', accent:'#D6323A' },
  4:{ name:'Великая открытая стена', sky:['#2A0B4A','#16062B'], ground:'#2E2148', top:'#FF2E63',
      plat:'#4A3470', accent:'#00E5FF' },
  5:{ name:'Лаборатория сингулярности', sky:['#101A3D','#05060E'], ground:'#1A1E3A', top:'#7B61FF',
      plat:'#232848', accent:'#FFFFFF' },
};

function drawSky(ctx,w,h,world){
  setCtx(ctx); const W=WORLDS[world];
  const g=X.createLinearGradient(0,0,0,h);
  g.addColorStop(0,W.sky[0]); g.addColorStop(1,W.sky[1]);
  fs(g); X.fillRect(0,0,w,h);
}
/** параллакс. cam — смещение камеры, gy — линия горизонта */
function drawParallax(ctx,cam,w,h,world,gy,t){
  setCtx(ctx); const W=WORLDS[world]; gy=gy||h*0.85;

  if(world===1){
    fs('#FFF6D8'); circle(w*0.8,84,48); X.fill();
    fs('rgba(255,255,255,.28)'); circle(w*0.8,84,66); X.fill();
    // облака в два эшелона — иначе верх кадра пустой
    fs('rgba(255,255,255,.5)');
    for(let i=0;i<9;i++){ const x=((i*268-cam*0.10)%(w+380))-150, y=44+((i*67)%120);
      circle(x,y,26); X.fill(); circle(x+24,y+7,19); X.fill(); circle(x-22,y+8,16); X.fill(); }
    fs('rgba(255,255,255,.20)');
    for(let i=0;i<4;i++){ const x=((i*560-cam*0.05)%(w+700))-260, y=104+((i*47)%60);
      circle(x,y,34); X.fill(); circle(x+32,y+9,25); X.fill(); circle(x-28,y+10,21); X.fill(); }
    // дальняя гряда — заполняет середину кадра
    fs(shade(W.accent,0.28));
    for(let i=0;i<10;i++){ const x=((i*300-cam*0.14)%(w+620))-260;
      ellipse(x,gy-24,220,175); X.fill(); }
    fs(W.accent);
    for(let i=0;i<12;i++){ const x=((i*270-cam*0.28)%(w+560))-220;
      ellipse(x,gy+34,190,112); X.fill(); }
    fs(shade(W.accent,-0.16));
    for(let i=0;i<10;i++){ const x=((i*330-cam*0.5)%(w+660))-260;
      ellipse(x,gy+72,150,92); X.fill();
      // пальма — не на каждом холме, иначе рябит
      if(i%2){ fs(shade(W.accent,-0.16)); continue; }
      X.save(); X.translate(x+70,gy-6);
      ss('#8A6A3A'); X.lineWidth=9; X.lineCap='round';
      X.beginPath(); X.moveTo(0,0); X.quadraticCurveTo(10,-46,4,-92); X.stroke();
      ss('#6E5228'); X.lineWidth=2;
      for(let k=0;k<5;k++){ X.beginPath(); X.moveTo(-3+k*1.4,-14-k*16); X.lineTo(7+k*0.6,-16-k*16); X.stroke(); }
      fs('#3E9A46');
      for(let k=0;k<6;k++){ X.save(); X.translate(4,-92); X.rotate(-1.5+k*0.6);
        X.beginPath(); X.moveTo(0,0);
        X.quadraticCurveTo(-9,-20,-2,-38); X.quadraticCurveTo(9,-20,0,0);
        X.closePath(); X.fill(); X.restore(); }
      fs('#5FBF5F'); circle(4,-92,6); X.fill();
      fs('#8A5A2A'); circle(0,-84,3.4); X.fill(); circle(8,-83,3.4); X.fill();
      X.restore();
      fs(shade(W.accent,-0.16));
    }
  }
  else if(world===2){
    fs('#FFD9A0'); circle(w*0.72,120,54); X.fill();
    fs('rgba(255,190,130,.30)'); X.fillRect(0,gy-190,w,190);
    // ряды стоек
    for(let L=0;L<2;L++){
      const sp=[0.22,0.44][L], col=['#8A5A48','#6E4436'][L], hh=[96,132][L];
      fs(col);
      for(let i=0;i<26;i++){ const x=((i*84-cam*sp)%(w+340))-170;
        X.fillRect(x,gy-hh+L*22,52,hh);
        fs(shade(col,0.18));
        for(let k=0;k<5;k++) X.fillRect(x+6,gy-hh+L*22+9+k*((hh-20)/5),40,4);
        fs(col); }
    }
    // градирни
    fs('#5A3A2E');
    for(let i=0;i<5;i++){ const x=((i*430-cam*0.34)%(w+900))-300;
      poly([[x,gy-4],[x+16,gy-150],[x+62,gy-150],[x+78,gy-4]]); X.fill();
      fs('rgba(255,230,200,.30)');
      for(let k=0;k<3;k++) circle(x+39,gy-168-k*26+Math.sin(t*1.4+k+i)*5,20+k*7); X.fill();
      fs('#5A3A2E'); }
  }
  else if(world===3){
    fs('rgba(255,255,255,.35)'); X.fillRect(0,0,w,gy);
    // купол
    fs('#CFC6B4'); const dx=w*0.62-cam*0.16%(w*2);
    X.beginPath(); X.arc(dx,gy-210,86,Math.PI,0); X.closePath(); X.fill();
    X.fillRect(dx-96,gy-212,192,32);
    // колоннада
    for(let L=0;L<2;L++){
      const sp=[0.3,0.55][L], col=['#D6CFC0','#B8AFA0'][L], hh=[150,200][L];
      for(let i=0;i<24;i++){ const x=((i*72-cam*sp)%(w+300))-150;
        fs(col); X.fillRect(x,gy-hh,26,hh);
        fs(shade(col,-0.1)); X.fillRect(x-5,gy-hh-12,36,12); X.fillRect(x-5,gy-10,36,10);
        fs(shade(col,0.2)); X.fillRect(x+4,gy-hh+8,4,hh-20); }
    }
  }
  else if(world===4){
    // луна и дым
    fs('#F2ECFF'); circle(w*0.78,86,40); X.fill();
    fs('rgba(22,6,43,.9)'); circle(w*0.78+16,78,36); X.fill();
    for(let L=0;L<2;L++){
      const sp=[0.24,0.46][L], col=['#2A1250','#3A1A66'][L];
      fs(col);
      for(let i=0;i<20;i++){ const x=((i*116-cam*sp)%(w+480))-240, hh=120+((i*67)%190);
        X.fillRect(x,gy-hh,84,hh);
        // окна
        fs(L?'#FF2E63':'#00E5FF'); X.globalAlpha=0.5;
        for(let a=0;a<6;a++)for(let b=0;b<Math.floor(hh/34);b++)
          if((i*7+a*3+b*5)%4===0) X.fillRect(x+9+a*12,gy-hh+12+b*30,7,13);
        X.globalAlpha=1; fs(col); }
    }
    // вертикальные вывески
    for(let i=0;i<7;i++){ const x=((i*320-cam*0.62)%(w+700))-260;
      const c=i%2?'#FF2E63':'#00E5FF';
      fs('rgba(10,4,22,.85)'); rrect(x,gy-250,26,140,4); X.fill();
      ss(c); X.lineWidth=2.4; rrect(x,gy-250,26,140,4); X.stroke();
      fs(c); X.globalAlpha=0.5+Math.sin(t*4+i)*0.35;
      for(let k=0;k<4;k++){ rrect(x+7,gy-238+k*33,12,20,3); X.fill(); } X.globalAlpha=1; }
  }
  else {
    // звёзды
    for(let i=0;i<130;i++){ const x=((i*137-cam*0.06)%(w+200))-100, y=(i*97)%gy;
      fs('rgba(255,255,255,'+(0.25+((i*13)%10)/16)+')'); circle(x,y,((i*7)%10)/7+0.5); X.fill(); }
    // координатная сетка
    ss('rgba(123,97,255,.16)'); X.lineWidth=1;
    for(let i=0;i<26;i++){ const x=((i*64-cam*0.3)%(w+128))-64;
      X.beginPath(); X.moveTo(x,0); X.lineTo(x,gy); X.stroke(); }
    for(let j=0;j<10;j++){ X.beginPath(); X.moveTo(0,j*54); X.lineTo(w,j*54); X.stroke(); }
    // кривая loss
    ss('#7B61FF'); X.lineWidth=3.4; X.beginPath();
    for(let i=0;i<=w;i+=8){ const p=(i+cam*0.4)/560;
      const y=gy-40-300*Math.exp(-p*0.9)*(1+Math.sin(p*9)*0.05);
      i===0?X.moveTo(i,y):X.lineTo(i,y); }
    X.stroke();
    fs('rgba(123,97,255,.10)'); X.lineTo(w,gy); X.lineTo(0,gy); X.closePath(); X.fill();
  }
}
/** блок земли/платформы */
function drawTile(ctx,x,y,w,h,world,kind){
  setCtx(ctx); const W=WORLDS[world]; LW=0;
  const base = kind==='plat' ? W.plat : W.ground;
  fs(base); rrect(x,y,w,h,kind==='plat'?6:0); X.fill();
  fs(W.top); rrect(x,y,w,10,kind==='plat'?6:0); X.fill();
  fs('rgba(0,0,0,.14)'); X.fillRect(x,y+10,w,4);
  fs('rgba(0,0,0,.10)');
  for(let i=0;i<Math.floor(w/34);i++) X.fillRect(x+8+i*34,y+20,3,Math.max(0,h-26));
  if(world===2){ fs('rgba(255,255,255,.10)');
    for(let i=0;i<Math.floor(w/22);i++) X.fillRect(x+4+i*22,y+16,13,3); }
  if(world===4){ ss(W.top); X.lineWidth=2; X.globalAlpha=.5;
    X.beginPath(); X.moveTo(x,y+2); X.lineTo(x+w,y+2); X.stroke(); X.globalAlpha=1; }
}

/* ───────────────────────── механики миров ───────────────────────── */

/** бумажная платформа (мир 3): растворяется, когда на ней стоят */
function drawPaperPlat(ctx,x,y,w,h,decay,gone){
  setCtx(ctx);
  if(gone){ ss('rgba(255,255,255,.22)'); X.lineWidth=2; X.setLineDash([7,7]);
    rrect(x,y,w,h,4); X.stroke(); X.setLineDash([]); return; }
  X.save(); X.globalAlpha=decay>0?Math.max(.25,1-decay*0.8):1;
  if(decay>0) X.translate((Math.random()-.5)*decay*4,(Math.random()-.5)*decay*3);
  fs('#F7F3E8'); rrect(x,y,w,h,3); X.fill(); stroke('#B8AE96',2.6);
  ss('#C9C0A8'); X.lineWidth=1.4;
  for(let i=0;i<3;i++){ X.beginPath(); X.moveTo(x+9,y+7+i*6); X.lineTo(x+w-14,y+7+i*6); X.stroke(); }
  fs('#D6323A'); circle(x+w-11,y+h*0.5,4); X.fill();
  X.restore();
}
/** красная лента (мир 3) */
function drawTape(ctx,x,y,w,h,t){
  setCtx(ctx); X.save();
  const wave=Math.sin(t*2.2+x*0.01)*3;
  fs('#D6323A'); X.beginPath();
  X.moveTo(x,y+wave); X.lineTo(x+w,y-wave);
  X.lineTo(x+w,y-wave+h); X.lineTo(x,y+wave+h); X.closePath(); X.fill();
  stroke('#8A1A20',2.4);
  fs('rgba(255,255,255,.85)'); X.font='bold 10px sans-serif'; X.textAlign='center';
  for(let i=0;i<Math.floor(w/78);i++) X.fillText('НЕ ПЕРЕСЕКАТЬ',x+44+i*78,y+h*0.72);
  X.restore();
}
/** штамп-предмет (босс мира 3) */
function drawStamp(ctx,x,y,col,t,held){
  setCtx(ctx); X.save(); X.translate(x,y+(held?0:Math.sin(t*3)*4));
  if(!held){ fs('rgba(255,255,255,.16)'); circle(0,0,20+Math.sin(t*4)*3); X.fill(); }
  fs('#8A4B2A'); rrect(-13,-4,26,15,4); X.fill(); stroke('#4A2614',2.6);
  fs('#6A3A20'); rrect(-5,-17,10,14,3); X.fill(); stroke('#3A1E10',2.4);
  fs(col); rrect(-13,9,26,7,3); X.fill(); stroke(ink(col),2);
  fs('rgba(255,255,255,.3)'); rrect(-10,-2,7,9,2); X.fill();
  X.restore();
}
/** вывеска магазина (мир 2) */
function drawShopSign(ctx,x,y,t){
  setCtx(ctx); X.save(); X.translate(x,y);
  ss('#5A4030'); X.lineWidth=5; X.beginPath(); X.moveTo(0,0); X.lineTo(0,-64); X.stroke();
  X.translate(0,-92+Math.sin(t*1.6)*2);
  fs('#76B900'); rrect(-62,-22,124,44,8); X.fill(); stroke('#3E6000',3.4);
  fs('#0E1408'); X.font='bold 15px sans-serif'; X.textAlign='center';
  X.fillText('GPU SHOP',0,-2);
  X.font='9px sans-serif'; X.fillStyle='#1E3010';
  X.fillText('the more you buy…',0,12);
  fs('rgba(255,255,255,'+(0.15+Math.sin(t*3)*0.12)+')'); rrect(-62,-22,124,16,8); X.fill();
  X.restore();
}
/** поднимающийся «счёт за компьют» — наша лава (мир 5) */
function drawBillTide(ctx,x0,x1,y,t){
  setCtx(ctx);
  const g=X.createLinearGradient(0,y-40,0,y+400);
  g.addColorStop(0,'rgba(255,90,60,.0)'); g.addColorStop(.12,'#FF5A3C');
  g.addColorStop(1,'#8A1810');
  fs(g);
  X.beginPath(); X.moveTo(x0,y+30);
  for(let x=x0;x<=x1;x+=26) X.lineTo(x, y+Math.sin(x*0.02+t*3.4)*9+Math.sin(x*0.007+t*1.7)*6);
  X.lineTo(x1,y+420); X.lineTo(x0,y+420); X.closePath(); X.fill();
  ss('#FFC24A'); X.lineWidth=3;
  X.beginPath(); X.moveTo(x0,y);
  for(let x=x0;x<=x1;x+=26) X.lineTo(x, y+Math.sin(x*0.02+t*3.4)*9+Math.sin(x*0.007+t*1.7)*6);
  X.stroke();
  fs('rgba(255,220,120,.5)'); X.font='bold 13px ui-monospace,monospace'; X.textAlign='center';
  for(let i=0;i<7;i++){ const x=x0+90+i*190, yy=y+40+((i*53+t*40)%160);
    X.fillText('$'+((i*7919)%9000+1000),x,yy); }
}
/** плита выравнивания (финальный босс) */
function drawPad(ctx,x,y,w,hue,active,t){
  setCtx(ctx);
  const c='hsl('+hue+',85%,62%)';
  // столб света над активной плитой — градиент, иначе читается как чёрный ящик
  if(active){
    const g=X.createLinearGradient(0,y-150,0,y);
    g.addColorStop(0,'hsla('+hue+',95%,70%,0)');
    g.addColorStop(1,'hsla('+hue+',95%,70%,'+(0.34+Math.sin(t*8)*0.14)+')');
    fs(g); X.fillRect(x,y-150,w,152);
    fs('hsla('+hue+',95%,88%,'+(0.5+Math.sin(t*8)*0.2)+')'); rrect(x+4,y-4,w-8,7,3); X.fill();
  }
  fs(active?'hsla('+hue+',95%,60%,.85)':'hsla('+hue+',45%,42%,.30)');
  rrect(x,y,w,16,7); X.fill();
  ss(c); X.lineWidth=active?4:2; rrect(x,y,w,16,7); X.stroke();
}
/** реплика персонажа — облачко с текстом */
function drawBubble(ctx,x,y,text,dir){
  setCtx(ctx); X.font='bold 13px sans-serif';
  const w=X.measureText(text).width+26, h=34;
  X.save(); X.translate(x-w/2,y-h);
  fs('#FFFFFF'); rrect(0,0,w,h,10); X.fill(); stroke('#1E1E28',2.6);
  fs('#FFFFFF'); poly([[w/2-8,h-1],[w/2+8,h-1],[w/2+(dir||1)*4,h+13]]); X.fill();
  stroke('#1E1E28',2.6);
  fs('#1E1E28'); X.textAlign='center'; X.fillText(text,w/2,h/2+5);
  X.restore();
}

/* ───────────────────────── экспорт ───────────────────────── */
return { CAST, ORDER, FOE, WORLDS, SKIN,
  drawChar, drawPortrait, drawFoe, drawTroll, drawBill, drawCheap,
  drawVehicleBoss, drawRegulator, drawAlignment,
  drawChip, drawStar, drawWeights, drawJacket, drawCheckpoint,
  drawPaperPlat, drawTape, drawStamp, drawShopSign, drawBillTide, drawPad, drawBubble,
  drawSky, drawParallax, drawTile,
  shade, ink, setCtx, rrect, circle, poly, capsule, limb, poseOf };
})();
if(typeof module!=='undefined') module.exports=ART;
