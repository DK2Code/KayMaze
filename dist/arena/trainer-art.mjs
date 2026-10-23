import {TRAINERS,SENDOUT_RELEASE} from './trainers.mjs';
const TAU=Math.PI*2,clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
const art=new Map(),portraits=new Map();let loading;
export function trainerPortrait(id){return portraits.get(id)||`assets/trainers/${id}.png`;}
export function loadTrainerArt(){
  return loading ||= Promise.all([...Object.keys(TRAINERS),'red-throw','leaf-throw','pokeball','pokeball-icon'].map(id=>new Promise((resolve,reject)=>{
    const image=new Image();image.onerror=()=>reject(new Error(`Could not load trainer art: ${id}`));
    image.onload=()=>{
      try{
        // Original GBA PNGs use palette index zero for transparency. Decode the
        // background locally while keeping the source assets unchanged.
        const canvas=document.createElement('canvas');canvas.width=image.width;canvas.height=image.height;
        const g=canvas.getContext('2d');g.drawImage(image,0,0);
        const pixels=g.getImageData(0,0,image.width,image.height),p=pixels.data,[r,b,c]=p;
        for(let i=0;i<p.length;i+=4)if(p[i]===r&&p[i+1]===b&&p[i+2]===c)p[i+3]=0;
        g.putImageData(pixels,0,0);art.set(id,canvas);
        if(TRAINERS[id])portraits.set(id,canvas.toDataURL());resolve();
      }catch(error){reject(error);}
    };image.src=`assets/trainers/${id}.png`;
  }))).catch(error=>{loading=null;throw error;});
}
export function drawTrainer(g,id,x,y,{direction=1,age=0,throwing=false,alpha=1,projection=1,reducedMotion=false}={}){
  const sheet=throwing&&art.get(`${id}-throw`),image=sheet||art.get(id);if(!image)return;
  // Red and Leaf use the original five throwing frames. Other trainers use
  // their front artwork with anticipation, a forward step, and recovery.
  const frame=sheet?Math.min(4,Math.floor(age/.13)):0;
  const motion=throwing&&!reducedMotion?Math.sin(clamp(age/.65)*Math.PI):0;
  g.save();g.globalAlpha=alpha;g.translate(x,y);g.scale(direction*2,2/projection);g.imageSmoothingEnabled=false;
  g.fillStyle='#071b3055';g.beginPath();g.ellipse(0,0,23,5,0,0,TAU);g.fill();
  g.translate(motion*3,-motion*2);if(!sheet)g.rotate(motion*.08);
  g.drawImage(image,0,frame*64,64,64,-32,-64,64,64);g.restore();
}
export function throwSample(age,side,target){
  const direction=side==='player'?1:-1,from={x:side==='player'?145:1055,y:315},q=clamp((age-.42)/.73);
  return {q,x:from.x+(target.x-from.x)*q,y:from.y+(target.y-from.y)*q-Math.sin(q*Math.PI)*105,rotation:direction*q*TAU*1.7};
}
export function recallSample(sequence,side,reducedMotion=false){
  if(!sequence||sequence.side!==side)return null;
  const q=clamp((sequence.age-.2)/.75),travel=clamp((q-.3)/.7),handX=side==='player'?145:1055;
  return {x:sequence.x+(handX-sequence.x)*travel,y:sequence.y+(315-sequence.y)*travel,scale:reducedMotion?1:Math.max(.025,1-q),alpha:1-q,glow:q};
}
function circle(g,x,y,r,color){g.beginPath();g.arc(x,y,Math.max(.01,r),0,TAU);g.fillStyle=color;g.fill();}
function ball(g,x,y,rotation,open=0,projection=1){
  const image=art.get('pokeball');if(!image)return;
  g.save();g.translate(x,y);g.scale(1,1/projection);g.rotate(rotation);g.imageSmoothingEnabled=false;
  if(open>0){circle(g,0,0,8+open*.4,'#fff5e6');g.drawImage(image,0,0,16,8,-12,-12-open,24,12);g.drawImage(image,0,8,16,8,-12,open,24,12);}
  else g.drawImage(image,-12,-12,24,24);g.restore();
}
function trainerLabel(g,id,x,alpha){
  g.save();g.globalAlpha=alpha;g.font='bold 12px monospace';g.textAlign='center';g.fillStyle='#101f2bdd';g.fillRect(x-52,401,104,22);g.fillStyle=TRAINERS[id].color;g.fillText(TRAINERS[id].name.toUpperCase(),x,416);g.restore();
}
export function drawRecall(g,game,reducedMotion=false,projection=1){
  const sequence=game.recall;if(!sequence)return;
  const {age,side}=sequence,id=game.trainers[side],left=side==='player',hand={x:left?145:1055,y:315};
  const fade=clamp(age/.12);
  drawTrainer(g,id,left?125:1075,390,{direction:left?1:-1,alpha:fade,projection,reducedMotion});trainerLabel(g,id,left?125:1075,fade);ball(g,hand.x,hand.y,0,0,projection);
  if(age<.15||age>1.1)return;
  const sample=recallSample(sequence,side,reducedMotion),alpha=Math.sin(clamp((age-.15)/.95)*Math.PI);
  g.save();g.globalAlpha=alpha;g.lineCap='round';g.beginPath();g.moveTo(hand.x,hand.y);g.lineTo(sequence.x,sequence.y-10);
  if(!reducedMotion){g.strokeStyle='#ff5d8a33';g.lineWidth=18;g.stroke();g.strokeStyle='#ff749c';g.lineWidth=5;g.stroke();}
  g.strokeStyle='#ffe7ef';g.lineWidth=2;g.stroke();
  if(!reducedMotion)for(let i=0;i<9;i++){
    const t=(age*1.8+i/9)%1,x=sequence.x+(hand.x-sequence.x)*t,y=sequence.y+(hand.y-sequence.y)*t;
    circle(g,x+Math.sin(t*TAU*2+i)*5,y+Math.cos(t*TAU*2+i)*5,2,'#fff3ec');
  }
  circle(g,sample.x,sample.y,5+sample.glow*5,'#fff2f5');g.restore();
}
export function drawSendout(g,game,reducedMotion=false,projection=1){
  const sequence=game.sendout;if(!sequence)return;
  const age=sequence.age,fade=1-clamp((age-2.1)/.65);
  for(const side of sequence.sides){
    const f=game[side],left=side==='player',id=game.trainers[side],t=TRAINERS[id],x=left?125:1075;
    drawTrainer(g,id,x,390,{direction:left?1:-1,age,throwing:true,alpha:fade,projection,reducedMotion});trainerLabel(g,id,x,fade);
    if(age<.42)continue;
    const sample=throwSample(age,side,f);
    if(age<SENDOUT_RELEASE){
      if(!reducedMotion){g.save();g.globalAlpha=.45;g.strokeStyle='#f7e8be';g.lineWidth=2;g.beginPath();for(let i=0;i<6;i++){const p=throwSample(Math.max(.42,age-i*.025),side,f);i?g.lineTo(p.x,p.y):g.moveTo(p.x,p.y);}g.stroke();g.restore();}
      ball(g,sample.x,reducedMotion?f.y:sample.y,reducedMotion?0:sample.rotation,0,projection);continue;
    }
    const q=clamp((age-SENDOUT_RELEASE)/.65),alpha=1-clamp((age-1.55)/.65);
    g.save();g.globalAlpha=alpha;
    if(!reducedMotion){
      const glow=g.createRadialGradient(f.x,f.y,2,f.x,f.y,65);glow.addColorStop(0,'#ffffff');glow.addColorStop(.35,t.color+'b0');glow.addColorStop(1,t.color+'00');g.fillStyle=glow;g.fillRect(f.x-65,f.y-65,130,130);
      g.strokeStyle='#fff6cf';g.lineWidth=3;g.beginPath();g.ellipse(f.x,f.y+18,12+q*63,5+q*25,0,0,TAU);g.stroke();
      for(let i=0;i<14;i++){const a=i*TAU/14,r=12+q*70;circle(g,f.x+Math.cos(a)*r,f.y+Math.sin(a)*r*.7-20*q,2.5*(1-q)+1,i%2?t.color:'#fff8d7');}
    }
    if(q<.8)ball(g,f.x,f.y,0,q*13,projection);g.restore();
  }
}
