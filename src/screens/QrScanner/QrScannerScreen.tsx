import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
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
import ReactNativeHapticFeedback from "react-native-haptic-feedback";
import Ionicons from "react-native-vector-icons/Ionicons";
import {
  Camera,
  Code,
  CodeScanner,
  useCodeScanner,
} from "react-native-vision-camera";
import {
  useNavigation,
  useFocusEffect,
  useIsFocused,
} from "@react-navigation/native";
import { getDetails, getFieldActive, getPropertyClass } from "../../services";
import { error } from "../../utils/Logger";
import { useSafeAlert } from "../../hooks/useSafeAlert";
import ScanModePill, {
  getScanModeLabel,
} from "../../components/qrcode/shared/ScanModePill";
import ScanModeSheet from "../../components/qrcode/shared/ScanModeSheet";
import QrScannerGateView from "../../components/qrcode/shared/QrScannerGateView";
import QrScannerViewportOverlay from "../../components/qrcode/shared/QrScannerViewportOverlay";
import useQrScannerController from "../../components/qrcode/shared/useQrScannerController";
import InlineToast from "../../components/ui/InlineToast";
import { useOpenAddRelatedForm } from "../../components/assets/shared/useOpenAddRelatedForm";
import { resolveRecordActions } from "../../components/assets/detailActions/recordActions/resolveRecordActions";
import { usePermission } from "../../hooks/usePermission";
import { useScanMode } from "../../context/ScanModeContext";
import { clearLastSavedNotice } from "../../store/AssetSlice";
import { useAppDispatch } from "../../store/hooks";
import type { RootState } from "../../store";
import { useSelector } from "react-redux";
import { getDetailsQr } from "../../services/data/callApi";
import { getMatchedKey } from "../../utils/Helper";
import { isNetworkRequestError } from "../../utils/helpers/api";

const QR_BASE_URL_PREFIX = "https://os.cholimexfood.com.vn/taisan";
const QR_BASE_URL_PREFIX_MM = "https://os.cholimexfood.com.vn/taisan/MayMoc";
const QR_BASE_URL_PREFIX_TL =
  "https://os.cholimexfood.com.vn/taisan/NoiDia_TuLanh";
const QR_BASE_URL_PREFIX_REGEX = new RegExp(
  `^${QR_BASE_URL_PREFIX.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?=/|$)`,
  "i",
);

const normalizeQrScanValue = (value: string) => {
  const trimmedValue = value.trim();
  const isExternalQrUrl = QR_BASE_URL_PREFIX_REGEX.test(trimmedValue);

  return {
    isExternalQrUrl,
    scanPath: isExternalQrUrl
      ? trimmedValue
          .replace(QR_BASE_URL_PREFIX_MM, QR_BASE_URL_PREFIX_TL)
          .replace(QR_BASE_URL_PREFIX_REGEX, "")
      : trimmedValue,
  };
};

const getDetailIdFromItemData = (itemData: any, fallbackId: string) => {
  const detailItem = Array.isArray(itemData) ? itemData[0] : itemData;

  if (detailItem && typeof detailItem === "object") {
    const matchedIdKey = getMatchedKey(detailItem, "id");
    const detailId = matchedIdKey ? detailItem[matchedIdKey] : undefined;

    if (
      detailId !== null &&
      detailId !== undefined &&
      String(detailId).trim()
    ) {
      return String(detailId);
    }
  }

  return fallbackId;
};

export default function QrScannerScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { showAlertIfActive } = useSafeAlert();
  // Only drive the camera controller (and request the camera permission) while
  // the scanner tab is actually focused. With the tab navigator preloading all
  // tabs (lazy: false), a hardcoded `enabled: true` would request camera
  // permission right after login while the user is still on Home, and the
  // resulting background→foreground transition would flicker/hide the tab bar.
  const isFocused = useIsFocused();
  const dispatch = useAppDispatch();
  const { mode, setMode } = useScanMode();
  const { can } = usePermission();
  const { loadChildClasses, openAddForm } = useOpenAddRelatedForm();
  const lastSavedNotice = useSelector(
    (state: RootState) => state.asset.lastSavedNotice,
  );
  const [modeSheetVisible, setModeSheetVisible] = useState(false);
  // Chỉ để hiện dấu hiệu "đang mở việc", vì chế độ quét tốn thêm request cấu hình
  // class con — màn đen không có gì thì tưởng treo.
  const [isOpeningAction, setIsOpeningAction] = useState(false);
  const [fallbackNotice, setFallbackNotice] = useState<string | null>(null);
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
  } = useQrScannerController({ enabled: isFocused });

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

  /**
   * Chạy việc của chế độ quét đang bật với thiết bị vừa quét.
   *
   * Không mở được thì nói đúng lý do: thiết bị không có việc đó ("unsupported")
   * khác hẳn không tải được cấu hình ("failed"). Gộp một câu thì người dùng mất
   * mạng sẽ đi tìm bảng con không tồn tại.
   *
   * Cả hai đường đều mở màn thông tin thiết bị chứ không chặn — thanh hành động ở
   * đó vẫn làm được việc.
   *
   * Không hàm nào ở đây biết "đánh giá" hay "kiểm kê" là gì — thêm việc mới chỉ
   * cần một dòng trong `recordActionKinds`.
   */
  const tryRunScanModeAction = useCallback(
    async ({
      detailId,
      fieldActive,
      itemData,
      nameClass,
    }: {
      detailId: string;
      fieldActive: any[];
      itemData: any;
      nameClass: string;
    }): Promise<"opened" | "unsupported" | "failed"> => {
      if (mode === "view") return "unsupported";

      setIsOpeningAction(true);
      try {
        const detailItem = Array.isArray(itemData) ? itemData[0] : itemData;
        const { actions, childClassesFailed } = await resolveRecordActions({
          can,
          fieldActive,
          item: { ...detailItem, id: detailId },
          loadChildClasses,
          nameClass,
          navigate: (screen, params) => navigation.navigate(screen, params),
          openAddForm,
        });

        const action = actions.find(
          (candidate) => candidate.kind === mode && !candidate.inPlace,
        );

        if (!action) return childClassesFailed ? "failed" : "unsupported";

        await action.run({ quick: true });
        return "opened";
      } catch (e) {
        if (!isNetworkRequestError(e)) error(e);
        return "failed";
      } finally {
        setIsOpeningAction(false);
      }
    },
    [can, loadChildClasses, mode, navigation, openAddForm],
  );

  const codeScanner: CodeScanner = useCodeScanner({
    codeTypes: ["qr"],
    onCodeScanned: async (codes: Code[]) => {
      if (!codes.length || scannedRef.current) return;

      scannedRef.current = true;
      deactivateScanner();

      ReactNativeHapticFeedback.trigger("impactLight");

      const raw = codes[0]?.value ?? "";
      const { isExternalQrUrl, scanPath } = normalizeQrScanValue(raw);

      if (!scanPath) {
        showAlertIfActive("Mã QR không hợp lệ", "", [
          {
            text: "OK",
            onPress: resumeScanner,
          },
        ]);
        return;
      }

      const parts = scanPath.replace(/^\//, "").split("/").filter(Boolean);

      try {
        if (parts.length !== 2) {
          showAlertIfActive("Mã QR không hợp lệ", "", [
            {
              text: "OK",
              onPress: resumeScanner,
            },
          ]);
          return;
        }

        const [nameClass, idOrQr] = parts;
        const detailRes = isExternalQrUrl
          ? await getDetailsQr(nameClass, "QR:" + idOrQr)
          : await getDetails(nameClass, idOrQr);
        const itemData = detailRes?.data;

        if (
          !itemData ||
          (typeof itemData === "object" &&
            !Array.isArray(itemData) &&
            Object.keys(itemData).length === 0)
        ) {
          showAlertIfActive("Mã QR không hợp lệ", "", [
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

        const detailId = isExternalQrUrl
          ? getDetailIdFromItemData(itemData, idOrQr)
          : idOrQr;

        // Quét mã mới là bỏ qua thông báo của lần quét/lưu trước.
        dispatch(clearLastSavedNotice());
        setFallbackNotice(null);

        if (mode !== "view") {
          const outcome = await tryRunScanModeAction({
            detailId,
            fieldActive: res?.data || [],
            itemData,
            nameClass,
          });

          if (outcome === "opened") return;

          const modeLabel = getScanModeLabel(mode).toLowerCase();
          setFallbackNotice(
            outcome === "failed"
              ? `Chưa mở được ${modeLabel} — đang mở thông tin thiết bị`
              : `Thiết bị này không có mục ${modeLabel} — đang mở thông tin thiết bị`,
          );
        }

        navigation.navigate("QrDetails", {
          id: detailId,
          titleHeader: nameClass,
          nameClass,
          field: res?.data || [],
          propertyClass: resProp?.data,
          itemData,
        });
      } catch (e) {
        const isNetworkError = isNetworkRequestError(e);

        if (!isNetworkError) {
          error(e);
        }

        showAlertIfActive(
          isNetworkError ? "Lỗi kết nối" : "Mã QR không hợp lệ",
          isNetworkError
            ? "Không thể tải thông tin mã QR. Vui lòng kiểm tra kết nối mạng rồi thử lại."
            : "",
          [
            {
              text: "OK",
              onPress: resumeScanner,
            },
          ],
        );
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

      <QrScannerViewportOverlay scanLineAnim={scanLineAnim} />

      {/*
        Sau lớp mặt nạ: mặt nạ là absoluteFill đen 55%, đặt header trước thì cả
        header lẫn dải thông báo bị phủ mờ theo — chữ trên nền xanh nhạt của dải
        toast gần như không đọc được.
      */}
      <View
        pointerEvents="box-none"
        style={[styles.header, { paddingTop: insets.top + 8 }]}
      >
        <View style={styles.headerRow}>
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
            <Text style={styles.headerTitle}>
              Quét mã QR
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

        <ScanModePill mode={mode} onPress={() => setModeSheetVisible(true)} />

        <InlineToast
          message={fallbackNotice}
          tone="warning"
          onDismiss={() => setFallbackNotice(null)}
        />

        <InlineToast
          message={lastSavedNotice?.message}
          detail={lastSavedNotice?.recordLabel}
          actionLabel={lastSavedNotice?.nameClass ? "Xem" : undefined}
          onAction={() => {
            const notice = lastSavedNotice;
            if (!notice?.nameClass || !notice.idRoot || !notice.propertyReference) {
              return;
            }

            deactivateScanner();
            navigation.navigate("QrReview", {
              nameClass: notice.nameClass,
              propertyReference: notice.propertyReference,
              idRoot: notice.idRoot,
              nameClassRoot: notice.nameClassRoot,
              titleHeader: notice.titleHeader,
            });
          }}
          onDismiss={() => dispatch(clearLastSavedNotice())}
        />
      </View>

      {isOpeningAction ? (
        <View style={styles.busyOverlay} pointerEvents="auto">
          <ActivityIndicator size="large" color="#fff" />
          <Text style={styles.busyLabel}>
            Đang mở {getScanModeLabel(mode).toLowerCase()}…
          </Text>
        </View>
      ) : null}

      <ScanModeSheet
        mode={mode}
        onClose={() => setModeSheetVisible(false)}
        onSelect={(next) => {
          setModeSheetVisible(false);
          setFallbackNotice(null);
          setMode(next);
        }}
        visible={modeSheetVisible}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#000" },
  header: {
    position: "absolute",
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingBottom: 8,
    backgroundColor: "rgba(0,0,0,0.28)",
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  busyOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    backgroundColor: "rgba(0,0,0,0.55)",
  },
  busyLabel: {
    color: "#fff",
    fontSize: 13.5,
    fontWeight: "600",
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
