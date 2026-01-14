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

  if (date instanceof Date) {
    if (isNaN(date.getTime())) return null;

    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, "0");
    const dd = String(date.getDate()).padStart(2, "0");

    return `${yyyy}-${mm}-${dd}T00:00:00`;
  }

  if (typeof date === "string") {
    // yyyy-MM-dd hoặc yyyy-MM-ddTHH:mm:ss
    if (/^\d{4}-\d{2}-\d{2}(T.*)?$/.test(date)) {
      const [ymd] = date.split("T");
      return `${ymd}T00:00:00`;
    }

    // dd-MM-yyyy
    if (/^\d{2}-\d{2}-\d{4}$/.test(date)) {
      const [dd, mm, yyyy] = date.split("-");
      return `${yyyy}-${mm}-${dd}T00:00:00`;
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
  // ===== DATE =====
  if (f.typeProperty === TypeProperty.Date && f.defaultDateNow) {
    const d = new Date();

    // dd-MM-yyyy
    return d.toLocaleDateString("vi-VN").replaceAll("/", "-");
  }

  // ===== TIME =====
  if (f.typeProperty === TypeProperty.Time && f.defaultTimeNow) {
    const d = new Date();

    const h = String(d.getHours()).padStart(2, "0");
    const m = String(d.getMinutes()).padStart(2, "0");

    return `${h}:${m}`; // ✅ 16:05
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
