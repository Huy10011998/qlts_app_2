import { Alert } from "react-native";
import { TypeProperty } from "./Enum";
import { Field } from "../types";

// Convert "dd-MM-yyyy" → "dd/MM/yyyy"
export const formatToSlash = (str: string) => str.replace(/-/g, "/");

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
  const parseWithCurrentTime = (dateStr: string): Date | null => {
    const [d, m, y] = dateStr.split("/").map(Number);
    if (!d || !m || !y) return null;

    const now = new Date();

    return new Date(
      y,
      m - 1,
      d,
      now.getHours(),
      now.getMinutes(),
      now.getSeconds(),
      now.getMilliseconds()
    );
  };

  const from = parseWithCurrentTime(fromDate);
  const to = parseWithCurrentTime(toDate);

  if (!from || !to) {
    Alert.alert("Lỗi", "Ngày nhập không hợp lệ.");
    return null;
  }

  if (from > to) {
    Alert.alert("Lỗi", "Từ ngày không được lớn hơn Đến ngày.");
    return null;
  }

  return {
    from: from.toISOString(),
    to: to.toISOString(),
  };
};

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

// Hàm parse ngày dd-MM-yyyy
export const parseDate = (val?: string) => {
  if (!val) return new Date();
  const [d, m, y] = val.split("-").map(Number);
  return new Date(y, m - 1, d, 12, 0, 0);
};

// Hàm format ngày dd-MM-yyyy
export const formatDMY = (date: Date) => {
  const d = date.getDate().toString().padStart(2, "0");
  const m = (date.getMonth() + 1).toString().padStart(2, "0");
  const y = date.getFullYear();
  return `${d}-${m}-${y}`;
};
