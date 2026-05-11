import React, { useCallback } from "react";
import {
  Linking,
  Text,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import Ionicons from "react-native-vector-icons/Ionicons";
import ReactNativeHapticFeedback from "react-native-haptic-feedback";
import {
  Camera,
  Code,
  CodeScanner,
  useCodeScanner,
} from "react-native-vision-camera";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import {
  getDetails,
  getFieldActive,
  getPropertyClass,
} from "../../services/Index";
import { error } from "../../utils/Logger";
import { useSafeAlert } from "../../hooks/useSafeAlert";
import QrScannerGateView from "../../components/qrcode/shared/QrScannerGateView";
import QrScannerViewportOverlay from "../../components/qrcode/shared/QrScannerViewportOverlay";
import useQrScannerController from "../../components/qrcode/shared/useQrScannerController";

export default function QrScannerScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { showAlertIfActive } = useSafeAlert();
  const {
    activateScanner,
    cameraActive,
    clearInitTimeoutTimer,
    deactivateScanner,
    device,
    format,
    hasPermission,
    initTimeout,
    isTorchOn,
    resetScannerSession,
    resumeScanner,
    scanLineAnim,
    scannedRef,
    setIsTorchOn,
    startInitTimeoutTimer,
  } = useQrScannerController({ enabled: true });

  useFocusEffect(
    useCallback(() => {
      resetScannerSession();

      const timeout = setTimeout(() => {
        activateScanner();
      }, 100);

      startInitTimeoutTimer();

      return () => {
        clearTimeout(timeout);
        clearInitTimeoutTimer();
        deactivateScanner();
      };
    }, [
      activateScanner,
      clearInitTimeoutTimer,
      deactivateScanner,
      resetScannerSession,
      startInitTimeoutTimer,
    ]),
  );
  const codeScanner: CodeScanner = useCodeScanner({
    codeTypes: ["qr"],
    onCodeScanned: async (codes: Code[]) => {
      if (!codes.length || scannedRef.current) return;

      scannedRef.current = true;
      deactivateScanner();

      ReactNativeHapticFeedback.trigger("impactLight");

      const raw = codes[0]?.value ?? "";
      const normalizedRaw = raw.trim();

      if (!normalizedRaw) {
        showAlertIfActive("Mã QR không hợp lệ", "Thông báo", [
          {
            text: "OK",
            onPress: resumeScanner,
          },
        ]);
        return;
      }

      const parts = normalizedRaw.replace(/^\//, "").split("/").filter(Boolean);

      try {
        if (parts.length !== 2) throw new Error("INVALID_QR");

        const [nameClass, id] = parts;
        const detailRes = await getDetails(nameClass, id);
        const itemData = detailRes?.data;

        if (
          !itemData ||
          (typeof itemData === "object" &&
            !Array.isArray(itemData) &&
            Object.keys(itemData).length === 0)
        ) {
          showAlertIfActive("Mã QR không hợp lệ", "Thông báo", [
            {
              text: "OK",
              onPress: resumeScanner,
            },
          ]);
          return;
        }

        const [res, resProp] = await Promise.all([
          getFieldActive(nameClass),
          getPropertyClass(nameClass),
        ]);

        navigation.navigate("QrDetails", {
          id,
          titleHeader: nameClass,
          nameClass,
          field: res?.data || [],
          propertyClass: resProp?.data,
          itemData,
        });
      } catch (e) {
        error(e);
        showAlertIfActive("QR không hợp lệ", "Thông báo", [
          {
            text: "OK",
            onPress: resumeScanner,
          },
        ]);
      }
    },
  });

  if (hasPermission === null) {
    return null;
  }

  if (!hasPermission) {
    return (
      <QrScannerGateView
        iconName="camera-off-outline"
        title="Không có quyền camera"
        description={`Ứng dụng cần quyền truy cập camera để quét mã QR.\nVui lòng cấp quyền trong phần Cài đặt.`}
        actionLabel="Mở Cài đặt"
        onAction={Linking.openSettings}
        onBack={() => navigation.goBack()}
        contentOffsetY={-60}
      />
    );
  }

  if (!device || !format) {
    return (
      <QrScannerGateView
        iconName={initTimeout ? "alert-circle-outline" : "camera-outline"}
        iconColor={initTimeout ? "#FF3B30" : "#999"}
        title={initTimeout ? "Không thể mở camera" : "Đang khởi tạo camera..."}
        description={
          initTimeout ? "Camera không phản hồi. Vui lòng thử lại." : undefined
        }
        actionLabel={initTimeout ? "Quay lại" : undefined}
        onAction={initTimeout ? () => navigation.goBack() : undefined}
        onBack={() => navigation.goBack()}
        contentOffsetY={-60}
      />
    );
  }

  return (
    <SafeAreaView style={styles.root} edges={[]}>
      <Camera
        style={StyleSheet.absoluteFill}
        device={device}
        format={format}
        isActive={cameraActive}
        torch={isTorchOn ? "on" : "off"}
        codeScanner={codeScanner}
        resizeMode="cover"
        enableZoomGesture
      />

      <View
        pointerEvents="box-none"
        style={[styles.header, { paddingTop: insets.top + 8 }]}
      >
        <TouchableOpacity
          hitSlop={10}
          onPress={() => {
            deactivateScanner();
            navigation.goBack();
          }}
        >
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>Quét mã QR</Text>

        <View style={styles.headerRight}>
          <TouchableOpacity
            hitSlop={10}
            onPress={() => setIsTorchOn((prev) => !prev)}
          >
            <Ionicons
              name={isTorchOn ? "flash" : "flash-off"}
              size={22}
              color="#fff"
            />
          </TouchableOpacity>
        </View>
      </View>

      <QrScannerViewportOverlay scanLineAnim={scanLineAnim} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#000" },
  header: {
    position: "absolute",
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  headerTitle: {
    flex: 1,
    marginLeft: 16,
    color: "#fff",
    fontSize: 17,
    fontWeight: "bold",
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
  },
});
