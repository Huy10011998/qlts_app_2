import React, { useEffect, useState } from "react";
import { Alert, StyleSheet, Text, View } from "react-native";

import { flowDuyetHoSo } from "../../../../services/data/flowApi";
import { getThaoTacError } from "../../../../services/data/workflowApi";
import { AppColors, useStyles } from "../../../../utils/helpers/colors";
import WorkflowButton from "../../shared/components/WorkflowButton";
import WorkflowSheet from "../../shared/components/WorkflowSheet";
import WorkflowTextArea from "../../shared/components/WorkflowTextArea";
import { FLOW_KET_QUA, FLOW_TRA_BUOC_COLOR, tint } from "../../shared/workflowConstants";
import { getWorkflowErrorMessage } from "../../shared/workflowErrors";

type Props = {
  visible: boolean;
  nameClass: string;
  idHoSo: number;
  phieuLabel: string;
  /** flow-thong-tin.buocHienTai / traVe — chỉ để hiện câu xác nhận. */
  buocHienTai?: string | null;
  traVe?: string | null;
  onClose: () => void;
  /** Đã gửi xong, hoặc server báo không làm được — màn gọi nạp lại (mục 8e). */
  onDone: () => void;
};

/**
 * Trả bước (mục 8d): từng phiếu, KHÔNG gọi flow-chon-nguoi-duyet (không chọn
 * người, không Tạo công việc). Lý do bắt buộc — gửi ở YKien với KetQua 4.
 */
export default function FlowTraBuocSheet({
  visible,
  nameClass,
  idHoSo,
  phieuLabel,
  buocHienTai,
  traVe,
  onClose,
  onDone,
}: Props) {
  const styles = useStyles(makeStyles);
  const [lyDo, setLyDo] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [showError, setShowError] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setLyDo("");
    setShowError(false);
  }, [visible]);

  const send = async () => {
    if (!lyDo.trim()) {
      setShowError(true);
      return;
    }

    try {
      setSubmitting(true);
      const result = await flowDuyetHoSo(nameClass, {
        IDs: [idHoSo],
        KetQua: FLOW_KET_QUA.TraBuoc,
        YKien: lyDo.trim(),
      });

      const loi = getThaoTacError(result);
      if (loi) {
        // Người khác vừa xử lý trước / phiếu đã kết thúc: báo rồi nạp lại để nút tự ẩn.
        Alert.alert("Không trả bước được", loi, [{ text: "OK", onPress: onDone }]);
        return;
      }
      onDone();
    } catch (err) {
      Alert.alert("Không trả bước được", getWorkflowErrorMessage(err, "Vui lòng thử lại."));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <WorkflowSheet
      visible={visible}
      title="Xác nhận trả bước"
      onClose={onClose}
      loading={submitting}
      loadingText="Đang gửi..."
      footer={
        <>
          <WorkflowButton label="Đóng" variant="neutral" flex onPress={onClose} />
          <WorkflowButton label="Trả bước" variant="warning" icon="arrow-undo-outline" flex onPress={send} />
        </>
      }
    >
      <Text style={styles.question}>
        Trả phiếu <Text style={styles.strong}>{phieuLabel}</Text>
        {buocHienTai ? ` (đang ở ${buocHienTai})` : ""} về bước{" "}
        <Text style={styles.strong}>{traVe ?? "trước"}</Text>?
      </Text>
      <View style={styles.warning}>
        <Text style={styles.warningText}>
          Trả bước tính theo bước lớn: phiếu lùi về bước lớn liền trước và chạy lại từ đầu bước đó.
          Các bước con đang mở cùng bước (song song) cũng dừng, chạy lại sau.
        </Text>
      </View>
      <WorkflowTextArea
        label="Lý do trả bước"
        required
        value={lyDo}
        onChangeText={(value) => {
          setLyDo(value);
          if (showError && value.trim()) setShowError(false);
        }}
        placeholder="Nhập lý do trả bước"
      />
      {showError ? <Text style={styles.error}>Nhập lý do trả bước</Text> : null}
    </WorkflowSheet>
  );
}

const makeStyles = (c: AppColors) =>
  StyleSheet.create({
    question: {
      fontSize: 15,
      color: c.text,
      lineHeight: 21,
      marginBottom: 10,
    },
    strong: {
      fontWeight: "700",
    },
    warning: {
      padding: 10,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: FLOW_TRA_BUOC_COLOR,
      backgroundColor: tint(FLOW_TRA_BUOC_COLOR, "1F"),
      marginBottom: 12,
    },
    warningText: {
      fontSize: 13,
      color: c.text,
      lineHeight: 18,
    },
    error: {
      fontSize: 12,
      color: c.red,
      marginTop: -6,
      marginBottom: 8,
    },
  });
