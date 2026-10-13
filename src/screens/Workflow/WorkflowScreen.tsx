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
import {
  CV_TABS,
  FLOW_TABS,
  readTabCount,
  tint,
  WorkflowTabDef,
} from "./shared/workflowConstants";
import {
  filterWorkflowMenu,
  WORKFLOW_MENU_GROUPS,
  WORKFLOW_VIEW_CODE,
  WorkflowMenuItem,
} from "./workflowMenu";

type Hint = { text: string; color: string };

// Màu theo bảng màu BE (maMau công việc, tình trạng phiếu): quá hạn / chờ duyệt
// đỏ, đến hạn / gia hạn cam, chưa xong / đang xử lý xanh, nháp / mới xám.
const HINT_GREY = "#78909c";
const HINT_COLOR: Record<string, string> = {
  ChoDuyet: "#e53935",
  DangXuLy: "#1e88e5",
  Nhap: HINT_GREY,
  ChuaXong: "#1e88e5",
  DenHan: "#fb8c00",
  QuaHan: "#e53935",
  GiaHan: "#fb8c00",
  MoiHomNay: HINT_GREY,
};

/**
 * Mọi tab BE có trả số (`counted`) của màn danh sách, đúng chữ + thứ tự tab;
 * số 0 thì bỏ. Thẻ ngoài vì thế luôn khớp số trên tab bên trong.
 */
const hintsFromTabs = (counts: Record<string, number>, tabs: WorkflowTabDef<string>[]): Hint[] =>
  tabs
    .filter((tab) => tab.counted)
    .flatMap((tab) => {
      const count = readTabCount(counts, tab.key);
      return count
        ? [{ text: `${count} ${tab.label.toLowerCase()}`, color: HINT_COLOR[tab.key] ?? HINT_GREY }]
        : [];
    });

/**
 * Màn của view Workflow (view viết riêng, như Camera / ĐHCĐ): nhóm Flow
 * (Ticket phòng ban) và nhóm Công việc (Công việc, Kế hoạch). Mỗi chức năng
 * kèm số lấy từ dem-tab của chính màn đó — hiện đủ các số BE trả (cùng số
 * trên tab bên trong), không tự lọc. Kế hoạch BE không có API đếm.
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
        return hintsFromTabs(await flowDemTab(item.nameClass), FLOW_TABS);
      }
      if (item.route === "CongViec") {
        return hintsFromTabs(await cvDemTab(), CV_TABS);
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
