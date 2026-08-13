import {
  displayValue,
  EMPTY_VALUE,
  formatKhoangCach,
  formatNoiDiaDateTime,
  isKhoangCachXa,
  toThumbnailPath,
} from "../src/screens/NoiDia/shared/noiDiaFormat";
import {
  parseFridgeQr,
  toFridgeSummary,
} from "../src/screens/NoiDia/shared/fridgeLookup";
import { withIdAliases } from "../src/services/data/noiDiaApi";

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

describe("withIdAliases", () => {
  it("thêm bí danh id_ cho key iD_ mà BE trả về", () => {
    const row = withIdAliases({
      iD_NoiDia_KhachHang_MoTa: "5 Thu",
      iD_NoiDia_KhachHang_Moi_MoTa: "Kim Ngân",
      iD_NoiDia_TuLanh: 4,
    } as any);

    expect(row.id_NoiDia_KhachHang_MoTa).toBe("5 Thu");
    expect(row.id_NoiDia_KhachHang_Moi_MoTa).toBe("Kim Ngân");
    expect(row.id_NoiDia_TuLanh).toBe(4);
  });

  it("giữ nguyên key gốc, để BE sửa lại đúng cũng không hỏng", () => {
    const row = withIdAliases({ iD_NoiDia_Mien_MoTa: "Hồ Chí Minh" } as any);

    expect(row.iD_NoiDia_Mien_MoTa).toBe("Hồ Chí Minh");
  });

  it("không ghi đè khi BE đã trả sẵn key đúng", () => {
    const row = withIdAliases({
      iD_NoiDia_Mien_MoTa: "cũ",
      id_NoiDia_Mien_MoTa: "đúng",
    } as any);

    expect(row.id_NoiDia_Mien_MoTa).toBe("đúng");
  });

  it("không đụng tới các key khác", () => {
    const row = withIdAliases({
      serialNumber: "E88101A2G000083",
      log_ID_User_MoTa: "Nguyễn Minh Khoa",
      iDs: [],
    } as any);

    expect(row.serialNumber).toBe("E88101A2G000083");
    expect(row.log_ID_User_MoTa).toBe("Nguyễn Minh Khoa");
    expect(Object.keys(row)).not.toContain("ids");
  });
});

describe("formatKhoangCach", () => {
  it("dưới 1 km thì hiện số mét đã làm tròn", () => {
    expect(formatKhoangCach(0)).toBe("0 m");
    expect(formatKhoangCach(123.6)).toBe("124 m");
    expect(formatKhoangCach(999)).toBe("999 m");
  });

  it("từ 1 km trở lên thì đổi sang km, một chữ số thập phân", () => {
    expect(formatKhoangCach(1000)).toBe("1,0 km");
    expect(formatKhoangCach(1234)).toBe("1,2 km");
  });

  it("trả null khi server không tính được, để màn gọi ẩn dòng đi", () => {
    expect(formatKhoangCach(null)).toBeNull();
    expect(formatKhoangCach(undefined)).toBeNull();
  });

  it("0 mét là giá trị thật, không phải thiếu dữ liệu", () => {
    expect(formatKhoangCach(0)).not.toBeNull();
  });
});

describe("isKhoangCachXa", () => {
  it("chỉ cảnh báo khi vượt hẳn mốc 100 m", () => {
    expect(isKhoangCachXa(100)).toBe(false);
    expect(isKhoangCachXa(101)).toBe(true);
  });

  it("không cảnh báo khi ở gần", () => {
    expect(isKhoangCachXa(0)).toBe(false);
    expect(isKhoangCachXa(99.4)).toBe(false);
  });

  it("thiếu dữ liệu thì không cảnh báo, tránh báo động giả", () => {
    expect(isKhoangCachXa(null)).toBe(false);
    expect(isKhoangCachXa(undefined)).toBe(false);
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
        iD_NoiDia_KhachHang: 14127,
        id_NoiDia_KhachHang_MoTa: "SÁU SÁNH",
      }),
    ).toMatchObject({
      id: 3158,
      label: "TL0001 - TỦ ĐÔNG SANAKY 280L",
      serialNumber: "31582SO26070000670",
      khachHang: "SÁU SÁNH",
      idKhachHang: 14127,
    });
  });

  it("đọc trạng thái sử dụng hiện tại để làm mặc định cho combobox xác nhận", () => {
    expect(
      toFridgeSummary({
        id: 3158,
        ma: "TL0001",
        iD_TrangThaiSuDung: 3,
        id_TrangThaiSuDung_MoTa: "Đang sử dụng",
      }),
    ).toMatchObject({ idTrangThaiSuDung: 3, trangThaiSuDung: "Đang sử dụng" });
  });

  it("thiếu trạng thái sử dụng thì trả 0 để màn gọi bỏ trống, server tự lấy", () => {
    const fridge = toFridgeSummary({ id: 7, ma: "A" });

    expect(fridge?.idTrangThaiSuDung).toBe(0);
    expect(fridge?.trangThaiSuDung).toBe("");
  });

  it("không đọc được id khách hàng thì trả 0 để phía gọi ẩn thao tác toạ độ", () => {
    expect(toFridgeSummary({ id: 7, ma: "A" })?.idKhachHang).toBe(0);
  });

  it("nhận cả mảng một phần tử như get-details trả về", () => {
    expect(toFridgeSummary([{ id: 7, ma: "A", ten: "B" }])?.id).toBe(7);
  });

  it("trả null khi thiếu id hợp lệ", () => {
    expect(toFridgeSummary({ ma: "A" })).toBeNull();
    expect(toFridgeSummary(null)).toBeNull();
  });
});
