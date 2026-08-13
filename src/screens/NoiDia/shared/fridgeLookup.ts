import { getDetails, getDetailsQr, getList } from "../../../services";
import { getMatchedKey } from "../../../utils/Helper";
import { PUBLIC_ASSET_BASE_URL } from "../../../config/index";
import { displayValue } from "./noiDiaFormat";

export const FRIDGE_NAME_CLASS = "NoiDia_TuLanh";

/**
 * Tủ lạnh rút gọn — đủ để dựng header và bảng "vị trí hiện tại" của cả hai
 * luồng xác nhận vị trí và trung chuyển, không kéo theo toàn bộ record chi tiết.
 */
export type FridgeSummary = {
  id: number;
  ma: string;
  ten: string;
  serialNumber: string;
  /** "Mã - Tên", đúng dạng `id_NoiDia_TuLanh_MoTa` mà API lịch sử trả về. */
  label: string;
  mien: string;
  vungMien: string;
  khuVuc: string;
  nhaPhanPhoi: string;
  khachHang: string;
  /**
   * Id khách hàng đang giữ tủ — cần để cập nhật mốc toạ độ khách hàng ngay từ
   * màn lịch sử xác nhận vị trí. `0` khi record không có, phía gọi phải tự ẩn
   * thao tác.
   */
  idKhachHang: number;
};

const readField = (raw: Record<string, any>, name: string) => {
  const key = getMatchedKey(raw, name);
  const value = key ? raw[key] : undefined;

  return value === null || value === undefined ? "" : String(value).trim();
};

/** Bảng 5 cấp vị trí, dùng chung cho màn xác nhận và màn xác nhận trung chuyển. */
export const getFridgeLocationRows = (fridge: FridgeSummary) => [
  { label: "Miền", value: displayValue(fridge.mien) },
  { label: "Vùng miền", value: displayValue(fridge.vungMien) },
  { label: "Khu vực", value: displayValue(fridge.khuVuc) },
  { label: "Nhà phân phối", value: displayValue(fridge.nhaPhanPhoi) },
  { label: "Khách hàng", value: displayValue(fridge.khachHang) },
];

export const toFridgeSummary = (raw: any): FridgeSummary | null => {
  const item = Array.isArray(raw) ? raw[0] : raw;

  if (!item || typeof item !== "object") return null;

  const id = Number(readField(item, "id"));
  if (!Number.isFinite(id) || id <= 0) return null;

  const ma = readField(item, "ma");
  const ten = readField(item, "ten");
  const idKhachHang = Number(readField(item, "id_NoiDia_KhachHang"));

  return {
    id,
    ma,
    ten,
    serialNumber: readField(item, "serialNumber"),
    label: [ma, ten].filter(Boolean).join(" - ") || String(id),
    mien: readField(item, "id_NoiDia_Mien_MoTa"),
    vungMien: readField(item, "id_NoiDia_VungMien_MoTa"),
    khuVuc: readField(item, "id_NoiDia_KhuVuc_MoTa"),
    nhaPhanPhoi: readField(item, "id_NoiDia_NhaPhanPhoi_MoTa"),
    khachHang: readField(item, "id_NoiDia_KhachHang_MoTa"),
    idKhachHang:
      Number.isFinite(idKhachHang) && idKhachHang > 0 ? idKhachHang : 0,
  };
};

const QR_URL_PREFIX = `${PUBLIC_ASSET_BASE_URL}/taisan`;
const QR_URL_PREFIX_REGEX = new RegExp(
  `^${QR_URL_PREFIX.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?=/|$)`,
  "i",
);

// QR dán trên tủ lạnh được in dưới nhánh /MayMoc, nên cả hai nhánh đều phải quy
// về NoiDia_TuLanh — giống cách màn quét QR chung đang xử lý.
const FRIDGE_QR_CLASSES = new Set(["noidia_tulanh", "maymoc"]);

type ParsedFridgeQr = {
  /** Giá trị QR (quét từ tem) hoặc id (mã nhập tay dạng đường dẫn). */
  value: string;
  isQrValue: boolean;
};

export const parseFridgeQr = (raw: string): ParsedFridgeQr | null => {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  const isExternalUrl = QR_URL_PREFIX_REGEX.test(trimmed);
  const scanPath = isExternalUrl
    ? trimmed.replace(QR_URL_PREFIX_REGEX, "")
    : trimmed;

  const parts = scanPath.replace(/^\//, "").split("/").filter(Boolean);
  if (parts.length !== 2) return null;

  const [nameClass, value] = parts;
  if (!FRIDGE_QR_CLASSES.has(nameClass.toLowerCase())) return null;

  return { value, isQrValue: isExternalUrl };
};

/** Đọc chi tiết tủ lạnh từ một giá trị QR đã quét. `null` = QR không hợp lệ. */
export const getFridgeFromQr = async (raw: string) => {
  const parsed = parseFridgeQr(raw);
  if (!parsed) return null;

  const response = parsed.isQrValue
    ? await getDetailsQr(FRIDGE_NAME_CLASS, `QR:${parsed.value}`)
    : await getDetails(FRIDGE_NAME_CLASS, parsed.value);

  return toFridgeSummary(response?.data);
};

const SEARCH_PAGE_SIZE = 30;

/** Tìm tủ theo số seri / mã / tên — cho ô "nhập seri thủ công". */
export const searchFridges = async (searchText: string) => {
  const response = await getList(
    FRIDGE_NAME_CLASS,
    "id desc",
    SEARCH_PAGE_SIZE,
    0,
    searchText.trim(),
    [],
    [],
  );

  const items: Record<string, any>[] = response?.data?.items ?? [];

  return items
    .map(toFridgeSummary)
    .filter((fridge): fridge is FridgeSummary => Boolean(fridge));
};
