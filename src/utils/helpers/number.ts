export const formatVND = (value: string | number) => {
  if (value === null || value === undefined || value === "") return "";

  const num = Number(String(value).replace(/\D/g, ""));
  if (Number.isNaN(num)) return "";

  return num.toLocaleString("vi-VN");
};

export const unFormatVND = (value: string) => value.replace(/\./g, "");
