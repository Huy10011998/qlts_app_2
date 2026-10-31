import React, { useCallback, useEffect, useRef, useState } from "react";
import { FlatList, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useIsFocused } from "@react-navigation/native";
import Ionicons from "react-native-vector-icons/Ionicons";

import EmptyState from "../../components/ui/EmptyState";
import { useAutoReload } from "../../hooks/useAutoReload";
import { thongBaoDaDoc, thongBaoGetList } from "../../services/data/thongBaoApi";
import { subscribeThongBao } from "../../services/realtime/traoDoiHub";
import type { ThongBaoItem, ThongBaoNhom } from "../../types/index";
import { AppColors, useAppColors, useStyles } from "../../utils/helpers/colors";
import WorkflowListFooter from "../Workflow/shared/components/WorkflowListFooter";
import WorkflowTabBar from "../Workflow/shared/components/WorkflowTabBar";
import { useWorkflowPagedList } from "../Workflow/shared/useWorkflowPagedList";
import { getWorkflowErrorMessage } from "../Workflow/shared/workflowErrors";
import ThongBaoRow from "./ThongBaoRow";
import ThongBaoRowSkeleton from "./ThongBaoRowSkeleton";
import { useThongBaoContext } from "./ThongBaoProvider";
import { markThongBaoRead, PAGE_SIZE, prependThongBao, THONG_BAO_NHOM } from "./thongBaoRules";
import { AppAlert } from "../../components/ui/AppAlert";

const ALL = "TatCa";
const TABS = [{ key: ALL, label: "Tất cả" }, ...THONG_BAO_NHOM];

/**
 * Màn "Xem tất cả" (8-Mobile-ThongBao mục 1), mở từ bảng chuông: lọc Nhom +
 * ChiChuaDoc, 20 / trang, thông báo mới chèn lên đầu qua hub realtime.
 */
export default function ThongBaoScreen() {
  const styles = useStyles(makeStyles);
  const c = useAppColors();
  const { soChuaDoc, setSoChuaDoc, openThongBao } = useThongBaoContext();

  const [nhom, setNhom] = useState<string>(ALL);
  const [chiChuaDoc, setChiChuaDoc] = useState(false);
  const [markingAll, setMarkingAll] = useState(false);

  const fetchPage = useCallback(
    (skipSize: number, pageSize: number) =>
      thongBaoGetList({
        skipSize,
        pageSize,
        chiChuaDoc,
        nhom: nhom === ALL ? null : (nhom as ThongBaoNhom),
      }).then((result) => {
        setSoChuaDoc(Number(result?.soChuaDoc) || 0);
        return result;
      }),
    [chiChuaDoc, nhom, setSoChuaDoc],
  );

  const list = useWorkflowPagedList<ThongBaoItem>(fetchPage, {
    pageSize: PAGE_SIZE,
    queryKey: `${nhom}|${chiChuaDoc}`,
  });
  const { setItems, reload } = list;

  // App vừa từ nền về: hub có khi chưa rớt (không có onReconnected) mà vẫn lỡ
  // thông báo lúc nằm nền.
  useAutoReload(reload, { enabled: useIsFocused() });

  // Bộ lọc đang chọn — đọc trong handler realtime mà không phải đăng ký lại.
  const filterRef = useRef({ nhom, chiChuaDoc });
  filterRef.current = { nhom, chiChuaDoc };

  useEffect(
    () =>
      subscribeThongBao({
        onThongBaoMoi: (thongBao) => {
          const filter = filterRef.current;
          if (filter.nhom !== ALL && thongBao.nhom !== filter.nhom) return;
          if (filter.chiChuaDoc && thongBao.daDoc) return;
          setItems((prev) => prependThongBao(prev, thongBao));
        },
        // Nối lại sau mất mạng: gọi lại get-list để bù (mục 3).
        onReconnected: reload,
      }),
    [reload, setItems],
  );

  const open = (item: ThongBaoItem) => {
    setItems((prev) => markThongBaoRead(prev, [item.id]));
    openThongBao(item);
  };

  const markAllRead = async () => {
    setMarkingAll(true);
    try {
      const left = await thongBaoDaDoc([]);
      setSoChuaDoc(left ?? 0);
      setItems((prev) => markThongBaoRead(prev, "all"));
    } catch (err) {
      AppAlert.alert("Thông báo", getWorkflowErrorMessage(err, "Không đánh dấu được đã đọc."));
    } finally {
      setMarkingAll(false);
    }
  };

  return (
    <View style={styles.container}>
      <WorkflowTabBar tabs={TABS} activeKey={nhom} onChange={setNhom} />

      <View style={styles.toolbar}>
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => setChiChuaDoc((prev) => !prev)}
          style={styles.toggle}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: chiChuaDoc }}
        >
          <Ionicons
            name={chiChuaDoc ? "checkbox" : "square-outline"}
            size={18}
            color={chiChuaDoc ? "#1e88e5" : c.textSub}
          />
          <Text style={styles.toggleText}>
            Chỉ chưa đọc
          </Text>
        </TouchableOpacity>

        {soChuaDoc > 0 ? (
          <TouchableOpacity onPress={markAllRead} disabled={markingAll} hitSlop={8}>
            <Text
              style={[styles.link, markingAll && styles.linkBusy]}
            >
              Đánh dấu tất cả đã đọc
            </Text>
          </TouchableOpacity>
        ) : null}
      </View>

      {/* Thanh tab + "Chỉ chưa đọc" ở trên vẫn là thật; chỉ phần danh sách chờ. */}
      {list.loading ? (
        <ThongBaoRowSkeleton />
      ) : (
        <FlatList
          data={list.items}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item }) => <ThongBaoRow item={item} onPress={open} />}
          contentContainerStyle={styles.listContent}
          onEndReached={list.loadMore}
          onEndReachedThreshold={0.5}
          refreshControl={<RefreshControl refreshing={list.refreshing} onRefresh={list.refresh} />}
          ListFooterComponent={
            <WorkflowListFooter
              list={list}
              // Dòng phẳng tràn ngang như dòng thật — thẻ bản ghi mặc định là
              // thẻ nổi có lề, lệch hẳn giữa danh sách tràn viền.
              skeleton={<ThongBaoRowSkeleton rows={2} accessibilityLabel="Đang tải thêm" />}
            />
          }
          ListEmptyComponent={
            <EmptyState
              iconName="notifications-outline"
              title={list.errorMessage ? "Không tải được thông báo" : "Không có thông báo"}
              subtitle={list.errorMessage ?? undefined}
              actionLabel={list.errorMessage ? "Thử lại" : undefined}
              onActionPress={list.errorMessage ? list.refresh : undefined}
            />
          }
        />
      )}
    </View>
  );
}

const makeStyles = (c: AppColors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: c.bg,
    },
    toolbar: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 8,
      paddingHorizontal: 14,
      paddingBottom: 8,
    },
    toggle: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      paddingVertical: 4,
    },
    toggleText: {
      fontSize: 13,
      color: c.textSecondary,
    },
    link: {
      fontSize: 13,
      fontWeight: "600",
      color: "#1e88e5",
    },
    linkBusy: {
      color: c.textMuted,
    },
    listContent: {
      flexGrow: 1,
      paddingBottom: 32,
    },
  });
