import { capitalizeFirstLetter } from "../../utils/helpers/string";
import { HeaderDetails } from "../../components/header/HeaderDetails";

export const headerWithBack = HeaderDetails({ showBackButton: true });

// Màn gốc của một tab: cùng header đỏ như các màn chi tiết nhưng không có nút
// quay lại, vì không có gì phía dưới nó trong stack.
export const headerWithoutBack = HeaderDetails({ showBackButton: false });

// Các màn danh sách tài sản: thêm nút quét QR ở góc phải. Đứng trước thiết bị
// thì quét mã ra ngay bản ghi, nhanh hơn dò cây menu rồi lọc danh sách.
export const headerWithBackAndScan = HeaderDetails({
  showBackButton: true,
  showQrScannerButton: true,
});

export const getScreenTitle = (
  routeTitle: string | undefined,
  fallback: string,
) => (routeTitle ? capitalizeFirstLetter(routeTitle) : fallback);
