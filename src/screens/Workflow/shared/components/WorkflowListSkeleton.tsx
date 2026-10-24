import React, { useCallback, useState } from "react";
import { Animated, Platform, StyleSheet, View, ViewStyle } from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";

import SkeletonBlock from "../../../../components/ui/SkeletonBlock";
import {
  useSkeletonAutoFill,
  useSkeletonPulse,
} from "../../../../components/ui/useSkeletonAutoFill";
import { TypeProperty } from "../../../../utils/Enum";
import { AppColors, useAppColors, useStyles } from "../../../../utils/helpers/colors";
import { getTextScaleFactor } from "../../../../utils/helpers/textScaling";
import { elevation } from "../../../../utils/helpers/tokens";
import type { WorkflowField } from "../workflowFields";

/**
 * Bốn dáng dòng của các danh sách Workflow, mỗi dáng đo từ chính thẻ thật:
 *
 * - `flow`: `FlowCard` — số phiếu + nhãn tình trạng, bước hiện tại, field, chân
 *   viên Bình luận · File (· Quy trình).
 * - `congViec`: `CongViecCard` — vạch màu 5 bên trái, số + trạng thái, tiêu đề,
 *   chủ trì, field, chân viên Bình luận · File.
 * - `keHoach`: `KeHoachCard` — khối chữ bên trái, vòng tiến độ 48 bên PHẢI.
 * - `viec`: `ViecCanXuLyRow` — ô icon vuông 40, loại + giờ, tiêu đề, nội dung,
 *   chevron.
 *
 * Trước đây cả bốn màn mượn `RecordListSkeleton` (avatar tròn 48 bên trái, thẻ
 * 84pt) trong khi thẻ thật cao 115–165pt và không có avatar — dữ liệu về là cả
 * danh sách đổi dáng.
 */
export type WorkflowListSkeletonKind = "flow" | "congViec" | "keHoach" | "viec";

/** Phần nào của thẻ có hiện — theo metadata, chỉ biết khi field đã về. */
export type WorkflowCardSkeletonShape = {
  /** Số dòng "Nhãn: giá trị" (`countFieldLines`); bỏ trống thì `FALLBACK_LINES`. */
  lines?: number;
  /** congViec / keHoach: dòng số (SoCongViec / SoKeHoach). Mặc định có. */
  code?: boolean;
  /** congViec / keHoach: dòng tiêu đề. Mặc định có. */
  title?: boolean;
  /** flow: dòng bước hiện tại + viên Quy trình — chỉ phiếu đang chạy quy trình. */
  step?: boolean;
};

/** Metadata chưa về (lần đầu mở màn trong phiên): đoán 2 dòng field. */
const FALLBACK_LINES = 2;

/** Field ảnh không thành dòng chữ — cùng luật `NOT_TEXT_TYPES` của `WorkflowFieldLines`. */
const NOT_TEXT_TYPES = new Set<number>([TypeProperty.Image, TypeProperty.ImageBase64]);

/**
 * Số dòng "Nhãn: giá trị" thẻ sẽ vẽ từ các field đã lọc của thẻ. Dòng trống bị
 * ẩn (`hideEmpty`) thì không đoán được — field hiện trên thẻ thường có giá trị.
 */
export const countFieldLines = (fields: WorkflowField[]) =>
  fields.filter((field) => !NOT_TEXT_TYPES.has(field.typeProperty)).length;

/**
 * Tỉ lệ dòng của font hệ thống khi chữ không khai `lineHeight`: SF ≈ 1.19 ×
 * cỡ chữ; Roboto kèm `includeFontPadding` mặc định ≈ 1.33.
 */
const LINE_RATIO = Platform.OS === "android" ? 1.33 : 1.19;

/**
 * Chiều cao một dòng chữ thật — kể cả hệ số của thanh Cỡ chữ trong app (icon
 * thì không theo hệ số). Vạch xám nằm giữa một hộp cao đúng bằng dòng chữ đó,
 * nên cộng các hộp là ra chiều cao thẻ thật. Gọi lúc dựng (không phải lúc nạp
 * module) vì hệ số đổi được trong phiên.
 */
export const textLine = (fontSize: number) => fontSize * getTextScaleFactor() * LINE_RATIO;

/** `StatusBadge`: paddingVertical 3 + chữ 12. */
const badgeHeight = () => 3 * 2 + textLine(12);
/** `WorkflowCounter` dáng viên (minHeight 30) — cũng là cao nút compact. */
const COUNTER_HEIGHT = 30;
/** Chân thẻ Flow / Công việc: marginTop 8 + paddingTop 8 + gạch mảnh + hàng viên. */
const FOOTER_HEIGHT = 8 + 8 + StyleSheet.hairlineWidth + COUNTER_HEIGHT;
/** Một dòng `WorkflowFieldLines`: marginTop 3 + chữ 13 (field Text 2 dòng thì cao hơn). */
const fieldLineHeight = () => 3 + textLine(13);
/** Cột tiến độ của `KeHoachCard`: vòng 48 + nhãn "x/y việc" (marginTop 4, chữ 11). */
const keHoachProgressHeight = () => 48 + 4 + textLine(11);
/** Ô icon của `ViecCanXuLyRow`. */
const VIEC_ICON = 40;

/**
 * Chiều cao một thẻ **kể cả khoảng cách xuống thẻ dưới**, để đếm số thẻ phủ kín
 * khung. Cộng đúng từng khối của thẻ thật (số đo ghi ở từng dòng).
 */
export const getWorkflowCardSkeletonHeight = (
  kind: WorkflowListSkeletonKind,
  shape: WorkflowCardSkeletonShape = {},
) => {
  const fields = (shape.lines ?? FALLBACK_LINES) * fieldLineHeight();
  const hairlines = StyleSheet.hairlineWidth * 2;

  switch (kind) {
    case "flow":
      return (
        // FlowCard: viền 1.5 + padding 12, marginBottom 10.
        1.5 * 2 + 12 * 2 + 10 +
        Math.max(textLine(15), badgeHeight()) +
        // Bước hiện tại: marginTop 6, icon 15 cạnh chữ 13.
        (shape.step ? 6 + Math.max(15, textLine(13)) : 0) +
        fields +
        FOOTER_HEIGHT
      );
    case "congViec":
      return (
        // CongViecCard: viền mảnh, body paddingVertical 10, marginBottom 10.
        hairlines + 10 * 2 + 10 +
        Math.max(textLine(12), badgeHeight()) +
        // Tiêu đề chữ 15 (marginTop 6) — tính một dòng, numberOfLines 2.
        (shape.title !== false ? 6 + textLine(15) : 0) +
        // Chủ trì: marginTop 4, icon 15 cạnh chữ 13.
        4 + Math.max(15, textLine(13)) +
        fields +
        FOOTER_HEIGHT
      );
    case "keHoach": {
      const body =
        (shape.code !== false ? textLine(12) : 0) +
        (shape.title !== false ? 4 + textLine(15) : 0) +
        fields +
        // "n người tham gia": marginTop 4, icon 14 cạnh chữ 12.
        4 + Math.max(14, textLine(12));
      // KeHoachCard: alignItems center — thẻ cao theo cột nào dài hơn.
      return hairlines + 12 * 2 + 10 + Math.max(body, keHoachProgressHeight());
    }
    case "viec": {
      // Dòng loại (12 đậm) + giờ (11), tiêu đề 14 (marginTop 3), nội dung 13
      // (marginTop 2) — mỗi thứ tính một dòng.
      const body = textLine(12) + 3 + textLine(14) + 2 + textLine(13);
      return hairlines + 12 * 2 + 8 + Math.max(VIEC_ICON, body);
    }
  }
};

type Opacity = Animated.AnimatedInterpolation<number>;

/**
 * Khung chờ lúc mở một danh sách Workflow (phiếu Flow, công việc, kế hoạch,
 * việc cần xử lý): đủ thẻ đúng dáng để phủ kín phần danh sách. Ô tìm kiếm, hàng
 * tab, chip lọc màu là thật và nằm bên trên — khung chờ chỉ thay đúng chỗ của
 * `FlatList`, cùng lề `listContent` (ngang 12, trên 4).
 */
export default function WorkflowListSkeleton({
  kind,
  shape = {},
  hasApproveAllRow = false,
  rows,
}: {
  kind: WorkflowListSkeletonKind;
  shape?: WorkflowCardSkeletonShape;
  /**
   * Hàng "dải nhắc vuốt · Duyệt nhiều (n)" của tab Chờ duyệt: hàng thật chỉ
   * hiện khi trang đầu đã về (`totalCount`), nên giữ chỗ ở đây — không thì cả
   * danh sách bị đẩy xuống ~55pt đúng lúc thẻ thật hiện ra.
   */
  hasApproveAllRow?: boolean;
  /** Số thẻ cố định; bỏ trống thì tự phủ kín khung. */
  rows?: number;
}) {
  const styles = useStyles(makeStyles);
  const { onLayout, opacity, rowCount } = useSkeletonAutoFill(
    getWorkflowCardSkeletonHeight(kind, shape),
    rows,
  );

  return (
    <View style={styles.wrap} onLayout={onLayout} accessibilityLabel="Đang tải danh sách">
      {hasApproveAllRow ? <ApproveAllRow opacity={opacity} /> : null}
      <View style={styles.cards}>
        {Array.from({ length: rowCount }).map((_, index) => (
          <WorkflowCardSkeleton
            key={index}
            kind={kind}
            shape={shape}
            index={index}
            opacity={opacity}
          />
        ))}
      </View>
    </View>
  );
}

/**
 * Chân danh sách lúc cuộn tới cuối và đang nạp trang kế — truyền qua prop
 * `skeleton` của `WorkflowListFooter`. Cùng dáng thẻ với lúc mở màn, không có
 * lề: `listContent` của danh sách đã có lề ngang 12.
 */
export function WorkflowListFooterSkeleton({
  kind,
  shape = {},
  rows = 2,
}: {
  kind: WorkflowListSkeletonKind;
  shape?: WorkflowCardSkeletonShape;
  rows?: number;
}) {
  const opacity = useSkeletonPulse();

  return (
    <View accessibilityLabel="Đang tải thêm">
      {Array.from({ length: rows }).map((_, index) => (
        <WorkflowCardSkeleton
          key={index}
          kind={kind}
          shape={shape}
          index={index}
          opacity={opacity}
        />
      ))}
    </View>
  );
}

/**
 * Dòng "bước hiện tại" của `FlowCard` trong lúc flow-thong-tin của phiếu chưa
 * về — dòng thật chỉ mọc ra khi thông tin tới, thẻ dài thêm ~22pt.
 */
export function FlowStepPendingRow() {
  const opacity = useSkeletonPulse();

  return <StepRow opacity={opacity} />;
}

/**
 * Hai viên Bình luận · File ở chân `CongViecCard` trong lúc cv-thong-tin chưa
 * về — trả về hai khối rời (Fragment) để ăn `gap` của chân thẻ như viên thật.
 */
export function CounterPendingPills() {
  const styles = useStyles(makeStyles);
  const opacity = useSkeletonPulse();

  return (
    <>
      <SkeletonBlock opacity={opacity} style={styles.counter} />
      <SkeletonBlock opacity={opacity} style={styles.counter} />
    </>
  );
}

const NO_IDS: ReadonlySet<number> = new Set();

const withIds = (prev: ReadonlySet<number>, ids: number[], pending: boolean) => {
  if (!ids.length) return prev;
  const next = new Set(prev);
  ids.forEach((id) => (pending ? next.add(id) : next.delete(id)));
  return next;
};

/**
 * Dòng nào đang chờ thông tin phụ (flow-thong-tin / cv-thong-tin, gọi SAU khi
 * trang về) — để thẻ giữ sẵn chỗ bằng khung chờ thay vì mọc thêm một khúc lúc
 * thông tin tới. Phân biệt được "chưa về" với "về rồi mà trống": lượt gọi hỏng
 * cũng bỏ chờ, thẻ về dáng không có thông tin phụ chứ không nhấp nháy mãi.
 *
 * `track` nuốt luôn lỗi của `request` (như `.catch(() => undefined)` trước đây)
 * và bỏ chờ SAU bước `.then` của nơi gọi, nên thẻ không có nhịp nào trống chỗ.
 */
export function useInfoPending() {
  const [pendingIds, setPendingIds] = useState(NO_IDS);

  const track = useCallback((ids: number[], request: Promise<unknown>) => {
    setPendingIds((prev) => withIds(prev, ids, true));
    const settle = () => setPendingIds((prev) => withIds(prev, ids, false));
    request.then(settle, settle);
  }, []);

  return { pendingIds, track };
}

// Dài ngắn khác nhau theo thứ tự thẻ cho giống dữ liệu thật, không thành một cột
// vạch đều tăm tắp.
const HEAD_WIDTHS: ViewStyle["width"][] = ["40%", "52%", "34%", "46%"];
const TITLE_WIDTHS: ViewStyle["width"][] = ["78%", "62%", "70%", "54%"];
const LABEL_WIDTHS: ViewStyle["width"][] = ["24%", "30%", "20%"];
const VALUE_WIDTHS: ViewStyle["width"][] = ["44%", "32%", "52%", "38%"];

const pick = <T,>(list: T[], index: number) => list[index % list.length];

function WorkflowCardSkeleton({
  kind,
  shape,
  index,
  opacity,
}: {
  kind: WorkflowListSkeletonKind;
  shape: WorkflowCardSkeletonShape;
  index: number;
  opacity: Opacity;
}) {
  switch (kind) {
    case "flow":
      return <FlowCardSkeleton shape={shape} index={index} opacity={opacity} />;
    case "congViec":
      return <CongViecCardSkeleton shape={shape} index={index} opacity={opacity} />;
    case "keHoach":
      return <KeHoachCardSkeleton shape={shape} index={index} opacity={opacity} />;
    case "viec":
      return <ViecRowSkeleton index={index} opacity={opacity} />;
  }
}

type CardProps = { shape: WorkflowCardSkeletonShape; index: number; opacity: Opacity };

/** `FlowCard`: không avatar; số phiếu + nhãn tình trạng nền đặc trên cùng. */
function FlowCardSkeleton({ shape, index, opacity }: CardProps) {
  const styles = useStyles(makeStyles);

  return (
    <View style={styles.flowCard}>
      <View style={styles.flowHeader}>
        <SkeletonBlock
          opacity={opacity}
          style={[styles.headBar, { width: pick(HEAD_WIDTHS, index) }]}
        />
        <SkeletonBlock opacity={opacity} style={styles.badge} />
      </View>
      {shape.step ? <StepRow opacity={opacity} /> : null}
      <FieldLines count={shape.lines ?? FALLBACK_LINES} index={index} opacity={opacity} />
      {/* Bình luận · File luôn có; Quy trình chỉ khi phiếu đã có bước. */}
      <View style={[styles.footer, styles.footerFlow]}>
        <SkeletonBlock opacity={opacity} style={styles.counter} />
        <SkeletonBlock opacity={opacity} style={styles.counter} />
        {shape.step ? <SkeletonBlock opacity={opacity} style={styles.counterIconOnly} /> : null}
      </View>
    </View>
  );
}

/** `CongViecCard`: vạch màu maMau bên trái (vẽ xám), thân thẻ bên phải. */
function CongViecCardSkeleton({ shape, index, opacity }: CardProps) {
  const styles = useStyles(makeStyles);
  const c = useAppColors();

  return (
    <View style={styles.congViecCard}>
      <SkeletonBlock opacity={opacity} style={styles.stripe} />
      <View style={styles.congViecBody}>
        <View style={styles.congViecHeader}>
          {shape.code !== false ? (
            <SkeletonBlock opacity={opacity} style={styles.codeBar} />
          ) : (
            <View />
          )}
          <SkeletonBlock opacity={opacity} style={styles.badge} />
        </View>
        {shape.title !== false ? (
          <View style={styles.congViecTitle}>
            <SkeletonBlock
              opacity={opacity}
              style={[styles.titleBar, { width: pick(TITLE_WIDTHS, index) }]}
            />
          </View>
        ) : null}
        <View style={styles.metaRow}>
          <Ionicons name="person-circle-outline" size={15} color={c.textMuted} />
          <SkeletonBlock opacity={opacity} style={styles.metaBar} />
        </View>
        <FieldLines count={shape.lines ?? FALLBACK_LINES} index={index} opacity={opacity} />
        <View style={styles.footer}>
          <SkeletonBlock opacity={opacity} style={styles.counter} />
          <SkeletonBlock opacity={opacity} style={styles.counter} />
        </View>
      </View>
    </View>
  );
}

/** `KeHoachCard`: khối chữ bên trái, cột vòng tiến độ rộng 70 bên phải. */
function KeHoachCardSkeleton({ shape, index, opacity }: CardProps) {
  const styles = useStyles(makeStyles);
  const c = useAppColors();

  return (
    <View style={styles.keHoachCard}>
      <View style={styles.keHoachBody}>
        {shape.code !== false ? (
          <View style={styles.keHoachCode}>
            <SkeletonBlock opacity={opacity} style={styles.codeBar} />
          </View>
        ) : null}
        {shape.title !== false ? (
          <View style={styles.keHoachTitle}>
            <SkeletonBlock
              opacity={opacity}
              style={[styles.titleBar, { width: pick(TITLE_WIDTHS, index) }]}
            />
          </View>
        ) : null}
        <FieldLines count={shape.lines ?? FALLBACK_LINES} index={index} opacity={opacity} />
        <View style={styles.keHoachMeta}>
          <Ionicons name="people-outline" size={14} color={c.textMuted} />
          <SkeletonBlock opacity={opacity} style={styles.keHoachMetaBar} />
        </View>
      </View>
      <View style={styles.keHoachProgress}>
        {/* Vòng rỗng như `ProgressRing` (nét 5) thay vì một đĩa xám đặc. */}
        <Animated.View style={[styles.ring, { opacity }]} />
        <View style={styles.keHoachProgressLabel}>
          <SkeletonBlock opacity={opacity} style={styles.keHoachProgressBar} />
        </View>
      </View>
    </View>
  );
}

/** `ViecCanXuLyRow`: ô icon bo vuông, dòng loại ↔ giờ, tiêu đề, nội dung, chevron. */
function ViecRowSkeleton({ index, opacity }: { index: number; opacity: Opacity }) {
  const styles = useStyles(makeStyles);
  const c = useAppColors();

  return (
    <View style={styles.viecRow}>
      <SkeletonBlock opacity={opacity} style={styles.viecIcon} />
      <View style={styles.viecBody}>
        <View style={styles.viecTop}>
          <SkeletonBlock opacity={opacity} style={styles.viecLoai} />
          <SkeletonBlock opacity={opacity} style={styles.viecTime} />
        </View>
        <View style={styles.viecTitle}>
          <SkeletonBlock
            opacity={opacity}
            style={[styles.viecTitleBar, { width: pick(TITLE_WIDTHS, index) }]}
          />
        </View>
        <View style={styles.viecContent}>
          <SkeletonBlock opacity={opacity} style={styles.viecContentBar} />
        </View>
      </View>
      <Ionicons name="chevron-forward" size={18} color={c.textMuted} />
    </View>
  );
}

function StepRow({ opacity }: { opacity: Opacity }) {
  const styles = useStyles(makeStyles);
  const c = useAppColors();

  return (
    <View style={styles.stepRow}>
      <Ionicons name="git-commit-outline" size={15} color={c.textMuted} />
      <SkeletonBlock opacity={opacity} style={styles.stepBar} />
    </View>
  );
}

function FieldLines({ count, index, opacity }: { count: number; index: number; opacity: Opacity }) {
  const styles = useStyles(makeStyles);

  return (
    <>
      {Array.from({ length: count }).map((_, line) => (
        <View key={line} style={styles.fieldLine}>
          <SkeletonBlock
            opacity={opacity}
            style={[styles.fieldLabel, { width: pick(LABEL_WIDTHS, index + line) }]}
          />
          <SkeletonBlock
            opacity={opacity}
            style={[styles.fieldValue, { width: pick(VALUE_WIDTHS, index + line) }]}
          />
        </View>
      ))}
    </>
  );
}

function ApproveAllRow({ opacity }: { opacity: Opacity }) {
  const styles = useStyles(makeStyles);

  return (
    <View style={styles.approveRow}>
      <SkeletonBlock opacity={opacity} style={styles.approveHint} />
      <SkeletonBlock opacity={opacity} style={styles.approveButton} />
    </View>
  );
}

// Số đo của `FlowCard`, `CongViecCard`, `KeHoachCard`, `ViecCanXuLyRow`,
// `WorkflowFieldLines`, `StatusBadge`, `WorkflowCounter` và `approveAllRow` của
// `FlowListScreen`. Hộp chứa vạch cao đúng bằng dòng chữ thật (`textLine`).
const makeStyles = (c: AppColors) =>
  StyleSheet.create({
    wrap: {
      flex: 1,
      // Thẻ dựng vượt đáy khung thì cắt, không đẩy khung dài ra.
      overflow: "hidden",
      paddingHorizontal: 12,
      backgroundColor: c.bg,
    },
    // `listContent.paddingTop` — hàng Duyệt nhiều thật nằm TRÊN danh sách nên
    // không ăn khoảng này.
    cards: {
      paddingTop: 4,
    },
    flowCard: {
      backgroundColor: c.surface,
      borderRadius: 14,
      padding: 12,
      marginBottom: 10,
      borderWidth: 1.5,
      borderColor: c.surface,
      ...elevation(c.shadow, 1),
    },
    flowHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 8,
      height: Math.max(textLine(15), badgeHeight()),
    },
    headBar: {
      height: 14,
      borderRadius: 6,
    },
    badge: {
      width: 72,
      height: badgeHeight(),
      borderRadius: 999,
    },
    stepRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 5,
      marginTop: 6,
      height: Math.max(15, textLine(13)),
    },
    stepBar: {
      width: "46%",
      height: 11,
      borderRadius: 5,
    },
    fieldLine: {
      flexDirection: "row",
      alignItems: "center",
      marginTop: 3,
      height: textLine(13),
    },
    fieldLabel: {
      height: 10,
      marginRight: 6,
      borderRadius: 5,
    },
    fieldValue: {
      height: 10,
      borderRadius: 5,
    },
    footer: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      marginTop: 8,
      paddingTop: 8,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: c.separator,
    },
    // `counters` của FlowCard khít hơn (gap 6).
    footerFlow: {
      gap: 6,
    },
    // Viên có số: paddingHorizontal 9 + icon ~17 + gap 4 + một chữ số 13 đậm.
    counter: {
      width: 50,
      height: COUNTER_HEIGHT,
      borderRadius: COUNTER_HEIGHT / 2,
    },
    counterIconOnly: {
      width: COUNTER_HEIGHT,
      height: COUNTER_HEIGHT,
      borderRadius: COUNTER_HEIGHT / 2,
    },
    congViecCard: {
      flexDirection: "row",
      backgroundColor: c.surface,
      borderRadius: 14,
      marginBottom: 10,
      overflow: "hidden",
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.hairline,
      ...elevation(c.shadow, 1),
    },
    stripe: {
      width: 5,
    },
    congViecBody: {
      flex: 1,
      paddingHorizontal: 12,
      paddingVertical: 10,
    },
    congViecHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 8,
      height: Math.max(textLine(12), badgeHeight()),
    },
    codeBar: {
      width: 84,
      height: 10,
      borderRadius: 5,
    },
    congViecTitle: {
      justifyContent: "center",
      marginTop: 6,
      height: textLine(15),
    },
    titleBar: {
      height: 13,
      borderRadius: 6,
    },
    metaRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      marginTop: 4,
      height: Math.max(15, textLine(13)),
    },
    metaBar: {
      width: "42%",
      height: 10,
      borderRadius: 5,
    },
    keHoachCard: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: c.surface,
      borderRadius: 14,
      padding: 12,
      marginBottom: 10,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.hairline,
      ...elevation(c.shadow, 1),
    },
    keHoachBody: {
      flex: 1,
      marginRight: 10,
    },
    keHoachCode: {
      justifyContent: "center",
      height: textLine(12),
    },
    keHoachTitle: {
      justifyContent: "center",
      marginTop: 4,
      height: textLine(15),
    },
    keHoachMeta: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      marginTop: 4,
      height: Math.max(14, textLine(12)),
    },
    keHoachMetaBar: {
      width: "36%",
      height: 9,
      borderRadius: 4,
    },
    keHoachProgress: {
      alignItems: "center",
      width: 70,
    },
    ring: {
      width: 48,
      height: 48,
      borderRadius: 24,
      borderWidth: 5,
      borderColor: c.skeleton,
    },
    keHoachProgressLabel: {
      justifyContent: "center",
      marginTop: 4,
      height: textLine(11),
    },
    keHoachProgressBar: {
      width: 44,
      height: 9,
      borderRadius: 4,
    },
    viecRow: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: c.surface,
      borderRadius: 14,
      padding: 12,
      marginBottom: 8,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.hairline,
      ...elevation(c.shadow, 1),
    },
    viecIcon: {
      width: VIEC_ICON,
      height: VIEC_ICON,
      borderRadius: 12,
      marginRight: 12,
    },
    viecBody: {
      flex: 1,
      marginRight: 6,
    },
    // Nhãn loại bên trái, giờ ngắn bám mép phải — như `topLine`.
    viecTop: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 8,
      height: textLine(12),
    },
    viecLoai: {
      width: "38%",
      height: 10,
      borderRadius: 5,
    },
    viecTime: {
      width: 58,
      height: 9,
      borderRadius: 4,
    },
    viecTitle: {
      justifyContent: "center",
      marginTop: 3,
      height: textLine(14),
    },
    viecTitleBar: {
      height: 12,
      borderRadius: 6,
    },
    viecContent: {
      justifyContent: "center",
      marginTop: 2,
      height: textLine(13),
    },
    viecContentBar: {
      width: "88%",
      height: 10,
      borderRadius: 5,
    },
    // `approveAllRow` + nút compact (cao 30) của `FlowListScreen`. Lề ngang 12
    // đã có ở `wrap`.
    approveRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      paddingBottom: 8,
    },
    // Dải nhắc vuốt (`SwipeHintBanner`): paddingVertical 8 + viền mảnh + 2 dòng
    // chữ 12 — hàng hẹp cạnh nút nên câu nhắc luôn xuống 2 dòng.
    approveHint: {
      flex: 1,
      height: 8 * 2 + StyleSheet.hairlineWidth * 2 + Math.max(18, textLine(12) * 2),
      borderRadius: 12,
    },
    // Nút "Duyệt nhiều (n)": icon 14 + chữ 12 đậm + lề 10 hai bên.
    approveButton: {
      width: 132,
      height: COUNTER_HEIGHT,
      borderRadius: 9,
    },
  });
