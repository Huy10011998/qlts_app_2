import {
  getCongViecHanBadge,
  shiftDenNgay,
} from "../src/screens/Workflow/CongViec/congViecRules";
import { getFlowDoneMessage } from "../src/screens/Workflow/Flow/flowRules";
import { snapshotFormValues } from "../src/screens/Workflow/shared/useFormDirty";
import { FLOW_KET_QUA } from "../src/screens/Workflow/shared/workflowConstants";

const at = (day: number, hour: number) => new Date(2026, 9, day, hour, 0, 0);

describe("shiftDenNgay (đổi Từ ngày ở form công việc)", () => {
  it("Đến ngày vẫn sau Từ ngày mới thì giữ nguyên", () => {
    const den = at(25, 17);
    expect(shiftDenNgay(at(20, 8), at(22, 8), den)).toBe(den);
    // Bằng nhau vẫn hợp lệ (validateTuDen cho phép).
    expect(shiftDenNgay(at(20, 8), at(25, 17), den)).toBe(den);
  });

  it("Đến ngày rơi về trước thì dời theo, giữ thời lượng", () => {
    // 8h–17h ngày 20, dời Từ sang 8h ngày 21 → Đến 17h ngày 21.
    expect(shiftDenNgay(at(20, 8), at(21, 8), at(20, 17))).toEqual(at(21, 17));
    // Việc 3 ngày: 20/8h → 23/8h; dời Từ sang 25/10h → Đến 28/10h.
    expect(shiftDenNgay(at(20, 8), at(25, 10), at(23, 8))).toEqual(at(28, 10));
  });

  it("thiếu Từ ngày cũ, hoặc khoảng cũ đã âm: Đến ngày về bằng Từ ngày mới", () => {
    expect(shiftDenNgay(null, at(21, 8), at(20, 17))).toEqual(at(21, 8));
    // Đến (19) vốn trước Từ cũ (20): dời 1 ngày vẫn trước Từ mới.
    expect(shiftDenNgay(at(20, 8), at(21, 8), at(19, 8))).toEqual(at(21, 8));
  });

  it("chưa có Từ ngày mới / Đến ngày thì không đụng tới", () => {
    expect(shiftDenNgay(at(20, 8), null, at(20, 17))).toEqual(at(20, 17));
    expect(shiftDenNgay(at(20, 8), at(21, 8), null)).toBeNull();
  });
});

describe("getCongViecHanBadge (nhãn hạn trên thẻ / chi tiết)", () => {
  it("chỉ Quá hạn và Gia hạn", () => {
    expect(getCongViecHanBadge("QuaHan")?.label).toBe("Quá hạn");
    expect(getCongViecHanBadge("GiaHan")?.label).toBe("Gia hạn");
    ["DangXuLy", "Moi", "HoanThanh", "Huy", null, undefined].forEach((maMau) => {
      expect(getCongViecHanBadge(maMau)).toBeNull();
    });
  });
});

describe("getFlowDoneMessage (báo sau khi xử lý 1 phiếu)", () => {
  it("theo kết quả, kèm nhãn phiếu", () => {
    expect(getFlowDoneMessage(FLOW_KET_QUA.Duyet, "PDN-001")).toBe("Đã duyệt phiếu PDN-001");
    expect(getFlowDoneMessage(FLOW_KET_QUA.TuChoi, "#12")).toBe("Đã từ chối phiếu #12");
    expect(getFlowDoneMessage(FLOW_KET_QUA.TraBuoc, "#12")).toBe("Đã trả bước phiếu #12");
    expect(getFlowDoneMessage(FLOW_KET_QUA.KhongYKien, "#12")).toContain("Không ý kiến");
  });
});

describe("snapshotFormValues (form có thay đổi chưa lưu)", () => {
  it("rỗng / null / undefined coi như nhau, bỏ qua khoá ngoài form", () => {
    const a = snapshotFormValues(["TieuDe", "MoTa"], { TieuDe: "", MoTa: undefined });
    const b = snapshotFormValues(["TieuDe", "MoTa"], {
      TieuDe: null,
      ID_KeHoach_MoTa: "Kế hoạch A",
    });
    expect(a).toBe(b);
    expect(snapshotFormValues(["TieuDe"], { TieuDe: "Việc 1" })).not.toBe(a);
  });

  it("số BE trả và chuỗi gõ lại cùng giá trị là một", () => {
    expect(snapshotFormValues(["MucDoKhan"], { MucDoKhan: 1 })).toBe(
      snapshotFormValues(["MucDoKhan"], { MucDoKhan: "1" }),
    );
  });
});
