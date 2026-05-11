export const removeVietnameseTones = (str: string): string => {
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase();
};

export function capitalizeFirstLetter(str?: string): string {
  if (!str) return "";
  return str.charAt(0).toUpperCase() + str.slice(1);
}

export const normalizeClassName = (name?: string) => {
  if (!name) return "";

  if (/_/.test(name) && /[A-Z]/.test(name)) {
    return name.trim();
  }

  if (!/_/.test(name) && /[A-Z]/.test(name)) {
    return name.trim();
  }

  const clean = name.replace(/[_\-\s]+/g, " ");

  if (/^[a-z\s]+$/.test(clean)) {
    return clean
      .split(" ")
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
      .join("");
  }

  return clean.trim();
};
