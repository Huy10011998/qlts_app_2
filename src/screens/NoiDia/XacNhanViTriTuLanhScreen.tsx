import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import Ionicons from "react-native-vector-icons/Ionicons";
import { launchCamera, type Asset } from "react-native-image-picker";
import ViewShot, { type ViewShotRef } from "react-native-view-shot";

import type { StackNavigation, StackRoute } from "../../types/index";
import ScreenContainer from "../shared/ScreenContainer";
import EmptyState from "../../components/ui/EmptyState";
import { createAssetFormHeaderSubmitRight } from "../../components/assets/shared/AssetFormHeaderSubmitButton";
import { useSafeAlert } from "../../hooks/useSafeAlert";
import {
  getNoiDiaErrorMessage,
  xacNhanViTriTuLanh,
} from "../../services/data/callApi";
import {
  checkCameraPermission,
  openAppPermissionSettings,
  requestCameraPermission,
} from "../../services/cameraPermission";
import { isNetworkRequestError } from "../../utils/helpers/api";
import { error } from "../../utils/Logger";
import {
  getCurrentCoordinates,
  type Coordinates,
} from "../../utils/location/currentPosition";
import {
  AppColors,
  useAppColors,
  useStyles,
} from "../../utils/helpers/colors";
import { getFridgeLocationRows } from "./shared/fridgeLookup";
import PhotoWatermark, {
  getWatermarkFrame,
  type WatermarkLines,
} from "./shared/PhotoWatermark";
import { useWatermarkAccountName } from "./shared/useWatermarkAccountName";
import { EMPTY_VALUE, formatNoiDiaDateTime } from "./shared/noiDiaFormat";
import NoiDiaFormScroll from "./shared/NoiDiaFormScroll";
import NoiDiaNoteCard from "./shared/NoiDiaNoteCard";

/**
 * Ảnh gửi lên chỉ để web xem lại, không cần độ phân giải gốc. Ảnh 4-8MB rất dễ
 * timeout ở hiện trường mạng yếu nên nén còn ~1600px cạnh dài, quality 0.8.
 */
const PHOTO_MAX_DIMENSION = 1600;
const PHOTO_QUALITY = 0.8;

export default function XacNhanViTriTuLanhScreen() {
  const styles = useStyles(makeStyles);
  const c = useAppColors();
  const navigation = useNavigation<StackNavigation<"XacNhanViTriTuLanhForm">>();
  const route = useRoute<StackRoute<"XacNhanViTriTuLanhForm">>();
  // Màn này chỉ hợp lệ khi đi từ bước quét. Thiếu tham số nghĩa là có chỗ
  // navigate thẳng vào đây — báo trạng thái rỗng thay vì để crash đỏ.
  const fridge = route.params?.fridge;
  const { showAlertIfActive } = useSafeAlert();

  // Mốc thời gian lúc mở màn, chỉ dùng khi chưa chụp — chụp xong thì lấy đúng
  // giờ bấm chụp.
  const openedAt = useMemo(() => new Date().toISOString(), []);
  const [photo, setPhoto] = useState<Asset | null>(null);
  const [photoTakenAt, setPhotoTakenAt] = useState<string | null>(null);
  const watermarkRef = useRef<ViewShotRef | null>(null);
  const [note, setNote] = useState("");
  const [coordinates, setCoordinates] = useState<Coordinates | null>(null);
  const [isLocating, setIsLocating] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Giờ hiển thị chỉ để user đối chiếu; server mới là nơi chốt NgayXacNhan.
  const capturedAt = photoTakenAt ?? openedAt;
  const locationRows = useMemo(
    () => (fridge ? getFridgeLocationRows(fridge) : []),
    [fridge],
  );

  // Preview rộng bằng lòng thẻ: 16pt lề màn + 14pt lề thẻ mỗi bên.
  const { width: windowWidth } = useWindowDimensions();
  const previewWidth = windowWidth - 60;

  const watermarkFrame = useMemo(
    () => getWatermarkFrame(photo?.width, photo?.height),
    [photo?.height, photo?.width],
  );

  const accountName = useWatermarkAccountName();

  const watermarkLines = useMemo<WatermarkLines>(
    () => ({
      timestamp: formatNoiDiaDateTime(capturedAt),
      coordinates: coordinates
        ? `${coordinates.lat}, ${coordinates.lng}`
        : "Không lấy được toạ độ",
      fridge: fridge?.label ?? "",
      account: accountName ? `Người chụp: ${accountName}` : "",
    }),
    [accountName, capturedAt, coordinates, fridge?.label],
  );

  const loadCoordinates = useCallback(async () => {
    setIsLocating(true);
    const nextCoordinates = await getCurrentCoordinates();
    setCoordinates(nextCoordinates);
    setIsLocating(false);
  }, []);

  useEffect(() => {
    loadCoordinates();
  }, [loadCoordinates]);

  /**
   * CHỈ mở camera — tuyệt đối không mở thư viện ảnh. Ảnh là bằng chứng tủ đang
   * ở đúng vị trí nên phải chụp tại chỗ.
   */
  /**
   * Xin quyền camera trước khi mở, giống hệt tab Quét QR.
   *
   * `launchCamera` bị từ chối quyền thì chỉ trả `errorCode`, không tự hỏi lại —
   * người dùng bấm mãi không ra gì. Hỏi trước để lần đầu có hộp thoại hệ thống,
   * còn khi đã chặn hẳn thì đưa thẳng vào Cài đặt.
   */
  const ensureCameraPermission = useCallback(async () => {
    const currentStatus = await checkCameraPermission();

    if (currentStatus === "granted") return true;

    if (currentStatus === "unavailable") {
      showAlertIfActive(
        "Thiết bị không có camera",
        "Chức năng này cần camera để chụp ảnh xác nhận tại chỗ.",
      );
      return false;
    }

    const nextStatus =
      currentStatus === "denied" || currentStatus === "unknown"
        ? await requestCameraPermission()
        : currentStatus;

    if (nextStatus === "granted") return true;

    showAlertIfActive(
      "Không có quyền camera",
      "Ứng dụng cần quyền camera để chụp ảnh xác nhận. Vui lòng cấp quyền trong phần Cài đặt.",
      [
        { text: "Để sau", style: "cancel" },
        { text: "Mở Cài đặt", onPress: () => openAppPermissionSettings() },
      ],
    );

    return false;
  }, [showAlertIfActive]);

  const handleCapturePhoto = useCallback(async () => {
    if (!(await ensureCameraPermission())) return;

    try {
      const result = await launchCamera({
        mediaType: "photo",
        cameraType: "back",
        saveToPhotos: false,
        quality: PHOTO_QUALITY,
        maxWidth: PHOTO_MAX_DIMENSION,
        maxHeight: PHOTO_MAX_DIMENSION,
      });

      if (result.didCancel) return;

      if (result.errorCode) {
        // Quyền đã xin ở trên, tới đây gần như chỉ còn máy ảo / máy không có
        // camera, hoặc lỗi hệ thống.
        showAlertIfActive(
          "Không mở được camera",
          result.errorMessage ||
            "Thiết bị không mở được camera. Vui lòng thử lại trên máy thật.",
        );
        return;
      }

      const asset = result.assets?.[0];
      if (!asset?.uri) return;

      setPhoto(asset);
      // Giờ nung lên ảnh là lúc bấm chụp, không phải lúc bấm gửi.
      setPhotoTakenAt(new Date().toISOString());
    } catch (e) {
      error(e);
      showAlertIfActive("Lỗi", "Không chụp được ảnh. Vui lòng thử lại.");
    }
  }, [ensureCameraPermission, showAlertIfActive]);

  const handleSubmit = useCallback(async () => {
    if (!fridge || !photo?.uri || isSubmitting) return;

    setIsSubmitting(true);
    try {
      // Ảnh gửi lên là bản đã nung ngày giờ + toạ độ, không phải ảnh gốc.
      const watermarkedUri = await watermarkRef.current?.capture?.();

      if (!watermarkedUri) {
        showAlertIfActive(
          "Không gửi được",
          "Không dựng được ảnh xác nhận. Vui lòng chụp lại.",
        );
        return;
      }

      const response = await xacNhanViTriTuLanh({
        idNoiDiaTuLanh: fridge.id,
        photo: {
          // Giữ nguyên uri view-shot trả về, kể cả tiền tố file:// trên iOS —
          // đúng cách `uploadAttachProperty` sẵn có trong repo đang gửi ảnh.
          uri: watermarkedUri,
          name: `xac-nhan-${fridge.id}.jpg`,
          type: "image/jpeg",
        },
        ghiChu: note,
        lat: coordinates?.lat,
        lng: coordinates?.lng,
      });

      if (!response?.data) {
        showAlertIfActive(
          "Không gửi được",
          response?.message || "Lưu dữ liệu xác nhận thất bại.",
        );
        return;
      }

      // Đã nhận được data: tuyệt đối không cho gửi lại lượt này nữa.
      navigation.replace("XacNhanViTriTuLanhResult", { fridge });
    } catch (e) {
      if (!isNetworkRequestError(e)) error(e);

      // Giữ nguyên ảnh + ghi chú để user bấm gửi lại, đừng bắt chụp lại.
      showAlertIfActive(
        "Không gửi được",
        isNetworkRequestError(e)
          ? "Không thể gửi xác nhận. Vui lòng kiểm tra kết nối mạng rồi bấm gửi lại."
          : getNoiDiaErrorMessage(e, "Lưu dữ liệu xác nhận thất bại."),
      );
    } finally {
      setIsSubmitting(false);
    }
  }, [
    coordinates,
    fridge,
    isSubmitting,
    navigation,
    note,
    photo,
    showAlertIfActive,
  ]);

  const canSubmit = Boolean(fridge && photo?.uri) && !isSubmitting;


  // Nút gửi nằm ở header như mọi form tài sản. Giữ handler trong ref để
  // `setOptions` chỉ chạy lại khi trạng thái bật/tắt đổi, chứ không phải sau
  // mỗi ký tự ghi chú.
  const handleSubmitRef = useRef(handleSubmit);
  handleSubmitRef.current = handleSubmit;

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: createAssetFormHeaderSubmitRight({
        disabled: !canSubmit,
        iconName: isSubmitting ? "hourglass-outline" : "checkmark-circle-outline",
        label: isSubmitting ? "Đang gửi" : "Gửi",
        onPress: () => handleSubmitRef.current(),
      }),
    });
  }, [canSubmit, isSubmitting, navigation]);

  if (!fridge) {
    return (
      <ScreenContainer>
        <View style={styles.missingParamsRoot}>
          <EmptyState
            iconName="alert-circle-outline"
            title="Thiếu thông tin tủ lạnh"
            subtitle="Hãy quét mã QR hoặc nhập số seri của tủ trước khi xác nhận vị trí."
          />
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <NoiDiaFormScroll contentContainerStyle={styles.content}>
        <View style={styles.card}>
          <Text style={styles.fridgeLabel}>{fridge.label}</Text>
          <Text style={styles.fridgeSerial}>
            Seri: {fridge.serialNumber || EMPTY_VALUE}
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Vị trí hiện tại</Text>
          {locationRows.map((row) => (
            <View key={row.label} style={styles.locationRow}>
              <Text style={styles.locationLabel}>{row.label}</Text>
              <Text style={styles.locationValue} numberOfLines={2}>
                {row.value}
              </Text>
            </View>
          ))}
          <Text style={styles.hint}>
            Vị trí chỉ để đối chiếu. Muốn đổi vị trí thì dùng chức năng trung
            chuyển.
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Ảnh xác nhận</Text>

          {photo?.uri ? (
            <>
              <View style={styles.previewWrap}>
                <PhotoWatermark
                  uri={photo.uri}
                  width={previewWidth}
                  height={Math.round(
                    (previewWidth * watermarkFrame.height) /
                      watermarkFrame.width,
                  )}
                  lines={watermarkLines}
                />
              </View>

              <TouchableOpacity
                style={styles.secondaryButton}
                onPress={handleCapturePhoto}
                disabled={isSubmitting}
              >
                <Ionicons name="refresh-outline" size={18} color={c.red} />
                <Text style={styles.secondaryButtonText}>Chụp lại</Text>
              </TouchableOpacity>
            </>
          ) : (
            <TouchableOpacity
              style={styles.captureButton}
              onPress={handleCapturePhoto}
            >
              <Ionicons name="camera" size={22} color={c.red} />
              <Text style={styles.captureButtonText}>CHỤP ẢNH</Text>
            </TouchableOpacity>
          )}

          <Text style={styles.hint}>
            Ảnh phải chụp trực tiếp tại chỗ, không lấy từ thư viện.
          </Text>
        </View>

        <NoiDiaNoteCard
          value={note}
          onChangeText={setNote}
          editable={!isSubmitting}
        >
          <View style={styles.metaRow}>
            <Ionicons name="location-outline" size={16} color={c.textSub} />
            <Text style={styles.metaText}>
              {isLocating
                ? "Đang lấy toạ độ..."
                : coordinates
                  ? `${coordinates.lat}, ${coordinates.lng}`
                  : "Không lấy được toạ độ"}
            </Text>
            {!isLocating && !coordinates ? (
              <TouchableOpacity onPress={loadCoordinates} hitSlop={8}>
                <Text style={styles.retryText}>Thử lại</Text>
              </TouchableOpacity>
            ) : null}
          </View>

          <View style={styles.metaRow}>
            <Ionicons name="time-outline" size={16} color={c.textSub} />
            <Text style={styles.metaText}>
              {formatNoiDiaDateTime(capturedAt)}
            </Text>
          </View>
        </NoiDiaNoteCard>
      </NoiDiaFormScroll>

      {/*
        Bản full-size để ViewShot chụp: ViewShot chụp đúng bằng layout của view
        nên không thể chụp chính ô preview đã thu nhỏ — ảnh gửi lên sẽ vỡ. Đẩy
        ra ngoài màn thay vì opacity 0 vì view trong suốt chụp ra ảnh trắng.
      */}
      {photo?.uri ? (
        <View style={styles.captureHost} pointerEvents="none">
          <ViewShot
            ref={watermarkRef}
            options={{ format: "jpg", quality: 0.8, result: "tmpfile" }}
          >
            <PhotoWatermark
              uri={photo.uri}
              width={watermarkFrame.width}
              height={watermarkFrame.height}
              lines={watermarkLines}
            />
          </ViewShot>
        </View>
      ) : null}

    </ScreenContainer>
  );
}

const makeStyles = (c: AppColors) =>
  StyleSheet.create({
    missingParamsRoot: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 32,
    },
    content: {
      padding: 16,
      paddingBottom: 24,
      gap: 12,
    },
    card: {
      backgroundColor: c.surface,
      borderRadius: 14,
      padding: 14,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.border,
    },
    fridgeLabel: {
      fontSize: 16,
      fontWeight: "700",
      color: c.text,
    },
    fridgeSerial: {
      marginTop: 4,
      fontSize: 13,
      color: c.textSecondary,
    },
    cardTitle: {
      fontSize: 14,
      fontWeight: "700",
      color: c.red,
      marginBottom: 10,
    },
    locationRow: {
      flexDirection: "row",
      alignItems: "flex-start",
      paddingVertical: 4,
    },
    locationLabel: {
      width: 110,
      fontSize: 13.5,
      color: c.textSecondary,
    },
    locationValue: {
      flex: 1,
      fontSize: 13.5,
      fontWeight: "600",
      color: c.text,
    },
    hint: {
      marginTop: 10,
      fontSize: 12,
      fontStyle: "italic",
      color: c.textSub,
    },
    previewWrap: {
      borderRadius: 12,
      overflow: "hidden",
      backgroundColor: c.surfaceAlt,
    },
    captureHost: {
      position: "absolute",
      left: -10000,
      top: 0,
    },
    captureButton: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      paddingVertical: 22,
      borderRadius: 12,
      borderWidth: 1,
      borderStyle: "dashed",
      borderColor: c.redBorder,
      backgroundColor: c.redSurface,
    },
    captureButtonText: {
      fontSize: 15,
      fontWeight: "700",
      color: c.red,
    },
    secondaryButton: {
      marginTop: 10,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 6,
      paddingVertical: 10,
      borderRadius: 10,
      backgroundColor: c.redSurface,
    },
    secondaryButtonText: {
      fontSize: 14,
      fontWeight: "600",
      color: c.red,
    },
    metaRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      marginTop: 10,
    },
    metaText: {
      fontSize: 13,
      color: c.textSecondary,
    },
    retryText: {
      fontSize: 13,
      fontWeight: "600",
      color: c.red,
    },
  });
