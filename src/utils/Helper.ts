import md5 from "react-native-md5";

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

// Các tab mặc định
export const TAB_ITEMS = [
  { key: "list", label: "Thông tin", icon: "document-text-outline" },
  { key: "details", label: "Chi tiết", icon: "menu-outline" },
  { key: "notes", label: "Note", icon: "document-attach-outline" },
  { key: "history", label: "Lịch sử", icon: "time-outline" },
  { key: "attach", label: "Tệp", icon: "attach-outline" },
] as const;

// map key “gần đúng” giữa dữ liệu backend và frontend.
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

// format view hiển thị 1000 -> 1.000
export const formatVND = (value: string | number) => {
  if (value === null || value === undefined || value === "") return "";
  const num = Number(String(value).replace(/\D/g, ""));
  if (isNaN(num)) return "";
  return num.toLocaleString("vi-VN");
};

export const unFormatVND = (value: string) => value.replace(/\./g, "");
