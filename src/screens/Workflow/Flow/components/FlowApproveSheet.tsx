import React, { useEffect, useState } from "react";
import { Alert, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";

import { flowChonNguoiDuyet, flowDuyetHoSo } from "../../../../services/data/flowApi";
import { getThaoTacError } from "../../../../services/data/workflowApi";
import type {
  FlowChonNguoi,
  FlowChonNguoiPair,
  FlowTaoCongViecPrefill,
} from "../../../../types/index";
import { AppColors, useAppColors, useStyles } from "../../../../utils/helpers/colors";
import WorkflowButton from "../../shared/components/WorkflowButton";
import WorkflowSheet from "../../shared/components/WorkflowSheet";
import WorkflowTextArea from "../../shared/components/WorkflowTextArea";
import { FLOW_KET_QUA } from "../../shared/workflowConstants";
import { getWorkflowErrorMessage } from "../../shared/workflowErrors";
import { getMissingSteps } from "../flowRules";
import ApproverStepPicker from "./ApproverStepPicker";

export type FlowKetQua = 1 | 2 | 3;

type Props = {
  visible: boolean;
  nameClass: string;
  idHoSo: number;
  ketQua: FlowKetQua;
  /** Số phiếu (hoặc "#<id>") cho tiêu đề sheet. */
  phieuLabel?: string;
  onClose: () => void;
  /** Đã gửi xong — màn gọi nạp lại. */
  onDone: () => void;
  /** Lượt duyệt cuối chọn "Tạo công việc": màn gọi mở form công việc. */
  onTaoCongViec: (args: { yKien: string | null; prefill: FlowTaoCongViecPrefill | null }) => void;
};

const TITLES: Record<FlowKetQua, string> = {
  1: "Duyệt phiếu",
  2: "Từ chối phiếu",
  3: "Không ý kiến",
};

/**
 * Duyệt / Không ý kiến / Từ chối 1 phiếu (mục 8). Duyệt và Không ý kiến mở
 * sheet ngay, che "Đang kiểm tra phiếu..." và hỏi server flow-chon-nguoi-duyet:
 *   · có `buocs`     → phải chọn người cho bước kế, chọn đủ mới cho gửi;
 *   · có `taoCongViec` (chỉ Duyệt) → (•) Duyệt  ( ) Tạo công việc.
 * Từ chối đóng phiếu, không quay lại — hỏi xác nhận.
 */
export default function FlowApproveSheet({
  visible,
  nameClass,
  idHoSo,
  ketQua,
  phieuLabel,
  onClose,
  onDone,
  onTaoCongViec,
}: Props) {
  const styles = useStyles(makeStyles);
  const c = useAppColors();
  const [checking, setChecking] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [data, setData] = useState<FlowChonNguoi | null>(null);
  const [chons, setChons] = useState<FlowChonNguoiPair[]>([]);
  const [yKien, setYKien] = useState("");
  const [choice, setChoice] = useState<"duyet" | "taoCongViec">("duyet");
  const [showErrors, setShowErrors] = useState(false);

  useEffect(() => {
    if (!visible) return;

    setData(null);
    setChons([]);
    setYKien("");
    setChoice("duyet");
    setShowErrors(false);
    if (ketQua === FLOW_KET_QUA.TuChoi) return;

    let alive = true;
    setChecking(true);
    flowChonNguoiDuyet(nameClass, idHoSo)
      .then((result) => {
        if (!alive) return;
        setData(result);
        setChons(result.daChons ?? []);
      })
      .catch((err) => {
        if (!alive) return;
        Alert.alert("Không kiểm tra được phiếu", getWorkflowErrorMessage(err, "Vui lòng thử lại."));
        onClose();
      })
      .finally(() => {
        if (alive) setChecking(false);
      });

    return () => {
      alive = false;
    };
    // onClose đổi tham chiếu mỗi lần render của màn gọi — chỉ chạy khi mở.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, ketQua, nameClass, idHoSo]);

  const canTaoCongViec = ketQua === FLOW_KET_QUA.Duyet && !!data?.taoCongViec;
  const needPick = choice === "duyet" && !!data?.buocs?.length;

  const send = async () => {
    try {
      setSubmitting(true);
      const result = await flowDuyetHoSo(nameClass, {
        IDs: [idHoSo],
        KetQua: ketQua,
        YKien: yKien.trim() || null,
        Chons: needPick
          ? chons.map((chon) => ({ ID_Buoc: chon.iD_Buoc, ID_NhanVien: chon.iD_NhanVien }))
          : undefined,
      });

      const loi = getThaoTacError(result);
      if (loi) {
        Alert.alert("Không gửi được", loi);
        return;
      }
      if ((result.soCanChonNguoi ?? 0) > 0) {
        Alert.alert("Cần chọn người duyệt", "Phiếu cần chọn người duyệt cho bước kế tiếp.");
        return;
      }
      onDone();
    } catch (err) {
      Alert.alert("Không gửi được", getWorkflowErrorMessage(err, "Vui lòng thử lại."));
    } finally {
      setSubmitting(false);
    }
  };

  const submit = () => {
    if (choice === "taoCongViec") {
      onTaoCongViec({ yKien: yKien.trim() || null, prefill: data?.taoCongViec ?? null });
      return;
    }

    if (needPick && getMissingSteps(data, chons).length) {
      setShowErrors(true);
      Alert.alert("Thiếu người duyệt", "Mỗi bước phải chọn ít nhất 1 người.");
      return;
    }

    if (ketQua === FLOW_KET_QUA.TuChoi) {
      Alert.alert("Từ chối phiếu", "Từ chối sẽ đóng phiếu, không quay lại được. Tiếp tục?", [
        { text: "Huỷ", style: "cancel" },
        { text: "Từ chối", style: "destructive", onPress: send },
      ]);
      return;
    }

    send();
  };

  const submitLabel =
    choice === "taoCongViec"
      ? "Tạo công việc"
      : ketQua === FLOW_KET_QUA.TuChoi
      ? "Từ chối"
      : ketQua === FLOW_KET_QUA.KhongYKien
      ? "Không ý kiến"
      : "Duyệt";

  return (
    <WorkflowSheet
      visible={visible}
      title={phieuLabel ? `${TITLES[ketQua]} ${phieuLabel}` : TITLES[ketQua]}
      onClose={onClose}
      loading={checking || submitting}
      loadingText={checking ? "Đang kiểm tra phiếu..." : "Đang gửi..."}
      closableWhileLoading={checking}
      footer={
        <>
          <WorkflowButton label="Đóng" variant="neutral" flex onPress={onClose} />
          <WorkflowButton
            label={submitLabel}
            flex
            variant={ketQua === FLOW_KET_QUA.TuChoi ? "danger" : choice === "taoCongViec" ? "primary" : "success"}
            icon={
              choice === "taoCongViec"
                ? "briefcase-outline"
                : ketQua === FLOW_KET_QUA.TuChoi
                ? "close-circle-outline"
                : "checkmark-circle-outline"
            }
            disabled={checking}
            onPress={submit}
          />
        </>
      }
    >
      {canTaoCongViec ? (
        <View style={styles.choices}>
          {(["duyet", "taoCongViec"] as const).map((item) => {
            const active = choice === item;
            return (
              <TouchableOpacity
                key={item}
                style={[styles.choice, active && styles.choiceActive]}
                onPress={() => setChoice(item)}
              >
                <Ionicons
                  name={active ? "radio-button-on" : "radio-button-off"}
                  size={20}
                  color={active ? c.red : c.textMuted}
                />
                <View style={styles.choiceBody}>
                  <Text style={styles.choiceTitle}>{item === "duyet" ? "Duyệt" : "Tạo công việc"}</Text>
                  <Text style={styles.choiceHint}>
                    {item === "duyet"
                      ? "Duyệt phiếu như thường."
                      : "Duyệt và giao việc — tình trạng phiếu đi theo công việc."}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      ) : null}

      <WorkflowTextArea
        label="Ý kiến"
        value={yKien}
        onChangeText={setYKien}
        placeholder={ketQua === FLOW_KET_QUA.TuChoi ? "Lý do từ chối" : "Đồng ý"}
      />

      {needPick && data ? (
        <>
          <Text style={styles.sectionTitle}>Chọn người duyệt cho bước kế tiếp</Text>
          <ApproverStepPicker data={data} value={chons} onChange={setChons} showErrors={showErrors} />
        </>
      ) : null}
    </WorkflowSheet>
  );
}

const makeStyles = (c: AppColors) =>
  StyleSheet.create({
    choices: {
      gap: 8,
      marginBottom: 14,
      marginTop: 4,
    },
    choice: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 10,
      padding: 12,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: c.borderStrong,
    },
    choiceActive: {
      borderColor: c.red,
      backgroundColor: c.redSurface,
    },
    choiceBody: {
      flex: 1,
    },
    choiceTitle: {
      fontSize: 15,
      fontWeight: "700",
      color: c.text,
    },
    choiceHint: {
      fontSize: 12,
      color: c.textSub,
      marginTop: 2,
    },
    sectionTitle: {
      fontSize: 13,
      fontWeight: "700",
      color: c.textSecondary,
      marginBottom: 8,
    },
  });
