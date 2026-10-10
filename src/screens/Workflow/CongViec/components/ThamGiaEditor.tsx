import React, { useMemo, useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";

import type { CongViecThamGiaPayload, WorkflowEmployee } from "../../../../types/index";
import { AppColors, useAppColors, useStyles } from "../../../../utils/helpers/colors";
import EmployeePickerModal from "../../shared/components/EmployeePickerModal";
import { CV_VAI_TRO, CV_VAI_TRO_OPTIONS } from "../../shared/workflowConstants";

type Props = {
  employees: WorkflowEmployee[];
  value: CongViecThamGiaPayload[];
  onChange: (value: CongViecThamGiaPayload[]) => void;
  /** Tên dự phòng khi người tham gia cũ không còn trong danh sách chọn. */
  fallbackNames?: Record<number, string>;
  error?: string | null;
};

/**
 * Lưới người tham gia: ĐÚNG 1 Chủ trì, nhiều Phối hợp / Để biết, 1 người 1
 * vai trò (người đã ở vai trò khác không hiện trong ô chọn).
 */
export default function ThamGiaEditor({
  employees,
  value,
  onChange,
  fallbackNames,
  error,
}: Props) {
  const styles = useStyles(makeStyles);
  const c = useAppColors();
  const [pickingRole, setPickingRole] = useState<number | null>(null);

  const nameOf = useMemo(() => {
    const map = new Map(employees.map((employee) => [employee.id, employee.ten]));
    return (id: number) => map.get(id) ?? fallbackNames?.[id] ?? `#${id}`;
  }, [employees, fallbackNames]);

  const idsOf = (role: number) =>
    value.filter((item) => item.VaiTro === role).map((item) => item.ID_NhanVien);

  const replaceRole = (role: number, ids: number[]) =>
    onChange([
      ...value.filter((item) => item.VaiTro !== role),
      ...ids.map((id) => ({ ID_NhanVien: id, VaiTro: role })),
    ]);

  const remove = (role: number, id: number) =>
    onChange(value.filter((item) => !(item.VaiTro === role && item.ID_NhanVien === id)));

  return (
    <View>
      {CV_VAI_TRO_OPTIONS.map((role) => {
        const ids = idsOf(role.value);
        const isChuTri = role.value === CV_VAI_TRO.ChuTri;

        return (
          <View key={role.value} style={styles.role}>
            <View style={styles.roleHeader}>
              <Text style={styles.roleLabel}>
                {role.label}
                {isChuTri ? <Text style={styles.required}> *</Text> : null}
              </Text>
              <TouchableOpacity
                style={styles.pickButton}
                onPress={() => setPickingRole(role.value)}
                hitSlop={8}
              >
                <Ionicons name={isChuTri ? "swap-horizontal" : "add"} size={15} color={c.red} />
                <Text style={styles.pickText}>{isChuTri && ids.length ? "Đổi" : "Chọn"}</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.chips}>
              {ids.length ? (
                ids.map((id) => (
                  <View key={id} style={styles.chip}>
                    <Text style={styles.chipText} numberOfLines={1}>
                      {nameOf(id)}
                    </Text>
                    {!isChuTri ? (
                      <TouchableOpacity onPress={() => remove(role.value, id)} hitSlop={8}>
                        <Ionicons name="close-circle" size={16} color={c.textSub} />
                      </TouchableOpacity>
                    ) : null}
                  </View>
                ))
              ) : (
                <Text style={styles.empty}>Chưa chọn</Text>
              )}
            </View>
          </View>
        );
      })}
      {error ? <Text style={styles.error}>{error}</Text> : null}

      <EmployeePickerModal
        visible={pickingRole != null}
        title={`Chọn ${CV_VAI_TRO_OPTIONS.find((item) => item.value === pickingRole)?.label ?? ""}`}
        employees={employees}
        selectedIds={pickingRole != null ? idsOf(pickingRole) : []}
        multiple={pickingRole !== CV_VAI_TRO.ChuTri}
        excludeIds={value
          .filter((item) => item.VaiTro !== pickingRole)
          .map((item) => item.ID_NhanVien)}
        onClose={() => setPickingRole(null)}
        onConfirm={(ids) => {
          if (pickingRole != null) replaceRole(pickingRole, ids);
          setPickingRole(null);
        }}
      />
    </View>
  );
}

const makeStyles = (c: AppColors) =>
  StyleSheet.create({
    role: {
      paddingVertical: 8,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: c.separator,
    },
    roleHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 6,
    },
    roleLabel: {
      fontSize: 13,
      fontWeight: "700",
      color: c.textSecondary,
    },
    required: {
      color: c.red,
    },
    pickButton: {
      flexDirection: "row",
      alignItems: "center",
      gap: 3,
      paddingHorizontal: 10,
      paddingVertical: 4,
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
      backgroundColor: c.accentLight,
    },
    chipText: {
      fontSize: 13,
      color: c.accent,
      fontWeight: "600",
      flexShrink: 1,
    },
    empty: {
      fontSize: 13,
      color: c.textMuted,
    },
    error: {
      marginTop: 6,
      fontSize: 12,
      color: c.red,
    },
  });
