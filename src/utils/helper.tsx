import md5 from "react-native-md5";
import api from "../context/AuthContext";
import { Field } from "../types";
import { TypeProperty } from "./enum";

// Bỏ dấu tiếng Việt
export const removeVietnameseTones = (str: string): string => {
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase();
};

// ✅ Hash MD5 bằng react-native-quick-crypto
export function md5Hash(input: string): string {
  return md5.hex_md5(input);
}

// Chuẩn hóa text cơ bản
export const normalizeText = (text: string) =>
  text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

// Format key property (camelCase chữ cái đầu)
export const formatKeyProperty = (key: string) =>
  key.charAt(0).toLowerCase() + key.slice(1);

// Lấy giá trị từ Field
export const getFieldValue = (
  item: Record<string, any>,
  field: Field
): string => {
  if (!item || !field) return "--";

  const key =
    field.typeProperty === TypeProperty.Reference
      ? `${field.name}_MoTa`
      : field.name;

  return String(item[formatKeyProperty(key)] ?? "--");
};

// Gọi API chung
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

// Tách tên lớp thành key và label
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

// Chuẩn hóa value để so sánh
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

// Lấy extension của file
export const getFileExtension = (fileName: string) => {
  const parts = fileName.split(".");
  return parts.length > 1 ? parts.pop()?.toLowerCase() : "";
};

export function capitalizeFirstLetter(str?: string): string {
  if (!str) return "";
  return str.charAt(0).toUpperCase() + str.slice(1);
}
