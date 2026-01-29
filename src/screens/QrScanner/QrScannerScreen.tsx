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
import { getFieldActive, getPropertyClass } from "../../services/Index";
import { error } from "../../utils/Logger";
import { property } from "lodash";

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

  const [hasPermission, setHasPermission] = useState(false);
  const [screenActive, setScreenActive] = useState(false);
  const scannedRef = useRef(false);

  const cameraActive = screenActive && appState === "active";

  /* ---------- Scan Line Animation ---------- */
  const scanLineAnim = useRef(new Animated.Value(0)).current;
  const scanLoopRef = useRef<Animated.CompositeAnimation | null>(null);

  const startScanLine = () => {
    scanLineAnim.setValue(0);
    scanLoopRef.current = Animated.loop(
      Animated.timing(scanLineAnim, {
        toValue: 1,
        duration: 2200,
        useNativeDriver: true,
      }),
    );
    scanLoopRef.current.start();
  };

  const stopScanLine = () => {
    scanLoopRef.current?.stop();
  };

  /* ---------- Screen Focus ---------- */
  useFocusEffect(
    useCallback(() => {
      scannedRef.current = false;

      const timeout = setTimeout(() => {
        setScreenActive(true);
      }, 100); // 🔑 fix camera đen Android

      startScanLine();

      return () => {
        clearTimeout(timeout);
        setScreenActive(false);
        stopScanLine();
      };
    }, []),
  );

  /* ---------- Permission ---------- */
  useEffect(() => {
    (async () => {
      const result =
        Platform.OS === "ios"
          ? await request(PERMISSIONS.IOS.CAMERA)
          : await request(PERMISSIONS.ANDROID.CAMERA);

      if (result === RESULTS.GRANTED) {
        setHasPermission(true);
      } else {
        Alert.alert("Thông báo", "Bạn cần cấp quyền camera để quét QR");
      }
    })();
  }, []);

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
      const parts = raw.replace(/^\//, "").split("/").filter(Boolean);

      try {
        if (parts.length !== 2) throw new Error("INVALID_QR");

        const [nameClass, id] = parts;
        const res = await getFieldActive(nameClass);
        const resProp = await getPropertyClass(nameClass);

        navigation.navigate("QrDetails", {
          id,
          titleHeader: nameClass,
          nameClass,
          field: res?.data || [],
          propertyClass: resProp?.data,
        });
      } catch (e) {
        error(e);
        Alert.alert("QR không hợp lệ", raw, [
          {
            text: "OK",
            onPress: () => {
              scannedRef.current = false;
              setScreenActive(true);
              startScanLine();
            },
          },
        ]);
      }
    },
  });

  /* ---------- Loading ---------- */
  if (!device || !format || !hasPermission) {
    return (
      <View style={styles.center}>
        <Text style={{ color: "#fff" }}>Đang khởi tạo camera...</Text>
      </View>
    );
  }

  /* ---------- UI ---------- */
  return (
    <SafeAreaView style={styles.root} edges={[]}>
      <Camera
        style={StyleSheet.absoluteFill}
        device={device}
        format={format}
        isActive={cameraActive}
        codeScanner={codeScanner}
        resizeMode="cover"
        enableZoomGesture
        zoom={device.neutralZoom ?? 1}
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

        <View style={styles.headerRight}>
          <Ionicons name="flash-outline" size={22} color="#fff" />
          <Ionicons
            name="settings-outline"
            size={22}
            color="#fff"
            style={{ marginLeft: 16 }}
          />
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
  center: { flex: 1, justifyContent: "center", alignItems: "center" },

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
