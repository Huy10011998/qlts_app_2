import React, { useCallback, useEffect, useMemo, useState } from "react";
import { RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import Ionicons from "react-native-vector-icons/Ionicons";

import EmptyState from "../../../components/ui/EmptyState";
import IsLoading from "../../../components/ui/IconLoading";
import { flowTienTrinh } from "../../../services/data/flowApi";
import type {
  FlowBuoc,
  FlowCongViecLink,
  FlowNguoiDuyet,
  FlowTienTrinh,
  StackNavigation,
  StackRoute,
} from "../../../types/index";
import { AppColors, useAppColors, useStyles } from "../../../utils/helpers/colors";
import { elevation } from "../../../utils/helpers/tokens";
import StatusBadge from "../shared/components/StatusBadge";
import WorkflowTabBar from "../shared/components/WorkflowTabBar";
import { useReloadOnWorkflowChange } from "../shared/useWorkflowVersion";
import {
  FLOW_KET_QUA,
  FLOW_KET_QUA_LABEL,
  getCongViecTrangThai,
  getFlowBuocTinhTrang,
} from "../shared/workflowConstants";
import { formatBeDate, parseBeDate } from "../shared/workflowDate";
import { getWorkflowErrorMessage } from "../shared/workflowErrors";
import { readItemValue } from "../shared/workflowFields";
import { FLOW_FIELD } from "./flowRules";

type Tab = "soDo" | "lichSu";

/** Bước "Không ý kiến / Bỏ qua" (tình trạng 4). */
const BUOC_BO_QUA = 4;

const KET_QUA_COLOR: Record<number, string> = {
  1: "#2eb85c",
  2: "#5c6873",
  3: "#9da5b1",
};

type HistoryEvent = { time: Date; title: string; detail?: string; color: string };

/**
 * Quy trình của 1 phiếu (mục 6): tab Sơ đồ (nút "Lập phiếu", các bước theo thứ
 * tự, bước con vẽ trong bước cha, màu theo tình trạng bước, thẻ công việc) và
 * tab Lịch sử (mở bước + duyệt / từ chối theo thời gian).
 */
export default function FlowProcessScreen() {
  const styles = useStyles(makeStyles);
  const c = useAppColors();
  const navigation = useNavigation<StackNavigation<"FlowTienTrinh">>();
  const route = useRoute<StackRoute<"FlowTienTrinh">>();
  const { nameClass, id, item } = route.params;

  const [data, setData] = useState<FlowTienTrinh | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("soDo");

  const load = useCallback(async () => {
    try {
      setData(await flowTienTrinh(nameClass, id));
      setErrorMessage(null);
    } catch (err) {
      setErrorMessage(getWorkflowErrorMessage(err, "Không tải được quy trình."));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [id, nameClass]);

  useEffect(() => {
    load();
  }, [load]);

  // Quay về từ màn công việc (thẻ trên sơ đồ) mà có thay đổi → phiếu đi theo việc.
  useReloadOnWorkflowChange(load);

  const nguoiLap = readItemValue(item, `${FLOW_FIELD.ID_NhanVien_Tao}_MoTa`);
  const ngayLap = readItemValue(item, FLOW_FIELD.NgayTao);

  const { topSteps, childrenOf } = useMemo(() => {
    const buocs = data?.buocs ?? [];
    const tops = buocs
      .filter((buoc) => buoc.buocCon == null)
      .sort((a, b) => a.buoc - b.buoc);
    const children = (parent: FlowBuoc) =>
      buocs
        .filter((buoc) => buoc.buocCon != null && buoc.buoc === parent.buoc)
        .sort((a, b) => Number(a.buocCon) - Number(b.buocCon));
    return { topSteps: tops, childrenOf: children };
  }, [data?.buocs]);

  const peopleOf = (buoc: FlowBuoc) =>
    (data?.nguoiDuyets ?? []).filter((nguoi) => nguoi.iD_Flow_HoSo_Buoc === buoc.id);

  /** Thẻ công việc nằm cạnh bước iD_Flow_HoSo_Buoc (hoặc bước cha chứa nó). */
  const congViecOf = (buoc: FlowBuoc): FlowCongViecLink | null => {
    const link = data?.congViec;
    if (!link) return null;
    if (link.iD_Flow_HoSo_Buoc === buoc.id) return link;
    if (buoc.buocCon == null) {
      const child = childrenOf(buoc).find((step) => step.id === link.iD_Flow_HoSo_Buoc);
      if (child) return link;
    }
    return null;
  };

  const history = useMemo<HistoryEvent[]>(() => {
    const events: HistoryEvent[] = [];
    const lap = parseBeDate(ngayLap);
    if (lap) {
      events.push({ time: lap, title: "Lập phiếu", detail: nguoiLap ? String(nguoiLap) : undefined, color: "#1e88e5" });
    }
    (data?.buocs ?? []).forEach((buoc) => {
      const mo = parseBeDate(buoc.ngayMo);
      if (mo) events.push({ time: mo, title: `Mở bước: ${buoc.ten}`, color: "#e55353" });
    });
    (data?.nguoiDuyets ?? []).forEach((nguoi) => {
      const time = parseBeDate(nguoi.ngayDuyet);
      if (!time || nguoi.ketQua == null) return;
      const buoc = data?.buocs.find((step) => step.id === nguoi.iD_Flow_HoSo_Buoc);
      events.push({
        time,
        title: `${nguoi.iD_NhanVien_MoTa ?? ""} · ${FLOW_KET_QUA_LABEL[nguoi.ketQua] ?? ""}`,
        detail: [buoc?.ten, nguoi.yKien].filter(Boolean).join(" — ") || undefined,
        color: KET_QUA_COLOR[nguoi.ketQua] ?? "#9da5b1",
      });
    });
    return events.sort((a, b) => a.time.getTime() - b.time.getTime());
  }, [data, ngayLap, nguoiLap]);

  const renderPeople = (buoc: FlowBuoc) => {
    const people = peopleOf(buoc);
    const done = people.filter((nguoi) => nguoi.ketQua != null);

    if (buoc.tinhTrang === BUOC_BO_QUA) {
      const khongYKien = done.filter((nguoi) => nguoi.ketQua === FLOW_KET_QUA.KhongYKien);
      if (!khongYKien.length) return <Text style={styles.personMeta}>Bỏ qua</Text>;
    }

    const shown: FlowNguoiDuyet[] = done.length ? done : people;
    if (!shown.length) return null;

    return shown.map((nguoi, index) => (
      <View key={`${nguoi.iD_NhanVien ?? index}-${index}`} style={styles.person}>
        <Text style={styles.personName}>
          {nguoi.iD_NhanVien_MoTa ?? nguoi.coCau_MoTa ?? "—"}
          {nguoi.isChiXem ? <Text style={styles.personMeta}> · Chỉ xem</Text> : null}
        </Text>
        {nguoi.ketQua != null ? (
          <Text style={[styles.result, { color: KET_QUA_COLOR[nguoi.ketQua] ?? c.textSub }]}>
            {FLOW_KET_QUA_LABEL[nguoi.ketQua]}
            {nguoi.ngayDuyet ? ` · ${formatBeDate(nguoi.ngayDuyet, true)}` : ""}
          </Text>
        ) : null}
        {nguoi.yKien ? <Text style={styles.opinion}>“{nguoi.yKien}”</Text> : null}
      </View>
    ));
  };

  const renderCongViec = (link: FlowCongViecLink) => {
    const trangThai = getCongViecTrangThai(link.trangThai);
    return (
      <TouchableOpacity
        style={styles.congViec}
        activeOpacity={0.75}
        onPress={() => navigation.navigate("CongViecChiTiet", { id: link.iD_CongViec })}
      >
        <View style={styles.congViecTop}>
          <Ionicons name="briefcase-outline" size={15} color={c.accent} />
          <Text style={styles.congViecCode}>Công việc {link.soCongViec}</Text>
          {trangThai ? <StatusBadge label={trangThai.label} color={trangThai.color} /> : null}
        </View>
        {link.tieuDe ? <Text style={styles.congViecTitle}>{link.tieuDe}</Text> : null}
        <Text style={styles.personMeta}>
          {[link.chuTri ? `Chủ trì: ${link.chuTri}` : "", link.denNgay ? `Hạn: ${formatBeDate(link.denNgay, true)}` : ""]
            .filter(Boolean)
            .join(" · ")}
        </Text>
      </TouchableOpacity>
    );
  };

  const renderStep = (buoc: FlowBuoc, isLast: boolean, nested = false) => {
    const status = getFlowBuocTinhTrang(buoc.tinhTrang);
    const statusLabel =
      buoc.tinhTrang === BUOC_BO_QUA &&
      !peopleOf(buoc).some((nguoi) => nguoi.ketQua === FLOW_KET_QUA.KhongYKien)
        ? "Bỏ qua"
        : status.label;
    const children = nested ? [] : childrenOf(buoc);
    const congViec = congViecOf(buoc);

    return (
      <View key={buoc.id} style={styles.stepRow}>
        <View style={styles.rail}>
          <View style={[styles.node, { backgroundColor: status.color }]} />
          {!isLast ? <View style={styles.line} /> : null}
        </View>
        <View style={[styles.stepCard, nested && styles.stepNested]}>
          <View style={styles.stepTop}>
            <Text style={styles.stepTitle}>
              {nested ? "" : `Bước ${buoc.buoc}: `}
              {buoc.ten}
            </Text>
            <StatusBadge label={statusLabel} color={status.color} />
          </View>
          {buoc.loaiXuLy === 1 ? <Text style={styles.personMeta}>Xử lý song song</Text> : null}
          {buoc.ngayMo ? (
            <Text style={styles.personMeta}>Mở: {formatBeDate(buoc.ngayMo, true)}</Text>
          ) : null}
          {renderPeople(buoc)}
          {children.map((child, index) => renderStep(child, index === children.length - 1, true))}
          {congViec ? renderCongViec(congViec) : null}
        </View>
      </View>
    );
  };

  if (loading) return <IsLoading />;

  if (!data) {
    return <EmptyState iconName="git-network-outline" title="Không tải được quy trình" subtitle={errorMessage ?? undefined} />;
  }

  return (
    <View style={styles.container}>
      <WorkflowTabBar
        tabs={[
          { key: "soDo", label: "Sơ đồ" },
          { key: "lichSu", label: "Lịch sử" },
        ]}
        activeKey={tab}
        onChange={(key) => setTab(key as Tab)}
      />
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              load();
            }}
          />
        }
      >
        {tab === "soDo" ? (
          <>
            <View style={styles.stepRow}>
              <View style={styles.rail}>
                <View style={[styles.node, styles.nodeStart]} />
                {topSteps.length ? <View style={styles.line} /> : null}
              </View>
              <View style={styles.stepCard}>
                <Text style={styles.stepTitle}>Lập phiếu</Text>
                <Text style={styles.personMeta}>
                  {[nguoiLap, formatBeDate(ngayLap, true)].filter(Boolean).join(" · ")}
                </Text>
              </View>
            </View>
            {topSteps.map((buoc, index) => renderStep(buoc, index === topSteps.length - 1))}
          </>
        ) : history.length ? (
          history.map((event, index) => (
            <View key={`${event.time.getTime()}-${index}`} style={styles.stepRow}>
              <View style={styles.rail}>
                <View style={[styles.dot, { backgroundColor: event.color }]} />
                {index < history.length - 1 ? <View style={styles.line} /> : null}
              </View>
              <View style={styles.historyBody}>
                <Text style={styles.stepTitle}>{event.title}</Text>
                {event.detail ? <Text style={styles.opinion}>{event.detail}</Text> : null}
                <Text style={styles.personMeta}>{formatBeDate(event.time, true)}</Text>
              </View>
            </View>
          ))
        ) : (
          <EmptyState iconName="time-outline" title="Chưa có lịch sử" />
        )}
      </ScrollView>
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
      flexGrow: 1,
    },
    stepRow: {
      flexDirection: "row",
    },
    rail: {
      width: 24,
      alignItems: "center",
    },
    node: {
      width: 16,
      height: 16,
      borderRadius: 8,
      marginTop: 14,
      borderWidth: 3,
      borderColor: c.surface,
    },
    nodeStart: {
      backgroundColor: "#1e88e5",
    },
    dot: {
      width: 12,
      height: 12,
      borderRadius: 6,
      marginTop: 5,
    },
    line: {
      flex: 1,
      width: 2,
      backgroundColor: c.borderStrong,
    },
    stepCard: {
      flex: 1,
      backgroundColor: c.surface,
      borderRadius: 14,
      padding: 12,
      marginLeft: 6,
      marginBottom: 12,
      ...elevation(c.shadow, 1),
    },
    stepNested: {
      marginLeft: 0,
      marginTop: 10,
      marginBottom: 0,
      backgroundColor: c.surfaceAlt,
      shadowOpacity: 0,
      elevation: 0,
    },
    stepTop: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 8,
    },
    stepTitle: {
      flex: 1,
      fontSize: 14,
      fontWeight: "700",
      color: c.text,
    },
    person: {
      marginTop: 8,
    },
    personName: {
      fontSize: 14,
      fontWeight: "600",
      color: c.text,
    },
    personMeta: {
      fontSize: 12,
      color: c.textSub,
      marginTop: 2,
    },
    result: {
      fontSize: 12,
      fontWeight: "700",
      marginTop: 2,
    },
    opinion: {
      fontSize: 13,
      color: c.textSecondary,
      marginTop: 2,
      fontStyle: "italic",
    },
    congViec: {
      marginTop: 10,
      padding: 10,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: c.accentLight,
      backgroundColor: c.accentLight,
    },
    congViecTop: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
    },
    congViecCode: {
      flex: 1,
      fontSize: 13,
      fontWeight: "700",
      color: c.accent,
    },
    congViecTitle: {
      fontSize: 14,
      color: c.text,
      marginTop: 4,
    },
    historyBody: {
      flex: 1,
      paddingLeft: 6,
      paddingBottom: 16,
    },
  });
