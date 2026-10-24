import React, { useCallback, useEffect, useMemo, useRef } from "react";
import {
  ActivityIndicator,
  Animated,
  StyleProp,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ViewStyle,
} from "react-native";
import { Swipeable } from "react-native-gesture-handler";
import Ionicons from "react-native-vector-icons/Ionicons";
import { AppColors, useAppColors, useStyles } from "../../utils/helpers/colors";

/** Bề rộng nút hành động lộ ra khi vuốt thẻ sang trái (thẻ chỉ có một nút). */
const ACTION_WIDTH = 88;
/** Nhiều nút thì hẹp lại cho vừa một hàng (vd 4 nút duyệt phiếu); nhãn dài xuống 2 dòng. */
const MULTI_ACTION_WIDTH = 72;
const ACTION_GAP = 8;
/** Khoảng chừa phải, bằng lề ngang của thẻ trong danh sách. */
const ACTION_EDGE_INSET = 12;

const getActionsTotalWidth = (count: number) =>
  count * (count > 1 ? MULTI_ACTION_WIDTH : ACTION_WIDTH) +
  (count - 1) * ACTION_GAP +
  ACTION_EDGE_INSET;

/**
 * Spring mặc định của `Swipeable` khá chậm và mềm, nên thẻ cũ đóng lại trong khi
 * thẻ mới đang được kéo trông như bị kéo lê. Tăng `speed` cho cả mở và đóng để
 * hai chuyển động dứt khoát và kết thúc gần như cùng lúc.
 */
const ROW_ANIMATION_OPTIONS = {
  bounciness: 0,
  overshootClamping: true,
  speed: 24,
};

export type SwipeRowAction = {
  key: string;
  label: string;
  icon?: string;
  onPress: () => void;
  /** Nền nút; mặc định đỏ thương hiệu. */
  color?: string;
  /** Màu icon + chữ; mặc định chữ trên nền thương hiệu. */
  textColor?: string;
  /** Đang tải cấu hình cho hành động: hiện spinner và chặn bấm thêm. */
  busy?: boolean;
  /**
   * Đóng thẻ ngay khi bấm — cho hành động mở hộp thoại tại chỗ. Mặc định thẻ
   * giữ mở tới khi `busy` tắt (xem `handlePress`).
   */
  closeOnPress?: boolean;
};

type SwipeableListRowProps = {
  /** Các nút lộ ra ở mép phải, xếp trái sang phải. */
  actions: SwipeRowAction[];
  /**
   * Lề dọc của cụm nút, đặt bằng lề dọc của thẻ để nút cao đúng bằng thẻ. Mặc
   * định theo ListCardAsset (marginVertical 6).
   */
  actionsStyle?: StyleProp<ViewStyle>;
  children: React.ReactNode;
  disabled?: boolean;
  /** Thẻ vừa đóng lại — nơi gọi bỏ nó khỏi "thẻ đang mở". */
  onClosed?: (close: () => void) => void;
  /**
   * Người dùng bắt đầu kéo thẻ này. Nơi gọi đóng thẻ đang mở ngay lúc này —
   * đóng ngay từ đầu cử chỉ thì hai thẻ chạy cùng lúc, mượt hơn là đợi thẻ mới
   * mở xong mới giật thẻ cũ về.
   */
  onOpenStartDrag?: (close: () => void) => void;
  /** Thẻ đã mở — nơi gọi ghi nhận đây là thẻ đang mở. */
  onOpened?: (close: () => void) => void;
  /**
   * Ngón tay vừa đặt xuống thẻ này. Sớm hơn `onOpenStartDrag` (chưa cần kéo đủ
   * ngưỡng), nên thẻ đang mở gần như đã đóng xong trước khi thẻ mới hé ra.
   */
  onTouchStart?: (close: () => void) => void;
};

/**
 * Chỉ một thẻ được mở tại một thời điểm. Thẻ cũ đóng ngay khi ngón tay bắt
 * đầu kéo thẻ mới, để hai chuyển động chạy cùng lúc thay vì giật nối tiếp.
 * `rowHandlers` rải thẳng vào `SwipeableListRow`; `closeOpenRow()` cho lúc bắt
 * đầu cuộn danh sách.
 */
export function useSingleOpenRow() {
  const openRowCloseRef = useRef<(() => void) | null>(null);
  const closeOpenRow = useCallback((except?: () => void) => {
    const close = openRowCloseRef.current;
    if (close && close !== except) {
      openRowCloseRef.current = null;
      close();
    }
  }, []);
  const handleRowOpened = useCallback((close: () => void) => {
    openRowCloseRef.current = close;
  }, []);
  const handleRowClosed = useCallback((close: () => void) => {
    if (openRowCloseRef.current === close) {
      openRowCloseRef.current = null;
    }
  }, []);

  const rowHandlers = useMemo(
    () => ({
      onClosed: handleRowClosed,
      onOpened: handleRowOpened,
      onOpenStartDrag: closeOpenRow,
      onTouchStart: closeOpenRow,
    }),
    [closeOpenRow, handleRowClosed, handleRowOpened],
  );

  return { closeOpenRow, rowHandlers };
}

/**
 * Bọc một thẻ danh sách để vuốt sang trái lộ ra các nút hành động ở mép phải.
 *
 * Dùng `Swipeable` bản Animated của react-native-gesture-handler (không phải
 * `ReanimatedSwipeable`) vì repo không cài react-native-reanimated.
 */
export default function SwipeableListRow({
  actions,
  actionsStyle,
  children,
  disabled = false,
  onClosed,
  onOpened,
  onOpenStartDrag,
  onTouchStart,
}: SwipeableListRowProps) {
  const styles = useStyles(makeStyles);
  const c = useAppColors();
  const swipeableRef = useRef<Swipeable>(null);
  const busy = actions.some((action) => action.busy);

  const close = useCallback(() => {
    swipeableRef.current?.close();
  }, []);

  const handlePress = useCallback(
    (action: SwipeRowAction) => {
      if (busy) return;
      // Mặc định KHÔNG đóng thẻ ở đây: đóng ngay thì spinner `busy` không ai
      // thấy, và trên mạng chậm người dùng tưởng bấm không ăn. Thẻ tự đóng khi
      // việc xong.
      if (action.closeOnPress) close();
      action.onPress();
    },
    [busy, close],
  );

  // Đóng thẻ khi hành động vừa chạy xong (đã điều hướng, hoặc lỗi đã báo), nhờ
  // đó lúc quay lại danh sách thẻ không còn hé ra.
  const wasBusyRef = useRef(false);
  useEffect(() => {
    if (busy) {
      wasBusyRef.current = true;
      return;
    }
    if (wasBusyRef.current) {
      wasBusyRef.current = false;
      close();
    }
  }, [busy, close]);

  const renderRightActions = useCallback(
    (progress: Animated.AnimatedInterpolation<number>) => {
      const totalWidth = getActionsTotalWidth(actions.length);
      // Nội dung trượt vào cùng thẻ chứ không đứng yên ở mép phải.
      const translateX = progress.interpolate({
        inputRange: [0, 1],
        outputRange: [totalWidth, 0],
        extrapolate: "clamp",
      });

      return (
        // Animate ngay ở khung ngoài để nút thừa hưởng chiều cao của cả hàng,
        // nhờ đó cao và bo góc y như thẻ bên cạnh.
        <Animated.View
          style={[
            styles.actionWrap,
            { width: totalWidth },
            actionsStyle,
            { transform: [{ translateX }] },
          ]}
        >
          {actions.map((action) => {
            const fg = action.textColor ?? c.onBrand;
            return (
              <TouchableOpacity
                key={action.key}
                accessibilityLabel={action.label}
                accessibilityRole="button"
                onPress={() => handlePress(action)}
                style={[
                  styles.actionButton,
                  { backgroundColor: action.color ?? c.red },
                ]}
              >
                {action.busy ? (
                  <ActivityIndicator color={fg} size="small" />
                ) : (
                  <Ionicons
                    name={action.icon ?? "add-circle-outline"}
                    size={22}
                    color={fg}
                  />
                )}
                <Text
                  numberOfLines={2}
                  style={[styles.actionText, { color: fg }]}
                >
                  {action.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </Animated.View>
      );
    },
    [actions, actionsStyle, c, handlePress, styles],
  );

  if (disabled) {
    return <>{children}</>;
  }

  return (
    // `onTouchStart` chỉ nghe thụ động (không giành responder) nên không ảnh
    // hưởng tới cử chỉ kéo của Swipeable hay cuộn của FlatList.
    <View onTouchStart={() => onTouchStart?.(close)}>
      <Swipeable
        ref={swipeableRef}
        friction={2}
        rightThreshold={40}
        overshootRight={false}
        animationOptions={ROW_ANIMATION_OPTIONS}
        renderRightActions={renderRightActions}
        onSwipeableOpenStartDrag={() => onOpenStartDrag?.(close)}
        onSwipeableOpen={() => onOpened?.(close)}
        onSwipeableClose={() => onClosed?.(close)}
      >
        {children}
      </Swipeable>
    </View>
  );
}

const makeStyles = (c: AppColors) =>
  StyleSheet.create({
    actionWrap: {
      // Cùng lề với ListCardAsset (marginVertical 6 / marginHorizontal 12) để
      // nút và thẻ trông như hai khối cùng một hàng.
      flexDirection: "row",
      gap: ACTION_GAP,
      marginVertical: 6,
      paddingRight: ACTION_EDGE_INSET,
    },
    actionButton: {
      // Cao bằng cả hàng, bo góc trùng với thẻ.
      flex: 1,
      borderRadius: 16,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 6,
      paddingVertical: 10,
      gap: 4,
    },
    actionText: {
      color: c.onBrand,
      fontSize: 12,
      fontWeight: "700",
      textAlign: "center",
    },
  });
