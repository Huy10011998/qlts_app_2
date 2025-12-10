import md5 from "react-native-md5";
import { Field } from "../types";
import { TypeProperty } from "./Enum";
import React from "react";

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

// Chuẩn hóa keys của object
export const normalizeKeys = (obj: any) => {
  const newObj: any = {};
  for (const key in obj) {
    const normalized = key.charAt(0).toLowerCase() + key.slice(1);
    newObj[normalized] = obj[key];
  }
  return newObj;
};

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

// maytinh -> MayTinh
export const normalizeClassName = (name?: string) => {
  if (!name) return "";

  // B1: làm sạch ký tự đặc biệt
  let clean = name.replace(/[_\-\s]+/g, "");

  // B2: nếu toàn bộ lowercase → tách theo kiểu 2 từ (maytinh → may + tinh)
  if (/^[a-z]+$/.test(clean)) {
    // chia giữa theo heuristic: tìm chuỗi consonant + vowel + "tinh" (fix theo domain VN)
    // bạn có thể tự bổ sung nếu sau này có Class khác (e.g. xeoto → xe + oto)
    return clean
      .replace(/(.{3,}?)(tinh)/i, "$1 $2")
      .split(" ")
      .map((p) => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase())
      .join("");
  }

  // B3: Nếu dạng camelCase hoặc PascalCase (mayTinh, MayTinh)
  clean = clean.replace(/([a-z])([A-Z])/g, "$1 $2");

  // B4: viết hoa chuẩn từng từ rồi nối lại
  return clean
    .split(" ")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join("");
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

// Hàm parse link từ chuỗi HTML <a>
export const parseLink = (html: string) => {
  const match = html.match(/href="([^"]+)".*>([^<]+)<\/a>/);

  if (match) {
    return { url: match[1], text: match[2] };
  }
  return null;
};

export function parseLinkHtml(html: string) {
  if (!html) return { url: "", text: "" };

  const urlMatch = html.match(/href="([^"]+)"/);
  const textMatch = html.replace(/<[^>]+>/g, "").trim();

  return {
    url: urlMatch ? urlMatch[1] : "",
    text: textMatch || "",
  };
}

// Các tab mặc định
export const TAB_ITEMS = [
  { key: "list", label: "Thông tin", icon: "document-text-outline" },
  { key: "details", label: "Chi tiết", icon: "menu-outline" },
  { key: "notes", label: "Note", icon: "document-attach-outline" },
  { key: "history", label: "Lịch sử", icon: "time-outline" },
  { key: "attach", label: "Tệp", icon: "attach-outline" },
] as const;

// buildHtmlLink.ts
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
