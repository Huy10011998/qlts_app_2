import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import Ionicons from "react-native-vector-icons/Ionicons";

import EmptyState from "../../../components/ui/EmptyState";
import IsLoading from "../../../components/ui/IconLoading";
import {
  cvChiTiet,
  cvDelete,
  cvLichSu,
  cvThongTin,
} from "../../../services/data/congViecApi";
import {
  CV_CONG_VIEC_NAME_CLASS,
  isWorkflowNotFound,
} from "../../../services/data/workflowApi";
import type {
  CongViecChiTiet,
  CongViecDinhKy,
  CongViecLichSu,
  CongViecThongTin,
  StackNavigation,
  StackRoute,
} from "../../../types/index";
import { AppColors, useAppColors, useStyles } from "../../../utils/helpers/colors";
import { elevation } from "../../../utils/helpers/tokens";
import StatusBadge from "../shared/components/StatusBadge";
import WorkflowButton from "../shared/components/WorkflowButton";
import WorkflowDetailFields from "../shared/components/WorkflowDetailFields";
import WorkflowSection from "../shared/components/WorkflowSection";
import WorkflowTabBar from "../shared/components/WorkflowTabBar";
import { useWorkflowFileOpener } from "../shared/useWorkflowFileOpener";
import { useWorkflowPermissions } from "../shared/useWorkflowPermissions";
import {
  useMarkWorkflowChanged,
  useReloadOnWorkflowChange,
} from "../shared/useWorkflowVersion";
import {
  CV_KIEU_LAP,
  CV_MA_MAU,
  CV_THU_TRONG_TUAN,
  CV_VAI_TRO_OPTIONS,
  getCongViecTrangThai,
} from "../shared/workflowConstants";
import { formatBeDate, formatDayTime, parseBeDate } from "../shared/workflowDate";
import { getWorkflowErrorMessage } from "../shared/workflowErrors";
import { getDetailFields, WorkflowField } from "../shared/workflowFields";
import { loadClassFields } from "../shared/workflowMetadata";
import ChuyenTrangThaiSheet from "./components/ChuyenTrangThaiSheet";
import DoiChuTriSheet from "./components/DoiChuTriSheet";
import GiaHanSheet from "./components/GiaHanSheet";
import LichSuTimeline from "./components/LichSuTimeline";
import { CV_CARD_CUSTOM_FIELDS, getCongViecActions } from "./congViecRules";

type Sheet = "trangThai" | "giaHan" | "doiChuTri" | null;
type Tab = "thongTin" | "lichSu";

const describeDinhKy = (dinhKy: CongViecDinhKy) => {
  const kieu = CV_KIEU_LAP.find((item) => item.value === dinhKy.kieuLap);
  const parts = [`Lặp mỗi ${dinhKy.moiN || 1} ${kieu?.unit ?? ""}`.trim()];

  if (dinhKy.thuTrongTuan) {
    const thus = String(dinhKy.thuTrongTuan)
      .split(",")
      .map((value) => CV_THU_TRONG_TUAN.find((item) => item.value === Number(value))?.label)
      .filter(Boolean);
    if (thus.length) parts.push(`vào ${thus.join(", ")}`);
  }

  if (dinhKy.ngayBatDau) parts.push(`từ ${formatBeDate(dinhKy.ngayBatDau)}`);
  if (dinhKy.ketThucNgay) parts.push(`đến ${formatBeDate(dinhKy.ketThucNgay)}`);
  if (dinhKy.soLan) parts.push(`${dinhKy.soLan} lần`);

  return parts.join(" ");
};

/**
 * Chi tiết 1 công việc (mục 3). Mở từ danh sách, lịch, kế hoạch, sơ đồ quy
 * trình của phiếu và thông báo. Nút ẩn / hiện theo cờ quyền server trả về.
 */
export default function CongViecDetailScreen() {
  const styles = useStyles(makeStyles);
  const c = useAppColors();
  const navigation = useNavigation<StackNavigation<"CongViecChiTiet">>();
  const route = useRoute<StackRoute<"CongViecChiTiet">>();
  const id = Number(route.params?.id);
  const { canUpdate, canDelete } = useWorkflowPermissions(CV_CONG_VIEC_NAME_CLASS);
  const markChanged = useMarkWorkflowChanged();
  const fileOpener = useWorkflowFileOpener();

  const [data, setData] = useState<CongViecChiTiet | null>(null);
  const [info, setInfo] = useState<CongViecThongTin | null>(null);
  const [lichSu, setLichSu] = useState<CongViecLichSu[]>([]);
  const [fields, setFields] = useState<WorkflowField[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("thongTin");
  const [sheet, setSheet] = useState<Sheet>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    loadClassFields(CV_CONG_VIEC_NAME_CLASS)
      .then(setFields)
      .catch(() => setFields([]));
  }, []);

  const load = useCallback(
    async (mode: "initial" | "refresh" = "initial") => {
      if (mode === "refresh") setRefreshing(true);
      try {
        const [detail, infos, history] = await Promise.all([
          cvChiTiet(id),
          cvThongTin([id]).catch(() => []),
          cvLichSu(id).catch(() => []),
        ]);
        setData(detail);
        setInfo(infos[0] ?? null);
        setLichSu(history);
        setErrorMessage(null);
      } catch (err) {
        if (isWorkflowNotFound(err)) {
          Alert.alert("Thông báo", "Không tìm thấy công việc.", [
            { text: "OK", onPress: () => navigation.goBack() },
          ]);
          return;
        }
        setErrorMessage(getWorkflowErrorMessage(err, "Không tải được công việc."));
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

  useReloadOnWorkflowChange(() => load("refresh"));

  const congViec = data?.congViec;
  const actions = getCongViecActions(congViec, data?.quyen, { canUpdate, canDelete });
  const isReadOnly = !!data && !Object.values(actions).some(Boolean);

  const detailFields = useMemo(
    () => getDetailFields(fields, "true", CV_CARD_CUSTOM_FIELDS),
    [fields],
  );

  const thamGiaGroups = useMemo(
    () =>
      CV_VAI_TRO_OPTIONS.map((role) => ({
        ...role,
        people: (data?.thamGias ?? []).filter((item) => Number(item.vaiTro) === role.value),
      })).filter((group) => group.people.length),
    [data?.thamGias],
  );

  const handleDone = () => {
    setSheet(null);
    markChanged();
  };

  const confirmDelete = () => {
    Alert.alert("Xoá công việc", "Xoá công việc này? Thao tác không hoàn tác được.", [
      { text: "Huỷ", style: "cancel" },
      {
        text: "Xoá",
        style: "destructive",
        onPress: async () => {
          try {
            setDeleting(true);
            await cvDelete([id]);
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

  if (loading) return <IsLoading />;

  if (!congViec) {
    return (
      <EmptyState
        iconName="alert-circle-outline"
        title="Không tải được công việc"
        subtitle={errorMessage ?? undefined}
        actionLabel="Thử lại"
        onActionPress={() => {
          setLoading(true);
          load();
        }}
      />
    );
  }

  const trangThai = getCongViecTrangThai(congViec.trangThai);
  const maMau = CV_MA_MAU.find((item) => item.key === congViec.maMau);
  const showMaMau = maMau && (maMau.key === "QuaHan" || maMau.key === "GiaHan");
  const tuNgay = parseBeDate(congViec.tuNgay);
  const denNgay = parseBeDate(congViec.denNgay);
  const hanBanDau = parseBeDate(congViec.hanBanDau);
  const daGiaHan = !!hanBanDau && !!denNgay && hanBanDau.getTime() !== denNgay.getTime();

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load("refresh")} />}
      >
        <View style={styles.hero}>
          <View style={styles.heroTop}>
            <Text style={styles.code}>{congViec.soCongViec}</Text>
            <View style={styles.badges}>
              {showMaMau ? <StatusBadge label={maMau.label} color={maMau.color} dot /> : null}
              {trangThai ? <StatusBadge label={trangThai.label} color={trangThai.color} /> : null}
            </View>
          </View>
          <Text style={styles.title}>{congViec.tieuDe}</Text>

          <View style={styles.heroLine}>
            <Ionicons name="time-outline" size={15} color={c.textSub} />
            <Text style={styles.heroText}>
              {formatDayTime(tuNgay)} → {formatDayTime(denNgay)}
            </Text>
          </View>
          {daGiaHan ? (
            <View style={styles.heroLine}>
              <Ionicons name="hourglass-outline" size={15} color="#fb8c00" />
              <Text style={styles.heroText}>Hạn ban đầu: {formatDayTime(hanBanDau)}</Text>
            </View>
          ) : null}
          {congViec.chuTri_MoTa ? (
            <View style={styles.heroLine}>
              <Ionicons name="person-circle-outline" size={15} color={c.textSub} />
              <Text style={styles.heroText}>Chủ trì: {congViec.chuTri_MoTa}</Text>
            </View>
          ) : null}
          {data?.quyen?.isTuPhieu ? (
            <View style={styles.heroLine}>
              <Ionicons name="document-text-outline" size={15} color={c.textSub} />
              <Text style={styles.heroText}>
                Sinh từ phiếu đề nghị
                {actions.chuyenTrangThai
                  ? " · không xoá được, muốn bỏ việc thì Chuyển trạng thái → Hủy"
                  : ""}
              </Text>
            </View>
          ) : null}
          {isReadOnly ? (
            <Text style={styles.readOnly}>Bạn đang xem ở chế độ chỉ xem.</Text>
          ) : null}
        </View>

        <View style={styles.actions}>
          <WorkflowButton
            compact
            variant="outline"
            icon="chatbubble-ellipses-outline"
            label={`Bình luận (${info?.soBinhLuan ?? 0})`}
            onPress={() =>
              navigation.navigate("WorkflowBinhLuan", {
                apiBase: CV_CONG_VIEC_NAME_CLASS,
                idHoSo: id,
                canSend: actions.traoDoi,
                titleHeader: congViec.soCongViec ?? undefined,
              })
            }
          />
          <WorkflowButton
            compact
            variant="outline"
            icon="attach-outline"
            label={`File (${info?.soFile ?? 0})`}
            onPress={() =>
              navigation.navigate("WorkflowFile", {
                apiBase: CV_CONG_VIEC_NAME_CLASS,
                idHoSo: id,
                canEdit: actions.traoDoi,
                titleHeader: congViec.soCongViec ?? undefined,
              })
            }
          />
          {actions.chuyenTrangThai ? (
            <WorkflowButton
              compact
              icon="swap-vertical-outline"
              label="Chuyển trạng thái"
              onPress={() => setSheet("trangThai")}
            />
          ) : null}
          {actions.sua ? (
            <WorkflowButton
              compact
              variant="neutral"
              icon="create-outline"
              label="Sửa"
              onPress={() => navigation.navigate("CongViecForm", { mode: "edit", id })}
            />
          ) : null}
          {actions.giaHan ? (
            <WorkflowButton
              compact
              variant="neutral"
              icon="time-outline"
              label="Gia hạn"
              onPress={() => setSheet("giaHan")}
            />
          ) : null}
          {actions.doiChuTri ? (
            <WorkflowButton
              compact
              variant="neutral"
              icon="swap-horizontal-outline"
              label="Đổi chủ trì"
              onPress={() => setSheet("doiChuTri")}
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

        <WorkflowTabBar
          embedded
          tabs={[
            { key: "thongTin", label: "Thông tin" },
            { key: "lichSu", label: "Lịch sử", count: lichSu.length || undefined },
          ]}
          activeKey={tab}
          onChange={(key) => setTab(key as Tab)}
        />

        {tab === "thongTin" ? (
          <>
            {detailFields.length ? (
              <WorkflowDetailFields item={congViec} fields={detailFields} />
            ) : null}

            <WorkflowSection title="Người tham gia" icon="people-outline">
              {thamGiaGroups.length ? (
                thamGiaGroups.map((group) => (
                  <View key={group.value} style={styles.roleGroup}>
                    <Text style={styles.roleLabel}>{group.label}</Text>
                    {group.people.map((person) => (
                      <Text key={person.iD_NhanVien} style={styles.person}>
                        {person.ten}
                        {person.phongBan ? (
                          <Text style={styles.personMeta}> · {person.phongBan}</Text>
                        ) : null}
                      </Text>
                    ))}
                  </View>
                ))
              ) : (
                <Text style={styles.personMeta}>Chưa có người tham gia.</Text>
              )}
            </WorkflowSection>

            {data?.dinhKy ? (
              <WorkflowSection title="Định kỳ" icon="repeat-outline">
                <Text style={styles.person}>{describeDinhKy(data.dinhKy)}</Text>
                <Text style={styles.personMeta}>
                  {[
                    data.dinhKy.soLanDaSinh ? `Đã sinh ${data.dinhKy.soLanDaSinh} lần` : "",
                    congViec.lanLap ? `đây là lần ${congViec.lanLap}` : "",
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </Text>
              </WorkflowSection>
            ) : null}
          </>
        ) : (
          <WorkflowSection>
            <LichSuTimeline
              items={lichSu}
              onOpenFile={(file) => fileOpener.openFile(CV_CONG_VIEC_NAME_CLASS, file)}
            />
          </WorkflowSection>
        )}
      </ScrollView>

      <ChuyenTrangThaiSheet
        visible={sheet === "trangThai"}
        idCongViec={id}
        trangThai={Number(congViec.trangThai)}
        onClose={() => setSheet(null)}
        onDone={handleDone}
      />
      <GiaHanSheet
        visible={sheet === "giaHan"}
        idCongViec={id}
        denNgay={congViec.denNgay}
        onClose={() => setSheet(null)}
        onDone={handleDone}
      />
      <DoiChuTriSheet
        visible={sheet === "doiChuTri"}
        idCongViec={id}
        idChuTriHienTai={congViec.iD_NhanVien_ChuTri}
        tenChuTriHienTai={congViec.chuTri_MoTa}
        onClose={() => setSheet(null)}
        onDone={handleDone}
      />
      {fileOpener.viewer}
      {fileOpener.opening ? <IsLoading style={styles.overlay} /> : null}
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
    code: {
      fontSize: 13,
      fontWeight: "700",
      color: c.accent,
    },
    badges: {
      flexDirection: "row",
      gap: 6,
    },
    title: {
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
    readOnly: {
      marginTop: 10,
      fontSize: 12,
      color: c.textSub,
      fontStyle: "italic",
    },
    actions: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 6,
      marginBottom: 2,
    },
    roleGroup: {
      marginBottom: 10,
    },
    roleLabel: {
      fontSize: 12,
      fontWeight: "700",
      color: c.textSub,
      textTransform: "uppercase",
      marginBottom: 4,
    },
    person: {
      fontSize: 14,
      color: c.text,
      marginBottom: 3,
    },
    personMeta: {
      fontSize: 13,
      color: c.textSub,
    },
    overlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: c.loadingOverlay,
    },
  });
