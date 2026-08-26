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
import QrQuickReviewToggle from "../../components/qrcode/shared/QrQuickReviewToggle";
import QrScannerGateView from "../../components/qrcode/shared/QrScannerGateView";
import QrScannerViewportOverlay from "../../components/qrcode/shared/QrScannerViewportOverlay";
import useQrScannerController from "../../components/qrcode/shared/useQrScannerController";
import InlineToast from "../../components/ui/InlineToast";
import {
  isDanhGiaClass,
  useOpenAddRelatedForm,
} from "../../components/assets/shared/useOpenAddRelatedForm";
import { useQuickReview } from "../../context/QuickReviewContext";
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
  const { enabled: quickReviewEnabled, setEnabled: setQuickReviewEnabled } =
    useQuickReview();
  const { openAddForm, pickPrimaryChildClass, resolveChildClasses } =
    useOpenAddRelatedForm();
  const lastSavedNotice = useSelector(
    (state: RootState) => state.asset.lastSavedNotice,
  );
  // Chỉ để hiện dấu hiệu "đang mở form", vì chế độ nhanh tốn thêm hai request
  // cấu hình class con — màn đen không có gì thì tưởng treo.
  const [isOpeningQuickReview, setIsOpeningQuickReview] = useState(false);
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
   * Chế độ đánh giá nhanh: vào thẳng màn đánh giá của thiết bị vừa quét.
   *
   * Trả về `false` khi không đi được đường này — không có class đánh giá cho
   * loại thiết bị, không có quyền thêm, hoặc lỗi mạng. Nơi gọi im lặng mở màn
   * chi tiết như luồng thường: người dùng vẫn còn thanh "Đánh giá ngay" ở đó,
   * nên không có gì phải báo lỗi.
   */
  const tryOpenQuickReview = useCallback(
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
    }) => {
      setIsOpeningQuickReview(true);
      try {
        const children = await resolveChildClasses(nameClass);
        const primary = pickPrimaryChildClass(nameClass, children);

        // Công tắc tên là "đánh giá nhanh" nên chỉ nhảy thẳng vào đúng bảng đánh
        // giá; class chỉ có mục con khác (bảo trì, kiểm kê) vẫn qua màn chi tiết.
        if (!primary || !isDanhGiaClass(primary.name)) return false;

        const detailItem = Array.isArray(itemData) ? itemData[0] : itemData;

        return await openAddForm({
          childClass: primary,
          item: { ...detailItem, id: detailId },
          parentFieldActive: fieldActive,
          parentNameClass: nameClass,
          returnTo: "qrScan",
        });
      } catch (e) {
        if (!isNetworkRequestError(e)) error(e);
        return false;
      } finally {
        setIsOpeningQuickReview(false);
      }
    },
    [openAddForm, pickPrimaryChildClass, resolveChildClasses],
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

        // Quét mã mới là bỏ qua thông báo của lần lưu trước.
        dispatch(clearLastSavedNotice());

        if (quickReviewEnabled) {
          const opened = await tryOpenQuickReview({
            detailId,
            fieldActive: res?.data || [],
            itemData,
            nameClass,
          });

          if (opened) return;
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

        <QrQuickReviewToggle
          enabled={quickReviewEnabled}
          onChange={setQuickReviewEnabled}
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

      {isOpeningQuickReview ? (
        <View style={styles.busyOverlay} pointerEvents="auto">
          <ActivityIndicator size="large" color="#fff" />
          <Text style={styles.busyLabel}>Đang mở form đánh giá…</Text>
        </View>
      ) : null}
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
