import {
  getDetailIdFromItemData,
  getQrScanFailureAlert,
  isEmptyQrItemData,
  parseAssetQr,
} from "../src/screens/QrScanner/qrScanHelpers";

describe("parseAssetQr", () => {
  it("đọc tem nội bộ dạng class/id", () => {
    expect(parseAssetQr("Asset_PC/15")).toEqual({
      nameClass: "Asset_PC",
      idOrQr: "15",
      isExternalQrUrl: false,
    });
    expect(parseAssetQr("  /Asset_PC/15  ")).toMatchObject({
      nameClass: "Asset_PC",
      idOrQr: "15",
    });
  });

  it("đọc tem in từ web và đổi đường MayMoc sang NoiDia_TuLanh", () => {
    expect(
      parseAssetQr("https://os.cholimexfood.com.vn/taisan/MayMoc/ABC123"),
    ).toEqual({
      nameClass: "NoiDia_TuLanh",
      idOrQr: "ABC123",
      isExternalQrUrl: true,
    });
  });

  it("trả null cho mã không phải tem tài sản", () => {
    expect(parseAssetQr("")).toBeNull();
    expect(parseAssetQr("xin chao")).toBeNull();
    expect(parseAssetQr("Asset_PC/15/extra")).toBeNull();
    // Link web bất kỳ tách ra cũng đúng hai đoạn — không được coi là tem.
    expect(parseAssetQr("https://google.com")).toBeNull();
    expect(parseAssetQr("www.google.com/abc")).toBeNull();
  });
});

describe("isEmptyQrItemData", () => {
  it("coi null và object rỗng là không còn bản ghi", () => {
    expect(isEmptyQrItemData(null)).toBe(true);
    expect(isEmptyQrItemData({})).toBe(true);
    expect(isEmptyQrItemData({ id: 1 })).toBe(false);
    expect(isEmptyQrItemData([{ id: 1 }])).toBe(false);
  });
});

describe("getDetailIdFromItemData", () => {
  it("lấy id từ dữ liệu trả về, thiếu thì dùng mã đã quét", () => {
    expect(getDetailIdFromItemData({ ID: 42 }, "QR1")).toBe("42");
    expect(getDetailIdFromItemData([{ id: 7 }], "QR1")).toBe("7");
    expect(getDetailIdFromItemData({ id: " " }, "QR1")).toBe("QR1");
  });
});

describe("getQrScanFailureAlert", () => {
  it("tách câu báo theo từng kiểu lỗi", () => {
    expect(getQrScanFailureAlert("notAssetTag").title).toBe(
      "Mã này không phải tem tài sản",
    );
    expect(getQrScanFailureAlert("notFound").title).toBe(
      "Không tìm thấy tài sản (có thể đã bị xoá)",
    );
    expect(getQrScanFailureAlert("network").title).toBe("Lỗi kết nối");
  });
});
