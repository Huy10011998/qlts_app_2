import React, { useCallback, useEffect, useMemo, useState } from "react";
import { FlatList, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import Ionicons from "react-native-vector-icons/Ionicons";

import EmptyState from "../../../components/ui/EmptyState";
import IsLoading from "../../../components/ui/IconLoading";
import { usePermission } from "../../../hooks/usePermission";
import { cvThongBao } from "../../../services/data/congViecApi";
import type { StackNavigation, WorkflowThongBao } from "../../../types/index";
import { AppColors, useAppColors, useStyles } from "../../../utils/helpers/colors";
import { elevation } from "../../../utils/helpers/tokens";
import WorkflowTabBar from "../shared/components/WorkflowTabBar";
import { useReloadOnWorkflowChange } from "../shared/useWorkflowVersion";
import { tint } from "../shared/workflowConstants";
import { getWorkflowErrorMessage } from "../shared/workflowErrors";
import { WORKFLOW_VIEW_CODE } from "../workflowMenu";
import {
  formatThongBaoTime,
  getThongBaoLoai,
  resolveThongBaoTarget,
  THONG_BAO_LOAI,
} from "./thongBaoRules";

const ALL = "TatCa";

/**
 * Thông báo của view Workflow (cv-thong-bao, mục 10 của 4-Mobile-CongViec),
 * mở từ chuông ở Trang chủ. Danh sách là ảnh chụp hiện tại — không có trạng
 * thái đã đọc, nên không có badge đếm (xem ghi chú về badge ở thông báo push).
 */
export default function WorkflowThongBaoScreen() {
  const styles = useStyles(makeStyles);
  const c = useAppColors();
  const navigation = useNavigation<StackNavigation<"ThongBao">>();
  const { canView, loaded } = usePermission();
  const allowed = loaded && canView(WORKFLOW_VIEW_CODE);

  const [items, setItems] = useState<WorkflowThongBao[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>(ALL);

  const load = useCallback(async () => {
    try {
      setItems(await cvThongBao());
      setErrorMessage(null);
    } catch (err) {
      setErrorMessage(getWorkflowErrorMessage(err, "Không tải được thông báo."));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (allowed) load();
    else if (loaded) setLoading(false);
  }, [allowed, load, loaded]);

  // Vừa duyệt phiếu / chuyển trạng thái ở màn khác → thông báo đổi theo.
  useReloadOnWorkflowChange(load);

  const tabs = useMemo(() => {
    const countOf = (key: string) => items.filter((item) => item.loai === key).length;
    return [
      { key: ALL, label: "Tất cả", count: items.length || undefined },
      ...THONG_BAO_LOAI.filter((loai) => countOf(loai.key) > 0).map((loai) => ({
        key: loai.key,
        label: loai.label,
        count: countOf(loai.key),
      })),
    ];
  }, [items]);

  // Loại đang lọc không còn thông báo nào (vừa nạp lại) thì về Tất cả.
  useEffect(() => {
    if (filter !== ALL && !tabs.some((tab) => tab.key === filter)) setFilter(ALL);
  }, [filter, tabs]);

  const visible = useMemo(
    () => (filter === ALL ? items : items.filter((item) => item.loai === filter)),
    [filter, items],
  );

  const open = (item: WorkflowThongBao) => {
    const target = resolveThongBaoTarget(item);
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
  };

  if (!loaded || (allowed && loading)) return <IsLoading />;

  if (!allowed) {
    return (
      <EmptyState
        iconName="notifications-off-outline"
        title="Chưa có thông báo"
        subtitle="Tài khoản chưa được cấp quyền Workflow nên không có thông báo công việc / phiếu đề nghị."
      />
    );
  }

  const renderItem = ({ item }: { item: WorkflowThongBao }) => {
    const loai = getThongBaoLoai(item.loai);
    const canOpen = !!resolveThongBaoTarget(item);

    return (
      <TouchableOpacity
        activeOpacity={canOpen ? 0.75 : 1}
        disabled={!canOpen}
        onPress={() => open(item)}
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
            <Text style={styles.time}>{formatThongBaoTime(item.thoiGian)}</Text>
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
  };

  return (
    <View style={styles.container}>
      {items.length ? (
        <WorkflowTabBar tabs={tabs} activeKey={filter} onChange={setFilter} />
      ) : null}
      <FlatList
        data={visible}
        keyExtractor={(item, index) =>
          `${item.loai}-${item.iD_CongViec ?? ""}-${item.tenBang ?? ""}-${item.iD_HoSo ?? ""}-${index}`
        }
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              load();
            }}
          />
        }
        ListEmptyComponent={
          <EmptyState
            iconName="notifications-outline"
            title={errorMessage ? "Không tải được thông báo" : "Không có thông báo"}
            subtitle={errorMessage ?? "Việc được giao, sắp hạn, quá hạn và phiếu chờ duyệt sẽ hiện ở đây."}
            actionLabel={errorMessage ? "Thử lại" : undefined}
            onActionPress={errorMessage ? load : undefined}
          />
        }
      />
    </View>
  );
}

const makeStyles = (c: AppColors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: c.bg,
    },
    listContent: {
      paddingHorizontal: 12,
      paddingTop: 4,
      paddingBottom: 32,
      flexGrow: 1,
    },
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
