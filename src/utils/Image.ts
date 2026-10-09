import { launchCamera, launchImageLibrary } from "react-native-image-picker";
import {
  getPreviewAttachProperty,
  uploadAttachProperty,
} from "../services/data/callApi";
import { error } from "./Logger";
import { Alert, Platform } from "react-native";
import { markFormImageTouched } from "./formImageOriginals";
import {
  checkCameraPermission,
  openAppPermissionSettings,
  requestCameraPermission,
} from "../services/cameraPermission";

export const buildImageUrlLocal = (raw: any) => {
  if (!raw) return "";

  const s = String(raw);

  // nếu client chọn image -> giữ nguyên
  if (
    s.startsWith("data:") ||
    s.startsWith("file://") ||
    s.startsWith("content://")
  )
    return s;

  // nếu BE đã trả http
  if (s.startsWith("http")) return s;

  // nếu BE trả kiểu \Upload\xx.jpg
  const clean = s.replace(/\\/g, "/");

  const base = "https://your-real-domain.com/";

  return clean.startsWith("/") ? `${base}${clean.slice(1)}` : `${base}${clean}`;
};

// Detect mime type từ path
export const getMimeType = (path: string) => {
  const ext = path.split(".").pop()?.toLowerCase();
  switch (ext) {
    case "jpg":
    case "jpeg":
      return "image/jpeg";
    case "png":
      return "image/png";
    case "gif":
      return "image/gif";
    default:
      return "image/png";
  }
};

// Hàm fetch ảnh
export const fetchImage = async (
  fieldName: string,
  path: string,
  setLoadingImages: React.Dispatch<
    React.SetStateAction<Record<string, boolean>>
  >,
  setImages: React.Dispatch<React.SetStateAction<Record<string, string>>>,
) => {
  try {
    if (!path || path.trim() === "--") return;

    setLoadingImages((prev) => ({ ...prev, [fieldName]: true }));
    const res = await getPreviewAttachProperty(path);
    const mimeType = getMimeType(path);

    setImages((prev) => ({
      ...prev,
      [fieldName]: `data:${mimeType};base64,${res.data}`,
    }));
  } catch (err) {
    error("Error fetching image:", err);
  } finally {
    setLoadingImages((prev) => ({ ...prev, [fieldName]: false }));
  }
};

// Convert path img
export const convertToResizePath = (originalPath: string): string => {
  try {
    // Tách folder + filename
    const parts = originalPath.split("\\");
    if (parts.length < 2) return originalPath;

    const folder = parts[0]; // Property
    const filename = parts[1]; // aefadd90-....jpg

    // Tách name + extension
    const dotIndex = filename.lastIndexOf(".");
    if (dotIndex === -1) return originalPath;

    const name = filename.slice(0, dotIndex); // aefadd90-...
    const ext = filename.slice(dotIndex); // .jpg

    // Tạo path mới
    return `${folder}_Resize\\${name}_resize${ext}`;
  } catch {
    return originalPath;
  }
};

// ---------- image picker ----------

/** Ảnh chụp tại chỗ nên kẹp cạnh dài lại: đỡ tốn mạng, xem trên app vẫn nét. */
const CAMERA_MAX_DIMENSION = 1600;
const IMAGE_QUALITY = 0.7;

export type ImagePickSource = "library" | "camera";

/**
 * Ảnh nào đang được hiện bằng file ngay trên máy (vừa chụp / vừa chọn, hoặc ảnh
 * cũ vừa hoàn tác) thì không cần tải lại từ server nữa: `useImageLoader` thấy giá
 * trị field đổi là đi tải, mà tải thì lại nhấp nháy đúng cái ảnh đang hiện.
 */
const localPreviews = new Map<string, string>();

export const markLocalPreview = (fieldName: string, value: string) => {
  if (value) localPreviews.set(fieldName, value);
};

export const hasLocalPreview = (fieldName: string, value: string) =>
  localPreviews.get(fieldName) === value;

/**
 * Một câu báo chung khi không mở được camera (máy ảo, máy không có camera, lỗi
 * hệ thống) — dùng cho mọi chỗ chụp ảnh trong app.
 *
 * Không hiện `errorMessage` của thư viện: nó là tiếng Anh, mỗi thư viện một kiểu.
 * Màn nào cần chặn alert khi đã rời màn thì truyền `showAlert` của nó vào.
 */
export const alertCameraUnavailable = (
  showAlert: (title: string, message: string) => void = (title, message) =>
    Alert.alert(title, message),
) =>
  showAlert(
    "Không mở được camera",
    "Thiết bị không mở được camera. Vui lòng thử lại trên máy thật.",
  );

/**
 * Xin quyền camera trước khi mở, giống tab Quét QR và màn xác nhận vị trí tủ.
 *
 * `launchCamera` bị từ chối quyền thì chỉ trả `errorCode` chứ không tự hỏi lại,
 * người dùng bấm mãi không ra gì — nên phải hỏi trước, và khi đã bị chặn hẳn thì
 * chỉ đường vào Cài đặt.
 */
export const ensureCameraPermission = async () => {
  const currentStatus = await checkCameraPermission();
  if (currentStatus === "granted") return true;

  if (currentStatus === "unavailable") {
    alertCameraUnavailable();
    return false;
  }

  const nextStatus =
    currentStatus === "denied" || currentStatus === "unknown"
      ? await requestCameraPermission()
      : currentStatus;

  if (nextStatus === "granted") return true;

  Alert.alert(
    "Không có quyền camera",
    "Ứng dụng cần quyền camera để chụp ảnh. Vui lòng cấp quyền trong phần Cài đặt.",
    [
      { text: "Để sau", style: "cancel" },
      { text: "Mở Cài đặt", onPress: () => openAppPermissionSettings() },
    ],
  );

  return false;
};

export const pickImage = async (
  fieldName: string,
  handleChange: (field: string, value: any) => void,
  setImages: React.Dispatch<React.SetStateAction<Record<string, any>>>,
  setLoadingImages: React.Dispatch<
    React.SetStateAction<Record<string, boolean>>
  >,
  /** Chụp trực tiếp rồi tải lên luôn, hay lấy ảnh có sẵn trong thư viện. */
  source: ImagePickSource = "library",
  /** Trả về đường dẫn ảnh đã tải lên, `null` nếu người dùng hủy hoặc lỗi — form
   * cần biết ảnh có thật sự đổi hay không để bật nút hoàn tác. */
): Promise<string | null> => {
  try {
    if (source === "camera" && !(await ensureCameraPermission())) {
      setLoadingImages((p) => ({ ...p, [fieldName]: false }));
      return null;
    }

    const res =
      source === "camera"
        ? await launchCamera({
            mediaType: "photo",
            cameraType: "back",
            saveToPhotos: false,
            // iOS mặc định mở dạng thẻ (`pageSheet`), hở mép trên — mở tràn màn
            // cho giống màn chụp của field ảnh base64. Android vốn đã tràn màn.
            presentationStyle: "fullScreen",
            quality: IMAGE_QUALITY,
            maxWidth: CAMERA_MAX_DIMENSION,
            maxHeight: CAMERA_MAX_DIMENSION,
          })
        : await launchImageLibrary({
            mediaType: "photo",
            quality: IMAGE_QUALITY,
          });

    if (res.errorCode) {
      // Quyền camera đã xin ở trên, tới đây gần như chỉ còn máy ảo / lỗi hệ thống.
      if (source === "camera") {
        alertCameraUnavailable();
      } else {
        Alert.alert(
          "Không mở được thư viện",
          res.errorMessage ||
            "Thiết bị không mở được. Vui lòng thử lại trên máy thật.",
        );
      }
      setLoadingImages((p) => ({ ...p, [fieldName]: false }));
      return null;
    }

    if (res.didCancel || !res.assets?.length) {
      setLoadingImages((p) => ({ ...p, [fieldName]: false }));
      return null;
    }

    const asset = res.assets[0];

    /* Chỉ bật cờ tải khi đã thực sự chọn được ảnh: bật từ trước lúc mở thư viện
       thì suốt lúc người dùng còn đang ngắm ảnh trong máy, form đã thay ảnh cũ
       bằng ô xám chờ — quay ra thấy trống trơn, tưởng mất ảnh. */
    setLoadingImages((p) => ({ ...p, [fieldName]: true }));

    /* Chốt mốc ảnh gốc NGAY ở đây, trước khi preview bị thay. Đợi tới lúc
       `pickImage` trả về mới chốt thì đã muộn: preview mới đã vào state, form
       render lại một nhịp và ghi mốc bằng chính ảnh vừa chọn — hoàn tác không còn
       đường về ảnh của BE. */
    markFormImageTouched(fieldName);

    /* Hiện luôn ảnh vừa chọn bằng file trên máy, không đợi upload xong: ảnh mới
       lên ngay, vòng xoay chỉ phủ mờ bên trên trong lúc còn đang tải. */
    if (asset.uri) {
      setImages((prev) => ({ ...prev, [fieldName]: asset.uri }));
    }

    const fileObj = {
      uri: asset.uri,
      name: asset.fileName ?? `image_${Date.now()}.jpg`,
      type: asset.type || "image/jpeg",
    };

    // Nếu muốn log FormData -> tạo thử để log
    const debugForm = new FormData();
    debugForm.append("File", fileObj);

    const url = await uploadAttachProperty({
      file: fileObj,
    });

    /* Không thay preview bằng đường dẫn server trả về: nó là path kiểu
       `Property\\abc.jpg`, `Image` không hiện được nên ảnh vừa thấy sẽ nháy
       thành ô xám. Ảnh trên máy đã hiện ở trên, giữ luôn cái đó. */
    if (asset.uri) {
      setImages((prev) => ({ ...prev, [fieldName]: asset.uri }));
      markLocalPreview(fieldName, String(url));
    } else {
      setImages((prev) => ({ ...prev, [fieldName]: url }));
    }

    // Update formData
    handleChange(fieldName, url);

    return url;
  } catch (uploadError: any) {
    const message = String(
      uploadError?.message ?? uploadError?.errorMessage ?? "",
    ).toLowerCase();
    const isPermissionError =
      message.includes("permission") ||
      message.includes("denied") ||
      message.includes("not authorized");

    Alert.alert(
      isPermissionError ? "Không có quyền truy cập ảnh" : "Lỗi",
      isPermissionError
        ? Platform.OS === "android"
          ? "Ứng dụng cần quyền truy cập ảnh để chọn hình. Vui lòng cấp quyền trong Cài đặt."
          : "Ứng dụng cần quyền truy cập ảnh để chọn hình."
        : "Không thể tải ảnh!",
    );

    return null;
  } finally {
    setLoadingImages((p) => ({ ...p, [fieldName]: false }));
  }
};

export function getResizePath(inputPath: string): string {
  if (!inputPath) return "";

  // Chuẩn hóa path -> thay "\" thành "/"
  const normalizedPath = inputPath.replace(/\\/g, "/");

  // Tách thư mục và file
  const lastSlashIndex = normalizedPath.lastIndexOf("/");
  const folder =
    lastSlashIndex >= 0 ? normalizedPath.substring(0, lastSlashIndex) : "";
  const fileName =
    lastSlashIndex >= 0
      ? normalizedPath.substring(lastSlashIndex + 1)
      : normalizedPath;

  // Tách tên và đuôi file
  const dotIndex = fileName.lastIndexOf(".");
  const nameWithoutExt =
    dotIndex >= 0 ? fileName.substring(0, dotIndex) : fileName;
  const ext = dotIndex >= 0 ? fileName.substring(dotIndex) : "";

  // Đổi folder -> folder_resize
  const newFolder = folder ? `${folder}_resize` : "resize";

  // Tạo path mới
  return `${newFolder}/${nameWithoutExt}_resize${ext}`;
}
