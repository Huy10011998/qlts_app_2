import { backToQrScanner } from "../src/navigation/shared/assetNavigationReset";

// Lưu xong ở luồng đánh giá nhanh thì phải về đúng máy quét — mà máy quét nằm ở
// hai chỗ khác nhau tuỳ nơi mở, nên cái quan trọng là chọn đúng đường: pop trong
// stack gốc, hay một lệnh navigate lồng qua tab.
const makeNavigation = (
  routes: Array<{ key?: string; name: string; params?: Record<string, any> }>,
  index = routes.length - 1,
) => {
  const dispatched: any[] = [];
  const navigated: any[] = [];

  return {
    dispatched,
    navigated,
    navigation: {
      dispatch: (action: any) => dispatched.push(action),
      getState: () => ({ index, routes }),
      navigate: (...args: any[]) => navigated.push(args),
      reset: () => {},
    },
  };
};

describe("về máy quét sau khi lưu", () => {
  // Mở máy quét từ nút quét trên header màn danh sách: `QrScan` nằm ngay trong
  // stack gốc, pop là đủ và không đổi tab đang đứng.
  it("pop về QrScan khi máy quét nằm trong stack gốc", () => {
    const { navigation, dispatched, navigated } = makeNavigation([
      { name: "Home" },
      { name: "AssetList", params: { nameClass: "BinhChuaChay" } },
      { name: "QrScan" },
      { name: "QrDetails", params: { id: "7" } },
      { name: "AssetAddRelatedItem", params: { nameClass: "DanhGia_BinhChuaChay" } },
    ]);

    expect(backToQrScanner(navigation)).toBe(true);
    expect(dispatched[dispatched.length - 1]).toMatchObject({
      payload: { count: 2 },
    });
    expect(navigated).toHaveLength(0);
  });

  // Mở từ tab Quét: màn quét là route "Scan" trong ScanTab, không có tên nào
  // trong stack gốc khớp — một navigate lồng vừa pop `AssetAddRelatedItem` khỏi
  // stack gốc, vừa đẩy stack của ScanTab về lại màn quét.
  it("navigate lồng về ScanTab/Scan khi máy quét nằm trong tab", () => {
    const { navigation, dispatched, navigated } = makeNavigation([
      { name: "Tabs" },
      { name: "AssetAddRelatedItem", params: { nameClass: "DanhGia_BinhChuaChay" } },
    ]);

    expect(backToQrScanner(navigation)).toBe(false);
    expect(dispatched).toHaveLength(0);
    expect(navigated).toEqual([
      ["Tabs", { screen: "ScanTab", params: { screen: "Scan" } }],
    ]);
  });

  // Quét từ tab rồi mới mở màn chi tiết: `QrDetails` nằm trong stack của ScanTab
  // chứ không phải stack gốc, nên vẫn phải đi đường navigate lồng.
  it("không nhận QrDetails làm máy quét", () => {
    const { navigation, navigated } = makeNavigation([
      { name: "Tabs" },
      { name: "QrDetails", params: { id: "7" } },
      { name: "AssetAddRelatedItem", params: {} },
    ]);

    expect(backToQrScanner(navigation)).toBe(false);
    expect(navigated).toHaveLength(1);
  });
});
