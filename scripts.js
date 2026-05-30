const video = document.getElementById('video');
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const startBtn = document.getElementById('startBtn');
const captureBtn = document.getElementById('captureBtn');
const downloadBtn = document.getElementById('downloadBtn');
const effectsEl = document.getElementById('effects');
const stickersToggle = document.getElementById('stickersToggle');
const stickersPane = document.querySelector('.stickers');
const stickerSizeInput = document.getElementById('stickerSize');
const clearStickersBtn = document.getElementById('clearStickersBtn');

let stream = null;
let currentEffect = 'none';
let selectedSticker = null;
let stickers = [];
let dragging = false;
let dragIndex = -1;
let dragOffset = {x:0,y:0};
let mpCamera = null;

const DEFAULT_STICKER_SIZE = parseFloat(stickerSizeInput ? stickerSizeInput.value : 0.18);

async function startCamera(){
  try{
    stream = await navigator.mediaDevices.getUserMedia({video:{facingMode:'user'}, audio:false});
    video.srcObject = stream;
    await video.play();
    resizeCanvas();

    // start MediaPipe Camera to feed frames into faceMesh
    if(typeof Camera !== 'undefined'){
      mpCamera = new Camera(video, {
        onFrame: async () => { try{ await faceMesh.send({image: video}); }catch(e){} },
        width: video.videoWidth || 640,
        height: video.videoHeight || 480
      });
      mpCamera.start();
    } else {
      // fallback: poll frames
      setInterval(()=>{ try{ faceMesh.send({image: video}); }catch(e){} }, 200);
    }

    requestAnimationFrame(draw);
  }catch(e){
    alert('Tidak dapat mengakses kamera: '+e.message);
  }
}

function resizeCanvas(){
  const w = video.videoWidth || 640;
  const h = video.videoHeight || 480;
  canvas.width = w;
  canvas.height = h;
}

function applyEffect(imageData, effect){
  const d = imageData.data;
  const w = imageData.width;
  const h = imageData.height;

  if(effect === 'none') return imageData;

  if(effect === 'cute'){
    for(let i=0;i<d.length;i+=4){
      d[i] = Math.min(255, d[i]*1.05 + 10);
      d[i+1] = Math.min(255, d[i+1]*1.15 + 20);
      d[i+2] = Math.min(255, d[i+2]*1.2 + 10);
    }
  }

  if(effect === 'funny'){
    for(let i=0;i<d.length;i+=4){
      d[i] = Math.floor(d[i]/64)*64;
      d[i+1] = Math.floor(d[i+1]/64)*64;
      d[i+2] = Math.floor(d[i+2]/64)*64;
    }
  }

  if(effect === 'cool'){
    for(let i=0;i<d.length;i+=4){
      d[i] = d[i]*0.9;
      d[i+1] = d[i+1]*0.95;
      d[i+2] = Math.min(255, d[i+2]*1.2 + 10);
    }
  }

  if(effect === 'sepia'){
    for(let i=0;i<d.length;i+=4){
      const r=d[i], g=d[i+1], b=d[i+2];
      d[i]   = Math.min(255, (r*0.393)+(g*0.769)+(b*0.189));
      d[i+1] = Math.min(255, (r*0.349)+(g*0.686)+(b*0.168));
      d[i+2] = Math.min(255, (r*0.272)+(g*0.534)+(b*0.131));
    }
  }

  if(effect === 'invert'){
    for(let i=0;i<d.length;i+=4){d[i]=255-d[i];d[i+1]=255-d[i+1];d[i+2]=255-d[i+2];}
  }

  if(effect === 'scary'){
    for(let i=0;i<d.length;i+=4){
      d[i] = d[i]*0.6; d[i+1]=d[i+1]*0.6; d[i+2]=d[i+2]*0.6;
      d[i] = Math.min(255, d[i]+30);
      d[i+2] = d[i+2]*0.4;
    }
  }

  if(effect === 'pixelate'){
    const block = 12;
    for(let y=0;y<h;y+=block){
      for(let x=0;x<w;x+=block){
        const i = ((y*w)+x)*4;
        const r = d[i], g=d[i+1], b=d[i+2];
        for(let yy=0;yy<block;yy++){
          for(let xx=0;xx<block;xx++){
            const nx = x+xx, ny = y+yy;
            if(nx<w && ny<h){
              const ni = ((ny*w)+nx)*4;
              d[ni]=r;d[ni+1]=g;d[ni+2]=b;
            }
          }
        }
      }
    }
  }

  if(effect === 'glitch'){
    const stride = Math.max(2, Math.floor(h/40));
    for(let y=0;y<h;y+=stride){
      const offset = Math.floor((Math.random()-0.5)*20);
      for(let x=0;x<w;x++){
        const sx = Math.min(w-1, Math.max(0, x+offset));
        const srcI = ((y*w)+sx)*4;
        const dstI = ((y*w)+x)*4;
        d[dstI]=d[srcI];d[dstI+1]=d[srcI+1];d[dstI+2]=d[srcI+2];
      }
    }
  }

  return imageData;
}

function draw(){
  if(video.readyState >= 2){
    resizeCanvas();
    ctx.drawImage(video,0,0,canvas.width,canvas.height);
    let frame = ctx.getImageData(0,0,canvas.width,canvas.height);
    frame = applyEffect(frame, currentEffect);
    ctx.putImageData(frame,0,0);

    if(currentEffect==='scary'){
      const g = ctx.createRadialGradient(canvas.width/2,canvas.height/2,canvas.width/6,canvas.width/2,canvas.height/2,Math.max(canvas.width,canvas.height));
      g.addColorStop(0,'rgba(0,0,0,0)');
      g.addColorStop(1,'rgba(0,0,0,0.65)');
      ctx.fillStyle = g; ctx.fillRect(0,0,canvas.width,canvas.height);
    }

    if(stickersToggle.checked){
      stickers.forEach(s=>{
        const fontSize = (s.size || DEFAULT_STICKER_SIZE) * canvas.width;
        ctx.font = `${fontSize}px serif`;
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(s.ch, s.x*canvas.width, s.y*canvas.height);
        if(s.selected){
          const metrics = ctx.measureText(s.ch);
          const w = metrics.width;
          const h = fontSize * 0.9;
          ctx.strokeStyle = 'rgba(255,255,255,0.8)'; ctx.lineWidth = 2;
          ctx.strokeRect(s.x*canvas.width - w/2 - 6, s.y*canvas.height - h/2 - 6, w + 12, h + 12);
        }
      });
    }

    // face overlays drawn on top if enabled
    if(faceEffectsToggle && faceEffectsToggle.checked && faceLandmarks){
      drawFaceOverlays(faceLandmarks);
    }
  }
  requestAnimationFrame(draw);
}

startBtn.addEventListener('click', ()=>startCamera());

captureBtn.addEventListener('click', ()=>{
  const data = canvas.toDataURL('image/png');
  const w = window.open('about:blank','_blank');
  if(w){w.document.write(`<img src="${data}" alt="foto"/>`);} else {
    const a = document.createElement('a'); a.href=data; a.download='photo.png'; a.click();
  }
});

downloadBtn.addEventListener('click', ()=>{
  const data = canvas.toDataURL('image/png');
  const a = document.createElement('a'); a.href = data; a.download = 'photo.png'; a.click();
});

effectsEl.addEventListener('click',(e)=>{
  const btn = e.target.closest('button');
  if(!btn) return;
  [...effectsEl.querySelectorAll('button')].forEach(b=>b.classList.remove('active'));
  btn.classList.add('active');
  currentEffect = btn.dataset.effect || 'none';
});


// sticker palette click: select sticker for placing
stickersPane.addEventListener('click',(e)=>{
  const btn = e.target.closest('button');
  if(!btn) return;
  const ch = btn.dataset.sticker;
  document.querySelectorAll('.sticker-btn').forEach(b=>b.classList.remove('selected'));
  btn.classList.add('selected');
  selectedSticker = ch;
});

// canvas interactions: add new sticker or drag existing
canvas.addEventListener('mousedown', (e)=>{
  if(!stickersToggle.checked) return;
  const rect = canvas.getBoundingClientRect();
  const px = (e.clientX - rect.left)/rect.width;
  const py = (e.clientY - rect.top)/rect.height;
  // hit test from topmost
  for(let i=stickers.length-1;i>=0;i--){
    const s = stickers[i];
    const fontSize = s.size * canvas.width;
    ctx.font = `${fontSize}px serif`;
    const metrics = ctx.measureText(s.ch);
    const w = metrics.width / canvas.width;
    const h = (fontSize*0.9) / canvas.height;
    const left = s.x - w/2;
    const top = s.y - h/2;
    if(px >= left && px <= left + w && py >= top && py <= top + h){
      stickers.forEach(it=>it.selected=false);
      s.selected = true;
      dragIndex = i; dragging = true;
      dragOffset.x = px - s.x; dragOffset.y = py - s.y;
      return;
    }
  }
  // add new sticker at pointer
  if(selectedSticker){
    const size = stickerSizeInput ? parseFloat(stickerSizeInput.value) : DEFAULT_STICKER_SIZE;
    stickers.push({ch:selectedSticker, x:px, y:py, size, selected:false});
  }
});

window.addEventListener('mousemove',(e)=>{
  if(!dragging || dragIndex<0) return;
  const rect = canvas.getBoundingClientRect();
  const px = (e.clientX - rect.left)/rect.width;
  const py = (e.clientY - rect.top)/rect.height;
  const s = stickers[dragIndex];
  s.x = px - dragOffset.x; s.y = py - dragOffset.y;
});

window.addEventListener('mouseup',()=>{ dragging=false; dragIndex=-1; });

// sticker size control
if(stickerSizeInput){
  stickerSizeInput.addEventListener('input',(e)=>{
    const val = parseFloat(e.target.value);
    const sel = stickers.find(s=>s.selected);
    if(sel) sel.size = val;
  });
}

if(clearStickersBtn){ clearStickersBtn.addEventListener('click',()=>{ stickers = []; }); }

// Face mesh + overlays
const faceEffectsToggle = document.getElementById('faceEffectsToggle');
const feGlasses = document.getElementById('feGlasses');
const feHat = document.getElementById('feHat');
const feMustache = document.getElementById('feMustache');
const feBlush = document.getElementById('feBlush');
const feTeeth = document.getElementById('feTeeth');

let faceLandmarks = null;

const faceMesh = new FaceMesh({locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`});
faceMesh.setOptions({maxNumFaces:1, refineLandmarks:true, minDetectionConfidence:0.5, minTrackingConfidence:0.5});
faceMesh.onResults((results)=>{
  if(results.multiFaceLandmarks && results.multiFaceLandmarks.length){
    faceLandmarks = results.multiFaceLandmarks[0];
  } else {
    faceLandmarks = null;
  }
});

function toCanvasPoint(pt){ return {x: pt.x * canvas.width, y: pt.y * canvas.height}; }
function dist(a,b){ return Math.hypot(a.x-b.x, a.y-b.y); }

function drawFaceOverlays(landmarks){
  if(!landmarks) return;
  try{
    const left = toCanvasPoint(landmarks[33]);
    const right = toCanvasPoint(landmarks[263]);
    const nose = toCanvasPoint(landmarks[1]||landmarks[4]);
    const mouth = toCanvasPoint(landmarks[13]||landmarks[14]||landmarks[0]);
    const eyeDist = dist(left,right);

    // glasses
    if(feGlasses && feGlasses.checked){
      const cx = (left.x + right.x)/2; const cy = (left.y + right.y)/2;
      const angle = Math.atan2(right.y-left.y, right.x-left.x);
      const width = eyeDist * 2.2; const height = eyeDist * 0.45;
      const frame = eyeDist * 0.12;
      ctx.save(); ctx.translate(cx,cy); ctx.rotate(angle);
      ctx.fillStyle = 'rgba(10,10,10,0.85)';
      ctx.fillRect(-width/2, -height/2, width, height);
      ctx.fillStyle = 'rgba(255,255,255,0.12)';
      ctx.fillRect(-width/2+frame, -height/2+frame, width-2*frame, height-2*frame);
      ctx.strokeStyle = 'rgba(255,255,255,0.7)'; ctx.lineWidth = frame*0.9;
      ctx.strokeRect(-width/2, -height/2, width, height);
      ctx.restore();
    }

    // hat
    if(feHat && feHat.checked){
      const cx = (left.x + right.x)/2; const cy = (left.y + right.y)/2 - eyeDist * 1.1;
      const brim = eyeDist * 1.05;
      const crownH = eyeDist * 0.8;
      ctx.save(); ctx.translate(cx, cy);
      ctx.fillStyle = 'rgba(75,15,170,0.95)';
      ctx.beginPath(); ctx.ellipse(0, 0, brim, eyeDist*0.25, 0, 0, Math.PI*2); ctx.fill();
      ctx.beginPath(); ctx.rect(-eyeDist*0.9, -crownH*0.6, eyeDist*1.8, crownH); ctx.fill();
      ctx.restore();
    }

    // mustache
    if(feMustache && feMustache.checked){
      const cx = nose.x; const cy = nose.y + eyeDist*0.22;
      const width = eyeDist * 1.1; const height = eyeDist * 0.22;
      ctx.save(); ctx.translate(cx,cy);
      ctx.fillStyle = 'rgba(35,20,15,0.95)';
      ctx.beginPath(); ctx.moveTo(-width/2,0);
      ctx.quadraticCurveTo(-width*0.2,height*1.2,0,0);
      ctx.quadraticCurveTo(width*0.2,height*1.2,width/2,0);
      ctx.quadraticCurveTo(width*0.3,-height*0.25,0,-height*0.08);
      ctx.quadraticCurveTo(-width*0.3,-height*0.25,-width/2,0);
      ctx.fill();
      ctx.restore();
    }

    // blush
    if(feBlush && feBlush.checked){
      const leftCheek = {x: left.x - eyeDist*0.35, y: left.y + eyeDist*0.4};
      const rightCheek = {x: right.x + eyeDist*0.35, y: right.y + eyeDist*0.4};
      const r = eyeDist*0.22;
      ctx.save(); ctx.fillStyle='rgba(255,100,140,0.35)';
      ctx.beginPath(); ctx.ellipse(leftCheek.x,leftCheek.y,r,r,0,0,Math.PI*2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(rightCheek.x,rightCheek.y,r,r,0,0,Math.PI*2); ctx.fill();
      ctx.restore();
    }

    // teeth (vampire)
    if(feTeeth && feTeeth.checked){
      const cx = mouth.x; const cy = mouth.y + eyeDist*0.08;
      ctx.save(); ctx.fillStyle='white';
      ctx.beginPath(); ctx.moveTo(cx-7, cy); ctx.lineTo(cx-4, cy+eyeDist*0.18); ctx.lineTo(cx-1, cy); ctx.fill();
      ctx.beginPath(); ctx.moveTo(cx+7, cy); ctx.lineTo(cx+4, cy+eyeDist*0.18); ctx.lineTo(cx+1, cy); ctx.fill();
      ctx.restore();
    }
  }catch(err){
    // ignore drawing errors
  }
}

window.addEventListener('resize', resizeCanvas);
