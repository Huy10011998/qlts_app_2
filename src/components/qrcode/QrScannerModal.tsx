import React, { useCallback, useEffect } from "react";
import {
  Linking,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import {
  Camera,
  Code,
  CodeScanner,
  useCodeScanner,
} from "react-native-vision-camera";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import Ionicons from "react-native-vector-icons/Ionicons";
import ReactNativeHapticFeedback from "react-native-haptic-feedback";
import { QrScannerModalProps } from "../../types";
import QrScannerGateView from "./shared/QrScannerGateView";
import QrScannerViewportOverlay from "./shared/QrScannerViewportOverlay";
import useQrScannerController from "./shared/useQrScannerController";

export default function QrScannerModal({
  visible,
  title = "Quét mã QR",
  subtitle,
  closeIconName = "close",
  onClose,
  onScan,
}: QrScannerModalProps) {
  const insets = useSafeAreaInsets();
  const {
    activateScanner,
    cameraActive,
    clearInitTimeoutTimer,
    device,
    format,
    hasPermission,
    initTimeout,
    isTorchOn,
    pauseScanner,
    resetScannerSession,
    resumeScanner,
    scanLineAnim,
    scannedRef,
    setIsTorchOn,
    startInitTimeoutTimer,
  } = useQrScannerController({ enabled: visible });

  const closeScanner = useCallback(() => {
    pauseScanner();
    resetScannerSession();
    clearInitTimeoutTimer();
    onClose();
  }, [clearInitTimeoutTimer, onClose, pauseScanner, resetScannerSession]);

  useEffect(() => {
    if (!visible) return;

    resetScannerSession();
    activateScanner();
    startInitTimeoutTimer();

    return () => {
      clearInitTimeoutTimer();
      pauseScanner();
    };
  }, [
    activateScanner,
    clearInitTimeoutTimer,
    pauseScanner,
    resetScannerSession,
    startInitTimeoutTimer,
    visible,
  ]);

  const codeScanner: CodeScanner = useCodeScanner({
    codeTypes: ["qr"],
    onCodeScanned: (codes: Code[]) => {
      if (!visible || !codes.length || scannedRef.current) return;

      const rawValue = codes[0]?.value?.trim() ?? "";
      if (!rawValue) return;

      pauseScanner();
      ReactNativeHapticFeedback.trigger("impactLight");

      onScan(rawValue, {
        pause: pauseScanner,
        resume: resumeScanner,
        close: closeScanner,
      });
    },
  });

  return (
    <Modal
      visible={visible}
      animationType="slide"
      onRequestClose={closeScanner}
      statusBarTranslucent
    >
      <SafeAreaView style={styles.root}>
        {hasPermission === null ? null : !hasPermission ? (
          <QrScannerGateView
            iconName="camera-off-outline"
            title="Không có quyền camera"
            description="Ứng dụng cần quyền camera để quét mã QR."
            actionLabel="Mở Cài đặt"
            onAction={Linking.openSettings}
            onBack={closeScanner}
          />
        ) : !device || !format ? (
          <QrScannerGateView
            iconName={initTimeout ? "alert-circle-outline" : "camera-outline"}
            iconColor={initTimeout ? "#FF3B30" : "#999"}
            title={initTimeout ? "Không thể mở camera" : "Đang khởi tạo camera..."}
            description={initTimeout ? "Camera không phản hồi. Vui lòng thử lại." : undefined}
            onBack={closeScanner}
          />
        ) : (
          <>
            <View style={StyleSheet.absoluteFill} pointerEvents="none">
              <Camera
                style={StyleSheet.absoluteFill}
                device={device}
                format={format}
                isActive={cameraActive}
                torch={isTorchOn ? "on" : "off"}
                codeScanner={codeScanner}
                resizeMode="cover"
              />
            </View>

            <View
              pointerEvents="box-none"
              style={[styles.header, { paddingTop: insets.top + 8 }]}
            >
              <TouchableOpacity hitSlop={10} onPress={closeScanner}>
                <Ionicons name={closeIconName} size={24} color="#fff" />
              </TouchableOpacity>

              <View style={styles.headerTitleWrap}>
                <Text style={styles.headerTitle}>{title}</Text>
                {subtitle ? (
                  <Text style={styles.headerSubtitle}>{subtitle}</Text>
                ) : null}
              </View>

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

            <QrScannerViewportOverlay scanLineAnim={scanLineAnim} />
          </>
        )}
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#000" },
  header: {
    position: "absolute",
    left: 0,
    right: 0,
    zIndex: 10,
    elevation: 10,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  headerTitleWrap: {
    flex: 1,
    marginLeft: 16,
    marginRight: 16,
  },
  headerTitle: {
    color: "#fff",
    fontSize: 17,
    fontWeight: "bold",
  },
  headerSubtitle: {
    color: "rgba(255,255,255,0.82)",
    fontSize: 12,
    marginTop: 2,
  },
});
