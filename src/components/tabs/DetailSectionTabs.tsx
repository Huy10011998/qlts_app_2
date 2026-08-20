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
import { READABLE_TEXT_MAX_SCALE } from "../../utils/helpers/textScaling";

const SHELL_INSET = 12;
const SHELL_GAP = 10;
export const SECTION_TABS_HEIGHT = 54;
const BAR_PADDING = 6;
const ITEM_HEIGHT = 38;
const ICON_SIZE = 20;
const LABEL_GAP = 6;
const PILL_PADDING = 12;

const CHAR_WIDTH = 6.8;
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

export const computeTabWidths = ({
  contentWidth,
  tabCount,
  activeLabelLength,
  fontScale = 1,
}: {
  contentWidth: number;
  tabCount: number;
  activeLabelLength: number;
  /** Cỡ chữ hệ thống đã kẹp trần — nhãn to ra thì pill phải rộng ra theo. */
  fontScale?: number;
}) => {
  const activeWidth = Math.min(
    ICON_SIZE +
      LABEL_GAP +
      Math.ceil(activeLabelLength * CHAR_WIDTH * fontScale) +
      PILL_PADDING * 2,
    Math.floor(contentWidth * MAX_PILL_RATIO),
  );

  if (tabCount <= 1) {
    return { activeWidth, inactiveWidth: contentWidth, gap: 0 };
  }

  const rest = contentWidth - activeWidth;
  // Màn quá hẹp thì thu ô icon lại cho vừa, chấp nhận hết khe hở.
  const inactiveWidth = Math.min(ITEM_HEIGHT, rest / (tabCount - 1));

  return {
    activeWidth,
    inactiveWidth,
    gap: (rest - inactiveWidth * (tabCount - 1)) / (tabCount - 1),
  };
};

export default function DetailSectionTabs({
  tabs,
  activeTab,
  onTabPress,
}: DetailSectionTabsProps) {
  const styles = useStyles(makeStyles);
  const c = useAppColors();
  const { width: screenWidth, fontScale } = useWindowDimensions();
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
    fontScale: Math.min(fontScale, READABLE_TEXT_MAX_SCALE),
  });

  // Một Animated.Value cho mỗi mục, khởi tạo đúng bề rộng đích để lần render đầu
  // không nở ra từ 0.
  const widthValues = useRef<Record<string, Animated.Value>>({}).current;
  const widthOf = (key: string, target: number) => {
    if (!widthValues[key]) widthValues[key] = new Animated.Value(target);
    return widthValues[key];
  };

  /**
   * Chỉ ngón tay mới được kéo animation. Bề rộng là thuộc tính layout nên phải
   * chạy trên JS driver; đổi tab bằng code thì thời điểm đổi hay trùng lúc
   * navigator đang chạy hiệu ứng chuyển màn (nút "bản ghi gốc" ở AssetRelatedList
   * pop về kèm `activeTab`), hai thứ tranh nhau JS thread nên thấy giật. Những lúc
   * đó nhảy thẳng tới bề rộng đích: màn hiện ra là đã đúng hình, không ai kịp thấy
   * animation mà cũng chẳng mất gì.
   *
   * Cùng lý do, lần render đầu và lúc đổi bề rộng màn hình (quay máy, hoặc quyền
   * về muộn làm số mục thay đổi) đều nhảy thẳng.
   */
  const fromTapRef = useRef(false);

  useEffect(() => {
    const targetOf = (i: number) => (i === index ? activeWidth : inactiveWidth);

    if (!fromTapRef.current) {
      visibleTabs.forEach((tab, i) =>
        widthOf(tab.key, targetOf(i)).setValue(targetOf(i)),
      );
      return;
    }

    fromTapRef.current = false;

    const animation = Animated.parallel(
      visibleTabs.map((tab, i) =>
        Animated.timing(widthOf(tab.key, targetOf(i)), {
          toValue: targetOf(i),
          duration: EXPAND_DURATION,
          easing: Easing.out(Easing.cubic),
          // Bề rộng là thuộc tính layout, native driver không nhận.
          useNativeDriver: false,
        }),
      ),
    );
    animation.start();

    return () => animation.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeWidth, inactiveWidth, index, visibleTabs]);

  const handlePress = (tab: TabItem) => {
    if (tab.key !== activeTab) tapHaptic();

    fromTapRef.current = true;
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
              style={{
                width: widthOf(tab.key, isActive ? activeWidth : inactiveWidth),
              }}
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
      <Text style={styles.badgeText}>
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
      justifyContent: "space-between",
      backgroundColor: c.surface,
      minHeight: SECTION_TABS_HEIGHT,
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
      minHeight: ITEM_HEIGHT,
      borderRadius: ITEM_HEIGHT / 2,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
    },
    itemActive: {
      backgroundColor: c.red,
      // Chỉ cắt gọn ở mục đang chọn: nhãn bị xén trong lúc pill nở, trông như chữ
      // được hé ra. Mục còn lại phải để tràn, kẻo badge nhô ra khỏi ô bị cắt mất.
      overflow: "hidden",
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
      /**
       * Neo mép phải chứ không neo mép trái: badge rộng ra theo số chữ số (1 → 99+),
       * neo trái thì nó bò ra ngoài ô 38px và bị mép ô cắt mất; neo phải thì nó nở
       * ngược vào phía icon, mép phải luôn đứng yên cách mép ô 3px.
       */
      right: -5,
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
      right: -3,
      width: 7,
      height: 7,
      borderRadius: 4,
      backgroundColor: c.red,
    },
  });
