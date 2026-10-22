import React, {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useMemo,
  useRef,
} from "react";
import {
  Animated,
  FlatList,
  ListRenderItemInfo,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  StyleSheet,
  Text,
} from "react-native";
import { pickerTickHaptic } from "./pickerHaptic";
import { AppColors, useStyles } from "../../../utils/helpers/colors";

/** Số hàng nhìn thấy; hàng giữa là hàng đang chọn. */
export const WHEEL_VISIBLE_ROWS = 5;
const SIDE_ROWS = (WHEEL_VISIBLE_ROWS - 1) / 2;

/**
 * Danh sách lặp lại nhiều vòng để cuộn mãi không chạm đầu/cuối (23 → 00 liền
 * mạch như bánh xe thật). Dừng tay mà đã trôi xa vòng giữa thì nhảy ngầm về ô
 * tương ứng ở vòng giữa — nội dung giống hệt nên mắt không thấy.
 */
const LOOPS = 7;
const MIDDLE_LOOP = Math.floor(LOOPS / 2);

/** Bỏ rung khi bánh xe tự chạy tới giá trị do nút chọn nhanh đặt. */
const PROGRAMMATIC_QUIET_MS = 450;

export type WheelColumnHandle = {
  scrollToIndex: (index: number) => void;
};

type WheelColumnProps = {
  accessibilityLabel: string;
  /** Chỉ đọc lúc mount. Đổi giá trị từ ngoài thì gọi `scrollToIndex` qua ref. */
  initialIndex: number;
  itemHeight: number;
  labels: readonly string[];
  onChange: (index: number) => void;
  width: number;
};

const mod = (n: number, m: number) => ((n % m) + m) % m;

/**
 * Một cột bánh xe cuộn dọc, hút vào từng ô. Hàng càng xa tâm càng nhỏ và mờ.
 *
 * Cuộn chạy trên luồng native (`useNativeDriver`), JS chỉ nhận chỉ số mới mỗi
 * khi qua một ô để báo `onChange` và rung nhẹ.
 */
const WheelColumn = forwardRef<WheelColumnHandle, WheelColumnProps>(
  function WheelColumn(
    { accessibilityLabel, initialIndex, itemHeight, labels, onChange, width },
    ref
  ) {
    const styles = useStyles(makeStyles);
    const count = labels.length;
    const rows = useMemo(
      () => Array.from({ length: count * LOOPS }, (_, i) => i),
      [count]
    );
    const initialRow = MIDDLE_LOOP * count + mod(initialIndex, count);

    const listRef = useRef<FlatList<number>>(null);
    const scrollY = useRef(new Animated.Value(initialRow * itemHeight)).current;
    const rowRef = useRef(initialRow);
    const indexRef = useRef(mod(initialIndex, count));
    const quietUntilRef = useRef(0);
    const onChangeRef = useRef(onChange);
    onChangeRef.current = onChange;

    const scrollToRow = useCallback(
      (row: number, animated = true) => {
        listRef.current?.scrollToOffset({ offset: row * itemHeight, animated });
      },
      [itemHeight]
    );

    useImperativeHandle(
      ref,
      () => ({
        // Đi đường ngắn nhất tới giá trị mới, kể cả vòng qua 00.
        scrollToIndex: (index: number) => {
          const current = rowRef.current;
          let delta = mod(index, count) - mod(current, count);
          if (delta > count / 2) delta -= count;
          if (delta < -count / 2) delta += count;
          if (delta === 0) return;
          quietUntilRef.current = Date.now() + PROGRAMMATIC_QUIET_MS;
          scrollToRow(current + delta);
        },
      }),
      [count, scrollToRow]
    );

    const handleScroll = useMemo(
      () =>
        Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          {
            useNativeDriver: true,
            listener: (event: NativeSyntheticEvent<NativeScrollEvent>) => {
              const row = Math.round(
                event.nativeEvent.contentOffset.y / itemHeight
              );
              if (row === rowRef.current) return;
              rowRef.current = row;

              const index = mod(row, count);
              if (index === indexRef.current) return;
              indexRef.current = index;
              if (Date.now() > quietUntilRef.current) pickerTickHaptic();
              onChangeRef.current(index);
            },
          }
        ),
      [count, itemHeight, scrollY]
    );

    const recenter = useCallback(
      (event: NativeSyntheticEvent<NativeScrollEvent>) => {
        const row = Math.round(event.nativeEvent.contentOffset.y / itemHeight);
        const middleRow = MIDDLE_LOOP * count + mod(row, count);
        if (Math.abs(row - middleRow) < count) return;
        rowRef.current = middleRow;
        scrollToRow(middleRow, false);
      },
      [count, itemHeight, scrollToRow]
    );

    const getItemLayout = useCallback(
      (_: ArrayLike<number> | null | undefined, index: number) => ({
        length: itemHeight,
        offset: itemHeight * index,
        index,
      }),
      [itemHeight]
    );

    const renderItem = useCallback(
      ({ item: row }: ListRenderItemInfo<number>) => {
        const center = row * itemHeight;
        const inputRange = [
          center - 3 * itemHeight,
          center - 2 * itemHeight,
          center - itemHeight,
          center,
          center + itemHeight,
          center + 2 * itemHeight,
          center + 3 * itemHeight,
        ];
        const opacity = scrollY.interpolate({
          inputRange,
          outputRange: [0.1, 0.25, 0.5, 1, 0.5, 0.25, 0.1],
          extrapolate: "clamp",
        });
        const scale = scrollY.interpolate({
          inputRange,
          outputRange: [0.72, 0.8, 0.9, 1, 0.9, 0.8, 0.72],
          extrapolate: "clamp",
        });

        return (
          // Bấm vào hàng trên/dưới thì bánh xe lăn tới hàng đó.
          <Pressable
            onPress={() => scrollToRow(row)}
            style={{ height: itemHeight }}
            accessible={false}
          >
            <Animated.View
              style={[styles.item, { opacity, transform: [{ scale }] }]}
            >
              <Text style={styles.itemText}>{labels[row % count]}</Text>
            </Animated.View>
          </Pressable>
        );
      },
      [count, itemHeight, labels, scrollToRow, scrollY, styles]
    );

    return (
      <Animated.FlatList
        ref={listRef}
        data={rows}
        keyExtractor={String}
        renderItem={renderItem}
        getItemLayout={getItemLayout}
        initialScrollIndex={initialRow}
        // Đủ dày để lướt mạnh không lộ hàng trống trước khi kịp vẽ.
        initialNumToRender={WHEEL_VISIBLE_ROWS * 3}
        maxToRenderPerBatch={WHEEL_VISIBLE_ROWS * 4}
        windowSize={11}
        removeClippedSubviews={false}
        style={[styles.list, { width, height: itemHeight * WHEEL_VISIBLE_ROWS }]}
        contentContainerStyle={{ paddingVertical: itemHeight * SIDE_ROWS }}
        showsVerticalScrollIndicator={false}
        overScrollMode="never"
        nestedScrollEnabled
        snapToInterval={itemHeight}
        decelerationRate="fast"
        scrollEventThrottle={16}
        onScroll={handleScroll}
        onMomentumScrollEnd={recenter}
        accessibilityLabel={`${accessibilityLabel}: ${labels[indexRef.current]}`}
        accessibilityRole="adjustable"
        accessibilityActions={[{ name: "increment" }, { name: "decrement" }]}
        onAccessibilityAction={(event) => {
          const step = event.nativeEvent.actionName === "increment" ? 1 : -1;
          scrollToRow(rowRef.current + step);
        }}
      />
    );
  }
);

export default WheelColumn;

const makeStyles = (c: AppColors) =>
  StyleSheet.create({
    // ScrollView mặc định `flexGrow: 1`: đứng trong hàng ngang thì tự giãn gấp
    // đôi bề rộng đã đặt, hai cột giờ – phút dạt ra hai mép.
    list: {
      flexGrow: 0,
      flexShrink: 0,
    },
    item: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
    },
    itemText: {
      fontSize: 24,
      fontWeight: "600",
      color: c.text,
      fontVariant: ["tabular-nums"],
    },
  });
