import React, { useCallback, useEffect, useMemo, useState } from "react";
import { RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";

import EmptyState from "../../../components/ui/EmptyState";
import IsLoading from "../../../components/ui/IconLoading";
import { flowTienTrinh } from "../../../services/data/flowApi";
import type { FlowTienTrinh, StackNavigation, StackRoute } from "../../../types/index";
import { AppColors, useStyles } from "../../../utils/helpers/colors";
import WorkflowTabBar from "../shared/components/WorkflowTabBar";
import { useReloadOnWorkflowChange } from "../shared/useWorkflowVersion";
import { FLOW_TRA_BUOC_COLOR } from "../shared/workflowConstants";
import { formatBeDate } from "../shared/workflowDate";
import { getWorkflowErrorMessage } from "../shared/workflowErrors";
import { readItemValue } from "../shared/workflowFields";
import FlowProcessDetail from "./components/FlowProcessDetail";
import FlowProcessDiagram from "./components/FlowProcessDiagram";
import {
  buildFlowDiagram,
  FLOW_POINT_COLOR,
  getFlowPointDetail,
  getInitialFlowPoint,
} from "./flowProcessRules";
import { FLOW_FIELD, getFlowHistory } from "./flowRules";

type Tab = "quyTrinh" | "lichSu";

/** Chú thích sơ đồ, đúng chữ PHỤ LỤC; Trả bước là nét đứt cam. */
const LEGEND = [
  { label: "Đã duyệt", color: FLOW_POINT_COLOR.done },
  { label: "Đã từ chối", color: FLOW_POINT_COLOR.reject },
  { label: "Đang xử lý", color: FLOW_POINT_COLOR.doing },
  { label: "Chờ xử lý", color: FLOW_POINT_COLOR.wait },
];

/**
 * Quy trình của 1 phiếu (mục 6): tab Quy trình là sơ đồ ngang theo lượt chạy
 * (`flowProcessRules`) + khung chi tiết của điểm đang chọn; tab Lịch sử theo
 * thời gian (`getFlowHistory`, tiêu đề đúng chữ web).
 */
export default function FlowProcessScreen() {
  const styles = useStyles(makeStyles);
  const navigation = useNavigation<StackNavigation<"FlowTienTrinh">>();
  const route = useRoute<StackRoute<"FlowTienTrinh">>();
  const { nameClass, id, item } = route.params;

  const [data, setData] = useState<FlowTienTrinh | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("quyTrinh");
  const [selectedKey, setSelectedKey] = useState<string | null>(null);

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

  // Quay về từ màn công việc (điểm Công việc trên sơ đồ) mà có thay đổi → phiếu đi theo việc.
  useReloadOnWorkflowChange(load);

  const nguoiLap = readItemValue(item, `${FLOW_FIELD.ID_NhanVien_Tao}_MoTa`);
  const ngayLap = readItemValue(item, FLOW_FIELD.NgayTao);

  const diagram = useMemo(() => buildFlowDiagram(data, ngayLap), [data, ngayLap]);
  const points = useMemo(() => diagram.runs.flatMap((run) => run.points), [diagram]);
  // Nạp lại mà điểm đang chọn không còn (vd vừa trả bước thêm dòng) thì về điểm chọn sẵn.
  const selected =
    points.find((point) => point.key === selectedKey) ?? getInitialFlowPoint(diagram);
  const detail = useMemo(
    () => (selected ? getFlowPointDetail(data, selected, diagram) : null),
    [data, diagram, selected],
  );

  const history = useMemo(() => getFlowHistory(data, ngayLap, nguoiLap), [data, ngayLap, nguoiLap]);

  if (loading) return <IsLoading />;

  if (!data) {
    return <EmptyState iconName="git-network-outline" title="Không tải được quy trình" subtitle={errorMessage ?? undefined} />;
  }

  return (
    <View style={styles.container}>
      <WorkflowTabBar
        tabs={[
          { key: "quyTrinh", label: "Quy trình" },
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
        {tab === "quyTrinh" ? (
          <>
            <View style={styles.legend}>
              {LEGEND.map((option) => (
                <View key={option.label} style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: option.color }]} />
                  <Text style={styles.legendText}>{option.label}</Text>
                </View>
              ))}
              {diagram.runs.length > 1 ? (
                <View style={styles.legendItem}>
                  <View style={styles.legendDashed} />
                  <Text style={styles.legendText}>Trả bước</Text>
                </View>
              ) : null}
            </View>
            <View style={styles.diagramCard}>
              <FlowProcessDiagram
                diagram={diagram}
                selectedKey={selected?.key ?? null}
                onSelect={(point) => setSelectedKey(point.key)}
              />
            </View>
            {selected ? (
              <FlowProcessDetail
                point={selected}
                detail={detail}
                nguoiLap={nguoiLap ? String(nguoiLap) : null}
                ngayLap={ngayLap}
                onOpenCongViec={(link) => navigation.navigate("CongViecChiTiet", { id: link.iD_CongViec })}
              />
            ) : null}
          </>
        ) : history.length ? (
          history.map((event, index) => (
            <View key={`${event.time.getTime()}-${index}`} style={styles.historyRow}>
              <View style={styles.rail}>
                <View style={[styles.dot, { backgroundColor: event.color }]} />
                {index < history.length - 1 ? <View style={styles.line} /> : null}
              </View>
              <View style={styles.historyBody}>
                <Text style={styles.historyTitle}>{event.title}</Text>
                {event.content ? <Text style={styles.historyContent}>{event.content}</Text> : null}
                {event.by ? <Text style={styles.personName}>{event.by}</Text> : null}
                {event.note ? (
                  <Text style={styles.opinion}>
                    {event.noteLabel ?? "Ý kiến"}: {event.note}
                  </Text>
                ) : null}
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
    legend: {
      flexDirection: "row",
      flexWrap: "wrap",
      columnGap: 14,
      rowGap: 6,
      marginBottom: 10,
      paddingHorizontal: 4,
    },
    legendItem: {
      flexDirection: "row",
      alignItems: "center",
      gap: 5,
    },
    legendDot: {
      width: 10,
      height: 10,
      borderRadius: 5,
    },
    legendDashed: {
      width: 18,
      height: 0,
      borderTopWidth: 2,
      borderStyle: "dashed",
      borderColor: FLOW_TRA_BUOC_COLOR,
    },
    legendText: {
      fontSize: 12,
      color: c.textSub,
    },
    diagramCard: {
      backgroundColor: c.surface,
      borderRadius: 14,
      paddingVertical: 8,
      overflow: "hidden",
    },
    historyRow: {
      flexDirection: "row",
    },
    rail: {
      width: 24,
      alignItems: "center",
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
    historyBody: {
      flex: 1,
      paddingLeft: 6,
      paddingBottom: 16,
    },
    historyTitle: {
      fontSize: 14,
      fontWeight: "700",
      color: c.text,
    },
    historyContent: {
      fontSize: 13,
      color: c.textSecondary,
      marginTop: 2,
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
    opinion: {
      fontSize: 13,
      color: c.textSecondary,
      marginTop: 2,
    },
  });
