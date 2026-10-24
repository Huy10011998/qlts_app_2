import React, { useCallback, useEffect, useMemo, useState } from "react";
import { FlatList, RefreshControl, StyleSheet, View } from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";

import { useHeaderRecordPill } from "../../../components/assets/shared/useHeaderRecordPill";
import EmptyState from "../../../components/ui/EmptyState";
import SearchBar from "../../../components/ui/SearchBar";
import { useDebounce } from "../../../hooks/useDebounce";
import { cvDemTab, cvGetList, cvThongTin } from "../../../services/data/congViecApi";
import { CV_CONG_VIEC_NAME_CLASS } from "../../../services/data/workflowApi";
import type {
  CongViecItem,
  CongViecTab,
  CongViecThongTin,
  StackNavigation,
  StackRoute,
} from "../../../types/index";
import { AppColors, useStyles } from "../../../utils/helpers/colors";
import WorkflowFab from "../shared/components/WorkflowFab";
import WorkflowListFooter from "../shared/components/WorkflowListFooter";
import WorkflowListSkeleton, {
  countFieldLines,
  useInfoPending,
  type WorkflowCardSkeletonShape,
  WorkflowListFooterSkeleton,
} from "../shared/components/WorkflowListSkeleton";
import WorkflowTabBar from "../shared/components/WorkflowTabBar";
import { useWorkflowMe } from "../shared/useWorkflowMe";
import { useWorkflowPagedList } from "../shared/useWorkflowPagedList";
import { useWorkflowPermissions } from "../shared/useWorkflowPermissions";
import { useReloadOnWorkflowChange } from "../shared/useWorkflowVersion";
import { useOnWorkflowInfoStale } from "../shared/workflowInfoRefresh";
import { CV_TABS, readTabCount } from "../shared/workflowConstants";
import { getCardFields } from "../shared/workflowFields";
import { useClassFields } from "../shared/workflowMetadata";
import { buildRelatedConditions } from "../shared/workflowRelated";
import CongViecCard, { getCongViecCardLayout } from "./components/CongViecCard";
import MaMauFilter from "./components/MaMauFilter";
import { CV_CARD_CUSTOM_FIELDS } from "./congViecRules";

/**
 * Danh sách công việc (mục 1, 4-Mobile-CongViec): chỉ "việc CỦA TÔI" — tôi
 * tạo hoặc có tên trong người tham gia. Thẻ dựng động từ metadata, trừ nhãn
 * trạng thái và chủ trì vẽ riêng.
 *
 * `related` (mở từ tab Chi tiết của Nhân viên): thêm điều kiện khoá ngoại vào
 * cả danh sách lẫn số trên tab, mở ở tab Tất cả, không có nút thêm — việc thêm ở
 * đây vẫn là việc của người đăng nhập, không gắn được vào bản ghi đang xem.
 */
export default function CongViecListScreen() {
  const styles = useStyles(makeStyles);
  const navigation = useNavigation<StackNavigation<"CongViec">>();
  const related = useRoute<StackRoute<"CongViec">>().params?.related;
  const relatedConditions = useMemo(() => buildRelatedConditions(related), [related]);
  const { loaded, canRead, canInsert } = useWorkflowPermissions(CV_CONG_VIEC_NAME_CLASS);
  const { me } = useWorkflowMe();

  const [tab, setTab] = useState<CongViecTab>(related ? "TatCa" : "ChuaXong");
  const [mau, setMau] = useState<string[]>([]);
  const [keyword, setKeyword] = useState("");
  const searchText = useDebounce(keyword, 600);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [infos, setInfos] = useState<Record<number, CongViecThongTin>>({});
  const { pendingIds: infoPending, track: trackInfo } = useInfoPending();
  const { fields, ready: fieldsReady } = useClassFields(CV_CONG_VIEC_NAME_CLASS);

  const cardFields = useMemo(
    () => getCardFields(fields, CV_CARD_CUSTOM_FIELDS),
    [fields],
  );

  // Dáng khung chờ theo metadata (loadClassFields giữ trong phiên, nên từ lần mở
  // thứ hai đã có ngay); chưa có thì khung chờ tự đoán.
  const skeletonShape = useMemo<WorkflowCardSkeletonShape>(() => {
    if (!fields.length) return {};
    const layout = getCongViecCardLayout(cardFields);
    return {
      code: layout.showSo,
      title: layout.showTieuDe,
      lines: countFieldLines(layout.lineFields),
    };
  }, [cardFields, fields.length]);

  const loadCounts = useCallback(() => {
    cvDemTab(mau, searchText, relatedConditions)
      .then(setCounts)
      .catch(() => undefined);
  }, [mau, relatedConditions, searchText]);

  const loadInfos = useCallback((page: CongViecItem[]) => {
    const ids = page.map((item) => item.id);
    trackInfo(
      ids,
      cvThongTin(ids).then((rows) =>
        setInfos((prev) => {
          const next = { ...prev };
          rows.forEach((row) => {
            next[row.id] = row;
          });
          return next;
        }),
      ),
    );
  }, [trackInfo]);

  const list = useWorkflowPagedList<CongViecItem>(
    (skipSize, pageSize) =>
      cvGetList({ tab, mau, searchText, conditions: relatedConditions, skipSize, pageSize }),
    {
      enabled: loaded && canRead,
      // Có cả bộ lọc `related`: navigate trùng tên route là đổi params ngay trên
      // màn đang mở, thiếu nó thì số trên tab đổi mà danh sách vẫn cũ.
      queryKey: `${tab}|${mau.join(",")}|${searchText}|${JSON.stringify(relatedConditions)}`,
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

  useHeaderRecordPill({
    label: related?.rootRecordLabel,
    recordId: related?.idRoot,
    nameClass: related?.nameClassRoot,
    groupMenuId: related?.groupMenuId,
    viewPermission: related?.viewPermission,
    assetTitleHeader: related?.assetTitleHeader,
  });

  useReloadOnWorkflowChange(() => {
    list.reload();
    loadCounts();
  });

  // Đóng màn Bình luận / Đính kèm → số bình luận / file của các dòng đang hiện.
  useOnWorkflowInfoStale((apiBase) => {
    if (apiBase === CV_CONG_VIEC_NAME_CLASS && list.items.length) loadInfos(list.items);
  });

  const tabs = useMemo(() => {
    // Mở từ Nhân viên thì đứng ở Tất cả — đưa lên đầu, thanh tab không tự cuộn
    // tới tab đang bật nên để cuối là khuất ngoài màn.
    const defs = related
      ? [...CV_TABS.filter((item) => item.key === "TatCa"), ...CV_TABS.filter((item) => item.key !== "TatCa")]
      : CV_TABS;
    return defs.map((item) => ({
      key: item.key,
      label: item.label,
      count: item.counted ? readTabCount(counts, item.key) : undefined,
    }));
  }, [counts, related]);

  if (loaded && !canRead) {
    return (
      <EmptyState
        iconName="lock-closed-outline"
        title="Không có quyền"
        subtitle="Bạn không có quyền xem công việc."
      />
    );
  }

  const canAdd = canInsert && !!me.iD_NhanVien && !related;

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
      <MaMauFilter value={mau} onChange={setMau} spacious />

      {/* Chờ cả field: thẻ vẽ trước metadata thì trống số, tiêu đề, các dòng. */}
      {!fieldsReady || (list.loading && !list.items.length) ? (
        <WorkflowListSkeleton kind="congViec" shape={skeletonShape} />
      ) : (
        <FlatList
          data={list.items}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item }) => (
            <CongViecCard
              item={item}
              fields={cardFields}
              info={infos[item.id]}
              infoPending={infoPending.has(item.id)}
              onPress={() => navigation.navigate("CongViecChiTiet", { id: item.id })}
              // Cùng tham số với nút ở màn chi tiết: cv-thong-tin trả sẵn cờ quyền
              // như cv-chi-tiet, `duocTraoDoi` quyết định gửi bình luận / sửa file.
              onOpenComments={() =>
                navigation.navigate("WorkflowBinhLuan", {
                  apiBase: CV_CONG_VIEC_NAME_CLASS,
                  idHoSo: item.id,
                  canSend: !!infos[item.id]?.duocTraoDoi,
                  titleHeader: item.soCongViec ?? undefined,
                })
              }
              onOpenFiles={() =>
                navigation.navigate("WorkflowFile", {
                  apiBase: CV_CONG_VIEC_NAME_CLASS,
                  idHoSo: item.id,
                  canEdit: !!infos[item.id]?.duocTraoDoi,
                  titleHeader: item.soCongViec ?? undefined,
                })
              }
            />
          )}
          contentContainerStyle={styles.listContent}
          onEndReached={list.loadMore}
          onEndReachedThreshold={0.5}
          refreshControl={
            <RefreshControl refreshing={list.refreshing} onRefresh={refreshAll} />
          }
          ListFooterComponent={
            <WorkflowListFooter
              list={list}
              skeleton={<WorkflowListFooterSkeleton kind="congViec" shape={skeletonShape} />}
            />
          }
          ListEmptyComponent={
            <EmptyState
              iconName="checkbox-outline"
              title={list.errorMessage ? "Không tải được công việc" : "Không có công việc"}
              subtitle={
                list.errorMessage ??
                (related ? "Chỉ hiện công việc bạn được xem." : undefined)
              }
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
  });
