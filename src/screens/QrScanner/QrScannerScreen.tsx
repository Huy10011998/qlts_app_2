import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  Alert,
  Platform,
  StyleSheet,
  TouchableOpacity,
  Animated,
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
import { getFieldActive } from "../../services/Index";
import { error } from "../../utils/Logger";

export default function QrScannerScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();

  const device = useCameraDevice("back");
  const format = device
    ? useCameraFormat(device, [
        { videoResolution: { width: 1280, height: 720 } },
        { fps: 30 },
      ])
    : undefined;

  const [hasPermission, setHasPermission] = useState(false);
  const [isActive, setIsActive] = useState(false);
  const scannedRef = useRef(false);

  /* ---------- Scan line ---------- */
  const scanLineAnim = useRef(new Animated.Value(0)).current;

  const startScanLine = () => {
    scanLineAnim.setValue(0);
    Animated.loop(
      Animated.timing(scanLineAnim, {
        toValue: 1,
        duration: 2200,
        useNativeDriver: true,
      }),
    ).start();
  };

  useFocusEffect(
    React.useCallback(() => {
      setIsActive(true);
      scannedRef.current = false;
      startScanLine();
      return () => setIsActive(false);
    }, []),
  );

  /* ---------- Permission ---------- */
  useEffect(() => {
    (async () => {
      const result =
        Platform.OS === "ios"
          ? await request(PERMISSIONS.IOS.CAMERA)
          : await request(PERMISSIONS.ANDROID.CAMERA);

      if (result === RESULTS.GRANTED) setHasPermission(true);
      else {
        Alert.alert("Thông báo", "Bạn cần cấp quyền camera để quét QR");
      }
    })();
  }, []);

  /* ---------- QR Scan ---------- */
  const codeScanner: CodeScanner = useCodeScanner({
    codeTypes: ["qr"],
    onCodeScanned: async (codes: Code[]) => {
      if (scannedRef.current || !codes.length) return;

      scannedRef.current = true;
      setIsActive(false);

      ReactNativeHapticFeedback.trigger("impactLight");

      const raw = codes[0]?.value ?? "";
      const parts = raw.replace(/^\//, "").split("/").filter(Boolean);

      try {
        if (parts.length === 2) {
          const [nameClass, id] = parts;
          const res = await getFieldActive(nameClass);

          navigation.navigate("QrDetails", {
            id,
            titleHeader: nameClass,
            nameClass,
            field: res?.data || [],
          });
          return;
        }

        throw new Error("INVALID_QR");
      } catch (e) {
        error(e);
        Alert.alert("QR không hợp lệ", raw, [
          {
            text: "OK",
            onPress: () => {
              scannedRef.current = false;
              setIsActive(true);
              startScanLine();
            },
          },
        ]);
      }
    },
  });

  if (!device || !format || !hasPermission) {
    return (
      <View style={styles.center}>
        <Text>Đang khởi tạo camera...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.root} edges={[]}>
      {/* CAMERA */}
      <Camera
        style={StyleSheet.absoluteFill}
        device={device}
        format={format}
        isActive={isActive}
        codeScanner={codeScanner}
        resizeMode="cover"
        enableZoomGesture
        zoom={device.neutralZoom ?? 1}
      />

      {/* HEADER (VCB STYLE) */}
      <View
        pointerEvents="box-none"
        style={[styles.header, { paddingTop: insets.top + 8 }]}
      >
        <TouchableOpacity
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          onPress={() => {
            if (navigation.canGoBack()) {
              navigation.goBack();
            }
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
                        outputRange: [0, 240],
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

/* ---------- SMALL COMPONENT ---------- */
function BottomItem({ icon, label }: any) {
  return (
    <View style={styles.bottomItem}>
      <Ionicons name={icon} size={22} color="#fff" />
      <Text style={styles.bottomText}>{label}</Text>
    </View>
  );
}

/* ---------- STYLES ---------- */
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
    color: "#ffffff",
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

  bottomItem: {
    alignItems: "center",
  },

  bottomText: {
    marginTop: 6,
    color: "#fff",
    fontSize: 12,
  },
});
