import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from "react-native";

import { AppColors, useStyles } from "../../../utils/helpers/colors";
import HomeSectionTitle from "./HomeSectionTitle";
import HomeItStructureCard from "./HomeItStructureCard";
import HomeMachineGrowthCard from "./HomeMachineGrowthCard";
import HomeMachineStructureCard from "./HomeMachineStructureCard";
import type {
  HomeDashboardItCategory,
  HomeMachineDashboardPayload,
} from "./homeData";
import { HOME_BRAND_RED } from "./homeTheme";

type HomeAssetStructurePagerProps = {
  /** Bề ngang một trang = bề ngang nội dung Trang chủ. */
  pageWidth: number;
  itStructure: { total: number; items: HomeDashboardItCategory[] } | null;
  /** null = chưa có số của endpoint `MayMoc/dashboard`. */
  machine: HomeMachineDashboardPayload | null;
  isDashboardLoading?: boolean;
  isMachineLoading?: boolean;
  hasMachineError?: boolean;
  onRetryMachine?: () => void;
  /**
   * Đổi giá trị này là kéo khu cuộn về trang 1 — dùng cho lượt Làm mới, theo
   * đúng yêu cầu "mặc định luôn mở ở trang 1 sau khi làm mới".
   */
  resetToken?: string;
};

/** Padding ngang của card, trừ ra để biểu đồ rộng đúng vùng vẽ còn lại. */
const CARD_HORIZONTAL_PADDING = 14;
const PAGE_COUNT = 3;

export default function HomeAssetStructurePager({
  pageWidth,
  itStructure,
  machine,
  isDashboardLoading = false,
  isMachineLoading = false,
  hasMachineError = false,
  onRetryMachine,
  resetToken,
}: HomeAssetStructurePagerProps) {
  const styles = useStyles(makeStyles);
  const pagerRef = useRef<ScrollView>(null);
  const [page, setPage] = useState(0);
  const chartWidth = Math.max(0, pageWidth - CARD_HORIZONTAL_PADDING * 2);

  const goToPage = useCallback(
    (nextPage: number, animated = true) => {
      setPage(nextPage);
      pagerRef.current?.scrollTo({ x: nextPage * pageWidth, animated });
    },
    [pageWidth],
  );

  useEffect(() => {
    if (resetToken === undefined) return;

    goToPage(0, false);
    // Chỉ chạy theo lượt làm mới, không chạy lại mỗi khi bề ngang đổi.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resetToken]);

  const handleScrollEnd = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      if (pageWidth <= 0) return;

      const nextPage = Math.round(
        event.nativeEvent.contentOffset.x / pageWidth,
      );

      setPage((current) => (current === nextPage ? current : nextPage));
    },
    [pageWidth],
  );

  return (
    <>
      {/* Tên nhóm cho cả khu, còn tiêu đề riêng của từng trang vẫn nằm trong
          card: chú thích bên phải đếm "Trang n/3" nên dòng này vẫn đổi theo lượt
          vuốt, không để người xem đọc số của trang này thành số của trang kia. */}
      <HomeSectionTitle label="CƠ CẤU TÀI SẢN" />

      <ScrollView
        ref={pagerRef}
        style={styles.pager}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        decelerationRate="fast"
        onMomentumScrollEnd={handleScrollEnd}
        scrollEventThrottle={16}
      >
        {/* Trang cao nhất quyết định chiều cao của cả khu: ScrollView ngang căng
            mọi trang bằng trang cao nhất nên nội dung bên dưới không nhảy lên
            nhảy xuống mỗi lần vuốt. */}
        <View style={[styles.page, { width: pageWidth }]}>
          <HomeMachineStructureCard
            units={machine?.units ?? []}
            totalQuantity={machine?.totalQuantity ?? 0}
            totalValue={machine?.totalValue ?? 0}
            missingRateCurrencies={machine?.missingRateCurrencies ?? []}
            isLoading={isMachineLoading}
            hasError={hasMachineError}
            onRetry={onRetryMachine}
          />
        </View>

        <View style={[styles.page, { width: pageWidth }]}>
          <HomeMachineGrowthCard
            growth={machine?.growth ?? []}
            totalQuantity={machine?.totalQuantity ?? 0}
            totalValue={machine?.totalValue ?? 0}
            chartWidth={chartWidth}
            isLoading={isMachineLoading}
            hasError={hasMachineError}
            onRetry={onRetryMachine}
          />
        </View>

        <View style={[styles.page, { width: pageWidth }]}>
          <HomeItStructureCard
            items={itStructure?.items ?? []}
            total={itStructure?.total ?? 0}
            isLoading={isDashboardLoading}
          />
        </View>
      </ScrollView>

      {/* Chấm chỉ báo phải bấm được: không phải ai cũng nghĩ ra là vuốt ngang. */}
      <View style={styles.dots}>
        {Array.from({ length: PAGE_COUNT }).map((_, pageIndex) => (
          <TouchableOpacity
            key={`asset-dot-${pageIndex}`}
            onPress={() => goToPage(pageIndex)}
            activeOpacity={0.7}
            hitSlop={{ top: 8, right: 6, bottom: 8, left: 6 }}
            accessibilityRole="button"
            accessibilityLabel={`Trang ${pageIndex + 1}`}
          >
            <View
              style={[styles.dot, pageIndex === page && styles.dotActive]}
            />
          </TouchableOpacity>
        ))}
      </View>
    </>
  );
}

const makeStyles = (c: AppColors) =>
  StyleSheet.create({
    pager: {
      alignSelf: "stretch",
    },
    page: {
      // Card bên trong dùng flex:1 nên tự căng bằng trang cao nhất.
      flexDirection: "column",
    },
    dots: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 5,
      minHeight: 24,
      marginTop: 6,
      marginBottom: 14,
    },
    dot: {
      width: 7,
      height: 7,
      borderRadius: 4,
      backgroundColor: c.borderStrong,
    },
    dotActive: {
      width: 22,
      height: 7,
      borderRadius: 4,
      backgroundColor: HOME_BRAND_RED,
    },
  });
