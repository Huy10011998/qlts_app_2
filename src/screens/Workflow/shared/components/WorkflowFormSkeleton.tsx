import React from "react";
import { StyleSheet, View } from "react-native";

import AssetFormSkeleton from "../../../../components/assets/shared/AssetFormSkeleton";
import { createAssetFormBaseStyles } from "../../../../components/assets/shared/assetFormStyles";
import { AppColors, useStyles } from "../../../../utils/helpers/colors";

/**
 * Khung chờ form thêm / sửa phiếu, công việc, kế hoạch lúc chờ metadata, người
 * dùng hoặc bản ghi cần sửa. Ba form đều dựng trên `AssetFormScreenShell` +
 * `createAssetFormBaseStyles`, nên dùng lại đúng khung chờ form tài sản trong
 * đúng lề `scrollContent` của chúng.
 */
export default function WorkflowFormSkeleton() {
  const styles = useStyles(makeStyles);

  return (
    <View style={styles.container}>
      <View style={[styles.scrollContent, styles.fill]}>
        <AssetFormSkeleton />
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
  });
};
