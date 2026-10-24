import { getMatchedKey } from "../../utils/Helper";

const QR_BASE_URL_PREFIX = "https://os.cholimexfood.com.vn/taisan";
const QR_BASE_URL_PREFIX_MM = "https://os.cholimexfood.com.vn/taisan/MayMoc";
const QR_BASE_URL_PREFIX_TL =
  "https://os.cholimexfood.com.vn/taisan/NoiDia_TuLanh";
const QR_BASE_URL_PREFIX_REGEX = new RegExp(
  `^${QR_BASE_URL_PREFIX.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?=/|$)`,
  "i",
);

/**
 * Tên class nằm thẳng trong đường dẫn API (`/{nameClass}/get-details`), nên chỉ
 * có chữ, số và gạch dưới. Chặn ở đây để mã QR bất kỳ có đúng hai đoạn — ví dụ
 * một link web "https://abc.vn" tách ra thành "https:" và "abc.vn" — bị báo là
 * "không phải tem" thay vì gọi API rồi báo "không tìm thấy tài sản".
 */
const NAME_CLASS_PATTERN = /^[A-Za-z_][A-Za-z0-9_]*$/;

export const normalizeQrScanValue = (value: string) => {
  const trimmedValue = value.trim();
  const isExternalQrUrl = QR_BASE_URL_PREFIX_REGEX.test(trimmedValue);

  return {
    isExternalQrUrl,
    scanPath: isExternalQrUrl
      ? trimmedValue
          .replace(QR_BASE_URL_PREFIX_MM, QR_BASE_URL_PREFIX_TL)
          .replace(QR_BASE_URL_PREFIX_REGEX, "")
      : trimmedValue,
  };
};

export type AssetQrTarget = {
  nameClass: string;
  idOrQr: string;
  /** Tem in từ web (link `.../taisan/...`): đoạn cuối là mã QR, không phải id. */
  isExternalQrUrl: boolean;
};

/**
 * Đọc mã vừa quét thành class + id/mã QR của tài sản. `null` nghĩa là mã này
 * không phải tem tài sản — không cần gọi API mới biết.
 */
export const parseAssetQr = (raw: string): AssetQrTarget | null => {
  const { isExternalQrUrl, scanPath } = normalizeQrScanValue(raw);
  if (!scanPath) return null;

  const parts = scanPath.replace(/^\//, "").split("/").filter(Boolean);
  if (parts.length !== 2) return null;

  const [nameClass, idOrQr] = parts;
  if (!NAME_CLASS_PATTERN.test(nameClass)) return null;

  return { nameClass, idOrQr, isExternalQrUrl };
};

/** `get-details` trả rỗng (null, `{}`) khi không còn bản ghi ứng với mã. */
export const isEmptyQrItemData = (itemData: unknown) =>
  !itemData ||
  (typeof itemData === "object" &&
    !Array.isArray(itemData) &&
    Object.keys(itemData).length === 0);

export const getDetailIdFromItemData = (itemData: any, fallbackId: string) => {
  const detailItem = Array.isArray(itemData) ? itemData[0] : itemData;

  if (detailItem && typeof detailItem === "object") {
    const matchedIdKey = getMatchedKey(detailItem, "id");
    const detailId = matchedIdKey ? detailItem[matchedIdKey] : undefined;

    if (
      detailId !== null &&
      detailId !== undefined &&
      String(detailId).trim()
    ) {
      return String(detailId);
    }
  }

  return fallbackId;
};

export type QrScanFailure = "notAssetTag" | "notFound" | "network";

/**
 * Câu báo cho từng kiểu quét hỏng. Tách ba kiểu vì cách xử lý của người dùng
 * khác nhau: quét nhầm mã khác thì quét lại tem, tài sản không còn thì báo
 * quản trị, rớt mạng thì thử lại. Trước đây cả ba (trừ rớt mạng) cùng là "Mã QR
 * không hợp lệ" nên không biết nên làm gì.
 */
export const getQrScanFailureAlert = (
  failure: QrScanFailure,
): { title: string; message: string } => {
  switch (failure) {
    case "notAssetTag":
      return {
        title: "Mã này không phải tem tài sản",
        message: "Hãy quét mã QR in trên tem dán ở tài sản.",
      };
    case "notFound":
      return {
        title: "Không tìm thấy tài sản (có thể đã bị xoá)",
        message: "",
      };
    case "network":
      return {
        title: "Lỗi kết nối",
        message:
          "Không thể tải thông tin mã QR. Vui lòng kiểm tra kết nối mạng rồi thử lại.",
      };
  }
};
