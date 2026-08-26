import React from "react";
import ReactTestRenderer from "react-test-renderer";

import { useOpenAddRelatedForm } from "../src/components/assets/shared/useOpenAddRelatedForm";

jest.mock("@react-navigation/native", () => ({
  useNavigation: () => ({ navigate: jest.fn() }),
}));

jest.mock("../src/services", () => ({
  getClassReference: jest.fn(),
  getFieldActive: jest.fn(),
  getPropertyClass: jest.fn(),
}));

jest.mock("../src/hooks/usePermission", () => ({
  usePermission: () => ({ can: () => true, loaded: true }),
}));

jest.mock("../src/hooks/useSafeAlert", () => ({
  useSafeAlert: () => ({ isMounted: () => true, showAlertIfActive: jest.fn() }),
}));

const child = (name: string, moTa: string) =>
  ({ id: name, name, moTa, propertyReference: "iD_Cha", label: moTa }) as any;

type HookResult = ReturnType<typeof useOpenAddRelatedForm>;

const mountHook = () => {
  let latest: HookResult | undefined;

  function Harness() {
    latest = useOpenAddRelatedForm();
    return null;
  }

  ReactTestRenderer.act(() => {
    ReactTestRenderer.create(<Harness />);
  });

  return latest!;
};

// Danh mục con nào là "hành động chính" của bản ghi cha — quyết định nhãn và
// việc mà thanh hành động ở đáy màn chi tiết sẽ làm khi bấm.
describe("chọn danh mục con chính", () => {
  it("ưu tiên đúng bảng đánh giá của loại thiết bị", () => {
    const { pickPrimaryChildClass } = mountHook();

    const primary = pickPrimaryChildClass("BinhChuaChay", [
      child("BaoTri_BinhChuaChay", "Bảo trì"),
      child("DanhGia_BinhChuaChay", "Đánh giá bình chữa cháy"),
    ]);

    expect(primary?.name).toBe("DanhGia_BinhChuaChay");
  });

  // Bảng đánh giá do server đặt tên, tra theo bảng ghép chứ không nối chuỗi
  // "DanhGia_" — class không có trong bảng thì không có đánh giá để ưu tiên.
  it("không suy ra tên bảng đánh giá cho class ngoài bảng ghép", () => {
    const { pickPrimaryChildClass } = mountHook();

    const primary = pickPrimaryChildClass("MayMoc", [
      child("DanhGia_MayMoc", "Đánh giá máy móc"),
      child("BaoTri_MayMoc", "Bảo trì"),
    ]);

    expect(primary).toBeNull();
  });

  it("lấy danh mục duy nhất khi không có đánh giá", () => {
    const { pickPrimaryChildClass } = mountHook();

    const primary = pickPrimaryChildClass("MayMoc", [
      child("BaoTri_MayMoc", "Bảo trì"),
    ]);

    expect(primary?.name).toBe("BaoTri_MayMoc");
  });

  it("trả null khi chưa biết hoặc không có danh mục con", () => {
    const { pickPrimaryChildClass } = mountHook();

    expect(pickPrimaryChildClass("MayMoc", null)).toBeNull();
    expect(pickPrimaryChildClass("MayMoc", [])).toBeNull();
  });
});
