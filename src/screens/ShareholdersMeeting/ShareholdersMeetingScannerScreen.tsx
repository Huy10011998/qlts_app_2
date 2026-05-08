import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Animated,
  AppState,
  Linking,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import {
  RouteProp,
  useFocusEffect,
  useNavigation,
  useRoute,
} from "@react-navigation/native";
import Ionicons from "react-native-vector-icons/Ionicons";
import ReactNativeHapticFeedback from "react-native-haptic-feedback";
import { request, PERMISSIONS, RESULTS } from "react-native-permissions";
import {
  Camera,
  Code,
  CodeScanner,
  useCameraDevice,
  useCameraFormat,
  useCodeScanner,
} from "react-native-vision-camera";
import {
  diemDanhDhcd,
  getCodongDhcd,
  luuYKienCoDongDhcd,
} from "../../services/data/CallApi";
import {
  RootStackParamList,
  Shareholder,
  ShareholderApiItem,
  ShareholderListResponse,
} from "../../types/Index";

type AttendanceActionResponse = {
  message?: string;
  data?: {
    result?: number;
    message?: string;
  };
};

type VotingChoice = "agree" | "disagree" | "noOpinion";

type VotingActionResponse = {
  message?: string;
  data?: {
    result?: number;
    message?: string;
    [key: string]: any;
  };
};

const votingChoiceLabelMap: Record<VotingChoice, string> = {
  agree: "Tán thành",
  disagree: "Không tán thành",
  noOpinion: "Không có ý kiến",
};

const mapShareholderItem = (item: ShareholderApiItem): Shareholder => ({
  id: String(item.id),
  name: item.tenCoDong || "Không rõ tên",
  shareholderId: item.maCoDong || "--",
  shares: Number(item.tongCoPhan || 0),
  status: item.isDiemDanh ? "present" : "pending",
});

export default function ShareholdersMeetingScannerScreen() {
  const navigation = useNavigation<any>();
  const route =
    useRoute<RouteProp<RootStackParamList, "ShareholdersMeetingScanner">>();
  const insets = useSafeAreaInsets();
  const {
    meetingId,
    scanMode,
    votingOpinionId,
    votingOpinionTitle,
    votingChoice,
  } = route.params;

  const [appState, setAppState] = useState(AppState.currentState);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [screenActive, setScreenActive] = useState(false);
  const [initTimeout, setInitTimeout] = useState(false);
  const [isTorchOn, setIsTorchOn] = useState(false);
  const [shareholders, setShareholders] = useState<Shareholder[]>([]);

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

  const expectedQrPrefix = useMemo(() => "DaiHoiCoDong_CoDong", []);

  const cameraActive = screenActive && appState === "active";

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

  const reloadShareholders = useCallback(async () => {
    const shareholderRes = await getCodongDhcd<ShareholderListResponse>(
      String(meetingId),
    );

    setShareholders(
      Array.isArray(shareholderRes?.data)
        ? shareholderRes.data.map(mapShareholderItem)
        : [],
    );
  }, [meetingId]);

  useEffect(() => {
    void reloadShareholders();
  }, [reloadShareholders]);

  useFocusEffect(
    useCallback(() => {
      scannedRef.current = false;
      setInitTimeout(false);
      setIsTorchOn(false);

      const timeout = setTimeout(() => {
        setScreenActive(true);
      }, 100);

      initTimerRef.current = setTimeout(() => {
        setInitTimeout(true);
      }, 5000);

      startScanLine();

      return () => {
        clearTimeout(timeout);
        if (initTimerRef.current) {
          clearTimeout(initTimerRef.current);
          initTimerRef.current = null;
        }
        setScreenActive(false);
        stopScanLine();
      };
    }, [startScanLine, stopScanLine]),
  );

  const checkPermission = useCallback(async () => {
    const result =
      Platform.OS === "ios"
        ? await request(PERMISSIONS.IOS.CAMERA)
        : await request(PERMISSIONS.ANDROID.CAMERA);
    setHasPermission(result === RESULTS.GRANTED);
  }, []);

  useEffect(() => {
    void checkPermission();
  }, [checkPermission]);

  useEffect(() => {
    if (appState !== "active" || hasPermission === true) return;
    void checkPermission();
  }, [appState, checkPermission, hasPermission]);

  const applyAttendanceStatus = useCallback((shareholderId: string) => {
    setShareholders((prev) =>
      prev.map((shareholder) =>
        shareholder.id === shareholderId
          ? { ...shareholder, status: "present" }
          : shareholder,
      ),
    );
  }, []);

  const submitVotingOpinion = useCallback(
    async (shareholderId: string) => {
      if (!votingOpinionId || !votingChoice) {
        throw new Error("VOTING_SELECTION_MISSING");
      }

      const choiceValueMap: Record<VotingChoice, string> = {
        agree: "1",
        disagree: "0",
        noOpinion: "2",
      };

      return luuYKienCoDongDhcd<VotingActionResponse>({
        iD_DaiHoiCoDong_YKien: Number(votingOpinionId),
        iD_DaiHoiCoDong_CoDongs: String(shareholderId),
        trangThais: choiceValueMap[votingChoice],
        nguoiNhap: 0,
      });
    },
    [votingChoice, votingOpinionId],
  );

  const resumeScanner = useCallback(() => {
    scannedRef.current = false;
    setScreenActive(true);
    startScanLine();
  }, [startScanLine]);

  const handleInvalidQr = useCallback(
    (message: string) => {
      Alert.alert("QR không hợp lệ", message, [
        {
          text: "OK",
          onPress: resumeScanner,
        },
      ]);
    },
    [resumeScanner],
  );

  const codeScanner: CodeScanner = useCodeScanner({
    codeTypes: ["qr"],
    onCodeScanned: async (codes: Code[]) => {
      if (!codes.length || scannedRef.current) return;

      scannedRef.current = true;
      setScreenActive(false);
      stopScanLine();

      ReactNativeHapticFeedback.trigger("impactLight");

      const rawValue = codes[0]?.value?.trim() ?? "";
      const parts = rawValue.replace(/^\//, "").split("/").filter(Boolean);

      if (!rawValue || parts.length !== 2) {
        handleInvalidQr("Mã QR không đúng định dạng.");
        return;
      }

      const [prefix, shareholderId] = parts;

      if (prefix !== expectedQrPrefix) {
        handleInvalidQr(
          scanMode === "attendance"
            ? "Tab Điểm danh chỉ chấp nhận QR dạng DaiHoiCoDong_CoDong/{id}."
            : "Tab Lấy ý kiến chỉ chấp nhận QR dạng DaiHoiCoDong_CoDong/{id}.",
        );
        return;
      }

      const shareholder = shareholders.find((item) => item.id === shareholderId);

      if (!shareholder) {
        handleInvalidQr("Không tìm thấy cổ đông tương ứng trong danh sách.");
        return;
      }

      if (scanMode === "voting" && shareholder.status !== "present") {
        Alert.alert(
          "Chưa điểm danh",
          `Cổ đông ${shareholder.shareholderId} chưa điểm danh nên chưa thể lấy ý kiến.`,
          [
            {
              text: "OK",
              onPress: resumeScanner,
            },
          ],
        );
        return;
      }

      const confirmTitle =
        scanMode === "attendance" ? "Xác nhận điểm danh" : "Xác nhận lấy ý kiến";
      const confirmMessage =
        scanMode === "attendance"
          ? `Xác nhận điểm danh cổ đông ${shareholder.shareholderId}?`
          : `Ghi nhận "${votingOpinionTitle || "ý kiến đã chọn"}" cho cổ đông ${
              shareholder.shareholderId
            } với phân loại "${votingChoice ? votingChoiceLabelMap[votingChoice] : ""}"?`;

      Alert.alert(confirmTitle, confirmMessage, [
        {
          text: "Huỷ",
          style: "cancel",
          onPress: resumeScanner,
        },
        {
          text: "Xác nhận",
          onPress: async () => {
            try {
              if (scanMode === "attendance") {
                const response = await diemDanhDhcd<AttendanceActionResponse>(
                  Number(shareholder.id),
                );
                const backendResult = response?.data?.result;
                const backendMessage =
                  response?.data?.message ||
                  response?.message ||
                  "Không thể điểm danh cổ đông này.";

                if (backendResult === 0) {
                  if (
                    backendMessage.toLowerCase().includes("điểm danh trước đó")
                  ) {
                    applyAttendanceStatus(shareholder.id);
                    void reloadShareholders();
                  }

                  Alert.alert("Thông báo", backendMessage, [
                    {
                      text: "OK",
                      onPress: resumeScanner,
                    },
                  ]);
                  return;
                }

                applyAttendanceStatus(shareholder.id);
                void reloadShareholders();
                Alert.alert(
                  "Điểm danh thành công",
                  `Cổ đông ${shareholder.shareholderId} đã được điểm danh.`,
                  [
                    {
                      text: "OK",
                      onPress: resumeScanner,
                    },
                  ],
                );
                return;
              }

              const response = await submitVotingOpinion(shareholder.id);
              const backendResult = response?.data?.result;
              const backendMessage =
                response?.data?.message ||
                response?.message ||
                "Không thể ghi nhận ý kiến cổ đông này.";

              if (backendResult === 0) {
                Alert.alert("Thông báo", backendMessage, [
                  {
                    text: "OK",
                    onPress: resumeScanner,
                  },
                ]);
                return;
              }

              Alert.alert(
                "Ghi nhận thành công",
                `Đã lưu "${votingOpinionTitle || "ý kiến"}" cho cổ đông ${
                  shareholder.shareholderId
                } với phân loại "${
                  votingChoice ? votingChoiceLabelMap[votingChoice] : ""
                }".`,
                [
                  {
                    text: "OK",
                    onPress: resumeScanner,
                  },
                ],
              );
            } catch (error) {
              Alert.alert(
                "Lỗi",
                scanMode === "attendance"
                  ? "Không thể điểm danh cổ đông này."
                  : "Không thể ghi nhận ý kiến cổ đông này.",
                [
                  {
                    text: "OK",
                    onPress: resumeScanner,
                  },
                ],
              );
            }
          },
        },
      ]);
    },
  });

  if (hasPermission === null) {
    return null;
  }

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
          style={styles.headerIconButton}
          hitSlop={10}
          onPress={() => {
            setScreenActive(false);
            navigation.goBack();
          }}
        >
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>

        <View style={styles.headerTitleWrap}>
          <Text style={styles.headerTitle}>Quét mã QR</Text>
          <Text style={styles.headerSubtitle}>
            {scanMode === "attendance"
              ? "Chấp nhận: DaiHoiCoDong_CoDong/{id}"
              : `${votingChoice ? votingChoiceLabelMap[votingChoice] : "Lấy ý kiến"} · DaiHoiCoDong_CoDong/{id}`}
          </Text>
        </View>

        <View style={styles.headerRight}>
          <TouchableOpacity
            style={styles.headerIconButton}
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

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#000" },
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
  header: {
    position: "absolute",
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    backgroundColor: "rgba(0,0,0,0.28)",
  },
  headerIconButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.42)",
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
  headerRight: {
    width: 38,
    alignItems: "flex-end",
  },
  overlay: { ...StyleSheet.absoluteFillObject },
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
