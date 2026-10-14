import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import Ionicons from "react-native-vector-icons/Ionicons";

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
import { CV_CARD_CUSTOM_FIELDS } from "../CongViec/congViecRules";
import ProgressRing from "../shared/components/ProgressRing";
import WorkflowButton from "../shared/components/WorkflowButton";
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
import { getCardFields, getDetailFields, WorkflowField } from "../shared/workflowFields";
import { loadClassFields } from "../shared/workflowMetadata";
import { getKeHoachProgress } from "./keHoachRules";

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
  const [khFields, setKhFields] = useState<WorkflowField[]>([]);
  const [cvFields, setCvFields] = useState<WorkflowField[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("thongTin");
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    loadClassFields(CV_KE_HOACH_NAME_CLASS).then(setKhFields).catch(() => undefined);
    loadClassFields(CV_CONG_VIEC_NAME_CLASS).then(setCvFields).catch(() => undefined);
  }, []);

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
      } catch (err) {
        if (isWorkflowNotFound(err)) {
          Alert.alert("Thông báo", "Không tìm thấy kế hoạch.", [
            { text: "OK", onPress: () => navigation.goBack() },
          ]);
          return;
        }
        setErrorMessage(getWorkflowErrorMessage(err, "Không tải được kế hoạch."));
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
    Alert.alert("Xoá kế hoạch", "Xoá kế hoạch này?", [
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
              Alert.alert("Không xoá được", loi);
              return;
            }
            markChanged();
            navigation.goBack();
          } catch (err) {
            Alert.alert("Không xoá được", getWorkflowErrorMessage(err, "Vui lòng thử lại."));
          } finally {
            setDeleting(false);
          }
        },
      },
    ]);
  };

  if (loading) return <WorkflowDetailSkeleton variant="keHoach" fields={detailFields} />;

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

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
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
        </View>
        <View style={styles.progress}>
          <ProgressRing percent={progress.percent} size={60} strokeWidth={6} />
          <Text style={styles.progressText}>{progress.label}</Text>
        </View>
      </View>

      {isChuTri ? (
        <View style={styles.actions}>
          {khPerm.canUpdate ? (
            <WorkflowButton
              compact
              variant="neutral"
              icon="create-outline"
              label="Sửa"
              onPress={() => navigation.navigate("KeHoachForm", { mode: "edit", id })}
            />
          ) : null}
          {khPerm.canDelete ? (
            <WorkflowButton
              compact
              variant="neutral"
              icon="trash-outline"
              label="Xoá"
              loading={deleting}
              disabled={Number(keHoach.soCongViec ?? 0) > 0}
              onPress={confirmDelete}
            />
          ) : null}
        </View>
      ) : null}

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
          {canAddCongViec ? (
            <WorkflowButton
              compact
              variant="outline"
              icon="add"
              label="Thêm công việc"
              style={styles.addButton}
              onPress={() =>
                navigation.navigate("CongViecForm", {
                  mode: "add",
                  keHoach: {
                    id,
                    text: [keHoach.soKeHoach, keHoach.tieuDe].filter(Boolean).join(" - "),
                  },
                })
              }
            />
          ) : null}
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
      flexGrow: 1,
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
    actions: {
      flexDirection: "row",
      gap: 6,
      marginBottom: 2,
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
    addButton: {
      alignSelf: "flex-start",
      marginBottom: 10,
    },
  });
