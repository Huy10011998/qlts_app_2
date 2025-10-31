import md5 from "react-native-md5";
import { Field } from "../types";
import { TypeProperty } from "./Enum";
import React from "react";
import { Alert } from "react-native";
import { api } from "../services/data/CallApi";

// Bỏ dấu tiếng Việt
export const removeVietnameseTones = (str: string): string => {
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase();
};

// Hash MD5
export function md5Hash(input: string): string {
  return md5.hex_md5(input);
}

// Chuẩn hóa text
export const normalizeText = (text: string) =>
  text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

// Format key property
export const formatKeyProperty = (key: string) =>
  key.charAt(0).toLowerCase() + key.slice(1);

// Lấy giá trị từ Field
export const getFieldValue = (
  item: Record<string, any>,
  field: Field
): React.ReactNode => {
  if (!item || !field) return "--";

  const key =
    field.typeProperty === TypeProperty.Reference
      ? `${field.name}_MoTa`
      : field.name;

  const rawValue = item[formatKeyProperty(key)];
  if (rawValue == null) return "--";

  switch (field.typeProperty) {
    case TypeProperty.Date: {
      const date = new Date(rawValue);
      if (isNaN(date.getTime())) return "--";
      const day = String(date.getDate()).padStart(2, "0");
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const year = date.getFullYear();
      return `${day}/${month}/${year}`; // dd/MM/yyyy
    }

    case TypeProperty.Bool:
      return rawValue === true ? "✅" : rawValue === false ? "❌" : "--";

    case TypeProperty.Decimal: {
      const num = Number(rawValue);
      if (isNaN(num)) return "--";
      const formatter = new Intl.NumberFormat("vi-VN", {
        useGrouping: !field.notShowSplit,
        minimumFractionDigits: 0,
        maximumFractionDigits: 3,
      });
      return formatter.format(num);
    }

    case TypeProperty.Int: {
      const num = Number(rawValue);
      if (isNaN(num)) return "--";
      const formatter = new Intl.NumberFormat("vi-VN", {
        useGrouping: !field.notShowSplit,
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      });
      return formatter.format(num);
    }

    case TypeProperty.Reference:
      return String(rawValue);

    case TypeProperty.Image: {
      const uri = String(rawValue);
      if (!uri) return "--";

      return uri;
    }

    case TypeProperty.Link: {
      const link = String(rawValue);
      if (!link) return "--";

      return link;
    }

    default:
      return String(rawValue);
  }
};

// Call API
export const callApi = async <T,>(
  method: "GET" | "POST" | "PUT" | "DELETE",
  url: string,
  data?: any
): Promise<T> => {
  try {
    const response = await api.request<T>({
      method,
      url,
      data,
    });
    return response.data;
  } catch (error: any) {
    if (__DEV__) console.error(`[API ERROR] ${url}:`, error);
    throw error;
  }
};

// Tách nameClass
export const splitNameClass = (nameClass: string) => {
  if (!nameClass) return { key: "", label: "" };

  const parts = nameClass.split("-");
  return {
    key: parts[0]?.trim() || "",
    label: parts[1]?.trim() || "",
  };
};

// Format ngày giờ
export const formatDate = (dateString?: string) => {
  if (!dateString) return "Không có";
  try {
    const date = new Date(dateString);
    return date.toLocaleString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  } catch {
    return "Không hợp lệ";
  }
};

// Chuẩn hóa value
export function normalizeValue(value?: any): string {
  if (value === null || value === undefined) return "";
  return String(value)
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

// Lấy extension file
export const getFileExtension = (fileName: string) => {
  const parts = fileName.split(".");
  return parts.length > 1 ? parts.pop()?.toLowerCase() : "";
};

// Viết hoa chữ cái đầu
export function capitalizeFirstLetter(str?: string): string {
  if (!str) return "";
  return str.charAt(0).toUpperCase() + str.slice(1);
}

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

// Convert dd/mm/yyyy -> string yyyy-MM-ddT00:00:00
export function parseDateLocal(dateStr: string): string | null {
  if (!dateStr) return null;
  const parts = dateStr.split("/");
  if (parts.length !== 3) return null;

  const [day, month, year] = parts.map(Number);
  if (!day || !month || !year) return null;

  // format yyyy-MM-ddT00:00:00
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(
    2,
    "0"
  )}T00:00:00`;
}

// Format Date
export const validateDates = (
  fromDate: string,
  toDate: string
): { from: string; to: string } | null => {
  // Chuyển từ dd/MM/yyyy → Date
  const parseDateLocal = (dateStr: string): Date | null => {
    if (!dateStr) return null;
    const parts = dateStr.split("/");
    if (parts.length !== 3) return null;

    const [day, month, year] = parts.map(Number);
    if (!day || !month || !year) return null;

    return new Date(year, month - 1, day);
  };

  const from = parseDateLocal(fromDate);
  const to = parseDateLocal(toDate);

  if (!from || !to) {
    Alert.alert("Lỗi", "Ngày nhập không hợp lệ (định dạng dd/mm/yyyy).");
    return null;
  }

  if (from > to) {
    Alert.alert("Lỗi", "Từ ngày không được lớn hơn Đến ngày.");
    return null;
  }

  // Convert sang ISO string (yyyy-MM-ddTHH:mm:ss)
  return {
    from: from.toISOString(),
    to: to.toISOString(),
  };
};

// Hàm parse link từ chuỗi HTML <a>
export const parseLink = (html: string) => {
  const match = html.match(/href="([^"]+)".*>([^<]+)<\/a>/);
  if (match) {
    return { url: match[1], text: match[2] };
  }
  return null;
};
