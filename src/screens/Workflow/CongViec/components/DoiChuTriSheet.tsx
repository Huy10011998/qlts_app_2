import React, { useEffect, useMemo, useState } from "react";
import { Alert, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";

import { cvDoiChuTri, cvNhanVien } from "../../../../services/data/congViecApi";
import { getThaoTacError } from "../../../../services/data/workflowApi";
import type { WorkflowEmployee } from "../../../../types/index";
import { AppColors, useAppColors, useStyles } from "../../../../utils/helpers/colors";
import EmployeePickerModal from "../../shared/components/EmployeePickerModal";
import WorkflowButton from "../../shared/components/WorkflowButton";
import WorkflowSheet from "../../shared/components/WorkflowSheet";
import WorkflowTextArea from "../../shared/components/WorkflowTextArea";
import { getWorkflowErrorMessage } from "../../shared/workflowErrors";

type Props = {
  visible: boolean;
  idCongViec: number;
  idChuTriHienTai?: number | null;
  tenChuTriHienTai?: string | null;
  onClose: () => void;
  onDone: () => void;
};

/** Đổi chủ trì (mục 6): chọn người mới + ghi chú, ghi 1 dòng lịch sử. */
export default function DoiChuTriSheet({
  visible,
  idCongViec,
  idChuTriHienTai,
  tenChuTriHienTai,
  onClose,
  onDone,
}: Props) {
  const styles = useStyles(makeStyles);
  const c = useAppColors();
  const [employees, setEmployees] = useState<WorkflowEmployee[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [ghiChu, setGhiChu] = useState("");
  const [pickerVisible, setPickerVisible] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setSelectedId(null);
    setGhiChu("");
    cvNhanVien()
      .then(setEmployees)
      .catch(() => setEmployees([]));
  }, [visible]);

  const selected = useMemo(
    () => employees.find((employee) => employee.id === selectedId),
    [employees, selectedId],
  );

  const submit = async () => {
    if (!selectedId) {
      Alert.alert("Thiếu thông tin", "Vui lòng chọn chủ trì mới.");
      return;
    }

    try {
      setSubmitting(true);
      const result = await cvDoiChuTri(idCongViec, selectedId, ghiChu.trim() || null);
      const loi = getThaoTacError(result);
      if (loi) {
        Alert.alert("Không đổi được chủ trì", loi);
        return;
      }
      onDone();
    } catch (err) {
      Alert.alert("Không đổi được chủ trì", getWorkflowErrorMessage(err, "Vui lòng thử lại."));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <WorkflowSheet
      visible={visible}
      title="Đổi chủ trì"
      onClose={onClose}
      loading={submitting}
      loadingText="Đang lưu..."
      footer={
        <>
          <WorkflowButton label="Đóng" variant="neutral" flex onPress={onClose} />
          <WorkflowButton label="Đổi chủ trì" icon="swap-horizontal" flex onPress={submit} />
        </>
      }
      overlay={
        <EmployeePickerModal
          visible={pickerVisible}
          title="Chọn chủ trì mới"
          employees={employees}
          selectedIds={selectedId ? [selectedId] : []}
          multiple={false}
          excludeIds={idChuTriHienTai ? [idChuTriHienTai] : []}
          onClose={() => setPickerVisible(false)}
          onConfirm={(ids) => {
            setSelectedId(ids[0] ?? null);
            setPickerVisible(false);
          }}
        />
      }
    >
      {tenChuTriHienTai ? (
        <Text style={styles.current}>Chủ trì hiện tại: {tenChuTriHienTai}</Text>
      ) : null}

      <Text style={styles.label}>
        Chủ trì mới <Text style={styles.required}>*</Text>
      </Text>
      <TouchableOpacity
        style={styles.picker}
        activeOpacity={0.7}
        onPress={() => setPickerVisible(true)}
      >
        <Ionicons name="person-outline" size={18} color={c.textSub} />
        <View style={styles.pickerBody}>
          <Text style={selected ? styles.pickerValue : styles.pickerPlaceholder} numberOfLines={1}>
            {selected?.ten ?? "Chọn nhân viên"}
          </Text>
          {selected?.phongBan ? (
            <Text style={styles.pickerMeta} numberOfLines={1}>
              {selected.phongBan}
            </Text>
          ) : null}
        </View>
        <Ionicons name="chevron-forward" size={18} color={c.textSub} />
      </TouchableOpacity>

      <WorkflowTextArea
        label="Ghi chú"
        value={ghiChu}
        onChangeText={setGhiChu}
        placeholder="Lý do bàn giao"
      />
    </WorkflowSheet>
  );
}

const makeStyles = (c: AppColors) =>
  StyleSheet.create({
    current: {
      fontSize: 13,
      color: c.textSub,
      marginBottom: 12,
    },
    label: {
      fontSize: 13,
      fontWeight: "600",
      marginBottom: 7,
      color: c.textSecondary,
    },
    required: {
      color: c.red,
    },
    picker: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      borderWidth: 1,
      borderColor: c.borderStrong,
      borderRadius: 12,
      paddingHorizontal: 12,
      paddingVertical: 10,
      backgroundColor: c.input,
      marginBottom: 14,
    },
    pickerBody: {
      flex: 1,
    },
    pickerValue: {
      fontSize: 15,
      color: c.text,
      fontWeight: "600",
    },
    pickerPlaceholder: {
      fontSize: 15,
      color: c.placeholder,
    },
    pickerMeta: {
      fontSize: 12,
      color: c.textSub,
      marginTop: 2,
    },
  });
