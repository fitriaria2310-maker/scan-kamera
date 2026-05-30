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

const DEFAULT_STICKER_SIZE = parseFloat(stickerSizeInput ? stickerSizeInput.value : 0.18);

async function startCamera(){
  try{
    stream = await navigator.mediaDevices.getUserMedia({video:{facingMode:'user'}, audio:false});
    video.srcObject = stream;
    await video.play();
    resizeCanvas();
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

window.addEventListener('resize', resizeCanvas);
