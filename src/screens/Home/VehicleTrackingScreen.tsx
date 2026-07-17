import { C } from "../../utils/helpers/colors";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useIsFocused, useNavigation } from "@react-navigation/native";
import Ionicons from "react-native-vector-icons/Ionicons";
import { DatePicker } from "../../components/dataPicker/DataPicker";
import EnumAndReferencePickerModal from "../../components/modal/EnumAndReferencePickerModal";
import EmptyState from "../../components/ui/EmptyState";
import {
  getPhuongTien,
  getPhuongTienTracking,
} from "../../services/data/callApi";
import type { HomeNavigationProp } from "../../types";
import { error, log } from "../../utils/Logger";
import { useNetworkAwareReload } from "../../hooks/useNetworkAwareReload";

type Vehicle = Record<string, unknown> & { id?: string | number };
type Stop = Record<string, unknown> & {
  id: number;
  iD_PhuongTien: number;
  stt?: number;
  ngay: string;
  diaChi?: string | null;
  toaDo?: string | null;
  keoDai?: string | null;
  giay?: number | null;
};
type ListResponse<T> = { data?: { items?: T[]; totalCount?: number } };
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

const textOf = (item: Record<string, unknown>, keys: string[]) => {
  for (const key of keys) {
    const value = item[key];
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number") return String(value);
  }
  return "";
};
const vehicleLabel = (item: Vehicle) =>
  textOf(item, ["ten", "Ten", "name", "Name", "label", "bienSo", "BienSo"]) ||
  `Phương tiện ${String(item.id ?? "")}`;
const formatDate = (date: Date) =>
  `${String(date.getDate()).padStart(2, "0")}-${String(
    date.getMonth() + 1
  ).padStart(2, "0")}-${date.getFullYear()}`;
const apiDate = (value: string, timezone = false) => {
  const [day, month, year] = value.split("-");
  const result = `${year}-${month}-${day}T00:00:00`;
  return timezone ? `${result}+07:00` : result;
};
const timeOf = (value: string) => {
  const part = value.includes("T") ? value.split("T")[1] : value;
  return part.slice(0, 5);
};
const dateTitle = (value: string) => {
  const date = new Date(value);
  const days = [
    "CHỦ NHẬT",
    "THỨ HAI",
    "THỨ BA",
    "THỨ TƯ",
    "THỨ NĂM",
    "THỨ SÁU",
    "THỨ BẢY",
  ];
  return Number.isNaN(date.getTime())
    ? value
    : `${days[date.getDay()]}, ${String(date.getDate()).padStart(
        2,
        "0"
      )}/${String(date.getMonth() + 1).padStart(2, "0")}/${date.getFullYear()}`;
};
const stopColor = (seconds = 0) =>
  seconds > 1800 ? "#F44336" : seconds > 600 ? "#FF9800" : "#4CAF50";
const toStopPoint = (item: Stop): StopPoint | null => {
  const [latText, lngText] = item.toaDo?.split(",") ?? [];
  const lat = Number(latText?.trim());
  const lng = Number(lngText?.trim());
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return {
    id: item.id,
    lat,
    lng,
    stt: item.stt,
    time: timeOf(item.ngay),
    address: item.diaChi ?? undefined,
    duration: item.keoDai ?? undefined,
    seconds: item.giay ?? 0,
  };
};

export default function VehicleTrackingScreen() {
  const navigation = useNavigation<HomeNavigationProp>();
  const isFocused = useIsFocused();
  const today = useMemo(() => new Date(), []);
  const firstDay = useMemo(
    () => new Date(today.getFullYear(), today.getMonth(), 1),
    [today]
  );
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [fromDate, setFromDate] = useState(formatDate(firstDay));
  const [toDate, setToDate] = useState(formatDate(today));
  const [stops, setStops] = useState<Stop[]>([]);
  const [expanded, setExpanded] = useState<string[]>([]);
  const [pickerVisible, setPickerVisible] = useState(false);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [stopLoading, setStopLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState(false);

  const pickerItems = useMemo(() => {
    const keyword = search.trim().toLocaleLowerCase("vi");
    const filteredItems = vehicles
      .map((item, index) => ({
        value: String(item.id ?? index),
        text: vehicleLabel(item),
      }))
      .filter(
        (item) =>
          !keyword || item.text.toLocaleLowerCase("vi").includes(keyword)
      );

    return keyword
      ? filteredItems
      : [{ value: "", text: "Phương tiện" }, ...filteredItems];
  }, [search, vehicles]);
  const selectedValue = vehicle
    ? String(vehicle.id ?? vehicles.indexOf(vehicle))
    : null;
  const groups = useMemo(() => {
    const map = new Map<string, Stop[]>();
    stops.forEach((item) => {
      const key = item.ngay.slice(0, 10);
      map.set(key, [...(map.get(key) ?? []), item]);
    });
    return Array.from(map.entries()).sort(([a], [b]) => b.localeCompare(a));
  }, [stops]);
  const stopPoints = useMemo(
    () =>
      stops.map(toStopPoint).filter((item): item is StopPoint => item !== null),
    [stops]
  );

  const loadVehicles = useCallback(async () => {
    const response = await getPhuongTien<ListResponse<Vehicle>>();
    const items = Array.isArray(response?.data?.items)
      ? response.data.items
      : [];
    setVehicles(items);
    setLoadError(false);
  }, []);
  const loadStops = useCallback(async () => {
    if (vehicle?.id === undefined || vehicle?.id === null) {
      setStops([]);
      setLoadError(false);
      return;
    }
    setStopLoading(true);
    try {
      const response = await getPhuongTienTracking<ListResponse<Stop>>(
        vehicle.id,
        apiDate(fromDate),
        apiDate(toDate, true)
      );
      const items = Array.isArray(response?.data?.items)
        ? response.data.items
        : [];
      log("[VehicleTracking] GET_PHUONG_TIEN_TRACKING items", items);
      setStops(items);
      setExpanded(
        Array.from(new Set(items.map((item) => item.ngay.slice(0, 10)))).slice(
          0,
          1
        )
      );
      setLoadError(false);
    } catch (exception) {
      error("[VehicleTracking] GET_PHUONG_TIEN_TRACKING error", exception);
      setStops([]);
      setLoadError(true);
    } finally {
      setStopLoading(false);
    }
  }, [fromDate, toDate, vehicle]);

  useEffect(() => {
    loadVehicles()
      .catch((exception) => {
        error("[VehicleTracking] GET_PHUONG_TIEN error", exception);
        setLoadError(true);
      })
      .finally(() => setLoading(false));
  }, [loadVehicles]);
  useEffect(() => {
    loadStops();
  }, [loadStops]);

  useNetworkAwareReload(
    async () => {
      try {
        await loadVehicles();
        await loadStops();
      } catch (exception) {
        error("[VehicleTracking] network reload error", exception);
        setLoadError(true);
      }
    },
    {
      enabled: isFocused,
      hasError: loadError,
      onOffline: () => {
        setVehicles([]);
        setVehicle(null);
        setStops([]);
        setLoadError(true);
      },
    }
  );

  const refresh = async () => {
    setRefreshing(true);
    await Promise.allSettled([loadVehicles(), loadStops()]);
    setRefreshing(false);
  };
  const openMap = (selectedId?: number) => {
    navigation.navigate("VehicleTrackingMap", {
      stopPoints,
      selectedId,
      titleHeader: "Bản đồ dừng đỗ",
    });
  };

  if (loading)
    return (
      <View style={styles.center}>
        <ActivityIndicator color="#4F46E5" />
        <Text style={styles.loadingText}>Đang tải phương tiện...</Text>
      </View>
    );

  return (
    <View style={styles.root}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={refresh}
            colors={["#4F46E5"]}
          />
        }
      >
        <Text style={styles.label}>Phương tiện</Text>
        <TouchableOpacity
          style={styles.select}
          onPress={() => setPickerVisible(true)}
        >
          <Ionicons name="car-outline" size={20} color="#4F46E5" />
          <Text
            style={[styles.selectText, !vehicle && styles.placeholderText]}
            numberOfLines={1}
          >
            {vehicle ? vehicleLabel(vehicle) : "Phương tiện"}
          </Text>
          <Ionicons name="chevron-down" size={18} color={C.textSecondary} />
        </TouchableOpacity>
        <View style={styles.dateRow}>
          <View style={styles.dateField}>
            <Text style={styles.label}>Từ ngày</Text>
            <DatePicker value={fromDate} onChange={setFromDate} />
          </View>
          <View style={styles.dateField}>
            <Text style={styles.label}>Đến ngày</Text>
            <DatePicker value={toDate} onChange={setToDate} />
          </View>
        </View>
        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.action, styles.close]}
            onPress={() => setExpanded([])}
          >
            <Ionicons name="close-outline" size={18} color="#FFF" />
            <Text style={styles.actionText}>Đóng tất cả</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.action, styles.mapButton]}
            disabled={!stopPoints.length}
            onPress={() => openMap()}
          >
            <Ionicons name="map-outline" size={18} color="#FFF" />
            <Text style={styles.actionText}>Xem bản đồ</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.list}>
          {stopLoading ? (
            <View style={styles.listState}>
              <ActivityIndicator color="#4F46E5" />
            </View>
          ) : loadError ? (
            <EmptyState
              iconName="cloud-offline-outline"
              title="Không thể tải điểm dừng"
              subtitle="Kéo xuống để thử lại."
              fullHeight={false}
              style={styles.listState}
            />
          ) : !groups.length ? (
            <EmptyState
              iconName="location-outline"
              title="Chưa có dữ liệu dừng đỗ"
              subtitle="Thử chọn khoảng thời gian khác."
              fullHeight={false}
              style={styles.listState}
            />
          ) : (
            groups.map(([date, items]) => {
              const opened = expanded.includes(date);
              return (
                <View key={date} style={styles.group}>
                  <TouchableOpacity
                    style={styles.groupHeader}
                    onPress={() =>
                      setExpanded((current) =>
                        current.includes(date)
                          ? current.filter((x) => x !== date)
                          : [...current, date]
                      )
                    }
                  >
                    <Ionicons
                      name="calendar-outline"
                      size={18}
                      color={C.textSecondary}
                    />
                    <Text style={styles.groupDate}>{dateTitle(date)}</Text>
                    <View style={styles.count}>
                      <Text style={styles.countText}>{items.length} ĐIỂM</Text>
                    </View>
                    <Ionicons
                      name={opened ? "chevron-up" : "chevron-down"}
                      size={18}
                      color={C.textSecondary}
                    />
                  </TouchableOpacity>
                  {opened
                    ? items.map((item, index) => {
                        const color = stopColor(item.giay ?? 0);
                        return (
                          <TouchableOpacity
                            key={item.id}
                            style={styles.stopRow}
                            onPress={() => openMap(item.id)}
                          >
                            <View style={styles.lineCol}>
                              <View
                                style={[styles.dot, { borderColor: color }]}
                              />
                              {index < items.length - 1 ? (
                                <View style={styles.line} />
                              ) : null}
                            </View>
                            <View style={styles.stopBody}>
                              <Text style={styles.time}>
                                {timeOf(item.ngay)}
                              </Text>
                              <Text style={styles.address}>
                                {item.diaChi || "Chưa có địa chỉ"}
                              </Text>
                              <View
                                style={[
                                  styles.duration,
                                  { backgroundColor: `${color}18` },
                                ]}
                              >
                                <Ionicons
                                  name="timer-outline"
                                  size={14}
                                  color={color}
                                />
                                <Text style={[styles.durationText, { color }]}>
                                  {item.keoDai || `${item.giay ?? 0}"`}
                                </Text>
                              </View>
                            </View>
                            <Ionicons
                              name="map-outline"
                              size={20}
                              color={C.textSecondary}
                            />
                          </TouchableOpacity>
                        );
                      })
                    : null}
                </View>
              );
            })
          )}
        </View>
      </ScrollView>
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
            setVehicle(null);
            setStops([]);
            setExpanded([]);
            setLoadError(false);
            setPickerVisible(false);
            setSearch("");
            return;
          }
          const index = vehicles.findIndex(
            (item, i) => String(item.id ?? i) === String(value)
          );
          if (index >= 0) setVehicle(vehicles[index]);
          setPickerVisible(false);
          setSearch("");
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.surfaceAlt },
  content: {
    flexGrow: 1,
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 32,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: C.surfaceAlt,
  },
  loadingText: { marginTop: 9, color: C.textSecondary },

  title: { fontSize: 19, fontWeight: "700", color: C.text },
  subtitle: { fontSize: 13, color: C.textSecondary, marginTop: 2 },
  label: { fontSize: 13, fontWeight: "600", color: C.text, marginBottom: 7 },
  select: {
    height: 50,
    borderWidth: 1.5,
    borderColor: "#4F46E5",
    borderRadius: 10,
    backgroundColor: C.surface,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 13,
    marginBottom: 16,
  },
  selectText: { flex: 1, marginHorizontal: 10, fontSize: 15, color: C.text },
  placeholderText: { color: C.textMuted },
  dateRow: { flexDirection: "row", gap: 10, marginBottom: 16 },
  dateField: { flex: 1 },
  actions: { flexDirection: "row", gap: 10, marginBottom: 18 },
  action: {
    flex: 1,
    height: 46,
    borderRadius: 9,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  close: { backgroundColor: "#737373" },
  mapButton: { backgroundColor: "#1976D2" },
  actionText: { color: "#FFF", fontSize: 14, fontWeight: "600" },
  list: {
    flex: 1,
    minHeight: 280,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 14,
    backgroundColor: C.surface,
    overflow: "hidden",
  },
  listState: {
    flex: 1,
    minHeight: 260,
    alignItems: "center",
    justifyContent: "center",
  },
  group: { borderBottomWidth: 1, borderBottomColor: C.border },
  groupHeader: {
    minHeight: 52,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 13,
    backgroundColor: C.surfaceAlt,
    gap: 8,
  },
  groupDate: { flex: 1, color: C.textSecondary, fontSize: 13, fontWeight: "700" },
  count: {
    backgroundColor: C.border,
    borderRadius: 12,
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  countText: { fontSize: 11, fontWeight: "700", color: C.textSecondary },
  stopRow: { flexDirection: "row", paddingHorizontal: 14, paddingTop: 14 },
  lineCol: { width: 25, alignItems: "center" },
  dot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 3,
    backgroundColor: C.surface,
  },
  line: { width: 2, flex: 1, minHeight: 66, backgroundColor: C.border },
  stopBody: { flex: 1, paddingLeft: 5, paddingBottom: 16 },
  time: { fontSize: 13, color: C.textMuted },
  address: { fontSize: 15, fontWeight: "600", color: C.text, marginTop: 6 },
  duration: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginTop: 8,
  },
  durationText: { fontSize: 12, fontWeight: "700" },
});
