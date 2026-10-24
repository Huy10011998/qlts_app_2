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
import { cvGetList } from "../../../services/data/congViecApi";
import { CV_CONG_VIEC_NAME_CLASS } from "../../../services/data/workflowApi";
import type { CongViecItem, StackNavigation } from "../../../types/index";
import { AppColors, useAppColors, useStyles } from "../../../utils/helpers/colors";
import MaMauFilter from "../CongViec/components/MaMauFilter";
import { useWorkflowMe } from "../shared/useWorkflowMe";
import { useWorkflowPermissions } from "../shared/useWorkflowPermissions";
import { useReloadOnWorkflowChange } from "../shared/useWorkflowVersion";
import { formatDay, isSameDay, startOfDay } from "../shared/workflowDate";
import { getWorkflowErrorMessage } from "../shared/workflowErrors";
import {
  buildRangeConditions,
  dayKey,
  formatRangeLabel,
  formatWeekday,
  formatWeekdayName,
  formatWeekdayShort,
  getRange,
  groupTasksByDay,
  isRangeLoaded,
  LichLoaded,
  LichMode,
  shiftAnchor,
  toMauKey,
} from "./lichHelpers";
import LichTaskRow, { LichTaskRowSkeleton } from "./LichTaskRow";
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
  const loadRef = useRef<{ requestId: number; loaded: LichLoaded | null }>({
    requestId: 0,
    loaded: null,
  });

  const range = useMemo(() => getRange(mode, anchor), [anchor, mode]);
  const tasksByDay = useMemo(() => groupTasksByDay(items, range), [items, range]);

  // Đổi tháng / tuần là gọi lại — không cache chéo khoảng vì việc có thể bị sửa ở web.
  // Khoảng mới nằm trong khoảng vừa tải (Tháng → Tuần cùng lưới) thì việc đã đủ
  // trên màn: tải lại ngầm CẢ khoảng cũ, quay về Tháng cũng khỏi chờ. Khoảng mới
  // thật (sang tháng / tuần khác, đổi lọc màu) mới hiện trạng thái chờ ở ngày trống.
  const load = useCallback(
    async (silent = false) => {
      const state = loadRef.current;
      const requestId = ++state.requestId;
      const covered = isRangeLoaded(state.loaded, range, mau);
      const fetchRange = covered && state.loaded ? state.loaded : range;
      if (!silent && !covered) setLoading(true);
      try {
        const result = await cvGetList({
          tab: "Lich",
          mau,
          pageSize: LICH_PAGE_SIZE,
          skipSize: 0,
          conditions: buildRangeConditions(fetchRange),
        });
        if (requestId !== state.requestId) return;
        state.loaded = { from: fetchRange.from, to: fetchRange.to, mau: toMauKey(mau) };
        setItems(result.items ?? []);
        setErrorMessage(null);
      } catch (err) {
        if (requestId !== state.requestId) return;
        setErrorMessage(getWorkflowErrorMessage(err, "Không tải được lịch."));
      } finally {
        if (requestId === state.requestId) {
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

  /**
   * Thẻ một ngày (cả danh sách Tuần lẫn ngày đang chọn dưới lưới Tháng): ô ngày
   * kiểu tờ lịch bên trái, tên thứ + số việc ở giữa, nút + bên phải; việc của
   * ngày xếp bên dưới. Ngày trống chỉ còn một dòng, chạm vào đâu cũng thêm việc.
   */
  const renderDay = (day: Date, compact = false) => {
    const tasks = tasksByDay.get(dayKey(day)) ?? [];
    const today = startOfDay(new Date());
    const isToday = isSameDay(day, today);
    const isPast = !isToday && day < today;
    const isSunday = day.getDay() === 0;
    const isEmpty = !tasks.length && !loading;

    const header = (
      <View style={styles.dayHeader}>
        <View style={[styles.dateBadge, isToday && styles.dateBadgeToday]}>
          <Text
            style={[
              styles.dateBadgeWeekday,
              isSunday && styles.sundayText,
              isToday && styles.dateBadgeTextToday,
            ]}
          >
            {formatWeekdayShort(day)}
          </Text>
          <Text
            style={[
              styles.dateBadgeDay,
              isPast && styles.pastText,
              isToday && styles.dateBadgeTextToday,
            ]}
          >
            {day.getDate()}
          </Text>
        </View>

        <View style={styles.dayInfo}>
          <View style={styles.dayNameRow}>
            <Text style={[styles.dayName, isPast && styles.pastText]} numberOfLines={1}>
              {formatWeekdayName(day)}
            </Text>
            {isToday ? (
              <View style={styles.todayPill}>
                <Text style={styles.todayPillText}>Hôm nay</Text>
              </View>
            ) : null}
          </View>
          {/* Ngày không kèm năm: năm đã có trên thanh tháng / tuần phía trên. */}
          <Text style={styles.daySub} numberOfLines={1}>
            {formatDay(day).slice(0, 5)}
            {" · "}
            {tasks.length ? (
              <Text style={styles.dayCountStrong}>{`${tasks.length} việc`}</Text>
            ) : loading ? (
              "Đang tải…"
            ) : (
              // Không ghi "Bấm để thêm": nút + bên phải đã nói điều đó.
              "Chưa có việc"
            )}
          </Text>
        </View>

        {canAdd ? (
          <TouchableOpacity
            onPress={() => addTask(day)}
            hitSlop={8}
            style={styles.addButton}
            accessibilityRole="button"
            accessibilityLabel={`Thêm việc ${formatWeekday(day)}`}
          >
            <Ionicons name="add" size={20} color={c.red} />
          </TouchableOpacity>
        ) : null}
      </View>
    );

    return (
      <View
        key={dayKey(day)}
        style={[styles.dayCard, isToday && styles.dayCardToday, compact && styles.weekDay]}
      >
        {isEmpty && canAdd ? (
          <TouchableOpacity activeOpacity={0.7} onPress={() => addTask(day)}>
            {header}
          </TouchableOpacity>
        ) : (
          header
        )}

        {tasks.length ? (
          <View style={[styles.taskList, { borderTopColor: c.separator }]}>
            {tasks.map((task) => (
              <LichTaskRow
                key={`${dayKey(day)}-${task.id}`}
                item={task}
                onPress={() => openTask(task)}
              />
            ))}
          </View>
        ) : loading && !compact ? (
          /* Chỉ ngày đang chọn dưới lưới Tháng có việc giả: thẻ này nằm cuối
             màn, ngày trống thì nó co lại mà không kéo gì phía dưới theo.
             Danh sách Tuần thì không: 7 thẻ xếp chồng, mỗi ngày trống mất ~100pt
             (gạch + một việc giả) là cả tuần co lại vài trăm pt. Để mỗi thẻ
             ngày chỉ "Đang tải…" — ngày có việc giãn ra khi dữ liệu về, ngày
             trống đứng yên, không chỗ nào hứa một việc rồi rút lại. */
          <View style={[styles.taskList, { borderTopColor: c.separator }]}>
            <LichTaskRowSkeleton rows={2} />
          </View>
        ) : null}
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

      {/* Tab "Lich" = mọi việc TRỪ việc Hủy (6-Mobile-Lich mục 1) — chip Hủy chỉ ra lịch trống. */}
      <MaMauFilter value={mau} onChange={setMau} exclude={["Huy"]} />

      {/* key theo khoảng: đổi Tháng / Tuần hay sang kỳ khác thì cuộn về đầu, khỏi
          giữ vị trí cuộn của nội dung cũ (ngày đầu tuần bị khuất). */}
      <ScrollView
        key={`${mode}-${dayKey(range.from)}`}
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
    // Thẻ một ngày: viền 1pt + mép trên 3pt như card Trang chủ. Hôm nay đỏ,
    // ngày khác xám đậm — `slateBorder` cũ gần trùng màu nền, nhìn như không viền.
    dayCard: {
      backgroundColor: c.surface,
      borderRadius: 16,
      padding: 12,
      borderWidth: 1,
      borderTopWidth: 3,
      borderColor: c.borderStrong,
      shadowColor: c.shadow,
      shadowOpacity: 0.06,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 3 },
      elevation: 2,
    },
    dayCardToday: {
      borderColor: c.red,
    },
    weekDay: {
      marginBottom: 10,
    },
    dayHeader: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
    },
    // Ô ngày kiểu tờ lịch: thứ viết tắt ở trên, số ngày to ở dưới.
    dateBadge: {
      width: 48,
      height: 52,
      borderRadius: 12,
      backgroundColor: c.surfaceAlt,
      alignItems: "center",
      justifyContent: "center",
    },
    dateBadgeToday: {
      backgroundColor: c.red,
    },
    dateBadgeWeekday: {
      fontSize: 11,
      fontWeight: "700",
      color: c.textSub,
    },
    dateBadgeDay: {
      fontSize: 19,
      fontWeight: "800",
      color: c.text,
      marginTop: 1,
    },
    dateBadgeTextToday: {
      color: "#fff",
    },
    sundayText: {
      color: c.red,
    },
    // Ngày đã qua nhạt đi một nấc — vẫn đọc được, nhưng mắt bám vào hôm nay và
    // các ngày tới trước.
    pastText: {
      color: c.textMuted,
    },
    dayInfo: {
      flex: 1,
      minWidth: 0,
    },
    dayNameRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
    },
    dayName: {
      flexShrink: 1,
      fontSize: 15,
      fontWeight: "700",
      color: c.text,
    },
    todayPill: {
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 999,
      backgroundColor: c.redSurface,
    },
    todayPillText: {
      fontSize: 11,
      fontWeight: "700",
      color: c.red,
    },
    daySub: {
      fontSize: 12.5,
      color: c.textSub,
      marginTop: 3,
    },
    dayCountStrong: {
      fontWeight: "700",
      color: c.text,
    },
    addButton: {
      width: 34,
      height: 34,
      borderRadius: 17,
      backgroundColor: c.redSurface,
      alignItems: "center",
      justifyContent: "center",
    },
    taskList: {
      marginTop: 12,
      paddingTop: 12,
      borderTopWidth: StyleSheet.hairlineWidth,
    },
  });
