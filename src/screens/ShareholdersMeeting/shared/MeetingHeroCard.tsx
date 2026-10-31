import React from "react";
import { StyleSheet, Text, View } from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";
import Svg, { Circle, G, Line } from "react-native-svg";
import {
  AppColors,
  useAppColors,
  useStyles,
} from "../../../utils/helpers/colors";
import { formatShares } from "./shareholdersMeetingHelpers";

const RING_SIZE = 88;
const RING_STROKE = 10;
// Chừa 3 quanh vòng cho vạch mốc 50% thò ra ngoài dải màu.
const RING_RADIUS = (RING_SIZE - RING_STROKE) / 2 - 3;
const TICK_OVERHANG = 6;

/**
 * Vòng % cổ phần dự họp, số phần trăm ở giữa. Cung bắt đầu từ đỉnh nên vạch
 * ngắn ở đáy vòng là mốc 50% — cung chạy qua vạch là đủ điều kiện họp.
 */
export function QuorumRing({ percent }: { percent: number }) {
  const styles = useStyles(makeStyles);
  const c = useAppColors();
  const center = RING_SIZE / 2;
  const circumference = 2 * Math.PI * RING_RADIUS;
  const clamped = Math.min(Math.max(percent, 0), 100);
  // Mới vài cổ phần có mặt thì cung vẫn phải thấy được một chấm.
  const arc = clamped > 0 ? Math.max((circumference * clamped) / 100, 4) : 0;
  // Làm tròn xuống: 49,6% mà hiện "50%" thì đọc như đã đủ trong khi chưa đủ.
  const label = clamped > 0 && clamped < 1 ? "<1%" : `${Math.floor(clamped)}%`;

  return (
    <View style={styles.ring}>
      <Svg width={RING_SIZE} height={RING_SIZE}>
        <G rotation={-90} originX={center} originY={center}>
          <Circle
            cx={center}
            cy={center}
            r={RING_RADIUS}
            fill="none"
            stroke={c.surfaceAlt}
            strokeWidth={RING_STROKE}
          />
          {arc > 0 ? (
            <Circle
              cx={center}
              cy={center}
              r={RING_RADIUS}
              fill="none"
              stroke={c.green}
              strokeWidth={RING_STROKE}
              strokeLinecap="round"
              strokeDasharray={`${arc} ${circumference}`}
            />
          ) : null}
        </G>
        <Line
          x1={center}
          y1={center + RING_RADIUS - TICK_OVERHANG}
          x2={center}
          y2={center + RING_RADIUS + TICK_OVERHANG}
          stroke={c.textPrimary}
          strokeOpacity={0.55}
          strokeWidth={2.5}
          strokeLinecap="round"
        />
      </Svg>
      <View pointerEvents="none" style={styles.ringCenter}>
        <Text
          adjustsFontSizeToFit
          minimumFontScale={0.7}
          numberOfLines={1}
          style={styles.ringText}
        >
          {label}
        </Text>
      </View>
    </View>
  );
}

/** Một cột ở đáy thẻ: nhãn nhỏ, số đậm + đơn vị, thanh tỷ lệ mảnh. */
function StatColumn({
  barColor,
  label,
  ratio,
  unit,
  value,
}: {
  barColor: string;
  label: string;
  ratio: number;
  unit: string;
  value: number;
}) {
  const styles = useStyles(makeStyles);
  const width = `${Math.min(Math.max(ratio, 0), 1) * 100}%` as const;

  return (
    <View style={styles.stat}>
      <Text style={styles.statLabel} numberOfLines={1}>
        {label}
      </Text>
      <Text style={styles.statValue} numberOfLines={1}>
        {value}
        <Text style={styles.statUnit}>{` ${unit}`}</Text>
      </Text>
      <View style={styles.statTrack}>
        <View style={[styles.statFill, { width, backgroundColor: barColor }]} />
      </View>
    </View>
  );
}

type Props = {
  hasQuorum: boolean;
  pendingCount: number;
  presentCount: number;
  presentShares: number;
  sharePercent: number;
  totalCount: number;
  totalShares: number;
};

/**
 * Thẻ tổng quan tab Điểm danh (mẫu A user chọn 30/10): số chính là cổ phần dự
 * họp — điều kiện tiến hành đại hội tính theo cổ phần — kèm nhãn đủ / chưa đủ
 * điều kiện; số người có mặt / chưa đến nằm ở hai cột đáy thẻ.
 */
export default function MeetingHeroCard({
  hasQuorum,
  pendingCount,
  presentCount,
  presentShares,
  sharePercent,
  totalCount,
  totalShares,
}: Props) {
  const styles = useStyles(makeStyles);
  const c = useAppColors();
  const quorumColor = hasQuorum ? c.green : c.gold;

  return (
    <View style={styles.card}>
      <View style={styles.top}>
        <QuorumRing percent={sharePercent} />
        <View style={styles.textCol}>
          <Text style={styles.label} numberOfLines={1}>
            Cổ phần dự họp
          </Text>
          <Text
            adjustsFontSizeToFit
            minimumFontScale={0.7}
            numberOfLines={1}
            style={styles.value}
          >
            {formatShares(presentShares)}
          </Text>
          <Text style={styles.total} numberOfLines={1}>
            / {formatShares(totalShares)} cổ phần
          </Text>
          {totalShares > 0 ? (
            <View
              style={[
                styles.quorumChip,
                { backgroundColor: hasQuorum ? c.greenLight : c.goldLight },
              ]}
            >
              <Ionicons
                name={hasQuorum ? "shield-checkmark" : "hourglass-outline"}
                size={14}
                color={quorumColor}
              />
              <Text
                style={[styles.quorumText, { color: quorumColor }]}
                numberOfLines={1}
              >
                {hasQuorum ? "Đủ điều kiện tiến hành" : "Cần trên 50% cổ phần"}
              </Text>
            </View>
          ) : null}
        </View>
      </View>
      <View style={styles.bottom}>
        <StatColumn
          barColor={c.green}
          label="Cổ đông có mặt"
          ratio={totalCount > 0 ? presentCount / totalCount : 0}
          unit={`/ ${totalCount} người`}
          value={presentCount}
        />
        <View style={styles.divider} />
        <StatColumn
          barColor={c.borderStrong}
          label="Chưa đến"
          ratio={totalCount > 0 ? pendingCount / totalCount : 0}
          unit="người"
          value={pendingCount}
        />
      </View>
    </View>
  );
}

const makeStyles = (c: AppColors) =>
  StyleSheet.create({
    card: {
      marginHorizontal: 16,
      marginBottom: 12,
      borderRadius: 22,
      borderWidth: 1,
      borderColor: c.separator,
      backgroundColor: c.surface,
      shadowColor: c.shadow,
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.08,
      shadowRadius: 3,
      elevation: 1,
    },
    top: {
      flexDirection: "row",
      alignItems: "center",
      gap: 16,
      padding: 16,
    },
    textCol: { flex: 1, minWidth: 0, alignItems: "flex-start" },
    label: {
      color: c.textSub,
      fontSize: 12,
      fontWeight: "700",
      letterSpacing: 0.4,
      textTransform: "uppercase",
    },
    value: {
      color: c.textPrimary,
      fontSize: 27,
      fontWeight: "800",
      letterSpacing: -0.4,
      marginTop: 2,
    },
    total: {
      color: c.textSub,
      fontSize: 13,
      fontWeight: "600",
      marginTop: 1,
      marginBottom: 8,
    },
    quorumChip: {
      flexDirection: "row",
      alignItems: "center",
      gap: 5,
      maxWidth: "100%",
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 999,
    },
    quorumText: { flexShrink: 1, fontSize: 12.5, fontWeight: "700" },
    bottom: {
      flexDirection: "row",
      borderTopWidth: 1,
      borderTopColor: c.separator,
    },
    divider: { width: 1, backgroundColor: c.separator },
    stat: {
      flex: 1,
      minWidth: 0,
      paddingHorizontal: 16,
      paddingTop: 11,
      paddingBottom: 13,
    },
    statLabel: { color: c.textSub, fontSize: 12, fontWeight: "600" },
    statValue: {
      color: c.textPrimary,
      fontSize: 16,
      fontWeight: "800",
      marginTop: 2,
    },
    statUnit: { color: c.textSub, fontSize: 12.5, fontWeight: "600" },
    statTrack: {
      height: 5,
      borderRadius: 3,
      marginTop: 7,
      overflow: "hidden",
      backgroundColor: c.surfaceAlt,
    },
    statFill: { height: "100%", borderRadius: 3 },
    ring: { width: RING_SIZE, height: RING_SIZE },
    ringCenter: {
      ...StyleSheet.absoluteFillObject,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 16,
    },
    ringText: { color: c.textPrimary, fontSize: 20, fontWeight: "800" },
  });
