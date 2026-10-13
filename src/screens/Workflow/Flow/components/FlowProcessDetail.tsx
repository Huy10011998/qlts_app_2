import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";

import type { FlowCongViecLink } from "../../../../types/index";
import { AppColors, useAppColors, useStyles } from "../../../../utils/helpers/colors";
import StatusBadge from "../../shared/components/StatusBadge";
import { FLOW_TRA_BUOC_COLOR, getCongViecTrangThai, tint } from "../../shared/workflowConstants";
import { formatBeDate } from "../../shared/workflowDate";
import { bareFlowName, FLOW_POINT_COLOR, FlowPoint, FlowPointDetail } from "../flowProcessRules";

type Props = {
  point: FlowPoint;
  /** null với điểm Lập phiếu / Công việc. */
  detail: FlowPointDetail | null;
  nguoiLap?: string | null;
  ngayLap?: unknown;
  onOpenCongViec: (link: FlowCongViecLink) => void;
};

/**
 * Khung chi tiết dưới sơ đồ (mục 6e). Bảng 4 cột của web (Bước | Người xử lý |
 * Trạng thái | Ý kiến) xếp thành từng khối dọc cho vừa màn điện thoại.
 */
export default function FlowProcessDetail({ point, detail, nguoiLap, ngayLap, onOpenCongViec }: Props) {
  const styles = useStyles(makeStyles);
  const c = useAppColors();
  const accent = FLOW_POINT_COLOR[point.state];

  if (point.column.kind === "congViec") {
    const link = point.column.link;
    const trangThai = getCongViecTrangThai(link.trangThai);
    return (
      <TouchableOpacity
        activeOpacity={0.75}
        style={[styles.panel, { borderColor: accent }]}
        onPress={() => onOpenCongViec(link)}
      >
        <View style={styles.headRow}>
          <Ionicons name="briefcase-outline" size={16} color={c.accent} />
          <Text style={styles.title}>Công việc {link.soCongViec}</Text>
          {trangThai ? <StatusBadge label={trangThai.label} color={trangThai.color} /> : null}
        </View>
        {link.tieuDe ? <Text style={styles.bodyText}>{link.tieuDe}</Text> : null}
        <Text style={styles.meta}>
          {[link.chuTri ? `Chủ trì: ${link.chuTri}` : "", link.denNgay ? `Hạn: ${formatBeDate(link.denNgay, true)}` : ""]
            .filter(Boolean)
            .join(" · ")}
        </Text>
        <Text style={styles.link}>Mở công việc ›</Text>
      </TouchableOpacity>
    );
  }

  if (point.column.kind === "lap" || !detail) {
    return (
      <View style={[styles.panel, { borderColor: accent }]}>
        <Text style={styles.kicker}>BƯỚC</Text>
        <Text style={styles.title}>Lập phiếu</Text>
        <Text style={styles.bodyText}>
          {[nguoiLap ? bareFlowName(nguoiLap) : "", formatBeDate(ngayLap, true)].filter(Boolean).join(" · ")}
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.panel, { borderColor: accent }]}>
      <View style={styles.headRow}>
        <View style={styles.headText}>
          <Text style={styles.kicker}>{detail.kicker}</Text>
          <Text style={styles.title}>{detail.title}</Text>
        </View>
        <StatusBadge label={detail.status.label} color={detail.status.color} />
      </View>

      {detail.tra ? (
        <View style={styles.traBox}>
          <Text style={styles.traText}>
            <Text style={styles.traStrong}>{bareFlowName(detail.tra.iD_NhanVien_MoTa)}</Text> trả{" "}
            {detail.tra.tenBuocTu} về {detail.tra.tenBuocVe}
            {detail.tra.ngayTra ? ` · ${formatBeDate(detail.tra.ngayTra, true)}` : ""}
          </Text>
          {detail.tra.lyDo ? <Text style={styles.traText}>Lý do: {detail.tra.lyDo}</Text> : null}
        </View>
      ) : null}

      {detail.rows.map((row, index) => (
        <View key={row.key} style={[styles.row, index > 0 && styles.rowDivider]}>
          <Text style={styles.rowLabel}>{row.label}</Text>
          {row.people.length ? (
            row.people.map((person, i) => (
              <View key={`${person.name}-${i}`} style={[styles.person, person.faded && styles.faded]}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{person.name.charAt(0).toUpperCase()}</Text>
                </View>
                <View style={styles.personBody}>
                  <Text style={styles.personName}>
                    {person.name}
                    {person.chiXem ? <Text style={styles.meta}> · Chỉ xem</Text> : null}
                  </Text>
                  {person.coCau ? <Text style={styles.meta}>{person.coCau}</Text> : null}
                </View>
              </View>
            ))
          ) : (
            <Text style={styles.meta}>—</Text>
          )}
          <View style={styles.statusRow}>
            <StatusBadge label={row.status.label} color={row.status.color} />
            {row.time ? <Text style={styles.meta}>{row.time}</Text> : null}
          </View>
          {row.yKien ? <Text style={styles.opinion}>Ý kiến: {row.yKien}</Text> : null}
        </View>
      ))}

      {detail.note ? <Text style={styles.note}>{detail.note}</Text> : null}
    </View>
  );
}

const makeStyles = (c: AppColors) =>
  StyleSheet.create({
    panel: {
      marginTop: 12,
      padding: 14,
      borderRadius: 14,
      borderWidth: 1.5,
      backgroundColor: c.surface,
    },
    headRow: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 8,
    },
    headText: {
      flex: 1,
    },
    kicker: {
      fontSize: 11,
      fontWeight: "800",
      letterSpacing: 0.5,
      color: c.accent,
    },
    title: {
      flexShrink: 1,
      fontSize: 16,
      fontWeight: "700",
      color: c.text,
      marginTop: 2,
    },
    bodyText: {
      fontSize: 14,
      color: c.text,
      marginTop: 6,
    },
    meta: {
      fontSize: 12,
      color: c.textSub,
      marginTop: 2,
    },
    link: {
      fontSize: 13,
      fontWeight: "700",
      color: c.accent,
      marginTop: 8,
    },
    traBox: {
      marginTop: 10,
      padding: 10,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: FLOW_TRA_BUOC_COLOR,
      backgroundColor: tint(FLOW_TRA_BUOC_COLOR, "1F"),
      gap: 2,
    },
    traText: {
      fontSize: 13,
      color: c.text,
    },
    traStrong: {
      fontWeight: "700",
    },
    row: {
      paddingVertical: 10,
    },
    rowDivider: {
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: c.separator,
    },
    rowLabel: {
      fontSize: 13,
      fontWeight: "700",
      color: c.textSecondary,
      marginBottom: 6,
    },
    person: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      marginBottom: 6,
    },
    faded: {
      opacity: 0.55,
    },
    avatar: {
      width: 30,
      height: 30,
      borderRadius: 15,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: c.accentLight,
    },
    avatarText: {
      fontSize: 13,
      fontWeight: "800",
      color: c.accent,
    },
    personBody: {
      flex: 1,
    },
    personName: {
      fontSize: 14,
      fontWeight: "700",
      color: c.text,
    },
    statusRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      marginTop: 2,
    },
    opinion: {
      fontSize: 13,
      color: c.textSecondary,
      marginTop: 6,
    },
    note: {
      fontSize: 12,
      color: c.textSub,
      marginTop: 8,
      fontStyle: "italic",
    },
  });
