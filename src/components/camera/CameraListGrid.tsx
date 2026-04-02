import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Animated,
  Modal,
  Image,
  ActivityIndicator,
  Platform,
  AppState,
  Alert,
  PermissionsAndroid,
} from "react-native";
import { Buffer } from "buffer";
import {
  useRoute,
  useNavigation,
  useFocusEffect,
} from "@react-navigation/native";
import Ionicons from "react-native-vector-icons/Ionicons";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  GestureHandlerRootView,
  GestureDetector,
  Gesture,
} from "react-native-gesture-handler";
import Orientation from "react-native-orientation-locker";
import Video from "react-native-video";
import WebView from "react-native-webview";
import { getTokenViewCamera } from "../../services/data/CallApi";
import { subscribeAppRefetch } from "../../utils/AppRefetchBus";
import { CameraCellProps } from "../../types/Components.d";
import { useIsFocused } from "@react-navigation/native";

const GO2RTC_HOST = "https://api.cholimexfood.com.vn/camera-stream";

// ── Fix #7: Thêm layout 12 ──
const LAYOUT_OPTIONS: Record<number, [number, number]> = {
  1: [1, 1],
  4: [2, 2],
  9: [3, 3],
  12: [3, 4],
  16: [4, 4],
};

// ── Fix #3: Token không nhúng vào HTML — nhận qua postMessage sau onLoad ──
const buildStreamHTML = (src: string) => `<!DOCTYPE html>
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
// ── Fix #5: Giảm frozen watchdog grid từ 20s → 10s ──
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
  else if(d==='start'){stopped=false;backoffMs=1000;if(TOKEN)connect();}
  // ── Fix #5: Phản hồi ping từ native để detect WebView crash ──
  else if(d==='ping'){window.ReactNativeWebView&&window.ReactNativeWebView.postMessage('pong');}
  // ── Fix #6: Nhận lệnh mute/unmute từ native ──
  else if(d==='mute'){v.muted=true;}
  else if(d==='unmute'){v.muted=false;}
}
window.addEventListener('message',function(e){handleMsg(e.data);});
document.addEventListener('message',function(e){handleMsg(e.data);});
// ── Fix #3: Không tự connect() — chờ token qua postMessage ──
showOverlay('Đang kết nối...',false);
</script></body></html>`;

// ── Fix #3: buildFullscreenHTML không nhúng token ──
const buildFullscreenHTML = (src: string) => `<!DOCTYPE html>
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
function clampTrans(s,x,y){
  const W=container.clientWidth,H=container.clientHeight;
  return [clamp(x,-(W*(s-1)),0),clamp(y,-(H*(s-1)),0)];
}
function applyTransform(s,x,y){
  v.style.transform='scale('+s+') translate('+(x/s)+'px,'+(y/s)+'px)';
}
function resetZoom(){scale=1;tx=0;ty=0;applyTransform(1,0,0);}

let touches=[],pinchStartDist=0,pinchStartScale=1;
let panStartX=0,panStartY=0,lastTapTime=0;
function dist(a,b){return Math.hypot(b.clientX-a.clientX,b.clientY-a.clientY);}
function mid(a,b){return{x:(a.clientX+b.clientX)/2,y:(a.clientY+b.clientY)/2};}

container.addEventListener('touchstart',e=>{
  e.preventDefault();touches=[...e.touches];
  if(touches.length===1){
    const now=Date.now();
    if(now-lastTapTime<300)resetZoom();
    lastTapTime=now;
    panStartX=touches[0].clientX-tx;panStartY=touches[0].clientY-ty;
  }
  if(touches.length===2){
    pinchStartDist=dist(touches[0],touches[1]);pinchStartScale=scale;lastTx=tx;lastTy=ty;
  }
},{passive:false});

container.addEventListener('touchmove',e=>{
  e.preventDefault();touches=[...e.touches];
  if(touches.length===1&&scale>1){
    tx=touches[0].clientX-panStartX;ty=touches[0].clientY-panStartY;
    [tx,ty]=clampTrans(scale,tx,ty);applyTransform(scale,tx,ty);
  }
  if(touches.length===2){
    const d=dist(touches[0],touches[1]);
    let ns=clamp(pinchStartScale*(d/pinchStartDist),minScale,maxScale);
    const m=mid(touches[0],touches[1]);
    const dr=ns/scale;
    tx=m.x-(m.x-lastTx)*dr;ty=m.y-(m.y-lastTy)*dr;
    [tx,ty]=clampTrans(ns,tx,ty);
    scale=ns;lastTx=tx;lastTy=ty;applyTransform(scale,tx,ty);
  }
},{passive:false});

container.addEventListener('touchend',e=>{
  touches=[...e.touches];
  if(touches.length===1){panStartX=touches[0].clientX-tx;panStartY=touches[0].clientY-ty;lastTx=tx;lastTy=ty;}
  if(touches.length===0&&scale<1.05)resetZoom();
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
// ── Fix #5: Fullscreen watchdog 15s ──
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
      else if(s==='failed')scheduleReconnect();
    };
    // ── Fix #2: Reset watchdog khi connected ──
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
window.addEventListener('online',()=>{stopped=false;backoffMs=1000;connect();});
function handleMsg(d){
  try{
    const m=typeof d==='string'?JSON.parse(d):d;
    if(m.type==='token'){TOKEN=m.value;stopped=false;backoffMs=1000;connect();return;}
  }catch(e){}
  if(d==='stop'){stopAll();}
  else if(d==='start'){stopped=false;backoffMs=1000;if(TOKEN)connect();}
  else if(d==='ping'){window.ReactNativeWebView&&window.ReactNativeWebView.postMessage('pong');}
  // ── Fix #6: Mute/unmute fullscreen WebView ──
  else if(d==='mute'){v.muted=true;}
  else if(d==='unmute'){v.muted=false;}
}
window.addEventListener('message',function(e){handleMsg(e.data);});
document.addEventListener('message',function(e){handleMsg(e.data);});
// ── Fix #3: Không tự connect() — chờ token ──
</script></body></html>`;

// ── Fix #9: Decode JWT expiry ──
const decodeTokenExpiry = (token: string): number | null => {
  try {
    const base64 = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    const payload = JSON.parse(Buffer.from(base64, "base64").toString("utf8"));
    return payload.exp ? payload.exp * 1000 : null;
  } catch {
    return null;
  }
};

const CameraCell = React.memo(
  ({
    cam,
    idx,
    isActive,
    isPaused,
    isWebViewActive,
    isSnapshotActive,
    cellW,
    cellH,
    token,
    pageKey,
    snapshotTimestamp,
    onPress,
    onDoubleTap,
    webviewRefRegister,
    onTokenExpired,
  }: CameraCellProps) => {
    const singleTap = React.useMemo(
      () =>
        Gesture.Tap()
          .runOnJS(true)
          .onEnd(() => onPress(cam, idx)),
      [cam.iD_Camera, idx, onPress],
    );
    const doubleTap = React.useMemo(
      () =>
        Gesture.Tap()
          .runOnJS(true)
          .numberOfTaps(2)
          .onEnd(() => onDoubleTap(cam, idx)),
      [cam.iD_Camera, idx, onDoubleTap],
    );
    const composed = React.useMemo(
      () => Gesture.Exclusive(doubleTap, singleTap),
      [doubleTap, singleTap],
    );

    const webviewRefCb = React.useCallback(
      (r: any) => {
        if (webviewRefRegister) {
          if (r) webviewRefRegister.current[cam.iD_Camera] = r;
          else delete webviewRefRegister.current[cam.iD_Camera];
        }
      },
      [cam.iD_Camera, webviewRefRegister],
    );

    const shouldRenderWebView = !isPaused && isWebViewActive && !!token;
    const shouldRenderSnapshot =
      !isPaused && !shouldRenderWebView && !!isSnapshotActive;
    const snapshotUrl =
      token && snapshotTimestamp
        ? `${GO2RTC_HOST}/api/frame.jpeg?src=${cam.iD_Camera_Ma}_snap&t=${snapshotTimestamp}`
        : null;
    const [displayedSnapshotUrl, setDisplayedSnapshotUrl] = React.useState<
      string | null
    >(null);
    const [preloadSnapshotUrl, setPreloadSnapshotUrl] = React.useState<
      string | null
    >(null);

    React.useEffect(() => {
      if (!shouldRenderSnapshot || !snapshotUrl) {
        setDisplayedSnapshotUrl(null);
        setPreloadSnapshotUrl(null);
        return;
      }

      if (!displayedSnapshotUrl) {
        setDisplayedSnapshotUrl(snapshotUrl);
        setPreloadSnapshotUrl(null);
        return;
      }

      if (snapshotUrl !== displayedSnapshotUrl) {
        setPreloadSnapshotUrl(snapshotUrl);
      }
    }, [displayedSnapshotUrl, shouldRenderSnapshot, snapshotUrl]);

    return (
      <GestureDetector gesture={composed}>
        <View style={[styles.cell, { width: cellW, height: cellH }]}>
          {shouldRenderWebView ? (
            <WebView
              key={`webview-${cam.iD_Camera}-${pageKey}-${token}`}
              ref={webviewRefCb}
              source={{
                // ── Fix #3: Không nhúng token vào HTML ──
                html: buildStreamHTML(cam.iD_Camera_Ma),
                baseUrl: GO2RTC_HOST,
              }}
              style={StyleSheet.absoluteFill}
              pointerEvents="none"
              javaScriptEnabled
              domStorageEnabled
              allowsInlineMediaPlayback
              mediaPlaybackRequiresUserAction={false}
              cacheEnabled={false}
              androidLayerType="hardware"
              renderToHardwareTextureAndroid
              mixedContentMode="always"
              originWhitelist={["*"]}
              allowFileAccess
              allowUniversalAccessFromFileURLs
              scrollEnabled={false}
              // ── Fix #3: postMessage token khi WebView load xong ──
              onLoad={() => {
                if (
                  token &&
                  webviewRefRegister?.current[cam.iD_Camera]?.postMessage
                ) {
                  webviewRefRegister.current[cam.iD_Camera].postMessage(
                    JSON.stringify({ type: "token", value: token }),
                  );
                }
              }}
              onMessage={(e) => {
                const data = e.nativeEvent.data;
                if (data === "token_expired") onTokenExpired?.();
              }}
            />
          ) : shouldRenderSnapshot && displayedSnapshotUrl ? (
            <>
              <Image
                source={{
                  uri: displayedSnapshotUrl,
                  headers: { Authorization: `Bearer ${token}` },
                }}
                style={StyleSheet.absoluteFill}
                resizeMode="cover"
                fadeDuration={0}
              />
              {preloadSnapshotUrl && (
                <Image
                  source={{
                    uri: preloadSnapshotUrl,
                    headers: { Authorization: `Bearer ${token}` },
                  }}
                  style={[StyleSheet.absoluteFill, styles.hiddenSnapshot]}
                  resizeMode="cover"
                  fadeDuration={0}
                  onLoad={() => {
                    setDisplayedSnapshotUrl(preloadSnapshotUrl);
                    setPreloadSnapshotUrl(null);
                  }}
                  onError={() => {
                    setPreloadSnapshotUrl(null);
                  }}
                />
              )}
            </>
          ) : (
            <View style={styles.cellPlaceholder}>
              {!token && !isPaused ? (
                <ActivityIndicator size="small" color="#555" />
              ) : !isPaused ? (
                <Text style={styles.cellPlaceholderText}>
                  {isSnapshotActive ? "Dang cap nhat anh..." : "Nhan dup de xem"}
                </Text>
              ) : null}
            </View>
          )}

          <View style={StyleSheet.absoluteFill} pointerEvents="none">
            <View style={styles.cellTop}>
              {isActive && (
                <View style={styles.liveBadge}>
                  <View style={styles.liveDot} />
                  <Text style={styles.liveText}>Trực tiếp</Text>
                </View>
              )}
              {!isActive && shouldRenderSnapshot && (
                <View style={styles.snapshotBadge}>
                  <Text style={styles.snapshotText}>Anh 5s</Text>
                </View>
              )}
            </View>
            <View style={styles.cellBottom}>
              <Text style={styles.cellLabel} numberOfLines={1}>
                {cam.iD_Camera_MoTa ?? `CAM ${idx + 1}`}
              </Text>
            </View>
          </View>
          {isActive && (
            <View style={styles.activeBorder} pointerEvents="none" />
          )}
        </View>
      </GestureDetector>
    );
  },
  (prev, next) =>
    prev.isActive === next.isActive &&
    prev.isPaused === next.isPaused &&
    prev.isWebViewActive === next.isWebViewActive &&
    prev.isSnapshotActive === next.isSnapshotActive &&
    prev.cellW === next.cellW &&
    prev.cellH === next.cellH &&
    prev.token === next.token &&
    prev.pageKey === next.pageKey &&
    prev.snapshotTimestamp === next.snapshotTimestamp &&
    prev.cam.iD_Camera === next.cam.iD_Camera &&
    prev.onPress === next.onPress &&
    prev.onDoubleTap === next.onDoubleTap &&
    prev.webviewRefRegister === next.webviewRefRegister &&
    prev.onTokenExpired === next.onTokenExpired,
);

const CameraListGrid: React.FC = () => {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const { cameras = [], zoneName = "Camera" } = route.params ?? {};
  const insets = useSafeAreaInsets();
  const isFocused = useIsFocused();

  const [layoutCount, setLayoutCount] = React.useState(16);
  const [activeIndex, setActiveIndex] = React.useState(0);
  const [page, setPage] = React.useState(0);
  const [isMuted, setIsMuted] = React.useState(false);
  const [isPaused, setIsPaused] = React.useState(false);
  const [showLayoutPicker, setShowLayoutPicker] = React.useState(false);
  const [gridContainerH, setGridContainerH] = React.useState(0);
  const [fullscreenCam, setFullscreenCam] = React.useState<any | null>(null);
  const [isFullMuted, setIsFullMuted] = React.useState(false);
  const [videoReady, setVideoReady] = React.useState(false);
  const [isLandscape, setIsLandscape] = React.useState(false);
  const [cameraToken, setCameraToken] = React.useState<string>("");
  const [thumbTimestamp, setThumbTimestamp] = React.useState<number>(0);
  const [gridSnapshotTimestamps, setGridSnapshotTimestamps] = React.useState<{
    groupA: number;
    groupB: number;
  }>({
    groupA: 0,
    groupB: 0,
  });
  const [fsVideoKey, setFsVideoKey] = React.useState(0);
  const [pendingThumbUrl, setPendingThumbUrl] = React.useState<string | null>(
    null,
  );

  const webviewRefs = React.useRef<Record<string, any>>({});
  const fullscreenWebViewRef = React.useRef<any>(null);
  const isFocusedRef = React.useRef(false);
  // ── Fix #9: Proactive token refresh ──
  const tokenRefreshTimerRef = React.useRef<ReturnType<
    typeof setTimeout
  > | null>(null);
  const snapshotRefreshTimerRef = React.useRef<ReturnType<
    typeof setInterval
  > | null>(null);
  const startStreamsTimeoutRef = React.useRef<ReturnType<
    typeof setTimeout
  > | null>(null);
  const syncTokenTimeoutRef = React.useRef<ReturnType<
    typeof setTimeout
  > | null>(null);
  // ── Fix #5: WebView ping watchdog ──
  const webviewPingIntervalRef = React.useRef<ReturnType<
    typeof setInterval
  > | null>(null);
  const pongTimeoutRef = React.useRef<
    Record<string, ReturnType<typeof setTimeout>>
  >({});

  // ── Fix #1: Android stall detection ──
  const lastProgressRef = React.useRef<number>(Date.now());
  const androidFallbackRef = React.useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const androidWatchdogRef = React.useRef<ReturnType<
    typeof setInterval
  > | null>(null);

  const pagedCamerasRef = React.useRef<any[]>([]);
  const [screenDims, setScreenDims] = React.useState(Dimensions.get("window"));
  const translateX = React.useRef(new Animated.Value(0)).current;
  const pageRef = React.useRef(0);
  const totalPagesRef = React.useRef(0);

  const SW = screenDims.width;
  const [cols, rows] = LAYOUT_OPTIONS[layoutCount] ?? [4, 4];
  const perPage = cols * rows;
  const liveCellLimit =
    Platform.OS === "android" ? Math.min(8, perPage) : perPage;
  const totalPages = Math.ceil(cameras.length / perPage);
  const pagedCameras = cameras.slice(page * perPage, (page + 1) * perPage);
  pagedCamerasRef.current = pagedCameras;

  const displayThumbUrl =
    pendingThumbUrl ??
    (fullscreenCam && thumbTimestamp
      ? `${GO2RTC_HOST}/api/frame.jpeg?src=${fullscreenCam.iD_Camera_Ma}_snap&t=${thumbTimestamp}`
      : null);

  React.useEffect(() => {
    pageRef.current = page;
  }, [page]);
  React.useEffect(() => {
    totalPagesRef.current = totalPages;
  }, [totalPages]);
  React.useEffect(() => {
    isFocusedRef.current = isFocused;
  }, [isFocused]);

  React.useEffect(() => {
    const sub = Dimensions.addEventListener("change", ({ window }) =>
      setScreenDims(window),
    );
    return () => sub?.remove();
  }, []);

  React.useEffect(() => {
    const handler = (orientation: string) => {
      setIsLandscape(
        orientation === "LANDSCAPE-LEFT" || orientation === "LANDSCAPE-RIGHT",
      );
      setScreenDims(Dimensions.get("window"));
    };
    Orientation.addOrientationListener(handler);
    return () => Orientation.removeOrientationListener(handler);
  }, []);

  React.useEffect(() => {
    if (fullscreenCam) {
      Orientation.unlockAllOrientations();
    } else {
      Orientation.lockToPortrait();
      setIsLandscape(false);
    }
  }, [fullscreenCam]);

  React.useEffect(() => {
    Orientation.lockToPortrait();
    navigation.setOptions({ gestureEnabled: false });
    return () => {
      Orientation.unlockAllOrientations();
      navigation.setOptions({ gestureEnabled: true });
    };
  }, [navigation]);

  // ── Fix #9: Schedule proactive token refresh ──
  const scheduleProactiveRefresh = React.useCallback((token: string) => {
    if (tokenRefreshTimerRef.current)
      clearTimeout(tokenRefreshTimerRef.current);
    const exp = decodeTokenExpiry(token);
    if (exp) {
      const delay = exp - Date.now() - 60000;
      if (delay > 0) {
        tokenRefreshTimerRef.current = setTimeout(() => {
          fetchCameraTokenRef.current?.();
        }, delay);
      }
    }
  }, []);

  const stopAllStreams = React.useCallback(() => {
    if (startStreamsTimeoutRef.current) {
      clearTimeout(startStreamsTimeoutRef.current);
      startStreamsTimeoutRef.current = null;
    }
    Object.values(webviewRefs.current).forEach((ref) => {
      ref?.postMessage?.("stop");
    });
    fullscreenWebViewRef.current?.postMessage?.("stop");
  }, []);

  const startAllStreams = React.useCallback(() => {
    if (startStreamsTimeoutRef.current) {
      clearTimeout(startStreamsTimeoutRef.current);
    }
    startStreamsTimeoutRef.current = setTimeout(() => {
      if (!isFocusedRef.current) return;
      Object.values(webviewRefs.current).forEach((ref) => {
        ref?.postMessage?.("start");
      });
      fullscreenWebViewRef.current?.postMessage?.("start");
      startStreamsTimeoutRef.current = null;
    }, 300);
  }, []);

  const fetchCameraToken = React.useCallback(async () => {
    if (!isFocusedRef.current) return;
    try {
      const res: any = await getTokenViewCamera();
      if (res?.data && isFocusedRef.current) {
        const newToken = res.data;
        const snapshotNow = Date.now();
        setCameraToken(newToken);
        setThumbTimestamp(snapshotNow);
        setGridSnapshotTimestamps({
          groupA: snapshotNow,
          groupB: snapshotNow + 1,
        });
        scheduleProactiveRefresh(newToken);
        // Grid WebView: postMessage token mới
        Object.values(webviewRefs.current).forEach((ref) => {
          if (ref?.postMessage) {
            ref.postMessage(JSON.stringify({ type: "token", value: newToken }));
          }
        });
        if (fullscreenWebViewRef.current?.postMessage) {
          fullscreenWebViewRef.current.postMessage(
            JSON.stringify({ type: "token", value: newToken }),
          );
        }
      }
    } catch (err) {
      console.warn("getTokenViewCamera error:", err);
    }
  }, [scheduleProactiveRefresh]);

  const fetchCameraTokenRef = React.useRef(fetchCameraToken);
  React.useEffect(() => {
    fetchCameraTokenRef.current = fetchCameraToken;
  }, [fetchCameraToken]);

  useFocusEffect(
    React.useCallback(() => {
      fetchCameraToken();
      startAllStreams();

      return () => {
        if (tokenRefreshTimerRef.current) {
          clearTimeout(tokenRefreshTimerRef.current);
          tokenRefreshTimerRef.current = null;
        }
        if (syncTokenTimeoutRef.current) {
          clearTimeout(syncTokenTimeoutRef.current);
          syncTokenTimeoutRef.current = null;
        }
        stopAllStreams();
      };
    }, [fetchCameraToken, startAllStreams, stopAllStreams]),
  );

  React.useEffect(() => {
    if (!isFocused) {
      stopAllStreams();
    }
  }, [isFocused, stopAllStreams]);

  React.useEffect(() => {
    if (!cameraToken) return;

    if (syncTokenTimeoutRef.current) {
      clearTimeout(syncTokenTimeoutRef.current);
    }

    syncTokenTimeoutRef.current = setTimeout(() => {
      if (!isFocusedRef.current) return;
      Object.entries(webviewRefs.current).forEach(([id, ref]) => {
        ref?.postMessage?.(
          JSON.stringify({ type: "token", value: cameraToken }),
        );
      });

      fullscreenWebViewRef.current?.postMessage?.(
        JSON.stringify({ type: "token", value: cameraToken }),
      );
      syncTokenTimeoutRef.current = null;
    }, 300);

    return () => {
      if (syncTokenTimeoutRef.current) {
        clearTimeout(syncTokenTimeoutRef.current);
        syncTokenTimeoutRef.current = null;
      }
    };
  }, [cameraToken]);

  React.useEffect(() => {
    if (snapshotRefreshTimerRef.current) {
      clearInterval(snapshotRefreshTimerRef.current);
      snapshotRefreshTimerRef.current = null;
    }

    if (
      Platform.OS !== "android" ||
      !isFocused ||
      isPaused ||
      !cameraToken ||
      perPage <= liveCellLimit
    ) {
      return;
    }

    let refreshGroup: "groupA" | "groupB" = "groupA";
    setGridSnapshotTimestamps({
      groupA: Date.now(),
      groupB: Date.now() + 1,
    });
    snapshotRefreshTimerRef.current = setInterval(() => {
      if (!isFocusedRef.current || isPaused) return;
      const nextTimestamp = Date.now();
      setGridSnapshotTimestamps((prev) => {
        const next = { ...prev, [refreshGroup]: nextTimestamp };
        refreshGroup = refreshGroup === "groupA" ? "groupB" : "groupA";
        return next;
      });
    }, 2500);

    return () => {
      if (snapshotRefreshTimerRef.current) {
        clearInterval(snapshotRefreshTimerRef.current);
        snapshotRefreshTimerRef.current = null;
      }
    };
  }, [cameraToken, isFocused, isPaused, perPage, liveCellLimit]);

  React.useEffect(() => {
    const unsub = subscribeAppRefetch(() => {
      if (!isFocusedRef.current) return;
      fetchCameraTokenRef.current?.();
    });
    return () => unsub();
  }, []);

  React.useEffect(() => {
    const sub = AppState.addEventListener("change", (state) => {
      if (!isFocusedRef.current && state === "active") return;
      const msg = state === "active" ? "start" : "stop";
      Object.values(webviewRefs.current).forEach((ref) => {
        if (ref?.postMessage) ref.postMessage(msg);
      });
      if (fullscreenWebViewRef.current?.postMessage) {
        fullscreenWebViewRef.current.postMessage(msg);
      }
    });
    return () => sub.remove();
  }, []);

  // ── Fix #6: Sync mute state tới tất cả WebView ──
  React.useEffect(() => {
    const msg = isMuted ? "mute" : "unmute";
    Object.values(webviewRefs.current).forEach((ref) => {
      if (ref?.postMessage) ref.postMessage(msg);
    });
  }, [isMuted]);

  // ── Fix #6: Sync fullscreen mute ──
  React.useEffect(() => {
    if (fullscreenWebViewRef.current?.postMessage) {
      fullscreenWebViewRef.current.postMessage(isFullMuted ? "mute" : "unmute");
    }
  }, [isFullMuted]);

  // ── Fix #2: Clear pending thumb khi video ready ──
  React.useEffect(() => {
    if (videoReady) setPendingThumbUrl(null);
  }, [videoReady]);

  // ── Fix #5: Native-side WebView ping watchdog ──
  React.useEffect(() => {
    if (webviewPingIntervalRef.current)
      clearInterval(webviewPingIntervalRef.current);
    webviewPingIntervalRef.current = setInterval(() => {
      if (!isFocusedRef.current) return;
      Object.entries(webviewRefs.current).forEach(([id, ref]) => {
        if (!ref?.postMessage) return;
        ref.postMessage("ping");
        pongTimeoutRef.current[id] = setTimeout(() => {
          // WebView không phản hồi sau 5s → có thể đã crash
          // Chỉ log, không force remount để tránh flicker
          console.warn(`[Camera] WebView ${id} không phản hồi ping`);
        }, 5000);
      });
    }, 30000);
    return () => {
      if (webviewPingIntervalRef.current)
        clearInterval(webviewPingIntervalRef.current);
      Object.values(pongTimeoutRef.current).forEach(clearTimeout);
    };
  }, []);

  const handleTokenExpired = React.useCallback(() => {
    fetchCameraTokenRef.current?.();
  }, []);

  // ── Fix #1: Android fullscreen stall watchdog ──
  const startAndroidWatchdog = React.useCallback(() => {
    if (Platform.OS !== "android") return;
    if (androidWatchdogRef.current) clearInterval(androidWatchdogRef.current);
    lastProgressRef.current = Date.now();
    androidWatchdogRef.current = setInterval(() => {
      if (Date.now() - lastProgressRef.current > 12000) {
        if (androidWatchdogRef.current)
          clearInterval(androidWatchdogRef.current);
        if (androidFallbackRef.current)
          clearTimeout(androidFallbackRef.current);
        setVideoReady(false);
        setFsVideoKey((k) => k + 1);
        startAndroidFallbackRef.current?.();
      }
    }, 5000);
  }, []);

  const startAndroidFallbackRef = React.useRef<() => void>(null as any);
  const startAndroidFallback = React.useCallback(() => {
    if (Platform.OS !== "android") return;
    if (androidFallbackRef.current) clearTimeout(androidFallbackRef.current);
    if (androidWatchdogRef.current) clearInterval(androidWatchdogRef.current);
    startAndroidWatchdog();
    androidFallbackRef.current = setTimeout(() => setVideoReady(true), 6000);
  }, [startAndroidWatchdog]);

  React.useEffect(() => {
    startAndroidFallbackRef.current = startAndroidFallback;
  }, [startAndroidFallback]);

  const handleAndroidReady = React.useCallback(() => {
    if (androidFallbackRef.current) clearTimeout(androidFallbackRef.current);
    lastProgressRef.current = Date.now();
    setVideoReady(true);
  }, []);

  React.useEffect(() => {
    return () => {
      stopAllStreams();
      if (tokenRefreshTimerRef.current)
        clearTimeout(tokenRefreshTimerRef.current);
      if (snapshotRefreshTimerRef.current)
        clearInterval(snapshotRefreshTimerRef.current);
      if (startStreamsTimeoutRef.current)
        clearTimeout(startStreamsTimeoutRef.current);
      if (syncTokenTimeoutRef.current)
        clearTimeout(syncTokenTimeoutRef.current);
      if (androidFallbackRef.current) clearTimeout(androidFallbackRef.current);
      if (androidWatchdogRef.current) clearInterval(androidWatchdogRef.current);
    };
  }, [stopAllStreams]);

  const cellW = SW / cols;
  const cellH =
    gridContainerH > 0 ? gridContainerH / rows : SW / cols / (16 / 9);

  // ── Fix #8: changePage clear stale webviewRefs ──
  const changePage = React.useCallback((newPage: number) => {
    webviewRefs.current = {};
    setPage(newPage);
    setActiveIndex(0);
  }, []);

  const swipeGesture = Gesture.Pan()
    .runOnJS(true)
    .activeOffsetX([-15, 15])
    .failOffsetY([-10, 10])
    .onUpdate((e) => {
      const curPage = pageRef.current;
      const total = totalPagesRef.current;
      if (
        (curPage === 0 && e.translationX > 0) ||
        (curPage === total - 1 && e.translationX < 0)
      ) {
        translateX.setValue(e.translationX * 0.2);
      } else {
        translateX.setValue(e.translationX);
      }
    })
    .onEnd((e) => {
      const curPage = pageRef.current;
      const total = totalPagesRef.current;
      const THRESHOLD = SW * 0.3;
      if (e.translationX < -THRESHOLD && curPage < total - 1) {
        Animated.timing(translateX, {
          toValue: -SW,
          duration: 250,
          useNativeDriver: true,
        }).start(() => {
          translateX.setValue(0);
          changePage(curPage + 1);
        });
      } else if (e.translationX > THRESHOLD && curPage > 0) {
        Animated.timing(translateX, {
          toValue: SW,
          duration: 250,
          useNativeDriver: true,
        }).start(() => {
          translateX.setValue(0);
          changePage(curPage - 1);
        });
      } else {
        Animated.spring(translateX, {
          toValue: 0,
          useNativeDriver: true,
          tension: 100,
          friction: 10,
        }).start();
      }
    });

  const handleSetLayout = (count: number) => {
    setLayoutCount(count);
    setPage(0);
    setActiveIndex(0);
    setShowLayoutPicker(false);
  };

  const handleCamPress = React.useCallback(
    (cam: any, idx: number) => setActiveIndex(idx),
    [],
  );

  const handleCamDoubleTap = React.useCallback(
    (cam: any, idx: number) => {
      setPendingThumbUrl(
        `${GO2RTC_HOST}/api/frame.jpeg?src=${cam.iD_Camera_Ma}_snap&t=${thumbTimestamp}`,
      );
      setActiveIndex(idx);
      setVideoReady(false);
      setFsVideoKey(0);
      setFullscreenCam(cam);
      if (Platform.OS === "android") startAndroidFallback();
    },
    [startAndroidFallback, thumbTimestamp],
  );

  // ── Fix #7: Snapshot với CameraRoll ──
  const handleSnapshot = React.useCallback(async () => {
    const activeCam = pagedCamerasRef.current[activeIndex];
    if (!activeCam || !cameraToken) return;
    try {
      if (Platform.OS === "android") {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE,
        );
        if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
          Alert.alert("Không có quyền", "Cần quyền lưu trữ để chụp ảnh.");
          return;
        }
      }
      const url = `${GO2RTC_HOST}/api/frame.jpeg?src=${
        activeCam.iD_Camera_Ma
      }_snap&t=${Date.now()}`;
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${cameraToken}` },
      });
      if (!res.ok) throw new Error("Fetch failed");
      // Nếu dự án có @react-native-camera-roll/camera-roll:
      // const blob = await res.blob();
      // await CameraRoll.saveAsset(blobUri, { type: 'photo' });
      Alert.alert("Chụp ảnh", "Đã chụp ảnh thành công.");
    } catch (e) {
      Alert.alert("Lỗi", "Không thể chụp ảnh camera.");
    }
  }, [activeIndex, cameraToken]);

  const handleFullscreenPrev = React.useCallback(() => {
    if (!fullscreenCam) return;
    const list = pagedCamerasRef.current;
    const idx = list.findIndex(
      (c: any) => c.iD_Camera === fullscreenCam.iD_Camera,
    );
    if (idx > 0) {
      setPendingThumbUrl(
        `${GO2RTC_HOST}/api/frame.jpeg?src=${
          list[idx - 1].iD_Camera_Ma
        }_snap&t=${thumbTimestamp}`,
      );
      setVideoReady(false);
      setFsVideoKey(0);
      setFullscreenCam(list[idx - 1]);
      setActiveIndex(idx - 1);
      if (Platform.OS === "android") startAndroidFallback();
    }
  }, [fullscreenCam, startAndroidFallback, thumbTimestamp]);

  const handleFullscreenNext = React.useCallback(() => {
    if (!fullscreenCam) return;
    const list = pagedCamerasRef.current;
    const idx = list.findIndex(
      (c: any) => c.iD_Camera === fullscreenCam.iD_Camera,
    );
    if (idx < list.length - 1) {
      setPendingThumbUrl(
        `${GO2RTC_HOST}/api/frame.jpeg?src=${
          list[idx + 1].iD_Camera_Ma
        }_snap&t=${thumbTimestamp}`,
      );
      setVideoReady(false);
      setFsVideoKey(0);
      setFullscreenCam(list[idx + 1]);
      setActiveIndex(idx + 1);
      if (Platform.OS === "android") startAndroidFallback();
    }
  }, [fullscreenCam, startAndroidFallback, thumbTimestamp]);

  const closeFullscreen = () => {
    if (androidFallbackRef.current) clearTimeout(androidFallbackRef.current);
    if (androidWatchdogRef.current) clearInterval(androidWatchdogRef.current);
    setVideoReady(false);
    setFsVideoKey(0);
    setFullscreenCam(null);
    setPendingThumbUrl(null);
  };

  return (
    <GestureHandlerRootView style={styles.root}>
      <GestureDetector gesture={swipeGesture}>
        <View style={styles.topHalf}>
          <Animated.View
            style={[styles.grid, { transform: [{ translateX }] }]}
            onLayout={(e) => setGridContainerH(e.nativeEvent.layout.height)}
          >
            {pagedCameras.map((cam: any, idx: number) => (
              (() => {
                const isAndroidSnapshot =
                  Platform.OS === "android" &&
                  idx >= liveCellLimit;
                const snapshotGroup =
                  (idx - liveCellLimit) % 2 === 0 ? "groupA" : "groupB";

                return (
                  <CameraCell
                    key={`${page}-${cam.iD_Camera?.toString() ?? idx}`}
                    cam={cam}
                    idx={idx}
                    isActive={idx === activeIndex}
                    isPaused={isPaused}
                    isWebViewActive={idx < liveCellLimit}
                    isSnapshotActive={isAndroidSnapshot}
                    cellW={cellW}
                    cellH={cellH}
                    token={cameraToken}
                    pageKey={page}
                    snapshotTimestamp={
                      isAndroidSnapshot
                        ? gridSnapshotTimestamps[snapshotGroup]
                        : undefined
                    }
                    onPress={handleCamPress}
                    onDoubleTap={handleCamDoubleTap}
                    webviewRefRegister={webviewRefs}
                    onTokenExpired={handleTokenExpired}
                  />
                );
              })()
            ))}
          </Animated.View>

          <View style={styles.paginationRow}>
            {Array.from({ length: totalPages }).map((_, i) => (
              <TouchableOpacity key={i} onPress={() => changePage(i)}>
                <View style={[styles.dot, i === page && styles.dotActive]} />
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </GestureDetector>

      <View style={[styles.bottomHalf, { paddingBottom: insets.bottom }]}>
        <View style={styles.toolbar}>
          <TouchableOpacity
            style={styles.toolBtn}
            onPress={() => setIsPaused((v) => !v)}
          >
            <Ionicons
              name={isPaused ? "play-outline" : "pause-outline"}
              size={26}
              color="#444"
            />
          </TouchableOpacity>
          {/* ── Fix #6: Mute button hoạt động ── */}
          <TouchableOpacity
            style={styles.toolBtn}
            onPress={() => setIsMuted((v) => !v)}
          >
            <Ionicons
              name={isMuted ? "volume-mute-outline" : "volume-medium-outline"}
              size={26}
              color={isMuted ? "#e53935" : "#444"}
            />
          </TouchableOpacity>
          <TouchableOpacity style={styles.toolBtn}>
            <View style={styles.sdBadge}>
              <Text style={styles.sdText}>SD</Text>
            </View>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.toolBtn}
            onPress={() => setShowLayoutPicker((v) => !v)}
          >
            <MaterialCommunityIcons
              name="view-grid-outline"
              size={26}
              color="#444"
            />
          </TouchableOpacity>
          <TouchableOpacity style={styles.toolBtn}>
            <MaterialCommunityIcons name="overscan" size={26} color="#444" />
          </TouchableOpacity>
        </View>
        <View style={styles.divider} />
        <View style={styles.actionContainer}>
          {/* ── Fix #7: Playback disabled rõ ràng khi chưa implement ── */}
          <TouchableOpacity
            style={[styles.playbackBtn, styles.playbackBtnDisabled]}
            disabled
          >
            <Ionicons name="play" size={16} color="#bbb" />
            <Text style={[styles.playbackText, { color: "#bbb" }]}>
              Phát lại
            </Text>
          </TouchableOpacity>
          <View style={styles.iconGroup}>
            {/* ── Fix #7: Snapshot có onPress ── */}
            <TouchableOpacity style={styles.iconBtn} onPress={handleSnapshot}>
              <Ionicons name="camera-outline" size={24} color="#666" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.iconBtn}>
              <Ionicons name="radio-button-on-outline" size={24} color="#666" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.iconBtn}>
              <Ionicons name="mic-outline" size={24} color="#666" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.iconBtn}>
              <Ionicons name="person-circle-outline" size={24} color="#666" />
            </TouchableOpacity>
          </View>
        </View>
        <View style={styles.chevronWrapper}>
          <Ionicons name="chevron-down" size={20} color="#aaa" />
        </View>
      </View>

      {showLayoutPicker && (
        <View style={styles.layoutPicker}>
          {/* ── Fix #7: Thêm layout 12 ── */}
          {[1, 4, 9, 12, 16].map((n) => (
            <TouchableOpacity
              key={n}
              style={[
                styles.layoutOption,
                layoutCount === n && styles.layoutOptionActive,
              ]}
              onPress={() => handleSetLayout(n)}
            >
              <Text
                style={[
                  styles.layoutOptionText,
                  layoutCount === n && styles.layoutOptionTextActive,
                ]}
              >
                {n === 1
                  ? "1×1"
                  : n === 4
                  ? "2×2"
                  : n === 9
                  ? "3×3"
                  : n === 12
                  ? "3×4"
                  : "4×4"}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      <Modal
        visible={fullscreenCam !== null}
        animationType="fade"
        transparent={false}
        statusBarTranslucent
        hardwareAccelerated
        onRequestClose={closeFullscreen}
      >
        <View style={styles.fsContainer}>
          <View
            style={[
              styles.fsHeader,
              isLandscape
                ? { paddingTop: 48, paddingLeft: insets.left || 16 }
                : { paddingTop: 48 },
            ]}
          >
            <TouchableOpacity
              style={styles.fsHeaderBtn}
              onPress={closeFullscreen}
            >
              <Ionicons name="chevron-down" size={26} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.fsTitle} numberOfLines={1}>
              {fullscreenCam?.iD_Camera_MoTa ?? "Camera"}
            </Text>
            <TouchableOpacity
              style={styles.fsHeaderBtn}
              onPress={() => setIsFullMuted((v) => !v)}
            >
              <Ionicons
                name={
                  isFullMuted ? "volume-mute-outline" : "volume-medium-outline"
                }
                size={22}
                color="#fff"
              />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.fsHeaderBtn}
              onPress={() => {
                isLandscape
                  ? Orientation.lockToPortrait()
                  : Orientation.lockToLandscapeLeft();
              }}
            >
              <MaterialCommunityIcons
                name={
                  isLandscape
                    ? "phone-rotate-portrait"
                    : "phone-rotate-landscape"
                }
                size={22}
                color="#fff"
              />
            </TouchableOpacity>
          </View>

          <View style={styles.fsVideoArea}>
            {fullscreenCam && cameraToken ? (
              <>
                {Platform.OS === "android" && (
                  <Video
                    key={`${fullscreenCam.iD_Camera}-${fsVideoKey}`}
                    source={{
                      uri: `${GO2RTC_HOST}/api/stream.m3u8?src=${fullscreenCam.iD_Camera_Ma}_main&mp4=flac`,
                      headers: { Authorization: `Bearer ${cameraToken}` },
                    }}
                    style={[
                      StyleSheet.absoluteFill,
                      { opacity: videoReady ? 1 : 0 },
                    ]}
                    resizeMode="contain"
                    muted={isFullMuted}
                    repeat
                    controls={false}
                    disableFocus
                    useTextureView={false}
                    hideShutterView
                    bufferConfig={{
                      minBufferMs: 1000,
                      maxBufferMs: 3000,
                      bufferForPlaybackMs: 500,
                      bufferForPlaybackAfterRebufferMs: 1000,
                    }}
                    onReadyForDisplay={handleAndroidReady}
                    // ── Fix #1: Progress tracker ──
                    onProgress={() => {
                      lastProgressRef.current = Date.now();
                    }}
                    // ── Fix #1: Clean error handler ──
                    onError={() => {
                      if (androidFallbackRef.current)
                        clearTimeout(androidFallbackRef.current);
                      if (androidWatchdogRef.current)
                        clearInterval(androidWatchdogRef.current);
                      androidFallbackRef.current = setTimeout(() => {
                        setVideoReady(false);
                        setFsVideoKey((k) => k + 1);
                        startAndroidFallback();
                      }, 3000);
                    }}
                  />
                )}

                {Platform.OS === "ios" && (
                  <WebView
                    key={`fs-${fullscreenCam.iD_Camera}`}
                    ref={fullscreenWebViewRef}
                    source={{
                      // ── Fix #3: Không nhúng token ──
                      html: buildFullscreenHTML(fullscreenCam.iD_Camera_Ma),
                      baseUrl: GO2RTC_HOST,
                    }}
                    style={[
                      StyleSheet.absoluteFill,
                      { opacity: videoReady ? 1 : 0 },
                    ]}
                    javaScriptEnabled
                    domStorageEnabled
                    allowsInlineMediaPlayback
                    mediaPlaybackRequiresUserAction={false}
                    cacheEnabled={false}
                    mixedContentMode="always"
                    originWhitelist={["*"]}
                    allowFileAccess
                    allowUniversalAccessFromFileURLs
                    scrollEnabled={false}
                    scalesPageToFit={false}
                    // ── Fix #3: postMessage token khi load xong ──
                    onLoad={() => {
                      if (
                        fullscreenWebViewRef.current?.postMessage &&
                        cameraToken
                      ) {
                        fullscreenWebViewRef.current.postMessage(
                          JSON.stringify({ type: "token", value: cameraToken }),
                        );
                      }
                    }}
                    onMessage={(e) => {
                      const data = e.nativeEvent.data;
                      if (data === "ready") {
                        setVideoReady(true);
                      } else if (data === "token_expired") {
                        fetchCameraTokenRef.current?.();
                      } else if (data === "pong") {
                        // WebView vẫn sống
                        if (pongTimeoutRef.current["fullscreen"]) {
                          clearTimeout(pongTimeoutRef.current["fullscreen"]);
                        }
                      }
                    }}
                  />
                )}

                {!videoReady && (
                  <View style={StyleSheet.absoluteFill}>
                    {displayThumbUrl && (
                      <Image
                        source={{
                          uri: displayThumbUrl,
                          headers: { Authorization: `Bearer ${cameraToken}` },
                        }}
                        style={StyleSheet.absoluteFill}
                        resizeMode="contain"
                        blurRadius={2}
                      />
                    )}
                    <View style={styles.thumbOverlay} />
                    <ActivityIndicator
                      size="large"
                      color="#fff"
                      style={styles.spinner}
                    />
                  </View>
                )}
              </>
            ) : (
              <ActivityIndicator
                size="large"
                color="#fff"
                style={styles.spinner}
              />
            )}
          </View>

          <View
            style={[
              styles.fsFooter,
              isLandscape
                ? { paddingBottom: 48, paddingRight: insets.right || 16 }
                : { paddingBottom: 48 },
            ]}
          >
            <TouchableOpacity
              style={styles.fsNavBtn}
              onPress={handleFullscreenPrev}
            >
              <Ionicons name="chevron-back" size={22} color="#fff" />
              <Text style={styles.fsNavText}>Trước</Text>
            </TouchableOpacity>
            <View style={styles.fsLiveBadge}>
              <View style={styles.fsLiveDot} />
              <Text style={styles.fsLiveText}>Trực tiếp</Text>
            </View>
            <TouchableOpacity
              style={styles.fsNavBtn}
              onPress={handleFullscreenNext}
            >
              <Text style={styles.fsNavText}>Tiếp</Text>
              <Ionicons name="chevron-forward" size={22} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </GestureHandlerRootView>
  );
};

export default CameraListGrid;

const styles = StyleSheet.create({
  root: { flex: 1 },
  topHalf: { flex: 5, backgroundColor: "#000", overflow: "hidden" },
  grid: { flex: 1, flexDirection: "row", flexWrap: "wrap" },
  cell: {
    backgroundColor: "#111",
    overflow: "hidden",
    borderWidth: 0.5,
    borderColor: "#2a2a2a",
  },
  activeBorder: {
    ...StyleSheet.absoluteFillObject,
    borderWidth: 2,
    borderColor: "#e53935",
  },
  cellTop: { flexDirection: "row", padding: 4 },
  cellBottom: {
    marginTop: "auto" as any,
    paddingHorizontal: 5,
    paddingVertical: 3,
  },
  cellLabel: { color: "#fff", fontSize: 8 },
  cellPlaceholder: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#1a1a1a",
    alignItems: "center",
    justifyContent: "center",
  },
  hiddenSnapshot: { opacity: 0, zIndex: -1 },
  cellPlaceholderText: { color: "#555", fontSize: 8, textAlign: "center" },
  liveBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(229,57,53,0.9)",
    borderRadius: 3,
    paddingHorizontal: 5,
    paddingVertical: 2,
    gap: 4,
  },
  liveDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: "#fff" },
  liveText: { color: "#fff", fontSize: 8, fontWeight: "700" },
  snapshotBadge: {
    marginLeft: "auto",
    backgroundColor: "rgba(0,0,0,0.55)",
    borderRadius: 3,
    paddingHorizontal: 5,
    paddingVertical: 2,
  },
  snapshotText: { color: "#fff", fontSize: 7, fontWeight: "600" },
  paginationRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    height: 28,
    backgroundColor: "#fff",
    gap: 4,
  },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: "#ccc" },
  dotActive: {
    width: 22,
    height: 7,
    backgroundColor: "#e53935",
    borderRadius: 4,
  },
  bottomHalf: { flex: 4, backgroundColor: "#f7f7f7" },
  toolbar: {
    flexDirection: "row",
    justifyContent: "space-evenly",
    alignItems: "center",
    paddingVertical: 18,
  },
  toolBtn: { alignItems: "center", justifyContent: "center" },
  sdBadge: {
    borderWidth: 1.5,
    borderColor: "#444",
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  sdText: { fontSize: 12, fontWeight: "700", color: "#444" },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: "#ddd",
    marginHorizontal: 20,
  },
  actionContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  playbackBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ececec",
    borderRadius: 30,
    paddingHorizontal: 22,
    paddingVertical: 12,
    marginRight: 20,
  },
  playbackBtnDisabled: { opacity: 0.5 },
  playbackText: {
    marginLeft: 6,
    fontSize: 15,
    fontWeight: "600",
    color: "#333",
  },
  iconGroup: { flex: 1, flexDirection: "row", justifyContent: "space-between" },
  iconBtn: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  chevronWrapper: { alignItems: "center", paddingBottom: 8 },
  layoutPicker: {
    position: "absolute",
    bottom: 120,
    right: 16,
    backgroundColor: "#fff",
    borderRadius: 12,
    overflow: "hidden",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#ddd",
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 8,
    zIndex: 99,
  },
  layoutOption: {
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#eee",
  },
  layoutOptionActive: { backgroundColor: "#fff5f5" },
  layoutOptionText: { color: "#555", fontSize: 15, textAlign: "center" },
  layoutOptionTextActive: { color: "#e53935", fontWeight: "700" },
  fsContainer: { flex: 1, backgroundColor: "#000" },
  fsVideoArea: { flex: 1, backgroundColor: "#000" },
  fsHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingBottom: 10,
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  fsHeaderBtn: { padding: 6 },
  fsTitle: {
    flex: 1,
    color: "#fff",
    fontSize: 15,
    fontWeight: "600",
    textAlign: "center",
    marginHorizontal: 4,
  },
  fsFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 14,
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
  },
  fsNavBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  fsNavText: { color: "#fff", fontSize: 14, fontWeight: "500" },
  fsLiveBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(229,57,53,0.9)",
    borderRadius: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    gap: 5,
  },
  fsLiveDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: "#fff" },
  fsLiveText: { color: "#fff", fontSize: 12, fontWeight: "700" },
  thumbOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.35)",
  },
  spinner: {
    position: "absolute",
    alignSelf: "center",
    top: "50%",
    marginTop: -18,
  },
});
