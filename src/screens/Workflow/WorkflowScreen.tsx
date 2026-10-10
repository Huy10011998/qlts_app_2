import React, { useCallback, useMemo, useState } from "react";
import { RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import Ionicons from "react-native-vector-icons/Ionicons";

import EmptyState from "../../components/ui/EmptyState";
import IsLoading from "../../components/ui/IconLoading";
import { usePermission } from "../../hooks/usePermission";
import { cvDemTab } from "../../services/data/congViecApi";
import { flowDemTab } from "../../services/data/flowApi";
import type { StackNavigation } from "../../types/index";
import { AppColors, useAppColors, useStyles } from "../../utils/helpers/colors";
import { elevation } from "../../utils/helpers/tokens";
import { readTabCount, tint } from "./shared/workflowConstants";
import {
  filterWorkflowMenu,
  WORKFLOW_MENU_GROUPS,
  WORKFLOW_VIEW_CODE,
  WorkflowMenuItem,
} from "./workflowMenu";

type Hint = { text: string; color: string };

const HINT_RED = "#e53935";
const HINT_BLUE = "#1e88e5";

/**
 * Màn của view Workflow (view viết riêng, như Camera / ĐHCĐ): nhóm Flow
 * (Ticket phòng ban) và nhóm Công việc (Công việc, Kế hoạch). Mỗi chức năng
 * kèm số nhắc việc lấy từ dem-tab của chính màn đó.
 */
export default function WorkflowScreen() {
  const styles = useStyles(makeStyles);
  const c = useAppColors();
  const navigation = useNavigation<StackNavigation<"Workflow">>();
  const { can, canView, loaded, permissions } = usePermission();
  const [hints, setHints] = useState<Record<string, Hint[]>>({});
  const [refreshing, setRefreshing] = useState(false);

  const groups = useMemo(
    () => (loaded ? filterWorkflowMenu(WORKFLOW_MENU_GROUPS, (name) => can(name, "Read")) : []),
    // `can` đổi tham chiếu mỗi lần render; danh sách chỉ phụ thuộc bộ quyền.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [loaded, permissions],
  );

  /** Số nhắc của một chức năng; lỗi thì bỏ qua — chỉ là thông tin phụ. */
  const loadHint = useCallback(async (item: WorkflowMenuItem): Promise<Hint[]> => {
    try {
      if (item.route === "Flow") {
        const choDuyet = readTabCount(await flowDemTab(item.nameClass), "ChoDuyet");
        return choDuyet ? [{ text: `${choDuyet} chờ duyệt`, color: HINT_RED }] : [];
      }
      if (item.route === "CongViec") {
        const counts = await cvDemTab();
        const quaHan = readTabCount(counts, "QuaHan");
        const chuaXong = readTabCount(counts, "ChuaXong");
        return [
          ...(quaHan ? [{ text: `${quaHan} quá hạn`, color: HINT_RED }] : []),
          ...(chuaXong ? [{ text: `${chuaXong} chưa xong`, color: HINT_BLUE }] : []),
        ];
      }
    } catch {
      // Không có số nhắc vẫn mở được chức năng.
    }
    return [];
  }, []);

  const loadHints = useCallback(async () => {
    const items = groups.flatMap((group) => group.items);
    const results = await Promise.all(items.map(loadHint));
    const next: Record<string, Hint[]> = {};
    items.forEach((item, index) => {
      next[item.key] = results[index];
    });
    setHints(next);
  }, [groups, loadHint]);

  // Quay lại từ một chức năng (vừa duyệt / chuyển trạng thái) là số đổi theo.
  useFocusEffect(
    useCallback(() => {
      loadHints();
    }, [loadHints]),
  );

  const openItem = (item: WorkflowMenuItem) => {
    if (item.route === "Flow") {
      navigation.navigate("Flow", { nameClass: item.nameClass, titleHeader: item.label });
    } else {
      navigation.navigate(item.route, { titleHeader: item.label });
    }
  };

  if (!loaded) return <IsLoading />;

  if (!canView(WORKFLOW_VIEW_CODE)) {
    return (
      <EmptyState
        title="Bạn không có quyền truy cập"
        subtitle="Tài khoản hiện tại không có quyền xem Workflow."
      />
    );
  }

  if (!groups.length) {
    return (
      <EmptyState
        iconName="lock-closed-outline"
        title="Chưa có chức năng"
        subtitle="Tài khoản chưa được cấp quyền xem phiếu đề nghị, công việc hay kế hoạch."
      />
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={async () => {
            setRefreshing(true);
            await loadHints();
            setRefreshing(false);
          }}
        />
      }
    >
      {groups.map((group) => (
        <View key={group.key} style={styles.group}>
          <Text style={styles.groupTitle}>{group.title}</Text>
          {group.items.map((item) => (
            <TouchableOpacity
              key={item.key}
              activeOpacity={0.75}
              style={styles.card}
              onPress={() => openItem(item)}
            >
              <View style={styles.iconWrap}>
                <Ionicons name={item.icon} size={22} color={c.red} />
              </View>
              <View style={styles.body}>
                <Text style={styles.label}>{item.label}</Text>
                <Text style={styles.description} numberOfLines={2}>
                  {item.description}
                </Text>
                {hints[item.key]?.length ? (
                  <View style={styles.hints}>
                    {hints[item.key].map((hint) => (
                      <View
                        key={hint.text}
                        style={[styles.hint, { backgroundColor: tint(hint.color) }]}
                      >
                        <Text style={[styles.hintText, { color: hint.color }]}>{hint.text}</Text>
                      </View>
                    ))}
                  </View>
                ) : null}
              </View>
              <Ionicons name="chevron-forward" size={20} color={c.textMuted} />
            </TouchableOpacity>
          ))}
        </View>
      ))}
    </ScrollView>
  );
}

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
      fontSize: 13,
      fontWeight: "700",
      color: c.textSub,
      textTransform: "uppercase",
      letterSpacing: 0.5,
      marginBottom: 8,
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
    iconWrap: {
      width: 44,
      height: 44,
      borderRadius: 14,
      backgroundColor: c.redSurface,
      alignItems: "center",
      justifyContent: "center",
      marginRight: 12,
    },
    body: {
      flex: 1,
      marginRight: 8,
    },
    label: {
      fontSize: 16,
      fontWeight: "700",
      color: c.text,
    },
    description: {
      fontSize: 13,
      color: c.textSub,
      marginTop: 2,
    },
    hints: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 6,
      marginTop: 6,
    },
    hint: {
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 999,
    },
    hintText: {
      fontSize: 12,
      fontWeight: "700",
    },
  });
