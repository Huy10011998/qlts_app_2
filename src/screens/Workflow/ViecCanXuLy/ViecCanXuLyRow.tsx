import React, { useCallback } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import Ionicons from "react-native-vector-icons/Ionicons";

import type { StackNavigation, WorkflowThongBao } from "../../../types/index";
import { AppColors, useAppColors, useStyles } from "../../../utils/helpers/colors";
import { elevation } from "../../../utils/helpers/tokens";
import { tint } from "../shared/workflowConstants";
import { formatViecTime, getViecLoai, resolveViecTarget } from "./viecCanXuLyRules";

/** Mở phiếu / danh sách phiếu chờ duyệt / công việc của một dòng. */
export const useOpenViec = () => {
  const navigation = useNavigation<StackNavigation<"ViecCanXuLy">>();

  return useCallback(
    (item: WorkflowThongBao) => {
      const target = resolveViecTarget(item);
      if (!target) return;

      switch (target.route) {
        case "FlowChiTiet":
          navigation.navigate("FlowChiTiet", target.params);
          break;
        case "Flow":
          navigation.navigate("Flow", target.params);
          break;
        case "CongViecChiTiet":
          navigation.navigate("CongViecChiTiet", target.params);
          break;
      }
    },
    [navigation],
  );
};

type Props = {
  item: WorkflowThongBao;
  onPress: (item: WorkflowThongBao) => void;
};

/** Một dòng của màn Việc cần xử lý. */
export default function ViecCanXuLyRow({ item, onPress }: Props) {
  const styles = useStyles(makeStyles);
  const c = useAppColors();
  const loai = getViecLoai(item.loai);
  const canOpen = !!resolveViecTarget(item);

  return (
    <TouchableOpacity
      activeOpacity={canOpen ? 0.75 : 1}
      disabled={!canOpen}
      onPress={() => onPress(item)}
      style={styles.row}
    >
      <View style={[styles.icon, { backgroundColor: tint(loai.color, "22") }]}>
        <Ionicons name={loai.icon} size={20} color={loai.color} />
      </View>
      <View style={styles.body}>
        <View style={styles.topLine}>
          <Text style={[styles.loai, { color: loai.color }]} numberOfLines={1}>
            {loai.label}
          </Text>
          <Text style={styles.time}>{formatViecTime(item.thoiGian)}</Text>
        </View>
        {item.tieuDe ? (
          <Text style={styles.title} numberOfLines={2}>
            {item.tieuDe}
          </Text>
        ) : null}
        {item.noiDung ? (
          <Text style={styles.content} numberOfLines={3}>
            {item.noiDung}
          </Text>
        ) : null}
      </View>
      {canOpen ? <Ionicons name="chevron-forward" size={18} color={c.textMuted} /> : null}
    </TouchableOpacity>
  );
}

const makeStyles = (c: AppColors) =>
  StyleSheet.create({
    row: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: c.surface,
      borderRadius: 14,
      padding: 12,
      marginBottom: 8,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.hairline,
      ...elevation(c.shadow, 1),
    },
    icon: {
      width: 40,
      height: 40,
      borderRadius: 12,
      alignItems: "center",
      justifyContent: "center",
      marginRight: 12,
    },
    body: {
      flex: 1,
      marginRight: 6,
    },
    topLine: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },
    loai: {
      flex: 1,
      fontSize: 12,
      fontWeight: "700",
    },
    time: {
      fontSize: 11,
      color: c.textSub,
    },
    title: {
      fontSize: 14,
      fontWeight: "700",
      color: c.text,
      marginTop: 3,
    },
    content: {
      fontSize: 13,
      color: c.textSecondary,
      marginTop: 2,
    },
  });
