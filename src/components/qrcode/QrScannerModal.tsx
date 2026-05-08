import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Animated,
  AppState,
  Linking,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import {
  Camera,
  Code,
  CodeScanner,
  useCameraDevice,
  useCameraFormat,
  useCodeScanner,
} from "react-native-vision-camera";
import { request, PERMISSIONS, RESULTS } from "react-native-permissions";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import Ionicons from "react-native-vector-icons/Ionicons";
import ReactNativeHapticFeedback from "react-native-haptic-feedback";
import { QrScannerModalProps } from "../../types";

export default function QrScannerModal({
  visible,
  title = "Quét mã QR",
  subtitle,
  closeIconName = "close",
  onClose,
  onScan,
}: QrScannerModalProps) {
  const insets = useSafeAreaInsets();
  const [appState, setAppState] = useState(AppState.currentState);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [initTimeout, setInitTimeout] = useState(false);
  const [isTorchOn, setIsTorchOn] = useState(false);
  const [isScannerPaused, setIsScannerPaused] = useState(false);
  const scannedRef = useRef(false);
  const initTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scanLineAnim = useRef(new Animated.Value(0)).current;
  const scanLoopRef = useRef<Animated.CompositeAnimation | null>(null);
  const device = useCameraDevice("back");
  const format =
    useCameraFormat(device, [
      { videoResolution: { width: 1280, height: 720 } },
      { fps: 30 },
    ]) ?? device?.formats[0];

  const cameraActive = visible && appState === "active" && !isScannerPaused;

  useEffect(() => {
    const sub = AppState.addEventListener("change", setAppState);
    return () => sub.remove();
  }, []);

  const startScanLine = useCallback(() => {
    scanLineAnim.setValue(0);
    scanLoopRef.current = Animated.loop(
      Animated.timing(scanLineAnim, {
        toValue: 1,
        duration: 2200,
        useNativeDriver: true,
      }),
    );
    scanLoopRef.current.start();
  }, [scanLineAnim]);

  const stopScanLine = useCallback(() => {
    scanLoopRef.current?.stop();
  }, []);

  const pauseScanner = useCallback(() => {
    scannedRef.current = true;
    setIsScannerPaused(true);
    stopScanLine();
  }, [stopScanLine]);

  const resumeScanner = useCallback(() => {
    scannedRef.current = false;
    setIsScannerPaused(false);
    startScanLine();
  }, [startScanLine]);

  const closeScanner = useCallback(() => {
    pauseScanner();
    setIsTorchOn(false);
    setInitTimeout(false);
    if (initTimerRef.current) {
      clearTimeout(initTimerRef.current);
      initTimerRef.current = null;
    }
    onClose();
  }, [onClose, pauseScanner]);

  const checkPermission = useCallback(async () => {
    const result =
      Platform.OS === "ios"
        ? await request(PERMISSIONS.IOS.CAMERA)
        : await request(PERMISSIONS.ANDROID.CAMERA);
    setHasPermission(result === RESULTS.GRANTED);
  }, []);

  useEffect(() => {
    if (!visible) return;

    scannedRef.current = false;
    setIsScannerPaused(false);
    setInitTimeout(false);
    setIsTorchOn(false);
    void checkPermission();
    startScanLine();

    initTimerRef.current = setTimeout(() => {
      setInitTimeout(true);
    }, 5000);

    return () => {
      if (initTimerRef.current) {
        clearTimeout(initTimerRef.current);
        initTimerRef.current = null;
      }
      stopScanLine();
    };
  }, [checkPermission, startScanLine, stopScanLine, visible]);

  useEffect(() => {
    if (appState !== "active" || hasPermission === true || !visible) return;
    void checkPermission();
  }, [appState, checkPermission, hasPermission, visible]);

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
          <View style={styles.gateContent}>
            <TouchableOpacity
              style={styles.backBtn}
              hitSlop={10}
              onPress={closeScanner}
            >
              <Ionicons name={closeIconName} size={24} color="#333" />
            </TouchableOpacity>

            <Ionicons name="camera-off-outline" size={56} color="#999" />
            <Text style={styles.gateTitle}>Không có quyền camera</Text>
            <Text style={styles.gateDesc}>
              Ứng dụng cần quyền camera để quét mã QR.
            </Text>
            <TouchableOpacity
              style={styles.settingsBtn}
              onPress={() => Linking.openSettings()}
            >
              <Text style={styles.settingsBtnText}>Mở Cài đặt</Text>
            </TouchableOpacity>
          </View>
        ) : !device || !format ? (
          <View style={styles.gateContent}>
            <TouchableOpacity
              style={styles.backBtn}
              hitSlop={10}
              onPress={closeScanner}
            >
              <Ionicons name={closeIconName} size={24} color="#333" />
            </TouchableOpacity>

            {initTimeout ? (
              <>
                <Ionicons
                  name="alert-circle-outline"
                  size={56}
                  color="#FF3B30"
                />
                <Text style={styles.gateTitle}>Không thể mở camera</Text>
                <Text style={styles.gateDesc}>
                  Camera không phản hồi. Vui lòng thử lại.
                </Text>
              </>
            ) : (
              <>
                <Ionicons name="camera-outline" size={56} color="#999" />
                <Text style={styles.gateTitle}>Đang khởi tạo camera...</Text>
              </>
            )}
          </View>
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
          </>
        )}
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#000" },
  gateContent: {
    flex: 1,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
  },
  backBtn: {
    position: "absolute",
    top: 16,
    left: 16,
    zIndex: 1,
  },
  gateTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#222",
    marginTop: 16,
    marginBottom: 8,
  },
  gateDesc: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    lineHeight: 22,
  },
  settingsBtn: {
    marginTop: 24,
    paddingVertical: 12,
    paddingHorizontal: 32,
    backgroundColor: "#007AFF",
    borderRadius: 10,
  },
  settingsBtnText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "600",
  },
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
  overlay: { ...StyleSheet.absoluteFillObject, zIndex: 1 },
  mask: { flex: 1, backgroundColor: "rgba(0,0,0,0.55)" },
  centerRow: { flexDirection: "row" },
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
