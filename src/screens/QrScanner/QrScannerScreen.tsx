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
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { QrScannerNavigationProp } from "../../types";
import { getFieldActive } from "../../services/Index";
import { log } from "../../utils/Logger";

export default function QrScannerScreen() {
  const [hasPermission, setHasPermission] = useState(false);
  const device = useCameraDevice("back") as any;
  const navigation = useNavigation<QrScannerNavigationProp>();
  const [isScanned, setIsScanned] = useState<boolean>(false);

  // ✅ Xin quyền camera
  useEffect(() => {
    (async () => {
      const result =
        Platform.OS === "ios"
          ? await request(PERMISSIONS.IOS.CAMERA)
          : await request(PERMISSIONS.ANDROID.CAMERA);

      if (result === RESULTS.GRANTED) {
        setHasPermission(true);
      } else {
        Alert.alert(
          "Thông báo",
          "Bạn cần cấp quyền camera trong Cài đặt để sử dụng chức năng quét QR."
        );
      }
    })();
  }, []);

  // ✅ Reset state mỗi khi quay lại màn hình scan
  useFocusEffect(
    React.useCallback(() => {
      setIsScanned(false);
    }, [])
  );

  // ✅ Xử lý khi scan QR
  const codeScanner: CodeScanner = useCodeScanner({
    codeTypes: ["qr"],
    onCodeScanned: async (codes: Code[]) => {
      if (codes.length > 0 && !isScanned) {
        setIsScanned(true);

        const data = codes?.[0]?.value || "";
        log("QR Data:", data); // ví dụ: /maytinh/1493

        const cleanData = data.startsWith("/") ? data.slice(1) : data;
        const parts = cleanData
          .split("/")
          .map((item) => item.trim()) // loại bỏ \r, \n, khoảng trắng thừa
          .filter((item) => item.length > 0); // bỏ phần rỗng nếu có

        log("parts: ", parts);

        if (parts.length === 2) {
          const [title, id] = parts;

          try {
            const responseFieldActive = await getFieldActive(title);
            const fieldActive = responseFieldActive?.data || [];

            navigation.navigate("HomeTab", {
              screen: "QrDetails",
              params: {
                id,
                titleHeader: title,
                nameClass: title,
                field: JSON.stringify(fieldActive),
              },
            });
          } catch (error) {
            console.error("Lỗi khi gọi getFieldActive:", error);
            Alert.alert("Lỗi", "Không lấy được dữ liệu từ server.");
            setIsScanned(false);
          }
        } else {
          Alert.alert("QR không hợp lệ", data, [
            { text: "OK", onPress: () => setIsScanned(false) },
          ]);
        }
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
});
