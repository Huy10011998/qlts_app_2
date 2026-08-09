import React from "react";
import { StyleSheet, Text, View } from "react-native";
import {
  useAppColors,
  useHairlineBorderColor,
} from "../../../utils/helpers/colors";

type SettingSectionGroupProps = {
  title?: string;
  /**
   * Thu hẹp khoảng cách phía trên. Dùng cho nhóm đầu tiên: phần đáy sóng đỏ đã
   * là nền xám nên khoảng trắng trên nhãn bị cộng dồn, nhìn hở hơn các nhóm sau.
   */
  tightTop?: boolean;
  children: React.ReactNode;
};

export default function SettingSectionGroup({
  title,
  tightTop,
  children,
}: SettingSectionGroupProps) {
  const colors = useAppColors();
  const hairlineBorderColor = useHairlineBorderColor();

  return (
    <View style={[styles.group, tightTop && styles.groupTightTop]}>
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
          {
            backgroundColor: colors.surface,
            borderColor: hairlineBorderColor,
            shadowColor: colors.shadow,
          },
        ]}
      >
        {children}
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
