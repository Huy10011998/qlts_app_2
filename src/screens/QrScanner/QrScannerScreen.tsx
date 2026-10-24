import React, { useCallback, useMemo, useState } from "react";
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
import QrScannerGateView from "../../components/qrcode/shared/QrScannerGateView";
import QrScannerViewportOverlay from "../../components/qrcode/shared/QrScannerViewportOverlay";
import useQrScannerController from "../../components/qrcode/shared/useQrScannerController";
import InlineToast from "../../components/ui/InlineToast";
import { clearLastSavedNotice } from "../../store/AssetSlice";
import { useAppDispatch } from "../../store/hooks";
import type { RootState } from "../../store";
import { useSelector } from "react-redux";
import { getDetailsQr } from "../../services/data/callApi";
import { isNetworkRequestError } from "../../utils/helpers/api";
import {
  getDetailIdFromItemData,
  getQrScanFailureAlert,
  isEmptyQrItemData,
  parseAssetQr,
  type QrScanFailure,
} from "./qrScanHelpers";

export default function QrScannerScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { isActive, isMounted, showAlertIfActive } = useSafeAlert();
  /* Đang tra mã vừa quét (get-details + cấu hình class). Camera đã tắt lúc này
     nên không có lớp phủ thì màn đứng hình như bị treo, nhất là khi mạng chậm. */
  const [resolving, setResolving] = useState(false);
  // Only drive the camera controller (and request the camera permission) while
  // the scanner tab is actually focused. With the tab navigator preloading all
  // tabs (lazy: false), a hardcoded `enabled: true` would request camera
  // permission right after login while the user is still on Home, and the
  // resulting background→foreground transition would flicker/hide the tab bar.
  const isFocused = useIsFocused();
  const dispatch = useAppDispatch();
  const lastSavedNotice = useSelector(
    (state: RootState) => state.asset.lastSavedNotice,
  );

  /**
   * Tham số mở danh sách bản ghi vừa lưu, `null` khi thiếu thứ gì đó. Thông báo
   * lưu xong luôn có, nhưng nút "Xem" chỉ có nghĩa khi đủ ba tham số của danh sách.
   */
  const savedNoticeListParams = useMemo(() => {
    const notice = lastSavedNotice;

    if (!notice?.nameClass || !notice.idRoot || !notice.propertyReference) {
      return null;
    }

    return {
      nameClass: notice.nameClass,
      propertyReference: notice.propertyReference,
      idRoot: notice.idRoot,
      nameClassRoot: notice.nameClassRoot,
      titleHeader: notice.titleHeader,
    };
  }, [lastSavedNotice]);
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

  const codeScanner: CodeScanner = useCodeScanner({
    codeTypes: ["qr"],
    onCodeScanned: async (codes: Code[]) => {
      if (!codes.length || scannedRef.current) return;

      scannedRef.current = true;
      deactivateScanner();

      ReactNativeHapticFeedback.trigger("impactLight");

      const showFailure = (failure: QrScanFailure) => {
        const { title, message } = getQrScanFailureAlert(failure);

        showAlertIfActive(title, message, [
          {
            text: "OK",
            onPress: resumeScanner,
          },
        ]);
      };

      const target = parseAssetQr(codes[0]?.value ?? "");

      if (!target) {
        showFailure("notAssetTag");
        return;
      }

      const { nameClass, idOrQr, isExternalQrUrl } = target;

      setResolving(true);

      try {
        const detailRes = isExternalQrUrl
          ? await getDetailsQr(nameClass, "QR:" + idOrQr)
          : await getDetails(nameClass, idOrQr);
        const itemData = detailRes?.data;

        // Mã đúng dạng tem nhưng không còn bản ghi nào ứng với nó.
        if (isEmptyQrItemData(itemData)) {
          showFailure("notFound");
          return;
        }

        const [res, resProp] = await Promise.all([
          getFieldActive(nameClass),
          getPropertyClass(nameClass),
        ]);

        const detailId = isExternalQrUrl
          ? getDetailIdFromItemData(itemData, idOrQr)
          : idOrQr;

        // Người dùng đã bấm quay lại trong lúc chờ thì không mở chi tiết nữa.
        if (!isActive()) return;

        // Quét mã mới là bỏ qua thông báo của lần lưu trước.
        dispatch(clearLastSavedNotice());

        // Màn quét chỉ làm đúng một việc: đọc mã rồi mở thông tin thiết bị. Việc
        // chọn làm gì với thiết bị nằm ở màn chi tiết, nơi người dùng nhìn thấy
        // mình đang thao tác với cái gì.
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

        /* Mã đã qua bước kiểm dạng tem ở trên, nên lỗi từ server (404 của
           get-details, class không còn) nghĩa là không còn tài sản để mở. */
        showFailure(isNetworkError ? "network" : "notFound");
      } finally {
        if (isMounted()) setResolving(false);
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

      {/* Trước header: nút quay lại vẫn bấm được trong lúc chờ. */}
      {resolving ? (
        <View
          style={styles.resolvingOverlay}
          accessibilityRole="progressbar"
          accessibilityLabel="Đang tải thông tin tài sản"
        >
          <View style={styles.resolvingCard}>
            <ActivityIndicator size="small" color="#fff" />
            <Text style={styles.resolvingText}>Đang tải thông tin…</Text>
          </View>
        </View>
      ) : null}

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

        <InlineToast
          message={lastSavedNotice?.message}
          detail={lastSavedNotice?.recordLabel}
          // Cùng một điều kiện cho cả nhãn lẫn việc mở danh sách: thiếu tham số
          // mà vẫn bày nút "Xem" thì bấm vào không ra gì.
          actionLabel={savedNoticeListParams ? "Xem" : undefined}
          onAction={
            savedNoticeListParams
              ? () => {
                  deactivateScanner();
                  navigation.navigate("QrReview", savedNoticeListParams);
                }
              : undefined
          }
          onDismiss={() => dispatch(clearLastSavedNotice())}
        />
      </View>

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
  resolvingOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.35)",
  },
  resolvingCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: "rgba(0,0,0,0.72)",
  },
  resolvingText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "600",
  },
});
