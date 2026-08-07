import React from "react";
import { StyleSheet, Text, View } from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";

import { makeSharedAssetListStyles } from "../../../components/assets/shared/listStyles";
import { BRAND_RED } from "../../../components/assets/shared/listTheme";
import {
  AppColors,
  useHairlineBorderColor,
  useStyles,
} from "../../../utils/helpers/colors";
import { displayValue } from "./noiDiaFormat";

/**
 * Thẻ tên tủ trên đầu hai màn lịch sử nội địa.
 *
 * Dùng đúng khung thẻ của danh sách tài sản nhưng tách MÃ / TÊN / SERI thành ba
 * dòng riêng: gộp "Mã - Tên" một dòng thì mã seri dài (18 ký tự) đẩy tên tủ ra
 * ngoài màn và bị cắt cụt, đúng thứ người dùng cần đọc lại mất.
 */
export default function FridgeSummaryHeader({
  ma,
  ten,
  serialNumber,
}: {
  ma?: string | null;
  ten?: string | null;
  serialNumber?: string | null;
}) {
  const sharedStyles = useStyles(makeSharedAssetListStyles);
  const styles = useStyles(makeStyles);
  const hairlineBorderColor = useHairlineBorderColor();

  return (
    <View style={sharedStyles.stickyHeader}>
      <View
        style={[sharedStyles.filterCard, { borderColor: hairlineBorderColor }]}
      >
        <View style={sharedStyles.filterCardIcon}>
          <Ionicons name="snow-outline" size={16} color={BRAND_RED} />
        </View>

        <View style={sharedStyles.filterCardContent}>
          <Text style={styles.code} numberOfLines={1}>
            {displayValue(ma)}
          </Text>
          <Text style={styles.name} numberOfLines={2}>
            {displayValue(ten)}
          </Text>
          <Text style={styles.serial} numberOfLines={1}>
            Seri: {displayValue(serialNumber)}
          </Text>
        </View>
      </View>
    </View>
  );
}

const makeStyles = (c: AppColors) =>
  StyleSheet.create({
    code: {
      fontSize: 13.5,
      fontWeight: "700",
      color: c.text,
    },
    name: {
      marginTop: 2,
      fontSize: 13,
      color: c.textSecondary,
    },
    serial: {
      marginTop: 2,
      fontSize: 11.5,
      color: c.textSub,
    },
  });
