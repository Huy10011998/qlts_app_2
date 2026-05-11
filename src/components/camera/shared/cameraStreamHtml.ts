import { GO2RTC_HOST } from "./cameraStreamConfig";

export const buildCameraGridStreamHTML = (src: string) => `<!DOCTYPE html>
<html><head>
<meta name="viewport" content="width=device-width,initial-scale=1.0,maximum-scale=1.0,user-scalable=no">
<style>
*{margin:0;padding:0;box-sizing:border-box}
html,body{width:100%;height:100%;background:#000;overflow:hidden;position:relative}
video{width:100%;height:100%;object-fit:cover;display:block;pointer-events:none}
#overlay{
  display:none;position:absolute;inset:0;
  align-items:center;justify-content:center;
  flex-direction:column;gap:6px;background:rgba(0,0,0,0.55);
}
#overlay.show{display:flex}
.spin{
  width:18px;height:18px;border:2px solid rgba(255,255,255,0.3);
  border-top-color:#fff;border-radius:50%;
  animation:spin 0.8s linear infinite;
}
@keyframes spin{to{transform:rotate(360deg)}}
#msg{color:#fff;font-size:9px;font-family:sans-serif;opacity:0.85}
#offline-icon{color:#f66;font-size:18px;display:none}
</style></head><body>
<video id="v" autoplay muted playsinline></video>
<div id="overlay">
  <div class="spin" id="spinner"></div>
  <span id="offline-icon">&#x2715;</span>
  <span id="msg">Đang kết nối...</span>
</div>
<script>
const HOST='${GO2RTC_HOST}';
const SRC='${src}_sub';
let TOKEN='';
const v=document.getElementById('v');
const overlay=document.getElementById('overlay');
const spinner=document.getElementById('spinner');
const offlineIcon=document.getElementById('offline-icon');
const msg=document.getElementById('msg');

let pc=null,reconnectTimer=null,frozenTimer=null;
let backoffMs=1000;
const MAX_BACKOFF=10000;
let lastTime=-1,connecting=false,stopped=false,pcId=0;

function showOverlay(text,isOffline){
  overlay.classList.add('show');
  msg.textContent=text;
  spinner.style.display=isOffline?'none':'block';
  offlineIcon.style.display=isOffline?'block':'none';
}
function hideOverlay(){overlay.classList.remove('show');}
function clearTimers(){
  if(reconnectTimer){clearTimeout(reconnectTimer);reconnectTimer=null;}
  if(frozenTimer){clearTimeout(frozenTimer);frozenTimer=null;}
}
function scheduleReconnect(){
  if(stopped)return;
  clearTimers();
  showOverlay('Kết nối lại sau '+Math.round(backoffMs/1000)+'s...',false);
  reconnectTimer=setTimeout(()=>{connect();},backoffMs);
  backoffMs=Math.min(backoffMs*2,MAX_BACKOFF);
}
function resetFrozenWatchdog(){
  if(frozenTimer)clearTimeout(frozenTimer);
  frozenTimer=setTimeout(()=>{if(!stopped)scheduleReconnect();},10000);
}
function stopAll(){
  stopped=true;connecting=false;clearTimers();pcId++;
  if(pc){try{pc.close();}catch(e){}pc=null;}
  v.srcObject=null;
}
async function connect(){
  if(connecting||stopped||!TOKEN)return;
  connecting=true;clearTimers();
  showOverlay('Đang kết nối...',false);
  if(pc){try{pc.close();}catch(e){}pc=null;}
  v.srcObject=null;
  const myId=++pcId;
  try{
    const p=new RTCPeerConnection({iceServers:[{urls:'stun:stun.l.google.com:19302'}]});
    pc=p;
    p.ontrack=e=>{if(pcId!==myId)return;v.srcObject=e.streams[0];v.play().catch(()=>{});};
    p.oniceconnectionstatechange=()=>{
      if(pcId!==myId)return;
      const s=p.iceConnectionState;
      if(s==='connected'||s==='completed')resetFrozenWatchdog();
      else if(s==='failed')scheduleReconnect();
    };
    p.onconnectionstatechange=()=>{
      if(pcId!==myId)return;
      const s=p.connectionState;
      if(s==='connected'){backoffMs=1000;hideOverlay();resetFrozenWatchdog();}
      else if(s==='failed'||s==='closed')scheduleReconnect();
    };
    p.addTransceiver('video',{direction:'recvonly'});
    const offer=await p.createOffer();
    if(pcId!==myId){p.close();return;}
    await p.setLocalDescription(offer);
    const r=await fetch(HOST+'/api/webrtc?src='+SRC,{
      method:'POST',
      headers:{'Content-Type':'application/sdp','Authorization':'Bearer '+TOKEN},
      body:offer.sdp,
      signal:AbortSignal.timeout(8000)
    });
    if(pcId!==myId){p.close();return;}
    if(!r.ok){
      if(r.status===401){
        window.ReactNativeWebView&&window.ReactNativeWebView.postMessage('token_expired');
      }
      throw new Error('HTTP '+r.status);
    }
    const sdp=await r.text();
    if(pcId!==myId){p.close();return;}
    await p.setRemoteDescription({type:'answer',sdp});
    if(pcId!==myId){p.close();return;}
    connecting=false;
    resetFrozenWatchdog();
  }catch(e){
    connecting=false;
    if(!stopped)scheduleReconnect();
  }
}
let rafPending=false;
v.addEventListener('timeupdate',()=>{
  if(rafPending)return;rafPending=true;
  requestAnimationFrame(()=>{
    rafPending=false;
    if(v.currentTime!==lastTime){
      lastTime=v.currentTime;
      if(v.currentTime>0){hideOverlay();backoffMs=1000;}
      resetFrozenWatchdog();
    }
  });
});
window.addEventListener('offline',()=>{stopAll();showOverlay('Mất kết nối mạng',true);});
window.addEventListener('online',()=>{stopped=false;backoffMs=1000;connect();});
function handleMsg(d){
  try{
    const m=typeof d==='string'?JSON.parse(d):d;
    if(m.type==='token'){TOKEN=m.value;stopped=false;backoffMs=1000;connect();return;}
  }catch(e){}
  if(d==='stop'){stopAll();showOverlay('Đang tạm dừng...',false);}
  else if(d==='start'){
    const wasStopped=stopped;
    stopped=false;backoffMs=1000;
    if(TOKEN&&wasStopped){connect();}
  }
  else if(d==='ping'){window.ReactNativeWebView&&window.ReactNativeWebView.postMessage('pong');}
  else if(d==='mute'){v.muted=true;}
  else if(d==='unmute'){v.muted=false;}
}
window.addEventListener('message',function(e){handleMsg(e.data);});
document.addEventListener('message',function(e){handleMsg(e.data);});
showOverlay('Đang kết nối...',false);
</script></body></html>`;

export const buildCameraFullscreenHTML = (src: string) => `<!DOCTYPE html>
<html><head>
<meta name="viewport" content="width=device-width,initial-scale=1.0,maximum-scale=1.0,user-scalable=no">
<style>
*{margin:0;padding:0;box-sizing:border-box}
html,body{width:100%;height:100%;background:#000;overflow:hidden;position:relative}
#container{width:100%;height:100%;overflow:hidden;position:relative;touch-action:none}
video{width:100%;height:100%;object-fit:contain;display:block;pointer-events:none;
  transform-origin:0 0;will-change:transform}
</style></head><body>
<div id="container"><video id="v" autoplay muted playsinline></video></div>
<script>
const HOST='${GO2RTC_HOST}';
const SRC='${src}_main';
let TOKEN='';
const v=document.getElementById('v');
const container=document.getElementById('container');

let scale=1,minScale=1,maxScale=5;
let tx=0,ty=0,lastTx=0,lastTy=0;
function clamp(val,min,max){return Math.min(Math.max(val,min),max);}
function clampTranslation(s,x,y){
  const W=container.clientWidth,H=container.clientHeight;
  const maxX=W*(s-1),maxY=H*(s-1);
  return [clamp(x,-maxX,0),clamp(y,-maxY,0)];
}
function applyTransform(s,x,y){
  v.style.transform='scale('+s+') translate('+(x/s)+'px,'+(y/s)+'px)';
}
function resetZoom(){scale=1;tx=0;ty=0;applyTransform(1,0,0);}

let touches=[],pinchStartDist=0,pinchStartScale=1;
let panStartX=0,panStartY=0,lastTapTime=0;
let swipeStartX=0,swipeStartY=0,swipeLastX=0,swipeLastY=0,swipeTracking=false,didPinch=false,didDoubleTap=false;
function dist(t1,t2){return Math.hypot(t2.clientX-t1.clientX,t2.clientY-t1.clientY);}
function midpoint(t1,t2){return{x:(t1.clientX+t2.clientX)/2,y:(t1.clientY+t2.clientY)/2};}

container.addEventListener('touchstart',e=>{
  e.preventDefault();touches=[...e.touches];
  if(touches.length===1){
    const now=Date.now();
    if(now-lastTapTime<300){
      didDoubleTap=true;
      swipeTracking=false;
      lastTapTime=0;
      window.ReactNativeWebView&&window.ReactNativeWebView.postMessage('close_fullscreen');
      return;
    }
    lastTapTime=now;
    swipeStartX=touches[0].clientX;swipeStartY=touches[0].clientY;
    swipeLastX=swipeStartX;swipeLastY=swipeStartY;swipeTracking=true;didPinch=false;
    panStartX=touches[0].clientX-tx;panStartY=touches[0].clientY-ty;
  }
  if(touches.length===2){
    swipeTracking=false;didPinch=true;
    pinchStartDist=dist(touches[0],touches[1]);pinchStartScale=scale;
    lastTx=tx;lastTy=ty;
  }
},{passive:false});

container.addEventListener('touchmove',e=>{
  e.preventDefault();touches=[...e.touches];
  if(touches.length===1){
    swipeLastX=touches[0].clientX;swipeLastY=touches[0].clientY;
  }
  if(touches.length===1&&scale>1){
    tx=touches[0].clientX-panStartX;ty=touches[0].clientY-panStartY;
    [tx,ty]=clampTranslation(scale,tx,ty);applyTransform(scale,tx,ty);
  }
  if(touches.length===2){
    const d=dist(touches[0],touches[1]);
    let newScale=clamp(pinchStartScale*(d/pinchStartDist),minScale,maxScale);
    const mid=midpoint(touches[0],touches[1]);
    const dScale=newScale/scale;
    tx=mid.x-(mid.x-lastTx)*dScale;ty=mid.y-(mid.y-lastTy)*dScale;
    [tx,ty]=clampTranslation(newScale,tx,ty);
    scale=newScale;lastTx=tx;lastTy=ty;applyTransform(scale,tx,ty);
  }
},{passive:false});

container.addEventListener('touchend',e=>{
  if(e.changedTouches&&e.changedTouches.length){
    swipeLastX=e.changedTouches[0].clientX;swipeLastY=e.changedTouches[0].clientY;
  }
  touches=[...e.touches];
  if(touches.length===1){panStartX=touches[0].clientX-tx;panStartY=touches[0].clientY-ty;lastTx=tx;lastTy=ty;}
  if(touches.length===0){
    if(swipeTracking&&!didPinch&&!didDoubleTap&&scale<=1.05){
      const dx=swipeLastX-swipeStartX,dy=swipeLastY-swipeStartY;
      if(Math.abs(dx)>70&&Math.abs(dx)>Math.abs(dy)*1.35){
        window.ReactNativeWebView&&window.ReactNativeWebView.postMessage(dx<0?'swipe_next':'swipe_prev');
      }
    }
    swipeTracking=false;
    didDoubleTap=false;
    if(scale<1.05){resetZoom();}
  }
},{passive:false});

let pc=null,reconnectTimer=null,frozenTimer=null;
let backoffMs=1000;const MAX_BACKOFF=10000;
let lastTime=-1,connecting=false,stopped=false,notified=false,pcId=0;

function notifyReady(){if(notified)return;notified=true;window.ReactNativeWebView.postMessage('ready');}
function clearTimers(){
  if(reconnectTimer){clearTimeout(reconnectTimer);reconnectTimer=null;}
  if(frozenTimer){clearTimeout(frozenTimer);frozenTimer=null;}
}
function scheduleReconnect(){
  if(stopped)return;clearTimers();
  reconnectTimer=setTimeout(()=>{connect();},backoffMs);
  backoffMs=Math.min(backoffMs*2,MAX_BACKOFF);
}
function resetFrozenWatchdog(){
  if(frozenTimer)clearTimeout(frozenTimer);
  frozenTimer=setTimeout(()=>{if(!stopped)scheduleReconnect();},15000);
}
function stopAll(){
  stopped=true;connecting=false;clearTimers();pcId++;
  if(pc){try{pc.close();}catch(e){}pc=null;}
  v.srcObject=null;
}
async function connect(){
  if(connecting||stopped||!TOKEN)return;
  connecting=true;clearTimers();
  if(pc){try{pc.close();}catch(e){}pc=null;}
  v.srcObject=null;
  const myId=++pcId;
  try{
    const p=new RTCPeerConnection({iceServers:[{urls:'stun:stun.l.google.com:19302'}]});
    pc=p;
    p.ontrack=e=>{if(pcId!==myId)return;v.srcObject=e.streams[0];v.play().catch(()=>{});};
    p.oniceconnectionstatechange=()=>{
      if(pcId!==myId)return;
      const s=p.iceConnectionState;
      if(s==='connected'||s==='completed')resetFrozenWatchdog();
      else if(s==='failed'||s==='disconnected')scheduleReconnect();
    };
    p.onconnectionstatechange=()=>{
      if(pcId!==myId)return;
      const s=p.connectionState;
      if(s==='connected'){backoffMs=1000;resetFrozenWatchdog();}
      else if(s==='failed'||s==='closed')scheduleReconnect();
    };
    p.addTransceiver('video',{direction:'recvonly'});
    p.addTransceiver('audio',{direction:'recvonly'});
    const offer=await p.createOffer();
    if(pcId!==myId){p.close();return;}
    await p.setLocalDescription(offer);
    const r=await fetch(HOST+'/api/webrtc?src='+SRC,{
      method:'POST',
      headers:{'Content-Type':'application/sdp','Authorization':'Bearer '+TOKEN},
      body:offer.sdp,
      signal:AbortSignal.timeout(8000)
    });
    if(pcId!==myId){p.close();return;}
    if(!r.ok){
      if(r.status===401){
        window.ReactNativeWebView&&window.ReactNativeWebView.postMessage('token_expired');
      }
      throw new Error('HTTP '+r.status);
    }
    const sdp=await r.text();
    if(pcId!==myId){p.close();return;}
    await p.setRemoteDescription({type:'answer',sdp});
    if(pcId!==myId){p.close();return;}
    connecting=false;resetFrozenWatchdog();
  }catch(e){connecting=false;if(!stopped)scheduleReconnect();}
}
let rafPending=false;
v.addEventListener('timeupdate',()=>{
  if(rafPending)return;rafPending=true;
  requestAnimationFrame(()=>{
    rafPending=false;
    if(v.currentTime!==lastTime){
      lastTime=v.currentTime;
      if(v.currentTime>0){notifyReady();backoffMs=1000;}
      resetFrozenWatchdog();
    }
  });
});
setTimeout(notifyReady,6000);
window.addEventListener('offline',()=>{stopAll();});
window.addEventListener('online',()=>{if(!stopped){stopped=false;backoffMs=1000;connect();}});
function handleMsg(d){
  try{
    const m=typeof d==='string'?JSON.parse(d):d;
    if(m.type==='token'){TOKEN=m.value;stopped=false;backoffMs=1000;connect();return;}
  }catch(e){}
  if(d==='stop'){stopAll();}
  else if(d==='start'){
    const wasStopped=stopped;
    stopped=false;backoffMs=1000;
    if(TOKEN&&wasStopped){connect();}
  }
  else if(d==='ping'){window.ReactNativeWebView&&window.ReactNativeWebView.postMessage('pong');}
  else if(d==='mute'){v.muted=true;}
  else if(d==='unmute'){v.muted=false;}
}
window.addEventListener('message',function(e){handleMsg(e.data);});
document.addEventListener('message',function(e){handleMsg(e.data);});
</script></body></html>`;
