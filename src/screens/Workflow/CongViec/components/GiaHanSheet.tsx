import React, { useEffect, useState } from "react";
import { StyleSheet, Text } from "react-native";

import { cvGiaHan } from "../../../../services/data/congViecApi";
import { getThaoTacError } from "../../../../services/data/workflowApi";
import { AppColors, useStyles } from "../../../../utils/helpers/colors";
import DateTimeField from "../../shared/components/DateTimeField";
import WorkflowButton from "../../shared/components/WorkflowButton";
import WorkflowSheet, { confirmCloseSheet } from "../../shared/components/WorkflowSheet";
import WorkflowTextArea from "../../shared/components/WorkflowTextArea";
import { formatDayTime, parseBeDate, toBeDateTime } from "../../shared/workflowDate";
import { getWorkflowErrorMessage } from "../../shared/workflowErrors";
import { AppAlert } from "../../../../components/ui/AppAlert";
import { showAppToast } from "../../../../components/ui/AppToast";

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
      AppAlert.alert("Thiếu thông tin", "Vui lòng chọn hạn mới.");
      return;
    }

    try {
      setSubmitting(true);
      const result = await cvGiaHan(idCongViec, toBeDateTime(denNgayMoi), ghiChu.trim() || null);
      const loi = getThaoTacError(result);
      if (loi) {
        AppAlert.alert("Không gia hạn được", loi);
        return;
      }
      // Sheet đóng ngay — không báo thì người dùng không biết đã gia hạn chưa.
      showAppToast({ message: "Đã gia hạn", detail: `Hạn mới: ${formatDayTime(denNgayMoi)}` });
      onDone();
    } catch (err) {
      AppAlert.alert("Không gia hạn được", getWorkflowErrorMessage(err, "Vui lòng thử lại."));
    } finally {
      setSubmitting(false);
    }
  };

  // Như form Sửa: hạn mới chưa khác hạn hiện tại thì chưa có gì để gia hạn.
  const unchanged = !denNgayMoi || (!!current && denNgayMoi.getTime() === current.getTime());
  // Hạn mới đã chọn / ghi chú đã gõ mà chạm nhầm ra nền tối là mất — sheet hỏi trước khi đóng.
  const dirty = !unchanged || !!ghiChu.trim();

  return (
    <WorkflowSheet
      visible={visible}
      title="Gia hạn"
      onClose={onClose}
      loading={submitting}
      loadingText="Đang lưu..."
      dirty={dirty}
      footer={
        <>
          <WorkflowButton
            label="Đóng"
            variant="neutral"
            flex
            onPress={() => confirmCloseSheet(dirty, onClose)}
          />
          <WorkflowButton
            label="Gia hạn"
            icon="time-outline"
            flex
            disabled={unchanged}
            onPress={submit}
          />
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
