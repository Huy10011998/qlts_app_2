import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Linking,
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
import {
  Camera,
  Code,
  CodeScanner,
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
  ShareholderListResponse,
} from "../../types/Index";
import QrScannerGateView from "../../components/qrcode/shared/QrScannerGateView";
import QrScannerViewportOverlay from "../../components/qrcode/shared/QrScannerViewportOverlay";
import useQrScannerController from "../../components/qrcode/shared/useQrScannerController";
import {
  mapShareholderItem,
  VOTING_CHOICE_LABEL_MAP,
  VOTING_CHOICE_VALUE_MAP,
} from "./shared/shareholdersMeetingHelpers";

type AttendanceActionResponse = {
  message?: string;
  data?: {
    result?: number;
    message?: string;
  };
};

type VotingActionResponse = {
  message?: string;
  data?: {
    result?: number;
    message?: string;
    [key: string]: any;
  };
};

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
  const [shareholders, setShareholders] = useState<Shareholder[]>([]);
  const {
    activateScanner,
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
    cameraActive,
  } = useQrScannerController({ enabled: true });

  const expectedQrPrefix = useMemo(() => "DaiHoiCoDong_CoDong", []);

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
    reloadShareholders();
  }, [reloadShareholders]);

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

      return luuYKienCoDongDhcd<VotingActionResponse>({
        iD_DaiHoiCoDong_YKien: Number(votingOpinionId),
        iD_DaiHoiCoDong_CoDongs: String(shareholderId),
        trangThais: VOTING_CHOICE_VALUE_MAP[votingChoice],
        nguoiNhap: 0,
      });
    },
    [votingChoice, votingOpinionId],
  );

  const handleInvalidQr = useCallback(
    (message?: string) => {
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
      deactivateScanner();

      ReactNativeHapticFeedback.trigger("impactLight");

      const rawValue = codes[0]?.value?.trim() ?? "";
      const parts = rawValue.replace(/^\//, "").split("/").filter(Boolean);

      if (!rawValue || parts.length !== 2) {
        handleInvalidQr();
        return;
      }

      const [prefix, shareholderId] = parts;

      if (prefix !== expectedQrPrefix) {
        handleInvalidQr();
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
            } với phân loại "${votingChoice ? VOTING_CHOICE_LABEL_MAP[votingChoice] : ""}"?`;

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
                    reloadShareholders();
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
                reloadShareholders();
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
                  votingChoice ? VOTING_CHOICE_LABEL_MAP[votingChoice] : ""
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
        description={initTimeout ? "Camera không phản hồi. Vui lòng thử lại." : undefined}
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
          style={styles.headerIconButton}
          hitSlop={10}
          onPress={() => {
            deactivateScanner();
            navigation.goBack();
          }}
        >
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>

        <View style={styles.headerTitleWrap}>
          <Text style={styles.headerTitle}>Quét mã QR</Text>
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
  headerRight: {
    width: 38,
    alignItems: "flex-end",
  },
});
