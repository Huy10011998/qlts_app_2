import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
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
 * Hàng đều nhau nên không cần đo `onLayout`: mọi phép tính chỉ dựa trên
 * {@link ROW_PITCH}.
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

  const translatesRef = useRef(new Map<string, Animated.Value>());
  const dragRef = useRef<DragState>({
    isActive: false,
    keys: [],
    fromIndex: -1,
    toIndex: -1,
  });

  const getTranslate = useCallback((key: string) => {
    const existing = translatesRef.current.get(key);

    if (existing) return existing;

    const created = new Animated.Value(0);
    translatesRef.current.set(key, created);

    return created;
  }, []);

  const resetTranslates = useCallback(() => {
    translatesRef.current.forEach((value) => {
      value.stopAnimation();
      value.setValue(0);
    });
  }, []);

  const orderKey = items.map((item) => item.key).join("|");

  // Không kéo thì mọi hàng phải nằm đúng ô của nó. Đặt thành effect nên dù có
  // animation nào rơi rớt lại, lượt render kế tiếp cũng dọn.
  useEffect(() => {
    if (activeKey) return;

    resetTranslates();
  }, [activeKey, orderKey, resetTranslates]);

  const handleDragStart = useCallback(
    (index: number) => {
      const keys = itemsRef.current.map((item) => item.key);

      dragRef.current = {
        isActive: true,
        keys,
        fromIndex: index,
        toIndex: index,
      };

      resetTranslates();
      setActiveKey(keys[index]);
      tapHaptic("impactLight");
    },
    [resetTranslates]
  );

  const handleDragMove = useCallback(
    (dy: number) => {
      const drag = dragRef.current;

      if (!drag.isActive) return;

      const heights = drag.keys.map(() => ROW_PITCH);
      const offsets = buildBlockOffsets(heights);

      getTranslate(drag.keys[drag.fromIndex]).setValue(dy);

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

        Animated.timing(getTranslate(key), {
          toValue: getBlockShift({
            index,
            fromIndex: drag.fromIndex,
            toIndex: targetIndex,
            movedHeight: ROW_PITCH,
          }),
          duration: SHIFT_DURATION,
          useNativeDriver: true,
        }).start();
      });
      tapHaptic("selection");
    },
    [getTranslate]
  );

  const handleDragEnd = useCallback(() => {
    const drag = dragRef.current;

    if (!drag.isActive) return;

    drag.isActive = false;

    // Chốt thứ tự và trả mọi offset về 0 trong cùng một lượt render: hàng chỉ cao
    // 54pt nên khoảng "nhích" vào chỗ tối đa là nửa hàng, đổi lại không bao giờ
    // có quãng mà thứ tự dữ liệu và vị trí trên màn hình nói hai chuyện khác nhau.
    resetTranslates();
    setActiveKey(null);

    if (drag.toIndex !== drag.fromIndex) {
      onMoveRef.current({
        fromIndex: drag.fromIndex,
        toIndex: drag.toIndex,
        keys: drag.keys,
      });
    }
  }, [resetTranslates]);

  return (
    <View style={styles.list}>
      {items.map((item, index) => (
        <ReorderRow
          key={item.key}
          colors={colors}
          borderColor={hairlineBorderColor}
          iconName={item.iconName}
          index={index}
          isActive={item.key === activeKey}
          label={item.label}
          onDragEnd={handleDragEnd}
          onDragMove={handleDragMove}
          onDragStart={handleDragStart}
          position={index + 1}
          styles={styles}
          translateY={getTranslate(item.key)}
        />
      ))}
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
        { transform: [{ translateY }, { scale: isActive ? 1.02 : 1 }] },
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
      gap: ROW_GAP,
    },
    row: {
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
