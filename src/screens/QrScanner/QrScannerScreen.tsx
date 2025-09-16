import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  Alert,
  Platform,
  StyleSheet,
  TouchableOpacity,
} from "react-native";
import { check, request, PERMISSIONS, RESULTS } from "react-native-permissions";
import { RNCamera } from "react-native-camera";
import { useNavigation } from "@react-navigation/native";
import { Linking } from "react-native";

export default function QrScannerScreen() {
  const [hasPermission, setHasPermission] = useState(false);
  const [scanned, setScanned] = useState(false);
  const navigation = useNavigation();

  // ✅ Xin quyền camera khi vào màn hình
  useEffect(() => {
    const requestCamera = async () => {
      if (Platform.OS === "ios") {
        const result = await request(PERMISSIONS.IOS.CAMERA);
        console.log("Camera permission result:", result);
        if (result === RESULTS.GRANTED) {
          setHasPermission(true);
        } else {
          Alert.alert(
            "Thông báo",
            "Bạn cần cấp quyền camera trong Cài đặt để sử dụng chức năng quét QR."
          );
        }
      } else {
        const result = await request(PERMISSIONS.ANDROID.CAMERA);
        if (result === RESULTS.GRANTED) {
          setHasPermission(true);
        } else {
          Alert.alert(
            "Thông báo",
            "Bạn cần cấp quyền camera trong Cài đặt để sử dụng chức năng quét QR."
          );
        }
      }
    };

    requestCamera();
  }, []);

  // ✅ Xử lý dữ liệu QR code
  const handleBarCodeScanned = async ({ data }: { data: string }) => {
    // if (scanned) return; // tránh scan liên tục
    // setScanned(true);
    // try {
    //   if (data.startsWith("/profile/")) {
    //     const id = data.replace("/profile/", "");
    //     navigation.navigate("Profile" as never, { id } as never);
    //   } else if (data.startsWith("/ticket/")) {
    //     const id = data.replace("/ticket/", "");
    //     navigation.navigate("TicketDetail" as never, { id } as never);
    //   } else if (data.startsWith("/asset/")) {
    //     const id = data.replace("/asset/", "");
    //     navigation.navigate("AssetDetail" as never, { id } as never);
    //   } else if (data.startsWith("http")) {
    //     const supported = await Linking.canOpenURL(data);
    //     supported
    //       ? Linking.openURL(data)
    //       : Alert.alert("Thông báo", `Không mở được link: ${data}`);
    //   } else {
    //     Alert.alert("QR Data", data);
    //   }
    // } catch (err) {
    //   console.error("QR Scan error:", err);
    // }
    // Cho phép quét lại sau 2s
    // setTimeout(() => setScanned(false), 2000);
  };

  if (!hasPermission) {
    return (
      <View style={styles.center}>
        <Text>Đang chờ cấp quyền camera...</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <RNCamera
        style={styles.camera}
        onBarCodeRead={handleBarCodeScanned}
        captureAudio={false} // bỏ mic cho nhẹ app
      >
        <View style={styles.overlay}>
          <Text style={styles.overlayText}>Quét QR Code</Text>
        </View>
      </RNCamera>

      {scanned && (
        <TouchableOpacity
          style={styles.button}
          onPress={() => setScanned(false)}
        >
          <Text style={styles.buttonText}>Quét lại</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  camera: {
    flex: 1,
  },
  overlay: {
    position: "absolute",
    top: 50,
    alignSelf: "center",
    backgroundColor: "rgba(0,0,0,0.5)",
    padding: 10,
    borderRadius: 8,
  },
  overlayText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  button: {
    position: "absolute",
    bottom: 40,
    alignSelf: "center",
    backgroundColor: "#007AFF",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  buttonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 16,
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
});
