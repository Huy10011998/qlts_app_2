import {
  displayValue,
  EMPTY_VALUE,
  formatNoiDiaDateTime,
  toThumbnailPath,
} from "../src/screens/NoiDia/shared/noiDiaFormat";
import {
  parseFridgeQr,
  toFridgeSummary,
} from "../src/screens/NoiDia/shared/fridgeLookup";

describe("toThumbnailPath", () => {
  it("thêm _resize vào tên folder cuối và tên file, giữ nguyên dấu phân cách", () => {
    expect(toThumbnailPath("NoiDia_TuLanh\\3158\\6f1c.jpg")).toBe(
      "NoiDia_TuLanh\\3158_resize\\6f1c_resize.jpg",
    );
  });

  it("chỉ đổi folder cuối khi đường dẫn nhiều cấp", () => {
    expect(toThumbnailPath("a\\b\\c\\file.png")).toBe(
      "a\\b\\c_resize\\file_resize.png",
    );
  });

  it("trả chuỗi rỗng khi không có đường dẫn", () => {
    expect(toThumbnailPath(null)).toBe("");
  });
});

describe("displayValue", () => {
  it("quy null, rỗng và '--' của BE về cùng một dấu gạch", () => {
    expect(displayValue(null)).toBe(EMPTY_VALUE);
    expect(displayValue("  ")).toBe(EMPTY_VALUE);
    expect(displayValue("--")).toBe(EMPTY_VALUE);
    expect(displayValue("Miền Tây")).toBe("Miền Tây");
  });
});

describe("formatNoiDiaDateTime", () => {
  it("hiện ngày giờ theo dd/MM/yyyy HH:mm", () => {
    expect(formatNoiDiaDateTime("2026-08-06T14:35:00")).toBe(
      "06/08/2026 14:35",
    );
  });

  it("trả dấu gạch khi ngày không hợp lệ", () => {
    expect(formatNoiDiaDateTime("khong-phai-ngay")).toBe(EMPTY_VALUE);
  });
});

describe("parseFridgeQr", () => {
  it("nhận QR in dưới nhánh MayMoc và coi là tủ lạnh", () => {
    expect(
      parseFridgeQr("https://os.cholimexfood.com.vn/taisan/MayMoc/ABC123"),
    ).toEqual({ value: "ABC123", isQrValue: true });
  });

  it("nhận cả nhánh NoiDia_TuLanh", () => {
    expect(
      parseFridgeQr(
        "https://os.cholimexfood.com.vn/taisan/NoiDia_TuLanh/ABC123",
      ),
    ).toEqual({ value: "ABC123", isQrValue: true });
  });

  it("từ chối QR của class khác", () => {
    expect(
      parseFridgeQr("https://os.cholimexfood.com.vn/taisan/PhuongTien/9"),
    ).toBeNull();
  });

  it("từ chối chuỗi không đúng dạng {class}/{id}", () => {
    expect(parseFridgeQr("linh tinh")).toBeNull();
    expect(parseFridgeQr("")).toBeNull();
  });
});

describe("toFridgeSummary", () => {
  it("dựng nhãn 'Mã - Tên' và đủ 5 cấp vị trí", () => {
    expect(
      toFridgeSummary({
        id: 3158,
        ma: "TL0001",
        ten: "TỦ ĐÔNG SANAKY 280L",
        serialNumber: "31582SO26070000670",
        id_NoiDia_Mien_MoTa: "Miền Tây",
        id_NoiDia_VungMien_MoTa: "Miền Tây 1",
        id_NoiDia_KhuVuc_MoTa: "Bến Lức",
        id_NoiDia_NhaPhanPhoi_MoTa: "NPP Minh Thiên A",
        id_NoiDia_KhachHang_MoTa: "SÁU SÁNH",
      }),
    ).toMatchObject({
      id: 3158,
      label: "TL0001 - TỦ ĐÔNG SANAKY 280L",
      serialNumber: "31582SO26070000670",
      khachHang: "SÁU SÁNH",
    });
  });

  it("nhận cả mảng một phần tử như get-details trả về", () => {
    expect(toFridgeSummary([{ id: 7, ma: "A", ten: "B" }])?.id).toBe(7);
  });

  it("trả null khi thiếu id hợp lệ", () => {
    expect(toFridgeSummary({ ma: "A" })).toBeNull();
    expect(toFridgeSummary(null)).toBeNull();
  });
});
