import {
  CommonActions,
  createNavigationContainerRef,
  StackActions,
  type EventArg,
  type NavigationProp,
  type ParamListBase,
  type RouteProp,
} from "@react-navigation/native";
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

export type StackScreen = { route: string; params?: Record<string, unknown> };

/** Màn đang mở đúng là `screen`: so theo các khoá của `screen.params` (id chuỗi từ push = số). */
const isCurrentScreen = (screen: StackScreen) => {
  const current = navigationRef.getCurrentRoute();
  if (current?.name !== screen.route) return false;
  const currentParams = (current.params ?? {}) as Record<string, unknown>;
  return Object.entries(screen.params ?? {}).every(
    ([key, value]) => String(currentParams[key]) === String(value),
  );
};

/** Param tạm của màn vừa đẩy: các màn chờ chèn ngay DƯỚI nó khi nó trượt vào xong. */
export const INSERT_BELOW_PARAM = "__chenDuoi";

/**
 * Chồng các màn MỚI lên chỗ đang đứng — vd thông báo bình luận: chi tiết rồi
 * Bình luận. Không dùng navigate: đang ở một màn chi tiết cùng loại thì
 * navigate thay params của chính màn đó, back hết không còn về đúng chỗ cũ.
 * Đang mở sẵn một màn trong dãy thì chỉ chồng các màn sau nó.
 *
 * Chỉ trượt màn trên cùng; các màn dưới chèn sau (`insertBelowListeners`).
 * Đẩy cùng lúc thì iOS đặt ngay màn dưới (không hiệu ứng) rồi mới trượt màn
 * trên đè lên — trông như bị đẩy qua chi tiết rồi mới vào bình luận.
 */
export const pushScreensFromRef = (screens: StackScreen[]): boolean => {
  if (!navigationRef.isReady()) return false;

  let start = 0;
  screens.forEach((screen, index) => {
    if (isCurrentScreen(screen)) start = index + 1;
  });
  const rest = screens.slice(start);
  const top = rest.pop();
  if (!top) return true;

  try {
    navigationRef.dispatch(
      StackActions.push(
        top.route,
        rest.length ? { ...top.params, [INSERT_BELOW_PARAM]: rest } : top.params,
      ),
    );
    return true;
  } catch (err) {
    warn("[Navigation] Chồng màn từ ref thất bại", { screens, err });
    return false;
  }
};

/**
 * `screenListeners` của stack gốc: màn vừa trượt vào xong mà còn màn chờ chèn
 * dưới (`pushScreensFromRef`) thì chèn ngay dưới nó. Đổi dưới đỉnh stack nên
 * không có hiệu ứng, người dùng không thấy; back từ màn đó là về màn vừa chèn.
 * Back trước khi trượt xong thì thôi chèn.
 */
export const insertBelowListeners = ({
  navigation,
  route,
}: {
  navigation: NavigationProp<ParamListBase>;
  route: RouteProp<ParamListBase>;
}) => ({
  transitionEnd: (event: EventArg<"transitionEnd", false, { closing: boolean }>) => {
    if (event.data?.closing) return;
    const state = navigation.getState();
    const index = state.routes.findIndex((item) => item.key === route.key);
    const { [INSERT_BELOW_PARAM]: below, ...params } = (state.routes[index]?.params ??
      {}) as Record<string, unknown>;
    if (!Array.isArray(below) || !below.length) return;

    const inserted = (below as StackScreen[]).map((screen, offset) => ({
      key: `${screen.route}-${Date.now().toString(36)}-${offset}`,
      name: screen.route,
      params: screen.params,
    }));
    navigation.dispatch(
      CommonActions.reset({
        ...state,
        routes: [
          ...state.routes.slice(0, index),
          ...inserted,
          { ...state.routes[index], params },
          ...state.routes.slice(index + 1),
        ],
        index: state.index + inserted.length,
      }),
    );
  },
});
