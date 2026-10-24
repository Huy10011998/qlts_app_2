import React, { useCallback, useEffect, useMemo, useState } from "react";
import { FlatList, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import SwipeHintBanner from "../../../components/assets/shared/SwipeHintBanner";
import SwipeableListRow, {
  type SwipeRowAction,
  useSingleOpenRow,
} from "../../../components/list/SwipeableListRow";
import EmptyState from "../../../components/ui/EmptyState";
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
import { AppColors, useAppColors, useStyles } from "../../../utils/helpers/colors";
import WorkflowButton, { getWorkflowButtonColors } from "../shared/components/WorkflowButton";
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
import {
  useMarkWorkflowChanged,
  useReloadOnWorkflowChange,
} from "../shared/useWorkflowVersion";
import { useOnWorkflowInfoStale } from "../shared/workflowInfoRefresh";
import { FLOW_KET_QUA, FLOW_TABS, readTabCount } from "../shared/workflowConstants";
import { getWorkflowErrorMessage } from "../shared/workflowErrors";
import { getCardFields } from "../shared/workflowFields";
import FlowApproveSheet, { FlowKetQua } from "./components/FlowApproveSheet";
import FlowTraBuocSheet from "./components/FlowTraBuocSheet";
import FlowBulkApproveSheet, { FlowBulkOutcome } from "./components/FlowBulkApproveSheet";
import FlowCard, { getFlowCardLineFields } from "./components/FlowCard";
import {
  FLOW_CARD_CUSTOM_FIELDS,
  type FlowActions,
  getFlowActions,
  getFlowApproveButtons,
  getFlowDoneMessage,
  getFlowLabel,
  getFlowSoPhieu,
} from "./flowRules";
import { useFlowMeta } from "./useFlowMeta";
import { AppAlert } from "../../../components/ui/AppAlert";

/**
 * Trần số phiếu của một lượt "Duyệt nhiều (n)" ở đầu tab Chờ duyệt (duyệt hết,
 * không cần chọn từng phiếu) — lấy hết phiếu của tab Chờ duyệt
 * trong 1 lần gọi. Vượt trần thì duyệt phần đầu, phần còn lại bấm lại lần nữa.
 */
const DUYET_TAT_CA_MAX = 500;

/**
 * Tab chỉ có phiếu đang chạy quy trình (Chờ duyệt · Đang xử lý) — thẻ chắc có
 * dòng bước hiện tại + viên Quy trình. Tab lẫn nháp / phiếu đã xong thì khung
 * chờ không vẽ, vì đoán sai đằng nào cũng lệch ~22pt mỗi thẻ.
 */
const TABS_CO_BUOC: FlowTab[] = ["ChoDuyet", "DangXuLy"];

type ApproveState = { record: FlowRecord; ketQua: FlowKetQua | typeof FLOW_KET_QUA.TraBuoc };
type BulkState = { records: FlowRecord[]; skippedNotAllowed: number };
type ToastState = { message: string; detail?: string; tone: "success" | "warning" };

/**
 * Danh sách phiếu đề nghị — MỘT màn cho mọi loại phiếu chạy quy trình. Đầu vào
 * duy nhất là `nameClass` = tên bảng nghiệp vụ (khai ở `workflowMenu.ts`).
 * Thẻ dựng từ FlowAttributes; tab, tình trạng, bước hiện tại, nút duyệt vẽ riêng.
 */
export default function FlowListScreen() {
  const styles = useStyles(makeStyles);
  const c = useAppColors();
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
  const { pendingIds: infoPending, track: trackInfo } = useInfoPending();
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [approve, setApprove] = useState<ApproveState | null>(null);
  const [bulk, setBulk] = useState<BulkState | null>(null);
  const [preparingBulk, setPreparingBulk] = useState(false);
  const [toast, setToast] = useState<ToastState | null>(null);
  const { closeOpenRow, rowHandlers } = useSingleOpenRow();

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
      const ids = page.map((item) => item.id);
      trackInfo(ids, flowThongTin(nameClass, ids).then(mergeInfos));
    },
    [mergeInfos, nameClass, trackInfo],
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

  // Đóng màn Bình luận / Đính kèm → số bình luận / file của các dòng đang hiện.
  useOnWorkflowInfoStale((apiBase) => {
    if (apiBase === nameClass && list.items.length) loadInfos(list.items);
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

  // Dáng khung chờ: số dòng field theo metadata (useFlowMeta giữ trong phiên, nên
  // từ lần mở thứ hai đã có ngay); chưa có thì khung chờ tự đoán.
  const skeletonShape = useMemo<WorkflowCardSkeletonShape>(
    () => ({
      lines: meta ? countFieldLines(getFlowCardLineFields(cardFields, soPhieuField)) : undefined,
      step: TABS_CO_BUOC.includes(tab),
    }),
    [cardFields, meta, soPhieuField, tab],
  );

  const bulkIds = useMemo(() => bulk?.records.map((record) => record.id) ?? [], [bulk]);
  const labelOf = useCallback(
    (id: number) =>
      getFlowLabel(bulk?.records.find((record) => record.id === id) ?? { id }, soPhieuField),
    [bulk, soPhieuField],
  );

  const actionsOf = (item: FlowRecord) =>
    getFlowActions(item, infos[item.id], me.iD_NhanVien, perms);

  /**
   * Nút lộ ra khi vuốt thẻ sang trái — phiếu tới lượt tôi. Duyệt sát mép phải,
   * gần ngón cái nhất; bấm là thẻ đóng lại và mở hộp xác nhận như nút cũ trên thẻ.
   */
  const swipeActionsOf = (item: FlowRecord, actions: FlowActions): SwipeRowAction[] =>
    getFlowApproveButtons(actions).map((button) => {
      const colors = getWorkflowButtonColors(button.variant, c);
      return {
        key: button.key,
        icon: button.icon,
        label: button.label,
        color: colors.bg,
        textColor: colors.fg,
        closeOnPress: true,
        onPress: () => setApprove({ record: item, ketQua: button.ketQua }),
      };
    });

  const toggleSelect = (id: number) =>
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]));

  const openDetail = (item: FlowRecord) =>
    navigation.navigate("FlowChiTiet", { nameClass, id: item.id, item, info: infos[item.id] });

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
        AppAlert.alert("Không có phiếu để duyệt", "Các phiếu này không còn tới lượt bạn duyệt.");
        return;
      }
      if (allowed.length === 1) {
        setApprove({ record: allowed[0], ketQua: FLOW_KET_QUA.Duyet });
        return;
      }
      setBulk({ records: allowed, skippedNotAllowed });
    } catch (err) {
      AppAlert.alert("Không kiểm tra được phiếu", getWorkflowErrorMessage(err, "Vui lòng thử lại."));
    } finally {
      setPreparingBulk(false);
    }
  };

  /**
   * Duyệt nhiều = mọi phiếu đang chờ tôi (tab Chờ duyệt, theo từ khoá đang tìm) —
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
        AppAlert.alert("Không còn phiếu", "Không có phiếu nào chờ duyệt.");
        return;
      }
      if (result.totalCount > records.length) {
        AppAlert.alert(
          "Duyệt nhiều",
          `Có ${result.totalCount} phiếu chờ duyệt; lượt này duyệt ${records.length} phiếu đầu, phần còn lại bấm Duyệt nhiều lần nữa.`,
        );
      }
      await startBulkApprove(records);
    } catch (err) {
      AppAlert.alert("Không lấy được danh sách phiếu", getWorkflowErrorMessage(err, "Vui lòng thử lại."));
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

  /**
   * Xong 1 phiếu (duyệt / từ chối / không ý kiến / trả bước): báo ngắn cùng chỗ
   * với duyệt nhiều — trước đây im lặng, phiếu chỉ lặng lẽ biến khỏi tab. Server
   * từ chối (`sent` = false) thì sheet đã báo bằng Alert, chỉ nạp lại.
   */
  const handleSingleDone = (target: ApproveState, sent: boolean) => {
    finishAction();
    if (!sent) return;
    setToast({
      message: getFlowDoneMessage(target.ketQua, getFlowLabel(target.record, soPhieuField)),
      tone: "success",
    });
  };

  /** Báo kết quả duyệt nhiều đúng câu chữ của tài liệu (mục 8c, B4). */
  const handleBulkDone = ({ result, skippedTaoCongViec }: FlowBulkOutcome) => {
    finishAction();

    const soThanhCong = result.soThanhCong ?? 0;
    const soCanChonNguoi = result.soCanChonNguoi ?? 0;
    const loi = (result.loi ?? []).filter(Boolean);
    const boQua = skippedTaoCongViec
      ? `Đã bỏ qua ${skippedTaoCongViec} phiếu ở lượt cuối "Tạo công việc" - duyệt từng phiếu để tạo công việc`
      : "";

    if (soCanChonNguoi > 0) {
      AppAlert.alert(
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
      AppAlert.alert(
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
      AppAlert.alert("Kết quả duyệt", boQua);
    }
  };

  // Đang nạp cấu hình phiếu: vẫn dựng ô tìm kiếm + hàng tab thật, danh sách là
  // khung chờ — giống hệt lúc chờ trang đầu, khỏi thêm một nhịp vòng xoay trước.
  if (!metaLoading && (metaError || !meta)) {
    return <EmptyState iconName="alert-circle-outline" title="Không mở được phiếu" subtitle={metaError ?? undefined} />;
  }

  if (meta && perms.loaded && !perms.canRead) {
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
  const firstLoading = (metaLoading || list.loading) && !list.items.length;
  // Hàng Duyệt nhiều chỉ có sau trang đầu (`totalCount`): khung chờ giữ chỗ nó,
  // trừ khi dem-tab đã báo không còn phiếu chờ (vd vừa đổi từ tab khác về).
  const reserveApproveAll =
    firstLoading && tab === "ChoDuyet" && !!me.iD_NhanVien && readTabCount(counts, "ChoDuyet") !== 0;

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
          {/* Cùng dải nhắc của danh sách tài sản — nút duyệt nằm sau thao tác vuốt. */}
          <SwipeHintBanner
            text="Vuốt thẻ sang trái để duyệt, nhấn giữ để chọn nhiều."
            style={styles.swipeHint}
          />
          <WorkflowButton
            compact
            variant="success"
            icon="checkmark-done"
            // Đúng chữ PHỤ LỤC ("Duyệt nhiều"); chỉ hiện khi chưa chọn phiếu nào, nên
            // không trùng với thanh "Duyệt nhiều (n)" lúc đang chọn.
            label={`Duyệt nhiều (${list.totalCount})`}
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

      {firstLoading ? (
        <WorkflowListSkeleton kind="flow" shape={skeletonShape} hasApproveAllRow={reserveApproveAll} />
      ) : (
        <FlatList
          data={list.items}
          keyExtractor={(item) => String(item.id)}
          extraData={{ infos, infoPending, selectedIds }}
          renderItem={({ item }) => {
            const actions = actionsOf(item);
            const canSelect = tab === "ChoDuyet" && actions.duyet;
            return (
              <SwipeableListRow
                actions={swipeActionsOf(item, actions)}
                actionsStyle={styles.swipeActions}
                // Đang chọn nhiều thì chỉ còn Duyệt nhiều ở thanh dưới — tắt vuốt.
                disabled={!actions.duyet || selecting}
                {...rowHandlers}
              >
                <FlowCard
                  style={styles.card}
                  item={item}
                  fields={cardFields}
                  soPhieuField={soPhieuField}
                  info={infos[item.id]}
                  infoPending={infoPending.has(item.id)}
                  selectable={selecting && canSelect}
                  selected={selectedIds.includes(item.id)}
                  onPress={() => (selecting && canSelect ? toggleSelect(item.id) : openDetail(item))}
                  onLongPress={canSelect ? () => toggleSelect(item.id) : undefined}
                  // Cùng tham số với nút ở màn chi tiết; đang chọn nhiều thì bấm là chọn.
                  onOpenComments={
                    selecting
                      ? undefined
                      : () =>
                          navigation.navigate("WorkflowBinhLuan", {
                            apiBase: nameClass,
                            idHoSo: item.id,
                            // Ai xem được phiếu thì bình luận được.
                            canSend: true,
                            titleHeader: getFlowLabel(item, soPhieuField),
                          })
                  }
                  // Cùng luật nút Đính kèm ở chi tiết (tắt khi 0 file, trừ nháp của tôi).
                  filesDisabled={!selecting && !actions.dinhKem}
                  onOpenFiles={
                    selecting || !actions.dinhKem
                      ? undefined
                      : () =>
                          navigation.navigate("WorkflowFile", {
                            apiBase: nameClass,
                            idHoSo: item.id,
                            canEdit: actions.suaFile,
                            titleHeader: getFlowLabel(item, soPhieuField),
                          })
                  }
                  // Cùng luật nút Quy trình ở chi tiết (phiếu đã có bước); đang chọn nhiều thì ẩn.
                  onOpenProcess={
                    selecting || !actions.quyTrinh
                      ? undefined
                      : () => navigation.navigate("FlowTienTrinh", { nameClass, id: item.id, item })
                  }
                />
              </SwipeableListRow>
            );
          }}
          contentContainerStyle={[styles.listContent, selecting && styles.listWithBar]}
          onScrollBeginDrag={() => closeOpenRow()}
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
            <WorkflowListFooter
              list={list}
              skeleton={
                <View style={styles.footerSkeleton}>
                  <WorkflowListFooterSkeleton kind="flow" shape={skeletonShape} />
                </View>
              }
            />
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

      {approve?.ketQua === FLOW_KET_QUA.TraBuoc ? (
        <FlowTraBuocSheet
          visible
          nameClass={nameClass}
          idHoSo={approve.record.id}
          phieuLabel={getFlowLabel(approve.record, soPhieuField)}
          buocHienTai={infos[approve.record.id]?.buocHienTai}
          traVe={infos[approve.record.id]?.traVe}
          onClose={() => setApprove(null)}
          onDone={(sent) => handleSingleDone(approve, sent)}
        />
      ) : approve ? (
        <FlowApproveSheet
          visible
          nameClass={nameClass}
          idHoSo={approve.record.id}
          ketQua={approve.ketQua}
          phieuLabel={getFlowLabel(approve.record, soPhieuField)}
          onClose={() => setApprove(null)}
          onDone={(sent) => handleSingleDone(approve, sent)}
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
    // Dải nằm chung hàng với nút: bỏ lề riêng của nó, lề ngang đã có ở hàng.
    swipeHint: {
      flex: 1,
      paddingHorizontal: 0,
      paddingBottom: 0,
      marginTop: 0,
    },
    // Lề ngang / trên nằm ở từng thẻ (`card`) chứ không ở đây: Swipeable cắt
    // (overflow hidden) sát mép hàng, lề trong hàng mới chừa chỗ cho bóng thẻ
    // và cụm nút vuốt.
    listContent: {
      paddingBottom: 96,
      flexGrow: 1,
    },
    // Cộng lại vẫn đúng nhịp cũ (lề trên danh sách 4, thẻ cách nhau 10) mà
    // khung chờ đang đo theo.
    card: {
      marginHorizontal: 12,
      marginTop: 4,
      marginBottom: 6,
    },
    swipeActions: {
      marginTop: 4,
      marginBottom: 6,
    },
    footerSkeleton: {
      paddingHorizontal: 12,
      paddingTop: 4,
    },
    listWithBar: {
      paddingBottom: 150,
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
