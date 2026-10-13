import {
  formatViecTime,
  getViecLoai,
  resolveViecTarget,
} from "../src/screens/Workflow/ViecCanXuLy/viecCanXuLyRules";

// Luật bấm một dòng việc cần xử lý (cv-thong-bao) của mục 10 (4-Mobile-CongViec).

describe("resolveViecTarget", () => {
  it("loại Flow, đúng 1 phiếu chờ → mở thẳng phiếu", () => {
    expect(
      resolveViecTarget({ loai: "Flow", tenBang: "Ticket_PhongBan", iD_HoSo: 21, iD_CongViec: null }),
    ).toEqual({ route: "FlowChiTiet", params: { nameClass: "Ticket_PhongBan", id: 21 } });
  });

  it("loại Flow, nhiều phiếu (iD_HoSo null) → màn phiếu của bảng đó ở tab Chờ duyệt", () => {
    expect(resolveViecTarget({ loai: "Flow", tenBang: "Ticket_PhongBan", iD_HoSo: null })).toEqual({
      route: "Flow",
      params: { nameClass: "Ticket_PhongBan", tab: "ChoDuyet" },
    });
  });

  it("có iD_CongViec → chi tiết công việc; không có gì để mở → null", () => {
    expect(resolveViecTarget({ loai: "QuaHan", iD_CongViec: 5 })).toEqual({
      route: "CongViecChiTiet",
      params: { id: 5 },
    });
    expect(resolveViecTarget({ loai: "Giao" })).toBeNull();
    expect(resolveViecTarget({ loai: "Flow", tenBang: null })).toBeNull();
  });
});

describe("hiển thị việc cần xử lý", () => {
  it("nhãn theo loại, loại lạ vẫn có nhãn chung", () => {
    expect(getViecLoai("SapHan").label).toBe("Sắp đến hạn");
    expect(getViecLoai("Khac").label).toBe("Khác");
  });

  it("thời gian: Hôm nay / Hôm qua / ngày đầy đủ", () => {
    const now = new Date(2026, 9, 10, 15, 0);
    expect(formatViecTime("2026-10-10T08:30:00", now)).toBe("Hôm nay 08:30");
    expect(formatViecTime("2026-10-09T17:05:00", now)).toBe("Hôm qua 17:05");
    expect(formatViecTime("2026-10-01T09:00:00", now)).toBe("01/10/2026 09:00");
    expect(formatViecTime(null, now)).toBe("");
  });
});
