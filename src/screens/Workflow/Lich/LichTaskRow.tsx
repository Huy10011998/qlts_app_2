import React, { useRef } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";
import MaterialIcons from "react-native-vector-icons/MaterialIcons";
import ReactNativeHapticFeedback from "react-native-haptic-feedback";

import SkeletonBlock from "../../../components/ui/SkeletonBlock";
import { useSkeletonPulse } from "../../../components/ui/useSkeletonAutoFill";
import type { CongViecItem, CongViecThongTin } from "../../../types/index";
import {
  AppColors,
  useAppColors,
  useStyles,
} from "../../../utils/helpers/colors";
import type { QuickActionAnchor } from "../CongViec/components/CongViecQuickActionMenu";
import { isCongViecDaGiaHan } from "../CongViec/congViecRules";
import StatusBadge from "../shared/components/StatusBadge";
import {
  getCongViecTrangThai,
  getMaMauColor,
  tint,
} from "../shared/workflowConstants";
import { formatTaskTime, getTaskDeadline, TaskDeadline } from "./lichHelpers";

type Props = {
  item: CongViecItem;
  onPress: () => void;
  /** Nút ⋯ góc trên bên phải: mở thao tác nhanh cạnh nút. Không truyền thì không có nút. */
  onMore?: (anchor: QuickActionAnchor) => void;
  /** cv-thong-tin của việc: số bình luận / file ở chân. Chưa về thì chỉ icon. */
  info?: CongViecThongTin;
  /** Hàng icon chân việc, sát phải. Không truyền `onOpenComments` thì không có hàng. */
  onOpenComments?: () => void;
  onOpenFiles?: () => void;
  onOpenLichSu?: () => void;
  /** Chỉ hiện ở việc đã gia hạn (hạn ban đầu khác Đến ngày). */
  onOpenGiaHan?: () => void;
};

const longPressHaptic = () => {
  try {
    ReactNativeHapticFeedback.trigger("impactLight", {
      enableVibrateFallback: false,
      ignoreAndroidSystemSettings: false,
    });
  } catch {
    // Rung chỉ là gia vị, máy không hỗ trợ thì bỏ qua.
  }
};

/** Nhãn hạn cạnh giờ: "Quá hạn 13 ngày" đỏ · "Hạn hôm nay" cam · "Còn 9 ngày" xám. */
function DeadlineChip({ deadline }: { deadline: TaskDeadline }) {
  const styles = useStyles(makeStyles);
  const tone = DEADLINE_TONES[deadline.tone];

  return (
    <View
      style={[
        styles.deadline,
        tone ? { backgroundColor: tint(tone) } : styles.deadlineNormal,
      ]}
    >
      {tone ? (
        <Ionicons
          name={deadline.tone === "late" ? "alert-circle" : "time"}
          size={12}
          color={tone}
        />
      ) : null}
      <Text style={[styles.deadlineText, tone ? { color: tone } : styles.deadlineTextNormal]}>
        {deadline.label}
      </Text>
    </View>
  );
}

/** Một icon (kèm số nếu có) ở chân việc: viên nền nhạt cùng màu icon. */
function FooterIcon({
  icon,
  label,
  count,
  color,
  onPress,
}: {
  icon: React.ReactNode;
  label: string;
  count?: number;
  color: string;
  onPress: () => void;
}) {
  const styles = useStyles(makeStyles);

  return (
    <TouchableOpacity
      activeOpacity={0.6}
      onPress={onPress}
      // Ngang chỉ nới 6: hai icon cạnh nhau cách 14, vùng bấm không chồng lên nhau.
      hitSlop={FOOTER_HIT_SLOP}
      style={[
        styles.footerItem,
        !count && styles.footerItemIconOnly,
        { backgroundColor: tint(color) },
      ]}
      accessibilityRole="button"
      accessibilityLabel={count ? `${label} (${count})` : label}
    >
      {icon}
      {count ? (
        <Text style={[styles.footerCount, { color }]}>{count}</Text>
      ) : null}
    </TouchableOpacity>
  );
}

/**
 * Một việc trên lịch: ô màu nền theo maMau, viền trái theo màu loại công việc
 * (mauLoai, null thì bỏ viền), giờ, tiêu đề, số + chủ trì; nút ⋯ cùng hàng giờ;
 * chân: trạng thái sát trái, sát phải [Gia hạn] Bình luận · Đính kèm · Lịch sử.
 * Gia hạn đứng đầu vì chỉ việc đã gia hạn mới có — ba icon kia giữ nguyên chỗ ở
 * mọi việc.
 */
export default function LichTaskRow({
  item,
  onPress,
  onMore,
  info,
  onOpenComments,
  onOpenFiles,
  onOpenLichSu,
  onOpenGiaHan,
}: Props) {
  const styles = useStyles(makeStyles);
  const c = useAppColors();
  const moreRef = useRef<View>(null);
  const color = getMaMauColor(item.maMau);
  const deadline = getTaskDeadline(item);
  // Màu thẻ là maMau: việc Quá hạn / Gia hạn bị đỏ / cam che mất trạng thái lưu
  // (Mới hay Đang xử lý) — ghi ra chữ ở chân, như thẻ danh sách Công việc.
  const trangThai = getCongViecTrangThai(item.trangThai);

  // Đo icon ⋮ chứ không đo nút: mũi nhọn của menu chỉ đúng vào ba chấm — kể cả
  // khi mở bằng giữ lâu trên thẻ.
  const openMenu = (withHaptic: boolean) => {
    if (!onMore) return;
    if (withHaptic) longPressHaptic();
    moreRef.current?.measureInWindow((x, y, width, height) =>
      onMore({ x, y, width, height }),
    );
  };

  return (
    <TouchableOpacity
      activeOpacity={0.75}
      onPress={onPress}
      // Giữ lâu = bấm ⋮ (rung nhẹ), như menu ngữ cảnh của điện thoại.
      onLongPress={onMore ? () => openMenu(true) : undefined}
      delayLongPress={350}
      // Viền cùng màu tình trạng (ô màu bên trái) — thẻ viền theo màu của chính
      // nó, như các card khác trong app.
      style={[styles.row, { borderColor: color }]}
    >
      <View
        style={[
          styles.swatch,
          { backgroundColor: color },
          item.mauLoai
            ? [styles.loaiBorder, { borderLeftColor: item.mauLoai }]
            : null,
        ]}
      />
      <View style={styles.body}>
        <View style={styles.timeRow}>
          <Text style={styles.time} numberOfLines={1}>
            {formatTaskTime(item)}
          </Text>
          {deadline ? <DeadlineChip deadline={deadline} /> : null}
          {onMore ? (
            <TouchableOpacity
              onPress={() => openMenu(false)}
              hitSlop={{ top: 10, bottom: 10, left: 14, right: 10 }}
              style={styles.moreButton}
              accessibilityRole="button"
              accessibilityLabel={`Thao tác nhanh ${
                item.soCongViec ?? ""
              }`.trim()}
            >
              <View ref={moreRef} collapsable={false}>
                <Ionicons
                  name="ellipsis-vertical"
                  size={18}
                  color={c.textSub}
                />
              </View>
            </TouchableOpacity>
          ) : null}
        </View>
        <Text style={styles.title} numberOfLines={2}>
          {item.tieuDe}
        </Text>
        <Text style={styles.meta} numberOfLines={1}>
          {[item.soCongViec, item.chuTri_MoTa].filter(Boolean).join(" · ")}
        </Text>
        {onOpenComments ? (
          <View style={styles.footer}>
            {trangThai ? (
              <StatusBadge
                label={trangThai.label}
                color={trangThai.color}
                textColor={trangThai.textColor}
                style={styles.trangThai}
              />
            ) : null}
            {onOpenGiaHan && isCongViecDaGiaHan(item) ? (
              <FooterIcon
                icon={
                  <Ionicons
                    name="hourglass-outline"
                    size={16}
                    color={FOOTER_COLORS.giaHan}
                  />
                }
                label="Gia hạn"
                color={FOOTER_COLORS.giaHan}
                onPress={onOpenGiaHan}
              />
            ) : null}
            <FooterIcon
              icon={
                <Ionicons
                  name="chatbubble-ellipses-outline"
                  size={17}
                  color={FOOTER_COLORS.binhLuan}
                />
              }
              label="Bình luận"
              count={info?.soBinhLuan}
              color={FOOTER_COLORS.binhLuan}
              onPress={onOpenComments}
            />
            {onOpenFiles ? (
              <FooterIcon
                icon={
                  <Ionicons
                    name="attach-outline"
                    size={18}
                    color={FOOTER_COLORS.file}
                  />
                }
                label="Đính kèm"
                count={info?.soFile}
                color={FOOTER_COLORS.file}
                onPress={onOpenFiles}
              />
            ) : null}
            {onOpenLichSu ? (
              <FooterIcon
                icon={
                  <MaterialIcons
                    name="history"
                    size={18}
                    color={FOOTER_COLORS.lichSu}
                  />
                }
                label="Lịch sử"
                color={FOOTER_COLORS.lichSu}
                onPress={onOpenLichSu}
              />
            ) : null}
          </View>
        ) : null}
      </View>
    </TouchableOpacity>
  );
}

/**
 * Khung chờ việc của một ngày lúc đang tải lịch — cùng thẻ, cùng ô màu bên trái
 * và các dòng (giờ + nhãn hạn, tiêu đề, số · chủ trì, trạng thái + hàng icon
 * chân) với `LichTaskRow`.
 */
export function LichTaskRowSkeleton({ rows = 1 }: { rows?: number }) {
  const styles = useStyles(makeStyles);
  const opacity = useSkeletonPulse();

  return (
    <View accessibilityLabel="Đang tải việc">
      {Array.from({ length: rows }).map((_, index) => (
        <View key={index} style={styles.row}>
          <SkeletonBlock opacity={opacity} style={styles.swatch} />
          <View style={[styles.body, skeletonStyles.body]}>
            <View style={skeletonStyles.timeRow}>
              <SkeletonBlock opacity={opacity} style={skeletonStyles.time} />
              <SkeletonBlock opacity={opacity} style={skeletonStyles.deadline} />
            </View>
            <SkeletonBlock
              opacity={opacity}
              style={[
                skeletonStyles.title,
                index % 2 === 1 && skeletonStyles.titleShort,
              ]}
            />
            <SkeletonBlock opacity={opacity} style={skeletonStyles.meta} />
            <View style={skeletonStyles.footer}>
              <SkeletonBlock opacity={opacity} style={skeletonStyles.trangThai} />
              <SkeletonBlock opacity={opacity} style={skeletonStyles.icons} />
            </View>
          </View>
        </View>
      ))}
    </View>
  );
}

/**
 * Màu từng icon chân việc — tông Material như màu tình trạng. Gia hạn cam như
 * dòng Hạn ban đầu ở chi tiết; Đính kèm xanh ngọc, tránh xanh lá (Hoàn thành).
 */
/** Đỏ Quá hạn / cam Gia hạn của bảng màu maMau; "còn xa" dùng xám của theme. */
const DEADLINE_TONES: Record<TaskDeadline["tone"], string | null> = {
  late: "#e53935",
  soon: "#fb8c00",
  normal: null,
};

const FOOTER_HIT_SLOP = { top: 8, bottom: 8, left: 6, right: 6 };

const FOOTER_COLORS = {
  giaHan: "#fb8c00",
  binhLuan: "#1e88e5",
  file: "#00897b",
  lichSu: "#7e57c2",
};

const skeletonStyles = StyleSheet.create({
  body: {
    gap: 8,
    paddingVertical: 14,
  },
  // Giờ bên trái, viên nhãn hạn ("Còn 2 ngày") sát phải như hàng giờ của việc thật.
  timeRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  time: {
    width: 84,
    height: 10,
    borderRadius: 5,
  },
  deadline: {
    width: 64,
    height: 20,
    borderRadius: 10,
  },
  title: {
    width: "68%",
    height: 13,
    borderRadius: 6,
  },
  titleShort: {
    width: "48%",
  },
  meta: {
    width: "54%",
    height: 10,
    borderRadius: 5,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 2,
  },
  trangThai: {
    width: 72,
    height: 24,
    borderRadius: 12,
  },
  icons: {
    width: 120,
    height: 28,
    borderRadius: 14,
  },
});
const makeStyles = (c: AppColors) =>
  StyleSheet.create({
    row: {
      flexDirection: "row",
      alignItems: "stretch",
      backgroundColor: c.surface,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: "transparent",
      marginBottom: 8,
      overflow: "hidden",
    },
    // Rộng 12: 4 màu loại việc (viền trái) + 8 màu tình trạng.
    swatch: {
      width: 12,
    },
    loaiBorder: {
      borderLeftWidth: 4,
    },
    // Đệm rộng hơn để cân với hàng viên icon 28 ở chân.
    body: {
      flex: 1,
      paddingHorizontal: 14,
      paddingVertical: 12,
    },
    timeRow: {
      flexDirection: "row",
      alignItems: "center",
    },
    time: {
      flex: 1,
      fontSize: 12,
      fontWeight: "700",
      color: c.textSub,
    },
    deadline: {
      flexDirection: "row",
      alignItems: "center",
      gap: 3,
      height: 20,
      paddingHorizontal: 7,
      marginLeft: 8,
      borderRadius: 10,
    },
    deadlineNormal: {
      backgroundColor: c.surfaceAlt,
    },
    deadlineText: {
      fontSize: 11,
      fontWeight: "700",
    },
    deadlineTextNormal: {
      color: c.textSub,
    },
    // Margin âm: nút sát góc phải trên mà hàng giờ không cao thêm.
    moreButton: {
      marginLeft: 8,
      marginRight: -4,
      marginVertical: -4,
    },
    title: {
      fontSize: 14,
      fontWeight: "600",
      color: c.text,
      marginTop: 4,
    },
    meta: {
      fontSize: 12,
      color: c.textSub,
      marginTop: 4,
    },
    footer: {
      flexDirection: "row",
      justifyContent: "flex-end",
      alignItems: "center",
      gap: 14,
      marginTop: 10,
    },
    // Đẩy hàng icon sang phải; cao bằng viên icon. Máy hẹp thì chữ tự rút gọn
    // chứ không đẩy icon xuống dòng.
    trangThai: {
      alignSelf: "center",
      flexShrink: 1,
      height: 24,
      paddingVertical: 0,
      marginRight: "auto",
    },
    footerItem: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      height: 24,
      paddingHorizontal: 9,
      borderRadius: 14,
    },
    // Chỉ icon: tròn.
    footerItemIconOnly: {
      width: 28,
      paddingHorizontal: 0,
      justifyContent: "center",
    },
    footerCount: {
      fontSize: 13,
      fontWeight: "700",
    },
  });
