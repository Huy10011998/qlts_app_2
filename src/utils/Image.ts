import { launchImageLibrary } from "react-native-image-picker";
import { getPreviewAttachProperty } from "../services/data/CallApi";
import { getMimeType } from "./Helper";
import { error, log } from "./Logger";
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

// Hàm fetch ảnh cho AssetEditItem.tsx và AssetGroupList
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
  setImages: React.Dispatch<React.SetStateAction<Record<string, string>>>
) => {
  try {
    const res = await launchImageLibrary({
      mediaType: "photo",
      includeBase64: true,
      quality: 0.7,
    });
    if (res.didCancel || !res.assets?.length) return;

    const file = res.assets[0];

    // 1) Gán vào formData để chuẩn bị gửi lên server
    if (file.base64 && file.type) {
      const base64Image = `data:${file.type};base64,${file.base64}`;

      handleChange(fieldName, base64Image);

      // 2) Gán vào images để UI hiển thị ngay
      setImages((prev) => ({
        ...prev,
        [fieldName]: base64Image,
      }));
    } else if (file.uri) {
      handleChange(fieldName, file.uri);

      setImages((prev) => ({
        ...prev,
        [fieldName]: file.uri!,
      }));
    } else {
      Alert.alert("Lỗi", "Không đọc được ảnh!");
    }
  } catch (e) {
    log("Lỗi chọn ảnh:", e);
    Alert.alert("Lỗi", "Không thể tải ảnh!");
  }
};
