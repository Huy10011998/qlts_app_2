import React, { useEffect, useRef, useState } from "react";
import {
  NativeScrollEvent,
  NativeSyntheticEvent,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import type { GroupListProps } from "../../../types";
import { AppColors, useStyles } from "../../../utils/helpers/colors";
import AssetGroupList from "../AssetGroupList";

/** Lề trên chừa lại giữa hàng nút và thẻ nhóm vừa nhảy tới. */
const JUMP_GAP = 8;

type Props = GroupListProps & {
  refreshControl?: React.ReactElement<any>;
};

/**
 * Tab Thông tin của màn chi tiết: các thẻ nhóm field, trên cùng là hàng nút tên
 * nhóm dính đầu khi cuộn. Bấm nút là cuộn tới đúng thẻ (thẻ đang gập thì mở ra),
 * nút của nhóm đang xem tô đỏ — bản ghi nhiều nhóm khỏi phải cuộn tay tìm.
 *
 * Chỉ hiện hàng nút khi có từ hai nhóm.
 */
export default function AssetGroupScrollView({
  refreshControl,
  ...listProps
}: Props) {
  const s = useStyles(makeStyles);
  const { groupedFields, collapsedGroups, toggleGroup } = listProps;
  const groupNames = Object.keys(groupedFields);
  const showBar = groupNames.length > 1;

  const scrollRef = useRef<ScrollView>(null);
  const chipScrollRef = useRef<ScrollView>(null);
  const groupY = useRef<Record<string, number>>({});
  const chipX = useRef<Record<string, number>>({});
  // Bấm nút thì giữ nút đó sáng tới khi người dùng tự kéo: nhóm cuối ngắn không
  // cuộn lên tới đỉnh được, tính theo vị trí cuộn sẽ sáng nhầm nhóm trên.
  const pinnedRef = useRef<string | null>(null);
  const [barHeight, setBarHeight] = useState(0);
  const [active, setActive] = useState<string | null>(null);
  // Nhóm về sau lần vẽ đầu (hoặc đổi bản ghi) thì sáng nhóm đầu tiên.
  const shownActive =
    active && groupNames.includes(active) ? active : groupNames[0];

  // Nút đang sáng luôn nằm trong tầm nhìn của hàng nút.
  useEffect(() => {
    const x = shownActive ? chipX.current[shownActive] : undefined;
    if (x == null) return;
    chipScrollRef.current?.scrollTo({ x: Math.max(0, x - 16), animated: true });
  }, [shownActive]);

  const jumpTo = (name: string) => {
    if (collapsedGroups[name]) toggleGroup(name);

    pinnedRef.current = name;
    setActive(name);

    const y = groupY.current[name];
    if (y == null) return;
    scrollRef.current?.scrollTo({
      y: Math.max(0, y - barHeight - JUMP_GAP),
      animated: true,
    });
  };

  const handleScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (!showBar || pinnedRef.current) return;

    const top = e.nativeEvent.contentOffset.y + barHeight + JUMP_GAP + 1;
    let current = groupNames[0];
    for (const name of groupNames) {
      const y = groupY.current[name];
      if (y != null && y <= top) current = name;
    }
    if (current !== shownActive) setActive(current);
  };

  return (
    <ScrollView
      ref={scrollRef}
      contentContainerStyle={s.scrollContent}
      refreshControl={refreshControl}
      stickyHeaderIndices={showBar ? [0] : undefined}
      onScroll={handleScroll}
      onScrollBeginDrag={() => {
        pinnedRef.current = null;
      }}
      scrollEventThrottle={32}
    >
      {showBar && (
        <View
          style={s.bar}
          onLayout={(e) => setBarHeight(e.nativeEvent.layout.height)}
        >
          <ScrollView
            ref={chipScrollRef}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={s.chipRow}
          >
            {groupNames.map((name) => {
              const isActive = name === shownActive;
              return (
                <TouchableOpacity
                  key={name}
                  style={[s.chip, isActive && s.chipActive]}
                  onPress={() => jumpTo(name)}
                  onLayout={(e) => {
                    chipX.current[name] = e.nativeEvent.layout.x;
                  }}
                  activeOpacity={0.75}
                  accessibilityRole="button"
                  accessibilityLabel={`Tới nhóm ${name}`}
                  accessibilityState={{ selected: isActive }}
                >
                  <Text
                    style={[s.chipText, isActive && s.chipTextActive]}
                    numberOfLines={1}
                  >
                    {name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      )}

      <AssetGroupList
        {...listProps}
        onGroupLayout={(name, y) => {
          groupY.current[name] = y;
        }}
      />
    </ScrollView>
  );
}

const makeStyles = (c: AppColors) =>
  StyleSheet.create({
    scrollContent: {
      padding: 16,
      paddingBottom: 20,
    },

    // Phủ cả lề ngang của ScrollView và đè lề trên, để lúc dính đầu nền hàng nút
    // che kín thẻ trượt bên dưới.
    bar: {
      marginTop: -16,
      marginHorizontal: -16,
      marginBottom: 4,
      paddingVertical: 10,
      backgroundColor: c.bg,
    },

    chipRow: {
      paddingHorizontal: 16,
      gap: 8,
    },

    chip: {
      paddingHorizontal: 14,
      paddingVertical: 7,
      borderRadius: 16,
      backgroundColor: c.surface,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.borderStrong,
    },

    chipActive: {
      backgroundColor: c.red,
      borderColor: c.red,
    },

    chipText: {
      fontSize: 13,
      fontWeight: "600",
      color: c.textSecondary,
    },

    chipTextActive: {
      color: c.onBrand,
    },
  });
