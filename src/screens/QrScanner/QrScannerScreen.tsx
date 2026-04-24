import React, { useEffect, useRef, useState, useCallback } from "react";
import {
  View,
  Text,
  Alert,
  Platform,
  StyleSheet,
  TouchableOpacity,
  Animated,
  AppState,
  Linking,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";

import { request, PERMISSIONS, RESULTS } from "react-native-permissions";
import Ionicons from "react-native-vector-icons/Ionicons";
import ReactNativeHapticFeedback from "react-native-haptic-feedback";

import {
  Camera,
  Code,
  CodeScanner,
  useCameraDevice,
  useCodeScanner,
  useCameraFormat,
} from "react-native-vision-camera";

import { useNavigation, useFocusEffect } from "@react-navigation/native";
import {
  getDetails,
  getFieldActive,
  getPropertyClass,
} from "../../services/Index";
import { error } from "../../utils/Logger";
import { useSafeAlert } from "../../hooks/useSafeAlert";

/* ========================================================= */
export default function QrScannerScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();

  /* ---------- AppState ---------- */
  const [appState, setAppState] = useState(AppState.currentState);

  useEffect(() => {
    const sub = AppState.addEventListener("change", setAppState);
    return () => sub.remove();
  }, []);

  /* ---------- Camera ---------- */
  const device = useCameraDevice("back");

  const format =
    useCameraFormat(device, [
      { videoResolution: { width: 1280, height: 720 } },
      { fps: 30 },
    ]) ?? device?.formats[0];

  // null = chưa hỏi, true = được cấp, false = bị từ chối
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [screenActive, setScreenActive] = useState(false);
  const [initTimeout, setInitTimeout] = useState(false);
  const [isTorchOn, setIsTorchOn] = useState(false);
  const scannedRef = useRef(false);
  const initTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { showAlertIfActive } = useSafeAlert();

  const cameraActive = screenActive && appState === "active";

  /* ---------- Scan Line Animation ---------- */
  const scanLineAnim = useRef(new Animated.Value(0)).current;
  const scanLoopRef = useRef<Animated.CompositeAnimation | null>(null);

  // FIX 1: wrap bằng useCallback để stable reference
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

  /* ---------- Screen Focus ---------- */
  // FIX 2: thêm startScanLine / stopScanLine vào deps
  useFocusEffect(
    useCallback(() => {
      scannedRef.current = false;
      setInitTimeout(false);
      setIsTorchOn(false);

      const timeout = setTimeout(() => {
        setScreenActive(true);
      }, 100); // fix camera đen Android

      // FIX 7: timeout fallback 5s nếu device không ready
      initTimerRef.current = setTimeout(() => {
        setInitTimeout(true);
      }, 5000);

      startScanLine();

      return () => {
        clearTimeout(timeout);
        if (initTimerRef.current) clearTimeout(initTimerRef.current);
        setScreenActive(false);
        stopScanLine();
      };
    }, [startScanLine, stopScanLine]),
  );

  /* ---------- Permission — lần đầu ---------- */
  const checkPermission = useCallback(async () => {
    const result =
      Platform.OS === "ios"
        ? await request(PERMISSIONS.IOS.CAMERA)
        : await request(PERMISSIONS.ANDROID.CAMERA);
    setHasPermission(result === RESULTS.GRANTED);
  }, []);

  useEffect(() => {
    checkPermission();
  }, [checkPermission]);

  // FIX 3: re-check permission khi app active trở lại
  // (user vào Settings cấp quyền rồi quay lại)
  useEffect(() => {
    if (appState !== "active" || hasPermission === true) return;
    checkPermission();
  }, [appState, hasPermission, checkPermission]);

  /* ---------- QR Scanner ---------- */
  const codeScanner: CodeScanner = useCodeScanner({
    codeTypes: ["qr"],
    onCodeScanned: async (codes: Code[]) => {
      if (!codes.length || scannedRef.current) return;

      scannedRef.current = true;
      setScreenActive(false);
      stopScanLine();

      ReactNativeHapticFeedback.trigger("impactLight");

      const raw = codes[0]?.value ?? "";
      const normalizedRaw = raw.trim();

      const resumeScanner = () => {
        scannedRef.current = false;
        setScreenActive(true);
        startScanLine();
      };

      if (!normalizedRaw) {
        showAlertIfActive("Mã QR không hợp lệ", undefined, [
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
          showAlertIfActive("Mã QR không hợp lệ", undefined, [
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
        showAlertIfActive("QR không hợp lệ", undefined, [
          {
            text: "OK",
            onPress: resumeScanner,
          },
        ]);
      }
    },
  });

  /* ---------- Gates ---------- */

  // Chưa hỏi permission → không render gì, tránh flash UI
  if (hasPermission === null) {
    return null;
  }

  // Permission bị từ chối → hướng dẫn vào Settings
  if (!hasPermission) {
    return (
      <SafeAreaView style={styles.gateRoot}>
        <TouchableOpacity
          style={styles.backBtn}
          hitSlop={10}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>

        <View style={styles.gateContent}>
          <Ionicons name="camera-off-outline" size={56} color="#999" />
          <Text style={styles.gateTitle}>Không có quyền camera</Text>
          <Text style={styles.gateDesc}>
            Ứng dụng cần quyền truy cập camera để quét mã QR.{"\n"}
            Vui lòng cấp quyền trong phần Cài đặt.
          </Text>
          <TouchableOpacity
            style={styles.settingsBtn}
            onPress={() => Linking.openSettings()}
          >
            <Text style={styles.settingsBtnText}>Mở Cài đặt</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // FIX 7: device/format chưa sẵn sàng sau 5s → báo lỗi
  if (!device || !format) {
    return (
      <SafeAreaView style={styles.gateRoot}>
        <TouchableOpacity
          style={styles.backBtn}
          hitSlop={10}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>

        <View style={styles.gateContent}>
          {initTimeout ? (
            <>
              <Ionicons name="alert-circle-outline" size={56} color="#FF3B30" />
              <Text style={styles.gateTitle}>Không thể mở camera</Text>
              <Text style={styles.gateDesc}>
                Camera không phản hồi. Vui lòng thử lại.
              </Text>
              <TouchableOpacity
                style={styles.settingsBtn}
                onPress={() => navigation.goBack()}
              >
                <Text style={styles.settingsBtnText}>Quay lại</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <Ionicons name="camera-outline" size={56} color="#999" />
              <Text style={styles.gateTitle}>Đang khởi tạo camera...</Text>
            </>
          )}
        </View>
      </SafeAreaView>
    );
  }

  /* ---------- UI ---------- */
  return (
    <SafeAreaView style={styles.root} edges={[]}>
      {/* FIX 4: bỏ prop zoom — Camera tự dùng neutralZoom mặc định */}
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

      {/* HEADER */}
      <View
        pointerEvents="box-none"
        style={[styles.header, { paddingTop: insets.top + 8 }]}
      >
        <TouchableOpacity
          hitSlop={10}
          onPress={() => {
            setScreenActive(false);
            navigation.goBack();
          }}
        >
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>Quét mã QR</Text>

        {/* FIX 5: flash có handler thực, settings bỏ (decoration) */}
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

      {/* OVERLAY */}
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
    </SafeAreaView>
  );
}

/* ========================================================= */
/* STYLES */
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#000" },

  /* --- Gate screens --- */
  gateRoot: {
    flex: 1,
    backgroundColor: "#fff",
  },
  backBtn: {
    padding: 16,
  },
  gateContent: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
    marginTop: -60,
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

  /* --- Scanner UI --- */
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

  overlay: { ...StyleSheet.absoluteFillObject },
  mask: { flex: 1, backgroundColor: "rgba(0,0,0,0.55)" },
  centerRow: { flexDirection: "row" },
  scanBox: {
    width: 240,
    height: 240,
    overflow: "hidden",
  },
  scanLine: {
    height: 2,
    backgroundColor: "#00FF88",
  },
});
