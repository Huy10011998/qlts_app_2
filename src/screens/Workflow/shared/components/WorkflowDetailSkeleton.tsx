import React from "react";
import {
  Animated,
  ScrollView,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";

import SkeletonBlock from "../../../../components/ui/SkeletonBlock";
import { useSkeletonPulse } from "../../../../components/ui/useSkeletonAutoFill";
import { useGroupedFields } from "../../../../hooks/AssetAddItem/useGroupedFields";
import { AppColors, useAppColors, useStyles } from "../../../../utils/helpers/colors";
import { elevation } from "../../../../utils/helpers/tokens";
import type { WorkflowField } from "../workflowFields";
import WorkflowHeroLinks, { WorkflowHeroLink } from "./WorkflowHeroLinks";
import WorkflowSection from "./WorkflowSection";
import WorkflowTabBar from "./WorkflowTabBar";

export type WorkflowDetailSkeletonVariant = "flow" | "congViec" | "keHoach";

// Thanh nút phụ (Sửa, Xoá…) cả ba màn đều theo quyền / dữ liệu chưa biết lúc
// chờ nên không vẽ.
type VariantConfig = {
  /** Dải Bình luận · Đính kèm ở đáy thẻ đầu — nhãn biết trước, vẽ thật. */
  heroLinks?: WorkflowHeroLink[];
  tabs?: string[];
  /** Khối vẽ riêng dưới phần field động (tiêu đề + icon biết trước). */
  sections?: { title: string; icon: string }[];
};

const NGUOI_THAM_GIA = { title: "Người tham gia", icon: "people-outline" };

const HERO_LINKS: WorkflowHeroLink[] = [
  { key: "binhLuan", icon: "chatbubble-ellipses-outline", label: "Bình luận" },
  { key: "file", icon: "attach-outline", label: "Đính kèm" },
];

// Bám đúng phần chắc chắn có của từng màn: Flow và Công việc luôn có dải Bình
// luận · Đính kèm trong thẻ đầu; Kế hoạch thì không.
const VARIANTS: Record<WorkflowDetailSkeletonVariant, VariantConfig> = {
  flow: { heroLinks: HERO_LINKS },
  congViec: {
    heroLinks: HERO_LINKS,
    tabs: ["Thông tin", "Lịch sử"],
    sections: [NGUOI_THAM_GIA],
  },
  keHoach: {
    tabs: ["Thông tin", "Công việc"],
    sections: [NGUOI_THAM_GIA],
  },
};

/** Số dòng của nhóm field giả khi chưa có metadata. */
const FALLBACK_FIELD_ROWS = 4;

type Opacity = Animated.AnimatedInterpolation<number>;

/**
 * Khung chờ màn chi tiết Workflow (phiếu Flow, công việc, kế hoạch) — thay vòng
 * xoay giữa màn trắng.
 *
 * Cùng lối với `AssetDetailsSkeleton`: thứ đã biết trước thì vẽ thật — khung thẻ
 * đầu, thanh tab, tên nhóm và nhãn field (metadata thường đã có trong cache từ
 * màn danh sách) — chỉ tô vạch xám chỗ GIÁ TRỊ phải chờ API. Lúc dữ liệu về, các
 * khối thay vào đúng chỗ, không nhảy layout.
 */
export default function WorkflowDetailSkeleton({
  variant,
  fields,
}: {
  variant: WorkflowDetailSkeletonVariant;
  /** Field của phần động (`getDetailFields`); rỗng thì dựng một nhóm giả. */
  fields: WorkflowField[];
}) {
  const styles = useStyles(makeStyles);
  const opacity = useSkeletonPulse();
  const config = VARIANTS[variant];

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      scrollEnabled={false}
      showsVerticalScrollIndicator={false}
      accessibilityLabel="Đang tải chi tiết"
    >
      {variant === "keHoach" ? (
        <KeHoachHero opacity={opacity} />
      ) : (
        <DefaultHero variant={variant} opacity={opacity} links={config.heroLinks} />
      )}

      {config.tabs ? (
        // Thanh tab thật để đúng kích thước viên; chặn chạm vì chưa có gì để đổi.
        <View pointerEvents="none">
          <WorkflowTabBar
            embedded
            tabs={config.tabs.map((label) => ({ key: label, label }))}
            activeKey={config.tabs[0]}
            onChange={() => undefined}
          />
        </View>
      ) : null}

      <FieldGroups fields={fields} opacity={opacity} />

      {config.sections?.map((section) => (
        <WorkflowSection key={section.title} title={section.title} icon={section.icon}>
          <SkeletonBlock opacity={opacity} style={[styles.line, styles.w60]} />
          <SkeletonBlock opacity={opacity} style={[styles.line, styles.w44]} />
        </WorkflowSection>
      ))}
    </ScrollView>
  );
}

/** Thẻ đầu của Flow / Công việc: dòng mã + nhãn trạng thái, tiêu đề, các dòng phụ. */
function DefaultHero({
  variant,
  opacity,
  links,
}: {
  variant: "flow" | "congViec";
  opacity: Opacity;
  links?: WorkflowHeroLink[];
}) {
  const styles = useStyles(makeStyles);
  const c = useAppColors();
  const metaIcons =
    variant === "flow" ? ["git-commit-outline"] : ["time-outline", "person-circle-outline"];

  return (
    <View style={styles.hero}>
      <View style={styles.heroTop}>
        <SkeletonBlock opacity={opacity} style={[styles.code, variant === "flow" && styles.w44]} />
        <SkeletonBlock opacity={opacity} style={styles.badge} />
      </View>
      <SkeletonBlock opacity={opacity} style={[styles.title, variant === "congViec" && styles.titleCongViec]} />
      {metaIcons.map((icon, index) => (
        <View key={icon} style={styles.heroLine}>
          <Ionicons name={icon} size={15} color={c.textMuted} />
          <SkeletonBlock opacity={opacity} style={[styles.line, index ? styles.w44 : styles.w60]} />
        </View>
      ))}
      {links ? <WorkflowHeroLinks links={links} /> : null}
    </View>
  );
}

/** Thẻ đầu của Kế hoạch: khối chữ bên trái + vòng % bên phải. */
function KeHoachHero({ opacity }: { opacity: Opacity }) {
  const styles = useStyles(makeStyles);
  const c = useAppColors();

  return (
    <View style={[styles.hero, styles.heroRow]}>
      <View style={styles.heroBody}>
        <SkeletonBlock opacity={opacity} style={styles.code} />
        <SkeletonBlock opacity={opacity} style={[styles.title, styles.titleKeHoach]} />
        {["calendar-outline", "person-circle-outline"].map((icon, index) => (
          <View key={icon} style={styles.heroLine}>
            <Ionicons name={icon} size={15} color={c.textMuted} />
            <SkeletonBlock opacity={opacity} style={[styles.line, index ? styles.w44 : styles.w60]} />
          </View>
        ))}
      </View>
      <View style={styles.progress}>
        <SkeletonBlock opacity={opacity} style={styles.ring} />
        <SkeletonBlock opacity={opacity} style={styles.progressText} />
      </View>
    </View>
  );
}

/**
 * Nhóm field dựng theo khung của `AssetGroupList`. Có metadata thì vẽ đúng tên
 * nhóm và nhãn field; chưa có thì một nhóm giả vài dòng.
 */
function FieldGroups({ fields, opacity }: { fields: WorkflowField[]; opacity: Opacity }) {
  const styles = useStyles(makeStyles);
  const c = useAppColors();
  const { groupedFields } = useGroupedFields(fields);
  const groups = Object.entries(groupedFields);

  if (!groups.length) {
    return (
      <View style={styles.groupCard}>
        <View style={styles.groupHeader}>
          <View style={styles.groupBullet} />
          <SkeletonBlock opacity={opacity} style={styles.groupTitleBar} />
          <View style={styles.groupTitleSpacer} />
          <View style={styles.groupChevron}>
            <Ionicons name="chevron-up" size={16} color={c.red} />
          </View>
        </View>
        {Array.from({ length: FALLBACK_FIELD_ROWS }).map((_, index) => (
          <View
            key={index}
            style={[styles.fieldRow, index < FALLBACK_FIELD_ROWS - 1 && styles.fieldDivider]}
          >
            <SkeletonBlock opacity={opacity} style={styles.labelBar} />
            <SkeletonBlock opacity={opacity} style={[styles.value, valueWidth(index)]} />
          </View>
        ))}
      </View>
    );
  }

  return (
    <>
      {groups.map(([groupName, groupFields]) => (
        <View key={groupName} style={styles.groupCard}>
          <View style={styles.groupHeader}>
            <View style={styles.groupBullet} />
            <Text style={styles.groupTitle} numberOfLines={1}>
              {groupName}
            </Text>
            <View style={styles.groupChevron}>
              <Ionicons name="chevron-up" size={16} color={c.red} />
            </View>
          </View>
          {groupFields.map((field, index) => (
            <View
              key={field.name ?? `${groupName}-${index}`}
              style={[styles.fieldRow, index < groupFields.length - 1 && styles.fieldDivider]}
            >
              {/* Không cắt một dòng: nhãn thật xuống dòng khi dài, cắt ở đây thì
                  dòng field thấp hơn dòng thật. */}
              <Text style={styles.label}>{field.moTa}</Text>
              <SkeletonBlock opacity={opacity} style={[styles.value, valueWidth(index)]} />
            </View>
          ))}
        </View>
      ))}
    </>
  );
}

// Dài ngắn khác nhau cho giống giá trị thật, không thành một cột vạch đều tăm tắp.
const valueWidth = (index: number): ViewStyle => ({
  width: index % 3 === 0 ? "34%" : index % 4 === 1 ? "76%" : "58%",
});

const makeStyles = (c: AppColors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: c.bg,
    },
    // Cùng lề với nội dung thật của ba màn chi tiết.
    content: {
      padding: 12,
      paddingBottom: 40,
    },
    hero: {
      backgroundColor: c.surface,
      borderRadius: 16,
      padding: 14,
      marginBottom: 10,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.border,
      ...elevation(c.shadow, 1),
    },
    heroRow: {
      flexDirection: "row",
      alignItems: "center",
    },
    heroBody: {
      flex: 1,
      marginRight: 10,
    },
    heroTop: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 8,
    },
    code: {
      width: 96,
      height: 13,
      marginVertical: 2,
      borderRadius: 6,
    },
    badge: {
      width: 76,
      height: 22,
      borderRadius: 999,
    },
    title: {
      width: "62%",
      height: 18,
      marginTop: 9,
      marginBottom: 6,
      borderRadius: 7,
    },
    titleCongViec: {
      width: "78%",
    },
    titleKeHoach: {
      width: "80%",
      marginTop: 8,
      marginBottom: 4,
    },
    heroLine: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      marginTop: 6,
    },
    line: {
      height: 12,
      marginVertical: 3,
      borderRadius: 6,
    },
    w60: {
      width: "60%",
    },
    w44: {
      width: "44%",
    },
    progress: {
      alignItems: "center",
    },
    ring: {
      width: 60,
      height: 60,
      borderRadius: 30,
    },
    progressText: {
      width: 48,
      height: 11,
      marginTop: 6,
      borderRadius: 5,
    },
    // Khung nhóm field — số đo của `AssetGroupList`.
    groupCard: {
      backgroundColor: c.surface,
      borderRadius: 12,
      padding: 16,
      marginBottom: 16,
      shadowColor: c.shadow,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 6,
      elevation: 3,
    },
    groupHeader: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      paddingVertical: 4,
      paddingBottom: 12,
      marginBottom: 4,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: c.border,
    },
    groupBullet: {
      width: 4,
      height: 16,
      borderRadius: 2,
      backgroundColor: c.red,
    },
    groupTitle: {
      flex: 1,
      fontSize: 15.5,
      fontWeight: "700",
      color: c.red,
    },
    groupTitleBar: {
      width: "42%",
      height: 15,
      borderRadius: 6,
    },
    groupTitleSpacer: {
      flex: 1,
    },
    groupChevron: {
      width: 26,
      height: 26,
      borderRadius: 13,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: c.redSurface,
    },
    fieldRow: {
      paddingVertical: 9,
    },
    fieldDivider: {
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: c.border,
    },
    // Đúng `label` của `AssetGroupList` (đậm, textSecondary, 12).
    label: {
      fontWeight: "bold",
      color: c.textSecondary,
      fontSize: 12,
      letterSpacing: 0.2,
      marginBottom: 3,
    },
    // Thay dòng nhãn chữ 12 (≈ 14.3) + `marginBottom` 3 khi chưa có metadata.
    labelBar: {
      width: "28%",
      height: 11,
      marginTop: (14.3 - 11) / 2,
      marginBottom: (14.3 - 11) / 2 + 3,
      borderRadius: 5,
    },
    value: {
      height: 14,
      marginVertical: 3,
      borderRadius: 6,
    },
  });
