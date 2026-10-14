import { getCongViecActions, validateDinhKy, validateThamGias } from "../src/screens/Workflow/CongViec/congViecRules";
import {
  getFlowActions,
  getFlowBuocTinhTrangHienThi,
  getFlowHeading,
  getFlowHistory,
  getFlowLabel,
  getFlowSoPhieu,
  getMissingSteps,
} from "../src/screens/Workflow/Flow/flowRules";
import { getKeHoachProgress } from "../src/screens/Workflow/KeHoach/keHoachRules";
import { readTabCount } from "../src/screens/Workflow/shared/workflowConstants";
import {
  filterWorkflowMenu,
  WORKFLOW_MENU_GROUPS,
  WORKFLOW_VIEW_CODE,
} from "../src/screens/Workflow/workflowMenu";
import { isGroupWebView, normalizeViewCode } from "../src/screens/Home/shared/homeMenuHelpers";

// Luật ẩn / hiện nút chép từ tài liệu BE. Luật thật ở server — app chỉ đọc
// cờ server trả, nên test ở đây giữ cho app không tự suy thêm quyền.

const ALL_PERMS = { canInsert: true, canUpdate: true, canDelete: true };

describe("getFlowActions", () => {
  const nhapCuaToi = { id: 21, tinhTrang: 0, iD_NhanVien_Tao: 7 };

  it("Sửa / Xoá: nháp của tôi; Xoá còn được khi chưa Đã hoàn tất", () => {
    const actions = getFlowActions(nhapCuaToi, undefined, 7, ALL_PERMS);
    expect(actions.sua).toBe(true);
    expect(actions.xoa).toBe(true);
    expect(actions.suaFile).toBe(true);
    expect(actions.quyTrinh).toBe(false);

    const daNop = getFlowActions({ ...nhapCuaToi, tinhTrang: 1 }, undefined, 7, ALL_PERMS);
    expect(daNop.sua).toBe(false);
    expect(daNop.xoa).toBe(true);

    const hoanTat = getFlowActions({ ...nhapCuaToi, tinhTrang: 3 }, undefined, 7, ALL_PERMS);
    expect(hoanTat.xoa).toBe(false);

    const cuaNguoiKhac = getFlowActions(nhapCuaToi, undefined, 8, ALL_PERMS);
    expect(cuaNguoiKhac.sua).toBe(false);
    expect(cuaNguoiKhac.xoa).toBe(false);
  });

  it("Duyệt theo isToiLuot; Không ý kiến cần thêm duocKhongYKien; chưa liên kết nhân viên thì ẩn", () => {
    const info = { iD_HoSo: 21, soBinhLuan: 0, soFile: 0, soBuoc: 3, isToiLuot: true, duocKhongYKien: false };
    expect(getFlowActions(nhapCuaToi, info, 9, ALL_PERMS)).toMatchObject({
      duyet: true,
      khongYKien: false,
      quyTrinh: true,
      dinhKem: false,
    });
    expect(getFlowActions(nhapCuaToi, { ...info, duocKhongYKien: true }, 9, ALL_PERMS).khongYKien).toBe(true);
    expect(getFlowActions(nhapCuaToi, info, null, ALL_PERMS).duyet).toBe(false);
  });

  it("đủ người cho mọi bước mới cho nộp / duyệt", () => {
    const data = {
      buocs: [
        { iD_Buoc: 1, ten: "Trưởng phòng" },
        { iD_Buoc: 2, ten: "Giám đốc" },
      ],
      ungViens: [],
      daChons: [],
      nhanViens: [],
    };
    expect(getMissingSteps(data, [{ iD_Buoc: 1, iD_NhanVien: 5 }]).map((b) => b.iD_Buoc)).toEqual([2]);
    expect(getMissingSteps(data, [{ iD_Buoc: 1, iD_NhanVien: 5 }, { iD_Buoc: 2, iD_NhanVien: 6 }])).toEqual([]);
  });

  // Server giữ bước cha = Chờ xử lý (0) tới khi hoàn tất dù bước con đã mở;
  // web vẽ bước đó là đang xử lý, app phải khớp.
  it("bước cha duyệt song song: có bước con đã mở thì là Đang xử lý", () => {
    const cha = { tinhTrang: 0 };
    expect(getFlowBuocTinhTrangHienThi(cha, [{ tinhTrang: 1 }, { tinhTrang: 1 }, { tinhTrang: 2 }])).toBe(1);
    expect(getFlowBuocTinhTrangHienThi(cha, [{ tinhTrang: 0 }, { tinhTrang: 0 }])).toBe(0);
    expect(getFlowBuocTinhTrangHienThi(cha, [])).toBe(0);
    expect(getFlowBuocTinhTrangHienThi({ tinhTrang: 2 }, [{ tinhTrang: 2 }])).toBe(2);
    expect(getFlowBuocTinhTrangHienThi({ tinhTrang: 3 }, [{ tinhTrang: 1 }, { tinhTrang: 3 }])).toBe(3);
  });

  // Tiêu đề / nội dung tab Lịch sử theo PHỤ LỤC (chữ y hệt web). Dữ liệu rút từ phiếu thật.
  it("lịch sử: Thêm mới · Chờ xử lý · Duyệt · Tạo công việc theo thời gian", () => {
    const buoc = (id: number, so: number, ten: string, ngayMo: string) => ({
      id, buoc: so, buocCon: null, ten, tinhTrang: 2, ngayMo, ngayHoanTat: ngayMo,
    });
    const events = getFlowHistory(
      {
        buocs: [
          buoc(253, 1, "Trưởng bộ phận duyệt", "2026-10-09T12:16:22.207"),
          buoc(254, 2, "IT tiếp nhận", "2026-10-09T12:16:22.217"),
        ],
        nguoiDuyets: [
          { iD_Flow_HoSo_Buoc: 253, iD_NhanVien_MoTa: "TEST02", ketQua: 1, ngayDuyet: "2026-10-09T12:16:22.213", yKien: "Đồng ý" },
          { iD_Flow_HoSo_Buoc: 254, iD_NhanVien_MoTa: "TEST03", ketQua: 1, ngayDuyet: "2026-10-09T12:16:22.23", yKien: null },
          { iD_Flow_HoSo_Buoc: 254, iD_NhanVien_MoTa: "TEST04", ketQua: null, isChiXem: true },
        ],
        congViec: {
          iD_CongViec: 22, iD_Flow_HoSo_Buoc: 254, soCongViec: "CV.000015", tieuDe: "Wifi yếu",
          chuTri: "Nhân viên Test 3", nguoiTao: "Nhân viên Test 3", ngayTao: "2026-10-09T12:16:22.227",
        },
      },
      "2026-10-06T12:16:00",
      "TEST01",
    );

    expect(events.map((e) => [e.title, e.content, e.by ?? null])).toEqual([
      ["Thêm mới", "Lập phiếu", "TEST01"],
      ["Chờ xử lý", "1. Trưởng bộ phận duyệt — giao: TEST02", null],
      ["Duyệt", "1. Trưởng bộ phận duyệt", "TEST02"],
      ["Chờ xử lý", "2. IT tiếp nhận — giao: TEST03 — chỉ xem: TEST04", null],
      ["Tạo công việc", "CV.000015 - Wifi yếu · chủ trì: Nhân viên Test 3", "Nhân viên Test 3"],
      ["Duyệt", "2. IT tiếp nhận", "TEST03"],
    ]);
    expect(events[2].note).toBe("Đồng ý");
  });

  it("lịch sử: bước 4 không ai bấm Không ý kiến thì là Bỏ qua; có người bấm thì là Không ý kiến", () => {
    const boQua = { id: 1, buoc: 2, buocCon: 2, ten: "Phòng Sản xuất", tinhTrang: 4, ngayMo: "2026-10-09T08:00:00", ngayHoanTat: "2026-10-09T09:00:00" };
    const titles = (nguoiDuyets: any[]) =>
      getFlowHistory({ buocs: [boQua], nguoiDuyets, congViec: null }, null, null).map((e) => e.title);

    expect(titles([{ iD_Flow_HoSo_Buoc: 1, iD_NhanVien_MoTa: "A", ketQua: null }])).toEqual(["Chờ xử lý", "Bỏ qua"]);
    expect(titles([{ iD_Flow_HoSo_Buoc: 1, iD_NhanVien_MoTa: "A", ketQua: 3, ngayDuyet: "2026-10-09T08:30:00" }])).toEqual([
      "Chờ xử lý",
      "Không ý kiến",
    ]);
  });

  // Tên cột số phiếu lấy từ get-class-by-name (propertyTuDongTang), không đoán.
  it("số phiếu đọc theo tên cột server trả; chưa có số / chưa khai cột thì #id", () => {
    expect(getFlowSoPhieu({ id: 1, soTicket: "TK.000021" }, "SoTicket")).toBe("TK.000021");
    expect(getFlowLabel({ id: 1, soTicket: "TK.000021" }, "SoTicket")).toBe("TK.000021");
    expect(getFlowLabel({ id: 7, soTicket: null }, "SoTicket")).toBe("#7");
    expect(getFlowLabel({ id: 7, soTicket: "TK.000007" }, null)).toBe("#7");
  });
});

describe("getCongViecActions", () => {
  const quyen = {
    vaiTro: 1,
    isNguoiTao: true,
    duocTraoDoi: true,
    duocQuanLy: true,
    duocChuyenTrangThai: true,
    duocDoiChuTri: true,
    isTuPhieu: false,
    duocXoa: true,
  };
  const ALL = { canUpdate: true, canDelete: true };

  it("việc Mới của người tạo: đủ nút", () => {
    expect(getCongViecActions({ trangThai: 0 }, quyen, ALL)).toEqual({
      sua: true,
      chuyenTrangThai: true,
      giaHan: true,
      doiChuTri: true,
      xoa: true,
      traoDoi: true,
    });
  });

  // Xoá đọc cờ duocXoa server tính sẵn (người tạo + Mới + không từ phiếu), không tự suy.
  it("Xoá theo cờ duocXoa + quyền Delete; việc từ phiếu server trả duocXoa = false", () => {
    expect(getCongViecActions({ trangThai: 0 }, { ...quyen, duocXoa: false, isTuPhieu: true }, ALL).xoa).toBe(false);
    expect(getCongViecActions({ trangThai: 0 }, quyen, { canUpdate: true, canDelete: false }).xoa).toBe(false);
    // Server cho xoá thì app không tự chặn thêm theo trạng thái.
    expect(getCongViecActions({ trangThai: 1 }, quyen, ALL).xoa).toBe(true);
  });

  it("đã xong: không sửa / gia hạn / đổi chủ trì, vẫn chuyển trạng thái được", () => {
    expect(getCongViecActions({ trangThai: 2 }, quyen, ALL)).toMatchObject({
      sua: false,
      giaHan: false,
      doiChuTri: false,
      chuyenTrangThai: true,
    });
  });

  it("Sửa cần thêm quyền Class.CV_CongViec.Update; cờ toàn false = chỉ xem", () => {
    // Bản 14/10: chuyển trạng thái / gia hạn / đổi chủ trì cũng đòi .Update.
    expect(getCongViecActions({ trangThai: 0 }, quyen, { canUpdate: false, canDelete: true })).toMatchObject({
      sua: false,
      chuyenTrangThai: false,
      giaHan: false,
      doiChuTri: false,
      traoDoi: true,
    });
    const chiXem = getCongViecActions(
      { trangThai: 0 },
      {
        ...quyen,
        isNguoiTao: false,
        duocTraoDoi: false,
        duocQuanLy: false,
        duocChuyenTrangThai: false,
        duocDoiChuTri: false,
        duocXoa: false,
      },
      ALL,
    );
    expect(Object.values(chiXem).some(Boolean)).toBe(false);
  });
});

describe("validate công việc", () => {
  it("đúng 1 Chủ trì, 1 người 1 vai trò", () => {
    expect(validateThamGias([{ ID_NhanVien: 1, VaiTro: 1 }, { ID_NhanVien: 2, VaiTro: 2 }])).toBeNull();
    expect(validateThamGias([{ ID_NhanVien: 2, VaiTro: 2 }])).not.toBeNull();
    expect(validateThamGias([{ ID_NhanVien: 1, VaiTro: 1 }, { ID_NhanVien: 1, VaiTro: 3 }])).not.toBeNull();
  });

  it("định kỳ: kiểu tuần cần thứ; đúng 1 cách kết thúc; tối đa 366 lần", () => {
    const base = { KieuLap: 1, MoiN: 1, ThuTrongTuan: null, NgayBatDau: "2026-10-09T00:00:00", KetThucNgay: null, SoLan: 5 };
    expect(validateDinhKy(null)).toBeNull();
    expect(validateDinhKy(base)).toBeNull();
    expect(validateDinhKy({ ...base, KieuLap: 2 })).not.toBeNull();
    expect(validateDinhKy({ ...base, KetThucNgay: "2026-12-31T00:00:00" })).not.toBeNull();
    expect(validateDinhKy({ ...base, SoLan: 400 })).not.toBeNull();
  });
});

describe("kế hoạch + số trên tab", () => {
  it("x/y việc = soHoanThanh / (soCongViec - soHuy); chưa có việc thì 0/0", () => {
    expect(getKeHoachProgress({ phanTram: 33, soCongViec: 4, soHoanThanh: 1, soHuy: 1 })).toEqual({
      percent: 33,
      label: "1/3 việc",
    });
    expect(getKeHoachProgress({ phanTram: null, soCongViec: 0, soHoanThanh: 0, soHuy: 0 })).toEqual({
      percent: null,
      label: "0/0 việc",
    });
  });

  it("dem-tab trả key PascalCase — tra không phân biệt hoa thường", () => {
    expect(readTabCount({ ChoDuyet: 3, nhap: 1 }, "ChoDuyet")).toBe(3);
    expect(readTabCount({ ChoDuyet: 3, nhap: 1 }, "Nhap")).toBe(1);
    expect(readTabCount({ ChoDuyet: 3 }, "HoanTat")).toBeUndefined();
  });
});

describe("view Workflow (view viết riêng như Camera / ĐHCĐ)", () => {
  it("group isGroupWeb Mã 'Workflow' (không phân biệt hoa thường) giữ chỗ cho view viết riêng", () => {
    const group = { id: 30, ma: " workflow ", label: "Workflow", stt: 8, isGroupWeb: 1 } as any;
    expect(isGroupWebView(group)).toBe(true);
    expect(normalizeViewCode(group.ma)).toBe(normalizeViewCode(WORKFLOW_VIEW_CODE));
  });

  it("đủ 2 nhóm / 3 chức năng; thiếu quyền Read thì ẩn chức năng, nhóm rỗng thì ẩn nhóm", () => {
    const all = filterWorkflowMenu(WORKFLOW_MENU_GROUPS, () => true);
    expect(all.map((g) => [g.title, g.items.map((i) => i.label)])).toEqual([
      ["Flow", ["Ticket phòng ban"]],
      ["Công việc", ["Công việc", "Kế hoạch"]],
    ]);

    const chiCongViec = filterWorkflowMenu(WORKFLOW_MENU_GROUPS, (name) => name === "CV_CongViec");
    expect(chiCongViec.map((g) => [g.title, g.items.map((i) => i.label)])).toEqual([
      ["Công việc", ["Công việc"]],
    ]);
  });
});

describe("getFlowHeading (dòng đầu thẻ chi tiết phiếu)", () => {
  it("hiện tên Loại đề nghị, đọc ở cột _MoTa — không ghép Tiêu đề", () => {
    expect(
      getFlowHeading(
        { id: 1, tieuDe: "Thanh toán sửa chữa máy nén khí", iD_LoaiFlow: 3, iD_LoaiFlow_MoTa: "Đề nghị thanh toán" },
        "Ticket phòng ban",
      ),
    ).toBe("Đề nghị thanh toán");
  });

  it("chưa có loại thì về tên flow", () => {
    expect(getFlowHeading({ id: 1, iD_LoaiFlow_MoTa: "  " }, "Ticket phòng ban")).toBe("Ticket phòng ban");
    expect(getFlowHeading(null, undefined)).toBe("");
  });
});
