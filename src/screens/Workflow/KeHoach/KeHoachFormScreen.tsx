import React, { useEffect, useMemo, useState } from "react";
import { Alert, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import Ionicons from "react-native-vector-icons/Ionicons";

import AssetFormScreenShell from "../../../components/assets/shared/AssetFormScreenShell";
import { createAssetFormBaseStyles } from "../../../components/assets/shared/assetFormStyles";
import EmptyState from "../../../components/ui/EmptyState";
import IsLoading from "../../../components/ui/IconLoading";
import { cvNhanVien } from "../../../services/data/congViecApi";
import { khChiTiet, khSua, khThem } from "../../../services/data/keHoachApi";
import { CV_KE_HOACH_NAME_CLASS } from "../../../services/data/workflowApi";
import type {
  KeHoachChiTiet,
  KeHoachSavePayload,
  StackNavigation,
  StackRoute,
  WorkflowEmployee,
} from "../../../types/index";
import { AppColors, C, useAppColors, useStyles } from "../../../utils/helpers/colors";
import EmployeePickerModal from "../shared/components/EmployeePickerModal";
import WorkflowButton from "../shared/components/WorkflowButton";
import {
  WorkflowFormFields,
  WorkflowFormPickerModal,
} from "../shared/components/WorkflowFormFields";
import WorkflowSection from "../shared/components/WorkflowSection";
import { useWorkflowDynamicForm } from "../shared/useWorkflowDynamicForm";
import { useWorkflowMe } from "../shared/useWorkflowMe";
import { useMarkWorkflowChanged } from "../shared/useWorkflowVersion";
import { addMonths, parseBeDate, startOfDay, toBeDate, toPickerDate } from "../shared/workflowDate";
import { getWorkflowErrorMessage } from "../shared/workflowErrors";
import {
  buildDynamicPayload,
  buildInitialFormData,
  getFormFields,
  readItemValue,
  WorkflowField,
} from "../shared/workflowFields";
import { loadClassFields } from "../shared/workflowMetadata";
import { KH_DYNAMIC_SAVE_KEYS } from "./keHoachRules";

/**
 * Form thêm / sửa kế hoạch (mục 4). Phần động theo metadata (TieuDe, TuNgay,
 * DenNgay, MoTa — kh-them / kh-sua chỉ nhận bộ khoá này); người tham gia vẽ
 * riêng, GHI ĐÈ danh sách cũ, không gồm chủ trì.
 */
export default function KeHoachFormScreen() {
  const styles = useStyles(makeStyles);
  const c = useAppColors();
  const navigation = useNavigation<StackNavigation<"KeHoachForm">>();
  const route = useRoute<StackRoute<"KeHoachForm">>();
  const isEdit = route.params.mode === "edit";
  const editId = route.params.id;
  const { me, loading: meLoading } = useWorkflowMe();
  const markChanged = useMarkWorkflowChanged();

  const [fields, setFields] = useState<WorkflowField[] | null>(null);
  const [employees, setEmployees] = useState<WorkflowEmployee[]>([]);
  const [detail, setDetail] = useState<KeHoachChiTiet | null>(null);
  const [thamGias, setThamGias] = useState<number[]>([]);
  const [pickerVisible, setPickerVisible] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    navigation.setOptions({ title: isEdit ? "Sửa kế hoạch" : "Thêm kế hoạch" });
  }, [isEdit, navigation]);

  useEffect(() => {
    let alive = true;
    Promise.all([
      loadClassFields(CV_KE_HOACH_NAME_CLASS),
      cvNhanVien().catch(() => [] as WorkflowEmployee[]),
      isEdit && editId ? khChiTiet(editId) : Promise.resolve(null),
    ])
      .then(([metadata, staff, chiTiet]) => {
        if (!alive) return;
        setFields(metadata);
        setEmployees(staff);
        setDetail(chiTiet);
        if (chiTiet) setThamGias(chiTiet.thamGias.map((item) => Number(item.id)));
      })
      .catch((err) => {
        if (alive) setLoadError(getWorkflowErrorMessage(err, "Không tải được form."));
      });
    return () => {
      alive = false;
    };
  }, [editId, isEdit]);

  const formFields = useMemo(
    () => getFormFields(fields ?? [], { only: KH_DYNAMIC_SAVE_KEYS }),
    [fields],
  );

  const baseValues = useMemo<Record<string, any>>(() => {
    if (detail) {
      const kh = detail.keHoach;
      return { TieuDe: kh.tieuDe ?? "", MoTa: kh.moTa ?? null, TuNgay: kh.tuNgay, DenNgay: kh.denNgay };
    }
    const today = startOfDay(new Date());
    return { TieuDe: "", MoTa: null, TuNgay: toBeDate(today), DenNgay: toBeDate(addMonths(today, 1)) };
  }, [detail]);

  const initialData = useMemo(() => {
    if (!fields) return null;
    if (detail) return buildInitialFormData(formFields, detail.keHoach);

    // Mặc định thêm: Từ = hôm nay, Đến = hôm nay + 1 tháng.
    return {
      TuNgay: toPickerDate(parseBeDate(baseValues.TuNgay)),
      DenNgay: toPickerDate(parseBeDate(baseValues.DenNgay)),
    };
  }, [baseValues, detail, fields, formFields]);

  const form = useWorkflowDynamicForm(formFields, initialData, isEdit ? "edit" : "add");

  // Chủ trì (chính mình khi thêm, người tạo khi sửa) không nằm trong danh sách chọn.
  const chuTriId = detail ? Number(detail.keHoach.iD_NhanVien_Tao) : me.iD_NhanVien;

  const nameOf = useMemo(() => {
    const map = new Map(employees.map((item) => [item.id, item.ten]));
    detail?.thamGias.forEach((item) => {
      if (!map.has(Number(item.id))) map.set(Number(item.id), item.ten);
    });
    return (id: number) => map.get(id) ?? `#${id}`;
  }, [detail, employees]);

  const buildPayload = (): KeHoachSavePayload => {
    const dyn = buildDynamicPayload(formFields, form.formData);
    const pick = (key: string) => {
      const field = formFields.find((item) => item.name.toLowerCase() === key.toLowerCase());
      return field ? dyn[field.name] : readItemValue(baseValues, key);
    };

    return {
      ID: isEdit ? Number(editId) : 0,
      TieuDe: String(pick("TieuDe") ?? "").trim(),
      MoTa: (pick("MoTa") as string | null) ?? null,
      TuNgay: String(pick("TuNgay") ?? ""),
      DenNgay: String(pick("DenNgay") ?? ""),
      ThamGias: thamGias.filter((id) => id !== chuTriId),
    };
  };

  const handleSave = async () => {
    const requiredMessage = form.validateRequired();
    if (requiredMessage) {
      Alert.alert("Thiếu thông tin", requiredMessage);
      return;
    }

    const payload = buildPayload();
    if (!payload.TieuDe) {
      Alert.alert("Thiếu thông tin", "Vui lòng nhập tiêu đề.");
      return;
    }
    const tu = parseBeDate(payload.TuNgay);
    const den = parseBeDate(payload.DenNgay);
    if (!tu || !den) {
      Alert.alert("Thiếu thông tin", "Vui lòng chọn Từ ngày và Đến ngày.");
      return;
    }
    if (den < tu) {
      Alert.alert("Ngày không hợp lệ", "Đến ngày phải sau hoặc bằng Từ ngày.");
      return;
    }

    try {
      setSubmitting(true);
      const result = isEdit ? await khSua(payload) : await khThem(payload);
      if (result.loi || !(result.id > 0)) {
        Alert.alert("Không lưu được", result.loi || "Vui lòng thử lại.");
        return;
      }
      markChanged();
      navigation.goBack();
    } catch (err) {
      Alert.alert("Không lưu được", getWorkflowErrorMessage(err, "Vui lòng thử lại."));
    } finally {
      setSubmitting(false);
    }
  };

  if (loadError) {
    return <EmptyState iconName="alert-circle-outline" title="Không mở được form" subtitle={loadError} />;
  }

  if (!fields || meLoading || (isEdit && !detail)) return <IsLoading />;

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
        <WorkflowButton
          label="Lưu"
          icon="checkmark-circle-outline"
          onPress={handleSave}
          disabled={submitting}
        />
      }
    >
      <WorkflowFormFields form={form} styles={styles} />

      <WorkflowSection
        title="Người tham gia"
        icon="people-outline"
        right={
          <TouchableOpacity style={styles.pickButton} onPress={() => setPickerVisible(true)}>
            <Ionicons name="add" size={15} color={c.red} />
            <Text style={styles.pickText}>Chọn</Text>
          </TouchableOpacity>
        }
      >
        <Text style={styles.hint}>Chủ trì là người tạo kế hoạch, không cần chọn.</Text>
        <View style={styles.chips}>
          {thamGias.length ? (
            thamGias.map((id) => (
              <View key={id} style={styles.chip}>
                <Text style={styles.chipText} numberOfLines={1}>
                  {nameOf(id)}
                </Text>
                <TouchableOpacity
                  onPress={() => setThamGias((prev) => prev.filter((item) => item !== id))}
                  hitSlop={8}
                >
                  <Ionicons name="close-circle" size={16} color={c.textSub} />
                </TouchableOpacity>
              </View>
            ))
          ) : (
            <Text style={styles.empty}>Chưa chọn người tham gia</Text>
          )}
        </View>
      </WorkflowSection>

      <EmployeePickerModal
        visible={pickerVisible}
        title="Chọn người tham gia"
        employees={employees}
        selectedIds={thamGias}
        excludeIds={chuTriId ? [chuTriId] : []}
        onClose={() => setPickerVisible(false)}
        onConfirm={(ids) => {
          setThamGias(ids);
          setPickerVisible(false);
        }}
      />
    </AssetFormScreenShell>
  );
}

const makeStyles = (c: AppColors) =>
  StyleSheet.create({
    ...createAssetFormBaseStyles(c),
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
    hint: {
      fontSize: 12,
      color: c.textSub,
      marginBottom: 8,
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
  });
