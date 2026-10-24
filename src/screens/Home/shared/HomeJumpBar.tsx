import React from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  type LayoutChangeEvent,
} from "react-native";

import {
  AppColors,
  useAppColors,
  useStyles,
} from "../../../utils/helpers/colors";
import { HOME_CONTENT_HORIZONTAL_PADDING } from "../HomeScreen.styles";
import type { HomeBlockKey } from "./homeBlockOrder";
import {
  HOME_BLOCK_SHORT_LABELS,
  HOME_BLOCK_TONES,
  useHomeCardBorderColor,
} from "./homeBlockTone";

type HomeJumpBarProps = {
  /** Đúng các khối đang hiện, theo thứ tự trên màn. */
  keys: HomeBlockKey[];
  onJump: (key: HomeBlockKey) => void;
  /** Nền trang: thanh dính trên cùng khi cuộn, nền trong suốt thì chữ chồng chữ. */
  backgroundColor: string;
  onLayout?: (event: LayoutChangeEvent) => void;
};

/**
 * Hàng chip ngay dưới header, mỗi chip một khối, chấm màu trùng màu nhãn của
 * khối. Trang chủ dài cỡ ba màn hình — chạm chip là tới khối cần xem, khỏi cuộn
 * dò. HomeScreen cho hàng này dính trên cùng (`stickyHeaderIndices`).
 */
export default function HomeJumpBar({
  keys,
  onJump,
  backgroundColor,
  onLayout,
}: HomeJumpBarProps) {
  const styles = useStyles(makeStyles);
  const colors = useAppColors();
  const borderColor = useHomeCardBorderColor();

  return (
    <View style={[styles.wrap, { backgroundColor }]} onLayout={onLayout}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.row}
      >
        {keys.map((key) => (
          <TouchableOpacity
            key={key}
            style={[
              styles.chip,
              { backgroundColor: colors.surface, borderColor },
            ]}
            onPress={() => onJump(key)}
            activeOpacity={0.7}
            hitSlop={{ top: 6, bottom: 6 }}
            accessibilityRole="button"
            accessibilityLabel={`Đi tới khối ${HOME_BLOCK_SHORT_LABELS[key]}`}
          >
            <View
              style={[
                styles.dot,
                { backgroundColor: HOME_BLOCK_TONES[key].accent },
              ]}
            />
            <Text style={[styles.chipText, { color: colors.text }]}>
              {HOME_BLOCK_SHORT_LABELS[key]}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const makeStyles = (c: AppColors) =>
  StyleSheet.create({
    // Kéo ra sát hai mép màn: lúc dính trên cùng, phần nội dung cuộn bên dưới
    // không lòi ra ở hai dải lề 16pt.
    wrap: {
      marginHorizontal: -HOME_CONTENT_HORIZONTAL_PADDING,
      paddingVertical: 8,
      marginBottom: 6,
    },
    row: {
      paddingHorizontal: HOME_CONTENT_HORIZONTAL_PADDING,
      gap: 8,
    },
    chip: {
      flexDirection: "row",
      alignItems: "center",
      gap: 5,
      minHeight: 30,
      paddingHorizontal: 10,
      borderRadius: 15,
      borderWidth: 1,
      backgroundColor: c.surface,
      shadowColor: c.shadow,
      shadowOpacity: 0.06,
      shadowRadius: 3,
      shadowOffset: { width: 0, height: 1 },
      elevation: 1,
    },
    dot: {
      width: 7,
      height: 7,
      borderRadius: 4,
    },
    chipText: {
      fontSize: 11.5,
      fontWeight: "700",
      color: c.text,
    },
  });
