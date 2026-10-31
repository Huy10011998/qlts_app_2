import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Animated,
  Dimensions,
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
import { cvGetList, cvThongTin } from "../../../services/data/congViecApi";
import { CV_CONG_VIEC_NAME_CLASS } from "../../../services/data/workflowApi";
import type {
  CongViecItem,
  CongViecThongTin,
  StackNavigation,
} from "../../../types/index";
import {
  AppColors,
  useAppColors,
  useStyles,
} from "../../../utils/helpers/colors";
import CongViecLichSuSheet, {
  LichSuSheetMode,
} from "../CongViec/components/CongViecLichSuSheet";
import CongViecQuickActionMenu, {
  QuickActionAnchor,
} from "../CongViec/components/CongViecQuickActionMenu";
import MaMauFilter from "../CongViec/components/MaMauFilter";
import { useWorkflowMe } from "../shared/useWorkflowMe";
import { useWorkflowPermissions } from "../shared/useWorkflowPermissions";
import { useReloadOnWorkflowChange } from "../shared/useWorkflowVersion";
import { CV_MA_MAU, getMaMauColor } from "../shared/workflowConstants";
import { useOnWorkflowInfoStale } from "../shared/workflowInfoRefresh";
import { formatDay, isSameDay, startOfDay } from "../shared/workflowDate";
import { getWorkflowErrorMessage } from "../shared/workflowErrors";
import {
  buildRangeConditions,
  countDeadlines,
  countTasksByMau,
  dayKey,
  formatRangeLabel,
  formatWeekday,
  formatWeekdayName,
  formatWeekdayShort,
  getNowLineIndex,
  getRange,
  groupTasksByDay,
  pickSelectedDay,
  isRangeLoaded,
  LichLoaded,
  LichMode,
  shiftAnchor,
  toMauKey,
} from "./lichHelpers";
import { formatAmLich, getAmLich, getNgayLe } from "./amLich";
import LichFadeIn from "./LichFadeIn";
import { selectionHaptic } from "./lichHaptic";
import LichNowLine from "./LichNowLine";
import LichRangeLabel from "./LichRangeLabel";
import { getSavedLichMode, saveLichMode } from "./lichModeStore";
import LichModeTabs from "./LichModeTabs";
import { slideToPeriod } from "./lichSlide";
import LichSwipeArea from "./LichSwipeArea";
import LichTaskRow, { LichTaskRowSkeleton } from "./LichTaskRow";
import LichTodayIcon from "./LichTodayIcon";
import TabBarSpacer from "../../../navigation/shared/TabBarSpacer";
import { useHideTabBarOnScroll } from "../../../navigation/shared/tabBarAutoHide";
import MonthGrid from "./MonthGrid";

/** Trần an toàn của tài liệu: lấy hết 1 lần, không phân trang. */
const LICH_PAGE_SIZE = 2000;

/**
 * Lịch công việc tháng / tuần (6-Mobile-Lich-CongViec) — màn gốc của tab Lịch.
 * Không có API lịch riêng: dùng cv-get-list tab "Lich" + 2 điều kiện ngày của
 * đúng khoảng đang hiện. Bấm việc → chi tiết; bấm "+" của một ngày → thêm việc
 * 08:00–17:00 ngày đó; bấm ⋯ của việc → thao tác nhanh; icon ở chân việc →
 * Bình luận / Đính kèm / Lịch sử / Gia hạn.
 */
export default function LichCongViecScreen() {
  const styles = useStyles(makeStyles);
  const c = useAppColors();
  const navigation = useNavigation<StackNavigation<"LichCongViec">>();
  // Thanh tab tự ẩn khi đọc xuống, hiện lại khi vuốt ngược lên (như Trang chủ).
  const hideTabBarOnScroll = useHideTabBarOnScroll();
  const { loaded, canRead, canInsert } = useWorkflowPermissions(
    CV_CONG_VIEC_NAME_CLASS,
  );
  const { me } = useWorkflowMe();

  const [mode, setMode] = useState<LichMode>(getSavedLichMode);
  const [anchor, setAnchor] = useState(() => startOfDay(new Date()));
  const [selected, setSelected] = useState(() => startOfDay(new Date()));
  const [mau, setMau] = useState<string[]>([]);
  const [items, setItems] = useState<CongViecItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [menu, setMenu] = useState<{
    item: CongViecItem;
    anchor: QuickActionAnchor;
    info?: CongViecThongTin;
  } | null>(null);
  const [lichSu, setLichSu] = useState<{
    item: CongViecItem;
    mode: LichSuSheetMode;
  } | null>(null);
  const [infos, setInfos] = useState<Record<number, CongViecThongTin>>({});
  // Vuốt đổi kỳ: giữ ở màn vì ScrollView (key theo khoảng) dựng lại vùng vuốt.
  const swipeX = useRef(new Animated.Value(0)).current;
  const loadRef = useRef<{ requestId: number; loaded: LichLoaded | null }>({
    requestId: 0,
    loaded: null,
  });

  const range = useMemo(() => getRange(mode, anchor), [anchor, mode]);
  const tasksByDay = useMemo(
    () => groupTasksByDay(items, range),
    [items, range],
  );

  // Số trên chip lọc: việc của khoảng đang hiện. Đang lọc thì dữ liệu chỉ còn màu
  // đã chọn — chip màu khác không có số thay vì báo 0 sai.
  const mauCounts = useMemo(() => {
    // Tải lỗi: không có số, kẻo chip báo 0 như kỳ này không có việc.
    if (loading || errorMessage) return undefined;
    const counts = countTasksByMau(tasksByDay);
    const keys = mau.length ? mau : CV_MA_MAU.map((item) => item.key);
    return Object.fromEntries(keys.map((key) => [key, counts[key] ?? 0]));
  }, [errorMessage, loading, mau, tasksByDay]);

  // Việc đang hiện: ngày đang chọn (Tháng) hoặc mọi ngày đang hiện (Tuần / Ngày).
  const visibleKey = useMemo(() => {
    const ids = new Set<number>();
    (mode === "thang" ? [selected] : range.days).forEach((day) =>
      (tasksByDay.get(dayKey(day)) ?? []).forEach((task) => ids.add(task.id)),
    );
    return Array.from(ids).join(",");
  }, [mode, range.days, selected, tasksByDay]);

  // Số bình luận / file + cờ quyền của việc đang hiện (4-Mobile-CongViec mục 1,
  // gọi cho dòng đang hiện) — cho hàng icon chân việc và menu ⋯ hiện ngay.
  const loadInfos = useCallback(() => {
    if (!visibleKey) return;
    cvThongTin(visibleKey.split(",").map(Number))
      .then((rows) =>
        setInfos((prev) => {
          const next = { ...prev };
          rows.forEach((row) => {
            next[row.id] = row;
          });
          return next;
        }),
      )
      .catch(() => undefined);
  }, [visibleKey]);

  // `items` đổi = vừa nạp lại lịch (có thể sau khi sửa ở màn khác): hỏi lại số.
  useEffect(() => {
    loadInfos();
  }, [items, loadInfos]);

  // Đóng màn Bình luận / Đính kèm → số trên chân việc (tài liệu 4 mục 9).
  useOnWorkflowInfoStale((apiBase) => {
    if (apiBase === CV_CONG_VIEC_NAME_CLASS) loadInfos();
  });

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
        state.loaded = {
          from: fetchRange.from,
          to: fetchRange.to,
          mau: toMauKey(mau),
        };
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
    selectionHaptic();
    setAnchor(next);
    setSelected(pickSelectedDay(mode, next));
  };
  // Nút ‹ › trượt y như vuốt.
  const slide = (step: 1 | -1) =>
    slideToPeriod(swipeX, Dimensions.get("window").width, step, go);

  // Hôm nay và ngày chọn từ lịch (bấm nhãn tháng): sang kỳ chứa ngày đó + chọn nó.
  const jumpTo = (date: Date) => {
    const day = startOfDay(date);
    setAnchor(day);
    setSelected(day);
  };
  const goToday = () => jumpTo(new Date());

  const switchMode = (next: LichMode) => {
    if (next === mode) return;
    saveLichMode(next);
    setMode(next);
    // Hôm nay luôn là hôm nay; rời Hôm nay thì Tháng / Tuần mở quanh hôm nay.
    if (next === "homnay") goToday();
    else setAnchor(selected);
  };

  const canAdd = canInsert && !!me.iD_NhanVien;
  const openTask = (item: CongViecItem) =>
    navigation.navigate("CongViecChiTiet", { id: item.id });
  const addTask = (day: Date) =>
    navigation.navigate("CongViecForm", { mode: "add", ngay: dayKey(day) });

  // Chưa có cv-thong-tin: màn Bình luận tự hỏi quyền gửi (canSend bỏ trống).
  const openComments = (item: CongViecItem) =>
    navigation.navigate("WorkflowBinhLuan", {
      apiBase: CV_CONG_VIEC_NAME_CLASS,
      idHoSo: item.id,
      canSend: infos[item.id] ? !!infos[item.id].duocTraoDoi : undefined,
      titleHeader: item.soCongViec ?? undefined,
    });

  // Màn Đính kèm bắt buộc biết quyền thêm / xoá: chưa có thì hỏi rồi mới mở.
  const openFiles = async (item: CongViecItem) => {
    const info =
      infos[item.id] ??
      (await cvThongTin([item.id]).catch(() => []))[0] ??
      undefined;
    navigation.navigate("WorkflowFile", {
      apiBase: CV_CONG_VIEC_NAME_CLASS,
      idHoSo: item.id,
      canEdit: !!info?.duocTraoDoi,
      titleHeader: item.soCongViec ?? undefined,
    });
  };

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
    const ngayLe = getNgayLe(day);
    const nowIndex = isToday && tasks.length ? getNowLineIndex(tasks) : -1;
    const deadlines = countDeadlines(tasks);
    const renderDeadline = (color: string, label: string) => (
      <View style={styles.deadlineItem}>
        <View style={[styles.deadlineDot, { backgroundColor: color }]} />
        <Text style={[styles.deadlineText, { color }]}>{label}</Text>
      </View>
    );
    // Tải lỗi thì chưa biết ngày có việc hay không — đừng ghi "Chưa có việc".
    const isEmpty = !tasks.length && !loading && !errorMessage;

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
              ngayLe && styles.sundayText,
              isToday && styles.dateBadgeTextToday,
            ]}
          >
            {day.getDate()}
          </Text>
        </View>

        <View style={styles.dayInfo}>
          <View style={styles.dayNameRow}>
            <Text
              style={[styles.dayName, isPast && styles.pastText]}
              numberOfLines={1}
            >
              {formatWeekdayName(day)}
            </Text>
            {isToday ? (
              <View style={styles.todayPill}>
                <Text style={styles.todayPillText}>Hôm nay</Text>
              </View>
            ) : null}
            {ngayLe ? (
              <View style={styles.lePill}>
                <Text style={styles.lePillText} numberOfLines={1}>
                  {ngayLe}
                </Text>
              </View>
            ) : null}
          </View>
          {/* Ngày không kèm năm: năm đã có trên thanh tháng / tuần phía trên. */}
          <Text style={styles.daySub} numberOfLines={1}>
            {formatDay(day).slice(0, 5)}
            {` · ${formatAmLich(getAmLich(day))} âm · `}
            {tasks.length ? (
              <Text
                style={styles.dayCountStrong}
              >{`${tasks.length} việc`}</Text>
            ) : loading ? (
              "Đang tải…"
            ) : errorMessage ? (
              "Chưa tải được"
            ) : (
              // Không ghi "Bấm để thêm": nút + bên phải đã nói điều đó.
              "Chưa có việc"
            )}
          </Text>
          {/* Màu như nhãn hạn trên từng việc: đỏ Quá hạn, cam sắp đến hạn. */}
          {deadlines.late || deadlines.soon ? (
            <View style={styles.deadlineRow}>
              {deadlines.late
                ? renderDeadline(getMaMauColor("QuaHan"), `${deadlines.late} quá hạn`)
                : null}
              {deadlines.soon
                ? renderDeadline(getMaMauColor("GiaHan"), `${deadlines.soon} sắp đến hạn`)
                : null}
            </View>
          ) : null}
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
        style={[
          styles.dayCard,
          isToday && styles.dayCardToday,
          compact && styles.weekDay,
        ]}
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
            {tasks.map((task, index) => (
              <React.Fragment key={`${dayKey(day)}-${task.id}`}>
                {index === nowIndex ? <LichNowLine /> : null}
                <LichTaskRow
                  item={task}
                  onPress={() => openTask(task)}
                  onMore={(position) =>
                    setMenu({
                      item: task,
                      anchor: position,
                      info: infos[task.id],
                    })
                  }
                  info={infos[task.id]}
                  onOpenComments={() => openComments(task)}
                  onOpenFiles={() => openFiles(task)}
                  onOpenLichSu={() => setLichSu({ item: task, mode: "lichSu" })}
                  onOpenGiaHan={() => setLichSu({ item: task, mode: "giaHan" })}
                />
              </React.Fragment>
            ))}
            {nowIndex === tasks.length ? <LichNowLine /> : null}
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
        <LichModeTabs mode={mode} onSwitch={switchMode} />
      </View>

      {/* Hôm nay không có kỳ để lùi / tiến: bỏ cả hàng, việc lên sát thanh chế độ. */}
      {mode === "homnay" ? (
        <View style={styles.navGap} />
      ) : (
        <View style={styles.navRow}>
          <TouchableOpacity
            onPress={() => slide(-1)}
            hitSlop={10}
            style={styles.navButton}
          >
            <Ionicons name="chevron-back" size={20} color={c.text} />
          </TouchableOpacity>
          <View style={styles.navCenter}>
            <LichRangeLabel
              label={formatRangeLabel(mode, anchor, range)}
              value={selected}
              onPick={jumpTo}
            />
            {/* Về hôm nay sau khi đã sang ngày / tháng khác; đang đúng hôm nay thì mờ. */}
            <TouchableOpacity
              onPress={goToday}
              hitSlop={6}
              activeOpacity={0.8}
              style={[
                styles.navButton,
                isSameDay(selected, new Date()) && styles.navButtonIdle,
              ]}
              accessibilityRole="button"
              accessibilityLabel="Về hôm nay"
            >
              <LichTodayIcon color={c.red} />
            </TouchableOpacity>
          </View>
          <TouchableOpacity
            onPress={() => slide(1)}
            hitSlop={10}
            style={styles.navButton}
          >
            <Ionicons name="chevron-forward" size={20} color={c.text} />
          </TouchableOpacity>
        </View>
      )}

      {/* Tab "Lich" = mọi việc TRỪ việc Hủy (6-Mobile-Lich mục 1) — chip Hủy chỉ ra lịch trống. */}
      <MaMauFilter
        value={mau}
        onChange={setMau}
        exclude={["Huy"]}
        counts={mauCounts}
      />

      {/* key theo khoảng: đổi Tháng / Tuần hay sang kỳ khác thì cuộn về đầu, khỏi
          giữ vị trí cuộn của nội dung cũ (ngày đầu tuần bị khuất). */}
      <ScrollView
        key={`${mode}-${dayKey(range.from)}`}
        contentContainerStyle={styles.content}
        onScroll={hideTabBarOnScroll}
        scrollEventThrottle={16}
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
        {errorMessage ? (
          <View style={styles.errorBox}>
            <Ionicons name="cloud-offline-outline" size={18} color={c.red} />
            <Text style={styles.error}>{errorMessage}</Text>
            <TouchableOpacity
              onPress={() => load()}
              hitSlop={8}
              accessibilityRole="button"
              disabled={loading}
            >
              <Text style={styles.retryText}>Thử lại</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {mode === "thang" ? (
          <>
            <LichSwipeArea onSwipe={go} translateX={swipeX}>
              <MonthGrid
                anchor={anchor}
                range={range}
                tasksByDay={tasksByDay}
                selected={selected}
                onSelect={setSelected}
              />
            </LichSwipeArea>
            <View style={styles.selectedDay}>
              <LichFadeIn key={dayKey(selected)}>{renderDay(selected)}</LichFadeIn>
            </View>
          </>
        ) : mode === "tuan" ? (
          <LichSwipeArea onSwipe={go} translateX={swipeX}>
            {range.days.map((day) => renderDay(day, true))}
          </LichSwipeArea>
        ) : (
          // Hôm nay: chỉ một thẻ, danh sách việc lên ngay đầu màn — cho ai chỉ xem hôm nay.
          renderDay(anchor)
        )}
        <TabBarSpacer />
      </ScrollView>

      {/* Lớp phủ cuối cùng của màn: menu ⋯ nổi trên cả thanh tháng / bộ lọc. */}
      <CongViecQuickActionMenu target={menu} onClose={() => setMenu(null)} />
      <CongViecLichSuSheet target={lichSu} onClose={() => setLichSu(null)} />
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
    navRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 8,
      paddingHorizontal: 12,
      paddingVertical: 8,
    },
    // Chế độ Hôm nay không có hàng tháng: chừa khoảng thở dưới thanh chế độ.
    navGap: {
      height: 8,
    },
    // Viên tháng + nút về hôm nay đứng cụm giữa hai nút ‹ ›.
    navCenter: {
      flexShrink: 1,
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },
    // Nút tròn trắng cùng kiểu viên tháng ở giữa — mũi tên trần trông rời rạc.
    navButton: {
      width: 38,
      height: 38,
      borderRadius: 19,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: c.surface,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.border,
      shadowColor: c.shadow,
      shadowOpacity: 0.06,
      shadowRadius: 6,
      shadowOffset: { width: 0, height: 2 },
      elevation: 2,
    },
    navButtonIdle: {
      opacity: 0.45,
    },
    content: {
      paddingHorizontal: 12,
      paddingBottom: 24,
    },
    errorBox: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      padding: 10,
      marginBottom: 8,
      borderRadius: 12,
      backgroundColor: c.redSurface,
    },
    error: {
      flex: 1,
      fontSize: 13,
      color: c.red,
    },
    retryText: {
      fontSize: 13,
      fontWeight: "700",
      color: c.red,
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
    // Ngày lễ: viền đỏ nhạt để khác viên "Hôm nay" khi hai viên đứng cạnh nhau.
    lePill: {
      flexShrink: 1,
      paddingHorizontal: 8,
      paddingVertical: 1,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: c.redBorder,
    },
    lePillText: {
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
    deadlineRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      columnGap: 12,
      marginTop: 4,
    },
    deadlineItem: {
      flexDirection: "row",
      alignItems: "center",
      gap: 5,
    },
    deadlineDot: {
      width: 7,
      height: 7,
      borderRadius: 3.5,
    },
    deadlineText: {
      fontSize: 12,
      fontWeight: "700",
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
