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
// change nameClass permission
export const normalizeClassName = (name?: string) => {
  if (!name) return "";

  // ✅ CASE 1: Backend class (có dấu _ và chữ hoa)
  // => KHÔNG ĐỤNG
  if (/_/.test(name) && /[A-Z]/.test(name)) {
    return name.trim();
  }

  // CASE 2: camelCase / PascalCase không _
  if (!/_/.test(name) && /[A-Z]/.test(name)) {
    return name.trim();
  }

  // CASE 3: lowercase hoặc dạng user input (maytinh, may_tinh)
  let clean = name.replace(/[_\-\s]+/g, " ");

  // lowercase liền nhau
  if (/^[a-z\s]+$/.test(clean)) {
    return clean
      .split(" ")
      .map((p) => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase())
      .join("");
  }

  return clean.trim();
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
