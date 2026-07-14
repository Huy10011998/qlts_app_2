import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useIsFocused } from "@react-navigation/native";
import Ionicons from "react-native-vector-icons/Ionicons";
import WebView from "react-native-webview";
import EnumAndReferencePickerModal from "../../components/modal/EnumAndReferencePickerModal";
import EmptyState from "../../components/ui/EmptyState";
import {
  getPhuongTien,
  getPhuongTienCurrentLocation,
} from "../../services/data/callApi";
import { error, log } from "../../utils/Logger";
import { VEHICLE_MAP_CONTROL_CSS } from "./shared/vehicleMapControlStyles";
import { useNetworkAwareReload } from "../../hooks/useNetworkAwareReload";
import { useForegroundWebViewRemount } from "./shared/useForegroundWebViewRemount";

type Vehicle = Record<string, unknown> & { id?: string | number };
type VehicleListResponse = { data?: { items?: Vehicle[] } };
type CurrentLocation = {
  lat: number;
  lng: number;
  address?: string | null;
  dateTime?: string | null;
};
type CurrentLocationResponse =
  | CurrentLocation
  | { data?: CurrentLocation | null };

const MAP_HTML = `<!doctype html>
<html><head>
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=5,user-scalable=yes" />
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
<style>html,body,#map{height:100%;width:100%;margin:0;background:#e2e8f0}${VEHICLE_MAP_CONTROL_CSS}</style>
</head><body><div id="map"></div>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<script>
const map=L.map('map',{touchZoom:true,doubleClickZoom:true,scrollWheelZoom:true});
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{attribution:'© OpenStreetMap',maxZoom:19}).addTo(map);
map.setView([10.7769,106.7009],11);
let marker=null;
const icon=L.divIcon({className:'',html:'<div style="width:20px;height:20px;border-radius:50%;background:#1976d2;border:3px solid white;box-shadow:0 1px 7px rgba(0,0,0,.45)"></div>',iconSize:[20,20],iconAnchor:[10,10]});
function escapeHtml(value){return String(value||'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));}
window.updateVehicleLocation=function(location){
 if(!location)return;const position=[location.lat,location.lng];
 const popup='<div style="font-size:12px;min-width:190px"><b style="color:#1976d2">Vị trí hiện tại</b><br/><span>'+escapeHtml(location.address)+'</span><br/><span style="color:#888">'+escapeHtml(location.dateTime)+'</span></div>';
 if(!marker){marker=L.marker(position,{icon}).addTo(map);map.setView(position,16);}else marker.setLatLng(position);
 marker.bindPopup(popup);
};
const Focus=L.Control.extend({options:{position:'topleft'},onAdd:function(){const button=L.DomUtil.create('button','vehicle-map-action');button.innerHTML='◎';button.title='Focus vị trí hiện tại';L.DomEvent.disableClickPropagation(button);button.onclick=()=>{if(marker){map.flyTo(marker.getLatLng(),17,{duration:.8});marker.openPopup();}};return button;}});new Focus().addTo(map);
window.addEventListener('resize',()=>setTimeout(()=>map.invalidateSize(),180));
</script></body></html>`;

const textOf = (item: Record<string, unknown>, keys: string[]) => {
  for (const key of keys) {
    const value = item[key];
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number") return String(value);
  }
  return "";
};

const vehicleLabel = (item: Vehicle) =>
  textOf(item, ["ten", "Ten", "name", "Name", "label"]) ||
  textOf(item, ["bienSo", "BienSo", "bienSoXe", "BienSoXe"]) ||
  `Phương tiện ${String(item.id ?? "")}`;

const trackingIdOf = (item: Vehicle | null) =>
  item
    ? textOf(item, ["iD_Tracking", "ID_Tracking", "id_Tracking", "idTracking"])
    : "";

const normalizeLocation = (
  response: CurrentLocationResponse
): CurrentLocation | null => {
  const raw =
    response && typeof response === "object" && "data" in response
      ? response.data
      : response;
  if (!raw) return null;
  const source = raw as CurrentLocation & Record<string, unknown>;
  const lat = Number(source.lat ?? source.Lat);
  const lng = Number(source.lng ?? source.Lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return {
    lat,
    lng,
    address: String(source.address ?? source.Address ?? ""),
    dateTime: String(source.dateTime ?? source.DateTime ?? ""),
  };
};

const formatLocationTime = (value?: string | null) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return `${String(date.getHours()).padStart(2, "0")}:${String(
    date.getMinutes()
  ).padStart(2, "0")}:${String(date.getSeconds()).padStart(2, "0")} ${String(
    date.getDate()
  ).padStart(2, "0")}/${String(date.getMonth() + 1).padStart(
    2,
    "0"
  )}/${date.getFullYear()}`;
};

export default function VehicleCurrentLocationScreen() {
  const isFocused = useIsFocused();
  const webViewRef = useRef<WebView>(null);
  const networkAvailableRef = useRef(true);
  const { remountWebView, renderKey } = useForegroundWebViewRemount();
  const requestVersionRef = useRef(0);
  const pollingRef = useRef(false);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [location, setLocation] = useState<CurrentLocation | null>(null);
  const [pickerVisible, setPickerVisible] = useState(false);
  const [search, setSearch] = useState("");
  const [vehiclesLoading, setVehiclesLoading] = useState(true);
  const [locationLoading, setLocationLoading] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const trackingId = trackingIdOf(selectedVehicle);

  const pickerItems = useMemo(() => {
    const keyword = search.trim().toLocaleLowerCase("vi");
    const filtered = vehicles
      .map((item, index) => ({
        value: String(item.id ?? index),
        text: vehicleLabel(item),
      }))
      .filter(
        (item) =>
          !keyword || item.text.toLocaleLowerCase("vi").includes(keyword)
      );
    return keyword
      ? filtered
      : [{ value: "", text: "Phương tiện" }, ...filtered];
  }, [search, vehicles]);

  const selectedValue = selectedVehicle
    ? String(selectedVehicle.id ?? vehicles.indexOf(selectedVehicle))
    : null;

  const loadVehicles = useCallback(async () => {
    try {
      const response = await getPhuongTien<VehicleListResponse>();
      setVehicles(
        Array.isArray(response?.data?.items) ? response.data.items : []
      );
      setLoadError(false);
    } catch (exception) {
      error("[VehicleCurrentLocation] GET_PHUONG_TIEN error", exception);
      setLoadError(true);
    } finally {
      setVehiclesLoading(false);
    }
  }, []);

  useEffect(() => {
    loadVehicles();
  }, [loadVehicles]);

  const loadLocation = useCallback(
    async (showLoading: boolean) => {
      if (!trackingId || pollingRef.current || !networkAvailableRef.current)
        return;
      const requestVersion = requestVersionRef.current;
      pollingRef.current = true;
      if (showLoading) setLocationLoading(true);
      try {
        const response =
          await getPhuongTienCurrentLocation<CurrentLocationResponse>(
            trackingId
          );
        if (requestVersion !== requestVersionRef.current) return;
        const nextLocation = normalizeLocation(response);
        log("[VehicleCurrentLocation] location", nextLocation);
        setLocation(nextLocation);
        setLoadError(false);
      } catch (exception) {
        if (requestVersion !== requestVersionRef.current) return;
        error("[VehicleCurrentLocation] load error", exception);
        if (showLoading) setLocation(null);
        setLoadError(true);
      } finally {
        pollingRef.current = false;
        if (requestVersion === requestVersionRef.current) {
          setLocationLoading(false);
        }
      }
    },
    [trackingId]
  );

  useEffect(() => {
    requestVersionRef.current += 1;
    setLocation(null);
    setLoadError(false);
    if (!isFocused || !trackingId) return;

    loadLocation(true);
    const interval = setInterval(() => loadLocation(false), 5_000);
    return () => {
      clearInterval(interval);
      requestVersionRef.current += 1;
      pollingRef.current = false;
    };
  }, [isFocused, loadLocation, trackingId]);

  useNetworkAwareReload(
    async () => {
      networkAvailableRef.current = true;
      await loadVehicles();
      await loadLocation(Boolean(trackingId));
    },
    {
      enabled: isFocused,
      hasError: loadError,
      onOffline: () => {
        networkAvailableRef.current = false;
        setLoadError(true);
      },
    }
  );

  const pushLocationToMap = useCallback(() => {
    if (!location) return;
    webViewRef.current?.injectJavaScript(
      `window.updateVehicleLocation(${JSON.stringify({
        ...location,
        dateTime: formatLocationTime(location.dateTime),
      })});true;`
    );
  }, [location]);

  useEffect(() => {
    pushLocationToMap();
  }, [pushLocationToMap]);

  if (vehiclesLoading) {
    return (
      <View style={styles.centerState}>
        <ActivityIndicator color="#0284C7" />
        <Text style={styles.loadingText}>Đang tải phương tiện...</Text>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <View style={styles.filterWrap}>
        <Text style={styles.label}>Phương tiện</Text>
        <TouchableOpacity
          style={styles.select}
          onPress={() => setPickerVisible(true)}
        >
          <Ionicons name="car-outline" size={20} color="#0284C7" />
          <Text
            style={[
              styles.selectText,
              !selectedVehicle && styles.placeholderText,
            ]}
            numberOfLines={1}
          >
            {selectedVehicle ? vehicleLabel(selectedVehicle) : "Phương tiện"}
          </Text>
          <Ionicons name="chevron-down" size={18} color="#64748B" />
        </TouchableOpacity>
      </View>

      {!selectedVehicle ? (
        <View style={styles.flexState}>
          <EmptyState
            iconName="car-outline"
            title="Chọn phương tiện"
            subtitle="Chọn phương tiện để xem vị trí hiện tại."
            fullHeight={false}
          />
        </View>
      ) : !trackingId ? (
        <View style={styles.flexState}>
          <EmptyState
            iconName="location-outline"
            title="Không có ID Tracking"
            subtitle="Phương tiện chưa được cấu hình thiết bị theo dõi."
            fullHeight={false}
          />
        </View>
      ) : locationLoading ? (
        <View style={styles.flexState}>
          <ActivityIndicator color="#0284C7" />
          <Text style={styles.loadingText}>Đang tải vị trí hiện tại...</Text>
        </View>
      ) : !location ? (
        <View style={styles.flexState}>
          <EmptyState
            iconName={loadError ? "cloud-offline-outline" : "location-outline"}
            title={
              loadError ? "Không thể tải vị trí" : "Chưa có dữ liệu vị trí"
            }
            subtitle="Hệ thống sẽ tự động thử lại sau 5 giây."
            fullHeight={false}
          />
        </View>
      ) : (
        <>
          <View style={styles.infoCard}>
            <Text style={styles.vehicleName}>
              {vehicleLabel(selectedVehicle)}
            </Text>
            <View style={styles.infoRow}>
              <Ionicons name="time-outline" size={17} color="#64748B" />
              <Text style={styles.infoText}>
                {formatLocationTime(location.dateTime)}
              </Text>
            </View>
            <View style={styles.infoRow}>
              <Ionicons name="location-outline" size={17} color="#64748B" />
              <Text style={styles.infoText}>{location.address || "-"}</Text>
            </View>
            <View style={styles.liveRow}>
              <View style={styles.liveDot} />
              <Text style={styles.liveText}>Tự động cập nhật mỗi 5 giây</Text>
            </View>
          </View>
          <WebView
            key={renderKey}
            ref={webViewRef}
            originWhitelist={["*"]}
            source={{ html: MAP_HTML }}
            style={styles.map}
            javaScriptEnabled
            domStorageEnabled
            mixedContentMode="always"
            onLoadEnd={pushLocationToMap}
            onContentProcessDidTerminate={remountWebView}
            onRenderProcessGone={remountWebView}
          />
        </>
      )}

      <EnumAndReferencePickerModal
        visible={pickerVisible}
        title="Chọn phương tiện"
        items={pickerItems}
        selectedValue={selectedValue}
        total={pickerItems.filter((item) => item.value !== "").length}
        loadedCount={pickerItems.filter((item) => item.value !== "").length}
        onSearch={setSearch}
        onClose={() => {
          setPickerVisible(false);
          setSearch("");
        }}
        onSelect={(value) => {
          if (String(value) === "") {
            requestVersionRef.current += 1;
            setSelectedVehicle(null);
            setLocation(null);
          } else {
            const index = vehicles.findIndex(
              (item, itemIndex) =>
                String(item.id ?? itemIndex) === String(value)
            );
            if (index >= 0) setSelectedVehicle(vehicles[index]);
          }
          setPickerVisible(false);
          setSearch("");
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#F8FAFC" },
  centerState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F8FAFC",
  },
  flexState: { flex: 1, alignItems: "center", justifyContent: "center" },
  loadingText: { color: "#64748B", fontSize: 13, marginTop: 9 },
  filterWrap: { paddingHorizontal: 16, paddingTop: 8 },
  label: { color: "#475569", fontSize: 13, fontWeight: "600", marginBottom: 7 },
  select: {
    height: 50,
    borderWidth: 1.5,
    borderColor: "#0284C7",
    borderRadius: 10,
    backgroundColor: "#FFFFFF",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 13,
    marginBottom: 12,
  },
  selectText: { flex: 1, color: "#334155", fontSize: 15, marginHorizontal: 10 },
  placeholderText: { color: "#94A3B8" },
  infoCard: {
    marginHorizontal: 16,
    marginBottom: 10,
    padding: 13,
    borderWidth: 1,
    borderColor: "#BAE6FD",
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
  },
  vehicleName: { color: "#075985", fontSize: 16, fontWeight: "700" },
  infoRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 7,
    marginTop: 8,
  },
  infoText: { flex: 1, color: "#475569", fontSize: 13, lineHeight: 18 },
  liveRow: { flexDirection: "row", alignItems: "center", marginTop: 10 },
  liveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#22C55E" },
  liveText: {
    color: "#15803D",
    fontSize: 12,
    fontWeight: "600",
    marginLeft: 7,
  },
  map: { flex: 1, backgroundColor: "#E2E8F0" },
});
