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

type MapCoordinate = { lat: number; lng: number };

const buildMapHtml = (coordinates: MapCoordinate[]) => `<!doctype html>
<html><head>
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=5,user-scalable=yes" />
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
<style>
html,body,#map{height:100%;width:100%;margin:0;background:#e2e8f0;overflow:hidden}
${VEHICLE_MAP_CONTROL_CSS}
.leaflet-control-attribution{font-size:9px}
</style></head><body><div id="map"></div>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<script>
const points=${JSON.stringify(coordinates)};
const map=L.map('map',{zoomControl:true,touchZoom:true,doubleClickZoom:true,scrollWheelZoom:true});
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{attribution:'© OpenStreetMap',maxZoom:19}).addTo(map);
let bounds=null;
if(points.length){
 const latlngs=points.map(p=>[p.lat,p.lng]);
 const line=L.polyline(latlngs,{color:'#1976d2',weight:5,opacity:.88,lineJoin:'round'}).addTo(map);
 L.circleMarker(latlngs[0],{radius:8,color:'#fff',weight:3,fillColor:'#4caf50',fillOpacity:1}).addTo(map).bindPopup('Xuất phát');
 L.circleMarker(latlngs[latlngs.length-1],{radius:8,color:'#fff',weight:3,fillColor:'#f44336',fillOpacity:1}).addTo(map).bindPopup('Kết thúc');
 bounds=line.getBounds();
 if(latlngs.length===1) map.setView(latlngs[0],17); else map.fitBounds(bounds,{padding:[35,35]});
} else map.setView([10.7769,106.7009],11);
const Fit=L.Control.extend({options:{position:'topleft'},onAdd:function(){
 const button=L.DomUtil.create('button','vehicle-map-action');button.innerHTML='⌖';button.title='Về toàn tuyến';
 L.DomEvent.disableClickPropagation(button);button.onclick=function(){if(bounds)map.fitBounds(bounds,{padding:[35,35]});};return button;
}});new Fit().addTo(map);
window.addEventListener('resize',function(){setTimeout(function(){map.invalidateSize();if(bounds)map.fitBounds(bounds,{padding:[35,35]});},180);});
</script></body></html>`;

export default function VehicleJourneyMapScreen() {
  const [mapLoading, setMapLoading] = useState(true);
  const { remountWebView, renderKey } = useForegroundWebViewRemount(() =>
    setMapLoading(true)
  );
  const route = useRoute<StackRoute<"VehicleJourneyMap">>();
  const { width, height } = useWindowDimensions();
  const isLandscape = width > height;
  const html = useMemo(
    () => buildMapHtml(route.params.coordinates),
    [route.params.coordinates]
  );

  useEffect(() => {
    Orientation.unlockAllOrientations();
    return () => Orientation.lockToPortrait();
  }, []);

  const toggleOrientation = () => {
    Orientation.unlockAllOrientations();

    setTimeout(() => {
      if (isLandscape) {
        Orientation.lockToPortrait();
      } else {
        Orientation.lockToLandscapeLeft();
      }
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
        allowsInlineMediaPlayback
        onLoadStart={() => setMapLoading(true)}
        onLoadEnd={() => setMapLoading(false)}
        onContentProcessDidTerminate={remountWebView}
        onRenderProcessGone={remountWebView}
      />
      {mapLoading ? (
        <View pointerEvents="none" style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#0284C7" />
          <Text style={styles.loadingText}>Đang tải bản đồ hành trình...</Text>
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
            color="#334155"
          />
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#E2E8F0" },
  map: { flex: 1, backgroundColor: "#E2E8F0" },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F8FAFC",
  },
  loadingText: { marginTop: 12, color: "#64748B", fontSize: 14 },
  rotateButton: {
    position: "absolute",
    top: 12,
    right: 12,
    width: 38,
    height: 38,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.96)",
    shadowColor: "#000000",
    shadowOpacity: 0.15,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
});
