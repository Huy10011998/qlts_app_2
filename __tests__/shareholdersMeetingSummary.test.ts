import {
  formatShares,
  getAttendanceSummary,
  getOpinionDisplayTitle,
  getScanConfirmMessage,
  getScanSuccessMessage,
  getShareholderInitial,
  isOrganizationShareholder,
} from "../src/screens/ShareholdersMeeting/shared/shareholdersMeetingHelpers";
import type { Shareholder } from "../src/types/index";

const shareholder = (
  id: string,
  shares: number,
  status: Shareholder["status"],
): Shareholder => ({ id, name: id, shareholderId: id, shares, status });

describe("tổng quan điểm danh đại hội cổ đông", () => {
  it("đủ điều kiện khi cổ phần có mặt TRÊN 50%, không theo số người", () => {
    const summary = getAttendanceSummary([
      shareholder("lon", 600, "present"),
      shareholder("a", 100, "pending"),
      shareholder("b", 100, "pending"),
      shareholder("c", 100, "pending"),
      shareholder("d", 100, "pending"),
    ]);

    expect(summary).toMatchObject({
      presentCount: 1,
      pendingCount: 4,
      presentShares: 600,
      totalShares: 1000,
      sharePercent: 60,
      hasQuorum: true,
    });
  });

  it("đúng 50% là chưa đủ", () => {
    const summary = getAttendanceSummary([
      shareholder("a", 500, "present"),
      shareholder("b", 500, "pending"),
    ]);

    expect(summary.sharePercent).toBe(50);
    expect(summary.hasQuorum).toBe(false);
  });

  it("danh sách rỗng hoặc thiếu số cổ phần thì 0%, không đủ điều kiện", () => {
    expect(getAttendanceSummary([])).toMatchObject({
      sharePercent: 0,
      hasQuorum: false,
    });
    expect(
      getAttendanceSummary([shareholder("a", Number.NaN, "present")]),
    ).toMatchObject({ presentCount: 1, totalShares: 0, hasQuorum: false });
  });
});

describe("hiển thị dòng cổ đông", () => {
  it("số cổ phần có dấu chấm phân cách nghìn", () => {
    expect(formatShares(34)).toBe("34");
    expect(formatShares(1000)).toBe("1.000");
    expect(formatShares(2430000)).toBe("2.430.000");
  });

  it("chữ đại diện là chữ đầu của tên, không phải của họ", () => {
    expect(getShareholderInitial("Trần Thị Bích Ngọc")).toBe("N");
    expect(getShareholderInitial("  BÙI DUY HIỆP ")).toBe("H");
  });

  it("nhận ra cổ đông là tổ chức", () => {
    expect(isOrganizationShareholder("CÔNG TY CP ĐẦU TƯ PHÚ THỊNH")).toBe(true);
    expect(isOrganizationShareholder("Tổng Công ty Thương mại")).toBe(true);
    expect(isOrganizationShareholder("Ngân hàng TMCP Á Châu")).toBe(true);
    expect(isOrganizationShareholder("Công Văn Tuấn")).toBe(false);
  });
});

describe("hộp thoại màn quét đại hội cổ đông", () => {
  const tuan = {
    name: "Bùi Anh Tuấn",
    shareholderId: "CMF 002",
    shares: 2430000,
  };

  it("xác nhận điểm danh ghi đủ tên, mã, số cổ phần", () => {
    expect(
      getScanConfirmMessage({ scanMode: "attendance", shareholder: tuan }),
    ).toBe("Cổ đông: Bùi Anh Tuấn\nMã: CMF 002 · 2.430.000 cổ phần");
  });

  it("xác nhận lấy ý kiến thêm nội dung và phân loại viết hoa", () => {
    expect(
      getScanConfirmMessage({
        scanMode: "voting",
        shareholder: tuan,
        opinionTitle: getOpinionDisplayTitle({
          code: "NQ.03",
          title: "Tăng cổ tức",
        }),
        choice: "disagree",
      }),
    ).toBe(
      "Cổ đông: Bùi Anh Tuấn\nMã: CMF 002 · 2.430.000 cổ phần\nNội dung: NQ.03 - Tăng cổ tức\nPhân loại: KHÔNG TÁN THÀNH",
    );
  });

  it("báo thành công có tên cổ đông", () => {
    expect(
      getScanSuccessMessage({ scanMode: "attendance", shareholder: tuan }),
    ).toBe("Đã điểm danh Bùi Anh Tuấn (CMF 002).");
    expect(
      getScanSuccessMessage({
        scanMode: "voting",
        shareholder: tuan,
        opinionTitle: "Tăng cổ tức",
        choice: "agree",
      }),
    ).toBe(
      "Đã ghi TÁN THÀNH cho Bùi Anh Tuấn (CMF 002).\nNội dung: Tăng cổ tức",
    );
  });

  it("nội dung không có mã thì chỉ hiện tên", () => {
    expect(getOpinionDisplayTitle({ code: "", title: "Tăng cổ tức" })).toBe(
      "Tăng cổ tức",
    );
  });
});
