/**
 * Dòng phụ dưới tiêu đề header của màn Danh sách / Lưới camera: "Vĩnh Lộc · 265
 * camera". Header tự viết hoa. Mở từ thông báo camera (không có khu vực) thì
 * trả `undefined` để header giữ nhãn mặc định.
 */
export const getCameraZoneHeaderLabel = (
  zoneName: string | null | undefined,
  cameraCount: number,
) => {
  const name = zoneName?.trim();
  return name ? `${name} · ${cameraCount} camera` : undefined;
};
