import React, { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { AppColors, useStyles } from "../../../utils/helpers/colors";
import { formatTime } from "../shared/workflowDate";

/**
 * Vạch "Bây giờ" giữa các việc của hôm nay, như Google Calendar: việc phía trên
 * đã tới giờ, phía dưới là việc sắp tới. Giờ tự nhảy theo phút khi màn để lâu.
 */
export default function LichNowLine() {
  const styles = useStyles(makeStyles);
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 30 * 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <View style={styles.row} accessibilityLabel={`Bây giờ ${formatTime(now)}`}>
      <View style={styles.dot} />
      <Text style={styles.text}>{`Bây giờ ${formatTime(now)}`}</Text>
      <View style={styles.line} />
    </View>
  );
}

const makeStyles = (c: AppColors) =>
  StyleSheet.create({
    row: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      marginBottom: 8,
    },
    dot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: c.red,
    },
    text: {
      fontSize: 11.5,
      fontWeight: "700",
      color: c.red,
    },
    line: {
      flex: 1,
      height: 1.5,
      borderRadius: 1,
      backgroundColor: c.red,
    },
  });
