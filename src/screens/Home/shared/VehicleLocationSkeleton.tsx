import React from "react";
import { StyleSheet, Text, View } from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";

import SkeletonBlock from "../../../components/ui/SkeletonBlock";
import { useSkeletonPulse } from "../../../components/ui/useSkeletonAutoFill";
import {
  AppColors,
  useAppColors,
  useStrongBorderColor,
  useStyles,
} from "../../../utils/helpers/colors";

const INFO_LABELS = ["Thời điểm ghi nhận", "Trạng thái", "Địa chỉ"];

/**
 * Khung chờ phần dưới ô chọn của màn Vị trí hiện tại (bản iOS và Android dùng
 * chung), lúc đã chọn xe và đang hỏi vị trí.
 *
 * Tên xe vừa chọn, ba nhãn và dòng "Tự động cập nhật" là chữ tĩnh nên hiện
 * thật; chỉ nhãn trạng thái, giá trị và bản đồ là khối xám.
 */
export default function VehicleLocationSkeleton({ vehicleName }: { vehicleName: string }) {
  const styles = useStyles(makeStyles);
  const c = useAppColors();
  const strongBorderColor = useStrongBorderColor();
  const opacity = useSkeletonPulse();

  return (
    <View style={styles.root} accessibilityLabel="Đang tải vị trí hiện tại">
      <View style={[styles.infoCard, { borderColor: strongBorderColor }]}>
        <View style={styles.vehicleHeader}>
          <Text style={styles.vehicleName} numberOfLines={2}>
            {vehicleName}
          </Text>
          <SkeletonBlock opacity={opacity} style={styles.statusBadge} />
        </View>

        {INFO_LABELS.map((label, index) => (
          <View key={label}>
            <Text style={styles.infoLabel}>{label}</Text>
            <SkeletonBlock
              opacity={opacity}
              style={[styles.infoValue, index === 2 && styles.infoValueLong]}
            />
          </View>
        ))}

        <View style={styles.liveRow}>
          <Ionicons name="sync-outline" size={16} color={c.green} />
          <Text style={styles.liveText}>Tự động cập nhật mỗi 5 giây</Text>
        </View>
      </View>
      <SkeletonBlock opacity={opacity} style={styles.map} />
    </View>
  );
}

// Số đo của `VehicleCurrentLocationScreen` (infoCard, vehicleHeader, infoLabel…).
const makeStyles = (c: AppColors) =>
  StyleSheet.create({
    root: {
      flex: 1,
    },
    infoCard: {
      marginHorizontal: 16,
      marginBottom: 10,
      padding: 13,
      borderWidth: 1,
      borderRadius: 12,
      backgroundColor: c.surface,
    },
    vehicleHeader: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },
    vehicleName: {
      flexShrink: 1,
      color: c.text,
      fontSize: 16,
      fontWeight: "700",
    },
    statusBadge: {
      width: 72,
      height: 22,
      borderRadius: 10,
    },
    infoLabel: {
      color: c.red,
      fontSize: 11,
      fontWeight: "700",
      marginTop: 9,
    },
    infoValue: {
      width: "48%",
      height: 12,
      marginTop: 4,
      borderRadius: 6,
    },
    infoValueLong: {
      width: "86%",
    },
    liveRow: {
      flexDirection: "row",
      alignItems: "center",
      marginTop: 11,
    },
    liveText: {
      color: c.green,
      fontSize: 12,
      fontWeight: "600",
      marginLeft: 7,
    },
    map: {
      flex: 1,
    },
  });
