import React from "react";
import { Alert, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";
import { HOME_BRAND_RED } from "./homeTheme";
import type { HomeBlockTone } from "./homeBlockTone";
import {
  AppColors,
  useAppColors,
  useStyles,
} from "../../../utils/helpers/colors";

type HomeSectionTitleProps = {
  label: string;
  /** Màu nhóm: nền nhãn và đường kẻ cạnh nhãn. */
  tone: HomeBlockTone;
  /** Icon Ionicons của nhóm, đứng trước chữ trong nhãn. */
  iconName: string;
  /** Khối đang thu gọn (chỉ còn dòng tiêu đề này). */
  collapsed?: boolean;
  /** Có thì nhãn bấm được để thu gọn / mở khối. */
  onToggleCollapsed?: () => void;
  action?: string;
  /** Icon Ionicons đứng trước chữ của nút hành động. */
  actionIconName?: string;
  onAction?: () => void;
  /** Chú thích phụ, ví dụ "Cập nhật 09:12". Hiển thị mờ, không bấm được. */
  note?: string;
};

/** Đường kẻ cạnh nhãn: màu nhóm ở ~35% — đủ thấy, không tranh với nhãn. */
const RULE_ALPHA = "59";

export default function HomeSectionTitle({
  label,
  tone,
  iconName,
  collapsed = false,
  onToggleCollapsed,
  action,
  actionIconName,
  onAction,
  note,
}: HomeSectionTitleProps) {
  const styles = useStyles(makeStyles);
  const colors = useAppColors();
  const handleActionPress =
    onAction ??
    (() => {
      Alert.alert(
        "Thông báo",
        "Chức năng sẽ được triển khai trong thời gian sắp tới.",
      );
    });
  // Đang thu gọn thì chú thích của nội dung (giờ số liệu, số mục đã ghim) không
  // còn gì để chú thích — thay bằng lời nhắc khối đang gập.
  const visibleNote = collapsed ? "Đã thu gọn" : note;

  return (
    <View style={styles.row}>
      <TouchableOpacity
        style={[styles.tab, { backgroundColor: tone.label }]}
        onPress={onToggleCollapsed}
        disabled={!onToggleCollapsed}
        activeOpacity={0.8}
        hitSlop={{ top: 8, right: 4, bottom: 8, left: 4 }}
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityHint={
          onToggleCollapsed
            ? collapsed
              ? "Chạm để mở khối"
              : "Chạm để thu gọn khối"
            : undefined
        }
        accessibilityState={
          onToggleCollapsed ? { expanded: !collapsed } : undefined
        }
      >
        <Ionicons name={iconName} size={12} color="#FFFFFF" />
        <Text style={styles.tabLabel} numberOfLines={1}>
          {label}
        </Text>
        {onToggleCollapsed ? (
          <Ionicons
            name={collapsed ? "chevron-down" : "chevron-up"}
            size={11}
            color="rgba(255,255,255,0.9)"
          />
        ) : null}
      </TouchableOpacity>

      <View
        style={[styles.rule, { backgroundColor: `${tone.accent}${RULE_ALPHA}` }]}
      />

      {/* Chú thích + nút là MỘT cụm: hết chỗ thì cả cụm xuống hàng dưới và
          canh phải, không để nút rớt một mình sang trái. */}
      {visibleNote || action ? (
        <View style={styles.trailing}>
          {/* Chú thích phụ đứng ngay cạnh tiêu đề: "số liệu lúc HH:mm" là thứ
              cho biết đang xem số mới hay số cũ, để tuột mất là người xem không
              có chỗ nào khác để biết. */}
          {visibleNote ? (
            <Text
              style={[styles.note, { color: colors.textMuted }]}
              numberOfLines={2}
            >
              {visibleNote}
            </Text>
          ) : null}

          {action ? (
            <TouchableOpacity
              style={styles.actionButton}
              onPress={handleActionPress}
              activeOpacity={0.7}
              hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
              accessibilityRole="button"
              accessibilityLabel={action}
            >
              {actionIconName ? (
                <Ionicons
                  name={actionIconName}
                  size={13}
                  color={HOME_BRAND_RED}
                />
              ) : null}
              <Text style={styles.action}>
                {action}
              </Text>
            </TouchableOpacity>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

const makeStyles = (c: AppColors) =>
  StyleSheet.create({
    // Không đủ chỗ (chữ to, màn hẹp) thì chú thích + nút bên phải xuống dòng
    // dưới, canh phải — nhãn giữ đủ chữ. Trước đây chúng đứng cùng hàng và ép
    // nhãn còn "TRUY CẬ…" ở cỡ chữ 150%.
    row: {
      width: "100%",
      flexDirection: "row",
      flexWrap: "wrap",
      alignItems: "center",
      columnGap: 8,
      rowGap: 6,
      marginBottom: 12,
      marginTop: 2,
    },
    // Nhãn chỉ co lại (chữ cắt "…") khi riêng nó đã dài hơn cả hàng.
    // Chữ in hoa đậm trên nền đặc trông to hơn cỡ thật, nên nhãn để nhỏ hơn chữ
    // trong card — to bằng là "TRUY CẬP NHANH" bị cắt vì đứng chung với
    // chú thích và nút Tuỳ chỉnh.
    tab: {
      flexDirection: "row",
      alignItems: "center",
      gap: 5,
      flexShrink: 1,
      minHeight: 26,
      paddingVertical: 5,
      paddingLeft: 8,
      paddingRight: 9,
      borderRadius: 9,
    },
    tabLabel: {
      flexShrink: 1,
      fontSize: 11,
      fontWeight: "800",
      letterSpacing: 0.2,
      color: "#FFFFFF",
    },
    rule: {
      flex: 1,
      minWidth: 12,
      height: 2,
      borderRadius: 1,
    },
    // `marginLeft: auto`: cùng hàng với nhãn thì đường kẻ đã chiếm hết chỗ trống
    // nên không có tác dụng; rớt xuống hàng dưới thì đẩy cả cụm sang phải.
    trailing: {
      marginLeft: "auto",
      flexShrink: 1,
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },
    note: {
      flexShrink: 1,
      fontSize: 10.5,
      fontWeight: "600",
      color: c.textMuted,
      textAlign: "right",
    },
    actionButton: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      flexShrink: 0,
    },
    action: {
      fontSize: 11.5,
      color: HOME_BRAND_RED,
      fontWeight: "700",
    },
  });
