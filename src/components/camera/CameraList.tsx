import React from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ListRenderItemInfo,
  Modal,
  Dimensions,
  Image,
  ActivityIndicator,
  Platform,
  AppState,
  Animated,
} from "react-native";
import { Buffer } from "buffer";
import {
  useRoute,
  useNavigation,
  useFocusEffect,
  useIsFocused,
} from "@react-navigation/native";
import Ionicons from "react-native-vector-icons/Ionicons";
import MaterialIcons from "react-native-vector-icons/MaterialIcons";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { TouchableWithoutFeedback } from "react-native";
import Video from "react-native-video";
import WebView from "react-native-webview";
import { getTokenViewCamera } from "../../services/data/CallApi";
import { subscribeAppRefetch } from "../../utils/AppRefetchBus";
import Orientation from "react-native-orientation-locker";
import {
  GestureHandlerRootView,
  GestureDetector,
  Gesture,
} from "react-native-gesture-handler";

const GO2RTC_HOST = "https://api.cholimexfood.com.vn/camera-stream";

// Ngưỡng: nếu token còn hơn 2 phút thì không fetch lại
const TOKEN_REFRESH_THRESHOLD_MS = 2 * 60 * 1000;

// ── Fullscreen HTML cho iOS ──
// FIX: Bỏ visibilitychange listener — không tự stopAll() khi kéo tác vụ
// Chỉ nhận lệnh stop/start từ RN (AppState), tránh ngắt stream khi inactive
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
let swipeStartX=0,swipeStartY=0,swipeLastX=0,swipeLastY=0,swipeTracking=false,didPinch=false;
function dist(t1,t2){return Math.hypot(t2.clientX-t1.clientX,t2.clientY-t1.clientY);}
function midpoint(t1,t2){return{x:(t1.clientX+t2.clientX)/2,y:(t1.clientY+t2.clientY)/2};}

container.addEventListener('touchstart',e=>{
  e.preventDefault();touches=[...e.touches];
  if(touches.length===1){
    const now=Date.now();
    if(now-lastTapTime<300){resetZoom();}
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
    if(swipeTracking&&!didPinch&&scale<=1.05){
      const dx=swipeLastX-swipeStartX,dy=swipeLastY-swipeStartY;
      if(Math.abs(dx)>70&&Math.abs(dx)>Math.abs(dy)*1.35){
        window.ReactNativeWebView&&window.ReactNativeWebView.postMessage(dx<0?'swipe_next':'swipe_prev');
      }
    }
    swipeTracking=false;
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
// FIX: Bỏ visibilitychange — không tự stop khi kéo tác vụ (inactive)
// Chỉ xử lý mất mạng thật sự
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
}
window.addEventListener('message',function(e){handleMsg(e.data);});
document.addEventListener('message',function(e){handleMsg(e.data);});
</script></body></html>`;

// ── Decode JWT expiry ──
const decodeTokenExpiry = (token: string): number | null => {
  try {
    const base64 = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    const payload = JSON.parse(Buffer.from(base64, "base64").toString("utf8"));
    return payload.exp ? payload.exp * 1000 : null;
  } catch {
    return null;
  }
};

// ── Kiểm tra token còn hạn đủ dùng không ──
const isTokenStillValid = (token: string): boolean => {
  if (!token) return false;
  const exp = decodeTokenExpiry(token);
  if (!exp) return false;
  return exp - Date.now() > TOKEN_REFRESH_THRESHOLD_MS;
};

const CameraThumbnail = React.memo(
  ({
    cameraId,
    cameraCode,
    cameraToken,
    thumbTimestamp,
    focusKey,
  }: {
    cameraId: string | number;
    cameraCode: string;
    cameraToken: string;
    thumbTimestamp: number;
    focusKey: number;
  }) => {
    const [retryCount, setRetryCount] = React.useState(0);
    const [isLoaded, setIsLoaded] = React.useState(false);

    React.useEffect(() => {
      setRetryCount(0);
      setIsLoaded(false);
    }, [cameraId, cameraToken, thumbTimestamp, focusKey]);

    const frameUrl = `${GO2RTC_HOST}/api/frame.jpeg?src=${cameraCode}_snap&t=${thumbTimestamp}&rk=${focusKey}&rt=${retryCount}`;

    return (
      <View style={styles.preview}>
        {!isLoaded && (
          <View style={styles.previewLoading}>
            <ActivityIndicator size="small" color="#555" />
          </View>
        )}
        <Image
          key={`thumb-${cameraId}-${focusKey}-${retryCount}`}
          source={{
            uri: frameUrl,
            headers: { Authorization: `Bearer ${cameraToken}` },
          }}
          style={styles.preview}
          resizeMode="cover"
          onLoadStart={() => setIsLoaded(false)}
          onLoadEnd={() => setIsLoaded(true)}
          onError={() => {
            setIsLoaded(false);
            if (retryCount >= 3) return;
            setTimeout(() => {
              setRetryCount((prev) => prev + 1);
            }, 500 * (retryCount + 1));
          }}
        />
      </View>
    );
  },
);

const CameraList: React.FC = () => {
  const route = useRoute<any>();
  const { cameras, zoneName } = route.params;
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const isFocused = useIsFocused();

  const [screenWidth, setScreenWidth] = React.useState(
    Dimensions.get("window").width,
  );
  const [layoutCount, setLayoutCount] = React.useState<number>(4);
  const [showLayoutModal, setShowLayoutModal] = React.useState(false);
  const [fullscreenCamera, setFullscreenCamera] = React.useState<any | null>(
    null,
  );
  const [page, setPage] = React.useState(0);
  const [isFullMuted, setIsFullMuted] = React.useState(false);
  const [isLandscape, setIsLandscape] = React.useState(false);
  const [videoReady, setVideoReady] = React.useState(false);
  const [cameraToken, setCameraToken] = React.useState<string>("");
  const [thumbTimestamp, setThumbTimestamp] = React.useState<number>(0);
  const [focusKey, setFocusKey] = React.useState(0);
  const [pendingThumbUrl, setPendingThumbUrl] = React.useState<string | null>(
    null,
  );
  const translateX = React.useRef(new Animated.Value(0)).current;
  const fsTranslateX = React.useRef(new Animated.Value(0)).current;

  const fullscreenWebViewRef = React.useRef<any>(null);
  const isFirstFocusRef = React.useRef(true);
  const isFocusedRef = React.useRef(false);
  const pageRef = React.useRef(0);
  const totalPagesRef = React.useRef(0);
  const tokenRefreshTimerRef = React.useRef<ReturnType<
    typeof setTimeout
  > | null>(null);
  const tokenRequestRef = React.useRef<Promise<string | null> | null>(null);

  // Ref luôn giữ token mới nhất, tránh stale closure
  const cameraTokenRef = React.useRef<string>("");
  React.useEffect(() => {
    cameraTokenRef.current = cameraToken;
  }, [cameraToken]);

  // Android stall detection
  const lastProgressRef = React.useRef<number>(Date.now());
  const androidWatchdogRef = React.useRef<ReturnType<
    typeof setInterval
  > | null>(null);
  const androidFallbackRef = React.useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const androidReconnectRef = React.useRef<ReturnType<
    typeof setTimeout
  > | null>(null);
  const [androidVideoKey, setAndroidVideoKey] = React.useState(0);

  const clearAndroidTimers = React.useCallback(() => {
    if (androidFallbackRef.current) clearTimeout(androidFallbackRef.current);
    if (androidReconnectRef.current) clearTimeout(androidReconnectRef.current);
    if (androidWatchdogRef.current) clearInterval(androidWatchdogRef.current);
    androidFallbackRef.current = null;
    androidReconnectRef.current = null;
    androidWatchdogRef.current = null;
  }, []);

  // Proactive token refresh — lên lịch refresh trước khi token hết hạn 60s
  const scheduleProactiveRefresh = React.useCallback((token: string) => {
    if (tokenRefreshTimerRef.current)
      clearTimeout(tokenRefreshTimerRef.current);
    const exp = decodeTokenExpiry(token);
    if (exp) {
      const delay = exp - Date.now() - 60000;
      if (delay > 0) {
        tokenRefreshTimerRef.current = setTimeout(() => {
          fetchCameraTokenRef.current?.(false);
        }, delay);
      }
    }
  }, []);

  /**
   * fetchCameraToken:
   * - force = false: kiểm tra token còn hạn → bỏ qua nếu còn dùng được
   *   → thumbnail KHÔNG reload khi chuyển app ngắn / kéo tác vụ
   * - force = true: bỏ qua kiểm tra (token_expired / AppRefetch)
   */
  const fetchCameraToken = React.useCallback(
    async (force = false) => {
      if (!isFocusedRef.current) return;
      if (!force && isTokenStillValid(cameraTokenRef.current)) {
        scheduleProactiveRefresh(cameraTokenRef.current);
        return;
      }

      if (tokenRequestRef.current) {
        await tokenRequestRef.current;
        return;
      }

      try {
        tokenRequestRef.current = (async () => {
          const res: any = await getTokenViewCamera();
          const newToken = res?.data ?? null;

          if (newToken && isFocusedRef.current) {
            setCameraToken(newToken);
            setThumbTimestamp(Date.now());
            scheduleProactiveRefresh(newToken);
            if (fullscreenWebViewRef.current?.postMessage) {
              fullscreenWebViewRef.current.postMessage(
                JSON.stringify({ type: "token", value: newToken }),
              );
            }
          }

          return newToken;
        })();
        await tokenRequestRef.current;
      } catch (err) {
        console.warn("getTokenViewCamera error:", err);
      } finally {
        tokenRequestRef.current = null;
      }
    },
    [scheduleProactiveRefresh],
  );

  const fetchCameraTokenRef = React.useRef(fetchCameraToken);
  React.useEffect(() => {
    fetchCameraTokenRef.current = fetchCameraToken;
  }, [fetchCameraToken]);

  React.useEffect(() => {
    isFocusedRef.current = isFocused;
  }, [isFocused]);

  // Orientation listener
  React.useEffect(() => {
    const handler = (orientation: string) => {
      setIsLandscape(
        orientation === "LANDSCAPE-LEFT" || orientation === "LANDSCAPE-RIGHT",
      );
    };
    Orientation.addOrientationListener(handler);
    return () => Orientation.removeOrientationListener(handler);
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      setFocusKey((k) => k + 1);
      if (isFirstFocusRef.current) {
        isFirstFocusRef.current = false;
        setCameraToken("");
        cameraTokenRef.current = "";
        setThumbTimestamp(0);
      }
      fetchCameraTokenRef.current?.(true);
      return () => {
        if (tokenRefreshTimerRef.current)
          clearTimeout(tokenRefreshTimerRef.current);
      };
    }, []),
  );

  // AppRefetch bus
  React.useEffect(() => {
    const unsub = subscribeAppRefetch(() =>
      fetchCameraTokenRef.current?.(true),
    );
    return () => unsub();
  }, []);

  // FIX: AppState — chỉ stop khi background thật sự, bỏ qua inactive
  // inactive = kéo thanh tác vụ, notification → không cần ngắt stream
  // background = chuyển sang app khác thật sự → mới stop
  React.useEffect(() => {
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        if (isFocusedRef.current) {
          setFocusKey((k) => k + 1);
          fetchCameraTokenRef.current?.(true);
          if (fullscreenWebViewRef.current?.postMessage) {
            fullscreenWebViewRef.current.postMessage("start");
          }
        }
      } else if (state === "background") {
        // Chỉ stop khi vào background thật sự
        if (fullscreenWebViewRef.current?.postMessage) {
          fullscreenWebViewRef.current.postMessage("stop");
        }
      }
      // "inactive" → bỏ qua, giữ stream sống khi kéo tác vụ
    });
    return () => sub.remove();
  }, []);

  React.useEffect(() => {
    if (!isFocused) return;
    setFocusKey((k) => k + 1);
  }, [isFocused]);

  React.useEffect(() => {
    if (videoReady) setPendingThumbUrl(null);
  }, [videoReady]);

  React.useEffect(() => {
    pageRef.current = page;
  }, [page]);

  React.useEffect(() => {
    return () => {
      Orientation.lockToPortrait();
      clearAndroidTimers();
    };
  }, [clearAndroidTimers]);

  React.useEffect(() => {
    const sub = Dimensions.addEventListener("change", ({ window }) => {
      setScreenWidth(window.width);
    });
    return () => sub.remove();
  }, []);

  const closeFullscreen = () => {
    if (Platform.OS === "ios") {
      Orientation.unlockAllOrientations();
      setTimeout(() => Orientation.lockToPortrait(), 0);
    } else {
      Orientation.lockToPortrait();
    }
    clearAndroidTimers();
    setVideoReady(false);
    fsTranslateX.setValue(0);
    setFullscreenCamera(null);
    setPendingThumbUrl(null);
    setIsLandscape(false);
  };

  const toggleOrientation = React.useCallback(() => {
    if (isLandscape) {
      setIsLandscape(false);
      if (Platform.OS === "ios") {
        Orientation.unlockAllOrientations();
        setTimeout(() => Orientation.lockToPortrait(), 0);
      } else {
        Orientation.lockToPortrait();
      }
    } else {
      setIsLandscape(true);
      Orientation.lockToLandscapeLeft();
    }
  }, [isLandscape]);

  const handleAndroidReady = () => {
    clearAndroidTimers();
    lastProgressRef.current = Date.now();
    setVideoReady(true);
  };

  const startAndroidWatchdog = React.useCallback(() => {
    if (Platform.OS !== "android") return;
    if (androidWatchdogRef.current) clearInterval(androidWatchdogRef.current);
    lastProgressRef.current = Date.now();
    androidWatchdogRef.current = setInterval(() => {
      if (Date.now() - lastProgressRef.current > 12000) {
        clearAndroidTimers();
        setVideoReady(false);
        setAndroidVideoKey((k) => k + 1);
        startAndroidFallbackRef.current?.();
      }
    }, 5000);
  }, [clearAndroidTimers]);

  const startAndroidFallbackRef = React.useRef<() => void>(null as any);
  const startAndroidFallback = React.useCallback(() => {
    if (Platform.OS !== "android") return;
    clearAndroidTimers();
    startAndroidWatchdog();
    androidFallbackRef.current = setTimeout(() => setVideoReady(true), 6000);
    androidReconnectRef.current = setTimeout(() => {
      setVideoReady(false);
      setAndroidVideoKey((k) => k + 1);
      startAndroidFallbackRef.current?.();
    }, 20000);
  }, [clearAndroidTimers, startAndroidWatchdog]);

  React.useEffect(() => {
    startAndroidFallbackRef.current = startAndroidFallback;
  }, [startAndroidFallback]);

  const openFullscreen = React.useCallback(
    (item: any) => {
      setPendingThumbUrl(
        `${GO2RTC_HOST}/api/frame.jpeg?src=${item.iD_Camera_Ma}_snap&t=${thumbTimestamp}`,
      );
      setVideoReady(false);
      setAndroidVideoKey(0);
      setFullscreenCamera(item);
      Orientation.unlockAllOrientations();
      if (Platform.OS === "android") startAndroidFallback();
    },
    [startAndroidFallback, thumbTimestamp],
  );

  const numColumns = layoutCount === 1 ? 1 : 2;
  const itemWidth = screenWidth / numColumns - 16;
  const totalPages = Math.ceil(cameras.length / layoutCount);
  const pagedCameras = cameras.slice(
    page * layoutCount,
    (page + 1) * layoutCount,
  );
  const fullscreenIndex = fullscreenCamera
    ? cameras.findIndex(
        (cam: any) => cam.iD_Camera === fullscreenCamera.iD_Camera,
      )
    : -1;

  React.useEffect(() => {
    totalPagesRef.current = totalPages;
  }, [totalPages]);

  const changePage = React.useCallback((newPage: number) => {
    setPage(newPage);
  }, []);

  const handleSetLayout = (count: number) => {
    setLayoutCount(count);
    setPage(0);
    setShowLayoutModal(false);
  };

  const handleNavigate = () => {
    navigation.navigate("CameraListGrid", { cameras, zoneName });
  };

  const renderItem = React.useCallback(
    ({ item }: ListRenderItemInfo<any>) => {
      return (
        <View style={[styles.card, { width: itemWidth }]}>
          <View style={styles.cardHeader}>
            <View style={styles.titleRow}>
              <MaterialIcons name="videocam" size={16} color="#333" />
              <Text style={styles.cardTitle} numberOfLines={1}>
                {item.iD_Camera_MoTa}
              </Text>
            </View>
          </View>
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={() => openFullscreen(item)}
            style={styles.videoWrapper}
          >
            {cameraToken && thumbTimestamp ? (
              <CameraThumbnail
                cameraId={item.iD_Camera}
                cameraCode={item.iD_Camera_Ma}
                cameraToken={cameraToken}
                thumbTimestamp={thumbTimestamp}
                focusKey={focusKey}
              />
            ) : (
              <View style={[styles.preview, { backgroundColor: "#111" }]}>
                <ActivityIndicator size="small" color="#555" />
              </View>
            )}
          </TouchableOpacity>
        </View>
      );
    },
    [cameraToken, focusKey, itemWidth, openFullscreen, thumbTimestamp],
  );

  const displayThumbUrl =
    pendingThumbUrl ??
    (fullscreenCamera
      ? `${GO2RTC_HOST}/api/frame.jpeg?src=${fullscreenCamera.iD_Camera_Ma}_snap&t=${thumbTimestamp}`
      : null);
  const visiblePageIndexes = React.useMemo(() => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, index) => index);
    }

    const maxVisibleDots = 7;
    const half = Math.floor(maxVisibleDots / 2);
    let start = Math.max(0, page - half);
    let end = start + maxVisibleDots - 1;

    if (end >= totalPages) {
      end = totalPages - 1;
      start = Math.max(0, end - maxVisibleDots + 1);
    }

    return Array.from({ length: end - start + 1 }, (_, index) => start + index);
  }, [page, totalPages]);

  const swipeGesture = React.useMemo(
    () =>
      Gesture.Pan()
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
          const threshold = screenWidth * 0.3;
          if (e.translationX < -threshold && curPage < total - 1) {
            Animated.timing(translateX, {
              toValue: -screenWidth,
              duration: 250,
              useNativeDriver: true,
            }).start(() => {
              translateX.setValue(0);
              changePage(curPage + 1);
            });
          } else if (e.translationX > threshold && curPage > 0) {
            Animated.timing(translateX, {
              toValue: screenWidth,
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
        }),
    [changePage, screenWidth, translateX],
  );

  const switchFullscreenCamera = React.useCallback(
    (nextIndex: number, direction: "next" | "prev") => {
      const nextCam = cameras[nextIndex];
      if (!nextCam) return;

      fullscreenWebViewRef.current?.postMessage?.("stop");
      clearAndroidTimers();

      setPendingThumbUrl(
        `${GO2RTC_HOST}/api/frame.jpeg?src=${nextCam.iD_Camera_Ma}_snap&t=${thumbTimestamp}`,
      );
      setVideoReady(false);
      setAndroidVideoKey(0);
      setFullscreenCamera(nextCam);

      const nextPage = Math.floor(nextIndex / layoutCount);
      if (nextPage !== pageRef.current) {
        setPage(nextPage);
      }

      fsTranslateX.setValue(direction === "next" ? screenWidth : -screenWidth);
      Animated.timing(fsTranslateX, {
        toValue: 0,
        duration: 240,
        useNativeDriver: true,
      }).start();

      if (Platform.OS === "android") startAndroidFallback();
    },
    [
      cameras,
      clearAndroidTimers,
      fsTranslateX,
      layoutCount,
      screenWidth,
      startAndroidFallback,
      thumbTimestamp,
    ],
  );

  const handleFullscreenSwipe = React.useCallback(
    (direction: "next" | "prev", animateOut = true) => {
      if (fullscreenIndex < 0) return;
      const nextIndex =
        direction === "next" ? fullscreenIndex + 1 : fullscreenIndex - 1;
      if (nextIndex < 0 || nextIndex >= cameras.length) {
        Animated.spring(fsTranslateX, {
          toValue: 0,
          useNativeDriver: true,
          tension: 100,
          friction: 10,
        }).start();
        return;
      }

      const switchNow = () => switchFullscreenCamera(nextIndex, direction);

      if (!animateOut) {
        switchNow();
        return;
      }

      Animated.timing(fsTranslateX, {
        toValue: direction === "next" ? -screenWidth : screenWidth,
        duration: 220,
        useNativeDriver: true,
      }).start(switchNow);
    },
    [
      cameras.length,
      fsTranslateX,
      fullscreenIndex,
      screenWidth,
      switchFullscreenCamera,
    ],
  );

  const fullscreenSwipeGesture = React.useMemo(
    () =>
      Gesture.Pan()
        .runOnJS(true)
        .activeOffsetX([-35, 35])
        .failOffsetY([-20, 20])
        .onUpdate((e) => {
          if (fullscreenIndex < 0) return;
          const isAtFirst = fullscreenIndex === 0;
          const isAtLast = fullscreenIndex === cameras.length - 1;
          const isPullingPastStart = isAtFirst && e.translationX > 0;
          const isPullingPastEnd = isAtLast && e.translationX < 0;
          fsTranslateX.setValue(
            isPullingPastStart || isPullingPastEnd
              ? e.translationX * 0.2
              : e.translationX,
          );
        })
        .onEnd((e) => {
          if (fullscreenIndex < 0) return;
          const threshold = screenWidth * 0.22;
          if (
            e.translationX < -threshold &&
            fullscreenIndex < cameras.length - 1
          ) {
            Animated.timing(fsTranslateX, {
              toValue: -screenWidth,
              duration: 220,
              useNativeDriver: true,
            }).start(() => {
              handleFullscreenSwipe("next", false);
            });
          } else if (e.translationX > threshold && fullscreenIndex > 0) {
            Animated.timing(fsTranslateX, {
              toValue: screenWidth,
              duration: 220,
              useNativeDriver: true,
            }).start(() => {
              handleFullscreenSwipe("prev", false);
            });
          } else {
            Animated.spring(fsTranslateX, {
              toValue: 0,
              useNativeDriver: true,
              tension: 100,
              friction: 10,
            }).start();
          }
        }),
    [
      cameras.length,
      fsTranslateX,
      fullscreenIndex,
      handleFullscreenSwipe,
      screenWidth,
    ],
  );

  return (
    <GestureHandlerRootView style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.pageTitle}>
          {zoneName} ({cameras.length} Camera)
        </Text>
        <View style={styles.headerRight}>
          <TouchableOpacity onPress={handleNavigate}>
            <Ionicons name="apps" size={24} color="#333" />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setShowLayoutModal(true)}>
            <Ionicons name="grid" size={24} color="#333" />
          </TouchableOpacity>
        </View>
      </View>

      <GestureDetector gesture={swipeGesture}>
        <View style={styles.listArea}>
          <Animated.View
            style={[styles.listAnimated, { transform: [{ translateX }] }]}
          >
            <FlatList
              data={pagedCameras}
              key={`${numColumns}-${page}-${focusKey}`}
              numColumns={numColumns}
              keyExtractor={(item) => item.iD_Camera.toString()}
              renderItem={renderItem}
              showsVerticalScrollIndicator={false}
              removeClippedSubviews
              contentContainerStyle={styles.listContent}
              extraData={`${cameraToken}-${thumbTimestamp}-${focusKey}`}
            />
          </Animated.View>

          {totalPages > 1 && (
            <View style={styles.paginationRow}>
              {visiblePageIndexes.map((i) => (
                <TouchableOpacity key={i} onPress={() => changePage(i)}>
                  <View style={[styles.dot, i === page && styles.dotActive]} />
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      </GestureDetector>

      {/* Layout Modal */}
      <Modal
        visible={showLayoutModal}
        animationType="slide"
        transparent
        statusBarTranslucent
      >
        <TouchableWithoutFeedback onPress={() => setShowLayoutModal(false)}>
          <View style={styles.modalOverlay}>
            <View
              style={[
                styles.sheetContainer,
                { paddingBottom: insets.bottom || 16 },
              ]}
            >
              <View style={styles.handleWrapper}>
                <View style={styles.handle} />
              </View>
              <Text style={styles.sheetTitle}>Bố trí cửa sổ</Text>
              <Text style={styles.sheetTitleChild}>Chọn số lượng cửa sổ</Text>
              {["1", "4", "8", "12", "16"].map((item, index) => (
                <TouchableOpacity
                  key={item}
                  style={[
                    styles.listItem,
                    index !== 0 && styles.itemBorder,
                    layoutCount === Number(item) && styles.activeItem,
                  ]}
                  onPress={() => handleSetLayout(Number(item))}
                >
                  <Text
                    style={[
                      styles.listItemText,
                      layoutCount === Number(item) && styles.activeText,
                    ]}
                  >
                    {item}
                  </Text>
                </TouchableOpacity>
              ))}
              <TouchableOpacity
                style={styles.closeBtn}
                onPress={() => setShowLayoutModal(false)}
              >
                <Text style={styles.closeText}>Đóng</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* Fullscreen Modal */}
      <Modal
        visible={fullscreenCamera !== null}
        animationType="fade"
        transparent={false}
        statusBarTranslucent
        hardwareAccelerated
        supportedOrientations={[
          "portrait",
          "landscape-left",
          "landscape-right",
        ]}
        onRequestClose={closeFullscreen}
      >
        <View style={styles.fullscreenContainer}>
          <View
            style={[
              styles.fsHeader,
              isLandscape
                ? { paddingTop: 48, paddingLeft: insets.left || 16 }
                : { paddingTop: insets.top || 48 },
            ]}
          >
            <TouchableOpacity
              style={styles.fsHeaderBtn}
              onPress={closeFullscreen}
            >
              <Ionicons name="chevron-down" size={26} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.fsTitle} numberOfLines={1}>
              {fullscreenCamera?.iD_Camera_MoTa ?? "Camera"}
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
              onPress={toggleOrientation}
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
            <GestureDetector gesture={fullscreenSwipeGesture}>
              <Animated.View
                style={[
                  StyleSheet.absoluteFill,
                  { transform: [{ translateX: fsTranslateX }] },
                ]}
              >
                {fullscreenCamera && cameraToken ? (
                  <>
                    {Platform.OS === "android" && (
                      <Video
                        key={`${fullscreenCamera.iD_Camera}-${androidVideoKey}`}
                        source={{
                          uri: `${GO2RTC_HOST}/api/stream.m3u8?src=${fullscreenCamera.iD_Camera_Ma}_main&mp4=flac`,
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
                        useTextureView={false}
                        hideShutterView={true}
                        bufferConfig={{
                          minBufferMs: 1000,
                          maxBufferMs: 3000,
                          bufferForPlaybackMs: 500,
                          bufferForPlaybackAfterRebufferMs: 1000,
                        }}
                        onReadyForDisplay={handleAndroidReady}
                        onProgress={() =>
                          (lastProgressRef.current = Date.now())
                        }
                        onError={() => {
                          clearAndroidTimers();
                          androidReconnectRef.current = setTimeout(() => {
                            setVideoReady(false);
                            setAndroidVideoKey((k) => k + 1);
                            startAndroidFallback();
                          }, 3000);
                        }}
                      />
                    )}

                    {Platform.OS === "ios" && (
                      <WebView
                        key={fullscreenCamera.iD_Camera}
                        ref={fullscreenWebViewRef}
                        source={{
                          html: buildFullscreenHTML(
                            fullscreenCamera.iD_Camera_Ma,
                          ),
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
                        onLoad={() => {
                          if (
                            fullscreenWebViewRef.current?.postMessage &&
                            cameraToken
                          ) {
                            fullscreenWebViewRef.current.postMessage(
                              JSON.stringify({
                                type: "token",
                                value: cameraToken,
                              }),
                            );
                          }
                        }}
                        onMessage={(e) => {
                          const data = e.nativeEvent.data;
                          if (data === "ready") setVideoReady(true);
                          else if (data === "token_expired")
                            fetchCameraTokenRef.current?.(true);
                          else if (data === "swipe_next")
                            handleFullscreenSwipe("next");
                          else if (data === "swipe_prev")
                            handleFullscreenSwipe("prev");
                        }}
                      />
                    )}

                    {!videoReady && (
                      <View style={StyleSheet.absoluteFill}>
                        {displayThumbUrl && (
                          <Image
                            source={{
                              uri: displayThumbUrl,
                              headers: {
                                Authorization: `Bearer ${cameraToken}`,
                              },
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
              </Animated.View>
            </GestureDetector>
            {cameras.length > 1 && fullscreenIndex >= 0 && (
              <View style={styles.fsPager}>
                <Text style={styles.fsPagerText}>
                  {fullscreenIndex + 1} / {cameras.length}
                </Text>
              </View>
            )}
          </View>
        </View>
      </Modal>
    </GestureHandlerRootView>
  );
};

export default CameraList;

const styles = StyleSheet.create({
  container: { flex: 1 },
  listArea: { flex: 1, overflow: "hidden" },
  listAnimated: { flex: 1 },
  listContent: { paddingBottom: 8 },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginHorizontal: 16,
    marginVertical: 12,
  },
  pageTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: "600",
    color: "#000",
    marginRight: 12,
  },
  headerRight: { flexDirection: "row", alignItems: "center", gap: 16 },
  card: {
    backgroundColor: "#FFF",
    borderRadius: 12,
    margin: 8,
    padding: 6,
    elevation: 2,
    overflow: "hidden",
  },
  cardHeader: { marginBottom: 4 },
  titleRow: { flexDirection: "row", alignItems: "center" },
  cardTitle: { fontSize: 12, marginLeft: 4, flex: 1 },
  videoWrapper: {
    width: "100%",
    aspectRatio: 16 / 9,
    backgroundColor: "#000",
    borderRadius: 8,
    overflow: "hidden",
  },
  preview: {
    width: "100%",
    height: "100%",
    borderRadius: 8,
    backgroundColor: "#000",
  },
  previewLoading: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#111",
    borderRadius: 8,
  },
  paginationRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    height: 28,
    backgroundColor: "#fff",
    gap: 4,
    paddingHorizontal: 12,
  },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: "#ccc" },
  dotActive: {
    width: 22,
    height: 7,
    backgroundColor: "#e53935",
    borderRadius: 4,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  sheetContainer: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  handleWrapper: { alignItems: "center", paddingTop: 10, paddingBottom: 6 },
  handle: { width: 45, height: 5, backgroundColor: "#ccc", borderRadius: 3 },
  sheetTitle: {
    fontSize: 18,
    fontWeight: "600",
    textAlign: "center",
    marginBottom: 8,
    color: "#333",
  },
  sheetTitleChild: {
    fontSize: 16,
    textAlign: "center",
    marginBottom: 12,
    color: "#aaa",
  },
  listItem: { paddingVertical: 16, paddingHorizontal: 20 },
  listItemText: { fontSize: 16, color: "#333", textAlign: "center" },
  itemBorder: { borderTopWidth: 0.5, borderColor: "#e5e5e5" },
  activeItem: { backgroundColor: "#f5f5f5" },
  activeText: { color: "red", fontWeight: "600" },
  closeBtn: {
    marginTop: 10,
    marginHorizontal: 16,
    backgroundColor: "#f2f2f2",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  closeText: { fontSize: 16, fontWeight: "600", color: "#333" },
  fullscreenContainer: { flex: 1, backgroundColor: "#000" },
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
  fsVideoArea: { flex: 1, backgroundColor: "#000" },
  fsPager: {
    position: "absolute",
    bottom: 24,
    alignSelf: "center",
    backgroundColor: "rgba(0,0,0,0.45)",
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  fsPagerText: { color: "#fff", fontSize: 12, fontWeight: "600" },
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
