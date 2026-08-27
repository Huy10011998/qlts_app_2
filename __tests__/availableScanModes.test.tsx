import React from "react";
import ReactTestRenderer from "react-test-renderer";

import { useAvailableScanModes } from "../src/components/qrcode/shared/useAvailableScanModes";

let mockPermissions: string[] = [];

jest.mock("../src/hooks/usePermission", () => ({
  usePermission: () => ({
    can: (nameClass: string, action: string) =>
      mockPermissions.includes(`${nameClass}.${action}`),
    loaded: true,
  }),
}));

const mountHook = () => {
  let latest: ReturnType<typeof useAvailableScanModes> | undefined;

  function Harness() {
    latest = useAvailableScanModes();
    return null;
  }

  ReactTestRenderer.act(() => {
    ReactTestRenderer.create(<Harness />);
  });

  return latest!;
};

const kindsOf = () => mountHook().map((info) => info.kind);

beforeEach(() => {
  mockPermissions = [];
});

/**
 * Chọn một chế độ = "quét xong tạo luôn một bản ghi", nên cửa ở đây là `Insert`.
 * Người chỉ được xem lịch sử tủ lạnh mà vẫn thấy "Trung chuyển tủ lạnh" thì chọn
 * vào chỉ để nhận thông báo từ chối ở mọi lần quét.
 */
describe("chế độ quét chọn được theo quyền", () => {
  it("không có quyền thêm thì không có chế độ tủ lạnh nào", () => {
    mockPermissions = [
      "XacNhanViTri_TuLanh.Read",
      "TrungChuyen_TuLanh.Read",
    ];

    expect(kindsOf()).toEqual(["danhGia"]);
  });

  it("mỗi nghiệp vụ tủ lạnh mở theo đúng quyền của nó", () => {
    mockPermissions = ["TrungChuyen_TuLanh.Insert"];

    expect(kindsOf()).toEqual(["danhGia", "trungChuyenTuLanh"]);
  });

  it("đủ quyền thì có hết", () => {
    mockPermissions = [
      "XacNhanViTri_TuLanh.Insert",
      "TrungChuyen_TuLanh.Insert",
    ];

    expect(kindsOf()).toEqual([
      "danhGia",
      "xacNhanViTriTuLanh",
      "trungChuyenTuLanh",
    ]);
  });

  // Quyền của bảng con nằm trên class con của bản ghi — chưa quét thì chưa biết
  // mã sắp tới thuộc class nào, nên không lọc trước được. Màn quét nói rõ lý do
  // sau khi quét.
  it("loại đến từ bảng con luôn chọn được, lọc sau khi quét", () => {
    expect(kindsOf()).toContain("danhGia");
  });
});
