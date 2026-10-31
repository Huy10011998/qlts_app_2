import { getCameraZoneHeaderLabel } from "../src/components/camera/shared/cameraZoneHeaderLabel";

describe("dòng phụ header màn Danh sách / Lưới camera", () => {
  it("ghi tên khu vực kèm số camera", () => {
    expect(getCameraZoneHeaderLabel("Vĩnh Lộc", 265)).toBe(
      "Vĩnh Lộc · 265 camera",
    );
    expect(getCameraZoneHeaderLabel("  Kho 631 ", 0)).toBe("Kho 631 · 0 camera");
  });

  it("mở từ thông báo (không có khu vực) thì để header ghi nhãn mặc định", () => {
    expect(getCameraZoneHeaderLabel(undefined, 1)).toBeUndefined();
    expect(getCameraZoneHeaderLabel("  ", 1)).toBeUndefined();
  });
});
