import React, { Fragment, useEffect, useState } from "react";
import {
  View,
  Text,
  Alert,
  Platform,
  StyleSheet,
  TouchableOpacity,
} from "react-native";
import { request, PERMISSIONS, RESULTS } from "react-native-permissions";
import Ionicons from "react-native-vector-icons/Ionicons";
import {
  Camera,
  Code,
  CodeScanner,
  useCameraDevice,
  useCodeScanner,
} from "react-native-vision-camera";
import { useNavigation } from "@react-navigation/native";

export default function QrScannerScreen() {
  const [hasPermission, setHasPermission] = useState(false);
  const device = useCameraDevice("back") as any;
  const navigation = useNavigation();

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
    <View style={{ flex: 1 }}>
      <Camera
        style={StyleSheet.absoluteFill}
        device={device}
        isActive={true}
        codeScanner={codeScanner}
      />

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerCenter}>
          <Text style={styles.headerText}>Mã QR của tôi</Text>
        </View>
        <TouchableOpacity
          style={styles.closeBtn}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="close" size={30} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Khung quét */}
      <View style={styles.scanFrameContainer}>
        <View style={styles.scanFrame}>
          <View style={[styles.corner, styles.topLeft]} />
          <View style={[styles.corner, styles.topRight]} />
          <View style={[styles.corner, styles.bottomLeft]} />
          <View style={[styles.corner, styles.bottomRight]} />
        </View>
        <Text style={styles.scanText}>Quét mã QR</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  header: {
    position: "absolute",
    top: 50,
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  headerCenter: {
    alignItems: "center",
  },
  closeBtn: {
    position: "absolute",
    right: 10,
    top: 0,
  },
  headerText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "500",
    backgroundColor: "rgba(0,0,0,0.4)",
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 16,
  },
  scanFrameContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  scanFrame: {
    width: 250,
    height: 250,
    position: "relative",
  },
  corner: {
    width: 40,
    height: 40,
    borderColor: "#fff",
    position: "absolute",
  },
  topLeft: {
    top: 0,
    left: 0,
    borderLeftWidth: 6,
    borderTopWidth: 6,
  },
  topRight: {
    top: 0,
    right: 0,
    borderRightWidth: 6,
    borderTopWidth: 6,
  },
  bottomLeft: {
    bottom: 0,
    left: 0,
    borderLeftWidth: 6,
    borderBottomWidth: 6,
  },
  bottomRight: {
    bottom: 0,
    right: 0,
    borderRightWidth: 6,
    borderBottomWidth: 6,
  },
  scanText: {
    marginTop: 20,
    color: "#fff",
    fontSize: 16,
  },
  footer: {
    position: "absolute",
    bottom: 40,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "space-around",
  },
  footerBtn: {
    alignItems: "center",
  },
  footerText: {
    color: "#fff",
    fontSize: 14,
  },
});
