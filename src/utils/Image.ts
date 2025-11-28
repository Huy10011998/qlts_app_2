import { launchImageLibrary } from "react-native-image-picker";
import {
  getPreviewAttachProperty,
  uploadAttachProperty,
} from "../services/data/CallApi";
import { getMimeType } from "./Helper";
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
