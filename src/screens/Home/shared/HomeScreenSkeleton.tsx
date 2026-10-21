import React, { useMemo } from "react";
import { StyleSheet, View } from "react-native";

import { useAppColors, useStyles } from "../../../utils/helpers/colors";
import {
  HOME_CONTENT_HORIZONTAL_PADDING,
  HOME_FEATURE_CARD_HEIGHT,
  HOME_FEATURE_GRID_GAP,
  makeStyles as makeHomeStyles,
} from "../HomeScreen.styles";
import {
  DEFAULT_HOME_BLOCK_ORDER,
  HOME_BLOCK_META,
  type HomeBlockKey,
} from "./homeBlockOrder";
import {
  HOME_BLOCK_SHORT_LABELS,
  HOME_BLOCK_TONES,
  HomeBlockToneContext,
  useHomeBlockTone,
  useHomeCardBorderColor,
  useHomeCardChrome,
  useHomePageBackground,
} from "./homeBlockTone";
import HomeSectionTitle from "./HomeSectionTitle";
import { HOME_SHORTCUT_COLUMNS } from "./homeShortcutPages";
import HomeStatTiles from "./HomeStatTiles";
import HomeUtilityCard from "./HomeUtilityCard";

/**
 * Nhãn từng khối — cùng chuỗi mà `renderBlock` trong HomeScreen truyền cho
 * `HomeSectionTitle`. Nhãn là chuỗi cố định, không phải dữ liệu, nên khung chờ
 * hiện luôn chữ thật. Riêng Tiêu thụ lấy nhãn màn thật dùng khi CHƯA biết kỳ số
 * liệu — đúng nhãn của lượt tải đầu chưa có cache.
 *
 * Sửa nhãn bên HomeScreen thì sửa ở đây theo.
 */
const HOME_BLOCK_TITLES: Record<HomeBlockKey, string> = {
  stats: "SỐ LIỆU TOÀN CÔNG TY",
  shortcuts: "TRUY CẬP NHANH",
  workflow: "TỔNG QUAN CÔNG VIỆC",
  assetStructure: "CƠ CẤU TÀI SẢN",
  attendance: "ĐIỂM DANH NHÂN SỰ HÔM NAY",
  utilities: "TIÊU THỤ ĐIỆN · NƯỚC · HƠI",
};

/** HomeScreen chỉ hiện hàng chip đi tới khối khi có từ chừng này khối trở lên. */
const JUMP_BAR_MIN_BLOCKS = 3;
/** Chữ chip 11.5pt đậm: trung bình ~6pt mỗi ký tự. */
const JUMP_CHIP_CHAR_WIDTH = 6;

type HomeScreenSkeletonProps = {
  /**
   * Các khối sắp hiện, đúng thứ tự trên màn. HomeScreen truyền `visibleBlockKeys`
   * khi đã đọc xong quyền; chưa thì truyền thứ tự đã lưu (bỏ khối user đã tắt).
   * Không truyền thì theo thứ tự mặc định.
   */
  blockKeys?: HomeBlockKey[];
  /** Khối user đang thu gọn: chỉ còn dòng tiêu đề, như màn thật. */
  collapsedKeys?: HomeBlockKey[];
  /** Số ô của lưới số liệu khi đã biết quyền; chưa biết thì để mặc định 4. */
  statTileCount?: number;
};

/**
 * Khung chờ của Trang chủ, dùng khi CHƯA đọc xong quyền và menu.
 *
 * Trước đây chỗ này là một vòng xoay nhỏ giữa màn trắng, dù mọi khối bên trong
 * (lưới số liệu, cơ cấu thiết bị, tiêu thụ) đều đã có khung chờ riêng — nên cổng
 * vào lại là thứ duy nhất không có. Dựng đúng bố cục sẽ hiện ra thì lúc dữ liệu
 * về, các khối thật thay vào chỗ khung xám chứ không nhảy từ giữa màn ra.
 *
 * Bố cục theo mẫu C (20/10): hàng chip đi tới khối, rồi từng khối gồm nhãn màu
 * (`HomeSectionTitle` thật, màu `HOME_BLOCK_TONES`) + nội dung, bọc trong
 * `HomeBlockToneContext` y như `renderBlock` để card bên trong tự lấy viền và
 * mép trên màu khối. Thiếu hàng chip và nhãn khối thì khung chờ ngắn hơn trang
 * thật cả trăm điểm, dữ liệu về là cả trang tụt xuống.
 *
 * Lưới số liệu và khối tiêu thụ dùng lại chính component thật ở chế độ đang tải,
 * không vẽ lại: hai chỗ vẽ riêng thì sửa kích thước ô một bên là lệch bên kia.
 * Khối công việc tự tải dữ liệu nên không dựng được ở đây — vẽ lại đúng khung
 * chờ của `WorkflowDashboardCard`.
 *
 * Tĩnh, không nhấp nháy — giống các khung chờ khác của Trang chủ. Khung chờ dạng
 * thẻ menu (`MenuCardSkeleton`) có nhấp nháy vì nó chiếm cả màn hàng chục dòng,
 * còn ở đây phần lớn màn là khối thật của các card.
 */
export default function HomeScreenSkeleton({
  blockKeys = DEFAULT_HOME_BLOCK_ORDER,
  collapsedKeys,
  statTileCount,
}: HomeScreenSkeletonProps) {
  const homeStyles = useStyles(makeHomeStyles);
  const styles = useStyles(makeStyles);
  const pageBackground = useHomePageBackground();
  const collapsedKeySet = useMemo(
    () => new Set(collapsedKeys ?? []),
    [collapsedKeys],
  );

  const renderBody = (key: HomeBlockKey) => {
    switch (key) {
      case "stats":
        return (
          <HomeStatTiles tiles={[]} isLoading skeletonCount={statTileCount} />
        );
      case "shortcuts":
        return <ShortcutsSkeleton />;
      case "workflow":
        return <WorkflowSkeleton />;
      case "assetStructure":
        return <AssetStructureSkeleton />;
      case "attendance":
        return <AttendanceSkeleton />;
      case "utilities":
        return <HomeUtilityCard rows={[]} isLoading />;
    }
  };

  return (
    <View
      style={[
        homeStyles.scrollContent,
        styles.wrap,
        { backgroundColor: pageBackground },
      ]}
      accessibilityLabel="Đang tải Trang chủ"
    >
      {blockKeys.length >= JUMP_BAR_MIN_BLOCKS ? (
        <JumpBarSkeleton keys={blockKeys} />
      ) : null}

      {blockKeys.map((key) => {
        const isCollapsed = collapsedKeySet.has(key);

        return (
          <View key={key} style={homeStyles.block}>
            <HomeBlockToneContext.Provider value={HOME_BLOCK_TONES[key]}>
              <HomeSectionTitle
                label={HOME_BLOCK_TITLES[key]}
                tone={HOME_BLOCK_TONES[key]}
                iconName={HOME_BLOCK_META[key].iconName}
                collapsed={isCollapsed}
              />
              {isCollapsed ? null : renderBody(key)}
            </HomeBlockToneContext.Provider>
          </View>
        );
      })}
    </View>
  );
}

/**
 * Hàng chip của `HomeJumpBar`: cùng nền, viền trung tính, cao 30, chấm màu khối.
 * Chữ chip tô xám, dài theo tên ngắn của khối.
 */
function JumpBarSkeleton({ keys }: { keys: HomeBlockKey[] }) {
  const styles = useStyles(makeStyles);
  const colors = useAppColors();
  const borderColor = useHomeCardBorderColor();

  return (
    <View style={styles.jumpBar}>
      {keys.map((key) => (
        <View
          key={key}
          style={[
            styles.jumpChip,
            { backgroundColor: colors.surface, borderColor },
          ]}
        >
          <View
            style={[
              styles.jumpDot,
              { backgroundColor: HOME_BLOCK_TONES[key].accent },
            ]}
          />
          <View
            style={[
              styles.jumpLabel,
              {
                width:
                  HOME_BLOCK_SHORT_LABELS[key].length * JUMP_CHIP_CHAR_WIDTH,
                backgroundColor: colors.skeleton,
              },
            ]}
          />
        </View>
      ))}
    </View>
  );
}

/**
 * Hàng Truy cập nhanh: ba ô cao `HOME_FEATURE_CARD_HEIGHT` + hàng chân
 * (chấm trang · "Xem tất cả") như HomeScreen.
 */
function ShortcutsSkeleton() {
  const homeStyles = useStyles(makeHomeStyles);
  const styles = useStyles(makeStyles);
  const colors = useAppColors();
  // Ô thật viền theo loại mục (`HomeMenuItemCard`), không theo màu khối. Lúc này
  // chưa biết đã ghim những gì nên lấy màu loại "chức năng" — ghim mặc định toàn
  // là chức năng.
  const chrome = useHomeCardChrome(colors.rose);

  return (
    <>
      <View style={styles.shortcutRow}>
        {Array.from({ length: HOME_SHORTCUT_COLUMNS }).map((_, index) => (
          <View
            key={`shortcut-${index}`}
            style={[
              styles.shortcutCard,
              chrome,
              { backgroundColor: colors.surface },
            ]}
          >
            <View
              style={[styles.shortcutIcon, { backgroundColor: colors.skeleton }]}
            />
            <View style={styles.shortcutLabelWrap}>
              <View
                style={[
                  styles.shortcutLabel,
                  { backgroundColor: colors.skeleton },
                ]}
              />
            </View>
          </View>
        ))}
      </View>
      {/* Ghim mặc định vừa một trang nên không có chấm trang, chỉ còn "Xem tất
          cả" bên phải — nhưng hàng vẫn cao như thật. */}
      <View style={[homeStyles.shortcutFooter, styles.shortcutFooter]}>
        <View
          style={[styles.shortcutViewAll, { backgroundColor: colors.skeleton }]}
        />
      </View>
    </>
  );
}

/** Đúng khung chờ của `WorkflowDashboardCard` (ba khối 64 · 56 · 96). */
function WorkflowSkeleton() {
  const styles = useStyles(makeStyles);
  const colors = useAppColors();
  const chrome = useHomeCardChrome();

  return (
    <View
      style={[styles.workflowCard, chrome, { backgroundColor: colors.surface }]}
    >
      <View style={[styles.workflowHero, { backgroundColor: colors.surfaceAlt }]} />
      <View
        style={[styles.workflowMonth, { backgroundColor: colors.surfaceAlt }]}
      />
      <View
        style={[styles.workflowChart, { backgroundColor: colors.surfaceAlt }]}
      />
    </View>
  );
}

/**
 * Khu CƠ CẤU TÀI SẢN đang tải: cao bằng trang cao nhất — trang tăng trưởng máy
 * móc (`HomeAssetPageCard` + khối chờ biểu đồ 176) — rồi hàng chấm trang.
 */
function AssetStructureSkeleton() {
  const styles = useStyles(makeStyles);
  const colors = useAppColors();
  const chrome = useHomeCardChrome();
  const tone = useHomeBlockTone();

  return (
    <>
      <View
        style={[styles.assetCard, chrome, { backgroundColor: colors.surface }]}
      >
        <View style={[styles.assetTitle, { backgroundColor: colors.skeleton }]} />
        <View
          style={[styles.assetChart, { backgroundColor: colors.surfaceAlt }]}
        />
      </View>
      <View style={styles.assetDots}>
        {[0, 1, 2].map((index) => (
          <View
            key={`asset-dot-${index}`}
            style={[
              styles.assetDot,
              { backgroundColor: colors.borderStrong },
              index === 0 && [
                styles.assetDotActive,
                { backgroundColor: tone?.accent ?? colors.borderStrong },
              ],
            ]}
          />
        ))}
      </View>
    </>
  );
}

/**
 * Khối điểm danh chỉ hiện khi đã có số nên không có khung chờ riêng; ở đây vẽ
 * phần đầu thẻ thật (ô chọn bộ phận, tỉ lệ, vạch, ba ô số). Khối này luôn nằm
 * dưới mép màn lúc mở app nên chỉ cần xấp xỉ.
 */
function AttendanceSkeleton() {
  const styles = useStyles(makeStyles);
  const colors = useAppColors();
  const chrome = useHomeCardChrome();

  return (
    <View
      style={[styles.attendanceCard, chrome, { backgroundColor: colors.surface }]}
    >
      <View
        style={[styles.attendancePicker, { backgroundColor: colors.surfaceAlt }]}
      />
      <View
        style={[styles.attendanceTitle, { backgroundColor: colors.skeleton }]}
      />
      <View
        style={[styles.attendanceNote, { backgroundColor: colors.skeleton }]}
      />
      <View
        style={[styles.attendanceTrack, { backgroundColor: colors.surfaceAlt }]}
      />
      <View style={styles.attendanceStats}>
        {[0, 1, 2].map((index) => (
          <View
            key={`attendance-stat-${index}`}
            style={[
              styles.attendanceStat,
              { backgroundColor: colors.surfaceAlt },
            ]}
          />
        ))}
      </View>
    </View>
  );
}

const makeStyles = () =>
  StyleSheet.create({
    wrap: {
      flex: 1,
      // Khối cuối dựng vượt đáy màn thì cắt, không đẩy khung dài ra.
      overflow: "hidden",
    },

    // `HomeJumpBar`: đệm dọc 8 + chip 30 + marginBottom 6, kéo ra sát hai mép.
    jumpBar: {
      flexDirection: "row",
      gap: 8,
      marginHorizontal: -HOME_CONTENT_HORIZONTAL_PADDING,
      paddingHorizontal: HOME_CONTENT_HORIZONTAL_PADDING,
      paddingVertical: 8,
      marginBottom: 6,
      overflow: "hidden",
    },
    jumpChip: {
      flexDirection: "row",
      alignItems: "center",
      gap: 5,
      height: 30,
      paddingHorizontal: 10,
      borderRadius: 15,
      borderWidth: 1,
    },
    jumpDot: {
      width: 7,
      height: 7,
      borderRadius: 4,
    },
    jumpLabel: {
      height: 10,
      borderRadius: 5,
    },

    shortcutRow: {
      flexDirection: "row",
      gap: HOME_FEATURE_GRID_GAP,
    },
    // `HomeMenuItemCard`: bo 16, đệm 8, icon 44 + 6, nhãn hai dòng 34.
    shortcutCard: {
      flex: 1,
      height: HOME_FEATURE_CARD_HEIGHT,
      borderRadius: 16,
      paddingTop: 8,
      paddingHorizontal: 8,
      alignItems: "center",
      overflow: "hidden",
    },
    shortcutIcon: {
      width: 44,
      height: 44,
      borderRadius: 14,
      marginBottom: 6,
    },
    shortcutLabelWrap: {
      minHeight: 34,
      width: "100%",
      alignItems: "center",
      justifyContent: "center",
    },
    shortcutLabel: {
      width: "64%",
      height: 11,
      borderRadius: 5,
    },
    shortcutFooter: {
      justifyContent: "flex-end",
    },
    // "Xem tất cả" 11pt + mũi tên 13.
    shortcutViewAll: {
      width: 72,
      height: 10,
      borderRadius: 5,
    },

    // `WorkflowDashboardCard`: card + khung chờ lúc chưa có số.
    workflowCard: {
      borderRadius: 18,
      paddingHorizontal: 14,
      paddingTop: 12,
      paddingBottom: 14,
      marginBottom: 14,
    },
    workflowHero: {
      height: 64,
      borderRadius: 12,
    },
    workflowMonth: {
      height: 56,
      marginTop: 12,
      borderRadius: 12,
    },
    workflowChart: {
      height: 96,
      marginTop: 12,
      borderRadius: 12,
    },

    // `HomeAssetPageCard` + khung chờ của `HomeMachineGrowthCard`.
    assetCard: {
      borderRadius: 18,
      paddingHorizontal: 14,
      paddingTop: 10,
      paddingBottom: 12,
    },
    // Tiêu đề trang 14pt đậm (~17) + marginBottom 4.
    assetTitle: {
      width: 150,
      height: 12,
      marginTop: 2.5,
      marginBottom: 6.5,
      borderRadius: 6,
    },
    assetChart: {
      height: 176,
      marginTop: 6,
      borderRadius: 12,
    },
    // `dots` của `HomeAssetStructurePager`.
    assetDots: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 5,
      minHeight: 24,
      marginTop: 6,
      marginBottom: 14,
    },
    assetDot: {
      width: 7,
      height: 7,
      borderRadius: 4,
    },
    assetDotActive: {
      width: 22,
    },

    // Phần đầu `HomeAttendanceCard` (đệm, ô chọn 44, tỉ lệ 16pt, ghi chú 11pt,
    // vạch 7, ba ô số ~53).
    attendanceCard: {
      borderRadius: 18,
      paddingHorizontal: 14,
      paddingTop: 12,
      paddingBottom: 14,
      marginBottom: 14,
    },
    attendancePicker: {
      height: 44,
      marginBottom: 12,
      borderRadius: 12,
    },
    attendanceTitle: {
      width: 160,
      height: 15,
      marginVertical: 2,
      borderRadius: 6,
    },
    attendanceNote: {
      width: 190,
      height: 10,
      marginTop: 4,
      marginBottom: 2,
      borderRadius: 5,
    },
    attendanceTrack: {
      height: 7,
      marginTop: 11,
      borderRadius: 4,
    },
    attendanceStats: {
      flexDirection: "row",
      gap: 8,
      marginTop: 12,
    },
    attendanceStat: {
      flex: 1,
      height: 53,
      borderRadius: 12,
    },
  });
