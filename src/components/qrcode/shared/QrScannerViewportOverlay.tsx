import React from "react";
import { Animated, StyleSheet, View } from "react-native";

type QrScannerViewportOverlayProps = {
  scanLineAnim: Animated.Value;
};

export default function QrScannerViewportOverlay({
  scanLineAnim,
}: QrScannerViewportOverlayProps) {
  return (
    <View style={styles.overlay} pointerEvents="none">
      <View style={styles.mask} />
      <View style={styles.centerRow}>
        <View style={styles.mask} />
        <View style={styles.scanBox}>
          <Animated.View
            style={[
              styles.scanLine,
              {
                transform: [
                  {
                    translateY: scanLineAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0, 238],
                    }),
                  },
                ],
              },
            ]}
          />
        </View>
        <View style={styles.mask} />
      </View>
      <View style={styles.mask} />
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
  },
  mask: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
  },
  centerRow: {
    flexDirection: "row",
  },
  scanBox: {
    width: 240,
    height: 240,
    overflow: "hidden",
    borderRadius: 16,
  },
  scanLine: {
    height: 2,
    backgroundColor: "#00FF88",
  },
});
