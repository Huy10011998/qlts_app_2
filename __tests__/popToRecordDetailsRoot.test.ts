import { popToRecordDetailsRoot } from "../src/navigation/shared/assetNavigationReset";

// Nút "bản ghi gốc" trên header danh sách con: pop được thì không tốn request
// nào, pop không được (stack đã bị reset sau khi lưu) thì nơi gọi phải nạp field
// rồi mở màn mới — nên cái quan trọng là hàm này trả về đúng true/false.
const makeNavigation = (
  routes: Array<{ key?: string; name: string; params?: Record<string, any> }>,
  index = routes.length - 1,
) => {
  const dispatched: any[] = [];

  return {
    dispatched,
    navigation: {
      dispatch: (action: any) => dispatched.push(action),
      getState: () => ({ index, routes }),
      reset: () => {},
    },
  };
};

const makeDetails = (key: string) => ({
  key,
  name: "AssetDetails",
  params: { id: "7", nameClass: "MayMoc" },
});

describe("pop về chi tiết bản ghi gốc", () => {
  it("pop đúng số bước khi chi tiết cha còn trong stack", () => {
    const { navigation, dispatched } = makeNavigation([
      { name: "Home" },
      { name: "AssetList", params: { nameClass: "MayMoc" } },
      makeDetails("details-1"),
      { name: "AssetRelatedList", params: { idRoot: "7" } },
    ]);

    expect(
      popToRecordDetailsRoot(navigation, { id: "7", nameClass: "MayMoc" }),
    ).toBe(true);
    expect(dispatched[dispatched.length - 1]).toMatchObject({
      payload: { count: 1 },
    });
  });

  // Màn cha đã mount nên đang đứng ở tab Chi tiết; phải ghi activeTab vào ĐÚNG
  // route đích (source = key của nó), không thì setParams áp vào màn sắp bị pop.
  it("ghi activeTab list vào route đích trước khi pop", () => {
    const { navigation, dispatched } = makeNavigation([
      { name: "Home" },
      makeDetails("details-1"),
      { name: "AssetRelatedList", params: { idRoot: "7" } },
    ]);

    popToRecordDetailsRoot(navigation, { id: "7", nameClass: "MayMoc" });

    expect(dispatched).toHaveLength(2);
    expect(dispatched[0]).toMatchObject({
      payload: { params: { activeTab: "list" } },
      source: "details-1",
    });
  });

  it("không pop khi stack đã bị reset, không còn chi tiết cha", () => {
    const { navigation, dispatched } = makeNavigation([
      { name: "Home" },
      { name: "Asset" },
      { name: "AssetRelatedList", params: { idRoot: "7" } },
    ]);

    expect(
      popToRecordDetailsRoot(navigation, { id: "7", nameClass: "MayMoc" }),
    ).toBe(false);
    expect(dispatched).toHaveLength(0);
  });

  // Vào từ quét QR thì màn cha là QrDetails, không phải AssetDetails — pop chứ
  // đừng để nơi gọi push thêm một màn chi tiết trùng bản ghi.
  it("pop về QrDetails khi vào từ luồng quét QR", () => {
    const { navigation, dispatched } = makeNavigation([
      { name: "Home" },
      { name: "QrScan" },
      { key: "qr-1", name: "QrDetails", params: { id: "7", nameClass: "MayMoc" } },
      { name: "AssetRelatedList", params: { idRoot: "7" } },
    ]);

    expect(
      popToRecordDetailsRoot(navigation, { id: "7", nameClass: "MayMoc" }),
    ).toBe(true);
    expect(dispatched[0]).toMatchObject({
      payload: { params: { activeTab: "list" } },
      source: "qr-1",
    });
    expect(dispatched[1]).toMatchObject({ payload: { count: 1 } });
  });

  it("không nhận nhầm chi tiết của bản ghi khác", () => {
    const { navigation } = makeNavigation([
      { name: "Home" },
      { name: "AssetDetails", params: { id: "9", nameClass: "MayMoc" } },
      { name: "AssetRelatedList", params: { idRoot: "7" } },
    ]);

    expect(
      popToRecordDetailsRoot(navigation, { id: "7", nameClass: "MayMoc" }),
    ).toBe(false);
  });

  // Màn danh sách con lồng nhau: chọn cái gần nhất, không nhảy quá xa về trước.
  it("chọn chi tiết cha gần nhất khi có nhiều lớp", () => {
    const { navigation, dispatched } = makeNavigation([
      { name: "Home" },
      makeDetails("details-1"),
      { name: "AssetRelatedList", params: { idRoot: "7" } },
      makeDetails("details-2"),
      { name: "AssetRelatedList", params: { idRoot: "7" } },
    ]);

    expect(
      popToRecordDetailsRoot(navigation, { id: "7", nameClass: "MayMoc" }),
    ).toBe(true);
    expect(dispatched[0]).toMatchObject({ source: "details-2" });
    expect(dispatched[1]).toMatchObject({ payload: { count: 1 } });
  });
});
