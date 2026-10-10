import { Alert } from "react-native";
import {
  errorCodes,
  isErrorWithCode,
  pick,
} from "@react-native-documents/picker";
import { launchCamera, launchImageLibrary } from "react-native-image-picker";

import { WORKFLOW_MAX_FILE_BYTES } from "../../../services/data/workflowApi";
import type { WorkflowPickedFile } from "../../../types/index";
import { alertCameraUnavailable, ensureCameraPermission } from "../../../utils/Image";
import { error } from "../../../utils/Logger";

/**
 * Chọn file đính kèm cho phiếu / công việc / bình luận / file kết quả: chụp
 * ảnh, lấy ảnh trong thư viện, hoặc tài liệu (PDF, Word, Excel...) qua trình
 * chọn file của hệ điều hành. Mỗi file tối đa 20MB (giới hạn của server).
 */

export type AttachSource = "camera" | "library" | "document";

const IMAGE_QUALITY = 0.7;
const CAMERA_MAX_DIMENSION = 1600;

const MIME_BY_EXT: Record<string, string> = {
  pdf: "application/pdf",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xls: "application/vnd.ms-excel",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ppt: "application/vnd.ms-powerpoint",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  txt: "text/plain",
  csv: "text/csv",
  zip: "application/zip",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  gif: "image/gif",
  heic: "image/heic",
  webp: "image/webp",
  mp4: "video/mp4",
  mov: "video/quicktime",
};

export const getFileExtension = (name?: string | null) =>
  (name ?? "").split(".").pop()?.toLowerCase() ?? "";

export const guessMimeType = (name?: string | null) =>
  MIME_BY_EXT[getFileExtension(name)] ?? "application/octet-stream";

export const isImageFileName = (name?: string | null) =>
  ["jpg", "jpeg", "png", "gif", "webp", "heic"].includes(getFileExtension(name));

/** "1,2 MB" / "340 KB". `kb` là số KB server trả. */
export const formatFileSizeKb = (kb?: number | null) => {
  if (kb == null || !Number.isFinite(Number(kb))) return "";
  const value = Number(kb);
  return value >= 1024
    ? `${(value / 1024).toLocaleString("vi-VN", { maximumFractionDigits: 1 })} MB`
    : `${Math.max(1, Math.round(value))} KB`;
};

const dropOversized = (files: WorkflowPickedFile[]) => {
  const oversized = files.filter(
    (file) => file.size != null && file.size > WORKFLOW_MAX_FILE_BYTES,
  );

  if (oversized.length) {
    Alert.alert(
      "File quá lớn",
      `Mỗi file tối đa 20MB. Đã bỏ qua:\n${oversized.map((file) => `- ${file.name}`).join("\n")}`,
    );
  }

  return files.filter((file) => !oversized.includes(file));
};

const pickImages = async (
  source: "camera" | "library",
  multiple: boolean,
): Promise<WorkflowPickedFile[]> => {
  if (source === "camera" && !(await ensureCameraPermission())) return [];

  const res =
    source === "camera"
      ? await launchCamera({
          mediaType: "photo",
          cameraType: "back",
          saveToPhotos: false,
          presentationStyle: "fullScreen",
          quality: IMAGE_QUALITY,
          maxWidth: CAMERA_MAX_DIMENSION,
          maxHeight: CAMERA_MAX_DIMENSION,
        })
      : await launchImageLibrary({
          mediaType: "photo",
          quality: IMAGE_QUALITY,
          selectionLimit: multiple ? 10 : 1,
        });

  if (res.errorCode) {
    if (source === "camera") {
      alertCameraUnavailable();
    } else {
      Alert.alert(
        "Không mở được thư viện",
        "Thiết bị không mở được thư viện ảnh. Vui lòng thử lại.",
      );
    }
    return [];
  }

  return (res.assets ?? [])
    .filter((asset) => !!asset.uri)
    .map((asset, index) => {
      const name = asset.fileName || `anh_${Date.now()}_${index}.jpg`;
      return {
        uri: asset.uri!,
        name,
        type: asset.type || guessMimeType(name),
        size: asset.fileSize ?? null,
      };
    });
};

const pickDocuments = async (multiple: boolean): Promise<WorkflowPickedFile[]> => {
  try {
    const results = await pick({ allowMultiSelection: multiple });

    return results
      .filter((item) => !item.error && !!item.uri)
      .map((item, index) => {
        const name = item.name || `tep_${Date.now()}_${index}`;
        return {
          uri: item.uri,
          name,
          type: item.type || guessMimeType(name),
          size: item.size ?? null,
        };
      });
  } catch (err) {
    if (isErrorWithCode(err) && err.code === errorCodes.OPERATION_CANCELED) {
      return [];
    }

    error("[workflowAttachments] pick document error", err);
    Alert.alert("Không chọn được file", "Vui lòng thử lại.");
    return [];
  }
};

/** Mở nguồn đã chọn, trả các file hợp lệ (đã bỏ file > 20MB). Hủy → []. */
export const pickWorkflowFiles = async (
  source: AttachSource,
  multiple = true,
): Promise<WorkflowPickedFile[]> => {
  const files =
    source === "document"
      ? await pickDocuments(multiple)
      : await pickImages(source, multiple);

  return dropOversized(files);
};
