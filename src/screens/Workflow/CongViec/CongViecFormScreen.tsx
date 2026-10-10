import React, { useEffect, useMemo, useState } from "react";
import { Alert, StyleSheet, Switch, Text, View } from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";

import AssetFormScreenShell from "../../../components/assets/shared/AssetFormScreenShell";
import { createAssetFormBaseStyles } from "../../../components/assets/shared/assetFormStyles";
import EmptyState from "../../../components/ui/EmptyState";
import IsLoading from "../../../components/ui/IconLoading";
import { cvChiTiet, cvNhanVien, cvSua, cvThem } from "../../../services/data/congViecApi";
import { flowTaoCongViec } from "../../../services/data/flowApi";
import {
  CV_CONG_VIEC_NAME_CLASS,
  uploadWorkflowFile,
} from "../../../services/data/workflowApi";
import type {
  CongViecChiTiet,
  CongViecSavePayload,
  CongViecThamGiaPayload,
  StackNavigation,
  StackRoute,
  WorkflowEmployee,
  WorkflowPickedFile,
} from "../../../types/index";
import { AppColors, C, useAppColors, useStyles } from "../../../utils/helpers/colors";
import DateTimeField from "../shared/components/DateTimeField";
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
import { CV_VAI_TRO } from "../shared/workflowConstants";
import { atHour, parseBeDate, startOfDay, toBeDateTime } from "../shared/workflowDate";
import { getWorkflowErrorMessage } from "../shared/workflowErrors";
import {
  buildDynamicPayload,
  buildInitialFormData,
  getFormFields,
  readItemValue,
  WorkflowField,
} from "../shared/workflowFields";
import { loadClassFields } from "../shared/workflowMetadata";
import DinhKyEditor, {
  createDinhKyState,
  DinhKyState,
  toDinhKyInput,
  toDinhKyPayload,
} from "./components/DinhKyEditor";
import { buildDinhKyDates, validateDinhKyDates } from "./dinhKyRules";
import ThamGiaEditor from "./components/ThamGiaEditor";
import {
  CV_DYNAMIC_SAVE_KEYS,
  CV_FORM_CUSTOM_FIELDS,
  validateDinhKy,
  validateThamGias,
  validateTuDen,
} from "./congViecRules";

/** "yyyy-MM-dd" (ngày bấm trên lịch) → Date lúc 00:00. */
const parseNgay = (ngay?: string) => {
  const date = ngay ? parseBeDate(ngay) : null;
  return date ?? new Date();
};

const toNumberOr = (value: unknown, fallback: number | null) => {
  const num = Number(value);
  return value == null || value === "" || !Number.isFinite(num) ? fallback : num;
};

/**
 * Form thêm / sửa công việc (mục 4). Phần động (TieuDe, Loại, Kế hoạch, MoTa,
 * Khẩn, Quan trọng) theo metadata; Từ / Đến (ngày + giờ), người tham gia, định
 * kỳ, đính kèm vẽ riêng. cv-them / cv-sua chỉ nhận đúng các khoá của mục 4.
 *
 * Mở từ lượt duyệt cuối của phiếu ("Tạo công việc", mục 9 file Flow) thì lưu
 * bằng flow-tao-cong-viec: server vừa duyệt phiếu vừa giao việc.
 */
export default function CongViecFormScreen() {
  const styles = useStyles(makeStyles);
  const c = useAppColors();
  const navigation = useNavigation<StackNavigation<"CongViecForm">>();
  const route = useRoute<StackRoute<"CongViecForm">>();
  const params = route.params;
  const isEdit = params.mode === "edit";
  const fromFlow = params.fromFlow;
  const { me, loading: meLoading } = useWorkflowMe();
  const markChanged = useMarkWorkflowChanged();

  const [fields, setFields] = useState<WorkflowField[] | null>(null);
  const [employees, setEmployees] = useState<WorkflowEmployee[]>([]);
  const [detail, setDetail] = useState<CongViecChiTiet | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const ngayMacDinh = parseNgay(params.ngay);
  const [tuNgay, setTuNgay] = useState<Date | null>(atHour(ngayMacDinh, 8));
  const [denNgay, setDenNgay] = useState<Date | null>(atHour(ngayMacDinh, 17));
  const [isKhongChuyenChuTri, setIsKhongChuyenChuTri] = useState(false);
  const [thamGias, setThamGias] = useState<CongViecThamGiaPayload[]>([]);
  const [dinhKy, setDinhKy] = useState<DinhKyState>(createDinhKyState(ngayMacDinh));
  const [files, setFiles] = useState<WorkflowPickedFile[]>([]);
  const [errors, setErrors] = useState<Record<string, string | null>>({});

  useEffect(() => {
    navigation.setOptions({
      title: fromFlow ? "Tạo công việc" : isEdit ? "Sửa công việc" : "Thêm công việc",
    });
  }, [fromFlow, isEdit, navigation]);

  useEffect(() => {
    let alive = true;

    Promise.all([
      loadClassFields(CV_CONG_VIEC_NAME_CLASS),
      cvNhanVien().catch(() => [] as WorkflowEmployee[]),
      isEdit && params.id ? cvChiTiet(params.id) : Promise.resolve(null),
    ])
      .then(([metadata, staff, chiTiet]) => {
        if (!alive) return;
        setFields(metadata);
        setEmployees(staff);
        setDetail(chiTiet);

        if (chiTiet) {
          const cv = chiTiet.congViec;
          setTuNgay(parseBeDate(cv.tuNgay));
          setDenNgay(parseBeDate(cv.denNgay));
          // Sửa phải gửi lại đúng giá trị của cv-chi-tiet (null → false), đừng
          // để mặc định — chỉ người tạo đổi được ô này.
          setIsKhongChuyenChuTri(!!cv.isKhongChuyenChuTri);
          setThamGias(
            chiTiet.thamGias.map((item) => ({
              ID_NhanVien: Number(item.iD_NhanVien),
              VaiTro: Number(item.vaiTro),
            })),
          );
        }
      })
      .catch((err) => {
        if (alive) setLoadError(getWorkflowErrorMessage(err, "Không tải được form."));
      });

    return () => {
      alive = false;
    };
  }, [isEdit, params.id]);

  // Ngày bắt đầu định kỳ chưa sửa tay thì đi theo ngày của Từ ngày.
  useEffect(() => {
    if (!tuNgay) return;
    setDinhKy((prev) =>
      prev.ngayBatDauAuto ? { ...prev, ngayBatDau: startOfDay(tuNgay) } : prev,
    );
  }, [tuNgay]);

  // Thêm mới: Chủ trì mặc định là chính mình.
  useEffect(() => {
    if (isEdit || !me.iD_NhanVien) return;
    setThamGias((prev) =>
      prev.length ? prev : [{ ID_NhanVien: me.iD_NhanVien!, VaiTro: CV_VAI_TRO.ChuTri }],
    );
  }, [isEdit, me.iD_NhanVien]);

  const formFields = useMemo(
    () =>
      getFormFields(fields ?? [], {
        exclude: CV_FORM_CUSTOM_FIELDS,
        only: CV_DYNAMIC_SAVE_KEYS,
      }),
    [fields],
  );

  /** Giá trị gốc của các khoá động: bản ghi đang sửa, hoặc giá trị điền sẵn khi thêm. */
  const baseValues = useMemo<Record<string, any>>(() => {
    if (detail) {
      const cv = detail.congViec;
      return {
        TieuDe: cv.tieuDe ?? "",
        MoTa: cv.moTa ?? null,
        ID_LoaiCongViec: cv.iD_LoaiCongViec ?? null,
        ID_KeHoach: cv.iD_KeHoach ?? null,
        MucDoKhan: cv.mucDoKhan ?? 0,
        MucDoQuanTrong: cv.mucDoQuanTrong ?? 0,
      };
    }

    const prefill = fromFlow?.prefill;
    const soPhieu = prefill?.soPhieu ?? fromFlow?.soPhieu;
    const dongDau = soPhieu
      ? `Giao công việc từ phiếu ${soPhieu}`
      : fromFlow
      ? "Giao công việc từ phiếu đề nghị"
      : "";

    return {
      TieuDe: prefill?.tieuDe ?? "",
      MoTa: [dongDau, prefill?.moTa].filter(Boolean).join("\n") || null,
      ID_LoaiCongViec: prefill?.iD_LoaiCongViec ?? null,
      ID_KeHoach: params.keHoach?.id ?? null,
      MucDoKhan: 0,
      MucDoQuanTrong: 0,
    };
  }, [detail, fromFlow, params.keHoach?.id]);

  const initialData = useMemo(() => {
    if (!fields) return null;
    if (detail) return buildInitialFormData(formFields, detail.congViec);

    const initial: Record<string, any> = {};
    Object.entries(baseValues).forEach(([key, value]) => {
      if (value != null && value !== "") initial[key] = value;
    });
    if (params.keHoach) {
      initial.ID_KeHoach_MoTa = params.keHoach.text ?? "";
    }
    return initial;
  }, [baseValues, detail, fields, formFields, params.keHoach]);

  const form = useWorkflowDynamicForm(formFields, initialData, isEdit ? "edit" : "add");

  const fallbackNames = useMemo(() => {
    const names: Record<number, string> = {};
    detail?.thamGias.forEach((item) => {
      names[Number(item.iD_NhanVien)] = item.ten;
    });
    return names;
  }, [detail]);

  const canEditKhongChuyen = !isEdit || !!detail?.quyen.isNguoiTao;
  const showDinhKy = !isEdit && !fromFlow;

  const buildPayload = (): CongViecSavePayload => {
    const dyn = buildDynamicPayload(formFields, form.formData);
    const pick = (key: string) => {
      const field = formFields.find((item) => item.name.toLowerCase() === key.toLowerCase());
      return field ? dyn[field.name] : readItemValue(baseValues, key);
    };

    return {
      ID: isEdit ? Number(params.id) : 0,
      TieuDe: String(pick("TieuDe") ?? "").trim(),
      MoTa: (pick("MoTa") as string | null) ?? null,
      ID_LoaiCongViec: toNumberOr(pick("ID_LoaiCongViec"), null),
      ID_KeHoach: toNumberOr(pick("ID_KeHoach"), null),
      MucDoKhan: toNumberOr(pick("MucDoKhan"), 0) ?? 0,
      MucDoQuanTrong: toNumberOr(pick("MucDoQuanTrong"), 0) ?? 0,
      TuNgay: tuNgay ? toBeDateTime(tuNgay) : "",
      DenNgay: denNgay ? toBeDateTime(denNgay) : "",
      IsKhongChuyenChuTri: isKhongChuyenChuTri,
      ThamGias: thamGias,
      DinhKy: showDinhKy ? toDinhKyPayload(dinhKy) : null,
    };
  };

  const validate = (payload: CongViecSavePayload) => {
    const requiredMessage = form.validateRequired();
    if (requiredMessage) return requiredMessage;
    if (!payload.TieuDe) return "Vui lòng nhập tiêu đề.";

    const dinhKyInput = showDinhKy ? toDinhKyInput(dinhKy) : null;
    const nextErrors = {
      tuDen: validateTuDen(tuNgay, denNgay),
      thamGia: validateThamGias(thamGias),
      // Luật payload trước, rồi mới chạy thử luật sinh (không ra lần nào / quá 366).
      dinhKy:
        validateDinhKy(payload.DinhKy) ??
        (dinhKyInput ? validateDinhKyDates(buildDinhKyDates(dinhKyInput)) : null),
    };
    setErrors(nextErrors);
    return nextErrors.tuDen ?? nextErrors.thamGia ?? nextErrors.dinhKy ?? null;
  };

  const uploadFiles = async (idCongViec: number) => {
    const failed: string[] = [];
    for (const file of files) {
      try {
        await uploadWorkflowFile(CV_CONG_VIEC_NAME_CLASS, idCongViec, file);
      } catch (err) {
        failed.push(`- ${file.name}: ${getWorkflowErrorMessage(err, "lỗi tải lên")}`);
      }
    }
    return failed;
  };

  const handleSave = async () => {
    const payload = buildPayload();
    const message = validate(payload);
    if (message) {
      Alert.alert("Thiếu thông tin", message);
      return;
    }

    try {
      setSubmitting(true);
      const result = fromFlow
        ? await flowTaoCongViec(fromFlow.nameClass, {
            ID_HoSo: fromFlow.idHoSo,
            YKien: fromFlow.yKien,
            CongViec: payload,
          })
        : isEdit
        ? await cvSua(payload)
        : await cvThem(payload);

      if (result.loi || !(result.id > 0)) {
        Alert.alert("Không lưu được", result.loi || "Vui lòng thử lại.");
        return;
      }

      const failed = files.length ? await uploadFiles(result.id) : [];
      markChanged();

      const title = fromFlow
        ? "Đã duyệt và giao việc"
        : isEdit
        ? "Đã lưu công việc"
        : result.soLuong > 1
        ? `Đã tạo ${result.soLuong} công việc`
        : "Đã tạo công việc";
      const body = failed.length
        ? `Một số file chưa tải lên được:\n${failed.join("\n")}`
        : undefined;

      Alert.alert(title, body, [{ text: "OK", onPress: () => navigation.goBack() }]);
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
          label={fromFlow ? "Duyệt và giao việc" : "Lưu"}
          icon="checkmark-circle-outline"
          onPress={handleSave}
          disabled={submitting}
        />
      }
    >
      {fromFlow ? (
        <Text style={styles.notice}>
          Lưu công việc này là DUYỆT phiếu và giao việc. Đóng form không lưu thì phiếu chưa được
          duyệt.
        </Text>
      ) : null}

      <WorkflowFormFields form={form} styles={styles} />

      <WorkflowSection title="Thời gian" icon="time-outline">
        <DateTimeField label="Từ ngày" required value={tuNgay} onChange={setTuNgay} />
        <DateTimeField
          label="Đến ngày"
          required
          value={denNgay}
          onChange={setDenNgay}
          error={errors.tuDen}
        />
      </WorkflowSection>

      <WorkflowSection title="Người tham gia" icon="people-outline">
        <ThamGiaEditor
          employees={employees}
          value={thamGias}
          onChange={setThamGias}
          fallbackNames={fallbackNames}
          error={errors.thamGia}
        />
        <View style={styles.switchRow}>
          <View style={styles.switchBody}>
            <Text style={styles.switchLabel}>Không được chuyển người chủ trì</Text>
            <Text style={styles.switchHint}>
              Bật: chủ trì không tự đổi chủ trì. Chỉ người tạo đổi được ô này.
            </Text>
          </View>
          <Switch
            value={isKhongChuyenChuTri}
            onValueChange={setIsKhongChuyenChuTri}
            disabled={!canEditKhongChuyen}
            trackColor={{ true: c.red, false: c.borderStrong }}
            thumbColor="#FFFFFF"
          />
        </View>
      </WorkflowSection>

      {showDinhKy ? (
        <WorkflowSection title="Định kỳ" icon="repeat-outline">
          <DinhKyEditor value={dinhKy} onChange={setDinhKy} tuNgay={tuNgay} denNgay={denNgay} />
          {errors.dinhKy ? <Text style={styles.error}>{errors.dinhKy}</Text> : null}
        </WorkflowSection>
      ) : null}

      <WorkflowSection title="Đính kèm" icon="attach-outline">
        <PendingFilesField
          label="File đính kèm"
          files={files}
          onChange={setFiles}
          hint={
            showDinhKy && dinhKy.enabled
              ? "Định kỳ: file gắn vào lần đầu."
              : "Tối đa 20MB mỗi file. File được tải lên sau khi lưu."
          }
        />
      </WorkflowSection>
    </AssetFormScreenShell>
  );
}

const makeStyles = (c: AppColors) =>
  StyleSheet.create({
    ...createAssetFormBaseStyles(c),
    notice: {
      fontSize: 13,
      color: c.textSecondary,
      backgroundColor: c.amberLight,
      borderColor: c.amberBorder,
      borderWidth: 1,
      borderRadius: 12,
      padding: 12,
      marginBottom: 14,
    },
    switchRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      marginTop: 12,
    },
    switchBody: {
      flex: 1,
    },
    switchLabel: {
      fontSize: 14,
      fontWeight: "600",
      color: c.text,
    },
    switchHint: {
      fontSize: 12,
      color: c.textSub,
      marginTop: 2,
    },
    error: {
      fontSize: 12,
      color: c.red,
      marginTop: 4,
    },
  });
