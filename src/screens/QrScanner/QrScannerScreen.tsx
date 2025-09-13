import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  Linking,
  StyleSheet,
  TouchableOpacity,
  Vibration,
  Alert,
  Animated,
  Dimensions,
} from "react-native";
import QRCodeScanner from "react-native-qrcode-scanner";
import { RNCamera } from "react-native-camera";

const { width, height } = Dimensions.get("window");
const SCAN_SIZE = 250;

export default function QrScannerScreen() {
  const [scanned, setScanned] = useState(false);

  const onSuccess = async (e: any) => {
    if (scanned) return; // tránh quét nhiều lần
    setScanned(true);
    Vibration.vibrate(200);

    if (e.data.startsWith("http")) {
      const supported = await Linking.canOpenURL(e.data);
      if (supported) {
        Linking.openURL(e.data);
      } else {
        Alert.alert("Thông báo", `Không mở được link: ${e.data}`);
      }
    } else {
      Alert.alert("QR Data", e.data);
    }
  };

  return (
    <View style={styles.container}>
      <QRCodeScanner
        onRead={onSuccess}
        flashMode={RNCamera.Constants.FlashMode.auto}
        showMarker={true}
        reactivate={false}
        customMarker={
          <CustomMarker scanned={scanned} onReset={() => setScanned(false)} />
        }
        topContent={<Text style={styles.centerText}>Quét mã QR của bạn</Text>}
      />
    </View>
  );
}

function CustomMarker({
  scanned,
  onReset,
}: {
  scanned: boolean;
  onReset: () => void;
}) {
  const animatedValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(animatedValue, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(animatedValue, {
          toValue: 0,
          duration: 2000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [animatedValue]);

  const translateY = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0, SCAN_SIZE],
  });

  return (
    <View style={{ flex: 1 }}>
      {/* Overlay tối xung quanh */}
      <View
        style={[
          styles.overlay,
          { top: 0, height: (height - SCAN_SIZE) / 2, width },
        ]}
      />
      <View style={{ flexDirection: "row" }}>
        <View
          style={[
            styles.overlay,
            { width: (width - SCAN_SIZE) / 2, height: SCAN_SIZE },
          ]}
        />
        <View style={styles.scanArea}>
          {/* 4 góc xanh */}
          <View style={styles.borderTopLeft} />
          <View style={styles.borderTopRight} />
          <View style={styles.borderBottomLeft} />
          <View style={styles.borderBottomRight} />
          {/* Tia laser */}
          <Animated.View
            style={[styles.laser, { transform: [{ translateY }] }]}
          />
        </View>
        <View
          style={[
            styles.overlay,
            { width: (width - SCAN_SIZE) / 2, height: SCAN_SIZE },
          ]}
        />
      </View>
      <View
        style={[
          styles.overlay,
          { bottom: 0, height: (height - SCAN_SIZE) / 2, width },
        ]}
      />

      {/* Nút quét lại */}
      {scanned && (
        <TouchableOpacity style={styles.button} onPress={onReset}>
          <Text style={styles.buttonText}>Quét lại</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },
  centerText: {
    fontSize: 18,
    fontWeight: "bold",
    marginTop: 20,
    color: "#fff",
    textAlign: "center",
  },
  button: {
    position: "absolute",
    bottom: 80,
    alignSelf: "center",
    padding: 12,
    backgroundColor: "#FF3333",
    borderRadius: 10,
    alignItems: "center",
  },
  buttonText: { color: "#fff", fontSize: 16, fontWeight: "bold" },
  overlay: {
    backgroundColor: "rgba(0,0,0,0.6)",
  },
  scanArea: {
    width: SCAN_SIZE,
    height: SCAN_SIZE,
    justifyContent: "center",
    alignItems: "center",
  },
  borderTopLeft: {
    position: "absolute",
    top: 0,
    left: 0,
    width: 40,
    height: 40,
    borderTopWidth: 4,
    borderLeftWidth: 4,
    borderColor: "#00FF00",
  },
  borderTopRight: {
    position: "absolute",
    top: 0,
    right: 0,
    width: 40,
    height: 40,
    borderTopWidth: 4,
    borderRightWidth: 4,
    borderColor: "#00FF00",
  },
  borderBottomLeft: {
    position: "absolute",
    bottom: 0,
    left: 0,
    width: 40,
    height: 40,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
    borderColor: "#00FF00",
  },
  borderBottomRight: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 40,
    height: 40,
    borderBottomWidth: 4,
    borderRightWidth: 4,
    borderColor: "#00FF00",
  },
  laser: {
    position: "absolute",
    width: "100%",
    height: 2,
    backgroundColor: "red",
    opacity: 0.8,
  },
});
