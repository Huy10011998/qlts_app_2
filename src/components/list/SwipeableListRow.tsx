import React, { useCallback, useEffect, useRef } from "react";
import {
  ActivityIndicator,
  Animated,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Swipeable } from "react-native-gesture-handler";
import Ionicons from "react-native-vector-icons/Ionicons";
import { AppColors, useAppColors, useStyles } from "../../utils/helpers/colors";

/** Bề rộng nút hành động lộ ra khi vuốt thẻ sang trái. */
const ACTION_WIDTH = 88;
/** Kèm khoảng chừa phải, bằng lề ngang của thẻ trong danh sách. */
const ACTION_TOTAL_WIDTH = ACTION_WIDTH + 12;

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

type SwipeableListRowProps = {
  actionIcon?: string;
  actionLabel: string;
  /** Đang tải cấu hình cho hành động: hiện spinner và chặn bấm thêm. */
  busy?: boolean;
  children: React.ReactNode;
  disabled?: boolean;
  onAction: () => void;
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
 * Bọc một thẻ danh sách để vuốt sang trái lộ ra một nút hành động ở mép phải.
 *
 * Dùng `Swipeable` bản Animated của react-native-gesture-handler (không phải
 * `ReanimatedSwipeable`) vì repo không cài react-native-reanimated.
 */
export default function SwipeableListRow({
  actionIcon = "add-circle-outline",
  actionLabel,
  busy = false,
  children,
  disabled = false,
  onAction,
  onClosed,
  onOpened,
  onOpenStartDrag,
  onTouchStart,
}: SwipeableListRowProps) {
  const styles = useStyles(makeStyles);
  const c = useAppColors();
  const swipeableRef = useRef<Swipeable>(null);

  const close = useCallback(() => {
    swipeableRef.current?.close();
  }, []);

  const handlePress = useCallback(() => {
    if (busy) return;
    // Cố ý KHÔNG đóng thẻ ở đây: đóng ngay thì spinner `busy` không ai thấy, và
    // trên mạng chậm người dùng tưởng bấm không ăn. Thẻ tự đóng khi việc xong.
    onAction();
  }, [busy, onAction]);

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
      // Nội dung trượt vào cùng thẻ chứ không đứng yên ở mép phải.
      const translateX = progress.interpolate({
        inputRange: [0, 1],
        outputRange: [ACTION_TOTAL_WIDTH, 0],
        extrapolate: "clamp",
      });

      return (
        // Animate ngay ở khung ngoài để nút thừa hưởng chiều cao của cả hàng,
        // nhờ đó cao và bo góc y như thẻ bên cạnh.
        <Animated.View
          style={[styles.actionWrap, { transform: [{ translateX }] }]}
        >
          <TouchableOpacity
            accessibilityLabel={actionLabel}
            accessibilityRole="button"
            onPress={handlePress}
            style={styles.actionButton}
          >
            {busy ? (
              <ActivityIndicator color={c.onBrand} size="small" />
            ) : (
              <Ionicons name={actionIcon} size={22} color={c.onBrand} />
            )}
            <Text numberOfLines={2} style={styles.actionText}>
              {actionLabel}
            </Text>
          </TouchableOpacity>
        </Animated.View>
      );
    },
    [actionIcon, actionLabel, busy, c, handlePress, styles],
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
      width: ACTION_TOTAL_WIDTH,
      marginVertical: 6,
      paddingRight: 12,
    },
    actionButton: {
      // Cao bằng cả hàng, bo góc trùng với thẻ.
      flex: 1,
      borderRadius: 16,
      backgroundColor: c.red,
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
