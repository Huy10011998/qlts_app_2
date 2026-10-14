import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import MaterialIcons from "react-native-vector-icons/MaterialIcons";

import type { ThongBaoItem } from "../../types/index";
import { AppColors, useSchemeColor, useStyles } from "../../utils/helpers/colors";
import { tint } from "../Workflow/shared/workflowConstants";
import {
  formatThongBaoTime,
  getNhomLabel,
  getThongBaoStyle,
  ICON_BG_ALPHA,
  UNREAD_BG,
  UNREAD_BG_DARK,
  UNREAD_DOT,
} from "./thongBaoRules";

type Props = {
  item: ThongBaoItem;
  onPress: (item: ThongBaoItem) => void;
};

/**
 * 1 thông báo (mục 5): icon nền tròn màu nhạt, chưa đọc = nền dòng #f1f6fd +
 * tiêu đề đậm + chấm xanh bên phải; dòng dưới là nhãn nhóm + thời gian.
 * Dùng chung cho bảng thả xuống ở chuông và màn "Xem tất cả".
 */
export default function ThongBaoRow({ item, onPress }: Props) {
  const styles = useStyles(makeStyles);
  const unreadBg = useSchemeColor(UNREAD_BG, UNREAD_BG_DARK);
  const style = getThongBaoStyle(item);
  const unread = !item.daDoc;

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={() => onPress(item)}
      style={[styles.row, unread && { backgroundColor: unreadBg }]}
      accessibilityRole="button"
      accessibilityLabel={`${unread ? "Chưa đọc. " : ""}${item.tieuDe ?? ""}`}
    >
      <View style={[styles.icon, { backgroundColor: tint(style.color, ICON_BG_ALPHA) }]}>
        <MaterialIcons name={style.icon} size={20} color={style.color} />
      </View>
      <View style={styles.body}>
        {item.tieuDe ? (
          <Text style={[styles.title, unread && styles.titleUnread]} numberOfLines={2}>
            {item.tieuDe}
          </Text>
        ) : null}
        {item.noiDung ? (
          <Text style={styles.content} numberOfLines={2}>
            {item.noiDung}
          </Text>
        ) : null}
        <Text style={styles.meta} numberOfLines={1}>
          {getNhomLabel(item.nhom)} · {formatThongBaoTime(item.ngayTao)}
        </Text>
      </View>
      {unread ? <View style={styles.dot} /> : null}
    </TouchableOpacity>
  );
}

const makeStyles = (c: AppColors) =>
  StyleSheet.create({
    row: {
      flexDirection: "row",
      alignItems: "flex-start",
      backgroundColor: c.surface,
      paddingHorizontal: 14,
      paddingVertical: 12,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: c.separator,
    },
    icon: {
      width: 38,
      height: 38,
      borderRadius: 19,
      alignItems: "center",
      justifyContent: "center",
      marginRight: 12,
    },
    body: {
      flex: 1,
      marginRight: 8,
    },
    title: {
      fontSize: 14,
      fontWeight: "400",
      color: c.text,
    },
    titleUnread: {
      fontWeight: "700",
    },
    content: {
      fontSize: 13,
      color: c.textSecondary,
      marginTop: 2,
    },
    meta: {
      fontSize: 11.5,
      color: c.textSub,
      marginTop: 4,
    },
    dot: {
      width: 9,
      height: 9,
      borderRadius: 5,
      backgroundColor: UNREAD_DOT,
      alignSelf: "center",
    },
  });
