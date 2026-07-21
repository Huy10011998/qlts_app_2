import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import { useRoute } from "@react-navigation/native";
import Ionicons from "react-native-vector-icons/Ionicons";
import Orientation from "react-native-orientation-locker";
import WebView from "react-native-webview";
import type { StackRoute } from "../../types";
import { VEHICLE_MAP_CONTROL_CSS } from "./shared/vehicleMapControlStyles";
import { useForegroundWebViewRemount } from "./shared/useForegroundWebViewRemount";
import { C } from "../../utils/helpers/colors";

type StopPoint = {
  id: number;
  lat: number;
  lng: number;
  stt?: number;
  time?: string;
  address?: string;
  duration?: string;
  seconds?: number;
};

const buildMapHtml = (
  points: StopPoint[],
  selectedId?: number
) => `<!doctype html>
<html><head><meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=5,user-scalable=yes" />
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
<style>html,body,#map{height:100%;width:100%;margin:0;background:#e2e8f0}${VEHICLE_MAP_CONTROL_CSS}</style>
</head><body><div id="map"></div><script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<script>
const points=${JSON.stringify(points)};const selectedId=${JSON.stringify(
  selectedId
)};
const map=L.map('map',{touchZoom:true,doubleClickZoom:true,scrollWheelZoom:true});
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{attribution:'© OpenStreetMap',maxZoom:19}).addTo(map);
const markers={};
points.forEach(p=>{const color=(p.seconds||0)>1800?'#f44336':(p.seconds||0)>600?'#ff9800':'#4caf50';
 const icon=L.divIcon({className:'',html:'<div style="width:16px;height:16px;border-radius:50%;background:'+color+';border:2px solid white;box-shadow:0 2px 6px rgba(0,0,0,.35)"></div>',iconAnchor:[8,8]});
 markers[p.id]=L.marker([p.lat,p.lng],{icon}).addTo(map).bindPopup('<div style="min-width:180px;font-size:12px"><b style="color:#1976d2">#'+(p.stt||'')+' — '+(p.time||'')+'</b><br/>'+(p.address||'')+'<br/><span style="color:#777">Dừng: '+(p.duration||'')+'</span></div>');
});
let bounds=points.length?L.latLngBounds(points.map(p=>[p.lat,p.lng])):null;
if(bounds)map.fitBounds(bounds,{padding:[35,35]});else map.setView([10.7769,106.7009],11);
if(selectedId&&markers[selectedId]){map.setView(markers[selectedId].getLatLng(),17);markers[selectedId].openPopup();}
const Fit=L.Control.extend({options:{position:'topleft'},onAdd:function(){const b=L.DomUtil.create('button','vehicle-map-action');b.innerHTML='⌖';b.title='Về tất cả điểm dừng';L.DomEvent.disableClickPropagation(b);b.onclick=()=>bounds&&map.fitBounds(bounds,{padding:[35,35]});return b;}});new Fit().addTo(map);
window.addEventListener('resize',()=>setTimeout(()=>{map.invalidateSize();if(bounds&&!selectedId)map.fitBounds(bounds,{padding:[35,35]});},180));
</script></body></html>`;

export default function VehicleTrackingMapScreen() {
  const [mapLoading, setMapLoading] = useState(true);
  const { remountWebView, renderKey } = useForegroundWebViewRemount(() =>
    setMapLoading(true)
  );
  const route = useRoute<StackRoute<"VehicleTrackingMap">>();
  const { width, height } = useWindowDimensions();
  const isLandscape = width > height;
  const html = useMemo(
    () => buildMapHtml(route.params.stopPoints, route.params.selectedId),
    [route.params.selectedId, route.params.stopPoints]
  );

  useEffect(() => {
    Orientation.unlockAllOrientations();
    return () => Orientation.lockToPortrait();
  }, []);

  const toggleOrientation = () => {
    Orientation.unlockAllOrientations();
    setTimeout(() => {
      isLandscape
        ? Orientation.lockToPortrait()
        : Orientation.lockToLandscapeLeft();
    }, 100);
  };

  return (
    <View style={styles.root}>
      <WebView
        key={`${width}-${height}-${renderKey}`}
        originWhitelist={["*"]}
        source={{ html }}
        style={styles.map}
        javaScriptEnabled
        domStorageEnabled
        mixedContentMode="always"
        onLoadStart={() => setMapLoading(true)}
        onLoadEnd={() => setMapLoading(false)}
        onContentProcessDidTerminate={remountWebView}
        onRenderProcessGone={remountWebView}
      />
      {mapLoading ? (
        <View pointerEvents="none" style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={C.red} />
          <Text style={styles.loadingText}>Đang tải bản đồ dừng đỗ...</Text>
        </View>
      ) : null}
      {!mapLoading ? (
        <TouchableOpacity
          style={styles.rotateButton}
          onPress={toggleOrientation}
        >
          <Ionicons
            name={
              isLandscape ? "phone-portrait-outline" : "phone-landscape-outline"
            }
            size={23}
            color={C.text}
          />
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.border },
  map: { flex: 1, backgroundColor: C.border },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: C.surfaceAlt,
  },
  loadingText: { marginTop: 12, color: C.textSecondary, fontSize: 14 },
  rotateButton: {
    position: "absolute",
    top: 12,
    right: 12,
    width: 38,
    height: 38,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: C.surface,
    elevation: 4,
    shadowColor: C.shadow,
    shadowOpacity: 0.15,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 },
  },
});
