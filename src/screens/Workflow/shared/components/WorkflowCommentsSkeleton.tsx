import React from "react";
import { StyleSheet, View } from "react-native";

import SkeletonBlock from "../../../../components/ui/SkeletonBlock";
import { useSkeletonPulse } from "../../../../components/ui/useSkeletonAutoFill";
import { AppColors, useStyles } from "../../../../utils/helpers/colors";

/**
 * Nhịp tin dựng sẵn: người khác bên trái, của mình bên phải, dài ngắn khác nhau
 * cho ra dáng một cuộc trao đổi. `lines` = số vạch chữ trong bong bóng.
 */
const BUBBLES: { mine: boolean; lines: number; width: `${number}%` }[] = [
  { mine: false, lines: 2, width: "72%" },
  { mine: false, lines: 1, width: "48%" },
  { mine: true, lines: 1, width: "56%" },
  { mine: false, lines: 2, width: "66%" },
  { mine: true, lines: 2, width: "64%" },
];

/**
 * Khung chờ danh sách bình luận (`WorkflowCommentsScreen`), nằm đúng chỗ của
 * danh sách — ô soạn bên dưới vẫn là thật. Bong bóng người khác là hộp trắng có
 * vạch tên + chữ; bong bóng của mình (thật là nền đỏ) vẽ thành khối xám đặc để
 * khỏi nhá một mảng đỏ lúc chờ.
 */
export default function WorkflowCommentsSkeleton() {
  const styles = useStyles(makeStyles);
  const opacity = useSkeletonPulse();

  return (
    <View style={styles.wrap} accessibilityLabel="Đang tải bình luận">
      {BUBBLES.map((bubble, index) =>
        bubble.mine ? (
          <View key={index} style={[styles.row, styles.rowMine]}>
            <SkeletonBlock
              opacity={opacity}
              style={[
                styles.bubble,
                styles.bubbleMine,
                { width: bubble.width, height: 22 + bubble.lines * 20 },
              ]}
            />
          </View>
        ) : (
          <View key={index} style={styles.row}>
            <View style={[styles.bubble, styles.bubbleOther, { width: bubble.width }]}>
              <SkeletonBlock opacity={opacity} style={styles.author} />
              {Array.from({ length: bubble.lines }).map((_, line) => (
                <SkeletonBlock
                  key={line}
                  opacity={opacity}
                  style={[styles.text, line === bubble.lines - 1 && styles.textLast]}
                />
              ))}
              <SkeletonBlock opacity={opacity} style={styles.time} />
            </View>
          </View>
        ),
      )}
    </View>
  );
}

// Số đo của `WorkflowCommentsScreen` (bubble, author, messageText, time).
const makeStyles = (c: AppColors) =>
  StyleSheet.create({
    wrap: {
      flex: 1,
      padding: 12,
      overflow: "hidden",
    },
    row: {
      flexDirection: "row",
      marginBottom: 10,
    },
    rowMine: {
      justifyContent: "flex-end",
    },
    bubble: {
      borderRadius: 16,
    },
    bubbleOther: {
      backgroundColor: c.surface,
      borderTopLeftRadius: 4,
      paddingHorizontal: 12,
      paddingVertical: 10,
    },
    bubbleMine: {
      borderTopRightRadius: 4,
    },
    author: {
      width: 96,
      height: 10,
      borderRadius: 5,
      marginBottom: 8,
    },
    text: {
      width: "100%",
      height: 12,
      borderRadius: 6,
      marginBottom: 7,
    },
    textLast: {
      width: "64%",
    },
    time: {
      alignSelf: "flex-end",
      width: 34,
      height: 9,
      borderRadius: 4,
      marginTop: 2,
    },
  });
