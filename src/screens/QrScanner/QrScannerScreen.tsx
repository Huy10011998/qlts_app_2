import React, { useCallback } from "react";
import { Linking, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
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
    resetScannerSession,
    resumeScanner,
    scanLineAnim,
    scannedRef,
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
        torch="off"
        codeScanner={codeScanner}
        resizeMode="cover"
        enableZoomGesture
      />

      <QrScannerViewportOverlay scanLineAnim={scanLineAnim} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#000" },
});
