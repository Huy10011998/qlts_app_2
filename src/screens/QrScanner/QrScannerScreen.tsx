import React, { useEffect, useState } from "react";
import { View, Text, Alert, Platform, StyleSheet } from "react-native";
import { request, PERMISSIONS, RESULTS } from "react-native-permissions";
import { Camera, useCameraDevice } from "react-native-vision-camera";

export default function QrScannerScreen() {
  const [hasPermission, setHasPermission] = useState(false);
  const device = useCameraDevice("back") as any;

  // ✅ Xin quyền camera
  useEffect(() => {
    (async () => {
      if (Platform.OS === "ios") {
        const result = await request(PERMISSIONS.IOS.CAMERA);
        if (result === RESULTS.GRANTED) setHasPermission(true);
        else {
          Alert.alert(
            "Thông báo",
            "Bạn cần cấp quyền camera trong Cài đặt để sử dụng chức năng quét QR."
          );
        }
      } else {
        const result = await request(PERMISSIONS.ANDROID.CAMERA);
        if (result === RESULTS.GRANTED) setHasPermission(true);
        else {
          Alert.alert(
            "Thông báo",
            "Bạn cần cấp quyền camera trong Cài đặt để sử dụng chức năng quét QR."
          );
        }
      }
    })();
  }, []);

  if (!hasPermission) {
    return (
      <View style={styles.center}>
        <Text>Đang chờ cấp quyền camera...</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, position: "relative" }}>
      <Camera style={StyleSheet.absoluteFill} device={device} isActive={true} />
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
});
