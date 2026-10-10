import {
  buildDynamicPayload,
  formatWorkflowValue,
  getCardFields,
  getDetailFields,
  getFormFields,
  normalizeWorkflowFields,
} from "../src/screens/Workflow/shared/workflowFields";
import { TypeProperty } from "../src/utils/Enum";

// Metadata thật trả `stT_Grid` (.NET đổi STT_Grid), tài liệu ghi `stt_Grid`.
// Bộ dựng của view Workflow phải sắp / lọc theo đúng luật web mà bộ dựng màn
// Tài sản chưa làm: stt_Grid cho thẻ, stt cho form / chi tiết, isShowDetail.

const RAW = [
  { name: "SoTicket", moTa: "Số", typeProperty: 0, stt: 1, stT_Grid: 2, isShowMobile: true, isReadOnly: true },
  { name: "TinhTrang", moTa: "Tình trạng", typeProperty: 10, stt: 2, stt_Grid: 1, isShowMobile: 1, isReadOnly: true },
  { name: "ID_LoaiFlow", moTa: "Loại", typeProperty: 6, stt: 3, isShowMobile: "1", isRequired: true, isShowDetail: null },
  { name: "TieuDe", moTa: "Tiêu đề", typeProperty: 0, stt: 4, stT_Grid: null, isShowMobile: true, isShowDetail: true },
  { name: "MoTa", moTa: "Mô tả", typeProperty: 1, stt: 5, isShowMobile: false, isShowDetail: false },
  { name: "Cu", moTa: "Cũ", typeProperty: 0, stt: 6, isActive: false },
];

describe("normalizeWorkflowFields", () => {
  it("đọc cả stT_Grid lẫn stt_Grid, ép cờ về boolean, bỏ field IsActive = 0", () => {
    const fields = normalizeWorkflowFields(RAW);
    expect(fields.map((f) => f.name)).toEqual(["SoTicket", "TinhTrang", "ID_LoaiFlow", "TieuDe", "MoTa"]);
    expect(fields[0].stT_Grid).toBe(2);
    expect(fields[1].stT_Grid).toBe(1);
    expect(fields[2].isShowMobile).toBe(true);
    expect(fields[2].isShowDetail).toBeNull();
  });
});

describe("getCardFields", () => {
  it("chỉ field isShowMobile, theo stt_Grid (thiếu thì lấy stt), bỏ field vẽ riêng", () => {
    const fields = normalizeWorkflowFields(RAW);
    expect(getCardFields(fields).map((f) => f.name)).toEqual([
      "TinhTrang",
      "SoTicket",
      "ID_LoaiFlow",
      "TieuDe",
    ]);
    expect(getCardFields(fields, ["tinhtrang"]).map((f) => f.name)).toEqual([
      "SoTicket",
      "ID_LoaiFlow",
      "TieuDe",
    ]);
  });
});

describe("getDetailFields", () => {
  it("Flow: isShowDetail khác false (null vẫn hiện); CV: phải bằng true", () => {
    const fields = normalizeWorkflowFields(RAW);
    expect(getDetailFields(fields, "notFalse").map((f) => f.name)).toEqual([
      "SoTicket",
      "TinhTrang",
      "ID_LoaiFlow",
      "TieuDe",
    ]);
    expect(getDetailFields(fields, "true").map((f) => f.name)).toEqual(["TieuDe"]);
  });
});

describe("getFormFields", () => {
  it("bỏ field chỉ đọc, giữ thứ tự stt, lọc theo bộ khoá API nhận", () => {
    const fields = normalizeWorkflowFields(RAW);
    expect(getFormFields(fields).map((f) => f.name)).toEqual(["ID_LoaiFlow", "TieuDe", "MoTa"]);
    expect(getFormFields(fields, { only: ["TieuDe", "MoTa"] }).map((f) => f.name)).toEqual([
      "TieuDe",
      "MoTa",
    ]);
    expect(getFormFields(fields, { exclude: ["MoTa"] }).map((f) => f.name)).toEqual([
      "ID_LoaiFlow",
      "TieuDe",
    ]);
  });
});

describe("formatWorkflowValue", () => {
  const [enumField] = normalizeWorkflowFields([{ name: "TinhTrang", typeProperty: TypeProperty.Enum }]);
  const [dateTime] = normalizeWorkflowFields([{ name: "DenNgay", typeProperty: TypeProperty.Date, showTime: true }]);
  const [dateOnly] = normalizeWorkflowFields([{ name: "NgayTao", typeProperty: TypeProperty.Date }]);

  it("Enum hiện tên ở <name>_MoTa, không có thì hiện số", () => {
    expect(formatWorkflowValue({ tinhTrang: 1, tinhTrang_MoTa: "Chờ duyệt" }, enumField)).toBe("Chờ duyệt");
    expect(formatWorkflowValue({ tinhTrang: 1 }, enumField)).toBe("1");
  });

  it("Date đọc theo giờ địa phương, kèm giờ khi showTime", () => {
    expect(formatWorkflowValue({ denNgay: "2026-10-09T17:30:00" }, dateTime)).toBe("09/10/2026 17:30");
    expect(formatWorkflowValue({ ngayTao: "2026-10-09T08:00:00" }, dateOnly)).toBe("09/10/2026");
    expect(formatWorkflowValue({}, dateOnly)).toBe("---");
  });
});

describe("buildDynamicPayload", () => {
  it("chuỗi rỗng thành null, Reference / số về Number, ngày về yyyy-MM-ddT00:00:00", () => {
    const fields = normalizeWorkflowFields([
      { name: "TieuDe", typeProperty: TypeProperty.String },
      { name: "MoTa", typeProperty: TypeProperty.Text },
      { name: "ID_LoaiCongViec", typeProperty: TypeProperty.Reference },
      { name: "MucDoKhan", typeProperty: TypeProperty.Enum },
      { name: "TuNgay", typeProperty: TypeProperty.Date },
    ]);

    expect(
      buildDynamicPayload(fields, {
        TieuDe: "Báo cáo tuần",
        MoTa: "",
        ID_LoaiCongViec: "2",
        MucDoKhan: 0,
        TuNgay: "09-10-2026",
        ID_LoaiCongViec_MoTa: "Hành chính",
      }),
    ).toEqual({
      TieuDe: "Báo cáo tuần",
      MoTa: null,
      ID_LoaiCongViec: 2,
      MucDoKhan: 0,
      TuNgay: "2026-10-09T00:00:00",
    });
  });
});
