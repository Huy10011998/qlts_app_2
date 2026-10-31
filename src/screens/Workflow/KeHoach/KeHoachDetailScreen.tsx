import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import Ionicons from "react-native-vector-icons/Ionicons";

import { showAppToast } from "../../../components/ui/AppToast";
import EmptyState from "../../../components/ui/EmptyState";
import { cvGetList, cvThongTin } from "../../../services/data/congViecApi";
import { khChiTiet, khXoa } from "../../../services/data/keHoachApi";
import {
  CV_CONG_VIEC_NAME_CLASS,
  CV_KE_HOACH_NAME_CLASS,
  getThaoTacError,
  isWorkflowNotFound,
} from "../../../services/data/workflowApi";
import type {
  CongViecItem,
  CongViecThongTin,
  KeHoachChiTiet,
  StackNavigation,
  StackRoute,
} from "../../../types/index";
import { SqlOperator, TypeProperty } from "../../../utils/Enum";
import { AppColors, useAppColors, useStyles } from "../../../utils/helpers/colors";
import { elevation } from "../../../utils/helpers/tokens";
import CongViecCard from "../CongViec/components/CongViecCard";
import CongViecLichSuSheet from "../CongViec/components/CongViecLichSuSheet";
import { CV_CARD_CUSTOM_FIELDS } from "../CongViec/congViecRules";
import ProgressRing from "../shared/components/ProgressRing";
import WorkflowActionToolbar, {
  WorkflowToolbarAction,
} from "../shared/components/WorkflowActionToolbar";
import WorkflowFab from "../shared/components/WorkflowFab";
import WorkflowDetailFields from "../shared/components/WorkflowDetailFields";
import WorkflowDetailSkeleton from "../shared/components/WorkflowDetailSkeleton";
import WorkflowSection from "../shared/components/WorkflowSection";
import WorkflowTabBar from "../shared/components/WorkflowTabBar";
import { useWorkflowMe } from "../shared/useWorkflowMe";
import { useWorkflowPermissions } from "../shared/useWorkflowPermissions";
import {
  useMarkWorkflowChanged,
  useReloadOnWorkflowChange,
} from "../shared/useWorkflowVersion";
import { useOnWorkflowInfoStale } from "../shared/workflowInfoRefresh";
import { formatBeDate } from "../shared/workflowDate";
import { getWorkflowErrorMessage } from "../shared/workflowErrors";
import { getCardFields, getDetailFields } from "../shared/workflowFields";
import { useClassFields } from "../shared/workflowMetadata";
import { getKeHoachProgress } from "./keHoachRules";
import { AppAlert } from "../../../components/ui/AppAlert";

type Tab = "thongTin" | "congViec";

/** Tab công việc của kế hoạch lấy hết 1 lần (tài liệu: PageSize 1000). */
const KH_CONG_VIEC_PAGE_SIZE = 1000;

/**
 * Chi tiết kế hoạch (mục 2–3). Chủ trì thấy mọi việc của kế hoạch; người tham
 * gia chỉ thấy việc mình tham gia, còn số việc / % ở đầu là của cả kế hoạch.
 */
export default function KeHoachDetailScreen() {
  const styles = useStyles(makeStyles);
  const c = useAppColors();
  const navigation = useNavigation<StackNavigation<"KeHoachChiTiet">>();
  const route = useRoute<StackRoute<"KeHoachChiTiet">>();
  const id = Number(route.params?.id);
  const { me } = useWorkflowMe();
  const khPerm = useWorkflowPermissions(CV_KE_HOACH_NAME_CLASS);
  const cvPerm = useWorkflowPermissions(CV_CONG_VIEC_NAME_CLASS);
  const markChanged = useMarkWorkflowChanged();

  const [data, setData] = useState<KeHoachChiTiet | null>(null);
  const [congViecs, setCongViecs] = useState<CongViecItem[]>([]);
  /** Danh sách việc tải lỗi — đừng hiện thành "Chưa có công việc". */
  const [congViecError, setCongViecError] = useState<string | null>(null);
  /** cv-thong-tin của các việc đang hiện: số bình luận / file + cờ quyền. */
  const [cvInfos, setCvInfos] = useState<Record<number, CongViecThongTin>>({});
  const [lichSuItem, setLichSuItem] = useState<CongViecItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("thongTin");
  const [deleting, setDeleting] = useState(false);
  /** Đã hiện được kế hoạch — kéo làm mới hỏng thì báo thay vì im lặng. */
  const shownRef = useRef(false);

  const { fields: khFields, ready: khFieldsReady } = useClassFields(CV_KE_HOACH_NAME_CLASS);
  const { fields: cvFields, ready: cvFieldsReady } = useClassFields(CV_CONG_VIEC_NAME_CLASS);

  const load = useCallback(
    async (mode: "initial" | "refresh" | "silent" = "initial") => {
      if (mode === "refresh") setRefreshing(true);
      let cvLoi: string | null = null;
      try {
        const [detail, list] = await Promise.all([
          khChiTiet(id),
          cvGetList({
            tab: "KeHoach",
            pageSize: KH_CONG_VIEC_PAGE_SIZE,
            skipSize: 0,
            conditions: [
              {
                Property: "ID_KeHoach",
                Operator: SqlOperator.Equals,
                Value: id,
                Type: TypeProperty.Int,
              },
            ],
          }).catch((err) => {
            cvLoi = getWorkflowErrorMessage(err, "Không tải được công việc của kế hoạch.");
            return { items: [] as CongViecItem[], totalCount: 0 };
          }),
        ]);
        setData(detail);
        setCongViecs(list.items ?? []);
        setCongViecError(cvLoi);
        // Như danh sách Công việc: 1 lần cho các việc đang hiện; lỗi thì thẻ
        // chỉ thiếu số bình luận / file, không chặn màn.
        const ids = (list.items ?? []).map((item) => item.id);
        const infos = ids.length ? await cvThongTin(ids).catch(() => [] as CongViecThongTin[]) : [];
        setCvInfos(Object.fromEntries(infos.map((info) => [info.id, info])));
        setErrorMessage(null);
        shownRef.current = true;
      } catch (err) {
        if (isWorkflowNotFound(err)) {
          AppAlert.alert("Thông báo", "Không tìm thấy kế hoạch.", [
            { text: "OK", onPress: () => navigation.goBack() },
          ]);
          return;
        }
        const message = getWorkflowErrorMessage(err, "Không tải được kế hoạch.");
        // Màn vẫn giữ dữ liệu cũ: người dùng kéo làm mới thì phải biết là hỏng.
        // Nạp ngầm sau thao tác ("silent") thì vẫn im lặng.
        if (mode === "refresh" && shownRef.current) {
          showAppToast({ message: "Không làm mới được", detail: message, tone: "warning" });
        }
        setErrorMessage(message);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [id, navigation],
  );

  useEffect(() => {
    load();
  }, [load]);

  // Quay về từ màn công việc mà có thay đổi → nạp lại để cập nhật số / %.
  // Im lặng: bật vòng xoay bằng code lúc quay lại màn làm iOS kẹt một khoảng trống.
  useReloadOnWorkflowChange(() => load("silent"));

  // Đóng màn Bình luận / Đính kèm của 1 thẻ việc → nạp lại số trên các thẻ.
  useOnWorkflowInfoStale((apiBase) => {
    const ids = congViecs.map((item) => item.id);
    if (apiBase !== CV_CONG_VIEC_NAME_CLASS || !ids.length) return;
    cvThongTin(ids)
      .then((infos) => setCvInfos(Object.fromEntries(infos.map((info) => [info.id, info]))))
      .catch(() => undefined);
  });

  const detailFields = useMemo(() => getDetailFields(khFields, "true"), [khFields]);
  const cvCardFields = useMemo(
    () => getCardFields(cvFields, CV_CARD_CUSTOM_FIELDS),
    [cvFields],
  );

  const keHoach = data?.keHoach;
  const isChuTri = !!data?.quyen?.isChuTri;

  const confirmDelete = () => {
    // Còn việc thì không xoá được. Nút vẫn để bấm được (trước đây chỉ mờ đi,
    // người dùng không biết vì sao) — bấm thì nói lý do.
    const soCongViec = Number(keHoach?.soCongViec ?? 0);
    if (soCongViec > 0) {
      AppAlert.alert("Không xoá được", `Kế hoạch còn ${soCongViec} công việc, không xoá được.`);
      return;
    }

    AppAlert.alert("Xoá kế hoạch", "Xoá kế hoạch này? Thao tác không hoàn tác được.", [
      { text: "Huỷ", style: "cancel" },
      {
        text: "Xoá",
        style: "destructive",
        onPress: async () => {
          try {
            setDeleting(true);
            const result = await khXoa(id);
            const loi = getThaoTacError(result);
            if (loi) {
              AppAlert.alert("Không xoá được", loi);
              return;
            }
            showAppToast({ message: "Đã xoá kế hoạch", detail: keHoach?.soKeHoach ?? undefined });
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
  };

  // Chờ cả field (kế hoạch + thẻ công việc ở tab Công việc): vẽ trước metadata
  // thì mất các dòng rồi mới hiện.
  if (loading || !khFieldsReady || !cvFieldsReady) {
    return <WorkflowDetailSkeleton variant="keHoach" fields={detailFields} />;
  }

  if (!keHoach) {
    return (
      <EmptyState
        iconName="alert-circle-outline"
        title="Không tải được kế hoạch"
        subtitle={errorMessage ?? undefined}
        actionLabel="Thử lại"
        onActionPress={() => {
          setLoading(true);
          load();
        }}
      />
    );
  }

  const progress = getKeHoachProgress(keHoach);
  const canAddCongViec = cvPerm.canInsert && !!me.iD_NhanVien;
  // Như các màn danh sách: nút + nổi góc dưới, chỉ ở tab Công việc.
  const showAddFab = tab === "congViec" && canAddCongViec;
  const addCongViec = () =>
    navigation.navigate("CongViecForm", {
      mode: "add",
      keHoach: {
        id,
        text: [keHoach.soKeHoach, keHoach.tieuDe].filter(Boolean).join(" - "),
      },
    });

  // Cùng thanh nút phụ với màn Chi tiết công việc: icon trên chữ dưới, Xoá đỏ.
  const toolbarActions: WorkflowToolbarAction[] = [];
  if (isChuTri && khPerm.canUpdate) {
    toolbarActions.push({
      key: "sua",
      icon: "create-outline",
      label: "Sửa",
      onPress: () => navigation.navigate("KeHoachForm", { mode: "edit", id }),
    });
  }
  if (isChuTri && khPerm.canDelete) {
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
        style={styles.scroll}
        contentContainerStyle={[styles.content, showAddFab && styles.contentWithFab]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load("refresh")} />}
      >
        <View style={styles.hero}>
          <View style={styles.heroBody}>
            <Text style={styles.code}>{keHoach.soKeHoach}</Text>
            <Text style={styles.title}>{keHoach.tieuDe}</Text>
            <View style={styles.heroLine}>
              <Ionicons name="calendar-outline" size={15} color={c.textSub} />
              <Text style={styles.heroText}>
                {formatBeDate(keHoach.tuNgay)} - {formatBeDate(keHoach.denNgay)}
              </Text>
            </View>
            {keHoach.chuTri_MoTa ? (
              <View style={styles.heroLine}>
                <Ionicons name="person-circle-outline" size={15} color={c.textSub} />
                <Text style={styles.heroText}>Chủ trì: {keHoach.chuTri_MoTa}</Text>
              </View>
            ) : null}
            {/* Thêm được việc vào kế hoạch (nút + ở tab Công việc) thì không phải chỉ xem. */}
            {!toolbarActions.length && !canAddCongViec ? (
              <Text style={styles.readOnly}>Bạn đang xem ở chế độ chỉ xem.</Text>
            ) : null}
          </View>
          <View style={styles.progress}>
            <ProgressRing percent={progress.percent} size={60} strokeWidth={6} />
            <Text style={styles.progressText}>{progress.label}</Text>
          </View>
        </View>

        <WorkflowActionToolbar actions={toolbarActions} />

        <WorkflowTabBar
          embedded
          tabs={[
            { key: "thongTin", label: "Thông tin" },
            { key: "congViec", label: "Công việc", count: congViecs.length || undefined },
          ]}
          activeKey={tab}
          onChange={(key) => setTab(key as Tab)}
        />

        {tab === "thongTin" ? (
          <>
            {detailFields.length ? <WorkflowDetailFields item={keHoach} fields={detailFields} /> : null}
            <WorkflowSection title="Người tham gia" icon="people-outline">
              {data.thamGias.length ? (
                data.thamGias.map((person) => (
                  <Text key={person.id} style={styles.person}>
                    {person.ten}
                    {person.phongBan ? <Text style={styles.personMeta}> · {person.phongBan}</Text> : null}
                  </Text>
                ))
              ) : (
                <Text style={styles.personMeta}>Chưa có người tham gia.</Text>
              )}
            </WorkflowSection>
          </>
        ) : (
          <View style={styles.tabBody}>
            {!isChuTri ? <Text style={styles.note}>Chỉ hiện việc bạn tham gia.</Text> : null}
            {congViecs.length ? (
              congViecs.map((item) => (
                <CongViecCard
                  key={item.id}
                  item={item}
                  fields={cvCardFields}
                  info={cvInfos[item.id]}
                  onPress={() => navigation.navigate("CongViecChiTiet", { id: item.id })}
                  // Cùng tham số với danh sách Công việc: duocTraoDoi quyết định gửi / sửa file.
                  onOpenComments={() =>
                    navigation.navigate("WorkflowBinhLuan", {
                      apiBase: CV_CONG_VIEC_NAME_CLASS,
                      idHoSo: item.id,
                      canSend: !!cvInfos[item.id]?.duocTraoDoi,
                      titleHeader: item.soCongViec ?? undefined,
                    })
                  }
                  onOpenFiles={() =>
                    navigation.navigate("WorkflowFile", {
                      apiBase: CV_CONG_VIEC_NAME_CLASS,
                      idHoSo: item.id,
                      canEdit: !!cvInfos[item.id]?.duocTraoDoi,
                      titleHeader: item.soCongViec ?? undefined,
                    })
                  }
                  onOpenLichSu={() => setLichSuItem(item)}
                />
              ))
            ) : congViecError ? (
              <EmptyState
                iconName="cloud-offline-outline"
                title="Không tải được công việc"
                subtitle={congViecError}
                actionLabel="Thử lại"
                onActionPress={() => load("refresh")}
                style={styles.tabEmpty}
              />
            ) : (
              <EmptyState iconName="checkbox-outline" title="Chưa có công việc" style={styles.tabEmpty} />
            )}
          </View>
        )}
      </ScrollView>

      {showAddFab ? <WorkflowFab onPress={addCongViec} /> : null}

      <CongViecLichSuSheet
        target={lichSuItem ? { item: lichSuItem, mode: "lichSu" } : null}
        onClose={() => setLichSuItem(null)}
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
    scroll: {
      flex: 1,
    },
    content: {
      padding: 12,
      paddingBottom: 40,
      flexGrow: 1,
    },
    // Chừa đáy như danh sách Công việc: nút + nổi không che thẻ việc cuối.
    contentWithFab: {
      paddingBottom: 96,
    },
    // Tab Công việc giãn hết phần dưới phần đầu để "Chưa có công việc" nằm giữa.
    tabBody: {
      flexGrow: 1,
    },
    tabEmpty: {
      minHeight: 220,
    },
    hero: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: c.surface,
      borderRadius: 16,
      padding: 14,
      marginBottom: 10,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.border,
      ...elevation(c.shadow, 1),
    },
    heroBody: {
      flex: 1,
      marginRight: 10,
    },
    code: {
      fontSize: 13,
      fontWeight: "700",
      color: c.accent,
    },
    title: {
      fontSize: 18,
      fontWeight: "700",
      color: c.text,
      marginTop: 6,
      marginBottom: 4,
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
    progress: {
      alignItems: "center",
    },
    progressText: {
      fontSize: 12,
      color: c.textSub,
      marginTop: 4,
    },
    readOnly: {
      marginTop: 10,
      fontSize: 12,
      color: c.textSub,
      fontStyle: "italic",
    },
    person: {
      fontSize: 14,
      color: c.text,
      marginBottom: 4,
    },
    personMeta: {
      fontSize: 13,
      color: c.textSub,
    },
    note: {
      fontSize: 12,
      color: c.textSub,
      fontStyle: "italic",
      marginBottom: 8,
    },
  });
