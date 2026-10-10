import React, { useCallback, useEffect, useMemo, useState } from "react";
import { FlatList, RefreshControl, StyleSheet, View } from "react-native";
import { useNavigation } from "@react-navigation/native";

import EmptyState from "../../../components/ui/EmptyState";
import IsLoading from "../../../components/ui/IconLoading";
import SearchBar from "../../../components/ui/SearchBar";
import RecordListSkeleton from "../../../components/list/RecordListSkeleton";
import { useDebounce } from "../../../hooks/useDebounce";
import { cvDemTab, cvGetList, cvThongTin } from "../../../services/data/congViecApi";
import { CV_CONG_VIEC_NAME_CLASS } from "../../../services/data/workflowApi";
import type {
  CongViecItem,
  CongViecTab,
  CongViecThongTin,
  StackNavigation,
} from "../../../types/index";
import { AppColors, useStyles } from "../../../utils/helpers/colors";
import WorkflowFab from "../shared/components/WorkflowFab";
import WorkflowTabBar from "../shared/components/WorkflowTabBar";
import { useWorkflowMe } from "../shared/useWorkflowMe";
import { useWorkflowPagedList } from "../shared/useWorkflowPagedList";
import { useWorkflowPermissions } from "../shared/useWorkflowPermissions";
import { useReloadOnWorkflowChange } from "../shared/useWorkflowVersion";
import { CV_TABS, readTabCount } from "../shared/workflowConstants";
import { getCardFields, WorkflowField } from "../shared/workflowFields";
import { loadClassFields } from "../shared/workflowMetadata";
import CongViecCard from "./components/CongViecCard";
import MaMauFilter from "./components/MaMauFilter";
import { CV_CARD_CUSTOM_FIELDS } from "./congViecRules";

/**
 * Danh sách công việc (mục 1, 4-Mobile-CongViec): chỉ "việc CỦA TÔI" — tôi
 * tạo hoặc có tên trong người tham gia. Thẻ dựng động từ metadata, trừ nhãn
 * trạng thái và chủ trì vẽ riêng.
 */
export default function CongViecListScreen() {
  const styles = useStyles(makeStyles);
  const navigation = useNavigation<StackNavigation<"CongViec">>();
  const { loaded, canRead, canInsert } = useWorkflowPermissions(CV_CONG_VIEC_NAME_CLASS);
  const { me } = useWorkflowMe();

  const [tab, setTab] = useState<CongViecTab>("ChuaXong");
  const [mau, setMau] = useState<string[]>([]);
  const [keyword, setKeyword] = useState("");
  const searchText = useDebounce(keyword, 600);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [infos, setInfos] = useState<Record<number, CongViecThongTin>>({});
  const [fields, setFields] = useState<WorkflowField[]>([]);

  useEffect(() => {
    loadClassFields(CV_CONG_VIEC_NAME_CLASS)
      .then(setFields)
      .catch(() => setFields([]));
  }, []);

  const cardFields = useMemo(
    () => getCardFields(fields, CV_CARD_CUSTOM_FIELDS),
    [fields],
  );

  const loadCounts = useCallback(() => {
    cvDemTab(mau, searchText)
      .then(setCounts)
      .catch(() => undefined);
  }, [mau, searchText]);

  const loadInfos = useCallback((page: CongViecItem[]) => {
    cvThongTin(page.map((item) => item.id))
      .then((rows) =>
        setInfos((prev) => {
          const next = { ...prev };
          rows.forEach((row) => {
            next[row.id] = row;
          });
          return next;
        }),
      )
      .catch(() => undefined);
  }, []);

  const list = useWorkflowPagedList<CongViecItem>(
    (skipSize, pageSize) =>
      cvGetList({ tab, mau, searchText, skipSize, pageSize }),
    {
      enabled: loaded && canRead,
      queryKey: `${tab}|${mau.join(",")}|${searchText}`,
      onPage: loadInfos,
    },
  );

  useEffect(() => {
    if (loaded && canRead) loadCounts();
  }, [canRead, loadCounts, loaded]);

  const refreshAll = useCallback(() => {
    list.refresh();
    loadCounts();
  }, [list, loadCounts]);

  useReloadOnWorkflowChange(() => {
    list.reload();
    loadCounts();
  });

  const tabs = useMemo(
    () =>
      CV_TABS.map((item) => ({
        key: item.key,
        label: item.label,
        count: item.counted ? readTabCount(counts, item.key) : undefined,
      })),
    [counts],
  );

  if (loaded && !canRead) {
    return (
      <EmptyState
        iconName="lock-closed-outline"
        title="Không có quyền"
        subtitle="Bạn không có quyền xem công việc."
      />
    );
  }

  const canAdd = canInsert && !!me.iD_NhanVien;

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
        tabs={tabs}
        activeKey={tab}
        onChange={(key) => setTab(key as CongViecTab)}
      />
      <MaMauFilter value={mau} onChange={setMau} />

      {list.loading && !list.items.length ? (
        <RecordListSkeleton hasSearchBar={false} rows={5} />
      ) : (
        <FlatList
          data={list.items}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item }) => (
            <CongViecCard
              item={item}
              fields={cardFields}
              info={infos[item.id]}
              onPress={() => navigation.navigate("CongViecChiTiet", { id: item.id })}
            />
          )}
          contentContainerStyle={styles.listContent}
          onEndReached={list.loadMore}
          onEndReachedThreshold={0.5}
          refreshControl={
            <RefreshControl refreshing={list.refreshing} onRefresh={refreshAll} />
          }
          ListFooterComponent={
            list.loadingMore ? <IsLoading size="small" style={styles.footerLoading} /> : null
          }
          ListEmptyComponent={
            <EmptyState
              iconName="checkbox-outline"
              title={list.errorMessage ? "Không tải được công việc" : "Không có công việc"}
              subtitle={list.errorMessage ?? undefined}
              actionLabel={list.errorMessage ? "Thử lại" : undefined}
              onActionPress={list.errorMessage ? refreshAll : undefined}
            />
          }
        />
      )}

      {canAdd ? (
        <WorkflowFab onPress={() => navigation.navigate("CongViecForm", { mode: "add" })} />
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
