import React from "react";
import { ScrollView, StyleSheet, View } from "react-native";

import SkeletonBlock from "../../../../components/ui/SkeletonBlock";
import { useSkeletonPulse } from "../../../../components/ui/useSkeletonAutoFill";
import { AppColors, useStyles } from "../../../../utils/helpers/colors";
import { elevation } from "../../../../utils/helpers/tokens";
import { WORKFLOW_MENU_GROUPS } from "../../workflowMenu";

/**
 * Khung chờ màn Workflow lúc bộ quyền / số nhắc chưa về. Chưa biết nhóm nào được
 * xem nên dựng theo menu đầy đủ (`WORKFLOW_MENU_GROUPS`) — cùng số nhóm, số thẻ
 * và kích thước thẻ của màn thật, kể cả hàng số nhắc của chức năng có đếm.
 */
export default function WorkflowMenuSkeleton() {
  const styles = useStyles(makeStyles);
  const opacity = useSkeletonPulse();

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      scrollEnabled={false}
      accessibilityLabel="Đang tải chức năng"
    >
      {WORKFLOW_MENU_GROUPS.map((group) => (
        <View key={group.key} style={styles.group}>
          <SkeletonBlock opacity={opacity} style={styles.groupTitle} />
          {group.items.map((item) => (
            <View key={item.key} style={styles.card}>
              <SkeletonBlock opacity={opacity} style={styles.icon} />
              <View style={styles.body}>
                <SkeletonBlock opacity={opacity} style={styles.label} />
                <SkeletonBlock opacity={opacity} style={styles.description} />
                {/* Phiếu và Công việc có số nhắc (dem-tab); Kế hoạch không có API đếm. */}
                {item.route === "Flow" || item.route === "CongViec" ? (
                  <View style={styles.hints}>
                    <SkeletonBlock opacity={opacity} style={styles.hint} />
                    <SkeletonBlock opacity={opacity} style={[styles.hint, styles.hintShort]} />
                  </View>
                ) : null}
              </View>
              <SkeletonBlock opacity={opacity} style={styles.chevron} />
            </View>
          ))}
        </View>
      ))}
    </ScrollView>
  );
}

// Số đo của `WorkflowScreen`.
const makeStyles = (c: AppColors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: c.bg,
    },
    content: {
      padding: 16,
      paddingBottom: 32,
    },
    group: {
      marginBottom: 18,
    },
    groupTitle: {
      width: 92,
      height: 12,
      borderRadius: 6,
      marginTop: 2,
      marginBottom: 10,
      marginLeft: 4,
    },
    card: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: c.surface,
      borderRadius: 16,
      padding: 14,
      marginBottom: 10,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.hairline,
      ...elevation(c.shadow, 1),
    },
    icon: {
      width: 44,
      height: 44,
      borderRadius: 14,
      marginRight: 12,
    },
    body: {
      flex: 1,
      marginRight: 8,
      gap: 8,
    },
    label: {
      width: "42%",
      height: 15,
      borderRadius: 6,
    },
    description: {
      width: "68%",
      height: 12,
      borderRadius: 6,
    },
    // Viên số nhắc: chữ 12 + paddingVertical 2.
    hints: {
      flexDirection: "row",
      gap: 6,
    },
    hint: {
      width: 72,
      height: 18,
      borderRadius: 999,
    },
    hintShort: {
      width: 56,
    },
    chevron: {
      width: 16,
      height: 16,
      borderRadius: 5,
    },
  });
