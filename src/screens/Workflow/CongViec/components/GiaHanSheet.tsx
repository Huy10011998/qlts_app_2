import React, { useEffect, useState } from "react";
import { Alert, StyleSheet, Text } from "react-native";

import { cvGiaHan } from "../../../../services/data/congViecApi";
import { getThaoTacError } from "../../../../services/data/workflowApi";
import { AppColors, useStyles } from "../../../../utils/helpers/colors";
import DateTimeField from "../../shared/components/DateTimeField";
import WorkflowButton from "../../shared/components/WorkflowButton";
import WorkflowSheet from "../../shared/components/WorkflowSheet";
import WorkflowTextArea from "../../shared/components/WorkflowTextArea";
import { formatDayTime, parseBeDate, toBeDateTime } from "../../shared/workflowDate";
import { getWorkflowErrorMessage } from "../../shared/workflowErrors";

type Props = {
  visible: boolean;
  idCongViec: number;
  denNgay?: string | null;
  onClose: () => void;
  onDone: () => void;
};

/** Gia hạn (mục 6): đổi Đến ngày + ghi chú, ghi 1 dòng lịch sử. */
export default function GiaHanSheet({ visible, idCongViec, denNgay, onClose, onDone }: Props) {
  const styles = useStyles(makeStyles);
  const current = parseBeDate(denNgay);
  const [denNgayMoi, setDenNgayMoi] = useState<Date | null>(current);
  const [ghiChu, setGhiChu] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setDenNgayMoi(parseBeDate(denNgay));
    setGhiChu("");
  }, [denNgay, visible]);

  const submit = async () => {
    if (!denNgayMoi) {
      Alert.alert("Thiếu thông tin", "Vui lòng chọn hạn mới.");
      return;
    }

    try {
      setSubmitting(true);
      const result = await cvGiaHan(idCongViec, toBeDateTime(denNgayMoi), ghiChu.trim() || null);
      const loi = getThaoTacError(result);
      if (loi) {
        Alert.alert("Không gia hạn được", loi);
        return;
      }
      onDone();
    } catch (err) {
      Alert.alert("Không gia hạn được", getWorkflowErrorMessage(err, "Vui lòng thử lại."));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <WorkflowSheet
      visible={visible}
      title="Gia hạn"
      onClose={onClose}
      loading={submitting}
      loadingText="Đang lưu..."
      footer={
        <>
          <WorkflowButton label="Đóng" variant="neutral" flex onPress={onClose} />
          <WorkflowButton label="Gia hạn" icon="time-outline" flex onPress={submit} />
        </>
      }
    >
      {current ? <Text style={styles.current}>Hạn hiện tại: {formatDayTime(current)}</Text> : null}
      <DateTimeField label="Hạn mới" required value={denNgayMoi} onChange={setDenNgayMoi} />
      <WorkflowTextArea
        label="Ghi chú"
        value={ghiChu}
        onChangeText={setGhiChu}
        placeholder="Lý do gia hạn"
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
  });
