import React, { useEffect, useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { cvChuyenTrangThai, cvTaiFileLichSu } from "../../../../services/data/congViecApi";
import { getThaoTacError } from "../../../../services/data/workflowApi";
import type { WorkflowPickedFile } from "../../../../types/index";
import { AppColors, useStyles } from "../../../../utils/helpers/colors";
import PendingFilesField from "../../shared/components/PendingFilesField";
import WorkflowButton from "../../shared/components/WorkflowButton";
import WorkflowSheet, { confirmCloseSheet } from "../../shared/components/WorkflowSheet";
import WorkflowTextArea from "../../shared/components/WorkflowTextArea";
import { CV_TRANG_THAI, CV_TRANG_THAI_HUY, tint } from "../../shared/workflowConstants";
import { getWorkflowErrorMessage } from "../../shared/workflowErrors";
import { AppAlert } from "../../../../components/ui/AppAlert";

/** Đỏ cùng tông Material với 3 nút còn lại (như màu Quá hạn). */
const HUY_BUTTON_COLOR = "#e53935";

type Props = {
  visible: boolean;
  idCongViec: number;
  trangThai: number;
  onClose: () => void;
  /** Đã chuyển xong (kể cả khi tải file lỗi) — màn gọi nạp lại. */
  onDone: () => void;
};

/**
 * Chuyển trạng thái (mục 5): chọn TỰ DO 1 trong 4, kể cả trạng thái đang có
 * (ghi thêm một mốc với ghi chú khác). Hủy bắt buộc ghi chú; giữ nguyên trạng
 * thái phải có ghi chú hoặc file. File kết quả gắn vào dòng lịch sử vừa ghi.
 */
export default function ChuyenTrangThaiSheet({
  visible,
  idCongViec,
  trangThai,
  onClose,
  onDone,
}: Props) {
  const styles = useStyles(makeStyles);
  const [selected, setSelected] = useState(trangThai);
  const [ghiChu, setGhiChu] = useState("");
  const [files, setFiles] = useState<WorkflowPickedFile[]>([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setSelected(trangThai);
    setGhiChu("");
    setFiles([]);
  }, [trangThai, visible]);

  const submit = async () => {
    const note = ghiChu.trim();

    if (selected === CV_TRANG_THAI_HUY && !note) {
      AppAlert.alert("Thiếu ghi chú", "Hủy công việc phải ghi lý do.");
      return;
    }
    if (selected === trangThai && !note && !files.length) {
      AppAlert.alert(
        "Thiếu nội dung",
        "Giữ nguyên trạng thái thì cần ghi chú hoặc đính kèm file kết quả.",
      );
      return;
    }

    try {
      setSubmitting(true);
      const result = await cvChuyenTrangThai([idCongViec], selected, note || null);
      const loi = getThaoTacError(result);
      if (loi) {
        AppAlert.alert("Không chuyển được trạng thái", loi);
        return;
      }

      const idLichSu = result.iD_LichSus?.[0];
      const failed: string[] = [];
      if (!idLichSu && files.length) {
        // Không có mốc lịch sử để gắn — báo, đừng bỏ file lặng lẽ.
        files.forEach((file) => failed.push(`- ${file.name}: không có mốc lịch sử để gắn file`));
      }
      if (idLichSu && files.length) {
        for (const file of files) {
          try {
            await cvTaiFileLichSu(idLichSu, file);
          } catch (err) {
            failed.push(`- ${file.name}: ${getWorkflowErrorMessage(err, "lỗi tải lên")}`);
          }
        }
      }

      // Tải file lỗi vẫn coi là đã chuyển — không cho chuyển lại lần nữa.
      if (failed.length) {
        AppAlert.alert(
          "Đã chuyển trạng thái",
          `Nhưng một số file chưa tải lên được:\n${failed.join("\n")}`,
        );
      }
      onDone();
    } catch (err) {
      AppAlert.alert(
        "Không chuyển được trạng thái",
        getWorkflowErrorMessage(err, "Vui lòng thử lại."),
      );
    } finally {
      setSubmitting(false);
    }
  };

  // Ghi chú / file kết quả đã chọn mà chạm nhầm ra nền tối là mất — hỏi trước khi đóng.
  const dirty = !!ghiChu.trim() || files.length > 0;

  return (
    <WorkflowSheet
      visible={visible}
      title="Chuyển trạng thái"
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
          <WorkflowButton label="Lưu" icon="checkmark" flex onPress={submit} />
        </>
      }
    >
      <View style={styles.statusGrid}>
        {CV_TRANG_THAI.map((option) => {
          const active = option.value === selected;
          // Nút Hủy tô đỏ cho rõ là thao tác bỏ việc; nhãn / chấm trạng thái Hủy ở
          // chỗ khác vẫn xám như web.
          const fill = option.value === CV_TRANG_THAI_HUY ? HUY_BUTTON_COLOR : option.color;
          const textColor = active ? "#FFFFFF" : fill;
          return (
            <TouchableOpacity
              key={option.value}
              activeOpacity={0.8}
              onPress={() => setSelected(option.value)}
              style={[
                styles.statusButton,
                { borderColor: active ? fill : tint(fill, "55") },
                active && { backgroundColor: fill },
              ]}
            >
              <Text style={[styles.statusText, { color: textColor }]}>
                {option.label}
              </Text>
              {option.value === trangThai ? (
                <Text style={[styles.currentText, { color: textColor }]}>
                  hiện tại
                </Text>
              ) : null}
            </TouchableOpacity>
          );
        })}
      </View>

      <WorkflowTextArea
        label="Ghi chú"
        required={selected === CV_TRANG_THAI_HUY}
        value={ghiChu}
        onChangeText={setGhiChu}
        placeholder={selected === CV_TRANG_THAI_HUY ? "Lý do hủy" : "Kết quả, tiến độ..."}
      />

      <PendingFilesField
        label="File kết quả"
        files={files}
        onChange={setFiles}
        hint="Gắn vào lần chuyển trạng thái này."
      />
    </WorkflowSheet>
  );
}

const makeStyles = (_c: AppColors) =>
  StyleSheet.create({
    statusGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
      marginBottom: 14,
      marginTop: 4,
    },
    statusButton: {
      width: "48%",
      flexGrow: 1,
      paddingVertical: 12,
      borderRadius: 12,
      borderWidth: 1.5,
      alignItems: "center",
    },
    statusText: {
      fontSize: 15,
      fontWeight: "700",
    },
    currentText: {
      fontSize: 11,
      marginTop: 2,
    },
  });
