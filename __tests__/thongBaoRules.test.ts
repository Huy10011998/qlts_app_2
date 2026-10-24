import {
  formatThongBaoTime,
  getNhomLabel,
  getThongBaoStyle,
  markThongBaoRead,
  prependThongBao,
  getThongBaoScreens,
  resolveThongBaoTarget,
} from "../src/screens/ThongBao/thongBaoRules";
import type { ThongBaoItem } from "../src/types/index";

// Luật thông báo chuông (8-Mobile-ThongBao mục 3–5).

describe("resolveThongBaoTarget", () => {
  it("CV_CongViec → chi tiết công việc, CV_KeHoach → chi tiết kế hoạch", () => {
    expect(resolveThongBaoTarget({ tenBang: "CV_CongViec", iD_DoiTuong: 16 })).toEqual({
      route: "CongViecChiTiet",
      params: { id: 16 },
    });
    expect(resolveThongBaoTarget({ tenBang: "CV_KeHoach", iD_DoiTuong: 3 })).toEqual({
      route: "KeHoachChiTiet",
      params: { id: 3 },
    });
  });

  it("bảng khác = phiếu: màn phiếu Name = tenBang", () => {
    expect(resolveThongBaoTarget({ tenBang: "Ticket_PhongBan", iD_DoiTuong: 86 })).toEqual({
      route: "FlowChiTiet",
      params: { nameClass: "Ticket_PhongBan", id: 86 },
    });
  });

  it("bình luận phiếu / công việc → chi tiết + chồng màn Bình luận", () => {
    expect(
      resolveThongBaoTarget({ tenBang: "Ticket_PhongBan", iD_DoiTuong: 5, loai: "BinhLuan" }),
    ).toEqual({
      route: "FlowChiTiet",
      params: { nameClass: "Ticket_PhongBan", id: 5 },
      binhLuan: { apiBase: "Ticket_PhongBan", idHoSo: 5, canSend: true },
    });
    // Công việc: quyền gửi để màn bình luận tự hỏi cv-thong-tin.
    expect(
      resolveThongBaoTarget({ tenBang: "CV_CongViec", iD_DoiTuong: 8, loai: "BinhLuan" }),
    ).toEqual({
      route: "CongViecChiTiet",
      params: { id: 8 },
      binhLuan: { apiBase: "CV_CongViec", idHoSo: 8 },
    });
    expect(
      resolveThongBaoTarget({ tenBang: "CV_CongViec", iD_DoiTuong: 8, loai: "QuaHan" })?.binhLuan,
    ).toBeUndefined();
  });

  it("dãy màn chồng khi bấm: chi tiết, rồi Bình luận nếu có", () => {
    const binhLuan = resolveThongBaoTarget({ tenBang: "CV_CongViec", iD_DoiTuong: 8, loai: "BinhLuan" })!;
    expect(getThongBaoScreens(binhLuan)).toEqual([
      { route: "CongViecChiTiet", params: { id: 8 } },
      { route: "WorkflowBinhLuan", params: { apiBase: "CV_CongViec", idHoSo: 8 } },
    ]);
    const giao = resolveThongBaoTarget({ tenBang: "CV_CongViec", iD_DoiTuong: 8, loai: "Giao" })!;
    expect(getThongBaoScreens(giao)).toEqual([{ route: "CongViecChiTiet", params: { id: 8 } }]);
  });

  it("thiếu tenBang / id → không mở gì", () => {
    expect(resolveThongBaoTarget({ tenBang: null, iD_DoiTuong: 1 })).toBeNull();
    expect(resolveThongBaoTarget({ tenBang: "CV_CongViec", iD_DoiTuong: null })).toBeNull();
  });
});

describe("getThongBaoStyle / getNhomLabel", () => {
  it("icon + màu theo nhom/loai như web; loại lạ có mặc định", () => {
    expect(getThongBaoStyle({ nhom: "Flow", loai: "ChoDuyet" })).toEqual({
      icon: "how-to-reg",
      color: "#e65100",
    });
    expect(getThongBaoStyle({ nhom: "CongViec", loai: "QuaHan" }).color).toBe("#c62828");
    expect(getThongBaoStyle({ nhom: "KeHoach", loai: "Moi" }).icon).toBe("notifications-none");
  });

  it("nhãn nhóm", () => {
    expect(getNhomLabel("Flow")).toBe("Phiếu");
    expect(getNhomLabel("CongViec")).toBe("Công việc");
    expect(getNhomLabel("KeHoach")).toBe("Kế hoạch");
  });
});

describe("formatThongBaoTime", () => {
  const now = new Date(2026, 9, 14, 15, 0, 0);

  it("trong ngày: vừa xong / phút / giờ trước", () => {
    expect(formatThongBaoTime("2026-10-14T14:59:40", now)).toBe("Vừa xong");
    // Giờ máy chậm hơn server.
    expect(formatThongBaoTime("2026-10-14T15:00:20", now)).toBe("Vừa xong");
    expect(formatThongBaoTime("2026-10-14T14:55:00", now)).toBe("5 phút trước");
    expect(formatThongBaoTime("2026-10-14T11:30:00.513", now)).toBe("3 giờ trước");
  });

  it("hôm qua / ngày khác", () => {
    expect(formatThongBaoTime("2026-10-13T08:30:00", now)).toBe("Hôm qua 08:30");
    expect(formatThongBaoTime("2026-10-12T08:30:00", now)).toBe("12/10/2026 08:30");
    expect(formatThongBaoTime(null, now)).toBe("");
  });
});

describe("prependThongBao", () => {
  const a = { id: 1, nhom: "Flow", loai: "ChoDuyet" } as ThongBaoItem;
  const b = { id: 2, nhom: "CongViec", loai: "Giao" } as ThongBaoItem;

  it("thêm lên đầu, bỏ nếu đã có id", () => {
    expect(prependThongBao([a], b)).toEqual([b, a]);
    const list = [b, a];
    expect(prependThongBao(list, { ...b })).toBe(list);
  });
});

describe("markThongBaoRead", () => {
  const a = { id: 1, nhom: "Flow", loai: "ChoDuyet", daDoc: false } as ThongBaoItem;
  const b = { id: 2, nhom: "CongViec", loai: "Giao", daDoc: false } as ThongBaoItem;

  it("đổi đúng dòng vừa đọc / mọi dòng", () => {
    expect(markThongBaoRead([a, b], [2]).map((item) => item.daDoc)).toEqual([false, true]);
    expect(markThongBaoRead([a, b], "all").every((item) => item.daDoc)).toBe(true);
  });
});
