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
import WorkflowButton from "../shared/components/WorkflowButton";
import WorkflowDetailFields from "../shared/components/WorkflowDetailFields";
import WorkflowDetailSkeleton from "../shared/components/WorkflowDetailSkeleton";
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
  const { meta, errorMessage: metaError } = useFlowMeta(nameClass);
  const perms = useWorkflowPermissions(nameClass);
  const { me } = useWorkflowMe();
  const markChanged = useMarkWorkflowChanged();

  const [record, setRecord] = useState<FlowRecord | null>(route.params.item ?? null);
  const [info, setInfo] = useState<FlowThongTin | null>(null);
  const [loading, setLoading] = useState(!route.params.item);
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
        setErrorMessage(getWorkflowErrorMessage(err, "Không tải được phiếu."));
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

  // Im lặng: bật vòng xoay bằng code lúc quay lại màn làm iOS kẹt một khoảng trống.
  useReloadOnWorkflowChange(() => load("silent"));

  // Đóng màn Bình luận / Đính kèm → số trên 2 nút.
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
            navigation.goBack();
          } catch (err) {
            AppAlert.alert("Không xoá được", getWorkflowErrorMessage(err, "Vui lòng thử lại."));
          } finally {
            setDeleting(false);
          }
        },
      },
    ]);

  if (loading) return <WorkflowDetailSkeleton variant="flow" fields={detailFields} />;

  if (!record) {
    return (
      <EmptyState
        iconName="alert-circle-outline"
        title="Không mở được phiếu"
        subtitle={errorMessage ?? metaError ?? undefined}
      />
    );
  }

  const tinhTrang = getTinhTrangOption(getFlowTinhTrang(record));

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
            <View style={styles.stepRow}>
              <Ionicons name="git-commit-outline" size={16} color={info.isToiLuot ? c.red : c.textSub} />
              <Text style={[styles.stepText, info.isToiLuot && styles.stepMine]}>
                Bước hiện tại: {info.buocHienTai}
              </Text>
            </View>
          ) : null}
        </View>

        <View style={styles.actions}>
          <WorkflowButton
            compact
            variant="outline"
            icon="git-network-outline"
            label="Quy trình"
            disabled={!actions.quyTrinh}
            onPress={() => navigation.navigate("FlowTienTrinh", { nameClass, id, item: record })}
          />
          <WorkflowButton
            compact
            variant="outline"
            icon="chatbubble-ellipses-outline"
            label={`Bình luận (${info?.soBinhLuan ?? 0})`}
            onPress={() =>
              navigation.navigate("WorkflowBinhLuan", {
                apiBase: nameClass,
                idHoSo: id,
                // Ai xem được phiếu thì bình luận được.
                canSend: true,
              })
            }
          />
          <WorkflowButton
            compact
            variant="outline"
            icon="attach-outline"
            label={`Đính kèm (${info?.soFile ?? 0})`}
            disabled={!actions.dinhKem}
            onPress={() =>
              navigation.navigate("WorkflowFile", {
                apiBase: nameClass,
                idHoSo: id,
                canEdit: actions.suaFile,
              })
            }
          />
          {actions.sua ? (
            <WorkflowButton
              compact
              variant="neutral"
              icon="create-outline"
              label="Sửa"
              onPress={() => navigation.navigate("FlowForm", { nameClass, mode: "edit", item: record })}
            />
          ) : null}
          {actions.nhanBan ? (
            <WorkflowButton
              compact
              variant="neutral"
              icon="copy-outline"
              label="Nhân bản"
              onPress={() => navigation.navigate("FlowForm", { nameClass, mode: "clone", item: record })}
            />
          ) : null}
          {actions.xoa ? (
            <WorkflowButton
              compact
              variant="neutral"
              icon="trash-outline"
              label="Xoá"
              loading={deleting}
              onPress={confirmDelete}
            />
          ) : null}
        </View>

        {detailFields.length ? <WorkflowDetailFields item={record} fields={detailFields} /> : null}
      </ScrollView>

      {actions.duyet ? (
        // Ghim dưới đáy màn: đọc nội dung phiếu xong là bấm ngay, khỏi cuộn ngược
        // lên đầu. Thứ tự mục 4: Trả bước (cam) · Từ chối · Không ý kiến · Duyệt.
        // Đủ 4 nút thì xếp 2 × 2 — 4 nút một hàng nhãn bị bóp nhỏ quá.
        <View style={[styles.approveBar, { paddingBottom: Math.max(insets.bottom, 10) }]}>
          {[
            actions.traBuoc
              ? { key: "traBuoc", variant: "warning" as const, icon: "arrow-undo-outline", label: "Trả bước", ketQua: FLOW_KET_QUA.TraBuoc }
              : null,
            { key: "tuChoi", variant: "danger" as const, icon: "close-circle-outline", label: "Từ chối", ketQua: FLOW_KET_QUA.TuChoi },
            actions.khongYKien
              ? { key: "khongYKien", variant: "muted" as const, icon: "remove-circle-outline", label: "Không ý kiến", ketQua: FLOW_KET_QUA.KhongYKien }
              : null,
            { key: "duyet", variant: "success" as const, icon: "checkmark-circle-outline", label: "Duyệt", ketQua: FLOW_KET_QUA.Duyet },
          ]
            .filter((button): button is NonNullable<typeof button> => !!button)
            .map((button, _index, buttons) => (
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
    phieuLabel: {
      fontSize: 18,
      fontWeight: "700",
      color: c.text,
      marginTop: 6,
    },
    stepRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      marginTop: 10,
    },
    stepText: {
      flex: 1,
      fontSize: 14,
      color: c.textSecondary,
    },
    stepMine: {
      color: c.red,
      fontWeight: "600",
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
    actions: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 6,
      marginBottom: 12,
    },
  });
