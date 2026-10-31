import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
} from "react";
import {
  AccessibilityInfo,
  Animated,
  Easing,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";

/**
 * Thanh tab tự ẩn khi cuộn như Facebook (29/10, mới gắn cho Trang chủ): vuốt
 * đọc xuống thì viên thanh tab trượt khuất, kéo ngược lên một đoạn mới hiện lại.
 *
 * `progress` 0 = đang hiện, 1 = đã khuất; `ThemeAwareTabBar` và nút lên đầu
 * trang của Trang chủ trượt theo nó. Bật trình đọc màn hình (VoiceOver /
 * TalkBack) thì không bao giờ ẩn: người dùng đó cần thanh tab luôn có mặt.
 */
type TabBarAutoHide = {
  progress: Animated.Value;
  setHidden: (hidden: boolean) => void;
};

// Mặc định cho nơi dựng ngoài `Tabs` (test, màn mở từ stack gốc): luôn hiện.
export const TabBarAutoHideContext = createContext<TabBarAutoHide>({
  progress: new Animated.Value(0),
  setHidden: () => {},
});

export const useTabBarAutoHide = () => useContext(TabBarAutoHideContext);

export function TabBarAutoHideProvider({ children }: React.PropsWithChildren) {
  const progress = useRef(new Animated.Value(0)).current;
  const hiddenRef = useRef(false);
  const screenReaderRef = useRef(false);

  const animateTo = useCallback(
    (hidden: boolean) => {
      if (hiddenRef.current === hidden) return;

      hiddenRef.current = hidden;
      Animated.timing(progress, {
        toValue: hidden ? 1 : 0,
        duration: hidden ? 200 : 250,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
    },
    [progress],
  );

  const setHidden = useCallback(
    (hidden: boolean) => animateTo(hidden && !screenReaderRef.current),
    [animateTo],
  );

  useEffect(() => {
    const apply = (enabled: boolean) => {
      screenReaderRef.current = enabled;
      if (enabled) animateTo(false);
    };

    AccessibilityInfo.isScreenReaderEnabled().then(apply);
    const subscription = AccessibilityInfo.addEventListener(
      "screenReaderChanged",
      apply,
    );

    return () => subscription.remove();
  }, [animateTo]);

  const value = useMemo(() => ({ progress, setHidden }), [progress, setHidden]);

  return (
    <TabBarAutoHideContext.Provider value={value}>
      {children}
    </TabBarAutoHideContext.Provider>
  );
}

/** Đọc xuống liền một đoạn chừng này thì ẩn: chạm nhẹ không nháy. */
const HIDE_THRESHOLD = 12;
/**
 * Phải kéo ngược lên liền một đoạn dài chừng này mới hiện lại, như Facebook
 * (30/10). Ngưỡng ngắn thì trang nhích lên chút (buông tay, nảy) là thanh tab
 * bật ra rồi đọc tiếp lại ẩn, nháy liên tục.
 */
const SHOW_THRESHOLD = 100;
/** Gần đầu trang (kể cả lúc kéo làm mới, y âm) thì luôn hiện. */
const TOP_ZONE = 48;

/**
 * Trả về hàm `onScroll` cho ScrollView của màn: cuộn xuống quá ngưỡng thì ẩn
 * thanh tab, kéo lên quá ngưỡng (dài hơn) thì hiện. Ngưỡng tính từ điểm đổi
 * chiều gần nhất (`anchor`), không tính từ lần gọi trước — `onScroll` bắn từng
 * vài pt, so từng nhịp thì không bao giờ vượt ngưỡng.
 *
 * Rời màn (sang tab khác, mở màn con) thì trả thanh tab về hiện: màn khác không
 * biết nó đang ẩn, ẩn tiếp là người dùng mất đường bấm tab.
 */
export function useHideTabBarOnScroll() {
  const { setHidden } = useTabBarAutoHide();
  const hiddenRef = useRef(false);
  const anchorRef = useRef(0);
  const maxScrollRef = useRef<number | null>(null);

  const update = useCallback(
    (hidden: boolean) => {
      hiddenRef.current = hidden;
      setHidden(hidden);
    },
    [setHidden],
  );

  useFocusEffect(useCallback(() => () => update(false), [update]));

  return useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const { contentOffset, contentSize, layoutMeasurement } =
        event.nativeEvent;
      const maxScroll = Math.max(
        0,
        contentSize.height - layoutMeasurement.height,
      );
      // Phần nảy quá đầu/đáy (iOS) không tính là cuộn: kéo quá đáy rồi buông,
      // trang nảy về đáy — tính vào thì thành "vuốt lên" và thanh tab bật ra.
      const y = Math.min(Math.max(contentOffset.y, 0), maxScroll);
      const prevMaxScroll = maxScrollRef.current;
      maxScrollRef.current = maxScroll;

      if (y < TOP_ZONE) {
        anchorRef.current = y;
        if (hiddenRef.current) update(false);
        return;
      }

      // Trang ngắn lại (đổi bộ lọc, nạp lại) đang ở gần đáy thì y bị kéo lùi
      // theo: đặt lại mốc, không coi là người dùng kéo lên.
      if (prevMaxScroll !== null && maxScroll < prevMaxScroll - 1) {
        anchorRef.current = y;
        return;
      }

      const delta = y - anchorRef.current;

      if (hiddenRef.current) {
        // Đang ẩn: mốc theo điểm sâu nhất, kéo ngược lên quá ngưỡng thì hiện.
        if (delta > 0) anchorRef.current = y;
        else if (delta < -SHOW_THRESHOLD) {
          anchorRef.current = y;
          update(false);
        }
      } else if (delta < 0) {
        anchorRef.current = y;
      } else if (delta > HIDE_THRESHOLD) {
        anchorRef.current = y;
        update(true);
      }
    },
    [update],
  );
}
