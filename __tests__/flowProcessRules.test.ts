import {
  bareFlowName,
  buildFlowDiagram,
  getFlowPointDetail,
  getInitialFlowPoint,
} from "../src/screens/Workflow/Flow/flowProcessRules";
import { getFlowHistory } from "../src/screens/Workflow/Flow/flowRules";
import type { FlowTienTrinh } from "../src/types/index";

// Khuôn dữ liệu lấy theo flow-tien-trinh thật của phiếu mẫu (mục 6): bước 2 có 2
// con tuần tự, bước 3 có 2 con song song.
const buocs = (tinhTrang: Record<number, number>) => [
  { id: 1, buoc: 1, buocCon: null, ten: "Trưởng bộ phận duyệt", tinhTrang: tinhTrang[1] ?? 0 },
  { id: 2, buoc: 2, buocCon: null, ten: "Kiểm soát chứng từ", tinhTrang: tinhTrang[2] ?? 0, loaiXuLy: 0 },
  { id: 21, buoc: 2, buocCon: 1, ten: "Kế toán viên", tinhTrang: tinhTrang[21] ?? 0 },
  { id: 22, buoc: 2, buocCon: 2, ten: "Kế toán trưởng", tinhTrang: tinhTrang[22] ?? 0 },
  { id: 3, buoc: 3, buocCon: null, ten: "Các phòng xác nhận", tinhTrang: tinhTrang[3] ?? 0, loaiXuLy: 1 },
  { id: 31, buoc: 3, buocCon: 1, ten: "Phòng Kỹ thuật", tinhTrang: tinhTrang[31] ?? 0 },
  { id: 32, buoc: 3, buocCon: 2, ten: "Phòng Sản xuất", tinhTrang: tinhTrang[32] ?? 0 },
  { id: 4, buoc: 4, buocCon: null, ten: "Giám đốc duyệt", tinhTrang: tinhTrang[4] ?? 0 },
];

const nguoi = (step: number, ketQua: number | null, at: string | null, ten = "TEST02 - Nhân viên Test 2") => ({
  iD_Flow_HoSo_Buoc: step,
  iD_NhanVien_MoTa: ten,
  coCau_MoTa: "BP IT",
  ketQua,
  ngayDuyet: at,
  yKien: ketQua ? "Ý kiến" : null,
  isChiXem: false,
});

/** Như TB.000006: 2.1 trả về bước 1, lượt sau chạy hết. */
const motLanTra: FlowTienTrinh = {
  buocs: buocs({ 1: 2, 2: 2, 21: 2, 22: 2, 3: 2, 31: 2, 32: 2, 4: 2 }),
  nguoiDuyets: [
    nguoi(1, 1, "2026-10-12T16:19:50.63"),
    nguoi(21, 1, "2026-10-12T16:19:50.68"),
    nguoi(22, 1, "2026-10-12T16:19:50.70"),
    nguoi(31, 1, "2026-10-12T16:19:50.72"),
    nguoi(32, 1, "2026-10-12T16:19:50.74"),
    nguoi(4, 1, "2026-10-12T16:19:50.76"),
  ],
  congViec: null,
  traBuocs: [
    {
      lan: 1,
      iD_Flow_HoSo_Buoc_Tu: 21,
      iD_Flow_HoSo_Buoc_Ve: 1,
      tenBuocTu: "2.1. Kế toán viên",
      tenBuocVe: "1. Trưởng bộ phận duyệt",
      iD_NhanVien_MoTa: "TEST03 - Nhân viên Test 3",
      lyDo: "Thiếu chữ ký người nhận hàng.",
      ngayTra: "2026-10-12T16:19:50.587",
    },
  ],
  nguoiDuyetCus: [
    { ...nguoi(1, 1, "2026-10-12T16:19:50.54"), lan: 1 },
    { ...nguoi(21, 4, "2026-10-12T16:19:50.587", "TEST03 - Nhân viên Test 3"), lan: 1 },
  ],
};

/** Như TB.000005: Giám đốc trả về bước 3, rồi 3.2 trả về bước 2; đang ở 2.1. */
const haiLanTra: FlowTienTrinh = {
  buocs: buocs({ 1: 2, 21: 1 }),
  nguoiDuyets: [nguoi(1, 1, "2026-10-12T16:19:50.08"), nguoi(21, null, null, "TEST03 - Nhân viên Test 3")],
  congViec: null,
  traBuocs: [
    { lan: 2, iD_Flow_HoSo_Buoc_Tu: 32, iD_Flow_HoSo_Buoc_Ve: 2, iD_NhanVien_MoTa: "TEST03 - Nhân viên Test 3", ngayTra: "2026-10-12T16:19:50.477" },
    { lan: 1, iD_Flow_HoSo_Buoc_Tu: 4, iD_Flow_HoSo_Buoc_Ve: 3, iD_NhanVien_MoTa: "TEST01 - Nhân viên Test 1", ngayTra: "2026-10-12T16:19:50.313" },
  ],
  nguoiDuyetCus: [
    { ...nguoi(21, 1, "2026-10-12T16:19:50.13"), lan: 2 },
    { ...nguoi(22, 1, "2026-10-12T16:19:50.17"), lan: 2 },
    { ...nguoi(31, 1, "2026-10-12T16:19:50.22"), lan: 1 },
    { ...nguoi(32, 1, "2026-10-12T16:19:50.27"), lan: 1 },
    { ...nguoi(4, 4, "2026-10-12T16:19:50.313"), lan: 1 },
    { ...nguoi(31, 1, "2026-10-12T16:19:50.40"), lan: 2 },
    { ...nguoi(32, 4, "2026-10-12T16:19:50.477"), lan: 2 },
  ],
};

const summary = (data: FlowTienTrinh) =>
  buildFlowDiagram(data, "2026-10-04T16:19:00").runs.map((run) =>
    run.points.map((point) => [point.col, point.state, point.count ?? point.sub]),
  );

describe("buildFlowDiagram (mục 6b–d)", () => {
  it("không trả bước lần nào: 1 dòng Lập phiếu → mọi bước", () => {
    const diagram = buildFlowDiagram({ ...motLanTra, traBuocs: [], nguoiDuyetCus: [] }, null);
    expect(diagram.runs).toHaveLength(1);
    expect(diagram.runs[0].points.map((point) => point.col)).toEqual([0, 1, 2, 3, 4]);
  });

  it("trả 1 lần: dòng 1 dừng ở bước lớn bấm trả, dòng 2 bắt đầu ở bước được trả về", () => {
    expect(summary(motLanTra)).toEqual([
      [
        [0, "done", "04/10/2026 16:19"],
        [1, "done", "12/10/2026 16:19"],
        // 2.1 bấm trả (cam), 2.2 chưa tới lượt → 0/2.
        [2, "tra", "0/2"],
      ],
      [
        [1, "done", "12/10/2026 16:19"],
        [2, "done", "2/2"],
        [3, "done", "2/2"],
        [4, "done", "12/10/2026 16:19"],
      ],
    ]);
    const traPoint = buildFlowDiagram(motLanTra, null).runs[0].points[2];
    expect(traPoint.childDots.map((dot) => dot.state)).toEqual(["tra", "wait"]);
    // "x/n" và ngày tách 2 dòng; bị trả cũng kèm ngày trả (mục 6c).
    expect(traPoint.sub).toMatch(/^\d{2}\/\d{2}\/\d{4} \d{2}:\d{2}$/);
    expect(buildFlowDiagram(motLanTra, null).runs[1].points[1]).toMatchObject({
      count: "2/2",
      sub: expect.stringMatching(/^\d{2}\/\d{2}\/\d{4} \d{2}:\d{2}$/),
    });
  });

  it("trả 2 lần (traBuocs về lộn thứ tự vẫn xếp theo lan): 3 dòng thẳng cột", () => {
    expect(summary(haiLanTra)).toEqual([
      [
        [0, "done", "04/10/2026 16:19"],
        [1, "done", "12/10/2026 16:19"],
        [2, "done", "2/2"],
        [3, "done", "2/2"],
        [4, "tra", "12/10/2026 16:19"],
      ],
      // Lượt 2 chỉ có bước 3: 3.1 duyệt lại, 3.2 bấm trả → 1/2.
      [[3, "tra", "1/2"]],
      [
        [2, "doing", "0/2"],
        [3, "wait", "0/2"],
        [4, "wait", "Chờ xử lý"],
      ],
    ]);
  });

  it("chọn sẵn: điểm đang xử lý của dòng cuối, không có thì điểm xong cuối cùng", () => {
    expect(getInitialFlowPoint(buildFlowDiagram(haiLanTra, null))?.key).toBe("2-2");
    expect(getInitialFlowPoint(buildFlowDiagram(motLanTra, null))?.key).toBe("1-4");
  });
});

describe("đường nối + chip (PHỤ LỤC TinhTrang BƯỚC)", () => {
  // Bước 1 duyệt, bước 2 tinhTrang 4 (có / không người bấm Không ý kiến), bước 3 đang chờ.
  const data = (khongYKien: boolean) =>
    ({
      buocs: [
        { id: 1, buoc: 1, buocCon: null, ten: "Trưởng bộ phận", tinhTrang: 2 },
        { id: 2, buoc: 2, buocCon: null, ten: "Kế toán", tinhTrang: 4 },
        { id: 3, buoc: 3, buocCon: null, ten: "Giám đốc", tinhTrang: 1 },
      ],
      nguoiDuyets: [
        { iD_Flow_HoSo_Buoc: 1, ketQua: 1, ngayDuyet: "2026-10-12T16:19:00" },
        { iD_Flow_HoSo_Buoc: 2, ketQua: khongYKien ? 3 : null, ngayDuyet: khongYKien ? "2026-10-12T16:20:00" : null },
      ],
    } as unknown as FlowTienTrinh);

  it("xanh sau điểm Đã duyệt / Không ý kiến, xám sau Bỏ qua / đang xử lý", () => {
    const passed = (khongYKien: boolean) =>
      buildFlowDiagram(data(khongYKien), null).runs[0].points.map((point) => point.passed);
    expect(passed(true)).toEqual([true, true, true, false]);
    expect(passed(false)).toEqual([true, true, false, false]);
  });

  it("chip theo state; nhãn tinhTrang 4 là Không ý kiến hoặc Bỏ qua", () => {
    const statusOf = (khongYKien: boolean) => {
      const diagram = buildFlowDiagram(data(khongYKien), null);
      return getFlowPointDetail(data(khongYKien), diagram.runs[0].points[2], diagram)?.status;
    };
    expect(statusOf(true)).toEqual({ label: "Không ý kiến", state: "skip" });
    expect(statusOf(false)).toEqual({ label: "Bỏ qua", state: "skip" });
  });
});

describe("getFlowPointDetail (mục 6e)", () => {
  it("dòng cuối: tiêu đề ĐANG Ở BƯỚC, 1 dòng mỗi bước con", () => {
    const diagram = buildFlowDiagram(haiLanTra, null);
    const detail = getFlowPointDetail(haiLanTra, diagram.runs[2].points[0], diagram);
    expect(detail?.kicker).toBe("ĐANG Ở BƯỚC");
    expect(detail?.title).toBe("2. Kiểm soát chứng từ");
    expect(detail?.rows.map((row) => [row.label, row.status.label])).toEqual([
      ["2.1 Kế toán viên", "Đang xử lý"],
      ["2.2 Kế toán trưởng", "Chờ xử lý"],
    ]);
    expect(detail?.note).toBe("↳ Các bước con chạy tuần tự");
  });

  it("bước đơn: 1 dòng chỉ ghi tên, không lặp số bước", () => {
    const diagram = buildFlowDiagram(haiLanTra, null);
    const giamDoc = diagram.runs[2].points.find((point) => point.column.kind === "buoc" && point.column.buoc.id === 4);
    const detail = giamDoc && getFlowPointDetail(haiLanTra, giamDoc, diagram);
    expect(detail?.title).toBe("4. Giám đốc duyệt");
    expect(detail?.rows.map((row) => row.label)).toEqual(["Giám đốc duyệt"]);
    expect(detail?.note).toBeNull();
  });

  it("dòng cũ: dựng lại kết quả lúc đó, điểm bấm trả có khung lý do", () => {
    const diagram = buildFlowDiagram(haiLanTra, null);
    const detail = getFlowPointDetail(haiLanTra, diagram.runs[1].points[0], diagram);
    expect(detail?.kicker).toBe("BƯỚC");
    expect(detail?.rows.map((row) => row.status.label)).toEqual(["Đã duyệt", "Trả bước"]);
    expect(detail?.tra?.lan).toBe(2);

    // Lượt 1: 3.1 / 3.2 lấy kết quả lan 1 (lượt 2 chưa diễn ra).
    const lan1 = getFlowPointDetail(haiLanTra, diagram.runs[0].points[3], diagram);
    expect(lan1?.rows.map((row) => row.status.label)).toEqual(["Đã duyệt", "Đã duyệt"]);
  });

  it("tên người bỏ mã nhân viên đứng đầu như web", () => {
    expect(bareFlowName("TEST03 - Nhân viên Test 3")).toBe("Nhân viên Test 3");
    expect(bareFlowName("Nguyễn Văn A - Kho")).toBe("Nguyễn Văn A - Kho");
  });
});

describe("getFlowHistory có Trả bước", () => {
  it("thêm dòng Trả bước (không số lần) màu cam, ghi chú là Lý do; bỏ dòng ketQua 4 của nguoiDuyetCus", () => {
    const history = getFlowHistory(motLanTra, null, null);
    const tra = history.filter((event) => event.title.startsWith("Trả bước"));
    expect(tra).toEqual([
      expect.objectContaining({
        title: "Trả bước",
        content: "2.1. Kế toán viên → 1. Trưởng bộ phận duyệt",
        noteLabel: "Lý do",
        color: "#f9a825",
      }),
    ]);
    // Duyệt của lượt bị chạy lại (nguoiDuyetCus) vẫn có trong lịch sử, tên bước con đủ số.
    const duyet = history.filter((event) => event.title === "Duyệt");
    expect(duyet).toHaveLength(7);
    expect(duyet.map((event) => event.content)).toContain("2.1. Kế toán viên");
  });
});

describe("tab Lịch sử: tên mình in đậm", () => {
  it("so iD_NhanVien của nguoiDuyets / traBuocs và người lập", () => {
    const data = {
      buocs: [{ id: 1, buoc: 1, buocCon: null, ten: "Trưởng bộ phận", tinhTrang: 2 }],
      nguoiDuyets: [
        { iD_Flow_HoSo_Buoc: 1, iD_NhanVien: 7, iD_NhanVien_MoTa: "Tôi", ketQua: 1, ngayDuyet: "2026-10-02T09:00:00" },
        { iD_Flow_HoSo_Buoc: 1, iD_NhanVien: 8, iD_NhanVien_MoTa: "Người khác", ketQua: 1, ngayDuyet: "2026-10-02T10:00:00" },
      ],
      traBuocs: [{ lan: 1, iD_Flow_HoSo_Buoc_Tu: 1, iD_Flow_HoSo_Buoc_Ve: 1, iD_NhanVien: 7, iD_NhanVien_MoTa: "Tôi", ngayTra: "2026-10-03T08:00:00" }],
    } as unknown as FlowTienTrinh;

    const events = getFlowHistory(data, "2026-10-01T08:00:00", "Người khác", { iD_NhanVien: 7, nguoiLapId: 8 });
    expect(events.map((event) => [event.by, !!event.byMe])).toEqual([
      ["Người khác", false],
      ["Tôi", true],
      ["Người khác", false],
      ["Tôi", true],
    ]);
  });
});
