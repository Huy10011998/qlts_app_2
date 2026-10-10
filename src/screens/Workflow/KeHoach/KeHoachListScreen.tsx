import React, { useEffect, useMemo, useState } from "react";
import { FlatList, RefreshControl, StyleSheet, View } from "react-native";
import { useNavigation } from "@react-navigation/native";

import RecordListSkeleton from "../../../components/list/RecordListSkeleton";
import EmptyState from "../../../components/ui/EmptyState";
import IsLoading from "../../../components/ui/IconLoading";
import SearchBar from "../../../components/ui/SearchBar";
import { useDebounce } from "../../../hooks/useDebounce";
import { khGetList } from "../../../services/data/keHoachApi";
import { CV_KE_HOACH_NAME_CLASS } from "../../../services/data/workflowApi";
import type { KeHoachItem, KeHoachTab, StackNavigation } from "../../../types/index";
import { AppColors, useStyles } from "../../../utils/helpers/colors";
import WorkflowFab from "../shared/components/WorkflowFab";
import WorkflowTabBar from "../shared/components/WorkflowTabBar";
import { useWorkflowMe } from "../shared/useWorkflowMe";
import { useWorkflowPagedList } from "../shared/useWorkflowPagedList";
import { useWorkflowPermissions } from "../shared/useWorkflowPermissions";
import { useReloadOnWorkflowChange } from "../shared/useWorkflowVersion";
import { KH_TABS } from "../shared/workflowConstants";
import { getCardFields, WorkflowField } from "../shared/workflowFields";
import { loadClassFields } from "../shared/workflowMetadata";
import KeHoachCard from "./KeHoachCard";

/**
 * Danh sách kế hoạch (mục 1, 5-Mobile-KeHoach): kế hoạch tôi chủ trì hoặc
 * tham gia. Thẻ dựng động từ metadata + vòng tiến độ vẽ riêng.
 */
export default function KeHoachListScreen() {
  const styles = useStyles(makeStyles);
  const navigation = useNavigation<StackNavigation<"KeHoach">>();
  const { loaded, canRead, canInsert } = useWorkflowPermissions(CV_KE_HOACH_NAME_CLASS);
  const { me } = useWorkflowMe();

  const [tab, setTab] = useState<KeHoachTab>("TatCa");
  const [keyword, setKeyword] = useState("");
  const searchText = useDebounce(keyword, 600);
  const [fields, setFields] = useState<WorkflowField[]>([]);

  useEffect(() => {
    loadClassFields(CV_KE_HOACH_NAME_CLASS)
      .then(setFields)
      .catch(() => setFields([]));
  }, []);

  const cardFields = useMemo(() => getCardFields(fields), [fields]);

  const list = useWorkflowPagedList<KeHoachItem>(
    (skipSize, pageSize) => khGetList({ tab, searchText, skipSize, pageSize }),
    { enabled: loaded && canRead, queryKey: `${tab}|${searchText}` },
  );

  useReloadOnWorkflowChange(list.reload);

  if (loaded && !canRead) {
    return (
      <EmptyState
        iconName="lock-closed-outline"
        title="Không có quyền"
        subtitle="Bạn không có quyền xem kế hoạch."
      />
    );
  }

  return (
    <View style={styles.container}>
      <SearchBar
        value={keyword}
        onChangeText={setKeyword}
        placeholder="Tìm số, tiêu đề, mô tả..."
        isSearching={list.loading && !!keyword}
        style={styles.search}
      />
      <WorkflowTabBar
        tabs={KH_TABS.map((item) => ({ key: item.key, label: item.label }))}
        activeKey={tab}
        onChange={(key) => setTab(key as KeHoachTab)}
      />

      {list.loading && !list.items.length ? (
        <RecordListSkeleton hasSearchBar={false} rows={5} />
      ) : (
        <FlatList
          data={list.items}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item }) => (
            <KeHoachCard
              item={item}
              fields={cardFields}
              onPress={() => navigation.navigate("KeHoachChiTiet", { id: item.id })}
            />
          )}
          contentContainerStyle={styles.listContent}
          onEndReached={list.loadMore}
          onEndReachedThreshold={0.5}
          refreshControl={<RefreshControl refreshing={list.refreshing} onRefresh={list.refresh} />}
          ListFooterComponent={
            list.loadingMore ? <IsLoading size="small" style={styles.footerLoading} /> : null
          }
          ListEmptyComponent={
            <EmptyState
              iconName="flag-outline"
              title={list.errorMessage ? "Không tải được kế hoạch" : "Không có kế hoạch"}
              subtitle={list.errorMessage ?? undefined}
              actionLabel={list.errorMessage ? "Thử lại" : undefined}
              onActionPress={list.errorMessage ? list.refresh : undefined}
            />
          }
        />
      )}

      {canInsert && me.iD_NhanVien ? (
        <WorkflowFab onPress={() => navigation.navigate("KeHoachForm", { mode: "add" })} />
      ) : null}
    </View>
  );
}

const makeStyles = (c: AppColors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: c.bg,
    },
    search: {
      marginHorizontal: 12,
      marginTop: 10,
    },
    listContent: {
      paddingHorizontal: 12,
      paddingTop: 4,
      paddingBottom: 96,
      flexGrow: 1,
    },
    footerLoading: {
      paddingVertical: 16,
    },
  });
