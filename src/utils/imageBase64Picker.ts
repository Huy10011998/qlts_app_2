import { Alert, Image as RNImage } from "react-native";
import ImagePicker, {
  type Image as PickedImage,
} from "react-native-image-crop-picker";
import RNFS from "react-native-fs";

import {
  alertCameraUnavailable,
  ensureCameraPermission,
  type ImagePickSource,
} from "./Image";
import { isDataUrlImage } from "./imageBase64";
import { error } from "./Logger";

/*
 * Chọn ảnh cho field `typeProperty = 12`. Các con số phải khớp web
 * (`Common/ImageCrop.cs` + `image-crop.js`), lệch là ảnh tạo từ app và từ web
 * khác khung / dung lượng.
 */
const MAX_SOURCE_BYTES = 20 * 1024 * 1024;
const MAX_EDGE = 600;
const JPEG_QUALITY = 0.6;
const JPEG_PREFIX = "data:image/jpeg;base64,";

const isCancelled = (err: any) => err?.code === "E_PICKER_CANCELLED";

const reportPickerError = (err: any) => {
  const code = String(err?.code ?? "");
  if (code === "E_PICKER_CANNOT_RUN_CAMERA_ON_SIMULATOR") {
    alertCameraUnavailable();
    return;
  }
  if (code === "E_NO_LIBRARY_PERMISSION" || code === "E_NO_CAMERA_PERMISSION") {
    Alert.alert(
      "Không có quyền truy cập",
      "Ứng dụng cần quyền truy cập ảnh / camera. Vui lòng cấp quyền trong phần Cài đặt.",
    );
    return;
  }

  error("[imageBase64] picker error:", err);
  Alert.alert("Lỗi", "Không thể xử lý ảnh. Vui lòng thử lại.");
};

const cleanup = (path?: string) => {
  if (!path) return;
  ImagePicker.cleanSingle(path).catch(() => {});
};

const getImageSize = (uri: string) =>
  new Promise<{ width: number; height: number }>((resolve) => {
    RNImage.getSize(
      uri,
      (width, height) => resolve({ width, height }),
      () => resolve({ width: MAX_EDGE, height: MAX_EDGE }),
    );
  });

/**
 * Mở màn cắt 1:1 rồi trả data URL JPEG. Thư viện tự xoay theo EXIF trước khi
 * cắt và mã hoá lại thì EXIF (kể cả GPS) rơi mất — đúng ý BE.
 *
 * Khung 1:1 nên cạnh dài = cạnh ngắn; kẹp ở 600 và không vượt cạnh ngắn của
 * ảnh gốc để ảnh nhỏ không bị phóng to.
 */
const cropToDataUrl = async (
  path: string,
  width: number,
  height: number,
): Promise<string | null> => {
  const shortEdge = Math.min(width, height);
  const side = Math.round(
    shortEdge > 0 ? Math.min(MAX_EDGE, shortEdge) : MAX_EDGE,
  );

  let cropped: PickedImage | undefined;
  try {
    cropped = await ImagePicker.openCropper({
      path,
      mediaType: "photo",
      width: side,
      height: side,
      compressImageQuality: JPEG_QUALITY,
      forceJpg: true,
      includeBase64: true,
      includeExif: false,
      cropperToolbarTitle: "Cắt ảnh",
      cropperChooseText: "Xong",
      cropperCancelText: "Huỷ",
    });

    if (!cropped.data) return null;
    // Base64 chuẩn, không xuống dòng — Android có lúc chèn "\n".
    return JPEG_PREFIX + cropped.data.replace(/\s/g, "");
  } finally {
    cleanup(cropped?.path);
  }
};

/**
 * Chụp / chọn ảnh → cắt 1:1 → ≤ 600px → JPEG 60% → data URL.
 * Trả `null` khi người dùng huỷ ở bất kỳ bước nào (giữ ảnh cũ) hoặc lỗi.
 */
export const pickImageBase64 = async (
  source: ImagePickSource,
): Promise<string | null> => {
  if (source === "camera" && !(await ensureCameraPermission())) return null;

  let picked: PickedImage | undefined;
  try {
    /* Chọn trước, cắt sau: phải đọc được dung lượng file GỐC để chặn > 20 MB
       — bật `cropping` ngay thì `size` trả về là của ảnh đã cắt. */
    picked =
      source === "camera"
        ? await ImagePicker.openCamera({ mediaType: "photo" })
        : await ImagePicker.openPicker({ mediaType: "photo" });

    if (picked.mime && !picked.mime.startsWith("image/")) {
      Alert.alert("Lỗi", "Vui lòng chọn tệp ảnh.");
      return null;
    }

    if (picked.size > MAX_SOURCE_BYTES) {
      Alert.alert("Lỗi", "Kích thước tệp quá lớn");
      return null;
    }

    return await cropToDataUrl(picked.path, picked.width, picked.height);
  } catch (err) {
    if (!isCancelled(err)) reportPickerError(err);
    return null;
  } finally {
    cleanup(picked?.path);
  }
};

/**
 * "Cắt lại": mở màn cắt với ảnh đang có. Màn cắt chỉ nhận đường dẫn file nên
 * phải ghi chuỗi ra file tạm, cắt xong thì xoá.
 */
export const recropImageBase64 = async (
  dataUrl: string,
): Promise<string | null> => {
  if (!isDataUrlImage(dataUrl)) return null;

  const comma = dataUrl.indexOf(",");
  const isPng = dataUrl.startsWith("data:image/png");
  const tempPath = `${RNFS.CachesDirectoryPath}/recrop_${Date.now()}.${
    isPng ? "png" : "jpg"
  }`;

  try {
    await RNFS.writeFile(tempPath, dataUrl.substring(comma + 1), "base64");
    const { width, height } = await getImageSize(dataUrl);
    return await cropToDataUrl(`file://${tempPath}`, width, height);
  } catch (err) {
    if (!isCancelled(err)) reportPickerError(err);
    return null;
  } finally {
    RNFS.unlink(tempPath).catch(() => {});
  }
};
