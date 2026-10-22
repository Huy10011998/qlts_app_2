import React, { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import WheelColumn, {
  WHEEL_VISIBLE_ROWS,
  WheelColumnHandle,
} from "./WheelColumn";
import { AppColors, useStyles } from "../../../utils/helpers/colors";
import { getTextScaleFactor } from "../../../utils/helpers/textScaling";

export type WheelGroupColumn = {
  accessibilityLabel: string;
  /** Chỉ đọc lúc mount, như `WheelColumn`. */
  initialIndex: number;
  labels: readonly string[];
  onChange: (index: number) => void;
  wheelRef?: React.Ref<WheelColumnHandle>;
};

type WheelGroupProps = {
  columns: readonly WheelGroupColumn[];
  /** Bề rộng mỗi cột; 3 cột thì hẹp lại cho vừa máy 320dp. */
  wheelWidth?: number;
};

const COLON_WIDTH = 28;

/**
 * Hàng bánh xe cao theo cỡ chữ người dùng chọn trong app, để chữ 150% vẫn nằm
 * gọn trong dải chọn giữa.
 */
const wheelItemHeight = () =>
  Math.round(48 + 24 * Math.max(0, getTextScaleFactor() - 1));

/**
 * Vài cột bánh xe tự vẽ đứng cạnh nhau, ngăn bằng dấu ":", chung một dải nền
 * đánh dấu hàng đang chọn như bánh xe của iOS. Dùng cho giờ:phút (form) và
 * giờ:phút:giây (Camera xem lại) trên Android.
 */
export default function WheelGroup({ columns, wheelWidth = 84 }: WheelGroupProps) {
  const styles = useStyles(makeStyles);
  const itemHeight = wheelItemHeight();
  // Bánh xe chỉ nhận vị trí lúc mount; về sau chúng tự báo giá trị lên.
  const [initialIndexes] = useState(() => columns.map((col) => col.initialIndex));

  return (
    <View
      style={[styles.wheelArea, { height: itemHeight * WHEEL_VISIBLE_ROWS }]}
    >
      <View
        pointerEvents="none"
        style={[
          styles.band,
          {
            top: itemHeight * ((WHEEL_VISIBLE_ROWS - 1) / 2),
            height: itemHeight,
            width:
              wheelWidth * columns.length +
              COLON_WIDTH * (columns.length - 1) +
              40,
          },
        ]}
      />
      {columns.map((column, index) => (
        <React.Fragment key={column.accessibilityLabel}>
          {index > 0 ? (
            <View style={styles.colonBox} pointerEvents="none">
              <Text style={styles.colon}>:</Text>
            </View>
          ) : null}
          <WheelColumn
            ref={column.wheelRef}
            accessibilityLabel={column.accessibilityLabel}
            labels={column.labels}
            initialIndex={initialIndexes[index]}
            itemHeight={itemHeight}
            width={wheelWidth}
            onChange={column.onChange}
          />
        </React.Fragment>
      ))}
    </View>
  );
}

const makeStyles = (c: AppColors) =>
  StyleSheet.create({
    wheelArea: {
      flexDirection: "row",
      justifyContent: "center",
      alignItems: "center",
      marginVertical: 4,
    },
    band: {
      position: "absolute",
      alignSelf: "center",
      borderRadius: 14,
      backgroundColor: c.surfaceAlt,
    },
    colonBox: {
      width: COLON_WIDTH,
      alignItems: "center",
      justifyContent: "center",
    },
    colon: {
      fontSize: 24,
      fontWeight: "700",
      color: c.text,
      // Dấu ":" của phông hệ thống nằm thấp hơn tâm chữ số một chút.
      marginTop: -3,
    },
  });
