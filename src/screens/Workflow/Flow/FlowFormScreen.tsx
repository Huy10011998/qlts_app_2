import React, { useEffect, useMemo, useState } from "react";
import { Alert, StyleSheet, Text, View } from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";

import AssetFormScreenShell from "../../../components/assets/shared/AssetFormScreenShell";
import { createAssetFormBaseStyles } from "../../../components/assets/shared/assetFormStyles";
import EmptyState from "../../../components/ui/EmptyState";
import IsLoading from "../../../components/ui/IconLoading";
import {
  flowChonNguoi,
  flowCheckValidation,
  flowInsertOutId,
  flowLuuChonNguoi,
  flowNopHoSo,
  flowUpdate,
} from "../../../services/data/flowApi";
import { getThaoTacError, uploadWorkflowFile } from "../../../services/data/workflowApi";
import type {
  FlowChonNguoi,
  FlowChonNguoiPair,
  StackNavigation,
  StackRoute,
  WorkflowPickedFile,
} from "../../../types/index";
import { AppColors, C, useStyles } from "../../../utils/helpers/colors";
import { getMatchedKey } from "../../../utils/helpers/field";
import PendingFilesField from "../shared/components/PendingFilesField";
import WorkflowButton from "../shared/components/WorkflowButton";
import {
  WorkflowFormFields,
  WorkflowFormPickerModal,
} from "../shared/components/WorkflowFormFields";
import WorkflowSection from "../shared/components/WorkflowSection";
import { useWorkflowDynamicForm } from "../shared/useWorkflowDynamicForm";
import { useWorkflowMe } from "../shared/useWorkflowMe";
import { useMarkWorkflowChanged } from "../shared/useWorkflowVersion";
import { toBeDateTime } from "../shared/workflowDate";
import { getWorkflowErrorMessage } from "../shared/workflowErrors";
import {
  buildDynamicPayload,
  buildInitialFormData,
  findWorkflowField,
  getFormFields,
  readItemValue,
} from "../shared/workflowFields";
import ApproverStepPicker from "./components/ApproverStepPicker";
import {
  FLOW_FIELD,
  FLOW_FORM_SYSTEM_FIELDS,
  getMissingSteps,
  stripDisplayColumns,
} from "./flowRules";
import { useFlowMeta } from "./useFlowMeta";

const TITLES = {
  add: "Lập phiếu",
  edit: "Sửa nháp",
  clone: "Nhân bản phiếu",
} as const;

/** Ghi `patch` đè lên dòng gốc, khớp tên cột không phân biệt hoa thường (TieuDe ↔ tieuDe). */
const mergeEntity = (base: Record<string, any>, patch: Record<string, any>) => {
  const next = { ...base };
  Object.entries(patch).forEach(([key, value]) => {
    next[getMatchedKey(next, key) ?? key] = value;
  });
  return next;
};

/**
 * Lập / sửa nháp / nhân bản phiếu (mục 7). Form dựng từ FlowAttributes; khung
 * chọn người duyệt + đính kèm vẽ riêng.
 *   Lưu nháp = kiểm hợp lệ → insert-out-id | update → lưu người đã chọn → tải file.
 *   Lưu phiếu = như trên + nộp (cấp số, mở bước đầu).
 * Bước nào lỗi thì dừng; phiếu vẫn là nháp, lưu lại lần sau là update.
 */
export default function FlowFormScreen() {
  const styles = useStyles(makeStyles);
  const navigation = useNavigation<StackNavigation<"FlowForm">>();
  const route = useRoute<StackRoute<"FlowForm">>();
  const { nameClass, mode, item } = route.params;
  const isEdit = mode === "edit";
  const { meta, errorMessage: metaError, loading: metaLoading } = useFlowMeta(nameClass);
  const { me, loading: meLoading } = useWorkflowMe();
  const markChanged = useMarkWorkflowChanged();

  // Phiếu đã có trên server: sửa nháp từ đầu, hoặc phiếu mới sau lần lưu đầu.
  const [savedId, setSavedId] = useState<number>(isEdit && item ? Number(item.id) : 0);
  const [savedEntity, setSavedEntity] = useState<Record<string, any> | null>(
    isEdit && item ? stripDisplayColumns(item) : null,
  );
  const [chonNguoi, setChonNguoi] = useState<FlowChonNguoi | null>(null);
  const [chons, setChons] = useState<FlowChonNguoiPair[]>([]);
  const [loadingChon, setLoadingChon] = useState(false);
  const [showStepErrors, setShowStepErrors] = useState(false);
  const [files, setFiles] = useState<WorkflowPickedFile[]>([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    navigation.setOptions({ title: TITLES[mode] });
  }, [mode, navigation]);

  const formFields = useMemo(
    () => getFormFields(meta?.fields ?? [], { exclude: FLOW_FORM_SYSTEM_FIELDS }),
    [meta?.fields],
  );

  /* ID_Flow nằm sẵn trong form (dù không hiện) để ô Loại đề nghị có cấp cha:
     lstParent = flow.id. Nhân bản: dữ liệu phiếu cũ, bỏ ID + số phiếu (các cột
     chỉ đọc không vào form nên tự rơi). */
  const initialData = useMemo(() => {
    if (!meta) return null;
    const base = item && mode !== "add" ? buildInitialFormData(formFields, item) : {};
    const idFlow = isEdit ? readItemValue(item, FLOW_FIELD.ID_Flow) ?? meta.flow.id : meta.flow.id;
    return { ...base, [FLOW_FIELD.ID_Flow]: idFlow };
  }, [formFields, isEdit, item, meta, mode]);

  const form = useWorkflowDynamicForm(
    formFields,
    initialData,
    isEdit ? "edit" : mode === "clone" ? "clone" : "add",
  );

  const loaiFieldName =
    findWorkflowField(formFields, FLOW_FIELD.ID_LoaiFlow)?.name ?? FLOW_FIELD.ID_LoaiFlow;
  const idLoaiFlow = Number(form.formData[loaiFieldName]) || 0;
  const idHoSoChonNguoi = savedId || (item ? Number(item.id) : 0);

  // Bước phải chọn người duyệt: gọi khi mở form và mỗi lần đổi Loại đề nghị.
  useEffect(() => {
    if (!idLoaiFlow) {
      setChonNguoi(null);
      setChons([]);
      return;
    }

    let alive = true;
    setLoadingChon(true);
    flowChonNguoi(nameClass, idHoSoChonNguoi, idLoaiFlow)
      .then((data) => {
        if (!alive) return;
        setChonNguoi(data);
        setChons(data.daChons ?? []);
        setShowStepErrors(false);
      })
      .catch(() => {
        if (alive) setChonNguoi(null);
      })
      .finally(() => {
        if (alive) setLoadingChon(false);
      });

    return () => {
      alive = false;
    };
    // Chỉ theo Loại đề nghị — đổi savedId sau lần lưu đầu không cần hỏi lại.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idLoaiFlow, nameClass]);

  const buildEntity = () => {
    const dyn = buildDynamicPayload(formFields, form.formData);

    if (savedId > 0) {
      // Sửa: gửi TRỌN dòng (update không động theo field).
      return mergeEntity(savedEntity ?? { ID: savedId }, dyn);
    }

    // Thêm mới: app tự điền field hệ thống, không cho sửa (mục 3).
    return {
      ...dyn,
      [FLOW_FIELD.ID_Flow]: meta!.flow.id,
      [FLOW_FIELD.TinhTrang]: 0,
      [FLOW_FIELD.NgayTao]: toBeDateTime(new Date()),
      [FLOW_FIELD.ID_NhanVien_Tao]: me.iD_NhanVien,
      [FLOW_FIELD.ID_PhongBan_Tao]: me.iD_PhongBan,
    };
  };

  const save = async (submit: boolean) => {
    const requiredMessage = form.validateRequired();
    if (requiredMessage) {
      Alert.alert("Thiếu thông tin", requiredMessage);
      return;
    }
    if (submit && chonNguoi?.buocs.length && getMissingSteps(chonNguoi, chons).length) {
      setShowStepErrors(true);
      Alert.alert("Thiếu người duyệt", "Mỗi bước phải chọn ít nhất 1 người duyệt.");
      return;
    }

    setSubmitting(true);
    try {
      const entity = buildEntity();

      // c) Kiểm hợp lệ.
      const errors = await flowCheckValidation(nameClass, entity, savedId);
      if (errors.length) {
        const fieldErrors: Record<string, string> = {};
        errors.forEach((err) => {
          const field = err.fieldName ? findWorkflowField(formFields, err.fieldName) : undefined;
          if (field && err.message) fieldErrors[field.name] = err.message;
        });
        form.setValidationErrors((prev) => ({ ...prev, ...fieldErrors }));
        form.expandGroupsWithErrors(fieldErrors);
        Alert.alert(
          "Dữ liệu chưa hợp lệ",
          errors.map((err) => err.message).filter(Boolean).join("\n") || "Vui lòng kiểm tra lại.",
        );
        return;
      }

      // d) Lưu nháp.
      let idHoSo = savedId;
      if (idHoSo > 0) {
        await flowUpdate(nameClass, entity, idHoSo);
        setSavedEntity(entity);
      } else {
        idHoSo = await flowInsertOutId(nameClass, entity);
        if (!idHoSo) throw new Error("Server không trả ID phiếu mới.");
        setSavedId(idHoSo);
        setSavedEntity({ ...entity, ID: idHoSo });
      }
      markChanged();

      // e) Lưu người đã chọn.
      if (chonNguoi?.buocs.length && chons.length) {
        await flowLuuChonNguoi(nameClass, idHoSo, chons);
      }

      // f) Đính kèm — file nào lên rồi thì bỏ khỏi danh sách chờ.
      const failed: string[] = [];
      for (const file of files) {
        try {
          await uploadWorkflowFile(nameClass, idHoSo, file);
          setFiles((prev) => prev.filter((pending) => pending !== file));
        } catch (err) {
          failed.push(`- ${file.name}: ${getWorkflowErrorMessage(err, "lỗi tải lên")}`);
        }
      }
      if (failed.length) {
        Alert.alert(
          "Đã lưu nháp",
          `Một số file chưa tải lên được, phiếu vẫn là nháp:\n${failed.join("\n")}`,
        );
        return;
      }

      // g) Nộp.
      if (submit) {
        const result = await flowNopHoSo(nameClass, idHoSo);
        const loi = getThaoTacError(result);
        if (loi) {
          Alert.alert("Chưa nộp được", `Phiếu đã lưu nháp.\n${loi}`);
          return;
        }
        markChanged();
      }

      Alert.alert(submit ? "Đã nộp phiếu" : "Đã lưu nháp", undefined, [
        { text: "OK", onPress: () => navigation.goBack() },
      ]);
    } catch (err) {
      Alert.alert(
        "Không lưu được",
        getWorkflowErrorMessage(err, "Vui lòng thử lại.") +
          (savedId > 0 ? "\nPhiếu vẫn là nháp, lưu lại lần sau là cập nhật." : ""),
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (metaError) {
    return <EmptyState iconName="alert-circle-outline" title="Không mở được form" subtitle={metaError} />;
  }

  if (metaLoading || meLoading || !meta) return <IsLoading />;

  if (!me.iD_NhanVien) {
    return (
      <EmptyState
        iconName="person-remove-outline"
        title="Chưa liên kết nhân viên"
        subtitle="Tài khoản phải liên kết nhân viên mới lập được phiếu."
      />
    );
  }

  return (
    <AssetFormScreenShell
      brandColor={C.red}
      contentContainerStyle={styles.scrollContent}
      isSubmitting={submitting}
      loadingOverlayStyle={styles.loadingOverlay}
      refLoadingMore={form.refLoadingMore}
      style={styles.container}
      modal={<WorkflowFormPickerModal form={form} />}
      footer={
        <View style={styles.footerRow}>
          <WorkflowButton
            flex
            variant="neutral"
            icon="save-outline"
            label="Lưu nháp"
            disabled={submitting}
            onPress={() => save(false)}
          />
          <WorkflowButton
            flex
            icon="paper-plane-outline"
            label="Lưu phiếu"
            disabled={submitting}
            onPress={() => save(true)}
          />
        </View>
      }
    >
      <Text style={styles.flowName}>{meta.flow.ten}</Text>

      <WorkflowFormFields form={form} styles={styles} />

      <WorkflowSection title="Đính kèm" icon="attach-outline">
        {savedId > 0 ? (
          <WorkflowButton
            compact
            variant="outline"
            icon="folder-open-outline"
            label="File đã đính kèm"
            style={styles.existingFiles}
            onPress={() =>
              navigation.navigate("WorkflowFile", { apiBase: nameClass, idHoSo: savedId, canEdit: true })
            }
          />
        ) : null}
        <PendingFilesField
          label="Thêm file"
          files={files}
          onChange={setFiles}
          hint="Tối đa 20MB mỗi file. File được tải lên khi lưu."
        />
      </WorkflowSection>

      {loadingChon ? (
        <IsLoading size="small" style={styles.chonLoading} />
      ) : chonNguoi?.buocs.length ? (
        <WorkflowSection title="Người duyệt" icon="people-outline">
          <ApproverStepPicker
            data={chonNguoi}
            value={chons}
            onChange={setChons}
            showErrors={showStepErrors}
          />
        </WorkflowSection>
      ) : null}
    </AssetFormScreenShell>
  );
}

const makeStyles = (c: AppColors) =>
  StyleSheet.create({
    ...createAssetFormBaseStyles(c),
    flowName: {
      fontSize: 13,
      fontWeight: "700",
      color: c.accent,
      marginBottom: 10,
    },
    footerRow: {
      flexDirection: "row",
      gap: 10,
    },
    existingFiles: {
      alignSelf: "flex-start",
      marginBottom: 10,
    },
    chonLoading: {
      paddingVertical: 16,
    },
  });
