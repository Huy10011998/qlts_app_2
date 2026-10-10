import React, { useEffect, useState } from "react";
import { Alert, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";

import { flowDuyetHoSo, flowKiemTaoCongViec } from "../../../../services/data/flowApi";
import type { FlowThaoTacResult } from "../../../../types/index";
import { AppColors, useAppColors, useStyles } from "../../../../utils/helpers/colors";
import WorkflowButton from "../../shared/components/WorkflowButton";
import WorkflowSheet from "../../shared/components/WorkflowSheet";
import WorkflowTextArea from "../../shared/components/WorkflowTextArea";
import { FLOW_KET_QUA } from "../../shared/workflowConstants";
import { getWorkflowErrorMessage } from "../../shared/workflowErrors";

export type FlowBulkOutcome = {
  result: FlowThaoTacResult;
  /** Số phiếu ở lượt cuối "Tạo công việc" đã bỏ qua (B2). */
  skippedTaoCongViec: number;
};

type Props = {
  visible: boolean;
  nameClass: string;
  /** Phiếu đã lọc isToiLuot ở B1 — từ 2 phiếu trở lên. */
  ids: number[];
  /** Số phiếu bị loại ở B1 vì không tới lượt tôi. */
  skippedNotAllowed: number;
  /** Số phiếu (hoặc "#<id>") để liệt kê phiếu bị bỏ qua. */
  labelOf: (id: number) => string;
  onClose: () => void;
  /** Đã gửi xong — màn gọi báo kết quả (B4) và nạp lại. */
  onDone: (outcome: FlowBulkOutcome) => void;
};

/**
 * Duyệt nhiều phiếu một lần (mục 8c) — CHỈ có Duyệt: Từ chối / Không ý kiến
 * chỉ làm từng phiếu. Không chọn người, không tạo công việc.
 *   B2. Hỏi flow-kiem-tao-cong-viec: phiếu đang ở lượt cuối của loại "Tạo công
 *       việc" mặc định bị bỏ qua để duyệt riêng từng phiếu.
 *   B3. Gửi 1 lần với Chons rỗng; server tự bỏ qua phiếu phải chọn người.
 */
export default function FlowBulkApproveSheet({
  visible,
  nameClass,
  ids,
  skippedNotAllowed,
  labelOf,
  onClose,
  onDone,
}: Props) {
  const styles = useStyles(makeStyles);
  const c = useAppColors();
  const [checking, setChecking] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [taoCongViecIds, setTaoCongViecIds] = useState<number[]>([]);
  const [skipTaoCongViec, setSkipTaoCongViec] = useState(true);
  const [yKien, setYKien] = useState("");

  useEffect(() => {
    if (!visible) return;
    setYKien("");
    setTaoCongViecIds([]);
    setSkipTaoCongViec(true);
    if (!ids.length) return;

    let alive = true;
    setChecking(true);
    flowKiemTaoCongViec(nameClass, ids)
      .then((result) => {
        if (alive) setTaoCongViecIds((result ?? []).filter((id) => ids.includes(id)));
      })
      .catch(() => undefined)
      .finally(() => {
        if (alive) setChecking(false);
      });
    return () => {
      alive = false;
    };
  }, [ids, nameClass, visible]);

  const submit = async () => {
    const skipped = skipTaoCongViec ? taoCongViecIds : [];
    const targetIds = ids.filter((id) => !skipped.includes(id));

    if (!targetIds.length) {
      Alert.alert(
        "Không còn phiếu",
        "Không còn phiếu nào để duyệt - mở duyệt từng phiếu để tạo công việc.",
      );
      return;
    }

    try {
      setSubmitting(true);
      const result = await flowDuyetHoSo(nameClass, {
        IDs: targetIds,
        KetQua: FLOW_KET_QUA.Duyet,
        YKien: yKien.trim() || null,
        Chons: [],
      });
      onDone({ result, skippedTaoCongViec: skipped.length });
    } catch (err) {
      Alert.alert("Không gửi được", getWorkflowErrorMessage(err, "Vui lòng thử lại."));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <WorkflowSheet
      visible={visible}
      title={`Duyệt ${ids.length} phiếu`}
      onClose={onClose}
      loading={checking || submitting}
      loadingText={checking ? "Đang kiểm tra phiếu..." : "Đang gửi..."}
      closableWhileLoading={checking}
      footer={
        <>
          <WorkflowButton label="Đóng" variant="neutral" flex onPress={onClose} />
          <WorkflowButton
            label="Duyệt"
            icon="checkmark-done-outline"
            variant="success"
            flex
            disabled={checking}
            onPress={submit}
          />
        </>
      }
    >
      <Text style={styles.confirm}>
        Duyệt {ids.length} phiếu đang chờ bạn
        {skippedNotAllowed > 0 ? ` (bỏ qua ${skippedNotAllowed} phiếu không làm được)` : ""}.
      </Text>

      {taoCongViecIds.length ? (
        <View style={styles.block}>
          <Text style={styles.notice}>
            {taoCongViecIds.length} phiếu đang ở lượt duyệt cuối của loại có "Tạo công việc":
          </Text>
          <Text style={styles.soPhieu}>{taoCongViecIds.map(labelOf).join(", ")}</Text>
          {[true, false].map((skip) => {
            const active = skipTaoCongViec === skip;
            return (
              <TouchableOpacity
                key={String(skip)}
                style={styles.choice}
                onPress={() => setSkipTaoCongViec(skip)}
              >
                <Ionicons
                  name={active ? "radio-button-on" : "radio-button-off"}
                  size={20}
                  color={active ? c.red : c.textMuted}
                />
                <Text style={styles.choiceText}>
                  {skip
                    ? "Bỏ qua các phiếu này - duyệt riêng từng phiếu để tạo công việc"
                    : "Vẫn duyệt như thường (không tạo công việc)"}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      ) : null}

      <WorkflowTextArea label="Ý kiến" value={yKien} onChangeText={setYKien} placeholder="Đồng ý" />
    </WorkflowSheet>
  );
}

const makeStyles = (c: AppColors) =>
  StyleSheet.create({
    confirm: {
      fontSize: 14,
      color: c.text,
      marginTop: 4,
      marginBottom: 12,
    },
    block: {
      marginBottom: 14,
      padding: 12,
      borderRadius: 12,
      backgroundColor: c.amberLight,
      borderWidth: 1,
      borderColor: c.amberBorder,
    },
    notice: {
      fontSize: 13,
      color: c.textSecondary,
    },
    soPhieu: {
      fontSize: 13,
      fontWeight: "700",
      color: c.text,
      marginTop: 4,
      marginBottom: 6,
    },
    choice: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      paddingVertical: 7,
    },
    choiceText: {
      flex: 1,
      fontSize: 14,
      color: c.text,
    },
  });
