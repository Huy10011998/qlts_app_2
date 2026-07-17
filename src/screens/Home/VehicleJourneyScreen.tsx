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
import Ionicons from "react-native-vector-icons/Ionicons";
import { useIsFocused, useNavigation } from "@react-navigation/native";
import {
  getPhuongTien,
  getPhuongTienHanhTrinh,
  getPhuongTienHanhTrinhGps,
} from "../../services/data/callApi";
import { error, log } from "../../utils/Logger";
import { DatePicker } from "../../components/dataPicker/DataPicker";
import EmptyState from "../../components/ui/EmptyState";
import EnumAndReferencePickerModal from "../../components/modal/EnumAndReferencePickerModal";
import type { HomeNavigationProp } from "../../types";
import { useNetworkAwareReload } from "../../hooks/useNetworkAwareReload";

type VehicleRecord = Record<string, unknown> & { id?: string | number };
type JourneyRecord = Record<string, unknown> & {
  id: number;
  iD_PhuongTien: number;
  iD_PhuongTien_MoTa?: string | null;
  stt?: number | null;
  ngay: string;
  thoiGianBD?: string | null;
  thoiGianKT?: string | null;
  diaChi_BD?: string | null;
  diaChi_KT?: string | null;
  toaDo_BD?: string | null;
  toaDo_KT?: string | null;
  kmDi?: number | null;
  vanTocTB?: number | null;
  vanTocMax?: number | null;
  keoDai?: string | null;
  giay?: number | null;
};

type VehicleListResponse = {
  data?: {
    items?: VehicleRecord[];
    totalCount?: number;
  };
};
type JourneyListResponse = {
  data?: { items?: JourneyRecord[]; totalCount?: number };
};
type GpsRecord = Record<string, unknown> & {
  id?: number;
  lat?: number;
  lng?: number;
  thoiGian?: string | null;
};
type GpsListResponse = {
  data?: { items?: GpsRecord[]; totalCount?: number };
};
type MapCoordinate = { lat: number; lng: number };

const getText = (item: VehicleRecord, keys: string[]) => {
  for (const key of keys) {
    const value = item[key];
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number") return String(value);
  }
  return "";
};

const getVehicleLabel = (item: VehicleRecord) => {
  const name = getText(item, ["ten", "Ten", "name", "Name", "label"]);
  const plate = getText(item, [
    "bienSo",
    "BienSo",
    "bienSoXe",
    "BienSoXe",
    "soXe",
    "SoXe",
  ]);

  if (name && plate && !name.includes(plate)) return `${name} ${plate}`;
  return name || plate || `Phương tiện ${String(item.id ?? "")}`.trim();
};

const formatDate = (date: Date) => {
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${day}-${month}-${date.getFullYear()}`;
};

const toApiDate = (value: string, withTimezone = false) => {
  const [day, month, year] = value.split("-");
  const date = `${year}-${month}-${day}T00:00:00`;
  return withTimezone ? `${date}+07:00` : date;
};

const getJourneyDate = (item: JourneyRecord) =>
  getText(item, ["ngay", "Ngay", "date", "Date", "ngayHanhTrinh"]);

const getJourneyTime = (item: JourneyRecord, start: boolean) => {
  const value = getText(
    item,
    start
      ? ["thoiGianBD", "gioBatDau", "GioBatDau", "startTime"]
      : ["thoiGianKT", "gioKetThuc", "GioKetThuc", "endTime"]
  );
  const timePart = value.includes("T") ? value.split("T")[1] : value;
  return timePart.slice(0, 5);
};

const formatGroupDate = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value || "Không rõ ngày";
  const weekdays = [
    "CHỦ NHẬT",
    "THỨ HAI",
    "THỨ BA",
    "THỨ TƯ",
    "THỨ NĂM",
    "THỨ SÁU",
    "THỨ BẢY",
  ];
  return `${weekdays[date.getDay()]}, ${String(date.getDate()).padStart(
    2,
    "0"
  )}/${String(date.getMonth() + 1).padStart(2, "0")}/${date.getFullYear()}`;
};

const parseCoordinate = (value?: string | null): MapCoordinate | null => {
  const [latText, lngText] = value?.split(",") ?? [];
  const lat = Number(latText?.trim());
  const lng = Number(lngText?.trim());
  return Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : null;
};

export default function VehicleJourneyScreen() {
  const navigation = useNavigation<HomeNavigationProp>();
  const isFocused = useIsFocused();
  const today = useMemo(() => new Date(), []);
  const firstDay = useMemo(
    () => new Date(today.getFullYear(), today.getMonth(), 1),
    [today]
  );
  const [vehicles, setVehicles] = useState<VehicleRecord[]>([]);
  const [selectedVehicle, setSelectedVehicle] = useState<VehicleRecord | null>(
    null
  );
  const [fromDate, setFromDate] = useState(formatDate(firstDay));
  const [toDate, setToDate] = useState(formatDate(today));
  const [pickerVisible, setPickerVisible] = useState(false);
  const [vehicleSearch, setVehicleSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [journeys, setJourneys] = useState<JourneyRecord[]>([]);
  const [journeyLoading, setJourneyLoading] = useState(false);
  const [journeyError, setJourneyError] = useState(false);
  const [expandedDates, setExpandedDates] = useState<string[]>([]);
  const [gpsLoadingJourneyId, setGpsLoadingJourneyId] = useState<number | null>(
    null
  );
  const vehicleModalItems = useMemo(() => {
    const keyword = vehicleSearch.trim().toLocaleLowerCase("vi");

    const filteredItems = vehicles
      .map((item, index) => ({
        value: String(item.id ?? index),
        text: getVehicleLabel(item),
      }))
      .filter(
        (item) =>
          !keyword || item.text.toLocaleLowerCase("vi").includes(keyword)
      );

    return keyword
      ? filteredItems
      : [{ value: "", text: "Phương tiện" }, ...filteredItems];
  }, [vehicleSearch, vehicles]);
  const selectedVehicleValue = useMemo(() => {
    if (!selectedVehicle) return null;
    const index = vehicles.indexOf(selectedVehicle);
    return String(selectedVehicle.id ?? index);
  }, [selectedVehicle, vehicles]);
  const journeyGroups = useMemo(() => {
    const groups = new Map<string, JourneyRecord[]>();
    journeys.forEach((item) => {
      const key = getJourneyDate(item).slice(0, 10) || "unknown";
      groups.set(key, [...(groups.get(key) ?? []), item]);
    });
    return Array.from(groups.entries()).sort(([a], [b]) => b.localeCompare(a));
  }, [journeys]);

  const fetchVehicles = useCallback(async (refresh = false) => {
    refresh ? setRefreshing(true) : setLoading(true);

    try {
      const response = await getPhuongTien<VehicleListResponse>();
      const items = Array.isArray(response?.data?.items)
        ? response.data.items
        : [];

      log("[VehicleJourney] GET_PHUONG_TIEN response items", items);
      setVehicles(items);
      setLoadError(false);
    } catch (exception) {
      error("[VehicleJourney] GET_PHUONG_TIEN error", exception);
      setLoadError(true);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchVehicles();
  }, [fetchVehicles]);

  const fetchJourneys = useCallback(async () => {
    if (selectedVehicle?.id === undefined || selectedVehicle?.id === null) {
      setJourneys([]);
      setJourneyError(false);
      return;
    }
    setJourneyLoading(true);
    try {
      const response = await getPhuongTienHanhTrinh<JourneyListResponse>(
        selectedVehicle.id,
        toApiDate(fromDate),
        toApiDate(toDate, true)
      );
      const items = Array.isArray(response?.data?.items)
        ? response.data.items
        : [];
      log("[VehicleJourney] GET_PHUONG_TIEN_HANH_TRINH items", items);
      setJourneys(items);
      const dates = Array.from(
        new Set(items.map((item) => getJourneyDate(item).slice(0, 10)))
      ).filter(Boolean);
      setExpandedDates(dates.slice(0, 1));
      setJourneyError(false);
    } catch (exception) {
      error("[VehicleJourney] GET_PHUONG_TIEN_HANH_TRINH error", exception);
      setJourneys([]);
      setJourneyError(true);
    } finally {
      setJourneyLoading(false);
    }
  }, [fromDate, selectedVehicle, toDate]);

  useEffect(() => {
    fetchJourneys();
  }, [fetchJourneys]);

  useNetworkAwareReload(
    () => Promise.allSettled([fetchVehicles(), fetchJourneys()]).then(() => {}),
    {
      enabled: isFocused,
      hasError: loadError || journeyError,
      onOffline: () => {
        setVehicles([]);
        setSelectedVehicle(null);
        setJourneys([]);
        setLoadError(true);
        setJourneyError(true);
      },
    }
  );

  const openJourneyMap = useCallback(
    async (item: JourneyRecord) => {
      setGpsLoadingJourneyId(item.id);
      try {
        const response = await getPhuongTienHanhTrinhGps<GpsListResponse>(
          item.id
        );
        const gpsItems = Array.isArray(response?.data?.items)
          ? [...response.data.items].sort((a, b) =>
              getText(a, ["thoiGian", "ThoiGian"]).localeCompare(
                getText(b, ["thoiGian", "ThoiGian"])
              )
            )
          : [];
        const coordinates = gpsItems
          .map((gps) => ({
            lat: Number(gps.lat ?? gps.Lat),
            lng: Number(gps.lng ?? gps.Lng),
          }))
          .filter(
            (point) => Number.isFinite(point.lat) && Number.isFinite(point.lng)
          );
        const fallback = [
          parseCoordinate(item.toaDo_BD),
          parseCoordinate(item.toaDo_KT),
        ].filter((point): point is MapCoordinate => point !== null);

        log("[VehicleJourney] GET_PHUONG_TIEN_HANH_TRINH_GPS items", gpsItems);
        const mapCoordinates = coordinates.length ? coordinates : fallback;
        navigation.navigate("VehicleJourneyMap", {
          coordinates: mapCoordinates,
          titleHeader: `Hành trình #${item.stt ?? item.id}`,
        });
      } catch (exception) {
        error(
          "[VehicleJourney] GET_PHUONG_TIEN_HANH_TRINH_GPS error",
          exception
        );
        const fallback = [
          parseCoordinate(item.toaDo_BD),
          parseCoordinate(item.toaDo_KT),
        ].filter((point): point is MapCoordinate => point !== null);
        navigation.navigate("VehicleJourneyMap", {
          coordinates: fallback,
          titleHeader: `Hành trình #${item.stt ?? item.id}`,
        });
      } finally {
        setGpsLoadingJourneyId(null);
      }
    },
    [navigation]
  );

  const refreshAll = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([fetchVehicles(true), fetchJourneys()]);
    setRefreshing(false);
  }, [fetchJourneys, fetchVehicles]);

  if (loading) {
    return (
      <View style={styles.centerState}>
        <ActivityIndicator color="#4F46E5" />
        <Text style={styles.loadingText}>Đang tải phương tiện...</Text>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={refreshAll}
            colors={["#4F46E5"]}
          />
        }
      >
        <Text style={styles.fieldLabel}>Phương tiện</Text>
        <TouchableOpacity
          style={styles.selectField}
          activeOpacity={0.75}
          onPress={() => setPickerVisible(true)}
        >
          <Ionicons name="car-outline" size={20} color="#4F46E5" />
          <Text
            style={[
              styles.selectText,
              !selectedVehicle && styles.placeholderText,
            ]}
            numberOfLines={1}
          >
            {selectedVehicle ? getVehicleLabel(selectedVehicle) : "Phương tiện"}
          </Text>
          <Ionicons name="chevron-down" size={18} color={C.textSecondary} />
        </TouchableOpacity>

        <View style={styles.dateRow}>
          <View style={styles.dateField}>
            <Text style={styles.fieldLabel}>Từ ngày</Text>
            <DatePicker value={fromDate} onChange={setFromDate} />
          </View>
          <View style={styles.dateField}>
            <Text style={styles.fieldLabel}>Đến ngày</Text>
            <DatePicker value={toDate} onChange={setToDate} />
          </View>
        </View>

        <View style={styles.actionRow}>
          <TouchableOpacity
            style={[styles.actionButton, styles.closeButton]}
            onPress={() => setExpandedDates([])}
          >
            <Ionicons name="close-outline" size={19} color="#FFFFFF" />
            <Text style={styles.actionText}>Đóng tất cả</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.journeyArea}>
          {loadError ? (
            <EmptyState
              iconName="cloud-offline-outline"
              title="Không thể tải phương tiện"
              subtitle="Kéo xuống để thử lại."
              fullHeight={false}
              style={styles.journeyLoading}
            />
          ) : journeyError ? (
            <EmptyState
              iconName="cloud-offline-outline"
              title="Không thể tải hành trình"
              subtitle="Kéo xuống để thử lại."
              fullHeight={false}
              style={styles.journeyLoading}
            />
          ) : journeyLoading ? (
            <View style={styles.journeyLoading}>
              <ActivityIndicator color="#4F46E5" />
              <Text style={styles.loadingText}>Đang tải hành trình...</Text>
            </View>
          ) : vehicles.length === 0 ? (
            <EmptyState
              iconName="car-outline"
              title="Chưa có phương tiện theo dõi"
              subtitle="Không tìm thấy phương tiện có ID Tracking."
              fullHeight={false}
              style={styles.journeyLoading}
            />
          ) : journeyGroups.length === 0 ? (
            <EmptyState
              iconName="git-branch-outline"
              title="Chưa có dữ liệu hành trình"
              subtitle="Thử chọn phương tiện hoặc khoảng thời gian khác."
              fullHeight={false}
              style={styles.journeyLoading}
            />
          ) : (
            journeyGroups.map(([date, items]) => {
              const expanded = expandedDates.includes(date);
              return (
                <View key={date} style={styles.journeyGroup}>
                  <TouchableOpacity
                    style={styles.groupHeader}
                    onPress={() =>
                      setExpandedDates((current) =>
                        current.includes(date)
                          ? current.filter((value) => value !== date)
                          : [...current, date]
                      )
                    }
                  >
                    <Ionicons
                      name="calendar-outline"
                      size={18}
                      color={C.textSecondary}
                    />
                    <Text style={styles.groupDate}>
                      {formatGroupDate(date)}
                    </Text>
                    <View style={styles.tripCountBadge}>
                      <Text style={styles.tripCountText}>
                        {items.length} CHUYẾN
                      </Text>
                    </View>
                    <Ionicons
                      name={expanded ? "chevron-up" : "chevron-down"}
                      size={18}
                      color={C.textSecondary}
                    />
                  </TouchableOpacity>
                  {expanded
                    ? items.map((item, index) => {
                        const startAddress = getText(item, [
                          "diaChi_BD",
                          "diaChiBatDau",
                          "DiaChiBatDau",
                          "startAddress",
                        ]);
                        const endAddress = getText(item, [
                          "diaChi_KT",
                          "diaChiKetThuc",
                          "DiaChiKetThuc",
                          "endAddress",
                        ]);
                        const distanceValue = getText(item, [
                          "kmDi",
                          "quangDuong",
                          "QuangDuong",
                          "distance",
                        ]);
                        const distance = distanceValue
                          ? `${distanceValue.replace(".", ",")} km`
                          : "";
                        const duration = getText(item, [
                          "keoDai",
                          "thoiGian",
                          "ThoiGian",
                          "duration",
                        ]);
                        return (
                          <TouchableOpacity
                            key={String(item.id ?? `${date}-${index}`)}
                            style={[
                              styles.tripRow,
                              gpsLoadingJourneyId === item.id &&
                                styles.tripRowSelected,
                            ]}
                            activeOpacity={0.8}
                            disabled={gpsLoadingJourneyId !== null}
                            onPress={() => openJourneyMap(item)}
                          >
                            <View style={styles.timelineColumn}>
                              <View style={styles.timelineDot} />
                              {index < items.length - 1 ? (
                                <View style={styles.timelineLine} />
                              ) : null}
                            </View>
                            <View style={styles.tripContent}>
                              <View style={styles.tripTimeRow}>
                                <Ionicons
                                  name="time-outline"
                                  size={15}
                                  color={C.textMuted}
                                />
                                <Text style={styles.tripTime}>
                                  {getJourneyTime(item, true) || "--:--"} –{" "}
                                  {getJourneyTime(item, false) || "--:--"}
                                </Text>
                              </View>
                              <Text
                                style={styles.startAddress}
                                numberOfLines={2}
                              >
                                {startAddress || "Chưa có địa chỉ bắt đầu"}
                              </Text>
                              <Text style={styles.endAddress} numberOfLines={2}>
                                → {endAddress || "Chưa có địa chỉ kết thúc"}
                              </Text>
                              <View style={styles.metricRow}>
                                {distance ? (
                                  <View style={styles.distanceBadge}>
                                    <Ionicons
                                      name="speedometer-outline"
                                      size={14}
                                      color="#1976D2"
                                    />
                                    <Text style={styles.distanceText}>
                                      {distance}
                                    </Text>
                                  </View>
                                ) : null}
                                {duration ? (
                                  <View style={styles.durationBadge}>
                                    <Ionicons
                                      name="timer-outline"
                                      size={14}
                                      color="#2E7D32"
                                    />
                                    <Text style={styles.durationText}>
                                      {duration}
                                    </Text>
                                  </View>
                                ) : null}
                              </View>
                              {gpsLoadingJourneyId === item.id ? (
                                <View style={styles.tripLoadingRow}>
                                  <ActivityIndicator
                                    size="small"
                                    color="#1976D2"
                                  />
                                  <Text style={styles.tripLoadingText}>
                                    Đang mở bản đồ...
                                  </Text>
                                </View>
                              ) : null}
                            </View>
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
        items={vehicleModalItems}
        selectedValue={selectedVehicleValue}
        total={vehicleModalItems.filter((item) => item.value !== "").length}
        loadedCount={
          vehicleModalItems.filter((item) => item.value !== "").length
        }
        onClose={() => {
          setPickerVisible(false);
          setVehicleSearch("");
        }}
        onSearch={setVehicleSearch}
        onSelect={(value) => {
          if (String(value) === "") {
            setSelectedVehicle(null);
            setJourneys([]);
            setExpandedDates([]);
            setJourneyError(false);
            setPickerVisible(false);
            setVehicleSearch("");
            return;
          }
          const selectedIndex = vehicles.findIndex(
            (item, index) => String(item.id ?? index) === String(value)
          );
          if (selectedIndex >= 0) setSelectedVehicle(vehicles[selectedIndex]);
          setPickerVisible(false);
          setVehicleSearch("");
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
  centerState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: C.surfaceAlt,
  },
  loadingText: { marginTop: 10, color: C.textSecondary, fontSize: 14 },

  fieldLabel: {
    color: C.text,
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 7,
  },
  selectField: {
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
  selectText: { flex: 1, color: C.text, fontSize: 15, marginHorizontal: 10 },
  placeholderText: { color: C.textMuted },
  dateRow: { flexDirection: "row", gap: 10, marginBottom: 16 },
  dateField: { flex: 1 },
  actionRow: { flexDirection: "row", gap: 10, marginBottom: 18 },
  actionButton: {
    flex: 1,
    height: 46,
    borderRadius: 9,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  closeButton: { backgroundColor: "#737373" },
  actionText: { color: "#FFFFFF", fontSize: 14, fontWeight: "600" },
  journeyArea: {
    flex: 1,
    minHeight: 300,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 14,
    backgroundColor: C.surface,
    overflow: "hidden",
  },
  journeyLoading: {
    flex: 1,
    minHeight: 260,
    alignItems: "center",
    justifyContent: "center",
  },
  journeyGroup: { borderBottomWidth: 1, borderBottomColor: C.border },
  groupHeader: {
    minHeight: 52,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 13,
    backgroundColor: C.surfaceAlt,
    gap: 8,
  },
  groupDate: { flex: 1, color: C.textSecondary, fontSize: 13, fontWeight: "700" },
  tripCountBadge: {
    backgroundColor: C.border,
    borderRadius: 12,
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  tripCountText: { color: C.textSecondary, fontSize: 11, fontWeight: "700" },
  tripRow: { flexDirection: "row", paddingHorizontal: 14, paddingTop: 14 },
  tripRowSelected: { backgroundColor: C.accentLight },
  timelineColumn: { width: 25, alignItems: "center" },
  timelineDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 3,
    borderColor: "#22C55E",
    backgroundColor: C.surface,
  },
  timelineLine: {
    width: 2,
    flex: 1,
    minHeight: 76,
    backgroundColor: C.border,
  },
  tripContent: { flex: 1, paddingLeft: 5, paddingBottom: 16 },
  tripTimeRow: { flexDirection: "row", alignItems: "center", gap: 5 },
  tripTime: { color: C.textMuted, fontSize: 13 },
  startAddress: {
    color: C.text,
    fontSize: 15,
    fontWeight: "600",
    marginTop: 7,
  },
  endAddress: { color: C.textMuted, fontSize: 13, marginTop: 5 },
  metricRow: { flexDirection: "row", flexWrap: "wrap", gap: 7, marginTop: 9 },
  distanceBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: C.blueSurface,
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  durationBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: C.greenLight,
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  distanceText: { color: "#1976D2", fontSize: 12, fontWeight: "700" },
  durationText: { color: "#2E7D32", fontSize: 12, fontWeight: "700" },
  tripLoadingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    marginTop: 10,
  },
  tripLoadingText: { color: "#1976D2", fontSize: 12, fontWeight: "600" },
});
