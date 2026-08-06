import {
  HOME_NO_DATA,
  formatHomeBillion,
  formatHomeCount,
  formatHomeDecimal,
  formatHomeNumber,
  formatHomePercent,
  formatHomePeriodLabel,
  formatHomeUpdatedAt,
  getHomeRatioPercent,
} from "../src/screens/Home/shared/homeFormat";
import {
  mapMayMocDashboard,
  mapTaiSanDashboard,
} from "../src/screens/Home/shared/homeData";
import type {
  MayMocDashboardRaw,
  TaiSanDashboardRaw,
} from "../src/services/data/dashboardApi";

describe("formatHomeNumber", () => {
  it("chèn dấu phân cách nghìn theo kiểu vi-VN", () => {
    expect(formatHomeNumber(0)).toBe("0");
    expect(formatHomeNumber(412)).toBe("412");
    expect(formatHomeNumber(1766)).toBe("1.766");
    expect(formatHomeNumber(1000000)).toBe("1.000.000");
    expect(formatHomeNumber(-1234)).toBe("-1.234");
  });

  it("làm tròn thay vì để lộ số thập phân", () => {
    expect(formatHomeNumber(411.6)).toBe("412");
  });
});

describe("formatHomeUpdatedAt", () => {
  it("lấy HH:mm ngay trong chuỗi giờ server, không qua múi giờ máy", () => {
    // ngayCapNhat của proc là giờ server và không kèm múi giờ.
    expect(formatHomeUpdatedAt("2026-08-04T14:57:44.32")).toBe("14:57");
    expect(formatHomeUpdatedAt("2026-08-04 09:05:00")).toBe("09:05");
  });

  it("trả null khi dữ liệu không dùng được", () => {
    expect(formatHomeUpdatedAt("khong-phai-ngay")).toBeNull();
    expect(formatHomeUpdatedAt(undefined)).toBeNull();
  });
});

describe("formatHomeDecimal", () => {
  it("nhóm nghìn bằng dấu chấm và phần lẻ bằng dấu phẩy", () => {
    expect(formatHomeDecimal(1243.6, 1)).toBe("1.243,6");
    expect(formatHomeDecimal(46.5, 1)).toBe("46,5");
    expect(formatHomeDecimal(-1243.65, 2)).toBe("-1.243,65");
  });

  it("bỏ phần lẻ toàn số 0", () => {
    expect(formatHomeDecimal(46, 1)).toBe("46");
    expect(formatHomeDecimal(1000, 2)).toBe("1.000");
  });

  it("làm tròn về số nguyên khi không yêu cầu số lẻ", () => {
    expect(formatHomeDecimal(18420)).toBe("18.420");
    expect(formatHomeDecimal(46.5)).toBe("47");
  });
});

describe("formatHomeCount", () => {
  it("phân biệt null với 0 — null là mất số liệu, 0 là đúng bằng 0", () => {
    expect(formatHomeCount(0)).toBe("0");
    expect(formatHomeCount(2928)).toBe("2.928");
    expect(formatHomeCount(null)).toBe(HOME_NO_DATA);
    expect(formatHomeCount(undefined)).toBe(HOME_NO_DATA);
  });
});

describe("getHomeRatioPercent / formatHomePercent", () => {
  it("tính % theo mẫu số và in một số lẻ", () => {
    expect(formatHomePercent(getHomeRatioPercent(599, 2928))).toBe("20,5%");
    expect(formatHomePercent(getHomeRatioPercent(72, 108))).toBe("66,7%");
    expect(formatHomePercent(getHomeRatioPercent(0, 869))).toBe("0%");
  });

  it("không có mẫu số dùng được thì trả null, hiện dấu — chứ không phải 0%", () => {
    expect(getHomeRatioPercent(5, 0)).toBeNull();
    expect(getHomeRatioPercent(5, null)).toBeNull();
    expect(getHomeRatioPercent(null, 100)).toBeNull();
    expect(formatHomePercent(null)).toBe(HOME_NO_DATA);
  });

  it("kẹp trong khoảng 0–100 dù số liệu Bravo8 lệch", () => {
    expect(getHomeRatioPercent(120, 100)).toBe(100);
    expect(getHomeRatioPercent(-5, 100)).toBe(0);
  });
});

describe("formatHomeBillion", () => {
  it("đổi số đồng của API sang tỷ, một số lẻ", () => {
    expect(formatHomeBillion(486320000000)).toBe("486,3");
    expect(formatHomeBillion(12400000000)).toBe("12,4");
    // Phần lẻ toàn 0 thì bỏ, không in "88,0".
    expect(formatHomeBillion(88000000000)).toBe("88");
    expect(formatHomeBillion(0)).toBe("0");
  });
});

describe("formatHomePeriodLabel", () => {
  it("in đúng thang/nam nhận được, không tự trừ thêm một tháng", () => {
    expect(formatHomePeriodLabel(7, 2026)).toBe("Tháng 7/2026");
    expect(formatHomePeriodLabel(12, 2025)).toBe("Tháng 12/2025");
    expect(formatHomePeriodLabel(0, 0)).toBe("");
  });
});

/** JSON mẫu trong tài liệu BE (04/08/2026), đã cắt bớt vài bộ phận. */
const RAW: TaiSanDashboardRaw = {
  thang: 7,
  nam: 2026,
  ngayCapNhat: "2026-08-04T14:57:44.32",

  sL_MayMoc: 7673,
  sL_MayTinh: 277,
  sL_Server: 6,
  sL_ThietBiCNTT: 50,
  sL_DienThoai: 34,
  sL_MayIn: 56,
  sL_MayQuetMaVach: 22,
  sL_ThietBiMang: 195,
  sL_CNTT: 640,
  sL_Camera: 500,

  dien_TieuThu_VL: 705420,
  dien_TieuThu_BL: 453587,
  nuoc_TieuThu_VL: 37566,
  nuoc_TieuThu_BL: 14760,
  hoi_TieuThu_VL: 1117,
  hoi_TieuThu_BL: 373,
  solar_TieuThu_VL: 101285,
  solar_TieuThu_BL: 105329,

  tongNhanVien: 2928,
  daDiemDanh: 599,
  chuaDiemDanh: 2329,

  diemDanh_BoPhan: [
    {
      deptCode: "GD",
      tenBoPhan: "Ban Tổng Giám Đốc",
      sttPrintRep: 0,
      tongNhanVien: 3,
      daDiemDanh: 0,
      chuaDiemDanh: 3,
    },
    {
      deptCode: "KH",
      tenBoPhan: "Phòng Kế hoạch - Kinh Doanh Xuất nhập khẩu",
      sttPrintRep: 1,
      tongNhanVien: 108,
      daDiemDanh: 72,
      chuaDiemDanh: 36,
    },
    {
      deptCode: "",
      tenBoPhan: null,
      sttPrintRep: null,
      tongNhanVien: 5,
      daDiemDanh: 0,
      chuaDiemDanh: 5,
    },
  ],
};

describe("mapTaiSanDashboard", () => {
  const payload = mapTaiSanDashboard(RAW);

  it("đọc đúng nhóm field sL_* (chữ L hoa) cho bốn ô số lớn", () => {
    expect(payload.devices).toEqual({
      machines: 7673,
      it: 640,
      camera: 500,
    });
    expect(payload.attendance.checkedIn).toBe(599);
    expect(payload.attendance.total).toBe(2928);
  });

  it("dựng 7 loại CNTT, sắp giảm dần và giữ tổng của server", () => {
    expect(payload.itStructure.items.map((item) => item.value)).toEqual([
      277, 195, 56, 50, 34, 22, 6,
    ]);
    // Tổng lấy nguyên sL_CNTT (server cộng sẵn) và KHÔNG gồm camera.
    expect(payload.itStructure.total).toBe(640);
    expect(payload.itStructure.items).toHaveLength(7);
    expect(payload.itStructure.items.some((item) => item.key === "camera")).toBe(
      false,
    );
  });

  it("in đúng kỳ tiêu thụ nhận được", () => {
    expect(payload.period).toEqual({ month: 7, year: 2026 });
    expect(payload.updatedAt).toBe("2026-08-04T14:57:44.32");
  });

  it("cộng tổng tiêu thụ theo hai nhà máy", () => {
    const electricity = payload.utilities.items.find(
      (item) => item.key === "electricity",
    );

    expect(payload.utilities.items.map((item) => item.key)).toEqual([
      "electricity",
      "water",
      "steam",
      "solar",
    ]);
    expect(electricity?.total).toBe(705420 + 453587);
    expect(electricity?.vinhLoc).toBe(705420);
    expect(electricity?.benLuc).toBe(453587);
  });

  it("giữ null của tiêu thụ chứ không đổi thành 0", () => {
    const mapped = mapTaiSanDashboard({
      ...RAW,
      hoi_TieuThu_VL: null,
      hoi_TieuThu_BL: null,
      nuoc_TieuThu_BL: null,
    });
    const steam = mapped.utilities.items.find((item) => item.key === "steam");
    const water = mapped.utilities.items.find((item) => item.key === "water");

    expect(steam?.total).toBeNull();
    expect(steam?.vinhLoc).toBeNull();
    // Một bên có số thì tổng vẫn tính được, bên kia mới là "—".
    expect(water?.total).toBe(37566);
    expect(water?.benLuc).toBeNull();
  });

  it("giữ null của điểm danh khi không nối được Bravo8", () => {
    const mapped = mapTaiSanDashboard({
      ...RAW,
      tongNhanVien: null,
      daDiemDanh: null,
      chuaDiemDanh: null,
      diemDanh_BoPhan: [],
    });

    expect(mapped.attendance.total).toBeNull();
    expect(mapped.attendance.checkedIn).toBeNull();
    expect(mapped.attendance.departments).toEqual([]);
    // Nhóm đếm thiết bị vẫn có số — mất Bravo8 không làm mất cả màn hình.
    expect(mapped.devices.machines).toBe(7673);
  });

  it("giữ nguyên thứ tự bộ phận và đặt tên cho dòng chưa gán bộ phận", () => {
    expect(payload.attendance.departments.map((dept) => dept.name)).toEqual([
      "Ban Tổng Giám Đốc",
      "Phòng Kế hoạch - Kinh Doanh Xuất nhập khẩu",
      "Chưa gán bộ phận",
    ]);
    // Bỏ dòng cuối là tổng theo bộ phận thiếu 5 người so với tổng công ty.
    const unassigned = payload.attendance.departments[2];

    expect(unassigned.code).toBeNull();
    expect(unassigned.total).toBe(5);
    // deptCode rỗng vẫn phải có khoá riêng để list không trùng key.
    expect(
      new Set(payload.attendance.departments.map((dept) => dept.key)).size,
    ).toBe(3);
  });

  it("không tự khai viewPermission cho khối nào", () => {
    // Quyền của khối số liệu do BE quyết. API hiện không trả viewPermission nên
    // các khối này hiện cho mọi tài khoản đăng nhập được; mapper tự gán mã là
    // app tự chặn thay BE, đúng thứ đã bỏ.
    expect(payload.utilities.viewPermission).toBeUndefined();
    expect(payload.attendance.viewPermission).toBeUndefined();
    expect(payload.itStructure.viewPermission).toBeUndefined();
  });
});

/** JSON mẫu của `MayMoc/dashboard` trong tài liệu BE, đã cắt bớt cho ngắn. */
const MAY_MOC_RAW: MayMocDashboardRaw = {
  tongSoLuong: 5578,
  tongGiaTri: 486320000000,

  coCau_DonVi: [
    {
      tenDonVi: "Xưởng Chế Biến Thực Phẩm Đông Lạnh",
      soLuong: 1420,
      giaTri: 132500000000,
    },
    { tenDonVi: "Xưởng Gia Vị", soLuong: 986, giaTri: 88300000000 },
    { tenDonVi: "  ", soLuong: 12, giaTri: 0 },
  ],

  tangTruong_Thang: [
    {
      nam: 2025,
      thang: 9,
      soLuong: 12,
      giaTri: 820000000,
      soLuong_LuyKe: 5301,
      giaTri_LuyKe: 458100000000,
      nhan: "09/2025",
      nhanNgan: "09/25",
    },
    {
      nam: 2025,
      thang: 10,
      soLuong: 0,
      giaTri: 0,
      soLuong_LuyKe: 5301,
      giaTri_LuyKe: 458100000000,
      nhan: null,
      nhanNgan: null,
    },
    {
      nam: 2026,
      thang: 8,
      soLuong: 34,
      giaTri: 2650000000,
      soLuong_LuyKe: 5578,
      giaTri_LuyKe: 486320000000,
      nhan: "08/2026",
      nhanNgan: "08/26",
    },
  ],

  tienTe_KhongQuyDoiDuoc: [],
};

describe("mapMayMocDashboard", () => {
  const payload = mapMayMocDashboard(MAY_MOC_RAW);

  it("giữ tổng của server và giữ nguyên thứ tự đơn vị nhận được", () => {
    expect(payload.totalQuantity).toBe(5578);
    expect(payload.totalValue).toBe(486320000000);
    expect(payload.units.map((unit) => unit.quantity)).toEqual([1420, 986, 12]);
    // deptCode/tên rỗng vẫn phải có nhãn đọc được, không để dòng trắng.
    expect(payload.units[2].name).toBe("Chưa gán đơn vị");
    expect(new Set(payload.units.map((unit) => unit.key)).size).toBe(3);
  });

  it("lấy luỹ kế server tính sẵn, không tự cộng dồn lại từ số phát sinh", () => {
    // Tự cộng 12 + 0 + 34 sẽ ra 46 — thiếu hẳn số dư đầu kỳ 5.289 máy.
    expect(payload.growth.map((point) => point.cumulativeQuantity)).toEqual([
      5301, 5301, 5578,
    ]);
    // Mốc cuối của chuỗi luỹ kế đúng bằng tongSoLuong.
    expect(payload.growth[payload.growth.length - 1].cumulativeQuantity).toBe(
      payload.totalQuantity,
    );
    // Tháng không phát sinh máy nào vẫn giữ mốc với soLuong = 0.
    expect(payload.growth[1].quantity).toBe(0);
  });

  it("thiếu nhãn của server thì tự dựng từ thang/nam", () => {
    expect(payload.growth[0].label).toBe("09/2025");
    expect(payload.growth[0].shortLabel).toBe("09/25");
    expect(payload.growth[1].label).toBe("10/2025");
    expect(payload.growth[1].shortLabel).toBe("10/25");
  });

  it("mảng tỷ giá rỗng là bình thường, có phần tử thì giữ để view cảnh báo", () => {
    expect(payload.missingRateCurrencies).toEqual([]);
    expect(
      mapMayMocDashboard({
        ...MAY_MOC_RAW,
        tienTe_KhongQuyDoiDuoc: ["USD", " EUR ", ""],
      }).missingRateCurrencies,
    ).toEqual(["USD", "EUR"]);
  });

  it("data rỗng phần nào thì phần đó rỗng, không làm hỏng cả payload", () => {
    const empty = mapMayMocDashboard({
      tongSoLuong: 0,
      tongGiaTri: 0,
      coCau_DonVi: null,
      tangTruong_Thang: null,
      tienTe_KhongQuyDoiDuoc: null,
    });

    expect(empty.units).toEqual([]);
    expect(empty.growth).toEqual([]);
    expect(empty.missingRateCurrencies).toEqual([]);
  });
});
