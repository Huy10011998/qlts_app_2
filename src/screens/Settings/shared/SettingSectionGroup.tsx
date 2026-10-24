import React from "react";
import { StyleProp, StyleSheet, Text, View, ViewStyle } from "react-native";
import {
  useAppColors,
  useHairlineBorderColor,
} from "../../../utils/helpers/colors";
import { getHomeCardChrome } from "../../Home/shared/homeBlockTone";

type SettingSectionGroupProps = {
  title?: string;
  /**
   * Thu hẹp khoảng cách phía trên. Dùng cho nhóm đầu tiên: phần đáy sóng đỏ đã
   * là nền xám nên khoảng trắng trên nhãn bị cộng dồn, nhìn hở hơn các nhóm sau.
   */
  tightTop?: boolean;
  style?: StyleProp<ViewStyle>;
  /**
   * Màu viền card + mép trên 3pt, cùng kiểu card Trang chủ (`getHomeCardChrome`).
   * Không truyền thì card chỉ có viền mảnh trung tính.
   */
  accent?: string;
  children: React.ReactNode;
};

/**
 * `accent` của nhóm đang bọc dòng, để vạch ngăn các dòng (`SettingRowItem`) cùng
 * màu viền card. Ngoài nhóm có `accent` thì null — dòng giữ vạch xám mảnh.
 */
export const SettingSectionAccentContext = React.createContext<string | null>(
  null,
);

export default function SettingSectionGroup({
  title,
  tightTop,
  style,
  accent,
  children,
}: SettingSectionGroupProps) {
  const colors = useAppColors();
  const hairlineBorderColor = useHairlineBorderColor();

  return (
    <View style={[styles.group, tightTop && styles.groupTightTop, style]}>
      {title ? (
        <View style={styles.titleRow}>
          <View
            style={[styles.titleLine, { backgroundColor: colors.border }]}
          />
          <Text style={[styles.title, { color: colors.textSub }]}>{title}</Text>
          <View
            style={[styles.titleLine, { backgroundColor: colors.border }]}
          />
        </View>
      ) : null}
      <View
        style={[
          styles.card,
          { backgroundColor: colors.surface },
          accent
            ? getHomeCardChrome({
                borderColor: accent,
                shadowColor: colors.shadow,
                accent,
              })
            : {
                borderColor: hairlineBorderColor,
                shadowColor: colors.shadow,
              },
        ]}
      >
        <SettingSectionAccentContext.Provider value={accent ?? null}>
          {children}
        </SettingSectionAccentContext.Provider>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  group: {
    marginHorizontal: 16,
    marginTop: 22,
  },
  groupTightTop: {
    // Âm để nhãn ăn vào phần đáy sóng — chỗ đó sóng đã tô nền xám nên không đè
    // lên mảng đỏ.
    marginTop: -10,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  titleLine: {
    flex: 1,
    height: 1,
  },
  title: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1.2,
    marginHorizontal: 10,
  },
  card: {
    borderRadius: 18,
    overflow: "hidden",
    shadowOpacity: 0.07,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
    borderWidth: StyleSheet.hairlineWidth,
  },
});
