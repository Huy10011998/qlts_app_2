import React, { useMemo, useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";

import type { FlowChonNguoi, FlowChonNguoiBuoc, FlowChonNguoiPair } from "../../../../types/index";
import { AppColors, useAppColors, useStyles } from "../../../../utils/helpers/colors";
import EmployeePickerModal from "../../shared/components/EmployeePickerModal";

type Props = {
  data: FlowChonNguoi;
  value: FlowChonNguoiPair[];
  onChange: (value: FlowChonNguoiPair[]) => void;
  /** Đánh dấu bước còn trống sau khi bấm lưu / duyệt. */
  showErrors?: boolean;
};

/**
 * Lưới chọn người duyệt cho các bước phải chọn lúc nộp / lúc duyệt (mục 7b,
 * 8a). Mỗi bước ít nhất 1 người; bước có luật (`coLuat`) chỉ chọn trong
 * `ungViens` của bước đó.
 */
export default function ApproverStepPicker({ data, value, onChange, showErrors }: Props) {
  const styles = useStyles(makeStyles);
  const c = useAppColors();
  const [picking, setPicking] = useState<FlowChonNguoiBuoc | null>(null);

  const nameOf = useMemo(() => {
    const map = new Map(data.nhanViens.map((item) => [item.id, item.ten]));
    return (id: number) => map.get(id) ?? `#${id}`;
  }, [data.nhanViens]);

  const idsOf = (idBuoc: number) =>
    value.filter((item) => item.iD_Buoc === idBuoc).map((item) => item.iD_NhanVien);

  const allowedOf = (buoc: FlowChonNguoiBuoc) =>
    buoc.coLuat
      ? data.ungViens.filter((item) => item.iD_Buoc === buoc.iD_Buoc).map((item) => item.iD_NhanVien)
      : null;

  return (
    <View>
      {data.buocs.map((buoc) => {
        const ids = idsOf(buoc.iD_Buoc);
        const missing = showErrors && !ids.length;

        return (
          <View key={buoc.iD_Buoc} style={[styles.step, missing && styles.stepMissing]}>
            <View style={styles.stepHeader}>
              <View style={styles.stepTitleWrap}>
                <Text style={styles.stepTitle}>
                  {buoc.soBuoc != null ? `Bước ${buoc.soBuoc}: ` : ""}
                  {buoc.ten}
                  <Text style={styles.required}> *</Text>
                </Text>
                {buoc.coLuat ? <Text style={styles.stepHint}>Chọn trong danh sách được phép</Text> : null}
              </View>
              <TouchableOpacity style={styles.pickButton} onPress={() => setPicking(buoc)} hitSlop={8}>
                <Ionicons name="person-add-outline" size={14} color={c.red} />
                <Text style={styles.pickText}>Chọn</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.chips}>
              {ids.length ? (
                ids.map((id) => (
                  <View key={id} style={styles.chip}>
                    <Text style={styles.chipText} numberOfLines={1}>
                      {nameOf(id)}
                    </Text>
                    <TouchableOpacity
                      hitSlop={8}
                      onPress={() =>
                        onChange(
                          value.filter(
                            (item) => !(item.iD_Buoc === buoc.iD_Buoc && item.iD_NhanVien === id),
                          ),
                        )
                      }
                    >
                      <Ionicons name="close-circle" size={16} color={c.textSub} />
                    </TouchableOpacity>
                  </View>
                ))
              ) : (
                <Text style={[styles.empty, missing && styles.emptyMissing]}>
                  {missing ? "Bước này chưa có người duyệt" : "Chưa chọn"}
                </Text>
              )}
            </View>
          </View>
        );
      })}

      <EmployeePickerModal
        visible={!!picking}
        title={picking ? `Người duyệt: ${picking.ten}` : ""}
        employees={data.nhanViens}
        selectedIds={picking ? idsOf(picking.iD_Buoc) : []}
        allowedIds={picking ? allowedOf(picking) : null}
        onClose={() => setPicking(null)}
        onConfirm={(ids) => {
          if (picking) {
            onChange([
              ...value.filter((item) => item.iD_Buoc !== picking.iD_Buoc),
              ...ids.map((id) => ({ iD_Buoc: picking.iD_Buoc, iD_NhanVien: id })),
            ]);
          }
          setPicking(null);
        }}
      />
    </View>
  );
}

const makeStyles = (c: AppColors) =>
  StyleSheet.create({
    step: {
      paddingVertical: 10,
      paddingHorizontal: 10,
      borderRadius: 12,
      backgroundColor: c.surfaceAlt,
      marginBottom: 8,
      borderWidth: 1,
      borderColor: "transparent",
    },
    stepMissing: {
      borderColor: c.red,
    },
    stepHeader: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: 6,
    },
    stepTitleWrap: {
      flex: 1,
      marginRight: 8,
    },
    stepTitle: {
      fontSize: 14,
      fontWeight: "700",
      color: c.text,
    },
    stepHint: {
      fontSize: 11,
      color: c.textSub,
      marginTop: 2,
    },
    required: {
      color: c.red,
    },
    pickButton: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 999,
      backgroundColor: c.redSurface,
    },
    pickText: {
      fontSize: 12,
      fontWeight: "600",
      color: c.red,
    },
    chips: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 6,
    },
    chip: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      maxWidth: "100%",
      paddingLeft: 10,
      paddingRight: 6,
      paddingVertical: 5,
      borderRadius: 999,
      backgroundColor: c.surface,
    },
    chipText: {
      fontSize: 13,
      fontWeight: "600",
      color: c.accent,
      flexShrink: 1,
    },
    empty: {
      fontSize: 13,
      color: c.textMuted,
    },
    emptyMissing: {
      color: c.red,
    },
  });
