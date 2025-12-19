import { launchImageLibrary } from "react-native-image-picker";
import {
  getPreviewAttachProperty,
  uploadAttachProperty,
} from "../services/data/CallApi";
import { error } from "./Logger";
import { Alert } from "react-native";

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
  setImages: React.Dispatch<React.SetStateAction<Record<string, string>>>
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
export const pickImage = async (
  fieldName: string,
  handleChange: (field: string, value: any) => void,
  setImages: React.Dispatch<React.SetStateAction<Record<string, any>>>,
  setLoadingImages: React.Dispatch<
    React.SetStateAction<Record<string, boolean>>
  >
) => {
  try {
    const res = await launchImageLibrary({
      mediaType: "photo",
      quality: 0.7,
    });

    if (res.didCancel || !res.assets?.length) {
      setLoadingImages((p) => ({ ...p, [fieldName]: false }));
      return;
    }

    const asset = res.assets[0];

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

    // Update preview
    setImages((prev) => ({
      ...prev,
      [fieldName]: url,
    }));

    // Update formData
    handleChange(fieldName, url);
  } catch (error: any) {
    Alert.alert("Lỗi", "Không thể tải ảnh!");
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
