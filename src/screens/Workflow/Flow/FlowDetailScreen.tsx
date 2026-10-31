import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import Ionicons from "react-native-vector-icons/Ionicons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { showAppToast } from "../../../components/ui/AppToast";
import EmptyState from "../../../components/ui/EmptyState";
import { flowDelete, flowGetById, flowThongTin } from "../../../services/data/flowApi";
import type { FlowRecord, FlowThongTin, StackNavigation, StackRoute } from "../../../types/index";
import { AppColors, useAppColors, useStyles } from "../../../utils/helpers/colors";
import { elevation } from "../../../utils/helpers/tokens";
import StatusBadge from "../shared/components/StatusBadge";
import WorkflowActionToolbar, {
  WorkflowToolbarAction,
} from "../shared/components/WorkflowActionToolbar";
import WorkflowButton from "../shared/components/WorkflowButton";
import WorkflowDetailFields from "../shared/components/WorkflowDetailFields";
import WorkflowDetailSkeleton from "../shared/components/WorkflowDetailSkeleton";
import WorkflowHeroLinks from "../shared/components/WorkflowHeroLinks";
import { useWorkflowMe } from "../shared/useWorkflowMe";
import { useWorkflowPermissions } from "../shared/useWorkflowPermissions";
import {
  useMarkWorkflowChanged,
  useReloadOnWorkflowChange,
} from "../shared/useWorkflowVersion";
import { useOnWorkflowInfoStale } from "../shared/workflowInfoRefresh";
import { FLOW_KET_QUA, getFlowTinhTrang as getTinhTrangOption } from "../shared/workflowConstants";
import { getWorkflowErrorMessage } from "../shared/workflowErrors";
import { getDetailFields } from "../shared/workflowFields";
import FlowApproveSheet, { FlowKetQua } from "./components/FlowApproveSheet";
import FlowTraBuocSheet from "./components/FlowTraBuocSheet";
import {
  FLOW_CARD_CUSTOM_FIELDS,
  getFlowActions,
  getFlowApproveButtons,
  getFlowDoneMessage,
  getFlowHeading,
  getFlowLabel,
  getFlowSoPhieu,
  getFlowTinhTrang,
} from "./flowRules";
import { useFlowMeta } from "./useFlowMeta";
import { AppAlert } from "../../../components/ui/AppAlert";

/**
 * Chi tiết 1 phiếu: phần động (field isShowDetail != false — gồm cả field chỉ
 * đọc như Số, Người lập) + nhãn tình trạng, bước hiện tại và các nút vẽ riêng.
 *
 * Mở từ danh sách thì đã có sẵn dòng phiếu. Mở từ thông báo / thẻ công việc
 * chỉ có ID — nạp qua danh sách tab "Tất cả" + điều kiện ID (tài liệu BE: không
 * có API lấy 1 phiếu, cách này vẫn đúng luật ai được xem).
 */
export default function FlowDetailScreen() {
  const styles = useStyles(makeStyles);
  const c = useAppColors();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<StackNavigation<"FlowChiTiet">>();
  const route = useRoute<StackRoute<"FlowChiTiet">>();
  const { nameClass } = route.params;
  const id = Number(route.params.id);
  const {
    meta,
    errorMessage: metaError,
    loading: metaLoading,
    reload: reloadMeta,
  } = useFlowMeta(nameClass);
  const perms = useWorkflowPermissions(nameClass);
  const { me, loading: meLoading } = useWorkflowMe();
  const markChanged = useMarkWorkflowChanged();

  const [record, setRecord] = useState<FlowRecord | null>(route.params.item ?? null);
  const [info, setInfo] = useState<FlowThongTin | null>(route.params.info ?? null);
  // Danh sách đưa đủ phiếu + flow-thong-tin thì vẽ ngay; thiếu `info` (bấm khi
  // thẻ chưa có thông tin, mở từ thông báo) thì chờ — không thì dòng bước, số
  // bình luận / file và thanh nút duyệt hiện sau.
  const [loading, setLoading] = useState(!(route.params.item && route.params.info));
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [approve, setApprove] = useState<FlowKetQua | typeof FLOW_KET_QUA.TraBuoc | null>(null);
  const [deleting, setDeleting] = useState(false);
  const recordRef = useRef(record);
  recordRef.current = record;

  const load = useCallback(
    async (mode: "initial" | "refresh" | "silent" = "initial") => {
      if (mode === "refresh") setRefreshing(true);
      try {
        const [fresh, infos] = await Promise.all([
          // Lỗi mạng / quyền rơi xuống catch dưới — không giả làm "Không tìm thấy".
          flowGetById(nameClass, id),
          flowThongTin(nameClass, [id]).catch(() => [] as FlowThongTin[]),
        ]);
        if (!fresh) {
          // Mục 5: items rỗng = phiếu không còn tới tôi / đã xoá.
          if (recordRef.current) {
            AppAlert.alert("Thông báo", "Không tìm thấy phiếu.", [
              { text: "OK", onPress: () => navigation.goBack() },
            ]);
          } else {
            setErrorMessage("Không tìm thấy phiếu.");
          }
          return;
        }
        setRecord(fresh);
        setErrorMessage(null);
        setInfo(infos[0] ?? null);
      } catch (err) {
        const message = getWorkflowErrorMessage(err, "Không tải được phiếu.");
        setErrorMessage(message);
        // Kéo làm mới hỏng mà phiếu đang hiện: lỗi trên chỉ hiện khi chưa có phiếu.
        if (mode === "refresh" && recordRef.current) {
          showAppToast({ message: "Không làm mới được", detail: message, tone: "warning" });
        }
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [id, nameClass, navigation],
  );

  useEffect(() => {
    load();
  }, [load]);

  /** "Thử lại" ở màn lỗi: nạp lại phiếu, cả metadata nếu lượt trước hỏng. */
  const retry = () => {
    setLoading(true);
    setErrorMessage(null);
    if (metaError) reloadMeta();
    load();
  };

  // Im lặng: bật vòng xoay bằng code lúc quay lại màn làm iOS kẹt một khoảng trống.
  useReloadOnWorkflowChange(() => load("silent"));

  // Đóng màn Bình luận / Đính kèm → số trên dải đáy thẻ đầu.
  useOnWorkflowInfoStale((apiBase) => {
    if (apiBase !== nameClass) return;
    flowThongTin(nameClass, [id])
      .then((infos) => infos[0] && setInfo(infos[0]))
      .catch(() => undefined);
  });

  const detailFields = useMemo(
    () => getDetailFields(meta?.fields ?? [], "notFalse", FLOW_CARD_CUSTOM_FIELDS),
    [meta?.fields],
  );

  const actions = getFlowActions(record, info, me.iD_NhanVien, perms);

  const phieuLabel = getFlowLabel(record, meta?.soPhieuField);

  /**
   * Xử lý xong lượt của tôi: báo ngắn rồi quay về danh sách — ở lại màn này
   * chỉ còn phiếu đã hết nút. Server từ chối (`sent` = false, người khác vừa xử
   * lý trước) thì ở lại, nạp lại để nút Duyệt tự ẩn.
   */
  const finishApprove = (ketQua: number, sent: boolean) => {
    setApprove(null);
    markChanged();
    if (!sent) return;
    showAppToast({ message: getFlowDoneMessage(ketQua, phieuLabel) });
    // Mở thẳng từ thông báo khi app vừa bật thì có thể không còn màn nào phía sau.
    if (navigation.canGoBack()) navigation.goBack();
  };

  const confirmDelete = () =>
    AppAlert.alert("Xoá phiếu", `Xoá phiếu ${phieuLabel}? Thao tác không hoàn tác được.`, [
      { text: "Huỷ", style: "cancel" },
      {
        text: "Xoá",
        style: "destructive",
        onPress: async () => {
          try {
            setDeleting(true);
            await flowDelete(nameClass, [id]);
            markChanged();
            showAppToast({ message: `Đã xoá phiếu ${phieuLabel}` });
            navigation.goBack();
          } catch (err) {
            AppAlert.alert("Không xoá được", getWorkflowErrorMessage(err, "Vui lòng thử lại."));
          } finally {
            setDeleting(false);
          }
        },
      },
    ]);

  // Chờ đủ: phiếu, metadata (số phiếu, các dòng), quyền và người đăng nhập (nút).
  if (loading || metaLoading || meLoading || !perms.loaded) {
    return <WorkflowDetailSkeleton variant="flow" fields={detailFields} />;
  }

  if (!record) {
    return (
      <EmptyState
        iconName="alert-circle-outline"
        title="Không mở được phiếu"
        subtitle={errorMessage ?? metaError ?? undefined}
        actionLabel="Thử lại"
        onActionPress={retry}
      />
    );
  }

  const tinhTrang = getTinhTrangOption(getFlowTinhTrang(record));

  // Cùng thanh nút phụ với màn Chi tiết công việc / kế hoạch: icon trên chữ
  // dưới, một hàng, Xoá đỏ. Nút duyệt vẫn ghim dưới đáy màn.
  const toolbarActions: WorkflowToolbarAction[] = [];
  if (actions.quyTrinh) {
    toolbarActions.push({
      key: "quyTrinh",
      icon: "git-network-outline",
      label: "Quy trình",
      onPress: () => navigation.navigate("FlowTienTrinh", { nameClass, id, item: record }),
    });
  }
  if (actions.sua) {
    toolbarActions.push({
      key: "sua",
      icon: "create-outline",
      label: "Sửa",
      onPress: () => navigation.navigate("FlowForm", { nameClass, mode: "edit", item: record }),
    });
  }
  if (actions.nhanBan) {
    toolbarActions.push({
      key: "nhanBan",
      icon: "copy-outline",
      label: "Nhân bản",
      onPress: () => navigation.navigate("FlowForm", { nameClass, mode: "clone", item: record }),
    });
  }
  if (actions.xoa) {
    toolbarActions.push({
      key: "xoa",
      icon: "trash-outline",
      label: "Xoá",
      tone: "danger",
      loading: deleting,
      onPress: confirmDelete,
    });
  }

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load("refresh")} />}
      >
        <View style={styles.hero}>
          <View style={styles.heroTop}>
            <Text style={styles.flowName}>{getFlowHeading(record, meta?.flow.ten)}</Text>
            {tinhTrang ? (
              <StatusBadge
                label={tinhTrang.label}
                color={tinhTrang.color}
                textColor={tinhTrang.textColor}
                solid
              />
            ) : null}
          </View>
          <Text style={styles.phieuLabel}>{phieuLabel}</Text>
          {info?.buocHienTai ? (
            <View style={styles.heroLine}>
              <Ionicons name="git-commit-outline" size={15} color={info.isToiLuot ? c.red : c.textSub} />
              <Text style={[styles.heroText, info.isToiLuot && styles.stepMine]}>
                Bước hiện tại: {info.buocHienTai}
              </Text>
            </View>
          ) : null}

          <WorkflowHeroLinks
            links={[
              {
                key: "binhLuan",
                icon: "chatbubble-ellipses-outline",
                label: "Bình luận",
                count: info?.soBinhLuan ?? 0,
                onPress: () =>
                  navigation.navigate("WorkflowBinhLuan", {
                    apiBase: nameClass,
                    idHoSo: id,
                    // Ai xem được phiếu thì bình luận được.
                    canSend: true,
                  }),
              },
              {
                key: "file",
                icon: "attach-outline",
                label: "Đính kèm",
                count: info?.soFile ?? 0,
                disabled: !actions.dinhKem,
                onPress: () =>
                  navigation.navigate("WorkflowFile", {
                    apiBase: nameClass,
                    idHoSo: id,
                    canEdit: actions.suaFile,
                  }),
              },
            ]}
          />
        </View>

        {toolbarActions.length ? (
          <View style={styles.toolbar}>
            <WorkflowActionToolbar actions={toolbarActions} />
          </View>
        ) : null}

        {detailFields.length ? <WorkflowDetailFields item={record} fields={detailFields} /> : null}
      </ScrollView>

      {actions.duyet ? (
        // Ghim dưới đáy màn: đọc nội dung phiếu xong là bấm ngay, khỏi cuộn ngược
        // lên đầu. Thứ tự mục 4: Trả bước (cam) · Từ chối · Không ý kiến · Duyệt.
        // Đủ 4 nút thì xếp 2 × 2 — 4 nút một hàng nhãn bị bóp nhỏ quá.
        <View style={[styles.approveBar, { paddingBottom: Math.max(insets.bottom, 10) }]}>
          {getFlowApproveButtons(actions).map((button, _index, buttons) => (
            <WorkflowButton
              key={button.key}
              flex
              variant={button.variant}
              icon={button.icon}
              label={button.label}
              style={buttons.length > 3 ? styles.approveHalf : undefined}
              onPress={() => setApprove(button.ketQua)}
            />
          ))}
        </View>
      ) : null}

      {approve === FLOW_KET_QUA.TraBuoc ? (
        <FlowTraBuocSheet
          visible
          nameClass={nameClass}
          idHoSo={id}
          phieuLabel={phieuLabel}
          buocHienTai={info?.buocHienTai}
          traVe={info?.traVe}
          onClose={() => setApprove(null)}
          onDone={(sent) => finishApprove(FLOW_KET_QUA.TraBuoc, sent)}
        />
      ) : approve ? (
        <FlowApproveSheet
          visible
          nameClass={nameClass}
          idHoSo={id}
          ketQua={approve}
          phieuLabel={phieuLabel}
          onClose={() => setApprove(null)}
          onDone={(sent) => finishApprove(approve, sent)}
          onTaoCongViec={({ yKien, prefill }) => {
            setApprove(null);
            navigation.navigate("CongViecForm", {
              mode: "add",
              fromFlow: {
                nameClass,
                idHoSo: id,
                yKien,
                prefill,
                soPhieu: prefill?.soPhieu ?? getFlowSoPhieu(record, meta?.soPhieuField),
              },
            });
          }}
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
    content: {
      padding: 12,
      paddingBottom: 40,
    },
    hero: {
      backgroundColor: c.surface,
      borderRadius: 16,
      padding: 14,
      marginBottom: 10,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.border,
      ...elevation(c.shadow, 1),
    },
    heroTop: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 8,
    },
    flowName: {
      flex: 1,
      fontSize: 13,
      fontWeight: "700",
      color: c.accent,
    },
    // Tiêu đề + dòng phụ cùng số đo thẻ đầu màn Chi tiết công việc.
    phieuLabel: {
      fontSize: 18,
      fontWeight: "700",
      color: c.text,
      marginTop: 8,
      marginBottom: 6,
    },
    heroLine: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      marginTop: 4,
    },
    heroText: {
      flex: 1,
      fontSize: 13,
      color: c.textSecondary,
    },
    stepMine: {
      color: c.red,
      fontWeight: "600",
    },
    // Thanh nút tự chừa 2 (sát thanh tab ở hai màn kia); ở đây field nằm ngay
    // dưới nên chừa thêm cho bằng khoảng dưới thẻ đầu.
    toolbar: {
      marginBottom: 8,
    },
    // Cùng kiểu thanh "Duyệt nhiều" của danh sách phiếu, nhưng nằm trong luồng
    // layout (dưới ScrollView) nên nội dung không bị che.
    approveBar: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
      paddingHorizontal: 12,
      paddingTop: 10,
      backgroundColor: c.surface,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: c.separator,
    },
    approveHalf: {
      flexBasis: "45%",
    },
  });
