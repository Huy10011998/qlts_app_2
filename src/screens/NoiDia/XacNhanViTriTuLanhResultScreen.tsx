import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import Ionicons from "react-native-vector-icons/Ionicons";

import type { StackNavigation, StackRoute } from "../../types/index";
import ScreenContainer from "../shared/ScreenContainer";
import { AppColors, useAppColors, useStyles } from "../../utils/helpers/colors";
import { EMPTY_VALUE } from "./shared/noiDiaFormat";

/** Bước [3]: chốt lượt vừa gửi và mở hai lối đi tiếp của nghiệp vụ. */
export default function XacNhanViTriTuLanhResultScreen() {
  const styles = useStyles(makeStyles);
  const c = useAppColors();
  const navigation =
    useNavigation<StackNavigation<"XacNhanViTriTuLanhResult">>();
  const { fridge } = useRoute<StackRoute<"XacNhanViTriTuLanhResult">>().params;

  return (
    <ScreenContainer>
      <View style={styles.root}>
        <View style={styles.iconCircle}>
          <Ionicons name="checkmark" size={44} color={c.green} />
        </View>

        <Text style={styles.title}>Xác nhận thành công</Text>
        <Text style={styles.subtitle}>{fridge.label}</Text>
        <Text style={styles.serial}>
          Seri: {fridge.serialNumber || EMPTY_VALUE}
        </Text>

        <TouchableOpacity
          style={styles.primaryButton}
          // Màn này thay thế màn nhập liệu trong stack, dưới nó là lịch sử của
          // chính tủ vừa xác nhận — `popTo` để lịch sử tự gọi lại API và hiện
          // ngay lượt vừa gửi.
          onPress={() =>
            navigation.popTo("XacNhanViTriTuLanhLichSu", { fridge })
          }
        >
          <Ionicons name="time-outline" size={18} color="#fff" />
          <Text style={styles.primaryButtonText}>Xem lịch sử</Text>
        </TouchableOpacity>
      </View>
    </ScreenContainer>
  );
}

const makeStyles = (c: AppColors) =>
  StyleSheet.create({
    root: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 32,
    },
    iconCircle: {
      width: 88,
      height: 88,
      borderRadius: 44,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: c.greenLight,
      borderWidth: 1,
      borderColor: c.greenBorder,
    },
    title: {
      marginTop: 18,
      fontSize: 19,
      fontWeight: "800",
      color: c.text,
    },
    subtitle: {
      marginTop: 10,
      fontSize: 15,
      fontWeight: "600",
      color: c.textSecondary,
      textAlign: "center",
    },
    serial: {
      marginTop: 4,
      fontSize: 13,
      color: c.textSub,
    },
    primaryButton: {
      marginTop: 28,
      alignSelf: "stretch",
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      paddingVertical: 14,
      borderRadius: 12,
      backgroundColor: c.red,
    },
    primaryButtonText: {
      fontSize: 15,
      fontWeight: "700",
      color: "#fff",
    },
    secondaryButton: {
      marginTop: 10,
      alignSelf: "stretch",
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      paddingVertical: 14,
      borderRadius: 12,
      backgroundColor: c.redSurface,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.redBorder,
    },
    secondaryButtonText: {
      fontSize: 15,
      fontWeight: "700",
      color: c.red,
    },
  });
