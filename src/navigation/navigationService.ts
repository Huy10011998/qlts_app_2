import { createNavigationContainerRef } from "@react-navigation/native";
import type { RootStackParamList } from "../types/index";
import { warn } from "../utils/Logger";

/**
 * Ref cấp module tới NavigationContainer.
 *
 * Cần thiết vì handler của push notification chạy ngoài cây React (background
 * handler, listener đăng ký ở AppBootstrap) nên không dùng được useNavigation.
 * App.tsx phải truyền ref này vào <NavigationContainer ref={navigationRef} />.
 */
export const navigationRef = createNavigationContainerRef<RootStackParamList>();

export const isNavigationReady = () => navigationRef.isReady();

/**
 * Điều hướng bằng ref. Trả về false nếu container chưa mount — caller nên giữ
 * lại yêu cầu và thử lại sau (xem pendingTap.ts).
 */
export const navigateFromRef = (
  screen: string,
  params?: Record<string, unknown>,
): boolean => {
  if (!navigationRef.isReady()) return false;

  try {
    // Tên route đến từ payload của BE nên không suy kiểu tĩnh được. Tính hợp lệ
    // đã được kiểm bằng whitelist trong pushRoutes.ts trước khi gọi tới đây.
    const navigate = navigationRef.navigate as (
      name: string,
      params?: Record<string, unknown>,
    ) => void;

    navigate(screen, params);
    return true;
  } catch (err) {
    warn("[Navigation] Điều hướng từ ref thất bại", { screen, err });
    return false;
  }
};
