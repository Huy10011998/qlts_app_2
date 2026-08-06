import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  Easing,
  PanResponder,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";
import ReactNativeHapticFeedback from "react-native-haptic-feedback";

import {
  AppColors,
  useAppColors,
  useHairlineBorderColor,
  useStyles,
} from "../../../utils/helpers/colors";
import {
  buildBlockOffsets,
  getBlockShift,
  resolveDropIndex,
} from "./homeBlockDragMath";
import { HOME_BRAND_RED } from "./homeTheme";

const ROW_HEIGHT = 54;
const ROW_GAP = 8;
/** Bước giữa hai hàng — mọi phép tính kéo thả ở đây đều theo bước này. */
const ROW_PITCH = ROW_HEIGHT + ROW_GAP;
/** Thời gian các hàng còn lại nhường chỗ. */
const SHIFT_DURATION = 150;
/** Hàng đang kéo bay về đúng ô sau khi buông. */
const SETTLE_DURATION = 200;
/** Nhấc hàng lên / đặt xuống (scale). */
const LIFT_DURATION = 120;
/** Thứ tự đổi từ bên ngoài (nạp từ storage, đổi quyền...) thì trượt tới chỗ mới. */
const REORDER_DURATION = 220;

const HAPTIC_OPTIONS = {
  enableVibrateFallback: false,
  ignoreAndroidSystemSettings: false,
};

const tapHaptic = (type: "impactLight" | "selection") => {
  try {
    ReactNativeHapticFeedback.trigger(type, HAPTIC_OPTIONS);
  } catch {
    // Rung chỉ là gia vị, máy không hỗ trợ thì bỏ qua.
  }
};

export type HomeReorderItem = {
  key: string;
  label: string;
  iconName: string;
};

type HomeReorderListProps = {
  items: HomeReorderItem[];
  /**
   * `keys` là ảnh chụp danh sách lúc bắt đầu kéo — chỉ số chỉ có nghĩa trên đúng
   * danh sách đó.
   */
  onMove: (args: {
    fromIndex: number;
    toIndex: number;
    keys: string[];
  }) => void;
};

type DragState = {
  isActive: boolean;
  keys: string[];
  fromIndex: number;
  toIndex: number;
};

/**
 * Danh sách kéo thả để sắp xếp thứ tự, dùng trong bảng "Sắp xếp Trang chủ".
 *
 * Vì sao kéo ở đây chứ không kéo thẳng thẻ ngoài Trang chủ: thẻ thật cao 200-300pt
 * nên lúc nhấc lên nó che luôn chỗ định thả, và phải cuộn cả trang mới đưa được
 * thẻ đi xa. Ở đây mỗi khối rút lại thành một hàng cao {@link ROW_HEIGHT}pt, năm
 * hàng nằm gọn trong một màn — thấy hết thứ tự, kéo một nhịp là tới.
 *
 * Cách định vị (quan trọng): hàng **không** xếp bằng flex mà nằm tuyệt đối, thứ tự
 * render giữ nguyên từ lúc mount, vị trí trên màn hoàn toàn do `translateY` quyết
 * định. Nhờ vậy lúc chốt thứ tự mới, cái duy nhất đổi là con số vị trí — không có
 * offset nào phải reset về 0, nên không còn cú "nhảy" giữa frame animation cuối và
 * frame React commit thứ tự (hai thứ này chạy trên hai luồng, không bao giờ khớp
 * frame với nhau).
 */
export default function HomeReorderList({
  items,
  onMove,
}: HomeReorderListProps) {
  const styles = useStyles(makeStyles);
  const colors = useAppColors();
  const hairlineBorderColor = useHairlineBorderColor();
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const itemsRef = useRef(items);
  const onMoveRef = useRef(onMove);

  itemsRef.current = items;
  onMoveRef.current = onMove;

  /** Toạ độ y tuyệt đối của từng hàng. */
  const positionsRef = useRef(new Map<string, Animated.Value>());
  /**
   * Chỗ mà mỗi hàng *đang* đứng theo cách hiểu của JS. Cần bản sao bằng số vì
   * `Animated.Value` không cho đọc giá trị công khai, mà lượt đồng bộ sau khi chốt
   * thứ tự phải biết hàng đã ở đúng ô chưa để khỏi animate lại từ đầu.
   */
  const restingRef = useRef(new Map<string, number>());
  const dragRef = useRef<DragState>({
    isActive: false,
    keys: [],
    fromIndex: -1,
    toIndex: -1,
  });
  /** 0 = nằm yên, 1 = đang được nhấc lên; hàng active lấy scale từ đây. */
  const liftRef = useRef(new Animated.Value(0));
  /**
   * Đang chạy animation "bay về ô" sau khi buông. Trong lúc này thứ tự dữ liệu
   * chưa chốt nên bỏ qua cú kéo mới, tránh chụp danh sách sai chỉ số.
   */
  const isSettlingRef = useRef(false);

  const getPosition = useCallback((key: string, initialY: number) => {
    const existing = positionsRef.current.get(key);

    if (existing) return existing;

    const created = new Animated.Value(initialY);

    positionsRef.current.set(key, created);
    restingRef.current.set(key, initialY);

    return created;
  }, []);

  /** Đưa một hàng tới ô của nó, có hoặc không animation. */
  const settleTo = useCallback(
    (key: string, y: number, duration: number) => {
      const position = getPosition(key, y);

      restingRef.current.set(key, y);

      if (duration <= 0) {
        position.stopAnimation();
        position.setValue(y);

        return;
      }

      Animated.timing(position, {
        toValue: y,
        duration,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
    },
    [getPosition]
  );

  /**
   * Thứ tự render cố định: hàng mới thêm vào cuối, hàng mất thì bỏ. Danh sách này
   * chỉ quyết định thứ tự trong cây view, không liên quan tới thứ tự hiển thị.
   */
  const renderOrderRef = useRef<string[]>([]);
  const renderItems = useMemo(() => {
    const itemByKey = new Map(items.map((item) => [item.key, item]));
    const kept = renderOrderRef.current.filter((key) => itemByKey.has(key));
    const keptSet = new Set(kept);
    const added = items
      .map((item) => item.key)
      .filter((key) => !keptSet.has(key));

    renderOrderRef.current = [...kept, ...added];

    return renderOrderRef.current.map((key) => itemByKey.get(key)!);
  }, [items]);

  const indexByKey = useMemo(
    () => new Map(items.map((item, index) => [item.key, index])),
    [items]
  );

  const orderKey = items.map((item) => item.key).join("|");

  // Thứ tự đổi mà không phải do kéo (nạp từ storage, khối ẩn/hiện): trượt các hàng
  // lệch chỗ về ô mới. Sau một cú kéo thì mọi hàng đã đứng đúng chỗ nên effect này
  // không làm gì — đó chính là lý do việc chốt thứ tự nhìn không thấy gì xảy ra.
  useEffect(() => {
    if (dragRef.current.isActive || isSettlingRef.current) return;

    itemsRef.current.forEach((item, index) => {
      const targetY = index * ROW_PITCH;

      if (restingRef.current.get(item.key) === targetY) return;

      settleTo(item.key, targetY, REORDER_DURATION);
    });
  }, [orderKey, settleTo]);

  const handleDragStart = useCallback(
    (index: number) => {
      if (isSettlingRef.current) return;

      const keys = itemsRef.current.map((item) => item.key);

      dragRef.current = {
        isActive: true,
        keys,
        fromIndex: index,
        toIndex: index,
      };

      setActiveKey(keys[index]);
      liftRef.current.setValue(0);
      Animated.timing(liftRef.current, {
        toValue: 1,
        duration: LIFT_DURATION,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }).start();
      tapHaptic("impactLight");
    },
    []
  );

  const handleDragMove = useCallback(
    (dy: number) => {
      const drag = dragRef.current;

      if (!drag.isActive) return;

      const heights = drag.keys.map(() => ROW_PITCH);
      const offsets = buildBlockOffsets(heights);
      const movedKey = drag.keys[drag.fromIndex];

      getPosition(movedKey, drag.fromIndex * ROW_PITCH).setValue(
        drag.fromIndex * ROW_PITCH + dy
      );

      const targetIndex = resolveDropIndex({
        offsets,
        heights,
        fromIndex: drag.fromIndex,
        translateY: dy,
      });

      if (targetIndex === drag.toIndex) return;

      drag.toIndex = targetIndex;
      drag.keys.forEach((key, index) => {
        if (index === drag.fromIndex) return;

        const shift = getBlockShift({
          index,
          fromIndex: drag.fromIndex,
          toIndex: targetIndex,
          movedHeight: ROW_PITCH,
        });

        settleTo(key, index * ROW_PITCH + shift, SHIFT_DURATION);
      });
      tapHaptic("selection");
    },
    [getPosition, settleTo]
  );

  const handleDragEnd = useCallback(() => {
    const drag = dragRef.current;

    if (!drag.isActive) return;

    drag.isActive = false;

    const movedKey = drag.keys[drag.fromIndex];
    const move =
      drag.toIndex === drag.fromIndex
        ? null
        : {
            fromIndex: drag.fromIndex,
            toIndex: drag.toIndex,
            keys: drag.keys,
          };

    // Ngón tay buông ở đâu thì hàng còn đang lệch chỗ đó: cho nó bay tiếp vào ô
    // đích. Các hàng khác đã nhường chỗ xong từ lúc kéo nên không phải làm gì.
    isSettlingRef.current = true;
    restingRef.current.set(movedKey, drag.toIndex * ROW_PITCH);
    Animated.parallel([
      Animated.timing(getPosition(movedKey, drag.fromIndex * ROW_PITCH), {
        toValue: drag.toIndex * ROW_PITCH,
        duration: SETTLE_DURATION,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(liftRef.current, {
        toValue: 0,
        duration: SETTLE_DURATION,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start(() => {
      isSettlingRef.current = false;
      setActiveKey(null);

      if (move) onMoveRef.current(move);
    });
  }, [getPosition]);

  return (
    <View
      style={[
        styles.list,
        { height: Math.max(0, items.length * ROW_PITCH - ROW_GAP) },
      ]}
    >
      {renderItems.map((item) => {
        const index = indexByKey.get(item.key) ?? 0;

        return (
          <ReorderRow
            key={item.key}
            colors={colors}
            borderColor={hairlineBorderColor}
            iconName={item.iconName}
            index={index}
            isActive={item.key === activeKey}
            label={item.label}
            lift={liftRef.current}
            onDragEnd={handleDragEnd}
            onDragMove={handleDragMove}
            onDragStart={handleDragStart}
            position={index + 1}
            styles={styles}
            translateY={getPosition(item.key, index * ROW_PITCH)}
          />
        );
      })}
    </View>
  );
}

type ReorderRowProps = {
  borderColor: string;
  colors: AppColors;
  iconName: string;
  index: number;
  isActive: boolean;
  label: string;
  lift: Animated.Value;
  onDragEnd: () => void;
  onDragMove: (dy: number) => void;
  onDragStart: (index: number) => void;
  position: number;
  styles: ReturnType<typeof makeStyles>;
  translateY: Animated.Value;
};

/**
 * Cả hàng là vùng kéo, không cần nhắm vào tay nắm nhỏ: trong hàng không có gì
 * bấm được nên không phải giành ngón với ai.
 */
function ReorderRow({
  borderColor,
  colors,
  iconName,
  index,
  isActive,
  label,
  lift,
  onDragEnd,
  onDragMove,
  onDragStart,
  position,
  styles,
  translateY,
}: ReorderRowProps) {
  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderTerminationRequest: () => false,
        onShouldBlockNativeResponder: () => true,
        onPanResponderGrant: () => onDragStart(index),
        onPanResponderMove: (_event, gesture) => onDragMove(gesture.dy),
        onPanResponderRelease: onDragEnd,
        onPanResponderTerminate: onDragEnd,
      }),
    [index, onDragEnd, onDragMove, onDragStart]
  );

  // Chỉ hàng đang kéo mới ăn theo `lift`; lúc buông nó về đúng 1 nên khi hàng thôi
  // active cũng không có cú giật cỡ hàng.
  const scale = useMemo(
    () =>
      isActive
        ? lift.interpolate({ inputRange: [0, 1], outputRange: [1, 1.02] })
        : 1,
    [isActive, lift]
  );

  return (
    <Animated.View
      {...panResponder.panHandlers}
      accessibilityRole="adjustable"
      accessibilityLabel={`${label} — vị trí ${position}, kéo để đổi thứ tự`}
      style={[
        styles.row,
        {
          backgroundColor: colors.surface,
          borderColor: isActive ? HOME_BRAND_RED : borderColor,
        },
        isActive && [styles.rowActive, { shadowColor: colors.shadow }],
        { transform: [{ translateY }, { scale }] },
      ]}
    >
      <View style={[styles.rowIcon, { backgroundColor: colors.redIconSurface }]}>
        <Ionicons name={iconName} size={17} color={HOME_BRAND_RED} />
      </View>
      <Text
        style={[styles.rowLabel, { color: colors.text }]}
        allowFontScaling={false}
        numberOfLines={1}
      >
        {label}
      </Text>
      <Text
        style={[styles.rowPosition, { color: colors.textMuted }]}
        allowFontScaling={false}
      >
        {position}
      </Text>
      <Ionicons
        name="reorder-two-outline"
        size={20}
        color={isActive ? HOME_BRAND_RED : colors.textMuted}
      />
    </Animated.View>
  );
}

const makeStyles = (c: AppColors) =>
  StyleSheet.create({
    list: {
      position: "relative",
    },
    row: {
      position: "absolute",
      left: 0,
      right: 0,
      top: 0,
      height: ROW_HEIGHT,
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      paddingHorizontal: 12,
      borderRadius: 14,
      borderWidth: StyleSheet.hairlineWidth,
      backgroundColor: c.surface,
    },
    rowActive: {
      borderWidth: 1.2,
      shadowOpacity: 0.16,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 5 },
      elevation: 10,
      zIndex: 10,
    },
    rowIcon: {
      width: 32,
      height: 32,
      borderRadius: 10,
      alignItems: "center",
      justifyContent: "center",
    },
    rowLabel: {
      flex: 1,
      fontSize: 13.5,
      fontWeight: "600",
      color: c.text,
    },
    rowPosition: {
      fontSize: 12,
      fontWeight: "700",
      color: c.textMuted,
    },
  });
