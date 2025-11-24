import md5 from "react-native-md5";
import { Field } from "../types";
import { TypeProperty } from "./Enum";
import React from "react";
import { Alert } from "react-native";

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

export const parseLinkHtml = (html: string) => {
  if (!html) return { url: "", text: "" };

  try {
    const hrefMatch = html.match(/href="([^"]*)"/);
    const textMatch = html.match(/>(.*?)<\/a>/);

    const url = hrefMatch ? hrefMatch[1].trim() : "";
    let text = textMatch ? textMatch[1].trim() : "";

    if (url === text) {
      text = "";
    }

    return { url, text };
  } catch {
    return { url: "", text: "" };
  }
};

// Các tab mặc định
export const TAB_ITEMS = [
  { key: "list", label: "Thông tin", icon: "document-text-outline" },
  { key: "details", label: "Chi tiết", icon: "menu-outline" },
  { key: "notes", label: "Note", icon: "document-attach-outline" },
  { key: "history", label: "Lịch sử", icon: "time-outline" },
  { key: "attach", label: "Tệp", icon: "attach-outline" },
] as const;

export function formatDateForBE(date: any): string | null {
  if (!date) return null;

  // Nếu FE truyền Date object
  if (date instanceof Date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}T00:00:00`;
  }

  // Nếu FE truyền dạng string dd-MM-yyyy
  if (typeof date === "string" && date.includes("-")) {
    const parts = date.split("-");
    if (parts.length === 3) {
      const [day, month, year] = parts;
      // FE nhập 14-11-2025 → BE cần yyyy-MM-dd
      if (year.length === 4) {
        return `${year}-${month}-${day}T00:00:00`;
      }
    }
  }

  return null;
}

// FILE: src/utils/buildHtmlLink.ts
export const buildHtmlLink = (url: string, label?: string) => {
  const labelOrUrl = label?.trim() || url;
  return `<a href="${url}" target="_blank" rel="noopener noreferrer" style="color: blue;">${labelOrUrl}</a>`;
};

export const normalizeKey = (k?: string) =>
  (k ?? "").toString().replace(/[_\s]/g, "").toLowerCase();

export function getMatchedKey(item: Record<string, any>, name: string) {
  const keys = Object.keys(item);

  // match exact first
  let found = keys.find((k) => k.toLowerCase() === name.toLowerCase());
  if (found) return found;

  // match remove underscore / lowercase
  found = keys.find(
    (k) =>
      k.replace(/_/g, "").toLowerCase() === name.replace(/_/g, "").toLowerCase()
  );
  if (found) return found;

  return undefined;
}

export const formatToIOS = (val: string) => {
  const [d, m, y] = val.split("-"); // dd-MM-yyyy
  return `${y}-${m}-${d}`;
};

export const normalizeDateFromBE = (raw: any) => {
  if (!raw) return "";

  const s = String(raw).trim();

  // yyyy-MM-dd or yyyy-MM-ddTHH:mm:ss
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) {
    const d = new Date(s);
    if (isNaN(d.getTime())) return "";
    const dd = String(d.getDate()).padStart(2, "0");
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const yyyy = d.getFullYear();
    return `${dd}-${mm}-${yyyy}`;
  }

  // dd-MM-yyyy → giữ nguyên
  if (/^\d{2}-\d{2}-\d{4}$/.test(s)) return s;

  return "";
};

// tính độ sâu cho mỗi field dựa trên parentsFields
export const getDepth = (field: any, all: any[]): number => {
  if (!field.parentsFields) return 0; // cha gốc
  const parents = field.parentsFields.split(",");
  return (
    1 +
    Math.max(
      ...parents.map((p: any) => {
        const parentField = all.find((f) => f.name === p);
        return parentField ? getDepth(parentField, all) : 0;
      })
    )
  );
};

// Lấy giá trị mặc định Date Now cho field
export const getDefaultValueForField = (f: Field) => {
  if (f.typeProperty === TypeProperty.Date && f.defaultDateNow) {
    const d = new Date();

    // format = dd-mm-yyyy
    const formatted = d
      .toLocaleDateString("vi-VN") // → dd/mm/yyyy
      .replaceAll("/", "-"); // → dd-mm-yyyy

    return formatted;
  }

  return "";
};
