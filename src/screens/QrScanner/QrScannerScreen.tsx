import React, { Fragment, useEffect, useState } from "react";
import { View, Text, Alert, Platform, StyleSheet } from "react-native";
import { request, PERMISSIONS, RESULTS } from "react-native-permissions";
import {
  Camera,
  Code,
  CodeScanner,
  useCameraDevice,
  useCodeScanner,
} from "react-native-vision-camera";

export default function QrScannerScreen() {
  const [hasPermission, setHasPermission] = useState(false);
  const device = useCameraDevice("back") as any;

  const [isScanned, setIsScanned] = useState<boolean>(false);
  const [QRCodeResult, setQRCodeResult] = useState<string>("");

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

  useEffect(() => {
    if (isScanned) {
      Alert.alert(
        "Thông báo",
        `Result: ${QRCodeResult}`,
        [
          {
            text: "Confirm",
            onPress: () => {
              setIsScanned(false);
              setQRCodeResult("");
            },
          },
        ],
        { cancelable: false }
      );
    }
  }, [isScanned, QRCodeResult]);

  const codeScanner: CodeScanner = useCodeScanner({
    codeTypes: ["qr"],
    onCodeScanned: (codes: Code[]) => {
      if (codes.length > 0) {
        setIsScanned(true);
        setQRCodeResult(codes?.[0]?.value || "");
      }
    },
  });

  if (!device) return <Fragment />;

  if (!hasPermission) {
    return (
      <View style={styles.center}>
        <Text>Đang chờ cấp quyền camera...</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, position: "relative" }}>
      <Camera
        style={StyleSheet.absoluteFill}
        device={device}
        isActive={true}
        codeScanner={codeScanner}
      />
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
