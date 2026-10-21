import React from "react";
import { StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import AssetFormSkeleton from "../../../../components/assets/shared/AssetFormSkeleton";
import { createAssetFormBaseStyles } from "../../../../components/assets/shared/assetFormStyles";
import SkeletonBlock from "../../../../components/ui/SkeletonBlock";
import { useSkeletonPulse } from "../../../../components/ui/useSkeletonAutoFill";
import { AppColors, useAppColors, useStyles } from "../../../../utils/helpers/colors";

/** Dáng nút ở thanh lưu — hai dáng `WorkflowButton` mà ba form dùng. */
export type WorkflowFormSkeletonButton = "neutral" | "primary";

/** Dòng tên quy trình của form Flow (`flowName`): chữ 13 ≈ 15.5 + `marginBottom` 10. */
const FLOW_NAME_LINE = 15.5;
const FLOW_NAME_BAR = 12;

/**
 * Khung chờ form thêm / sửa phiếu, công việc, kế hoạch lúc chờ metadata, người
 * dùng hoặc bản ghi cần sửa. Ba form đều dựng trên `AssetFormScreenShell` +
 * `createAssetFormBaseStyles`, nên dùng lại đúng khung chờ form tài sản trong
 * đúng lề `scrollContent` của chúng.
 *
 * Thanh lưu dưới đáy của shell (nền trắng ≈ 98pt có safe area) cũng vẽ luôn:
 * thiếu nó thì lúc form thật thay vào, cả một dải trắng bật lên che đáy màn.
 */
export default function WorkflowFormSkeleton({
  footerButtons = ["primary"],
  flowName = false,
  header,
}: {
  /**
   * Nút ở thanh lưu, trái sang phải. Flow: Lưu nháp (neutral) · Lưu phiếu
   * (primary); Công việc / Kế hoạch: một nút Lưu tràn ngang.
   */
  footerButtons?: WorkflowFormSkeletonButton[];
  /** Form Flow: chừa dòng tên quy trình phía trên các nhóm (tên đến cùng metadata). */
  flowName?: boolean;
  /**
   * Phần đầu form đã biết trước khi tải xong (vd khung "Giao công việc từ
   * phiếu" — lấy từ route param), vẽ thật phía trên các nhóm field.
   */
  header?: React.ReactNode;
}) {
  const styles = useStyles(makeStyles);
  const c = useAppColors();
  const insets = useSafeAreaInsets();
  // `AssetFormSkeleton` tự chạy nhịp riêng; hai nhịp cùng khởi động trong một
  // lượt mount nên vẫn sáng tối cùng lúc.
  const opacity = useSkeletonPulse();

  return (
    <View style={styles.container}>
      <View style={[styles.scrollContent, styles.fill]}>
        {header}
        {flowName ? <SkeletonBlock opacity={opacity} style={styles.flowName} /> : null}
        <AssetFormSkeleton />
      </View>

      {/* Số đo `footer` của `AssetFormScreenShell`: nền trắng, gạch mảnh trên,
          đệm 10 trên / safe area (tối thiểu 12) + 10 dưới, nút 44. */}
      <View
        style={[
          styles.footer,
          { borderTopColor: c.separator, paddingBottom: Math.max(insets.bottom, 12) + 10 },
        ]}
      >
        <View style={styles.footerRow}>
          {footerButtons.map((variant, index) => (
            /* Vỏ nút giữ đúng màu thật (đỏ / trắng viền xám), chỉ ruột (icon +
               nhãn) nhấp nháy — cùng lối `SkeletonFab` của `RecordListSkeleton`:
               tô cả nút xám rồi đổi sang đỏ là một nhịp nhảy màu ngay đáy màn. */
            <View
              key={index}
              style={[styles.button, variant === "primary" ? styles.buttonPrimary : styles.buttonNeutral]}
            >
              <SkeletonBlock
                opacity={opacity}
                style={[styles.buttonIcon, variant === "primary" && styles.onBrand]}
              />
              <SkeletonBlock
                opacity={opacity}
                style={[styles.buttonLabel, variant === "primary" && styles.onBrand]}
              />
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}

const makeStyles = (c: AppColors) => {
  const base = createAssetFormBaseStyles(c);
  return StyleSheet.create({
    container: base.container,
    scrollContent: base.scrollContent,
    fill: {
      flex: 1,
    },
    // `flowName` của `FlowFormScreen`.
    flowName: {
      width: "46%",
      height: FLOW_NAME_BAR,
      marginTop: (FLOW_NAME_LINE - FLOW_NAME_BAR) / 2,
      marginBottom: 10 + (FLOW_NAME_LINE - FLOW_NAME_BAR) / 2,
      borderRadius: 6,
    },
    footer: {
      position: "absolute",
      left: 0,
      right: 0,
      bottom: 0,
      paddingHorizontal: 16,
      paddingTop: 10,
      backgroundColor: c.surface,
      borderTopWidth: StyleSheet.hairlineWidth,
    },
    // `footerRow` của Flow (gap 10); một nút thì nút tràn ngang như nút thật
    // đứng một mình trong footer.
    footerRow: {
      flexDirection: "row",
      gap: 10,
    },
    // Số đo `WorkflowButton` (`button` + `flex`).
    button: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 6,
      minHeight: 44,
      paddingHorizontal: 10,
      borderRadius: 12,
      borderWidth: 1,
    },
    buttonPrimary: {
      backgroundColor: c.red,
      borderColor: c.red,
    },
    buttonNeutral: {
      backgroundColor: c.surface,
      borderColor: c.borderStrong,
    },
    buttonIcon: {
      width: 17,
      height: 17,
      borderRadius: 6,
    },
    // Nhãn chỉ là vạch mờ trong lòng nút — không quyết định chiều cao nút.
    buttonLabel: {
      width: 60,
      height: 13,
      borderRadius: 6,
    },
    // Ruột trên nền đỏ: trắng mờ thay cho xám `c.skeleton`, như `SkeletonFab`.
    onBrand: {
      backgroundColor: "rgba(255,255,255,0.45)",
    },
  });
};
