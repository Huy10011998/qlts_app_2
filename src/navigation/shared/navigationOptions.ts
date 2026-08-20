import type { NativeStackNavigationOptions } from "@react-navigation/native-stack";
import { capitalizeFirstLetter } from "../../utils/helpers/string";
import { HeaderDetails } from "../../components/header/HeaderDetails";
import type { GuideTopicId } from "../../screens/Guide/shared/guideTypes";

export const headerWithBack = HeaderDetails({ showBackButton: true });

/**
 * Header có nút dấu hỏi mở chủ đề hướng dẫn của màn đang xem.
 *
 * Kết quả được nhớ theo `topicId`: `options` của Stack.Screen được đánh giá lại
 * mỗi lần render, còn `HeaderDetails` sinh một hàm `header` mới mỗi lần gọi — trả
 * về object mới liên tục thì header bị dựng lại thay vì render lại.
 */
const helpHeaderCache = new Map<string, NativeStackNavigationOptions>();

const cachedHelpHeader = (
  key: string,
  build: () => NativeStackNavigationOptions,
): NativeStackNavigationOptions => {
  const cached = helpHeaderCache.get(key);
  if (cached) return cached;

  const options = build();
  helpHeaderCache.set(key, options);

  return options;
};

export const headerWithBackAndHelp = (topicId: GuideTopicId) =>
  cachedHelpHeader(`back:${topicId}`, () =>
    HeaderDetails({ showBackButton: true, helpTopicId: topicId }),
  );

/**
 * Màn gốc của một tab: cùng header đỏ như các màn chi tiết nhưng không có nút
 * quay lại, vì không có gì phía dưới nó trong stack.
 */
export const headerWithoutBackAndHelp = (topicId: GuideTopicId) =>
  cachedHelpHeader(`no-back:${topicId}`, () =>
    HeaderDetails({ showBackButton: false, helpTopicId: topicId }),
  );

/**
 * Các màn danh sách tài sản: thêm nút quét QR ở góc phải. Đứng trước thiết bị thì
 * quét mã ra ngay bản ghi, nhanh hơn dò cây menu rồi lọc danh sách.
 */
export const headerWithBackScanAndHelp = (topicId: GuideTopicId) =>
  cachedHelpHeader(`back-scan:${topicId}`, () =>
    HeaderDetails({
      showBackButton: true,
      showQrScannerButton: true,
      helpTopicId: topicId,
    }),
  );

export const getScreenTitle = (
  routeTitle: string | undefined,
  fallback: string,
) => (routeTitle ? capitalizeFirstLetter(routeTitle) : fallback);
