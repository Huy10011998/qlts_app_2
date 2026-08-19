import { useEffect } from "react";
import { useNavigation, useRoute } from "@react-navigation/native";

/**
 * Đổi tab theo param `activeTab`.
 *
 * `useDetailViewState` chỉ dùng param làm giá trị KHỞI TẠO, nên màn chi tiết đã
 * mount rồi thì param mới không tự đổi tab được — ví dụ nút "bản ghi gốc" trên
 * header màn danh sách con pop về màn chi tiết đang đứng ở tab Chi tiết.
 *
 * Xoá param ngay sau khi áp: pop về lần nữa với cùng giá trị vẫn phải có tác
 * dụng, và người dùng tự đổi tab thì không bị kéo lại.
 */
export function useTabFromParams(applyTab: (tab: string) => void) {
  const route = useRoute();
  const navigation = useNavigation();
  const tabFromParams = (route.params as { activeTab?: string } | undefined)
    ?.activeTab;

  useEffect(() => {
    if (!tabFromParams) return;

    applyTab(tabFromParams);
    navigation.setParams({ activeTab: undefined } as never);
  }, [applyTab, navigation, tabFromParams]);
}
