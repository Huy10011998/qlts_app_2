import {
  formatThongBaoTime,
  getThongBaoLoai,
  resolveThongBaoTarget,
} from "../src/screens/Workflow/ThongBao/thongBaoRules";

// Luật bấm thông báo của mục 10 (4-Mobile-CongViec).

describe("resolveThongBaoTarget", () => {
  it("loại Flow, đúng 1 phiếu chờ → mở thẳng phiếu", () => {
    expect(
      resolveThongBaoTarget({ loai: "Flow", tenBang: "Ticket_PhongBan", iD_HoSo: 21, iD_CongViec: null }),
    ).toEqual({ route: "FlowChiTiet", params: { nameClass: "Ticket_PhongBan", id: 21 } });
  });

  it("loại Flow, nhiều phiếu (iD_HoSo null) → màn phiếu của bảng đó ở tab Chờ duyệt", () => {
    expect(resolveThongBaoTarget({ loai: "Flow", tenBang: "Ticket_PhongBan", iD_HoSo: null })).toEqual({
      route: "Flow",
      params: { nameClass: "Ticket_PhongBan", tab: "ChoDuyet" },
    });
  });

  it("có iD_CongViec → chi tiết công việc; không có gì để mở → null", () => {
    expect(resolveThongBaoTarget({ loai: "QuaHan", iD_CongViec: 5 })).toEqual({
      route: "CongViecChiTiet",
      params: { id: 5 },
    });
    expect(resolveThongBaoTarget({ loai: "Giao" })).toBeNull();
    expect(resolveThongBaoTarget({ loai: "Flow", tenBang: null })).toBeNull();
  });
});

describe("hiển thị thông báo", () => {
  it("nhãn theo loại, loại lạ vẫn có nhãn chung", () => {
    expect(getThongBaoLoai("SapHan").label).toBe("Sắp đến hạn");
    expect(getThongBaoLoai("Khac").label).toBe("Thông báo");
  });

  it("thời gian: Hôm nay / Hôm qua / ngày đầy đủ", () => {
    const now = new Date(2026, 9, 10, 15, 0);
    expect(formatThongBaoTime("2026-10-10T08:30:00", now)).toBe("Hôm nay 08:30");
    expect(formatThongBaoTime("2026-10-09T17:05:00", now)).toBe("Hôm qua 17:05");
    expect(formatThongBaoTime("2026-10-01T09:00:00", now)).toBe("01/10/2026 09:00");
    expect(formatThongBaoTime(null, now)).toBe("");
  });
});
