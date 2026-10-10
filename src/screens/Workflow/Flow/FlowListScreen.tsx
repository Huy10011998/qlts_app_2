import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, FlatList, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import RecordListSkeleton from "../../../components/list/RecordListSkeleton";
import EmptyState from "../../../components/ui/EmptyState";
import IsLoading from "../../../components/ui/IconLoading";
import InlineToast from "../../../components/ui/InlineToast";
import SearchBar from "../../../components/ui/SearchBar";
import { useDebounce } from "../../../hooks/useDebounce";
import { flowDemTab, flowGetList, flowThongTin } from "../../../services/data/flowApi";
import type {
  FlowRecord,
  FlowTab,
  FlowThongTin,
  StackNavigation,
  StackRoute,
} from "../../../types/index";
import { AppColors, useStyles } from "../../../utils/helpers/colors";
import WorkflowButton from "../shared/components/WorkflowButton";
import WorkflowFab from "../shared/components/WorkflowFab";
import WorkflowTabBar from "../shared/components/WorkflowTabBar";
import { useWorkflowMe } from "../shared/useWorkflowMe";
import { useWorkflowPagedList } from "../shared/useWorkflowPagedList";
import { useWorkflowPermissions } from "../shared/useWorkflowPermissions";
import {
  useMarkWorkflowChanged,
  useReloadOnWorkflowChange,
} from "../shared/useWorkflowVersion";
import { FLOW_KET_QUA, FLOW_TABS, readTabCount } from "../shared/workflowConstants";
import { getWorkflowErrorMessage } from "../shared/workflowErrors";
import { getCardFields } from "../shared/workflowFields";
import FlowApproveSheet, { FlowKetQua } from "./components/FlowApproveSheet";
import FlowBulkApproveSheet, { FlowBulkOutcome } from "./components/FlowBulkApproveSheet";
import FlowCard from "./components/FlowCard";
import {
  FLOW_CARD_CUSTOM_FIELDS,
  getFlowActions,
  getFlowLabel,
  getFlowSoPhieu,
} from "./flowRules";
import { useFlowMeta } from "./useFlowMeta";

/**
 * Trần số phiếu của một lượt "Duyệt tất cả" — lấy hết phiếu của tab Chờ duyệt
 * trong 1 lần gọi. Vượt trần thì duyệt phần đầu, phần còn lại bấm lại lần nữa.
 */
const DUYET_TAT_CA_MAX = 500;

type ApproveState = { record: FlowRecord; ketQua: FlowKetQua };
type BulkState = { records: FlowRecord[]; skippedNotAllowed: number };
type ToastState = { message: string; detail?: string; tone: "success" | "warning" };

/**
 * Danh sách phiếu đề nghị — MỘT màn cho mọi loại phiếu chạy quy trình. Đầu vào
 * duy nhất là `nameClass` = tên bảng nghiệp vụ (khai ở `workflowMenu.ts`).
 * Thẻ dựng từ FlowAttributes; tab, tình trạng, bước hiện tại, nút duyệt vẽ riêng.
 */
export default function FlowListScreen() {
  const styles = useStyles(makeStyles);
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<StackNavigation<"Flow">>();
  const route = useRoute<StackRoute<"Flow">>();
  const nameClass = route.params?.nameClass ?? "";
  const { meta, errorMessage: metaError, loading: metaLoading } = useFlowMeta(nameClass);
  const perms = useWorkflowPermissions(nameClass);
  const { me } = useWorkflowMe();
  const markChanged = useMarkWorkflowChanged();

  // Mở từ thông báo "n phiếu đang chờ bạn duyệt" thì vào thẳng tab đó.
  const [tab, setTab] = useState<FlowTab>(route.params?.tab ?? "ChoDuyet");
  const [keyword, setKeyword] = useState("");
  const searchText = useDebounce(keyword, 600);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [infos, setInfos] = useState<Record<number, FlowThongTin>>({});
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [approve, setApprove] = useState<ApproveState | null>(null);
  const [bulk, setBulk] = useState<BulkState | null>(null);
  const [preparingBulk, setPreparingBulk] = useState(false);
  const [toast, setToast] = useState<ToastState | null>(null);

  useEffect(() => {
    if (meta?.flow?.ten) navigation.setOptions({ title: meta.flow.ten });
  }, [meta?.flow?.ten, navigation]);

  const soPhieuField = meta?.soPhieuField ?? null;
  const cardFields = useMemo(
    () => getCardFields(meta?.fields ?? [], FLOW_CARD_CUSTOM_FIELDS),
    [meta?.fields],
  );

  const enabled = !!meta && perms.loaded && perms.canRead;

  const loadCounts = useCallback(() => {
    if (!nameClass) return;
    flowDemTab(nameClass, searchText)
      .then(setCounts)
      .catch(() => undefined);
  }, [nameClass, searchText]);

  const mergeInfos = useCallback((rows: FlowThongTin[]) => {
    setInfos((prev) => {
      const next = { ...prev };
      rows.forEach((row) => {
        next[row.iD_HoSo] = row;
      });
      return next;
    });
  }, []);

  const loadInfos = useCallback(
    (page: FlowRecord[]) => {
      flowThongTin(nameClass, page.map((item) => item.id))
        .then(mergeInfos)
        .catch(() => undefined);
    },
    [mergeInfos, nameClass],
  );

  const list = useWorkflowPagedList<FlowRecord>(
    (skipSize, pageSize) => flowGetList(nameClass, { tab, searchText, skipSize, pageSize }),
    { enabled, queryKey: `${tab}|${searchText}`, onPage: loadInfos },
  );

  useEffect(() => {
    if (enabled) loadCounts();
  }, [enabled, loadCounts]);

  // Màn đã mở sẵn trong stack mà được gọi lại với tab khác (từ thông báo).
  useEffect(() => {
    if (route.params?.tab) setTab(route.params.tab);
  }, [route.params?.tab]);

  useEffect(() => {
    setSelectedIds([]);
  }, [tab, searchText]);

  useReloadOnWorkflowChange(() => {
    list.reload();
    loadCounts();
  });

  const tabs = useMemo(
    () =>
      FLOW_TABS.map((item) => ({
        key: item.key,
        label: item.label,
        count: item.counted ? readTabCount(counts, item.key) : undefined,
      })),
    [counts],
  );

  const bulkIds = useMemo(() => bulk?.records.map((record) => record.id) ?? [], [bulk]);
  const labelOf = useCallback(
    (id: number) =>
      getFlowLabel(bulk?.records.find((record) => record.id === id) ?? { id }, soPhieuField),
    [bulk, soPhieuField],
  );

  const actionsOf = (item: FlowRecord) =>
    getFlowActions(item, infos[item.id], me.iD_NhanVien, perms);

  const toggleSelect = (id: number) =>
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]));

  const openDetail = (item: FlowRecord) =>
    navigation.navigate("FlowChiTiet", { nameClass, id: item.id, item });

  /**
   * Bắt đầu duyệt nhiều (mục 8c, B1): chỉ giữ phiếu isToiLuot. Không còn phiếu
   * nào thì không mở dialog; còn ĐÚNG 1 phiếu thì duyệt như 1 phiếu (có chọn
   * người / Tạo công việc như thường); từ 2 phiếu mở dialog duyệt nhiều.
   */
  const startBulkApprove = async (records: FlowRecord[]) => {
    try {
      setPreparingBulk(true);
      const missing = records.filter((record) => !infos[record.id]).map((record) => record.id);
      const fetched = missing.length ? await flowThongTin(nameClass, missing) : [];
      if (fetched.length) mergeInfos(fetched);

      const infoOf = (id: number) =>
        infos[id] ?? fetched.find((row) => row.iD_HoSo === id);
      const allowed = records.filter((record) => infoOf(record.id)?.isToiLuot);
      const skippedNotAllowed = records.length - allowed.length;

      if (!allowed.length) {
        Alert.alert("Không có phiếu để duyệt", "Các phiếu này không còn tới lượt bạn duyệt.");
        return;
      }
      if (allowed.length === 1) {
        setApprove({ record: allowed[0], ketQua: FLOW_KET_QUA.Duyet });
        return;
      }
      setBulk({ records: allowed, skippedNotAllowed });
    } catch (err) {
      Alert.alert("Không kiểm tra được phiếu", getWorkflowErrorMessage(err, "Vui lòng thử lại."));
    } finally {
      setPreparingBulk(false);
    }
  };

  /**
   * Duyệt tất cả phiếu đang chờ tôi (tab Chờ duyệt, theo từ khoá đang tìm) —
   * kể cả trang chưa cuộn tới, nên hỏi lại server thay vì chỉ lấy các dòng đã
   * tải, rồi đi đúng đường duyệt nhiều.
   */
  const approveAll = async () => {
    try {
      setPreparingBulk(true);
      const total = Math.max(list.totalCount, list.items.length, 1);
      const result = await flowGetList(nameClass, {
        tab: "ChoDuyet",
        searchText,
        pageSize: Math.min(total, DUYET_TAT_CA_MAX),
        skipSize: 0,
      });
      const records = result.items ?? [];

      if (!records.length) {
        Alert.alert("Không còn phiếu", "Không có phiếu nào đang chờ bạn duyệt.");
        return;
      }
      if (result.totalCount > records.length) {
        Alert.alert(
          "Duyệt theo đợt",
          `Có ${result.totalCount} phiếu chờ duyệt; lượt này duyệt ${records.length} phiếu đầu, phần còn lại bấm Duyệt tất cả lần nữa.`,
        );
      }
      await startBulkApprove(records);
    } catch (err) {
      Alert.alert("Không lấy được danh sách phiếu", getWorkflowErrorMessage(err, "Vui lòng thử lại."));
    } finally {
      setPreparingBulk(false);
    }
  };

  const finishAction = () => {
    setApprove(null);
    setBulk(null);
    setSelectedIds([]);
    markChanged();
  };

  /** Báo kết quả duyệt nhiều đúng câu chữ của tài liệu (mục 8c, B4). */
  const handleBulkDone = ({ result, skippedTaoCongViec }: FlowBulkOutcome) => {
    finishAction();

    const soThanhCong = result.soThanhCong ?? 0;
    const soCanChonNguoi = result.soCanChonNguoi ?? 0;
    const loi = (result.loi ?? []).filter(Boolean);
    const boQua = skippedTaoCongViec
      ? `Đã bỏ qua ${skippedTaoCongViec} phiếu ở lượt cuối "Tạo công việc" - duyệt từng phiếu để tạo công việc.`
      : "";

    if (soCanChonNguoi > 0) {
      Alert.alert(
        "Kết quả duyệt",
        [
          `Đã duyệt ${soThanhCong} phiếu.`,
          `${soCanChonNguoi} phiếu cần chọn người duyệt cho bước tiếp theo nên chưa duyệt - chọn từng phiếu rồi bấm Duyệt.`,
          ...loi.map((item) => `- ${item}`),
          boQua,
        ]
          .filter(Boolean)
          .join("\n"),
      );
      return;
    }

    if (loi.length) {
      Alert.alert(
        "Kết quả duyệt",
        [soThanhCong ? `Đã duyệt ${soThanhCong} phiếu.` : "", ...loi.map((item) => `- ${item}`), boQua]
          .filter(Boolean)
          .join("\n"),
      );
      return;
    }

    if (soThanhCong > 0) {
      setToast({
        message: `Đã duyệt ${soThanhCong} phiếu`,
        detail: boQua || undefined,
        tone: boQua ? "warning" : "success",
      });
    } else if (boQua) {
      Alert.alert("Kết quả duyệt", boQua);
    }
  };

  if (metaLoading) return <IsLoading />;

  if (metaError || !meta) {
    return <EmptyState iconName="alert-circle-outline" title="Không mở được phiếu" subtitle={metaError ?? undefined} />;
  }

  if (perms.loaded && !perms.canRead) {
    return (
      <EmptyState
        iconName="lock-closed-outline"
        title="Không có quyền"
        subtitle={`Bạn không có quyền xem ${meta.flow.ten}.`}
      />
    );
  }

  const selecting = tab === "ChoDuyet" && selectedIds.length > 0;
  /** Phiếu đã tải mà tôi duyệt được — phạm vi của "Chọn hết". */
  const selectableIds = list.items
    .filter((item) => actionsOf(item).duyet)
    .map((item) => item.id);
  const allSelected =
    selectableIds.length > 0 && selectableIds.every((id) => selectedIds.includes(id));
  const showApproveAll =
    tab === "ChoDuyet" && !selecting && !!me.iD_NhanVien && list.totalCount > 0;

  return (
    <View style={styles.container}>
      <SearchBar
        value={keyword}
        onChangeText={setKeyword}
        placeholder="Tìm kiếm phiếu..."
        isSearching={list.loading && !!keyword}
        style={styles.search}
      />
      <WorkflowTabBar tabs={tabs} activeKey={tab} onChange={(key) => setTab(key as FlowTab)} />
      {showApproveAll ? (
        <View style={styles.approveAllRow}>
          <Text style={styles.hint} numberOfLines={2}>
            Nhấn giữ một phiếu để chọn nhiều.
          </Text>
          <WorkflowButton
            compact
            variant="success"
            icon="checkmark-done"
            label={`Duyệt tất cả (${list.totalCount})`}
            loading={preparingBulk}
            onPress={approveAll}
          />
        </View>
      ) : null}
      <InlineToast
        message={toast?.message}
        detail={toast?.detail}
        tone={toast?.tone}
        onDismiss={() => setToast(null)}
      />

      {list.loading && !list.items.length ? (
        <RecordListSkeleton hasSearchBar={false} rows={5} />
      ) : (
        <FlatList
          data={list.items}
          keyExtractor={(item) => String(item.id)}
          extraData={{ infos, selectedIds }}
          renderItem={({ item }) => {
            const actions = actionsOf(item);
            const canSelect = tab === "ChoDuyet" && actions.duyet;
            return (
              <FlowCard
                item={item}
                fields={cardFields}
                soPhieuField={soPhieuField}
                info={infos[item.id]}
                actions={actions}
                selectable={selecting && canSelect}
                selected={selectedIds.includes(item.id)}
                onPress={() => (selecting && canSelect ? toggleSelect(item.id) : openDetail(item))}
                onLongPress={canSelect ? () => toggleSelect(item.id) : undefined}
                onApprove={() => setApprove({ record: item, ketQua: FLOW_KET_QUA.Duyet })}
                onReject={() => setApprove({ record: item, ketQua: FLOW_KET_QUA.TuChoi })}
                onNoOpinion={() => setApprove({ record: item, ketQua: FLOW_KET_QUA.KhongYKien })}
              />
            );
          }}
          contentContainerStyle={[styles.listContent, selecting && styles.listWithBar]}
          onEndReached={list.loadMore}
          onEndReachedThreshold={0.5}
          refreshControl={
            <RefreshControl
              refreshing={list.refreshing}
              onRefresh={() => {
                list.refresh();
                loadCounts();
              }}
            />
          }
          ListFooterComponent={
            list.loadingMore ? <IsLoading size="small" style={styles.footerLoading} /> : null
          }
          ListEmptyComponent={
            <EmptyState
              iconName="document-text-outline"
              title={list.errorMessage ? "Không tải được phiếu" : "Không có phiếu"}
              subtitle={list.errorMessage ?? undefined}
              actionLabel={list.errorMessage ? "Thử lại" : undefined}
              onActionPress={list.errorMessage ? list.refresh : undefined}
            />
          }
        />
      )}

      {/* Chọn nhiều chỉ còn "Duyệt nhiều": Từ chối / Không ý kiến làm từng phiếu. */}
      {selecting ? (
        <View style={[styles.bulkBar, { paddingBottom: Math.max(insets.bottom, 10) }]}>
          <View style={styles.bulkTop}>
            <Text style={styles.bulkText}>
              Đã chọn {selectedIds.length}/{selectableIds.length}
            </Text>
            <TouchableOpacity
              hitSlop={8}
              onPress={() => setSelectedIds(allSelected ? [] : selectableIds)}
            >
              <Text style={styles.bulkLink}>{allSelected ? "Bỏ chọn hết" : "Chọn hết"}</Text>
            </TouchableOpacity>
            <TouchableOpacity hitSlop={8} onPress={() => setSelectedIds([])}>
              <Text style={styles.bulkLinkMuted}>Huỷ</Text>
            </TouchableOpacity>
          </View>
          <WorkflowButton
            variant="success"
            label={`Duyệt nhiều (${selectedIds.length})`}
            icon="checkmark-done"
            loading={preparingBulk}
            onPress={() =>
              startBulkApprove(list.items.filter((item) => selectedIds.includes(item.id)))
            }
          />
        </View>
      ) : perms.canInsert && me.iD_NhanVien ? (
        <WorkflowFab onPress={() => navigation.navigate("FlowForm", { nameClass, mode: "add" })} />
      ) : null}

      {approve ? (
        <FlowApproveSheet
          visible
          nameClass={nameClass}
          idHoSo={approve.record.id}
          ketQua={approve.ketQua}
          phieuLabel={getFlowLabel(approve.record, soPhieuField)}
          onClose={() => setApprove(null)}
          onDone={finishAction}
          onTaoCongViec={({ yKien, prefill }) => {
            const record = approve.record;
            setApprove(null);
            navigation.navigate("CongViecForm", {
              mode: "add",
              fromFlow: {
                nameClass,
                idHoSo: record.id,
                yKien,
                prefill,
                soPhieu: prefill?.soPhieu ?? getFlowSoPhieu(record, soPhieuField),
              },
            });
          }}
        />
      ) : null}

      {bulk ? (
        <FlowBulkApproveSheet
          visible
          nameClass={nameClass}
          ids={bulkIds}
          skippedNotAllowed={bulk.skippedNotAllowed}
          labelOf={labelOf}
          onClose={() => setBulk(null)}
          onDone={handleBulkDone}
        />
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
    approveAllRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      paddingHorizontal: 12,
      paddingBottom: 8,
    },
    hint: {
      flex: 1,
      fontSize: 12,
      color: c.textSub,
    },
    listContent: {
      paddingHorizontal: 12,
      paddingTop: 4,
      paddingBottom: 96,
      flexGrow: 1,
    },
    listWithBar: {
      paddingBottom: 150,
    },
    footerLoading: {
      paddingVertical: 16,
    },
    bulkBar: {
      position: "absolute",
      left: 0,
      right: 0,
      bottom: 0,
      gap: 10,
      paddingHorizontal: 12,
      paddingTop: 10,
      backgroundColor: c.surface,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: c.separator,
    },
    bulkTop: {
      flexDirection: "row",
      alignItems: "center",
      gap: 16,
    },
    bulkText: {
      flex: 1,
      fontSize: 14,
      fontWeight: "700",
      color: c.text,
    },
    bulkLink: {
      fontSize: 14,
      fontWeight: "700",
      color: c.red,
    },
    bulkLinkMuted: {
      fontSize: 14,
      fontWeight: "600",
      color: c.textSub,
    },
  });
