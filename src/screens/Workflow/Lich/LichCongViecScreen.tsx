import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import Ionicons from "react-native-vector-icons/Ionicons";

import EmptyState from "../../../components/ui/EmptyState";
import IsLoading from "../../../components/ui/IconLoading";
import { cvGetList } from "../../../services/data/congViecApi";
import { CV_CONG_VIEC_NAME_CLASS } from "../../../services/data/workflowApi";
import type { CongViecItem, StackNavigation } from "../../../types/index";
import { AppColors, useAppColors, useStyles } from "../../../utils/helpers/colors";
import MaMauFilter from "../CongViec/components/MaMauFilter";
import { useWorkflowMe } from "../shared/useWorkflowMe";
import { useWorkflowPermissions } from "../shared/useWorkflowPermissions";
import { useReloadOnWorkflowChange } from "../shared/useWorkflowVersion";
import { isSameDay, startOfDay } from "../shared/workflowDate";
import { getWorkflowErrorMessage } from "../shared/workflowErrors";
import {
  buildRangeConditions,
  dayKey,
  formatRangeLabel,
  formatWeekday,
  getRange,
  groupTasksByDay,
  LichMode,
  shiftAnchor,
} from "./lichHelpers";
import LichTaskRow from "./LichTaskRow";
import MonthGrid from "./MonthGrid";

/** Trần an toàn của tài liệu: lấy hết 1 lần, không phân trang. */
const LICH_PAGE_SIZE = 2000;

/**
 * Lịch công việc tháng / tuần (6-Mobile-Lich-CongViec) — màn gốc của tab Lịch.
 * Không có API lịch riêng: dùng cv-get-list tab "Lich" + 2 điều kiện ngày của
 * đúng khoảng đang hiện. Bấm việc → chi tiết; bấm "+" của một ngày → thêm việc
 * 08:00–17:00 ngày đó.
 */
export default function LichCongViecScreen() {
  const styles = useStyles(makeStyles);
  const c = useAppColors();
  const navigation = useNavigation<StackNavigation<"LichCongViec">>();
  const { loaded, canRead, canInsert } = useWorkflowPermissions(CV_CONG_VIEC_NAME_CLASS);
  const { me } = useWorkflowMe();

  const [mode, setMode] = useState<LichMode>("thang");
  const [anchor, setAnchor] = useState(() => startOfDay(new Date()));
  const [selected, setSelected] = useState(() => startOfDay(new Date()));
  const [mau, setMau] = useState<string[]>([]);
  const [items, setItems] = useState<CongViecItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const requestIdRef = useRef(0);

  const range = useMemo(() => getRange(mode, anchor), [anchor, mode]);
  const tasksByDay = useMemo(() => groupTasksByDay(items, range), [items, range]);

  // Đổi tháng / tuần là gọi lại — không cache chéo khoảng vì việc có thể bị sửa ở web.
  const load = useCallback(
    async (silent = false) => {
      const requestId = ++requestIdRef.current;
      if (!silent) setLoading(true);
      try {
        const result = await cvGetList({
          tab: "Lich",
          mau,
          pageSize: LICH_PAGE_SIZE,
          skipSize: 0,
          conditions: buildRangeConditions(range),
        });
        if (requestId !== requestIdRef.current) return;
        setItems(result.items ?? []);
        setErrorMessage(null);
      } catch (err) {
        if (requestId !== requestIdRef.current) return;
        setErrorMessage(getWorkflowErrorMessage(err, "Không tải được lịch."));
      } finally {
        if (requestId === requestIdRef.current) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    },
    [mau, range],
  );

  useEffect(() => {
    if (loaded && canRead) load();
  }, [canRead, load, loaded]);

  useReloadOnWorkflowChange(() => load(true));

  const go = (step: number) => {
    const next = shiftAnchor(mode, anchor, step);
    setAnchor(next);
    setSelected(mode === "thang" ? next : startOfDay(next));
  };

  const goToday = () => {
    const today = startOfDay(new Date());
    setAnchor(today);
    setSelected(today);
  };

  const switchMode = (next: LichMode) => {
    if (next === mode) return;
    setMode(next);
    setAnchor(selected);
  };

  const canAdd = canInsert && !!me.iD_NhanVien;
  const openTask = (item: CongViecItem) =>
    navigation.navigate("CongViecChiTiet", { id: item.id });
  const addTask = (day: Date) =>
    navigation.navigate("CongViecForm", { mode: "add", ngay: dayKey(day) });

  if (loaded && !canRead) {
    return (
      <EmptyState
        iconName="lock-closed-outline"
        title="Không có quyền"
        subtitle="Bạn không có quyền xem công việc."
      />
    );
  }

  const renderDay = (day: Date, compact = false) => {
    const tasks = tasksByDay.get(dayKey(day)) ?? [];
    const isToday = isSameDay(day, new Date());

    return (
      <View key={dayKey(day)} style={compact ? styles.weekDay : undefined}>
        <View style={styles.dayHeader}>
          <Text style={[styles.dayTitle, isToday && styles.todayTitle]}>
            {formatWeekday(day)}
            {isToday ? " · Hôm nay" : ""}
          </Text>
          <Text style={styles.dayCount}>{tasks.length ? `${tasks.length} việc` : ""}</Text>
          {canAdd ? (
            <TouchableOpacity onPress={() => addTask(day)} hitSlop={8} style={styles.addButton}>
              <Ionicons name="add" size={18} color={c.red} />
            </TouchableOpacity>
          ) : null}
        </View>
        {tasks.length ? (
          tasks.map((task) => (
            <LichTaskRow key={`${dayKey(day)}-${task.id}`} item={task} onPress={() => openTask(task)} />
          ))
        ) : (
          <Text style={styles.noTask}>Không có việc</Text>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.toolbar}>
        <View style={styles.segment}>
          {(["thang", "tuan"] as LichMode[]).map((item) => (
            <TouchableOpacity
              key={item}
              style={[styles.segmentItem, mode === item && styles.segmentActive]}
              onPress={() => switchMode(item)}
            >
              <Text style={[styles.segmentText, mode === item && styles.segmentTextActive]}>
                {item === "thang" ? "Tháng" : "Tuần"}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        <TouchableOpacity onPress={goToday} style={styles.todayButton}>
          <Text style={styles.todayButtonText}>Hôm nay</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.navRow}>
        <TouchableOpacity onPress={() => go(-1)} hitSlop={10} style={styles.navButton}>
          <Ionicons name="chevron-back" size={22} color={c.text} />
        </TouchableOpacity>
        <Text style={styles.rangeLabel}>{formatRangeLabel(mode, anchor, range)}</Text>
        <TouchableOpacity onPress={() => go(1)} hitSlop={10} style={styles.navButton}>
          <Ionicons name="chevron-forward" size={22} color={c.text} />
        </TouchableOpacity>
      </View>

      <MaMauFilter value={mau} onChange={setMau} />

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              load(true);
            }}
          />
        }
      >
        {errorMessage ? <Text style={styles.error}>{errorMessage}</Text> : null}

        {mode === "thang" ? (
          <>
            <MonthGrid
              anchor={anchor}
              range={range}
              tasksByDay={tasksByDay}
              selected={selected}
              onSelect={setSelected}
            />
            <View style={styles.selectedDay}>{renderDay(selected)}</View>
          </>
        ) : (
          range.days.map((day) => renderDay(day, true))
        )}
      </ScrollView>

      {loading ? <IsLoading style={styles.loadingOverlay} /> : null}
    </View>
  );
}

const makeStyles = (c: AppColors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: c.bg,
    },
    toolbar: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      paddingHorizontal: 12,
      paddingTop: 10,
    },
    segment: {
      flex: 1,
      flexDirection: "row",
      backgroundColor: c.surfaceAlt,
      borderRadius: 10,
      padding: 3,
    },
    segmentItem: {
      flex: 1,
      paddingVertical: 7,
      borderRadius: 8,
      alignItems: "center",
    },
    segmentActive: {
      backgroundColor: c.surface,
    },
    segmentText: {
      fontSize: 14,
      fontWeight: "600",
      color: c.textSub,
    },
    segmentTextActive: {
      color: c.red,
    },
    todayButton: {
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: c.red,
    },
    todayButtonText: {
      fontSize: 13,
      fontWeight: "700",
      color: c.red,
    },
    navRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 8,
      paddingVertical: 6,
    },
    navButton: {
      width: 40,
      height: 36,
      alignItems: "center",
      justifyContent: "center",
    },
    rangeLabel: {
      fontSize: 16,
      fontWeight: "700",
      color: c.text,
    },
    content: {
      paddingHorizontal: 12,
      paddingBottom: 24,
    },
    error: {
      fontSize: 13,
      color: c.red,
      marginBottom: 8,
    },
    selectedDay: {
      marginTop: 14,
    },
    weekDay: {
      marginBottom: 12,
    },
    dayHeader: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: 6,
      gap: 8,
    },
    dayTitle: {
      fontSize: 14,
      fontWeight: "700",
      color: c.text,
    },
    todayTitle: {
      color: c.red,
    },
    dayCount: {
      flex: 1,
      fontSize: 12,
      color: c.textSub,
    },
    addButton: {
      width: 30,
      height: 30,
      borderRadius: 15,
      backgroundColor: c.redSurface,
      alignItems: "center",
      justifyContent: "center",
    },
    noTask: {
      fontSize: 13,
      color: c.textMuted,
      paddingVertical: 6,
    },
    loadingOverlay: {
      ...StyleSheet.absoluteFillObject,
      top: 110,
      backgroundColor: "transparent",
    },
  });
