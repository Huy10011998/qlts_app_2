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
} from "react-native";
import { Buffer } from "buffer";
import { useRoute } from "@react-navigation/native";
import Ionicons from "react-native-vector-icons/Ionicons";
import MaterialIcons from "react-native-vector-icons/MaterialIcons";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { TouchableWithoutFeedback } from "react-native";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import Video from "react-native-video";
import WebView from "react-native-webview";
import { getTokenViewCamera } from "../../services/data/CallApi";
import { subscribeAppRefetch } from "../../utils/AppRefetchBus";
import Orientation from "react-native-orientation-locker";

const GO2RTC_HOST = "https://api.cholimexfood.com.vn/camera-stream";

// ── Fix: Token không nhúng vào HTML — nhận qua postMessage sau onLoad ──
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
function dist(t1,t2){return Math.hypot(t2.clientX-t1.clientX,t2.clientY-t1.clientY);}
function midpoint(t1,t2){return{x:(t1.clientX+t2.clientX)/2,y:(t1.clientY+t2.clientY)/2};}

container.addEventListener('touchstart',e=>{
  e.preventDefault();touches=[...e.touches];
  if(touches.length===1){
    const now=Date.now();
    if(now-lastTapTime<300){resetZoom();}
    lastTapTime=now;
    panStartX=touches[0].clientX-tx;panStartY=touches[0].clientY-ty;
  }
  if(touches.length===2){
    pinchStartDist=dist(touches[0],touches[1]);pinchStartScale=scale;
    lastTx=tx;lastTy=ty;
  }
},{passive:false});

container.addEventListener('touchmove',e=>{
  e.preventDefault();touches=[...e.touches];
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
  touches=[...e.touches];
  if(touches.length===1){panStartX=touches[0].clientX-tx;panStartY=touches[0].clientY-ty;lastTx=tx;lastTy=ty;}
  if(touches.length===0&&scale<1.05){resetZoom();}
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
v.addEventListener('timeupdate',()=>{
  if(v.currentTime!==lastTime){
    lastTime=v.currentTime;
    if(v.currentTime>0){notifyReady();backoffMs=1000;}
    resetFrozenWatchdog();
  }
});
setTimeout(notifyReady,6000);
document.addEventListener('visibilitychange',()=>{
  if(document.hidden){stopAll();}
  else{stopped=false;backoffMs=1000;connect();}
});
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
}
window.addEventListener('message',function(e){handleMsg(e.data);});
document.addEventListener('message',function(e){handleMsg(e.data);});
</script></body></html>`;

// ── Decode JWT để schedule proactive refresh ──
const decodeTokenExpiry = (token: string): number | null => {
  try {
    const base64 = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    const payload = JSON.parse(Buffer.from(base64, "base64").toString("utf8"));
    return payload.exp ? payload.exp * 1000 : null;
  } catch {
    return null;
  }
};

const CameraList: React.FC = () => {
  const route = useRoute<any>();
  const { cameras, zoneName } = route.params;
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();

  // ── Fix: screenWidth động theo orientation ──
  const [screenWidth, setScreenWidth] = React.useState(
    Dimensions.get("window").width,
  );

  React.useEffect(() => {
    const sub = Dimensions.addEventListener("change", ({ window }) => {
      setScreenWidth(window.width);
    });
    return () => sub.remove();
  }, []);

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
  const [pendingThumbUrl, setPendingThumbUrl] = React.useState<string | null>(
    null,
  );

  const fullscreenWebViewRef = React.useRef<any>(null);
  const isFirstFocusRef = React.useRef(true);
  const tokenRefreshTimerRef = React.useRef<ReturnType<
    typeof setTimeout
  > | null>(null);

  // ── Android stall detection ──
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
    if (androidFallbackRef.current) {
      clearTimeout(androidFallbackRef.current);
      androidFallbackRef.current = null;
    }
    if (androidReconnectRef.current) {
      clearTimeout(androidReconnectRef.current);
      androidReconnectRef.current = null;
    }
    if (androidWatchdogRef.current) {
      clearInterval(androidWatchdogRef.current);
      androidWatchdogRef.current = null;
    }
  }, []);

  // ── Proactive token refresh ──
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

  const fetchCameraToken = React.useCallback(async () => {
    try {
      const res: any = await getTokenViewCamera();
      if (res?.data) {
        const newToken = res.data;
        setCameraToken(newToken);
        setThumbTimestamp(Date.now());
        scheduleProactiveRefresh(newToken);
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
      if (isFirstFocusRef.current) {
        isFirstFocusRef.current = false;
        setCameraToken("");
        setThumbTimestamp(0);
      }
      fetchCameraToken();
      return () => {
        if (tokenRefreshTimerRef.current)
          clearTimeout(tokenRefreshTimerRef.current);
      };
    }, [fetchCameraToken]),
  );

  React.useEffect(() => {
    const unsub = subscribeAppRefetch(() => {
      fetchCameraTokenRef.current?.();
    });
    return () => unsub();
  }, []);

  // ── Reset orientation khi unmount màn hình ──
  React.useEffect(() => {
    return () => {
      Orientation.lockToPortrait();
    };
  }, []);

  React.useEffect(() => {
    const sub = AppState.addEventListener("change", (state) => {
      if (fullscreenWebViewRef.current?.postMessage) {
        fullscreenWebViewRef.current.postMessage(
          state === "active" ? "start" : "stop",
        );
      }
    });
    return () => sub.remove();
  }, []);

  // ── Clear pending thumb khi video đã sẵn sàng ──
  React.useEffect(() => {
    if (videoReady) setPendingThumbUrl(null);
  }, [videoReady]);

  React.useEffect(() => {
    return () => clearAndroidTimers();
  }, [clearAndroidTimers]);

  const totalCameras = cameras.length;

  const closeFullscreen = () => {
    Orientation.lockToPortrait();
    setIsLandscape(false);
    clearAndroidTimers();
    setVideoReady(false);
    setFullscreenCamera(null);
    setPendingThumbUrl(null);
  };

  const toggleOrientation = () => {
    if (isLandscape) {
      Orientation.lockToPortrait();
      setIsLandscape(false);
    } else {
      Orientation.lockToLandscape();
      setIsLandscape(true);
    }
  };

  const handleAndroidReady = () => {
    clearAndroidTimers();
    lastProgressRef.current = Date.now();
    setVideoReady(true);
  };

  // ── Android stall watchdog ──
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
      Orientation.lockToLandscape();
      setIsLandscape(true);
      setPendingThumbUrl(
        `${GO2RTC_HOST}/api/frame.jpeg?src=${item.iD_Camera_Ma}_snap&t=${thumbTimestamp}`,
      );
      setVideoReady(false);
      setAndroidVideoKey(0);
      setFullscreenCamera(item);
      if (Platform.OS === "android") startAndroidFallback();
    },
    [startAndroidFallback, thumbTimestamp],
  );

  const getNumColumns = () => {
    if (layoutCount === 1) return 1;
    if (layoutCount === 4) return 2;
    if (layoutCount === 9) return 3;
    if (layoutCount === 12) return 3;
    if (layoutCount === 16) return 4;
    return 2;
  };

  const numColumns = getNumColumns();
  // ── Fix: dùng screenWidth động thay vì SCREEN_WIDTH tĩnh ──
  const itemWidth = screenWidth / numColumns - 16;
  const totalPages = Math.ceil(totalCameras / layoutCount);
  const pagedCameras = cameras.slice(
    page * layoutCount,
    (page + 1) * layoutCount,
  );

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
      const frameUrl = `${GO2RTC_HOST}/api/frame.jpeg?src=${item.iD_Camera_Ma}_snap&t=${thumbTimestamp}`;
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
              <Image
                source={{
                  uri: frameUrl,
                  headers: { Authorization: `Bearer ${cameraToken}` },
                }}
                style={styles.preview}
                resizeMode="cover"
              />
            ) : (
              <View style={[styles.preview, { backgroundColor: "#111" }]}>
                <ActivityIndicator
                  size="small"
                  color="#555"
                  style={{ flex: 1 }}
                />
              </View>
            )}
          </TouchableOpacity>
        </View>
      );
    },
    [itemWidth, openFullscreen, cameraToken, thumbTimestamp],
  );

  const displayThumbUrl =
    pendingThumbUrl ??
    (fullscreenCamera
      ? `${GO2RTC_HOST}/api/frame.jpeg?src=${fullscreenCamera.iD_Camera_Ma}_snap&t=${thumbTimestamp}`
      : null);

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.pageTitle}>
          {zoneName} ({totalCameras} Camera)
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

      <FlatList
        data={pagedCameras}
        key={`${numColumns}-${page}`}
        numColumns={numColumns}
        keyExtractor={(item) => item.iD_Camera.toString()}
        renderItem={renderItem}
        showsVerticalScrollIndicator={false}
        removeClippedSubviews
      />

      {totalPages > 1 && (
        <View style={styles.pagination}>
          <TouchableOpacity
            onPress={() => setPage((p) => p - 1)}
            disabled={page === 0}
            style={[styles.pageBtn, page === 0 && styles.pageBtnDisabled]}
          >
            <Ionicons
              name="chevron-back"
              size={20}
              color={page === 0 ? "#ccc" : "#333"}
            />
          </TouchableOpacity>
          <Text style={styles.pageText}>
            {page + 1} / {totalPages}
          </Text>
          <TouchableOpacity
            onPress={() => setPage((p) => p + 1)}
            disabled={page === totalPages - 1}
            style={[
              styles.pageBtn,
              page === totalPages - 1 && styles.pageBtnDisabled,
            ]}
          >
            <Ionicons
              name="chevron-forward"
              size={20}
              color={page === totalPages - 1 ? "#ccc" : "#333"}
            />
          </TouchableOpacity>
        </View>
      )}

      <Modal
        visible={showLayoutModal}
        animationType="slide"
        transparent
        statusBarTranslucent
        presentationStyle="overFullScreen"
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
              {["1", "4", "9", "12", "16"].map((item, index) => (
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

      <Modal
        visible={fullscreenCamera !== null}
        animationType="fade"
        transparent={false}
        statusBarTranslucent
        hardwareAccelerated
        onRequestClose={closeFullscreen}
      >
        <View
          style={[styles.fullscreenContainer, { paddingBottom: insets.bottom }]}
        >
          <View
            style={[styles.fullscreenHeader, { paddingTop: insets.top || 48 }]}
          >
            <Text style={styles.fullscreenTitle} numberOfLines={1}>
              {fullscreenCamera?.iD_Camera_MoTa}
            </Text>
            <TouchableOpacity
              onPress={() => setIsFullMuted((v) => !v)}
              style={styles.muteBtn}
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
              onPress={toggleOrientation}
              style={styles.muteBtn}
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
            <TouchableOpacity onPress={closeFullscreen}>
              <Ionicons name="close" size={28} color="#fff" />
            </TouchableOpacity>
          </View>

          <View style={{ flex: 1, backgroundColor: "#000" }}>
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
                    onProgress={() => {
                      lastProgressRef.current = Date.now();
                    }}
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
                      html: buildFullscreenHTML(fullscreenCamera.iD_Camera_Ma),
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
        </View>
      </Modal>
    </View>
  );
};

export default CameraList;

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginHorizontal: 16,
    marginVertical: 12,
  },
  headerRight: { flexDirection: "row", alignItems: "center", gap: 16 },
  pageTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: "600",
    color: "#000",
    marginRight: 12,
  },
  card: {
    backgroundColor: "#FFF",
    borderRadius: 12,
    margin: 8,
    padding: 6,
    elevation: 2,
    overflow: "hidden",
  },
  cardHeader: { marginBottom: 4 },
  cardTitle: { fontSize: 12, marginLeft: 4, flex: 1 },
  titleRow: { flexDirection: "row", alignItems: "center" },
  videoWrapper: {
    width: "100%",
    aspectRatio: 16 / 9,
    backgroundColor: "#000",
    borderRadius: 8,
    overflow: "hidden",
  },
  pagination: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 10,
    backgroundColor: "#eee",
    gap: 16,
  },
  pageBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    elevation: 2,
  },
  pageBtnDisabled: { backgroundColor: "#f0f0f0", elevation: 0 },
  pageText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
    minWidth: 60,
    textAlign: "center",
  },
  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  activeText: { color: "red", fontWeight: "600" },
  sheetContainer: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: 20,
    maxHeight: "85%",
  },
  handleWrapper: { alignItems: "center", paddingTop: 10, paddingBottom: 6 },
  handle: {
    width: 45,
    height: 5,
    backgroundColor: "#ccc",
    borderRadius: 3,
    alignSelf: "center",
    marginBottom: 12,
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: "600",
    textAlign: "center",
    marginBottom: 12,
    color: "#333",
  },
  sheetTitleChild: {
    fontSize: 16,
    textAlign: "center",
    marginBottom: 12,
    color: "#aaa",
  },
  listItem: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    backgroundColor: "#fff",
  },
  listItemText: { fontSize: 16, color: "#333", textAlign: "center" },
  itemBorder: { borderTopWidth: 0.5, borderColor: "#e5e5e5" },
  closeBtn: {
    marginTop: 10,
    marginHorizontal: 16,
    backgroundColor: "#f2f2f2",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  closeText: {
    textAlign: "center",
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
  },
  activeItem: { backgroundColor: "#f5f5f5" },
  fullscreenContainer: { flex: 1, backgroundColor: "#000" },
  fullscreenHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: "rgba(0,0,0,0.6)",
  },
  fullscreenTitle: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
    flex: 1,
    marginRight: 12,
  },
  muteBtn: { marginRight: 12 },
  preview: {
    width: "100%",
    height: "100%",
    borderRadius: 8,
    backgroundColor: "#000",
  },
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
