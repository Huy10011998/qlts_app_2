import type {
  MayMocDashboardMonthRaw,
  MayMocDashboardRaw,
  MayMocDashboardUnitRaw,
  TaiSanDashboardDeptRaw,
  TaiSanDashboardRaw,
} from "../../../services/data/dashboardApi";

export const HOME_MEETING_INFO = {
  meetingId: "meeting-2026",
  meetingTitle: "Đại hội cổ đông thường niên 2026",
  meetingDate: "05/05/2026",
  meetingTime: "08:30",
  meetingVenue: "Hội trường tầng 1",
  totalShareholders: 220,
};

type HomeDashboardBlock<T> = T & { viewPermission?: string };

/** Một loại thiết bị trong khối CƠ CẤU THIẾT BỊ CNTT. */
export type HomeDashboardItCategory = {
  key: string;
  label: string;
  value: number;
};

/** Một đại lượng tiêu thụ, chia theo hai nhà máy. */
export type HomeDashboardUtility = {
  key: string;
  label: string;
  iconName: string;
  unit: string;
  /** Số lẻ khi hiển thị. Tất cả đại lượng hiện tại đều làm tròn về số nguyên. */
  decimals?: number;
  /** Vĩnh Lộc. null = kỳ đó chưa chốt chỉ số, KHÁC 0. */
  vinhLoc: number | null;
  /** Bến Lức. */
  benLuc: number | null;
  /** VL + BL, null khi cả hai đều null. */
  total: number | null;
};

/** Một dòng trong khối điểm danh, tương ứng một bộ phận Bravo8. */
export type HomeDashboardDepartment = {
  /** Khoá cho list — deptCode rỗng (nhân viên chưa gán bộ phận) vẫn cần khoá. */
  key: string;
  /** null/rỗng nghĩa là nhân viên chưa được gán bộ phận. */
  code: string | null;
  name: string;
  total: number;
  checkedIn: number;
  notCheckedIn: number;
};

export type HomeDashboardPayload = {
  /** Kỳ tiêu thụ = THÁNG TRƯỚC, do SQL tự quyết. In đúng số nhận được. */
  period: { month: number; year: number };
  /** Đếm thiết bị — nhóm này server luôn có số. */
  devices: {
    machines: number;
    /** Tổng 7 loại CNTT, KHÔNG gồm camera. */
    it: number;
    camera: number;
  };
  itStructure: HomeDashboardBlock<{
    total: number;
    /** Đã sắp giảm dần theo số lượng. */
    items: HomeDashboardItCategory[];
  }>;
  utilities: HomeDashboardBlock<{
    items: HomeDashboardUtility[];
  }>;
  attendance: HomeDashboardBlock<{
    /** null = không kết nối được hệ thống nhân sự Bravo8. */
    total: number | null;
    checkedIn: number | null;
    notCheckedIn: number | null;
    /** Giữ NGUYÊN thứ tự nhận được (đã sắp theo sttPrintRep). */
    departments: HomeDashboardDepartment[];
  }>;
  /** ISO string — giờ SERVER lúc chạy proc, không phải giờ máy điện thoại. */
  updatedAt: string;
};

/** Một đơn vị (xưởng/phòng/kho) trong khối CƠ CẤU MÁY MÓC. */
export type HomeMachineUnit = {
  key: string;
  name: string;
  quantity: number;
  /** VND. View mới chia 1 tỷ khi hiển thị. */
  value: number;
};

/** Một mốc tháng của biểu đồ tăng trưởng luỹ kế. */
export type HomeMachineGrowthPoint = {
  key: string;
  /** "MM/yyyy" — dùng cho tooltip. */
  label: string;
  /** "MM/yy" — dùng cho trục hoành. */
  shortLabel: string;
  /** Phát sinh trong tháng đó. */
  quantity: number;
  value: number;
  /** Luỹ kế server tính sẵn (đã gồm số dư đầu kỳ) — KHÔNG tự cộng dồn lại. */
  cumulativeQuantity: number;
  cumulativeValue: number;
};

export type HomeMachineDashboardPayload = {
  /** Chỉ đếm máy đã gán vị trí — KHÁC `devices.machines`, đừng ép về một số. */
  totalQuantity: number;
  /** VND. */
  totalValue: number;
  /** Giữ NGUYÊN thứ tự nhận được (server đã sắp giảm dần theo số lượng). */
  units: HomeMachineUnit[];
  /** 12 mốc, giữ nguyên thứ tự cũ -> mới. */
  growth: HomeMachineGrowthPoint[];
  /**
   * Mã tiền tệ không lấy được tỷ giá. Có phần tử nghĩa là TỔNG GIÁ TRỊ đang
   * thiếu phần tài sản ghi theo các loại tiền đó (số lượng vẫn đúng).
   */
  missingRateCurrencies: string[];
};

const IT_CATEGORY_LABELS: {
  key: string;
  label: string;
  field: keyof TaiSanDashboardRaw;
}[] = [
  { key: "may-tinh", label: "Máy tính", field: "sL_MayTinh" },
  { key: "thiet-bi-mang", label: "Thiết bị mạng", field: "sL_ThietBiMang" },
  { key: "may-in", label: "Máy in", field: "sL_MayIn" },
  {
    key: "thiet-bi-cntt",
    label: "Thiết bị CNTT khác",
    field: "sL_ThietBiCNTT",
  },
  { key: "dien-thoai", label: "Điện thoại", field: "sL_DienThoai" },
  {
    key: "may-quet-ma-vach",
    label: "Máy quét mã vạch",
    field: "sL_MayQuetMaVach",
  },
  { key: "server", label: "Server", field: "sL_Server" },
];

const toNumber = (value: unknown) =>
  typeof value === "number" && Number.isFinite(value) ? value : 0;

/** null KHÁC 0: chỉ giữ số thật, mọi thứ khác về null để view hiện "—". */
const toNullableNumber = (value: unknown) =>
  typeof value === "number" && Number.isFinite(value) ? value : null;

const sumUtility = (vinhLoc: number | null, benLuc: number | null) => {
  if (vinhLoc == null && benLuc == null) return null;

  return (vinhLoc ?? 0) + (benLuc ?? 0);
};

const mapDepartment = (
  dept: TaiSanDashboardDeptRaw,
  index: number,
): HomeDashboardDepartment => {
  const code = dept.deptCode?.trim() ? dept.deptCode.trim() : null;

  return {
    // deptCode có thể rỗng (dòng "chưa gán bộ phận") nên phải kèm index để khoá
    // luôn duy nhất.
    key: `${code ?? "khong-bo-phan"}-${index}`,
    code,
    // Bỏ dòng này là tổng theo bộ phận thiếu người so với tổng công ty.
    name: code ? dept.tenBoPhan?.trim() || code : "Chưa gán bộ phận",
    total: toNumber(dept.tongNhanVien),
    checkedIn: toNumber(dept.daDiemDanh),
    notCheckedIn: toNumber(dept.chuaDiemDanh),
  };
};

const mapMachineUnit = (
  unit: MayMocDashboardUnitRaw,
  index: number,
): HomeMachineUnit => {
  const name = unit.tenDonVi?.trim();

  return {
    // Hai site trùng tên hiển thị đã được server gộp làm một dòng, nhưng khoá
    // vẫn kèm index để list không bao giờ trùng key.
    key: `${name || "khong-don-vi"}-${index}`,
    name: name || "Chưa gán đơn vị",
    quantity: toNumber(unit.soLuong),
    value: toNumber(unit.giaTri),
  };
};

/** Nhãn dự phòng khi server không trả `nhan`/`nhanNgan`. */
const buildMonthLabels = (month: number, year: number) => {
  const paddedMonth = String(month).padStart(2, "0");

  return {
    label: `${paddedMonth}/${year}`,
    shortLabel: `${paddedMonth}/${String(year).slice(-2)}`,
  };
};

const mapGrowthPoint = (
  point: MayMocDashboardMonthRaw,
  index: number,
): HomeMachineGrowthPoint => {
  const month = toNumber(point.thang);
  const year = toNumber(point.nam);
  const fallback = buildMonthLabels(month, year);

  return {
    key: `${year}-${month}-${index}`,
    label: point.nhan?.trim() || fallback.label,
    shortLabel: point.nhanNgan?.trim() || fallback.shortLabel,
    quantity: toNumber(point.soLuong),
    value: toNumber(point.giaTri),
    // Luỹ kế của server đã gồm số dư đầu kỳ (máy có ngày trước cửa sổ 12 tháng
    // và máy chưa ghi ngày sử dụng/ngày nhận). Tự cộng lại từ `soLuong` sẽ ra
    // đường thấp hơn hẳn và trông như mất dữ liệu.
    cumulativeQuantity: toNumber(point.soLuong_LuyKe),
    cumulativeValue: toNumber(point.giaTri_LuyKe),
  };
};

export const mapMayMocDashboard = (
  raw: MayMocDashboardRaw,
): HomeMachineDashboardPayload => ({
  totalQuantity: toNumber(raw.tongSoLuong),
  totalValue: toNumber(raw.tongGiaTri),
  units: (raw.coCau_DonVi ?? []).map(mapMachineUnit),
  growth: (raw.tangTruong_Thang ?? []).map(mapGrowthPoint),
  missingRateCurrencies: (raw.tienTe_KhongQuyDoiDuoc ?? [])
    .map((currency) => (typeof currency === "string" ? currency.trim() : ""))
    .filter((currency) => currency.length > 0),
});

export const mapTaiSanDashboard = (
  raw: TaiSanDashboardRaw,
): HomeDashboardPayload => {
  const itTotal = toNumber(raw.sL_CNTT);
  const dienVL = toNullableNumber(raw.dien_TieuThu_VL);
  const dienBL = toNullableNumber(raw.dien_TieuThu_BL);
  const nuocVL = toNullableNumber(raw.nuoc_TieuThu_VL);
  const nuocBL = toNullableNumber(raw.nuoc_TieuThu_BL);
  const hoiVL = toNullableNumber(raw.hoi_TieuThu_VL);
  const hoiBL = toNullableNumber(raw.hoi_TieuThu_BL);
  const solarVL = toNullableNumber(raw.solar_TieuThu_VL);
  const solarBL = toNullableNumber(raw.solar_TieuThu_BL);

  return {
    period: { month: toNumber(raw.thang), year: toNumber(raw.nam) },
    devices: {
      machines: toNumber(raw.sL_MayMoc),
      it: itTotal,
      camera: toNumber(raw.sL_Camera),
    },
    itStructure: {
      total: itTotal,
      // Sắp giảm dần: danh sách trên điện thoại đọc theo tỷ trọng, không theo
      // thứ tự khai báo. Server không sắp sẵn nhóm này.
      items: IT_CATEGORY_LABELS.map(({ key, label, field }) => ({
        key,
        label,
        value: toNumber(raw[field]),
      })).sort((left, right) => right.value - left.value),
    },
    utilities: {
      items: [
        {
          key: "electricity",
          label: "Điện",
          iconName: "flash-outline",
          unit: "kWh",
          vinhLoc: dienVL,
          benLuc: dienBL,
          total: sumUtility(dienVL, dienBL),
        },
        {
          key: "water",
          label: "Nước",
          iconName: "water-outline",
          unit: "m³",
          vinhLoc: nuocVL,
          benLuc: nuocBL,
          total: sumUtility(nuocVL, nuocBL),
        },
        {
          key: "steam",
          label: "Hơi",
          iconName: "thermometer-outline",
          unit: "tấn",
          vinhLoc: hoiVL,
          benLuc: hoiBL,
          total: sumUtility(hoiVL, hoiBL),
        },
        {
          key: "solar",
          label: "Điện mặt trời",
          iconName: "sunny-outline",
          unit: "kWh",
          vinhLoc: solarVL,
          benLuc: solarBL,
          total: sumUtility(solarVL, solarBL),
        },
      ],
    },
    attendance: {
      total: toNullableNumber(raw.tongNhanVien),
      checkedIn: toNullableNumber(raw.daDiemDanh),
      notCheckedIn: toNullableNumber(raw.chuaDiemDanh),
      departments: (raw.diemDanh_BoPhan ?? []).map(mapDepartment),
    },
    updatedAt: raw.ngayCapNhat,
  };
};
