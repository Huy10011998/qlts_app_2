import { useEffect, useState } from "react";
import { useIsFocused } from "@react-navigation/native";
import DeviceInfo from "react-native-device-info";
import { getStoreVersionInfo, StoreVersionInfo } from "../../../utils/AppVersion";

/**
 * Dò bản mới trên store mỗi lần vào màn. Màn Cài đặt chính dùng để báo "Đã có
 * phiên bản mới" ngay trên dòng Thông tin ứng dụng, màn Thông tin ứng dụng dùng
 * để hiện trạng thái và nút Cập nhật.
 */
export function useStoreVersionCheck() {
  const isFocused = useIsFocused();
  const [storeVersionInfo, setStoreVersionInfo] =
    useState<StoreVersionInfo | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [hasCheckFailed, setHasCheckFailed] = useState(false);

  useEffect(() => {
    if (!isFocused) return;

    let isCancelled = false;
    // Giữ kết quả lượt trước trong lúc dò lại — xem `resultLabel`.
    setIsChecking(true);

    getStoreVersionInfo()
      .then((versionInfo) => {
        if (isCancelled) return;
        setStoreVersionInfo(versionInfo);
        setHasCheckFailed(!versionInfo);
      })
      .catch(() => {
        if (isCancelled) return;
        setStoreVersionInfo(null);
        setHasCheckFailed(true);
      })
      .finally(() => {
        if (!isCancelled) setIsChecking(false);
      });

    return () => {
      isCancelled = true;
    };
  }, [isFocused]);

  const hasNewVersion = storeVersionInfo?.hasUpdate ?? false;
  /**
   * Bản không cài từ store (debug, sideload) thì Play không dò được — đó là
   * chuyện bình thường, ẩn hẳn dòng trạng thái thay vì hiện như một lỗi.
   */
  const shouldShowStatus = isChecking || !storeVersionInfo?.isCheckUnsupported;
  const hasResult = storeVersionInfo !== null || hasCheckFailed;
  const resultLabel = !hasResult
    ? null
    : hasNewVersion
    ? // Android không có số: Play In-App Updates chỉ trả versionCode.
      storeVersionInfo?.latestVersion
      ? `Đã có phiên bản ${storeVersionInfo.latestVersion}`
      : "Đã có phiên bản mới"
    : hasCheckFailed
    ? "Chưa thể kiểm tra phiên bản trên Store"
    : "Phiên bản mới nhất";
  const statusLabel = isChecking
    ? "Đang kiểm tra phiên bản..."
    : resultLabel ?? "";

  return {
    installedVersionLabel: `v${DeviceInfo.getVersion()}`,
    storeVersionInfo,
    isChecking,
    hasCheckFailed,
    hasNewVersion,
    shouldShowStatus,
    statusLabel,
    /**
     * Kết quả lượt dò gần nhất, không đổi sang "Đang kiểm tra" khi dò lại —
     * dòng tóm tắt ở màn chính dùng cái này để khỏi nháy mỗi lần quay lại.
     * null khi chưa có kết quả nào hoặc bản này không dò được (sideload).
     */
    resultLabel: storeVersionInfo?.isCheckUnsupported ? null : resultLabel,
  };
}
