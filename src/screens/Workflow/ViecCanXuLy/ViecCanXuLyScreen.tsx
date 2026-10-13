import React, { useCallback, useEffect, useMemo, useState } from "react";
import { FlatList, RefreshControl, StyleSheet, View } from "react-native";

import EmptyState from "../../../components/ui/EmptyState";
import IsLoading from "../../../components/ui/IconLoading";
import { usePermission } from "../../../hooks/usePermission";
import { cvThongBao } from "../../../services/data/congViecApi";
import type { WorkflowThongBao } from "../../../types/index";
import { AppColors, useStyles } from "../../../utils/helpers/colors";
import WorkflowTabBar from "../shared/components/WorkflowTabBar";
import { useReloadOnWorkflowChange } from "../shared/useWorkflowVersion";
import { getWorkflowErrorMessage } from "../shared/workflowErrors";
import { WORKFLOW_VIEW_CODE } from "../workflowMenu";
import ViecCanXuLyRow, { useOpenViec } from "./ViecCanXuLyRow";
import { VIEC_LOAI } from "./viecCanXuLyRules";

const ALL = "TatCa";

/**
 * Toàn bộ "Việc cần xử lý" (cv-thong-bao), mở từ nút cạnh chuông ở Trang chủ.
 * Lọc theo loại bằng hàng tab; danh sách là ảnh chụp lúc tải, kéo xuống để tải lại.
 */
export default function ViecCanXuLyScreen() {
  const styles = useStyles(makeStyles);
  const openViec = useOpenViec();
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
      setErrorMessage(getWorkflowErrorMessage(err, "Không tải được việc cần xử lý."));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (allowed) load();
    else if (loaded) setLoading(false);
  }, [allowed, load, loaded]);

  // Vừa duyệt phiếu / chuyển trạng thái ở màn khác → danh sách đổi theo.
  useReloadOnWorkflowChange(load);

  const tabs = useMemo(() => {
    const countOf = (key: string) => items.filter((item) => item.loai === key).length;
    return [
      { key: ALL, label: "Tất cả", count: items.length || undefined },
      ...VIEC_LOAI.filter((loai) => countOf(loai.key) > 0).map((loai) => ({
        key: loai.key,
        label: loai.label,
        count: countOf(loai.key),
      })),
    ];
  }, [items]);

  // Loại đang lọc không còn dòng nào (vừa nạp lại) thì về Tất cả.
  useEffect(() => {
    if (filter !== ALL && !tabs.some((tab) => tab.key === filter)) setFilter(ALL);
  }, [filter, tabs]);

  const visible = useMemo(
    () => (filter === ALL ? items : items.filter((item) => item.loai === filter)),
    [filter, items],
  );

  if (!loaded || (allowed && loading)) return <IsLoading />;

  if (!allowed) {
    return (
      <EmptyState
        iconName="lock-closed-outline"
        title="Bạn không có quyền truy cập"
        subtitle="Tài khoản hiện tại không có quyền xem Workflow."
      />
    );
  }

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
        renderItem={({ item }) => <ViecCanXuLyRow item={item} onPress={openViec} />}
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
            iconName="checkmark-done-outline"
            title={errorMessage ? "Không tải được việc cần xử lý" : "Không có việc cần xử lý"}
            subtitle={errorMessage ?? "Phiếu chờ duyệt, việc được giao, sắp hạn, quá hạn và bình luận mới sẽ hiện ở đây."}
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
  });
