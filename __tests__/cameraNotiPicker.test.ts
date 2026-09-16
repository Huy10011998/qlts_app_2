import {
  locCamera,
  mapCameraRows,
  type CameraNotiChon,
} from "../src/screens/Settings/shared/useDanhSachCameraNoti";

/** Dòng thật của `get-vung-camera-steam`: vừa có dòng vùng, vừa có dòng camera. */
const ROWS = [
  {
    iD_VungCamera: 12,
    iD_VungCamera_MoTa: "BẢO VỆ - VÒNG NGOÀI",
    iD_Camera: 2568,
    iD_Camera_Ma: "CAM0492",
    iD_Camera_MoTa: "CAM 24-CLF24",
  },
  {
    iD_VungCamera: 12,
    iD_VungCamera_MoTa: "BẢO VỆ - VÒNG NGOÀI",
    iD_Camera: 2401,
    iD_Camera_Ma: "CAM0301",
    iD_Camera_MoTa: "Ao cá",
  },
  // Dòng chỉ mô tả vùng, không gắn camera.
  {
    iD_VungCamera: 13,
    iD_VungCamera_MoTa: "KỸ THUẬT",
    iD_Camera: null,
    iD_Camera_Ma: null,
    iD_Camera_MoTa: null,
  },
  // Cùng một camera xuất hiện lại ở vùng con.
  {
    iD_VungCamera: 14,
    iD_VungCamera_MoTa: "BẢO VỆ - CỔNG",
    iD_Camera: 2568,
    iD_Camera_Ma: "CAM0492",
    iD_Camera_MoTa: "CAM 24-CLF24",
  },
];

describe("mapCameraRows", () => {
  it("bỏ dòng không gắn camera và lọc trùng theo ID", () => {
    const cameras = mapCameraRows(ROWS);

    expect(cameras.map((camera) => camera.id)).toEqual([2401, 2568]);
  });

  it("sắp xếp theo tên tiếng Việt", () => {
    expect(mapCameraRows(ROWS)[0].ten).toBe("Ao cá");
  });

  it("dùng mã camera khi BE bỏ trống tên", () => {
    const cameras = mapCameraRows([
      { iD_Camera: 9, iD_Camera_Ma: "CAM0009", iD_Camera_MoTa: "" },
    ]);

    expect(cameras[0].ten).toBe("CAM0009");
  });

  it("trả mảng rỗng khi BE không trả mảng", () => {
    expect(mapCameraRows(null)).toEqual([]);
    expect(mapCameraRows({ data: [] })).toEqual([]);
  });
});

describe("locCamera", () => {
  const DANH_SACH: CameraNotiChon[] = mapCameraRows(ROWS);

  it("trả nguyên danh sách khi chưa gõ gì", () => {
    expect(locCamera(DANH_SACH, "   ")).toHaveLength(2);
  });

  it("tìm được khi gõ không dấu", () => {
    expect(locCamera(DANH_SACH, "ao ca")[0].id).toBe(2401);
  });

  it("tìm theo mã camera", () => {
    expect(locCamera(DANH_SACH, "CAM0492")[0].id).toBe(2568);
  });

  it("tìm theo tên vùng", () => {
    expect(locCamera(DANH_SACH, "bao ve")).toHaveLength(2);
  });
});
