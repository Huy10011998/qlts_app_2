import React, { useRef, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Animated,
  Easing,
  StyleSheet,
  useWindowDimensions,
} from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";
import ReactNativeHapticFeedback from "react-native-haptic-feedback";

import type { DetailSectionTabsProps, TabItem } from "../../types/index";
import {
  AppColors,
  useAppColors,
  useHairlineBorderColor,
  useStyles,
} from "../../utils/helpers/colors";
import { useVisibleDetailTabs } from "./useVisibleDetailTabs";

const SHELL_INSET = 12;
const SHELL_GAP = 10;
export const SECTION_TABS_HEIGHT = 54;
const BAR_PADDING = 6;
const ITEM_HEIGHT = 38;
const ICON_SIZE = 20;
const LABEL_GAP = 6;
const PILL_PADDING = 12;
/**
 * Bề rộng trung bình một ký tự nhãn ở cỡ 12 đậm. Đo chữ thật thì phải chờ layout
 * rồi mới biết bề rộng pill, tức pill sẽ giật một nhịp; ước lượng rồi cho nhãn
 * `numberOfLines={1}` trong khung `overflow: hidden` an toàn hơn — nhãn dài quá
 * thì bị cắt gọn chứ không phá vỡ bố cục.
 */
const CHAR_WIDTH = 6.8;
/** Pill không được chiếm quá nửa thanh, kẻo các mục còn lại hết chỗ bấm. */
const MAX_PILL_RATIO = 0.55;
const EXPAND_DURATION = 220;

const HAPTIC_OPTIONS = {
  enableVibrateFallback: false,
  ignoreAndroidSystemSettings: false,
};

const tapHaptic = () => {
  try {
    ReactNativeHapticFeedback.trigger("selection", HAPTIC_OPTIONS);
  } catch {
    // Rung chỉ là gia vị, máy không hỗ trợ thì bỏ qua.
  }
};

/**
 * Bề rộng mục đang chọn (nở ra, có nhãn) và bề rộng các mục còn lại (chỉ icon).
 * Tổng luôn đúng bằng bề rộng khả dụng nên thanh không bao giờ tràn hay hở.
 */
export const computeTabWidths = ({
  contentWidth,
  tabCount,
  activeLabelLength,
}: {
  contentWidth: number;
  tabCount: number;
  activeLabelLength: number;
}) => {
  const activeWidth = Math.min(
    ICON_SIZE +
      LABEL_GAP +
      Math.ceil(activeLabelLength * CHAR_WIDTH) +
      PILL_PADDING * 2,
    Math.floor(contentWidth * MAX_PILL_RATIO),
  );

  return {
    activeWidth,
    inactiveWidth:
      tabCount > 1 ? (contentWidth - activeWidth) / (tabCount - 1) : contentWidth,
  };
};

/**
 * Thanh chuyển mục của màn chi tiết, đặt ngay dưới header.
 *
 * Nằm trong luồng chứ không nổi tuyệt đối ở đáy: ở trên đầu thì mắt gặp nó ngay
 * khi mở màn, không phải cuộn xuống mới biết bản ghi có mấy mục, và nội dung
 * không cần chừa chỗ trống ở đáy.
 *
 * Mục đang chọn nở thành viên thuốc đỏ có icon + nhãn nằm ngang, các mục còn lại
 * thu về chỉ còn icon. Nhờ vậy nhãn của mục đang xem đọc được ở cỡ chữ tử tế,
 * thay vì nhồi 5 nhãn 11px cạnh nhau. Mục không có nhãn hiện vẫn giữ
 * `accessibilityLabel` để trình đọc màn hình đọc được, và badge cho biết mục nào
 * có nội dung.
 */
export default function DetailSectionTabs({
  tabs,
  activeTab,
  onTabPress,
}: DetailSectionTabsProps) {
  const styles = useStyles(makeStyles);
  const c = useAppColors();
  const { width: screenWidth } = useWindowDimensions();
  const hairlineBorderColor = useHairlineBorderColor();
  const visibleTabs = useVisibleDetailTabs(tabs);

  useEffect(() => {
    if (visibleTabs.length === 0) return;

    if (!visibleTabs.find((t) => t.key === activeTab)) {
      onTabPress(visibleTabs[0].key, visibleTabs[0].label);
    }
  }, [visibleTabs, activeTab, onTabPress]);

  const tabCount = visibleTabs.length || 1;
  const activeIndex = visibleTabs.findIndex((t) => t.key === activeTab);
  const index = activeIndex >= 0 ? activeIndex : 0;

  const { activeWidth, inactiveWidth } = computeTabWidths({
    contentWidth: screenWidth - SHELL_INSET * 2 - BAR_PADDING * 2,
    tabCount,
    activeLabelLength: visibleTabs[index]?.label.length ?? 0,
  });

  // Một Animated.Value cho mỗi mục, khởi tạo đúng bề rộng đích để lần render đầu
  // không nở ra từ 0.
  const widthValues = useRef<Record<string, Animated.Value>>({}).current;
  const widthOf = (key: string, target: number) => {
    if (!widthValues[key]) widthValues[key] = new Animated.Value(target);
    return widthValues[key];
  };

  useEffect(() => {
    const animations = visibleTabs.map((tab, i) =>
      Animated.timing(
        widthOf(tab.key, i === index ? activeWidth : inactiveWidth),
        {
          toValue: i === index ? activeWidth : inactiveWidth,
          duration: EXPAND_DURATION,
          easing: Easing.out(Easing.cubic),
          // Bề rộng là thuộc tính layout, native driver không nhận.
          useNativeDriver: false,
        },
      ),
    );
    const animation = Animated.parallel(animations);
    animation.start();

    return () => animation.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeWidth, inactiveWidth, index, visibleTabs]);

  const handlePress = (tab: TabItem) => {
    if (tab.key !== activeTab) tapHaptic();

    onTabPress(tab.key, tab.label);
  };

  if (visibleTabs.length === 0) {
    return null;
  }

  return (
    <View style={styles.shell}>
      <View style={[styles.bar, { borderColor: hairlineBorderColor }]}>
        {visibleTabs.map((tab, i) => {
          const isActive = i === index;

          return (
            <Animated.View
              key={tab.key}
              style={{ width: widthOf(tab.key, isActive ? activeWidth : inactiveWidth) }}
            >
              <TouchableOpacity
                style={[styles.item, isActive && styles.itemActive]}
                onPress={() => handlePress(tab)}
                activeOpacity={0.85}
                accessibilityRole="tab"
                accessibilityLabel={tab.label}
                aria-selected={isActive}
              >
                <View style={styles.iconWrap}>
                  <Ionicons
                    name={tab.icon}
                    size={ICON_SIZE}
                    color={isActive ? "#fff" : c.textSub}
                  />
                  {/* Đang ở trong mục thì không cần badge nhắc nữa. */}
                  {tab.badge && !isActive ? (
                    <TabBadge badge={tab.badge} styles={styles} />
                  ) : null}
                </View>
                {isActive ? (
                  <Text
                    allowFontScaling={false}
                    numberOfLines={1}
                    style={styles.label}
                  >
                    {tab.label}
                  </Text>
                ) : null}
              </TouchableOpacity>
            </Animated.View>
          );
        })}
      </View>
    </View>
  );
}

/**
 * "dot" = có nội dung nhưng không đếm được (ghi chú là một khối text, không phải
 * danh sách); số = đếm được (số tệp đính kèm).
 */
function TabBadge({
  badge,
  styles,
}: {
  badge: number | "dot";
  styles: ReturnType<typeof makeStyles>;
}) {
  if (badge === "dot") return <View style={styles.badgeDot} />;
  if (badge <= 0) return null;

  return (
    <View style={styles.badge}>
      <Text style={styles.badgeText} allowFontScaling={false}>
        {badge > 99 ? "99+" : badge}
      </Text>
    </View>
  );
}

const makeStyles = (c: AppColors) =>
  StyleSheet.create({
    shell: {
      paddingHorizontal: SHELL_INSET,
      paddingTop: SHELL_GAP,
      paddingBottom: SHELL_GAP,
    },
    bar: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: c.surface,
      height: SECTION_TABS_HEIGHT,
      paddingHorizontal: BAR_PADDING,
      borderRadius: SECTION_TABS_HEIGHT / 2,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.border,
      shadowColor: c.shadow,
      shadowOpacity: 0.1,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 4 },
      elevation: 6,
    },
    item: {
      height: ITEM_HEIGHT,
      borderRadius: ITEM_HEIGHT / 2,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      // Nhãn bị cắt gọn trong lúc pill đang nở, trông như chữ được hé ra.
      overflow: "hidden",
    },
    itemActive: {
      backgroundColor: c.red,
    },
    iconWrap: {
      width: ICON_SIZE,
      height: ICON_SIZE,
      alignItems: "center",
      justifyContent: "center",
    },
    label: {
      marginLeft: LABEL_GAP,
      fontSize: 12,
      fontWeight: "700",
      color: "#fff",
    },
    badge: {
      position: "absolute",
      top: -6,
      left: ICON_SIZE - 6,
      minWidth: 16,
      height: 16,
      borderRadius: 8,
      paddingHorizontal: 4,
      backgroundColor: c.red,
      alignItems: "center",
      justifyContent: "center",
    },
    badgeText: {
      color: "#fff",
      fontSize: 9,
      fontWeight: "800",
    },
    badgeDot: {
      position: "absolute",
      top: -2,
      left: ICON_SIZE - 4,
      width: 7,
      height: 7,
      borderRadius: 4,
      backgroundColor: c.red,
    },
  });
